import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { observabilityPollInterval, pendingSubmissionKey } from "./use-observability-activation";

describe("Observability polling and recovery boundaries", () => {
  it("honors Retry-After even beyond the ordinary 30-second backoff", () => {
    const errorUpdatedAt = Date.now();
    const interval = observabilityPollInterval({ state: { error: new ApiError("Rate limited", 429, "rate_limited", { retry_after_ms: 120000 }), errorUpdatedAt, errorUpdateCount: 1 } }, 5000);
    expect(interval).toBeGreaterThan(119000);
  });
  it("backs off network errors and stops polling when access is denied", () => {
    expect(observabilityPollInterval({ state: { error: new Error("Offline"), errorUpdatedAt: 0, errorUpdateCount: 8 } }, 5000)).toBe(30000);
    expect(observabilityPollInterval({ state: { error: new ApiError("Forbidden", 403, "forbidden"), errorUpdatedAt: 0, errorUpdateCount: 1 } }, 5000)).toBe(false);
  });
  it("isolates pending receipts between identities and targets", () => {
    const scope = { actorId: "alice", projectId: "project", repositoryId: "repo", targetId: "dev", serviceKey: "api" };
    expect(pendingSubmissionKey(scope)).not.toBe(pendingSubmissionKey({ ...scope, actorId: "bob" }));
    expect(pendingSubmissionKey(scope)).not.toBe(pendingSubmissionKey({ ...scope, targetId: "prod" }));
  });
});
