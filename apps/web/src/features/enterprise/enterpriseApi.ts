import { baseApi } from '../../app/baseApi';

interface ApiEnvelope<T> {
  data: T;
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface EnterpriseFile { id: string; fileName: string; ossKey: string; mimeType: string; fileSize: number }
export interface EnterpriseProfile {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  status: 'draft' | 'published' | 'archived';
  effectiveDate?: string | null;
  publishedAt?: string | null;
  files: EnterpriseFile[];
  createdAt: string;
  updatedAt: string;
}
export interface EnterprisePolicy {
  id: string;
  title: string;
  policyCode: string;
  version: string;
  summary?: string | null;
  status: 'draft' | 'published' | 'deprecated';
  effectiveDate?: string | null;
  publishedAt?: string | null;
  files: EnterpriseFile[];
  createdAt: string;
  updatedAt: string;
}

export const enterpriseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEnterpriseProfiles: builder.query<ApiEnvelope<EnterpriseProfile[]>, Record<string, unknown> | void>({
      query: (params) => ({ url: '/enterprise-profiles', params }),
      providesTags: ['EnterpriseProfile'],
    }),
    getEnterpriseProfileById: builder.query<ApiEnvelope<EnterpriseProfile>, string>({
      query: (id) => ({ url: `/enterprise-profiles/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'EnterpriseProfile', id }],
    }),
    createEnterpriseProfile: builder.mutation<ApiEnvelope<EnterpriseProfile>, Partial<EnterpriseProfile>>({
      query: (data) => ({ url: '/enterprise-profiles', method: 'POST', data }),
      invalidatesTags: ['EnterpriseProfile'],
    }),
    updateEnterpriseProfile: builder.mutation<ApiEnvelope<EnterpriseProfile>, { id: string; data: Partial<EnterpriseProfile> }>({
      query: ({ id, data }) => ({ url: `/enterprise-profiles/${id}`, method: 'PATCH', data }),
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          enterpriseApi.util.updateQueryData('getEnterpriseProfileById', id, (draft) => {
            if (draft.data) {
              Object.assign(draft.data, data);
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_r, _e, arg) => [{ type: 'EnterpriseProfile', id: arg.id }, 'EnterpriseProfile'],
    }),
    bindEnterpriseProfileFiles: builder.mutation<ApiEnvelope<EnterpriseProfile>, { id: string; fileIds: string[] }>({
      query: ({ id, fileIds }) => ({
        url: `/enterprise-profiles/${id}/files`,
        method: 'POST',
        data: { fileIds },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'EnterpriseProfile', id: arg.id }, 'EnterpriseProfile'],
    }),
    deleteEnterpriseProfile: builder.mutation<void, string>({
      query: (id) => ({ url: `/enterprise-profiles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EnterpriseProfile'],
    }),

    getEnterprisePolicies: builder.query<ApiEnvelope<EnterprisePolicy[]>, Record<string, unknown> | void>({
      query: (params) => ({ url: '/enterprise-policies', params }),
      providesTags: ['EnterprisePolicy'],
    }),
    getEnterprisePolicyById: builder.query<ApiEnvelope<EnterprisePolicy>, string>({
      query: (id) => ({ url: `/enterprise-policies/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'EnterprisePolicy', id }],
    }),
    getEnterprisePolicyVersions: builder.query<ApiEnvelope<Array<{ id: string; version: string; status: string }>>, string>({
      query: (id) => ({ url: `/enterprise-policies/${id}/versions` }),
      providesTags: ['PolicyVersion'],
    }),
    createEnterprisePolicy: builder.mutation<ApiEnvelope<EnterprisePolicy>, Partial<EnterprisePolicy>>({
      query: (data) => ({ url: '/enterprise-policies', method: 'POST', data }),
      invalidatesTags: ['EnterprisePolicy', 'PolicyVersion'],
    }),
    updateEnterprisePolicy: builder.mutation<ApiEnvelope<EnterprisePolicy>, { id: string; data: Partial<EnterprisePolicy> }>({
      query: ({ id, data }) => ({ url: `/enterprise-policies/${id}`, method: 'PATCH', data }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'EnterprisePolicy', id: arg.id }, 'EnterprisePolicy', 'PolicyVersion'],
    }),
    bindEnterprisePolicyFiles: builder.mutation<ApiEnvelope<EnterprisePolicy>, { id: string; fileIds: string[] }>({
      query: ({ id, fileIds }) => ({
        url: `/enterprise-policies/${id}/files`,
        method: 'POST',
        data: { fileIds },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'EnterprisePolicy', id: arg.id }, 'EnterprisePolicy', 'PolicyVersion'],
    }),
    publishEnterprisePolicy: builder.mutation<ApiEnvelope<EnterprisePolicy>, string>({
      query: (id) => ({ url: `/enterprise-policies/${id}/publish`, method: 'POST' }),
      invalidatesTags: ['EnterprisePolicy', 'PolicyVersion'],
    }),
    deleteEnterprisePolicy: builder.mutation<void, string>({
      query: (id) => ({ url: `/enterprise-policies/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EnterprisePolicy', 'PolicyVersion'],
    }),
  }),
});

export const {
  useGetEnterpriseProfilesQuery,
  useGetEnterpriseProfileByIdQuery,
  useCreateEnterpriseProfileMutation,
  useUpdateEnterpriseProfileMutation,
  useBindEnterpriseProfileFilesMutation,
  useDeleteEnterpriseProfileMutation,
  useGetEnterprisePoliciesQuery,
  useGetEnterprisePolicyByIdQuery,
  useGetEnterprisePolicyVersionsQuery,
  useCreateEnterprisePolicyMutation,
  useUpdateEnterprisePolicyMutation,
  useBindEnterprisePolicyFilesMutation,
  usePublishEnterprisePolicyMutation,
  useDeleteEnterprisePolicyMutation,
} = enterpriseApi;
