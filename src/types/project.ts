export type ProjectRole = "owner" | "maintainer" | "viewer";

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  role: ProjectRole;
  repositories_count: number;
  created_at: string;
}

export interface ProjectMember {
  user_id: string;
  email: string;
  role: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  members?: ProjectMember[];
  created_at?: string;
}

export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
}

export interface AddMemberInput {
  email: string;
  role: ProjectRole;
}
