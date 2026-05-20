import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  error,
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  const message =
    description ??
    (error ? getErrorMessage(error, "Unexpected error") : "Unexpected error");
  const code = error instanceof ApiError ? error.code : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/30">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {code ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground/70">
          code: {code}
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
