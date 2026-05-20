export interface GitHubInstallUrl {
  install_url: string;
}

export interface GitHubInstallation {
  id: string;
  installation_id: number;
  github_account_login: string;
  github_account_type: "User" | "Organization";
  repository_selection: "all" | "selected";
  created_at: string;
}

export interface GitHubRepository {
  github_repo_id: number;
  full_name: string;
  name: string;
  owner_login: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}
