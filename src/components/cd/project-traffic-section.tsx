import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/common/error-state";
import { ApiError } from "@/lib/errors";
import { mcpService } from "@/services/mcp.service";
import { projectService } from "@/services/project.service";
import { secretService } from "@/services/secret.service";
import { useToastError } from "@/hooks/use-toast-error";
import type { TrafficConfiguration } from "@/types/traffic";

export function ProjectTrafficSection({ projectId, repositories, role }: {
  projectId: string; repositories: { id: string; full_name: string }[]; role?: string;
}) {
  return <SectionCard title="Routage multicloud" description="Une adresse commune pour l’application, avec un cloud préféré et un secours automatique.">
    {repositories.length === 0 ? <p className="text-sm text-muted-foreground">Ajoutez un dépôt pour configurer le routage.</p> : null}
    <div className="space-y-6">{repositories.map(repo => <TrafficApplication key={repo.id} projectId={projectId} repository={repo} role={role} />)}</div>
  </SectionCard>;
}

function TrafficApplication({ projectId, repository, role }: {
  projectId: string; repository: { id: string; full_name: string }; role?: string;
}) {
  const [configuring, setConfiguring] = useState(false);
  const navigate = useNavigate();
  const onError = useToastError();
  const query = useQuery({ queryKey: ["traffic", repository.id], queryFn: () => mcpService.traffic(repository.id), retry: false,
    refetchInterval: data => data.state.data?.configuration.pending_action_id ? 10000 : false });
  const switchCloud = useMutation({ mutationFn: (name: string) => mcpService.prepareTraffic(repository.id, name),
    onSuccess: action => navigate(`/mcp/reviews/${action.id}`), onError: e => onError(e, "La bascule n’a pas pu être préparée") });
  const reconcile = useMutation({ mutationFn: (id: string) => mcpService.reconcileTraffic(id),
    onSuccess: () => query.refetch(), onError: e => onError(e, "Le résultat reste incertain ; aucune nouvelle bascule n’a été envoyée") });
  const missing = query.error instanceof ApiError && query.error.code === "traffic_not_configured";
  const data = query.data;
  const pending = data?.configuration.pending_action_id;
  const canSwitch = role === "owner" || role === "maintainer";
  return <div className="space-y-4 rounded-lg border border-border p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">{repository.full_name}</h3>
      <div className="flex gap-2"><Button size="sm" variant="ghost" loading={query.isFetching} onClick={() => query.refetch()}><RefreshCw className="h-4 w-4" />Actualiser</Button>
        {role === "owner" && !pending ? <Button size="sm" variant="outline" onClick={() => setConfiguring(!configuring)}>Configurer le routage</Button> : null}</div>
    </div>
    {query.isPending ? <p>Lecture du routage…</p> : null}
    {missing ? <p className="text-sm text-muted-foreground">Aucun routage commun configuré. Reliez ici les deux déploiements à un profil Traffic Manager existant.</p> : null}
    {query.isError && !missing ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
    {configuring ? <TrafficConfigurationForm key={data?.configuration.version ?? "new"} projectId={projectId} repositoryId={repository.id} configuration={data?.configuration}
      saved={() => { setConfiguring(false); void query.refetch(); }} /> : null}
    {data?.state === "unavailable" ? <p role="alert" className="text-sm text-destructive">Routage indisponible ({data.error_code}). L’état actif n’est pas confirmé.</p> : null}
    {data?.state === "connected" ? <>
      <div className="rounded-md bg-surface p-3"><p className="text-xs text-muted-foreground">Adresse commune</p><a className="break-all text-primary underline" href={data.common_url} target="_blank" rel="noreferrer">{data.common_url}</a>
        <p className="mt-2 text-sm">Cloud préféré : {data.preferred} · Destination saine retenue par priorité : {data.effective ?? "aucune confirmée"}</p>
        <p className="mt-1 text-xs text-muted-foreground">TTL DNS : {data.ttl} s. Les connexions ouvertes et les caches peuvent conserver l’ancienne destination.</p>
        <p className="mt-1 text-xs">{data.dns?.state === "matches_destination" ? "Réponse DNS Cloudflare conforme à cette destination." : data.dns?.state === "different_answer" ? "La réponse DNS Cloudflare ne correspond pas encore à la destination attendue." : "Propagation DNS non vérifiée."} Cette observation ne couvre pas tous les clients.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{data.destinations?.map(d => <div key={d.name} className="space-y-2 rounded-md border border-border p-3">
        <p className="font-medium">{d.cloud.toUpperCase()} · {d.name}</p><p className="break-all text-xs text-muted-foreground">{d.target}</p>
        <p className="text-sm">Sonde Azure : {d.health} · Priorité {d.priority}</p>
        {canSwitch ? <Button size="sm" variant="outline" disabled={Boolean(pending) || d.name === data.preferred || d.health !== "Online" || switchCloud.isPending}
          onClick={() => switchCloud.mutate(d.name)}>{d.name === data.preferred ? "Cloud préféré" : `Basculer vers ${d.cloud.toUpperCase()}`}</Button> : null}
      </div>)}</div>
      <p className="text-xs text-muted-foreground">La bascule exige une confirmation humaine. CNP vérifie la version de l’application et les réplicas du secours. Les données des bases ne sont pas répliquées par ce routage.</p>
    </> : null}
    {pending ? <p className="text-sm">Une opération est en cours ou à rapprocher. <Link className="text-primary underline" to={`/mcp/reviews/${pending}`}>Examiner l’opération</Link></p> : null}
    {data?.history.length ? <div><h4 className="mb-2 text-sm font-medium">Historique des bascules</h4><ul className="space-y-2 text-sm">{data.history.map(a => <li key={a.id} className="flex flex-wrap items-center gap-3">
      <Link className="text-primary underline" to={`/mcp/reviews/${a.id}`}>{a.destination} · {a.status}</Link><span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
      {a.status === "succeeded" ? <span className="text-xs">Configuration confirmée par Azure ; consulter l’observation DNS ci-dessus.</span> : null}
      {a.status === "indeterminate" && canSwitch ? <Button size="sm" variant="outline" loading={reconcile.isPending} onClick={() => reconcile.mutate(a.id)}>Vérifier le résultat sans réessayer</Button> : null}
    </li>)}</ul></div> : null}
  </div>;
}

function TrafficConfigurationForm({ projectId, repositoryId, configuration, saved }: {
  projectId: string; repositoryId: string; configuration?: TrafficConfiguration; saved: () => void;
}) {
  const [profile, setProfile] = useState(configuration?.profile_id ?? "");
  const [secret, setSecret] = useState(configuration?.credential_secret_id ?? "");
  const [destinations, setDestinations] = useState(configuration?.destinations ?? [{ pipeline_id: "", endpoint_name: "" }, { pipeline_id: "", endpoint_name: "" }]);
  const deployments = useQuery({ queryKey: ["project", projectId, "deployments"], queryFn: () => projectService.deployments(projectId) });
  const secrets = useQuery({ queryKey: ["project", projectId, "secrets"], queryFn: () => secretService.list(projectId) });
  const onError = useToastError();
  const save = useMutation({ mutationFn: () => mcpService.configureTraffic(repositoryId, { profile_id: profile.trim(), credential_secret_id: secret, destinations }), onSuccess: saved,
    onError: e => onError(e, "La connexion au routage n’a pas pu être vérifiée") });
  const options = deployments.data?.items.filter(d => d.repository_id === repositoryId && d.latest_cd_pipeline_id) ?? [];
  function change(index: number, field: "pipeline_id" | "endpoint_name", value: string) {
    setDestinations(values => values.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }
  const prefix = `traffic-${repositoryId}`;
  return <form className="grid gap-3 rounded-lg bg-surface p-4" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
    <p className="text-sm">Connectez un profil existant en mode Priority, avec deux endpoints externes activés. Aucune infrastructure n’est créée.</p>
    <Label htmlFor={`${prefix}-profile`}>Identifiant Azure complet du profil Traffic Manager</Label>
    <Input id={`${prefix}-profile`} value={profile} onChange={e => setProfile(e.target.value)} placeholder="/subscriptions/…/resourceGroups/…/providers/Microsoft.Network/trafficManagerProfiles/…" required />
    <Label htmlFor={`${prefix}-secret`}>Secret de connexion Azure dans l’environnement cd</Label>
    <select className="h-10 rounded-md border border-border bg-surface px-3" id={`${prefix}-secret`} value={secret} onChange={e => setSecret(e.target.value)} required>
      <option value="">Choisir un secret</option>{secrets.data?.items.filter(s => s.environment === "cd").map(s => <option value={s.id} key={s.id}>{s.key}</option>)}
    </select>
    <p className="text-xs text-muted-foreground">La connexion utilise un secret JSON contenant tenant_id, client_id et client_secret, avec accès limité à ce profil. <Link className="text-primary underline" to={`/projects/${projectId}/secrets`}>Gérer les secrets</Link></p>
    {destinations.map((d, index) => <fieldset key={index} className="grid gap-2 rounded-md border border-border p-3"><legend>Destination {index + 1}</legend>
      <Label htmlFor={`${prefix}-pipeline-${index}`}>Déploiement AWS ou Azure</Label>
      <select className="h-10 rounded-md border border-border bg-surface px-3" id={`${prefix}-pipeline-${index}`} value={d.pipeline_id} onChange={e => change(index, "pipeline_id", e.target.value)} required>
        <option value="">Choisir un déploiement</option>{options.map(o => <option key={o.latest_cd_pipeline_id!} value={o.latest_cd_pipeline_id!}>{o.app_name} · {o.cloud_target_name}</option>)}
      </select>
      <Label htmlFor={`${prefix}-endpoint-${index}`}>Nom de l’endpoint dans Traffic Manager</Label>
      <Input id={`${prefix}-endpoint-${index}`} value={d.endpoint_name} onChange={e => change(index, "endpoint_name", e.target.value)} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}" required />
    </fieldset>)}
    {deployments.isError || secrets.isError ? <p role="alert">Impossible de charger les déploiements ou secrets du projet.</p> : null}
    <p className="text-xs text-muted-foreground">Les deux cibles doivent être autorisées dans la politique d’actions du projet et les écritures activées par l’administrateur. <Link className="text-primary underline" to={`/projects/${projectId}/settings`}>Paramètres du projet</Link></p>
    <Button type="submit" loading={save.isPending} disabled={!profile.trim() || !secret || destinations.some(d => !d.pipeline_id || !d.endpoint_name)}>Vérifier et enregistrer la connexion</Button>
  </form>;
}
