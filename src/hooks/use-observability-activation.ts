import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, getErrorMessage } from "@/lib/errors";
import { observabilityService as service } from "@/services/observability.service";
import type { ObservabilityIntent, ObservabilityOperation, ObservabilityScope, OperationRequest } from "@/types/observability";

export interface ActivationScope { actorId: string; projectId: string; repositoryId: string; targetId: string; serviceKey: string }
interface PendingSubmission {
  version: 1;
  kind: "start" | "retry";
  key: string;
  planId: string;
  sourceId: string;
  request: OperationRequest;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function pendingSubmissionKey(scope: ActivationScope) {
  return "cnp:observability:pending:" + JSON.stringify([scope.actorId, scope.projectId, scope.repositoryId, scope.targetId, scope.serviceKey]);
}
function readPending(key: string): PendingSubmission | null {
  try {
    const item: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (!item || typeof item !== "object") return null;
    const p = item as PendingSubmission;
    return p.version === 1 && ["start", "retry"].includes(p.kind) && uuid.test(p.key) && uuid.test(p.planId) && uuid.test(p.sourceId) &&
      /^[a-f0-9]{64}$/.test(p.request?.expected_plan_digest) && Number.isInteger(p.request.expected_revision) && p.request.expected_revision >= 0 ? p : null;
  } catch { return null; }
}
export function matchesObservabilityScope(value: ObservabilityScope, scope: ActivationScope) {
  return value.project_id === scope.projectId && value.repository_id === scope.repositoryId && value.cloud_target_id === scope.targetId && value.service_key === scope.serviceKey;
}
function scoped<T extends { scope: ObservabilityScope }>(value: T, scope: ActivationScope): T {
  if (!matchesObservabilityScope(value.scope, scope)) throw new ApiError("The response belongs to another application or target. Refresh this page.", 409, "scope_mismatch");
  return value;
}
export function isOperationRunning(operation?: ObservabilityOperation) {
  return operation?.status === "queued" || operation?.status === "running";
}
export function observabilityPollInterval(query: { state: { error: unknown; errorUpdatedAt: number; errorUpdateCount: number } }, normal: number): number | false {
  const error = query.state.error;
  if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
  if (error instanceof ApiError && error.status === 429) {
    const delay = Number(error.details?.retry_after_ms ?? 30000);
    return Math.max(1000, query.state.errorUpdatedAt + delay - Date.now());
  }
  return error ? Math.min(30000, 5000 * 2 ** Math.min(query.state.errorUpdateCount, 3)) : normal;
}

// Mount this hook in a component keyed by actor + scope: a late response cannot update another target.
export function useObservabilityActivation(scope: ActivationScope, initialOperationId: string | null, onOperation: (id: string) => void) {
  const client = useQueryClient();
  const prefix = ["observability", "activation", scope.actorId, scope.projectId, scope.repositoryId, scope.targetId, scope.serviceKey];
  const storageKey = pendingSubmissionKey(scope);
  const [pending, setPending] = useState(() => readPending(storageKey));
  const [operationId, setOperationId] = useState(initialOperationId && uuid.test(initialOperationId) ? initialOperationId : null);
  const [intent, setIntent] = useState<ObservabilityIntent>("enable");
  const [generation, setGeneration] = useState(0);
  const [invalidPlan, setInvalidPlan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const context = useQuery({
    queryKey: [...prefix, "context"],
    queryFn: async ({ signal }) => {
      const value = scoped(await service.context(scope.repositoryId, scope.targetId, scope.serviceKey, signal), scope);
      if (!["active", "degraded", "disabled", "unknown"].includes(value.health.status))
        throw new ApiError("The server returned an unknown telemetry status. Refresh before making changes.", 409, "unknown_health_status");
      return value;
    },
    retry: false, refetchOnWindowFocus: "always", refetchIntervalInBackground: false,
    refetchInterval: query => observabilityPollInterval(query, 30000),
  });
  const history = useQuery({
    queryKey: [...prefix, "operations", pending?.planId ?? null],
    queryFn: async ({ signal }) => {
      const result = await service.operations(scope.repositoryId, scope.targetId, scope.serviceKey, pending?.planId, signal);
      result.items.forEach(item => scoped(item, scope));
      return result;
    },
    enabled: context.isSuccess, retry: false, refetchOnWindowFocus: "always", refetchIntervalInBackground: false,
    refetchInterval: query => pending ? observabilityPollInterval(query, 5000) : false,
  });
  const effectiveOperationId = operationId ?? context.data?.latest_operation_id ?? history.data?.items[0]?.operation_id;
  const operation = useQuery({
    queryKey: [...prefix, "operation", effectiveOperationId],
    queryFn: async ({ signal }) => {
      const value = scoped(await service.operation(effectiveOperationId!, signal), scope);
      if (!["queued", "running", "succeeded", "failed", "superseded"].includes(value.status))
        throw new ApiError("The server returned an unknown operation status. Refresh before making changes.", 409, "unknown_operation_status");
      if (value.status === "succeeded" && (value.evidence.verified_revision !== value.desired_revision ||
        (value.intent === "enable" ? !(value.evidence.deployment_verified_at && value.evidence.signals_verified_at) : !value.evidence.disable_verified_at)))
        throw new ApiError("The operation completion has no matching verification evidence. Refresh its status.", 409, "operation_evidence_unavailable");
      return value;
    },
    enabled: Boolean(effectiveOperationId && context.isSuccess), retry: false,
    refetchOnWindowFocus: "always", refetchIntervalInBackground: false,
    refetchInterval: query => query.state.error ? observabilityPollInterval(query, 5000) : isOperationRunning(query.state.data) ? 5000 : false,
  });
  const currentOperation = operation.data;
  useEffect(() => {
    if (context.data?.latest_operation_id) setOperationId(context.data.latest_operation_id);
    // Read the current decision again after another browser or actor changes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.dataUpdatedAt]);
  const operationUncertain = Boolean(effectiveOperationId && !operation.isSuccess) || history.isError;
  const active = isOperationRunning(currentOperation);
  const canManage = context.isSuccess && context.data.can_manage;
  const capability = context.data?.capabilities[intent];
  const planQuery = useQuery({
    queryKey: [...prefix, "plan", intent, context.data?.desired_revision, generation],
    queryFn: async ({ signal }) => {
      const result = scoped(await service.prepareActivationPlan(scope.repositoryId, scope.targetId, scope.serviceKey, intent, signal), scope);
      if (result.intent !== intent) throw new ApiError("The plan does not match the requested change. Refresh it.", 409, "scope_mismatch");
      return result;
    },
    enabled: canManage && capability?.available === true && history.isSuccess && !pending && !active && !operationUncertain && !invalidPlan,
    retry: false, staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const plan = planQuery.data;
  useEffect(() => {
    if (!plan || plan.status !== "ready") return;
    const timer = window.setInterval(() => tick(n => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [plan]);
  const expired = Boolean(plan && Date.parse(plan.expires_at) <= Date.now());
  const planReady = canManage && capability?.available === true && planQuery.isSuccess && plan?.status === "ready" &&
    plan.expected_revision === context.data?.desired_revision && !expired && !invalidPlan && !active && !pending && !busy && !operationUncertain;

  function forgetPending() {
    try { sessionStorage.removeItem(storageKey); } catch { /* Server history remains authoritative. */ }
    if (mounted.current) setPending(null);
  }
  function follow(value: ObservabilityOperation) {
    scoped(value, scope);
    client.setQueryData([...prefix, "operation", value.operation_id], value);
    forgetPending();
    if (!mounted.current) return;
    setOperationId(value.operation_id);
    setError(null);
    onOperation(value.operation_id);
    void client.invalidateQueries({ queryKey: [...prefix, "context"] });
    void client.invalidateQueries({ queryKey: [...prefix, "operations"] });
    void client.invalidateQueries({ queryKey: ["observability", "bindings", scope.projectId] });
  }
  useEffect(() => {
    if (!pending || !history.isSuccess) return;
    const recovered = history.data.items.find(item => item.plan_id === pending.planId &&
      (pending.kind === "start" || item.previous_operation_id === pending.sourceId));
    if (recovered) follow(recovered);
    // An empty list is not proof that an in-flight submission was rejected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, history.data, history.isSuccess]);
  useEffect(() => {
    if (currentOperation && !isOperationRunning(currentOperation)) void context.refetch();
    // Only a transition of this operation invalidates live health, not every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOperation?.operation_id, currentOperation?.status]);

  async function submit(submission: PendingSubmission) {
    if (lock.current || !canManage || !context.isSuccess) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      // Persist before dispatch. A reload reuses this receipt; never persist credentials.
      sessionStorage.setItem(storageKey, JSON.stringify(submission));
      setPending(submission);
      const value = submission.kind === "start"
        ? await service.startOperation(submission.sourceId, submission.request, submission.key)
        : await service.retryOperation(submission.sourceId, submission.request, submission.key);
      follow(value);
    } catch (caught) {
      if (!mounted.current) return;
      const definitive = caught instanceof ApiError && caught.status >= 400 && caught.status < 500 && caught.status !== 408 &&
        !["idempotency_conflict", "scope_mismatch"].includes(caught.code) && !(pending && [401, 403].includes(caught.status));
      if (definitive) {
        forgetPending();
        if (["plan_obsolete", "plan_expired", "plan_not_executable", "revision_superseded"].includes(caught.code)) setInvalidPlan(true);
        const existing = caught.details?.operation_id;
        if (caught.code === "operation_in_progress" && typeof existing === "string" && uuid.test(existing)) {
          setOperationId(existing);
          onOperation(existing);
        }
      }
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) void context.refetch();
      setError(getErrorMessage(caught, "The request could not be confirmed. Check its status before trying again."));
      void history.refetch();
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function start() {
    if (!planReady || !plan || Date.parse(plan.expires_at) <= Date.now()) return;
    void submit({ version: 1, kind: "start", key: crypto.randomUUID(), planId: plan.plan_id, sourceId: plan.plan_id,
      request: { expected_plan_digest: plan.plan_digest, expected_revision: plan.expected_revision } });
  }
  function retry() {
    if (!currentOperation || !operation.isSuccess || !canManage || busy || pending || currentOperation.status !== "failed" ||
      !currentOperation.retryable || context.data?.desired_revision !== currentOperation.desired_revision) return;
    void submit({ version: 1, kind: "retry", key: crypto.randomUUID(), planId: currentOperation.plan_id, sourceId: currentOperation.operation_id,
      request: { expected_plan_digest: currentOperation.plan_digest, expected_revision: currentOperation.desired_revision } });
  }
  function refreshPlan() {
    if (pending || busy || active) return;
    setInvalidPlan(false);
    setError(null);
    setGeneration(n => n + 1);
  }
  function changeIntent(value: ObservabilityIntent) {
    if (pending || busy || active) return;
    setIntent(value);
    setInvalidPlan(false);
    setError(null);
  }
  function refreshStatus() {
    void context.refetch();
    void history.refetch();
    if (effectiveOperationId) void operation.refetch();
  }
  return { context, history, operation, planQuery, plan, intent, changeIntent, pending, busy, active, error,
    canManage, capability, planReady, expired, invalidPlan, operationUncertain, start, retry, refreshPlan, refreshStatus,
    replay: () => { if (pending) void submit(pending); } };
}
