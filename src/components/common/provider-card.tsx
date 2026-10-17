import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProviderCardProps {
  logo: ReactNode;
  name: string;
  subtitle: string;
  enabled?: boolean;
  configured?: boolean;
  comingSoon?: boolean;
  comingSoonLabel?: string;
  children?: ReactNode;
}

export function ProviderCard({
  logo,
  name,
  subtitle,
  enabled,
  configured,
  comingSoon,
  comingSoonLabel = "Coming soon",
  children,
}: ProviderCardProps) {
  return (
    <Card className={`space-y-3 p-4 ${comingSoon ? "opacity-60" : ""}`} aria-disabled={comingSoon}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/60">
          {logo}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {enabled && configured ? <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-success" /> : null}
      </div>
      {comingSoon ? <Badge variant="muted">{comingSoonLabel}</Badge> : children}
    </Card>
  );
}
