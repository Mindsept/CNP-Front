import { useQuery } from "@tanstack/react-query";
import { Activity, ScrollText } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { auditService } from "@/services/audit.service";
import { ApiError } from "@/lib/errors";
import { formatDate, formatRelative } from "@/lib/utils";

export function AuditLogPage() {
  const auditQuery = useQuery({
    queryKey: ["audit"],
    queryFn: () => auditService.list(),
    retry: false,
  });

  const notAvailable =
    auditQuery.isError &&
    auditQuery.error instanceof ApiError &&
    (auditQuery.error.status === 404 || auditQuery.error.status === 501);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="History"
        title="Audit log"
        description="Track every important action that happened on the platform."
      />

      <SectionCard
        title="Recent events"
        description="Events are sorted from most recent to oldest."
      >
        {auditQuery.isLoading ? (
          <LoadingState rows={4} />
        ) : notAvailable ? (
          <EmptyState
            icon={ScrollText}
            title="Audit log not available yet"
            description="The audit endpoint isn't enabled on this backend. Once enabled, events will appear here."
          />
        ) : auditQuery.isError ? (
          <ErrorState
            error={auditQuery.error}
            title="Could not load audit log"
            onRetry={() => auditQuery.refetch()}
          />
        ) : (auditQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={Activity}
            title="No audit events yet"
            description="As you use the platform — importing repositories, generating CI, opening PRs — events will be recorded here."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {auditQuery.data!.items.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <span className="font-mono">{e.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.entity_type} ·{" "}
                    <span className="font-mono">
                      {e.entity_id.slice(0, 8)}
                    </span>
                    {e.actor_id ? (
                      <>
                        {" "}
                        · actor{" "}
                        <span className="font-mono">
                          {e.actor_id.slice(0, 8)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {e.project_id ? (
                    <Badge variant="muted">project</Badge>
                  ) : null}
                  {e.repository_id ? (
                    <Badge variant="muted">repository</Badge>
                  ) : null}
                  <span
                    className="text-xs text-muted-foreground"
                    title={formatDate(e.created_at)}
                  >
                    {formatRelative(e.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
