export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export type JobType =
  | "analyze_repository"
  | "generate_ci"
  | "create_pull_request"
  | (string & {});

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}
