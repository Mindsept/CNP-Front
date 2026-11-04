import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudTargetDialog } from "./cloud-target-dialog";

const azureContract = {
  cloud_target: {
    name: "rabbitmq-aks", environment: "demo", provider: "azure", cluster_type: "aks",
    region: "polandcentral", cluster_name: "aks-rabbitmq", namespace: "cnp-apps",
    config: {
      tenant_id: "tenant", subscription_id: "subscription", resource_group: "rg-rabbitmq",
      cluster_id: "/subscriptions/subscription/resourceGroups/rg-rabbitmq/providers/Microsoft.ContainerService/managedClusters/aks-rabbitmq",
      mcp_enabled: true, mcp_use_oidc: true, mcp_observer_scoped: true,
      azure_client_id: "client", azure_tenant_id: "tenant", azure_subscription_id: "subscription",
      mcp_allowed_service_types: ["ClusterIP", "LoadBalancer"], mcp_kubectl_version: "v1.35.8",
      mcp_kubernetes_server: "https://aks.example.test:443",
    },
  },
  kubeconfig_strategy: { option_a_secret_name: "KUBECONFIG_CONTENT", option_b_secret_names: {} },
  deployment_defaults: { namespace: "cnp-apps", service_type: "LoadBalancer", manifest_paths: ["k8s/deployment.yaml"] },
};

function paste(value: unknown) {
  fireEvent.change(screen.getByPlaceholderText(/"cloud_target"/), { target: { value: JSON.stringify(value) } });
  fireEvent.click(screen.getByRole("button", { name: "Parse JSON" }));
}

afterEach(() => vi.restoreAllMocks());

describe("Cloud Node contract import", () => {
  it.each([false, true])("retains Azure OIDC/MCP configuration (wrapped=%s)", wrapped => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const submit = vi.fn();
    render(<CloudTargetDialog open onOpenChange={() => {}} onSubmit={submit} />);
    paste(wrapped ? { cnp_cd_contract: azureContract } : azureContract);
    fireEvent.click(screen.getByRole("button", { name: "Save cloud node" }));
    expect(submit).toHaveBeenCalledOnce();
    expect(submit.mock.calls[0][0].cloud_target).toEqual(azureContract.cloud_target);
    expect(submit.mock.calls[0][0].secret_values).toEqual({});
  });

  it("keeps imported configuration while applying an edited visible field", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const submit = vi.fn();
    render(<CloudTargetDialog open onOpenChange={() => {}} onSubmit={submit} />);
    paste(azureContract);
    fireEvent.change(screen.getByLabelText(/Name \(k8s-name pattern\)/), { target: { value: "renamed-aks" } });
    fireEvent.click(screen.getByRole("button", { name: "Save cloud node" }));
    expect(submit.mock.calls[0][0].cloud_target).toEqual({ ...azureContract.cloud_target, name: "renamed-aks" });
  });

  it("does not carry AWS configuration into a subsequent Azure import", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const submit = vi.fn();
    render(<CloudTargetDialog open onOpenChange={() => {}} onSubmit={submit} />);
    paste({ cloud_target: { ...azureContract.cloud_target, provider: "aws", cluster_type: "eks",
      config: { account_id: "123456789012", cd_role_arn: "arn:aws:iam::123456789012:role/cd", runner_labels: ["self-hosted"] } } });
    paste(azureContract);
    fireEvent.click(screen.getByRole("button", { name: "Save cloud node" }));
    expect(submit.mock.calls[0][0].cloud_target.config).toEqual(azureContract.cloud_target.config);
    expect(submit.mock.calls[0][0].cloud_target.config).not.toHaveProperty("account_id");
  });
});
