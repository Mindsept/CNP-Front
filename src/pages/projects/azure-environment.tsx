import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cloudTargetService } from "@/services/cloud-target.service";
import { dbaasService, type AzureDatabaseJob } from "@/services/dbaas.service";
import { projectService } from "@/services/project.service";

const skus = ["B_Standard_B1ms", "B_Standard_B2s", "GP_Standard_D2s_v3"];
const versions = ["17", "16", "15", "14"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function jobLabel(job: AzureDatabaseJob) {
  if (job.status === "queued") return "En attente";
  if (job.status === "running") return job.operation === "delete" ? "Suppression en cours" : "Création en cours";
  if (job.status === "failed") return "Échec";
  return job.operation === "delete" ? "Base supprimée" : "Base disponible";
}

export function AzureEnvironmentPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [databaseName, setDatabaseName] = useState("appdb");
  const [postgresVersion, setPostgresVersion] = useState("17");
  const [skuName, setSkuName] = useState("B_Standard_B1ms");
  const [storageGib, setStorageGib] = useState(32);
  const [backupDays, setBackupDays] = useState(7);

  const projectQuery = useQuery({ queryKey: ["project", id], queryFn: () => projectService.get(id) });
  const targetsQuery = useQuery({ queryKey: ["project", id, "cloud-targets"], queryFn: () => cloudTargetService.list(id) });
  const jobsQuery = useQuery({
    queryKey: ["project", id, "azure-databases"], queryFn: () => dbaasService.azureDatabases(id),
    refetchInterval: (query) => query.state.data?.items.some((job) => job.status === "queued" || job.status === "running") ? 4000 : false,
  });
  const targets = useMemo(() => (targetsQuery.data?.items ?? []).filter((target) => target.provider === "azure" && target.cluster_type === "aks"), [targetsQuery.data]);
  const selectedTarget = targets.find((target) => target.id === targetId) ?? targets[0];
  useEffect(() => { if (!targetId && targets[0]) setTargetId(targets[0].id); }, [targetId, targets]);
  const jobs = jobsQuery.data?.items ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["project", id, "azure-databases"] });

  const createMutation = useMutation({
    mutationFn: () => dbaasService.createAzureDatabase(id, {
      request_id: crypto.randomUUID(), target_id: selectedTarget!.id, database_name: databaseName.trim(),
      postgres_version: postgresVersion, sku_name: skuName, storage_gib: Number(storageGib),
      backup_retention_days: Number(backupDays),
    }),
    onSuccess: invalidate,
  });
  const retryMutation = useMutation({ mutationFn: (jobId: string) => dbaasService.retryAzureDatabase(id, jobId), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: (jobId: string) => dbaasService.deleteAzureDatabase(id, jobId), onSuccess: invalidate });
  const valid = Boolean(selectedTarget && /^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(databaseName.trim()) && storageGib >= 32 && backupDays >= 7 && backupDays <= 35);
  const creating = jobs.some((job) => job.status === "queued" || job.status === "running") || createMutation.isPending;

  return <div className="space-y-6">
    <PageHeader eyebrow={projectQuery.data ? `/${projectQuery.data.slug} · Base de données Azure` : "Base de données Azure"}
      back={{ to: `/projects/${id}`, label: "Projet" }} title="Bases PostgreSQL Azure"
      description="Créez des serveurs Azure Database for PostgreSQL Flexible Server pour une cible AKS existante. AWS continue d’utiliser Amazon RDS." />

    <Card className="space-y-6 p-6">
      <section className="space-y-4">
        <div><h2 className="font-semibold">Cible AKS existante</h2><p className="mt-1 text-sm text-muted-foreground">La base et le cluster restent dans le même abonnement et groupe de ressources Azure.</p></div>
        {targets.length ? <Field label="Cluster Azure AKS">
          <Select value={selectedTarget?.id} onValueChange={setTargetId}><SelectTrigger><SelectValue placeholder="Choisir une cible AKS" /></SelectTrigger><SelectContent>
            {targets.map((target) => <SelectItem key={target.id} value={target.id}>{target.name} · {target.region} · {target.cluster_name}</SelectItem>)}
          </SelectContent></Select>
        </Field> : <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">Aucune cible Azure AKS n’est associée à ce projet. Ajoutez ou provisionnez d’abord le Cloud Node Azure.</p>}
        {selectedTarget ? <p className="text-sm text-muted-foreground">Service : <span className="font-medium text-foreground">Azure Database for PostgreSQL Flexible Server</span> · région {selectedTarget.region}.</p> : null}
      </section>

      <section className="space-y-4 border-t border-border/60 pt-5">
        <h2 className="font-semibold">Nouvelle base Azure</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de la base PostgreSQL"><Input value={databaseName} onChange={(event) => setDatabaseName(event.target.value)} placeholder="appdb" /></Field>
          <Field label="Version PostgreSQL"><Select value={postgresVersion} onValueChange={setPostgresVersion}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{versions.map((version) => <SelectItem key={version} value={version}>{version}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Taille Azure"><Select value={skuName} onValueChange={setSkuName}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{skus.map((sku) => <SelectItem key={sku} value={sku}>{sku}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Stockage (Gio, minimum 32)"><Input type="number" min={32} max={16384} value={storageGib} onChange={(event) => setStorageGib(Number(event.target.value))} /></Field>
          <Field label="Rétention des sauvegardes (jours)"><Input type="number" min={7} max={35} value={backupDays} onChange={(event) => setBackupDays(Number(event.target.value))} /></Field>
        </div>
      </section>

      {createMutation.isError ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{(createMutation.error as Error).message}</p> : null}
      <Button disabled={!valid || creating || !targets.length} onClick={() => createMutation.mutate()}>{creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création en cours</> : "Créer le serveur PostgreSQL Azure"}</Button>
    </Card>

    <Card className="border-amber-500/30 bg-amber-500/5 p-5"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" /><div><h3 className="font-medium">Ce serveur Azure entraîne des coûts</h3><p className="mt-2 text-sm text-muted-foreground">Chaque demande crée son propre Flexible Server. L’accès réseau public est limité aux IP de sortie AKS détectées dans Azure. Supprimez les serveurs de démonstration après usage.</p></div></div></Card>

    {jobs.map((job) => <Card key={job.id} className="p-5">
      <div className="flex items-center gap-3">{job.status === "succeeded" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : job.status === "failed" ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        <div><p className="font-medium">{jobLabel(job)}</p><p className="text-sm text-muted-foreground">{job.target_name} · PostgreSQL {job.region} · {job.database_name}</p></div><Badge className="ml-auto" variant={job.status === "succeeded" ? "success" : job.status === "failed" ? "danger" : "muted"}>{job.status}</Badge></div>
      {job.error ? <p className="mt-3 text-sm text-destructive">{job.error}</p> : null}
      {job.result?.database?.endpoint ? <p className="mt-2 break-all text-sm">Endpoint : {job.result.database.endpoint}:5432 · secret CD : <code>{job.result.database.secret_key}</code>.</p> : null}
      {job.status === "failed" ? <Button className="mt-3" size="sm" variant="outline" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate(job.id)}>Reprendre</Button> : null}
      {job.operation === "create" && job.status === "succeeded" ? <Button className="mt-3" size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm("Supprimer ce serveur PostgreSQL Azure et sa base ?")) deleteMutation.mutate(job.id); }}><Trash2 className="mr-2 h-4 w-4" />Supprimer le serveur</Button> : null}
    </Card>)}
    <Button variant="ghost" asChild><Link to={`/projects/${id}`}><ArrowLeft className="mr-2 h-4 w-4" />Retour au projet</Link></Button>
  </div>;
}
