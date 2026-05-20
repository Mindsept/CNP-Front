import { useCallback } from "react";
import { toast } from "sonner";
import { ApiError, getErrorMessage } from "@/lib/errors";

export function useToastError() {
  return useCallback((err: unknown, fallback = "Something went wrong") => {
    const message = getErrorMessage(err, fallback);
    if (err instanceof ApiError) {
      toast.error(message, {
        description:
          err.code && err.code !== "unknown" ? `code: ${err.code}` : undefined,
      });
    } else {
      toast.error(message);
    }
  }, []);
}
