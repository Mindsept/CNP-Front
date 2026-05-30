import { api } from "@/lib/api";
import type {
  CdApproveResponse,
  CdCreatePrInput,
  CdCreatePrResponse,
  CdDeploymentStatus,
  CdPipelineListResponse,
  CdPreview,
  CdPreviewInput,
  CdRequirements,
} from "@/types/cd";

export const cdService = {
  requirements(repositoryId: string): Promise<CdRequirements> {
    return api.get<CdRequirements>(
      `/repositories/${repositoryId}/cd/requirements`,
    );
  },

  preview(
    repositoryId: string,
    input: CdPreviewInput,
  ): Promise<CdPreview> {
    return api.post<CdPreview>(
      `/repositories/${repositoryId}/cd/preview`,
      input,
    );
  },

  approve(
    repositoryId: string,
    pipelineId: string,
  ): Promise<CdApproveResponse> {
    return api.post<CdApproveResponse>(
      `/repositories/${repositoryId}/cd/${pipelineId}/approve`,
      {},
    );
  },

  createPr(
    repositoryId: string,
    pipelineId: string,
    input: CdCreatePrInput,
  ): Promise<CdCreatePrResponse> {
    return api.post<CdCreatePrResponse>(
      `/repositories/${repositoryId}/cd/${pipelineId}/create-pr`,
      input,
    );
  },

  list(repositoryId: string): Promise<CdPipelineListResponse> {
    return api.get<CdPipelineListResponse>(
      `/repositories/${repositoryId}/cd`,
    );
  },

  deployment(
    repositoryId: string,
    pipelineId: string,
  ): Promise<CdDeploymentStatus> {
    return api.get<CdDeploymentStatus>(
      `/repositories/${repositoryId}/cd/${pipelineId}/deployment`,
    );
  },

  refreshDeployment(
    repositoryId: string,
    pipelineId: string,
  ): Promise<CdDeploymentStatus> {
    return api.post<CdDeploymentStatus>(
      `/repositories/${repositoryId}/cd/${pipelineId}/refresh-deployment`,
      {},
    );
  },
};
