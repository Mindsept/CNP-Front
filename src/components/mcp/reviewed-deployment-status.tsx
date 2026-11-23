import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { mcpService } from "@/services/mcp.service";

export function ReviewedDeploymentStatus({ actionId }: { actionId: string }) {
  const observation = useQuery({
    queryKey: ["mcp-observation", actionId],
    queryFn: () => mcpService.deployment(actionId),
    refetchInterval: query => {
      const status = query.state.data?.status;
      return status === "succeeded" || status === "failed" ? false : 10000;
    },
  });
  const result = observation.data;
  const publicUrl = result?.public_url;
  return (
    <div className="flex w-full flex-wrap items-center gap-3" aria-label="Deployment status">
      <strong>Deployment · {result?.status ?? (observation.isError ? "unknown" : "checking…")}</strong>
      {result?.available_replicas !== undefined && <span>Ready replicas: {result.available_replicas}</span>}
      {result?.public_address && <span>Public address: <code>{result.public_address}</code></span>}
      {publicUrl && /^https?:\/\//i.test(publicUrl) && (
        <a className="text-primary" href={publicUrl} target="_blank" rel="noreferrer">Open deployed app</a>
      )}
      {result?.workflow_url && /^https:\/\/github\.com\//i.test(result.workflow_url) && (
        <a className="text-primary" href={result.workflow_url} target="_blank" rel="noreferrer">View workflow run</a>
      )}
      <Button variant="outline" size="sm" loading={observation.isFetching} onClick={() => void observation.refetch()}>
        Refresh deployment status
      </Button>
      {observation.isError && <span role="alert">Could not refresh deployment status.</span>}
    </div>
  );
}
