import { baseApi } from '../../app/baseApi';

export interface OfficeCategory {
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
  canManage: boolean;
}

export interface OfficeEntry {
  id: string;
  categoryCode: string;
  title: string;
  summary: string;
  iconType: string;
  targetType: 'external_url' | 'internal_route';
  targetValue: string;
  openMode: 'current_webview' | 'new_window';
  visibilityRoles: string[];
  managerRoles: string[];
  sortOrder: number;
  status: 'draft' | 'published' | 'disabled';
}

export interface OfficeAdminEntry extends OfficeEntry {
  canManage: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeAuditRecord {
  id: string;
  entryId: string;
  entryTitle: string;
  categoryCode: string;
  action: 'create' | 'update' | 'publish' | 'disable' | 'open';
  operatorUserId: string;
  payloadSnapshot: Record<string, unknown>;
  createdAt: string;
}

export interface OfficeOpenResult {
  id: string;
  title: string;
  targetType: OfficeEntry['targetType'];
  targetValue: string;
  openMode: OfficeEntry['openMode'];
}

export interface OfficeAdminQuery {
  keyword?: string;
  categoryCode?: string;
  status?: OfficeEntry['status'];
}

export interface OfficeAuditQuery {
  entryId?: string;
  action?: OfficeAuditRecord['action'];
  operatorUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface OfficeEntryMutationPayload {
  categoryCode: string;
  title: string;
  summary: string;
  iconType: string;
  targetType: OfficeEntry['targetType'];
  targetValue: string;
  openMode: OfficeEntry['openMode'];
  visibilityRoles: string[];
  managerRoles?: string[];
  sortOrder?: number;
}

export const officeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOfficeCategories: builder.query<{ data: OfficeCategory[] }, void>({
      query: () => ({ url: '/office/categories' }),
      providesTags: ['OfficeCategory'],
    }),
    getOfficeEntries: builder.query<{ data: OfficeEntry[] }, { keyword?: string; categoryCode?: string } | void>({
      query: (params) => ({ url: '/office/entries', params }),
      providesTags: ['OfficeEntry'],
    }),
    openOfficeEntry: builder.mutation<{ data: OfficeOpenResult }, string>({
      query: (id) => ({ url: `/office/entries/${id}/open`, method: 'POST' }),
      invalidatesTags: ['OfficeAudit'],
    }),
    getOfficeAdminEntries: builder.query<{ data: OfficeAdminEntry[] }, OfficeAdminQuery | void>({
      query: (params) => ({ url: '/office/admin/entries', params }),
      providesTags: ['OfficeAdminEntry'],
    }),
    getOfficeAdminAudits: builder.query<
      { data: OfficeAuditRecord[]; meta: { total: number; page: number; pageSize: number; totalPages: number } },
      OfficeAuditQuery | void
    >({
      query: (params) => ({ url: '/office/admin/audits', params }),
      providesTags: ['OfficeAudit'],
    }),
    createOfficeEntry: builder.mutation<{ data: OfficeAdminEntry }, OfficeEntryMutationPayload>({
      query: (data) => ({ url: '/office/admin/entries', method: 'POST', data }),
      invalidatesTags: ['OfficeAdminEntry', 'OfficeEntry', 'OfficeAudit'],
    }),
    updateOfficeEntry: builder.mutation<{ data: OfficeAdminEntry }, { id: string; data: Partial<OfficeEntryMutationPayload> }>({
      query: ({ id, data }) => ({ url: `/office/admin/entries/${id}`, method: 'PATCH', data }),
      invalidatesTags: ['OfficeAdminEntry', 'OfficeEntry', 'OfficeAudit'],
    }),
    publishOfficeEntry: builder.mutation<{ data: OfficeAdminEntry }, string>({
      query: (id) => ({ url: `/office/admin/entries/${id}/publish`, method: 'POST' }),
      invalidatesTags: ['OfficeAdminEntry', 'OfficeEntry', 'OfficeAudit'],
    }),
    disableOfficeEntry: builder.mutation<{ data: OfficeAdminEntry }, string>({
      query: (id) => ({ url: `/office/admin/entries/${id}/disable`, method: 'POST' }),
      invalidatesTags: ['OfficeAdminEntry', 'OfficeEntry', 'OfficeAudit'],
    }),
  }),
});

export const {
  useGetOfficeCategoriesQuery,
  useGetOfficeEntriesQuery,
  useOpenOfficeEntryMutation,
  useGetOfficeAdminEntriesQuery,
  useGetOfficeAdminAuditsQuery,
  useCreateOfficeEntryMutation,
  useUpdateOfficeEntryMutation,
  usePublishOfficeEntryMutation,
  useDisableOfficeEntryMutation,
} = officeApi;
