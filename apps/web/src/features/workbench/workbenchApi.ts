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
}

export interface WorkbenchRecordQuery {
  moduleCode?: string;
  status?: string;
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

export const workbenchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkbenchModules: builder.query<{ data: WorkbenchModuleItem[] }, void>({
      query: () => ({ url: '/workbench/modules' }),
      providesTags: ['Workbench'],
    }),
    getWorkbenchDashboard: builder.query<{ data: WorkbenchDashboard }, void>({
      query: () => ({ url: '/workbench/dashboard' }),
      providesTags: ['Workbench'],
    }),
    getWorkbenchRecords: builder.query<WorkbenchRecordListResponse, WorkbenchRecordQuery | void>({
      query: (params) => ({ url: '/workbench/records', params }),
      providesTags: ['WorkbenchRecord'],
    }),
    getWorkbenchRecord: builder.query<{ data: WorkbenchRecordDetail }, string>({
      query: (id) => ({ url: `/workbench/records/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'WorkbenchRecord', id }],
    }),
  }),
});

export const {
  useGetWorkbenchModulesQuery,
  useGetWorkbenchDashboardQuery,
  useGetWorkbenchRecordsQuery,
  useGetWorkbenchRecordQuery,
} = workbenchApi;
