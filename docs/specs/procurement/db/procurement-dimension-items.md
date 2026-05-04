# procurement_dimension_items 表规格

## 表用途

维护采购细分字典项：

- 船舶部按船舶
- 后勤部按后勤子类别

## 字段定义

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PK | 主键 |
| `department_code` | VARCHAR(32) | NOT NULL | `shipping_dept`/`logistics_dept` |
| `dimension_type` | VARCHAR(32) | NOT NULL | `vessel`/`logistics_category` |
| `dimension_key` | VARCHAR(64) | NOT NULL | 稳定键 |
| `dimension_name` | VARCHAR(128) | NOT NULL | 展示名 |
| `sort_order` | INTEGER | NOT NULL default 0 | 排序 |
| `is_enabled` | BOOLEAN | NOT NULL default true | 启用状态 |
| `created_by` | VARCHAR(64) | NOT NULL | 创建人 UserId |
| `updated_by` | VARCHAR(64) | NOT NULL | 更新人 UserId |
| `created_at` | TIMESTAMPTZ | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 更新时间 |
| `deleted_at` | TIMESTAMPTZ | NULL | 软删除时间 |

## 权限约束

- 仅 `system_admin`、`general_office` 可维护。
- 业务部/财务部/船务部/后勤部成员可读，不可改。

## 唯一约束

- `uq_procurement_dimension_items_scope_key` on (`department_code`, `dimension_type`, `dimension_key`) where `deleted_at is null`
