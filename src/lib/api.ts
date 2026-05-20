import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import { authStore } from "@/lib/auth";
import { parseApiError } from "@/lib/errors";
import type { RefreshOutput } from "@/types/auth";

const instance: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30_000,
});

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStore.getAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization =
      `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  for (const cb of refreshQueue) cb(token);
  refreshQueue = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = authStore.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const resp = await axios.post<RefreshOutput>(
      `${env.apiBaseUrl}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    const newToken = resp.data.access_token;
    authStore.setAccessToken(newToken);
    return newToken;
  } catch {
    return null;
  }
}

function redirectToLogin() {
  authStore.clear();
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login") &&
    !window.location.pathname.startsWith("/register")
  ) {
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.assign(`/login?next=${next}`);
  }
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _skipAuthRedirect?: boolean;
    };
    const status = error?.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/login") &&
      !original.url?.includes("/auth/register") &&
      !original.url?.includes("/auth/refresh")
    ) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (token) {
              original.headers = original.headers ?? {};
              (original.headers as Record<string, string>).Authorization =
                `Bearer ${token}`;
              resolve(instance.request(original));
            } else {
              reject(parseApiError(error));
            }
          });
        });
      }

      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      flushQueue(newToken);

      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${newToken}`;
        return instance.request(original);
      }

      if (!original._skipAuthRedirect) {
        redirectToLogin();
      }
    }

    return Promise.reject(parseApiError(error));
  },
);

export const api = {
  raw: instance,

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const resp = await instance.get<T>(url, config);
    return resp.data;
  },

  async post<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const resp = await instance.post<T>(url, body, config);
    return resp.data;
  },

  async put<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const resp = await instance.put<T>(url, body, config);
    return resp.data;
  },

  async patch<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const resp = await instance.patch<T>(url, body, config);
    return resp.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const resp = await instance.delete<T>(url, config);
    return resp.data;
  },
};
