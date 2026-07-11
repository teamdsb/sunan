export const workbenchRouteConfig = {
  home: {
    path: '/workbench',
    label: '工作平台首页',
    description: '查看部门模块入口、待办聚合和通用记录列表。',
  },
  masterData: {
    path: '/workbench/master-data',
    label: '安全主数据中心',
    description: '管理船舶、人员任职、设备与受控选择器。',
  },
  module: {
    path: '/workbench/modules/:moduleCode',
    label: '模块工作台',
    description: '按模块查看工作平台记录、录单入口与打印能力。',
    buildPath: (moduleCode: string) => `/workbench/modules/${moduleCode}`,
  },
  recordDetail: {
    path: '/workbench/records/:recordId',
    label: '工作平台记录详情',
    description: '以独立路由查看工作平台记录详情与流程动作。',
    buildPath: (recordId: string) => `/workbench/records/${recordId}`,
  },
  attendanceStatistics: {
    path: '/workbench/statistics/attendance',
    label: '考勤统计',
    description: '查看月度签到与统计汇总看板。',
  },
  approvals: {
    path: '/workbench/approvals',
    label: '审批看板',
    description: '聚合企业微信审批相关模块与记录。',
  },
} as const;
