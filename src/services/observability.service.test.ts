import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { observabilityService, openProjectGrafana } from "./observability.service";
import type { GrafanaLaunch, ObservabilityPlan } from "@/types/observability";
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
const valid: GrafanaLaunch = { entry_url: "http://localhost:13000/session", ticket: "t".repeat(43), expires_in: 60, method: "POST" };
let popup: Window;
let doc: Document;
beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset().mockResolvedValue(valid);
  doc = document.implementation.createHTMLDocument();
  popup = { document: doc, opener: window, closed: false, close: vi.fn() } as unknown as Window;
  vi.spyOn(window, "open").mockReturnValue(popup);
  vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => { });
});
describe("Grafana external launch", () => {
  it("opens on the gesture, disowns opener, then sends only the ticket by POST", async () => {
    const launched = openProjectGrafana("project-a");
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    await launched;
    expect(api.post).toHaveBeenCalledWith("/projects/project-a/observability/access", {});
    expect(popup.opener).toBeNull();
    const form = doc.querySelector("form")!;
    expect(form.method).toBe("post");
    expect(form.action).toBe(valid.entry_url);
    expect(form.querySelectorAll("input")).toHaveLength(1);
    expect(form.querySelector("input")?.name).toBe("ticket");
    expect(form.querySelector("input")?.value).toBe(valid.ticket);
    expect(form.action).not.toContain(valid.ticket);
    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce();
  });
  it("does not issue a ticket if popups are blocked", async () => {
    vi.mocked(window.open).mockReturnValue(null);
    await expect(openProjectGrafana("a")).rejects.toThrow(/pop-ups/);
    expect(api.post).not.toHaveBeenCalled();
  });
  it.each(["http://grafana.example/session", "https://u:p@grafana.example/session", "https://grafana.example/session?ticket=x", "https://grafana.example/session#x", "https://grafana.example/other", "javascript:alert(1)"])("rejects invalid destination %s", async (entry_url) => {
    vi.mocked(api.post).mockResolvedValue({ ...valid, entry_url });
    await expect(openProjectGrafana("a")).rejects.toThrow();
    expect(popup.close).toHaveBeenCalledOnce();
    expect(HTMLFormElement.prototype.submit).not.toHaveBeenCalled();
  });
  it("closes its blank tab after a native API error", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Access denied"));
    await expect(openProjectGrafana("a")).rejects.toThrow("Access denied");
    expect(popup.close).toHaveBeenCalledOnce();
  });
  it("requires a valid short-lived POST ticket", async () => {
    vi.mocked(api.post).mockResolvedValue({ ...valid, ticket: "invalid", method: "GET", expires_in: 100 });
    await expect(openProjectGrafana("a")).rejects.toThrow();
    expect(HTMLFormElement.prototype.submit).not.toHaveBeenCalled();
  });
});
it("keeps approval tied to exact revision/fingerprint with its idempotency key", async () => {
  const plan = { plan_id: "plan", binding_revision: 4, artifact_digest: "f".repeat(64) } as ObservabilityPlan;
  await observabilityService.approve(plan, "same-key");
  expect(api.post).toHaveBeenCalledWith("/observability/deployment-plans/plan/approve", { expected_revision: 4, artifact_digest: "f".repeat(64) }, { headers: { "Idempotency-Key": "same-key" } });
});

it("retries with an empty HTTP body and preserves the caller's idempotency key", async () => {
  const retried = { binding_id: "binding", status: "preparing", config_revision: 4, job_id: "retry-job" };
  vi.mocked(api.post).mockResolvedValue(retried);
  await expect(observabilityService.retry("binding", "retry-key")).resolves.toEqual(retried);
  expect(api.post).toHaveBeenCalledWith("/observability/bindings/binding/retry", undefined, {
    headers: { "Idempotency-Key": "retry-key" },
  });
});


it("includes automatic renewal only in a new activation plan", async () => {
  await observabilityService.prepare("repo", "binding", "pipeline", true, "sha256:" + "a".repeat(64));
  expect(api.post).toHaveBeenCalledWith("/repositories/repo/observability/deployment-preview", {
    binding_id: "binding", cd_pipeline_id: "pipeline", enabled: true,
    image_digest: "sha256:" + "a".repeat(64), certificate_renewal: "automatic-v1",
  });
});

it("keeps disabling independent of renewal and image credentials", async () => {
  await observabilityService.prepare("repo", "binding", "pipeline", false);
  expect(api.post).toHaveBeenCalledWith("/repositories/repo/observability/deployment-preview", {
    binding_id: "binding", cd_pipeline_id: "pipeline", enabled: false,
  });
});
