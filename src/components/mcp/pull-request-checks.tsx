import type { PullRequestStatus } from "@/types/mcp";

const indicators = {
  Waiting: "border border-muted-foreground",
  Running: "bg-warning motion-safe:animate-pulse",
  Passed: "bg-success",
  Failed: "bg-destructive",
  Cancelled: "bg-destructive",
  Skipped: "border border-muted-foreground",
  Neutral: "border border-muted-foreground",
};

type State = keyof typeof indicators;

function runState(status: string, conclusion: string | null): State {
  if (status === "in_progress") return "Running";
  if (status !== "completed") return "Waiting";
  switch (conclusion) {
    case "success": return "Passed";
    case "skipped": return "Skipped";
    case "neutral": return "Neutral";
    case "cancelled": return "Cancelled";
    default: return "Failed";
  }
}

export function pullRequestChecks(pr: PullRequestStatus) {
  const checks = pr.checks.map(check => ({ name: check.name, state: runState(check.status, check.conclusion) }));
  for (const check of pr.status_checks) {
    const state = check.state === "success" ? "Passed" : check.state === "pending" ? "Waiting" : "Failed";
    checks.push({ name: check.context, state });
  }
  const blocking = checks.filter(({ state }) => !["Passed", "Neutral", "Skipped"].includes(state));
  const mergeReady = pr.state === "open" && pr.mergeable === true && pr.check_count <= 100
    && checks.length > 0 && blocking.length === 0;
  return { checks, mergeReady };
}

export function PullRequestChecks({ pr }: { pr: PullRequestStatus }) {
  const { checks } = pullRequestChecks(pr);
  const complete = checks.filter(({ state }) => state !== "Running" && state !== "Waiting").length;
  return (
    <section className="mb-4 space-y-2" aria-label="GitHub checks">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <a className="font-medium text-primary" href={pr.url} target="_blank" rel="noreferrer">PR #{pr.number} checks</a>
        <span role="status" className="text-muted-foreground">
          {pr.merged ? "Merged" : pr.state === "closed" ? "Closed" : !checks.length ? "Waiting for GitHub checks…" : `${complete}/${checks.length} completed`}
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {checks.map(({ name, state }, index) => (
          <li key={`${name}-${index}`} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-sm">
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${indicators[state]}`} />
            {name} <span className="text-xs text-muted-foreground">{state}</span>
          </li>
        ))}
      </ul>
      {pr.state === "open" && pr.mergeable === false && <p className="text-sm text-destructive">Resolve the merge conflict on GitHub.</p>}
      {pr.state === "open" && pr.mergeable === null && <p className="text-sm text-muted-foreground">GitHub is checking mergeability…</p>}
      {pr.check_count > 100 && <p className="text-sm text-muted-foreground">This PR exceeds the 100-check merge limit.</p>}
    </section>
  );
}
