---
status: current-spec
owner: procurement
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 采购模块页面地图

## 路由结构

| 路由 | 页面 | 说明 |
|---|---|---|
| `/procurement` | 采购单列表页 | 默认首页，展示我的单据与筛选 |
| `/procurement/orders/new` | 采购录单页 | 创建草稿与提交 |
| `/procurement/orders/:id` | 采购单详情页 | 查看详情、审批轨迹、打印 |
| `/procurement/approvals` | 审批处理页 | 待审批采购单与动作入口 |
| `/procurement/reports` | 报表页 | 月报/年报/明细查询与导出 |
| `/procurement/report-approvals` | 报表审批页 | 报表审批单列表与审批 |
| `/procurement/dictionaries` | 字典治理页 | 船舶/后勤细分项管理 |

## 导航原则

1. `/procurement` 为采购模块首页。
2. 审批页按“采购单审批”“报表审批”分开，避免混淆。
3. 字典治理页仅对总经办和系统管理员可见。
