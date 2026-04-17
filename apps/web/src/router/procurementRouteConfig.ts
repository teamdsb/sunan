export const procurementRouteConfig = {
  orderList: {
    path: '/procurement',
    label: '采购单列表',
    description: '查看我的采购单并按条件筛选。',
  },
  orderCreate: {
    path: '/procurement/orders/new',
    label: '新建采购单',
    description: '创建采购草稿并提交审批。',
  },
  orderDetail: {
    path: '/procurement/orders/:id',
    label: '采购单详情',
    description: '查看采购单详情、附件与审批轨迹。',
  },
  approvals: {
    path: '/procurement/approvals',
    label: '采购审批',
    description: '处理采购待审批任务。',
  },
  reports: {
    path: '/procurement/reports',
    label: '采购报表',
    description: '查询月报/年报/明细并发起报表审批。',
  },
  reportRequestDetail: {
    path: '/procurement/report-requests/:id',
    label: '报表审批单详情',
    description: '查看报表审批单快照与审批轨迹。',
  },
  reportApprovals: {
    path: '/procurement/report-approvals',
    label: '报表审批',
    description: '处理报表审批待办。',
  },
} as const;
