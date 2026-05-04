---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `vehicles` 表规格

## 用途

维护公司车辆主数据，主要用于车辆相关证照管理。

## 表结构

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 车辆主键 |
| `plate_number` | varchar(32) | UNIQUE, NOT NULL | 车牌号 |
| `vehicle_type` | varchar(32) | NULL | 车型 |
| `status` | varchar(16) | NOT NULL, DEFAULT `active` | `active` / `inactive` |
| `remarks` | text | NULL | 备注 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |
| `deleted_at` | timestamptz | NULL | 软删除时间 |

## 索引

- `uk_vehicles_plate_number`
- `idx_vehicles_status`

## 种子数据

| `plate_number` | `vehicle_type` | `status` |
|---|---|---|
| `桂N06207` | 业务车辆 | `active` |

## 业务规则

1. 车牌号大小写不敏感，入库前统一转大写。
2. 车辆证照通过 `certificates.owner_type = vehicle` 关联。
3. 车辆停用后不允许新增新证照，但历史证照和提醒记录必须保留。
