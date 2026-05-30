import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cloud, Plus, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CloudTargetDialog } from "@/components/cloud-targets/cloud-target-dialog";
import { projectService } from "@/services/project.service";
import { cloudTargetService } from "@/services/cloud-target.service";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";
import { ApiError } from "@/lib/errors";
import { formatRelative } from "@/lib/utils";
import type { CreateCloudTargetInput } from "@/types/cloud-target";

export function AdminCloudTargetsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const qc = useQueryClient();
  const onError = useToastError();
  const [params, setParams] = useSearchParams();

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.list(),
    enabled: isAdmin,
  });

  const projects = projectsQuery.data?.items ?? [];
  const projectIdParam = params.get("projectId");
  const projectId = projectIdParam ?? projects[0]?.id ?? "";

  useEffect(() => {
    if (!projectIdParam && projects[0]?.id) {
      setParams({ projectId: projects[0].id }, { replace: true });
    }
  }, [projectIdParam, projects, setParams]);

  const targetsQuery = useQuery({
    queryKey: ["project", projectId, "cloud-targets"],
    queryFn: () => cloudTargetService.list(projectId),
    enabled: isAdmin && Boolean(projectId),
  });

  const [open, setOpen] = useState(false);
  const [storedKeys, setStoredKeys] = useState<string[] | null>(null);
  const [validationError, setValidationError] = useState<ApiError | null>(null);

  const upsertMutation = useMutation({
    mutationFn: (input: CreateCloudTargetInput) =>
      cloudTargetService.upsert(projectId, input),
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
      setOpen(false);
      qc.invalidateQueries({
        queryKey: ["project", projectId, "cloud-targets"],
      });
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
          icon={Cloud}
          title="Cloud Nodes"
          description="Register and configure Kubernetes clusters available for CD pipelines."
        />
        <Card className="flex items-start gap-3 border-destructive/30 bg-destructive/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-foreground">
              Admin access required
            </p>
            <p className="text-muted-foreground">
              Only platform admins can register cloud nodes. Developers can pick
              an existing cloud target from the repository CD page.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const items = targetsQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        icon={Cloud}
        title="Cloud Nodes"
        description="Register and configure Kubernetes clusters available for CD pipelines."
        actions={
          <Button
            onClick={() => setOpen(true)}
            disabled={!projectId}
          >
            <Plus className="h-4 w-4" />
            Add cloud node
          </Button>
        }
      />

      <SectionCard
        title="Scope"
        description="Cloud nodes are registered per project. Pick the project you want to configure."
      >
        <div className="max-w-md space-y-2">
          <Label htmlFor="proj">Project</Label>
          {projectsQuery.isLoading ? (
            <LoadingState rows={1} />
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No project available. Create one first.
            </p>
          ) : (
            <Select
              value={projectId}
              onValueChange={(v) => setParams({ projectId: v })}
            >
              <SelectTrigger id="proj">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · /{p.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </SectionCard>

      {storedKeys && storedKeys.length > 0 ? (
        <Card className="border-success/30 bg-success/5 p-4 text-sm">
          <p className="font-medium text-foreground">
            Stored {storedKeys.length} secret
            {storedKeys.length === 1 ? "" : "s"}
          </p>
          <p className="text-muted-foreground">
            Keys:{" "}
            <span className="font-mono">{storedKeys.join(", ")}</span>. Values
            are encrypted and will never be displayed back.
          </p>
        </Card>
      ) : null}

      {validationError ? (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm">
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

      <SectionCard
        title="Registered cloud nodes"
        description="Each node represents a cluster + namespace this project can deploy to."
      >
        {!projectId ? (
          <p className="text-sm text-muted-foreground">
            Pick a project to see its cloud nodes.
          </p>
        ) : targetsQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : targetsQuery.isError ? (
          <ErrorState
            error={targetsQuery.error}
            title="Could not load cloud nodes"
            onRetry={() => targetsQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Cloud}
            title="No cloud node yet"
            description="Register the first AKS cluster by pasting the cnp_cd_contract JSON from Terraform/OpenTofu."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                Add cloud node
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((t) => (
              <li key={t.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {t.name}
                      </p>
                      <Badge variant="default">{t.provider}</Badge>
                      <Badge variant="secondary">{t.cluster_type}</Badge>
                      <Badge variant="muted">{t.environment}</Badge>
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
                    {t.kubeconfig_strategy?.option_a_secret_name ||
                    t.kubeconfig_strategy?.get_credentials_command ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        kubeconfig:{" "}
                        {t.kubeconfig_strategy.option_a_secret_name ? (
                          <span className="font-mono text-foreground/80">
                            {t.kubeconfig_strategy.option_a_secret_name}
                          </span>
                        ) : null}
                        {t.kubeconfig_strategy.option_a_secret_name &&
                        t.kubeconfig_strategy.get_credentials_command
                          ? " · "
                          : null}
                        {t.kubeconfig_strategy.get_credentials_command ? (
                          <span className="font-mono text-foreground/80">
                            {t.kubeconfig_strategy.get_credentials_command}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    Updated {formatRelative(t.updated_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <CloudTargetDialog
        open={open}
        loading={upsertMutation.isPending}
        onOpenChange={setOpen}
        onSubmit={(input) => upsertMutation.mutate(input)}
      />
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
