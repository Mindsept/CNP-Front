import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type {
  CiAdaptInput,
  CiAdaptResponse,
  CiApproveInput,
  CiApproveResponse,
  CiCreatePrInput,
  CiCreatePrResponse,
  CiExplainInput,
  CiExplainResponse,
  CiPipelineListItem,
  CiPipelinePreview,
  CiPipelinePreviewInput,
  CiRequirements,
} from "@/types/ci";

export const ciService = {
  requirements(repositoryId: string): Promise<CiRequirements> {
    return api.get<CiRequirements>(
      `/repositories/${repositoryId}/ci/requirements`,
    );
  },

  preview(
    repositoryId: string,
    input: CiPipelinePreviewInput,
  ): Promise<CiPipelinePreview> {
    return api.post<CiPipelinePreview>(
      `/repositories/${repositoryId}/ci/preview`,
      input,
    );
  },

  adapt(
    repositoryId: string,
    pipelineId: string,
    input: CiAdaptInput,
  ): Promise<CiAdaptResponse> {
    return api.post<CiAdaptResponse>(
      `/repositories/${repositoryId}/ci/${pipelineId}/adapt`,
      input,
    );
  },

  explain(
    repositoryId: string,
    pipelineId: string,
    input: CiExplainInput,
  ): Promise<CiExplainResponse> {
    return api.post<CiExplainResponse>(
      `/repositories/${repositoryId}/ci/${pipelineId}/explain`,
      input,
    );
  },

  approve(
    repositoryId: string,
    pipelineId: string,
    input: CiApproveInput,
  ): Promise<CiApproveResponse> {
    return api.post<CiApproveResponse>(
      `/repositories/${repositoryId}/ci/${pipelineId}/approve`,
      input,
    );
  },

  createPr(
    repositoryId: string,
    pipelineId: string,
    input: CiCreatePrInput,
  ): Promise<CiCreatePrResponse> {
    return api.post<CiCreatePrResponse>(
      `/repositories/${repositoryId}/ci/${pipelineId}/create-pr`,
      input,
    );
  },

  list(repositoryId: string): Promise<Paginated<CiPipelineListItem>> {
    return api.get<Paginated<CiPipelineListItem>>(
      `/repositories/${repositoryId}/ci`,
    );
  },
};
