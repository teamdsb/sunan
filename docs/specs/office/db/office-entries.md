---
status: current-spec
owner: office
updated: 2026-05-04
replaces: []
replaced_by: []
---
# office_entries

## 用途

保存办事入口主数据。

## 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `UUID` | 主键 |
| `category_code` | `VARCHAR(64)` | 分类编码 |
| `title` | `VARCHAR(128)` | 入口标题 |
| `summary` | `TEXT` | 简介 |
| `icon_type` | `VARCHAR(64)` | 图标类型 |
| `target_type` | `VARCHAR(32)` | `external_url` 或 `internal_route` |
| `target_value` | `TEXT` | 目标地址或站内路由 |
| `open_mode` | `VARCHAR(32)` | `current_webview` 或 `new_window` |
| `visibility_roles` | `JSONB` | 可见角色集合 |
| `manager_roles` | `JSONB` | 管理角色集合 |
| `sort_order` | `INTEGER` | 排序号 |
| `status` | `VARCHAR(32)` | `draft`、`published`、`disabled` |
| `created_at` | `TIMESTAMPTZ` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | 更新时间 |
| `deleted_at` | `TIMESTAMPTZ` | 软删除时间 |
| `created_by` | `VARCHAR(64)` | 创建人 |
| `updated_by` | `VARCHAR(64)` | 更新人 |
