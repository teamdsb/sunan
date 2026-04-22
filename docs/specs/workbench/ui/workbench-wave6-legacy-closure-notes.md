# 工作平台 Wave6 遗留模块收口说明（M6）

## 1. 文档定位

本说明用于固定 Wave6 的跨域收口边界，覆盖：

- `finance_board`（provisional）
- `shipping_chart_update`（正式）

## 2. 财务板块收口口径（WS-6A）

- 继续保持 `provisional` 状态，不伪装为正式已确认模块。
- 路由与页面边界固定：
  - `/workbench/modules/finance_board`
  - `/workbench/modules/finance_board/new`
  - `/workbench/modules/finance_board/:recordId`
- 导出包必须显示来源分层（统计中心 / 附件 / 打印快照）。
- 审批保持 `provisional`，实现前未确认则不接入企业微信审批。

## 3. 海图更新收口口径（WS-6B）

- 作为正式模块推进，固定 `moduleCode=shipping_chart_update`。
- 详情页必须可追踪“确认 -> 提醒联动 -> 归档”全链路状态。
- 打印模板固定为 `A4-海图更新确认单`。

## 4. 半年提醒联动口径（WS-6C）

- 联动触发点：记录状态进入 `confirmed`。
- 计算规则：`nextPlannedUpdateDate = confirmedAt + 6 months`（按 `Asia/Shanghai`）。
- 幂等规则：同一 `recordId + vesselId` 重复确认不得重复创建提醒记录。
- 异常处理：联动失败事件必须进入管理员诊断页并可按 `moduleCode` 检索。

## 5. 与 Wave7 的衔接

- Wave7 需基于本口径补“海图更新半年提醒联动”集成测试与抽检模板。
- Wave7 需基于本口径补“财务板块 provisional 字段边界”契约测试。
