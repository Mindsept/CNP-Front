export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  username?: string;
  email?: string;
  full_name?: string;
  given_name?: string;
  family_name?: string;
  role?: UserRole;
  is_active?: boolean;
  created_at?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}
