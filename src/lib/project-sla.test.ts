import { describe, expect, it } from "vitest";
import { projectSla } from "./project-sla";
import type { CloudTarget } from "@/types/cloud-target";

function target(id: string, provider: CloudTarget["provider"], config: CloudTarget["config"] = {}): CloudTarget {
  return {
    id, name: id, provider, config,
    cluster_type: { aws: "eks", azure: "aks", gcp: "gke" }[provider] as CloudTarget["cluster_type"],
    region: "eu-west-3", cluster_name: id, namespace: "apps", environment: "dev",
    project_id: null, kubeconfig_strategy: {}, deployment_defaults: {}, created_at: "", updated_at: "",
  };
}

describe("project SLA", () => {
  const eks = target("eks", "aws");
  const aks = target("aks", "azure", { sku_tier: "Standard", control_plane_zonal: false });

  it("uses the minimum of distinct deployment targets and ignores unused global nodes", () => {
    const result = projectSla(["eks", "aks", "eks"], [eks, aks, target("unused", "azure", { sku_tier: "Free" })]);
    expect(result.percent).toBe(99.9);
    expect(result.rows).toHaveLength(2);
  });

  it("does not show a numeric SLA when a deployment uses AKS Free", () => {
    expect(projectSla(["eks", "free"], [eks, target("free", "azure", { sku_tier: "Free" })]))
      .toMatchObject({ kind: "not-covered", percent: null });
  });

  it("does not silently omit a target with incomplete metadata or missing data", () => {
    expect(projectSla(["eks", "aks"], [eks, target("aks", "azure", { sku_tier: "Premium" })]))
      .toMatchObject({ kind: "unknown", percent: null });
    expect(projectSla(["eks", "missing"], [eks])).toMatchObject({ kind: "unknown", percent: null });
  });

  it("excludes decommissioned targets and handles an empty project", () => {
    const deleted = target("aks", "azure", { lifecycle: "deleted" });
    expect(projectSla(["eks", "aks"], [eks, deleted]).percent).toBe(99.95);
    expect(projectSla(["aks"], [deleted])).toMatchObject({ kind: "empty", percent: null });
  });
});
