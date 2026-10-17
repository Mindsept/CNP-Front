import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "@/components/common/loading-state";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading, isIdentityAuthenticated, error, logout, retryProfile } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <LoadingState rows={2} className="w-full max-w-md" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isIdentityAuthenticated && error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8" role="alert">
          <h1 className="text-xl font-semibold">CNP profile unavailable</h1>
          <p>{error.message}</p>
          <p>Your identity is signed in. A linked, active CNP account is required to access the platform.</p>
          <Button onClick={() => void retryProfile()}>Retry</Button>
          <Button variant="outline" onClick={() => void logout()}>Sign out</Button>
        </div>
      );
    }
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
