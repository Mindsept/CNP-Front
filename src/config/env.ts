interface AppEnv {
  apiBaseUrl: string;
  appName: string;
}

function readEnv(): AppEnv {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    "http://localhost:8000/api/v1";
  const appName =
    import.meta.env.VITE_APP_NAME?.trim() || "Cloud Native Platform";

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    appName,
  };
}

export const env = readEnv();
