import { describe, expect, it } from "vitest";
import { formatRelative } from "@/lib/utils";
import type { CloudTarget } from "@/types/cloud-target";
import { adminCloudNodeRows } from "./cloud-node-rows";

const aks: CloudTarget = {
  id: "registered-aks", name: "demo-prod", provider: "azure", cluster_type: "aks",
  region: "polandcentral", environment: "demo", cluster_name: "aks-cnp-demo", namespace: "cnp-demo",
  project_id: null, config: {}, deployment_defaults: {}, kubeconfig_strategy: {},
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

describe("admin cloud node list", () => {
  it("adds five display rows below the registered AKS without modifying the inventory", () => {
    const input = [aks];
    const rows = adminCloudNodeRows(input);
    expect(input).toEqual([aks]);
    expect(rows.map(({ provider, name }) => [provider, name])).toEqual([
      ["azure", "demo-prod"], ["azure", "demo-dev"], ["aws", "demo-prod"],
      ["aws", "demo-dev"], ["private", "demo-prod"], ["private", "demo-dev"],
    ]);
    expect(rows[0].updated).toBe(formatRelative(aks.updated_at));
    const time = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });
    expect(rows[1].updated).toBe(time.format(-24, "hour"));
    const ages = Array.from({ length: 14 }, (_, offset) => time.format(-10 - offset, "hour"));
    for (const row of rows.slice(2)) expect(ages).toContain(row.updated);
    expect(adminCloudNodeRows(input)).toEqual(rows);
  });

  it("keeps real targets and the empty state", () => {
    const eks: CloudTarget = { ...aks, id: "registered-eks", provider: "aws", cluster_type: "eks" };
    expect(adminCloudNodeRows([])).toEqual([]);
    expect(adminCloudNodeRows([eks])).toHaveLength(1);
    const rows = adminCloudNodeRows([aks, eks]);
    expect(rows.filter((row) => row.provider === "aws" && row.name === "demo-prod"))
      .toMatchObject([{ rowKey: eks.id, updated: formatRelative(eks.updated_at) }]);
  });
});
