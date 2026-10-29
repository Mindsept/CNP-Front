import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, RefreshCw, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectService } from "@/services/project.service";
import { cloudTargetService } from "@/services/cloud-target.service";
import { dbaasService, type AwsDatabaseJob } from "@/services/dbaas.service";

const classes = ["db.t3.micro", "db.t3.small", "db.t3.medium", "db.t4g.micro", "db.t4g.small", "db.t4g.medium"];
const postgresVersions = ["17.11", "16.11", "15.15"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

function jobLabel(job: AwsDatabaseJob) {
  if (job.status === "queued") return "En attente";
  if (job.status === "running") return job.operation === "delete" ? "Suppression en cours" : "Création en cours";
  if (job.status === "failed") return "Échec";
  return job.operation === "delete" ? "Base supprimée" : "Création terminée";
}

export function AwsEnvironmentPage({ embedded = false }: { embedded?: boolean }) {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [createDatabase, setCreateDatabase] = useState(false);
  const [databaseName, setDatabaseName] = useState("appdb");
  const [postgresVersion, setPostgresVersion] = useState("17.11");
  const [dbClass, setDbClass] = useState("db.t3.micro");
  const [dbStorage, setDbStorage] = useState(20);
  const [dbMaxStorage, setDbMaxStorage] = useState(100);
  const [dbMultiAz, setDbMultiAz] = useState(false);
  const [dbBackupDays, setDbBackupDays] = useState(7);

  const projectQuery = useQuery({ queryKey: ["project", id], queryFn: () => projectService.get(id) });
  const targetsQuery = useQuery({ queryKey: ["project", id, "cloud-targets"], queryFn: () => cloudTargetService.list(id) });
  const jobsQuery = useQuery({
    queryKey: ["project", id, "aws-databases"], queryFn: () => dbaasService.awsDatabases(id),
    refetchInterval: (query) => query.state.data?.items.some((job) => job.status === "queued" || job.status === "running") ? 4000 : false,
  });
  const targets = useMemo(() => (targetsQuery.data?.items ?? []).filter((target) => target.provider === "aws" && target.cluster_type === "eks"), [targetsQuery.data]);
  const selectedTarget = targets.find((target) => target.id === targetId) ?? targets[0];
  useEffect(() => { if (!targetId && targets[0]) setTargetId(targets[0].id); }, [targetId, targets]);
  const jobs = jobsQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: () => dbaasService.createAwsDatabase(id, {
      request_id: crypto.randomUUID(), target_id: selectedTarget!.id,
      database_name: databaseName.trim(), postgres_version: postgresVersion, db_instance_class: dbClass,
      db_storage_gib: Number(dbStorage), db_max_storage_gib: Number(dbMaxStorage), db_multi_az: dbMultiAz,
      backup_retention_days: Number(dbBackupDays),
    }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["project", id, "aws-databases"] }),
  });
  const retryMutation = useMutation({
    mutationFn: (jobId: string) => dbaasService.retryAwsDatabase(id, jobId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["project", id, "aws-databases"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => dbaasService.deleteAwsDatabase(id, jobId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["project", id, "aws-databases"] }),
  });
  const reconcileMutation = useMutation({
    mutationFn: (jobId: string) => dbaasService.reconcileAwsDatabase(id, jobId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["project", id, "aws-databases"] }),
  });
  const valid = Boolean(selectedTarget && createDatabase && /^[A-Za-z][A-Za-z0-9]{0,62}$/.test(databaseName.trim())
    && dbStorage >= 20 && dbMaxStorage >= Math.ceil(dbStorage * 1.1) && dbBackupDays >= 1 && dbBackupDays <= 35);
  const busy = jobs.some((job) => job.status === "queued" || job.status === "running") || createMutation.isPending;

  return <div className="space-y-6">
    {!embedded ? <PageHeader eyebrow={projectQuery.data ? `/${projectQuery.data.slug} · Base de données` : "Base de données"}
      back={{ to: `/projects/${id}`, label: "Projet" }} title="Ajouter une base PostgreSQL"
      description="Choisissez une cible EKS déjà configurée et, si nécessaire, demandez une base Amazon RDS PostgreSQL. Le cluster n’est pas recréé." /> : null}

    <Card className="space-y-6 p-6">
      <section className="space-y-4">
        <div><h2 className="font-semibold">Cible d’infrastructure existante</h2><p className="mt-1 text-sm text-muted-foreground">CNP utilise le contrat EKS pour le compte AWS et le réseau privé du cluster.</p></div>
        {targets.length > 0 ? <Field label="Cluster Amazon EKS">
          <Select value={selectedTarget?.id} onValueChange={setTargetId}><SelectTrigger><SelectValue placeholder="Choisir une cible EKS" /></SelectTrigger><SelectContent>
            {targets.map((target) => <SelectItem key={target.id} value={target.id}>{target.name} · {target.region} · {target.cluster_name}</SelectItem>)}
          </SelectContent></Select>
        </Field> : <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">Aucune cible EKS n’est encore associée à ce projet. Provisionnez ou raccordez son infrastructure avant de demander RDS.</p>}
        {selectedTarget ? <p className="text-sm text-muted-foreground">Région RDS : <span className="font-medium text-foreground">{selectedTarget.region}</span> (identique à EKS pour rester dans le même réseau privé).</p> : null}
      </section>

      <section className="space-y-4 border-t border-border/60 pt-5">
        <div className="flex items-start gap-3">
          <Checkbox id="create-rds" checked={createDatabase} onCheckedChange={(checked) => setCreateDatabase(checked === true)} />
          <div><Label htmlFor="create-rds" className="cursor-pointer">Créer une base Amazon RDS PostgreSQL</Label>
            <p className="mt-1 text-sm text-muted-foreground">Laissez décoché si le projet n’a pas besoin d’une base dédiée.</p></div>
        </div>
        {createDatabase ? <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de la base PostgreSQL"><Input value={databaseName} onChange={(e) => setDatabaseName(e.target.value)} placeholder="appdb" /></Field>
          <Field label="Version PostgreSQL"><Select value={postgresVersion} onValueChange={setPostgresVersion}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{postgresVersions.map((version) => <SelectItem key={version} value={version}>{version}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Classe RDS"><Select value={dbClass} onValueChange={setDbClass}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{classes.map((instanceClass) => <SelectItem key={instanceClass} value={instanceClass}>{instanceClass}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Stockage initial (Gio)" hint="20 Gio minimum."><Input type="number" min={20} max={65536} value={dbStorage} onChange={(e) => setDbStorage(Number(e.target.value))} /></Field>
          <Field label="Plafond de stockage automatique (Gio)" hint="Au moins 10 % au-dessus du stockage initial pour activer l’auto-scaling RDS."><Input type="number" min={Math.ceil(dbStorage * 1.1)} max={65536} value={dbMaxStorage} onChange={(e) => setDbMaxStorage(Number(e.target.value))} /></Field>
          <Field label="Rétention des sauvegardes (jours)"><Input type="number" min={1} max={35} value={dbBackupDays} onChange={(e) => setDbBackupDays(Number(e.target.value))} /></Field>
          <div className="flex items-start gap-3 sm:col-span-2"><Checkbox id="rds-multi-az" checked={dbMultiAz} onCheckedChange={(checked) => setDbMultiAz(checked === true)} /><div><Label htmlFor="rds-multi-az" className="cursor-pointer">Activer Multi-AZ</Label><p className="mt-1 text-sm text-muted-foreground">Disponibilité accrue, coût RDS plus élevé.</p></div></div>
        </div> : null}
      </section>

      {createMutation.isError ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{(createMutation.error as Error).message}</p> : null}
      <Button disabled={!valid || busy || !targets.length} onClick={() => createMutation.mutate()}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Demande en cours</> : "Lancer la création de la base"}</Button>
    </Card>

    <Card className="border-amber-500/30 bg-amber-500/5 p-5"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" /><div><h3 className="font-medium">Une base RDS entraîne des coûts AWS</h3><p className="mt-2 text-sm text-muted-foreground">La base sera privée et limitée au groupe de sécurité EKS indiqué par le contrat. Supprimez-la après vos essais si elle n’est plus nécessaire.</p></div></div></Card>

    {jobs.map((job) => <Card key={job.id} className="p-5">
        <div className="flex items-center gap-3">{job.status === "succeeded" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : job.status === "failed" ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        <div><p className="font-medium">{jobLabel(job)}</p><p className="text-sm text-muted-foreground">{job.target_name} · PostgreSQL {job.region} · {job.database_name}</p></div><Badge className="ml-auto" variant={job.status === "succeeded" ? "success" : job.status === "failed" ? "danger" : "muted"}>{job.status}</Badge></div>
      {job.error ? <p className="mt-3 text-sm text-destructive">{job.error}</p> : null}
      {job.result?.database?.endpoint ? <p className="mt-2 break-all text-sm">Endpoint enregistré : {job.result.database.endpoint}:{job.result.database.port} · secret CD : <code>{job.result.database.secret_key ?? "DATABASE_URL"}</code>.</p> : null}
      {job.result?.deleted_outside_app ? <p className="mt-2 text-sm text-muted-foreground">Suppression vérifiée dans AWS ; historique synchronisé.</p> : null}
      {job.status === "failed" ? <Button className="mt-3" size="sm" variant="outline" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate(job.id)}>Reprendre</Button> : null}
      {job.operation === "create" && job.status === "succeeded" ? <Button className="mt-3" size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm("Supprimer cette base RDS ? Une sauvegarde finale sera conservée.")) deleteMutation.mutate(job.id); }}><Trash2 className="mr-2 h-4 w-4" />Supprimer RDS</Button> : null}
      {job.operation === "create" && job.status === "succeeded" ? <Button className="mt-3 ml-2" size="sm" variant="outline" disabled={reconcileMutation.isPending} onClick={() => { if (window.confirm("Vérifier dans AWS que cette instance RDS a été supprimée manuellement, puis synchroniser l’historique ?")) reconcileMutation.mutate(job.id); }}><RefreshCw className="mr-2 h-4 w-4" />Vérifier la suppression dans AWS</Button> : null}
    </Card>)}
    {!embedded ? <Button variant="ghost" asChild><Link to={`/projects/${id}`}><ArrowLeft className="mr-2 h-4 w-4" />Retour au projet</Link></Button> : null}
  </div>;
}
