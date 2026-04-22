# 工作平台模块级测试矩阵（M6 Wave7）

## 1. 文档定位

本矩阵冻结模块级测试范围，覆盖 Batch A、Batch B、Wave6 遗留模块与管理员台依赖链路。

## 2. 用例分层

- 合约测试：接口字段、状态机、错误码、分页与筛选参数
- 集成测试：数据库持久化、审批镜像、导出/对账/诊断任务联动
- 页面测试：列表、详情、动作、附件、打印快照、异常提示
- 手工回归：企业微信真机链路、跨角色权限、打印与导出结果可用性

## 3. 模块矩阵

| 模块组 | 代表模块 | 合约测试 | 集成测试 | 页面测试 | 真机回归 |
|---|---|---|---|---|---|
| Batch A 台账类 | `goa_training`、`goa_meeting`、`business_ship_sign`、`shipping_watch` | 必须 | 必须 | 必须 | 抽检 |
| Batch A 作业闭环类 | `business_operation_flow`、`zhongchuan_operation_flow`、`pinglu_operation_flow` | 必须 | 必须 | 必须 | 必须 |
| Batch B 检查整改类 | `goa_safety_hazard`、`shipping_vessel_inspection` 等 | 必须 | 必须 | 必须 | 必须 |
| Batch B 统计/审批类 | `finance_attendance`、`shipping_attendance`、`shipping_voyage_approval`、`shipping_fuel_bunkering_approval` | 必须 | 必须 | 必须 | 必须 |
| Batch B 资产服务类 | `logistics_warehouse`、`logistics_vehicle_maintenance` 等 | 必须 | 必须 | 必须 | 抽检 |
| Wave6 遗留收口 | `finance_board`、`shipping_chart_update` | 必须 | 必须 | 必须 | 必须 |
| 管理员运维台 | approvals / exports / reconcile / diagnostics | 必须 | 必须 | 必须 | 必须 |

## 4. 强制覆盖点

- 审批类模块：发起、回写、重试、对账、错误诊断
- 检查整改类：整改前后照片、关闭与退回、打印闭环
- 统计/导出类：导出任务排队、失败重试、下载结果
- 海图更新：`confirmed -> nextPlannedUpdateDate` 推导与提醒联动幂等
- 财务板块：`confirmed/provisional` 字段边界与 UI 标识一致

## 5. 通过门槛

- P0：0 个
- P1：全部有关闭结论或发布规避结论
- 模块级矩阵“必须”项全部通过后，方可进入发布窗口
