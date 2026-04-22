# 工作平台模块矩阵（M6）

## 1. 文档定位

本矩阵用于把 M4/M5 的“模块冻结”升级为 M6 可执行视图。每个模块必须明确：

- 原始需求来源
- 当前代码现状
- 当前状态
- M6 页面形态
- 打印模板
- 审批模板映射
- 阻塞项

状态口径统一为：

- `已实现`
- `已有底座`
- `M6 待高保真`
- `M6 遗留`

说明：

- “已有底座”表示已存在 `moduleCode + schema + runtime API + /workbench 统一壳层`。
- “M6 待高保真”表示 M6 必须补独立页面、字段组、动作、打印和验收点。
- “M6 遗留”表示 M5 仅冻结边界，M6 才进入独立 SDD。

## 2. 模块矩阵

### 2.1 Wave4 Batch A 标注

Wave4 已冻结的 Batch A 模块包括：

- 台账类：`goa_training`、`goa_meeting`、`goa_safety_month`、`goa_year_plan`、`business_ship_sign`、`business_vessel_dynamic`、`shipping_training_hours`、`shipping_drill`、`shipping_watch`、`shipping_shore_call`、`shipping_meeting`、`shipping_case_study`
- 作业闭环类：`business_operation_flow`、`zhongchuan_operation_flow`、`pinglu_operation_flow`

上述模块在 M6 中按“六维规格”执行，具体 UI 规格见 `ui/workbench-department-modules.md`。

### 2.2 Wave5 Batch B 标注

Wave5 已冻结的 Batch B 模块包括：

- 检查整改类：`goa_safety_hazard`、`shipping_self_inspection`、`shipping_vessel_inspection`、`shipping_confined_space_operation`、`shipping_oily_water_operation`、`shipping_maritime_safety_check`
- 统计 / 审批 / 资产服务类：`finance_attendance`、`shipping_attendance`、`shipping_voyage_approval`、`shipping_fuel_bunkering_approval`、`logistics_warehouse`、`logistics_office`、`logistics_canteen`、`logistics_dormitory`、`logistics_vehicle_maintenance`

上述模块在 M6 中除六维规格外，还必须满足“可被管理员任务体系检索与排障”的联动要求，具体见 `ui/workbench-batch-b-integration-notes.md`。

| 模块 | moduleCode | 部门/工作组 | 模板 | 当前状态 | 代码现状 | M6 页面形态 | 样表来源 | 打印模板 | 审批模板映射 | 阻塞项 |
|---|---|---|---|---|---|---|---|---|---|---|
| 岗前/日常/季度/年度培训 | `goa_training` | 总经办 | `ledger_form` | `M6 待高保真` | 已有 schema、记录运行时、统一页 | 独立培训页 + 进度视图 + 详情页 | `需求 4.3.1`、现有培训资料 | `A4-培训记录` | 岗前培训：`goa_training_onboarding_v1`；其他不适用 | 岗前审批口径、学习进度样张 |
| 会议管理 | `goa_meeting` | 总经办 | `ledger_form` | `M6 待高保真` | 已有 schema、统一壳层 | 独立会议列表/详情/打印页 | `需求 4.3.2`、会议记录样张 | `A4/A3-会议纪要` | 不适用 | 视频会议群关联字段待补样 |
| 安全月活动 | `goa_safety_month` | 总经办 | `ledger_form` | `M6 待高保真` | 已有基础 schema | 独立活动台账页 + 板块式详情 | `需求 4.3`、活动台账 | `A4-安全月活动归档` | 不适用 | 8 个板块样张需对齐 |
| 安全隐患排查管理 | `goa_safety_hazard` | 总经办 | `inspection_rectification` | `M6 待高保真` | 已有检查整改模板和运行时 | 独立隐患列表 + 整改闭环详情 | `需求 4.3`、排查记录本 | `A4-隐患闭环单` | 不适用 | 子维度检查项清单待业务确认 |
| 年度工作计划 | `goa_year_plan` | 总经办 | `ledger_form` | `M6 待高保真` | 已有 schema | 独立年度计划页 | `需求 4.3.5`、年度计划表 | `A4-年度工作计划` | 不适用 | 节点、责任部门样表待补齐 |
| 统计中心 | `finance_attendance` | 财务部 | `attendance_statistics` | `M6 待高保真` | 已有统计接口、导出/对账接口、统一页 | 独立统计中心页 + 对账入口 | `需求 4.4.1`、考勤表/作业票/劳务费表 | `A4-月度统计包` | 不适用 | 打卡范围、劳务费口径需业务确认 |
| 财务板块 | `finance_board` | 财务部 | provisional | `M6 遗留` | 当前无 `moduleCode`、无 API、无页面 | 独立 provisional 模块页 | `需求 4.4.2` | `M6 待定` | `M6 待确认是否审批` | 原始样表不足，仅能先出 provisional SDD |
| 作业人员签到台 | `business_operation_flow` | 业务部 | `operation_flow` | `M6 待高保真` | 与作业闭环共用模板 | 独立签到入口 + 记录列表 | `需求 4.5.1` | `A4-签到记录` | 不适用 | 需从通用作业闭环中拆出独立入口 |
| 接收工作组操作流程 | `business_operation_flow` | 业务部 | `operation_flow` | `M6 待高保真` | 已有步骤模板 | 独立四步闭环页 | `需求 4.5.2` | `A4-接收作业闭环单` | 不适用 | 作业前检查表样张待补 |
| 围油栏 | `business_operation_flow` | 业务部 | `operation_flow` | `M6 待高保真` | 与作业闭环共用 | 独立围油栏记录页 | `需求 4.5`、围油栏资料 | `A4-围油栏作业单` | 不适用 | 单证、费用样张待补 |
| 签船记录表 | `business_ship_sign` | 业务部 | `ledger_form` | `M6 待高保真` | 已有 schema、统一页 | 独立签船记录页 | `需求 4.5`、签船记录表 | `A4-签船记录` | 不适用 | 高保真字段需逐项对样 |
| 船舶动态记录表 | `business_vessel_dynamic` | 业务部 | `ledger_form` | `M6 待高保真` | 已有 schema | 独立动态记录页 | `需求 4.5`、船舶动态表 | `A4-船舶动态记录` | 不适用 | 航次、码头字段样式待确认 |
| 船舶垃圾 | `business_operation_flow` | 业务部 | `operation_flow` | `M6 待高保真` | 复用作业闭环模板 | 独立污染物接收子页 | `需求 4.5`、接收记录单 | `A4-垃圾接收单` | 不适用 | 费用说明、内外贸区分待补 |
| 船舶污油水 | `business_operation_flow` | 业务部 | `operation_flow` | `M6 待高保真` | 复用作业闭环模板 | 独立污染物接收子页 | `需求 4.5`、接收记录单 | `A4-污油水接收单` | 不适用 | 单证编号与费用样张待补 |
| 生活污水接收记录 | `business_operation_flow` | 业务部 | `operation_flow` | `M6 待高保真` | 复用作业闭环模板 | 独立污染物接收子页 | `需求 4.5`、接收记录单 | `A4-生活污水接收单` | 不适用 | 单证与费用样张待补 |
| 船员培训学时统计 | `shipping_training_hours` | 船务部 | `ledger_form` | `M6 待高保真` | 已有 schema | 独立学时台账页 | `需求 4.6`、培训统计表 | `A4-学时统计单` | 不适用 | 学时汇总口径待确认 |
| 船舶演练系统 | `shipping_drill` | 船务部 | `ledger_form` | `M6 待高保真` | 已有 schema | 独立演练计划/记录页 | `需求 4.6`、应急训练计划 | `A4-演练记录` | 不适用 | 年度计划模板待补 |
| 值守记录系统 | `shipping_watch` | 船务部 | `ledger_form` | `M6 待高保真` | 已有 schema | 独立值守页，区分值班/值守 | `需求 4.6.9`、值守记录本 | `A4-值守记录` | `shipping_watch_v1` | 船员值班与船舶值守两套表样 |
| 岸基叫应 | `shipping_shore_call` | 船务部 | `ledger_form` | `M6 待高保真` | 已有 schema | 独立发布/记录页 | `需求 4.6.10`、岸基叫应记录表 | `A4-岸基叫应记录` | 不适用 | 上至下发布链路说明待确认 |
| 船员会议记录 | `shipping_meeting` | 船务部 | `ledger_form` | `M6 待高保真` | 已有 schema | 独立会议页 | `需求 4.6.12`、月度会议资料 | `A4-船员会议记录` | 不适用 | 月度子项样张待补 |
| 案例警示学习 | `shipping_case_study` | 船务部 | `ledger_form` | `M6 待高保真` | 已有 schema | 独立学习推送页 | `需求 4.6`、案例学习资料 | `无固定打印` | 不适用 | 推送与完成确认样张待补 |
| 船舶自查排查 | `shipping_self_inspection` | 船务部 | `inspection_rectification` | `M6 待高保真` | 已有整改闭环模板 | 独立自查整改页 | `需求 4.6`、安全隐患记录本 | `A4-自查整改闭环` | 不适用 | 检查项标准表需补齐 |
| 船舶检验 | `shipping_vessel_inspection` | 船务部 | `inspection_rectification` | `M6 待高保真` | 已有整改闭环模板 | 独立检验页 | `需求 4.6`、船检单 | `A4-船舶检验闭环` | `shipping_vessel_inspection_v1` | 船检整改关闭是否审批需最终确认 |
| 密闭空间系统 | `shipping_confined_space_operation` | 船务部 | `inspection_rectification` | `M6 待高保真` | 已有整改闭环模板 | 独立按船记录页 | `需求 4.6.8`、按船记录本 | `A4-密闭空间记录` | `shipping_confined_space_v1` | 每船一本记录本样式待补 |
| 污油水接收作业 | `shipping_oily_water_operation` | 船务部 | `inspection_rectification` | `M6 待高保真` | 已有整改闭环模板 | 独立四步作业页 | `需求 4.6.13` | `A4-污油水作业闭环` | `shipping_oily_water_operation_v1` | 班前会、巡查样张待补 |
| 海事安检系统 | `shipping_maritime_safety_check` | 船务部 | `inspection_rectification` | `M6 待高保真` | 已有整改闭环模板 | 独立海事安检页 | `需求 4.6.14`、海事检查单 | `A4-海事安检闭环` | `shipping_maritime_safety_check_v1` | 检查单与整改照片模板待补 |
| 船员考勤 | `shipping_attendance` | 船务部 | `attendance_statistics` | `M6 待高保真` | 已有统计接口、审批桥、统一页 | 独立船员考勤页 | `需求 4.6`、考勤统计样表 | `A4-船员考勤表` | `shipping_attendance_v1` | 作业时长、照片上传口径待定 |
| 船舶设施设备保养 | `shipping_equipment_maintenance` | 船务部 | `service_asset` | `M6 待高保真` | 已有 service_asset schema | 独立保养页 | `需求 4.6`、检修养护记录表 | `A4-设备保养记录` | `shipping_equipment_maintenance_v1` | 轮机/驾驶室/甲板三类样表待补 |
| 燃油加注 | `shipping_fuel_bunkering_approval` | 船务部 | `wecom_approval` | `M6 待高保真` | 已有审批桥、统一壳层 | 独立燃油页 + 月报视图 | `需求 4.6`、油耗记录表 | `A4-燃油加注单` | `shipping_fuel_bunkering_v1` | 月报口径与剩余油量规则待补 |
| 航次计划审批 | `shipping_voyage_approval` | 船务部 | `wecom_approval` | `M6 待高保真` | 已有审批桥 | 独立航次审批页 | `需求 4.6`、航次计划表 | `A4-航次计划审批单` | `shipping_voyage_approval_v1` | 关键水域和任务字段样张待补 |
| 海图更新 | `shipping_chart_update` | 船务部 | `ledger_form` | `M6 遗留` | 当前无独立 `moduleCode`、无页面，仅有提醒类型 `chart_update` | 独立海图更新台账页 | `需求 4.6.11`、海图更新说明、更新资源信息 | `A4-海图更新确认单` | 不适用 | 需补确认动作与提醒联动规则 |
| 仓库 | `logistics_warehouse` | 后勤部 | `service_asset` | `M6 待高保真` | 已有 schema | 独立仓库页 | `需求 4.7`、仓库台账 | `A4-仓库台账` | 不适用 | 财产统计样张待补 |
| 办公室 | `logistics_office` | 后勤部 | `service_asset` | `M6 待高保真` | 已有 schema | 独立办公室页 | `需求 4.7`、办公室台账 | `A4-办公室资产单` | 不适用 | 维修保养记录样张待补 |
| 食堂 | `logistics_canteen` | 后勤部 | `service_asset` | `M6 待高保真` | 已有 schema | 独立食堂页 | `需求 4.7`、食堂设施资料 | `A4-食堂设施台账` | 不适用 | 水电与保养字段待补 |
| 宿舍 | `logistics_dormitory` | 后勤部 | `service_asset` | `M6 待高保真` | 已有 schema | 独立宿舍页 | `需求 4.7`、宿舍财产资料 | `A4-宿舍财产台账` | 不适用 | 财产与维修样张待补 |
| 车辆维修保养 | `logistics_vehicle_maintenance` | 后勤部 | `service_asset` | `M6 待高保真` | 已有 schema | 独立车辆页 | `需求 4.7`、车辆油耗与维修记录 | `A4-车辆维修保养单` | `logistics_vehicle_maintenance_v1` | 每车月油耗表样待补 |
| 中船五步作业闭环 | `zhongchuan_operation_flow` | 中船工作组 | `operation_flow` | `M6 待高保真` | 已有步骤模板 | 独立工作组闭环页 | `需求 4.8`、五步作业资料 | `A4-中船五步闭环` | 不适用 | 工作考勤时长样张待补 |
| 平陆运河五步作业闭环 | `pinglu_operation_flow` | 平陆运河工作组 | `operation_flow` | `M6 待高保真` | 已有步骤模板 | 独立工作组闭环页 | `需求 4.8`、五步作业资料 | `A4-平陆五步闭环` | 不适用 | 工作考勤时长样张待补 |

## 3. M6 设计结论

- 绝大多数工作平台模块当前处于 `已有底座`，M6 主要工作不是补 runtime，而是补独立页面、字段组、打印模板和验收点。
- `财务板块`、`海图更新` 当前均不具备独立实现基础，统一归为 `M6 遗留`，但处理策略不同：
  - `财务板块`：provisional SDD
  - `海图更新`：正式 SDD
- 管理员运维台不单列进业务模块矩阵，而由 `ui/workbench-admin-console.md`、`state/workbench-admin-console.md` 和 `api/workbench-admin-api.yaml` 单独承载。
