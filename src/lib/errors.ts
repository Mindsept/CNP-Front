import { AxiosError, isAxiosError } from "axios";
import type { ApiErrorPayload } from "@/types/api";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function parseApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (isAxiosError(err)) {
    const axiosError = err as AxiosError<ApiErrorPayload>;
    const status = axiosError.response?.status ?? 0;
    const payload = axiosError.response?.data;

    if (payload && typeof payload === "object" && "error" in payload) {
      const apiError = payload.error;
      return new ApiError(
        apiError?.message || axiosError.message || "Unknown error",
        status,
        apiError?.code || "unknown",
        apiError?.details,
      );
    }

    if (status === 0 || axiosError.code === "ERR_NETWORK") {
      return new ApiError(
        "Could not reach the platform. Check your connection.",
        0,
        "network_error",
      );
    }

    return new ApiError(
      axiosError.message || "Request failed",
      status,
      "request_failed",
    );
  }

  if (err instanceof Error) {
    return new ApiError(err.message, 0, "unknown");
  }

  return new ApiError("Unexpected error", 0, "unknown");
}

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
