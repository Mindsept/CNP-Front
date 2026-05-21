import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, ExternalLink, Github, Lock, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ImportRepoDialog } from "@/components/github/import-repo-dialog";
import { githubService } from "@/services/github.service";
import { projectService } from "@/services/project.service";
import type { GitHubRepository } from "@/types/github";

export function GithubInstallationsPage() {
  const navigate = useNavigate();

  const installationsQuery = useQuery({
    queryKey: ["github", "installations"],
    queryFn: () => githubService.installations(),
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.list(),
  });

  const installations = installationsQuery.data?.items ?? [];
  const [selectedInstallationId, setSelectedInstallationId] = useState<
    string | null
  >(null);

  const effectiveInstallationId =
    selectedInstallationId ?? installations[0]?.id ?? null;

  const repositoriesQuery = useQuery({
    queryKey: ["github", "installations", effectiveInstallationId, "repos"],
    queryFn: () =>
      githubService.installationRepositories(effectiveInstallationId!),
    enabled: Boolean(effectiveInstallationId),
  });

  const [filter, setFilter] = useState("");
  const [importTarget, setImportTarget] = useState<GitHubRepository | null>(
    null,
  );

  const filtered = (repositoriesQuery.data?.items ?? []).filter((r) =>
    r.full_name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Integrations"
        icon={Github}
        back={{ to: "/github", label: "GitHub" }}
        title="GitHub installations"
        description="Pick an installation, then import any accessible repository into a project."
        actions={
          <Button
            variant="outline"
            onClick={() => installationsQuery.refetch()}
            loading={installationsQuery.isRefetching}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {installationsQuery.isLoading ? (
        <LoadingState rows={2} />
      ) : installationsQuery.isError ? (
        <ErrorState
          error={installationsQuery.error}
          title="Could not load installations"
          onRetry={() => installationsQuery.refetch()}
        />
      ) : installations.length === 0 ? (
        <EmptyState
          icon={Github}
          title="No GitHub installations yet"
          description="Install the platform's GitHub App on at least one organization or account before importing repositories."
          action={
            <Button onClick={() => navigate("/github")}>
              <Github className="h-4 w-4" />
              Connect GitHub
            </Button>
          }
        />
      ) : (
        <>
          <SectionCard
            title="Installation"
            description="The set of repositories you can import depends on the installation you select."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {installations.map((inst) => {
                const active = effectiveInstallationId === inst.id;
                return (
                  <button
                    key={inst.id}
                    onClick={() => setSelectedInstallationId(inst.id)}
                    className={`group flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-surface/40 hover:border-primary/30 hover:bg-primary/[0.04]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary/60 ring-1 ring-inset ring-border">
                        <Github className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {inst.github_account_login}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inst.github_account_type} ·{" "}
                          {inst.repository_selection}
                        </p>
                      </div>
                    </div>
                    {active ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Accessible repositories"
            description="Pick a repository to import into one of your projects."
            actions={
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter repositories…"
                className="h-9 w-56"
              />
            }
          >
            {repositoriesQuery.isLoading ? (
              <LoadingState rows={3} />
            ) : repositoriesQuery.isError ? (
              <ErrorState
                error={repositoriesQuery.error}
                title="Could not load repositories"
                onRetry={() => repositoriesQuery.refetch()}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Github}
                title="No repositories match"
                description={
                  filter
                    ? "Try another search keyword."
                    : "This installation has no accessible repositories."
                }
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {filtered.map((repo) => (
                  <li
                    key={repo.github_repo_id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {repo.full_name}
                        </p>
                        {repo.private ? (
                          <span className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            private
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        default branch:{" "}
                        <span className="font-mono text-foreground/80">
                          {repo.default_branch}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" asChild>
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                      </Button>
                      <Button size="sm" onClick={() => setImportTarget(repo)}>
                        Import
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {projectsQuery.isLoading ? null : projectsQuery.data?.items.length ===
            0 ? (
            <Card className="border-warning/30 bg-warning/5 p-4 text-sm">
              You haven&apos;t created a project yet. Create one before importing
              a repository.
            </Card>
          ) : null}
        </>
      )}

      {effectiveInstallationId && importTarget ? (
        <ImportRepoDialog
          open={Boolean(importTarget)}
          installationId={effectiveInstallationId}
          repo={importTarget}
          projects={projectsQuery.data?.items ?? []}
          onOpenChange={(open) => {
            if (!open) setImportTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}
