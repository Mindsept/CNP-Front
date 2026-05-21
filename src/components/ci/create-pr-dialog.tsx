import { useEffect, useState } from "react";
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
import { GitPullRequest } from "lucide-react";

interface CreatePrDialogProps {
  open: boolean;
  defaultBranch: string;
  syncSecretsDefault?: boolean;
  syncSecretsAvailable?: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    base_branch: string;
    branch_name: string;
    commit_message: string;
    pull_request_title: string;
    pull_request_body: string;
    sync_secrets_to_github?: boolean;
  }) => void;
}

const defaults = {
  branch_name: "cnp/onboarding-ci",
  commit_message: "chore(cnp): add generated CI workflow",
  pull_request_title: "chore(cnp): add CI workflow",
  pull_request_body:
    "This PR adds a generated GitHub Actions CI workflow from the Cloud Native Platform.",
};

export function CreatePrDialog({
  open,
  defaultBranch,
  syncSecretsDefault,
  syncSecretsAvailable,
  loading,
  onOpenChange,
  onSubmit,
}: CreatePrDialogProps) {
  const [baseBranch, setBaseBranch] = useState(defaultBranch || "main");
  const [branchName, setBranchName] = useState(defaults.branch_name);
  const [commitMessage, setCommitMessage] = useState(defaults.commit_message);
  const [prTitle, setPrTitle] = useState(defaults.pull_request_title);
  const [prBody, setPrBody] = useState(defaults.pull_request_body);
  const [syncSecrets, setSyncSecrets] = useState(false);

  useEffect(() => {
    if (open) {
      setBaseBranch(defaultBranch || "main");
      setBranchName(defaults.branch_name);
      setCommitMessage(defaults.commit_message);
      setPrTitle(defaults.pull_request_title);
      setPrBody(defaults.pull_request_body);
      setSyncSecrets(Boolean(syncSecretsDefault));
    }
  }, [open, defaultBranch, syncSecretsDefault]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      base_branch: baseBranch.trim(),
      branch_name: branchName.trim(),
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
              Open Pull Request
            </span>
          </DialogTitle>
          <DialogDescription>
            The platform will push a branch with the generated workflow and open
            a PR for review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base">Base branch</Label>
              <Input
                id="base"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">New branch</Label>
              <Input
                id="branch"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commit">Commit message</Label>
            <Input
              id="commit"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Pull request title</Label>
            <Input
              id="title"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Pull request description</Label>
            <Textarea
              id="body"
              rows={4}
              value={prBody}
              onChange={(e) => setPrBody(e.target.value)}
            />
          </div>

          {syncSecretsAvailable ? (
            <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface/60 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="sync-secrets" className="cursor-pointer">
                  Sync mapped secrets to GitHub Actions
                </Label>
                <p className="text-xs text-muted-foreground">
                  Project secret values are encrypted with GitHub's public key
                  before being stored as repository Actions secrets.
                </p>
              </div>
              <Switch
                id="sync-secrets"
                checked={syncSecrets}
                onCheckedChange={setSyncSecrets}
              />
            </div>
          ) : null}

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
