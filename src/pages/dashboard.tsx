import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  FolderKanban,
  GitBranch,
  GitPullRequest,
  KeyRound,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import {
  MetricSkeletonGrid,
  LoadingState,
} from "@/components/common/loading-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { dashboardService } from "@/services/dashboard.service";
import { projectService } from "@/services/project.service";
import { useAuth } from "@/hooks/use-auth";
import { formatRelative } from "@/lib/utils";

export function DashboardPage() {
  const { user } = useAuth();
  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardService.summary(),
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.list(),
  });
  const firstName = user?.full_name?.split(" ")[0];
  const s = summary.data;
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace overview"
        title={firstName ? `Welcome back, ${firstName}` : "Your workspace"}
        description="From repository to running application. Keep your projects, delivery and operations in view."
        actions={
          <Button asChild>
            <Link to="/projects">
              <FolderKanban className="h-4 w-4" />
              Open projects
            </Link>
          </Button>
        }
      />
      {summary.isPending ? (
        <MetricSkeletonGrid count={4} />
      ) : summary.isError ? (
        <ErrorState
          error={summary.error}
          title="Could not load dashboard"
          onRetry={() => void summary.refetch()}
        />
      ) : (
        s && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Projects"
              value={s.projects_count}
              icon={FolderKanban}
            />
            <MetricCard
              label="Repositories"
              value={s.repositories_count}
              icon={GitBranch}
              hint={`${s.repositories_analyzed_count} analyzed`}
            />
            <MetricCard
              label="CI workflows generated"
              value={s.ci_generated_count}
              icon={Workflow}
              hint={`${s.ci_pr_created_count} PRs created`}
            />
            <MetricCard
              label="Managed secrets"
              value={s.secrets_count}
              icon={KeyRound}
            />
          </div>
        )
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            title="Your projects"
            description="Open a project to manage its applications and infrastructure."
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects">
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          >
            {projects.isPending ? (
              <LoadingState rows={3} />
            ) : projects.isError ? (
              <ErrorState
                error={projects.error}
                title="Could not load projects"
                onRetry={() => void projects.refetch()}
              />
            ) : !projects.data.items.length ? (
              <EmptyState
                icon={FolderKanban}
                title="Start with a project"
                description="Group repositories, connect GitHub and prepare your first delivery."
                action={
                  <Button asChild>
                    <Link to="/projects">Create a project</Link>
                  </Button>
                }
              />
            ) : (
              <div className="-mx-5 -my-5 divide-y divide-border">
                {projects.data.items.slice(0, 6).map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="group flex min-h-[88px] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-elevated/60"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                      <FolderKanban className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium group-hover:text-primary">
                        {p.name}
                      </span>
                      <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                        {p.slug}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.repositories_count} repos
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkspaceLink
              to="/github"
              icon={GitBranch}
              title="GitHub connections"
              description="Connect repositories to your workspace."
            />
            <WorkspaceLink
              to="/mcp/reviews"
              icon={GitPullRequest}
              title="Human reviews"
              description="Inspect changes before they are executed."
            />
          </div>
        </div>
        <SectionCard
          title="Activity feed"
          description="Latest recorded platform events."
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/audit" aria-label="Open audit log">
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {summary.isPending ? (
            <LoadingState rows={4} />
          ) : summary.isError ? (
            <p className="text-sm text-muted-foreground">
              Activity is unavailable while the dashboard cannot be loaded.
            </p>
          ) : !s?.recent_events.length ? (
            <p className="py-6 text-sm text-muted-foreground">
              Events appear here when you work on a project.
            </p>
          ) : (
            <ol className="space-y-0">
              {s.recent_events.map((event, index) => (
                <li
                  key={`${event.type}-${event.created_at}-${index}`}
                  className="relative flex gap-3 pb-6 last:pb-0"
                >
                  <span
                    className="absolute bottom-0 left-[13px] top-7 w-px bg-border"
                    aria-hidden="true"
                  />
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                    <Activity className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="break-words text-sm leading-5">
                      {event.message}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatRelative(event.created_at)}
                      <span className="mx-2">·</span>
                      <span className="break-all font-mono text-[10px]">
                        {event.type}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function WorkspaceLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: typeof GitBranch;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-lg border border-border p-5 transition-colors hover:bg-surface"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
