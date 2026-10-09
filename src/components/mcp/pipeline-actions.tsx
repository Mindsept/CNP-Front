import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/section-card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { mcpService } from "@/services/mcp.service";
import { useToastError } from "@/hooks/use-toast-error";
import type { Action, ActionType } from "@/types/mcp";

export function ReviewedPipelineActions({ projectId, repositoryId, pipelineId, kind }: { projectId?: string; repositoryId: string; pipelineId?: string; kind: "ci" | "cd" }) {
  const error = useToastError();
  const policy = useQuery({ queryKey: ["mcp-policy", projectId], queryFn: () => mcpService.policy(projectId!), enabled: Boolean(projectId) });
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [mergeId, setMergeId] = useState("");
  const [image, setImage] = useState("");
  const [offset, setOffset] = useState(0);
  const actionsQuery = useQuery({
    queryKey: ["pipeline-actions", repositoryId, pipelineId, offset],
    queryFn: () => mcpService.pipelineActions(repositoryId, pipelineId!, offset),
    enabled: Boolean(policy.data?.enabled && pipelineId),
    refetchInterval: 5000,
  });
  useEffect(() => { setAction(null); setOffset(0); }, [repositoryId, pipelineId]);
  if (!policy.data?.enabled) return null;
  async function prepare(type: ActionType) {
    if (!pipelineId) return;
    setBusy(true);
    try {
      setAction(await mcpService.prepare(repositoryId, pipelineId, type, kind));
      void actionsQuery.refetch();
    } catch (e) { error(e, "This step is not ready or lacks permission"); } finally { setBusy(false); }
  }
  async function resolve() { setBusy(true); try { const result = await api.get<{ image: string }>(`/repositories/${repositoryId}/images/${encodeURIComponent(mergeId)}`); setImage(result.image); } catch (e) { error(e, "The reviewed CI image is not available"); } finally { setBusy(false); } }
  const rows = actionsQuery.data?.items ?? [];
  const actions = action && !rows.some(a => a.id === action.id) ? [action, ...rows] : rows;
  const blocked = !pipelineId || busy || actionsQuery.isPending || actionsQuery.isError;
  const publicationType = kind === "ci" ? "ci_pr" : "cd_pr";
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
    {kind === "cd" && <div className="mb-4 space-y-3"><label>Successful CI merge action ID<Input value={mergeId} onChange={e => setMergeId(e.target.value)} /></label><Button disabled={busy || !mergeId} variant="outline" onClick={() => void resolve()}>Resolve verified image</Button>{image && <p className="break-all">Use this digest in the image field: {image}</p>}</div>}
    <div className="flex flex-wrap gap-3"><Button disabled={blocked} variant="outline" onClick={() => void prepare("secret_sync")}>Prepare secret synchronization</Button><Button disabled={blocked || activePublication} onClick={() => void prepare(publicationType)}>Prepare PR publication</Button><Button disabled={blocked} variant="outline" onClick={() => void prepare("pr_merge")}>Prepare PR merge</Button>{kind === "cd" && <Button disabled={blocked} variant="outline" onClick={() => void prepare("deployment")}>Prepare deployment</Button>}</div>
    </SectionCard>;
}
