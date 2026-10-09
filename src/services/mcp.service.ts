import { api } from "@/lib/api";
import { authStore } from "@/lib/auth";
import { env } from "@/config/env";
import type { Action, ActionType, Challenge, Connection, McpPolicy, RunProgress } from "@/types/mcp";

let browserSession: { token: string; csrf: string } | null = null;
let pending: Promise<string> | null = null;
async function csrf(): Promise<string> {
  const token = authStore.getAccessToken() ?? "";
  if (browserSession?.token === token) return browserSession.csrf;
  if (pending) return pending;
  pending = api.post<{ csrf_token: string }>("/auth/browser-session").then(result => {
    browserSession = { token, csrf: result.csrf_token };
    return result.csrf_token;
  }).finally(() => { pending = null; });
  return pending;
}
async function browserPost<T>(url: string, body?: unknown): Promise<T> {
  return api.post<T>(url, body, { headers: { "X-CNP-CSRF": await csrf() } });
}
export const mcpService = {
  connections: () => api.get<{ items: Connection[] }>("/oauth/connections"),
  async revoke(id: string) { return api.delete(`/oauth/connections/${id}`, { headers: { "X-CNP-CSRF": await csrf() } }); },
  async logout() {
    try { await browserPost("/auth/browser-logout"); } finally { browserSession = null; }
  },
  consent: (body: Record<string, unknown>) => browserPost<{ redirect_url: string }>(`${env.apiBaseUrl.replace(/\/api\/v1\/?$/, "")}/oauth/consent`, body),
  action: (id: string) => api.get<Action>(`/actions/${id}`),
  reviews: (offset = 0) => api.get<{ items: Action[]; next_offset: number | null }>(`/reviews?offset=${offset}`),
  pipelineActions: (repositoryId: string, pipelineId: string, offset = 0) =>
    api.get<{ items: Action[]; next_offset: number | null }>(`/repositories/${repositoryId}/actions?pipeline_id=${encodeURIComponent(pipelineId)}&offset=${offset}`),
  challenge: (id: string) => browserPost<Challenge>(`/reviews/${id}/challenge`),
  decide: (id: string, challenge: Challenge, decision: "accept" | "decline" | "cancel") =>
    browserPost<Action>(`/reviews/${id}/decision`, { challenge: challenge.challenge, fingerprint: challenge.fingerprint, decision }),
  prepare: (repository_id: string, pipeline_id: string, type: ActionType, pipeline_kind: "ci" | "cd") =>
    api.post<Action>("/actions", { repository_id, pipeline_id, type, pipeline_kind, idempotency_key: crypto.randomUUID() }),
  run: (id: string) => api.get<RunProgress>(`/deployment-runs/${id}`),
  cancelRun: (id: string) => api.post(`/deployment-runs/${id}/cancel`),
  deployment: (id: string) => api.get<Record<string, unknown>>(`/deployments/${id}`),
  policy: (projectId: string) => api.get<McpPolicy>(`/projects/${projectId}/mcp-policy`),
  async savePolicy(projectId: string, enabled: boolean, target_ids: string[]) {
    return api.put<McpPolicy>(`/projects/${projectId}/mcp-policy`, { enabled, target_ids }, { headers: { "X-CNP-CSRF": await csrf() } });
  },
};
