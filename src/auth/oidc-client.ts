import {
  UserManager,
  WebStorageStateStore,
  User,
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
  automaticSilentRenew: !env.localDemo,
  monitorSession: !env.localDemo,
  loadUserInfo: false,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
};

export const oidcUserManager = new UserManager(oidcSettings);

let renewPromise: Promise<User | null> | null = null;

let localSessionPromise: Promise<User> | null = null;

export async function loadLocalDemoSession(): Promise<User> {
  if (!env.localDemo) throw new Error("Local demo mode is disabled");
  if (!localSessionPromise) {
    localSessionPromise = (async () => {
      const response = await fetch(`${env.apiBaseUrl}/auth/development-session`, { method: "POST" });
      if (!response.ok) throw new Error("Local demo session unavailable. Enable DEV_AUTH_BYPASS with AUTH_MODE=legacy on the local API.");
      const token = await response.json() as { access_token: string; expires_in: number };
      const payload = JSON.parse(atob(token.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { sub: string };
      const user = new User({ access_token: token.access_token, token_type: "Bearer", expires_at: Math.floor(Date.now() / 1000) + token.expires_in,
        profile: { sub: payload.sub, iss: "urn:cnp:local-demo", aud: "cnp-api", exp: Math.floor(Date.now() / 1000) + token.expires_in, iat: Math.floor(Date.now() / 1000) } });
      await oidcUserManager.storeUser(user);
      oidcUserManager.events.load(user);
      return user;
    })().finally(() => { localSessionPromise = null; });
  }
  return localSessionPromise;
}

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
  if (env.localDemo) return (await loadLocalDemoSession()).access_token;

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
