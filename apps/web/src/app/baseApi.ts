import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import {
  BaseQueryApi,
  type QueryReturnValue,
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

type BaseQueryResult = QueryReturnValue<unknown, BaseQueryError, {}>;

interface MockRuntimeLike {
  execute(args: AxiosBaseQueryArgs): Promise<BaseQueryResult>;
}

type MockRuntimeLoader = (() => Promise<MockRuntimeLike>) | null;

export interface CreateBaseQueryOptions extends AxiosBaseQueryOptions {
  mockRuntimeLoader?: MockRuntimeLoader;
}

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

function toMockRuntimeError(error: unknown): BaseQueryError {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Mock runtime failed';

  return {
    status: 'MOCK_RUNTIME_ERROR',
    data: {
      message,
    },
  };
}

async function executeMockRuntime(
  mockRuntimeLoader: MockRuntimeLoader,
  args: AxiosBaseQueryArgs,
): Promise<BaseQueryResult> {
  if (!mockRuntimeLoader) {
    return {
      error: {
        status: 'MOCK_RUNTIME_UNAVAILABLE',
        data: {
          message:
            'Mock mode is enabled, but the mock runtime is not available in this build.',
        },
      },
    };
  }

  try {
    const runtime = await mockRuntimeLoader();
    return await runtime.execute(args);
  } catch (error) {
    return { error: toMockRuntimeError(error) };
  }
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

export function createBaseQuery(): BaseQueryFn<
  AxiosBaseQueryArgs,
  unknown,
  BaseQueryError
>;
export function createBaseQuery(
  options: CreateBaseQueryOptions,
): BaseQueryFn<AxiosBaseQueryArgs, unknown, BaseQueryError>;
export function createBaseQuery(
  options: CreateBaseQueryOptions = {},
): BaseQueryFn<AxiosBaseQueryArgs, unknown, BaseQueryError> {
  let axiosBaseQuery:
    | BaseQueryFn<AxiosBaseQueryArgs, unknown, BaseQueryError>
    | undefined;
  const mockRuntimeLoader =
    options.mockRuntimeLoader === undefined
      ? import.meta.env.VITE_MOCK_MODE === 'true'
        ? async () => {
            const { getMockRuntime } = await import('../mocks/store/mockRuntime');
            return getMockRuntime();
          }
        : null
      : options.mockRuntimeLoader;

  return async (args, api, extraOptions) => {
    if (env.mockMode) {
      return executeMockRuntime(mockRuntimeLoader, args);
    }

    axiosBaseQuery ??= createAxiosBaseQuery(options);
    return axiosBaseQuery(args, api, extraOptions);
  };
}

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: createBaseQuery(),
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
  ],
  endpoints: () => ({}),
});
