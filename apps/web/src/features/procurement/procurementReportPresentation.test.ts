import { describe, expect, it } from 'vitest';
import type {
  ProcurementApprovalLevel,
  ProcurementApprovalRecord,
  ProcurementReportRequest,
} from './procurementApi';
import {
  getProcurementReportApprovalProgress,
  normalizeProcurementReportSnapshot,
} from './procurementReportPresentation';

function createReport(
  snapshotSummary: ProcurementReportRequest['snapshotSummary'],
): ProcurementReportRequest {
  return {
    id: 'report-1',
    reportNo: 'BG202604180001',
    reportType: 'monthly',
    periodYear: 2026,
    periodMonth: 4,
    departmentCode: 'shipping_dept',
    snapshotParams: {},
    snapshotSummary,
    status: 'draft',
    approvalChannel: 'internal',
    externalProcessInstanceId: null,
    externalStatus: null,
    externalSyncedAt: null,
    submittedAt: null,
    finalApprovedAt: null,
    exportPdfFileId: null,
    createdBy: 'reporter-1',
    updatedBy: 'reporter-1',
    createdAt: '2026-04-18T10:00:00.000+08:00',
    updatedAt: '2026-04-18T10:00:00.000+08:00',
  };
}

function approval(
  approvalLevel: ProcurementApprovalLevel,
  action: ProcurementApprovalRecord['action'],
): ProcurementApprovalRecord {
  return {
    id: `${approvalLevel}-${action}`,
    approvalLevel,
    action,
    comment: null,
    source: 'internal',
    externalEventId: null,
    approvedBy: 'approver-1',
    approvedAt: '2026-04-18T11:00:00.000+08:00',
  };
}

describe('procurementReportPresentation', () => {
  it('derives totals from business rows when legacy snapshots omit totals', () => {
    const data = normalizeProcurementReportSnapshot(
      createReport({
        items: [
          { label: '苏南01', amount: 4200, orderCount: 2 },
          { label: '苏南02', amount: 2600, orderCount: 1 },
        ],
      }),
    );

    expect(data.totalAmount).toBe(6800);
    expect(data.totalOrderCount).toBe(3);
  });

  it('keeps an explicit snapshot total as the approval-time source of truth', () => {
    const data = normalizeProcurementReportSnapshot(
      createReport({
        totalAmount: 7000,
        totalOrderCount: 4,
        items: [{ label: '苏南01', amount: 4200, orderCount: 2 }],
      }),
    );

    expect(data.totalAmount).toBe(7000);
    expect(data.totalOrderCount).toBe(4);
  });

  it('does not invent zero totals for an empty snapshot', () => {
    const data = normalizeProcurementReportSnapshot(createReport({}));

    expect(data.totalAmount).toBeNull();
    expect(data.totalOrderCount).toBeNull();
    expect(data.rows).toEqual([]);
  });

  it.each([
    ['dept', 1],
    ['finance', 2],
    ['final', 3],
  ] as const)(
    'shows a %s rejection at its actual approval node',
    (approvalLevel, current) => {
      const progress = getProcurementReportApprovalProgress('rejected', [
        approval(approvalLevel, 'reject'),
      ]);

      expect(progress).toEqual({
        current,
        stepsStatus: 'error',
        activeDescription: '已驳回',
      });
    },
  );

  it('preserves the approval node and meaning after a return resets status to draft', () => {
    const progress = getProcurementReportApprovalProgress('draft', [
      approval('finance', 'return'),
    ]);

    expect(progress).toEqual({
      current: 2,
      stepsStatus: 'process',
      activeDescription: '已退回修改',
      displayStatus: { label: '已退回，待修改', color: 'orange' },
    });
  });
});
