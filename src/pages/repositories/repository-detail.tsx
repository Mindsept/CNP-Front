import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, GitBranch, Github, Microscope, Workflow } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  OnboardingStatusBadge,
  StackBadge,
} from "@/components/common/status-badge";
import { repositoryService } from "@/services/repository.service";
import { ciService } from "@/services/ci.service";
import { CiStatusBadge } from "@/components/common/status-badge";
import { formatRelative } from "@/lib/utils";

export function RepositoryDetailPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const id = repositoryId!;
  const navigate = useNavigate();

  const repoQuery = useQuery({
    queryKey: ["repository", id],
    queryFn: () => repositoryService.get(id),
  });

  const analysisQuery = useQuery({
    queryKey: ["repository", id, "analysis", "latest"],
    queryFn: () => repositoryService.latestAnalysis(id),
    enabled: Boolean(id),
  });

  const pipelinesQuery = useQuery({
    queryKey: ["repository", id, "ci"],
    queryFn: () => ciService.list(id),
    enabled: Boolean(id),
  });

  if (repoQuery.isLoading) return <LoadingState rows={3} />;
  if (repoQuery.isError)
    return (
      <ErrorState
        error={repoQuery.error}
        title="Could not load repository"
        onRetry={() => repoQuery.refetch()}
      />
    );

  const repo = repoQuery.data!;
  const analysis = analysisQuery.data;
  const pipelines = pipelinesQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={repo.provider ?? "Repository"}
        back={{
          to: repo.project_id
            ? `/projects/${repo.project_id}/repositories`
            : undefined,
          label: "repositories",
        }}
        title={repo.full_name}
        description={`Default branch: ${repo.default_branch}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={repo.html_url} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                Open on GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild>
              <Link to={`/repositories/${id}/ci`}>
                <Workflow className="h-4 w-4" />
                CI workflow
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="ci">CI</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                <Field label="Provider" value={repo.provider ?? "github"} />
                <Field
                  label="Default branch"
                  value={
                    <span className="font-mono text-foreground">
                      {repo.default_branch}
                    </span>
                  }
                />
                <Field
                  label="Status"
                  value={
                    <OnboardingStatusBadge status={repo.onboarding_status} />
                  }
                />
                <Field
                  label="Detected stack"
                  value={<StackBadge stack={repo.detected_stack} />}
                />
                <Field
                  label="Dockerfile"
                  value={
                    <Badge
                      variant={repo.dockerfile_present ? "success" : "muted"}
                    >
                      {repo.dockerfile_present ? "Present" : "Missing"}
                    </Badge>
                  }
                />
                <Field
                  label="CI workflow"
                  value={
                    <Badge variant={repo.ci_present ? "success" : "muted"}>
                      {repo.ci_present ? "Present" : "Missing"}
                    </Badge>
                  }
                />
              </div>
            </Card>

            <Card className="space-y-3 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Next steps
              </p>
              <Action
                label="Analyze repository"
                description="Detect the stack and tests."
                onClick={() => navigate(`/repositories/${id}/analysis`)}
                icon={<Microscope className="h-4 w-4 text-primary" />}
              />
              <Action
                label="Generate CI"
                description="Preview a workflow."
                onClick={() => navigate(`/repositories/${id}/ci`)}
                icon={<Workflow className="h-4 w-4 text-primary" />}
              />
              <Action
                label="Browse repositories"
                description="Back to project repositories."
                onClick={() =>
                  navigate(`/projects/${repo.project_id}/repositories`)
                }
                icon={<GitBranch className="h-4 w-4 text-primary" />}
              />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <SectionCard
            title="Latest analysis"
            description="Detected stack, files and recommended commands."
            actions={
              <Button asChild size="sm">
                <Link to={`/repositories/${id}/analysis`}>Open analysis</Link>
              </Button>
            }
          >
            {analysisQuery.isLoading ? (
              <LoadingState rows={2} />
            ) : analysisQuery.isError ? (
              <ErrorState
                error={analysisQuery.error}
                title="Could not load analysis"
                onRetry={() => analysisQuery.refetch()}
              />
            ) : !analysis ? (
              <p className="text-sm text-muted-foreground">
                This repository hasn&apos;t been analyzed yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <Field
                  label="Stack"
                  value={<StackBadge stack={analysis.detected_stack} />}
                />
                <Field
                  label="Confidence"
                  value={`${Math.round((analysis.confidence ?? 0) * 100)}%`}
                />
                <Field
                  label="Tests"
                  value={
                    analysis.test_detected
                      ? analysis.test_command || "Yes"
                      : "Not detected"
                  }
                />
                <Field
                  label="Analyzed"
                  value={formatRelative(analysis.created_at)}
                />
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="ci">
          <SectionCard
            title="CI pipelines"
            description="Every generated and adapted CI pipeline for this repository."
            actions={
              <Button asChild size="sm">
                <Link to={`/repositories/${id}/ci`}>Open CI workspace</Link>
              </Button>
            }
          >
            {pipelinesQuery.isLoading ? (
              <LoadingState rows={2} />
            ) : pipelinesQuery.isError ? (
              <ErrorState
                error={pipelinesQuery.error}
                title="Could not load CI pipelines"
                onRetry={() => pipelinesQuery.refetch()}
              />
            ) : pipelines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pipelines yet. Generate the first preview from the CI tab.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {pipelines.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {p.workflow_path}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.generation_mode} · {formatRelative(p.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CiStatusBadge status={p.status} />
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
        </TabsContent>

        <TabsContent value="activity">
          <SectionCard
            title="Activity"
            description="Recent platform events for this repository."
          >
            <p className="text-sm text-muted-foreground">
              Detailed timeline coming soon. For now, check the global{" "}
              <Link to="/audit" className="text-primary hover:underline">
                Audit log
              </Link>
              .
            </p>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function Action({
  label,
  description,
  onClick,
  icon,
}: {
  label: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-md border border-border bg-surface/40 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
    >
      <span>{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
        →
      </span>
    </button>
  );
}
