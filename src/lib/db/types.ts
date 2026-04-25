// ---------------------------------------------------------------------------
// Shared types between db.ts (main thread) and db.worker.ts
// ---------------------------------------------------------------------------

export type DBMessageType =
  | "INIT"
  | "INIT_OK"
  | "EXEC"
  | "EXEC_OK"
  | "QUERY"
  | "QUERY_OK"
  | "ERROR";

export interface DBRequest {
  id: string;
  type: "INIT" | "EXEC" | "QUERY";
  sql?: string;
  bind?: (string | number | null)[];
}

export interface DBResponse {
  id: string;
  type: DBMessageType;
  rows?: Record<string, unknown>[];
  error?: string;
}
