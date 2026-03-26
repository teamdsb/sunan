# `personnel` 表规格

## 用途

维护人员基础档案，作为人员证书和提醒接收人的业务主体。该表与企业微信通讯录同步，但保留业务侧扩展字段。

## 表结构

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 人员主键 |
| `wecom_user_id` | varchar(64) | UNIQUE, NULL | 企业微信 UserId |
| `name` | varchar(64) | NOT NULL | 姓名 |
| `department_code` | varchar(64) | NOT NULL | 部门编码，见术语表 |
| `position` | varchar(64) | NULL | 职务 |
| `mobile` | varchar(32) | NULL | 手机号 |
| `employment_status` | varchar(16) | NOT NULL, DEFAULT `active` | `active` / `inactive` / `left` |
| `is_sync_from_wecom` | boolean | NOT NULL, DEFAULT true | 是否来自企业微信同步 |
| `remarks` | text | NULL | 备注 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |
| `deleted_at` | timestamptz | NULL | 软删除时间 |

## 索引

- `uk_personnel_wecom_user_id`
- `idx_personnel_department_code`
- `idx_personnel_employment_status`

## 同步规则

1. 企业微信通讯录同步以 `wecom_user_id` 为幂等键。
2. 同步任务仅覆盖通讯录字段，不覆盖业务备注。
3. 通讯录中删除成员时，系统将 `employment_status` 标记为 `left`，不硬删除。

## 业务规则

1. 人员证书通过 `certificates.owner_type = personnel` 关联。
2. 未绑定企业微信的人员不能作为消息推送接收人，但可保留证照。
3. `department_code` 采用英文编码，展示时由前端映射中文名称。
