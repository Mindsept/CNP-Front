import type { CloudTarget } from "./cloud-target";

export type CdPipelineStatus =
  | "draft"
  | "generated"
  | "approved"
  | "pr_created"
  | "error";

export type CdServiceType = "LoadBalancer" | "ClusterIP" | "NodePort";
export type CdKubeconfigStrategy = "secret" | "azure_cli";

export interface CdEnvVarRequirement {
  name: string;
  source: string;
  required: boolean;
  sensitive: boolean;
  default_value_present: boolean;
}

export interface CdSecretMapping {
  env_name: string;
  project_secret_key: string;
  github_secret_name: string;
  kubernetes_secret_name: string;
}

export interface CdResolvedSecretMapping extends CdSecretMapping {
  project_secret_configured: boolean;
}

export interface CdSuggestedMapping extends CdResolvedSecretMapping {}

export interface CdRequirements {
  repository_id: string;
  cloud_targets: CloudTarget[];
  detected_env_vars: CdEnvVarRequirement[];
  required_env_vars: string[];
  configured_cd_project_secrets: string[];
  required_cloud_secret_names: string[];
  suggested_mappings: CdSuggestedMapping[];
  missing_project_secrets: string[];
  default_image: string;
}

export interface CdPreviewInput {
  cloud_target_id: string;
  app_name: string;
  image: string;
  image_tag: string;
  container_port: number;
  replicas: number;
  service_type: CdServiceType;
  kubeconfig_strategy: CdKubeconfigStrategy;
  include_image_pull_secret: boolean;
  image_pull_secret_name?: string;
  auto_map_project_secrets: boolean;
  env_secret_mappings: CdSecretMapping[];
}

export interface CdFile {
  path: string;
  content: string;
}

export interface CdPreview {
  cd_pipeline_id: string;
  repository_id: string;
  cloud_target_id: string;
  status: CdPipelineStatus;
  app_name: string;
  namespace: string;
  image: string;
  image_tag: string;
  required_secrets: string[];
  missing_project_secrets: string[];
  detected_env_vars: CdEnvVarRequirement[];
  env_secret_mappings: CdResolvedSecretMapping[];
  files: CdFile[];
}

export interface CdApproveResponse {
  cd_pipeline_id: string;
  status: CdPipelineStatus;
  approved_by: string;
  approved_at: string;
}

export interface CdCreatePrInput {
  base_branch: string;
  branch_name?: string;
  commit_message: string;
  pull_request_title: string;
  pull_request_body?: string;
  sync_secrets_to_github: boolean;
}

export interface CdCreatePrResponse {
  cd_pipeline_id: string;
  status: CdPipelineStatus;
  pull_request_url: string;
  pull_request_number: number;
  branch_name: string;
  synced_secrets: string[];
}

export interface CdPipelineListItem {
  id: string;
  cloud_target_id: string;
  status: CdPipelineStatus;
  app_name: string;
  namespace: string;
  image: string;
  image_tag: string;
  pull_request_url?: string | null;
  created_at: string;
}

export interface CdPipelineListResponse {
  items: CdPipelineListItem[];
}
