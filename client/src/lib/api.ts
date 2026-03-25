import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

let accessToken: string | null = null;
let refreshingPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const request = config as RetriableRequestConfig;

  if (accessToken) {
    request.headers.Authorization = `Bearer ${accessToken}`;
  }

  return request;
});

const runRefresh = async () => {
  if (!refreshingPromise) {
    refreshingPromise = api
      .post("/auth/refresh")
      .then((res) => {
        const token = res.data?.data?.accessToken as string | undefined;
        if (!token) {
          return null;
        }
        setAccessToken(token);
        window.dispatchEvent(new CustomEvent("auth:token", { detail: { token } }));
        return token;
      })
      .catch(() => {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return null;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }

  return refreshingPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      const token = await runRefresh();

      if (token) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
