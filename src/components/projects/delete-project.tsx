import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastError } from "@/hooks/use-toast-error";
import { projectService } from "@/services/project.service";

export function DeleteProject({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const navigate = useNavigate();
  const queries = useQueryClient();
  const onError = useToastError();
  const deletion = useMutation({
    mutationFn: (typedName: string) => projectService.remove(id, typedName),
    onError: (error) => onError(error, "Could not delete project"),
    onSuccess: () => {
      toast.success("Project deleted");
      navigate("/projects", { replace: true });
      queries.removeQueries({ queryKey: ["project", id] });
      void queries.invalidateQueries({ queryKey: ["projects"] });
      void queries.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  return (
    <SectionCard title="Delete project" description="Permanently remove this workspace and its project records from CNP.">
      <Dialog open={open} onOpenChange={(next) => {
        if (deletion.isPending) return;
        setConfirmation("");
        setOpen(next);
      }}>
        <DialogTrigger asChild>
          <Button variant="destructive"><Trash2 /> Delete project</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>
              This removes project members, repository links, secrets and deployment records from CNP.
              GitHub repositories and cloud resources are managed separately.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (confirmation === name && !deletion.isPending) deletion.mutate(confirmation);
          }}>
            <div className="space-y-2">
              <Label htmlFor="delete-project-name">Type <strong className="whitespace-pre-wrap">{name}</strong> to confirm</Label>
              <Input id="delete-project-name" value={confirmation} autoComplete="off" spellCheck={false}
                onChange={(event) => setConfirmation(event.target.value)} disabled={deletion.isPending} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={deletion.isPending} onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" loading={deletion.isPending} disabled={confirmation !== name}>
                Delete project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
