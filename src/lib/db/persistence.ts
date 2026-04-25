// ---------------------------------------------------------------------------
// persistence.ts — write-path subscriber for OPFS SQLite
//
// Imported once as a side-effect (import '@/lib/db/persistence') from the
// app root. Sets up a Zustand subscriber that mirrors useWoznyStore mutations
// to the OPFS database in the background.
//
// Design decisions:
//  - Fire-and-forget async writes: store mutations remain synchronous and
//    the UI never waits for the DB. Errors are logged, never thrown to React.
//  - Full clean-row replacement: when rows change, delete-and-reinsert all
//    clean rows inside a single transaction via execBatch. Simpler than
//    diffing, and SQLite handles it fast enough for typical CSV sizes.
//  - 500 ms debounce on row writes: prevents a flood of DB writes during
//    rapid cell edits or bulk operations.
//  - Metadata writes are immediate (cheap single-row upsert).
// ---------------------------------------------------------------------------

import { useWoznyStore, RowData, WoznyState } from "../store/useWoznyStore";
import { exec, execBatch, query, initDB } from "./db";
import type { DBStatement } from "./types";

// ---------------------------------------------------------------------------
// Session tracking
// ---------------------------------------------------------------------------

/** The SQLite id of the currently active session, or null before first upload. */
let currentSessionId: number | null = null;

export function getCurrentSessionId(): number | null {
  return currentSessionId;
}

// ---------------------------------------------------------------------------
// Debounce state
// ---------------------------------------------------------------------------

const ROW_WRITE_DEBOUNCE_MS = 500;
let rowDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Low-level DB helpers
// ---------------------------------------------------------------------------

async function createSession(fileName: string): Promise<number> {
  await exec(
    `INSERT INTO sessions (file_name, is_active, created_at, updated_at)
     VALUES (?, 1, datetime('now'), datetime('now'))`,
    [fileName],
  );
  const rows = await query<{ id: number }>(
    `SELECT last_insert_rowid() AS id`,
  );
  return rows[0].id;
}

async function deactivateAllSessions(): Promise<void> {
  await exec(
    `UPDATE sessions SET is_active = 0, updated_at = datetime('now')`,
  );
}

async function upsertDatasetMeta(
  sessionId: number,
  state: WoznyState,
): Promise<void> {
  await exec(
    `INSERT OR REPLACE INTO dataset_meta
       (session_id, columns, column_widths, splittable_columns,
        sort_config, show_hidden_columns)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      JSON.stringify(state.columns),
      JSON.stringify(state.columnWidths),
      JSON.stringify(state.splittableColumns),
      state.sortConfig ? JSON.stringify(state.sortConfig) : null,
      state.showHiddenColumns ? 1 : 0,
    ],
  );
}

function buildRowInsertStatements(
  sessionId: number,
  rowType: "raw" | "clean",
  rows: RowData[],
): DBStatement[] {
  const statements: DBStatement[] = [
    {
      sql: `DELETE FROM dataset_rows
            WHERE session_id = ? AND row_type = ?`,
      bind: [sessionId, rowType],
    },
  ];
  for (let i = 0; i < rows.length; i++) {
    statements.push({
      sql: `INSERT INTO dataset_rows
              (session_id, row_type, row_index, row_json)
            VALUES (?, ?, ?, ?)`,
      bind: [sessionId, rowType, i, JSON.stringify(rows[i])],
    });
  }
  return statements;
}

async function writeRawRows(
  sessionId: number,
  rows: RowData[],
): Promise<void> {
  await execBatch(buildRowInsertStatements(sessionId, "raw", rows));
}

async function writeCleanRows(
  sessionId: number,
  rows: RowData[],
): Promise<void> {
  await execBatch(buildRowInsertStatements(sessionId, "clean", rows));
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

async function handleNewFile(state: WoznyState): Promise<void> {
  await initDB();

  // Deactivate any previous session before creating the new one.
  await deactivateAllSessions();

  const id = await createSession(state.fileName ?? "Untitled");
  currentSessionId = id;

  // Write metadata, raw rows, and clean rows concurrently where possible.
  // Raw rows are the original upload — written once and never mutated.
  // Clean rows start as a copy of raw rows on first load.
  await upsertDatasetMeta(id, state);
  await writeRawRows(id, state.rawRows);
  await writeCleanRows(id, state.rows);

  console.log(
    "[persistence] Session created:",
    id,
    "file:",
    state.fileName,
  );
}

// ---------------------------------------------------------------------------
// Debounced write helpers
// ---------------------------------------------------------------------------

function scheduleCleanRowWrite(sessionId: number, rows: RowData[]): void {
  if (rowDebounceTimer !== null) clearTimeout(rowDebounceTimer);
  rowDebounceTimer = setTimeout(() => {
    rowDebounceTimer = null;
    writeCleanRows(sessionId, rows).catch((err) =>
      console.error("[persistence] Clean row write failed:", err),
    );
  }, ROW_WRITE_DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Main subscriber
// ---------------------------------------------------------------------------

async function handleStateChange(
  state: WoznyState,
  prevState: WoznyState,
): Promise<void> {
  // ── New file uploaded ────────────────────────────────────────────────────
  // fileName changes from null → string or from one filename to another.
  if (state.fileName !== prevState.fileName && state.fileName !== null) {
    await handleNewFile(state);
    return;
  }

  // ── No active session — nothing to persist yet ───────────────────────────
  if (currentSessionId === null) return;

  // ── Clean rows mutated ───────────────────────────────────────────────────
  // Covers: updateCell, removeRow, resolveDuplicates, bulkUpdate,
  //         addColumn, splitAddressColumn.
  // The reference inequality check is cheap — immer always produces a new
  // array reference when any row or column changes.
  if (state.rows !== prevState.rows) {
    scheduleCleanRowWrite(currentSessionId, state.rows);
  }

  // ── Structural metadata changed ──────────────────────────────────────────
  // Covers: addColumn (columns + columnWidths + splittableColumns),
  //         splitAddressColumn (same), toggleSort (sortConfig),
  //         toggleShowHiddenColumns (showHiddenColumns).
  if (
    state.columns !== prevState.columns ||
    state.columnWidths !== prevState.columnWidths ||
    state.splittableColumns !== prevState.splittableColumns ||
    state.sortConfig !== prevState.sortConfig ||
    state.showHiddenColumns !== prevState.showHiddenColumns
  ) {
    upsertDatasetMeta(currentSessionId, state).catch((err) =>
      console.error("[persistence] Metadata write failed:", err),
    );
  }
}

// ---------------------------------------------------------------------------
// Activate the subscriber
//
// Called immediately when this module is imported. The subscriber is a
// lightweight synchronous wrapper — the real async work happens inside
// handleStateChange, so the Zustand notify loop is never blocked.
// ---------------------------------------------------------------------------

useWoznyStore.subscribe((state, prevState) => {
  handleStateChange(state, prevState).catch((err) =>
    console.error("[persistence] Subscriber error:", err),
  );
});
