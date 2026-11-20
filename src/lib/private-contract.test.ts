import { describe, expect, it } from "vitest";
import { parsePrivateContract } from "./private-contract";

const projectId = "12345678-1234-1234-1234-123456789abc";
function contract() {
  return {
    cloud_target: { provider: "private", cluster_type: "k3s", namespace: `cnp-${projectId.replace(/-/g, "")}`,
      config: { kubernetes_server: "https://cluster.example.net:6443", runner_labels: ["self-hosted", "linux", "project-runner"] } },
    kubeconfig_strategy: { mode: "in_cluster" },
    deployment_defaults: { service_type: "ClusterIP" },
  };
}

describe("private target contract import", () => {
  it("accepts direct and wrapped outputs and preserves provider configuration", () => {
    const value = contract();
    expect(parsePrivateContract(JSON.stringify(value), projectId).cloud_target.config).toEqual(value.cloud_target.config);
    expect(parsePrivateContract(JSON.stringify({ cnp_cd_contract: value }), projectId)).toEqual(value);
  });

  it("rejects a namespace belonging to another project", () => {
    expect(() => parsePrivateContract(JSON.stringify(contract()), "aaaaaaaa-1234-1234-1234-123456789abc")).toThrow("namespace");
  });

  it("rejects embedded credentials without returning their value", () => {
    expect(() => parsePrivateContract(JSON.stringify({ ...contract(), secret_values: { PASSWORD: "never-display" } }), projectId)).toThrow("Upload the observer credential separately");
  });

  it("rejects another provider and non-JSON inputs", () => {
    const value = contract(); value.cloud_target.provider = "azure";
    expect(() => parsePrivateContract(JSON.stringify(value), projectId)).toThrow("private / k3s");
    expect(() => parsePrivateContract("not-json", projectId)).toThrow();
  });
});
