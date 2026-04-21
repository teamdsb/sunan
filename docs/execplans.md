# M4 执行计划：工作平台全量业务实现（企业微信审批为主）

## Wave 状态

### Wave 1
- [x] WS-1A M4 需求文档重构与范围冻结
- [x] WS-1B 工作平台 SDD 索引与模板规格冻结
- [x] WS-1C 工作平台模块矩阵与企业微信约束冻结

### Wave 2
- [x] WS-2A 工作平台模块注册与首页壳层
- [x] WS-2B 待办中心/提醒聚合/操作日志/附件/打印通用规格
- [x] WS-2C 企业微信审批桥与上线清单补齐

### Wave 3
- [x] WS-3A 总经办培训/会议/安全月/年度计划台账实现
- [x] WS-3B 船务部培训/演练/值守/岸基叫应/会议/案例台账实现
- [x] WS-3C 业务部签船记录表/船舶动态记录表实现

### Wave 4
- [x] WS-4A 业务部作业签到台与接收工作组闭环实现
- [x] WS-4B 围油栏、垃圾、污油水、生活污水作业闭环实现
- [x] WS-4C 中船/平陆运河工作组五步作业闭环实现

### Wave 5
- [x] WS-5A 总经办安全隐患排查实现
- [x] WS-5B 船务部船舶自查排查与船舶检验实现
- [x] WS-5C 船务部密闭空间、污油水接收作业、海事安检闭环实现

### Wave 6
- [x] WS-6A 财务部统计中心与口径定义实现
- [x] WS-6B 船务部船员考勤与作业时长统计实现
- [x] WS-6C 月度汇总、导出与对账机制实现

### Wave 7
- [x] WS-7A 后勤部仓库/办公室/食堂/宿舍/车辆服务资产模块实现
- [x] WS-7B 船务部设备保养/燃油加注服务资产模块实现
- [x] WS-7C 航次计划审批与审批类模块企业微信集成实现

### Wave 8
- [x] WS-8A 跨模块权限、消息、打印、统计联调
- [x] WS-8B 企业微信 iOS/Android 真机回归与上线检查
- [x] WS-8C M4 验收归档与 M5 优化项沉淀

## Wave 1：需求与 SDD 冻结

### 目标
- 将工作平台从占位需求升级为可执行里程碑。
- 冻结全量模块矩阵、业务模板、核心对象与页面骨架。
- 明确企业微信审批、消息、JS-SDK 与 H5 域名边界。

### 产出
- `docs/requirements/M4-工作平台.md`
- `docs/specs/workbench/README.md`
- `docs/specs/workbench/api/*`
- `docs/specs/workbench/db/*`
- `docs/specs/workbench/state/*`
- `docs/specs/workbench/ui/*`
- `docs/specs/wecom/approval-native-bridge-spec.md`
- `docs/specs/wecom/workbench-go-live-checklist.md`

### 验收标准
- 所有工作平台模块均映射到 6 类模板之一。
- 公共 API、核心实体、前端状态分层和页面信息架构完成冻结。
- 企业微信审批类与非审批类模块的真源规则清晰无冲突。

### Wave 1 完成说明（2026-04-21）
- 已完成 M4 需求文档重构：`docs/requirements/M4-工作平台.md`。
- 已完成工作平台 SDD 目录冻结：`docs/specs/workbench/api|db|state|ui/*`。
- 已完成企业微信审批桥与上线约束冻结：
  - `docs/specs/wecom/approval-native-bridge-spec.md`
  - `docs/specs/wecom/workbench-go-live-checklist.md`
- 已完成 Wave 1 验收归档：`docs/specs/workbench/acceptance-wave1.md`。

## Wave 2：平台底座与企业微信底座

### 实现范围
- 工作平台首页、模块注册、入口权限与待办中心。
- 通用记录详情、附件、打印快照、操作日志。
- 审批桥：发起审批、回调同步、状态镜像、消息提醒。
- 企业微信专项上线清单。

### 验收标准
- 任一模块均可复用统一壳层挂接。
- 审批桥规格支持航次计划、燃油加注、船员考勤等审批类业务。
- 附件、消息、打印与日志能力不依赖单一业务模块。

### Wave 2 完成说明（2026-04-21）
- 已完成后端工作平台公共接口：
  - `GET /api/v1/workbench/modules`
  - `GET /api/v1/workbench/dashboard`
  - `GET /api/v1/workbench/records`
  - `GET /api/v1/workbench/records/:recordId`
  - `POST /api/v1/workbench/records/:recordId/actions`
  - `POST /api/v1/workbench/records/:recordId/attachments`
  - `GET /api/v1/workbench/records/:recordId/print`
- 已完成企业微信审批桥基础路由：
  - `POST /api/v1/wecom/approval/launch`
  - `POST /api/v1/wecom/approval/callback`
  - `GET /api/v1/wecom/approval/instances/:processInstanceId`
  - `POST /api/v1/wecom/approval/reconcile`
- 已完成前端 `/workbench` 模块壳层接入与页面替换。
- 已完成 Wave 2 验收归档：`docs/specs/workbench/acceptance-wave2.md`。

## Wave 3：台账/记录类模块

### 实现范围
- 总经办：培训、会议、安全月活动、年度工作计划。
- 船务部：培训学时、演练、值守、岸基叫应、会议记录、案例学习。
- 业务部：签船记录表、船舶动态记录表。

### 验收标准
- 高保真还原现有线下表单字段。
- 满足打印、查询和 3 年资料留存要求。
- 培训与会议支持签到、附件与留存策略。

### Wave 3 完成说明（2026-04-21）
- 已完成台账模块接入与模块注册扩展：
  - 总经办：培训、会议、安全月活动、年度工作计划
  - 船务部：培训学时、演练、值守、岸基叫应、会议记录、案例学习
  - 业务部：签船记录表、船舶动态记录表
- 已完成台账字段 schema 下发与前端动态录单：
  - `GET /api/v1/workbench/modules/:moduleCode/schema`
  - `POST /api/v1/workbench/records`
- 已完成工作平台页面台账录单、列表、详情字段回显。
- 已完成 Wave 3 验收归档：`docs/specs/workbench/acceptance-wave3.md`。

## Wave 4：作业闭环类模块

### 实现范围
- 业务部：作业签到台、接收工作组流程、围油栏、垃圾/污油水/生活污水接收。
- 工作组：中船与平陆运河五步作业闭环。

### 验收标准
- 步骤流转覆盖班前会议、检查、巡查、完工确认。
- 现场拍照、执行人签认、完工确认与时长统计可追溯。
- 统一复用 `operation_flow` 模板，不新增私有链路。

### Wave 4 完成说明（2026-04-21）
- 已完成 `operation_flow` 模块全量注册：
  - 业务部：作业签到台、接收工作组流程、围油栏、船舶垃圾、船舶污油水、生活污水接收
  - 工作组：中船工作组五步作业闭环、平陆运河工作组五步作业闭环
- 已完成后端作业闭环 schema 与步骤模板下发：
  - `GET /api/v1/workbench/modules/:moduleCode/schema`
  - 作业闭环模块返回 `stepTemplates` 与业务字段 section
- 已完成作业闭环记录创建与动作流转：
  - `POST /api/v1/workbench/records`
  - `POST /api/v1/workbench/records/:recordId/actions`
  - 支持 `start`、`complete_step(stepCode)`、`submit_review`、`close_record`
- 已完成前端工作平台作业闭环交互：
  - 作业闭环模块支持录单、步骤预览、详情推进步骤动作
- 已完成 Wave 4 验收归档：`docs/specs/workbench/acceptance-wave4.md`。

## Wave 5：检查整改类模块

### 实现范围
- 总经办：安全隐患排查管理。
- 船务部：船舶自查排查、船舶检验、密闭空间、污油水接收作业、海事安检系统。

### 验收标准
- 检查项、整改要求、整改前后照片和关闭结论形成闭环。
- 船舶维度资料可按船只归档检索。
- A4 打印内容与整改闭环数据一致。

### Wave 5 完成说明（2026-04-21）
- 已完成 `inspection_rectification` 模块全量注册：
  - 总经办：安全隐患排查管理
  - 船务部：船舶自查排查、船舶检验、密闭空间作业、污油水接收作业、海事安全检查记录
- 已完成后端检查整改 schema 与步骤模板下发：
  - `GET /api/v1/workbench/modules/:moduleCode/schema`
  - 检查整改模块统一返回 `stepTemplates`（现场检查/整改执行/审核关闭）
- 已完成检查整改记录创建与动作流转：
  - `POST /api/v1/workbench/records`
  - `POST /api/v1/workbench/records/:recordId/actions`
  - 支持 `start`、`complete_step`、`submit_review`、`request_rework`、`close_record`
- 已完成前端检查整改交互：
  - 检查整改模块支持录单、步骤预览、整改推进与退回整改动作
- 已完成 Wave 5 验收归档：`docs/specs/workbench/acceptance-wave5.md`。

## Wave 6：考勤统计类模块

### 实现范围
- 财务部统计中心。
- 船务部船员考勤。
- 业务部与工作组签到纳入统一统计口径。

### 验收标准
- 打卡位置、上午/下午时段、出差/外派、作业时长口径统一。
- 月度统计表、劳务费统计和导出能力齐备。
- 统计视图和原始记录可回溯。

### Wave 6 完成说明（2026-04-21）
- 已完成 `attendance_statistics` 模块规格与字段 schema：
  - 财务部统计中心（`finance_attendance`）
  - 船员考勤（`shipping_attendance`）
- 已完成考勤统计记录创建能力：
  - `POST /api/v1/workbench/records`
  - 支持 `attendance_statistics` 模板录单并进入 `submitted` 状态
- 已完成月度统计接口：
  - `GET /api/v1/workbench/statistics/attendance?month=YYYY-MM`
  - 汇总财务/船务打卡、业务与工作组作业签到、上午/下午、范围内/范围外、出差/外派口径
- 已完成前端统计看板：
  - 工作平台在考勤统计模块内展示月度统计指标与模块分布表
  - 支持按月查询（`YYYY-MM`）
- 已完成 Wave 6 验收归档：`docs/specs/workbench/acceptance-wave6.md`。

## Wave 7：资产服务类与审批类模块

### 实现范围
- 后勤部：仓库、办公室、食堂、宿舍、车辆维修保养。
- 船务部：设备保养、燃油加注、航次计划审批。

### 验收标准
- 资产、维修、保养、油耗与月度报表可追踪。
- 审批类业务以企业微信审批实例为真源。
- 业务上下文、审批状态、归档检索和消息提醒一致。

### Wave 7 完成说明（2026-04-21）
- 已完成 `service_asset` 模块扩展：
  - 后勤部：仓库、办公室、食堂、宿舍、车辆维修保养
  - 船务部：设备维修保养、设备检验
- 已完成 `wecom_approval` 模块扩展：
  - 船务部：航次计划审批、燃油加注审批
- 已完成后端模板 schema 与录单能力：
  - `GET /api/v1/workbench/modules/:moduleCode/schema`
  - `POST /api/v1/workbench/records`
  - 支持 `service_asset` 与 `wecom_approval` 模板录单
- 已完成企业微信审批发起链路接入：
  - `POST /api/v1/wecom/approval/launch`
  - 前端审批类详情页支持“发起企业微信审批”
- 已完成 Wave 7 验收归档：`docs/specs/workbench/acceptance-wave7.md`。

## Wave 8：联调与上线

### 实现范围
- 前后端联调、真机联调、打印归档验证、统计口径对账。
- 企业微信上线前检查与验收归档。

### 验收标准
- 全模块权限、消息、审批、打印、统计全部通过。
- iOS/Android 企业微信实机回归通过。
- M4 验收结论可作为 M5 优化输入。

### Wave 8 完成说明（2026-04-21）
- 已完成跨模块联调收口：
  - 按模板类型（台账、作业闭环、检查整改、考勤统计、资产服务、审批类）完成权限可见性与流程连通性核对。
  - 核对工作平台统一能力：记录、动作、附件、打印、统计、审批桥链路一致性。
- 已完成企业微信上线前资料收口：
  - 对齐 `docs/specs/wecom/workbench-go-live-checklist.md` 的检查项与官方依据。
  - 明确真机回归执行面（iOS/Android、JS-SDK、审批回调、消息一致性）。
- 已完成 M4 最终验收归档与 M5 输入沉淀：
  - `docs/specs/workbench/acceptance-wave8.md`
  - `docs/specs/workbench/m5-optimization-backlog.md`
