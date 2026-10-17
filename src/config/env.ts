interface AppEnv {
  apiBaseUrl: string;
  appName: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
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
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    appName,
    keycloakUrl: keycloakUrl.replace(/\/$/, ""),
    keycloakRealm,
    keycloakClientId,
  };
}

export const env = readEnv();
