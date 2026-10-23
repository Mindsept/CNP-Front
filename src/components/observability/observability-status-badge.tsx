import { Badge } from "@/components/ui/badge";
import type { ObservabilityStatus } from "@/types/observability";
const labels: Record<ObservabilityStatus, string> = { disabled: "Disabled", preparing: "Preparing", activating: "Activating", active: "Active", degraded: "Degraded", failed: "Failed", disabling: "Disabling" };
export function ObservabilityStatusBadge({ status }: {
  status: ObservabilityStatus;
}) {
  return <Badge variant={status === "active" ? "success" : status === "failed" ? "danger" : status === "degraded" ? "warning" : status === "disabled" ? "muted" : "info"}>{labels[status] ?? "Unknown"}</Badge>;
}
