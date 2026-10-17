import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/loading-state";
import { useAuth } from "@/hooks/use-auth";

export function OidcCallbackPage() {
  const { error, isAuthenticated, isLoading, login } = useAuth();

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6 text-center">
          <h1 className="text-lg font-semibold">Sign-in could not be completed</h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={() => void login("/")}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <LoadingState rows={2} className="w-full max-w-md" />
    </div>
  );
}

export function OidcLogoutCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <LoadingState rows={2} className="w-full max-w-md" />
    </div>
  );
}
