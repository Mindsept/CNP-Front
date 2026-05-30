export type CloudProvider = "azure" | "aws" | "gcp";
export type ClusterType = "aks" | "eks" | "gke";
export type ServiceType = "LoadBalancer" | "ClusterIP" | "NodePort";

export interface CloudTargetConfig {
  tenant_id?: string;
  subscription_id?: string;
  resource_group?: string;
  [key: string]: unknown;
}

export interface KubeconfigStrategy {
  option_a_secret_name?: string;
  option_b_secret_names?: {
    azure_client_id?: string;
    azure_client_secret?: string;
    azure_tenant_id?: string;
    azure_subscription_id?: string;
  };
  get_credentials_command?: string;
}

export interface DeploymentDefaults {
  namespace?: string;
  service_type?: ServiceType;
  public_url_format?: string;
  manifest_paths?: string[];
}

export interface CloudTargetInput {
  name: string;
  environment: string;
  provider: CloudProvider;
  cluster_type: ClusterType;
  region: string;
  cluster_name: string;
  namespace: string;
  config: CloudTargetConfig;
}

export interface CloudTarget extends CloudTargetInput {
  id: string;
  /** null for global (platform-wide) cloud nodes, a project id for legacy scoped ones. */
  project_id: string | null;
  kubeconfig_strategy: KubeconfigStrategy;
  deployment_defaults: DeploymentDefaults;
  created_at: string;
  updated_at: string;
}

export interface CreateCloudTargetInput {
  cloud_target: CloudTargetInput;
  kubeconfig_strategy: KubeconfigStrategy;
  deployment_defaults: DeploymentDefaults;
  secret_values?: Record<string, string>;
}

export interface CreateCloudTargetResponse {
  cloud_target: CloudTarget;
  created: boolean;
  upserted_secret_keys: string[];
}

export interface CloudTargetListResponse {
  items: CloudTarget[];
}
