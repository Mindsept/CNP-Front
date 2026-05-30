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
import type {
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
  const [kube, setKube] = useState<KubeconfigStrategy>(defaultKubeStrategy);
  const [deploy, setDeploy] = useState<DeploymentDefaults>(defaultDeployment);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [pasteJson, setPasteJson] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteOk, setPasteOk] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setKube(defaultKubeStrategy);
      setDeploy(defaultDeployment);
      setSecrets({});
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
      }));
      if (root.kubeconfig_strategy) {
        setKube({
          option_a_secret_name:
            root.kubeconfig_strategy.option_a_secret_name ??
            defaultKubeStrategy.option_a_secret_name,
          option_b_secret_names: {
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanedSecrets = Object.fromEntries(
      Object.entries(secrets).filter(([, v]) => v.trim().length > 0),
    );
    const payload: CreateCloudTargetInput = {
      cloud_target: {
        name: form.name.trim(),
        environment: form.environment.trim(),
        provider: "azure",
        cluster_type: "aks",
        region: form.region.trim(),
        cluster_name: form.cluster_name.trim(),
        namespace: form.namespace.trim(),
        config: {
          tenant_id: form.tenant_id.trim() || undefined,
          subscription_id: form.subscription_id.trim() || undefined,
          resource_group: form.resource_group.trim() || undefined,
        },
      },
      kubeconfig_strategy: kube,
      deployment_defaults: deploy,
      secret_values: cleanedSecrets,
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
              Register Azure AKS cloud node
            </span>
          </DialogTitle>
          <DialogDescription>
            Paste the <span className="font-mono">cnp_cd_contract</span> JSON
            from Terraform/OpenTofu or fill the fields manually. Secret values
            are stored encrypted and never displayed back.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-2 rounded-md border border-dashed border-border bg-surface/40 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <FileJson className="h-3.5 w-3.5" />
              Auto-fill from cnp_cd_contract
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
                  Form filled. Add the Azure credentials below before saving.
                </span>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Cluster
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
              <ReadOnly label="Provider" value="azure" />
              <ReadOnly label="Cluster type" value="aks" />
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
              <Field
                id="ct-rg"
                label="Resource group"
                value={form.resource_group}
                onChange={(v) => setForm({ ...form, resource_group: v })}
              />
              <Field
                id="ct-tenant"
                label="Azure tenant ID"
                value={form.tenant_id}
                onChange={(v) => setForm({ ...form, tenant_id: v })}
              />
              <Field
                id="ct-sub"
                label="Azure subscription ID"
                value={form.subscription_id}
                onChange={(v) => setForm({ ...form, subscription_id: v })}
              />
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
                label="Option B · az get-credentials command"
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

          <section className="space-y-3">
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
          </section>

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
