import { Link } from "react-router-dom";
import { SectionCard } from "@/components/common/section-card";
import type { Action } from "@/types/mcp";

export function TrafficReviewDetails({ action }: { action: Action }) {
  if (action.type !== "traffic_switch") return null;
  const s = action.snapshot;
  return <SectionCard title="Confirmer la bascule multicloud" description="Cette opération change le cloud préféré pour les nouvelles réponses DNS.">
    <dl className="grid gap-2 text-sm"><dt>Adresse commune</dt><dd className="break-all">{String(s.common_url)}</dd>
      <dt>Nouvelle destination préférée</dt><dd className="font-medium">{String(s.destination)}</dd>
      <dt>TTL DNS</dt><dd>{String(s.ttl)} secondes</dd></dl>
    <p className="mt-3 text-sm text-muted-foreground">Le second cloud reste disponible comme secours automatique. Les caches DNS et connexions existantes peuvent conserver l’ancien cloud. Cette action ne réplique pas les bases de données.</p>
    {action.status === "succeeded" ? <p className="mt-3 text-sm">La configuration a été relue et confirmée par Azure. Consultez le projet pour vérifier la réponse DNS ; le succès de cette action ne confirme pas tous les caches clients.</p> : null}
    {action.status === "indeterminate" ? <p role="alert" className="mt-3">Le résultat est incertain. Depuis le projet, utilisez « Vérifier le résultat sans réessayer ». Aucune seconde modification ne sera envoyée.</p> : null}
    {typeof s.project_id === "string" ? <Link className="mt-3 inline-block text-primary underline" to={`/projects/${s.project_id}`}>Retour au routage du projet</Link> : null}
  </SectionCard>;
}
