export interface AuditEvent {
  id: string;
  actor_id: string | null;
  project_id: string | null;
  repository_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}
