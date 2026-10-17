import { api } from "@/lib/api";

export interface DatabaseConfig { configured: boolean; error?: string; postgres_version?: string; instance_class?: string; management_cidr?: string | null; supported_regions?: string[] }
export interface AwsConnection {
  id: string; name: string; provider: "aws"; account_id: string; role_arn?: string;
  region: string; status: "pending" | "connected"; vpc_id: string | null; created_at: string; managed_by_platform?: boolean;
}
export interface AwsConnectionSetup extends AwsConnection {
  external_id: string;
  trust_policy: Record<string, unknown>;
  permission_policy: Record<string, unknown>;
}
export interface AwsDatabaseJob {
  id: string; project_id: string; target_id: string; target_name: string; region: string; database_name: string;
  operation: "create" | "delete"; status: "queued" | "running" | "succeeded" | "failed";
  error: string | null;
  result: null | { deleted_outside_app?: boolean; database?: { identifier: string; endpoint: string; port: number; database_name: string; secret_key?: string }; cnp_cd_contract?: Record<string, unknown> };
  created_at: string;
}
export interface AzureDatabaseJob {
  id: string; project_id: string; target_id: string; target_name: string; region: string;
  database_name: string; secret_key: string; operation: "create" | "delete";
  status: "queued" | "running" | "succeeded" | "failed"; error: string | null;
  result: null | { database?: { identifier: string; endpoint: string; port: number; database_name: string; secret_key: string }; azure_contract?: Record<string, unknown>; deleted?: boolean };
  created_at: string;
}

export const dbaasService = {
  config: () => api.get<DatabaseConfig>("/dbaas/config"),
  connections: () => api.get<AwsConnection[]>("/dbaas/aws-connections"),
  createConnection: (input: { name: string; account_id: string; role_arn: string; region: string; project_id?: string }) =>
    api.post<AwsConnectionSetup>("/dbaas/aws-connections", input),
  connectionSetup: (id: string) => api.get<AwsConnectionSetup>(`/dbaas/aws-connections/${id}/setup`),
  verifyConnection: (id: string) => api.post<AwsConnection>(`/dbaas/aws-connections/${id}/verify`),
  awsDatabases: (projectId: string) => api.get<{ items: AwsDatabaseJob[] }>(`/dbaas/projects/${projectId}/aws-databases`),
  createAwsDatabase: (projectId: string, input: {
    request_id: string; target_id: string;
    database_name: string; postgres_version: string; db_instance_class: string; db_storage_gib: number;
    db_max_storage_gib: number; db_multi_az: boolean; backup_retention_days: number;
  }) => api.post<AwsDatabaseJob>(`/dbaas/projects/${projectId}/aws-databases`, input),
  retryAwsDatabase: (projectId: string, id: string) => api.post<AwsDatabaseJob>(`/dbaas/projects/${projectId}/aws-databases/${id}/retry`),
  deleteAwsDatabase: (projectId: string, id: string) => api.delete<AwsDatabaseJob>(`/dbaas/projects/${projectId}/aws-databases/${id}`),
  reconcileAwsDatabase: (projectId: string, id: string) => api.post<AwsDatabaseJob>(`/dbaas/projects/${projectId}/aws-databases/${id}/reconcile`),
  azureDatabases: (projectId: string) => api.get<{ items: AzureDatabaseJob[] }>(`/dbaas/projects/${projectId}/azure-databases`),
  createAzureDatabase: (projectId: string, input: {
    request_id: string; target_id: string; database_name: string; postgres_version: string; sku_name: string;
    storage_gib: number; backup_retention_days: number;
  }) => api.post<AzureDatabaseJob>(`/dbaas/projects/${projectId}/azure-databases`, input),
  retryAzureDatabase: (projectId: string, id: string) => api.post<AzureDatabaseJob>(`/dbaas/projects/${projectId}/azure-databases/${id}/retry`),
  deleteAzureDatabase: (projectId: string, id: string) => api.delete<AzureDatabaseJob>(`/dbaas/projects/${projectId}/azure-databases/${id}`),
};
