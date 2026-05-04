---
status: current-spec
owner: procurement
updated: 2026-05-04
replaces: []
replaced_by: []
---
# procurement_orders 表规格

## 表用途

存储采购申请单主数据与状态流转信息。

## 关键字段

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PK | 主键 |
| `order_no` | VARCHAR(32) | UNIQUE（软删除过滤） | 采购单编号 |
| `department_code` | VARCHAR(32) | NOT NULL | 部门编码 |
| `dimension_type` | VARCHAR(32) | NOT NULL default `none` | 细分类型：`none/vessel/logistics_category` |
| `dimension_key` | VARCHAR(64) | NULL | 细分键值 |
| `title` | VARCHAR(128) | NOT NULL | 采购标题 |
| `summary` | TEXT | NOT NULL | 摘要/事由 |
| `amount` | NUMERIC(12,2) | NOT NULL | 金额 |
| `expense_date` | DATE | NULL | 费用发生日期 |
| `status` | VARCHAR(32) | NOT NULL | `draft/submitted/dept_approved/final_approved/rejected` |
| `approval_channel` | VARCHAR(32) | NOT NULL default `internal` | 审批通道 |
| `external_process_instance_id` | VARCHAR(128) | NULL | 外部流程实例ID（预留） |
| `external_status` | VARCHAR(64) | NULL | 外部流程状态（预留） |
| `external_synced_at` | TIMESTAMPTZ | NULL | 最近外部同步时间（预留） |
| `submitted_at` | TIMESTAMPTZ | NULL | 提交时间 |
| `final_approved_at` | TIMESTAMPTZ | NULL | 终审通过时间 |
| `created_by` | VARCHAR(64) | NOT NULL | 创建人 UserId |
| `updated_by` | VARCHAR(64) | NOT NULL | 更新人 UserId |
| `created_at` | TIMESTAMPTZ | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 更新时间 |
| `deleted_at` | TIMESTAMPTZ | NULL | 软删除时间 |

## 索引建议

- `idx_procurement_orders_department_status`：`(department_code, status)` + `deleted_at is null`
- `idx_procurement_orders_submitted_at`：`(submitted_at)` + `deleted_at is null`
- `idx_procurement_orders_dimension`：`(department_code, dimension_type, dimension_key)` + `deleted_at is null`
- `idx_procurement_orders_approval_channel`：`(approval_channel, external_status)` + `deleted_at is null`

## 状态机

- 主链：`draft -> submitted -> dept_approved -> final_approved`
- 异常：任意审批节点可 `return`（回到 `draft`），可 `reject`（进入 `rejected`）

## 原生审批预留策略

本期 `approval_channel` 固定 `internal`。

后续接入企业微信原生审批时：

- 写入 `external_process_instance_id`
- 通过映射层将 `external_status` 转换为内部 `status`
- 业务逻辑仍以内部 `status` 为主，避免侵入查询和报表逻辑
