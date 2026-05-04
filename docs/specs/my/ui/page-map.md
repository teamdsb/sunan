---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# "我的"模块页面地图

## 路由结构

| 路由 | 页面 | 说明 |
|---|---|---|
| `/my` | 我的主页 | 六宫格入口页 |
| `/my/enterprise-profile` | 企业资料列表 | 列表与搜索 |
| `/my/enterprise-profile/:id` | 企业资料详情 | 详情与附件 |
| `/my/enterprise-policy` | 企业制度列表 | 列表与筛选 |
| `/my/enterprise-policy/:id` | 企业制度详情 | 详情与版本历史 |
| `/my/certificates` | 电子证照列表 | 分组、筛选、分页 |
| `/my/certificates/:id` | 电子证照详情 | 证照信息与附件 |
| `/my/reminders` | 证书提醒看板 | 统计与列表入口 |
| `/my/reminders/:id` | 提醒详情 | 确认处理 |
| `/my/monitors` | 船舶监控入口 | 船舶列表 |
| `/my/monitors/:vesselId` | 具体船舶监控 | 指定船舶入口 |
| `/my/settings` | 设置 | 个性化配置 |

## 导航原则

1. `/my` 作为模块首页，所有二级页均支持返回首页。
2. 详情页来源于列表页时保留查询参数，返回后恢复原筛选状态。
3. 监控页与设置页保持轻量，不引入复杂嵌套路由。

## 权限要求

- 所有 `/my/*` 路由需完成登录。
- 管理类按钮按 RBAC 权限动态显示，不通过路由层分叉页面。
