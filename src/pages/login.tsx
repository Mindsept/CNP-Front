import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";
import { safeReturnTo } from "@/auth/navigation";

export function LoginPage() {
  const [params] = useSearchParams();
  const { isAuthenticated, isIdentityAuthenticated, isLoading, error, login, logout, retryProfile } = useAuth();
  const onError = useToastError();
  const [submitting, setSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const next = safeReturnTo(params.get("next"));
  const sessionExpired = params.get("reason") === "session-expired";
  const started = useRef(false);
  const visibleSignInError = signInError ?? (!submitting && !isIdentityAuthenticated && error
    ? "Secure sign-in could not be started. Check that Keycloak is available, then try again."
    : null);

  const handleLogin = useCallback(async () => {
    setSignInError(null);
    setSubmitting(true);
    try {
      await login(next);
    } catch (err) {
      setSignInError("Secure sign-in could not be started. Check that Keycloak is available, then try again.");
      onError(err, "Could not start the secure sign-in flow");
    } finally {
      // react-oidc-context exposes navigation failures through its error state
      // and resolves the promise, so catch alone cannot release this button.
      setSubmitting(false);
    }
  }, [login, next, onError]);

  useEffect(() => {
    if (started.current || isLoading || isAuthenticated || isIdentityAuthenticated || sessionExpired) return;
    started.current = true;
    void handleLogin();
  }, [isLoading, isAuthenticated, isIdentityAuthenticated, sessionExpired, handleLogin]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={next} replace />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Sign in
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your workspace awaits.
        </h1>
        <p className="text-sm text-muted-foreground">
          One place for your code, deployments and observability.
        </p>
      </div>

      <div className="space-y-4">
        {visibleSignInError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{visibleSignInError}</p>}
        {isIdentityAuthenticated && error ? (
          <div role="alert" className="space-y-3 rounded-md border p-4">
            <p>{error.message}</p>
            <Button onClick={() => void retryProfile()}>Retry CNP profile</Button>
            <Button variant="outline" onClick={() => void logout()}>Sign out</Button>
          </div>
        ) : null}
        {sessionExpired ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
            Your session expired. Sign in again to continue.
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Your CNP account</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Opening your secure login. Use your username, password and authenticator to continue.
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          loading={submitting || isLoading}
          size="lg"
          onClick={() => void handleLogin()}
        >
          Sign in with Keycloak
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Account creation is currently managed by the CNP administrator.
      </div>
    </div>
  );
}
