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
              <Card className="h-full p-5 transition-all hover:border-primary/40 hover:bg-primary/[0.03]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <RoleBadge role={p.role} />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-base font-semibold tracking-tight text-foreground">
                    {p.name}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {p.slug}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
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
