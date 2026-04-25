/// <reference lib="dom" />

// wa-sqlite — synchronous OPFS VFS (no Asyncify required)
import * as SQLite from "wa-sqlite";
import SQLiteFactory from "wa-sqlite/dist/wa-sqlite.mjs";
import { AccessHandlePoolVFS } from "wa-sqlite/src/examples/AccessHandlePoolVFS.js";

import type { DBRequest, DBResponse } from "./types";
import { MIGRATIONS, SCHEMA_VERSION } from "./migrations";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Directory inside OPFS where the pool files are stored. */
const OPFS_DIRECTORY = "/wozny-db";

/** The SQLite database filename. */
const DB_FILENAME = "wozny.db";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let sqlite3: SQLiteAPI | null = null;
let db: number | null = null;

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

async function initDB(): Promise<void> {
  if (sqlite3 !== null && db !== null) return; // already initialised

  // 1. Boot the Emscripten WASM module.
  //    locateFile redirects the runtime fetch to /wa-sqlite.wasm which is
  //    served from the Next.js public/ directory as a static asset.
  const module = await (
    SQLiteFactory as unknown as (opts: {
      locateFile: (f: string) => string;
    }) => Promise<unknown>
  )({
    locateFile: (f: string) => `${self.location.origin}/${f}`,
  });

  // 2. Wrap the low-level module in the wa-sqlite JS API.
  sqlite3 = SQLite.Factory(
    module as Parameters<typeof SQLite.Factory>[0],
  ) as SQLiteAPI;

  // 3. Initialise the OPFS VFS.
  //    AccessHandlePoolVFS uses createSyncAccessHandle() — synchronous I/O,
  //    no SharedArrayBuffer or COEP required at the VFS level.
  const vfs = new AccessHandlePoolVFS(OPFS_DIRECTORY);
  await vfs.isReady;

  // 4. Register as the default VFS for this worker.
  sqlite3.vfs_register(vfs as unknown as SQLiteVFS, true);

  // 5. Open (or create) the database file.
  db = await sqlite3.open_v2(DB_FILENAME);

  // 6. Run any pending schema migrations.
  await runMigrations();

  console.log("[db.worker] Initialised. OPFS directory:", OPFS_DIRECTORY);
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

async function runMigrations(): Promise<void> {
  if (!sqlite3 || db === null) throw new Error("DB not initialised");

  // Determine which version is currently applied.
  // If db_version doesn't exist yet this query will throw, so we catch
  // and treat that as "no migrations applied" (version 0).
  let currentVersion = 0;
  try {
    const rows = await querySQL("SELECT MAX(version) as v FROM db_version");
    const v = rows[0]?.v;
    if (typeof v === "number") currentVersion = v;
  } catch {
    // Table doesn't exist yet — start from version 0.
    currentVersion = 0;
  }

  if (currentVersion >= SCHEMA_VERSION) {
    console.log("[db.worker] Schema up to date at version", currentVersion);
    return;
  }

  // Apply each missing version in ascending order.
  const versions = Object.keys(MIGRATIONS)
    .map(Number)
    .filter((v) => v > currentVersion)
    .sort((a, b) => a - b);

  for (const version of versions) {
    console.log("[db.worker] Applying migration v" + version);
    for (const sql of MIGRATIONS[version]) {
      await execSQL(sql);
    }
    await execSQL(
      "INSERT INTO db_version (version, applied_at) VALUES (?, ?)",
      [version, new Date().toISOString()],
    );
    console.log("[db.worker] Migration v" + version + " applied.");
  }
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

async function execSQL(
  sql: string,
  bind?: (string | number | null)[],
): Promise<void> {
  if (!sqlite3 || db === null) throw new Error("DB not initialised");

  for await (const stmt of sqlite3.statements(db, sql)) {
    if (bind && bind.length > 0) {
      sqlite3.bind_collection(stmt, bind);
    }
    // Drain any rows (handles DDL, DML, and no-result SELECT alike).
    while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
      /* drain */
    }
  }
}

async function querySQL(
  sql: string,
  bind?: (string | number | null)[],
): Promise<Record<string, unknown>[]> {
  if (!sqlite3 || db === null) throw new Error("DB not initialised");

  const results: Record<string, unknown>[] = [];

  for await (const stmt of sqlite3.statements(db, sql)) {
    if (bind && bind.length > 0) {
      sqlite3.bind_collection(stmt, bind);
    }

    while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
      const names = sqlite3.column_names(stmt);
      const values = sqlite3.row(stmt);
      const row: Record<string, unknown> = {};
      names.forEach((name, i) => {
        row[name] = values[i];
      });
      results.push(row);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = async (event: MessageEvent<DBRequest>) => {
  const { id, type, sql, bind } = event.data;

  const reply = (payload: Omit<DBResponse, "id">) => {
    (self as unknown as Worker).postMessage({
      id,
      ...payload,
    } satisfies DBResponse);
  };

  try {
    switch (type) {
      case "INIT": {
        await initDB();
        reply({ type: "INIT_OK" });
        break;
      }

      case "EXEC": {
        if (!sql) throw new Error("EXEC requires a sql string");
        await execSQL(sql, bind);
        reply({ type: "EXEC_OK" });
        break;
      }

      case "EXEC_BATCH": {
        const { statements } = event.data;
        if (!statements || !Array.isArray(statements)) {
          throw new Error("EXEC_BATCH requires a statements array");
        }
        await execSQL("BEGIN");
        try {
          for (const { sql: bsql, bind: bbind } of statements) {
            await execSQL(bsql, bbind);
          }
          await execSQL("COMMIT");
        } catch (batchErr) {
          await execSQL("ROLLBACK").catch(() => {});
          throw batchErr;
        }
        reply({ type: "EXEC_BATCH_OK" });
        break;
      }

      case "QUERY": {
        if (!sql) throw new Error("QUERY requires a sql string");
        const rows = await querySQL(sql, bind);
        reply({ type: "QUERY_OK", rows });
        break;
      }

      default: {
        throw new Error(`Unknown message type: ${type}`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[db.worker] Error handling", type, ":", message);
    reply({ type: "ERROR", error: message });
  }
};
