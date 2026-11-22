import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/section-card";
import { Input } from "@/components/ui/input";
import { cdService } from "@/services/cd.service";
import { mcpService } from "@/services/mcp.service";
import { useToastError } from "@/hooks/use-toast-error";
import type { Action, ActionType } from "@/types/mcp";
import { PullRequestChecks, pullRequestChecks } from "./pull-request-checks";

export function ReviewedPipelineActions({ projectId, repositoryId, pipelineId, kind, hasPublishedPr, onImageResolved }: { projectId?: string; repositoryId: string; pipelineId?: string; kind: "ci" | "cd"; hasPublishedPr?: boolean; onImageResolved?: (image: string) => void }) {
  const error = useToastError();
  const policy = useQuery({ queryKey: ["mcp-policy", projectId], queryFn: () => mcpService.policy(projectId!), enabled: Boolean(projectId) });
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [mergeId, setMergeId] = useState("");
  const [offset, setOffset] = useState(0);
  const actionsQuery = useQuery({
    queryKey: ["pipeline-actions", repositoryId, pipelineId, offset],
    queryFn: () => mcpService.pipelineActions(repositoryId, pipelineId!, offset),
    enabled: Boolean(policy.data?.enabled && pipelineId),
    refetchInterval: 5000,
  });
  useEffect(() => { setAction(null); setOffset(0); }, [repositoryId, pipelineId]);
  const publicationType = kind === "ci" ? "ci_pr" : "cd_pr";
  const published = hasPublishedPr || actionsQuery.data?.items.some(item => item.type === publicationType && item.status === "succeeded");
  const checksQuery = useQuery({
    queryKey: ["pr-checks", repositoryId, kind, pipelineId],
    queryFn: ({ signal }) => mcpService.pullRequestStatus(repositoryId, kind, pipelineId!, signal),
    enabled: Boolean(policy.data?.enabled && pipelineId && published),
    refetchInterval: query => query.state.data?.state === "closed" ? false : 10000,
    retry: 1,
  });
  if (!policy.data?.enabled) return null;
  async function prepare(type: ActionType) {
    if (!pipelineId) return;
    setBusy(true);
    try {
      setAction(await mcpService.prepare(repositoryId, pipelineId, type, kind));
      void actionsQuery.refetch();
    } catch (e) { error(e, "This step is not ready or lacks permission"); } finally { setBusy(false); }
  }
  async function resolve() {
    setBusy(true);
    try {
      const result = await cdService.resolveImage(repositoryId, mergeId.trim());
      onImageResolved?.(result.image);
    } catch (e) {
      error(e, "The reviewed CI image is not available");
    } finally {
      setBusy(false);
    }
  }
  const rows = actionsQuery.data?.items ?? [];
  const actions = action && !rows.some(a => a.id === action.id) ? [action, ...rows] : rows;
  const blocked = !pipelineId || busy || actionsQuery.isPending || actionsQuery.isError;
  const mergeReady = published && !checksQuery.isError && checksQuery.data && pullRequestChecks(checksQuery.data).mergeReady;
  const activePublication = actions.some(a => a.type === publicationType && ["prepared", "awaiting_review", "approved", "queued", "running"].includes(a.status));
  return <SectionCard title="Human-reviewed operations" description="Open an existing action to examine its changes and make your decision."><p className="mb-4">Publication requires a human review. Preparing or reopening an action does not approve it.</p>
    {!pipelineId && <p className="mb-4 text-muted-foreground">Select or generate a saved preview first.</p>}
    {pipelineId && actionsQuery.isPending && <p>Loading existing actions…</p>}
    {actionsQuery.isError && <p role="alert">Existing actions could not be loaded. <Button variant="outline" onClick={() => void actionsQuery.refetch()}>Retry</Button></p>}
    <ul className="mb-4 space-y-3">{actions.map(a => <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
      <span>{a.type === "ci_pr" || a.type === "cd_pr" ? "PR publication" : a.type} · {a.status}</span>
      <Button variant="outline" asChild><Link to={`/mcp/reviews/${a.id}`}>{["prepared", "awaiting_review"].includes(a.status) ? "Review publication" : "View action"}</Link></Button>
      {a.job_id && <Link className="text-primary" to={`/jobs/${a.job_id}`}>View execution job</Link>}
    </li>)}</ul>
    {actionsQuery.data && (offset > 0 || actionsQuery.data.next_offset !== null) && <div className="mb-4 flex gap-3">
      <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous actions</Button>
      <Button variant="outline" disabled={actionsQuery.data.next_offset === null} onClick={() => setOffset(actionsQuery.data!.next_offset!)}>Next actions</Button>
    </div>}
    {kind === "cd" && <details className="mb-4 space-y-3"><summary>Choose a specific CI merge</summary><label>Successful CI merge action ID<Input value={mergeId} onChange={e => setMergeId(e.target.value)} /></label><Button disabled={busy || !mergeId.trim()} variant="outline" onClick={() => void resolve()}>Use verified image</Button></details>}
    {published && checksQuery.isPending && <p role="status" className="mb-4 text-sm text-muted-foreground">Loading GitHub checks…</p>}
    {published && checksQuery.isError && <p role="alert" className="mb-4 text-sm">Could not refresh GitHub checks. <Button variant="outline" onClick={() => void checksQuery.refetch()}>Retry</Button></p>}
    {published && checksQuery.data && <PullRequestChecks pr={checksQuery.data} />}
    <div className="flex flex-wrap gap-3"><Button disabled={blocked} variant="outline" onClick={() => void prepare("secret_sync")}>Prepare secret synchronization</Button><Button disabled={blocked || activePublication} onClick={() => void prepare(publicationType)}>Prepare PR publication</Button><Button disabled={blocked || !mergeReady} variant="outline" onClick={() => void prepare("pr_merge")}>Prepare PR merge</Button>{kind === "cd" && <Button disabled={blocked} variant="outline" onClick={() => void prepare("deployment")}>Prepare deployment</Button>}</div>
    </SectionCard>;
}
