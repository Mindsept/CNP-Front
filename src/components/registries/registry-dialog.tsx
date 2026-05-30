import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { GhcrLogo } from "@/components/common/provider-logos";
import type {
  ContainerRegistry,
  CreateContainerRegistryInput,
} from "@/types/container-registry";

interface RegistryDialogProps {
  open: boolean;
  loading?: boolean;
  existing?: ContainerRegistry | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateContainerRegistryInput) => void;
}

const defaults = {
  name: "ghcr",
  registry_url: "ghcr.io",
  namespace: "",
  auth_secret_name: "GHCR_TOKEN",
  description: "Shared GHCR registry",
};

export function RegistryDialog({
  open,
  loading,
  existing,
  onOpenChange,
  onSubmit,
}: RegistryDialogProps) {
  const [name, setName] = useState(defaults.name);
  const [registryUrl, setRegistryUrl] = useState(defaults.registry_url);
  const [namespace, setNamespace] = useState(defaults.namespace);
  const [authSecretName, setAuthSecretName] = useState(
    defaults.auth_secret_name,
  );
  const [token, setToken] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [description, setDescription] = useState(defaults.description);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? defaults.name);
    setRegistryUrl(existing?.registry_url ?? defaults.registry_url);
    setNamespace(existing?.namespace ?? defaults.namespace);
    setAuthSecretName(existing?.auth_secret_name ?? defaults.auth_secret_name);
    setToken("");
    setIsDefault(existing?.is_default ?? true);
    setDescription(existing?.description ?? defaults.description);
  }, [open, existing]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload: CreateContainerRegistryInput = {
      name: name.trim(),
      provider: "ghcr",
      registry_url: registryUrl.trim(),
      namespace: namespace.trim(),
      auth_secret_name: authSecretName.trim() || "GHCR_TOKEN",
      token,
      is_default: isDefault,
      description: description.trim() || undefined,
    };

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[registry] upsert payload", {
        ...payload,
        token: token ? `***(${token.length} chars)` : "",
      });
    }

    onSubmit(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <GhcrLogo className="h-4 w-4" />
              {existing ? "Update GHCR registry" : "Configure GHCR registry"}
            </span>
          </DialogTitle>
          <DialogDescription>
            Shared GitHub Container Registry used by generated CI/CD pipelines to
            push and pull images. The token is stored encrypted and never shown
            again.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reg-name" className="text-xs">
                Name
              </Label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-url" className="text-xs">
                Registry URL
              </Label>
              <Input
                id="reg-url"
                value={registryUrl}
                onChange={(e) => setRegistryUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-ns" className="text-xs">
                Namespace (GitHub owner)
              </Label>
              <Input
                id="reg-ns"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                placeholder="hamza-hnt"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-secret" className="text-xs">
                Auth secret name
              </Label>
              <Input
                id="reg-secret"
                value={authSecretName}
                onChange={(e) =>
                  setAuthSecretName(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
                  )
                }
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-token" className="flex items-center gap-1.5 text-xs">
              <Lock className="h-3 w-3" />
              GitHub token (PAT) · encrypted, never displayed back
            </Label>
            <Input
              id="reg-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={existing ? "leave blank to keep current token" : "ghp_…"}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-desc" className="text-xs">
              Description (optional)
            </Label>
            <Textarea
              id="reg-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface/60 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="reg-default" className="cursor-pointer">
                Set as default registry
              </Label>
              <p className="text-xs text-muted-foreground">
                Projects use the default registry automatically; developers don't
                re-enter the token per project.
              </p>
            </div>
            <Switch
              id="reg-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
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
            <Button type="submit" loading={loading} disabled={!existing && !token}>
              {existing ? "Update registry" : "Save registry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
