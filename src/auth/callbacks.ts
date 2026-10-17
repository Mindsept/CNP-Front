import type { User } from "oidc-client-ts";
import { getReturnToFromState } from "@/auth/navigation";

export function handleSigninCallback(user: User | undefined): void {
  const returnTo = getReturnToFromState(user?.state);
  window.history.replaceState({}, document.title, returnTo);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function handleSignoutCallback(): void {
  window.history.replaceState({}, document.title, "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
}
