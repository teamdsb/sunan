import { describe, expect, it } from 'vitest';

const pageSources = import.meta.glob('../features/**/*Page.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const redundantReturnLabel =
  /返回(?:工作台首页|工作台|采购首页|报表页|首页|列表|看板)/;

const allowedReturnButtonPages = new Set([
  '../features/procurement/ProcurementApprovalPage.tsx',
  '../features/procurement/ProcurementOrderCreatePage.tsx',
  '../features/procurement/ProcurementOrderDetailPage.tsx',
  '../features/procurement/ProcurementReportApprovalPage.tsx',
  '../features/procurement/ProcurementReportRequestDetailPage.tsx',
]);

describe('page navigation UI policy', () => {
  it('uses the global navigation instead of page-level return buttons', () => {
    const violations = Object.entries(pageSources)
      .filter(
        ([path, source]) =>
          !allowedReturnButtonPages.has(path) &&
          redundantReturnLabel.test(source),
      )
      .map(([path]) => path);

    expect(violations).toEqual([]);
  });
});
