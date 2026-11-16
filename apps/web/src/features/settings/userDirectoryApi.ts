import { baseApi } from '../../app/baseApi';

interface ApiEnvelope<T> {
  data: T;
}

export type BusinessRole =
  | 'general_office'
  | 'finance'
  | 'business'
  | 'shipping'
  | 'logistics'
  | 'crew';

export type PlatformStatus = 'enabled' | 'disabled';
export type DepartmentMode = 'follow_wecom' | 'manual';
export type RoleMode = 'auto' | 'manual';

export interface UserDirectoryItem {
  userId: string;
  name: string;
  avatar?: string | null;
  corpId: string;
  source: {
    status: 'active' | 'inactive' | 'unknown';
    departmentIds: number[];
    departments: string[];
    roles: string[];
    position: string | null;
    lastLoginAt: string | null;
    loginStatus: 'unknown' | 'never' | 'logged_in';
    lastSyncAt: string | null;
    sourceRevision: number;
  };
  platform: {
    status: PlatformStatus;
    statusReason: string | null;
    departmentMode: DepartmentMode;
    manualDepartmentIds: number[];
    roleMode: RoleMode;
    manualRoles: BusinessRole[];
    authorizationVersion: number;
  };
  effective: {
    departmentIds: number[];
    departments: string[];
    roles: string[];
    isSystemAdmin: boolean;
    available: boolean;
  };
  audits?: UserDirectoryAudit[];
}

export interface UserDirectoryAudit {
  id: string;
  actorUserId: string;
  source: string;
  action: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  authorizationVersion: number | null;
  createdAt: string;
}

export interface UserDirectoryListResponse {
  items: UserDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
  scope: {
    corpId: string;
    coverageStatus: string;
    coverageNote: string;
  };
}

export interface DepartmentOption {
  id: number;
  parentId: number | null;
  name: string;
  roles: string[];
  sourceRevision: number;
}

export interface DepartmentListResponse {
  items: DepartmentOption[];
  scope: {
    coverageStatus: string;
    coverageNote: string;
    lastSyncAt: string | null;
    batchId: string | null;
    batchStatus: string | null;
  };
}

export interface SyncBatch {
  id: string;
  status: 'running' | 'succeeded' | 'partial' | 'failed';
  coverageStatus: string;
  coverageNote: string;
  startedAt: string;
  finishedAt: string | null;
  readCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errorSummary: Array<{ scope: string; message: string }>;
}

export interface UserDirectoryQuery {
  search?: string;
  departmentId?: number;
  role?: BusinessRole | 'all_authenticated' | 'system_admin';
  platformStatus?: PlatformStatus;
  isSystemAdmin?: boolean;
  hasLoggedIn?: boolean;
  hasOverrides?: boolean;
  page?: number;
  pageSize?: number;
}

export interface UpdateUserDirectoryInput {
  departmentMode?: DepartmentMode;
  manualDepartmentIds?: number[];
  roleMode?: RoleMode;
  manualRoles?: BusinessRole[];
  platformStatus?: PlatformStatus;
  expectedAuthorizationVersion: number;
  reason: string;
}

export const BUSINESS_ROLE_LABELS: Record<BusinessRole, string> = {
  general_office: '总经办',
  finance: '财务',
  business: '业务',
  shipping: '船务',
  logistics: '后勤',
  crew: '船员',
};

export const userDirectoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAdminUsers: builder.query<ApiEnvelope<UserDirectoryListResponse>, UserDirectoryQuery>({
      query: (params) => ({ url: '/admin/wecom-users', params }),
      providesTags: ['UserDirectory'],
    }),
    getAdminUser: builder.query<ApiEnvelope<UserDirectoryItem>, string>({
      query: (userId) => ({ url: `/admin/wecom-users/${encodeURIComponent(userId)}` }),
      providesTags: (_result, _error, userId) => [{ type: 'UserDirectory', id: userId }],
    }),
    getAdminDepartments: builder.query<ApiEnvelope<DepartmentListResponse>, void>({
      query: () => ({ url: '/admin/wecom-departments' }),
      providesTags: ['UserDirectory'],
    }),
    updateAdminUser: builder.mutation<ApiEnvelope<UserDirectoryItem>, { userId: string; input: UpdateUserDirectoryInput }>({
      query: ({ userId, input }) => ({
        url: `/admin/wecom-users/${encodeURIComponent(userId)}/authorization`,
        method: 'PATCH',
        data: input,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        'UserDirectory',
        { type: 'UserDirectory', id: userId },
        'CurrentUser',
        'ProcurementOrder',
        'ProcurementApproval',
        'ProcurementReport',
        'ProcurementReportApproval',
        'Certificate',
        'CertificateOwner',
        'Reminder',
        'ReminderDashboard',
        'Workbench',
        'WorkbenchRecord',
        'EnterpriseProfile',
        'EnterprisePolicy',
      ],
    }),
    startAdminUserSync: builder.mutation<ApiEnvelope<SyncBatch>, void>({
      query: () => ({ url: '/admin/wecom-directory-sync', method: 'POST' }),
      invalidatesTags: ['UserDirectory'],
    }),
    getAdminSyncBatch: builder.query<ApiEnvelope<SyncBatch>, string>({
      query: (batchId) => ({ url: `/admin/wecom-directory-sync/${encodeURIComponent(batchId)}` }),
      providesTags: ['UserDirectory'],
    }),
  }),
});

export const {
  useListAdminUsersQuery,
  useGetAdminUserQuery,
  useGetAdminDepartmentsQuery,
  useUpdateAdminUserMutation,
  useStartAdminUserSyncMutation,
  useGetAdminSyncBatchQuery,
  useLazyGetAdminSyncBatchQuery,
} = userDirectoryApi;
