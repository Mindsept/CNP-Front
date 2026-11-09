import { Layers2 } from "lucide-react";
import { cn } from "@/lib/utils";
interface BrandProps {
  variant?: "full" | "mark";
  className?: string;
  size?: "sm" | "md" | "lg";
}
export function Brand({
  variant = "full",
  className,
  size = "md",
}: BrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center text-primary",
          size === "lg" ? "h-10 w-10" : "h-8 w-8",
        )}
      >
        <Layers2
          aria-hidden="true"
          className={size === "lg" ? "h-9 w-9" : "h-7 w-7"}
          strokeWidth={1.5}
        />
      </span>
      {variant === "full" ? (
        <div>
          <span
            className={cn(
              "font-semibold leading-none tracking-[-0.04em]",
              size === "sm" ? "text-xl" : "text-2xl",
            )}
          >
            CNP<span className="text-primary">.</span>
          </span>
          {size !== "sm" && (
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">
              Cloud Native Platform
            </span>
          )}
        </div>
      ) : (
        <span className="sr-only">Cloud Native Platform</span>
      )}
    </div>
  );
}
