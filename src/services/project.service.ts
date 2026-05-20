import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type {
  AddMemberInput,
  CreateProjectInput,
  Project,
  ProjectMember,
  ProjectSummary,
} from "@/types/project";

export const projectService = {
  list(): Promise<Paginated<ProjectSummary>> {
    return api.get<Paginated<ProjectSummary>>("/projects");
  },

  create(input: CreateProjectInput): Promise<Project> {
    return api.post<Project>("/projects", input);
  },

  get(projectId: string): Promise<Project> {
    return api.get<Project>(`/projects/${projectId}`);
  },

  update(projectId: string, input: Partial<CreateProjectInput>): Promise<Project> {
    return api.patch<Project>(`/projects/${projectId}`, input);
  },

  addMember(projectId: string, input: AddMemberInput): Promise<ProjectMember> {
    return api.post<ProjectMember>(`/projects/${projectId}/members`, input);
  },
};
