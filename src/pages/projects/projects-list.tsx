import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  FolderKanban,
  GitBranch,
  Plus,
  Search,
  LayoutGrid,
  List,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoleBadge } from "@/components/common/status-badge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { projectService } from "@/services/project.service";
import { cn, formatRelative } from "@/lib/utils";

export function ProjectsListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.list(),
  });
  const projects = projectsQuery.data?.items ?? [];
  const filtered = projects.filter((p) =>
    (p.name + " " + p.slug).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="A shared home for your repositories, deployments and observability."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="h-10 pl-9"
            aria-label="Filter projects"
            placeholder="Find a project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {projectsQuery.isSuccess
              ? `${filtered.length} of ${projects.length} projects`
              : "Your projects"}
          </span>
          <div
            className="flex rounded-md border border-border p-0.5"
            role="group"
            aria-label="Project display"
          >
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List />
            </Button>
          </div>
        </div>
      </div>
      {projectsQuery.isLoading ? (
        <LoadingState rows={3} />
      ) : projectsQuery.isError ? (
        <ErrorState
          error={projectsQuery.error}
          title="Could not load projects"
          onRetry={() => projectsQuery.refetch()}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Your next project starts here"
          description="Create a project, connect a repository and prepare your first deployment."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus />
              New project
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching projects"
          description="Try another name or clear your search."
          action={
            <Button variant="outline" onClick={() => setSearch("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div
          className={cn(
            "grid gap-4",
            view === "grid" ? "md:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1",
          )}
        >
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="group min-w-0 rounded-lg"
            >
              <Card
                className={cn(
                  "h-full transition-colors group-hover:border-primary/50 group-hover:bg-surface-elevated/60",
                  view === "grid"
                    ? "p-6"
                    : "flex flex-wrap items-center gap-5 p-5",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background/50 text-primary">
                    <FolderKanban className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  {view === "grid" && <RoleBadge role={p.role} />}
                </div>
                <div
                  className={cn("min-w-0 flex-1", view === "grid" && "mt-6")}
                >
                  <h2 className="truncate text-lg font-medium tracking-tight group-hover:text-primary">
                    {p.name}
                  </h2>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {p.slug}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex items-center justify-between gap-4 text-xs text-muted-foreground",
                    view === "grid" && "mt-7 border-t border-border pt-4",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5" />
                    {p.repositories_count}{" "}
                    {p.repositories_count === 1 ? "repository" : "repositories"}
                  </span>
                  <span>{formatRelative(p.created_at)}</span>
                  <ArrowUpRight
                    className="h-4 w-4 text-muted-foreground group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
