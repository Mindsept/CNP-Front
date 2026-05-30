import { useEffect, useState } from "react";
import { GitPullRequest } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CdCreatePrInput } from "@/types/cd";

interface CdCreatePrDialogProps {
  open: boolean;
  defaultBranch: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CdCreatePrInput) => void;
}

const defaults = {
  branch_name: "cnp/onboarding-cd",
  commit_message: "chore(cnp): add generated CD workflow",
  pull_request_title: "chore(cnp): add Kubernetes CD workflow",
  pull_request_body:
    "This PR adds generated CD from CNP. It will deploy the application to AKS once merged to main.",
};

export function CdCreatePrDialog({
  open,
  defaultBranch,
  loading,
  onOpenChange,
  onSubmit,
}: CdCreatePrDialogProps) {
  const [baseBranch, setBaseBranch] = useState(defaultBranch || "main");
  const [branchName, setBranchName] = useState(defaults.branch_name);
  const [commitMessage, setCommitMessage] = useState(defaults.commit_message);
  const [prTitle, setPrTitle] = useState(defaults.pull_request_title);
  const [prBody, setPrBody] = useState(defaults.pull_request_body);
  const [syncSecrets, setSyncSecrets] = useState(true);

  useEffect(() => {
    if (open) {
      setBaseBranch(defaultBranch || "main");
      setBranchName(defaults.branch_name);
      setCommitMessage(defaults.commit_message);
      setPrTitle(defaults.pull_request_title);
      setPrBody(defaults.pull_request_body);
      setSyncSecrets(true);
    }
  }, [open, defaultBranch]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      base_branch: baseBranch.trim(),
      branch_name: branchName.trim() || undefined,
      commit_message: commitMessage.trim(),
      pull_request_title: prTitle.trim(),
      pull_request_body: prBody.trim(),
      sync_secrets_to_github: syncSecrets,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-primary" />
              Open CD Pull Request
            </span>
          </DialogTitle>
          <DialogDescription>
            The platform will push a branch with the generated CD workflow and
            manifests, then open a PR for review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cd-base">Base branch</Label>
              <Input
                id="cd-base"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cd-branch">New branch</Label>
              <Input
                id="cd-branch"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd-commit">Commit message</Label>
            <Input
              id="cd-commit"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd-title">Pull request title</Label>
            <Input
              id="cd-title"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd-body">Pull request description</Label>
            <Textarea
              id="cd-body"
              rows={4}
              value={prBody}
              onChange={(e) => setPrBody(e.target.value)}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface/60 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="cd-sync" className="cursor-pointer">
                Sync project secrets to GitHub Actions
              </Label>
              <p className="text-xs text-muted-foreground">
                Mapped project secrets (kubeconfig, Azure credentials, app env
                vars) are encrypted with GitHub's public key before being stored
                as repository Actions secrets.
              </p>
            </div>
            <Switch
              id="cd-sync"
              checked={syncSecrets}
              onCheckedChange={setSyncSecrets}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Open Pull Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
