export type CiPipelineStatus =
  | "draft"
  | "generated"
  | "adapted"
  | "approved"
  | "pr_created"
  | "committed"
  | "error";

export type CiProvider = "github_actions";
export type CiGenerationMode = "deterministic" | "ai_assisted";

export interface CiPipelinePreviewInput {
  mode?: CiGenerationMode;
  provider?: CiProvider;
  include_docker_build?: boolean;
  include_docker_push_on_main?: boolean;
  registry?: string;
  explain_with_ai?: boolean;
}

export interface CiPipelinePreview {
  ci_pipeline_id: string;
  repository_id: string;
  status: CiPipelineStatus;
  generation_mode: CiGenerationMode;
  workflow_path: string;
  generated_yaml: string;
  explanation: string;
  required_secrets: string[];
}

export interface CiAdaptInput {
  instruction: string;
}

export interface CiAdaptResponse {
  ci_pipeline_id: string;
  status: CiPipelineStatus;
  adapted_yaml: string;
  explanation: string;
  diff_summary: string[];
}

export interface CiExplainInput {
  detail_level: "low" | "medium" | "high";
}

export interface CiExplainResponse {
  ci_pipeline_id: string;
  explanation: string;
}

export interface CiApproveInput {
  use_adapted_yaml: boolean;
}

export interface CiApproveResponse {
  ci_pipeline_id: string;
  status: CiPipelineStatus;
  approved_by: string;
  approved_at: string;
}

export interface CiCreatePrInput {
  base_branch: string;
  branch_name: string;
  commit_message: string;
  pull_request_title: string;
  pull_request_body: string;
}

export interface CiCreatePrResponse {
  ci_pipeline_id: string;
  status: CiPipelineStatus;
  pull_request_url: string;
  pull_request_number: number;
  branch_name: string;
}

export interface CiPipelineListItem {
  id: string;
  status: CiPipelineStatus;
  generation_mode: CiGenerationMode;
  workflow_path: string;
  pull_request_url?: string | null;
  created_at: string;
}
