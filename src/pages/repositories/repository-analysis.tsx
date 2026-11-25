import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Microscope, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionCard } from "@/components/common/section-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  JobStatusBadge,
  StackBadge,
} from "@/components/common/status-badge";
import { repositoryService } from "@/services/repository.service";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";
import { formatRelative } from "@/lib/utils";
import type { JobStatus } from "@/types/job";

const jobLabels: Record<JobStatus, string> = {
  queued: "Waiting for a worker",
  running: "Worker is analyzing this repository",
  succeeded: "Analysis complete",
  failed: "Analysis failed",
};

export function RepositoryAnalysisPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const id = repositoryId!;
  const qc = useQueryClient();
  const { user } = useAuth();
  const onError = useToastError();

  const repoQuery = useQuery({
    queryKey: ["repository", id],
    queryFn: () => repositoryService.get(id),
  });

  const analysisQuery = useQuery({
    queryKey: ["repository", id, "analysis", "latest"],
    queryFn: () => repositoryService.latestAnalysis(id),
  });

  const jobKey = ["repository", id, "analysis-job", user?.id] as const;
  const jobQuery = useQuery({
    queryKey: jobKey,
    queryFn: () => repositoryService.analysisJob(id),
    enabled: Boolean(user),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: ({ state }) => {
      const status = state.data?.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });
  const job = jobQuery.data;
  const isActive = job?.status === "queued" || job?.status === "running";
  useEffect(() => {
    if (job?.status === "succeeded") {
      void qc.invalidateQueries({ queryKey: ["repository", id], exact: true });
      void qc.invalidateQueries({ queryKey: ["repository", id, "analysis", "latest"] });
    }
  }, [id, job?.id, job?.status, qc]);

  const analyzeMutation = useMutation({
    mutationFn: () =>
      repositoryService.analyze(id, {
        ref: repoQuery.data?.default_branch ?? "main",
        async: true,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: jobKey, exact: true });
    },
    onError: (err) => onError(err, "Could not start analysis"),
  });

  const busy = analyzeMutation.isPending || isActive;
  const jobTime = job?.finished_at ?? job?.started_at ?? job?.created_at;
  const timeLabel = job?.finished_at ? "Finished" : job?.started_at ? "Started" : "Queued";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={repoQuery.data?.full_name ?? "Repository"}
        back={{
          to: `/repositories/${id}`,
          label: repoQuery.data?.full_name ?? "repository",
        }}
        title="Analysis"
        description="Detect the stack, identify tests and gather signals required to generate a CI workflow."
        actions={
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={jobQuery.isLoading}
            loading={busy}
          >
            <Microscope className="h-4 w-4" />
            Analyze repository
          </Button>
        }
      />

      {jobQuery.isError && (
        <ErrorState title="Could not refresh worker status" error={jobQuery.error} onRetry={() => jobQuery.refetch()} />
      )}
      {job ? (
        <Card className="flex items-center justify-between gap-3 border-primary/30 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {jobLabels[job.status]}
              </p>
              <p className="text-xs text-muted-foreground">
                {timeLabel} {formatRelative(jobTime)} ·{" "}
                <Link className="underline" to={`/jobs/${job.id}`}>View job</Link>
              </p>
            </div>
          </div>
          <JobStatusBadge status={job.status} />
        </Card>
      ) : null}

      <SectionCard
        title="Latest analysis"
        description="The most recent successful analysis for this repository."
      >
        {analysisQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : analysisQuery.isError ? (
          <ErrorState
            error={analysisQuery.error}
            title="Could not load analysis"
            onRetry={() => analysisQuery.refetch()}
          />
        ) : !analysisQuery.data && isActive ? (
          <p className="text-sm text-muted-foreground">Results will appear here when the worker finishes.</p>
        ) : !analysisQuery.data ? (
          <EmptyState
            icon={Microscope}
            title="No analysis yet"
            description="Run an analysis to detect the stack, Dockerfile and tests for this repository."
            action={
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={jobQuery.isLoading}
                loading={busy}
              >
                <Microscope className="h-4 w-4" />
                Analyze repository
              </Button>
            }
          />
        ) : (
          (() => {
            const a = analysisQuery.data!;
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat
                    label="Detected stack"
                    value={<StackBadge stack={a.detected_stack} />}
                  />
                  <Stat
                    label="Confidence"
                    value={`${Math.round((a.confidence ?? 0) * 100)}%`}
                  />
                  <Stat
                    label="Dockerfile"
                    value={
                      <Badge
                        variant={a.dockerfile_present ? "success" : "muted"}
                      >
                        {a.dockerfile_present ? "Present" : "Missing"}
                      </Badge>
                    }
                  />
                  <Stat
                    label="CI workflow"
                    value={
                      <Badge variant={a.ci_present ? "success" : "muted"}>
                        {a.ci_present ? "Present" : "Missing"}
                      </Badge>
                    }
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Test detection
                    </p>
                    <p className="mt-2 text-sm">
                      {a.test_detected ? (
                        <>
                          Tests detected. Recommended command:{" "}
                          <span className="font-mono text-foreground">
                            {a.test_command || "—"}
                          </span>
                        </>
                      ) : (
                        "No test framework detected."
                      )}
                    </p>
                  </Card>

                  <Card className="p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Recommendations
                    </p>
                    {a.recommendations && a.recommendations.length > 0 ? (
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {a.recommendations.map((rec, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No specific recommendations for this analysis.
                      </p>
                    )}
                  </Card>
                </div>

                {a.files_detected && a.files_detected.length > 0 ? (
                  <Card className="p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Files detected
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.files_detected.map((f) => (
                        <span
                          key={f}
                          className="rounded-md border border-border bg-surface/60 px-2 py-1 font-mono text-xs text-muted-foreground"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </Card>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  Last analyzed {formatRelative(a.created_at)}
                </p>
              </div>
            );
          })()
        )}
      </SectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 text-sm">{value}</div>
    </Card>
  );
}
