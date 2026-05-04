---
status: current-spec
owner: procurement
updated: 2026-05-04
replaces: []
replaced_by: []
---
# procurement_report_approvals 表规格

## 表用途

记录报表审批单动作轨迹。

## 字段定义

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PK | 主键 |
| `report_id` | UUID | FK -> `procurement_reports.id` | 报表审批单ID |
| `approval_level` | VARCHAR(32) | NOT NULL | `dept`/`finance`/`final` |
| `action` | VARCHAR(32) | NOT NULL | `approve`/`reject`/`return` |
| `comment` | TEXT | NULL | 审批意见 |
| `source` | VARCHAR(32) | NOT NULL default `internal` | 动作来源 |
| `external_event_id` | VARCHAR(128) | NULL | 外部事件ID（预留） |
| `approved_by` | VARCHAR(64) | NOT NULL | 审批人 UserId |
| `approved_at` | TIMESTAMPTZ | NOT NULL | 审批时间 |
| `payload_snapshot` | JSONB | NOT NULL default `{}` | 审计快照 |

## 规则

1. 每个审批节点可多次操作，但最终状态以最后一次有效动作为准。
2. 本期仅允许 `source=internal`。
