import { useSyncExternalStore, useCallback } from "react";
import { authStore } from "@/lib/auth";
import type { AuthUser, LoginInput, RegisterInput } from "@/types/auth";
import { authService } from "@/services/auth.service";

function subscribe(listener: () => void) {
  return authStore.subscribe(listener);
}

function getSnapshot(): {
  accessToken: string | null;
  user: AuthUser | null;
} {
  return {
    accessToken: authStore.getAccessToken(),
    user: authStore.getUser(),
  };
}

let cached = getSnapshot();
function getMemoSnapshot() {
  const next = getSnapshot();
  if (
    next.accessToken === cached.accessToken &&
    next.user?.id === cached.user?.id
  ) {
    return cached;
  }
  cached = next;
  return cached;
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getMemoSnapshot, getMemoSnapshot);

  const login = useCallback(async (input: LoginInput) => {
    const tokens = await authService.login(input);
    authStore.setTokens(tokens);
    const me = await authService.me();
    authStore.setUser(me);
    return me;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    return authService.register(input);
  }, []);

  const fetchMe = useCallback(async () => {
    const me = await authService.me();
    authStore.setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    authStore.clear();
  }, []);

  return {
    user: state.user,
    isAuthenticated: Boolean(state.accessToken),
    login,
    register,
    logout,
    fetchMe,
  };
}
