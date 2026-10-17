import { useEffect, useState } from "react";
import { Cloud, FileJson, Lock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  CloudProvider,
  CreateCloudTargetInput,
  DeploymentDefaults,
  KubeconfigStrategy,
} from "@/types/cloud-target";

interface CloudTargetDialogProps {
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateCloudTargetInput) => void;
}

const AZURE_SECRET_KEYS = [
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_TENANT_ID",
  "AZURE_SUBSCRIPTION_ID",
] as const;

const SENSITIVE_SECRET_KEYS = new Set<string>([
  "AZURE_CLIENT_SECRET",
  "KUBECONFIG_CONTENT",
  "GHCR_TOKEN",
]);

const initialForm = {
  name: "demo-aks",
  environment: "demo",
  region: "polandcentral",
  cluster_name: "aks-cnp-demo",
  namespace: "cnp-demo",
  tenant_id: "",
  subscription_id: "",
  resource_group: "rg-cnp-demo",
  account_id: "",
  cluster_arn: "",
  cd_role_arn: "",
  status_role_arn: "",
  dbaas_role_arn: "",
  runner_labels: "self-hosted,linux,x64,cnp-aws-demo",
};

const defaultKubeStrategy: KubeconfigStrategy = {
  option_a_secret_name: "KUBECONFIG_CONTENT",
  option_b_secret_names: {
    azure_client_id: "AZURE_CLIENT_ID",
    azure_client_secret: "AZURE_CLIENT_SECRET",
    azure_tenant_id: "AZURE_TENANT_ID",
    azure_subscription_id: "AZURE_SUBSCRIPTION_ID",
  },
  get_credentials_command: "",
};

const defaultDeployment: DeploymentDefaults = {
  namespace: "cnp-demo",
  service_type: "LoadBalancer",
  public_url_format: "http://<external-load-balancer-ip>",
  manifest_paths: [
    "k8s/namespace.yaml",
    "k8s/secret.yaml",
    "k8s/deployment.yaml",
    "k8s/service.yaml",
  ],
};

function maskSecrets(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (SENSITIVE_SECRET_KEYS.has(k) && v) {
      out[k] = `***(${v.length} chars)`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function CloudTargetDialog({
  open,
  loading,
  onOpenChange,
  onSubmit,
}: CloudTargetDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [provider, setProvider] = useState<CloudProvider>("azure");
  const [kube, setKube] = useState<KubeconfigStrategy>(defaultKubeStrategy);
  const [deploy, setDeploy] = useState<DeploymentDefaults>(defaultDeployment);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [contractConfigExtras, setContractConfigExtras] = useState<Record<string, unknown>>({});
  const [pasteJson, setPasteJson] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteOk, setPasteOk] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setProvider("azure");
      setKube(defaultKubeStrategy);
      setDeploy(defaultDeployment);
      setSecrets({});
      setContractConfigExtras({});
      setPasteJson("");
      setPasteError(null);
      setPasteOk(false);
    }
  }, [open]);

  function parseContract() {
    setPasteError(null);
    setPasteOk(false);
    if (!pasteJson.trim()) return;
    try {
      const parsed = JSON.parse(pasteJson);
      const root = parsed.cnp_cd_contract ?? parsed;
      const ct = root.cloud_target ?? {};
      if (!((ct.provider === "aws" && ct.cluster_type === "eks") || (ct.provider === "azure" && ct.cluster_type === "aks"))) {
        throw new Error("Ce formulaire accepte les contrats Azure AKS et AWS EKS.");
      }
      const nextProvider: CloudProvider = ct.provider === "aws" && ct.cluster_type === "eks" ? "aws" : "azure";
      setProvider(nextProvider);
      setContractConfigExtras(nextProvider === "aws" && ct.config && typeof ct.config === "object" ? ct.config : {});
      setForm((current) => ({
        ...current,
        name: ct.name ?? current.name,
        environment: ct.environment ?? current.environment,
        region: ct.region ?? current.region,
        cluster_name: ct.cluster_name ?? current.cluster_name,
        namespace: ct.namespace ?? current.namespace,
        tenant_id: ct.config?.tenant_id ?? current.tenant_id,
        subscription_id:
          ct.config?.subscription_id ?? current.subscription_id,
        resource_group: ct.config?.resource_group ?? current.resource_group,
        account_id: ct.config?.account_id ?? current.account_id,
        cluster_arn: ct.config?.cluster_arn ?? current.cluster_arn,
        cd_role_arn: ct.config?.cd_role_arn ?? current.cd_role_arn,
        status_role_arn: ct.config?.status_role_arn ?? current.status_role_arn,
        dbaas_role_arn: ct.config?.dbaas_role_arn ?? current.dbaas_role_arn,
        runner_labels: Array.isArray(ct.config?.runner_labels) ? ct.config.runner_labels.join(",") : current.runner_labels,
      }));
      if (root.kubeconfig_strategy) {
        setKube({
          option_a_secret_name:
            root.kubeconfig_strategy.option_a_secret_name ??
            defaultKubeStrategy.option_a_secret_name,
          option_b_secret_names: nextProvider === "aws" ? (root.kubeconfig_strategy.option_b_secret_names ?? {}) : {
            ...defaultKubeStrategy.option_b_secret_names,
            ...(root.kubeconfig_strategy.option_b_secret_names ?? {}),
          },
          get_credentials_command:
            root.kubeconfig_strategy.get_credentials_command ??
            defaultKubeStrategy.get_credentials_command,
        });
      }
      if (root.deployment_defaults) {
        setDeploy({
          ...defaultDeployment,
          ...root.deployment_defaults,
        });
      }
      setPasteOk(true);
    } catch (err) {
      setPasteError((err as Error).message || "Invalid JSON");
    }
  }

  function selectProvider(value: string) {
    const nextProvider = value as CloudProvider;
    setProvider(nextProvider);
    setContractConfigExtras({});
    setKube(nextProvider === "aws" ? {
      option_a_secret_name: "KUBECONFIG_CONTENT",
      option_b_secret_names: {},
      get_credentials_command: `aws eks update-kubeconfig --region ${form.region} --name ${form.cluster_name}`,
    } : defaultKubeStrategy);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanedSecrets = Object.fromEntries(
      Object.entries(secrets).filter(([, v]) => v.trim().length > 0),
    );
    const cloudConfig = provider === "aws" ? {
      ...contractConfigExtras,
      account_id: form.account_id.trim(),
      cluster_arn: form.cluster_arn.trim() || undefined,
      cd_role_arn: form.cd_role_arn.trim(),
      status_role_arn: form.status_role_arn.trim(),
      ...(form.dbaas_role_arn.trim() ? { dbaas_role_arn: form.dbaas_role_arn.trim() } : {}),
      runner_labels: form.runner_labels.split(",").map((label) => label.trim()).filter(Boolean),
    } : {
      tenant_id: form.tenant_id.trim() || undefined,
      subscription_id: form.subscription_id.trim() || undefined,
      resource_group: form.resource_group.trim() || undefined,
    };
    const payload: CreateCloudTargetInput = {
      cloud_target: {
        name: form.name.trim(),
        environment: form.environment.trim(),
        provider,
        cluster_type: provider === "aws" ? "eks" : "aks",
        region: form.region.trim(),
        cluster_name: form.cluster_name.trim(),
        namespace: form.namespace.trim(),
        config: cloudConfig,
      },
      kubeconfig_strategy: kube,
      deployment_defaults: deploy,
      secret_values: provider === "aws" ? {} : cleanedSecrets,
    };

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[cloud-target] upsert payload", {
        ...payload,
        secret_values: maskSecrets(payload.secret_values ?? {}),
      });
    }

    onSubmit(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              Register {provider === "aws" ? "Amazon EKS" : "Azure AKS"} cloud node
            </span>
          </DialogTitle>
          <DialogDescription>
            Import the <span className="font-mono">cnp_cd_contract</span> JSON
            produced by Terraform/OpenTofu. This registers an already existing cluster for CD; it does not create cloud infrastructure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-2 rounded-md border border-dashed border-border bg-surface/40 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <FileJson className="h-3.5 w-3.5" />
              Fill from cnp_cd_contract
            </div>
            <Textarea
              value={pasteJson}
              onChange={(e) => setPasteJson(e.target.value)}
              rows={5}
              placeholder='{ "cloud_target": { ... }, "kubeconfig_strategy": { ... }, "deployment_defaults": { ... } }'
              className="font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={parseContract}
              >
                Parse JSON
              </Button>
              {pasteError ? (
                <span className="text-xs text-destructive">{pasteError}</span>
              ) : pasteOk ? (
                <span className="text-xs text-success">
                  Contract parsed. Review the fields below before saving.
                </span>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Cluster
            </div>
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="ct-provider" className="text-xs">Provider</Label>
              <Select value={provider} onValueChange={selectProvider}>
                <SelectTrigger id="ct-provider"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="azure">Azure AKS</SelectItem><SelectItem value="aws">Amazon EKS</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="ct-name"
                label="Name (k8s-name pattern)"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <Field
                id="ct-env"
                label="Environment"
                value={form.environment}
                onChange={(v) => setForm({ ...form, environment: v })}
              />
              <ReadOnly label="Cluster type" value={provider === "aws" ? "eks" : "aks"} />
              <Field
                id="ct-region"
                label="Region"
                value={form.region}
                onChange={(v) => setForm({ ...form, region: v })}
              />
              <Field
                id="ct-cluster"
                label="Cluster name"
                value={form.cluster_name}
                onChange={(v) => setForm({ ...form, cluster_name: v })}
              />
              <Field
                id="ct-ns"
                label="Namespace"
                value={form.namespace}
                onChange={(v) => setForm({ ...form, namespace: v })}
              />
              {provider === "azure" ? <>
                <Field id="ct-rg" label="Resource group" value={form.resource_group} onChange={(v) => setForm({ ...form, resource_group: v })} />
                <Field id="ct-tenant" label="Azure tenant ID" value={form.tenant_id} onChange={(v) => setForm({ ...form, tenant_id: v })} />
                <Field id="ct-sub" label="Azure subscription ID" value={form.subscription_id} onChange={(v) => setForm({ ...form, subscription_id: v })} />
              </> : <>
                <Field id="ct-account" label="AWS account ID" value={form.account_id} onChange={(v) => setForm({ ...form, account_id: v })} />
                <Field id="ct-cluster-arn" label="EKS cluster ARN" value={form.cluster_arn} onChange={(v) => setForm({ ...form, cluster_arn: v })} />
                <Field id="ct-cd-role" label="CD role ARN" value={form.cd_role_arn} onChange={(v) => setForm({ ...form, cd_role_arn: v })} />
                <Field id="ct-status-role" label="Status role ARN" value={form.status_role_arn} onChange={(v) => setForm({ ...form, status_role_arn: v })} />
                <Field id="ct-dbaas-role" label="DBaaS role ARN (optionnel)" value={form.dbaas_role_arn} onChange={(v) => setForm({ ...form, dbaas_role_arn: v })} />
                <Field id="ct-runner-labels" label="Runner labels (comma separated)" value={form.runner_labels} onChange={(v) => setForm({ ...form, runner_labels: v })} />
              </>}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Kubeconfig strategy
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="kube-a"
                label="Option A · kubeconfig secret name"
                value={kube.option_a_secret_name ?? ""}
                onChange={(v) =>
                  setKube({ ...kube, option_a_secret_name: v })
                }
              />
              <Field
                id="kube-cmd"
                label={`Option B · ${provider === "aws" ? "aws eks" : "az"} get-credentials command`}
                value={kube.get_credentials_command ?? ""}
                onChange={(v) =>
                  setKube({ ...kube, get_credentials_command: v })
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Deployment defaults
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="dep-ns"
                label="Namespace"
                value={deploy.namespace ?? ""}
                onChange={(v) => setDeploy({ ...deploy, namespace: v })}
              />
              <Field
                id="dep-svc"
                label="Service type"
                value={deploy.service_type ?? "LoadBalancer"}
                onChange={(v) =>
                  setDeploy({
                    ...deploy,
                    service_type: v as DeploymentDefaults["service_type"],
                  })
                }
              />
              <Field
                id="dep-url"
                label="Public URL format"
                value={deploy.public_url_format ?? ""}
                onChange={(v) =>
                  setDeploy({ ...deploy, public_url_format: v })
                }
              />
            </div>
          </section>

          {provider === "azure" ? <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Azure secret values · encrypted, never displayed back
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {AZURE_SECRET_KEYS.map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`secret-${k}`} className="text-xs">
                    {k}
                  </Label>
                  <Input
                    id={`secret-${k}`}
                    type="password"
                    value={secrets[k] ?? ""}
                    onChange={(e) =>
                      setSecrets({ ...secrets, [k]: e.target.value })
                    }
                    placeholder="paste value"
                    className="font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </section> : <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Le contrat EKS utilise des rôles IAM OIDC. Aucun secret AWS n’est demandé ou stocké dans Cloud Nodes.</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save cloud node
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs"
      />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        readOnly
        disabled
        className="font-mono text-xs opacity-70"
      />
    </div>
  );
}
