---
status: current-source
owner: planning
updated: 2026-11-16
replaces: []
replaced_by: []
---
# M9 Wave 1 验收记录

## 1. 基本信息

- 里程碑：M9 平台管理与配置升级
- Wave：1 身份、配置契约与迁移基线
- 验收日期：2026-11-16
- 验收环境：本地源码工作树；未连接生产数据库、企业微信通讯录或独立通知应用
- 提交或分支：验收时工作树（未创建提交）
- 执行人：Codex
- 复核人：待指定

## 2. 验收结论

- 状态：`有条件通过`
- 未关闭 P0：W2/W4 尚未实现统一授权、目录同步、管理 API、配置持久化、加密和发送整合；这些是后续 Wave 的实施项，不在本 Wave 伪装为完成。
- 未关闭 P1：暂无
- 条件项及期限：进入 W2/W4 前必须保留本基线；W5 用真实数据库、企业微信全目录和消息收发证据补齐现场项。

## 3. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M9-W1A` | 已冻结 | `docs/specs/m9-wave1-identity-configuration-baseline.md` §2；`docs/specs/common/auth-spec.md` M9 小节 | 已列出 OAuth/JWT/me/refresh、env 管理员和提醒/自查/采购旁路；统一服务尚未实现。 |
| `M9-W1B` | 已冻结 | 基线 §3；`docs/specs/wecom/oauth2-spec.md` M9 小节 | 已冻结来源/人工边界、目标表名、管理 API、版本冲突和全目录门槛；没有新增表或接口。 |
| `M9-W1C` | 已冻结 | 基线 §4；`docs/specs/common/notification-spec.md`、`docs/specs/wecom/message-push-spec.md`、`token-cache-spec.md` M9 小节 | 已冻结主应用缺省、错误不回退、加密/缓存/版本/重试和兼容回滚；Wave 4 才实施。 |

## 4. 规格一致性

- [x] 需求、执行计划和 backlog 已同步核对。
- [x] API 目标路径、字段白名单、错误码和 `system_admin` 门禁已记录；目标接口尚未实现。
- [x] DB 目标表名、来源/人工字段边界、UUID/外键保留和增量迁移策略已记录；本 Wave 未新增 migration/entity。
- [x] state 目标动作包含恢复部门跟随、恢复角色自动和授权版本冲突；实现留给 W2/W3。
- [ ] UI 路由、页面和移动管理流程：属于 W3，本 Wave 未实施。
- [x] 通用 auth/notification 和 wecom OAuth/message/token 契约已标明当前状态与 M9 目标。
- [x] 领域文档链接可由文档索引检查。

## 5. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter api lint` | 不适用 | 0 | 本 Wave 无 API 源码改动；W2/W4 实施后执行。 |
| `pnpm --filter api test:unit` | 不适用 | 0 | 本 Wave 无 API 行为改动；不能用旧测试代替目标授权验证。 |
| `pnpm --filter api test:integration` | 未执行 | — | 需要真实 PostgreSQL、并发和企业微信边界，属于 W2/W5。 |
| `pnpm --filter web test` | 不适用 | 0 | 本 Wave 无前端改动；W3 执行。 |
| `pnpm --filter api build` | 不适用 | 0 | 本 Wave 无 API 源码改动。 |
| `pnpm --filter web build` | 不适用 | 0 | 本 Wave 无前端改动。 |
| OpenAPI validate | 不适用 | 0 | 没有新增/修改 OpenAPI 文件；目标管理 API 尚未实现。 |
| `node scripts/generate-doc-inventory.mjs` | 通过 | 0 | 输出：`generated docs/inventory.md for 279 markdown files`。 |
| `node scripts/check-doc-index.mjs` | 通过 | 0 | 输出：`doc index ok: 279 markdown files`。 |
| `git diff --check` | 通过 | 0 | 命令无输出，退出码 0。 |

## 6. 权限与安全

- [x] 系统管理员唯一来源固定为 env；后台请求体禁止管理员提权字段。
- [x] 主应用 CorpID/AgentID/Secret、OAuth、回调、签名和域名继续由 env 维护。
- [x] 记录人工财务部门 + `shipping`、空部门、空角色、旧职位、env 提升/撤销与 disabled 组合。
- [x] 记录通知覆盖错误不回退、Secret 不入库和缓存/锁按应用版本隔离目标。
- [ ] 真实 API 权限、旧 token、收件人和密文验证：W2/W4/W5 未执行。

## 7. 数据与迁移

- [x] 目标表名、增量列/关系、UUID/外键保留和兼容回滚规则已冻结。
- [x] 缺少真实登录/同步时间时使用 `NULL/unknown`，不使用 `created_at` 冒充事实。
- [ ] migration `up()/down()`、真实 PostgreSQL 执行和存量数量/关联核对：W2/W5 未开始。
- [ ] 生产密钥备份、轮换和恢复演练：W4/W5 未执行。

## 8. 前端与真机

- [ ] 用户管理页面、H5 流程、重新聚焦刷新、403 和冲突恢复：W3 未实施。
- [ ] iOS、Android、桌面企业微信以及 320px 横向滚动：本 Wave 未执行。
- [ ] 全目录可见范围、真实测试发送和送达：缺少企业微信现场权限，W5 补齐。

## 9. 证据索引

### 规格

- `docs/specs/m9-wave1-identity-configuration-baseline.md`
- `docs/specs/common/auth-spec.md`
- `docs/specs/common/notification-spec.md`
- `docs/specs/wecom/oauth2-spec.md`
- `docs/specs/wecom/message-push-spec.md`
- `docs/specs/wecom/token-cache-spec.md`

### 代码

- 当前核对：`apps/api/src/modules/auth/`、`apps/api/src/modules/wecom/`、`apps/api/src/modules/reminder/`、`apps/api/src/modules/workbench/`、`apps/api/src/modules/procurement/`
- 当前实体/迁移：`apps/api/src/database/entities/wecom-user.entity.ts`、`apps/api/src/database/migrations/1710000000000-bootstrap-auth.ts`、`1710000022000-wecom-user-department-ids.ts`
- 本 Wave 未新增生产代码、Controller、entity 或 migration。

### 测试

- 文档清单、索引和 `git diff --check` 已通过；结果见上表。
- 真实 PostgreSQL 并发、企业微信全目录和消息收发尚未执行。

### 迁移与运行

- 未执行生产或部署操作；没有本地生产数据库、主应用可见范围或独立通知应用证据。

### 截图或真机记录

- 无；管理页面属于 W3，现场设备验收属于 W5。

## 10. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| M9-W2 | P0 | 实现增量 schema、目录同步、统一有效授权和管理员 API | planning | W2 | 未开始 |
| M9-W3 | P0 | 接入业务旁路、前端身份刷新和用户管理页面 | planning | W3 | 未开始 |
| M9-W4 | P0 | 实现通知配置加密、应用隔离、统一投递和结果查询 | planning | W4 | 未开始 |
| M9-W5 | P0 | 执行真实数据库、全目录、真机和消息收发验收 | planning | W5 | 未开始 |

## 11. 复核签字

- 实施负责人：待指定
- 产品负责人：待指定
- QA：待指定
- 运维：待指定
