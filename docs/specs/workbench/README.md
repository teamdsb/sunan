# 工作平台模块规格

## 模块定位

“工作平台”模块负责承载总经办、财务部、业务部、船务部、后勤部及工作组全量业务，采用统一平台底座 + 模板化能力设计。

- M4 已冻结模块矩阵、模板抽象、页面壳层和企业微信审批桥。
- M5 已完成运行时落库、审批运维、真机回归模板和遗留边界收口。
- M6 的重点是把“规格已冻结”进一步推进到“代码、路由、上线交付物和企业微信正式配置全部兑现”。

## 规格文档清单

| 层次 | 文件 | 状态 |
|---|---|---|
| API | `api/workbench-platform-api.yaml` | M6 需继续维护 |
| API | `api/workbench-statistics-api.yaml` | M4 历史补充 |
| API | `api/workbench-approval-api.yaml` | M6 需继续维护 |
| DB | `db/workbench-domain-model.md` | M4 已收口 |
| DB | `db/workbench-runtime-schema.md` | M5 已新增 |
| DB | `db/workbench-module-matrix.md` | M6 继续作为矩阵真源 |
| DB | `db/workbench-permission-matrix.md` | M4 已收口 |
| State | `state/workbench-shell.md` | M4 已收口 |
| State | `state/workbench-records.md` | M5 已更新 |
| State | `state/workbench-approval-sync.md` | M5 已更新 |
| UI | `ui/workbench-information-architecture.md` | M4 已收口 |
| UI | `ui/workbench-template-pages.md` | M4 已收口 |
| UI | `ui/workbench-department-modules.md` | M5 已更新 |
| Planning | `m5-optimization-backlog.md` | M5 历史输入 |
| Planning | `../wecom/production-config-matrix.md` | M6 已新增 |
| Planning | `finance-business-board-blocker.md` | M6 已新增 |

## M6 差异基线

以下差异在 M6 中必须显式收口：

1. 当前 `docs/execplans.md` 已切换为 M6，但 M1-M5 历史文档继续保留归档。
2. 工作平台前端当前仍主要依赖单页壳层，M6 需要升级为模块页、详情页、统计页、审批页路由。
3. 当前代码中仍存在聚合模块 `business_operation_flow`，与 M4/M5 已冻结的业务部模块粒度不一致。
4. `海图更新` 已进入 SDD 边界，但 M6 前需要变为真实模块。
5. `财务板块` 仍无字段样表，M6 只允许 blocker，不允许发明接口或表单。
6. 企业微信生产配置矩阵、回调安全、模板绑定、切换 runbook 和上线材料在 M5 仍是分散状态，M6 需收口为独立文档。

## M6 固定模块编码

### 继续保留的既有模块
- `goa_training`
- `goa_meeting`
- `goa_safety_month`
- `goa_year_plan`
- `goa_safety_hazard`
- `shipping_training_hours`
- `shipping_drill`
- `shipping_watch`
- `shipping_shore_call`
- `shipping_meeting`
- `shipping_case_study`
- `business_ship_sign`
- `business_vessel_dynamic`
- `finance_attendance`
- `shipping_self_inspection`
- `shipping_vessel_inspection`
- `shipping_confined_space_operation`
- `shipping_oily_water_operation`
- `shipping_maritime_safety_check`
- `shipping_attendance`
- `shipping_equipment_maintenance`
- `shipping_equipment_inspection`
- `shipping_voyage_approval`
- `shipping_fuel_bunkering_approval`
- `logistics_warehouse`
- `logistics_office`
- `logistics_canteen`
- `logistics_dormitory`
- `logistics_vehicle_maintenance`
- `zhongchuan_operation_flow`
- `pinglu_operation_flow`

### M6 新增/替换模块
- `business_signin_desk`
- `business_receiving_workgroup_flow`
- `business_oil_boom_operation`
- `business_ship_garbage_operation`
- `business_ship_oily_water_operation`
- `business_domestic_sewage_operation`
- `shipping_chart_update`
- `finance_business_board`（补料完成前不得落地代码）

### Legacy-only 模块
- `business_operation_flow`
  - 仅用于存量数据兼容展示
  - 不再作为默认新建入口
  - 不再作为模块卡片在首页展示

## 核心设计原则

### 1. 模板优先

所有工作平台模块必须映射到以下模板之一：

- `ledger_form`
- `operation_flow`
- `inspection_rectification`
- `attendance_statistics`
- `service_asset`
- `wecom_approval`

### 2. 平台统一能力

工作平台统一提供：

- 模块注册与入口可见性
- 首页待办聚合
- 模块页、详情页、统计页、审批页
- 通用列表/详情/动作
- 附件上传、打印快照与归档
- 操作日志与审计
- 企业微信消息与审批桥
- 统计汇总、导出与对账
- 管理员异常诊断与上线留痕

### 3. 审批单真源

- 有审批语义的模块，以企业微信审批实例状态为真源。
- 非审批类模块继续使用系统内部状态机。
- M6 不改变审批单真源，只补齐生产交付和安全闭环。

## 推荐阅读顺序

1. `docs/requirements/M6-全量兑现与完美上线.md`
2. `db/workbench-module-matrix.md`
3. `finance-business-board-blocker.md`
4. `api/workbench-platform-api.yaml`
5. `api/workbench-approval-api.yaml`
6. `state/workbench-records.md`
7. `state/workbench-approval-sync.md`
8. `docs/specs/wecom/production-config-matrix.md`
9. `docs/specs/wecom/callback-security-spec.md`
10. `docs/specs/wecom/production-cutover-runbook.md`
11. `docs/specs/wecom/go-live-materials-checklist.md`

## 与其他文档的关系

- 权限基础：`docs/specs/common/auth-spec.md`
- 文件上传基础：`docs/specs/common/file-upload-spec.md`
- 消息推送基础：`docs/specs/common/notification-spec.md`
- 企业微信 OAuth2 / JS-SDK / token 缓存：`docs/specs/wecom/*`
- M4 历史验收：`acceptance-wave1.md` ~ `acceptance-wave8.md`
- M5 历史验收：`acceptance-m5-wave1.md` ~ `acceptance-m5-wave4.md`
