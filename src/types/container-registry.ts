export type RegistryProvider = "ghcr" | "dockerhub" | "ecr" | "gar";

export interface ContainerRegistry {
  id: string;
  name: string;
  provider: RegistryProvider;
  registry_url: string;
  namespace: string;
  auth_secret_name: string;
  is_default: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContainerRegistryInput {
  name: string;
  provider: RegistryProvider;
  registry_url: string;
  namespace: string;
  auth_secret_name: string;
  token: string;
  is_default: boolean;
  description?: string;
}

export interface CreateContainerRegistryResponse {
  registry: ContainerRegistry;
  created: boolean;
  stored_secret_key: string;
}

export interface ContainerRegistryListResponse {
  items: ContainerRegistry[];
}
