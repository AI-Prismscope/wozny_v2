// ---------------------------------------------------------------------------
// migrations.ts — Wozny OPFS database schema and migration runner
//
// This module is imported by db.worker.ts and executed immediately after the
// database is opened. All statements use CREATE TABLE IF NOT EXISTS so the
// runner is idempotent — safe to call on every page load.
//
// To add a new migration in the future:
//  1. Increment SCHEMA_VERSION.
//  2. Add an entry to MIGRATIONS keyed by the new version number.
//  3. The runner will detect the gap and apply only the missing steps.
// ---------------------------------------------------------------------------

/** Current schema version. Stored in db_version on first run. */
export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// v1 — initial schema
// ---------------------------------------------------------------------------

/**
 * DDL for the initial schema (version 1).
 *
 * Each statement is kept as its own string so the worker can execute them
 * one at a time and surface meaningful error messages if anything fails.
 */
export const V1_STATEMENTS: readonly string[] = [
  // ------------------------------------------------------------------
  // db_version — tracks which migrations have been applied.
  // One row per applied migration version.
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS db_version (
    version    INTEGER NOT NULL,
    applied_at TEXT    NOT NULL
  )`,

  // ------------------------------------------------------------------
  // sessions — one row per uploaded dataset / workspace.
  // Only one session is active at a time (is_active = 1).
  // Future phases will expose a session list so users can return to
  // previous workspaces.
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name  TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    is_active  INTEGER NOT NULL DEFAULT 0
  )`,

  // ------------------------------------------------------------------
  // dataset_meta — scalar / JSON metadata for a session.
  // Exactly one row per session (1-to-1 with sessions).
  //
  // Columns stored as JSON:
  //   columns             → string[]
  //   column_widths       → Record<string, number>
  //   splittable_columns  → Record<string, 'ADDRESS' | 'NAME' | 'NONE'>
  //   sort_config         → { columnId: string; direction: 'asc'|'desc' } | null
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS dataset_meta (
    session_id          INTEGER PRIMARY KEY,
    columns             TEXT    NOT NULL DEFAULT '[]',
    column_widths       TEXT    NOT NULL DEFAULT '{}',
    splittable_columns  TEXT    NOT NULL DEFAULT '{}',
    sort_config         TEXT,
    show_hidden_columns INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  )`,

  // ------------------------------------------------------------------
  // dataset_rows — individual data rows for a session.
  //
  // row_type is either:
  //   'raw'   — the original row as uploaded (never mutated after insert)
  //   'clean' — the current working copy (updated as the user cleans data)
  //
  // row_json stores the full RowData object as a JSON string.
  // row_index preserves the original row order within its type group.
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS dataset_rows (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    row_type   TEXT    NOT NULL CHECK (row_type IN ('raw', 'clean')),
    row_index  INTEGER NOT NULL,
    row_json   TEXT    NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  )`,

  // Index for the most common access pattern: fetch all rows for a
  // session in order, filtered by type.
  `CREATE INDEX IF NOT EXISTS idx_dataset_rows_session_type
    ON dataset_rows (session_id, row_type, row_index)`,

  // ------------------------------------------------------------------
  // analysis_issues — cached output of runDeterministicAnalysis.
  // Cleared and re-populated whenever the analysis store re-runs.
  // Storing here means analysis results survive a page refresh without
  // needing to re-run the analysis on load.
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS analysis_issues (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL,
    row_id      INTEGER NOT NULL,
    column_name TEXT    NOT NULL,
    issue_type  TEXT    NOT NULL
                  CHECK (issue_type IN ('FORMAT','DUPLICATE','MISSING','VALIDITY')),
    suggestion  TEXT    NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_analysis_issues_session
    ON analysis_issues (session_id)`,

  // ------------------------------------------------------------------
  // ignored_columns — columns the user has chosen to suppress in the UI.
  // Maps to useAnalysisStore.ignoredColumns.
  // UNIQUE constraint prevents duplicates when the user toggles rapidly.
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS ignored_columns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL,
    column_name TEXT    NOT NULL,
    UNIQUE (session_id, column_name),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  )`,
];

/**
 * Map of version → DDL statement arrays.
 * The runner iterates this in ascending key order and applies any versions
 * that are not yet recorded in db_version.
 */
export const MIGRATIONS: Record<number, readonly string[]> = {
  1: V1_STATEMENTS,
};
