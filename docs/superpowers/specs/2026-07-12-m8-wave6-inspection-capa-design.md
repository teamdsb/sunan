---
status: current-spec
owner: safety
updated: 2026-07-12
replaces: []
replaced_by: []
---
# M8 Wave 6 检查、问题与 CAPA 设计

## 目标与边界

在既有工作平台内建立独立的检查、统一问题和 CAPA 领域闭环。复用 Wave 2 后端 ABAC 与职责隔离、Wave 3 证据审计、Wave 5 计划任务和待办；不新建一级导航，不把结构化领域数据写回工作平台 `payload` 代替实体，也不对海事或其他外部系统发起同步。

## 方案选择

采用“独立安全领域对象 + 任务/证据/权限复用”。直接扩展 `workbench_records` 会破坏已冻结的领域边界；再建一套任务系统则会重复 Wave 5 的幂等、待办和消息能力。新模块只保存业务关系和快照，通用任务与工作平台记录始终保有各自真源。

## 数据模型

- 模板侧：`inspection_templates`、`inspection_template_versions`、`inspection_template_items`、`inspection_template_scopes`。版本冻结后不可修改；法规、公司和船舶来源及导入批次写入版本审计。
- 执行侧：计划项绑定一个已发布模板版本。生成任务时建立 `inspections`，保存完整 `template_snapshot`；`inspection_results` 以“检查 + 检查项快照 + 检查人”为唯一结果槽，记录结论、说明、签认和证据关系。
- 问题侧：`safety_issues` 是唯一问题实体，`issue_type=nonconformity` 表示不符合项；`issue_sources` 支持检查项、工作平台记录和后续人工来源的多条双向关系。
- CAPA 侧：每个需要闭环的问题拥有一个 `capas`，其下有根因分析、纠正/预防措施、措施证据和验证记录。关键记录保留创建/更新人、时间、软删除和不可变动作审计。

## 任务、多人完成与转单

计划任务中心产生的安全任务通过 `inspections.task_id` 绑定检查。每位活跃 executor/collaborator 独立提交全部必填结果并签认；只有 Wave 5 的 `all`、`any` 或 `quorum` 门槛满足后才允许汇总为 `completed`。检查模板或主数据后续更新不影响 `template_snapshot`。

不合格结果以 `SHA-256(inspection_id + template_item_snapshot_key)` 生成问题转单幂等键。同一事务写入结果、转单 outbox 和审计；worker 用唯一约束查找或创建问题，再写来源关系。失败记录保留在补偿队列，对账动作只补建缺失问题而不删除原有问题或结果。

## 问题与 CAPA 状态及授权

检查遵循 `pending -> in_progress -> submitted -> completed`。问题遵循 `open -> analyzing -> action_in_progress -> pending_verification -> closed`。CAPA 遵循 `draft -> in_progress -> pending_verification -> verified -> closed`；验证失败退回 `in_progress` 并记录返工原因。

措施责任人只能提交自己的措施。验证人不得验证自己负责的措施；普通执行人不得关闭重大问题。关闭同时检查：所有必需措施已接受、每项有完成证据、验证通过、有效性评价已填写，并且 CAPA 已验证。所有拒绝和成功动作均写请求 ID、操作者、前后状态和原因。

## 工作平台来源与体验

四类模块 `goa_safety_hazard`、`shipping_self_inspection`、`shipping_vessel_inspection`、`shipping_maritime_safety_check` 通过来源链接进入统一问题中心。安全详情显示原记录的受权链接；工作平台详情仅在调用者同时有来源记录和问题读取权限时显示反向链接。

新增懒加载路由：模板管理、检查详情、问题中心和 CAPA 详情，均位于 `/workbench`。页面使用现有企业 H5 视觉：移动端单列、44px 操作热区、加载/空态/错误/403/弱网和重复提交处理；动作只依据后端 `availableActions` 呈现。

## 测试与验收

先以单元和 PostgreSQL testcontainers 集成测试覆盖：模板版本快照、`all/any/quorum` 汇总、重复/并发转单、补偿重放、重大问题关闭拒绝、缺措施/证据/验证/有效性评价关闭拒绝及验证返工。前端覆盖检查结果独立保存、门槛反馈、关闭拦截、来源回链和重复提交。

最终证据链固定为：计划项生成任务 -> 两位检查人独立签认 -> 不符合项一次转单 -> 根因与纠正/预防措施 -> 完成证据 -> 独立验证 -> 有效性评价与关闭；统计从问题和 CAPA 回钻至原检查项及工作平台来源。
