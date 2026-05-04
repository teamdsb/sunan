---
status: current-spec
owner: office
updated: 2026-05-04
replaces: []
replaced_by: []
---
# office_entry_audits

## 用途

记录办事入口治理动作和打开动作。

## 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `UUID` | 主键 |
| `entry_id` | `UUID` | 关联入口 |
| `action` | `VARCHAR(32)` | `create`、`update`、`publish`、`disable`、`open` |
| `operator_user_id` | `VARCHAR(64)` | 操作人企业微信 UserId |
| `payload_snapshot` | `JSONB` | 动作快照 |
| `created_at` | `TIMESTAMPTZ` | 创建时间 |
