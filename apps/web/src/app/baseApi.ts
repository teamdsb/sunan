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

    return true;
  } catch {
    return false;
  }
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
        const refreshed = await refreshAccessToken(client, api);
        if (refreshed) {
          try {
            const retryResult = await executeRequest();
            return { data: retryResult.data };
          } catch (retryError) {
            return { error: toQueryError(retryError) };
          }
        }

        clearToken();
        api.dispatch(logout());
        const target = getRedirectTarget() ?? getCurrentTarget();
        onAuthFailure(target);
      }

      return { error: toQueryError(error) };
    }
  };
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
    'File',
    'MasterData',
  ],
  endpoints: () => ({}),
});
