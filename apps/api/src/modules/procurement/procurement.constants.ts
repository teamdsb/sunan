export const PROCUREMENT_DEPARTMENT_CODES = [
  'general_office',
  'business_dept',
  'finance_dept',
  'shipping_dept',
  'logistics_dept',
] as const;

export const PROCUREMENT_DIMENSION_TYPES = [
  'none',
  'vessel',
  'logistics_category',
] as const;

export const PROCUREMENT_ORDER_STATUSES = [
  'draft',
  'submitted',
  'dept_approved',
  'final_approved',
  'rejected',
] as const;

export const PROCUREMENT_APPROVAL_CHANNELS = [
  'internal',
  'wecom_native',
] as const;

export const PROCUREMENT_APPROVAL_ACTIONS = [
  'approve',
  'reject',
  'return',
] as const;

export const PROCUREMENT_APPROVAL_LEVELS = ['dept', 'final'] as const;

export const PROCUREMENT_APPROVAL_SOURCES = ['internal', 'external'] as const;

export const PROCUREMENT_REPORT_TYPES = ['monthly', 'yearly'] as const;

export const PROCUREMENT_REPORT_REQUEST_STATUSES = [
  'draft',
  'submitted',
  'dept_approved',
  'finance_approved',
  'final_approved',
  'rejected',
] as const;

export const PROCUREMENT_REPORT_APPROVAL_LEVELS = [
  'dept',
  'finance',
  'final',
] as const;
export const PROCUREMENT_BUDGET_AUDIT_ACTIONS = [
  'create',
  'update',
  'enable',
  'disable',
] as const;

export type ProcurementDepartmentCode =
  (typeof PROCUREMENT_DEPARTMENT_CODES)[number];
export type ProcurementDimensionType =
  (typeof PROCUREMENT_DIMENSION_TYPES)[number];
export type ProcurementOrderStatus =
  (typeof PROCUREMENT_ORDER_STATUSES)[number];
export type ProcurementApprovalChannel =
  (typeof PROCUREMENT_APPROVAL_CHANNELS)[number];
export type ProcurementApprovalAction =
  (typeof PROCUREMENT_APPROVAL_ACTIONS)[number];
export type ProcurementApprovalLevel =
  (typeof PROCUREMENT_APPROVAL_LEVELS)[number];
export type ProcurementApprovalSource =
  (typeof PROCUREMENT_APPROVAL_SOURCES)[number];
export type ProcurementReportType = (typeof PROCUREMENT_REPORT_TYPES)[number];
export type ProcurementReportRequestStatus =
  (typeof PROCUREMENT_REPORT_REQUEST_STATUSES)[number];
export type ProcurementReportApprovalLevel =
  (typeof PROCUREMENT_REPORT_APPROVAL_LEVELS)[number];
export type ProcurementBudgetAuditAction =
  (typeof PROCUREMENT_BUDGET_AUDIT_ACTIONS)[number];

export const DEPARTMENT_ROLE_MAP: Record<ProcurementDepartmentCode, string> = {
  general_office: 'general_office',
  business_dept: 'business',
  finance_dept: 'finance',
  shipping_dept: 'shipping',
  logistics_dept: 'logistics',
};
