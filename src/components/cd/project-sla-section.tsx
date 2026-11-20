import { useQuery } from "@tanstack/react-query";
import { SectionCard } from "@/components/common/section-card";
import { projectSla } from "@/lib/project-sla";
import { cloudTargetService } from "@/services/cloud-target.service";
import { projectService } from "@/services/project.service";

const formatPercent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percentLabel = (percent: number) => formatPercent.format(percent / 100);
const providerNames = { aws: "AWS", azure: "Azure", gcp: "Google Cloud", private: "Cloud privé" };

export function ProjectSlaSection({ projectId }: { projectId: string }) {
  const deployments = useQuery({
    queryKey: ["project", projectId, "deployments"],
    queryFn: () => projectService.deployments(projectId),
  });
  const targets = useQuery({
    queryKey: ["project", projectId, "cloud-targets"],
    queryFn: () => cloudTargetService.list(projectId),
  });

  const { rows, kind, percent } = projectSla(
    deployments.data?.items.flatMap((item) => item.cloud_target_id ? [item.cloud_target_id] : []) ?? [],
    targets.data?.items ?? [],
  );
  const summary = percent !== null ? percentLabel(percent)
    : kind === "empty" ? "Aucune cible de déploiement"
    : kind === "not-covered" ? "Une cible est sans SLA contractuel"
    : "SLA non déterminé";

  return (
    <SectionCard
      title="SLA du projet"
      description="Minimum des SLA des plans de contrôle Kubernetes des cibles de déploiement. Cet indicateur ne mesure pas la disponibilité de l’application."
    >
      {deployments.isError || targets.isError ? (
        <p role="alert" className="text-sm text-muted-foreground">Impossible de charger les cibles du projet.</p>
      ) : deployments.isPending || targets.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">Chargement du SLA…</p>
      ) : (
        <>
          <p className="text-2xl font-semibold tabular-nums">{summary}</p>
          {rows.length > 0 && <ul className="mt-3 divide-y divide-border/60">
            {rows.map(({ id, target, sla, source }) => (
              <li key={id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm">
                <span>{target ? `${providerNames[target.provider]} · ${target.name} · ${target.region}` : "Cible indisponible"}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  {sla.kind === "covered" ? percentLabel(sla.percent) : sla.kind === "not-covered" ? "Sans SLA contractuel" : "Configuration non renseignée"}
                  {source && <a href={source} target="_blank" rel="noreferrer" className="text-primary underline">Conditions</a>}
                </span>
              </li>
            ))}
          </ul>}
        </>
      )}
    </SectionCard>
  );
}
