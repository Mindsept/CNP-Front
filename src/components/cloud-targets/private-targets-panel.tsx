import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SectionCard } from "@/components/common/section-card";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToastError } from "@/hooks/use-toast-error";
import { parsePrivateContract } from "@/lib/private-contract";
import { cloudTargetService } from "@/services/cloud-target.service";
import { projectService } from "@/services/project.service";
import { secretService } from "@/services/secret.service";
import type { CloudTarget } from "@/types/cloud-target";

export function PrivateTargetsPanel() {
  const [projectId, setProjectId] = useState("");
  const [contract, setContract] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const qc = useQueryClient();
  const onError = useToastError();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => projectService.list() });
  const targets = useQuery({ queryKey: ["cloud-targets", projectId], queryFn: () => cloudTargetService.list(projectId), enabled: Boolean(projectId) });
  const register = useMutation({
    mutationFn: () => cloudTargetService.createForProject(projectId, parsePrivateContract(contract, projectId)),
    onSuccess: () => {
      setContract(""); setFormError(null);
      toast.success("Private k3s target registered");
      void qc.invalidateQueries({ queryKey: ["cloud-targets", projectId] });
    },
    onError: (error) => {
      if (error instanceof SyntaxError) setFormError("The contract is not valid JSON.");
      else onError(error, "Could not register the private target");
    },
  });
  const check = useMutation({
    mutationFn: (targetId: string) => cloudTargetService.check(targetId),
    onSuccess: () => toast.success("Kubernetes connection and namespace access verified"),
    onError: (error) => onError(error, "Private cluster connection failed"),
  });

  async function uploadObserver(target: CloudTarget, file: File) {
    setUploading(target.id);
    try {
      if (file.size > 10000) throw new Error("Observer credential must be at most 10 KB.");
      await secretService.create(projectId, {
        environment: `cd:${target.id}`, key: "PRIVATE_OBSERVER_KUBECONFIG",
        value: await file.text(), description: `Read-only observer for ${target.name}`,
      });
      toast.success("Observer credential stored securely");
    } catch (error) { onError(error, "Could not store the observer credential"); }
    finally { setUploading(null); }
  }

  function changeProject(value: string) {
    setProjectId(value); setContract(""); setFormError(null);
    check.reset(); register.reset();
  }

  return <SectionCard title="Private cloud · k3s" description="Register an existing cluster prepared by your infrastructure team.">
    <div className="space-y-4">
      <div>
        <Label htmlFor="private-project">CNP project</Label>
        <Select value={projectId} onValueChange={changeProject} disabled={register.isPending || uploading !== null}>
          <SelectTrigger id="private-project"><SelectValue placeholder="Select a project" /></SelectTrigger>
          <SelectContent>{projects.data?.items.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
        </Select>
        {projects.isError && <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />}
      </div>
      {projectId && <>
        <div>
          <Label htmlFor="private-contract">cnp_cd_contract JSON</Label>
          <Textarea id="private-contract" value={contract} onChange={event => setContract(event.target.value)} rows={8} className="font-mono text-xs" placeholder="Paste the contract produced by the k3s setup" />
          <p className="mt-1 text-xs text-muted-foreground">The contract contains configuration only. Upload the read-only credential separately after registration.</p>
        </div>
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <Button disabled={!contract.trim() || register.isPending} onClick={() => register.mutate()} loading={register.isPending}>Register private target</Button>
        <p className="text-sm text-muted-foreground">After registration, authorize this target in <Link className="text-primary underline" to={`/projects/${projectId}/settings`}>project settings</Link> and enable human-reviewed operations.</p>
        {targets.isError && <ErrorState error={targets.error} onRetry={() => void targets.refetch()} />}
        {targets.data?.items.filter(target => target.provider === "private").map(target => <div key={target.id} className="space-y-3 rounded-lg border border-border p-4">
          <p className="font-medium">{target.name} · {target.environment}</p>
          <p className="break-all font-mono text-xs text-muted-foreground">{target.namespace}</p>
          <p className="break-all text-sm">{String(target.config.kubernetes_server)}</p>
          <div>
            <Label htmlFor={`observer-${target.id}`}>Read-only observer kubeconfig</Label>
            <Input id={`observer-${target.id}`} type="file" accept=".kubeconfig,.yaml,.yml,.json" disabled={uploading !== null} onChange={event => {
              const file = event.target.files?.[0]; event.target.value = "";
              if (file) void uploadObserver(target, file);
            }} />
            <p className="mt-1 text-xs text-muted-foreground">Use the observer file produced by the setup. Repeat after operator renewal; values are never displayed.</p>
          </div>
          <Button variant="outline" disabled={check.isPending || uploading !== null} onClick={() => check.mutate(target.id)}>Check Kubernetes connection</Button>
        </div>)}
      </>}
    </div>
  </SectionCard>;
}
