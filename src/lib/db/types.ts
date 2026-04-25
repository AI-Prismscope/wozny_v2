// ---------------------------------------------------------------------------
// Shared types between db.ts (main thread) and db.worker.ts
// ---------------------------------------------------------------------------

export type DBMessageType =
  | "INIT"
  | "INIT_OK"
  | "EXEC"
  | "EXEC_OK"
  | "EXEC_BATCH"
  | "EXEC_BATCH_OK"
  | "QUERY"
  | "QUERY_OK"
  | "ERROR";

/** A single parameterised SQL statement used in batch operations. */
export interface DBStatement {
  sql: string;
  bind?: (string | number | null)[];
}

export interface DBRequest {
  id: string;
  type: "INIT" | "EXEC" | "EXEC_BATCH" | "QUERY";
  /** Used by EXEC and QUERY. */
  sql?: string;
  /** Positional bind values for EXEC and QUERY. */
  bind?: (string | number | null)[];
  /** Used by EXEC_BATCH — array of statements to run inside one transaction. */
  statements?: DBStatement[];
}

export interface DBResponse {
  id: string;
  type: DBMessageType;
  rows?: Record<string, unknown>[];
  error?: string;
}
