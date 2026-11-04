import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Activity, ExternalLink } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useObservabilityActivation, type ActivationScope } from "@/hooks/use-observability-activation";
import { getErrorMessage } from "@/lib/errors";
import { openBindingGrafana } from "@/services/observability.service";
import { mcpService } from "@/services/mcp.service";
import { ObservabilityStatusBadge } from "./observability-status-badge";
import { GithubPermissionsNotice } from "./github-permissions-notice";
import { BindingAlertPolicy, ObservabilityIncidents } from "./observability-alerts";
import type { CdPreview } from "@/types/cd";
import type { ActivationPlan, GrafanaDestination, ObservabilityImage, ObservabilityOperation } from "@/types/observability";

const stages: Record<ObservabilityOperation["stage"], string> = {
  accepted: "Queued", checking_preconditions: "Checking prerequisites", waiting_cd: "Deploying application",
  reconciling_external_effect: "Reconciling deployment status", verifying_deployment: "Verifying deployed image",
  applying_observability: "Configuring observability", waiting_rollout: "Waiting for application rollout",
  verifying_signals: "Waiting for telemetry", suspending_collection_alerts: "Suspending collection alerts",
  revoking_ingestion: "Revoking ingestion access", removing_instrumentation: "Removing instrumentation",
  removing_owned_resources: "Removing observability resources", completed: "Completed",
};
function date(value: string | null) { return value ? new Date(value).toLocaleString() : "Not verified yet"; }
function ImageSummary({ label, image, state }: { label: string; image: ObservabilityImage | null; state?: string }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p>{image ? <>
    <p className="font-mono text-sm">{image.image_commit_sha?.slice(0, 12) ?? "Commit unavailable"}</p>
    <details className="mt-1 text-xs"><summary className="cursor-pointer text-muted-foreground">Image details</summary><p className="mt-2 break-all font-mono">{image.reference}</p>{image.ci_run_id && <p className="mt-1">Successful CI run {image.ci_run_id}, attempt {image.ci_run_attempt}</p>}</details>
  </> : <p className="text-sm">{state === "not_deployed" ? "Not deployed" : "Image not verified"}</p>}</div>;
}
function PlanSummary({ plan }: { plan: ActivationPlan }) {
  const reason = plan.selection_context?.reason;
  return <div className="space-y-3 rounded-lg border border-border p-4">
    {plan.intent === "enable" && <div className="grid gap-4 sm:grid-cols-2"><ImageSummary label="Currently deployed" image={plan.current_image} state={plan.current_image_state}/><ImageSummary label="Selected version" image={plan.candidate_image}/></div>}
    {reason === "head_ci_pending" && <p className="text-sm">The latest push is still running CI. This plan uses the most recent eligible successful build.</p>}
    {reason === "head_ci_failed" && <p className="text-sm">The latest push failed CI. This plan uses the most recent eligible successful build.</p>}
    {reason === "head_build_ineligible" && <p className="text-sm">The latest push has no eligible image. This plan uses the most recent verified build.</p>}
    {plan.restart_required && <p className="text-sm font-medium">This change restarts the application{plan.application_rollouts === 2 ? " in two rollouts" : ""}.</p>}
    {plan.collection_interruption_expected && <p className="text-sm">Telemetry collection will be interrupted during this change.</p>}
    {plan.effects.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{plan.effects.map(effect => <li key={effect.code}>{effect.description}</li>)}</ul>}
    {plan.blockers.map(blocker => <p key={blocker.code} className="text-sm text-muted-foreground">{blocker.message}</p>)}
    {plan.status === "no_change" && <p className="text-sm">Configuration is up to date. No operation is needed.</p>}
  </div>;
}
function OperationSummary({ operation }: { operation: ObservabilityOperation }) {
  const verified = operation.evidence.verified_revision === operation.desired_revision && (operation.intent === "enable"
    ? Boolean(operation.evidence.deployment_verified_at && operation.evidence.signals_verified_at)
    : Boolean(operation.evidence.disable_verified_at));
  const status = operation.status === "failed" ? "Operation failed" : operation.status === "superseded" ? "Replaced by a newer decision" :
    operation.status === "succeeded" ? (verified ? "Operation completed" : "Completion could not be verified") : stages[operation.stage] ?? "Unknown operation status";
  return <div className="space-y-2 rounded-lg border border-border p-4">
    <p role="status" aria-live="polite" className="font-medium">{status}</p>
    <p className="text-xs text-muted-foreground">Attempt {operation.attempt_number} · Started {date(operation.created_at)} · Updated {date(operation.updated_at)}</p>
    {operation.image && <ImageSummary label="Authorized version" image={operation.image}/>}
    {operation.collection_interruption_expected && <p className="text-sm">Collection interruption was included in this change.</p>}
    {operation.stage === "reconciling_external_effect" && <p className="text-sm">CNP is checking the original external action. Starting another deployment is blocked until its result is known.</p>}
    {operation.stage_deadline_at && <p className="text-xs text-muted-foreground">Stage deadline: {date(operation.stage_deadline_at)}</p>}
    {operation.failure && <p role="alert" className="text-sm text-destructive">{operation.failure.message}</p>}
    {operation.next_action === "operator_reconciliation" && <p className="text-sm">An operator must reconcile this action before it can continue.</p>}
  </div>;
}
function ScopedPanel({ scope, initialOperationId, onOperation }: { scope: ActivationScope; initialOperationId: string | null; onOperation: (id: string) => void }) {
  const state = useObservabilityActivation(scope, initialOperationId, onOperation);
  const [grafanaError, setGrafanaError] = useState<string | null>(null);
  const data = state.context.data;
  const op = state.operation.data;
  const plan = state.plan;
  const actorId = useAuth().user?.id;
  const needsGithubDeployment = state.intent === "enable" && (
    data?.application_status === "not_deployed" || plan?.deployment_required ||
    plan?.blockers.some(item => item.code === "github_actions_write_required") ||
    ["waiting_cd", "reconciling_external_effect", "verifying_deployment"].includes(op?.stage ?? "")
  );
  const checkGithub = state.canManage && needsGithubDeployment;
  const github = useQuery({
    queryKey: ["repository", scope.repositoryId, "deployment-permissions", actorId],
    queryFn: ({ signal }) => mcpService.deploymentPermissions(scope.repositoryId, signal),
    enabled: checkGithub, retry: false, refetchOnWindowFocus: "always", refetchIntervalInBackground: false,
    refetchInterval: query => query.state.data?.status === "ready" ? false : 30000,
  });
  const permissionWasBlocked = useRef(false);
  const refreshActivationPlan = state.refreshPlan;
  useEffect(() => {
    if (!checkGithub) return;
    if (github.isError || github.data && github.data.status !== "ready") permissionWasBlocked.current = true;
    else if (github.data?.status === "ready" && permissionWasBlocked.current) {
      permissionWasBlocked.current = false;
      // Refresh the proposal only; granting GitHub permissions never starts an operation.
      refreshActivationPlan();
    }
  }, [checkGithub, github.isError, github.data, refreshActivationPlan]);
  const githubReady = !checkGithub || github.isSuccess && github.data.status === "ready";
  const contextFresh = state.context.isSuccess && state.context.fetchStatus !== "paused";
  const label = state.intent === "disable" ? "Disable observability" : data?.desired_enabled ? "Update application and observability" :
    plan?.deployment_required ? "Deploy this version and enable observability" : "Enable observability";
  async function open(destination: GrafanaDestination) {
    if (!data?.binding_id || !contextFresh) return;
    setGrafanaError(null);
    try { await openBindingGrafana(data.binding_id, destination); }
    catch (error) { setGrafanaError(getErrorMessage(error, "Grafana could not be opened. Try again.")); }
  }
  return <div className="space-y-4">
    <p className="break-words text-sm font-medium">{scope.serviceKey}{data ? ` · ${data.scope.environment}` : ""}</p>
    <p className="break-all text-xs text-muted-foreground">Target: {scope.targetId}</p>
    {checkGithub && <GithubPermissionsNotice data={github.data} pending={github.isPending} error={github.isError} onRetry={() => void github.refetch()}/>}
    {state.context.isPending && <p role="status" className="text-sm text-muted-foreground">Checking permissions and observability status…</p>}
    {(!contextFresh && !state.context.isPending) && <p role="alert" className="text-sm text-destructive">Current observability status is unavailable. Any displayed values are the last known state.</p>}
    {data && <>
      <div className="flex flex-wrap items-center gap-3"><span className="text-sm">Telemetry</span><ObservabilityStatusBadge status={contextFresh ? data.health.status : "unknown"}/><span className="text-xs text-muted-foreground">Last verified: {date(data.health.last_verified_at)}</span></div>
      <p className="text-sm">Application: {({ ready: "Ready", not_ready: "Not ready", not_deployed: "Not deployed", unknown: "Unknown" })[data.application_status] ?? "Unknown"}. Last observed: {date(data.health.observed_at)}.</p>
      {data.health.status === "degraded" && <p className="text-sm">Telemetry checks are degraded. Historical data may still be available in Grafana. Refresh status to check again.</p>}
      {data.health.status === "unknown" && <p className="text-sm">Telemetry has not been verified for this configuration.</p>}
      {data.health.reason_code === "observability_verification_stale" && <p className="text-sm">The last telemetry verification is stale. Current collection health is unknown until a fresh check completes.</p>}
      {contextFresh && !data.can_manage && <p className="text-sm text-muted-foreground">Viewer access. A project Maintainer or Owner is required to change observability.</p>}
      <div className="flex flex-wrap gap-2">{(["logs", "metrics", "traces", "overview"] as const).map(destination => <Button key={destination} size="sm" variant="outline" disabled={!data.binding_id || !contextFresh} onClick={() => void open(destination)} aria-label={`${destination === "overview" ? "Open Grafana" : destination[0].toUpperCase() + destination.slice(1)} (opens a new tab)`}>{destination === "overview" ? "Open Grafana" : destination[0].toUpperCase() + destination.slice(1)}<ExternalLink className="ml-2 h-3 w-3" aria-hidden="true"/></Button>)}</div>
      {!data.binding_id && <p className="text-xs text-muted-foreground">Grafana links become available once this application has an observability binding.</p>}
    </>}
    {op && <OperationSummary operation={op}/>}
    {state.operationUncertain && <p role="alert" className="text-sm text-destructive">The latest operation could not be verified. Refresh status before making a change.</p>}
    {state.pending && <div className="space-y-2"><p role="status" className="text-sm">Checking activation status… Your original request is preserved; no new operation will be submitted.</p><Button variant="outline" disabled={state.busy || !state.canManage || !contextFresh} onClick={state.replay}>Check original request</Button></div>}
    {data && <>
      {data.binding_id && <div className="flex flex-wrap gap-2" role="group" aria-label="Desired observability change">
        <Button size="sm" variant={state.intent === "enable" ? "secondary" : "ghost"} aria-pressed={state.intent === "enable"} disabled={!state.canManage || state.busy || Boolean(state.pending) || state.active} onClick={() => state.changeIntent("enable")}>Enable / update</Button>
        <Button size="sm" variant={state.intent === "disable" ? "secondary" : "ghost"} aria-pressed={state.intent === "disable"} disabled={!state.canManage || state.busy || Boolean(state.pending) || state.active} onClick={() => state.changeIntent("disable")}>Disable</Button>
      </div>}
      {state.capability && !state.capability.available && <p className="text-sm text-muted-foreground">{state.capability.message}</p>}
      {state.planQuery.isFetching && <p role="status" className="text-sm">Preparing the exact image and configuration…</p>}
      {state.planQuery.isError && <p role="alert" className="text-sm text-destructive">The activation plan could not be prepared. {getErrorMessage(state.planQuery.error)}</p>}
      {plan && !state.active && !state.pending && <PlanSummary plan={plan}/>}
      {(state.expired || state.invalidPlan) && <p role="alert" className="text-sm">This plan is expired or obsolete. Refresh it, review the new version and effects, then choose the action again.</p>}
      {(!state.active && !state.pending) && <div className="flex flex-wrap gap-2">
        <Button className="h-auto min-h-9 max-w-full whitespace-normal" disabled={!state.planReady || !contextFresh || !githubReady} loading={state.busy} onClick={state.start}>{label}</Button>
        {state.canManage && <Button variant="outline" disabled={state.busy || !contextFresh || !state.capability?.available || state.planQuery.isFetching} onClick={state.refreshPlan}>Refresh plan</Button>}
        {op?.status === "failed" && <Button variant="outline" disabled={!state.canManage || !contextFresh || !op.retryable || state.busy || state.operationUncertain} onClick={state.retry}>Retry observability</Button>}
      </div>}
    </>}
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    {grafanaError && <p role="alert" className="text-sm text-destructive">{grafanaError}</p>}
    <Button size="sm" variant="link" disabled={state.context.isFetching} onClick={state.refreshStatus}>Refresh observability status</Button>
    {data?.binding_id && <><BindingAlertPolicy key={data.binding_id} bindingId={data.binding_id} canManage={state.canManage && contextFresh}/><ObservabilityIncidents projectId={scope.projectId} bindingId={data.binding_id} canManage={state.canManage && contextFresh}/></>}
  </div>;
}

export function RepositoryObservabilityPanel({ projectId, repositoryId, pipeline }: { projectId?: string; repositoryId: string; pipeline: CdPreview | null }) {
  const auth = useAuth();
  const [search, setSearch] = useSearchParams();
  const linkedTarget = search.get("obsTarget");
  const linkedService = search.get("obsService");
  const targetId = linkedTarget && linkedService ? linkedTarget : pipeline?.cloud_target_id;
  const serviceKey = linkedTarget && linkedService ? linkedService : pipeline?.app_name;
  if (!projectId) return null;
  function rememberOperation(id: string) {
    setSearch(current => { const next = new URLSearchParams(current); next.set("obsTarget", targetId!); next.set("obsService", serviceKey!); next.set("obsOperation", id); return next; }, { replace: true });
  }
  function useSelectedPipeline() {
    setSearch(current => { const next = new URLSearchParams(current); ["obsTarget", "obsService", "obsOperation"].forEach(key => next.delete(key)); return next; }, { replace: true });
  }
  return <SectionCard title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>Observability</span>} description="Activate and inspect logs, metrics and traces for this application.">
    {auth.isLoading && <p role="status" className="text-sm">Checking permissions…</p>}
    {auth.error && <p role="alert" className="text-sm text-destructive">Permissions could not be loaded. Sign in again or refresh the page.</p>}
    {!targetId || !serviceKey ? <p className="text-sm text-muted-foreground">Select a saved CD application and target to configure observability.</p> : auth.user && <ScopedPanel key={JSON.stringify([auth.user.id, projectId, repositoryId, targetId, serviceKey])} scope={{ actorId: auth.user.id, projectId, repositoryId, targetId, serviceKey }} initialOperationId={search.get("obsOperation")} onOperation={rememberOperation}/>}
    {linkedTarget && pipeline && (linkedTarget !== pipeline.cloud_target_id || linkedService !== pipeline.app_name) && <Button className="mt-3" variant="link" onClick={useSelectedPipeline}>Use selected CD application</Button>}
  </SectionCard>;
}
