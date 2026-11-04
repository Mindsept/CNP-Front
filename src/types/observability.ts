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

export type ObservabilityIntent = "enable" | "disable";
export type GrafanaDestination = "overview" | "logs" | "metrics" | "traces";
export interface ObservabilityScope {
  project_id: string;
  repository_id: string;
  cloud_target_id: string;
  service_key: string;
  environment: string;
  profile: string | null;
}
export interface ObservabilityImage {
  reference: string;
  digest: string;
  platform_digest: string | null;
  image_commit_sha: string | null;
  build_id: string | null;
  ci_run_id: number | null;
  ci_run_attempt: number | null;
}
export type CurrentImageState = "verified" | "unknown" | "not_deployed";
export interface ObservabilityHealth {
  status: "active" | "degraded" | "disabled" | "unknown";
  observed_at: string;
  verified_revision: number | null;
  last_verified_at: string | null;
  reason_code: string | null;
}
export interface ObservabilityCapability {
  available: boolean;
  reason_code: string | null;
  message: string | null;
}
export interface ObservabilityContext {
  scope: ObservabilityScope;
  binding_id: string | null;
  desired_enabled: boolean;
  desired_revision: number;
  current_effective_revision: number | null;
  health: ObservabilityHealth;
  application_status: "unknown" | "ready" | "not_ready" | "not_deployed";
  current_image: ObservabilityImage | null;
  current_image_state: CurrentImageState;
  latest_operation_id: string | null;
  can_manage: boolean;
  capabilities: Record<ObservabilityIntent, ObservabilityCapability>;
  refresh_after_seconds: number;
}
export interface ObservabilityEffect { code: string; description: string }
export interface ActivationPlan {
  plan_id: string;
  binding_id: string | null;
  scope: ObservabilityScope;
  intent: ObservabilityIntent;
  status: "ready" | "blocked" | "no_change";
  plan_digest: string;
  expected_revision: number;
  current_effective_revision: number | null;
  current_image: ObservabilityImage | null;
  current_image_state: CurrentImageState;
  candidate_image: ObservabilityImage | null;
  selection_context: {
    branch_name: string | null;
    branch_head_sha: string | null;
    head_ci_status: "pending" | "succeeded" | "failed" | "no_run" | "unknown";
    selected_commit_sha: string | null;
    reason: "latest_eligible" | "head_ci_pending" | "head_ci_failed" | "head_build_ineligible" | "unknown";
    verified_at: string | null;
  } | null;
  build_id: string | null;
  cd_pipeline_id: string | null;
  deployment_source_sha: string | null;
  branch_head_sha: string | null;
  deployment_required: boolean;
  restart_required: boolean;
  application_rollouts: number;
  collection_interruption_expected: boolean;
  effects: ObservabilityEffect[];
  blockers: { code: string; message: string; recovery_action: string; operation_id: string | null }[];
  created_at: string;
  expires_at: string;
}
export interface OperationRequest { expected_plan_digest: string; expected_revision: number }
export interface ObservabilityOperation {
  operation_id: string;
  plan_id: string;
  plan_digest: string;
  binding_id: string;
  scope: ObservabilityScope;
  intent: ObservabilityIntent;
  status: "queued" | "running" | "succeeded" | "failed" | "superseded";
  stage: "accepted" | "checking_preconditions" | "waiting_cd" | "reconciling_external_effect" | "verifying_deployment" | "applying_observability" | "waiting_rollout" | "verifying_signals" | "suspending_collection_alerts" | "revoking_ingestion" | "removing_instrumentation" | "removing_owned_resources" | "completed";
  desired_revision: number;
  current_effective_revision: number | null;
  attempt_number: number;
  previous_operation_id: string | null;
  image: ObservabilityImage | null;
  deployment_source_sha: string | null;
  effects: ObservabilityEffect[];
  application_rollouts: number;
  collection_interruption_expected: boolean;
  health: ObservabilityHealth;
  evidence: {
    cd_action_id: string | null;
    cd_workflow_run_id: number | null;
    verified_revision: number | null;
    deployment_verified_at: string | null;
    signals_verified_at: string | null;
    disable_verified_at: string | null;
  };
  failure: { code: string; message: string } | null;
  retryable: boolean;
  next_action: "wait" | "retry" | "refresh_plan" | "open_grafana" | "operator_reconciliation" | "none";
  created_at: string;
  updated_at: string;
  stage_deadline_at: string | null;
  completed_at: string | null;
  refresh_after_seconds: number;
}
export interface ObservabilityOperationPage {
  items: ObservabilityOperation[];
  total: number;
  limit: number;
  offset: number;
}
export interface ObservabilityIncident {
  id: string;
  project_id: string;
  binding_id: string;
  service_key: string;
  environment: string;
  kind: string;
  title: string;
  severity: "warning" | "critical";
  technical_state: "firing" | "resolved";
  started_at: string;
  last_observed_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  observed_value: number | null;
  revision: number;
  notifications?: Array<{
    id: string;
    channel: "whatsapp";
    transition: "firing" | "resolved";
    content_mode: "trial_template" | "incident_template";
    status: string;
    reason_code: string | null;
    updated_at: string;
  }>;
}
export interface ObservabilityIncidentPage { items: ObservabilityIncident[]; total: number; limit: number; offset: number }
export interface ObservabilityAlertPolicy {
  binding_id: string;
  enabled: boolean;
  latency_budget_ms: number | null;
  status: "pending" | "active" | "suspended" | "disabled" | "error";
  reason_code: string | null;
  suspended_until: string | null;
  applied_revision: number | null;
  last_reconciled_at: string | null;
  sms_enabled: false;
  availability_supported: false;
}
