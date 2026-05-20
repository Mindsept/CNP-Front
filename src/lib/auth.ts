import type { AuthTokens, AuthUser } from "@/types/auth";

const ACCESS_KEY = "cnp.access_token";
const REFRESH_KEY = "cnp.refresh_token";
const USER_KEY = "cnp.user";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of Array.from(listeners)) l();
}

export const authStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  setTokens(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    }
    emit();
  },

  setAccessToken(token: string) {
    localStorage.setItem(ACCESS_KEY, token);
    emit();
  },

  setUser(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    emit();
  },

  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    emit();
  },

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(ACCESS_KEY));
  },
};
