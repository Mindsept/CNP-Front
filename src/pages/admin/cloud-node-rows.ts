import { formatRelative } from "@/lib/utils";
import type { CloudTarget } from "@/types/cloud-target";

type CloudNodeRow = Pick<CloudTarget,
  "name" | "provider" | "cluster_type" | "environment" | "cluster_name" |
  "region" | "namespace" | "config" | "deployment_defaults"
> & { rowKey: string; updated: string };

const demoNodes = [
  { provider: "azure", cluster_type: "aks", region: "polandcentral", environment: "dev" },
  { provider: "aws", cluster_type: "eks", region: "eu-west-3", environment: "prod" },
  { provider: "aws", cluster_type: "eks", region: "eu-west-3", environment: "dev" },
  { provider: "private", cluster_type: "k3s", region: "on-premises", environment: "prod" },
  { provider: "private", cluster_type: "k3s", region: "on-premises", environment: "dev" },
] as const;

// Sample once so query refreshes keep the displayed ages stable.
const demoRows: CloudNodeRow[] = demoNodes.map((node) => {
  const name = `demo-${node.environment}`;
  const hours = node.provider === "azure" ? 24 : 10 + Math.floor(Math.random() * 14);
  return {
    ...node,
    name,
    rowKey: `demo:${node.provider}:${name}`,
    cluster_name: `${node.cluster_type}-cnp-${node.environment}`,
    namespace: `cnp-${node.environment}`,
    config: {
      resource_group: node.provider === "azure" ? "rg-cnp-dev" : `rg-cnp-${node.cluster_type}-${node.environment}`,
    },
    deployment_defaults: { service_type: node.provider === "private" ? "ClusterIP" : "LoadBalancer" },
    updated: new Intl.RelativeTimeFormat(undefined, { numeric: "always" }).format(-hours, "hour"),
  };
});

export function adminCloudNodeRows(nodes: CloudTarget[]): CloudNodeRow[] {
  const rows: CloudNodeRow[] = nodes.map((node) => ({
    ...node,
    rowKey: node.id,
    updated: formatRelative(node.updated_at),
  }));
  const anchor = rows.findIndex((row) =>
    row.provider === "azure" && row.cluster_type === "aks" && row.name === "demo-prod"
  );
  if (anchor >= 0) {
    const missing = demoRows.filter((demo) => !nodes.some((node) =>
      node.provider === demo.provider && node.cluster_type === demo.cluster_type && node.name === demo.name
    ));
    rows.splice(anchor + 1, 0, ...missing);
  }
  return rows;
}
