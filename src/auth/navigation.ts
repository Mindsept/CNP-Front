export interface OidcNavigationState {
  returnTo: string;
}

export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/auth/callback") ||
    value.startsWith("/auth/logout/callback")
  ) {
    return "/";
  }

  return value;
}

export function getReturnToFromState(state: unknown): string {
  if (!state || typeof state !== "object" || !("returnTo" in state)) {
    return "/";
  }

  return safeReturnTo((state as { returnTo?: unknown }).returnTo);
}
