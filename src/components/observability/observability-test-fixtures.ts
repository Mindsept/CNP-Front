import type { ActivationPlan, ObservabilityContext, ObservabilityOperation } from "@/types/observability";

export const contextFixture: ObservabilityContext = {
  "scope": {
    "project_id": "99999999-9999-4999-8999-999999999999",
    "repository_id": "77777777-7777-4777-8777-777777777777",
    "cloud_target_id": "22222222-2222-4222-8222-222222222222",
    "service_key": "api-commandes",
    "environment": "dev",
    "profile": "fastapi-otlp-v1"
  },
  "binding_id": "33333333-3333-4333-8333-333333333333",
  "desired_enabled": false,
  "desired_revision": 4,
  "current_effective_revision": 4,
  "health": {
    "status": "active",
    "observed_at": "2026-10-29T12:00:00Z",
    "verified_revision": 4,
    "last_verified_at": "2026-10-29T11:59:55Z",
    "reason_code": null
  },
  "application_status": "ready",
  "current_image": {
    "reference": "ghcr.io/cnp-demo/api@sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "digest": "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "platform_digest": null,
    "image_commit_sha": null,
    "build_id": null,
    "ci_run_id": null,
    "ci_run_attempt": null
  },
  "current_image_state": "verified",
  "latest_operation_id": null,
  "can_manage": true,
  "capabilities": {
    "enable": {
      "available": true,
      "reason_code": null,
      "message": null
    },
    "disable": {
      "available": true,
      "reason_code": null,
      "message": null
    }
  },
  "refresh_after_seconds": 30
};

export const planFixture: ActivationPlan = {
  "plan_id": "11111111-1111-4111-8111-111111111111",
  "binding_id": "33333333-3333-4333-8333-333333333333",
  "scope": {
    "project_id": "99999999-9999-4999-8999-999999999999",
    "repository_id": "77777777-7777-4777-8777-777777777777",
    "cloud_target_id": "22222222-2222-4222-8222-222222222222",
    "service_key": "api-commandes",
    "environment": "dev",
    "profile": "fastapi-otlp-v1"
  },
  "intent": "enable",
  "status": "ready",
  "plan_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "expected_revision": 4,
  "current_effective_revision": 4,
  "current_image": {
    "reference": "ghcr.io/cnp-demo/api@sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "digest": "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "platform_digest": null,
    "image_commit_sha": null,
    "build_id": null,
    "ci_run_id": null,
    "ci_run_attempt": null
  },
  "current_image_state": "verified",
  "candidate_image": {
    "reference": "ghcr.io/cnp-demo/api@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "platform_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "image_commit_sha": "dddddddddddddddddddddddddddddddddddddddd",
    "build_id": "44444444-4444-4444-8444-444444444444",
    "ci_run_id": 12345,
    "ci_run_attempt": 1
  },
  "selection_context": {
    "branch_name": "main",
    "branch_head_sha": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "head_ci_status": "failed",
    "selected_commit_sha": "dddddddddddddddddddddddddddddddddddddddd",
    "reason": "head_ci_failed",
    "verified_at": "2026-10-29T12:00:00Z"
  },
  "build_id": "44444444-4444-4444-8444-444444444444",
  "cd_pipeline_id": "88888888-8888-4888-8888-888888888888",
  "deployment_source_sha": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "branch_head_sha": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "deployment_required": true,
  "restart_required": true,
  "application_rollouts": 2,
  "collection_interruption_expected": true,
  "effects": [
    {
      "code": "deploy_selected_image",
      "description": "Déployer la version applicative affichée sur la cible DEV."
    },
    {
      "code": "disable_instrumentation_during_deployment",
      "description": "Créer les nouveaux pods avec instrumentation désactivée pour éviter toute attribution à l'ancienne version."
    },
    {
      "code": "restart_application",
      "description": "Redémarrer les processus pour charger l'instrumentation."
    },
    {
      "code": "second_application_rollout",
      "description": "Effectuer un second rollout avec l'identité de la nouvelle version."
    },
    {
      "code": "collection_interruption",
      "description": "La collecte peut être interrompue pendant cette transition."
    },
    {
      "code": "configure_collector",
      "description": "Configurer le Collector dédié au binding."
    }
  ],
  "blockers": [],
  "created_at": "2026-10-29T12:00:00Z",
  "expires_at": "2099-01-01T00:00:00Z"
};

export const operationFixture: ObservabilityOperation = {
  "operation_id": "55555555-5555-4555-8555-555555555555",
  "plan_id": "11111111-1111-4111-8111-111111111111",
  "plan_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "binding_id": "33333333-3333-4333-8333-333333333333",
  "scope": {
    "project_id": "99999999-9999-4999-8999-999999999999",
    "repository_id": "77777777-7777-4777-8777-777777777777",
    "cloud_target_id": "22222222-2222-4222-8222-222222222222",
    "service_key": "api-commandes",
    "environment": "dev",
    "profile": "fastapi-otlp-v1"
  },
  "intent": "enable",
  "status": "queued",
  "stage": "accepted",
  "desired_revision": 5,
  "current_effective_revision": 4,
  "attempt_number": 1,
  "previous_operation_id": null,
  "image": {
    "reference": "ghcr.io/cnp-demo/api@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "platform_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "image_commit_sha": "dddddddddddddddddddddddddddddddddddddddd",
    "build_id": "44444444-4444-4444-8444-444444444444",
    "ci_run_id": 12345,
    "ci_run_attempt": 1
  },
  "deployment_source_sha": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "effects": [
    {
      "code": "deploy_selected_image",
      "description": "Déployer la version applicative affichée sur la cible DEV."
    },
    {
      "code": "disable_instrumentation_during_deployment",
      "description": "Créer les nouveaux pods avec instrumentation désactivée pour éviter toute attribution à l'ancienne version."
    },
    {
      "code": "restart_application",
      "description": "Redémarrer les processus pour charger l'instrumentation."
    },
    {
      "code": "second_application_rollout",
      "description": "Effectuer un second rollout avec l'identité de la nouvelle version."
    },
    {
      "code": "collection_interruption",
      "description": "La collecte peut être interrompue pendant cette transition."
    },
    {
      "code": "configure_collector",
      "description": "Configurer le Collector dédié au binding."
    }
  ],
  "application_rollouts": 2,
  "collection_interruption_expected": true,
  "health": {
    "status": "unknown",
    "observed_at": "2026-10-29T12:01:00Z",
    "verified_revision": null,
    "last_verified_at": null,
    "reason_code": "activation_pending"
  },
  "evidence": {
    "cd_action_id": null,
    "cd_workflow_run_id": null,
    "verified_revision": null,
    "deployment_verified_at": null,
    "signals_verified_at": null,
    "disable_verified_at": null
  },
  "failure": null,
  "retryable": false,
  "next_action": "wait",
  "created_at": "2026-10-29T12:01:00Z",
  "updated_at": "2026-10-29T12:01:00Z",
  "stage_deadline_at": null,
  "completed_at": null,
  "refresh_after_seconds": 5
};
