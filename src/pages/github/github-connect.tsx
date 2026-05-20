import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Github, ShieldCheck, Workflow, Zap } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { githubService } from "@/services/github.service";
import { useToastError } from "@/hooks/use-toast-error";
import { formatRelative } from "@/lib/utils";

export function GithubConnectPage() {
  const onError = useToastError();
  const [connecting, setConnecting] = useState(false);

  const installationsQuery = useQuery({
    queryKey: ["github", "installations"],
    queryFn: () => githubService.installations(),
  });

  async function handleConnect() {
    setConnecting(true);
    try {
      const { install_url } = await githubService.installUrl();
      if (!install_url) {
        toast.error("Could not retrieve GitHub install URL.");
        setConnecting(false);
        return;
      }
      window.location.href = install_url;
    } catch (err) {
      onError(err, "Could not start the GitHub connection flow");
      setConnecting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Integrations"
        icon={Github}
        title="Connect GitHub"
        description="Install the platform's GitHub App on your organization to import repositories and open Pull Requests."
        actions={
          <Button onClick={handleConnect} loading={connecting}>
            <Github className="h-4 w-4" />
            Connect GitHub
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Feature
          icon={ShieldCheck}
          title="Granular access"
          description="Select repositories per installation. Revoke any time from GitHub settings."
        />
        <Feature
          icon={Workflow}
          title="Workflow scaffolding"
          description="The platform writes a Pull Request — your team reviews and merges it like any change."
        />
        <Feature
          icon={Zap}
          title="No secrets stored on disk"
          description="Tokens are scoped per installation and rotated by GitHub automatically."
        />
      </div>

      <SectionCard
        title="Linked installations"
        description="GitHub App installations connected to your account."
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/github/installations">View all</Link>
          </Button>
        }
      >
        {installationsQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : installationsQuery.isError ? (
          <ErrorState
            error={installationsQuery.error}
            title="Could not load installations"
            onRetry={() => installationsQuery.refetch()}
          />
        ) : (installationsQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={Github}
            title="No GitHub installations yet"
            description="Click Connect GitHub above to install the platform App on your organization or account."
            action={
              <Button onClick={handleConnect} loading={connecting}>
                <Github className="h-4 w-4" />
                Connect GitHub
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {installationsQuery.data!.items.map((inst) => (
              <li
                key={inst.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary/60 ring-1 ring-inset ring-border">
                    <Github className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {inst.github_account_login}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inst.github_account_type} · installation #
                      {inst.installation_id} · linked{" "}
                      {formatRelative(inst.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      inst.repository_selection === "all"
                        ? "default"
                        : "muted"
                    }
                  >
                    {inst.repository_selection === "all"
                      ? "All repositories"
                      : "Selected"}
                  </Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/github/installations`}>Browse repos</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Github;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}
