# `certificate_reminders` 表规格

## 用途

记录证书到期扫描结果、消息发送情况和人工确认状态，为提醒看板和审计追踪提供数据基础。

## 表结构

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `certificate_id` | uuid | FK, NOT NULL | 关联证书 |
| `owner_type` | varchar(16) | NOT NULL | 冗余持有对象类型 |
| `owner_id` | uuid | NOT NULL | 冗余持有对象主键 |
| `recipient_user_id` | varchar(64) | NOT NULL | 接收提醒的企业微信 UserId |
| `reminder_type` | varchar(16) | NOT NULL | `upcoming` / `overdue` |
| `status` | varchar(16) | NOT NULL, DEFAULT `pending` | `pending` / `sent` / `acknowledged` / `failed` |
| `scheduled_date` | date | NOT NULL | 该条提醒对应的扫描日期 |
| `days_before_expiry` | integer | NOT NULL | 发送时距到期日天数，可为负值 |
| `sent_at` | timestamptz | NULL | 实际发送时间 |
| `acknowledged_at` | timestamptz | NULL | 确认时间 |
| `acknowledged_by` | varchar(64) | NULL | 确认人 UserId |
| `failure_reason` | text | NULL | 失败原因 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |

## 索引

- `idx_certificate_reminders_certificate_id`
- `idx_certificate_reminders_recipient_status`
- `uk_certificate_reminders_unique_dispatch`

建议唯一键：`certificate_id + recipient_user_id + scheduled_date + reminder_type`

## 生成规则

1. 定时任务每日 09:00 扫描 `certificates`。
2. 当 `expiry_date - current_date <= advance_days` 时生成 `upcoming` 提醒。
3. 当 `expiry_date < current_date` 时生成 `overdue` 提醒。
4. 合同类默认 `advance_days = 90`，普通证书默认 `advance_days = 30`。

## 确认规则

1. 只有接收人本人、其部门管理员或系统管理员可确认提醒。
2. 已确认提醒不可重复确认，接口返回 `409 Conflict`。
3. 确认仅改变提醒记录状态，不修改证书主数据。
