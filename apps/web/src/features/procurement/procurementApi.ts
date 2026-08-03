import { baseApi } from '../../app/baseApi';

export type ProcurementDepartmentCode =
  | 'general_office'
  | 'business_dept'
  | 'finance_dept'
  | 'shipping_dept'
  | 'logistics_dept';
export type ProcurementDimensionType = 'none' | 'vessel' | 'logistics_category';
export type ProcurementOrderStatus =
  | 'draft'
  | 'submitted'
  | 'dept_approved'
  | 'final_approved'
  | 'rejected';
export type ProcurementApprovalLevel = 'dept' | 'finance' | 'final';
export type ProcurementApprovalAction = 'approve' | 'reject' | 'return';
export type ProcurementReportType = 'monthly' | 'yearly';
export type ProcurementReportRequestStatus =
  | 'draft'
  | 'submitted'
  | 'dept_approved'
  | 'finance_approved'
  | 'final_approved'
  | 'rejected';

export interface ProcurementDimensionItem {
  id: string;
  departmentCode: 'shipping_dept' | 'logistics_dept';
  dimensionType: 'vessel' | 'logistics_category';
  dimensionKey: string;
  dimensionName: string;
  sortOrder: number;
  isEnabled: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

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
  entityType: 'order' | 'report';
  entityId: string;
  title: string;
  departmentCode: ProcurementDepartmentCode | null;
  approvalLevel: ProcurementApprovalLevel;
  status: string;
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
  submittedFrom?: string;
  submittedTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ProcurementReportSummaryItem {
  label: string;
  amount: number;
  orderCount: number;
}

export interface ProcurementReportDetailItem {
  orderId: string;
  orderNo: string;
  departmentCode: ProcurementDepartmentCode;
  dimensionType: ProcurementDimensionType;
  dimensionKey: string | null;
  title: string;
  amount: number;
  status: ProcurementOrderStatus;
  submittedAt: string | null;
}

export interface ProcurementReportRequest {
  id: string;
  reportNo: string;
  reportType: ProcurementReportType;
  periodYear: number;
  periodMonth: number | null;
  departmentCode: ProcurementDepartmentCode | null;
  snapshotParams: Record<string, unknown>;
  snapshotSummary: Record<string, unknown>;
  status: ProcurementReportRequestStatus;
  approvalChannel: 'internal' | 'wecom_native';
  externalProcessInstanceId: string | null;
  externalStatus: string | null;
  externalSyncedAt: string | null;
  submittedAt: string | null;
  finalApprovedAt: string | null;
  exportPdfFileId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementReportRequestCreatePayload {
  reportType: ProcurementReportType;
  periodYear: number;
  periodMonth?: number;
  departmentCode?: ProcurementDepartmentCode;
  approvalChannel?: 'internal' | 'wecom_native';
}

export interface ProcurementDimensionCreatePayload {
  departmentCode: 'shipping_dept' | 'logistics_dept';
  dimensionType: 'vessel' | 'logistics_category';
  dimensionKey: string;
  dimensionName: string;
  sortOrder?: number;
}

export interface ProcurementDimensionUpdatePayload {
  dimensionName?: string;
  sortOrder?: number;
  isEnabled?: boolean;
}

export interface ProcurementBudgetSummaryItem {
  departmentCode: ProcurementDepartmentCode;
  dimensionType: ProcurementDimensionType;
  dimensionKey: string | null;
  dimensionName: string;
  budgetAmount: number;
  executedAmount: number;
  executionRate: number;
  overBudgetAmount: number;
  isOverBudget: boolean;
  isConfigured: boolean;
}

export interface ProcurementBudgetSummary {
  year: number;
  budgetAmount: number;
  executedAmount: number;
  executionRate: number;
  overBudgetAmount: number;
  isOverBudget: boolean;
  items: ProcurementBudgetSummaryItem[];
}

export interface ProcurementBudget extends ProcurementBudgetSummaryItem {
  id: string;
  budgetYear: number;
  dimensionNameSnapshot: string;
  isEnabled: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementBudgetAudit {
  id: string;
  budgetId: string;
  action: 'create' | 'update' | 'enable' | 'disable';
  beforeAmount: number | null;
  afterAmount: number | null;
  beforeEnabled: boolean | null;
  afterEnabled: boolean | null;
  changeReason: string;
  payloadSnapshot: Record<string, unknown>;
  changedBy: string;
  changedAt: string;
}

export interface ProcurementBudgetCreatePayload {
  budgetYear: number;
  departmentCode: ProcurementDepartmentCode;
  dimensionType: ProcurementDimensionType;
  dimensionKey?: string;
  budgetAmount: number;
  changeReason: string;
}

export interface ProcurementBudgetUpdatePayload {
  budgetAmount?: number;
  isEnabled?: boolean;
  changeReason: string;
}

export interface ProcurementReportRequestListQuery {
  reportType?: ProcurementReportType;
  periodYear?: number;
  departmentCode?: ProcurementDepartmentCode;
  status?: ProcurementReportRequestStatus;
  page?: number;
  pageSize?: number;
}

export const procurementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProcurementBudgetSummary: builder.query<
      { data: ProcurementBudgetSummary },
      { year: number }
    >({
      query: (params) => ({ url: '/procurement/budgets/summary', params }),
      providesTags: ['ProcurementBudget'],
    }),
    getProcurementBudgets: builder.query<
      { data: ProcurementBudget[] },
      {
        year: number;
        departmentCode?: ProcurementDepartmentCode;
        isEnabled?: boolean;
      }
    >({
      query: (params) => ({ url: '/procurement/admin/budgets', params }),
      providesTags: ['ProcurementBudget'],
    }),
    createProcurementBudget: builder.mutation<
      { data: ProcurementBudget },
      ProcurementBudgetCreatePayload
    >({
      query: (data) => ({
        url: '/procurement/admin/budgets',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['ProcurementBudget'],
    }),
    updateProcurementBudget: builder.mutation<
      { data: ProcurementBudget },
      { id: string; data: ProcurementBudgetUpdatePayload }
    >({
      query: ({ id, data }) => ({
        url: `/procurement/admin/budgets/${id}`,
        method: 'PATCH',
        data,
      }),
      invalidatesTags: ['ProcurementBudget'],
    }),
    getProcurementBudgetAudits: builder.query<
      { data: ProcurementBudgetAudit[] },
      string
    >({
      query: (id) => ({ url: `/procurement/admin/budgets/${id}/audits` }),
      providesTags: (_result, _error, id) => [
        { type: 'ProcurementBudget', id },
      ],
    }),
    getProcurementDimensions: builder.query<
      { data: ProcurementDimensionItem[] },
      {
        departmentCode?: 'shipping_dept' | 'logistics_dept';
        isEnabled?: boolean;
      } | void
    >({
      query: (params) => ({ url: '/procurement/dimensions', params }),
      providesTags: ['ProcurementReport'],
    }),
    createProcurementDimension: builder.mutation<
      { data: ProcurementDimensionItem },
      ProcurementDimensionCreatePayload
    >({
      query: (data) => ({
        url: '/procurement/admin/dimensions',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['ProcurementReport'],
    }),
    updateProcurementDimension: builder.mutation<
      { data: ProcurementDimensionItem },
      { id: string; data: ProcurementDimensionUpdatePayload }
    >({
      query: ({ id, data }) => ({
        url: `/procurement/admin/dimensions/${id}`,
        method: 'PATCH',
        data,
      }),
      invalidatesTags: ['ProcurementReport'],
    }),
    disableProcurementDimension: builder.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/procurement/admin/dimensions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ProcurementReport'],
    }),
    getProcurementOrders: builder.query<
      {
        data: ProcurementOrder[];
        meta: {
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      },
      ProcurementOrderListQuery | void
    >({
      query: (params) => ({ url: '/procurement/orders', params }),
      providesTags: ['ProcurementOrder'],
    }),
    getProcurementOrder: builder.query<{ data: ProcurementOrder }, string>({
      query: (id) => ({ url: `/procurement/orders/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'ProcurementOrder', id }],
    }),
    createProcurementOrder: builder.mutation<
      { data: ProcurementOrder },
      ProcurementOrderCreatePayload
    >({
      query: (data) => ({ url: '/procurement/orders', method: 'POST', data }),
      invalidatesTags: ['ProcurementOrder'],
    }),
    updateProcurementOrder: builder.mutation<
      { data: ProcurementOrder },
      { id: string; data: ProcurementOrderUpdatePayload }
    >({
      query: ({ id, data }) => ({
        url: `/procurement/orders/${id}`,
        method: 'PATCH',
        data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'ProcurementOrder',
        { type: 'ProcurementOrder', id },
      ],
    }),
    submitProcurementOrder: builder.mutation<
      { data: ProcurementOrder },
      string
    >({
      query: (id) => ({
        url: `/procurement/orders/${id}/submit`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        'ProcurementOrder',
        'ProcurementApproval',
        { type: 'ProcurementOrder', id },
      ],
    }),
    resubmitProcurementOrder: builder.mutation<
      { data: ProcurementOrder },
      string
    >({
      query: (id) => ({
        url: `/procurement/orders/${id}/resubmit`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        'ProcurementOrder',
        'ProcurementApproval',
        { type: 'ProcurementOrder', id },
      ],
    }),
    bindProcurementOrderAttachments: builder.mutation<
      { data: ProcurementOrder },
      { id: string; fileIds: string[] }
    >({
      query: ({ id, fileIds }) => ({
        url: `/procurement/orders/${id}/attachments`,
        method: 'POST',
        data: { fileIds },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'ProcurementOrder',
        { type: 'ProcurementOrder', id },
      ],
    }),
    unlinkProcurementOrderAttachment: builder.mutation<void, { id: string; fileId: string; reason: string }>({
      query: ({ id, fileId, reason }) => ({
        url: `/procurement/orders/${id}/attachments/${fileId}`,
        method: 'DELETE',
        data: { reason },
      }),
      invalidatesTags: (_result, _error, { id }) => ['ProcurementOrder', { type: 'ProcurementOrder', id }],
    }),
    getProcurementOrderAttachmentDownloadUrl: builder.query<
      { data: { downloadUrl: string; expiresAt: string } },
      { id: string; fileId: string }
    >({
      query: ({ id, fileId }) => ({
        url: `/procurement/orders/${id}/attachments/${fileId}/download-url`,
      }),
    }),
    printProcurementOrder: builder.mutation<
      { data: { fileId: string; downloadUrl: string } },
      string
    >({
      query: (id) => ({
        url: `/procurement/orders/${id}/print`,
        method: 'POST',
      }),
    }),
    getProcurementPendingApprovals: builder.query<
      { data: ProcurementPendingTask[] },
      {
        entityType?: 'order' | 'report';
        departmentCode?: ProcurementDepartmentCode;
        page?: number;
        pageSize?: number;
      } | void
    >({
      query: (params) => ({ url: '/procurement/approvals/pending', params }),
      providesTags: ['ProcurementApproval', 'ProcurementReport'],
    }),
    getProcurementOrderApprovals: builder.query<
      { data: ProcurementApprovalRecord[] },
      string
    >({
      query: (id) => ({ url: `/procurement/orders/${id}/approvals` }),
      providesTags: (_result, _error, id) => [
        { type: 'ProcurementApproval', id },
      ],
    }),
    actionProcurementOrderApproval: builder.mutation<
      {
        data: {
          entityId: string;
          status: ProcurementOrderStatus;
          latestApproval: ProcurementApprovalRecord;
        };
      },
      { id: string; action: ProcurementApprovalAction; comment?: string }
    >({
      query: ({ id, action, comment }) => ({
        url: `/procurement/orders/${id}/approvals/actions`,
        method: 'POST',
        data: { action, comment, source: 'internal' },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'ProcurementOrder',
        'ProcurementApproval',
        { type: 'ProcurementOrder', id },
      ],
    }),
    getProcurementMonthlyReport: builder.query<
      {
        data: {
          year: number;
          month: number;
          items: ProcurementReportSummaryItem[];
        };
      },
      {
        year: number;
        month: number;
        departmentCode?: ProcurementDepartmentCode;
      }
    >({
      query: (params) => ({ url: '/procurement/reports/monthly', params }),
      providesTags: ['ProcurementReport'],
    }),
    getProcurementYearlyReport: builder.query<
      { data: { year: number; items: ProcurementReportSummaryItem[] } },
      { year: number; departmentCode?: ProcurementDepartmentCode }
    >({
      query: (params) => ({ url: '/procurement/reports/yearly', params }),
      providesTags: ['ProcurementReport'],
    }),
    getProcurementDepartmentDetails: builder.query<
      { data: ProcurementReportDetailItem[] },
      {
        departmentCode: ProcurementDepartmentCode;
        startDate: string;
        endDate: string;
      }
    >({
      query: (params) => ({
        url: '/procurement/reports/department-details',
        params,
      }),
      providesTags: ['ProcurementReport'],
    }),
    getProcurementDimensionDetails: builder.query<
      { data: ProcurementReportDetailItem[] },
      {
        departmentCode: 'shipping_dept' | 'logistics_dept';
        dimensionType: 'vessel' | 'logistics_category';
        dimensionKey?: string;
        startDate: string;
        endDate: string;
      }
    >({
      query: (params) => ({
        url: '/procurement/reports/dimension-details',
        params,
      }),
      providesTags: ['ProcurementReport'],
    }),
    getProcurementReportRequests: builder.query<
      {
        data: ProcurementReportRequest[];
        meta: {
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      },
      ProcurementReportRequestListQuery | void
    >({
      query: (params) => ({ url: '/procurement/report-requests', params }),
      providesTags: ['ProcurementReportApproval'],
    }),
    createProcurementReportRequest: builder.mutation<
      { data: ProcurementReportRequest },
      ProcurementReportRequestCreatePayload
    >({
      query: (data) => ({
        url: '/procurement/report-requests',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['ProcurementReportApproval'],
    }),
    getProcurementReportRequest: builder.query<
      { data: ProcurementReportRequest },
      string
    >({
      query: (id) => ({ url: `/procurement/report-requests/${id}` }),
      providesTags: (_result, _error, id) => [
        { type: 'ProcurementReportApproval', id },
      ],
    }),
    submitProcurementReportRequest: builder.mutation<
      { data: ProcurementReportRequest },
      string
    >({
      query: (id) => ({
        url: `/procurement/report-requests/${id}/submit`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        'ProcurementReportApproval',
        'ProcurementApproval',
        { type: 'ProcurementReportApproval', id },
      ],
    }),
    printProcurementReportRequest: builder.mutation<
      { data: { fileId: string; downloadUrl: string } },
      string
    >({
      query: (id) => ({
        url: `/procurement/report-requests/${id}/print`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        'ProcurementReportApproval',
        { type: 'ProcurementReportApproval', id },
      ],
    }),
    getProcurementReportApprovals: builder.query<
      { data: ProcurementApprovalRecord[] },
      string
    >({
      query: (id) => ({ url: `/procurement/reports/${id}/approvals` }),
      providesTags: (_result, _error, id) => [
        { type: 'ProcurementReportApproval', id },
      ],
    }),
    actionProcurementReportApproval: builder.mutation<
      {
        data: {
          entityId: string;
          status: ProcurementReportRequestStatus;
          latestApproval: ProcurementApprovalRecord;
        };
      },
      { id: string; action: ProcurementApprovalAction; comment?: string }
    >({
      query: ({ id, action, comment }) => ({
        url: `/procurement/reports/${id}/approvals/actions`,
        method: 'POST',
        data: { action, comment, source: 'internal' },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'ProcurementReportApproval',
        'ProcurementApproval',
        { type: 'ProcurementReportApproval', id },
      ],
    }),
  }),
});

export const {
  useGetProcurementBudgetSummaryQuery,
  useGetProcurementBudgetsQuery,
  useCreateProcurementBudgetMutation,
  useUpdateProcurementBudgetMutation,
  useGetProcurementBudgetAuditsQuery,
  useGetProcurementDimensionsQuery,
  useCreateProcurementDimensionMutation,
  useUpdateProcurementDimensionMutation,
  useDisableProcurementDimensionMutation,
  useGetProcurementOrdersQuery,
  useGetProcurementOrderQuery,
  useCreateProcurementOrderMutation,
  useUpdateProcurementOrderMutation,
  useSubmitProcurementOrderMutation,
  useResubmitProcurementOrderMutation,
  useBindProcurementOrderAttachmentsMutation,
  useUnlinkProcurementOrderAttachmentMutation,
  useLazyGetProcurementOrderAttachmentDownloadUrlQuery,
  usePrintProcurementOrderMutation,
  useGetProcurementPendingApprovalsQuery,
  useGetProcurementOrderApprovalsQuery,
  useActionProcurementOrderApprovalMutation,
  useGetProcurementMonthlyReportQuery,
  useGetProcurementYearlyReportQuery,
  useGetProcurementDepartmentDetailsQuery,
  useGetProcurementDimensionDetailsQuery,
  useGetProcurementReportRequestsQuery,
  useCreateProcurementReportRequestMutation,
  useGetProcurementReportRequestQuery,
  useSubmitProcurementReportRequestMutation,
  usePrintProcurementReportRequestMutation,
  useGetProcurementReportApprovalsQuery,
  useActionProcurementReportApprovalMutation,
} = procurementApi;
