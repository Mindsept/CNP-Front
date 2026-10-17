export function canApproveReview(acknowledged: boolean, busy: boolean, status: string, fingerprint: string, challenge: { fingerprint: string; expires_at: string } | null, now = Date.now()): boolean {
  return Boolean(acknowledged && !busy && ["prepared", "awaiting_review"].includes(status) && challenge &&
    challenge.fingerprint === fingerprint && Number.isFinite(Date.parse(challenge.expires_at)) && now < Date.parse(challenge.expires_at));
}
export function safeLoginDestination(requested: string | null): string {
  return requested?.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") ? requested : "/";
}
