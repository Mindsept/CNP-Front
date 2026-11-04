import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ObservabilityStatusBadge } from "./observability-status-badge";
import type { ObservabilityPlan } from "@/types/observability";
export function ObservabilityReviewDialog({ plan, canManage, busy, error, onClose, onApprove }: {
  plan: ObservabilityPlan;
  canManage: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onApprove: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const obsolete = plan.status !== "preview";
  return <Dialog open onOpenChange={open => { if (!open && !busy)
    onClose(); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Review observability configuration</DialogTitle><DialogDescription>This review affects application observability only. It does not approve or deploy the application's CD workflow.</DialogDescription></DialogHeader>
  <div className="space-y-4 text-sm"><div className="flex items-center gap-2"><span>Requested state:</span><ObservabilityStatusBadge status={plan.enabled ? "activating" : "disabling"}/></div>{plan.certificate_renewal === "automatic-v1" && <div className="rounded-md border border-border bg-muted/40 p-3"><p className="font-medium">Automatic certificate renewal</p><p className="mt-1 text-muted-foreground">Certificates last up to 24 hours and renew with 8 hours remaining. Transitions are limited to 15 minutes. Requires the compatible application SDK (0.2.0 or later); approving this plan includes this policy.</p></div>}<p className="break-all font-mono text-xs">Image: {plan.image_reference}</p><p className="text-muted-foreground">Binding revision {plan.binding_revision} · {Object.keys(plan.files).length} generated observability files</p><details><summary className="cursor-pointer text-primary">Prerequisites and generated configuration</summary><ul className="my-3 list-inside list-disc text-muted-foreground">{plan.prerequisites.map(p => <li key={p}>{p}</li>)}</ul>{Object.entries(plan.files).map(([path, body]) => <details key={path} className="my-2"><summary className="break-all font-mono text-xs">{path}</summary><pre className="mt-2 max-h-64 overflow-auto rounded-md bg-background p-3 text-xs">{body}</pre></details>)}</details><p className="break-all text-xs text-muted-foreground">Plan fingerprint: {plan.artifact_digest}</p>
  {obsolete && <p role="alert" className="text-warning">This plan is obsolete. Close it and prepare a new configuration.</p>}{error && <p role="alert" className="text-destructive">{error}</p>}{!canManage && <p className="text-muted-foreground">Viewer access: a project Maintainer or Owner must approve this change.</p>}
  <label className="flex items-start gap-3"><Checkbox id="observability-confirm" checked={confirmed} disabled={!canManage || obsolete || busy} onCheckedChange={setConfirmed}/><span>I approve this observability change for the selected application and target.</span></label></div>
  <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Close review</Button><Button disabled={!canManage || obsolete || !confirmed} loading={busy} onClick={onApprove}>{plan.enabled ? "Approve activation" : "Approve deactivation"}</Button></DialogFooter>
 </DialogContent></Dialog>;
}
