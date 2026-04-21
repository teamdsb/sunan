# 工作平台模块规格（里程碑 M4）

## 模块定位

“工作平台”模块负责承载总经办、财务部、业务部、船务部、后勤部及工作组全量业务，采用统一平台底座 + 模板化能力设计，在 M4 通过多 wave 分阶段实现。

本模块的审批类业务以企业微信原生审批为真源，系统内保留业务镜像、上下文展示和归档检索能力。

## 规格文档清单

| 层次 | 文件 | 状态 |
|---|---|---|
| API | `api/workbench-platform-api.yaml` | Wave 1 已收口 |
| API | `api/workbench-statistics-api.yaml` | Wave 1 已收口 |
| API | `api/workbench-approval-api.yaml` | Wave 1 已收口 |
| DB | `db/workbench-domain-model.md` | Wave 1 已收口 |
| DB | `db/workbench-module-matrix.md` | Wave 1 已收口 |
| DB | `db/workbench-permission-matrix.md` | Wave 1 已收口 |
| State | `state/workbench-shell.md` | Wave 1 已收口 |
| State | `state/workbench-records.md` | Wave 1 已收口 |
| State | `state/workbench-approval-sync.md` | Wave 1 已收口 |
| UI | `ui/workbench-information-architecture.md` | Wave 1 已收口 |
| UI | `ui/workbench-template-pages.md` | Wave 1 已收口 |
| UI | `ui/workbench-department-modules.md` | Wave 1 已收口 |
| Acceptance | `acceptance-wave1.md` | Wave 1 已归档 |
| Acceptance | `acceptance-wave2.md` | Wave 2 已归档 |
| Acceptance | `acceptance-wave3.md` | Wave 3 已归档 |
| Acceptance | `acceptance-wave4.md` | Wave 4 已归档 |
| Acceptance | `acceptance-wave5.md` | Wave 5 已归档 |
| Acceptance | `acceptance-wave6.md` | Wave 6 已归档 |
| Acceptance | `acceptance-wave7.md` | Wave 7 已归档 |

## 核心设计原则

### 1. 模板优先

所有工作平台模块必须先归类到以下模板之一：

- `ledger_form`
- `operation_flow`
- `inspection_rectification`
- `attendance_statistics`
- `service_asset`
- `wecom_approval`

### 2. 平台统一能力

工作平台统一提供：

- 模块注册与入口可见性
- 工作台首页与待办聚合
- 通用列表/详情/动作
- 附件上传与打印快照
- 操作日志与审计
- 企业微信消息与审批桥
- 统计汇总与导出

### 3. 审批真源规则

- 有审批语义的模块，以企业微信审批实例状态为真源。
- 非审批类模块仍使用系统内部状态机。
- 系统内部对审批类模块只保留镜像状态与业务上下文，不做双真源。

## 模块范围概览

### 总经办
- 培训管理
- 会议管理
- 安全月活动
- 安全隐患排查管理
- 年度工作计划

### 财务部
- 统计中心

### 业务部
- 作业人员签到台
- 接收工作组操作流程
- 围油栏
- 签船记录表
- 船舶动态记录表
- 船舶垃圾
- 船舶污油水
- 生活污水接收记录

### 船务部
- 船员培训学时统计
- 船舶自查排查
- 船员考勤
- 船舶设施设备保养
- 船舶检验
- 船舶演练系统
- 密闭空间系统
- 值守记录系统
- 岸基叫应
- 船员会议记录
- 污油水接收作业
- 海事安检系统
- 案例警示学习
- 航次计划审批
- 燃油加注

### 后勤部
- 仓库
- 办公室
- 食堂
- 宿舍
- 车辆维修保养

### 工作组
- 中船工作组五步作业闭环
- 平陆运河工作组五步作业闭环

## Wave 1 验收对照

| 验收项 | 对应规格 |
|---|---|
| 全量模块映射到 6 类业务模板 | `db/workbench-module-matrix.md` |
| 工作平台公共 API 冻结 | `api/workbench-platform-api.yaml` |
| 统计类 API 冻结 | `api/workbench-statistics-api.yaml` |
| 审批桥 API 冻结 | `api/workbench-approval-api.yaml` |
| 核心实体与状态机冻结 | `db/workbench-domain-model.md` |
| 模块权限矩阵冻结 | `db/workbench-permission-matrix.md` |
| 前端壳层与记录状态冻结 | `state/workbench-shell.md`、`state/workbench-records.md` |
| 审批同步状态冻结 | `state/workbench-approval-sync.md` |
| 页面信息架构与模板页面冻结 | `ui/workbench-information-architecture.md`、`ui/workbench-template-pages.md` |
| 部门高保真字段边界冻结 | `ui/workbench-department-modules.md` |
| 企业微信审批桥与上线约束冻结 | `docs/specs/wecom/approval-native-bridge-spec.md`、`docs/specs/wecom/workbench-go-live-checklist.md` |

## 推荐阅读顺序

1. `db/workbench-module-matrix.md`
2. `db/workbench-domain-model.md`
3. `api/workbench-platform-api.yaml`
4. `api/workbench-approval-api.yaml`
5. `state/*.md`
6. `ui/*.md`

## 与其他文档的关系

- 权限基础：`docs/specs/common/auth-spec.md`
- 文件上传基础：`docs/specs/common/file-upload-spec.md`
- 消息推送基础：`docs/specs/common/notification-spec.md`
- 企业微信 OAuth2 / JS-SDK / token 缓存：`docs/specs/wecom/*`
- 工作平台企业微信专项：`docs/specs/wecom/workbench-go-live-checklist.md`
- Wave 1 验收归档：`docs/specs/workbench/acceptance-wave1.md`
- Wave 2 验收归档：`docs/specs/workbench/acceptance-wave2.md`
- Wave 3 验收归档：`docs/specs/workbench/acceptance-wave3.md`
- Wave 4 验收归档：`docs/specs/workbench/acceptance-wave4.md`
- Wave 5 验收归档：`docs/specs/workbench/acceptance-wave5.md`
- Wave 6 验收归档：`docs/specs/workbench/acceptance-wave6.md`
- Wave 7 验收归档：`docs/specs/workbench/acceptance-wave7.md`
