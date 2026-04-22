# 工作平台独立路由与页面信息架构（M6）

## 1. 路由冻结

M6 冻结以下前端路由：

| 路由 | 页面职责 | 主要受众 |
|---|---|---|
| `/workbench` | 工作平台首页、模块入口、待办聚合 | 全部有权限用户 |
| `/workbench/modules/:moduleCode` | 模块列表页 | 对应模块使用者 |
| `/workbench/modules/:moduleCode/new` | 模块录单页 | 有创建权限的用户 |
| `/workbench/modules/:moduleCode/:recordId` | 模块详情页 | 对应模块使用者 |
| `/workbench/admin/approvals` | 审批实例检索、重试、对账 | 管理员 |
| `/workbench/admin/exports` | 导出任务列表与结果 | 管理员 |
| `/workbench/admin/reconcile` | 对账任务与差异摘要 | 管理员 / 财务 |
| `/workbench/admin/diagnostics` | 诊断事件与排障入口 | 管理员 |

## 2. 页面类型

### 2.1 模块页

每个业务模块固定包含以下页面角色：

- 模块列表页
- 新建 / 编辑页
- 详情页
- 打印 / 归档视图

允许按模板类型复用共享页面骨架：

- `ledger_form`
- `operation_flow`
- `inspection_rectification`
- `attendance_statistics`
- `service_asset`
- `wecom_approval`

### 2.2 管理员页

管理员页不复用业务模块路由，统一放在 `/workbench/admin/*` 下，避免与业务页面混杂。

## 3. 页面分工

### `/workbench`

- 展示模块卡片、部门分组、待办聚合、告警摘要
- 仅承担导航和聚合，不承担高保真业务录单

### `/workbench/modules/:moduleCode`

- 承担模块清单、筛选器、分页、快捷动作
- 允许显示模块专属统计卡片
- 不在该页承担复杂编辑动作

### `/workbench/modules/:moduleCode/new`

- 承担高保真录单
- 页面字段由“模块元数据 + 模块专属组件”共同驱动
- `GET /workbench/modules/:moduleCode/schema` 只提供页面元数据、共享字段与步骤定义

### `/workbench/modules/:moduleCode/:recordId`

- 承担详情、动作、附件、审批状态、打印、归档入口
- 审批类模块需展示审批镜像状态与企业微信实例信息

## 4. 路由守卫

### 业务页

- 根据 `moduleCode` 映射到模块可见角色
- 无权限用户禁止直接访问模块页

### 管理员页

- `/workbench/admin/approvals`、`/workbench/admin/exports`、`/workbench/admin/diagnostics`
  - 角色：`system_admin`、`general_office`
- `/workbench/admin/reconcile`
  - 角色：`system_admin`、`general_office`、`finance`

## 5. 共享壳层

模块页与管理员页共享以下壳层能力：

- 顶部导航和面包屑
- 当前模块标题与说明
- 全局错误态与重试入口
- 企业微信 JS-SDK 状态提示
- 回退至 `/workbench` 的快捷入口

## 6. 筛选器原则

### 业务模块页

- 至少支持：状态、时间、关键字
- 船舶相关模块额外支持：船舶、航次、泊位
- 统计类模块额外支持：月份、部门、统计口径

### 管理员页

- 审批页：实例号、业务单号、模块、外部状态、同步状态、错误码、时间区间
- 导出页：任务号、模块、状态、时间区间
- 对账页：任务号、来源、状态、时间区间
- 诊断页：事件类型、模块、状态、错误码、时间区间

## 7. 设计结论

- M6 不再把“模块级业务交互”留在 `/workbench` 首页。
- 模块页走统一路由模式，管理员页走统一 `/workbench/admin/*` 模式。
- `schema` 继续保留，但退回到“元数据与共享字段”角色，不再负责完整动态页面渲染。
