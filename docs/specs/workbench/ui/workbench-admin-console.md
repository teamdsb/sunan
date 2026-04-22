# 工作平台管理员运维台规格（M6）

## 1. 文档定位

本规格定义工作平台管理员运维台的页面信息架构、入口、筛选器、主列表、详情抽屉和诊断视图。

适用路由：

- `/workbench/admin/approvals`
- `/workbench/admin/exports`
- `/workbench/admin/reconcile`
- `/workbench/admin/diagnostics`

## 2. 角色与入口

### 默认角色

- `system_admin`
- `general_office`

### 对账页补充角色

- `finance`

### 首页入口

`/workbench` 首页顶部告警区和管理员快捷入口中展示：

- 审批异常
- 导出失败
- 对账差异
- JS-SDK 失败事件

## 3. 页面结构

### 3.1 `/workbench/admin/approvals`

页面结构：

- 顶部统计卡片：
  - 待回调
  - 重试中
  - 同步失败
  - 今日新增异常
- 主筛选器：
  - `processInstanceId`
  - `businessRecordId`
  - `moduleCode`
  - `approvalSyncStatus`
  - `externalStatus`
  - `syncErrorCode`
  - `source`
  - `dateFrom/dateTo`
- 主列表：
  - 实例号
  - 业务单号
  - 模块
  - 外部状态
  - 镜像状态
  - 同步状态
  - 错误码
  - 最近回调时间
  - 最近对账时间
- 详情抽屉：
  - 基本信息
  - 原始回调摘要
  - 状态流转
  - 错误信息
  - 重试 / 对账动作

### 3.2 `/workbench/admin/exports`

页面结构：

- 顶部统计卡片：
  - 排队中
  - 处理中
  - 失败
  - 今日完成
- 主筛选器：
  - `jobId`
  - `moduleCode`
  - `status`
  - `dateFrom/dateTo`
- 主列表：
  - 任务号
  - 模块
  - 发起人
  - 导出范围
  - 状态
  - 失败原因
  - 下载文件
  - 发起时间
- 详情抽屉：
  - 请求参数
  - 文件列表
  - 重试记录

### 3.3 `/workbench/admin/reconcile`

页面结构：

- 顶部统计卡片：
  - 差异任务数
  - 已关闭差异
  - 未处理差异
- 主筛选器：
  - `jobId`
  - `compareSource`
  - `status`
  - `departmentCode`
  - `dateFrom/dateTo`
- 主列表：
  - 任务号
  - 对账来源
  - 月份
  - 部门
  - 差异数量
  - 状态
  - 最近执行时间
- 详情抽屉：
  - 对账摘要
  - 差异明细
  - 原始口径说明
  - 重新对账入口

### 3.4 `/workbench/admin/diagnostics`

页面结构：

- 顶部统计卡片：
  - 审批失败
  - 消息失败
  - JS-SDK 失败
  - 导出失败
- 主筛选器：
  - `eventType`
  - `moduleCode`
  - `severity`
  - `status`
  - `errorCode`
  - `dateFrom/dateTo`
- 主列表：
  - 事件号
  - 事件类型
  - 模块
  - 级别
  - 错误码
  - 状态
  - 首次发生时间
  - 最近发生时间
- 详情抽屉：
  - 事件上下文
  - 关联实例 / 任务 / 记录
  - 处理记录

## 4. 交互原则

- 列表页默认展示最近 30 天数据。
- 所有管理员页均支持 URL 持久化筛选器。
- 所有重试、对账、重新导出动作必须带原因输入框。
- 详情抽屉优先展示可排障信息，再展示原始上下文。

## 5. 留痕要求

管理员动作必须留痕：

- 操作人
- 操作时间
- 操作类型
- 原状态
- 新状态
- 原因说明

## 6. 验收点

- 管理员无需依赖接口调试工具即可完成审批检索、重试、对账和诊断。
- 各页面筛选器、详情抽屉和动作按钮与 API 契约一致。
- 失败事件可直接跳转到关联实例、任务或业务单据。
