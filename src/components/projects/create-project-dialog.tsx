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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectService } from "@/services/project.service";
import { useToastError } from "@/hooks/use-toast-error";
import { slugify } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { LandingZoneFields } from "./landing-zone-fields";
import {
  defaultLandingZonePreview,
  saveLandingZonePreview,
  type LandingZonePreview,
} from "@/lib/landing-zone-preview";
import type { CreateProjectInput } from "@/types/project";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const onError = useToastError();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(defaultLandingZonePreview);

  useEffect(() => {
    if (!open) {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      setErrors({});
      setPreview(defaultLandingZonePreview());
    }
  }, [open]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const mutation = useMutation({
    mutationFn: ({
      input,
    }: {
      input: CreateProjectInput;
      preview: LandingZonePreview;
      userId: string;
    }) => projectService.create(input),
    onSuccess: (project, submitted) => {
      toast.success("Project created");
      if (
        !saveLandingZonePreview(submitted.userId, project.id, submitted.preview)
      ) {
        toast.warning(
          "Project created, but the landing zone preview could not be saved in this browser.",
        );
      }
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
      navigate(`/projects/${project.id}?view=landing-zone`);
    },
    onError: (err) => onError(err, "Could not create the project"),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Project name is required.";
    if (!slug.trim()) next.slug = "Slug is required.";
    else if (!/^[a-z0-9-]+$/.test(slug))
      next.slug = "Use lowercase letters, numbers and hyphens.";
    setErrors(next);
    if (Object.keys(next).length === 0 && !mutation.isPending)
      mutation.mutate({
        input: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
        },
        preview,
        userId: user?.id ?? "",
      });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mutation.isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Group repositories, secrets and CI pipelines under a single project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Internal Tools"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="internal-tools"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
              {errors.slug ? (
                <p className="text-xs text-destructive">{errors.slug}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Used in URLs. Lowercase letters, numbers and hyphens.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What does this project ship?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="border-t border-border pt-5">
              <LandingZoneFields
                value={preview}
                onChange={setPreview}
                disabled={mutation.isPending}
              />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                The project is created in CNP. Its landing zone preview is saved
                only for your account in this browser.
              </p>
            </div>
          </fieldset>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
