import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth as useOidcAuth } from "react-oidc-context";
import { oidcClaimsToIdentity } from "@/auth/claims";
import { authService } from "@/services/auth.service";
import { mcpService } from "@/services/mcp.service";
import { safeReturnTo, type OidcNavigationState } from "@/auth/navigation";

export function useAuth() {
  const oidc = useOidcAuth();
  const { signinRedirect, signoutRedirect } = oidc;
  const queryClient = useQueryClient();
  const identity = oidc.user ? oidcClaimsToIdentity(oidc.user.profile) : null;
  const profile = useQuery({
    queryKey: ["cnp-profile", identity?.issuer, identity?.subject],
    queryFn: ({ signal }) => authService.me(signal),
    enabled: oidc.isAuthenticated && !!identity,
    retry: false,
    staleTime: 30_000,
  });
  useEffect(() => {
    if (!oidc.isAuthenticated) queryClient.clear();
  }, [oidc.isAuthenticated, queryClient]);
  const user = oidc.isAuthenticated && !profile.isError ? profile.data ?? null : null;

  const login = useCallback(
    async (returnTo = "/") => {
      const state: OidcNavigationState = {
        returnTo: safeReturnTo(returnTo),
      };
      await signinRedirect({
        state,
        nonce: window.crypto.randomUUID(),
      });
    },
    [signinRedirect],
  );

  const logout = useCallback(async () => {
    queryClient.clear();
    // A failed API request must not prevent the identity-provider logout.
    await mcpService.logout().catch(() => undefined);
    await signoutRedirect();
  }, [signoutRedirect, queryClient]);

  return {
    user,
    identity,
    isIdentityAuthenticated: oidc.isAuthenticated,
    accessToken: oidc.user?.access_token ?? null,
    isAuthenticated: oidc.isAuthenticated && !!user,
    isLoading: oidc.isLoading || oidc.activeNavigator === "signinSilent" ||
      (oidc.isAuthenticated && profile.isPending),
    error: oidc.error ?? profile.error ?? null,
    retryProfile: profile.refetch,
    login,
    logout,
  };
}
