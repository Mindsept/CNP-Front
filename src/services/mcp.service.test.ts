import { beforeEach, describe, expect, it, vi } from "vitest";
import { getValidAccessToken } from "@/auth/oidc-client";
import { api } from "@/lib/api";

vi.mock("@/auth/oidc-client", () => ({ getValidAccessToken: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { post: vi.fn() } }));

describe("MCP browser sessions with Keycloak", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(getValidAccessToken).mockReset().mockResolvedValue("oidc-token");
    vi.mocked(api.post).mockReset().mockImplementation(async (url) =>
      url === "/auth/browser-session" ? { csrf_token: "csrf-one" } : { logged_out: true },
    );
  });

  it("creates a CSRF session using the OIDC bearer and reuses it for reviews", async () => {
    const { mcpService } = await import("./mcp.service");
    await mcpService.challenge("action-one");
    await mcpService.challenge("action-two");
    expect(api.post).toHaveBeenNthCalledWith(1, "/auth/browser-session", undefined, {
      headers: { Authorization: "Bearer oidc-token" },
    });
    expect(api.post).toHaveBeenNthCalledWith(2, "/reviews/action-one/challenge", undefined, {
      headers: { "X-CNP-CSRF": "csrf-one" },
    });
    expect(vi.mocked(api.post).mock.calls.filter(([url]) => url === "/auth/browser-session")).toHaveLength(1);
  });

  it("recreates the browser session when Keycloak rotates the bearer", async () => {
    const { mcpService } = await import("./mcp.service");
    await mcpService.challenge("first");
    vi.mocked(getValidAccessToken).mockResolvedValue("renewed-token");
    await mcpService.challenge("second");
    expect(api.post).toHaveBeenNthCalledWith(3, "/auth/browser-session", undefined, {
      headers: { Authorization: "Bearer renewed-token" },
    });
  });

  it("refuses mutations once the OIDC session has expired", async () => {
    const { mcpService } = await import("./mcp.service");
    vi.mocked(getValidAccessToken).mockResolvedValue(null);
    await expect(mcpService.challenge("action")).rejects.toThrow("Sign in");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("clears the CSRF cache after logout", async () => {
    const { mcpService } = await import("./mcp.service");
    await mcpService.challenge("before");
    await mcpService.logout();
    await mcpService.challenge("after");
    expect(vi.mocked(api.post).mock.calls.filter(([url]) => url === "/auth/browser-session")).toHaveLength(2);
  });
});
