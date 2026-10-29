interface AppEnv {
  apiBaseUrl: string;
  appName: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  localDemo: boolean;
}

function readEnv(): AppEnv {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    "http://localhost:8080/api/v1";
  const appName =
    import.meta.env.VITE_APP_NAME?.trim() || "Cloud Native Platform";
  const keycloakUrl =
    import.meta.env.VITE_KEYCLOAK_URL?.trim() || "http://localhost:8081";
  const keycloakRealm =
    import.meta.env.VITE_KEYCLOAK_REALM?.trim() || "cnp";
  const keycloakClientId =
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID?.trim() || "cnp-front";

  return {
    apiBaseUrl: new URL(apiBaseUrl, window.location.origin).href.replace(/\/$/, ""),
    appName,
    keycloakUrl: keycloakUrl.replace(/\/$/, ""),
    keycloakRealm,
    keycloakClientId,
    localDemo: import.meta.env.DEV && import.meta.env.MODE === "development" && import.meta.env.VITE_LOCAL_DEMO === "true" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname),
  };
}

export const env = readEnv();
