export interface TrafficConfiguration {
  id: string; profile_id: string; credential_secret_id: string; version: number;
  destinations: { pipeline_id: string; endpoint_name: string }[];
  pending_action_id: string | null;
}
export interface TrafficStatus {
  state: "connected" | "unavailable";
  configuration: TrafficConfiguration;
  error_code?: string; checked_at: string;
  common_url?: string; ttl?: number; preferred?: string; effective?: string | null;
  dns?: { state: "matches_destination" | "different_answer" | "unavailable"; checked_at?: string; resolver?: string };
  destinations?: { name: string; cloud: string; target: string; health: string; priority: number }[];
  history: { id: string; status: string; destination: string; created_at: string; error_code: string | null; effects: Record<string, unknown> }[];
}
export interface TrafficInput {
  profile_id: string; credential_secret_id: string;
  destinations: { pipeline_id: string; endpoint_name: string }[];
}
