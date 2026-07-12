import { baseApi } from '../../app/baseApi';

interface ApiEnvelope<T> {
  data: T;
  meta?: { page: number; pageSize: number; total: number; totalPages?: number };
}

export interface CertificateItem {
  id: string;
  certificateTypeId: string;
  certificateTypeName: string;
  ownerType: 'vessel' | 'vehicle' | 'personnel' | 'equipment';
  ownerId: string;
  ownerName: string;
  title: string;
  expiryDate: string;
  advanceDays: number;
  status: 'active' | 'expired' | 'archived';
  files: Array<{ id: string; fileName: string; ossKey: string }>;
}

export interface CertificateGroup {
  groupKey: string;
  groupLabel: string;
  count: number;
  items: CertificateItem[];
}

export interface CertificateTypeItem {
  id: string;
  code: string;
  name: string;
  ownerScope: string;
  reminderCategory: string;
  defaultAdvanceDays: number;
  requiresAttachment: boolean;
}

export interface CertificateOwnerItem {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface CreateCertificateInput {
  certificateTypeId: string;
  ownerType: CertificateItem['ownerType'];
  ownerId: string;
  title: string;
  certificateNo?: string;
  issueDate?: string;
  expiryDate: string;
  advanceDays?: number;
  issuer?: string;
  status?: CertificateItem['status'];
  remarks?: string;
  fileIds?: string[];
}

export interface UpdateCertificateInput {
  certificateTypeId?: string;
  ownerType?: CertificateItem['ownerType'];
  ownerId?: string;
  ownerName?: string;
  title?: string;
  expiryDate?: string;
  advanceDays?: number;
  status?: CertificateItem['status'];
  fileIds?: string[];
}

export const certificateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCertificates: builder.query<ApiEnvelope<CertificateItem[]>, Record<string, unknown> | void>({
      query: (params) => ({ url: '/certificates', params }),
      providesTags: ['Certificate'],
    }),
    getGroupedCertificates: builder.query<ApiEnvelope<CertificateGroup[]>, { groupBy: 'owner' | 'type' }>({
      query: (params) => ({ url: '/certificates/grouped', params }),
      providesTags: ['Certificate'],
    }),
    getCertificateTypes: builder.query<ApiEnvelope<CertificateTypeItem[]>, { ownerType?: CertificateItem['ownerType'] } | void>({
      query: (params) => ({ url: '/certificate-types', params }),
      providesTags: ['CertificateType'],
    }),
    getCertificateOwners: builder.query<ApiEnvelope<CertificateOwnerItem[]>, { ownerType: CertificateItem['ownerType'] }>({
      query: (params) => ({ url: '/certificate-owners', params }),
      providesTags: ['CertificateOwner'],
    }),
    getCertificateById: builder.query<ApiEnvelope<CertificateItem>, string>({
      query: (id) => ({ url: `/certificates/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Certificate', id }],
    }),
    createCertificate: builder.mutation<ApiEnvelope<CertificateItem>, CreateCertificateInput>({
      query: (data) => ({ url: '/certificates', method: 'POST', data }),
      invalidatesTags: ['Certificate', 'ReminderDashboard'],
    }),
    updateCertificate: builder.mutation<ApiEnvelope<CertificateItem>, { id: string; data: UpdateCertificateInput }>({
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
  useGetCertificateTypesQuery,
  useGetCertificateOwnersQuery,
  useGetCertificateByIdQuery,
  useCreateCertificateMutation,
  useUpdateCertificateMutation,
  useBindCertificateFilesMutation,
} = certificateApi;
