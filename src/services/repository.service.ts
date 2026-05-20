import { api } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import type { Paginated } from "@/types/api";
import type {
  AnalyzeRepositoryInput,
  AnalyzeRepositoryResponse,
  ImportRepositoryInput,
  Repository,
  RepositoryAnalysis,
  RepositorySummary,
} from "@/types/repository";

export const repositoryService = {
  list(projectId: string): Promise<Paginated<RepositorySummary>> {
    return api.get<Paginated<RepositorySummary>>(
      `/projects/${projectId}/repositories`,
    );
  },

  import(
    projectId: string,
    input: ImportRepositoryInput,
  ): Promise<Repository> {
    return api.post<Repository>(
      `/projects/${projectId}/repositories/import`,
      input,
    );
  },

  get(repositoryId: string): Promise<Repository> {
    return api.get<Repository>(`/repositories/${repositoryId}`);
  },

  analyze(
    repositoryId: string,
    input: AnalyzeRepositoryInput = { ref: "main", async: true },
  ): Promise<AnalyzeRepositoryResponse> {
    return api.post<AnalyzeRepositoryResponse>(
      `/repositories/${repositoryId}/analyze`,
      input,
    );
  },

  async latestAnalysis(repositoryId: string): Promise<RepositoryAnalysis | null> {
    try {
      return await api.get<RepositoryAnalysis>(
        `/repositories/${repositoryId}/analysis/latest`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  },
};
