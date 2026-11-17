---
status: current-source
owner: planning
updated: 2026-11-17
replaces: []
replaced_by: []
---
# M9 Wave 4 验收记录

## 1. 基本信息

- 里程碑：M9 平台管理与配置升级
- Wave：W4 后台推送配置与消息整合
- 验收日期：2026-11-17（Asia/Shanghai）
- 验收环境：本地 macOS；Node.js 20.20.2、pnpm 10.33.0；Docker/Testcontainers PostgreSQL 16、Redis 7；企业微信 HTTP 使用合成响应。
- 提交或分支：`main` 未提交工作树；基线 `678e2e1`（M9 Wave 3）。未执行 commit、push 或生产部署。
- 执行人：Codex
- 复核人：独立只读代码审查代理；产品、QA、运维尚未签署现场验收。

## 2. 验收结论

- 状态：`有条件通过`。W4A-D 功能已实现，本地专项验证通过，不能据此宣称真实租户已送达或整体发布门禁通过。
- 未关闭 P0：真实独立应用与主应用的可见范围、实际收发及主应用 OAuth/通讯录/SDK/回调现场回归未执行。原有 40 个集成失败已全部修复，W4-F1 已关闭。
- 未关闭 P1：iOS/Android/桌面企业微信真机、弱网现场及生产多机密钥分发/备份恢复演练未执行。
- 条件项及期限：W5/发布前补齐真实租户及设备矩阵、生产密钥恢复证据。没有现场条件时保持条件验收状态，不预填通过。

## 3. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M9-W4A` | 已实现，条件验收 | 配置 service/entity；`1710000028000-m9-wave4-notifications.ts`；PG 并发保存、版本/清除恢复、密钥轮换测试 | 整组事务、乐观版本、AES-256-GCM、独立 env 新旧主密钥、脱敏审计；主应用 Secret 不入库 |
| `M9-W4B` | 已实现，条件验收 | config/token service；真实 Redis 双客户端测试 | 完整 env 缺省，半配置拒绝，读取/解密失败不回退；企业/应用/版本/草稿缓存及锁所有权隔离 |
| `M9-W4C` | 已实现，条件验收 | message service 与证书/采购/任务调用链；W4 PG 集成 | 当前业务资格重验、稳定业务去重键、实际应用和历史、确认失败重试、不确定人工核对；成功不重推 |
| `M9-W4D` | 已实现，条件验收 | SettingsPage/API/测试；320px/1440px 截图 | 主应用只读、Secret 保留/改应用重填、连接验证/定向草稿、保存/明确清除、轮换及投递处理；真机未执行 |

## 4. 规格一致性

- [x] 需求、执行计划及 backlog 已按 W3/W4 实际条件验收状态同步。
- [x] `settings-api.yaml`、通知及企微规格已同步真实 Controller/DTO/响应；证书 API 增加 `uncertain` 状态。
- [x] 实际表为 `notification_app_configs`、`notification_app_config_audits`、`notification_delivery_attempts`；migration/entity 一致。通用去重键支持既有 255 字符业务键加 64 字符 UserID。
- [x] 状态层区分 `sending`、`uncertain`、确认失败和成功；并发未领取者 `inFlight` 不回写业务结果；证书 `acknowledged/resolved` 不被发送、核对或重试覆盖。
- [x] 沿用 `/my/settings` 管理入口与现有视觉风格；普通用户不显示通知应用管理，后端同时校验 env 管理员。
- [x] 文档导航、inventory 和索引通过本次最终脚本校验，见第 5 节。

本 Wave 不是文档冻结 Wave，模板中的“未新增生产表/页面”门禁不适用；本次确实新增并验证了 migration、实体和管理 API。

## 5. 自动化验证

所有应用命令以 `PATH=/opt/homebrew/opt/node@20/bin:$PATH` 使用仓库要求的 Node 20。以下结果为实际命令输出，未执行项不计通过。

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter api lint` | 通过 | 0 | `/tmp/sunan-fix-api-lint-final.log`；ESLint 退出 0 |
| `pnpm --filter api exec jest --config ./jest.unit.config.ts --runInBand` | 31 suites、171 tests 通过 | 0 | `/tmp/sunan-fix-api-unit-final.log`；含调度器关闭回归 |
| 全量集成中的 W4 配置/缓存/生命周期专项 | 2 suites、20 tests 通过 | 0 | `/tmp/sunan-fix-api-integration-final.log`；真实 PG/Redis，企微响应合成 |
| `pnpm test:integration --runInBand` | 23 suites、145 tests 全部通过，正常退出 0 | 0 | `/tmp/sunan-fix-api-integration-final.log`；94.855 秒，无 `--forceExit`、跳过项或未退出告警 |
| `pnpm --filter web exec vitest run --maxWorkers=1` | 60 files、276 tests 通过 | 0 | `/tmp/sunan-w4-all-web-final.log` |
| 设置页/提醒详情/提醒列表定向 Vitest | 3 files、24 tests 通过 | 0 | `/tmp/sunan-w4-web-targeted-final.log`；最终显示状态与布局修补后重跑 |
| `pnpm --filter api build` | 通过 | 0 | `/tmp/sunan-fix-api-build-final.log`；退出 0 |
| `pnpm --filter web build` | 通过 | 0 | `/tmp/sunan-w4-web-build-final.log`；退出 0 |
| `pnpm dlx @apidevtools/swagger-cli validate docs/specs/my/api/settings-api.yaml` | 通过 | 0 | `/tmp/sunan-w4-openapi.log` |
| `pnpm dlx @apidevtools/swagger-cli validate docs/specs/my/api/certificate-reminder-api.yaml` | 通过 | 0 | `/tmp/sunan-w4-reminder-openapi.log` |
| `node scripts/generate-doc-inventory.mjs` | 通过 | 0 | 更新 `docs/inventory.md`，含本记录，共284个Markdown文件 |
| `node scripts/check-doc-index.mjs` | 通过 | 0 | `doc index ok: 284 markdown files` |
| `git diff --check` | 通过 | 0 | 最终无空白错误 |

### 既有失败修复与基线追溯

初次 W4 验证时，在独立 detached worktree 的 `678e2e1` 上，用相同 Node 20 和真实 Testcontainers 跑全部原有集成：11 suites/85 tests 通过，10 suites/40 tests 失败。当时 W4 工作树为 13 suites/103 tests 通过、10 suites/40 tests 失败，失败名称集合与基线完全相同。这些历史结果保留用于追溯，不再代表当前门禁状态。

2026-11-17 按用户要求修复上述全部失败，涉及 `self-inspection`、`inspection-capa`、`certificate`、`workbench-business`、`files`、`enterprise-profile`、`plan-task`、`procurement-wave4`、`certificate-reminder`、`enterprise-policy`：

- `AuthModule` 显式导入实际依赖的 `WecomModule`，独立业务模块不再依赖 AppModule 恰好装配全局服务。
- 正常成员夹具的企业归属跟随 `appEnv.WECOM_CORP_ID`；计划/检查同时建立有效通讯录身份与在职人事映射，船员不被授予管理角色；证照夹具补齐船务经理的真实部门 ID。
- 143 项原有及 W4 断言全部通过后，继续定位到 Redis 重连定时器未释放；新增受 Nest 生命周期管理的 Redis 客户端，在消费者销毁完成后断开连接，取消重连。新增两项真实连接/重连关闭回归。
- 复核发现计划调度器运行期间关闭会提前返回且重新注册定时器；现等待当前周期完成并禁止停止后重排。deferred Promise 用例先在原实现失败，再修复通过，证据为 `/tmp/sunan-fix-scheduler-red.log`、`/tmp/sunan-fix-scheduler-green.log`。
- 最终源码重跑全量集成为 23 suites/145 tests 全通过，进程自然退出 0；全量单元为 31 suites/171 tests 全通过。没有改弱原断言、跳过测试或绕过有效身份校验；独立复核未发现剩余可确认问题。

历史 40 个完整失败名称、修复前后计数、正常退出结果及浏览器检查摘要保存在 `output/playwright/m9-w4-verification.json`。本轮未修改前端或 OpenAPI，表中原前端/协议专项结果沿用修复前同一 W4 工作树的实际证据。原始 `/tmp` 日志仅为本次本地运行证据，不视为长期生产审计。

### 专项覆盖

- C1：无覆盖且无独立密钥、完整 env、拒绝半配置/伪造字段、Secret 空白保留、AgentID 改变重填、明确清除及恢复递增版本。
- C2/C4：真实 PG 首次并发保存只成功一组；真实 Redis 双实例只刷新一次；corp/app/version/draft 独立键；旧 owner 不删除新锁；配置变更不重发成功消息。
- C3：错密钥/损坏认证密文、配置读取失败、上游明确拒绝、invaliduser、超时结果不确定；没有静默主应用回退或未知结果自动重发。
- 草稿只发选定有效成员，不更改配置；仅连接 token 成功不计送达。
- 人工重试拒绝失去采购资格者；人工空部门+shipping 角色仍可按角色审批并收通知，只有部门无角色者不收；退回重提交产生新周期通知。
- 未来任务正常分派；并发管理员重试只实际发送一次且不覆盖成功业务投递；最长合法业务键可持久化。
- 证书人工核对已送达/未送达、重试完成、初次发送期间并发确认，都保留业务已确认状态。跨日使用稳定提醒 ID，无法绕过原 `sending/uncertain` 记录。

## 6. 权限与安全

- [x] 通知读写、轮换、测试、查询、核对和重试统一要求 `JwtAuthGuard + RolesGuard(system_admin)`，管理员唯一来源仍为 env。
- [x] 请求白名单不允许 CorpID、OAuth、回调或安全 env 后台改写；无主应用 Secret 复制入库。
- [x] 配置审计仅含非敏感前后标识、版本和操作者；API 无 Secret/密文/主密钥，企微错误只记录码和脱敏原因，日志不打印带 token 的 Axios 原始异常。
- [x] 统一发送前按当前可用状态和领域资格筛选，人工重试同样检查；成功去重和不确定阻断经真实 PG 验证。
- [ ] 真实租户的可见范围与凭据运维流程仍待现场核对。附件/打印/导出没有本 Wave 的权限策略变更，不据此扩展验收范围。

## 7. 数据与迁移

- [x] 增量 migration 在真实 PG 执行；整组配置完整性约束、版本、索引、审计与投递状态存在；未使用 `synchronize:true`。
- [x] 首次并发保存、覆盖清除/恢复、旧密钥读取/新密钥重新加密及配置恢复创建新版本已验证。
- [x] `down()` 已审查；配置或审计/投递数据存在时拒绝破坏性回滚，PG 测试验证保留历史。
- [ ] 无生产存量快照，未执行生产数量/外键对账或真实备份恢复。不得把本地合成数据轮换当作生产恢复演练。
- 回滚约束：保留人工授权和投递去重历史；用历史内容保存新递增版本；新旧独立密钥与配置密文分开备份。禁止运行忽略覆盖或人工撤权的旧应用代码。

## 8. 前端与真机

- [x] Playwright 合成管理员视图检查 320px、1440px；320px 时页面 scrollWidth=320，没有横向溢出。
- [x] Secret 始终为空；保存空白 Secret 的实际浏览器请求省略该字段；读取503显示“当前生效应用未知”并禁用操作，恢复后重载保存携带正确版本4。
- [x] 浏览器验证定向测试交互；接口由隔离 Playwright session 合成响应，未产生真实企业微信消息。
- [x] 失败/待核对列表长 UserID 和错误信息可换行；前端单元覆盖错误、字段验证和同对象重载版本。
- [ ] 真实企业微信工作台/消息深链、iOS、Android、桌面企微和弱网/重新认证现场未执行。
- 开发控制台存在 React Router future 提示、Ant Design 静态 message/循环引用开发告警，以及故意注入的503资源错误；未观察到未捕获的功能异常。开发告警不能当作真实租户验收证据。

## 9. 证据索引

### 规格

- `docs/requirements/M9-平台管理与配置升级.md`、`docs/plans/M9-execplans.md`、`docs/plans/M9-wave-backlog.md`
- `docs/specs/common/notification-spec.md`、`docs/specs/wecom/message-push-spec.md`、`docs/specs/wecom/token-cache-spec.md`
- `docs/specs/my/api/settings-api.yaml`、`docs/specs/my/api/certificate-reminder-api.yaml`、`docs/specs/my/ui/settings-page.md`

### 代码与测试

- `apps/api/src/modules/wecom/wecom-notification-config.service.ts`、`wecom-token.service.ts`、`wecom-message.service.ts`
- `apps/api/src/modules/settings/`；采购、计划任务、证书提醒 service；`apps/web/src/features/settings/SettingsPage.tsx`
- `apps/api/test/m9-wave4-notifications.integration.spec.ts`（16项）、`m9-wave4-token.integration.spec.ts`（4项，含 Redis 关闭/取消重连）；配置与发送单元测试；计划调度器关闭回归；设置页测试（7项）。

### 迁移与运行

- `apps/api/src/database/migrations/1710000028000-m9-wave4-notifications.ts`；`apps/api/.env.example`、`deploy/.env.example`
- 开发前端已启动于 `http://localhost:5173/my/settings`。正常浏览器仍走实际认证配置；合成测试会话不等于可用测试租户。未启动/部署生产 API。

### 截图与检查摘要

- `output/playwright/m9-w4-mobile-320.png`
- `output/playwright/m9-w4-config-read-error-320.png`
- `output/playwright/m9-w4-desktop-1440.png`
- `output/playwright/m9-w4-verification.json`

## 10. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| W4-F1 | P0发布条件 | 原有集成10套件40失败已修复；模块依赖、有效身份夹具及退出资源清理完成；最终23套件145项全通过并自然退出0 | 项目开发/QA | 2026-11-17 | 已关闭 |
| W4-F2 | P0现场条件 | 真实独立应用送达、主应用身份/通讯录/SDK/回调未回归 | 项目运维/QA | 发布前 | 未执行 |
| W4-F3 | P1现场条件 | 三端真机、实际弱网和主应用完整可见范围 | 项目QA/企微管理员 | 发布前 | 未执行 |
| W4-F4 | P1运维条件 | 生产新旧密钥分发、备份恢复和多机重载 | 项目运维 | 发布前 | 未执行 |

独立审查发现的未来任务漏分派、证书确认被回写覆盖、并发重试状态覆盖、去重键长度等代码问题已修复并回归；最终复核未再发现可确认的 P0/P1 阻断代码问题。此结论不替代上表发布条件。

## 11. 复核签字

- 实施负责人：Codex（本地实现与验证）
- 代码复核：独立只读代理，最终差异审查完成
- 产品负责人：未签署
- QA：未签署现场验收
- 运维：未签署生产配置/恢复验收
