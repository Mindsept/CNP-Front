import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, RefreshCw, Rocket } from "lucide-react";

import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import {
  DeploymentStatusBadge,
  deploymentStatusMeta,
} from "@/components/cd/deployment-status-badge";
import { projectService } from "@/services/project.service";
import { cdService } from "@/services/cd.service";
import { useToastError } from "@/hooks/use-toast-error";
import { ApiError } from "@/lib/errors";
import { formatRelative } from "@/lib/utils";
import type { ProjectDeploymentItem } from "@/types/cd";

export function ProjectDeploymentsSection({
  projectId,
}: {
  projectId: string;
}) {
  const deploymentsQuery = useQuery({
    queryKey: ["project", projectId, "deployments"],
    queryFn: () => projectService.deployments(projectId),
  });

  const items = deploymentsQuery.data?.items ?? [];

  return (
    <SectionCard
      title="Deployments"
      description="Deployment status for every repository in this project."
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => deploymentsQuery.refetch()}
          loading={
            deploymentsQuery.isRefetching && !deploymentsQuery.isLoading
          }
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      {deploymentsQuery.isLoading ? (
        <LoadingState rows={2} />
      ) : deploymentsQuery.isError ? (
        <ErrorState
          error={deploymentsQuery.error}
          title="Could not load deployments"
          onRetry={() => deploymentsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No repository in this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item) => (
            <DeploymentRow
              key={item.repository_id}
              projectId={projectId}
              item={item}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function DeploymentRow({
  projectId,
  item,
}: {
  projectId: string;
  item: ProjectDeploymentItem;
}) {
  const qc = useQueryClient();
  const onError = useToastError();
  const meta = deploymentStatusMeta(item.deployment_status);
  const canRefresh = Boolean(item.latest_cd_pipeline_id);

  const refreshMutation = useMutation({
    mutationFn: () =>
      cdService.refreshDeployment(
        item.repository_id,
        item.latest_cd_pipeline_id!,
      ),
    onSuccess: (data) => {
      if (data.deployment_status === "pending") {
        toast.message("Deployment exists, waiting for external LoadBalancer IP.");
      } else if (data.deployment_status === "deployed") {
        toast.success(`${item.repository_name} is live`);
      } else {
        toast.success("Deployment status refreshed");
      }
      qc.invalidateQueries({
        queryKey: ["project", projectId, "deployments"],
      });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "Create and merge the CD PR before refreshing deployment status.",
        );
        return;
      }
      onError(err, "Could not refresh deployment status");
    },
  });

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1 basis-[240px] space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/repositories/${item.repository_id}/cd`}
            className="truncate text-sm font-medium text-foreground hover:text-primary"
            title={item.repository_full_name}
          >
            {item.repository_name}
          </Link>
          <DeploymentStatusBadge status={item.deployment_status} />
          {item.cloud_target_name ? (
            <span className="truncate text-xs text-muted-foreground">
              → {item.cloud_target_name}
              {item.cloud_target_environment
                ? ` (${item.cloud_target_environment})`
                : ""}
            </span>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">{meta.hint}</p>

        {item.image && item.image_tag ? (
          <p
            className="break-all font-mono text-[11px] text-muted-foreground"
            title={`${item.image}:${item.image_tag}`}
          >
            {item.image}:{item.image_tag}
          </p>
        ) : null}

        {item.last_deployment_checked_at ? (
          <p className="text-[11px] text-muted-foreground">
            checked {formatRelative(item.last_deployment_checked_at)}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.deployment_status === "deployed" && item.public_url ? (
          <Button size="sm" variant="outline" asChild>
            <a href={item.public_url} target="_blank" rel="noreferrer">
              Open app
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
        {canRefresh ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refreshMutation.mutate()}
            loading={refreshMutation.isPending}
            title="Refresh deployment status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Rocket className="h-3.5 w-3.5" />
            No CD yet
          </span>
        )}
      </div>
    </li>
  );
}
