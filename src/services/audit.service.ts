import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type { AuditEvent } from "@/types/audit";

export const auditService = {
  list(params?: {
    project_id?: string;
    repository_id?: string;
  }): Promise<Paginated<AuditEvent>> {
    return api.get<Paginated<AuditEvent>>("/audit", { params });
  },
};
