// ---------------------------------------------------------------------------
// db.ts — main-thread bridge to the OPFS database worker
//
// All public functions return Promises and are safe to call before the worker
// has finished initialising — initDB() is automatically awaited internally.
// ---------------------------------------------------------------------------

import type { DBRequest, DBResponse, DBStatement, Session } from "./types";

// ---------------------------------------------------------------------------
// Worker singleton
// ---------------------------------------------------------------------------

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;
const pending = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./db.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent<DBResponse>) => {
      const { id, type, error, ...rest } = event.data;
      const req = pending.get(id);
      if (!req) return;
      pending.delete(id);

      if (type === "ERROR") {
        req.reject(new Error(error ?? "Unknown db worker error"));
      } else {
        req.resolve(rest);
      }
    };

    worker.onerror = (err) => {
      console.error("[db] Worker crashed:", err.message);
      // Reject all in-flight requests so callers don't hang forever.
      for (const [id, req] of pending) {
        pending.delete(id);
        req.reject(new Error(`Worker crashed: ${err.message}`));
      }
      // Allow re-creation on the next call.
      worker = null;
      initPromise = null;
    };
  }

  return worker;
}

function send<T = unknown>(
  type: DBRequest["type"],
  payload: Partial<Pick<DBRequest, "sql" | "bind" | "statements">> = {},
): Promise<T> {
  const id = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (v: unknown) => void,
      reject,
    });
    getWorker().postMessage({ id, type, ...payload } satisfies DBRequest);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the database worker and open the OPFS database.
 * Safe to call multiple times — only the first call does real work.
 */
export function initDB(): Promise<void> {
  if (!initPromise) {
    initPromise = send("INIT").then(() => undefined);
  }
  return initPromise;
}

/**
 * Execute one or more SQL statements that produce no rows (DDL, INSERT,
 * UPDATE, DELETE). Parameterised values go in `bind` (positional).
 */
export async function exec(
  sql: string,
  bind?: (string | number | null)[],
): Promise<void> {
  await initDB();
  await send("EXEC", { sql, bind });
}

/**
 * Execute a SELECT statement and return the result rows as plain objects
 * keyed by column name. Parameterised values go in `bind` (positional).
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  bind?: (string | number | null)[],
): Promise<T[]> {
  await initDB();
  const result = await send<{ rows: T[] }>("QUERY", { sql, bind });
  return result.rows ?? [];
}

/**
 * Execute an array of SQL statements inside a single SQLite transaction.
 * All statements succeed or all are rolled back — there is no partial commit.
 * This is the preferred path for bulk inserts (e.g. writing all dataset rows)
 * because it is a single worker round-trip regardless of statement count.
 */
export async function execBatch(statements: DBStatement[]): Promise<void> {
  await initDB();
  await send("EXEC_BATCH", { statements });
}

/**
 * Terminate the worker immediately and reset all state.
 * The next call to any public function will spin up a fresh worker.
 */
export function closeDB(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  initPromise = null;
  pending.clear();
}

/**
 * Fetch all sessions from the database, ordered by most recently updated.
 */
export async function getAllSessions(): Promise<Session[]> {
  await initDB();
  const result = await query<Session>(
    `SELECT id, file_name, created_at, updated_at, is_active FROM sessions
     ORDER BY updated_at DESC`,
  );
  return result;
}

/**
 * Sets a specific session as active and deactivates all others.
 * @param sessionId The ID of the session to activate.
 */
export async function activateSession(sessionId: number): Promise<void> {
  await initDB();
  await execBatch([
    {
      sql: `UPDATE sessions SET is_active = 0, updated_at = datetime('now') WHERE is_active = 1`,
    },
    {
      sql: `UPDATE sessions SET is_active = 1, updated_at = datetime('now') WHERE id = ?`,
      bind: [sessionId],
    },
  ]);
}

/**
 * Deletes a session and all its associated data.
 * Due to ON DELETE CASCADE, all linked rows in other tables will also be deleted.
 * @param sessionId The ID of the session to delete.
 */
export async function deleteSession(sessionId: number): Promise<void> {
  await initDB();
  await exec(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
}

/**
 * Get the most recent active session.
 * @returns The active session or null if none exists.
 */
export async function getActiveSession(): Promise<Session | null> {
  await initDB();
  const sessions = await query<Session>(
    `SELECT id, file_name, created_at, updated_at, is_active FROM sessions
     WHERE is_active = 1
     ORDER BY id DESC LIMIT 1`,
  );
  return sessions.length > 0 ? sessions[0] : null;
}

/**
 * Get a specific session by ID.
 * @param sessionId The ID of the session to fetch.
 * @returns The session or null if not found.
 */
export async function getSessionById(sessionId: number): Promise<Session | null> {
  await initDB();
  const sessions = await query<Session>(
    `SELECT id, file_name, created_at, updated_at, is_active FROM sessions WHERE id = ?`,
    [sessionId],
  );
  return sessions.length > 0 ? sessions[0] : null;
}
