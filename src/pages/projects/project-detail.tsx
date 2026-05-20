import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  GitBranch,
  KeyRound,
  Settings2,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  OnboardingStatusBadge,
  RoleBadge,
  StackBadge,
} from "@/components/common/status-badge";
import { projectService } from "@/services/project.service";
import { repositoryService } from "@/services/repository.service";

function initials(name: string): string {
  return name
    .split(/[\s@.]/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.get(id),
  });

  const reposQuery = useQuery({
    queryKey: ["project", id, "repositories"],
    queryFn: () => repositoryService.list(id),
    enabled: Boolean(id),
  });

  if (projectQuery.isLoading) return <LoadingState rows={3} />;
  if (projectQuery.isError)
    return (
      <ErrorState
        error={projectQuery.error}
        title="Could not load project"
        onRetry={() => projectQuery.refetch()}
      />
    );

  const project = projectQuery.data!;
  const repos = reposQuery.data?.items ?? [];
  const ownerRole = project.members?.find(
    (m) => m.user_id === project.owner_id,
  )?.role;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`/${project.slug}`}
        title={project.name}
        description={project.description ?? "No description provided yet."}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/projects/${id}/secrets`}>
                <KeyRound className="h-4 w-4" />
                Secrets
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/projects/${id}/settings`}>
                <Settings2 className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button asChild>
              <Link to="/github">
                <GitBranch className="h-4 w-4" />
                Import from GitHub
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Repositories"
          description="Source repositories linked to this project."
          className="lg:col-span-2"
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link to={`/projects/${id}/repositories`}>
                Manage
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        >
          {reposQuery.isLoading ? (
            <LoadingState rows={2} />
          ) : reposQuery.isError ? (
            <ErrorState
              error={reposQuery.error}
              title="Could not load repositories"
              onRetry={() => reposQuery.refetch()}
            />
          ) : repos.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No repositories yet"
              description="Connect GitHub then import a repository to get started."
              action={
                <Button asChild>
                  <Link to="/github">Connect GitHub</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {repos.slice(0, 6).map((r) => (
                <li key={r.id} className="py-3">
                  <Link
                    to={`/repositories/${r.id}`}
                    className="group flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
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
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Members"
            description={`${project.members?.length ?? 0} member${(project.members?.length ?? 0) === 1 ? "" : "s"}`}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link to={`/projects/${id}/settings`}>
                  <Users className="h-3.5 w-3.5" />
                  Manage
                </Link>
              </Button>
            }
          >
            <ul className="space-y-3">
              {(project.members ?? []).map((m) => (
                <li key={m.user_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials(m.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {m.email}
                    </p>
                  </div>
                  <RoleBadge role={m.role} />
                </li>
              ))}
              {project.members && project.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Only you have access to this project so far.
                </p>
              ) : null}
            </ul>
          </SectionCard>

          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Project info
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-mono text-xs">{project.slug}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Owner role</dt>
                <dd>{ownerRole ? <RoleBadge role={ownerRole} /> : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Repositories</dt>
                <dd className="tabular-nums">{repos.length}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
