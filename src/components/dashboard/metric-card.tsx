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

const toneGlow: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  violet: "from-primary/40 to-transparent",
  blue: "from-accent/40 to-transparent",
  emerald: "from-success/40 to-transparent",
  amber: "from-warning/40 to-transparent",
};

const toneIcon: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  violet: "text-primary ring-primary/25 bg-primary/10",
  blue: "text-accent ring-accent/25 bg-accent/10",
  emerald: "text-success ring-success/25 bg-success/10",
  amber: "text-warning ring-warning/25 bg-warning/10",
};

const toneBar: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  violet: "via-primary/60",
  blue: "via-accent/60",
  emerald: "via-success/60",
  amber: "via-warning/60",
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
    <Card
      className={cn(
        "group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-gradient-to-br opacity-50 blur-3xl transition-opacity duration-300 group-hover:opacity-80",
          toneGlow[tone],
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          toneBar[tone],
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-inset transition-transform duration-200 group-hover:scale-105",
            toneIcon[tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </Card>
  );
}
