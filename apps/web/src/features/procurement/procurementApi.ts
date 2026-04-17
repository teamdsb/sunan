import { baseApi } from '../../app/baseApi';

export type ProcurementDepartmentCode = 'general_office' | 'business_dept' | 'finance_dept' | 'shipping_dept' | 'logistics_dept';
export type ProcurementDimensionType = 'none' | 'vessel' | 'logistics_category';
export type ProcurementOrderStatus = 'draft' | 'submitted' | 'dept_approved' | 'final_approved' | 'rejected';
export type ProcurementApprovalLevel = 'dept' | 'final';
export type ProcurementApprovalAction = 'approve' | 'reject' | 'return';

export interface ProcurementFile {
  id: string;
  fileName: string;
  ossKey: string;
  mimeType: string;
  fileSize: number;
  relationType: string;
  createdAt: string;
}

export interface ProcurementOrder {
  id: string;
  orderNo: string;
  departmentCode: ProcurementDepartmentCode;
  dimensionType: ProcurementDimensionType;
  dimensionKey: string | null;
  title: string;
  summary: string;
  amount: number;
  expenseDate: string | null;
  status: ProcurementOrderStatus;
  approvalChannel: 'internal' | 'wecom_native';
  externalProcessInstanceId: string | null;
  externalStatus: string | null;
  externalSyncedAt: string | null;
  submittedAt: string | null;
  finalApprovedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  files?: ProcurementFile[];
}

export interface ProcurementApprovalRecord {
  id: string;
  approvalLevel: ProcurementApprovalLevel;
  action: ProcurementApprovalAction;
  comment: string | null;
  source: 'internal' | 'external';
  externalEventId: string | null;
  approvedBy: string;
  approvedAt: string;
}

export interface ProcurementPendingTask {
  entityType: 'order';
  entityId: string;
  title: string;
  departmentCode: ProcurementDepartmentCode;
  approvalLevel: ProcurementApprovalLevel;
  status: ProcurementOrderStatus;
  submittedAt: string;
  approvalChannel: 'internal' | 'wecom_native';
  externalStatus: string | null;
}

export interface ProcurementOrderCreatePayload {
  departmentCode: ProcurementDepartmentCode;
  dimensionType?: ProcurementDimensionType;
  dimensionKey?: string;
  title: string;
  summary: string;
  amount: number;
  expenseDate?: string;
  approvalChannel?: 'internal' | 'wecom_native';
}

export interface ProcurementOrderUpdatePayload {
  departmentCode?: ProcurementDepartmentCode;
  dimensionType?: ProcurementDimensionType;
  dimensionKey?: string;
  title?: string;
  summary?: string;
  amount?: number;
  expenseDate?: string;
}

export interface ProcurementOrderListQuery {
  keyword?: string;
  departmentCode?: ProcurementDepartmentCode;
  dimensionType?: ProcurementDimensionType;
  dimensionKey?: string;
  status?: ProcurementOrderStatus;
  page?: number;
  pageSize?: number;
}

export const procurementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProcurementOrders: builder.query<
      { data: ProcurementOrder[]; meta: { total: number; page: number; pageSize: number; totalPages: number } },
      ProcurementOrderListQuery | void
    >({
      query: (params) => ({ url: '/procurement/orders', params }),
      providesTags: ['ProcurementOrder'],
    }),
    getProcurementOrder: builder.query<{ data: ProcurementOrder }, string>({
      query: (id) => ({ url: `/procurement/orders/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'ProcurementOrder', id }],
    }),
    createProcurementOrder: builder.mutation<{ data: ProcurementOrder }, ProcurementOrderCreatePayload>({
      query: (data) => ({ url: '/procurement/orders', method: 'POST', data }),
      invalidatesTags: ['ProcurementOrder'],
    }),
    updateProcurementOrder: builder.mutation<{ data: ProcurementOrder }, { id: string; data: ProcurementOrderUpdatePayload }>({
      query: ({ id, data }) => ({ url: `/procurement/orders/${id}`, method: 'PATCH', data }),
      invalidatesTags: (_result, _error, { id }) => ['ProcurementOrder', { type: 'ProcurementOrder', id }],
    }),
    submitProcurementOrder: builder.mutation<{ data: ProcurementOrder }, string>({
      query: (id) => ({ url: `/procurement/orders/${id}/submit`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => ['ProcurementOrder', 'ProcurementApproval', { type: 'ProcurementOrder', id }],
    }),
    resubmitProcurementOrder: builder.mutation<{ data: ProcurementOrder }, string>({
      query: (id) => ({ url: `/procurement/orders/${id}/resubmit`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => ['ProcurementOrder', 'ProcurementApproval', { type: 'ProcurementOrder', id }],
    }),
    bindProcurementOrderAttachments: builder.mutation<{ data: ProcurementOrder }, { id: string; fileIds: string[] }>({
      query: ({ id, fileIds }) => ({ url: `/procurement/orders/${id}/attachments`, method: 'POST', data: { fileIds } }),
      invalidatesTags: (_result, _error, { id }) => ['ProcurementOrder', { type: 'ProcurementOrder', id }],
    }),
    getProcurementPendingApprovals: builder.query<{ data: ProcurementPendingTask[] }, { departmentCode?: ProcurementDepartmentCode } | void>({
      query: (params) => ({ url: '/procurement/approvals/pending', params }),
      providesTags: ['ProcurementApproval'],
    }),
    getProcurementOrderApprovals: builder.query<{ data: ProcurementApprovalRecord[] }, string>({
      query: (id) => ({ url: `/procurement/orders/${id}/approvals` }),
      providesTags: (_result, _error, id) => [{ type: 'ProcurementApproval', id }],
    }),
    actionProcurementOrderApproval: builder.mutation<
      { data: { entityId: string; status: ProcurementOrderStatus; latestApproval: ProcurementApprovalRecord } },
      { id: string; action: ProcurementApprovalAction; comment?: string }
    >({
      query: ({ id, action, comment }) => ({
        url: `/procurement/orders/${id}/approvals/actions`,
        method: 'POST',
        data: { action, comment, source: 'internal' },
      }),
      invalidatesTags: (_result, _error, { id }) => ['ProcurementOrder', 'ProcurementApproval', { type: 'ProcurementOrder', id }],
    }),
  }),
});

export const {
  useGetProcurementOrdersQuery,
  useGetProcurementOrderQuery,
  useCreateProcurementOrderMutation,
  useUpdateProcurementOrderMutation,
  useSubmitProcurementOrderMutation,
  useResubmitProcurementOrderMutation,
  useBindProcurementOrderAttachmentsMutation,
  useGetProcurementPendingApprovalsQuery,
  useGetProcurementOrderApprovalsQuery,
  useActionProcurementOrderApprovalMutation,
} = procurementApi;
