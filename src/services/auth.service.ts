import { api } from "@/lib/api";
import type {
  AuthTokens,
  AuthUser,
  LoginInput,
  RefreshInput,
  RefreshOutput,
  RegisterInput,
} from "@/types/auth";

export const authService = {
  register(input: RegisterInput): Promise<AuthUser> {
    return api.post<AuthUser>("/auth/register", input);
  },

  login(input: LoginInput): Promise<AuthTokens> {
    return api.post<AuthTokens>("/auth/login", input);
  },

  refresh(input: RefreshInput): Promise<RefreshOutput> {
    return api.post<RefreshOutput>("/auth/refresh", input);
  },

  me(): Promise<AuthUser> {
    return api.get<AuthUser>("/auth/me");
  },
};
