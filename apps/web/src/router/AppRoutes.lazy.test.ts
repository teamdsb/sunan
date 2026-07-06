import { describe, expect, it } from 'vitest';

const routeSource = import.meta.glob('./AppRoutes.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const source = routeSource['./AppRoutes.tsx'];

describe('AppRoutes lazy loading', () => {
  it('keeps business pages behind route-level dynamic imports', () => {
    expect(source).toContain(
      "() => import('../features/procurement/ProcurementOrderListPage')",
    );
    expect(source).toContain(
      "() => import('../features/workbench/WorkbenchHomeRoutePage')",
    );
    expect(source).toContain(
      "() => import('../features/ui/MyHomePage')",
    );
    expect(source).not.toMatch(
      /import\s+.*from\s+['"]\.\.\/features\/(procurement|workbench|ui)\/[^'"]+['"]/,
    );
  });
});
