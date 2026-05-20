export interface DashboardEvent {
  type: string;
  message: string;
  created_at: string;
}

export interface DashboardSummary {
  projects_count: number;
  repositories_count: number;
  repositories_analyzed_count: number;
  ci_generated_count: number;
  ci_pr_created_count: number;
  secrets_count: number;
  recent_events: DashboardEvent[];
}
