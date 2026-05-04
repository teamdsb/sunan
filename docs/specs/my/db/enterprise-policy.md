---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `enterprise_policies` 与 `enterprise_policy_files` 表规格

## 用途

管理企业制度文档、版本号和版本历史，支持员工查阅与管理员维护。

## 主表 `enterprise_policies`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `title` | varchar(128) | NOT NULL | 制度标题 |
| `policy_code` | varchar(64) | NOT NULL | 制度编码 |
| `version` | varchar(32) | NOT NULL | 当前版本号 |
| `summary` | text | NULL | 摘要 |
| `status` | varchar(16) | NOT NULL, DEFAULT `draft` | `draft` / `published` / `deprecated` |
| `effective_date` | date | NULL | 生效日期 |
| `published_at` | timestamptz | NULL | 发布时间 |
| `created_by` | varchar(64) | NOT NULL | 创建人 UserId |
| `updated_by` | varchar(64) | NOT NULL | 更新人 UserId |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |
| `deleted_at` | timestamptz | NULL | 软删除时间 |

建议唯一键：`policy_code + version`

## 附件关联表 `enterprise_policy_files`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `enterprise_policy_id` | uuid | FK, NOT NULL | 关联制度 |
| `file_id` | uuid | FK, NOT NULL | 关联 `files.id` |
| `sort_order` | integer | NOT NULL, DEFAULT 0 | 排序 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |

## 版本管理规则

1. 同一 `policy_code` 可存在多个版本，但仅允许一个 `published` 版本。
2. 发布新版本时，上一发布版本自动转为 `deprecated`。
3. 历史版本保持只读，不允许覆盖附件。

## 索引

- `uk_enterprise_policies_code_version`
- `idx_enterprise_policies_status`
- `idx_enterprise_policies_effective_date`

## 业务规则

1. 制度详情页必须能返回版本历史摘要。
2. 删除制度仅删除指定版本，不级联删除同编码的其他版本。
3. `published` 制度必须有主附件。
