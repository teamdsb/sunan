---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `ship_monitors` 表规格

## 用途

维护船舶监控访问入口，用于在 "我的" 模块中跳转或嵌入第三方监控系统。

## 表结构

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `vessel_id` | uuid | FK, NOT NULL | 关联船舶 |
| `monitor_name` | varchar(128) | NOT NULL | 监控名称 |
| `endpoint_url` | text | NOT NULL | 监控地址 |
| `access_mode` | varchar(16) | NOT NULL, DEFAULT `external` | `external` / `embed` |
| `sort_order` | integer | NOT NULL, DEFAULT 0 | 排序 |
| `is_active` | boolean | NOT NULL, DEFAULT true | 是否启用 |
| `last_verified_at` | timestamptz | NULL | 最近验证时间 |
| `created_by` | varchar(64) | NOT NULL | 创建人 UserId |
| `updated_by` | varchar(64) | NOT NULL | 更新人 UserId |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |
| `deleted_at` | timestamptz | NULL | 软删除时间 |

## 索引

- `idx_ship_monitors_vessel_id`
- `idx_ship_monitors_is_active`
- `uk_ship_monitors_vessel_name`

建议唯一键：`vessel_id + monitor_name`

## 业务规则

1. 每艘船可配置多个监控入口，前端按 `sort_order` 展示。
2. `endpoint_url` 必须使用 HTTPS。
3. 非系统管理员只能查看启用中的监控入口。
