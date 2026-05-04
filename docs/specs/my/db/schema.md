---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# "我的"模块数据库总览

## 范围

本规格定义里程碑 1（"我的"模块）涉及的数据实体、表间关系、种子数据和关键约束，供后续 TypeORM migration、Repository 实现和测试用例编写使用。

## 实体分层

| 分层 | 表名 | 说明 |
|---|---|---|
| 引用数据 | `vessels` | 公司船舶主数据 |
| 引用数据 | `vehicles` | 公司车辆主数据 |
| 引用数据 | `certificate_types` | 证书类型枚举与提醒策略 |
| 人员数据 | `personnel` | 人员档案，来源于企业微信通讯录同步 |
| 业务数据 | `enterprise_profiles` | 企业资料主表 |
| 业务数据 | `enterprise_profile_files` | 企业资料附件关联表 |
| 业务数据 | `enterprise_policies` | 企业制度主表 |
| 业务数据 | `enterprise_policy_files` | 企业制度附件关联表 |
| 业务数据 | `certificates` | 电子证照主表 |
| 业务数据 | `certificate_files` | 电子证照附件关联表 |
| 业务数据 | `certificate_reminders` | 证书提醒记录 |
| 业务数据 | `ship_monitors` | 船舶监控端口配置 |
| 业务数据 | `user_settings` | 用户设置 |
| 集成缓存 | `wecom_users` | 企业微信用户缓存，供认证模块复用 |
| 通用文件 | `files` | OSS 文件元数据表，供多个业务表引用 |

## 关系总览

```text
vessels ───────────────┐
vehicles ──────────────┼── certificates ─── certificate_files ─── files
personnel ─────────────┘           │
                                   └── certificate_reminders

enterprise_profiles ── enterprise_profile_files ── files
enterprise_policies ── enterprise_policy_files ── files

vessels ── ship_monitors
personnel / wecom_users ── user_settings
```

## ER 设计约束

### 主键与时间字段

- 所有业务表主键使用 `uuid`
- 所有业务表至少包含 `created_at`、`updated_at`
- 需要逻辑删除的表包含 `deleted_at`
- 审计字段遵循 `docs/specs/common/db-conventions.md`

### 多态关联

`certificates` 使用多态持有者模型：

| 字段 | 说明 |
|---|---|
| `owner_type` | `vessel` / `vehicle` / `personnel` |
| `owner_id` | 对应引用表主键 |

约束要求：
- 同一条证书只能归属于一个持有对象
- 应用层需校验 `owner_type` 与 `owner_id` 的组合存在
- `owner_type + owner_id` 必须支持高频查询索引

### 文件关联

- `files` 保存 `oss_key`、原始文件名、大小、MIME、上传人、上传时间
- 各业务表不直接内嵌文件字段，统一通过关联表维护一对多关系
- 关联表中 `sort_order` 用于前端展示排序

### 提醒引擎

- `certificate_types` 定义默认提醒策略
- `certificates.expiry_date` 为提醒扫描唯一到期基准
- `certificate_reminders` 记录扫描结果、发送状态和确认结果
- 同一证书同一提醒批次不得生成重复有效提醒

## 引用数据要求

### 船舶种子

共 11 艘：
- `苏南012`
- `苏南022`
- `苏南辅2`
- `苏南辅3`
- `苏南辅5`
- `苏南辅6`
- `苏南辅7`
- `苏南辅8`
- `苏南辅9`
- `苏南辅10`
- `苏南辅16`

### 车辆种子

- `桂N06207`

### 证书类型种子

- `国籍证书`
- `所有权证书`
- `船检证书`
- `最低配员证`
- `电台执照`
- `设施设备检测报告`
- `海图更新`
- `年度检验`
- `保险`
- `人员证书`
- `人员合同`
- `服务合同`

## 跨表业务规则

1. `enterprise_profiles`、`enterprise_policies`、`certificates` 删除时仅软删除主记录和关联关系，不主动删 OSS 文件。
2. `certificate_reminders` 的生成依据为 `expiry_date - advance_days`，其中合同类默认 90 天，其他证书默认 30 天。
3. `ship_monitors` 仅允许绑定到 `vessels`，不允许绑定车辆或人员。
4. `user_settings.user_id` 对应企业微信 `UserId`，需要与 `wecom_users.user_id` 一致。
5. `personnel.wecom_user_id` 唯一，可为空；未同步到企业微信的历史人员仍可保留。

## 迁移验收要求

- 所有表均可通过 TypeORM migration 创建
- 种子表支持幂等初始化
- 关键索引覆盖以下查询：
  - 按 `owner_type + owner_id` 查询证书
  - 按 `expiry_date` 查询临期证书
  - 按 `user_id + status` 查询提醒列表
  - 按 `vessel_id` 查询监控端口
