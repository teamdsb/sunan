import { myRouteConfig } from './myRouteConfig';
import { officeRouteConfig } from './officeRouteConfig';
import { procurementRouteConfig } from './procurementRouteConfig';
import { workbenchRouteConfig } from './workbenchRouteConfig';

export type ModuleNavItem = {
  key: string;
  path: string;
  label: string;
  matchPrefixes?: readonly string[];
  exact?: boolean;
};

export type ModuleNavGroup = {
  key: 'my' | 'office' | 'procurement' | 'workbench';
  path: string;
  label: string;
  shortLabel: string;
  matchPrefixes: readonly string[];
  children: readonly ModuleNavItem[];
};

export const moduleNavItems = [
  {
    path: '/my',
    label: '我的',
    matchPrefixes: ['/my'],
  },
  {
    path: '/office',
    label: '办事',
    matchPrefixes: ['/office'],
  },
  {
    path: '/procurement',
    label: '采购管理',
    matchPrefixes: ['/procurement'],
  },
  {
    path: '/workbench',
    label: '工作平台',
    matchPrefixes: ['/workbench'],
  },
] as const;

export const moduleNavGroups: readonly ModuleNavGroup[] = [
  {
    key: 'my',
    path: myRouteConfig.myHome.path,
    label: '我的',
    shortLabel: '我的',
    matchPrefixes: ['/my'],
    children: [
      {
        key: 'my-home',
        path: myRouteConfig.myHome.path,
        label: myRouteConfig.myHome.label,
        exact: true,
      },
      {
        key: 'my-enterprise-profile',
        path: myRouteConfig.enterpriseProfile.path,
        label: myRouteConfig.enterpriseProfile.label,
      },
      {
        key: 'my-enterprise-policy',
        path: myRouteConfig.enterprisePolicy.path,
        label: myRouteConfig.enterprisePolicy.label,
      },
      {
        key: 'my-certificates',
        path: myRouteConfig.certificates.path,
        label: myRouteConfig.certificates.label,
      },
      {
        key: 'my-reminders',
        path: myRouteConfig.reminders.path,
        label: myRouteConfig.reminders.label,
      },
      {
        key: 'my-monitors',
        path: myRouteConfig.monitors.path,
        label: myRouteConfig.monitors.label,
      },
      {
        key: 'my-settings',
        path: myRouteConfig.settings.path,
        label: myRouteConfig.settings.label,
      },
    ],
  },
  {
    key: 'office',
    path: officeRouteConfig.officeHome.path,
    label: '办事中心',
    shortLabel: '办事',
    matchPrefixes: ['/office'],
    children: [
      {
        key: 'office-home',
        path: officeRouteConfig.officeHome.path,
        label: officeRouteConfig.officeHome.label,
        exact: true,
      },
      {
        key: 'office-search',
        path: officeRouteConfig.officeSearch.path,
        label: officeRouteConfig.officeSearch.label,
      },
      {
        key: 'office-admin',
        path: officeRouteConfig.officeAdmin.path,
        label: officeRouteConfig.officeAdmin.label,
      },
    ],
  },
  {
    key: 'procurement',
    path: procurementRouteConfig.orderList.path,
    label: '采购管理',
    shortLabel: '采购',
    matchPrefixes: ['/procurement'],
    children: [
      {
        key: 'procurement-orders',
        path: procurementRouteConfig.orderList.path,
        label: procurementRouteConfig.orderList.label,
        exact: true,
        matchPrefixes: ['/procurement/orders'],
      },
      {
        key: 'procurement-order-create',
        path: procurementRouteConfig.orderCreate.path,
        label: procurementRouteConfig.orderCreate.label,
        exact: true,
      },
      {
        key: 'procurement-approvals',
        path: procurementRouteConfig.approvals.path,
        label: procurementRouteConfig.approvals.label,
      },
      {
        key: 'procurement-reports',
        path: procurementRouteConfig.reports.path,
        label: procurementRouteConfig.reports.label,
        matchPrefixes: ['/procurement/report-requests'],
      },
      {
        key: 'procurement-report-approvals',
        path: procurementRouteConfig.reportApprovals.path,
        label: procurementRouteConfig.reportApprovals.label,
      },
      {
        key: 'procurement-dictionaries',
        path: procurementRouteConfig.dictionaries.path,
        label: procurementRouteConfig.dictionaries.label,
      },
      {
        key: 'procurement-budgets',
        path: procurementRouteConfig.budgets.path,
        label: procurementRouteConfig.budgets.label,
      },
    ],
  },
  {
    key: 'workbench',
    path: workbenchRouteConfig.home.path,
    label: '工作平台',
    shortLabel: '工作台',
    matchPrefixes: ['/workbench'],
    children: [
      {
        key: 'workbench-home',
        path: workbenchRouteConfig.home.path,
        label: workbenchRouteConfig.home.label,
        exact: true,
        matchPrefixes: ['/workbench/records'],
      },
      {
        key: 'workbench-chart-update',
        path: workbenchRouteConfig.module.buildPath('shipping_chart_update'),
        label: '海图更新',
      },
      {
        key: 'workbench-signin-desk',
        path: workbenchRouteConfig.module.buildPath('business_signin_desk'),
        label: '签到台',
      },
      {
        key: 'workbench-fuel-approval',
        path: workbenchRouteConfig.module.buildPath(
          'shipping_fuel_bunkering_approval',
        ),
        label: '燃油加注审批',
      },
      {
        key: 'workbench-attendance',
        path: workbenchRouteConfig.attendanceStatistics.path,
        label: workbenchRouteConfig.attendanceStatistics.label,
      },
      {
        key: 'workbench-approvals',
        path: workbenchRouteConfig.approvals.path,
        label: workbenchRouteConfig.approvals.label,
      },
    ],
  },
] as const;

function pathMatches(pathname: string, path: string, exact = false): boolean {
  if (exact) {
    return pathname === path;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function itemPrefixScore(pathname: string, item: ModuleNavItem): number {
  const itemPathScore =
    !item.exact && pathMatches(pathname, item.path) ? item.path.length : -1;
  const prefixScore = Math.max(
    -1,
    ...(item.matchPrefixes ?? []).map((prefix) =>
      pathMatches(pathname, prefix) ? prefix.length : -1,
    ),
  );

  return Math.max(itemPathScore, prefixScore);
}

export function resolveActiveNavItemKey(pathname: string): string | null {
  const items = moduleNavGroups.flatMap((group) => group.children);
  const exactMatch = items.find((item) => pathname === item.path);

  if (exactMatch) {
    return exactMatch.key;
  }

  const prefixMatches = items
    .map((item) => ({ item, score: itemPrefixScore(pathname, item) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score);

  return prefixMatches[0]?.item.key ?? null;
}

export function resolveActiveNavGroupKey(
  pathname: string,
): ModuleNavGroup['key'] {
  const activeItemKey = resolveActiveNavItemKey(pathname);
  const itemGroup = moduleNavGroups.find((group) =>
    group.children.some((item) => item.key === activeItemKey),
  );

  if (itemGroup) {
    return itemGroup.key;
  }

  return (
    moduleNavGroups.find((group) =>
      group.matchPrefixes.some((prefix) => pathMatches(pathname, prefix)),
    )?.key ?? moduleNavGroups[0].key
  );
}

export function resolveModuleLabel(pathname: string): string {
  return (
    moduleNavGroups.find(
      (group) => group.key === resolveActiveNavGroupKey(pathname),
    )?.shortLabel ?? moduleNavItems[0].label
  );
}
