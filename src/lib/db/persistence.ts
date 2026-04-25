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
import { useAnalysisStore } from "../store/useAnalysisStore";
import { exec, execBatch, query, initDB } from "./db";
import type { DBStatement } from "./types";

// ---------------------------------------------------------------------------
// Ignored-column write helper (used by the analysisStore subscriber below)
// ---------------------------------------------------------------------------

async function writeIgnoredColumns(
  sessionId: number,
  columns: string[],
): Promise<void> {
  const statements: DBStatement[] = [
    {
      sql: `DELETE FROM ignored_columns WHERE session_id = ?`,
      bind: [sessionId],
    },
    ...columns.map((col) => ({
      sql: `INSERT INTO ignored_columns (session_id, column_name) VALUES (?, ?)`,
      bind: [sessionId, col] as (string | number | null)[],
    })),
  ];
  await execBatch(statements);
}

// ---------------------------------------------------------------------------
// Session tracking
// ---------------------------------------------------------------------------

/** The SQLite id of the currently active session, or null before first upload. */
let currentSessionId: number | null = null;

/**
 * Set to true while rehydrateSession() is populating the stores.
 * Prevents the write-path subscriber from treating rehydration as a
 * new-file upload or a user mutation and writing straight back to the DB.
 */
let isRehydrating = false;

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
  const rows = await query<{ id: number }>(`SELECT last_insert_rowid() AS id`);
  return rows[0].id;
}

async function deactivateAllSessions(): Promise<void> {
  await exec(`UPDATE sessions SET is_active = 0, updated_at = datetime('now')`);
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

async function writeRawRows(sessionId: number, rows: RowData[]): Promise<void> {
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

  console.log("[persistence] Session created:", id, "file:", state.fileName);
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
  if (isRehydrating) return;
  handleStateChange(state, prevState).catch((err) =>
    console.error("[persistence] Subscriber error:", err),
  );
});

// Subscribe to useAnalysisStore to persist ignoredColumns changes.
// toggleIgnoreColumn lives in useAnalysisStore, so the useWoznyStore
// subscriber above never sees those mutations.
useAnalysisStore.subscribe((state, prevState) => {
  if (isRehydrating) return;
  if (state.ignoredColumns === prevState.ignoredColumns) return;
  if (currentSessionId === null) return;

  writeIgnoredColumns(currentSessionId, state.ignoredColumns).catch((err) =>
    console.error("[persistence] Ignored columns write failed:", err),
  );
});

// ---------------------------------------------------------------------------
// Rehydration — read path (Phase 3b)
//
// Called once on app mount. Reads the most recent active session from the
// OPFS database and populates useWoznyStore and useAnalysisStore before the
// UI renders any data. Returns true if a session was restored, false if the
// database is empty (first visit or after a clear).
// ---------------------------------------------------------------------------

export async function rehydrateSession(): Promise<boolean> {
  await initDB();

  // 1. Find the most recent active session.
  const sessions = await query<{ id: number; file_name: string }>(
    `SELECT id, file_name FROM sessions
     WHERE is_active = 1
     ORDER BY id DESC LIMIT 1`,
  );

  if (sessions.length === 0) {
    console.log("[persistence] No active session — starting fresh.");
    return false;
  }

  const { id: sessionId, file_name: fileName } = sessions[0];

  // 2. Load dataset metadata.
  const metaRows = await query<{
    columns: string;
    column_widths: string;
    splittable_columns: string;
    sort_config: string | null;
    show_hidden_columns: number;
  }>(
    `SELECT columns, column_widths, splittable_columns,
            sort_config, show_hidden_columns
     FROM dataset_meta WHERE session_id = ?`,
    [sessionId],
  );

  if (metaRows.length === 0) {
    console.warn(
      "[persistence] Session",
      sessionId,
      "has no metadata — skipping rehydration.",
    );
    return false;
  }

  const meta = metaRows[0];

  // 3. Load raw rows (original upload, preserves rawRows state).
  const rawRecords = await query<{ row_json: string }>(
    `SELECT row_json FROM dataset_rows
     WHERE session_id = ? AND row_type = 'raw'
     ORDER BY row_index`,
    [sessionId],
  );

  // 4. Load clean rows (current working copy).
  const cleanRecords = await query<{ row_json: string }>(
    `SELECT row_json FROM dataset_rows
     WHERE session_id = ? AND row_type = 'clean'
     ORDER BY row_index`,
    [sessionId],
  );

  const rawRows = rawRecords.map(
    (r) => JSON.parse(String(r.row_json)) as RowData,
  );
  const cleanRows = cleanRecords.map(
    (r) => JSON.parse(String(r.row_json)) as RowData,
  );

  if (cleanRows.length === 0) {
    console.warn(
      "[persistence] Session",
      sessionId,
      "has no rows — skipping rehydration.",
    );
    return false;
  }

  // 5. Load ignored columns (useAnalysisStore state).
  const ignoredColRecords = await query<{ column_name: string }>(
    `SELECT column_name FROM ignored_columns WHERE session_id = ?`,
    [sessionId],
  );
  const ignoredColumns = ignoredColRecords.map((r) => String(r.column_name));

  // 6. Populate stores — suppress the write-path subscriber while doing so.
  currentSessionId = sessionId;
  isRehydrating = true;

  try {
    useWoznyStore.setState({
      fileName,
      rawRows,
      rows: cleanRows,
      columns: JSON.parse(String(meta.columns)) as string[],
      columnWidths: JSON.parse(String(meta.column_widths)) as Record<
        string,
        number
      >,
      splittableColumns: JSON.parse(String(meta.splittable_columns)) as Record<
        string,
        "ADDRESS" | "NAME" | "NONE"
      >,
      sortConfig: meta.sort_config
        ? (JSON.parse(String(meta.sort_config)) as WoznyState["sortConfig"])
        : null,
      showHiddenColumns: meta.show_hidden_columns === 1,
      // Land on report so the user immediately sees their data quality summary.
      activeTab: "report",
    });

    // Restore ignored columns via the store's own immer-wrapped action.
    // Using external setState({ ignoredColumns }) with Zustand v5 + immer
    // can silently lose the update; resetIgnoredColumns goes through the
    // proper set() path and is guaranteed to commit.
    if (ignoredColumns.length > 0) {
      useAnalysisStore.getState().resetIgnoredColumns(ignoredColumns);
    }
  } finally {
    isRehydrating = false;
  }

  console.log(
    "[persistence] Rehydrated session",
    sessionId,
    "—",
    fileName,
    "—",
    cleanRows.length,
    "rows",
  );

  return true;
}
