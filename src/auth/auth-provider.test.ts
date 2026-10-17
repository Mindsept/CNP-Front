import { describe, expect, it } from "vitest";
import type { User } from "oidc-client-ts";
import {
  handleSigninCallback,
  handleSignoutCallback,
} from "./callbacks";

describe("OIDC callbacks", () => {
  it("removes callback parameters and restores the requested route", () => {
    window.history.replaceState(
      {},
      "",
      "/auth/callback?code=authorization-code&state=opaque-state",
    );

    handleSigninCallback({
      state: { returnTo: "/projects/42?tab=settings" },
    } as User);

    expect(window.location.pathname).toBe("/projects/42");
    expect(window.location.search).toBe("?tab=settings");
    expect(window.location.search).not.toContain("code=");
    expect(window.location.search).not.toContain("state=");
  });

  it("returns to the login page after the Keycloak logout callback", () => {
    window.history.replaceState({}, "", "/auth/logout/callback?state=opaque");
    handleSignoutCallback();
    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toBe("");
  });
});
