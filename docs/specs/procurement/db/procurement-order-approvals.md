# procurement_order_approvals 表规格

## 表用途

记录采购单审批动作轨迹（部门主管/总经办）。

## 字段定义

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PK | 主键 |
| `order_id` | UUID | FK -> `procurement_orders.id` | 采购单ID |
| `approval_level` | VARCHAR(32) | NOT NULL | `dept`/`final` |
| `action` | VARCHAR(32) | NOT NULL | `approve`/`reject`/`return` |
| `comment` | TEXT | NULL | 审批意见 |
| `source` | VARCHAR(32) | NOT NULL default `internal` | 动作来源：`internal`/`external` |
| `external_event_id` | VARCHAR(128) | NULL | 外部事件ID（预留） |
| `approved_by` | VARCHAR(64) | NOT NULL | 审批人 UserId |
| `approved_at` | TIMESTAMPTZ | NOT NULL | 审批时间 |
| `payload_snapshot` | JSONB | NOT NULL default `{}` | 审计快照，预留 `externalEventId`/`syncDirection` |

## 索引建议

- `idx_procurement_order_approvals_order_created`：`(order_id, approved_at)`
- `idx_procurement_order_approvals_level_action`：`(approval_level, action)`

## 规则

1. 每次审批动作必须落一条记录，不覆盖历史。
2. 本期仅允许 `source=internal`，`external` 仅为后续预留。
3. `payload_snapshot.syncDirection` 仅在跨系统同步时使用，本期为空。
