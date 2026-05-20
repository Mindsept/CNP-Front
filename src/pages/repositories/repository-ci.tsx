import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  KeyRound,
  Microscope,
  Settings2,
  Sparkles,
  Workflow,
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
import { YamlViewer } from "@/components/common/yaml-viewer";
import { CiStatusBadge } from "@/components/common/status-badge";
import { AdaptDialog } from "@/components/ci/adapt-dialog";
import { CreatePrDialog } from "@/components/ci/create-pr-dialog";
import { repositoryService } from "@/services/repository.service";
import { ciService } from "@/services/ci.service";
import { secretService } from "@/services/secret.service";
import { useToastError } from "@/hooks/use-toast-error";
import type {
  CiAdaptResponse,
  CiCreatePrResponse,
  CiPipelinePreview,
} from "@/types/ci";

export function RepositoryCiPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const id = repositoryId!;
  const onError = useToastError();
  const qc = useQueryClient();

  const repoQuery = useQuery({
    queryKey: ["repository", id],
    queryFn: () => repositoryService.get(id),
  });

  const analysisQuery = useQuery({
    queryKey: ["repository", id, "analysis", "latest"],
    queryFn: () => repositoryService.latestAnalysis(id),
  });

  const projectId = repoQuery.data?.project_id;
  const secretsQuery = useQuery({
    queryKey: ["project", projectId, "secrets"],
    queryFn: () => secretService.list(projectId!),
    enabled: Boolean(projectId),
  });

  const [includeDocker, setIncludeDocker] = useState(true);
  const [includePush, setIncludePush] = useState(true);
  const [explainAi, setExplainAi] = useState(true);
  const [registry, setRegistry] = useState("ghcr.io");

  const [preview, setPreview] = useState<CiPipelinePreview | null>(null);
  const [adapted, setAdapted] = useState<CiAdaptResponse | null>(null);
  const [approved, setApproved] = useState(false);
  const [pr, setPr] = useState<CiCreatePrResponse | null>(null);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);

  const previewMutation = useMutation({
    mutationFn: () =>
      ciService.preview(id, {
        mode: "deterministic",
        provider: "github_actions",
        include_docker_build: includeDocker,
        include_docker_push_on_main: includePush,
        registry,
        explain_with_ai: explainAi,
      }),
    onSuccess: (data) => {
      setPreview(data);
      setAdapted(null);
      setApproved(false);
      setPr(null);
      toast.success("CI preview generated");
      qc.invalidateQueries({ queryKey: ["repository", id, "ci"] });
    },
    onError: (err) => onError(err, "Could not generate CI preview"),
  });

  const adaptMutation = useMutation({
    mutationFn: (instruction: string) =>
      ciService.adapt(id, preview!.ci_pipeline_id, { instruction }),
    onSuccess: (data) => {
      setAdapted(data);
      setApproved(false);
      setPr(null);
      setAdaptOpen(false);
      toast.success("Workflow adapted");
    },
    onError: (err) => onError(err, "Could not adapt workflow"),
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      ciService.approve(id, preview!.ci_pipeline_id, {
        use_adapted_yaml: Boolean(adapted),
      }),
    onSuccess: () => {
      setApproved(true);
      toast.success("Workflow approved");
    },
    onError: (err) => onError(err, "Could not approve workflow"),
  });

  const createPrMutation = useMutation({
    mutationFn: (input: Parameters<typeof ciService.createPr>[2]) =>
      ciService.createPr(id, preview!.ci_pipeline_id, input),
    onSuccess: (data) => {
      setPr(data);
      setPrOpen(false);
      toast.success("Pull Request opened");
      qc.invalidateQueries({ queryKey: ["repository", id] });
      qc.invalidateQueries({ queryKey: ["repository", id, "ci"] });
    },
    onError: (err) => onError(err, "Could not open the Pull Request"),
  });

  const activeYaml = adapted?.adapted_yaml ?? preview?.generated_yaml ?? "";
  const activeExplanation = adapted?.explanation ?? preview?.explanation ?? "";

  const requiredSecrets = preview?.required_secrets ?? [];
  const existingSecretKeys = useMemo(
    () => new Set((secretsQuery.data?.items ?? []).map((s) => s.key)),
    [secretsQuery.data],
  );
  const missingSecrets = requiredSecrets.filter(
    (k) => !existingSecretKeys.has(k),
  );

  const hasAnalysis = Boolean(analysisQuery.data);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          repoQuery.data ? (
            <Link
              to={`/repositories/${id}`}
              className="hover:text-foreground"
            >
              ← {repoQuery.data.full_name}
            </Link>
          ) : (
            "Repository"
          )
        }
        title="CI workflow"
        description="Generate, adapt and ship a production-ready GitHub Actions workflow."
        actions={
          <Button
            onClick={() => previewMutation.mutate()}
            loading={previewMutation.isPending}
            disabled={!hasAnalysis}
          >
            <Workflow className="h-4 w-4" />
            {preview ? "Regenerate preview" : "Generate CI preview"}
          </Button>
        }
      />

      {repoQuery.isLoading ? (
        <LoadingState rows={3} />
      ) : repoQuery.isError ? (
        <ErrorState
          error={repoQuery.error}
          title="Could not load repository"
          onRetry={() => repoQuery.refetch()}
        />
      ) : !hasAnalysis ? (
        <EmptyState
          icon={Microscope}
          title="Analyze the repository first"
          description="A successful analysis is required so the platform knows the stack, tests and Dockerfile state."
          action={
            <Button asChild>
              <Link to={`/repositories/${id}/analysis`}>
                Open analysis
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="Options"
              description="These options control the deterministic workflow generator."
            >
              <div className="space-y-4">
                <OptionRow
                  id="opt-docker"
                  label="Build Docker image"
                  description="Adds a docker buildx build step in CI."
                  checked={includeDocker}
                  onChange={setIncludeDocker}
                />
                <OptionRow
                  id="opt-push"
                  label="Push image on main"
                  description="Push to the configured registry when main is updated."
                  checked={includePush}
                  onChange={setIncludePush}
                  disabled={!includeDocker}
                />
                <OptionRow
                  id="opt-ai"
                  label="Explain with AI"
                  description="Ask the AI to produce a human-readable explanation."
                  checked={explainAi}
                  onChange={setExplainAi}
                />
                <div className="space-y-2">
                  <Label htmlFor="opt-registry">Registry</Label>
                  <Input
                    id="opt-registry"
                    value={registry}
                    onChange={(e) => setRegistry(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </SectionCard>

            <Card className="space-y-3 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Workflow status
              </p>
              <div className="flex items-center gap-2">
                <CiStatusBadge
                  status={
                    pr
                      ? "pr_created"
                      : approved
                        ? "approved"
                        : adapted
                          ? "adapted"
                          : preview
                            ? "generated"
                            : "draft"
                  }
                />
                {preview ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {preview.workflow_path}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <StepLine
                  done={Boolean(preview)}
                  label="Preview generated"
                />
                <StepLine
                  done={Boolean(adapted)}
                  optional
                  label="Adapted with AI"
                />
                <StepLine done={approved} label="Approved" />
                <StepLine done={Boolean(pr)} label="Pull Request opened" />
              </div>
            </Card>

            <Card className="space-y-3 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Required secrets
              </p>
              {!preview ? (
                <p className="text-sm text-muted-foreground">
                  Generate a preview to see the secrets needed by the workflow.
                </p>
              ) : requiredSecrets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  The generated workflow does not require any secret.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {requiredSecrets.map((key) => {
                    const has = existingSecretKeys.has(key);
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-mono text-xs">{key}</span>
                        <Badge variant={has ? "success" : "warning"}>
                          {has ? "Configured" : "Missing"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
              {projectId ? (
                <Button size="sm" variant="outline" asChild className="w-full">
                  <Link to={`/projects/${projectId}/secrets`}>
                    <KeyRound className="h-3.5 w-3.5" />
                    Manage secrets
                  </Link>
                </Button>
              ) : null}
            </Card>
          </div>

          {missingSecrets.length > 0 && preview ? (
            <Card className="flex items-start gap-3 border-warning/30 bg-warning/5 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Missing secrets detected
                </p>
                <p className="text-muted-foreground">
                  The workflow expects{" "}
                  <span className="font-mono">{missingSecrets.join(", ")}</span>{" "}
                  but they are not configured for this project. The Pull Request
                  can still be opened, but the workflow will fail until secrets
                  are added.
                </p>
              </div>
            </Card>
          ) : null}

          {!preview ? (
            <EmptyState
              icon={Workflow}
              title="No preview yet"
              description="Pick the options above and click Generate CI preview to scaffold a workflow."
              action={
                <Button
                  onClick={() => previewMutation.mutate()}
                  loading={previewMutation.isPending}
                >
                  <Workflow className="h-4 w-4" />
                  Generate CI preview
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {adapted ? "Adapted YAML" : "Generated YAML"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAdaptOpen(true)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Ask AI to adapt
                    </Button>
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

                <YamlViewer
                  yaml={activeYaml}
                  filename={preview.workflow_path}
                />

                {adapted && adapted.diff_summary.length > 0 ? (
                  <Card className="border-primary/30 bg-primary/[0.04] p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Adaptation summary
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {adapted.diff_summary.map((d, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null}
              </div>

              <div className="space-y-3">
                <Card className="p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Explanation
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {activeExplanation ||
                      "No explanation was generated for this workflow."}
                  </p>
                </Card>

                {pr ? (
                  <Card className="border-success/30 bg-success/5 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-success">
                      Pull Request opened
                    </p>
                    <p className="mt-1 text-sm">
                      Branch{" "}
                      <span className="font-mono text-foreground">
                        {pr.branch_name}
                      </span>{" "}
                      is ready for review.
                    </p>
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
                ) : null}

                {!approved && !pr ? (
                  <Card className="flex items-start gap-3 border-info/30 bg-info/5 p-4 text-sm">
                    <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                    <p className="text-muted-foreground">
                      Review the workflow, optionally adapt it with AI, then
                      approve before opening a Pull Request.
                    </p>
                  </Card>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      <AdaptDialog
        open={adaptOpen}
        loading={adaptMutation.isPending}
        onOpenChange={setAdaptOpen}
        onSubmit={(instruction) => adaptMutation.mutate(instruction)}
      />

      <CreatePrDialog
        open={prOpen}
        defaultBranch={repoQuery.data?.default_branch ?? "main"}
        loading={createPrMutation.isPending}
        onOpenChange={setPrOpen}
        onSubmit={(input) => createPrMutation.mutate(input)}
      />
    </div>
  );
}

function OptionRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function StepLine({
  done,
  label,
  optional,
}: {
  done: boolean;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          done ? "bg-success" : "bg-muted-foreground/30"
        }`}
      />
      <span className={done ? "text-foreground" : ""}>{label}</span>
      {optional ? (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          optional
        </span>
      ) : null}
    </div>
  );
}
