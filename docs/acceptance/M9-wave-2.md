---
status: current-source
owner: planning
updated: 2026-11-16
replaces: []
replaced_by: []
---
# M9 Wave 2 验收记录

## 1. 基本信息

- 里程碑：M9 平台管理与配置升级
- Wave：2 全通讯录与用户授权后端
- 验收日期：2026-11-16
- 验收环境：本地工作树；PostgreSQL 使用 Testcontainers，企业微信使用受控 mock
- 提交或分支：验收时工作树（未创建提交）
- 执行人：Codex
- 复核人：待指定

## 2. 验收结论

- 状态：`有条件通过`
- 未关闭 P0：真实企业微信全企业可见范围核对、真实并发现场和三端现场登录尚未执行。
- 未关闭 P1：无。
- 条件项及期限：W5 发布验收前补齐真实目录覆盖、企业微信管理员核对、并发演练和现场设备证据；在此之前批次保持 `unverified`，不得宣称全企业覆盖。

## 3. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M9-W2A` | 已实现 | `apps/api/src/database/migrations/1710000027000-m9-wave2-user-directory.ts`；`apps/api/src/database/entities/wecom-user.entity.ts` | 增量字段、部门字典、同步批次、审计、登录状态和来源修订号；保留现有 UUID/UserID 与关联。 |
| `M9-W2B` | 已实现 | `apps/api/src/modules/user-directory/user-directory.service.ts`；`apps/api/src/modules/wecom/wecom-http.gateway.ts` | 主应用 token、部门遍历、cursor 分页、UserID 去重、重试、部分失败、覆盖提示和缺失不停用。 |
| `M9-W2C` | 已实现 | `apps/api/src/modules/auth/authorization.service.ts`；`apps/api/src/modules/user-directory/user-directory.controller.ts` | OAuth/me/JWT/refresh 共用有效授权；管理查询、编辑、恢复跟随、停用、审计和版本冲突。 |

## 4. 规格一致性

- [x] 需求、执行计划和 backlog 已按 M9-W2 实现核对。
- [x] API 路径支持冻结的 `/api/v1/admin/wecom-users`、`/authorization`、恢复动作和 `/wecom-directory-sync`；旧 `/admin/users` 别名仅为兼容。
- [x] DB 规格与 migration/entity/index 一致，人工字段与来源字段局部更新。
- [x] 有效授权包含人工空角色、人工部门、env 管理员和平台停用例外。
- [ ] UI 与真机属于 W3/W5，未在本 Wave 实施。
- [x] 领域设计与 `docs/inventory.md` 已更新。

## 5. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter api lint` | 通过 | 0 | 退出码 0。 |
| `pnpm --filter api test:unit` | 通过 | 0 | 29 suites / 159 tests passed。 |
| `pnpm --filter api test:integration` | 通过 | 0 | 21 suites / 125 tests passed；含 Testcontainers PostgreSQL 迁移、并发 409、来源乱序和用户目录集成。 |
| `pnpm --filter web test` | 未执行 | — | W2 仅后端；W3 执行前端回归。 |
| `pnpm --filter api build` | 通过 | 0 | Nest build 退出码 0。 |
| `pnpm --filter web build` | 未执行 | — | W2 未修改 Web。 |
| OpenAPI validate | 未执行 | — | 本仓库无独立 OpenAPI 校验脚本；Swagger 文档由 Nest 启动时生成。 |
| `node scripts/generate-doc-inventory.mjs` | 通过 | 0 | 输出：`generated docs/inventory.md for 281 markdown files`。 |
| 文档索引校验 | 通过 | 0 | 输出：`doc index ok: 281 markdown files`。 |
| `git diff --check` | 通过 | 0 | 命令无输出，退出码 0。 |

## 6. 权限与安全

- [x] 管理控制器使用 `JwtAuthGuard + RolesGuard(system_admin)`；管理员资格只读来自 env。
- [x] 请求 DTO 字段白名单拒绝伪造管理员、企业和 raw profile 字段；版本不匹配返回 409。
- [x] 来源乱序按单调修订号保护；OAuth/同步不覆盖平台人工字段。
- [x] 平台停用对 OAuth、`/me`、旧 JWT 和 refresh 下一请求生效；env 管理员不受平台停用影响但仍受企业微信不可用状态约束。
- [ ] 真实企业微信凭据、可见范围和跨实例现场证据未执行。

## 7. 数据与迁移

- [x] migration `up()`/`down()` 已实现并在 Testcontainers PostgreSQL 执行。
- [x] 重复同步按 UserID 幂等，未登录成员 `never`、历史未知 `unknown`、OAuth 登录 `logged_in` 分开保存。
- [x] 名单缺失、分页失败和局部失败不会删除、停用或清空人工覆盖。
- [ ] 生产存量数量、业务外键核对和兼容回滚演练留给 W5。

## 8. 前端与真机

- [ ] 用户管理页面、H5 流程、身份刷新和移动端体验属于 W3。
- [ ] iOS、Android、桌面企业微信及 320px 验证属于 W5，未执行。

## 9. 证据索引

### 规格

- `docs/requirements/M9-平台管理与配置升级.md`
- `docs/plans/M9-execplans.md`
- `docs/plans/M9-wave-backlog.md`
- `docs/superpowers/specs/2026-11-16-m9-wave2-user-directory-design.md`

### 代码

- `apps/api/src/modules/auth/authorization.service.ts`
- `apps/api/src/modules/user-directory/user-directory.service.ts`
- `apps/api/src/modules/user-directory/user-directory.controller.ts`
- `apps/api/src/database/migrations/1710000027000-m9-wave2-user-directory.ts`

### 测试

- `apps/api/src/modules/auth/authorization.service.spec.ts`
- `apps/api/test/user-directory.integration.spec.ts`
- `apps/api/test/auth.integration.spec.ts`

### 迁移与运行

- Testcontainers PostgreSQL runs in `apps/api/test/pg-test-container.ts` and executes all migrations, including M9-W2.

### 截图或真机记录

- 无；管理页面与现场设备验收属于后续 Wave。

## 10. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| M9-W2-F1 | P0 | 尚未使用真实企业微信主应用核对全企业可见范围，批次保持完整性未验证。 | planning | W5 | 未关闭 |
| M9-W2-F2 | P0 | 尚未执行生产存量 UUID/外键对账、兼容回滚和现场并发演练。 | planning | W5 | 未关闭 |

## 11. 复核签字

- 实施负责人：待指定
- 产品负责人：待指定
- QA：待指定
- 运维：待指定
