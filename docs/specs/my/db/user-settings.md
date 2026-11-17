---
status: current-spec
owner: my
updated: 2026-11-17
replaces: []
replaced_by: []
---
# `user_settings` 表规格

## 用途

保存当前用户在 H5 应用中的个性化偏好，避免把界面设置写死在客户端。

## 表结构

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `user_id` | varchar(64) | UNIQUE, NOT NULL | 企业微信 UserId |
| `default_module` | varchar(32) | NOT NULL, DEFAULT `my` | 默认进入模块 |
| `reminder_view_mode` | varchar(16) | NOT NULL, DEFAULT `dashboard` | `dashboard` / `list` |
| `certificate_group_by` | varchar(16) | NOT NULL, DEFAULT `owner` | `owner` / `type` |
| `enable_push_notifications` | boolean | NOT NULL, DEFAULT true | 历史兼容字段，当前无个性化投递消费者 |
| `theme` | varchar(16) | NOT NULL, DEFAULT `light` | 主题模式，企业微信 H5 暂仅支持浅色 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |

## 索引

- `uk_user_settings_user_id`

## 默认值策略

1. 首次访问 `/api/v1/settings` 时，若无记录则自动创建默认配置。
2. 设置更新使用部分更新语义，仅覆盖提交字段。
3. 若企业微信用户离职，设置记录保留用于审计。

## 业务规则

1. `default_module` 在里程碑 1 固定允许值为 `my`。
2. `enable_push_notifications` 保留存量读写兼容，但当前没有使用它的个性化推送类型；前端不显示开关。证照、采购与任务通知按各自业务规则投递，该字段不改变它们。
3. 前端应在本地缓存设置副本，但以后端返回为准。
