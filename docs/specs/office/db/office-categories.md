---
status: current-spec
owner: office
updated: 2026-05-04
replaces: []
replaced_by: []
---
# office_categories

## 用途

保存办事模块固定分类字典。

## 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `VARCHAR(64)` | 分类编码，主键 |
| `name` | `VARCHAR(64)` | 分类名称 |
| `sort_order` | `INTEGER` | 排序号 |
| `is_enabled` | `BOOLEAN` | 是否启用 |
