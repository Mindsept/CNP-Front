import { useState } from "react";
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
  if (!policy.data?.enabled) return null;
  async function prepare(type: ActionType) {
    if (!pipelineId) return;
    setBusy(true);
    try { setAction(await mcpService.prepare(repositoryId, pipelineId, type, kind)); } catch (e) { error(e, "This step is not ready or lacks permission"); } finally { setBusy(false); }
  }
  async function resolve() { setBusy(true); try { const result = await api.get<{ image: string }>(`/repositories/${repositoryId}/images/${encodeURIComponent(mergeId)}`); setImage(result.image); } catch (e) { error(e, "The reviewed CI image is not available"); } finally { setBusy(false); } }
  return <SectionCard title="Human-reviewed operations" description="This project uses immutable actions. Legacy approval and direct PR publication are disabled."><p className="mb-4">Configure application secrets in CNP. Review secret synchronization, PR publication, fusion and deployment separately.</p>
    {kind === "cd" && <div className="mb-4 space-y-3"><label>Successful CI merge action ID<Input value={mergeId} onChange={e => setMergeId(e.target.value)} /></label><Button disabled={busy || !mergeId} variant="outline" onClick={() => void resolve()}>Resolve verified image</Button>{image && <p className="break-all">Use this digest in the image field: {image}</p>}</div>}
    <div className="flex flex-wrap gap-3"><Button disabled={!pipelineId || busy} variant="outline" onClick={() => void prepare("secret_sync")}>Prepare secret synchronization</Button><Button disabled={!pipelineId || busy} onClick={() => void prepare(kind === "ci" ? "ci_pr" : "cd_pr")}>Prepare PR publication</Button><Button disabled={!pipelineId || busy} variant="outline" onClick={() => void prepare("pr_merge")}>Prepare PR merge</Button>{kind === "cd" && <Button disabled={!pipelineId || busy} variant="outline" onClick={() => void prepare("deployment")}>Prepare deployment</Button>}</div>
    {action && <p className="mt-4"><Link className="text-primary" to={`/mcp/reviews/${action.id}`}>Examine {action.type} and decide</Link></p>}</SectionCard>;
}
