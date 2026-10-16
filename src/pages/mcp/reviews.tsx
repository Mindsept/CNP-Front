import { canApproveReview } from "@/lib/mcp-review";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SectionCard } from "@/components/common/section-card";
import { YamlViewer } from "@/components/common/yaml-viewer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";
import { mcpService } from "@/services/mcp.service";
import type { Challenge } from "@/types/mcp";

export function McpReviewsPage() {
  const [offset, setOffset] = useState(0);
  const query = useQuery({ queryKey: ["mcp-reviews", offset], queryFn: () => mcpService.reviews(offset), refetchInterval: 10000 });
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Pending human reviews</h1><p>Production actions can only be approved by a project owner.</p>
    {query.isError && <p role="alert">Reviews could not be loaded.</p>}{query.data?.items.length === 0 && <p>No pending reviews.</p>}
    {query.data?.items.map(a => <SectionCard title={`${a.type} · ${a.snapshot.repository}`} key={a.id} description={`${a.snapshot.environment} · ${a.status}`}><Link className="text-primary" to={`/mcp/reviews/${a.id}`}>Examine this operation</Link></SectionCard>)}
    <div className="flex gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</Button><Button variant="outline" disabled={!query.data?.next_offset} onClick={() => setOffset(query.data!.next_offset!)}>Next</Button></div></div>;
}

export function McpReviewPage() {
  const { actionId = "" } = useParams();
  const { user } = useAuth();
  const error = useToastError();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const action = useQuery({ queryKey: ["mcp-action", actionId], queryFn: () => mcpService.action(actionId), refetchInterval: 5000 });
  const a = action.data;
  const expired = challenge ? Date.now() >= Date.parse(challenge.expires_at) : false;
  async function begin() {
    setBusy(true);
    try { setChallenge(await mcpService.challenge(actionId)); setAcknowledged(false); } catch (e) { error(e, "You cannot review this action or its content changed"); } finally { setBusy(false); }
  }
  async function decide(decision: "accept" | "decline" | "cancel") {
    if (!challenge || !a || challenge.fingerprint !== a.fingerprint) return;
    setBusy(true);
    try { await mcpService.decide(actionId, challenge, decision); setChallenge(null); setAcknowledged(false); await action.refetch(); } catch (e) { setChallenge(null); error(e, "Review could not be consumed; reload the action"); } finally { setBusy(false); }
  }
  if (!a) return <p role={action.isError ? "alert" : undefined}>{action.isError ? "Action unavailable or access denied." : "Loading action…"}</p>;
  const reviewable = ["prepared", "awaiting_review"].includes(a.status);
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Review {a.type}</h1>
    <SectionCard title="Exact immutable operation" description={`${a.status} · signed in as ${user?.email}`}><dl className="grid gap-2"><dt>Repository</dt><dd>{a.snapshot.repository}</dd><dt>Commit</dt><dd className="break-all font-mono">{a.snapshot.base_sha}</dd><dt>Environment</dt><dd>{a.snapshot.environment}</dd>{a.snapshot.namespace && <><dt>Namespace</dt><dd>{a.snapshot.namespace}</dd></>}{a.snapshot.image && <><dt>Immutable image</dt><dd className="break-all">{a.snapshot.image}</dd></>}<dt>Fingerprint</dt><dd className="break-all font-mono">{a.fingerprint}</dd></dl><ul className="mt-4 list-inside list-disc">{a.snapshot.effects.map(effect => <li key={effect}>{effect}</li>)}</ul>{a.error_code && <p role="alert">{a.error_code}</p>}{a.job_id && <Link className="text-primary" to={`/jobs/${a.job_id}`}>View execution job</Link>}{a.run_id && <Link className="ml-4 text-primary" to={`/mcp/runs/${a.run_id}`}>Deployment journey</Link>}</SectionCard>
    {(a.type === "ci_pr" || a.type === "cd_pr") && typeof a.snapshot.repository_id === "string" && typeof a.snapshot.pipeline_id === "string" &&
      <Button variant="outline" asChild><Link to={`/repositories/${a.snapshot.repository_id}/${a.type === "ci_pr" ? "ci" : "cd"}?pipeline=${a.snapshot.pipeline_id}`}>View saved workflow</Link></Button>}
    <YamlViewer yaml={JSON.stringify(a.snapshot, null, 2)} language="json" filename="Operation details (secret names and versions only)" />
    {Object.entries(a.snapshot.diff ?? {}).map(([path, content]) => <YamlViewer key={path} filename={`Diff: ${path}`} yaml={content} language="bash" />)}
    {Object.entries(a.snapshot.files ?? {}).map(([path, content]) => <YamlViewer key={path} filename={path} yaml={content} />)}
    {reviewable && !challenge && <Button disabled={busy} onClick={() => void begin()}>Start human review</Button>}
    {reviewable && challenge && <SectionCard title="Your decision" description={`Expires ${new Date(challenge.expires_at).toLocaleString()}`}><label className="flex items-center gap-3"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />I have examined this exact action and its immediate effects.</label><div className="mt-4 flex gap-3"><Button disabled={!canApproveReview(acknowledged, busy, a.status, a.fingerprint, challenge)} onClick={() => void decide("accept")}>Approve and queue</Button><Button variant="destructive" disabled={busy || expired} onClick={() => void decide("decline")}>Reject</Button><Button variant="outline" disabled={busy} onClick={() => void decide("cancel")}>Cancel review</Button></div>{expired && <p role="alert">This review expired. Prepare a new action.</p>}</SectionCard>}</div>;
}
