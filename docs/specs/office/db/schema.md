---
status: current-spec
owner: office
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 办事模块数据库总览

## 表清单

| 表名 | 说明 |
|---|---|
| `office_categories` | 固定办事分类字典 |
| `office_entries` | 办事入口主数据 |
| `office_entry_audits` | 办事入口治理与打开审计 |

## 关系

- `office_entries.category_code -> office_categories.code`
- `office_entry_audits.entry_id -> office_entries.id`

## 设计约束

- 分类使用固定字典，不支持前台增删。
- 入口主数据使用软删除与审计字段。
- 审计表保留历史，不使用软删除。
