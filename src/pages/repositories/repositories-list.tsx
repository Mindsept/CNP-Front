import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GitBranch, Github } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  OnboardingStatusBadge,
  StackBadge,
} from "@/components/common/status-badge";
import { repositoryService } from "@/services/repository.service";
import { projectService } from "@/services/project.service";
import { formatRelative } from "@/lib/utils";

export function RepositoriesListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.get(id),
  });

  const reposQuery = useQuery({
    queryKey: ["project", id, "repositories"],
    queryFn: () => repositoryService.list(id),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={projectQuery.data ? `/${projectQuery.data.slug}` : "—"}
        icon={GitBranch}
        back={{
          to: `/projects/${id}`,
          label: projectQuery.data?.name ?? "project",
        }}
        title="Repositories"
        description="Imported repositories live here. Open one to analyze its stack and generate a CI workflow."
        actions={
          <Button asChild>
            <Link to="/github/installations">
              <Github className="h-4 w-4" />
              Import from GitHub
            </Link>
          </Button>
        }
      />

      {reposQuery.isLoading ? (
        <LoadingState rows={3} />
      ) : reposQuery.isError ? (
        <ErrorState
          error={reposQuery.error}
          title="Could not load repositories"
          onRetry={() => reposQuery.refetch()}
        />
      ) : reposQuery.data?.items.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No repositories imported yet"
          description="Connect GitHub and import a repository into this project."
          action={
            <Button asChild>
              <Link to="/github/installations">Import from GitHub</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {reposQuery.data!.items.map((r) => (
            <Link key={r.id} to={`/repositories/${r.id}`} className="block">
              <Card className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {r.full_name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StackBadge stack={r.detected_stack} />
                    <OnboardingStatusBadge status={r.onboarding_status} />
                    {r.dockerfile_present ? (
                      <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                        Dockerfile
                      </span>
                    ) : null}
                    {r.ci_present ? (
                      <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                        CI present
                      </span>
                    ) : null}
                    {r.last_analyzed_at ? (
                      <span className="text-[10px] text-muted-foreground">
                        analyzed {formatRelative(r.last_analyzed_at)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
