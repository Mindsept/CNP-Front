import { act, renderHook as renderTestingHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "oidc-client-ts";
import { useAuth } from "./use-auth";
import { authService } from "@/services/auth.service";

vi.mock("@/services/auth.service", () => ({ authService: { me: vi.fn() } }));

function renderHook(callback: () => ReturnType<typeof useAuth>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderTestingHook(callback, { wrapper });
}

const oidc = vi.hoisted(() => ({
  user: null as User | null,
  isAuthenticated: false,
  isLoading: false,
  activeNavigator: undefined as string | undefined,
  error: undefined as Error | undefined,
  signinRedirect: vi.fn<() => Promise<void>>(),
  signoutRedirect: vi.fn<() => Promise<void>>(),
}));

vi.mock("react-oidc-context", () => ({
  useAuth: () => oidc,
}));

describe("useAuth OIDC adapter", () => {
  beforeEach(() => {
    oidc.user = null;
    oidc.isAuthenticated = false;
    oidc.isLoading = false;
    oidc.activeNavigator = undefined;
    oidc.error = undefined;
    oidc.signinRedirect.mockReset().mockResolvedValue(undefined);
    oidc.signoutRedirect.mockReset().mockResolvedValue(undefined);
    vi.mocked(authService.me).mockReset().mockResolvedValue({ id: "cnp-id", email: "cnp@example.com", role: "user" });
  });

  it("loads CNP identity and role from the API, keeping OIDC identity separate", async () => {
    oidc.user = {
      access_token: "access-token",
      profile: {
        sub: "subject",
        preferred_username: "cnp-dev",
        email: "cnp-dev@example.local",
        realm_access: { roles: ["admin"] },
      },
    } as unknown as User;
    oidc.isAuthenticated = true;

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.accessToken).toBe("access-token");
    expect(result.current.user).toMatchObject({
      id: "cnp-id",
      email: "cnp@example.com",
      role: "user",
    });
    expect(result.current.identity?.subject).toBe("subject");
  });

  it("denies business access when the CNP account is not linked", async () => {
    oidc.user = { access_token: "token", profile: { sub: "unknown" } } as User;
    oidc.isAuthenticated = true;
    vi.mocked(authService.me).mockRejectedValue(new Error("Identity is not linked"));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.error?.message).toBe("Identity is not linked"));
    expect(result.current.isIdentityAuthenticated).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("starts redirect login with a sanitized return destination", async () => {
    const { result } = renderHook(() => useAuth());

    await act(() => result.current.login("/projects?tab=active"));
    expect(oidc.signinRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { returnTo: "/projects?tab=active" },
        nonce: expect.any(String),
      }),
    );

    await act(() => result.current.login("https://attacker.example"));
    expect(oidc.signinRedirect).toHaveBeenLastCalledWith(
      expect.objectContaining({
        state: { returnTo: "/" },
        nonce: expect.any(String),
      }),
    );
  });

  it("delegates logout to the OIDC end-session redirect", async () => {
    const { result } = renderHook(() => useAuth());
    await act(() => result.current.logout());
    expect(oidc.signoutRedirect).toHaveBeenCalledOnce();
  });
});
