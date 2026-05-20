import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  icon: Icon,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("relative pb-7", className)}>
      {/* Soft ambient glow behind the header */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-6 -bottom-2 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60% 80% at 0% 0%, rgba(168,85,247,0.10), transparent 60%), radial-gradient(50% 70% at 100% 0%, rgba(56,189,248,0.07), transparent 60%)",
        }}
      />

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          {Icon ? (
            <div className="relative hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 ring-1 ring-inset ring-primary/25 md:flex">
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
              <Icon className="relative h-5 w-5 text-primary" />
            </div>
          ) : null}

          <div className="space-y-2.5">
            {eyebrow ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/90 backdrop-blur-sm">
                <span className="h-1 w-1 rounded-full bg-primary" />
                {eyebrow}
              </span>
            ) : null}
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-[28px] lg:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {/* Gradient separator */}
      <div className="mt-7 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
