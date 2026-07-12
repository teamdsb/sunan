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
  tasks: { path: '/workbench/tasks', label: '安全任务中心', description: '查看真实待办、参与任务、完成任务和日历。' },
  taskDetail: { path: '/workbench/tasks/:taskId', label: '任务详情', description: '从任务中心或企业微信消息直达任务。', buildPath: (taskId: string) => `/workbench/tasks/${taskId}` },
  plans: { path: '/workbench/plans', label: '计划管理', description: '创建、启用、暂停和查看安全计划。' },
  planDetail: { path: '/workbench/plans/:planId', label: '计划项管理', description: '管理计划项、生成规则和完成率。', buildPath: (planId: string) => `/workbench/plans/${planId}` },
  inspectionTemplates: { path: '/workbench/inspection-templates', label: '检查模板', description: '维护版本化检查模板、适用范围与导入来源。' },
  inspectionPlans: { path: '/workbench/inspection-plans', label: '检查计划', description: '按已发布模板创建多人检查计划与任务。' },
  inspections: { path: '/workbench/inspections', label: '现场检查', description: '执行版本快照检查、个人签认和汇总。' },
  inspectionDetail: { path: '/workbench/inspections/:inspectionId', label: '检查执行', description: '从任务或检查列表直达个人检查表。', buildPath: (inspectionId: string) => `/workbench/inspections/${inspectionId}` },
  issues: { path: '/workbench/issues', label: '安全问题中心', description: '查看来源可追溯的安全问题与 CAPA 状态。' },
  issueDetail: { path: '/workbench/issues/:issueId', label: 'CAPA 详情', description: '完成根因、措施、验证、返工和关闭。', buildPath: (issueId: string) => `/workbench/issues/${issueId}` },
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
