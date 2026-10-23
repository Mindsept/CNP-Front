import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { RepositoryObservabilityPanel } from "./repository-observability-panel";
import { observabilityService as obs } from "@/services/observability.service";
import { authService } from "@/services/auth.service";
import { projectService } from "@/services/project.service";
import type { CdPreview } from "@/types/cd";
import type { ObservabilityPlan, ObservabilityBinding } from "@/types/observability";
vi.mock("@/services/observability.service", () => ({ observabilityService: { list: vi.fn(), availability: vi.fn(), bind: vi.fn(), prepare: vi.fn(), plan: vi.fn(), approve: vi.fn(), retry: vi.fn() } }));
vi.mock("@/services/auth.service", () => ({ authService: { me: vi.fn() } }));
vi.mock("@/services/project.service", () => ({ projectService: { get: vi.fn() } }));
const planId = "00000000-0000-4000-8000-000000000001";
const pipeline = { cd_pipeline_id: "pipeline", repository_id: "repo", cloud_target_id: "target", app_name: "commerce", image: "ghcr.io/team/commerce", image_tag: "latest" } as CdPreview;
const binding = { binding_id: "binding", project_id: "project", repository_id: "repo", cloud_target_id: "target", service_key: "commerce", status: "disabled", config_revision: 0, environment: "dev", reason_code: null } as ObservabilityBinding;
const plan: ObservabilityPlan = { plan_id: planId, binding_id: "binding", cd_pipeline_id: "pipeline", binding_revision: 0, enabled: true, status: "preview", reason_code: null, artifact_digest: "a".repeat(64), image_reference: "ghcr.io/team/commerce@sha256:" + "b".repeat(64), files: { "observability/config.yaml": "safe preview" }, sdk_environment: {}, prerequisites: ["SDK required"], deployable: false, created_at: "2026-10-19T12:00:00Z" };
function setup(search = "") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/repositories/repo/cd" + search]}><RepositoryObservabilityPanel projectId="project" repositoryId="repo" pipeline={pipeline}/></MemoryRouter></QueryClientProvider>);
  return { ...view, client };
}
beforeEach(() => {
  Object.values(obs).forEach(mock => vi.mocked(mock).mockReset());
  vi.mocked(obs.list).mockResolvedValue({ items: [binding], total: 1, limit: 20, offset: 0 });
  vi.mocked(obs.availability).mockResolvedValue({ available: true, reason_code: null, checked_at: "now" });
  vi.mocked(obs.prepare).mockResolvedValue(plan);
  vi.mocked(obs.plan).mockResolvedValue(plan);
  vi.mocked(obs.bind).mockResolvedValue(binding);
  vi.mocked(obs.approve).mockResolvedValue({ approval_id: "approval", plan_id: planId, binding_id: "binding", job_id: "job", status: "queued", execution_revision: 1 });
  vi.mocked(authService.me).mockResolvedValue({ id: "user", role: "user" });
  vi.mocked(projectService.get).mockResolvedValue({ id: "project", name: "Project", slug: "project", description: null, owner_id: "user", members: [{ user_id: "user", email: "demo@example.test", role: "maintainer" }] });
});

describe("Observability retry", () => {
  const failed: ObservabilityBinding = { ...binding, status: "failed", config_revision: 4, job_id: "failed-job" };

  it("starts a failed operation again and uses a fresh key if that accepted attempt also fails", async () => {
    let current = failed;
    vi.mocked(obs.list).mockImplementation(async () => ({ items: [current], total: 1, limit: 20, offset: 0 }));
    vi.mocked(obs.retry).mockImplementation(async () => {
      current = { ...current, status: "preparing", job_id: "retry-job" };
      return current;
    });
    const { client } = setup();
    const retry = await screen.findByRole("button", { name: "Retry observability" });
    await waitFor(() => expect(retry).toBeEnabled());
    fireEvent.click(retry);
    await screen.findByText("Preparing");
    expect(obs.retry).toHaveBeenCalledWith("binding", expect.any(String));
    expect(screen.queryByRole("button", { name: "Retry observability" })).not.toBeInTheDocument();

    // Retrying changes the job, but the backend keeps the configuration revision.
    current = { ...current, status: "failed" };
    await act(async () => { await client.invalidateQueries({ queryKey: ["observability", "bindings", "project"] }); });
    const retryAgain = await screen.findByRole("button", { name: "Retry observability" });
    await waitFor(() => expect(retryAgain).toBeEnabled());
    fireEvent.click(retryAgain);
    await screen.findByText("Preparing");
    expect(obs.retry).toHaveBeenCalledTimes(2);
    expect(vi.mocked(obs.retry).mock.calls[1][1]).not.toBe(vi.mocked(obs.retry).mock.calls[0][1]);
    expect(obs.prepare).not.toHaveBeenCalled();
    expect(obs.approve).not.toHaveBeenCalled();
  });

  it("retains the same retry key when a network error leaves the outcome uncertain", async () => {
    vi.mocked(obs.list).mockResolvedValue({ items: [failed], total: 1, limit: 20, offset: 0 });
    vi.mocked(obs.retry).mockRejectedValueOnce(new Error("Connection lost before receiving the response")).mockResolvedValue({ ...failed, status: "preparing" });
    setup();
    const retry = await screen.findByRole("button", { name: "Retry observability" });
    await waitFor(() => expect(retry).toBeEnabled());
    fireEvent.click(retry);
    await screen.findByText("Connection lost before receiving the response");
    await waitFor(() => expect(retry).toBeEnabled());
    fireEvent.click(retry);
    await waitFor(() => expect(obs.retry).toHaveBeenCalledTimes(2));
    expect(vi.mocked(obs.retry).mock.calls[1][1]).toBe(vi.mocked(obs.retry).mock.calls[0][1]);
  });

  it("sends only one retry while a double click is pending", async () => {
    vi.mocked(obs.list).mockResolvedValue({ items: [failed], total: 1, limit: 20, offset: 0 });
    vi.mocked(obs.retry).mockImplementation(() => new Promise(() => { }));
    setup();
    const retry = await screen.findByRole("button", { name: "Retry observability" });
    await waitFor(() => expect(retry).toBeEnabled());
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(retry).toBeDisabled();
    expect(obs.retry).toHaveBeenCalledOnce();
  });

  it("explains degraded telemetry and refreshes its status without retrying the operation", async () => {
    let current: ObservabilityBinding = { ...failed, status: "degraded" };
    vi.mocked(obs.list).mockImplementation(async () => ({ items: [current], total: 1, limit: 20, offset: 0 }));
    setup();
    await screen.findByText("Degraded");
    expect(screen.getByText(/CNP checks again automatically/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry observability" })).not.toBeInTheDocument();
    current = { ...current, status: "active" };
    fireEvent.click(screen.getByRole("button", { name: "Refresh observability status" }));
    await screen.findByText("Active");
    expect(screen.queryByText("Degraded")).not.toBeInTheDocument();
    expect(obs.retry).not.toHaveBeenCalled();
  });

  it("does not let a Viewer retry a failed operation", async () => {
    vi.mocked(obs.list).mockResolvedValue({ items: [failed], total: 1, limit: 20, offset: 0 });
    vi.mocked(projectService.get).mockResolvedValue({ id: "project", name: "Project", slug: "project", description: null, owner_id: "other", members: [{ user_id: "user", email: "demo@example.test", role: "viewer" }] });
    setup();
    await screen.findByText("Failed");
    const retry = screen.getByRole("button", { name: "Retry observability" });
    expect(retry).toBeDisabled();
    fireEvent.click(retry);
    expect(obs.retry).not.toHaveBeenCalled();
  });
});
async function digest() { fireEvent.change(await screen.findByLabelText("Image digest (SHA-256)"), { target: { value: "sha256:" + "b".repeat(64) } }); }
describe("Observability CD review", () => {
  it("requires a digest and human confirmation; rendering and preparation never approve", async () => {
    setup();
    await screen.findByText("Disabled");
    expect(screen.getByRole("button", { name: "Prepare configuration" })).toBeDisabled();
    await digest();
    await waitFor(() => expect(screen.getByRole("button", { name: "Prepare configuration" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Prepare configuration" }));
    await screen.findByRole("dialog");
    expect(obs.approve).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Approve activation" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Approve activation" }));
    await waitFor(() => expect(obs.approve).toHaveBeenCalledOnce());
    expect(obs.prepare).toHaveBeenCalledWith("repo", "binding", "pipeline", true, "sha256:" + "b".repeat(64));
    expect(obs.bind).not.toHaveBeenCalled();
  });
  it("does not allow a Viewer to prepare or approve an existing review", async () => {
    vi.mocked(projectService.get).mockResolvedValue({ id: "project", name: "Project", slug: "project", description: null, owner_id: "other", members: [{ user_id: "user", email: "demo@example.test", role: "viewer" }] });
    setup("?obsPlan=" + planId);
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Prepare configuration", hidden: true })).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Approve activation" })).toBeDisabled();
    expect(obs.approve).not.toHaveBeenCalled();
  });
  it("reloads a persisted review and rejects an obsolete plan", async () => {
    vi.mocked(obs.plan).mockResolvedValue({ ...plan, status: "obsolete" });
    setup("?obsPlan=" + planId);
    await screen.findByText(/This plan is obsolete/);
    expect(obs.prepare).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Approve activation" })).toBeDisabled();
  });
  it("does not open a review belonging to another pipeline", async () => {
    vi.mocked(obs.plan).mockResolvedValue({ ...plan, cd_pipeline_id: "other" });
    setup("?obsPlan=" + planId);
    await screen.findByText(/belongs to another CD selection/);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(obs.approve).not.toHaveBeenCalled();
  });
  it("blocks mutation if existing settings are unavailable", async () => {
    vi.mocked(obs.list).mockRejectedValue(new Error("Offline"));
    setup();
    await screen.findByText(/Existing observability settings could not be loaded/);
    await digest();
    expect(screen.getByRole("button", { name: "Prepare configuration" })).toBeDisabled();
    expect(obs.bind).not.toHaveBeenCalled();
  });
  it("explains unsupported targets without offering activation", async () => {
    vi.mocked(obs.availability).mockResolvedValue({ available: false, reason_code: "observability_target_unsupported", checked_at: "now" });
    setup();
    await screen.findByText(/requires an Azure AKS target/);
    await digest();
    expect(screen.getByRole("button", { name: "Prepare configuration" })).toBeDisabled();
  });
  it("allows an OFF plan for an existing binding even if ON is unavailable", async () => {
    vi.mocked(obs.availability).mockResolvedValue({ available: false, reason_code: "observability_not_configured", checked_at: "now" });
    vi.mocked(obs.prepare).mockResolvedValue({ ...plan, enabled: false });
    vi.mocked(obs.plan).mockResolvedValue({ ...plan, enabled: false });
    setup();
    await screen.findByText("Disabled");
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Prepare configuration" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Prepare configuration" }));
    await screen.findByRole("dialog");
    expect(obs.prepare).toHaveBeenCalledWith("repo", "binding", "pipeline", false, "");
    expect(obs.approve).not.toHaveBeenCalled();
  });
  it("guards double click while preparation is running", async () => {
    vi.mocked(obs.prepare).mockImplementation(() => new Promise(() => { }));
    setup();
    await digest();
    await waitFor(() => expect(screen.getByRole("button", { name: "Prepare configuration" })).toBeEnabled());
    const button = screen.getByRole("button", { name: "Prepare configuration" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(obs.prepare).toHaveBeenCalledOnce());
    expect(obs.approve).not.toHaveBeenCalled();
  });
  it("reuses the exact approval key after a transient failure", async () => {
    vi.mocked(obs.approve).mockRejectedValueOnce(new Error("Temporarily unavailable"));
    setup("?obsPlan=" + planId);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Approve activation" }));
    await screen.findAllByText("Temporarily unavailable");
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve activation" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Approve activation" }));
    await waitFor(() => expect(obs.approve).toHaveBeenCalledTimes(2));
    expect(vi.mocked(obs.approve).mock.calls[0][1]).toBe(vi.mocked(obs.approve).mock.calls[1][1]);
  });
});
