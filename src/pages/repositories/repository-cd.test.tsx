import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositoryCdPage } from "./repository-cd";
import { cdService } from "@/services/cd.service";
import { mcpService } from "@/services/mcp.service";
import { repositoryService } from "@/services/repository.service";
import { containerRegistryService } from "@/services/container-registry.service";
import type { CdRequirements } from "@/types/cd";

vi.mock("@/services/repository.service", () => ({
  repositoryService: { get: vi.fn().mockResolvedValue({ id: "repo", project_id: "project", full_name: "team/app" }) },
}));
vi.mock("@/services/container-registry.service", () => ({
  containerRegistryService: { list: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock("@/services/mcp.service", () => ({ mcpService: { policy: vi.fn() } }));
vi.mock("@/services/cd.service", () => ({ cdService: { requirements: vi.fn(), list: vi.fn(), preview: vi.fn() } }));

function requirements(provider: "aws" | "azure" | "private"): CdRequirements {
  return {
    repository_id: "repo",
    cloud_targets: [{
      id: "target", project_id: "project", name: "Cluster", environment: "dev",
      provider, cluster_type: provider === "private" ? "k3s" : provider === "aws" ? "eks" : "aks", region: "test-region",
      cluster_name: "cluster", namespace: "app", config: {}, kubeconfig_strategy: {},
      deployment_defaults: {}, created_at: "2026-01-01", updated_at: "2026-01-01",
    }],
    detected_env_vars: [], required_env_vars: [], configured_cd_project_secrets: ["DATABASE_URL_APP"],
    configured_cd_secret_keys: ["DATABASE_URL_APP"], required_cloud_secret_names: [],
    suggested_mappings: [], missing_project_secrets: [], default_image: "ghcr.io/team/app",
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/repositories/repo/cd"]}>
        <Routes><Route path="/repositories/:repositoryId/cd" element={<RepositoryCdPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CD integration across MCP and database provisioning", () => {
  beforeEach(() => {
    vi.mocked(repositoryService.get).mockReset().mockResolvedValue({
      id: "repo", project_id: "project", full_name: "team/app", default_branch: "main",
      onboarding_status: "analyzed", detected_stack: "node", dockerfile_present: true,
      ci_present: true, html_url: "https://github.com/team/app",
    });
    vi.mocked(containerRegistryService.list).mockReset().mockResolvedValue({ items: [] });
    vi.mocked(cdService.requirements).mockReset().mockResolvedValue(requirements("aws"));
    vi.mocked(cdService.list).mockReset().mockResolvedValue({ items: [] });
    // Keep the preview request pending to inspect the submitted payload without a live backend.
    vi.mocked(cdService.preview).mockReset().mockImplementation(() => new Promise(() => {}));
    vi.mocked(mcpService.policy).mockReset().mockResolvedValue({ enabled: false, target_ids: [], version: 1 });
  });

  it("blocks AWS reviewed deployment instead of submitting Azure authentication settings", async () => {
    vi.mocked(mcpService.policy).mockResolvedValue({ enabled: true, target_ids: ["target"], version: 1 });
    renderPage();
    await screen.findByText(/Human-reviewed CD supports Azure AKS and private k3s/);
    for (const button of screen.getAllByRole("button", { name: "Generate CD preview" })) expect(button).toBeDisabled();
    expect(cdService.preview).not.toHaveBeenCalled();
  });

  it("keeps AWS deployment and database secret mapping available without MCP review", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Connect as DATABASE_URL" }));
    const generate = screen.getAllByRole("button", { name: "Generate CD preview" })[0];
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    await waitFor(() => expect(cdService.preview).toHaveBeenCalledWith("repo", expect.objectContaining({
      cloud_target_id: "target", kubeconfig_strategy: "secret", include_image_pull_secret: true,
      env_secret_mappings: [{ env_name: "DATABASE_URL", project_secret_key: "DATABASE_URL_APP", github_secret_name: "DATABASE_URL", kubernetes_secret_name: "app-secrets" }],
    })));
  });

  it("uses Azure OIDC and preconfigured image pull access for reviewed AKS previews", async () => {
    vi.mocked(cdService.requirements).mockResolvedValue(requirements("azure"));
    vi.mocked(mcpService.policy).mockResolvedValue({ enabled: true, target_ids: ["target"], version: 1 });
    renderPage();
    const generate = screen.getAllByRole("button", { name: "Generate CD preview" })[0];
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    await waitFor(() => expect(cdService.preview).toHaveBeenCalledWith("repo", expect.objectContaining({
      cloud_target_id: "target", kubeconfig_strategy: "azure_cli", include_image_pull_secret: false,
    })));
  });
  it("uses the project ServiceAccount and ClusterIP for reviewed private targets", async () => {
    vi.mocked(mcpService.policy).mockResolvedValue({ enabled: true, target_ids: ["target"], version: 1 });
    vi.mocked(cdService.requirements).mockResolvedValue(requirements("private"));
    renderPage();
    expect(await screen.findByText("Project ServiceAccount")).toBeInTheDocument();
    expect(screen.queryByText(/Azure OIDC is preconfigured/)).not.toBeInTheDocument();
    expect(screen.getByText(/Applications are exposed through HTTPS ingress/)).toBeInTheDocument();
  });

});
