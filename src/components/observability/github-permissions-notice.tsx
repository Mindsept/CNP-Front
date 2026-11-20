import { ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GithubDeploymentPermissions } from "@/types/mcp";

export function GithubPermissionsNotice({ data, pending, error, onRetry }: {
  data?: GithubDeploymentPermissions; pending: boolean; error: boolean; onRetry: () => void;
}) {
  if (pending) return <p role="status" className="text-sm text-muted-foreground">Checking GitHub deployment permissions…</p>;
  if (data?.status === "ready") return null;
  const unavailable = error || !data || data.status === "unavailable";
  return <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
    <p className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true"/>
      {unavailable ? "GitHub permissions could not be verified" : "GitHub permission required"}
    </p>
    <p className="text-sm">{unavailable ? "Check the connection before starting this deployment." : data.message}</p>
    {unavailable ? <Button variant="outline" onClick={onRetry}>Check permissions again</Button> :
      data.action_url && data.action_label && <Button variant="destructive" asChild className="h-auto min-h-11 max-w-full whitespace-normal">
        <a href={data.action_url} target="_blank" rel="noopener noreferrer">{data.action_label}<ExternalLink aria-hidden="true"/></a>
      </Button>}
  </div>;
}
