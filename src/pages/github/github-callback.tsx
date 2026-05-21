import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function GithubCallbackPage() {
  const [params] = useSearchParams();
  const qc = useQueryClient();

  const installationId = params.get("installation_id");
  const accountLogin = params.get("account_login");
  const error = params.get("error");

  useEffect(() => {
    if (error) {
      toast.error(`GitHub installation failed: ${error}`);
      return;
    }
    if (installationId) {
      toast.success(
        accountLogin
          ? `GitHub App linked to ${accountLogin}.`
          : "GitHub App linked successfully.",
      );
      qc.invalidateQueries({ queryKey: ["github", "installations"] });
    }
  }, [installationId, accountLogin, error, qc]);

  return (
    <Navigate
      to={error ? "/github" : "/github/installations"}
      replace
    />
  );
}
