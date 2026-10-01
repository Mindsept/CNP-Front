import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import { getValidAccessToken } from "@/auth/oidc-client";
import { parseApiError } from "@/lib/errors";

const instance: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30_000,
});

instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getValidAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization =
      `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(parseApiError(error)),
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
