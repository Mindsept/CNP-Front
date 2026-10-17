import { describe, expect, it } from "vitest";
import type { UserProfile } from "oidc-client-ts";
import { oidcClaimsToIdentity } from "./claims";

describe("OIDC claim adapter", () => {
  it("maps only available identity claims", () => {
    const user = oidcClaimsToIdentity({
      iss: "http://localhost:8081/realms/cnp",
      aud: "cnp-front",
      exp: 1_800_000_000,
      iat: 1_700_000_000,
      sub: "user-123",
      preferred_username: "cnp-dev",
      email: "cnp-dev@example.local",
      name: "CNP Developer",
      given_name: "CNP",
      family_name: "Developer",
      realm_access: { roles: ["user"] },
    } as UserProfile);

    expect(user).toEqual({
      issuer: "http://localhost:8081/realms/cnp",
      subject: "user-123",
      username: "cnp-dev",
      email: "cnp-dev@example.local",
      full_name: "CNP Developer",
      given_name: "CNP",
      family_name: "Developer",
    });
  });

  it("does not invent optional profile data or a role", () => {
    const user = oidcClaimsToIdentity({
      iss: "http://localhost:8081/realms/cnp",
      aud: "cnp-front",
      exp: 1_800_000_000,
      iat: 1_700_000_000,
      sub: "user-456",
    });

    expect(user.subject).toBe("user-456");
    expect(user.email).toBeUndefined();
    expect(user.full_name).toBeUndefined();
    expect(user).not.toHaveProperty("role");
  });
});
