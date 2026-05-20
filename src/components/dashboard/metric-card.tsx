import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  tone?: "violet" | "blue" | "emerald" | "amber";
  className?: string;
}

const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  violet: "from-primary/30 to-transparent text-primary",
  blue: "from-accent/30 to-transparent text-accent",
  emerald: "from-success/30 to-transparent text-success",
  amber: "from-warning/30 to-transparent text-warning",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "violet",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("relative overflow-hidden p-5", className)}>
      <div
        className={cn(
          "pointer-events-none absolute -top-12 right-0 h-32 w-32 rounded-full bg-gradient-to-br opacity-50 blur-2xl",
          toneStyles[tone],
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-inset",
            "bg-surface-elevated",
            tone === "violet" && "text-primary ring-primary/30",
            tone === "blue" && "text-accent ring-accent/30",
            tone === "emerald" && "text-success ring-success/30",
            tone === "amber" && "text-warning ring-warning/30",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
