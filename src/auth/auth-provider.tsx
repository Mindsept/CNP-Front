import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from "react-oidc-context";
import {
  handleSigninCallback,
  handleSignoutCallback,
} from "@/auth/callbacks";
import { loadLocalDemoSession, oidcUserManager } from "@/auth/oidc-client";
import { env } from "@/config/env";

function SessionRenewalFailureHandler() {
  const auth = useOidcAuth();
  const { events, removeUser } = auth;
  const handlingFailure = useRef(false);

  useEffect(() => {
    const handleSilentRenewError = () => {
      if (handlingFailure.current) return;
      handlingFailure.current = true;

      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = `/login?reason=session-expired&next=${encodeURIComponent(
        currentPath,
      )}`;

      void removeUser().finally(() => {
        if (
          !window.location.pathname.startsWith("/login") &&
          !window.location.pathname.startsWith("/auth/")
        ) {
          window.location.replace(loginUrl);
        }
        handlingFailure.current = false;
      });
    };

    events.addSilentRenewError(handleSilentRenewError);
    return () => events.removeSilentRenewError(handleSilentRenewError);
  }, [events, removeUser]);

  return null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(!env.localDemo);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!env.localDemo) return;
    let cancelled = false;
    void loadLocalDemoSession().then(() => {
      if (!cancelled) setReady(true);
    }).catch((failure: Error) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, []);
  if (!ready) return <div className="p-8" role="status">{error ?? "Opening local administrator session…"}</div>;
  return (
    <OidcAuthProvider
      userManager={oidcUserManager}
      skipSigninCallback={window.location.pathname !== "/auth/callback"}
      matchSignoutCallback={() =>
        window.location.pathname === "/auth/logout/callback"
      }
      onSigninCallback={handleSigninCallback}
      onSignoutCallback={handleSignoutCallback}
    >
      {env.localDemo ? <div role="status" className="bg-amber-950 px-4 py-2 text-center text-xs text-amber-200">Démo locale — session administrateur sans Keycloak. Authentification cloud inchangée.</div> : <SessionRenewalFailureHandler />}
      {children}
    </OidcAuthProvider>
  );
}
