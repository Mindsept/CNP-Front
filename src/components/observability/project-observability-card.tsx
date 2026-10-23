import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { useObservabilityBindings } from "@/hooks/use-observability";
import { GrafanaLaunchButton } from "./grafana-launch-button";
import { ObservabilityStatusBadge } from "./observability-status-badge";
export function ProjectObservabilityCard({ projectId, targets = [] }: {
  projectId: string;
  targets?: {
    id: string;
    name: string;
  }[];
}) {
  const [offset, setOffset] = useState(0);
  const query = useObservabilityBindings(projectId, undefined, offset);
  return <SectionCard title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>Observability</span>} description="Application telemetry for this project. Grafana opens separately with Viewer access." actions={<GrafanaLaunchButton projectId={projectId}/>}>
  {query.isPending && <p className="text-sm text-muted-foreground">Loading application observability…</p>}
  {query.isError && <p role="alert" className="text-sm text-destructive">Observability status is unavailable. Your deployments are unaffected. <Button variant="link" onClick={() => void query.refetch()}>Retry status</Button></p>}
  {query.isSuccess && <><div className="divide-y divide-border">{query.data.items.map(binding => <div key={binding.binding_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link className="font-medium hover:text-primary" to={`/repositories/${binding.repository_id}/cd`}>{binding.service_key}</Link><p className="text-xs text-muted-foreground">{binding.environment} · {targets.find(t => t.id === binding.cloud_target_id)?.name ?? binding.cloud_target_id}</p></div><ObservabilityStatusBadge status={binding.status}/></div>)}</div>{query.data.total === 0 && <p className="text-sm text-muted-foreground">No application has observability configured yet. Prepare it from a repository's CD workflow.</p>}<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{query.data.total} configuration(s)</span><div className="flex gap-2"><Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous applications</Button><Button size="sm" variant="ghost" disabled={offset + query.data.limit >= query.data.total} onClick={() => setOffset(offset + 20)}>Next applications</Button></div></div></>}
 </SectionCard>;
}
