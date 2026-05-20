import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  FolderKanban,
  GitBranch,
  GitPullRequest,
  KeyRound,
  LayoutDashboard,
  Microscope,
  Workflow,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { MetricSkeletonGrid } from "@/components/common/loading-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { dashboardService } from "@/services/dashboard.service";
import { useAuth } from "@/hooks/use-auth";
import { formatRelative } from "@/lib/utils";

export function DashboardPage() {
  const { user } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardService.summary(),
  });

  const firstName = user?.full_name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        icon={LayoutDashboard}
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description="A real-time view of the projects, repositories and CI pipelines you onboarded on the platform."
        actions={
          <Button asChild>
            <Link to="/projects">
              <FolderKanban className="h-4 w-4" />
              Go to projects
            </Link>
          </Button>
        }
      />

      {summaryQuery.isLoading ? (
        <MetricSkeletonGrid count={4} />
      ) : summaryQuery.isError ? (
        <ErrorState
          error={summaryQuery.error}
          title="Could not load dashboard"
          onRetry={() => summaryQuery.refetch()}
        />
      ) : (
        (() => {
          const s = summaryQuery.data!;
          const hasAnything =
            s.projects_count +
              s.repositories_count +
              s.ci_generated_count +
              s.secrets_count >
            0;

          if (!hasAnything) {
            return (
              <EmptyState
                icon={FolderKanban}
                title="Your platform is ready"
                description="Create your first project to import a repository, generate a CI workflow and open a Pull Request."
                action={
                  <Button asChild>
                    <Link to="/projects">Create a project</Link>
                  </Button>
                }
              />
            );
          }

          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Projects"
                  value={s.projects_count}
                  icon={FolderKanban}
                  tone="violet"
                />
                <MetricCard
                  label="Repositories"
                  value={s.repositories_count}
                  icon={GitBranch}
                  tone="blue"
                  hint={`${s.repositories_analyzed_count} analyzed`}
                />
                <MetricCard
                  label="CI generated"
                  value={s.ci_generated_count}
                  icon={Workflow}
                  tone="violet"
                  hint={`${s.ci_pr_created_count} merged to PR`}
                />
                <MetricCard
                  label="Secrets"
                  value={s.secrets_count}
                  icon={KeyRound}
                  tone="emerald"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <SectionCard
                  title="Recent activity"
                  description="The latest platform events across your projects."
                  className="lg:col-span-2"
                >
                  {s.recent_events.length === 0 ? (
                    <EmptyState
                      icon={Activity}
                      title="No activity yet"
                      description="Once you import a repository, events will show up here in real-time."
                    />
                  ) : (
                    <ul className="-mx-2 space-y-0.5">
                      {s.recent_events.map((event, idx) => {
                        const tone = toneForEvent(event.type);
                        return (
                          <li
                            key={`${event.type}-${idx}`}
                            className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-elevated/60"
                          >
                            <div
                              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${tone}`}
                            >
                              <ActivityIconFor type={event.type} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-foreground">
                                {event.message}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
                                  {event.type}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                                <span>{formatRelative(event.created_at)}</span>
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard
                  title="Quick actions"
                  description="Common onboarding steps from one place."
                >
                  <div className="grid gap-2">
                    <QuickAction
                      to="/projects"
                      icon={FolderKanban}
                      label="Manage projects"
                    />
                    <QuickAction
                      to="/github"
                      icon={GitBranch}
                      label="Connect GitHub"
                    />
                    <QuickAction
                      to="/audit"
                      icon={Activity}
                      label="See audit log"
                    />
                    <QuickAction
                      to="/projects"
                      icon={GitPullRequest}
                      label="Open onboarding flow"
                    />
                  </div>
                </SectionCard>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}

function ActivityIconFor({ type }: { type: string }) {
  if (type.startsWith("ci.")) return <Workflow className="h-3.5 w-3.5" />;
  if (type.includes("analyzed")) return <Microscope className="h-3.5 w-3.5" />;
  if (type.includes("repository")) return <GitBranch className="h-3.5 w-3.5" />;
  if (type.includes("pr")) return <GitPullRequest className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5" />;
}

function toneForEvent(type: string): string {
  if (type.startsWith("ci.")) return "bg-primary/10 text-primary ring-primary/20";
  if (type.includes("analyzed")) return "bg-accent/10 text-accent ring-accent/25";
  if (type.includes("pr")) return "bg-success/10 text-success ring-success/25";
  if (type.includes("repository"))
    return "bg-warning/10 text-warning ring-warning/25";
  return "bg-primary/10 text-primary ring-primary/20";
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof FolderKanban;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-3 rounded-lg border border-border bg-surface/40 px-3 py-2.5 text-sm text-foreground transition-all hover:-translate-y-px hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-[0_6px_20px_-12px_rgba(168,85,247,0.5)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-colors group-hover:bg-primary/15 group-hover:ring-primary/40">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate font-medium">{label}</span>
      <span className="text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary">
        →
      </span>
    </Link>
  );
}
