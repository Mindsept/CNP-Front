import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositoryCdPage } from "./repository-cd";
import { cdService } from "@/services/cd.service";
import { mcpService } from "@/services/mcp.service";
import { repositoryService } from "@/services/repository.service";
import { containerRegistryService } from "@/services/container-registry.service";
import { observabilityService } from "@/services/observability.service";
import { authService } from "@/services/auth.service";
import { projectService } from "@/services/project.service";
import type { CdRequirements } from "@/types/cd";

vi.mock("@/services/repository.service", () => ({
  repositoryService: { get: vi.fn().mockResolvedValue({ id: "repo", project_id: "project", full_name: "team/app" }) },
}));
vi.mock("@/services/container-registry.service", () => ({
  containerRegistryService: { list: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock("@/services/mcp.service", () => ({ mcpService: { policy: vi.fn() } }));
vi.mock("@/services/cd.service", () => ({ cdService: { requirements: vi.fn(), list: vi.fn(), preview: vi.fn(), resolveImage: vi.fn() } }));
vi.mock("@/services/observability.service", () => ({ observabilityService: { list: vi.fn() } }));
vi.mock("@/services/auth.service", () => ({ authService: { me: vi.fn() } }));
vi.mock("@/services/project.service", () => ({ projectService: { get: vi.fn() } }));
// This page fixture represents the authenticated project owner used by /me below.
// The observability card keys its durable receipt by this real account identity.
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "user", role: "user" }, isLoading: false, error: null }) }));

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
    vi.mocked(observabilityService.list).mockReset().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    vi.mocked(authService.me).mockReset().mockResolvedValue({ id: "user", role: "user" });
    vi.mocked(projectService.get).mockReset().mockResolvedValue({
      id: "project", name: "Project", slug: "project", description: null, owner_id: "user",
      members: [{ user_id: "user", email: "user@example.test", role: "owner" }],
    });
  });

  it("simulates Dev locally and keeps real deployment actions in Prod", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Dev · simulation" }));
    fireEvent.click(screen.getByRole("button", { name: "Simulate deployment" }));
    expect(screen.getByRole("status")).toHaveTextContent("Simulation completed for cluster");
    expect(screen.queryByRole("button", { name: /Generate CD preview/i })).toBeNull();
    expect(cdService.preview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Prod · live target" }));
    expect((await screen.findAllByRole("button", { name: /Generate CD preview/i })).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Simulation completed/)).toBeNull();
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

  it("populates and submits the verified image from the latest CI merge", async () => {
    const image = "ghcr.io/team/app@sha256:" + "a".repeat(64);
    vi.mocked(cdService.requirements).mockResolvedValue({
      ...requirements("azure"), default_image: "", latest_ci_merge_action_id: "ci-merge",
    });
    vi.mocked(mcpService.policy).mockResolvedValue({ enabled: true, target_ids: ["target"], version: 1 });
    vi.mocked(cdService.resolveImage).mockResolvedValue({ image });
    renderPage();
    expect(await screen.findByDisplayValue(image)).toBeInTheDocument();
    expect(cdService.resolveImage).toHaveBeenCalledWith("repo", "ci-merge", expect.any(AbortSignal));
    fireEvent.click(screen.getAllByRole("button", { name: "Generate CD preview" })[0]);
    await waitFor(() => expect(cdService.preview).toHaveBeenCalledWith("repo", expect.objectContaining({ image })));
  });

  it("keeps a manual image selection while automatic verification finishes", async () => {
    let finish!: (result: { image: string }) => void;
    const image = "ghcr.io/team/app@sha256:" + "a".repeat(64);
    const manual = "ghcr.io/team/app@sha256:" + "b".repeat(64);
    vi.mocked(cdService.requirements).mockResolvedValue({
      ...requirements("azure"), default_image: "", latest_ci_merge_action_id: "ci-merge",
    });
    vi.mocked(mcpService.policy).mockResolvedValue({ enabled: true, target_ids: ["target"], version: 1 });
    vi.mocked(cdService.resolveImage).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    renderPage();
    await screen.findByText("Checking the latest CI image…");
    fireEvent.change(screen.getByPlaceholderText("ghcr.io/owner/repo"), { target: { value: manual } });
    finish({ image });
    fireEvent.click(screen.getAllByRole("button", { name: "Generate CD preview" })[0]);
    await waitFor(() => expect(cdService.preview).toHaveBeenCalledWith("repo", expect.objectContaining({ image: manual })));
    fireEvent.click(screen.getByRole("button", { name: "Use latest CI image" }));
    expect(await screen.findByDisplayValue(image)).toBeInTheDocument();
  });
  it("does not offer private ServiceAccount credentials for legacy Azure targets", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true, value: vi.fn(),
    });
    vi.mocked(cdService.requirements).mockResolvedValue(requirements("azure"));
    renderPage();
    await screen.findByText("Kubeconfig strategy");
    const trigger = screen.getByText("secret (KUBECONFIG_CONTENT)").closest("button")!;
    fireEvent.click(trigger);
    expect(await screen.findByRole("option", { name: "azure_cli (az get-credentials)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Project ServiceAccount" })).not.toBeInTheDocument();
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
