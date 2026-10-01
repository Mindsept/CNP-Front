import { api } from "@/lib/api";
import type { AuthUser, RegisterInput } from "@/types/auth";

export const authService = {
  me(signal?: AbortSignal): Promise<AuthUser> {
    return api.get<AuthUser>("/auth/me", { signal });
  },
  register(input: RegisterInput): Promise<AuthUser> {
    return api.post<AuthUser>("/auth/register", input);
  },
};
