import { api } from "@/lib/api";
import type { GrafanaLaunch, ObservabilityApproval, ObservabilityAvailability, ObservabilityBinding, ObservabilityBindingPage, ObservabilityPlan } from "@/types/observability";
export const observabilityService = {
  list(projectId: string, repositoryId?: string, offset = 0, targetId?: string, serviceKey?: string): Promise<ObservabilityBindingPage> {
    return api.get(`/projects/${projectId}/observability/bindings`, { params: { repository_id: repositoryId, cloud_target_id: targetId, service_key: serviceKey, limit: 20, offset } });
  },
  availability(repositoryId: string, targetId: string, serviceKey: string): Promise<ObservabilityAvailability> {
    return api.get(`/repositories/${repositoryId}/observability/availability`, { params: { cloud_target_id: targetId, service_key: serviceKey } });
  },
  bind(repositoryId: string, targetId: string, serviceKey: string): Promise<ObservabilityBinding> {
    return api.post(`/repositories/${repositoryId}/observability/bindings`, { cloud_target_id: targetId, service_key: serviceKey, profile: "fastapi-otlp-v1" });
  },
  prepare(repositoryId: string, bindingId: string, pipelineId: string, enabled: boolean, imageDigest?: string): Promise<ObservabilityPlan> {
    return api.post(`/repositories/${repositoryId}/observability/deployment-preview`, { binding_id: bindingId, cd_pipeline_id: pipelineId, enabled, ...(enabled ? { image_digest: imageDigest, certificate_renewal: "automatic-v1" } : {}) });
  },
  plan(planId: string): Promise<ObservabilityPlan> { return api.get(`/observability/deployment-plans/${planId}`); },
  approve(plan: ObservabilityPlan, key: string): Promise<ObservabilityApproval> {
    return api.post(`/observability/deployment-plans/${plan.plan_id}/approve`, { expected_revision: plan.binding_revision, artifact_digest: plan.artifact_digest }, { headers: { "Idempotency-Key": key } });
  },
  retry(bindingId: string, key: string): Promise<ObservabilityBinding> {
    return api.post(`/observability/bindings/${bindingId}/retry`, undefined, { headers: { "Idempotency-Key": key } });
  },
  launch(projectId: string): Promise<GrafanaLaunch> { return api.post(`/projects/${projectId}/observability/access`, {}); },
};
// Open synchronously on the user gesture; the authenticated API only returns a single-use POST ticket.
export async function openProjectGrafana(projectId: string): Promise<void> {
  const popup = window.open("about:blank", "_blank");
  if (!popup)
    throw new Error("Allow pop-ups to open your project's Grafana.");
  popup.opener = null;
  try {
    const launch = await observabilityService.launch(projectId);
    const url = new URL(launch.entry_url);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (launch.method !== "POST" || !/^[A-Za-z0-9_-]{43}$/.test(launch.ticket) ||
      !(Number.isFinite(launch.expires_in) && launch.expires_in > 0 && launch.expires_in <= 60) ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
      url.username || url.password || url.pathname !== "/session" || url.search || url.hash) {
      throw new Error("Grafana returned an invalid access destination.");
    }
    if (popup.closed)
      throw new Error("The Grafana tab was closed. Open it again from this project.");
    const doc = popup.document;
    doc.title = "Opening project Grafana";
    const form = doc.createElement("form");
    form.method = "POST";
    form.action = url.href;
    const input = doc.createElement("input");
    input.type = "hidden";
    input.name = "ticket";
    input.value = launch.ticket;
    form.append(input);
    doc.body.append(form);
    form.submit();
  }
  catch (error) {
    popup.close();
    throw error;
  }
}
