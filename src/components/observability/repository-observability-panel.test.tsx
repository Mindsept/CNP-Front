import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { RepositoryObservabilityPanel } from "./repository-observability-panel";
import { observabilityService as obs, openBindingGrafana } from "@/services/observability.service";
import { mcpService } from "@/services/mcp.service";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/errors";
import type { CdPreview } from "@/types/cd";
import type { ActivationPlan, ObservabilityContext, ObservabilityOperation } from "@/types/observability";
import { contextFixture, planFixture, operationFixture } from "./observability-test-fixtures";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/mcp.service", () => ({ mcpService: { deploymentPermissions: vi.fn() } }));
vi.mock("@/services/observability.service", () => ({ observabilityService: { context: vi.fn(), prepareActivationPlan: vi.fn(), operations: vi.fn(), operation: vi.fn(), startOperation: vi.fn(), retryOperation: vi.fn(), incidents: vi.fn(), alertPolicy: vi.fn() }, openBindingGrafana: vi.fn() }));
const scope = contextFixture.scope;
const pipeline = { cd_pipeline_id: planFixture.cd_pipeline_id, repository_id: scope.repository_id, cloud_target_id: scope.cloud_target_id, app_name: scope.service_key, image: "ghcr.io/team/app", image_tag: "latest" } as CdPreview;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function setup(search = "", selected: CdPreview | null = pipeline) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  const ui = (value: CdPreview | null) => <QueryClientProvider client={client}><MemoryRouter initialEntries={["/repositories/" + scope.repository_id + "/cd" + search]}><RepositoryObservabilityPanel projectId={scope.project_id} repositoryId={scope.repository_id} pipeline={value}/></MemoryRouter></QueryClientProvider>;
  const view = render(ui(selected));
  return { ...view, client, changePipeline: (value: CdPreview) => view.rerender(ui(value)) };
}
async function ready() {
  const button = await screen.findByRole("button", { name: "Deploy this version and enable observability" });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}
beforeEach(() => {
  vi.mocked(mcpService.deploymentPermissions).mockReset().mockResolvedValue({ status: "ready", actions_permission: "write", message: "Ready", action_url: null, action_label: null });
  Object.values(obs).forEach(mock => vi.mocked(mock).mockReset());
  vi.mocked(useAuth).mockReturnValue({ user: { id: "actor" }, isLoading: false, error: null } as ReturnType<typeof useAuth>);
  vi.mocked(obs.context).mockResolvedValue(structuredClone(contextFixture));
  vi.mocked(obs.prepareActivationPlan).mockResolvedValue(structuredClone(planFixture));
  vi.mocked(obs.operations).mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
  vi.mocked(obs.operation).mockResolvedValue(structuredClone(operationFixture));
  vi.mocked(obs.startOperation).mockResolvedValue(structuredClone(operationFixture));
  vi.mocked(obs.incidents).mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
  vi.mocked(obs.alertPolicy).mockResolvedValue({ binding_id: contextFixture.binding_id!, enabled: true, latency_budget_ms: null, status: "pending", reason_code: "observability_alerts_waiting_activation", suspended_until: null, applied_revision: null, last_reconciled_at: null, sms_enabled: false, availability_supported: false });
  vi.mocked(openBindingGrafana).mockReset().mockResolvedValue();
});
describe("Application observability activation", () => {
  it("shows the red GitHub recovery link and blocks activation until permission is granted", async () => {
    vi.mocked(mcpService.deploymentPermissions).mockResolvedValue({
      status: "installation_update_required", actions_permission: "read",
      message: "Approve the GitHub App update to allow this deployment.",
      action_url: "https://github.com/settings/installations/123", action_label: "Change permissions",
    });
    setup();
    const link = await screen.findByRole("link", { name: "Change permissions" });
    expect(link).toHaveAttribute("href", "https://github.com/settings/installations/123");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("bg-destructive/90");
    expect(await screen.findByRole("button", { name: "Deploy this version and enable observability" })).toBeDisabled();
    expect(obs.startOperation).not.toHaveBeenCalled();
  });
  it("rechecks permissions and refreshes the proposal without starting a deployment", async () => {
    vi.mocked(mcpService.deploymentPermissions).mockResolvedValue({
      status: "installation_update_required", actions_permission: "read", message: "Approve the update.",
      action_url: "https://github.com/settings/installations/123", action_label: "Change permissions",
    });
    const view = setup();
    await screen.findByRole("link", { name: "Change permissions" });
    await waitFor(() => expect(obs.prepareActivationPlan).toHaveBeenCalledOnce());
    vi.mocked(mcpService.deploymentPermissions).mockResolvedValue({
      status: "ready", actions_permission: "write", message: "Ready", action_url: null, action_label: null,
    });
    await act(async () => { await view.client.refetchQueries({ queryKey: ["repository", scope.repository_id, "deployment-permissions"] }); });
    await waitFor(() => expect(obs.prepareActivationPlan).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Change permissions" })).not.toBeInTheDocument());
    await ready();
    expect(obs.startOperation).not.toHaveBeenCalled();
  });
  it("blocks deployment when the permission check is unavailable", async () => {
    vi.mocked(mcpService.deploymentPermissions).mockRejectedValue(new Error("private-provider-body"));
    setup();
    await screen.findByRole("button", { name: "Check permissions again" });
    expect(await screen.findByRole("button", { name: "Deploy this version and enable observability" })).toBeDisabled();
    expect(screen.queryByText("private-provider-body")).not.toBeInTheDocument();
    expect(obs.startOperation).not.toHaveBeenCalled();
  });
  it("prepares automatically, displays immutable effects, and executes only on the explicit click", async () => {
    setup();
    const button = await ready();
    expect(obs.prepareActivationPlan).toHaveBeenCalledWith(scope.repository_id, scope.cloud_target_id, scope.service_key, "enable", expect.any(AbortSignal));
    expect(screen.queryByLabelText(/Image digest/)).not.toBeInTheDocument();
    expect(screen.getByText(/restarts the application in two rollouts/)).toBeInTheDocument();
    expect(screen.getByText(/latest push failed CI/)).toBeInTheDocument();
    expect(obs.startOperation).not.toHaveBeenCalled();
    fireEvent.click(button);
    await screen.findByText("Queued");
    expect(obs.startOperation).toHaveBeenCalledWith(planFixture.plan_id, { expected_plan_digest: planFixture.plan_digest, expected_revision: 4 }, expect.any(String));
  });
  it("does not submit a second operation on double click", async () => {
    vi.mocked(obs.startOperation).mockImplementation(() => new Promise(() => {}));
    setup();
    const button = await ready();
    fireEvent.click(button); fireEvent.click(button);
    expect(obs.startOperation).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Check original request" })).toBeDisabled();
  });
  it("restores a lost response after reload and replays the exact request/key, never a new plan", async () => {
    vi.mocked(obs.startOperation).mockRejectedValueOnce(new Error("Connection lost"));
    const first = setup();
    fireEvent.click(await ready());
    await screen.findByText("Connection lost");
    const original = vi.mocked(obs.startOperation).mock.calls[0];
    first.unmount(); first.client.clear();
    vi.mocked(obs.prepareActivationPlan).mockClear();
    setup();
    const replay = await screen.findByRole("button", { name: "Check original request" });
    await waitFor(() => expect(replay).toBeEnabled());
    expect(obs.prepareActivationPlan).not.toHaveBeenCalled();
    fireEvent.click(replay);
    await screen.findByText("Queued");
    expect(vi.mocked(obs.startOperation).mock.calls[1]).toEqual(original);
    expect(sessionStorage.length).toBe(0);
  });
  it("recovers an accepted operation from server history without replaying a POST", async () => {
    vi.mocked(obs.startOperation).mockRejectedValueOnce(new Error("Connection lost"));
    const first = setup(); fireEvent.click(await ready()); await screen.findByText("Connection lost"); first.unmount(); first.client.clear();
    vi.mocked(obs.operations).mockResolvedValue({ items: [operationFixture], total: 1, limit: 20, offset: 0 });
    setup(); await screen.findByText("Queued");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Check original request" })).not.toBeInTheDocument());
    expect(obs.startOperation).toHaveBeenCalledOnce();
  });
  it("reads a historical binding as Viewer without preparing any plan", async () => {
    vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, can_manage: false });
    setup(); await screen.findByText(/Viewer access/);
    expect(obs.prepareActivationPlan).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enable observability" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Logs (opens a new tab)" }));
    await waitFor(() => expect(openBindingGrafana).toHaveBeenCalledWith(contextFixture.binding_id, "logs"));
  });
  it("does not label pending permissions as Viewer", async () => {
    vi.mocked(obs.context).mockImplementation(() => new Promise(() => {}));
    setup(); await screen.findByText(/Checking permissions and observability/);
    expect(screen.queryByText(/Viewer access/)).not.toBeInTheDocument();
    expect(obs.prepareActivationPlan).not.toHaveBeenCalled();
  });
  it("shows unsupported prerequisites without preparing or executing", async () => {
    vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, capabilities: { ...contextFixture.capabilities, enable: { available: false, reason_code: "unsupported_target", message: "This target is not supported." } } });
    setup(); await screen.findByText("This target is not supported.");
    expect(obs.prepareActivationPlan).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enable observability" })).toBeDisabled();
  });
  it("keeps no_change read-only without retrying preparation in a loop", async () => {
    vi.mocked(obs.prepareActivationPlan).mockResolvedValue({ ...planFixture, status: "no_change", effects: [] });
    setup(); await screen.findByText(/Configuration is up to date/);
    expect(obs.prepareActivationPlan).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Deploy this version and enable observability" })).toBeDisabled();
    expect(obs.startOperation).not.toHaveBeenCalled();
  });
  it("requires a newly presented plan after an obsolete-plan response", async () => {
    vi.mocked(obs.startOperation).mockRejectedValueOnce(new ApiError("Plan has changed", 409, "plan_obsolete"));
    setup(); fireEvent.click(await ready()); await screen.findByText(/This plan is expired or obsolete/);
    expect(obs.prepareActivationPlan).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Deploy this version and enable observability" })).toBeDisabled();
    vi.mocked(obs.prepareActivationPlan).mockResolvedValue({ ...planFixture, plan_digest: "f".repeat(64) });
    fireEvent.click(screen.getByRole("button", { name: "Refresh plan" }));
    await ready(); expect(obs.startOperation).toHaveBeenCalledOnce();
  });
  it("disables an expired plan before submission", async () => {
    vi.mocked(obs.prepareActivationPlan).mockResolvedValue({ ...planFixture, expires_at: "2000-01-01T00:00:00Z" });
    setup(); await screen.findByText(/This plan is expired or obsolete/);
    expect(screen.getByRole("button", { name: "Deploy this version and enable observability" })).toBeDisabled();
  });
  it("ignores a late plan after the application/target changes", async () => {
    const late = deferred<ActivationPlan>();
    vi.mocked(obs.prepareActivationPlan).mockReturnValueOnce(late.promise);
    const view = setup(); await waitFor(() => expect(obs.prepareActivationPlan).toHaveBeenCalledOnce());
    const nextScope = { ...scope, cloud_target_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", service_key: "other-app" };
    vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, scope: nextScope });
    vi.mocked(obs.prepareActivationPlan).mockResolvedValue({ ...planFixture, scope: nextScope, candidate_image: { ...planFixture.candidate_image!, image_commit_sha: "e".repeat(40) } });
    view.changePipeline({ ...pipeline, cloud_target_id: nextScope.cloud_target_id, app_name: nextScope.service_key });
    await screen.findByText("eeeeeeeeeeee");
    await act(async () => late.resolve(planFixture));
    expect(screen.queryByText("dddddddddddd")).not.toBeInTheDocument();
    expect(obs.startOperation).not.toHaveBeenCalled();
  });
  it("uses linked binding scope even if the original CD preview is absent", async () => {
    setup(`?obsTarget=${scope.cloud_target_id}&obsService=${scope.service_key}`, null);
    await ready();
    expect(obs.context).toHaveBeenCalledWith(scope.repository_id, scope.cloud_target_id, scope.service_key, expect.any(AbortSignal));
  });
  it("allows OFF even when ON is unsupported and does not require a candidate image", async () => {
    vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, capabilities: { ...contextFixture.capabilities, enable: { available: false, reason_code: "unsupported_target", message: "Enable unavailable" } } });
    vi.mocked(obs.prepareActivationPlan).mockResolvedValue({ ...planFixture, intent: "disable", candidate_image: null, selection_context: null, deployment_required: false, effects: [{ code: "preserve_application", description: "Keep the application running." }] });
    setup(); await screen.findByText("Enable unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    const button = await screen.findByRole("button", { name: "Disable observability" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(obs.prepareActivationPlan).toHaveBeenCalledWith(scope.repository_id, scope.cloud_target_id, scope.service_key, "disable", expect.any(AbortSignal));
  });
  it("shows status read failures without treating them as Disabled or allowing execution", async () => {
    vi.mocked(obs.context).mockRejectedValue(new Error("Offline"));
    setup(); await screen.findByText(/Current observability status is unavailable/);
    expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
    expect(obs.prepareActivationPlan).not.toHaveBeenCalled();
  });
  it("keeps activation disabled when the server rejects outdated instrumentation", async () => {
    vi.mocked(obs.prepareActivationPlan).mockResolvedValue({ ...planFixture, status: "blocked", blockers: [{ code: "instrumentation_required", message: "Update the application observability SDK before enabling collection.", recovery_action: "configure_instrumentation", operation_id: null }] });
    setup();
    await screen.findByText(/Update the application observability SDK/);
    expect(screen.getByRole("button", { name: "Deploy this version and enable observability" })).toBeDisabled();
    expect(obs.startOperation).not.toHaveBeenCalled();
  });
  it("refreshes degraded collection using GET only", async () => {
    const current: ObservabilityContext = { ...contextFixture, can_manage: false, health: { ...contextFixture.health, status: "degraded" } };
    vi.mocked(obs.context).mockResolvedValue(current);
    setup(); await screen.findByText("Degraded");
    vi.mocked(obs.context).mockResolvedValue({ ...current, health: { ...current.health, status: "active" } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh observability status" }));
    await screen.findByText("Active");
    expect(obs.startOperation).not.toHaveBeenCalled(); expect(obs.retryOperation).not.toHaveBeenCalled();
  });
  it("blocks a result from another scope", async () => {
    vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, scope: { ...scope, service_key: "foreign" } });
    setup(); await screen.findByText(/Current observability status is unavailable/);
    expect(obs.prepareActivationPlan).not.toHaveBeenCalled();
  });
  it("explains stale verification as unknown collection health", async () => {
    vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, can_manage: false, health: { ...contextFixture.health, status: "unknown", reason_code: "observability_verification_stale" } });
    setup();
    await screen.findByText(/The last telemetry verification is stale/);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(obs.prepareActivationPlan).not.toHaveBeenCalled();
  });
  it("does not offer retry for an uncertain external effect", async () => {
    vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, latest_operation_id: operationFixture.operation_id });
    vi.mocked(obs.operation).mockResolvedValue({ ...operationFixture, status: "running", stage: "reconciling_external_effect" });
    setup(); await screen.findByText("Reconciling deployment status");
    expect(screen.queryByRole("button", { name: "Retry observability" })).not.toBeInTheDocument();
    expect(obs.prepareActivationPlan).not.toHaveBeenCalled();
  });
  it("creates a fresh retry key only after an accepted attempt fails again", async () => {
    const failed: ObservabilityOperation = { ...operationFixture, status: "failed", retryable: true, next_action: "retry", failure: { code: "verification_timeout", message: "Signals missing" }, completed_at: "2026-10-29T12:10:00Z" };
    vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, desired_revision: 5, latest_operation_id: failed.operation_id });
    vi.mocked(obs.operation).mockResolvedValue(failed);
    const retried = { ...failed, operation_id: "66666666-6666-4666-8666-666666666666", previous_operation_id: failed.operation_id, attempt_number: 2 };
    vi.mocked(obs.retryOperation).mockImplementation(async () => {
      vi.mocked(obs.context).mockResolvedValue({ ...contextFixture, desired_revision: 5, latest_operation_id: retried.operation_id });
      vi.mocked(obs.operation).mockResolvedValue(retried);
      return retried;
    });
    setup(); const retry = await screen.findByRole("button", { name: "Retry observability" });
    await waitFor(() => expect(retry).toBeEnabled()); fireEvent.click(retry);
    await screen.findByText(/Attempt 2/);
    const retryAgain = screen.getByRole("button", { name: "Retry observability" });
    await waitFor(() => expect(retryAgain).toBeEnabled()); fireEvent.click(retryAgain);
    await waitFor(() => expect(obs.retryOperation).toHaveBeenCalledTimes(2));
    expect(vi.mocked(obs.retryOperation).mock.calls[1][0]).toBe(retried.operation_id);
    expect(vi.mocked(obs.retryOperation).mock.calls[1][2]).not.toBe(vi.mocked(obs.retryOperation).mock.calls[0][2]);
  });
});
