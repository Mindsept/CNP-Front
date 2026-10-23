import { api } from "@/lib/api";
import type {
  CloudTargetListResponse,
  CreateCloudTargetInput,
  CreateCloudTargetResponse,
} from "@/types/cloud-target";

export const cloudTargetService = {
  createForProject(projectId: string, input: CreateCloudTargetInput): Promise<CreateCloudTargetResponse> {
    return api.post<CreateCloudTargetResponse>(`/projects/${projectId}/cloud-targets`, input);
  },

  check(targetId: string): Promise<{ cloud_target_id: string; reachable: boolean; namespace: string }> {
    return api.post(`/cloud-targets/${targetId}/check`, {});
  },

  // Developer view: project cloud targets, now including global nodes (project_id: null).
  list(projectId: string): Promise<CloudTargetListResponse> {
    return api.get<CloudTargetListResponse>(
      `/projects/${projectId}/cloud-targets`,
    );
  },

  // Admin-only: list global (platform-wide) cloud nodes.
  listGlobal(): Promise<CloudTargetListResponse> {
    return api.get<CloudTargetListResponse>("/admin/cloud-nodes");
  },

  // Admin-only: register/update a global cloud node.
  createGlobal(
    input: CreateCloudTargetInput,
  ): Promise<CreateCloudTargetResponse> {
    return api.post<CreateCloudTargetResponse>("/admin/cloud-nodes", input);
  },
};
