# 工作平台模块规格

## 模块定位

“工作平台”模块负责承载总经办、财务部、业务部、船务部、后勤部及工作组全量业务，采用统一平台底座 + 模板化能力设计。

- M4 已完成全量模块范围、模板抽象、页面壳层和企业微信审批桥的规格冻结与验收归档。
- M5 承接 M4，重点转向“上线强化、工作平台正式化、遗留规格收口”。
- 审批类业务继续以企业微信原生审批为真源，系统内保留业务镜像、上下文展示、归档检索和异常运维能力。

## 规格文档清单

| 层次 | 文件 | 状态 |
|---|---|---|
| API | `api/workbench-platform-api.yaml` | M5 已更新 |
| API | `api/workbench-statistics-api.yaml` | M4 历史补充 |
| API | `api/workbench-approval-api.yaml` | M5 已更新 |
| DB | `db/workbench-domain-model.md` | M4 Wave 1 已收口 |
| DB | `db/workbench-runtime-schema.md` | M5 已新增 |
| DB | `db/workbench-module-matrix.md` | M5 已更新 |
| DB | `db/workbench-permission-matrix.md` | M4 Wave 1 已收口 |
| State | `state/workbench-shell.md` | M4 Wave 1 已收口 |
| State | `state/workbench-records.md` | M5 已更新 |
| State | `state/workbench-approval-sync.md` | M5 已更新 |
| UI | `ui/workbench-information-architecture.md` | M4 Wave 1 已收口 |
| UI | `ui/workbench-template-pages.md` | M4 Wave 1 已收口 |
| UI | `ui/workbench-department-modules.md` | M5 已更新 |
| Planning | `m5-optimization-backlog.md` | M5 已更新 |
| Acceptance | `acceptance-m5-wave1.md` | M5 Wave 1 已归档 |
| Acceptance | `acceptance-wave1.md` ~ `acceptance-wave8.md` | M4 历史归档 |

## 核心设计原则

### 1. 模板优先

所有工作平台模块必须优先映射到以下模板之一：

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
- 附件上传、打印快照与归档
- 操作日志与审计
- 企业微信消息与审批桥
- 统计汇总、导出与对账
- 管理员异常诊断与上线留痕

### 3. 审批单真源

- 有审批语义的模块，以企业微信审批实例状态为真源。
- 非审批类模块仍使用系统内部状态机。
- M5 不改变审批真源，只强化审批桥的持久化、异常恢复与排障能力。

## 模块范围概览（M4 已冻结）

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

## M5 规格入口

M5 新增或更新以下规格入口：

- 需求入口：`docs/requirements/M5-上线强化与遗留收口.md`
- 执行计划：`docs/execplans.md`、`docs/M5-execplans.md`
- 运行时存储：`db/workbench-runtime-schema.md`
- 优化 backlog：`m5-optimization-backlog.md`
- 遗留模块边界：`db/workbench-module-matrix.md`、`ui/workbench-department-modules.md`
- 审批运维：`docs/specs/wecom/approval-ops-spec.md`
- 真机回归留痕：`docs/specs/wecom/workbench-real-device-regression.md`

## 推荐阅读顺序

1. `docs/requirements/M5-上线强化与遗留收口.md`
2. `db/workbench-runtime-schema.md`
3. `db/workbench-module-matrix.md`
4. `api/workbench-platform-api.yaml`
5. `api/workbench-approval-api.yaml`
6. `state/workbench-records.md`
7. `state/workbench-approval-sync.md`
8. `docs/specs/wecom/approval-ops-spec.md`
9. `docs/specs/wecom/workbench-go-live-checklist.md`
10. `docs/specs/wecom/workbench-real-device-regression.md`

## 与其他文档的关系

- 权限基础：`docs/specs/common/auth-spec.md`
- 文件上传基础：`docs/specs/common/file-upload-spec.md`
- 消息推送基础：`docs/specs/common/notification-spec.md`
- 企业微信 OAuth2 / JS-SDK / token 缓存：`docs/specs/wecom/*`
- M4 历史验收归档：`docs/specs/workbench/acceptance-wave1.md` ~ `docs/specs/workbench/acceptance-wave8.md`
- M5 Wave 1 验收归档：`docs/specs/workbench/acceptance-m5-wave1.md`
- M5 优化输入与实施清单：`docs/specs/workbench/m5-optimization-backlog.md`
