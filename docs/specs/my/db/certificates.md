---
status: current-spec
owner: my
updated: 2026-08-31
replaces: []
replaced_by: []
---
# `certificates` 与 `certificate_files` 表规格

## 用途

统一管理船舶、车辆、人员、设备的电子证照和合同类文件，是提醒引擎的核心数据来源。

## 主表 `certificates`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `certificate_type_id` | uuid | FK, NOT NULL | 关联证书类型 |
| `owner_type` | varchar(16) | NOT NULL | `vessel` / `vehicle` / `personnel` / `equipment` |
| `owner_id` | uuid | NOT NULL | 持有对象主键 |
| `certificate_no` | varchar(128) | NULL | 证书编号 |
| `title` | varchar(128) | NOT NULL | 展示标题 |
| `issue_date` | date | NULL | 签发日历日期；接口输入必须为带时间的 ISO 日期时间 |
| `expiry_date` | date | NOT NULL | 到期日历日期；接口输入必须为带时间的 ISO 日期时间 |
| `advance_days` | integer | NOT NULL | 提前提醒天数 |
| `issuer` | varchar(128) | NULL | 发证机构 |
| `status` | varchar(16) | NOT NULL, DEFAULT `active` | `active` / `expired` / `archived` |
| `latest_scan_at` | timestamptz | NULL | 最近参与提醒扫描时间 |
| `remarks` | text | NULL | 备注 |
| `created_by` | varchar(64) | NOT NULL | 创建人 UserId |
| `updated_by` | varchar(64) | NOT NULL | 更新人 UserId |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |
| `deleted_at` | timestamptz | NULL | 软删除时间 |

## 附件关联表 `certificate_files`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `certificate_id` | uuid | FK, NOT NULL | 关联证书 |
| `file_id` | uuid | FK, NOT NULL | 关联 `files.id` |
| `file_role` | varchar(32) | NOT NULL, DEFAULT `primary` | `primary` / `appendix` |
| `sort_order` | integer | NOT NULL, DEFAULT 0 | 排序 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |

## 索引

- `idx_certificates_owner`
- `idx_certificates_expiry_date`
- `idx_certificates_type_status`
- `uk_certificate_files_certificate_file`

## 约束

1. `expiry_date` 不得早于 `issue_date`。
2. `advance_days` 默认来自 `certificate_types.default_advance_days`，最小值为 `1`。
3. 同一 `owner_type + owner_id + certificate_type_id + certificate_no` 组合建议唯一，空编号时由业务层控制重复录入。
4. Wave 4 新建或变更证书时，持有对象必须有效；已停用对象只允许在历史详情中展示，不允许作为新的 `owner_id`。

5. 前端使用日期时间选择控件，接口拒绝 `YYYY-MM-DD` 日期-only 值；为兼容历史 `DATE` 列，写入时按 `Asia/Shanghai` 日历日期保存。

## 业务规则

1. 合同类证书与普通证书共用同一表，通过 `certificate_types.reminder_category` 区分。
2. 主附件缺失的证书可保存草稿，但不能标记为 `active`。
3. 当 `expiry_date < current_date` 时，扫描任务可自动将状态调整为 `expired`。
