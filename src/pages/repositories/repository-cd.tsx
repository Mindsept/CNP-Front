import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  GitPullRequest,
  KeyRound,
  RefreshCw,
  Rocket,
  ShieldAlert,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionCard } from "@/components/common/section-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { YamlViewer } from "@/components/common/yaml-viewer";
import { CdCreatePrDialog } from "@/components/cd/cd-create-pr-dialog";
import {
  DeploymentStatusBadge,
  deploymentStatusMeta,
} from "@/components/cd/deployment-status-badge";
import { AzureLogo, GhcrLogo } from "@/components/common/provider-logos";
import { repositoryService } from "@/services/repository.service";
import { cdService } from "@/services/cd.service";
import { containerRegistryService } from "@/services/container-registry.service";
import { useToastError } from "@/hooks/use-toast-error";
import { ApiError } from "@/lib/errors";
import { formatRelative } from "@/lib/utils";
import type {
  CdCreatePrResponse,
  CdKubeconfigStrategy,
  CdPreview,
  CdSecretMapping,
  CdServiceType,
} from "@/types/cd";

const FILE_ORDER = [
  ".github/workflows/cd.yml",
  "k8s/namespace.yaml",
  "k8s/secret.yaml",
  "k8s/deployment.yaml",
  "k8s/service.yaml",
];

function fileLanguage(path: string): "yaml" | "json" {
  if (path.endsWith(".json")) return "json";
  return "yaml";
}

function sanitizeKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function sanitizeK8sName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

export function RepositoryCdPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const id = repositoryId!;
  const onError = useToastError();
  const qc = useQueryClient();

  const repoQuery = useQuery({
    queryKey: ["repository", id],
    queryFn: () => repositoryService.get(id),
  });

  const requirementsQuery = useQuery({
    queryKey: ["repository", id, "cd", "requirements"],
    queryFn: () => cdService.requirements(id),
  });

  const pipelinesQuery = useQuery({
    queryKey: ["repository", id, "cd"],
    queryFn: () => cdService.list(id),
  });

  const registriesQuery = useQuery({
    queryKey: ["container-registries"],
    queryFn: () => containerRegistryService.list(),
  });
  const defaultRegistry =
    registriesQuery.data?.items.find((r) => r.is_default) ??
    registriesQuery.data?.items[0] ??
    null;
  const hasSharedRegistry = Boolean(defaultRegistry);

  const [cloudTargetId, setCloudTargetId] = useState<string>("");
  const [appName, setAppName] = useState("");
  const [image, setImage] = useState("");
  const [imageTag, setImageTag] = useState("latest");
  const [containerPort, setContainerPort] = useState(8000);
  const [replicas, setReplicas] = useState(1);
  const [serviceType, setServiceType] = useState<CdServiceType>("LoadBalancer");
  const [kubeconfigStrategy, setKubeconfigStrategy] =
    useState<CdKubeconfigStrategy>("secret");
  // Default ON: private GHCR packages need an image pull secret.
  const [includeImagePullSecret, setIncludeImagePullSecret] = useState(true);
  const [imagePullSecretName, setImagePullSecretName] =
    useState("ghcr-pull-secret");
  const [autoMap, setAutoMap] = useState(true);
  const [mappings, setMappings] = useState<CdSecretMapping[]>([]);

  const [preview, setPreview] = useState<CdPreview | null>(null);
  const [approved, setApproved] = useState(false);
  const [pr, setPr] = useState<CdCreatePrResponse | null>(null);
  const [prOpen, setPrOpen] = useState(false);

  // Initialize form once requirements arrive
  useEffect(() => {
    const requirements = requirementsQuery.data;
    if (!requirements) return;
    if (!cloudTargetId && requirements.cloud_targets[0]) {
      setCloudTargetId(requirements.cloud_targets[0].id);
    }
    if (!image && requirements.default_image) {
      setImage(requirements.default_image);
    }
    if (!appName && repoQuery.data?.full_name) {
      const last = repoQuery.data.full_name.split("/").pop() ?? "app";
      setAppName(sanitizeK8sName(last));
    }
    const suggested = new Map(
      requirements.suggested_mappings.map((m) => [m.env_name, m]),
    );
    setMappings(
      requirements.detected_env_vars
        .filter((envVar) => envVar.required)
        .map((envVar) => {
          const s = suggested.get(envVar.name);
          return {
            env_name: envVar.name,
            project_secret_key: s?.project_secret_key ?? envVar.name,
            github_secret_name: s?.github_secret_name ?? envVar.name,
            kubernetes_secret_name: s?.kubernetes_secret_name ?? "app-secrets",
          };
        }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementsQuery.data, repoQuery.data?.full_name]);

  const previewMutation = useMutation({
    mutationFn: () =>
      cdService.preview(id, {
        cloud_target_id: cloudTargetId,
        app_name: appName.trim(),
        image: image.trim(),
        image_tag: imageTag.trim(),
        container_port: containerPort,
        replicas,
        service_type: serviceType,
        kubeconfig_strategy: kubeconfigStrategy,
        include_image_pull_secret: includeImagePullSecret,
        image_pull_secret_name: includeImagePullSecret
          ? imagePullSecretName.trim() || undefined
          : undefined,
        auto_map_project_secrets: autoMap,
        env_secret_mappings: mappings.filter(
          (m) => m.env_name && m.project_secret_key,
        ),
      }),
    onSuccess: (data) => {
      setPreview(data);
      setApproved(false);
      setPr(null);
      toast.success("CD preview generated");
      qc.invalidateQueries({ queryKey: ["repository", id, "cd"] });
    },
    onError: (err) => onError(err, "Could not generate CD preview"),
  });

  const approveMutation = useMutation({
    mutationFn: () => cdService.approve(id, preview!.cd_pipeline_id),
    onSuccess: () => {
      setApproved(true);
      toast.success("CD pipeline approved");
    },
    onError: (err) => onError(err, "Could not approve CD pipeline"),
  });

  const createPrMutation = useMutation({
    mutationFn: (input: Parameters<typeof cdService.createPr>[2]) =>
      cdService.createPr(id, preview!.cd_pipeline_id, input),
    onSuccess: (data) => {
      setPr(data);
      setPrOpen(false);
      toast.success("Pull Request opened");
      qc.invalidateQueries({ queryKey: ["repository", id, "cd"] });
    },
    onError: (err) => onError(err, "Could not open the Pull Request"),
  });

  // A pipeline can only have a deployment once its PR is created.
  const deployablePipelineId = useMemo(() => {
    const items = pipelinesQuery.data?.items ?? [];
    return items.find((p) => p.status === "pr_created")?.id ?? null;
  }, [pipelinesQuery.data]);

  const deploymentQueryKey = [
    "repository",
    id,
    "cd",
    deployablePipelineId,
    "deployment",
  ];

  const deploymentQuery = useQuery({
    queryKey: deploymentQueryKey,
    queryFn: () => cdService.deployment(id, deployablePipelineId!),
    enabled: Boolean(deployablePipelineId),
  });

  const refreshDeploymentMutation = useMutation({
    mutationFn: () => cdService.refreshDeployment(id, deployablePipelineId!),
    onSuccess: (data) => {
      qc.setQueryData(deploymentQueryKey, data);
      if (data.deployment_status === "pending") {
        toast.message(
          "Deployment exists, waiting for external LoadBalancer IP.",
        );
      } else if (data.deployment_status === "deployed") {
        toast.success("Deployment is live");
      } else {
        toast.success("Deployment status refreshed");
      }
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "Create and merge the CD PR before refreshing deployment status.",
        );
        return;
      }
      onError(err, "Could not refresh deployment status");
    },
  });

  const requirements = requirementsQuery.data;
  const projectId = repoQuery.data?.project_id;
  const deployment = deploymentQuery.data;

  const hasCloudTargets = (requirements?.cloud_targets.length ?? 0) > 0;

  // Effective configured CD secrets (project + global registry/cloud node).
  const configuredCdKeys = useMemo(
    () =>
      new Set(
        requirements?.configured_cd_secret_keys ??
          requirements?.configured_cd_project_secrets ??
          [],
      ),
    [requirements],
  );
  const isCdSecretConfigured = (key: string) => {
    // AZURE_* come from the global cloud node; GHCR_TOKEN from the shared registry.
    if (hasSharedRegistry && key === "GHCR_TOKEN") return true;
    return configuredCdKeys.has(key);
  };

  const filesByPath = useMemo(() => {
    const map = new Map<string, string>();
    (preview?.files ?? []).forEach((f) => map.set(f.path, f.content));
    return map;
  }, [preview]);

  const orderedFiles = useMemo(() => {
    if (!preview) return [];
    const known = FILE_ORDER.filter((p) => filesByPath.has(p));
    const extras = preview.files
      .map((f) => f.path)
      .filter((p) => !FILE_ORDER.includes(p));
    return [...known, ...extras];
  }, [preview, filesByPath]);

  const missingProjectSecrets = preview?.missing_project_secrets ?? [];
  const canPreview = Boolean(
    cloudTargetId && appName.trim() && image.trim() && imageTag.trim(),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={repoQuery.data?.full_name ?? "Repository"}
        icon={Rocket}
        back={{
          to: `/repositories/${id}`,
          label: repoQuery.data?.full_name ?? "repository",
        }}
        title="CD workflow"
        description="Generate Kubernetes manifests and a GitHub Actions deploy workflow for Azure AKS. Deployment happens after the generated PR is merged to main."
        actions={
          <Button
            onClick={() => previewMutation.mutate()}
            loading={previewMutation.isPending}
            disabled={!canPreview || !hasCloudTargets}
          >
            <Rocket className="h-4 w-4" />
            {preview ? "Regenerate preview" : "Generate CD preview"}
          </Button>
        }
      />

      {requirementsQuery.isLoading ? (
        <LoadingState rows={3} />
      ) : requirementsQuery.isError ? (
        <ErrorState
          error={requirementsQuery.error}
          title="Could not load CD requirements"
          onRetry={() => requirementsQuery.refetch()}
        />
      ) : !hasCloudTargets ? (
        <EmptyState
          icon={Cloud}
          title="No cloud node configured"
          description="Ask a platform admin to register an AKS cluster for this project before generating a CD pipeline."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="Deployment options"
              description="These options drive the manifests and the CD workflow."
              className="lg:col-span-2"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldBlock label="Cloud target">
                  <Select value={cloudTargetId} onValueChange={setCloudTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a cluster" />
                    </SelectTrigger>
                    <SelectContent>
                      {requirements!.cloud_targets.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            {t.provider === "azure" ? (
                              <AzureLogo className="h-3.5 w-3.5 shrink-0" />
                            ) : null}
                            <span>
                              {t.name} · {t.cluster_name} ({t.region})
                            </span>
                            {t.project_id === null ? (
                              <Badge variant="info" className="ml-1">
                                Global
                              </Badge>
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldBlock>

                <FieldBlock label="App name">
                  <Input
                    value={appName}
                    onChange={(e) =>
                      setAppName(sanitizeK8sName(e.target.value))
                    }
                    className="font-mono text-sm"
                    placeholder="dummy-fastapi"
                  />
                </FieldBlock>

                <FieldBlock label="Image">
                  <Input
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="font-mono text-sm"
                    placeholder="ghcr.io/owner/repo"
                  />
                </FieldBlock>

                <FieldBlock label="Image tag">
                  <Input
                    value={imageTag}
                    onChange={(e) => setImageTag(e.target.value)}
                    className="font-mono text-sm"
                    placeholder="latest"
                  />
                </FieldBlock>

                <FieldBlock label="Container port">
                  <Input
                    type="number"
                    value={containerPort}
                    min={1}
                    max={65535}
                    onChange={(e) =>
                      setContainerPort(Number(e.target.value) || 8000)
                    }
                    className="font-mono text-sm"
                  />
                </FieldBlock>

                <FieldBlock label="Replicas">
                  <Input
                    type="number"
                    value={replicas}
                    min={1}
                    max={50}
                    onChange={(e) =>
                      setReplicas(Number(e.target.value) || 1)
                    }
                    className="font-mono text-sm"
                  />
                </FieldBlock>

                <FieldBlock label="Service type">
                  <Select
                    value={serviceType}
                    onValueChange={(v) =>
                      setServiceType(v as CdServiceType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LoadBalancer">LoadBalancer</SelectItem>
                      <SelectItem value="ClusterIP">ClusterIP</SelectItem>
                      <SelectItem value="NodePort">NodePort</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldBlock>

                <FieldBlock label="Kubeconfig strategy">
                  <Select
                    value={kubeconfigStrategy}
                    onValueChange={(v) =>
                      setKubeconfigStrategy(v as CdKubeconfigStrategy)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="secret">
                        secret (KUBECONFIG_CONTENT)
                      </SelectItem>
                      <SelectItem value="azure_cli">
                        azure_cli (az get-credentials)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldBlock>
              </div>

              <div className="mt-4 space-y-3">
                <OptionRow
                  id="cd-pull-secret"
                  label="Include image pull secret"
                  description="Pull from private registries like GHCR with a separate secret."
                  checked={includeImagePullSecret}
                  onChange={setIncludeImagePullSecret}
                />
                {includeImagePullSecret ? (
                  <FieldBlock label="Image pull secret name">
                    <Input
                      value={imagePullSecretName}
                      onChange={(e) => setImagePullSecretName(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </FieldBlock>
                ) : null}
                <OptionRow
                  id="cd-automap"
                  label="Auto-map project secrets"
                  description="The backend matches detected env vars to existing project secrets."
                  checked={autoMap}
                  onChange={setAutoMap}
                />
              </div>
            </SectionCard>

            <div className="space-y-4">
              <Card className="space-y-3 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Pipeline status
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      pr
                        ? "success"
                        : approved
                          ? "info"
                          : preview
                            ? "default"
                            : "muted"
                    }
                  >
                    {pr
                      ? "pr_created"
                      : approved
                        ? "approved"
                        : preview
                          ? "generated"
                          : "draft"}
                  </Badge>
                  {preview ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {preview.app_name} · {preview.namespace}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <StepLine done={Boolean(preview)} label="Preview generated" />
                  <StepLine done={approved} label="Approved" />
                  <StepLine done={Boolean(pr)} label="Pull Request opened" />
                </div>
              </Card>

              <Card className="min-w-0 space-y-2 overflow-hidden p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Required cluster secrets
                </p>
                <ul className="space-y-1.5 text-sm">
                  {requirements!.required_cloud_secret_names.map((k) => (
                    <li
                      key={k}
                      className="flex items-center justify-between gap-2"
                    >
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-xs"
                        title={k}
                      >
                        {k}
                      </span>
                      <Badge
                        variant={
                          isCdSecretConfigured(k) ? "success" : "warning"
                        }
                        className="shrink-0"
                      >
                        {isCdSecretConfigured(k) ? "Configured" : "Missing"}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {hasSharedRegistry ? (
                  <p className="flex items-start gap-1.5 text-[11px] text-success">
                    <GhcrLogo className="mt-0.5 h-3 w-3 shrink-0" />
                    Shared registry configured · {defaultRegistry!.auth_secret_name}{" "}
                    synced from the platform.
                  </p>
                ) : null}
                {projectId ? (
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <Link to={`/projects/${projectId}/secrets?env=cd`}>
                      <KeyRound className="h-3.5 w-3.5" />
                      Manage project secrets
                    </Link>
                  </Button>
                ) : null}
              </Card>
            </div>
          </div>

          {requirements!.detected_env_vars.length ? (
            <SectionCard
              title="App environment secrets"
              description="Detected variables from example env files. Map each to a project secret + GitHub secret + Kubernetes secret."
            >
              <div className="space-y-3">
                {requirements!.detected_env_vars.map((envVar) => {
                  const mapping = mappings.find(
                    (m) => m.env_name === envVar.name,
                  );
                  if (!envVar.required) {
                    return (
                      <Card key={envVar.name} className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            {envVar.name}
                          </span>
                          <Badge variant="muted">Optional</Badge>
                          <span className="text-xs text-muted-foreground">
                            from{" "}
                            <span className="font-mono">{envVar.source}</span>
                          </span>
                        </div>
                      </Card>
                    );
                  }
                  return (
                    <Card key={envVar.name} className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {envVar.name}
                        </span>
                        <Badge variant="warning">Required</Badge>
                        {envVar.sensitive ? (
                          <Badge variant="secondary">Sensitive</Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          from{" "}
                          <span className="font-mono">{envVar.source}</span>
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-3">
                        <FieldBlock label="Project secret">
                          <Input
                            value={
                              mapping?.project_secret_key ?? envVar.name
                            }
                            onChange={(e) =>
                              setMappings((current) =>
                                current.map((m) =>
                                  m.env_name === envVar.name
                                    ? {
                                        ...m,
                                        project_secret_key: sanitizeKey(
                                          e.target.value,
                                        ),
                                      }
                                    : m,
                                ),
                              )
                            }
                            className="font-mono text-xs"
                          />
                        </FieldBlock>
                        <FieldBlock label="GitHub secret">
                          <Input
                            value={
                              mapping?.github_secret_name ?? envVar.name
                            }
                            onChange={(e) =>
                              setMappings((current) =>
                                current.map((m) =>
                                  m.env_name === envVar.name
                                    ? {
                                        ...m,
                                        github_secret_name: sanitizeKey(
                                          e.target.value,
                                        ),
                                      }
                                    : m,
                                ),
                              )
                            }
                            className="font-mono text-xs"
                          />
                        </FieldBlock>
                        <FieldBlock label="Kubernetes secret">
                          <Input
                            value={
                              mapping?.kubernetes_secret_name ?? "app-secrets"
                            }
                            onChange={(e) =>
                              setMappings((current) =>
                                current.map((m) =>
                                  m.env_name === envVar.name
                                    ? {
                                        ...m,
                                        kubernetes_secret_name:
                                          sanitizeK8sName(e.target.value),
                                      }
                                    : m,
                                ),
                              )
                            }
                            className="font-mono text-xs"
                          />
                        </FieldBlock>
                      </div>
                    </Card>
                  );
                })}
                {requirements!.missing_project_secrets.length > 0 ? (
                  <Card className="flex items-start gap-3 border-warning/30 bg-warning/5 p-4 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <p className="text-muted-foreground">
                      Missing project secrets:{" "}
                      <span className="font-mono text-foreground">
                        {requirements!.missing_project_secrets.join(", ")}
                      </span>
                      . Add them in project secrets before opening the PR.
                    </p>
                  </Card>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {!preview ? (
            <EmptyState
              icon={Rocket}
              title="No preview yet"
              description="Pick a cloud target and click Generate CD preview to scaffold the workflow and Kubernetes manifests."
              action={
                <Button
                  onClick={() => previewMutation.mutate()}
                  loading={previewMutation.isPending}
                  disabled={!canPreview}
                >
                  <Rocket className="h-4 w-4" />
                  Generate CD preview
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Generated files
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {!approved ? (
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate()}
                        loading={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    ) : !pr ? (
                      <Button
                        size="sm"
                        onClick={() => setPrOpen(true)}
                        loading={createPrMutation.isPending}
                      >
                        <GitPullRequest className="h-3.5 w-3.5" />
                        Open Pull Request
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={pr.pull_request_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View PR #{pr.pull_request_number}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <Tabs defaultValue={orderedFiles[0] ?? ""}>
                  <TabsList className="flex h-auto w-full flex-wrap gap-1">
                    {orderedFiles.map((path) => (
                      <TabsTrigger
                        key={path}
                        value={path}
                        className="max-w-full break-all font-mono text-[11px] [white-space:normal]"
                        title={path}
                      >
                        {path}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {orderedFiles.map((path) => (
                    <TabsContent key={path} value={path} className="min-w-0">
                      <YamlViewer
                        yaml={filesByPath.get(path) ?? ""}
                        language={fileLanguage(path)}
                        filename={path}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div className="min-w-0 space-y-3">
                <Card className="min-w-0 space-y-3 overflow-hidden p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Summary
                  </p>
                  <dl className="space-y-3">
                    <Row label="App" value={preview.app_name} mono />
                    <Row label="Namespace" value={preview.namespace} mono />
                    <Row
                      label="Image"
                      value={`${preview.image}:${preview.image_tag}`}
                      mono
                    />
                  </dl>
                </Card>

                <Card className="min-w-0 space-y-2 overflow-hidden p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Required secrets
                  </p>
                  {preview.required_secrets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No additional secret required.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {preview.required_secrets.map((k) => (
                        <li
                          key={k}
                          className="flex items-center justify-between gap-2"
                        >
                          <span
                            className="min-w-0 flex-1 truncate font-mono text-xs"
                            title={k}
                          >
                            {k}
                          </span>
                          <Badge
                            variant={
                              missingProjectSecrets.includes(k)
                                ? "warning"
                                : "success"
                            }
                            className="shrink-0"
                          >
                            {missingProjectSecrets.includes(k)
                              ? "Missing"
                              : "Configured"}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                {missingProjectSecrets.length > 0 ? (
                  <Card className="flex items-start gap-3 overflow-hidden border-warning/30 bg-warning/5 p-4 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <p className="min-w-0 break-words text-muted-foreground">
                      <span className="break-all font-mono text-foreground">
                        {missingProjectSecrets.join(", ")}
                      </span>{" "}
                      missing. The PR can still be opened, but the CD job will
                      fail until they are added and synced.
                    </p>
                  </Card>
                ) : null}

                {pr ? (
                  <Card className="min-w-0 overflow-hidden border-success/30 bg-success/5 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-success">
                      Pull Request opened
                    </p>
                    <p className="mt-1 break-words text-sm">
                      Branch{" "}
                      <span
                        className="break-all font-mono text-foreground"
                        title={pr.branch_name}
                      >
                        {pr.branch_name}
                      </span>{" "}
                      is ready for review.
                    </p>
                    {pr.synced_secrets.length > 0 ? (
                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        Synced secret keys:{" "}
                        <span className="break-all font-mono">
                          {pr.synced_secrets.join(", ")}
                        </span>
                      </p>
                    ) : null}
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      variant="outline"
                      asChild
                    >
                      <a
                        href={pr.pull_request_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open PR #{pr.pull_request_number}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </Card>
                ) : (
                  <Card className="flex items-start gap-3 border-info/30 bg-info/5 p-4 text-sm">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                    <p className="text-muted-foreground">
                      Preview is read-only. Approve, then open a PR. Deployment
                      to AKS happens after the PR is merged to main.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {deployablePipelineId ? (
            <SectionCard
              title="Deployment"
              description="Live status of this repository on the AKS cluster. Deployment happens after the CD PR is merged to main."
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refreshDeploymentMutation.mutate()}
                  loading={refreshDeploymentMutation.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh deployment status
                </Button>
              }
            >
              {deploymentQuery.isLoading ? (
                <LoadingState rows={1} />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <DeploymentStatusBadge
                      status={deployment?.deployment_status ?? "unknown"}
                    />
                    <span className="text-sm text-muted-foreground">
                      {
                        deploymentStatusMeta(
                          deployment?.deployment_status ?? "unknown",
                        ).hint
                      }
                    </span>
                    {deployment?.last_deployment_checked_at ? (
                      <span className="text-xs text-muted-foreground">
                        · checked{" "}
                        {formatRelative(deployment.last_deployment_checked_at)}
                      </span>
                    ) : null}
                  </div>

                  {deployment ? (
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <DeployKV label="App" value={deployment.app_name} mono />
                      <DeployKV
                        label="Namespace"
                        value={deployment.namespace}
                        mono
                      />
                      <DeployKV
                        label="Image"
                        value={`${deployment.image}:${deployment.image_tag}`}
                        mono
                      />
                      {deployment.external_ip ? (
                        <DeployKV
                          label="External IP"
                          value={deployment.external_ip}
                          mono
                        />
                      ) : null}
                      {deployment.deployment_details?.service_type ? (
                        <DeployKV
                          label="Service type"
                          value={deployment.deployment_details.service_type}
                          mono
                        />
                      ) : null}
                      {deployment.deployment_details?.cluster_ip ? (
                        <DeployKV
                          label="Cluster IP"
                          value={deployment.deployment_details.cluster_ip}
                          mono
                        />
                      ) : null}
                    </dl>
                  ) : null}

                  {deployment?.deployment_status === "deployed" &&
                  deployment.public_url ? (
                    <Button variant="outline" asChild>
                      <a
                        href={deployment.public_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open deployed app
                      </a>
                    </Button>
                  ) : deployment?.deployment_status === "pending" ? (
                    <Card className="flex items-start gap-3 border-warning/30 bg-warning/5 p-4 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <p className="text-muted-foreground">
                        Deployment exists, waiting for external LoadBalancer IP.
                        Refresh again in a moment.
                      </p>
                    </Card>
                  ) : deployment?.deployment_status === "failed" ? (
                    <Card className="min-w-0 overflow-hidden border-destructive/30 bg-destructive/5 p-4 text-sm">
                      <p className="font-medium text-destructive">
                        Deployment failed
                      </p>
                      {deployment.deployment_details ? (
                        <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-surface/60 p-3 font-mono text-[11px] text-foreground/90">
                          {JSON.stringify(
                            deployment.deployment_details,
                            null,
                            2,
                          )}
                        </pre>
                      ) : null}
                    </Card>
                  ) : null}
                </div>
              )}
            </SectionCard>
          ) : null}

          <SectionCard
            title="CD history"
            description="Every preview generated for this repository."
          >
            {pipelinesQuery.isLoading ? (
              <LoadingState rows={2} />
            ) : pipelinesQuery.isError ? (
              <ErrorState
                error={pipelinesQuery.error}
                title="Could not load CD history"
                onRetry={() => pipelinesQuery.refetch()}
              />
            ) : (pipelinesQuery.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No CD pipeline yet. Generate a preview above.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {pipelinesQuery.data!.items.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1 basis-[260px]">
                      <p
                        className="break-all font-mono text-xs text-foreground"
                        title={`${p.app_name} · ${p.namespace}`}
                      >
                        {p.app_name} · {p.namespace}
                      </p>
                      <p
                        className="break-all text-xs text-muted-foreground"
                        title={`${p.image}:${p.image_tag}`}
                      >
                        {p.image}:{p.image_tag} ·{" "}
                        <span className="whitespace-nowrap">
                          {formatRelative(p.created_at)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={
                          p.status === "pr_created"
                            ? "success"
                            : p.status === "approved"
                              ? "info"
                              : p.status === "error"
                                ? "danger"
                                : "muted"
                        }
                      >
                        {p.status}
                      </Badge>
                      {p.pull_request_url ? (
                        <Button size="sm" variant="ghost" asChild>
                          <a
                            href={p.pull_request_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            PR
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      <CdCreatePrDialog
        open={prOpen}
        defaultBranch={repoQuery.data?.default_branch ?? "main"}
        loading={createPrMutation.isPending}
        onOpenChange={setPrOpen}
        onSubmit={(input) => createPrMutation.mutate(input)}
      />
    </div>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function OptionRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function StepLine({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          done ? "bg-success" : "bg-muted-foreground/30"
        }`}
      />
      <span className={done ? "text-foreground" : ""}>{label}</span>
    </div>
  );
}

function DeployKV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`leading-snug text-foreground ${
          mono ? "break-all font-mono text-xs" : "text-sm"
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`text-sm leading-snug text-foreground ${
          mono ? "break-all font-mono text-xs" : ""
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
