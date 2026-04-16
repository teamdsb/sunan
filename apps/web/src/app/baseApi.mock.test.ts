import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import { mockHandlers } from '../mocks/handlers';
import { createMockRuntime } from '../mocks/store/mockRuntime';
import { createMockState } from '../mocks/store/createMockState';
import { createMockResponse, resolveMockRoute } from '../mocks/utils';

function createApiStub(): BaseQueryApi {
  return {
    signal: new AbortController().signal,
    abort: vi.fn(),
    dispatch: vi.fn(),
    getState: vi.fn(),
    extra: undefined,
    endpoint: 'test',
    type: 'query',
    forced: false,
    queryCacheKey: 'key',
  };
}

async function invokeMockRoute(
  method: string,
  url: string,
  options: {
    params?: Record<string, unknown>;
    data?: Record<string, unknown>;
  } = {},
) {
  const state = createMockState(mockHandlers);
  const matched = resolveMockRoute(state, method, url);

  expect(matched).not.toBeNull();

  return matched!.route.handler({
    request: {
      url,
      method,
      params: options.params,
      data: options.data,
    },
    params: matched!.params,
    state: state.runtimeState,
  });
}

describe('baseApi mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('routes requests through the mock runtime when mock mode is enabled', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const axiosModule = await import('axios');
    const axiosCreateSpy = vi.spyOn(axiosModule.default, 'create');

    const { createBaseQuery } = await import('./baseApi');
    const baseQuery = createBaseQuery();

    const result = await baseQuery({ url: '/auth/me' }, createApiStub(), {});

    expect(result).toEqual({
      data: {
        data: {
          userId: 'mock-admin',
          name: '调试管理员',
          department: ['苏南船舶管理'],
          position: '前端调试',
          roles: ['system_admin', 'general_office'],
        },
      },
    });
    expect(axiosCreateSpy).not.toHaveBeenCalled();
  });

  it('returns a clear error when mock mode is enabled but this build has no mock runtime loader', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const axiosModule = await import('axios');
    const axiosCreateSpy = vi.spyOn(axiosModule.default, 'create');

    const { createBaseQuery } = await import('./baseApi');
    const baseQuery = createBaseQuery({ mockRuntimeLoader: null });

    const result = await baseQuery({ url: '/auth/me' }, createApiStub(), {});

    expect(result).toEqual({
      error: {
        status: 'MOCK_RUNTIME_UNAVAILABLE',
        data: {
          message: 'Mock mode is enabled, but the mock runtime is not available in this build.',
        },
      },
    });
    expect(axiosCreateSpy).not.toHaveBeenCalled();
  });

  it('returns a not found error for unhandled mock routes', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const baseQuery = createBaseQuery();

    const result = await baseQuery({ url: '/__missing__' }, createApiStub(), {});

    expect(result).toEqual({
      error: {
        status: 404,
        data: {
          message: 'No mock handler matched GET /__missing__',
        },
      },
    });
  });

  it('returns a stable RTK Query error when the mock runtime loader rejects', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => {
        throw new Error('mock runtime load failed');
      },
    });

    const result = await baseQuery({ url: '/auth/me' }, createApiStub(), {});

    expect(result).toEqual({
      error: {
        status: 'MOCK_RUNTIME_ERROR',
        data: {
          message: 'mock runtime load failed',
        },
      },
    });
  });

  it('returns a stable RTK Query error when a mock handler throws', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const runtime = createMockRuntime([
      {
        method: 'GET',
        path: '/auth/me',
        handler: () => {
          throw new Error('mock handler failed');
        },
      },
    ]);

    const { createBaseQuery } = await import('./baseApi');
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const result = await baseQuery({ url: '/auth/me' }, createApiStub(), {});

    expect(result).toEqual({
      error: {
        status: 'MOCK_RUNTIME_ERROR',
        data: {
          message: 'mock handler failed',
        },
      },
    });
  });

  it('creates enterprise profile in runtime and returns it in subsequent list', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const createResult = await baseQuery(
      {
        url: '/enterprise-profiles',
        method: 'POST',
        data: {
          title: '新增资质',
          category: 'license',
          status: 'draft',
        },
      },
      createApiStub(),
      {},
    );

    expect(createResult).toEqual({
      data: {
        data: expect.objectContaining({
          title: '新增资质',
          category: 'license',
          status: 'draft',
        }),
      },
    });

    const listResult = await baseQuery(
      {
        url: '/enterprise-profiles',
      },
      createApiStub(),
      {},
    );

    expect(listResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              title: '新增资质',
              category: 'license',
              status: 'draft',
            }),
          ]),
          meta: expect.objectContaining({
            total: 2,
          }),
        }),
      }),
    );
  });

  it('persists settings changes within a single runtime instance', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const initialResult = await baseQuery(
      {
        url: '/settings',
      },
      createApiStub(),
      {},
    );

    expect(initialResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: 'settings-1',
            defaultModule: 'my',
            reminderViewMode: 'dashboard',
            certificateGroupBy: 'owner',
            enablePushNotifications: true,
            theme: 'light',
          }),
        }),
      }),
    );

    const updateResult = await baseQuery(
      {
        url: '/settings',
        method: 'PATCH',
        data: {
          reminderViewMode: 'list',
          enablePushNotifications: false,
        },
      },
      createApiStub(),
      {},
    );

    expect(updateResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            reminderViewMode: 'list',
            enablePushNotifications: false,
            updatedAt: expect.any(String),
          }),
        }),
      }),
    );

    const afterUpdateResult = await baseQuery(
      {
        url: '/settings',
      },
      createApiStub(),
      {},
    );

    expect(afterUpdateResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            reminderViewMode: 'list',
            enablePushNotifications: false,
            updatedAt: expect.any(String),
          }),
        }),
      }),
    );
  });

  it('defaults ship monitor list to active only and resolves monitor detail by id', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const listResult = await baseQuery(
      {
        url: '/ship-monitors',
      },
      createApiStub(),
      {},
    );

    expect(listResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'monitor-1',
              vesselId: 'vessel-012',
              isActive: true,
            }),
          ]),
        }),
      }),
    );

    expect(listResult).not.toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'monitor-2',
            }),
          ]),
        }),
      }),
    );

    const detailResult = await baseQuery(
      {
        url: '/ship-monitors/monitor-2',
      },
      createApiStub(),
      {},
    );

    expect(detailResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: 'monitor-2',
            isActive: false,
          }),
        }),
      }),
    );
  });

  it('creates ship monitors with contract defaults and deletes them within a single runtime instance', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const createResult = await baseQuery(
      {
        url: '/ship-monitors',
        method: 'POST',
        data: {
          vesselId: 'vessel-999',
          monitorName: '新增监控',
          endpointUrl: 'https://example.com/embed',
        },
      },
      createApiStub(),
      {},
    );

    expect(createResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            vesselId: 'vessel-999',
            monitorName: '新增监控',
            endpointUrl: 'https://example.com/embed',
            accessMode: 'external',
            sortOrder: 0,
            isActive: true,
          }),
        }),
      }),
    );

    const createdId = (createResult as { data: { data: { id: string } } }).data.data.id;

    const deleteResult = await baseQuery(
      {
        url: `/ship-monitors/${createdId}`,
        method: 'DELETE',
      },
      createApiStub(),
      {},
    );

    expect(deleteResult).toEqual({
      data: undefined,
    });

    const finalList = await baseQuery(
      {
        url: '/ship-monitors',
      },
      createApiStub(),
      {},
    );

    expect(finalList).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.not.arrayContaining([
            expect.objectContaining({
              id: createdId,
            }),
          ]),
        }),
      }),
    );
  });

  it('matches dynamic mock paths and injects params into handlers', async () => {
    const runtime = createMockRuntime([
      {
        method: 'GET',
        path: '/items/:id',
        handler: (context) =>
          createMockResponse({
            data: {
              id: context.params.id,
            },
          }),
      },
    ]);

    const result = await runtime.execute({
      url: '/items/dynamic-42',
      method: 'GET',
    });

    expect(result).toEqual({
      data: {
        data: {
          id: 'dynamic-42',
        },
      },
    });
  });

  it('keeps enterprise mock state isolated per runtime instance', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtimeA = createMockRuntime();
    const runtimeB = createMockRuntime();
    const baseQueryA = createBaseQuery({
      mockRuntimeLoader: async () => runtimeA,
    });
    const baseQueryB = createBaseQuery({
      mockRuntimeLoader: async () => runtimeB,
    });

    await baseQueryA(
      {
        url: '/enterprise-profiles',
        method: 'POST',
        data: {
          title: 'runtime-a-only',
          category: 'license',
        },
      },
      createApiStub(),
      {},
    );

    const runtimeAList = await baseQueryA(
      {
        url: '/enterprise-profiles',
      },
      createApiStub(),
      {},
    );
    const runtimeBList = await baseQueryB(
      {
        url: '/enterprise-profiles',
      },
      createApiStub(),
      {},
    );

    expect(runtimeAList).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              title: 'runtime-a-only',
            }),
          ]),
          meta: expect.objectContaining({
            total: 2,
          }),
        }),
      }),
    );

    expect(runtimeBList).toEqual({
      data: {
        data: [
          expect.objectContaining({
            id: '1',
            title: '企业资质示例',
          }),
        ],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      },
    });
  });

  it('uses fileIds for enterprise create and update payloads and returns totalPages in list meta', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const createResult = await baseQuery(
      {
        url: '/enterprise-profiles',
        method: 'POST',
        data: {
          title: '契约字段校验',
          category: 'license',
          fileIds: ['spec-file'],
          files: ['legacy-file'],
        },
      },
      createApiStub(),
      {},
    );

    expect(createResult).toEqual({
      data: {
        data: expect.objectContaining({
          title: '契约字段校验',
          files: [
            expect.objectContaining({
              id: 'spec-file',
            }),
          ],
        }),
      },
    });

    const createdProfileId = (createResult as { data: { data: { id: string } } }).data.data.id;

    const updateResult = await baseQuery(
      {
        url: `/enterprise-profiles/${createdProfileId}`,
        method: 'PATCH',
        data: {
          fileIds: ['updated-spec-file'],
          files: ['legacy-update-file'],
        },
      },
      createApiStub(),
      {},
    );

    expect(updateResult).toEqual({
      data: {
        data: expect.objectContaining({
          id: createdProfileId,
          files: [
            expect.objectContaining({
              id: 'updated-spec-file',
            }),
          ],
        }),
      },
    });

    const listResult = await baseQuery(
      {
        url: '/enterprise-profiles',
        params: {
          page: 1,
          pageSize: 1,
        },
      },
      createApiStub(),
      {},
    );

    expect(listResult).toEqual({
      data: {
        data: [expect.objectContaining({ id: createdProfileId })],
        meta: {
          page: 1,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        },
      },
    });
  });

  it('supports certificate CRUD, grouping and file binding in mock runtime', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const listResult = await baseQuery(
      {
        url: '/certificates',
        params: {
          page: 1,
          pageSize: 10,
        },
      },
      createApiStub(),
      {},
    );

    expect(listResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              advanceDays: expect.any(Number),
            }),
          ]),
          meta: expect.objectContaining({
            totalPages: 1,
          }),
        }),
      }),
    );

    const groupedResult = await baseQuery(
      {
        url: '/certificates/grouped',
        params: {
          groupBy: 'owner',
        },
      },
      createApiStub(),
      {},
    );

    expect(groupedResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              groupKey: expect.any(String),
              groupLabel: expect.any(String),
              count: expect.any(Number),
              items: expect.arrayContaining([
                expect.objectContaining({
                  id: '1',
                  advanceDays: expect.any(Number),
                }),
              ]),
            }),
          ]),
        }),
      }),
    );

    const detailResult = await baseQuery(
      {
        url: '/certificates/1',
      },
      createApiStub(),
      {},
    );

    expect(detailResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: '1',
          }),
        }),
      }),
    );

    const createResult = await baseQuery(
      {
        url: '/certificates',
        method: 'POST',
        data: {
          certificateTypeId: 'nationality_cert',
          ownerType: 'vessel',
          ownerId: 'vessel-999',
          title: '新增证书',
          expiryDate: '2027-12-31',
          fileIds: ['file-1'],
        },
      },
      createApiStub(),
      {},
    );

    expect(createResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            title: '新增证书',
            advanceDays: expect.any(Number),
            files: expect.arrayContaining([
              expect.objectContaining({
                id: 'file-1',
              }),
            ]),
          }),
        }),
      }),
    );

    const createdId = (createResult as { data: { data: { id: string } } }).data.data.id;

    const updateResult = await baseQuery(
      {
        url: `/certificates/${createdId}`,
        method: 'PATCH',
        data: {
          status: 'archived',
        },
      },
      createApiStub(),
      {},
    );

    expect(updateResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: createdId,
            status: 'archived',
            advanceDays: expect.any(Number),
          }),
        }),
      }),
    );

    const bindResult = await baseQuery(
      {
        url: `/certificates/${createdId}/files`,
        method: 'POST',
        data: {
          fileIds: ['file-1'],
        },
      },
      createApiStub(),
      {},
    );

    expect(bindResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: createdId,
            files: expect.arrayContaining([
              expect.objectContaining({
                id: 'file-1',
              }),
            ]),
          }),
        }),
      }),
    );
  });

  it('supports reminder dashboard, list, detail, acknowledge, and scan routes in mock runtime', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const dashboardResult = await baseQuery(
      {
        url: '/certificate-reminders/dashboard',
      },
      createApiStub(),
      {},
    );

    expect(dashboardResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            totalPending: 1,
            totalOverdue: 1,
            totalAcknowledged: 1,
            byOwnerType: expect.arrayContaining([
              expect.objectContaining({
                ownerType: 'vessel',
                count: 2,
              }),
            ]),
          }),
        }),
      }),
    );

    const listResult = await baseQuery(
      {
        url: '/certificate-reminders',
        params: {
          page: 1,
          pageSize: 5,
        },
      },
      createApiStub(),
      {},
    );

    expect(listResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'reminder-1',
              certificateId: '1',
              ownerType: 'vessel',
              status: 'pending',
            }),
          ]),
          meta: expect.objectContaining({
            total: 3,
            page: 1,
            pageSize: 5,
            totalPages: 1,
          }),
        }),
      }),
    );

    const detailResult = await baseQuery(
      {
        url: '/certificate-reminders/reminder-1',
      },
      createApiStub(),
      {},
    );

    expect(detailResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: 'reminder-1',
            certificateTitle: '国籍证书',
          }),
        }),
      }),
    );

    const acknowledgeResult = await baseQuery(
      {
        url: '/certificate-reminders/reminder-1/acknowledge',
        method: 'POST',
        data: {
          comment: '已确认',
        },
      },
      createApiStub(),
      {},
    );

    expect(acknowledgeResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: 'reminder-1',
            status: 'acknowledged',
            acknowledgedBy: expect.any(String),
            acknowledgedAt: expect.any(String),
          }),
        }),
      }),
    );

    const scanResult = await baseQuery(
      {
        url: '/certificate-reminders/actions/scan',
        method: 'POST',
      },
      createApiStub(),
      {},
    );

    expect(scanResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            jobId: expect.stringMatching(/^scan-job-/),
            acceptedAt: expect.any(String),
          }),
        }),
      }),
    );
  });

  it('routes mock mode through the mock runtime even when the build is not dev', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');
    vi.stubEnv('DEV', false);

    const axiosModule = await import('axios');
    const axiosCreateSpy = vi.spyOn(axiosModule.default, 'create').mockReturnValue({
      request: vi.fn().mockResolvedValue({ data: { data: { source: 'axios' } } }),
      post: vi.fn(),
    } as never);

    const runtime = createMockRuntime();
    const { createBaseQuery } = await import('./baseApi');
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const result = await baseQuery({ url: '/certificate-reminders/dashboard' }, createApiStub(), {});

    expect(result).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            totalPending: 1,
          }),
        }),
      }),
    );
    expect(axiosCreateSpy).not.toHaveBeenCalled();
  });

  it('stores uploaded files in runtime state and binds them to certificates', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const uploadResult = await baseQuery(
      {
        url: '/files/callback',
        method: 'POST',
        data: {
          ossKey: 'certificates/2026/03/mock.pdf',
          fileName: 'mock.pdf',
          mimeType: 'application/pdf',
          fileSize: 123,
          category: 'certificates',
        },
      },
      createApiStub(),
      {},
    );

    expect(uploadResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            fileName: 'mock.pdf',
            ossKey: 'certificates/2026/03/mock.pdf',
          }),
        }),
      }),
    );

    const fileId = (uploadResult as { data: { data: { id: string } } }).data.data.id;

    const bindResult = await baseQuery(
      {
        url: '/certificates/1/files',
        method: 'POST',
        data: {
          fileIds: [fileId],
        },
      },
      createApiStub(),
      {},
    );

    expect(bindResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: '1',
            advanceDays: expect.any(Number),
            files: expect.arrayContaining([
              expect.objectContaining({
                id: fileId,
                fileName: 'mock.pdf',
                ossKey: 'certificates/2026/03/mock.pdf',
              }),
            ]),
          }),
        }),
      }),
    );
  });

  it('recomputes certificate ownerName when owner identity changes without an explicit ownerName', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const updateResult = await baseQuery(
      {
        url: '/certificates/1',
        method: 'PATCH',
        data: {
          ownerType: 'vehicle',
          ownerId: 'vehicle-200',
        },
      },
      createApiStub(),
      {},
    );

    expect(updateResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: '1',
            ownerType: 'vehicle',
            ownerId: 'vehicle-200',
            ownerName: '对象-vehicle-200',
          }),
        }),
      }),
    );
  });

  it('keeps certificate updates atomic when attachment lookup fails', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const failedUpdate = await baseQuery(
      {
        url: '/certificates/1',
        method: 'PATCH',
        data: {
          title: '不会生效的标题',
          fileIds: ['missing-file-id'],
        },
      },
      createApiStub(),
      {},
    );

    expect(failedUpdate).toEqual({
      error: {
        status: 'MOCK_RUNTIME_ERROR',
        data: {
          message: 'Files not found: missing-file-id',
        },
      },
    });

    const detailResult = await baseQuery(
      {
        url: '/certificates/1',
      },
      createApiStub(),
      {},
    );

    expect(detailResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            id: '1',
            title: '国籍证书',
          }),
        }),
      }),
    );
  });

  it('rejects file callbacks without an ossKey', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const callbackResult = await baseQuery(
      {
        url: '/files/callback',
        method: 'POST',
        data: {
          fileName: 'missing-osskey.pdf',
          mimeType: 'application/pdf',
          fileSize: 1,
          category: 'certificates',
        },
      },
      createApiStub(),
      {},
    );

    expect(callbackResult).toEqual({
      error: {
        status: 400,
        data: {
          message: 'ossKey is required',
        },
      },
    });
  });

  it('rejects unknown certificate fileIds instead of fabricating attachments', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const bindResult = await baseQuery(
      {
        url: '/certificates/1/files',
        method: 'POST',
        data: {
          fileIds: ['missing-file-id'],
        },
      },
      createApiStub(),
      {},
    );

    expect(bindResult).toEqual({
      error: {
        status: 'MOCK_RUNTIME_ERROR',
        data: {
          message: 'Files not found: missing-file-id',
        },
      },
    });
  });

  it('deduplicates repeated certificate fileIds within a single bind request', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const bindResult = await baseQuery(
      {
        url: '/certificates/1/files',
        method: 'POST',
        data: {
          fileIds: ['file-1', 'file-1'],
        },
      },
      createApiStub(),
      {},
    );

    expect(bindResult).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            files: [
              expect.objectContaining({
                id: 'file-1',
              }),
            ],
          }),
        }),
      }),
    );
  });

  it('publishes enterprise policy and exposes versions', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { createBaseQuery } = await import('./baseApi');
    const runtime = createMockRuntime();
    const baseQuery = createBaseQuery({
      mockRuntimeLoader: async () => runtime,
    });

    const publishResult = await baseQuery(
      {
        url: '/enterprise-policies/1/publish',
        method: 'POST',
      },
      createApiStub(),
      {},
    );

    expect(publishResult).toEqual({
      data: {
        data: expect.objectContaining({
          id: '1',
          status: 'published',
          publishedAt: expect.any(String),
        }),
      },
    });

    const versionsResult = await baseQuery(
      {
        url: '/enterprise-policies/1/versions',
      },
      createApiStub(),
      {},
    );

    expect(versionsResult).toEqual({
      data: {
        data: expect.arrayContaining([
          expect.objectContaining({
            version: expect.any(String),
            status: 'published',
          }),
        ]),
      },
    });
  });

  it('returns 201 for create and 204 without body for enterprise create/delete handlers', async () => {
    const createProfileResponse = await invokeMockRoute('POST', '/enterprise-profiles', {
      data: {
        title: '创建资料状态码',
        category: 'license',
      },
    });
    const createPolicyResponse = await invokeMockRoute('POST', '/enterprise-policies', {
      data: {
        title: '创建制度状态码',
        policyCode: 'POL-201',
      },
    });
    const deleteProfileResponse = await invokeMockRoute('DELETE', '/enterprise-profiles/1');
    const deletePolicyResponse = await invokeMockRoute('DELETE', '/enterprise-policies/1');

    expect(createProfileResponse.status).toBe(201);
    expect(createPolicyResponse.status).toBe(201);
    expect(deleteProfileResponse.status).toBe(204);
    expect(deleteProfileResponse.data).toBeUndefined();
    expect(deletePolicyResponse.status).toBe(204);
    expect(deletePolicyResponse.data).toBeUndefined();
  });

  it('throws when duplicate mock route keys are registered', () => {
    expect(() =>
      createMockState([
        {
          method: 'GET',
          path: '/auth/me',
          handler: () => ({ data: {} }),
        },
        {
          method: 'GET',
          path: '/auth/me',
          handler: () => ({ data: { duplicate: true } }),
        },
      ]),
    ).toThrow('Duplicate mock route shape: GET /auth/me');
  });

  it('throws when duplicate dynamic route shapes are registered', () => {
    expect(() =>
      createMockState([
        {
          method: 'GET',
          path: '/items/:id',
          handler: () => ({ data: {} }),
        },
        {
          method: 'GET',
          path: '/items/:slug',
          handler: () => ({ data: { duplicate: true } }),
        },
      ]),
    ).toThrow('Duplicate mock route shape: GET /items/:param');
  });

  it('throws when dynamic route patterns are ambiguous even if their shapes differ', () => {
    expect(() =>
      createMockState([
        {
          method: 'GET',
          path: '/items/:id/files',
          handler: () => ({ data: {} }),
        },
        {
          method: 'GET',
          path: '/items/:slug/:verb',
          handler: () => ({ data: { duplicate: true } }),
        },
      ]),
    ).toThrow(
      'Ambiguous mock route patterns: GET /items/:slug/:verb conflicts with GET /items/:id/files',
    );
  });

  it('falls back to axios when mock mode is disabled', async () => {
    vi.stubEnv('VITE_MOCK_MODE', 'false');

    const request = vi.fn().mockResolvedValue({ data: { data: { ok: true } } });
    const create = vi.fn(() => ({ request, post: vi.fn() }));
    const axiosModule = await import('axios');
    vi.spyOn(axiosModule.default, 'create').mockImplementation(create as never);

    const { createBaseQuery } = await import('./baseApi');
    const baseQuery = createBaseQuery();
    const result = await baseQuery({ url: '/health' }, createApiStub(), {});

    expect(create).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/health',
        method: 'GET',
      }),
    );
    expect(result).toEqual({ data: { data: { ok: true } } });
  });
});
