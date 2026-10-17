import {
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from "oidc-client-ts";
import { env } from "@/config/env";

const appOrigin = window.location.origin;

export const oidcSettings: UserManagerSettings = {
  authority: `${env.keycloakUrl}/realms/${env.keycloakRealm}`,
  client_id: env.keycloakClientId,
  redirect_uri: `${appOrigin}/auth/callback`,
  post_logout_redirect_uri: `${appOrigin}/auth/logout/callback`,
  response_type: "code",
  scope: "openid profile email",
  response_mode: "query",
  automaticSilentRenew: true,
  monitorSession: true,
  loadUserInfo: false,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
};

export const oidcUserManager = new UserManager(oidcSettings);

let renewPromise: Promise<User | null> | null = null;

async function renewUser(): Promise<User | null> {
  if (!renewPromise) {
    renewPromise = oidcUserManager.signinSilent().finally(() => {
      renewPromise = null;
    });
  }
  return renewPromise;
}

export async function getValidAccessToken(): Promise<string | null> {
  const user = await oidcUserManager.getUser();
  if (!user) return null;
  if (!user.expired) return user.access_token;

  try {
    const renewedUser = await renewUser();
    return renewedUser && !renewedUser.expired
      ? renewedUser.access_token
      : null;
  } catch {
    await oidcUserManager.removeUser();
    return null;
  }
}
