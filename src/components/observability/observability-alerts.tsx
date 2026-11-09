import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { observabilityPollInterval } from "@/hooks/use-observability-activation";
import { observabilityService as service, openBindingGrafana } from "@/services/observability.service";
import type { ObservabilityAlertPolicy, ObservabilityIncident } from "@/types/observability";

function date(value: string | null) { return value ? new Date(value).toLocaleString() : "Not checked yet"; }
const deliveryLabels: Record<string, string> = {
  pending: "Waiting to send", dispatching: "Sending", accepted: "Accepted by Twilio",
  queued: "Queued by Twilio", sending: "Sending", sent: "Sent; delivery pending",
  delivered: "Delivered", read: "Read", failed: "Failed", undelivered: "Undelivered",
  canceled: "Cancelled", skipped: "Not sent", unknown: "Delivery unconfirmed; check Twilio",
};
export function ObservabilityIncidents({ projectId, bindingId, canManage, permissionsPending = false }: {
  projectId: string; bindingId?: string; canManage: boolean; permissionsPending?: boolean;
}) {
  const client = useQueryClient();
  const [filter, setFilter] = useState<"firing" | "resolved" | "all">("firing");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const query = useQuery({
    queryKey: ["observability", "incidents", projectId, bindingId, filter, offset],
    queryFn: async ({ signal }) => {
      const result = await service.incidents(projectId, bindingId, filter === "all" ? undefined : filter, offset, signal);
      if (result.items.some(item => item.project_id !== projectId || (bindingId && item.binding_id !== bindingId)))
        throw new Error("The incident list does not match this application or project.");
      return result;
    }, retry: false, refetchOnWindowFocus: "always", refetchIntervalInBackground: false,
    refetchInterval: current => observabilityPollInterval(current, 30000),
  });
  async function acknowledge(incident: ObservabilityIncident) {
    if (lock.current || !canManage || !query.isSuccess || incident.acknowledged_at) return;
    lock.current = true; setBusy(incident.id); setError(null);
    try {
      const updated = await service.acknowledgeIncident(incident.id);
      if (updated.id !== incident.id || updated.project_id !== projectId) throw new Error("The acknowledgement could not be verified. Refresh incidents.");
      await client.invalidateQueries({ queryKey: ["observability", "incidents", projectId] });
    } catch (caught) {
      setError(getErrorMessage(caught, "Acknowledgement could not be confirmed. Refresh incidents before trying again."));
      void query.refetch();
    } finally { lock.current = false; setBusy(null); }
  }
  async function openMetrics(id: string) {
    setError(null);
    try { await openBindingGrafana(id, "metrics"); }
    catch (caught) { setError(getErrorMessage(caught, "Grafana could not be opened.")); }
  }
  return <section className="space-y-3 border-t border-border pt-4" aria-label="Observability incidents">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Incidents</h3>
      <label className="flex items-center gap-2 text-xs">Show
        <select className="rounded border border-border bg-background p-2 text-foreground" value={filter} onChange={event => { setFilter(event.target.value as typeof filter); setOffset(0); }} aria-label="Incident status">
          <option value="firing">Open incidents</option><option value="resolved">Resolved incidents</option><option value="all">All incidents</option>
        </select>
      </label>
    </div>
    <p className="text-xs text-muted-foreground">Acknowledgement records that someone is handling an incident. The alert remains open until its signal recovers.</p>
    {permissionsPending && <p className="text-xs text-muted-foreground">Checking incident permissions…</p>}
    {!permissionsPending && !canManage && <p className="text-xs text-muted-foreground">A project Maintainer or Owner is required to acknowledge incidents.</p>}
    {query.isPending && <p role="status" className="text-sm">Loading incidents…</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">Incidents could not be loaded. This does not mean there are no incidents.</p>}
    {query.isSuccess && query.data.items.length === 0 && <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6"><Bell className="h-4 w-4 shrink-0 text-muted-foreground"/><p className="text-sm text-muted-foreground">{filter === "firing" ? "No open incidents." : "No incidents match this filter."}</p></div>}
    {query.isSuccess && <div className="space-y-3">{query.data.items.map(incident => <article className={`space-y-3 rounded-lg border border-border bg-background/40 p-4 ${incident.technical_state === "firing" ? "border-l-2 border-l-destructive" : ""}`} key={incident.id}>
      <div className="flex flex-wrap items-center gap-2"><Badge variant={incident.severity === "critical" ? "danger" : "warning"}>{incident.severity === "critical" ? "Critical" : "Warning"}</Badge><span className="text-sm font-medium">{incident.title}</span><Badge variant={incident.technical_state === "resolved" ? "success" : "danger"}>{incident.technical_state === "resolved" ? "Resolved" : incident.technical_state === "firing" ? "Open" : "Unknown"}</Badge></div>
      <p className="break-words text-xs text-muted-foreground">{incident.service_key} · {incident.environment} · {incident.kind.replaceAll("_", " ")}</p>
      <p className="text-xs text-muted-foreground">Started {date(incident.started_at)} · Last observed {date(incident.last_observed_at)}{incident.resolved_at ? ` · Resolved ${date(incident.resolved_at)}` : ""}</p>
      {incident.observed_value !== null && <p className="text-sm">Observed value: {incident.observed_value}</p>}
      {incident.notifications?.map(notification => <div key={notification.id} className="space-y-1 rounded-md border border-border bg-surface p-3 text-xs">
        <p><MessageSquare className="mr-1.5 inline h-3 w-3 text-muted-foreground" aria-hidden="true"/>WhatsApp · {notification.transition === "firing" ? "Incident opened" : "Service recovered"} · <strong>{deliveryLabels[notification.status] ?? "Status unavailable"}</strong></p>
        <p className="text-muted-foreground">{notification.content_mode === "incident_template" ? "Incident notification with application, environment and incident reference." : "Twilio trial template — this message contains no incident details."} Updated {date(notification.updated_at)}</p>
        {notification.reason_code === "message_budget_exhausted" && <p>Notification limit reached.</p>}
      </div>)}
      {incident.acknowledged_at ? <p className="text-sm">Acknowledged {date(incident.acknowledged_at)}</p> : <Button size="sm" variant="outline" loading={busy === incident.id} disabled={!canManage || Boolean(busy)} onClick={() => void acknowledge(incident)}>Acknowledge</Button>}
      <Button size="sm" variant="link" onClick={() => void openMetrics(incident.binding_id)} aria-label={`Open metrics for ${incident.service_key} (opens a new tab)`}>Open metrics</Button>
    </article>)}</div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="link" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh incidents</Button>
      {query.isSuccess && query.data.total > 20 && <><Button size="sm" variant="ghost" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 20))}>Previous incidents</Button><Button size="sm" variant="ghost" disabled={offset + query.data.limit >= query.data.total} onClick={() => setOffset(value => value + 20)}>Next incidents</Button></>}
    </div>
  </section>;
}

const policyLabels: Record<string, string> = { pending: "Waiting for configuration", active: "Active", suspended: "Suspended", disabled: "Disabled", error: "Error" };
const policyReasons: Record<string, string> = {
  observability_alerts_waiting_activation: "Rules will be applied after observability has been verified for this application.",
  observability_alert_profile_unverified: "Rebuild the application with CNP SDK 0.3.0, then enable observability again to verify the metrics required for alerts.",
  observability_alerts_maintenance: "Collection alerts are temporarily suspended during maintenance.",
  observability_alerts_disabled: "Collection alert rules are disabled.",
  observability_alerts_unavailable: "Alert rules could not be reconciled. Refresh to check their current status.",
};
export function BindingAlertPolicy({ bindingId, canManage }: { bindingId: string; canManage: boolean }) {
  const [draft, setDraft] = useState<{ enabled: boolean; budget: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["observability", "alert-policy", bindingId],
    queryFn: async ({ signal }) => {
      const result = await service.alertPolicy(bindingId, signal);
      if (result.binding_id !== bindingId) throw new Error("The alert policy belongs to another application.");
      return result;
    }, retry: false, refetchOnWindowFocus: "always", refetchIntervalInBackground: false,
    refetchInterval: current => observabilityPollInterval(current, 30000),
  });
  const policy = query.data;
  const value = draft ?? { enabled: policy?.enabled ?? false, budget: policy?.latency_budget_ms?.toString() ?? "" };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !canManage || !query.isSuccess || !draft) return;
    const budget = draft.budget.trim() === "" ? null : Number(draft.budget);
    if (budget !== null && (!Number.isFinite(budget) || budget <= 0)) { setError("Enter a positive latency budget in milliseconds, or leave it empty."); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const updated: ObservabilityAlertPolicy = await service.saveAlertPolicy(bindingId, { enabled: draft.enabled, latency_budget_ms: budget });
      if (updated.binding_id !== bindingId) throw new Error("The saved policy could not be verified. Refresh its status.");
      client.setQueryData(["observability", "alert-policy", bindingId], updated);
      setDraft(null);
    } catch (caught) { setError(getErrorMessage(caught, "The alert policy could not be saved. Refresh before trying again.")); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section aria-label="Alert policy" className="space-y-3">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true"/>Alert policy</h3>
    {query.isPending && <p role="status" className="text-sm">Loading alert policy…</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">Alert policy status is unavailable.</p>}
    {policy && <>
      <p className="text-sm">Rule status: {query.isSuccess ? policyLabels[policy.status] ?? "Unknown" : "Unknown"} · Requested: {policy.enabled ? "Enabled" : "Disabled"}</p>
      <p className="text-xs text-muted-foreground">Last reconciled: {date(policy.last_reconciled_at)}{policy.suspended_until ? ` · Suspended until ${date(policy.suspended_until)}` : ""}</p>
      {policy.reason_code && <p className="text-sm text-muted-foreground">{policyReasons[policy.reason_code] ?? "The alert policy requires attention. Refresh its status."}</p>}
      <details><summary className="cursor-pointer text-sm">Configure collection alerts</summary>
        <form onSubmit={event => void save(event)} className="mt-3 space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.enabled} disabled={!canManage || !query.isSuccess || busy} onChange={event => setDraft({ ...value, enabled: event.target.checked })}/>Enable collection alert rules</label>
          <label className="block text-sm">Optional p95 latency budget (ms)<Input className="mt-1" type="number" min="0.001" step="any" value={value.budget} disabled={!canManage || !query.isSuccess || busy} onChange={event => setDraft({ ...value, budget: event.target.value })}/></label>
          <p className="text-xs text-muted-foreground">Leave the latency budget empty to omit latency alerts. No default service objective is assumed.</p>
          {!canManage && <p className="text-xs text-muted-foreground">A project Maintainer or Owner is required to change this policy.</p>}
          <Button type="submit" size="sm" disabled={!canManage || !query.isSuccess || !draft} loading={busy}>Save alert policy</Button>
        </form>
      </details>
      {!policy.sms_enabled && <p className="text-xs text-muted-foreground">SMS delivery is not enabled.</p>}
      {!policy.availability_supported && <p className="text-xs text-muted-foreground">Independent availability alerts are not supported for this profile. Collection alerts do not prove application availability.</p>}
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button size="sm" variant="link" disabled={query.isFetching || busy} onClick={() => void query.refetch()}>Refresh alert policy</Button>
  </section>;
}
