import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { DeploymentStatus } from "@/types/cd";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_META: Record<
  DeploymentStatus,
  { label: string; variant: Variant; hint: string }
> = {
  not_deployed: {
    label: "Not deployed",
    variant: "muted",
    hint: "No deployment yet",
  },
  unknown: {
    label: "Not checked",
    variant: "secondary",
    hint: "Deployment not checked yet",
  },
  pending: {
    label: "Pending",
    variant: "warning",
    hint: "Waiting for LoadBalancer IP",
  },
  deployed: {
    label: "Deployed",
    variant: "success",
    hint: "Live on the cluster",
  },
  failed: {
    label: "Failed",
    variant: "danger",
    hint: "Deployment failed",
  },
};

export function deploymentStatusMeta(status: DeploymentStatus) {
  return STATUS_META[status] ?? STATUS_META.unknown;
}

export function DeploymentStatusBadge({
  status,
  className,
}: {
  status: DeploymentStatus;
  className?: string;
}) {
  const meta = deploymentStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}
