import type { QueryReturnValue } from '@reduxjs/toolkit/query';
import type { AxiosBaseQueryArgs } from '../../app/baseApi';
import { mockHandlers } from '../handlers';
import type { MockRouteDefinition } from '../types';
import { createMockState } from './createMockState';
import { normalizeMethod, resolveMockRoute } from '../utils';

type MockQueryResult = QueryReturnValue<
  unknown,
  {
    status: number | string;
    data: unknown;
  }
>;

export interface MockRuntime {
  execute(args: AxiosBaseQueryArgs): Promise<MockQueryResult>;
}

export function createMockRuntime(
  handlers: MockRouteDefinition[] = mockHandlers,
): MockRuntime {
  const state = createMockState(handlers);

  const toMockRuntimeError = (error: unknown): MockQueryResult['error'] => {
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
  };

  return {
    async execute(args) {
      const matched = resolveMockRoute(state, args.method, args.url);

      if (!matched) {
        return {
          error: {
            status: 404,
            data: {
              message: `No mock handler matched ${normalizeMethod(args.method)} ${args.url}`,
            },
          },
        };
      }

      try {
        const response = await matched.route.handler({
          request: {
            url: args.url,
            method: args.method,
            params: args.params,
            data: args.data,
            headers: args.headers,
          },
          params: matched.params,
          state: state.runtimeState,
        });

        if ((response.status ?? 200) >= 400) {
          return {
            error: {
              status: response.status ?? 500,
              data: response.data as { message: string },
            },
          };
        }

        if ((response.status ?? 200) === 204) {
          return {
            data: undefined,
          };
        }

        return {
          data: response.data,
        };
      } catch (error) {
        return {
          error: toMockRuntimeError(error),
        };
      }
    },
  };
}

let runtime: MockRuntime | null = null;

export function getMockRuntime(): MockRuntime {
  runtime ??= createMockRuntime();
  return runtime;
}

export function resetMockRuntime(): void {
  runtime = null;
}
