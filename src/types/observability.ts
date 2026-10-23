export type ObservabilityStatus = "disabled" | "preparing" | "activating" | "active" | "degraded" | "failed" | "disabling";
export interface ObservabilityBinding {
  binding_id: string;
  project_id: string;
  repository_id: string;
  service_key: string;
  cloud_target_id: string;
  environment: string;
  profile: string;
  desired_enabled: boolean;
  status: ObservabilityStatus;
  config_revision: number;
  job_id: string | null;
  last_verified_at: string | null;
  reason_code: string | null;
}
export interface ObservabilityBindingPage {
  items: ObservabilityBinding[];
  total: number;
  limit: number;
  offset: number;
}
export interface ObservabilityAvailability {
  available: boolean;
  reason_code: string | null;
  checked_at: string;
}
export interface ObservabilityPlan {
  plan_id: string;
  binding_id: string;
  cd_pipeline_id: string;
  binding_revision: number;
  enabled: boolean;
  status: "preview" | "obsolete";
  reason_code: string | null;
  certificate_renewal?: "automatic-v1" | null;
  deployable: false;
  artifact_digest: string;
  image_reference: string;
  files: Record<string, string>;
  sdk_environment: Record<string, string>;
  prerequisites: string[];
  created_at: string;
}
export interface ObservabilityApproval {
  approval_id: string;
  plan_id: string;
  binding_id: string;
  job_id: string | null;
  status: string;
  execution_revision: number;
}
export interface GrafanaLaunch {
  entry_url: string;
  ticket: string;
  method: "POST";
  expires_in: number;
}
