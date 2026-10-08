import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/section-card";
import { YamlViewer } from "@/components/common/yaml-viewer";
import { mcpService } from "@/services/mcp.service";
import { useToastError } from "@/hooks/use-toast-error";

export function McpRunPage() {
  const { runId = "" } = useParams();
  const error = useToastError();
  const run = useQuery({ queryKey: ["mcp-run", runId], queryFn: () => mcpService.run(runId), refetchInterval: 5000 });
  const cancel = useMutation({ mutationFn: () => mcpService.cancelRun(runId), onSuccess: () => run.refetch(), onError: e => error(e, "Cancellation failed") });
  const deployment = run.data?.actions.slice().reverse().find(a => a.type === "deployment" && a.status === "succeeded");
  const observation = useQuery({ queryKey: ["mcp-observation", deployment?.id], queryFn: () => mcpService.deployment(deployment!.id), enabled: Boolean(deployment), refetchInterval: 10000 });
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Deployment journey</h1>{run.isError && <p role="alert">Journey unavailable.</p>}
    <SectionCard title={run.data?.status ?? "Loading…"}><p>{run.data?.guidance}</p><p>Next step: {run.data?.next_action ?? "None"}</p><Button variant="outline" className="mt-4" disabled={!run.data || ["cancelled", "succeeded", "failed"].includes(run.data.status) || cancel.isPending} onClick={() => cancel.mutate()}>Stop remaining steps</Button><p className="mt-2 text-sm">Completed external effects are preserved.</p></SectionCard>
    {run.data?.actions.map(a => <SectionCard key={a.id} title={`${a.type} · ${a.status}`}><Link to={`/mcp/reviews/${a.id}`} className="text-primary">View immutable action</Link>{a.error_code && <p role="alert">{a.error_code}</p>}</SectionCard>)}
    {observation.data && <YamlViewer filename="Workflow, replicas and public address" language="json" yaml={JSON.stringify(observation.data, null, 2)} />}</div>;
}
