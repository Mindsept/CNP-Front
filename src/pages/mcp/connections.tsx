import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { mcpService } from "@/services/mcp.service";
import { projectService } from "@/services/project.service";
import { useToastError } from "@/hooks/use-toast-error";
import type { Connection } from "@/types/mcp";

function AddProject({ connection }: { connection: Connection }) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const queryClient = useQueryClient();
  const error = useToastError();
  const projects = useQuery({ queryKey: ["projects"], queryFn: projectService.list, enabled: open });
  const available = (projects.data?.items ?? []).filter(p =>
    ["owner", "maintainer", "viewer"].includes(p.role) && !connection.project_ids.includes(p.id)
  );
  const selected = available.find(p => p.id === projectId);
  const add = useMutation({
    mutationFn: (id: string) => mcpService.addConnectionProject(connection.id, id),
    onSuccess: async () => {
      toast.success("Projet ajouté à la connexion");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["mcp-connections"] });
    },
    onError: e => error(e, "Impossible d’ajouter le projet"),
  });
  return (
    <Dialog open={open} onOpenChange={next => { setOpen(next); setProjectId(""); }}>
      <DialogTrigger asChild><Button variant="outline">Ajouter un projet</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un projet</DialogTitle>
          <DialogDescription>
            {connection.client_name} ({connection.id.slice(0, 8)}) pourra utiliser ses droits sur le projet choisi.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{connection.scopes.join(", ")}</p>
        {projects.isPending ? <p>Chargement des projets…</p> : projects.isError ? (
          <Button variant="outline" onClick={() => void projects.refetch()}>Réessayer de charger les projets</Button>
        ) : available.length === 0 ? <p>Aucun projet à ajouter.</p> : (
          <div className="space-y-2">
            <Label htmlFor={`project-${connection.id}`}>Projet</Label>
            <select id={`project-${connection.id}`} value={projectId}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={e => setProjectId(e.target.value)}>
              <option value="">Choisir un projet</option>
              {available.map(p => <option key={p.id} value={p.id}>{p.name} (/{p.slug})</option>)}
            </select>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={!selected || add.isPending} onClick={() => selected && add.mutate(selected.id)}>
            Autoriser ce projet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function McpConnectionsPage() {
  const queryClient = useQueryClient();
  const error = useToastError();
  const connections = useQuery({ queryKey: ["mcp-connections"], queryFn: mcpService.connections });
  const activeConnections = connections.data?.items.filter(connection => !connection.revoked_at);
  const revoke = useMutation({
    mutationFn: mcpService.revoke,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp-connections"] }),
    onError: e => error(e, "Revocation failed"),
  });
  return <div className="space-y-6">
    <h1 className="text-2xl font-semibold">MCP connections</h1>
    <p>Revocation prevents the remaining operations from executing. Completed effects are preserved.</p>
    {connections.isError && <p role="alert">Connections could not be loaded.</p>}
    {activeConnections?.length === 0 && <p>No active MCP connections.</p>}
    {activeConnections?.map(c => (
      <SectionCard key={c.id} title={c.client_name}
        description={`Created ${new Date(c.created_at).toLocaleString()} · ID ${c.id.slice(0, 8)}`}>
        <p>{c.scopes.join(", ")}</p>
        <p className="my-3">{c.project_ids.length} authorized projects</p>
        <div className="flex flex-wrap gap-2">
          <AddProject connection={c} />
          <Button variant="destructive" disabled={revoke.isPending} onClick={() => revoke.mutate(c.id)}>
            Revoke connection
          </Button>
        </div>
      </SectionCard>
    ))}
  </div>;
}
