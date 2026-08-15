import { PDFDocument } from 'pdf-lib';
import {
  buildProcurementReportPdf,
  normalizeProcurementReportPdfData,
  type ProcurementReportPdfInput,
} from './procurement-report-pdf';

function createInput(
  overrides: Partial<ProcurementReportPdfInput> = {},
): ProcurementReportPdfInput {
  return {
    report: {
      reportNo: 'PR-202604-001',
      reportType: 'monthly',
      periodYear: 2026,
      periodMonth: 4,
      departmentCode: 'shipping_dept',
      status: 'final_approved',
      approvalChannel: 'internal',
      externalStatus: null,
      createdBy: 'u-creator',
      createdAt: new Date('2026-04-30T01:00:00.000Z'),
      submittedAt: new Date('2026-04-30T02:00:00.000Z'),
      finalApprovedAt: new Date('2026-04-30T06:00:00.000Z'),
      snapshotParams: {
        reportType: 'monthly',
        periodYear: 2026,
        periodMonth: 4,
        departmentCode: 'shipping_dept',
        source: 'approval_snapshot',
      },
      snapshotSummary: {
        totalAmount: 6800,
        totalOrderCount: 3,
        items: [
          { label: '苏南01', amount: 4200, orderCount: 2 },
          { label: '苏南02', amount: 2600, orderCount: 1 },
        ],
      },
    },
    approvals: [
      {
        approvalLevel: 'dept',
        action: 'approve',
        approvedBy: 'u-dept',
        approvedAt: new Date('2026-04-30T03:00:00.000Z'),
        comment: '部门预算已核对',
        source: 'internal',
      },
      {
        approvalLevel: 'finance',
        action: 'approve',
        approvedBy: 'u-finance',
        approvedAt: new Date('2026-04-30T04:00:00.000Z'),
        comment: '财务数据一致',
        source: 'internal',
      },
    ],
    generatedAt: new Date('2026-04-30T08:00:00.000Z'),
    ...overrides,
  };
}

describe('procurement report PDF', () => {
  it('normalizes snapshot data into business labels without raw JSON', () => {
    const data = normalizeProcurementReportPdfData(createInput());

    expect(data.title).toBe('2026年4月采购月报');
    expect(data.department).toBe('船务部');
    expect(data.totalAmount).toBe(6800);
    expect(data.totalOrderCount).toBe(3);
    expect(data.rows).toEqual([
      { label: '苏南01', amount: 4200, orderCount: 2 },
      { label: '苏南02', amount: 2600, orderCount: 1 },
    ]);
    expect(data.extraParams).toContainEqual({
      label: '快照来源',
      value: '审批提交快照',
    });
    expect(data.basicFields).toContainEqual({
      label: '申请人',
      value: 'u-creator',
    });
    expect(data.conditionFields).toEqual([
      { label: '报表类型', value: '月报' },
      { label: '统计周期', value: '2026年4月' },
      { label: '统计部门', value: '船务部' },
    ]);
  });

  it('uses approval-time parameters even when entity fallback values differ', () => {
    const base = createInput();
    const data = normalizeProcurementReportPdfData({
      ...base,
      report: {
        ...base.report,
        reportType: 'yearly',
        periodYear: 2027,
        periodMonth: null,
        departmentCode: 'finance_dept',
        snapshotParams: {
          reportType: 'monthly',
          periodYear: 2026,
          periodMonth: 4,
          departmentCode: 'shipping_dept',
        },
      },
    });

    expect(data.title).toBe('2026年4月采购月报');
    expect(data.conditionFields).toEqual([
      { label: '报表类型', value: '月报' },
      { label: '统计周期', value: '2026年4月' },
      { label: '统计部门', value: '船务部' },
    ]);
  });

  it('keeps malformed detail values empty and excludes them from totals', () => {
    const base = createInput();
    const data = normalizeProcurementReportPdfData({
      ...base,
      report: {
        ...base.report,
        snapshotSummary: {
          items: [
            { label: '缺失金额' },
            { label: '有效金额', amount: 1200, orderCount: 2 },
          ],
        },
      },
    });

    expect(data.rows[0]).toEqual({
      label: '缺失金额',
      amount: null,
      orderCount: null,
    });
    expect(data.totalAmount).toBe(1200);
    expect(data.totalOrderCount).toBe(2);
  });

  it('derives totals from rows for legacy snapshots without total fields', () => {
    const base = createInput();
    const data = normalizeProcurementReportPdfData({
      ...base,
      report: {
        ...base.report,
        snapshotSummary: {
          items: [
            { label: '苏南01', amount: 4200, orderCount: 2 },
            { label: '苏南02', amount: 2600, orderCount: 1 },
          ],
        },
      },
    });

    expect(data.totalAmount).toBe(6800);
    expect(data.totalOrderCount).toBe(3);
  });

  it('builds a valid PDF when summary and approval rows are empty', async () => {
    const base = createInput();
    const buffer = await buildProcurementReportPdf({
      ...base,
      report: {
        ...base.report,
        snapshotSummary: {},
      },
      approvals: [],
    });
    const document = await PDFDocument.load(buffer);
    const normalized = normalizeProcurementReportPdfData({
      ...base,
      report: { ...base.report, snapshotSummary: {} },
      approvals: [],
    });

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.byteLength).toBeLessThan(1024 * 1024);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(normalized.totalAmount).toBeNull();
    expect(normalized.totalOrderCount).toBeNull();
  });

  it('builds a valid multi-page A4 PDF for long summaries and approvals', async () => {
    const base = createInput();
    const items = Array.from({ length: 70 }, (_, index) => ({
      label: `船舶维度 ${String(index + 1).padStart(2, '0')}`,
      amount: 1000 + index,
      orderCount: (index % 4) + 1,
    }));
    const approvals: ProcurementReportPdfInput['approvals'] = Array.from(
      { length: 30 },
      (_, index) => ({
        approvalLevel: approvalLevelAt(index),
        action: 'approve',
        approvedBy: `u-approver-${index + 1}`,
        approvedAt: new Date(
          `2026-04-${padDay((index % 28) + 1)}T04:00:00.000Z`,
        ),
        comment: `第 ${index + 1} 条审批意见，已核对业务口径与汇总金额。`,
        source: 'internal',
      }),
    );
    const buffer = await buildProcurementReportPdf({
      ...base,
      report: {
        ...base.report,
        snapshotSummary: {
          totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
          totalOrderCount: items.reduce(
            (sum, item) => sum + item.orderCount,
            0,
          ),
          items,
        },
      },
      approvals,
    });
    const document = await PDFDocument.load(buffer);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(document.getPageCount()).toBeGreaterThan(3);
    expect(document.getTitle()).toContain('2026年4月采购月报');
    document.getPages().forEach((page) => {
      expect(page.getWidth()).toBeCloseTo(595, 0);
      expect(page.getHeight()).toBeCloseTo(842, 0);
    });
  });
});

function padDay(value: number): string {
  return String(value).padStart(2, '0');
}

function approvalLevelAt(
  index: number,
): ProcurementReportPdfInput['approvals'][number]['approvalLevel'] {
  return index % 3 === 0
    ? 'dept'
    : index % 3 === 1
      ? 'finance'
      : 'final';
}
