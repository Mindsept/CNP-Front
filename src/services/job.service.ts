import { api } from "@/lib/api";
import type { Job } from "@/types/job";

export const jobService = {
  get(jobId: string): Promise<Job> {
    return api.get<Job>(`/jobs/${jobId}`);
  },
};
