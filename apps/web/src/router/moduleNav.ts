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

export function resolveModuleLabel(pathname: string): string {
  return (
    moduleNavItems.find((item) => item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)))
      ?.label ?? moduleNavItems[0].label
  );
}
