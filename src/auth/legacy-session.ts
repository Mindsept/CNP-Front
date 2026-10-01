const LEGACY_STORAGE_KEYS = [
  "cnp.access_token",
  "cnp.refresh_token",
  "cnp.user",
] as const;

export function clearLegacyAuthSession(): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}
