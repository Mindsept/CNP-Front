import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { mcpService } from "@/services/mcp.service";
import { useToastError } from "@/hooks/use-toast-error";

export function McpConnectionsPage() {
  const queryClient = useQueryClient();
  const error = useToastError();
  const connections = useQuery({ queryKey: ["mcp-connections"], queryFn: mcpService.connections });
  const revoke = useMutation({ mutationFn: mcpService.revoke, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp-connections"] }), onError: e => error(e, "Revocation failed") });
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">MCP connections</h1><p>Revocation prevents the remaining operations from executing. Completed effects are preserved.</p>
    {connections.isError && <p role="alert">Connections could not be loaded.</p>}{connections.data?.items.length === 0 && <p>No connections.</p>}
    {connections.data?.items.map(c => <SectionCard key={c.id} title={c.client_name} description={`Created ${new Date(c.created_at).toLocaleString()}`}><p>{c.scopes.join(", ")}</p><p className="my-3">{c.project_ids.length} authorized projects</p><Button variant="destructive" disabled={Boolean(c.revoked_at) || revoke.isPending} onClick={() => revoke.mutate(c.id)}>{c.revoked_at ? "Revoked" : "Revoke connection"}</Button></SectionCard>)}</div>;
}
