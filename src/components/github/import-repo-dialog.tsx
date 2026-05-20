import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { repositoryService } from "@/services/repository.service";
import { useToastError } from "@/hooks/use-toast-error";
import type { GitHubRepository } from "@/types/github";
import type { ProjectSummary } from "@/types/project";

interface ImportRepoDialogProps {
  open: boolean;
  installationId: string;
  repo: GitHubRepository;
  projects: ProjectSummary[];
  onOpenChange: (open: boolean) => void;
}

export function ImportRepoDialog({
  open,
  installationId,
  repo,
  projects,
  onOpenChange,
}: ImportRepoDialogProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const onError = useToastError();

  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    if (open) setProjectId(projects[0]?.id ?? "");
  }, [open, projects]);

  const mutation = useMutation({
    mutationFn: () =>
      repositoryService.import(projectId, {
        github_installation_id: installationId,
        github_repo_id: repo.github_repo_id,
      }),
    onSuccess: (imported) => {
      toast.success(`Imported ${repo.full_name}`);
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({
        queryKey: ["project", projectId, "repositories"],
      });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
      navigate(`/repositories/${imported.id}`);
    },
    onError: (err) => onError(err, "Could not import repository"),
  });

  const noProjects = projects.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import repository</DialogTitle>
          <DialogDescription>
            Add{" "}
            <span className="font-mono text-foreground/90">
              {repo.full_name}
            </span>{" "}
            to one of your projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={noProjects}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noProjects ? (
              <p className="text-xs text-warning">
                You need to create a project before importing.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!projectId}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
