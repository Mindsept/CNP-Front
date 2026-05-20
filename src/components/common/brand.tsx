import { useState } from "react";
import { cn } from "@/lib/utils";
import { env } from "@/config/env";

interface BrandProps {
  variant?: "full" | "mark";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Brand({ variant = "full", className, size = "md" }: BrandProps) {
  const [failed, setFailed] = useState(false);

  const dim =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const textSize =
    size === "sm"
      ? "text-sm"
      : size === "lg"
        ? "text-lg"
        : "text-base";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {failed ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-md bg-primary/15 font-mono font-semibold text-primary ring-1 ring-primary/30",
            dim,
            size === "sm" ? "text-[10px]" : "text-xs",
          )}
        >
          CNP
        </div>
      ) : (
        <img
          src="/logo.png"
          alt="Cloud Native Platform"
          className={cn("rounded-md object-contain", dim)}
          onError={() => setFailed(true)}
        />
      )}
      {variant === "full" ? (
        <div className="flex flex-col leading-tight">
          <span className={cn("font-semibold tracking-tight", textSize)}>
            {env.appName}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Internal Developer Platform
          </span>
        </div>
      ) : null}
    </div>
  );
}
