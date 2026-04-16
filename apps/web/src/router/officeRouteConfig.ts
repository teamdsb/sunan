export const officeRouteConfig = {
  officeHome: {
    path: '/office',
    label: '办事首页',
    description: '按分类浏览和搜索办事入口。',
  },
  officeSearch: {
    path: '/office/search',
    label: '办事搜索',
    description: '查看办事入口搜索结果。',
  },
  officeAdmin: {
    path: '/office/admin',
    label: '办事治理台',
    description: '维护办事入口并执行发布治理。',
  },
} as const;
