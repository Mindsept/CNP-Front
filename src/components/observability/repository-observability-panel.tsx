import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useObservabilityBindings, useObservabilityPermissions, observabilityReason } from "@/hooks/use-observability";
import { getErrorMessage } from "@/lib/errors";
import { observabilityService } from "@/services/observability.service";
import { ObservabilityReviewDialog } from "./observability-review-dialog";
import { ObservabilityStatusBadge } from "./observability-status-badge";
import type { CdPreview } from "@/types/cd";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function RepositoryObservabilityPanel({ projectId, repositoryId, pipeline }: {
  projectId?: string;
  repositoryId: string;
  pipeline: CdPreview | null;
}) {
  const client = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const bindings = useObservabilityBindings(projectId, repositoryId, 0, pipeline?.cloud_target_id, pipeline?.app_name);
  const { canManage } = useObservabilityPermissions(projectId);
  const [enabled, setEnabled] = useState(true);
  const [imageDigest, setImageDigest] = useState(() => pipeline?.image.match(/@(sha256:[0-9a-f]{64})$/)?.[1] ?? (/^sha256:[0-9a-f]{64}$/.test(pipeline?.image_tag ?? "") ? pipeline!.image_tag : ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const keys = useRef(new Map<string, string>());
  const binding = bindings.data?.items.find(b => b.service_key === pipeline?.app_name && b.cloud_target_id === pipeline?.cloud_target_id);
  const availability = useQuery({ queryKey: ["observability", "availability", repositoryId, pipeline?.cloud_target_id, pipeline?.app_name], queryFn: () => observabilityService.availability(repositoryId, pipeline!.cloud_target_id, pipeline!.app_name), enabled: Boolean(projectId && pipeline), retry: false, refetchInterval: 15000 });
  const planId = search.get("obsPlan");
  const review = useQuery({ queryKey: ["observability", "plan", planId], queryFn: () => observabilityService.plan(planId!), enabled: Boolean(projectId && pipeline && planId && uuid.test(planId)), retry: false });
  const matches = review.isSuccess && review.data && review.data.cd_pipeline_id === pipeline?.cd_pipeline_id && review.data.binding_id === binding?.binding_id;
  function closeReview() { setSearch(current => { const next = new URLSearchParams(current); next.delete("obsPlan"); return next; }, { replace: true }); setError(null); }
  async function action(work: () => Promise<void>) {
    if (locked.current)
      return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await work();
    }
    catch (e) {
      setError(getErrorMessage(e, "The observability operation failed."));
      if (planId)
        void review.refetch();
    }
    finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function key(scope: string) { if (!keys.current.has(scope))
    keys.current.set(scope, crypto.randomUUID()); return keys.current.get(scope)!; }
  async function prepare() {
    if (!pipeline || !canManage || !bindings.isSuccess || (enabled && !availability.data?.available))
      return;
    const bound = binding ?? await observabilityService.bind(repositoryId, pipeline.cloud_target_id, pipeline.app_name);
    const plan = await observabilityService.prepare(repositoryId, bound.binding_id, pipeline.cd_pipeline_id, enabled, imageDigest.trim());
    await client.invalidateQueries({ queryKey: ["observability", "bindings", projectId] });
    client.setQueryData(["observability", "plan", plan.plan_id], plan);
    setSearch(current => { const next = new URLSearchParams(current); next.set("obsPlan", plan.plan_id); return next; });
  }
  async function approve() {
    if (!matches || !review.data || !canManage || review.data.status !== "preview")
      return;
    await observabilityService.approve(review.data, key("approve:" + review.data.plan_id));
    await client.invalidateQueries({ queryKey: ["observability", "bindings", projectId] });
    closeReview();
  }
  async function retry() {
    if (!binding || binding.status !== "failed" || !canManage || !bindings.isSuccess)
      return;
    const scope = "retry:" + binding.binding_id + ":" + binding.config_revision;
    await observabilityService.retry(binding.binding_id, key(scope));
    // Keep the key after an uncertain response, but allow a new attempt after success.
    keys.current.delete(scope);
    await client.invalidateQueries({ queryKey: ["observability", "bindings", projectId] });
  }
  if (!projectId)
    return null;
  const ready = Boolean(pipeline && canManage && bindings.isSuccess && (enabled ? availability.isSuccess && availability.data.available && /^sha256:[0-9a-f]{64}$/.test(imageDigest.trim()) : binding));
  return <SectionCard title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>Observability</span>} description="Prepare logs, metrics and traces for this application. A separate review is required before applying changes.">
  <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">{pipeline ? `${pipeline.app_name} · selected CD target` : "Select or generate a saved CD preview first."}</p><p className="mt-1 text-xs text-muted-foreground">FastAPI / Azure AKS · SDK required · logs + metrics + traces</p></div>{bindings.isSuccess && binding && <ObservabilityStatusBadge status={binding.status}/>}</div>
  {bindings.isError && <p role="alert" className="text-sm text-destructive">Existing observability settings could not be loaded. <Button variant="link" onClick={() => void bindings.refetch()}>Retry status</Button></p>}
  {bindings.isPending && <p className="text-sm text-muted-foreground">Loading existing observability settings…</p>}
  {pipeline && <><label className="flex items-center gap-3 text-sm"><Switch checked={enabled} disabled={!canManage || busy} onCheckedChange={value => { setEnabled(value); closeReview(); }}/>Enable observability in this plan</label>{enabled && <div><label htmlFor="observability-image-digest" className="text-sm font-medium">Image digest (SHA-256)</label><Input id="observability-image-digest" className="mt-2 font-mono text-xs" placeholder="sha256:…" value={imageDigest} disabled={!canManage || busy} onChange={e => { setImageDigest(e.target.value); closeReview(); }}/><p className="mt-1 text-xs text-muted-foreground">Use the immutable digest of the approved application image. A tag alone is not sufficient.</p></div>}
  {enabled && availability.isPending && <p className="text-sm text-muted-foreground">Checking availability…</p>}{enabled && availability.isError && <p role="alert" className="text-sm text-destructive">Availability could not be checked. <Button variant="link" onClick={() => void availability.refetch()}>Retry availability</Button></p>}{enabled && availability.data && !availability.data.available && <p className="text-sm text-muted-foreground">{observabilityReason(availability.data.reason_code)}</p>}
  {binding?.reason_code && bindings.isSuccess && <p className="text-sm text-muted-foreground">{observabilityReason(binding.reason_code)}</p>}
  {binding?.status === "degraded" && bindings.isSuccess && <p className="text-sm text-muted-foreground">Telemetry checks are degraded. CNP checks again automatically; if this persists, check the application and observability platform. <Button variant="link" disabled={busy || bindings.isFetching} onClick={() => void bindings.refetch()}>Refresh observability status</Button></p>}
  <div className="flex flex-wrap gap-2"><Button variant="subtle" loading={busy} disabled={!ready} onClick={() => void action(prepare)}>Prepare configuration</Button>{binding?.status === "failed" && bindings.isSuccess && <Button variant="outline" disabled={!canManage || busy} onClick={() => void action(retry)}>Retry observability</Button>}</div></>}
  {!canManage && <p className="text-xs text-muted-foreground">Viewer access. A project Maintainer or Owner is required to change observability.</p>}
  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  {planId && (!uuid.test(planId) || review.isError || (review.isSuccess && !matches && bindings.isSuccess)) && <p role="alert" className="text-sm text-destructive">This review is unavailable or belongs to another CD selection. <Button variant="link" onClick={closeReview}>Dismiss review</Button></p>}
  {planId && review.isPending && pipeline && uuid.test(planId) && <p className="text-sm text-muted-foreground">Loading observability review…</p>}
  {matches && review.data && <ObservabilityReviewDialog key={review.data.plan_id} plan={review.data} canManage={canManage && bindings.isSuccess} busy={busy} error={error} onClose={closeReview} onApprove={() => void action(approve)}/>}
  </div>
 </SectionCard>;
}
