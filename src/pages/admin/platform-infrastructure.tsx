import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Plus,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AwsLogo,
  AzureLogo,
  GcpLogo,
  GhcrLogo,
} from "@/components/common/provider-logos";
import { CloudTargetDialog } from "@/components/cloud-targets/cloud-target-dialog";
import { RegistryDialog } from "@/components/registries/registry-dialog";
import { cloudTargetService } from "@/services/cloud-target.service";
import { containerRegistryService } from "@/services/container-registry.service";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";
import { ApiError } from "@/lib/errors";
import { formatRelative } from "@/lib/utils";
import type { CreateCloudTargetInput } from "@/types/cloud-target";
import type { CreateContainerRegistryInput } from "@/types/container-registry";

export function PlatformInfrastructurePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const qc = useQueryClient();
  const onError = useToastError();

  const registriesQuery = useQuery({
    queryKey: ["container-registries"],
    queryFn: () => containerRegistryService.list(),
    enabled: isAdmin,
  });

  const cloudNodesQuery = useQuery({
    queryKey: ["admin", "cloud-nodes"],
    queryFn: () => cloudTargetService.listGlobal(),
    enabled: isAdmin,
  });

  const [registryOpen, setRegistryOpen] = useState(false);
  const [nodeOpen, setNodeOpen] = useState(false);
  const [storedKeys, setStoredKeys] = useState<string[] | null>(null);
  const [validationError, setValidationError] = useState<ApiError | null>(null);

  const registries = registriesQuery.data?.items ?? [];
  const defaultRegistry =
    registries.find((r) => r.is_default) ?? registries[0] ?? null;

  const registryMutation = useMutation({
    mutationFn: (input: CreateContainerRegistryInput) =>
      containerRegistryService.create(input),
    onSuccess: (data) => {
      toast.success(
        data.created
          ? `Registry "${data.registry.name}" configured`
          : `Registry "${data.registry.name}" updated`,
      );
      setRegistryOpen(false);
      qc.invalidateQueries({ queryKey: ["container-registries"] });
    },
    onError: (err) => onError(err, "Could not save registry"),
  });

  const cloudNodeMutation = useMutation({
    mutationFn: (input: CreateCloudTargetInput) =>
      cloudTargetService.createGlobal(input),
    onMutate: () => {
      setValidationError(null);
    },
    onSuccess: (data) => {
      toast.success(
        data.created
          ? `Cloud node "${data.cloud_target.name}" created`
          : `Cloud node "${data.cloud_target.name}" updated`,
      );
      setStoredKeys(data.upserted_secret_keys);
      setNodeOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "cloud-nodes"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 422) {
        setValidationError(err);
      }
      onError(err, "Could not save cloud node");
    },
  });

  if (!isAdmin) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Admin"
          icon={Server}
          title="Platform Infrastructure"
          description="Configure the shared container registry and global Cloud Nodes used by every project's CI/CD."
        />
        <Card className="flex items-start gap-3 border-destructive/30 bg-destructive/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-foreground">Admin access required</p>
            <p className="text-muted-foreground">
              Only platform admins can configure shared infrastructure.
              Developers pick from available global Cloud Nodes on their
              repository CD page.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const nodes = cloudNodesQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        icon={Server}
        title="Platform Infrastructure"
        description="Configure shared CD infrastructure once. Developers then select available global Cloud Nodes from their repository CD page."
      />

      {/* Container registry */}
      <SectionCard
        title="Container registry"
        description="Shared registry generated pipelines use to push and pull images."
      >
        {registriesQuery.isLoading ? (
          <LoadingState rows={1} />
        ) : registriesQuery.isError ? (
          <ErrorState
            error={registriesQuery.error}
            title="Could not load registries"
            onRetry={() => registriesQuery.refetch()}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProviderCard
              logo={<GhcrLogo className="h-6 w-6" />}
              name="GitHub Container Registry"
              subtitle="ghcr.io"
              enabled
              configured={Boolean(defaultRegistry)}
            >
              {defaultRegistry ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">Enabled</Badge>
                    {defaultRegistry.is_default ? (
                      <Badge variant="info">Default</Badge>
                    ) : null}
                  </div>
                  <dl className="space-y-1 text-xs text-muted-foreground">
                    <Line label="URL" value={defaultRegistry.registry_url} />
                    <Line label="Namespace" value={defaultRegistry.namespace} />
                    <Line
                      label="Auth secret"
                      value={defaultRegistry.auth_secret_name}
                    />
                  </dl>
                  <p className="flex items-center gap-1.5 text-[11px] text-success">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Token stored encrypted
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setRegistryOpen(true)}
                  >
                    Update registry
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge variant="warning">Not configured</Badge>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setRegistryOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Configure GHCR
                  </Button>
                </div>
              )}
            </ProviderCard>

            <ProviderCard
              logo={<AwsLogo className="h-6 w-6" />}
              name="Amazon ECR"
              subtitle="AWS"
              comingSoon
            />
            <ProviderCard
              logo={<GcpLogo className="h-6 w-6" />}
              name="Google Artifact Registry"
              subtitle="GCP"
              comingSoon
            />
          </div>
        )}
      </SectionCard>

      {/* Cloud nodes */}
      <SectionCard
        title="Cloud Nodes"
        description="Global Kubernetes clusters available to every project's CD pipeline."
        actions={
          <Button onClick={() => setNodeOpen(true)}>
            <Plus className="h-4 w-4" />
            Add cloud node
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProviderCard
            logo={<AzureLogo className="h-6 w-6" />}
            name="Azure AKS"
            subtitle="azure · aks"
            enabled
            configured={nodes.length > 0}
          >
            <Badge variant="success">Enabled</Badge>
          </ProviderCard>
          <ProviderCard
            logo={<AwsLogo className="h-6 w-6" />}
            name="Amazon EKS"
            subtitle="aws · eks"
            comingSoon
          />
          <ProviderCard
            logo={<GcpLogo className="h-6 w-6" />}
            name="Google GKE"
            subtitle="gcp · gke"
            comingSoon
          />
        </div>

        {storedKeys && storedKeys.length > 0 ? (
          <Card className="mt-4 border-success/30 bg-success/5 p-4 text-sm">
            <p className="font-medium text-foreground">
              Stored {storedKeys.length} secret
              {storedKeys.length === 1 ? "" : "s"}
            </p>
            <p className="text-muted-foreground">
              Keys: <span className="font-mono">{storedKeys.join(", ")}</span>.
              Values are encrypted and will never be displayed back.
            </p>
          </Card>
        ) : null}

        {validationError ? (
          <Card className="mt-4 border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-foreground">
              Validation error — backend rejected the payload
            </p>
            <p className="text-muted-foreground">
              <span className="font-mono">{validationError.code}</span> ·{" "}
              {validationError.message}
            </p>
            {validationError.details ? (
              <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-surface/60 p-3 font-mono text-[11px] text-foreground/90">
                {JSON.stringify(validationError.details, null, 2)}
              </pre>
            ) : null}
          </Card>
        ) : null}

        <div className="mt-4">
          {cloudNodesQuery.isLoading ? (
            <LoadingState rows={2} />
          ) : cloudNodesQuery.isError ? (
            <ErrorState
              error={cloudNodesQuery.error}
              title="Could not load cloud nodes"
              onRetry={() => cloudNodesQuery.refetch()}
            />
          ) : nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No global cloud node yet. Register the first AKS cluster by pasting
              the cnp_cd_contract JSON from Terraform/OpenTofu.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {nodes.map((t) => (
                <li key={t.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <AzureLogo className="h-4 w-4" />
                        <p className="text-sm font-semibold text-foreground">
                          {t.name}
                        </p>
                        <Badge variant="default">{t.provider}</Badge>
                        <Badge variant="secondary">{t.cluster_type}</Badge>
                        <Badge variant="muted">{t.environment}</Badge>
                        <Badge variant="info">Global</Badge>
                        {t.deployment_defaults?.service_type ? (
                          <Badge variant="info">
                            {t.deployment_defaults.service_type}
                          </Badge>
                        ) : null}
                      </div>
                      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                        <KV label="Cluster" value={t.cluster_name} />
                        <KV label="Region" value={t.region} />
                        <KV label="Namespace" value={t.namespace} />
                        <KV
                          label="Resource group"
                          value={
                            (t.config?.resource_group as string | undefined) ??
                            "—"
                          }
                        />
                      </dl>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Updated {formatRelative(t.updated_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      <RegistryDialog
        open={registryOpen}
        loading={registryMutation.isPending}
        existing={defaultRegistry}
        onOpenChange={setRegistryOpen}
        onSubmit={(input) => registryMutation.mutate(input)}
      />

      <CloudTargetDialog
        open={nodeOpen}
        loading={cloudNodeMutation.isPending}
        onOpenChange={setNodeOpen}
        onSubmit={(input) => cloudNodeMutation.mutate(input)}
      />
    </div>
  );
}

function ProviderCard({
  logo,
  name,
  subtitle,
  enabled,
  configured,
  comingSoon,
  children,
}: {
  logo: React.ReactNode;
  name: string;
  subtitle: string;
  enabled?: boolean;
  configured?: boolean;
  comingSoon?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card
      className={`space-y-3 p-4 ${comingSoon ? "opacity-60" : ""}`}
      aria-disabled={comingSoon}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/60">
          {logo}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
        {enabled && configured ? (
          <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-success" />
        ) : null}
      </div>
      {comingSoon ? (
        <Badge variant="muted">Coming soon</Badge>
      ) : (
        children
      )}
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>{label}</dt>
      <dd className="truncate font-mono text-foreground/80" title={value}>
        {value}
      </dd>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-[0.12em] text-muted-foreground/70">
        {label}
      </dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}
