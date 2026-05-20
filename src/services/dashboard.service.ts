import { api } from "@/lib/api";
import type { DashboardSummary } from "@/types/dashboard";

export const dashboardService = {
  summary(): Promise<DashboardSummary> {
    return api.get<DashboardSummary>("/dashboard/summary");
  },
};
