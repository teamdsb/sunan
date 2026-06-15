---
status: current-spec
owner: procurement
updated: 2026-06-13
replaces: []
replaced_by: []
---
# procurement_budgets 与 procurement_budget_audits 表规格

## `procurement_budgets`

按年度、部门和采购分类保存预算金额。

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | UUID | PK |
| `budget_year` | INTEGER | NOT NULL |
| `department_code` | VARCHAR(32) | NOT NULL |
| `dimension_type` | VARCHAR(32) | NOT NULL |
| `dimension_key` | VARCHAR(64) | NULL |
| `dimension_name_snapshot` | VARCHAR(128) | NOT NULL |
| `budget_amount` | NUMERIC(12,2) | NOT NULL, CHECK > 0 |
| `is_enabled` | BOOLEAN | NOT NULL default true |
| `created_by` | VARCHAR(64) | NOT NULL |
| `updated_by` | VARCHAR(64) | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |
| `deleted_at` | TIMESTAMPTZ | NULL |

唯一索引使用表达式：

`budget_year, department_code, dimension_type, COALESCE(dimension_key, '')`

并限定 `deleted_at IS NULL`。

## `procurement_budget_audits`

预算创建、金额调整和停启用均追加审计记录，不更新、不删除。

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | UUID | PK |
| `budget_id` | UUID | FK -> `procurement_budgets.id` |
| `action` | VARCHAR(32) | `create/update/enable/disable` |
| `before_amount` | NUMERIC(12,2) | NULL |
| `after_amount` | NUMERIC(12,2) | NULL |
| `before_enabled` | BOOLEAN | NULL |
| `after_enabled` | BOOLEAN | NULL |
| `change_reason` | VARCHAR(500) | NOT NULL |
| `payload_snapshot` | JSONB | NOT NULL default `{}` |
| `changed_by` | VARCHAR(64) | NOT NULL |
| `changed_at` | TIMESTAMPTZ | NOT NULL |

## 执行口径

仅聚合 `final_approved`、未软删除且 `expense_date` 落在目标年度的采购单。
费用日期为空的采购单不计入。未配置预算的合格支出仍进入执行汇总。
