import type { CloudTarget } from "@/types/cloud-target";

const sources: Partial<Record<CloudTarget["provider"], string>> = {
  aws: "https://aws.amazon.com/eks/sla/",
  azure: "https://learn.microsoft.com/en-us/azure/aks/free-standard-pricing-tiers",
  gcp: "https://cloud.google.com/kubernetes-engine/sla",
};

export type ClusterSla =
  | { kind: "covered"; percent: number }
  | { kind: "not-covered" }
  | { kind: "unknown" };

export function clusterSla({ provider, cluster_type, region, config }: CloudTarget): ClusterSla {
  if (provider === "aws" && cluster_type === "eks") {
    return { kind: "covered", percent: config.control_plane_mode === "provisioned" ? 99.99 : 99.95 };
  }
  if (provider === "azure" && cluster_type === "aks") {
    const tier = typeof config.sku_tier === "string" ? config.sku_tier.toLowerCase() : undefined;
    if (tier === "free") return { kind: "not-covered" };
    if ((tier === "standard" || tier === "premium") && typeof config.control_plane_zonal === "boolean") {
      return { kind: "covered", percent: config.control_plane_zonal ? 99.95 : 99.9 };
    }
  }
  if (provider === "gcp" && cluster_type === "gke") {
    if (config.cluster_topology === "zonal") return { kind: "covered", percent: 99.5 };
    if (config.cluster_topology === "regional" || config.cluster_topology === "autopilot") {
      return { kind: "covered", percent: region.toLowerCase() === "europe-north2" ? 99.9 : 99.95 };
    }
  }
  return { kind: "unknown" };
}

export function projectSla(targetIds: Iterable<string>, targets: CloudTarget[]) {
  const byId = new Map(targets.map((target) => [target.id, target]));
  const rows = [...new Set(targetIds)].flatMap((id) => {
    const target = byId.get(id);
    if (target?.config.lifecycle === "deleted") return [];
    const sla: ClusterSla = target ? clusterSla(target) : { kind: "unknown" };
    return [{ id, target, sla, source: target ? sources[target.provider] : undefined }];
  });
  const rates = rows.flatMap(({ sla }) => sla.kind === "covered" ? [sla.percent] : []);
  const kind = rows.length === 0 ? "empty"
    : rows.some(({ sla }) => sla.kind === "not-covered") ? "not-covered"
    : rates.length < rows.length ? "unknown"
    : "covered";
  return { rows, kind, percent: kind === "covered" ? Math.min(...rates) : null };
}
