export type SecretEnvironment = "ci" | "production" | "staging" | "development";

export interface ProjectSecret {
  id: string;
  project_id?: string;
  environment: SecretEnvironment | string;
  key: string;
  description?: string | null;
  created_at: string;
}

export interface CreateSecretInput {
  environment: string;
  key: string;
  value: string;
  description?: string;
}
