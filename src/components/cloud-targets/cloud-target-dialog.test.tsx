import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CloudTargetDialog } from "./cloud-target-dialog";

describe("AWS contract import", () => {
  it("preserves the automatic deployment access when saving the imported contract", () => {
    const onSubmit = vi.fn();
    const config = {
      account_id: "123456789012",
      cd_role_arn: "arn:aws:iam::123456789012:role/cnp-aws-dev-cd",
      status_role_arn: "arn:aws:iam::123456789012:role/cnp-aws-dev-status",
      runner_mode: "github-hosted-ssm",
      runner_labels: ["ubuntu-latest"],
      ssm_instance_id: "i-0123456789abcdef0",
      ssm_document_name: "cnp-aws-dev-eks-api",
      dbaas_subnet_ids: ["subnet-123"],
    };
    render(<CloudTargetDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/cloud_target/), {
      target: { value: JSON.stringify({
        cloud_target: {
          name: "cnp-aws-dev", environment: "dev", provider: "aws", cluster_type: "eks",
          region: "eu-west-3", cluster_name: "cnp-aws-dev", namespace: "cnp-apps", config,
        },
        kubeconfig_strategy: { option_b_secret_names: {} },
        deployment_defaults: { namespace: "cnp-apps" },
      }) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Parse JSON" }));
    expect(screen.getByDisplayValue("GitHub Actions (automatic)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Runner labels (comma separated)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save cloud node" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      cloud_target: expect.objectContaining({ config: expect.objectContaining(config) }),
      secret_values: {},
    }));
  });
});
