import { api } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import type { AxiosRequestConfig } from "axios";
import type { ActivationPlan, GrafanaDestination, ObservabilityAlertPolicy, ObservabilityContext, ObservabilityIncident, ObservabilityIncidentPage, ObservabilityIntent, ObservabilityOperation, ObservabilityOperationPage, OperationRequest } from "@/types/observability";
import type { GrafanaLaunch, ObservabilityApproval, ObservabilityAvailability, ObservabilityBinding, ObservabilityBindingPage, ObservabilityPlan } from "@/types/observability";

// The native interceptor normalizes errors. Preserve Retry-After before it drops headers.
async function activationRequest<T>(method: "GET" | "POST" | "PUT", url: string, config: AxiosRequestConfig = {}): Promise<T> {
  const response = await api.raw.request<T>({ ...config, method, url,
    validateStatus: status => (status >= 200 && status < 300) || status === 429 });
  if (response.status === 429) {
    const value = String(response.headers["retry-after"] ?? "");
    const delay = value.trim() && Number.isFinite(Number(value)) ? Number(value) * 1000 : Date.parse(value) - Date.now();
    throw new ApiError("Too many requests. Status checks will resume automatically.", 429, "rate_limited", {
      retry_after_ms: Number.isFinite(delay) ? Math.max(1000, delay) : 30000,
    });
  }
  return response.data;
}
export const observabilityService = {
  incidents(projectId: string, bindingId?: string, state?: "firing" | "resolved", offset = 0, signal?: AbortSignal): Promise<ObservabilityIncidentPage> {
    return activationRequest("GET", `/projects/${projectId}/observability/incidents`, { params: { binding_id: bindingId, state, limit: 20, offset }, signal });
  },
  acknowledgeIncident(incidentId: string): Promise<ObservabilityIncident> {
    return activationRequest("POST", `/observability/incidents/${incidentId}/acknowledge`);
  },
  alertPolicy(bindingId: string, signal?: AbortSignal): Promise<ObservabilityAlertPolicy> {
    return activationRequest("GET", `/observability/bindings/${bindingId}/alert-policy`, { signal });
  },
  saveAlertPolicy(bindingId: string, policy: Pick<ObservabilityAlertPolicy, "enabled" | "latency_budget_ms">): Promise<ObservabilityAlertPolicy> {
    return activationRequest("PUT", `/observability/bindings/${bindingId}/alert-policy`, { data: policy });
  },
  context(repositoryId: string, targetId: string, serviceKey: string, signal?: AbortSignal): Promise<ObservabilityContext> {
    return activationRequest("GET", `/repositories/${repositoryId}/observability/context`, { params: { cloud_target_id: targetId, service_key: serviceKey }, signal });
  },
  prepareActivationPlan(repositoryId: string, targetId: string, serviceKey: string, intent: ObservabilityIntent, signal?: AbortSignal): Promise<ActivationPlan> {
    return activationRequest("POST", `/repositories/${repositoryId}/observability/activation-plans`, { data: { cloud_target_id: targetId, service_key: serviceKey, intent }, signal });
  },
  startOperation(planId: string, request: OperationRequest, key: string): Promise<ObservabilityOperation> {
    return activationRequest("POST", `/observability/activation-plans/${planId}/operations`, { data: request, headers: { "Idempotency-Key": key } });
  },
  operation(operationId: string, signal?: AbortSignal): Promise<ObservabilityOperation> {
    return activationRequest("GET", `/observability/operations/${operationId}`, { signal });
  },
  operations(repositoryId: string, targetId: string, serviceKey: string, planId?: string, signal?: AbortSignal): Promise<ObservabilityOperationPage> {
    return activationRequest("GET", `/repositories/${repositoryId}/observability/operations`, { params: { cloud_target_id: targetId, service_key: serviceKey, ...(planId ? { plan_id: planId } : {}), limit: 20, offset: 0 }, signal });
  },
  retryOperation(operationId: string, request: OperationRequest, key: string): Promise<ObservabilityOperation> {
    return activationRequest("POST", `/observability/operations/${operationId}/retries`, { data: request, headers: { "Idempotency-Key": key } });
  },
  launchBinding(bindingId: string, destination: GrafanaDestination): Promise<GrafanaLaunch> {
    return activationRequest("POST", `/observability/bindings/${bindingId}/grafana-access`, { data: { destination } });
  },
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
  return openGrafana(() => observabilityService.launch(projectId));
}
export async function openBindingGrafana(bindingId: string, destination: GrafanaDestination): Promise<void> {
  return openGrafana(() => observabilityService.launchBinding(bindingId, destination));
}
async function openGrafana(launchTicket: () => Promise<GrafanaLaunch>): Promise<void> {
  const popup = window.open("about:blank", "_blank");
  if (!popup)
    throw new Error("Allow pop-ups to open your project's Grafana.");
  popup.opener = null;
  try {
    const launch = await launchTicket();
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
