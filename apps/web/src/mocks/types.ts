import type { AxiosRequestConfig } from 'axios';
import type { CertificatesMockState } from './fixtures/certificates';
import type { EnterpriseMockState } from './fixtures/enterprise';
import type { FilesMockState } from './fixtures/files';
import type { MonitorMockState } from './fixtures/monitor';
import type { SettingsMockState } from './fixtures/settings';

export interface MockRequest {
  url: string;
  method: AxiosRequestConfig['method'];
  params?: AxiosRequestConfig['params'];
  data?: AxiosRequestConfig['data'];
  headers?: AxiosRequestConfig['headers'];
}

export interface MockResponse {
  status?: number;
  data?: unknown;
}

export interface MockRuntimeState {
  enterprise: EnterpriseMockState;
  files: FilesMockState;
  certificates: CertificatesMockState;
  monitor: MonitorMockState;
  settings: SettingsMockState;
}

export interface MockHandlerContext {
  request: MockRequest;
  params: Record<string, string>;
  state: MockRuntimeState;
}

export type MockHandler = (
  context: MockHandlerContext,
) => MockResponse | Promise<MockResponse>;

export interface MockRouteDefinition {
  method?: AxiosRequestConfig['method'];
  path: string;
  handler: MockHandler;
}

export interface MockState {
  routes: Map<string, MockRouteDefinition>;
  patternRoutes: MockRouteDefinition[];
  runtimeState: MockRuntimeState;
}

export interface MockRouteMatch {
  route: MockRouteDefinition;
  params: Record<string, string>;
}
