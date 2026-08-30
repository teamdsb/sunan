import { baseApi } from '../../app/baseApi';

export type WorkbenchTemplateType =
  | 'ledger_form'
  | 'operation_flow'
  | 'inspection_rectification'
  | 'attendance_statistics'
  | 'service_asset'
  | 'wecom_approval';

export interface WorkbenchModuleItem {
  moduleCode: string;
  moduleName: string;
  departmentCode: string;
  templateType: WorkbenchTemplateType;
  pendingCount: number;
  requiresApproval: boolean;
  supportsPrint: boolean;
  supportsStatistics: boolean;
  mobileFirst: boolean;
}

export interface WorkbenchAlert {
  code: string;
  message: string;
}

export interface WorkbenchDashboard {
  modules: WorkbenchModuleItem[];
  pendingTotal: number;
  approvalPendingTotal: number;
  alerts: WorkbenchAlert[];
}

export interface WorkbenchRecordSummary {
  id: string;
  moduleCode: string;
  title: string;
  status: string;
  vesselId: string | null;
  occurredAt: string;
  approvalChannel: 'internal' | 'wecom_native';
}

export interface WorkbenchStep {
  stepCode: string;
  stepName: string;
  status: string;
  rectificationRequired: boolean;
  rectificationStatus: string | null;
}

export interface WorkbenchAttachment {
  id: string;
  category: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface WorkbenchActionLog {
  id: string;
  actionType: string;
  operatorUserId: string;
  fromStatus: string;
  toStatus: string;
  comment: string | null;
  createdAt: string;
}

export interface WorkbenchRecordDetail extends WorkbenchRecordSummary {
  summary: string;
  externalProcessInstanceId: string | null;
  externalStatus: string | null;
  steps: WorkbenchStep[];
  attachments: WorkbenchAttachment[];
  actionLogs: WorkbenchActionLog[];
  payload: Record<string, unknown>;
  availableActions?: string[];
}

export interface WorkbenchRecordQuery {
  moduleCode?: string;
  status?: string;
  templateType?: WorkbenchTemplateType;
  requiresApproval?: boolean;
  page?: number;
  pageSize?: number;
}

export interface WorkbenchRecordListResponse {
  data: WorkbenchRecordSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface WorkbenchModuleSchemaField {
  key: string;
  label: string;
  required: boolean;
  inputType: 'text' | 'number' | 'date' | 'datetime' | 'textarea';
  placeholder?: string;
}

export interface WorkbenchModuleSchemaStepTemplate {
  stepCode: string;
  stepName: string;
}

export interface WorkbenchModuleSchema {
  moduleCode: string;
  templateType: WorkbenchTemplateType;
  sections: Array<{
    key: string;
    title: string;
    fields: WorkbenchModuleSchemaField[];
  }>;
  stepTemplates?: WorkbenchModuleSchemaStepTemplate[];
}

export interface WorkbenchRecordCreatePayload {
  moduleCode: string;
  title: string;
  summary: string;
  vesselId?: string;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}

export interface WorkbenchRecordActionPayload {
  actionType:
    | 'submit'
    | 'assign'
    | 'start'
    | 'complete_step'
    | 'update_payload'
    | 'submit_review'
    | 'request_rework'
    | 'close_record'
    | 'archive';
  comment?: string;
  payload?: Record<string, unknown>;
}

export interface WorkbenchApprovalLaunchPayload {
  moduleCode: string;
  businessRecordId: string;
  templateCode: string;
  title: string;
  applicantUserId: string;
  summary?: string;
  payload?: Record<string, unknown>;
}

export interface WorkbenchApprovalLaunchConfig {
  oaType: '10001';
  templateId: string;
  thirdNo: string;
  extData: {
    fieldList: Array<{
      title: string;
      type: 'text' | 'link';
      value: string;
    }>;
  };
}

export interface WorkbenchApprovalLaunchResult {
  processInstanceId: string;
  thirdNo: string;
  wecomTemplateId: string;
  approvalChannel: 'wecom_native';
  launchStatus: string;
  mirrorStatus: string;
  wecomLaunchConfig: WorkbenchApprovalLaunchConfig;
}

export interface WorkbenchAttendanceStatistics {
  month: string;
  summary: {
    totalCheckIns: number;
    financeAndShippingCheckIns: number;
    operationFlowCheckIns: number;
    morningCount: number;
    afternoonCount: number;
    inRangeCount: number;
    outRangeCount: number;
    businessTripCount: number;
    normalDutyCount: number;
  };
  moduleTotals: Array<{
    moduleCode: string;
    moduleName: string;
    departmentCode: string;
    recordCount: number;
  }>;
}

export interface WorkbenchPrintSnapshot {
  recordId: string;
  businessRecordId: string;
  templateVersion: string;
  renderedFileId: string | null;
  renderedFormat: string;
  paperSize: 'A4' | 'A3';
  renderedAt: string;
  downloadUrl?: string;
  businessNo?: string;
  watermark?: string;
  snapshotData: Record<string, unknown>;
}

export interface WorkbenchAttachmentUploadPayload {
  category: string;
  fileId: string;
  stepCode?: string;
  remark?: string;
}

export interface WorkbenchIssueLink {
  id: string;
  title: string;
  issueType: string;
  severity: string;
  status: string;
}

export const workbenchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkbenchModules: builder.query<{ data: WorkbenchModuleItem[] }, void>({
      query: () => ({ url: '/workbench/modules' }),
      providesTags: ['Workbench'],
    }),
    getWorkbenchModuleSchema: builder.query<
      { data: WorkbenchModuleSchema },
      string
    >({
      query: (moduleCode) => ({
        url: `/workbench/modules/${moduleCode}/schema`,
      }),
      providesTags: ['Workbench'],
    }),
    getWorkbenchDashboard: builder.query<{ data: WorkbenchDashboard }, void>({
      query: () => ({ url: '/workbench/dashboard' }),
      providesTags: ['Workbench'],
    }),
    getWorkbenchAttendanceStatistics: builder.query<
      { data: WorkbenchAttendanceStatistics },
      { month?: string } | void
    >({
      query: (params) => ({ url: '/workbench/statistics/attendance', params }),
      providesTags: ['Workbench'],
    }),
    getWorkbenchRecords: builder.query<
      WorkbenchRecordListResponse,
      WorkbenchRecordQuery | void
    >({
      query: (params) => ({ url: '/workbench/records', params }),
      providesTags: ['WorkbenchRecord'],
    }),
    getWorkbenchRecord: builder.query<{ data: WorkbenchRecordDetail }, string>({
      query: (id) => ({ url: `/workbench/records/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'WorkbenchRecord', id }],
    }),
    getWorkbenchRecordIssues: builder.query<
      { data: WorkbenchIssueLink[] },
      string
    >({
      query: (recordId) => ({ url: `/workbench/records/${recordId}/issues` }),
      providesTags: (_result, _error, id) => [{ type: 'WorkbenchRecord', id }],
    }),
    getWorkbenchPrintSnapshot: builder.query<
      { data: WorkbenchPrintSnapshot },
      { recordId: string; paperSize?: 'A4' | 'A3' }
    >({
      query: ({ recordId, paperSize }) => ({
        url: `/workbench/records/${recordId}/print`,
        params: paperSize ? { paperSize } : undefined,
      }),
      providesTags: (_result, _error, arg) => [
        { type: 'WorkbenchRecord', id: arg.recordId },
      ],
    }),
    uploadWorkbenchRecordAttachment: builder.mutation<
      {
        data: {
          id: string;
          category: string;
          fileId: string;
          fileName: string;
          mimeType: string;
          fileSize: number;
          uploadedAt: string;
        };
      },
      { recordId: string; data: WorkbenchAttachmentUploadPayload }
    >({
      query: ({ recordId, data }) => ({
        url: `/workbench/records/${recordId}/attachments`,
        method: 'POST',
        data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'WorkbenchRecord',
        { type: 'WorkbenchRecord', id: arg.recordId },
      ],
    }),
    getWorkbenchAttachmentDownloadUrl: builder.query<
      { data: { downloadUrl: string; expiresAt: string } },
      { recordId: string; fileId: string }
    >({
      query: ({ recordId, fileId }) => ({
        url: `/workbench/records/${recordId}/attachments/${fileId}/download-url`,
      }),
    }),
    createWorkbenchSignatureEvidence: builder.mutation<
      { data: unknown },
      { recordId: string; signatureFileId: string; businessSummaryHash: string }
    >({
      query: ({ recordId, ...data }) => ({
        url: `/workbench/records/${recordId}/signature-evidence`,
        method: 'POST',
        data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'WorkbenchRecord',
        { type: 'WorkbenchRecord', id: arg.recordId },
      ],
    }),
    createWorkbenchLocationEvidence: builder.mutation<
      { data: unknown },
      {
        recordId: string;
        captureStatus: string;
        latitude?: number;
        longitude?: number;
        accuracyMeters?: number;
        failureReason?: string;
        addressText?: string;
      }
    >({
      query: ({ recordId, ...data }) => ({
        url: `/workbench/records/${recordId}/location-evidence`,
        method: 'POST',
        data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'WorkbenchRecord',
        { type: 'WorkbenchRecord', id: arg.recordId },
      ],
    }),
    createWorkbenchRecord: builder.mutation<
      { data: WorkbenchRecordDetail },
      WorkbenchRecordCreatePayload
    >({
      query: (data) => ({ url: '/workbench/records', method: 'POST', data }),
      invalidatesTags: ['Workbench', 'WorkbenchRecord'],
    }),
    performWorkbenchRecordAction: builder.mutation<
      {
        data: {
          recordId: string;
          status: string;
          acceptedAction: string;
          approvalLaunchConfig?: WorkbenchApprovalLaunchConfig | null;
        };
      },
      { recordId: string; data: WorkbenchRecordActionPayload }
    >({
      query: ({ recordId, data }) => ({
        url: `/workbench/records/${recordId}/actions`,
        method: 'POST',
        data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'Workbench',
        'WorkbenchRecord',
        { type: 'WorkbenchRecord', id: arg.recordId },
      ],
    }),
    launchWorkbenchApproval: builder.mutation<
      { data: WorkbenchApprovalLaunchResult },
      WorkbenchApprovalLaunchPayload
    >({
      query: (data) => ({
        url: '/wecom/approval/launch',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Workbench', 'WorkbenchRecord'],
    }),
  }),
});

export const {
  useGetWorkbenchModulesQuery,
  useGetWorkbenchModuleSchemaQuery,
  useGetWorkbenchDashboardQuery,
  useGetWorkbenchAttendanceStatisticsQuery,
  useGetWorkbenchRecordsQuery,
  useGetWorkbenchRecordQuery,
  useGetWorkbenchRecordIssuesQuery,
  useLazyGetWorkbenchPrintSnapshotQuery,
  useGetWorkbenchPrintSnapshotQuery,
  useUploadWorkbenchRecordAttachmentMutation,
  useLazyGetWorkbenchAttachmentDownloadUrlQuery,
  useCreateWorkbenchSignatureEvidenceMutation,
  useCreateWorkbenchLocationEvidenceMutation,
  useCreateWorkbenchRecordMutation,
  usePerformWorkbenchRecordActionMutation,
  useLaunchWorkbenchApprovalMutation,
} = workbenchApi;
