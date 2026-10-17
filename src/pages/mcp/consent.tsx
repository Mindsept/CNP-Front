import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/section-card";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";
import { projectService } from "@/services/project.service";
import { mcpService } from "@/services/mcp.service";

const descriptions: Record<string, string> = { "cnp:read": "Read authorized projects and configuration names", "cnp:prepare": "Prepare previews and immutable action plans",
  "cnp:publish": "Publish reviewed PRs and export reviewed application secrets", "cnp:merge": "Merge reviewed CNP pull requests", "cnp:deploy": "Dispatch reviewed deployments on authorized AKS targets" };

export function McpConsentPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const error = useToastError();
  const projects = useQuery({ queryKey: ["projects"], queryFn: projectService.list });
  const [selected, setSelected] = useState<string[]>([]);
  const [create, setCreate] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const scopes = (params.get("scope") ?? "cnp:read").split(" ").filter(Boolean);
  const valid = scopes.every(s => descriptions[s]) && params.get("code_challenge_method") === "S256";
  async function decide(decision: "accept" | "decline") {
    setBusy(true);
    try {
      const body = Object.fromEntries(["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "resource", "scope", "state"].map(key => [key, params.get(key) ?? ""]));
      const result = await mcpService.consent({ ...body, scope: scopes.join(" "), project_ids: selected, allow_project_creation: create, decision });
      window.location.assign(result.redirect_url);
    } catch (e) { error(e, "Connection could not be authorized"); } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-2xl font-semibold">Connect an MCP client</h1>
    <SectionCard title="Account and client"><p>{user?.email}</p><p className="break-all">Client: {params.get("client_id")}</p><p className="break-all">Return address: {params.get("redirect_uri")}</p></SectionCard>
    <SectionCard title="Requested permissions"><ul className="space-y-2">{scopes.map(scope => <li key={scope}>{descriptions[scope] ?? "Unsupported scope"}</li>)}</ul><p className="mt-4 text-sm text-muted-foreground">Each critical action still requires a human review. Production reviews require a project owner.</p></SectionCard>
    <SectionCard title="Projects this client may access"><div className="space-y-3">{projects.data?.items.map(project => <label className="flex items-center gap-3" key={project.id}><input type="checkbox" checked={selected.includes(project.id)} onChange={e => setSelected(e.target.checked ? [...selected, project.id] : selected.filter(id => id !== project.id))} />{project.name} ({project.role})</label>)}
      {scopes.includes("cnp:prepare") && <label className="flex items-center gap-3"><input type="checkbox" checked={create} onChange={e => setCreate(e.target.checked)} />Allow creation of new projects (targets require an administrator)</label>}</div></SectionCard>
    <label className="flex items-center gap-3"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />I authorize this client for the selected permissions and projects.</label>
    <div className="flex gap-3"><Button disabled={!valid || !acknowledged || busy || projects.isPending} onClick={() => void decide("accept")}>Authorize connection</Button><Button variant="outline" disabled={busy} onClick={() => void decide("decline")}>Decline</Button></div>
  </div>;
}
