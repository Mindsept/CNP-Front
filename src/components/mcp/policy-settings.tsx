import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/section-card";
import { mcpService } from "@/services/mcp.service";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";
import { api } from "@/lib/api";

export function McpPolicySettings({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const error = useToastError();
  const query = useQuery({ queryKey: ["mcp-policy", projectId], queryFn: () => mcpService.policy(projectId) });
  const targets = useQuery({ queryKey: ["cloud-targets", projectId], queryFn: () => api.get<{ items: { id: string; name: string; namespace: string; environment: string }[] }>(`/projects/${projectId}/cloud-targets`), enabled: user?.role === "admin" });
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) { setEnabled(query.data.enabled); setSelected(query.data.target_ids); } }, [query.data]);
  async function save() { setBusy(true); try { await mcpService.savePolicy(projectId, enabled, selected); await query.refetch(); } catch (e) { error(e, "Policy could not be saved"); } finally { setBusy(false); } }
  return <SectionCard title="Reviewed MCP operations" description={`Policy version ${query.data?.version ?? 0}`}><p>{query.data?.enabled ? "Enabled for this project" : "Disabled"}</p><p className="my-3">Changes invalidate pending approvals. Azure OIDC, namespace permissions and observer credentials must be configured by a platform administrator.</p>
    {user?.role === "admin" && <div className="space-y-3"><label className="flex items-center gap-3"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Enable reviewed operations</label>{targets.data?.items.map(t => <label className="flex items-center gap-3" key={t.id}><input type="checkbox" checked={selected.includes(t.id)} onChange={e => setSelected(e.target.checked ? [...selected, t.id] : selected.filter(id => id !== t.id))} />{t.name} · {t.environment} · {t.namespace}</label>)}<Button disabled={busy || query.isPending} onClick={() => void save()}>Save project policy</Button></div>}</SectionCard>;
}
