import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBadge } from "@/components/common/status-badge";
import { projectService } from "@/services/project.service";
import { useToastError } from "@/hooks/use-toast-error";
import type { ProjectRole } from "@/types/project";

function initials(email: string): string {
  return email
    .split(/[.@]/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;
  const qc = useQueryClient();
  const onError = useToastError();

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.get(id),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (projectQuery.data) {
      setName(projectQuery.data.name);
      setDescription(projectQuery.data.description ?? "");
    }
  }, [projectQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      projectService.update(id, {
        name: name.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      toast.success("Project updated");
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => onError(err, "Could not update project"),
  });

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<ProjectRole>("maintainer");

  const addMemberMutation = useMutation({
    mutationFn: () =>
      projectService.addMember(id, {
        email: memberEmail.trim(),
        role: memberRole,
      }),
    onSuccess: () => {
      toast.success("Member added");
      setMemberEmail("");
      setMemberRole("maintainer");
      qc.invalidateQueries({ queryKey: ["project", id] });
    },
    onError: (err) => onError(err, "Could not add member"),
  });

  if (projectQuery.isLoading) return <LoadingState rows={3} />;
  if (projectQuery.isError)
    return (
      <ErrorState
        error={projectQuery.error}
        title="Could not load project"
        onRetry={() => projectQuery.refetch()}
      />
    );

  const project = projectQuery.data!;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`/${project.slug}`}
        title="Project settings"
        description="Update your project metadata and manage team access."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="General"
          description="Project name and description are visible to all members."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Slug{" "}
                <span className="font-mono text-foreground">
                  {project.slug}
                </span>{" "}
                cannot be changed.
              </p>
              <Button type="submit" loading={updateMutation.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Members"
          description="Invite teammates by email and pick the right role."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!memberEmail.trim()) return;
              addMemberMutation.mutate();
            }}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
              <Input
                type="email"
                placeholder="member@company.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
              <Select
                value={memberRole}
                onValueChange={(v) => setMemberRole(v as ProjectRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="maintainer">Maintainer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" loading={addMemberMutation.isPending}>
                <UserPlus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </form>

          <ul className="mt-5 space-y-3">
            {(project.members ?? []).map((m) => (
              <li
                key={m.user_id}
                className="flex items-center gap-3 rounded-md border border-border/60 bg-surface/40 px-3 py-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials(m.email)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm">{m.email}</span>
                <RoleBadge role={m.role} />
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
