import { useEffect, useRef, type PropsWithChildren } from "react";
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from "react-oidc-context";
import {
  handleSigninCallback,
  handleSignoutCallback,
} from "@/auth/callbacks";
import { oidcUserManager } from "@/auth/oidc-client";

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
      <SessionRenewalFailureHandler />
      {children}
    </OidcAuthProvider>
  );
}
