import type { UserProfile } from "oidc-client-ts";


type CnpClaims = UserProfile & {
  preferred_username?: unknown;
  email?: unknown;
  name?: unknown;
  given_name?: unknown;
  family_name?: unknown;
};

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function oidcClaimsToIdentity(profile: UserProfile) {
  const claims = profile as CnpClaims;

  return {
    issuer: profile.iss,
    subject: profile.sub,
    username: optionalString(claims.preferred_username),
    email: optionalString(claims.email),
    full_name: optionalString(claims.name),
    given_name: optionalString(claims.given_name),
    family_name: optionalString(claims.family_name),
  };
}
