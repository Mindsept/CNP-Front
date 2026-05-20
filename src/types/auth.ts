export type UserRole = "admin" | "user";

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: "bearer";
  expires_in: number;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}

export interface RefreshInput {
  refresh_token: string;
}

export interface RefreshOutput {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}
