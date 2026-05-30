import { api } from "@/lib/api";
import type {
  CloudTargetListResponse,
  CreateCloudTargetInput,
  CreateCloudTargetResponse,
} from "@/types/cloud-target";

export const cloudTargetService = {
  list(projectId: string): Promise<CloudTargetListResponse> {
    return api.get<CloudTargetListResponse>(
      `/projects/${projectId}/cloud-targets`,
    );
  },

  upsert(
    projectId: string,
    input: CreateCloudTargetInput,
  ): Promise<CreateCloudTargetResponse> {
    return api.post<CreateCloudTargetResponse>(
      `/projects/${projectId}/cloud-targets`,
      input,
    );
  },
};
