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
export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon
          className="h-4 w-4 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 text-[34px] font-medium leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-3 min-h-4 text-xs text-muted-foreground">
        {hint || "In your workspace"}
      </p>
    </Card>
  );
}
