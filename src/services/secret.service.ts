import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type { CreateSecretInput, ProjectSecret } from "@/types/secret";

export const secretService = {
  list(projectId: string): Promise<Paginated<ProjectSecret>> {
    return api.get<Paginated<ProjectSecret>>(
      `/projects/${projectId}/secrets`,
    );
  },

  create(
    projectId: string,
    input: CreateSecretInput,
  ): Promise<ProjectSecret> {
    return api.post<ProjectSecret>(
      `/projects/${projectId}/secrets`,
      input,
    );
  },

  remove(
    projectId: string,
    secretId: string,
  ): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(
      `/projects/${projectId}/secrets/${secretId}`,
    );
  },
};
