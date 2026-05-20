export type OnboardingStatus =
  | "registered"
  | "analyzing"
  | "analyzed"
  | "ci_generated"
  | "ci_approved"
  | "pr_created"
  | "onboarded"
  | "error";

export type StackType =
  | "python_fastapi"
  | "node"
  | "java_maven"
  | "go"
  | "generic_docker"
  | "unknown";

export interface RepositorySummary {
  id: string;
  full_name: string;
  detected_stack: StackType | null;
  dockerfile_present: boolean;
  ci_present: boolean;
  onboarding_status: OnboardingStatus;
  last_analyzed_at: string | null;
}

export interface Repository {
  id: string;
  project_id: string;
  provider?: string;
  full_name: string;
  name?: string;
  default_branch: string;
  onboarding_status: OnboardingStatus;
  detected_stack: StackType | null;
  dockerfile_present: boolean;
  ci_present: boolean;
  html_url: string;
}

export interface RepositoryAnalysis {
  id: string;
  repository_id: string;
  detected_stack: StackType;
  confidence: number;
  dockerfile_present: boolean;
  ci_present: boolean;
  test_detected: boolean;
  test_command: string | null;
  created_at: string;
  files_detected?: string[];
  recommendations?: string[];
}

export interface ImportRepositoryInput {
  github_installation_id: string;
  github_repo_id: number;
}

export interface AnalyzeRepositoryInput {
  ref?: string;
  async?: boolean;
}

export interface AnalyzeRepositoryResponse {
  job_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  type: "analyze_repository";
}
