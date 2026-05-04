---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `vessels` 表规格

## 用途

维护公司船舶主数据，为电子证照、船舶监控和后续工作平台模块提供统一引用。

## 表结构

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 船舶主键 |
| `code` | varchar(32) | UNIQUE, NOT NULL | 内部编码，建议与船名解耦 |
| `name` | varchar(64) | UNIQUE, NOT NULL | 船舶名称 |
| `category` | varchar(32) | NOT NULL | `main_vessel` / `auxiliary_vessel` |
| `status` | varchar(16) | NOT NULL, DEFAULT `active` | `active` / `inactive` |
| `mmsi` | varchar(16) | NULL | 海事识别号 |
| `remarks` | text | NULL | 备注 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |
| `deleted_at` | timestamptz | NULL | 软删除时间 |

## 索引

- `uk_vessels_code`
- `uk_vessels_name`
- `idx_vessels_category_status`

## 种子数据

| `code` | `name` | `category` |
|---|---|---|
| `SN012` | 苏南012 | `main_vessel` |
| `SN022` | 苏南022 | `main_vessel` |
| `SNF002` | 苏南辅2 | `auxiliary_vessel` |
| `SNF003` | 苏南辅3 | `auxiliary_vessel` |
| `SNF005` | 苏南辅5 | `auxiliary_vessel` |
| `SNF006` | 苏南辅6 | `auxiliary_vessel` |
| `SNF007` | 苏南辅7 | `auxiliary_vessel` |
| `SNF008` | 苏南辅8 | `auxiliary_vessel` |
| `SNF009` | 苏南辅9 | `auxiliary_vessel` |
| `SNF010` | 苏南辅10 | `auxiliary_vessel` |
| `SNF016` | 苏南辅16 | `auxiliary_vessel` |

## 业务规则

1. 船名在系统内唯一，不允许重复创建。
2. 被 `certificates` 或 `ship_monitors` 引用的船舶不可物理删除。
3. `inactive` 船舶默认不在前端可选项中展示，历史证书仍保留可查。
