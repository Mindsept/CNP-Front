import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionCard } from "@/components/common/section-card";
import { Card } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/common/status-badge";
import { YamlViewer } from "@/components/common/yaml-viewer";
import { jobService } from "@/services/job.service";
import { formatDate, formatRelative } from "@/lib/utils";
import type { Job } from "@/types/job";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const id = jobId!;

  const jobQuery = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobService.get(id),
    refetchInterval: (query) => {
      const data = query.state.data as Job | undefined;
      if (!data) return 2000;
      return data.status === "queued" || data.status === "running"
        ? 2000
        : false;
    },
  });

  if (jobQuery.isLoading) return <LoadingState rows={3} />;
  if (jobQuery.isError)
    return (
      <ErrorState
        error={jobQuery.error}
        title="Could not load job"
        onRetry={() => jobQuery.refetch()}
      />
    );

  const job = jobQuery.data!;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Background job"
        back={{ label: "previous page" }}
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono text-base">{job.id.slice(0, 8)}</span>
            <JobStatusBadge status={job.status} />
          </span>
        }
        description={`Type: ${job.type}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Timeline
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Created" value={formatDate(job.created_at)} hint={formatRelative(job.created_at)} />
            <Row label="Started" value={formatDate(job.started_at)} hint={formatRelative(job.started_at)} />
            <Row label="Finished" value={formatDate(job.finished_at)} hint={formatRelative(job.finished_at)} />
          </dl>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Status
          </p>
          <p className="mt-3 text-sm">
            {job.status === "queued"
              ? "Waiting to be picked up by a worker."
              : job.status === "running"
                ? "Currently being processed. This page polls every 2 seconds."
                : job.status === "succeeded"
                  ? "Job completed successfully."
                  : "Job failed. See the error below."}
          </p>
          {job.error ? (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {job.error}
            </div>
          ) : null}
        </Card>
      </div>

      <SectionCard title="Payload" description="Input passed to the worker.">
        <YamlViewer
          yaml={JSON.stringify(job.payload ?? {}, null, 2)}
          language="json"
          filename="payload.json"
        />
      </SectionCard>

      {job.result ? (
        <SectionCard title="Result" description="Output produced by the worker.">
          <YamlViewer
            yaml={JSON.stringify(job.result, null, 2)}
            language="json"
            filename="result.json"
          />
        </SectionCard>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">
        <div>{value}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </dd>
    </div>
  );
}
