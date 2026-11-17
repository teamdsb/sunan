---
status: current-source
owner: planning
updated: 2026-11-17
replaces: []
replaced_by: []
---
# M9 Wave 1 身份、配置与迁移基线

> 本文是 M9-W1A/W1B/W1C 的冻结结果，保留冻结时的源码盘点和验证状态。后续 W2-W4 已实现并有条件验收；当前实施证据见 [W2](../acceptance/M9-wave-2.md)、[W3](../acceptance/M9-wave-3.md)、[W4](../acceptance/M9-wave-4.md)，不代表生产上线。通知接口、实际字段和轮换操作以 [消息规格](wecom/message-push-spec.md) 及 [缓存规格](wecom/token-cache-spec.md) 为准。

## 1. 范围与证据

本 Wave 只冻结身份来源、有效授权、全目录同步、管理员 API、通知配置和增量迁移边界，不新增生产表、migration、Controller 或页面。现行行为以以下源码为准：

| 领域 | 当前证据 | 当前结论 |
|---|---|---|
| OAuth / me / refresh | `apps/api/src/modules/auth/auth.service.ts`、`auth.controller.ts` | OAuth 读取企业微信详情后整行保存；`/auth/me`、JWT 和刷新重新从数据库按来源字段推导角色。 |
| JWT | `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | 每次受保护请求调用 `getCurrentUser`，但没有平台停用、人工覆盖或 corp 校验。 |
| 管理员 | `apps/api/src/modules/wecom/wecom-admin.service.ts`、`config/env.ts` | env 白名单是运行时判断来源；`wecom_users.is_system_admin` 仍被 OAuth 写入，部分旁路直接查 env 或该字段。 |
| 用户存储 | `apps/api/src/database/entities/wecom-user.entity.ts`、`1710000000000-bootstrap-auth.ts`、`1710000022000-wecom-user-department-ids.ts` | 只有来源部门/职位、raw profile 和历史管理员快照；没有来源状态、同步批次、授权版本、登录/同步时间或审计表。 `user_id` 全局唯一，未以 corp 组成唯一键。 |
| 旁路 | `modules/reminder`、`modules/workbench/self-inspection`、`modules/procurement` | 提醒、自查候选人与采购收件人分别从部门代码、部门/职位推导或直接查用户表，尚未共享统一有效授权服务。 |
| 通知 | `modules/wecom/wecom-message.service.ts`、`wecom-token.service.ts` | 只使用 env 主应用；agent token、刷新锁和消息 agentid 没有按应用/配置版本隔离。 |
| 目录 | `modules/wecom/wecom-http.gateway.ts` | 只有按 UserID 获取详情和列部门接口，没有递归分页全目录同步、可见范围证明或批次记录。 |

当前没有本地企业微信凭据、通讯录权限或生产数据库快照，因此全企业覆盖、历史成员状态、重复身份和存量外键质量均为未验证项。

## 2. M9-W1A 有效身份与权限矩阵

唯一生效服务冻结命名为 `EffectiveAuthorizationService`（目标路径 `apps/api/src/modules/auth/effective-authorization.service.ts`）。OAuth、刷新、`/auth/me`、JWT strategy、业务范围、候选人和通知收件人只能通过该服务取得有效部门、角色、管理员和状态；Wave 1 不创建该文件。

### 2.1 唯一生效算法（Wave 2 实现目标）

1. 校验 UserID 属于 `appEnv.WECOM_CORP_ID` 的企业成员，并先判断企业微信来源成员状态。确认不可用的成员拒绝 OAuth、`/auth/me`、旧 JWT 和刷新。
2. 普通成员再检查平台状态 `enabled|disabled`；env 管理员资格只由 `WECOM_SYSTEM_ADMIN_USER_IDS` 判断，平台 disabled 不撤销其管理员能力，但企业微信来源不可用仍拒绝访问。
3. 有效部门由 `departmentMode=manual` 的人工部门 ID 列表，或最新来源部门列表决定。人工部门只能引用已同步部门字典中的 ID。
4. 有效业务角色由 `roleMode=manual` 的人工角色列表替换自动角色，或由有效部门决定。人工部门模式不再从旧职位补回角色；仅“跟随部门 + 自动角色”保留职位匹配 `船员|船长` 的旧兼容规则。
5. 每个有效账号加入 `all_authenticated`，再独立加入 env 推导的 `system_admin`。`is_system_admin` 数据库字段不参与授权、收件人或数据范围。
6. 登录、`/auth/me`、刷新、JWT 守卫、候选人和通知收件人必须调用同一有效授权服务；管理员保存以 `authorization_version` 乐观锁校验，冲突返回 `409`。

### 2.2 角色/部门组合矩阵

| 场景 | 有效部门 | 有效角色 | 兼容与收敛要求 |
|---|---|---|---|
| 总经办 | `general_office` | `general_office` | 保留总经办跨部门查询和现有管理能力。 |
| 人工财务部门 + `shipping` | `finance_dept` | `finance`、`shipping` | 采购按 `shipping` 角色判断审批能力；按部门过滤的接口仍使用财务部门。必须有回归证据。 |
| 人工部门为空 | `[]` | 人工列表或仅 `all_authenticated` | 不提供部门范围；角色直接授予的范围按模块规则保留。 |
| 人工角色为空 | 来源/人工部门 | 仅 `all_authenticated` | 不从来源部门或职位回填额外业务角色。 |
| 旧职位为船员/船长 | 来源部门 | 仅在 follow + auto 时兼容增加 `crew` | manual 部门或 manual 角色时不得额外补回。 |
| 船员/船舶关系 | 当前有效角色 + 独立船舶/任务参与关系 | `crew` 不等于任意船舶访问 | 不因平台部门修改转移任务、船舶任职或历史审批人。 |
| env 管理员提升 | 有效部门照常计算 | 追加 `system_admin` | 原人工 disabled 保留但暂不生效；企业微信账号不可用仍拒绝。 |
| env 管理员撤销 | 有效部门照常计算 | 移除 `system_admin` | 原人工 disabled 重新生效；所有实例重载 env 后下一请求采用新结果。 |

当前旁路差异必须单独收敛：提醒服务补算部门/角色，自查从 `raw_profile.status` 判断 active 并按旧字段推导，采购收件人按 `departmentCodes` 加 env 管理员。这些差异不能在 Wave 1 伪装为已经统一。

### 2.3 模块权限矩阵

| 模块/入口 | 当前源码依据 | M9 有效身份来源与保留边界 |
|---|---|---|
| 我的、`/auth/me`、认证守卫 | `auth.service.ts`、`jwt.strategy.ts`、`roles.guard.ts` | `all_authenticated` 是基础身份；`system_admin` 只由 env；下一受保护请求读取最新有效授权。 |
| 办事、企业资料/制度 | `office.service.ts`、`enterprise-profile`、`enterprise-policy` | 继续使用既有角色与部门范围；总经办跨部门能力保留；管理 API 仍只接受既有角色组合。 |
| 采购审批/报表 | `procurement.service.ts` | 部门节点按有效部门；审批能力按有效角色；人工财务部门 + `shipping` 必须保留 `shipping` 审批资格，不扩大财务部门的其他范围。 |
| 证书提醒 | `reminder.service.ts`、`certificate-reminder-engine.service.ts` | 收件与可见范围改由统一有效角色/部门；船舶/车辆/人员的既有负责人和部门规则、确认与去重不变。 |
| 自查候选人 | `workbench/self-inspection.service.ts` | 管理人、执行人、审核人按统一角色和账号状态；船舶/任务参与关系独立校验，部门调整不改历史参与人。 |
| 工作平台其他任务/学习 | `workbench.service.ts` 等 | 角色能力与记录 owner/reviewer/participant 关系组合继续生效；平台部门调整不自动转移任务或改写快照。 |
| 系统设置与 M9 管理 API | 现有 `@Roles`/system settings 入口 | 仅 `system_admin`，且资格来自 env；普通业务角色、数据库管理员快照和伪造请求字段均不能提权。 |

该矩阵冻结的是统一身份来源，不是把所有业务范围改成角色全量授权；具体接口仍需沿用各模块的部门、船舶和参与关系规则并在 W3 回归。

## 3. M9-W1B 用户目录、来源覆盖与管理 API

### 3.1 目标数据边界与表名

W2 采用增量、关系化 schema，保留 `wecom_users.id`、`user_id`、所有业务外键和单企业 UserID。冻结的目标表名如下；Wave 1 不创建这些表：

| 表 | 用途 | 关键约束 |
|---|---|---|
| `wecom_users` | 用户来源快照、人工部门/角色模式、平台状态、授权版本、来源快照版本和时间戳 | 保留现有 UUID；`user_id` 与 `corp_id` 同时校验；来源写入不得更新人工列；旧 `source_snapshot_version` 不得覆盖新快照。 |
| `wecom_departments` | 企业微信部门字典及最近来源快照 | `corp_id + wecom_department_id` 唯一；人工设置只能引用本表记录。 |
| `wecom_directory_sync_batches` | 同步批次、覆盖范围、完整性、分页和失败统计 | 状态 `running|succeeded|partial|failed`；范围未知时不能宣称全企业。 |
| `wecom_user_change_audits` | 部门/角色/状态变更原因、前后快照、操作者和版本 | 只记录脱敏字段；管理员操作可追溯。 |
| `notification_app_configs` | 可选消息应用的加密凭据、配置版本和状态 | 同企业唯一当前配置；不存主应用 env Secret。 |
| `notification_delivery_attempts` | 各业务实际应用、配置来源/版本、接收人、结果和错误 | 与已有业务去重键关联；成功不得因配置变更重发。 |

旧 `department_ids`、`department_names`、`department_codes` 和 `raw_profile` 作为初始来源快照输入；旧 `is_system_admin` 仅保留兼容读取/审计用途，迁移后不再作为授权真源。

### 3.2 管理 API 契约（目标，尚未实现）

以下接口均要求 `JwtAuthGuard + RolesGuard(system_admin)`；普通 `/auth/me` 不要求管理员。请求体只接受列出的字段，拒绝 `system_admin`、`isAdmin`、`isSystemAdmin`、`is_system_admin`、`corpId`、`userId` 和 raw profile：

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/v1/admin/wecom-users` | 分页、姓名/UserID、有效部门、业务角色、env 管理员、平台状态、是否登录、是否人工覆盖筛选；默认包含全部状态。 |
| GET | `/api/v1/admin/wecom-users/:userId` | 来源/生效对照、授权模式、登录/同步时间、平台状态和脱敏变更历史。 |
| PATCH | `/api/v1/admin/wecom-users/:userId/authorization` | 修改部门模式/ID、角色模式/角色、平台状态和原因；必须带 `expectedAuthorizationVersion`。 |
| POST | `/api/v1/admin/wecom-users/:userId/restore-departments` | 仅恢复部门跟随，不清除人工角色。 |
| POST | `/api/v1/admin/wecom-users/:userId/restore-roles` | 仅恢复角色自动，不改变部门模式。 |
| POST | `/api/v1/admin/wecom-directory-sync` | 触发主应用目录同步；重复运行返回当前批次或明确冲突。 |
| GET | `/api/v1/admin/wecom-directory-sync/:batchId` | 查询批次、可见范围、完整性和失败明细。 |
| GET | `/api/v1/admin/wecom-users/:userId/audits` | 查询该用户的授权与状态变更历史。 |

错误语义遵循通用 API 规范：`401` 未登录、`403` 非 system admin、`404` 用户/批次不存在、`409` 授权版本冲突或同步进行中、`422` 部门/角色组合无效、`503` 企业微信范围或凭据不可用。来源更新乱序必须按批次序列拒绝旧快照，不得覆盖人工字段。

### 3.3 全目录验收门槛

同步必须递归处理部门、多部门成员、分页、去重和部分失败，并以 `corp_id + user_id` 幂等 upsert。名单缺失、应用可见范围收缩、分页中断或失败都不能删除、停用或清空人工设置。只有主应用确实可读取企业全目录且与企业微信管理员核对后，U1 才能标记全量通过；否则 UI 和批次结果必须显示“仅覆盖应用可见范围”或“完整性未验证”。

## 4. M9-W1C 通知配置、缓存与回滚

### 4.1 来源白名单

| 配置 | 来源 | Wave 1 决定 |
|---|---|---|
| CorpID、主 AgentID/Secret、OAuth、回调、签名、域名和系统管理员 | env | 继续只读 env；后台不得编辑或返回 Secret。 |
| 可选通知 AgentID + Secret | `notification_app_configs` | 同企业覆盖，Secret 认证加密入库；CorpID 固定继承主应用。 |
| 加密主密钥 | `SYSTEM_SETTINGS_ENCRYPTION_KEY` env | 不展示、不写库；密文携带算法/密钥版本。 |
| DB/Redis/JWT/OSS/部署开关 | env/部署配置 | 本期不迁入后台。 |

未设置覆盖或显式清除时使用主应用完整配置。首次仅有 AgentID 或 Secret 必须拒绝保存；编辑时 Secret 为空表示保留已存 Secret，但更换 AgentID 必须同时提供新 Secret。已保存覆盖鉴权失败、解密失败或应用不可见时必须显示故障并停止该次发送，不能静默回退主应用。

### 4.2 应用隔离与投递规则

目标缓存键固定包含企业、应用和配置版本，例如 `wecom:app:{corpId}:{agentId}:v{configVersion}:access_token`；刷新锁、JS-SDK 主应用票据和独立通知票据分别隔离。OAuth、通讯录、回调和 JS-SDK 始终使用 env 主应用。

一次外部发送使用同一配置快照。`42001` 只刷新当前应用；网络失败沿用原业务去重键重试并记录新尝试。`invaliduser`、可见范围不足、限流、解密失败和结果不确定都必须可查询；未经人工核对不得跨应用自动重试。测试连接只验证凭据，测试发送只发管理员明确选择的对象，草稿不改变已保存配置。

### 4.3 增量迁移与兼容回滚

- 初始回填：来源资料来自现有列；部门 `follow_wecom`、角色 `auto`、平台状态 `enabled`。没有真实登录或同步时间时填 `NULL/unknown`，不得使用 `created_at` 冒充登录。
- 迁移前检查 corp 归属、重复 UserID、异常 raw profile 和业务外键；不按姓名合并，不改变 `wecom_users.id` 或历史单据/参与人快照。
- 迁移只追加列、索引和关系表，旧代码不得在启用人工覆盖/停用后继续运行；不能兼容时维护窗口暂停 API 与相关 worker，先导出授权、配置密文、审计和密钥恢复材料。
- 回滚通过历史内容创建递增的新配置/授权版本，不回退版本号，不清除人工撤权、停用或发送历史，也不复用旧 token/去重缓存。env 管理员名单变更必须使所有 API/worker 实例重载后再验收。

## 5. 验证矩阵与未知项

| 编号 | Wave 1 冻结的验证方法 | 当前状态 |
|---|---|---|
| U1 | 真实主应用全目录、未登录成员、重复同步、稳定 UUID/外键；范围不足不得通过 | 未执行，缺企业微信凭据/权限 |
| U2 | 分页中断、局部可见、缺失名单不删除/停用/清覆盖 | 未执行 |
| U3-U5 | 管理编辑后 OAuth、刷新、旧 JWT、本人权限刷新和恢复跟随 | 契约已冻结，W2/W3 实现前未执行 |
| U6 | 两管理员版本冲突、OAuth/同步乱序和真实 PostgreSQL 并发 | 未执行，尚无目标 migration |
| U7-U9 | 伪造管理员字段、env 提升/撤销、disabled 组合、采购/提醒/自查收件人一致性 | 旁路差异已列出，未统一实现 |
| C1-C4 | 默认/完整/半配置/保留 Secret/清除/解密失败/多实例隔离/定向测试 | 未执行，W4 未实现 |
| R1 | 脱敏存量演练、兼容回滚、密钥恢复和去重不重发 | 未执行，W5 依赖 W2-W4 |

以下事实必须由现场或数据库证据补齐，不能从当前源码推测：主应用通讯录是否覆盖全企业、目标成员总数、历史成员真实离职状态、重复/跨 corp 身份、现有 `raw_profile.status` 完整性、生产独立通知应用可见范围、消息送达和主密钥备份恢复能力。

## 6. 依赖与未实施项

| 后续 Wave | 必须消费的冻结结果 |
|---|---|
| W2 | 目标表名、来源/人工字段边界、统一授权服务、目录批次和管理员 API。 |
| W3 | 有效角色/部门矩阵、前端身份刷新、旁路收敛清单和 403/冲突契约。 |
| W4 | 通知白名单、主应用缺省、加密版本、缓存键、投递尝试和错误不回退规则。 |
| W5 | 增量迁移、兼容回滚、全目录和真实收发现场证据。 |

本文件、现有契约更新和验收记录完成后，才可进入 W2/W4 实施；没有代码、migration 或生产部署完成证据时，不得声称 M9 功能已经上线。
