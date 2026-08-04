import type {
  ProcurementApprovalRecord,
  ProcurementDepartmentCode,
  ProcurementReportRequest,
  ProcurementReportRequestStatus,
  ProcurementReportType,
} from './procurementApi';

export interface ProcurementReportSummaryRow {
  key: string;
  label: string;
  orderCount: number | null;
  amount: number | null;
  isTotal?: boolean;
}

export interface ProcurementReportParameter {
  key: string;
  label: string;
  value: string;
}

const reportTypeLabels: Record<ProcurementReportType, string> = {
  monthly: '采购月报',
  yearly: '采购年报',
};

export const procurementDepartmentLabels: Record<
  ProcurementDepartmentCode,
  string
> = {
  general_office: '总经办',
  business_dept: '业务部',
  finance_dept: '财务部',
  shipping_dept: '船务部',
  logistics_dept: '后勤部',
};

const knownParameterKeys = new Set([
  'reportType',
  'periodYear',
  'year',
  'periodMonth',
  'month',
  'departmentCode',
]);

const extraParameterLabels: Record<string, string> = {
  source: '快照来源',
  dimensionType: '统计维度',
  dimensionKey: '维度编码',
  dimensionName: '维度名称',
  startDate: '开始日期',
  endDate: '结束日期',
};

const extraParameterValueLabels: Record<string, string> = {
  approval_snapshot: '审批提交快照',
  vessel: '船舶',
  logistics_category: '后勤类别',
  none: '未细分',
};

const approvalLevelStep = {
  dept: 1,
  finance: 2,
  final: 3,
} as const;

export interface ProcurementReportApprovalProgress {
  current: number;
  stepsStatus: 'process' | 'error' | 'finish';
  activeDescription?: string;
  displayStatus?: { label: string; color: string };
}

export function getProcurementReportApprovalProgress(
  status: ProcurementReportRequestStatus,
  approvals: ProcurementApprovalRecord[],
): ProcurementReportApprovalProgress {
  const lastApproval = approvals[approvals.length - 1];

  if (status === 'rejected') {
    return {
      current: lastApproval
        ? approvalLevelStep[lastApproval.approvalLevel]
        : 1,
      stepsStatus: 'error',
      activeDescription: '已驳回',
    };
  }

  if (status === 'draft' && lastApproval?.action === 'return') {
    return {
      current: approvalLevelStep[lastApproval.approvalLevel],
      stepsStatus: 'process',
      activeDescription: '已退回修改',
      displayStatus: { label: '已退回，待修改', color: 'orange' },
    };
  }

  const currentByStatus: Record<ProcurementReportRequestStatus, number> = {
    draft: 0,
    submitted: 1,
    dept_approved: 2,
    finance_approved: 3,
    final_approved: 4,
    rejected: 1,
  };

  return {
    current: currentByStatus[status],
    stepsStatus: status === 'final_approved' ? 'finish' : 'process',
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function textValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    const text = String(value);
    return extraParameterValueLabels[text] ?? text;
  }

  if (Array.isArray(value)) {
    return value.length ? `已记录 ${value.length} 项` : '-';
  }

  if (typeof value === 'object') {
    return `已记录 ${Object.keys(value).length} 项配置`;
  }

  return '-';
}

function departmentLabel(value: unknown): string {
  return typeof value === 'string' && value in procurementDepartmentLabels
    ? procurementDepartmentLabels[value as ProcurementDepartmentCode]
    : textValue(value);
}

function reportTypeLabel(value: unknown): string {
  return value === 'monthly' || value === 'yearly'
    ? reportTypeLabels[value]
    : textValue(value);
}

function monthLabel(value: unknown): string {
  const month = finiteNumber(value);
  return month && month >= 1 && month <= 12 ? `${month}月` : '-';
}

export function formatProcurementReportPeriod(
  year: number,
  month: number | null,
) {
  return month ? `${year}年${month}月` : `${year}年度`;
}

export function formatProcurementReportTitle(
  report: Pick<
    ProcurementReportRequest,
    'reportType' | 'periodYear' | 'periodMonth'
  >,
) {
  const period = formatProcurementReportPeriod(
    report.periodYear,
    report.periodMonth,
  );
  return `${period}${reportTypeLabels[report.reportType]}`;
}

export function formatProcurementCurrency(value: number | null) {
  return value === null
    ? '-'
    : new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
}

export function normalizeProcurementReportSnapshot(
  report: ProcurementReportRequest,
) {
  const params = report.snapshotParams ?? {};
  const summary = report.snapshotSummary ?? {};
  const parameterReportType = params.reportType ?? report.reportType;
  const parameterYear =
    params.periodYear ?? params.year ?? report.periodYear;
  const parameterMonth =
    params.periodMonth ?? params.month ?? report.periodMonth;
  const parameterDepartment =
    params.departmentCode ?? report.departmentCode;

  const parameters: ProcurementReportParameter[] = [
    {
      key: 'reportType',
      label: '报表类型',
      value: reportTypeLabel(parameterReportType),
    },
    {
      key: 'periodYear',
      label: '统计年份',
      value: textValue(parameterYear),
    },
    {
      key: 'periodMonth',
      label: '统计月份',
      value:
        report.reportType === 'monthly' ? monthLabel(parameterMonth) : '全年',
    },
    {
      key: 'departmentCode',
      label: '部门范围',
      value:
        parameterDepartment === null || parameterDepartment === undefined
          ? '全部部门'
          : departmentLabel(parameterDepartment),
    },
  ];

  const extraParameters = Object.entries(params)
    .filter(([key]) => !knownParameterKeys.has(key))
    .map(([key, value]) => ({
      key,
      label: extraParameterLabels[key] ?? key.replace(/_/g, ' '),
      value: textValue(value),
    }));

  const rawItems = Array.isArray(summary.items) ? summary.items : [];
  const rows: ProcurementReportSummaryRow[] = rawItems.map((item, index) => {
    const record =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};
    return {
      key: `item-${index}`,
      label: textValue(
        record.label ??
          record.dimensionName ??
          record.name ??
          record.dimensionKey,
      ),
      orderCount: finiteNumber(record.orderCount),
      amount: finiteNumber(record.amount),
    };
  });

  const totalAmount =
    finiteNumber(summary.totalAmount) ??
    (rows.length
      ? rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
      : null);
  const totalOrderCount =
    finiteNumber(summary.totalOrderCount) ??
    (rows.length
      ? rows.reduce((sum, row) => sum + (row.orderCount ?? 0), 0)
      : null);

  return {
    parameters,
    extraParameters,
    rows,
    totalAmount,
    totalOrderCount,
    dimensionCount: rows.length,
  };
}
