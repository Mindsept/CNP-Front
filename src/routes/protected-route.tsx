import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authStore } from "@/lib/auth";
import { authService } from "@/services/auth.service";
import { LoadingState } from "@/components/common/loading-state";

export function ProtectedRoute() {
  const location = useLocation();
  const [ready, setReady] = useState(Boolean(authStore.getUser()));
  const hasToken = Boolean(authStore.getAccessToken());

  useEffect(() => {
    if (!hasToken) {
      setReady(true);
      return;
    }
    if (authStore.getUser()) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await authService.me();
        if (!cancelled) authStore.setUser(me);
      } catch {
        if (!cancelled) authStore.clear();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  if (!hasToken) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <LoadingState rows={2} className="w-full max-w-md" />
      </div>
    );
  }

  return <Outlet />;
}
