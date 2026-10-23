import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { projectService } from "@/services/project.service";
import { observabilityService } from "@/services/observability.service";
export function useObservabilityBindings(projectId?: string, repositoryId?: string, offset = 0, targetId?: string, serviceKey?: string) {
  return useQuery({
    queryKey: ["observability", "bindings", projectId, repositoryId, offset, targetId, serviceKey],
    queryFn: () => observabilityService.list(projectId!, repositoryId, offset, targetId, serviceKey),
    enabled: Boolean(projectId), retry: false, refetchInterval: 10000,
  });
}
export function useObservabilityPermissions(projectId?: string) {
  // Read the existing native identity and project roles. The server independently enforces every operation.
  const user = useQuery({ queryKey: ["observability", "identity"], queryFn: () => authService.me(), enabled: Boolean(projectId), retry: false, staleTime: 30000 });
  const project = useQuery({ queryKey: ["project", projectId], queryFn: () => projectService.get(projectId!), enabled: Boolean(projectId), retry: false });
  const role = project.data?.members?.find(m => m.user_id === user.data?.id)?.role;
  return { canManage: !user.isError && !project.isError && Boolean(user.data && project.data && (user.data.role === "admin" || role === "owner" || role === "maintainer")) };
}
export const observabilityReasons: Record<string, string> = {
  observability_target_unsupported: "This profile currently requires an Azure AKS target.",
  observability_profile_unsupported: "This profile currently requires a FastAPI application with the observability SDK.",
  observability_not_configured: "Observability is not configured for this platform yet.",
  observability_approved_deployment_required: "Approve a CD preview for this application and target first.",
  observability_check_failed: "Availability could not be verified. Retry the check.",
  observability_waiting_deployment: "Waiting for the approved application deployment.",
  observability_unavailable: "The prerequisites for this application and target are not ready.",
};
export function observabilityReason(code: string | null) { return code ? observabilityReasons[code] ?? "This configuration requires attention. Check its prerequisites or refresh its status." : null; }
