---
status: current-spec
owner: my
updated: 2026-08-09
replaces: []
replaced_by: []
---
# `enterprise_profiles` 与 `enterprise_profile_files` 表规格

## 用途

管理企业资料条目及其附件，覆盖营业执照、资质文件、对外公示材料等内容。

## 主表 `enterprise_profiles`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `title` | varchar(128) | NOT NULL | 资料标题 |
| `category` | varchar(32) | NOT NULL | 资料分类 |
| `description` | text | NULL | 简介 |
| `status` | varchar(16) | NOT NULL, DEFAULT `draft` | `draft` / `published` / `archived` |
| `effective_date` | date | NULL | 生效日期 |
| `published_at` | timestamptz | NULL | 发布时间 |
| `department_code` | varchar(64) | NULL | 创建者首个业务部门代码；用于记录级管理范围 |
| `created_by` | varchar(64) | NOT NULL | 创建人 UserId |
| `updated_by` | varchar(64) | NOT NULL | 更新人 UserId |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |
| `deleted_at` | timestamptz | NULL | 软删除时间 |

## 附件关联表 `enterprise_profile_files`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 主键 |
| `enterprise_profile_id` | uuid | FK, NOT NULL | 关联资料 |
| `file_id` | uuid | FK, NOT NULL | 关联 `files.id` |
| `sort_order` | integer | NOT NULL, DEFAULT 0 | 排序 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |

## 索引

- `idx_enterprise_profiles_status`
- `idx_enterprise_profiles_category`
- `idx_enterprise_profile_files_profile_id`
- `uk_enterprise_profile_files_profile_file`

## 业务规则

1. 资料至少允许无附件保存草稿，但发布时必须存在至少一个附件或完整正文。
2. `status = archived` 的资料默认不在列表展示，仅管理员可查看。
3. 附件排序由 `sort_order` 控制，同一资料内不得重复。
4. 非系统管理员可管理其任一 `department_code` 与资料 `department_code` 相同的资料；空部门编码仅系统管理员可管理。
