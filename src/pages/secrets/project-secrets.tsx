import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Plus, ShieldAlert, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { secretService } from "@/services/secret.service";
import { projectService } from "@/services/project.service";
import { useToastError } from "@/hooks/use-toast-error";
import { formatRelative } from "@/lib/utils";
import type { ProjectSecret } from "@/types/secret";

const RECOMMENDED = "GHCR_TOKEN";
const ENVIRONMENTS = ["ci", "cd", "dev", "staging", "production"] as const;
type Environment = (typeof ENVIRONMENTS)[number];

function normalizeEnv(value: string | null): Environment {
  if (!value) return "ci";
  return (ENVIRONMENTS as readonly string[]).includes(value)
    ? (value as Environment)
    : "ci";
}

export function ProjectSecretsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;
  const qc = useQueryClient();
  const onError = useToastError();
  const [params, setParams] = useSearchParams();

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.get(id),
  });

  const environment = normalizeEnv(params.get("env"));
  const setEnvironment = (next: string) => {
    setParams(
      (current) => {
        const merged = new URLSearchParams(current);
        merged.set("env", next);
        return merged;
      },
      { replace: true },
    );
  };
  const secretsQuery = useQuery({
    queryKey: ["project", id, "secrets"],
    queryFn: () => secretService.list(id),
  });

  const filtered = (secretsQuery.data?.items ?? []).filter(
    (s) => s.environment === environment,
  );
  const hasGhcrToken = filtered.some((s) => s.key === RECOMMENDED);

  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectSecret | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (secretId: string) => secretService.remove(id, secretId),
    onSuccess: () => {
      toast.success("Secret deleted");
      qc.invalidateQueries({ queryKey: ["project", id, "secrets"] });
      setToDelete(null);
    },
    onError: (err) => onError(err, "Could not delete secret"),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={projectQuery.data ? `/${projectQuery.data.slug}` : "—"}
        icon={KeyRound}
        back={{
          to: `/projects/${id}`,
          label: projectQuery.data?.name ?? "project",
        }}
        title="Secrets"
        description="Project-scoped secrets. Values are never returned by the API once saved."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New secret
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Environment
        </Label>
        <Select value={environment} onValueChange={setEnvironment}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENVIRONMENTS.map((env) => (
              <SelectItem key={env} value={env}>
                {env}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(environment === "ci" || environment === "cd") &&
      !hasGhcrToken &&
      !secretsQuery.isLoading ? (
        <Card className="flex items-start gap-3 border-warning/30 bg-warning/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {RECOMMENDED} is not configured in {environment}
            </p>
            <p className="text-muted-foreground">
              {environment === "ci"
                ? "Workflows generated by the platform push images to GHCR using this token. Add it to avoid CI failures."
                : "CD pulling private GHCR images needs this token in the cd environment. Add it before opening the CD PR."}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Add {RECOMMENDED}
          </Button>
        </Card>
      ) : null}

      <SectionCard
        title={`Secrets in ${environment}`}
        description="Each row is a single secret. Values are write-only."
      >
        {secretsQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : secretsQuery.isError ? (
          <ErrorState
            error={secretsQuery.error}
            title="Could not load secrets"
            onRetry={() => secretsQuery.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title={`No secrets in ${environment}`}
            description="Add the secrets your CI workflows need to authenticate to registries or external services."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New secret
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {s.key}
                    </span>
                    <Badge variant="muted">{s.environment}</Badge>
                  </div>
                  {s.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    created {formatRelative(s.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setToDelete(s)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <CreateSecretDialog
        open={createOpen}
        defaultEnvironment={environment}
        defaultKey={
          (environment === "ci" || environment === "cd") && !hasGhcrToken
            ? RECOMMENDED
            : ""
        }
        onOpenChange={setCreateOpen}
        projectId={id}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete secret?"
        description={
          toDelete ? (
            <>
              The secret{" "}
              <span className="font-mono text-foreground">{toDelete.key}</span>{" "}
              will be permanently deleted from the{" "}
              <span className="font-mono">{toDelete.environment}</span>{" "}
              environment.
            </>
          ) : null
        }
        confirmLabel="Delete secret"
        destructive
        loading={deleteMutation.isPending}
        onOpenChange={(open) => !open && setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </div>
  );
}

function CreateSecretDialog({
  open,
  projectId,
  defaultEnvironment,
  defaultKey,
  onOpenChange,
}: {
  open: boolean;
  projectId: string;
  defaultEnvironment: string;
  defaultKey?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const onError = useToastError();
  const [environment, setEnvironment] = useState(defaultEnvironment);
  const [key, setKey] = useState(defaultKey ?? "");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setEnvironment(defaultEnvironment);
      setKey(defaultKey ?? "");
      setValue("");
      setDescription("");
      setErrors({});
    }
  }, [open, defaultEnvironment, defaultKey]);

  const mutation = useMutation({
    mutationFn: () =>
      secretService.create(projectId, {
        environment,
        key: key.trim(),
        value,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Secret saved");
      qc.invalidateQueries({ queryKey: ["project", projectId, "secrets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (err) => onError(err, "Could not save secret"),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!key.trim()) next.key = "Secret key is required.";
    else if (!/^[A-Z0-9_]+$/.test(key))
      next.key = "Use uppercase letters, digits and underscores only.";
    if (!value) next.value = "Value is required.";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New secret</DialogTitle>
          <DialogDescription>
            The value is sent once and never returned. Only the key and
            description are stored visibly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="env">Environment</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger id="env">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((env) => (
                    <SelectItem key={env} value={env}>
                      {env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                placeholder="GHCR_TOKEN"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="font-mono text-sm"
              />
              {errors.key ? (
                <p className="text-xs text-destructive">{errors.key}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="font-mono text-sm"
            />
            {errors.value ? (
              <p className="text-xs text-destructive">{errors.value}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="What is this secret used for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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
              Save secret
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
