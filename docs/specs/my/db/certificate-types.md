---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `certificate_types` 表规格

## 用途

统一维护证书类型、默认提醒策略和适用对象范围，避免在业务代码中硬编码规则。

## 表结构

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `code` | varchar(64) | UNIQUE, NOT NULL | 类型编码 |
| `name` | varchar(64) | UNIQUE, NOT NULL | 类型名称 |
| `owner_scope` | varchar(32) | NOT NULL | `vessel` / `vehicle` / `personnel` / `mixed` |
| `reminder_category` | varchar(32) | NOT NULL | `certificate` / `contract` |
| `default_advance_days` | integer | NOT NULL | 默认提前提醒天数 |
| `requires_attachment` | boolean | NOT NULL, DEFAULT true | 是否必须上传附件 |
| `sort_order` | integer | NOT NULL, DEFAULT 0 | 排序 |
| `is_active` | boolean | NOT NULL, DEFAULT true | 是否启用 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |

## 索引

- `uk_certificate_types_code`
- `uk_certificate_types_name`
- `idx_certificate_types_owner_scope`

## 种子数据

| `code` | `name` | `owner_scope` | `reminder_category` | `default_advance_days` |
|---|---|---|---|---|
| `nationality_cert` | 国籍证书 | `vessel` | `certificate` | 30 |
| `ownership_cert` | 所有权证书 | `vessel` | `certificate` | 30 |
| `inspection_cert` | 船检证书 | `vessel` | `certificate` | 30 |
| `min_crew_cert` | 最低配员证 | `vessel` | `certificate` | 30 |
| `radio_license` | 电台执照 | `vessel` | `certificate` | 30 |
| `equipment_report` | 设施设备检测报告 | `vessel` | `certificate` | 30 |
| `chart_update` | 海图更新 | `vessel` | `certificate` | 30 |
| `annual_inspection` | 年度检验 | `mixed` | `certificate` | 30 |
| `insurance` | 保险 | `mixed` | `certificate` | 30 |
| `personnel_cert` | 人员证书 | `personnel` | `certificate` | 30 |
| `personnel_contract` | 人员合同 | `personnel` | `contract` | 90 |
| `service_contract` | 服务合同 | `mixed` | `contract` | 90 |

## 业务规则

1. 新建证书时默认取 `default_advance_days`，允许在单证书层级覆盖。
2. `owner_scope` 为 `mixed` 时，需在应用层限定可选持有对象。
3. 停用类型不可用于新增证书，但不得影响历史数据查询。
