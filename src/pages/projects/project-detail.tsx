import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  GitBranch,
  Database,
  KeyRound,
  Settings2,
  Users,
  Box,
  Activity,
  Rocket,
  Layers2,
  Cloud,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  OnboardingStatusBadge,
  RoleBadge,
  StackBadge,
} from "@/components/common/status-badge";
import { ProjectDeploymentsSection } from "@/components/cd/project-deployments-section";
import { ProjectObservabilityCard } from "@/components/observability/project-observability-card";
import { projectService } from "@/services/project.service";
import { repositoryService } from "@/services/repository.service";
import { cloudTargetService } from "@/services/cloud-target.service";
import { useAuth } from "@/hooks/use-auth";

const projectViews = ["overview", "deployments", "observability", "members"];
export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;
  const { user } = useAuth();
  const [search, setSearch] = useSearchParams();
  const view = projectViews.includes(search.get("view") ?? "")
    ? search.get("view")!
    : "overview";
  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.get(id),
  });
  const reposQuery = useQuery({
    queryKey: ["project", id, "repositories"],
    queryFn: () => repositoryService.list(id),
    enabled: Boolean(id),
  });
  const targetsQuery = useQuery({
    queryKey: ["project", id, "cloud-targets"],
    queryFn: () => cloudTargetService.list(id),
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
  const targets = targetsQuery.data?.items ?? [];
  const role = project.members?.find((m) => m.user_id === user?.id)?.role;
  const canProvision =
    user?.role === "admin" || role === "owner" || role === "maintainer";
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Project workspace"
        icon={Layers2}
        back={{ to: "/projects", label: "Projects" }}
        title={project.name}
        description={
          project.description ||
          "Repositories, infrastructure and telemetry in one workspace."
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/projects/${id}/settings`}>
                <Settings2 />
                Settings
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/projects/${id}/repositories`}>
                <GitBranch />
                Manage repositories
              </Link>
            </Button>
          </>
        }
      />
      <Tabs
        value={view}
        onValueChange={(value) =>
          setSearch((current) => {
            const next = new URLSearchParams(current);
            next.set("view", value);
            return next;
          })
        }
      >
        <TabsList aria-label="Project sections">
          <TabsTrigger value="overview">
            <Box className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="deployments">
            <Rocket className="h-4 w-4" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="observability">
            <Activity className="h-4 w-4" />
            Observability
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-5">
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Repositories
                  {reposQuery.isSuccess && (
                    <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {repos.length}
                    </span>
                  )}
                </span>
              }
              description="Source code and onboarding status."
              contentClassName="p-0"
            >
              {reposQuery.isLoading ? (
                <div className="p-5">
                  <LoadingState rows={2} />
                </div>
              ) : reposQuery.isError ? (
                <div className="p-5">
                  <ErrorState
                    error={reposQuery.error}
                    title="Could not load repositories"
                    onRetry={() => reposQuery.refetch()}
                  />
                </div>
              ) : !repos.length ? (
                <EmptyState
                  icon={GitBranch}
                  title="Connect your first repository"
                  description="Import a GitHub repository into this project to get started."
                  action={
                    <Button asChild>
                      <Link to={`/projects/${id}/repositories`}>
                        Import a repository
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="data-table min-w-[640px]">
                    <caption>
                      Project repositories and onboarding status
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Repository</th>
                        <th scope="col">Stack</th>
                        <th scope="col">Onboarding</th>
                        <th scope="col">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {repos.slice(0, 8).map((r) => (
                        <tr key={r.id}>
                          <td>
                            <Link
                              to={`/repositories/${r.id}`}
                              className="group flex min-w-[170px] items-center gap-3"
                            >
                              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground sm:flex">
                                <Box className="h-4 w-4" />
                              </span>
                              <span>
                                <span className="block font-medium group-hover:text-primary">
                                  {r.full_name.split("/").pop()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {r.full_name.split("/")[0]}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td>
                            <StackBadge stack={r.detected_stack} />
                          </td>
                          <td>
                            <OnboardingStatusBadge
                              status={r.onboarding_status}
                            />
                          </td>
                          <td>
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/repositories/${r.id}/cd`}>
                                Deploy
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {repos.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                  <p className="text-xs text-muted-foreground">
                    {Math.min(repos.length, 8)} shown · Onboarding is separate
                    from runtime health.
                  </p>
                  <Link
                    className="section-link text-xs"
                    to={`/projects/${id}/repositories`}
                  >
                    All repositories
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </SectionCard>
            <Card className="p-5">
              <p className="eyebrow">Project details</p>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Project slug
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs">
                    {project.slug}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Your access</dt>
                  <dd>
                    {role ? (
                      <RoleBadge role={role} />
                    ) : user?.role === "admin" ? (
                      "Administrator"
                    ) : (
                      "Not available"
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Members</dt>
                  <dd>{project.members?.length ?? "—"}</dd>
                </div>
              </dl>
              <div className="mt-5 space-y-1 border-t border-border pt-3">
                <Link
                  to={`/projects/${id}/secrets`}
                  className="section-link flex"
                >
                  <KeyRound className="h-4 w-4" />
                  Project secrets
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                </Link>
                <Link
                  to={`/projects/${id}/settings`}
                  className="section-link flex"
                >
                  <Settings2 className="h-4 w-4" />
                  Configuration
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          </div>
          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" />
                Infrastructure
              </span>
            }
            description="Configured deployment targets. A saved target does not confirm that its cluster is running."
          >
            {targetsQuery.isPending ? (
              <LoadingState rows={1} />
            ) : targetsQuery.isError ? (
              <ErrorState
                title="Could not load cloud targets"
                error={targetsQuery.error}
                onRetry={() => targetsQuery.refetch()}
              />
            ) : targets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deployment target configured. Add one in project settings.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {targets.map((target) => (
                  <div
                    key={target.id}
                    className="flex min-w-0 flex-wrap items-center gap-3 rounded-md border border-border bg-background/30 p-4"
                  >
                    <Cloud className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">
                        {target.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {target.provider} · {target.cluster_type} ·{" "}
                        {target.environment}
                      </p>
                    </div>
                    <Badge variant="muted">Configured</Badge>
                  </div>
                ))}
              </div>
            )}
            {canProvision && (
              <div className="mt-4 flex flex-wrap gap-3">
                {targets.some(
                  (t) => t.provider === "azure" && t.cluster_type === "aks",
                ) && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/projects/${id}/azure-environment`}>
                      <Database />
                      Azure databases
                    </Link>
                  </Button>
                )}
                {targets.some(
                  (t) => t.provider === "aws" && t.cluster_type === "eks",
                ) && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/projects/${id}/aws-environment`}>
                      <Database />
                      AWS databases
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </SectionCard>
          <ProjectDeploymentsSection projectId={id} />
        </TabsContent>
        <TabsContent value="deployments">
          <ProjectDeploymentsSection projectId={id} />
        </TabsContent>
        <TabsContent value="observability">
          <ProjectObservabilityCard projectId={id} targets={targets} />
        </TabsContent>
        <TabsContent value="members">
          <SectionCard
            title="Project members"
            description="People who can access this workspace."
            actions={
              <Button variant="outline" asChild size="sm">
                <Link to={`/projects/${id}/settings`}>
                  <Users />
                  Manage members
                </Link>
              </Button>
            }
          >
            <ul className="divide-y divide-border">
              {(project.members ?? []).map((member) => (
                <li
                  key={member.user_id}
                  className="flex items-center gap-3 py-4"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-secondary text-foreground">
                      {member.email.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {member.email}
                  </span>
                  <RoleBadge role={member.role} />
                </li>
              ))}
            </ul>
            {!project.members?.length && (
              <p className="text-sm text-muted-foreground">
                No member information available.
              </p>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
