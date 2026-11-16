import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import {
  BaseQueryApi,
  type BaseQueryFn,
  createApi,
} from '@reduxjs/toolkit/query/react';
import { env } from './env';
import {
  clearToken,
  getRedirectTarget,
  getStoredToken,
  persistToken,
  redirectToOAuth,
  setRedirectTarget,
} from '../features/auth/oauth';
import { loginSucceeded, logout } from '../features/auth/authSlice';
import type { AuthSuccessPayload } from '../features/auth/types';

export interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  params?: AxiosRequestConfig['params'];
  data?: AxiosRequestConfig['data'];
  headers?: AxiosRequestConfig['headers'];
}

interface ApiEnvelope<T> {
  data: T;
}

export interface AxiosBaseQueryOptions {
  baseUrl?: string;
  client?: AxiosInstance;
  onAuthFailure?: (target: string) => void;
}

type BaseQueryError = {
  status: number | string;
  data: unknown;
};

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthSuccessPayload['user'];
}

let accessTokenRefreshPromise: Promise<boolean> | null = null;
let authFailureRedirected = false;
let lastCurrentUserInvalidationAt = 0;
let currentUserRefetchPromise: Promise<unknown> | null = null;
const CURRENT_USER_INVALIDATION_COOLDOWN_MS = 1000;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getCurrentTarget(): string {
  if (!isBrowser()) {
    return '/my';
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

async function refreshAccessToken(
  client: AxiosInstance,
  api: BaseQueryApi,
): Promise<boolean> {
  const token = getStoredToken();
  if (!token) {
    return false;
  }

  try {
    const response = await client.post<ApiEnvelope<RefreshResponse>>(
      '/auth/refresh',
      undefined,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    api.dispatch(
      loginSucceeded({
        accessToken: response.data.data.accessToken,
        expiresIn: response.data.data.expiresIn,
        user: response.data.data.user,
      }),
    );
    persistToken(response.data.data.accessToken, response.data.data.expiresIn);
    authFailureRedirected = false;

    return true;
  } catch {
    return false;
  }
}

async function refreshAccessTokenOnce(
  client: AxiosInstance,
  api: BaseQueryApi,
): Promise<boolean> {
  if (!accessTokenRefreshPromise) {
    accessTokenRefreshPromise = refreshAccessToken(client, api).finally(() => {
      accessTokenRefreshPromise = null;
    });
  }
  return accessTokenRefreshPromise;
}

export function refetchCurrentUserOnce(refetch: () => Promise<unknown>): Promise<unknown> {
  if (!currentUserRefetchPromise) {
    currentUserRefetchPromise = Promise.resolve(refetch()).finally(() => {
      currentUserRefetchPromise = null;
    });
  }
  return currentUserRefetchPromise;
}

function toQueryError(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>;
  return {
    status: axiosError.response?.status ?? 'FETCH_ERROR',
    data: axiosError.response?.data ?? { message: axiosError.message },
  };
}

export function createAxiosBaseQuery(
  options: AxiosBaseQueryOptions = {},
): BaseQueryFn<AxiosBaseQueryArgs, unknown, BaseQueryError> {
  authFailureRedirected = false;
  lastCurrentUserInvalidationAt = 0;
  const client =
    options.client ??
    axios.create({
      baseURL: options.baseUrl ?? env.apiBaseUrl,
    });

  const onAuthFailure =
    options.onAuthFailure ??
    ((target: string) => {
      setRedirectTarget(target);
      redirectToOAuth(target);
    });

  return async (args, api) => {
    const executeRequest = async () => {
      const token = getStoredToken();
      const headers = {
        ...(args.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      return client.request({
        url: args.url,
        method: args.method ?? 'GET',
        params: args.params,
        data: args.data,
        headers,
      });
    };

    try {
      const result = await executeRequest();
      return { data: result.data };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        const refreshed = await refreshAccessTokenOnce(client, api);
        if (refreshed) {
          try {
            const retryResult = await executeRequest();
            return { data: retryResult.data };
          } catch (retryError) {
            const retryAxiosError = retryError as AxiosError;
            if (retryAxiosError.response?.status === 403) {
              handleForbidden(args, api, onAuthFailure);
            }
            return { error: toQueryError(retryError) };
          }
        }

        const target = getRedirectTarget() ?? getCurrentTarget();
        if (!authFailureRedirected) {
          authFailureRedirected = true;
          clearToken();
          api.dispatch(logout());
          onAuthFailure(target);
        }
      }

      if (axiosError.response?.status === 403) {
        handleForbidden(args, api, onAuthFailure);
      }

      return { error: toQueryError(error) };
    }
  };
}

function handleForbidden(
  args: AxiosBaseQueryArgs,
  api: BaseQueryApi,
  onAuthFailure: (target: string) => void,
): void {
  const isCurrentUserRequest = args.url.endsWith('/auth/me') || args.url === '/auth/me';
  if (isCurrentUserRequest) {
    if (authFailureRedirected) return;
    authFailureRedirected = true;
    clearToken();
    api.dispatch(logout());
    const target = getRedirectTarget() ?? getCurrentTarget();
    onAuthFailure(target);
    return;
  }

  const now = Date.now();
  if (now - lastCurrentUserInvalidationAt >= CURRENT_USER_INVALIDATION_COOLDOWN_MS) {
    lastCurrentUserInvalidationAt = now;
    api.dispatch(baseApi.util.invalidateTags(['CurrentUser']));
  }
}

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: createAxiosBaseQuery(),
  tagTypes: [
    'Auth',
    'CurrentUser',
    'EnterpriseProfile',
    'EnterprisePolicy',
    'PolicyVersion',
    'Certificate',
    'CertificateType',
    'CertificateOwner',
    'OfficeCategory',
    'OfficeEntry',
    'OfficeAdminEntry',
    'OfficeAudit',
    'ProcurementOrder',
    'ProcurementApproval',
    'ProcurementReport',
    'ProcurementReportApproval',
    'ProcurementBudget',
    'Workbench',
    'WorkbenchRecord',
    'Reminder',
    'ReminderDashboard',
    'ShipMonitor',
    'UserSettings',
    'UserDirectory',
    'File',
    'MasterData',
  ],
  endpoints: () => ({}),
});
