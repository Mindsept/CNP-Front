import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { safeReturnTo } from "@/auth/navigation";
import { SpaceBackground } from "@/components/auth/space-background";
import { useArrivalTransition } from "@/components/auth/arrival-context";
import { Brand } from "@/components/common/brand";
import { Button } from "@/components/ui/button";
export function AuthArrivalPage() {
  const { isAuthenticated, isLoading, error, retryProfile, logout } = useAuth();
  const [params] = useSearchParams();
  const next = safeReturnTo(params.get("next"));
  const navigate = useNavigate();
  const start = useArrivalTransition();
  useEffect(() => {
    if (!isAuthenticated || isLoading || error) return;
    start();
    navigate(next, { replace: true });
  }, [isAuthenticated, isLoading, error, next, navigate, start]);
  if (!isLoading && !isAuthenticated && !error) return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  return <div className="cnp-login-shell">
    <SpaceBackground />
    <header className="cnp-login-brand"><Brand size="lg" /></header>
    <main className="cnp-login-main"><div className="cnp-login-card cnp-arrival-card">
      {error ? <><h1 className="text-xl font-semibold">Your workspace could not be loaded</h1><p role="alert" className="my-5 text-sm text-muted-foreground">{error.message}</p><Button onClick={() => void retryProfile()}>Retry CNP profile</Button><Button variant="ghost" onClick={() => void logout()}>Sign out</Button></> : <><Check aria-hidden="true" className="mx-auto mb-5 h-8 w-8 text-primary" /><p className="eyebrow">{isAuthenticated ? "Signed in" : "Connecting"}</p><h1 className="mt-3 text-3xl font-medium tracking-tight">Welcome aboard.</h1><p className="mt-4 text-sm text-muted-foreground" role="status">{isAuthenticated ? "Entering your workspace…" : "Checking your CNP access…"}</p></>}
    </div></main>
  </div>;
}
