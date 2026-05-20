import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, GitBranch, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RoleBadge } from "@/components/common/status-badge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { projectService } from "@/services/project.service";
import { formatRelative } from "@/lib/utils";

export function ProjectsListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.list(),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        icon={FolderKanban}
        title="Projects"
        description="A project groups together repositories, CI pipelines and the secrets needed to run them."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />

      {projectsQuery.isLoading ? (
        <LoadingState rows={3} />
      ) : projectsQuery.isError ? (
        <ErrorState
          error={projectsQuery.error}
          title="Could not load projects"
          onRetry={() => projectsQuery.refetch()}
        />
      ) : projectsQuery.data?.items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsQuery.data.items.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="group">
              <Card className="relative h-full overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_50px_-20px_rgba(168,85,247,0.45)]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/15 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-primary ring-1 ring-inset ring-primary/25 transition-transform duration-200 group-hover:scale-105">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <RoleBadge role={p.role} />
                </div>
                <div className="relative mt-4 space-y-1">
                  <p className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {p.name}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {p.slug}
                  </p>
                </div>
                <div className="relative mt-5 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" />
                    {p.repositories_count}{" "}
                    {p.repositories_count === 1
                      ? "repository"
                      : "repositories"}
                  </span>
                  <span>Created {formatRelative(p.created_at)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start importing repositories and generating CI workflows."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          }
        />
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
