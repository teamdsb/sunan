export const myRouteConfig = {
  myHome: {
    path: '/my',
    label: '我的首页',
    description: '进入工作台首页。',
  },
  enterpriseProfile: {
    path: '/my/enterprise-profile',
    label: '企业资料',
    description: '查看企业资料列表与附件。',
  },
  enterprisePolicy: {
    path: '/my/enterprise-policy',
    label: '企业制度',
    description: '浏览企业制度和版本历史。',
  },
  certificates: {
    path: '/my/certificates',
    label: '电子证照',
    description: '查看证照、附件和到期信息。',
  },
  reminders: {
    path: '/my/reminders',
    label: '证书提醒',
    description: '查看提醒看板并确认处理。',
  },
  monitors: {
    path: '/my/monitors',
    label: '船舶监控',
    description: '进入船舶监控入口。',
  },
  settings: {
    path: '/my/settings',
    label: '设置',
    description: '调整个人偏好设置。',
  },
} as const;

export const myRouteNavItems = [
  myRouteConfig.myHome,
  myRouteConfig.enterpriseProfile,
  myRouteConfig.enterprisePolicy,
  myRouteConfig.certificates,
  myRouteConfig.reminders,
  myRouteConfig.monitors,
  myRouteConfig.settings,
] as const;
