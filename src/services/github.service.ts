import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type {
  GitHubInstallUrl,
  GitHubInstallation,
  GitHubRepository,
} from "@/types/github";

export const githubService = {
  installUrl(): Promise<GitHubInstallUrl> {
    return api.get<GitHubInstallUrl>("/github/install-url");
  },

  installations(): Promise<Paginated<GitHubInstallation>> {
    return api.get<Paginated<GitHubInstallation>>("/github/installations");
  },

  installationRepositories(
    installationId: string,
  ): Promise<Paginated<GitHubRepository>> {
    return api.get<Paginated<GitHubRepository>>(
      `/github/installations/${installationId}/repositories`,
    );
  },
};
