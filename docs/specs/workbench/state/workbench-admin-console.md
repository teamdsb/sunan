# 工作平台管理员运维台状态规格（M6）

## 1. 目标

定义管理员运维台前端状态边界，覆盖审批实例、导出任务、对账任务和诊断事件。

## 2. 状态切片

### `workbenchAdminConsole`

```ts
interface WorkbenchAdminConsoleState {
  approvals: ApprovalInstanceSummary[];
  approvalFilters: ApprovalInstanceFilters;
  approvalPagination: PaginationState;
  activeApprovalInstanceId: string | null;

  exportJobs: ExportJobSummary[];
  exportJobFilters: ExportJobFilters;
  exportJobPagination: PaginationState;
  activeExportJobId: string | null;

  reconcileJobs: ReconcileJobSummary[];
  reconcileFilters: ReconcileJobFilters;
  reconcilePagination: PaginationState;
  activeReconcileJobId: string | null;

  diagnosticEvents: DiagnosticEventSummary[];
  diagnosticFilters: DiagnosticEventFilters;
  diagnosticPagination: PaginationState;
  activeDiagnosticEventId: string | null;

  summary: AdminDiagnosticSummary | null;
  loadingSection: 'approvals' | 'exports' | 'reconcile' | 'diagnostics' | null;
  submittingAction: boolean;
  error: string | null;
}
```

## 3. 核心类型

```ts
interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface ApprovalInstanceSummary {
  processInstanceId: string;
  businessRecordId: string;
  moduleCode: string;
  externalStatus: 'pending' | 'approved' | 'rejected' | 'canceled' | 'terminated';
  mirrorStatus: string;
  approvalSyncStatus: 'pending' | 'callback_received' | 'reconciled' | 'retrying' | 'failed';
  syncErrorCode: string | null;
  source: 'launch' | 'callback' | 'reconcile' | 'retry' | 'admin';
  lastCallbackAt: string | null;
  lastReconciledAt: string | null;
}

interface ExportJobSummary {
  jobId: string;
  moduleCode: string;
  triggerUserId: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  downloadFileId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
}

interface ReconcileJobSummary {
  jobId: string;
  compareSource: 'finance_template' | 'attendance_template' | 'manual_upload';
  month: string;
  departmentCode: string | null;
  differenceCount: number;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  createdAt: string;
  finishedAt: string | null;
}

interface DiagnosticEventSummary {
  eventId: string;
  eventType: 'approval_failed' | 'message_failed' | 'jssdk_failed' | 'export_failed';
  moduleCode: string | null;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  errorCode: string | null;
  errorMessage: string | null;
  relatedRecordId: string | null;
  relatedProcessInstanceId: string | null;
  firstOccurredAt: string;
  lastOccurredAt: string;
}

interface AdminDiagnosticSummary {
  approvalFailedCount: number;
  exportFailedCount: number;
  reconcileOpenCount: number;
  jssdkFailedCount: number;
  messageFailedCount: number;
}
```

## 4. 筛选器模型

```ts
interface ApprovalInstanceFilters {
  processInstanceId?: string;
  businessRecordId?: string;
  moduleCode?: string;
  approvalSyncStatus?: string;
  externalStatus?: string;
  syncErrorCode?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ExportJobFilters {
  jobId?: string;
  moduleCode?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ReconcileJobFilters {
  jobId?: string;
  compareSource?: string;
  status?: string;
  departmentCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface DiagnosticEventFilters {
  eventType?: string;
  moduleCode?: string;
  severity?: string;
  status?: string;
  errorCode?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

## 5. 状态约束

- 各分页状态互相独立，不在切换页签时互相覆盖。
- 筛选器需要持久化到 URL。
- 详情抽屉依赖列表实体，不单独维护完全独立副本。
- 管理员动作成功后，必须回刷对应列表和 summary。
