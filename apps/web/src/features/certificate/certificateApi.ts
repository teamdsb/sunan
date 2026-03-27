import { baseApi } from '../../app/baseApi';

interface ApiEnvelope<T> { data: T; meta?: { page: number; pageSize: number; total: number } }

export interface CertificateItem {
  id: string;
  certificateTypeId: string;
  certificateTypeName: string;
  ownerType: 'vessel' | 'vehicle' | 'personnel';
  ownerId: string;
  ownerName: string;
  title: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'archived';
  files: Array<{ id: string; fileName: string; ossKey: string }>;
}

export const certificateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCertificates: builder.query<ApiEnvelope<CertificateItem[]>, Record<string, unknown> | void>({
      query: (params) => ({ url: '/certificates', params }),
      providesTags: ['Certificate'],
    }),
    getGroupedCertificates: builder.query<ApiEnvelope<Array<{ groupKey: string; groupLabel: string; count: number }>>, { groupBy: 'owner' | 'type' }>({
      query: (params) => ({ url: '/certificates/grouped', params }),
      providesTags: ['Certificate'],
    }),
    getCertificateById: builder.query<ApiEnvelope<CertificateItem>, string>({
      query: (id) => ({ url: `/certificates/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Certificate', id }],
    }),
    createCertificate: builder.mutation<ApiEnvelope<CertificateItem>, Partial<CertificateItem> & { certificateTypeId: string; ownerType: string; ownerId: string; title: string; expiryDate: string }>({
      query: (data) => ({ url: '/certificates', method: 'POST', data }),
      invalidatesTags: ['Certificate', 'ReminderDashboard'],
    }),
    updateCertificate: builder.mutation<ApiEnvelope<CertificateItem>, { id: string; data: Partial<CertificateItem> }>({
      query: ({ id, data }) => ({ url: `/certificates/${id}`, method: 'PATCH', data }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Certificate', id: arg.id }, 'Certificate', 'ReminderDashboard'],
    }),
    bindCertificateFiles: builder.mutation<ApiEnvelope<CertificateItem>, { id: string; fileIds: string[] }>({
      query: ({ id, fileIds }) => ({ url: `/certificates/${id}/files`, method: 'POST', data: { fileIds } }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Certificate', id: arg.id }, 'Certificate'],
    }),
  }),
});

export const {
  useGetCertificatesQuery,
  useGetGroupedCertificatesQuery,
  useGetCertificateByIdQuery,
  useCreateCertificateMutation,
  useUpdateCertificateMutation,
  useBindCertificateFilesMutation,
} = certificateApi;
