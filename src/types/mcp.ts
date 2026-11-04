export type ActionType = "secret_sync" | "ci_pr" | "cd_pr" | "pr_merge" | "deployment" | "traffic_switch";
export interface Action {
  id: string; run_id: string | null; type: ActionType; status: string; fingerprint: string;
  snapshot: { repository: string; base_sha?: string; environment: string; namespace?: string; image?: string; target_id?: string;
    files?: Record<string, string>; diff?: Record<string, string>; effects: string[]; [key: string]: unknown };
  effects: Record<string, unknown>; job_id: string | null; error_code: string | null; review_expires_at: string | null;
}
export interface Challenge { challenge: string; fingerprint: string; expires_at: string; snapshot: Action["snapshot"]; }
export interface Connection { id: string; client_name: string; scopes: string[]; project_ids: string[]; created_at: string; revoked_at: string | null; }
export interface McpPolicy { enabled: boolean; target_ids: string[]; version: number; }
export interface RunProgress { run_id: string; status: string; actions: Pick<Action, "id" | "type" | "status" | "job_id" | "effects" | "error_code">[];
  next_action?: string | null; arguments?: Record<string, string>; guidance?: string; }
