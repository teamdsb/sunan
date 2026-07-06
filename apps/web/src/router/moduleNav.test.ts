import { describe, expect, it } from 'vitest';
import { moduleNavGroups, resolveActiveNavItemKey } from './moduleNav';
import { workbenchRouteConfig } from './workbenchRouteConfig';

describe('moduleNav workbench targets', () => {
  it('keeps workbench navigation targets distinct and route-resolvable', () => {
    const workbenchItems =
      moduleNavGroups.find((group) => group.key === 'workbench')?.children ??
      [];
    const targetKeys = [
      'workbench-home',
      'workbench-chart-update',
      'workbench-signin-desk',
      'workbench-fuel-approval',
      'workbench-attendance',
      'workbench-approvals',
    ];
    const paths = targetKeys.map(
      (key) => workbenchItems.find((item) => item.key === key)?.path,
    );

    expect(new Set(paths).size).toBe(targetKeys.length);
    expect(resolveActiveNavItemKey(workbenchRouteConfig.home.path)).toBe(
      'workbench-home',
    );
    expect(
      resolveActiveNavItemKey(
        workbenchRouteConfig.module.buildPath('shipping_chart_update'),
      ),
    ).toBe('workbench-chart-update');
    expect(
      resolveActiveNavItemKey(
        workbenchRouteConfig.module.buildPath('business_signin_desk'),
      ),
    ).toBe('workbench-signin-desk');
    expect(
      resolveActiveNavItemKey(
        workbenchRouteConfig.module.buildPath(
          'shipping_fuel_bunkering_approval',
        ),
      ),
    ).toBe('workbench-fuel-approval');
    expect(
      resolveActiveNavItemKey(workbenchRouteConfig.attendanceStatistics.path),
    ).toBe('workbench-attendance');
    expect(resolveActiveNavItemKey(workbenchRouteConfig.approvals.path)).toBe(
      'workbench-approvals',
    );
  });
});
