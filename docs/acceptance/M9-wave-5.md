---
status: current-source
owner: planning
updated: 2026-11-17
replaces: []
replaced_by: []
---
# M9 Wave 5 迁移回归与验收

## 1. 基本信息

- 里程碑：M9 平台管理与配置升级；Wave：W5A/W5B/W5C。
- 验收日期：2026-11-17（Asia/Shanghai）。
- 环境：本地 macOS，Node 20.20.2、pnpm 10.33.0；Testcontainers PostgreSQL 16、Redis 7；浏览器为本地 Chromium。企业微信上游均为合成响应，未操作真实目录、发送真实消息或部署生产。
- 源码：`main`，基线 `428602f`，本轮差异未提交；无生产发布/兼容回滚镜像签核。
- 执行人：Codex；复核方式：本地差异自审、自动化及浏览器；产品/QA/运维现场签核未取得。
- 前置：[W2](M9-wave-2.md)、[W3](M9-wave-3.md)、[W4](M9-wave-4.md) 均有实际记录。本记录补充新证据，不修改历史执行事实。

## 2. 验收结论

- 状态：**有条件通过（本地迁移/回归和操作包）**，不代表 M9 全目录、现场送达、三端或生产上线验收通过。
- W5A：合成存量与真实 PG 备份恢复演练完成；生产存量和生产多机恢复未执行。
- W5B：本地自动化与浏览器回归完成；全企业目录、真实独立应用及主应用边界、三端和弱网现场未执行，保持开放。
- W5C：Markdown 手册/截图任务、env 示例、企微矩阵、发布/兼容回滚操作包及证据归档完成；Word/PPT 保持既有图文版，M9 实拍未补。
- 未关闭 P0 发布条件：F1 全企业覆盖核对、F2 实际送达与主应用边界、F4 生产备份/版本/密钥恢复与兼容版本准入。未关闭 P1：F3 三端与弱网现场。期限均为生产发布前，见第 10 节。

## 3. 工作包状态

| 工作包 | 实际状态 | 证据 | 边界 |
|---|---|---|---|
| M9-W5A | 本地完成 | `m9-wave5-migration.integration.spec.ts` 5项；`scripts/m9-preflight.sql` | 合成10种存量、真实PG增量迁移/pg_dump/pg_restore；非生产演练 |
| M9-W5B | 本地完成，现场待办 | API unit171/integration153、Web277；本地浏览器与第8节矩阵 | 不把unverified/合成上游计作全量或真实送达 |
| M9-W5C | 操作与验收包已交付 | [操作包](../guides/m9-migration-release-runbook.md)、[手册](../handbook/苏南船舶管理系统操作手册.md#57-设置)、[截图清单](../handbook/2026-09-20-截图更新清单.md) | 无生产部署；既有Word/PPT未重新编排M9 |

## 4. 规格一致性与逐项证据

- [x] 需求、执行计划、backlog及当前导航按本轮条件验收状态同步。
- [x] 本 Wave 未改变 HTTP API 契约；额外校验实际 Nest Swagger、settings/reminder YAML。TypeScript 编译不冒充 OpenAPI 校验。
- [x] DB仍用实际W2/W4增量schema；仅补W2破坏性down保护，无新生产表/全局格式或权限规则重写。
- [x] 授权/停用/投递状态与既有实现一致；修正W1表格中人工角色误叠加finance的描述。
- [x] 用户管理沿用原页面布局；修复完成批次反复轮询，未重设计页面。
- [ ] 真实全目录、实际收发和设备验收未完成；不能勾选为整体功能现场验收通过。

| 编号 | 本地证据与实际核对 | 当前结论 |
|---|---|---|
| U1 | 真实PG目录集成重复同步/未登录去重；W5合成分页3成员、迁移UUID和关联不变 | 本地通过；真实目标成员总数未知，全目录未通过 |
| U2 | W5第二页持续失败显示partial/failedCount=1/unverified，保留人工空角色/空部门/disabled；W2缺失成员保留 | 本地通过；范围缩小现场未执行 |
| U3 | W5人工财务部门+shipping，经同步/OAuth/refresh保留；部门/角色独立恢复 | 本地通过；企微重授权现场未执行 |
| U4 | 显式空角色、人工空部门+旧船长职位不补crew；恢复follow+auto才恢复crew | 本地通过 |
| U5 | 同一旧JWT下一次me读取新角色；baseApi并发刷新/403清理；浏览器真实API链路 | 本地通过；跨设备旧会话现场未执行 |
| U6 | W2真实PG并发编辑409、来源旧修订号不覆盖新来源；OAuth返回保存后新身份 | 本地通过；生产并发未执行 |
| U7 | 非管理员/伪造字段拒绝；W5新服务实例模拟所有实例重载env提升/撤销；旧DB管理员标志不授权 | 本地通过；生产全实例重载未执行 |
| U8 | OAuth/me/refresh/旧JWT停用即时拒绝；env提升保留disabled、撤销后再生效，企微inactive仍拒绝管理员 | 本地通过；真实成员状态核对未执行 |
| U9 | 全量采购/自查/提醒/企业资料制度/任务/学习集成及有效身份单元；W4跨部门审批收件人、任务转移/去重；部门8基线crew不加shipping | 本地通过；真实业务范围/历史快照仍需现场抽样签核 |
| C1 | W4默认/半配置/空Secret保留/改AgentID重填/清除递增；W5默认库无配置，未复制envSecret | 本地通过 |
| C2 | W4真实Redis跨实例锁、corp/app/version/draft隔离；W5目录/OAuth与独立草稿并行 | 本地通过；真实主应用SDK/回调与独立送达未执行 |
| C3 | 错密钥/配置读取失败/invaliduser错误不回主应用；W5草稿仅选定有效人、未改保存配置 | 本地通过；上游token成功不能证明送达 |
| C4 | PG并发/配置快照/轮换，成功不重发，不确定人工核对；W5恢复后版本1→3超过曾用2 | 本地通过；生产多机/独立密钥分发未执行 |
| R1 | W5真实pre-M9迁移账本、10类角色基线、UUID/关联、down拒绝、pg_dump/pg_restore独立库与分离恢复密钥 | 本地通过；旧兼容镜像、生产数量/恢复点后变更对账未验收 |

### 旁路收敛核对

| 旧差异/组合 | 统一后结果 | 证据 |
|---|---|---|
| 部门8登录crew，提醒从shipping_dept补shipping | crew不自动获得shipping审批/消息资格；实际角色集合含all_authenticated/crew | W5显式历史基线及恢复自动角色；采购按有效角色的W4集成 |
| 人工财务部门+人工shipping | 部门财务、业务角色仅shipping，不补finance | W5 OAuth/refresh响应与独立恢复；W4采购跨部门审批/收件人 |
| 旧管理员快照 | 不能恢复env已撤销资格 | W5历史snapshot-admin基线、reminder.service单元 |
| 空角色/人工部门+旧船长职位 | 不从来源补回业务角色；基础成员保留 | W5认证集成与AuthorizationService单元 |
| 任务/船舶/学习独立参与关系 | 改平台部门不自动转移旧任务/任职；无关船员不能访问附件/打印 | self-inspection、plan-task、workbench-business全量集成；生产关系抽样未执行 |

## 5. 自动化验证

所有应用命令前置 `PATH=/opt/homebrew/opt/node@20/bin:$PATH`。日志位于仓库 `output/m9-w5/`；本地日志不含真实Secret，不作为生产审计。以下均为实际执行输出。

| 命令 | 结果 | 失败数 | 日志 |
|---|---|---:|---|
| `pnpm --filter api lint` | 通过，退出0 | 0 | `api-lint.log` |
| `pnpm --filter api test:unit --runInBand` | 31 suites / 171 tests | 0 | `api-unit.log` |
| `pnpm --filter api test:integration --runInBand` | 25 suites / 153 tests，自然退出0 | 0 | `api-integration.log` |
| `pnpm --filter api test:integration --runTestsByPath test/m9-wave5-migration.integration.spec.ts` | 5项，最终新增SQL预检与真实恢复复验通过 | 0 | `migration-recovery.log` |
| `pnpm --filter web test --maxWorkers=1` | 61 files / 277 tests | 0 | `web-test.log` |
| `pnpm --filter api build` | Nest build退出0 | 0 | `api-build.log` |
| `pnpm --filter web build` | tsc+Vite退出0 | 0 | `web-build.log` |
| `pnpm dlx @apidevtools/swagger-cli validate docs/specs/my/api/settings-api.yaml` | valid | 0 | `openapi-settings.log` |
| `pnpm dlx @apidevtools/swagger-cli validate docs/specs/my/api/certificate-reminder-api.yaml` | valid | 0 | `openapi-reminder.log` |
| `curl --fail --silent http://127.0.0.1:4319/api/docs-json > output/m9-w5/openapi-live.json`，再 `pnpm dlx @apidevtools/swagger-cli validate output/m9-w5/openapi-live.json` | 实际管理/认证/设置Controller装配的Swagger有效 | 0 | `openapi-live.log` |
| `node scripts/generate-doc-inventory.mjs` | 286个Markdown | 0 | `doc-inventory.log` |
| `node scripts/check-doc-index.mjs` | doc index ok: 286 markdown files | 0 | `doc-index.log` |
| `git diff --check` | 退出0，无空白错误 | 0 | `diff-check.log` |

全量集成在SQL预检补充前通过，后续只新增该预检演练，重跑受影响迁移专项5项通过；没有跳过失败、改弱业务断言、使用synchronize或`--forceExit`。

### 红绿证据与执行纠正

- `migration-red.log`：原W2 down在人工空角色/disabled/审计三种场景均未拒绝（3失败1通过）；保护后 `migration-green.log` 4通过，扩展真实恢复后的最终5通过。
- `web-loop-red.log`：已完成批次在1800ms再次读取，计数1→2；`web-loop-green.log` 通过。浏览器红灯4.5秒3次，绿灯0次，见 `browser-loop-red.txt`、`browser-loop-green.txt`。
- harness第一次ts-node未加载项目已有ali-oss声明，改用`--files`，未绕过类型检查；定向测试停用成员实际403，专项预期已纠正。SQL初版使用PG16不支持的`\\quit 3`，改为`ON_ERROR_STOP`+只读异常，错企业预检实际退出3。初次lint一项多余断言已移除并复跑。
- Web控制台有Ant Design弃用/静态message、React Router future开发提示；通知保存时另观察到Ant Design circular references警告，成功响应及保存/刷新/清除结果已核对，未把控制台记为零告警。首次缺OAuth参数的预期错误不计成功链路错误。现场企微控制台仍未核对。API集成存在pg并发query弃用提示及故意注入的OSS回收失败日志，最终断言通过、进程自然退出。

## 6. 权限与安全

- [x] 管理写入仍由JWT+env system_admin保护，拒绝后台提权字段；普通用户无法使用管理API。
- [x] 来源更新只写来源列，人工空值、停用与授权版本不被覆盖；已确认inactive优先于管理员。
- [x] 配置/审计/API不返回Secret或密文，未复制envSecret；wrong-key及读取错误不静默回退。
- [x] 成功去重、不确定阻断、人工重试资格和证书已确认状态按W4全量回归保留。
- [x] 本Wave无附件/打印/导出权限改动；既有参与关系回归通过，不据此扩大业务范围。
- [ ] 真实企业可见范围、生产env重载、凭据运维与真实收发待现场。

## 7. 数据与迁移

- [x] W2/W4 up/down已审阅；真实PG从迁移账本退至W2前、插入合成存量、再运行两迁移，重复runMigrations为空。
- [x] 合成10类历史登录角色逐项显式比对；未知历史lastLoginAt=NULL/loginStatus=unknown，默认follow_wecom/auto/enabled。没有用当前resolver计算期望值。
- [x] UUID不变；实际user_settings关联不变；附加的合成UUID外键和历史JSON快照不变。生产源码多为UserID文本关联，未把合成约束声称为生产FK。
- [x] preflight正常身份通过、跨企业身份退出3；全程只读，不按姓名合并/删除成员。
- [x] 真实pg_dump/pg_restore到独立恢复库后，人工撤权/disabled、密文、迁移账本、成功与不确定投递仍在。错钥报故障，独立恢复钥可解密；暂停发送时递增至高于曾用版本，原成功不再发，不确定继续阻断。
- [x] W2 down新增删除前保护；W4已有保护仍通过。没有运行忽略M9字段的旧代码；兼容版本不能证明时操作包要求暂停访问和所有推送进程。
- [ ] 无生产数据/故障库/真实密钥分发证据；未执行生产数量/关系对账、恢复点后授权与投递合并或生产停机恢复。

## 8. 前端与现场矩阵

本地浏览器使用 `m9-wave5-rehearsal.ts` 的真实 Nest Controller、鉴权、PG migration 与实际 React 页面；只将企业微信HTTP/token替换为合成transport，没有用浏览器伪造管理API响应。开发端口4173、隔离API4319只用于本轮，退出后关闭。浏览器逐项结果和截图索引见证据目录；真实企微状态如下：

| 本地浏览器链路 | 实际结果 | 证据（`output/m9-w5/`） |
|---|---|---|
| 同步完成后停止轮询 | 4.5秒内同一完成批次读取0次；仍显示同步结果与未验证范围 | `browser-loop-green.txt` |
| 人工财务部门+shipping，随后同步/重新OAuth/旧JWT读取 | 部门4、仅人工shipping业务角色保留；UUID另由真实PG集成核对 | `browser-user-before.txt`、`browser-user-chain.txt` |
| 320px恢复跟随部门及自动角色 | 恢复部门8、crew；页面scrollWidth=viewport=320 | `browser-mobile-restore.txt` |
| 草稿连接验证/定向测试 | 均201，目标仅w5-admin、AgentID2000001；配置仍env主应用v0 | `browser-notification-draft.snapshot.yml`；定向收件人另由W5集成断言 |
| 保存覆盖、留空Secret再保存、刷新 | 首次v1；第二次请求不含secret，v2且secretStored=true；刷新输入仍为空 | `browser-notification-saved.snapshot.yml`、`browser-notification-retain.txt`、`browser-notification-reload.txt` |
| 明确确认清除覆盖 | PATCH携带expectedConfigVersion=2及clearOverride=true；返回env_main/1000001/v3，清除按钮禁用 | `browser-notification-clear.txt` |
| 通知页320px/1440px布局 | 两宽度均无页面横向溢出；320px分段视口图核对固定导航和操作区 | `browser-notification-mobile.txt`、`browser-notification-reload.txt` |

上述通知发送只获得合成transport接受结果，不是企业微信实际送达。下面各现场项目仍未执行：

| 现场项 | 执行人/时间 | 设备/版本或环境 | 状态 | 发布前所需证据 |
|---|---|---|---|---|
| 主应用全企业目录（含未登录者） | 未指定 / 未执行 | 真实租户未核对 | 未执行，不算全目录通过 | 目标总人数、读取数、差异/分页、批次ID、可见范围、企微管理员签核 |
| 独立应用真实送达（证书/采购/任务） | 未指定 / 未执行 | 真实独立AgentID及可见范围未核对 | 未执行 | 每业务键/投递ID、实际应用/版本、收件人确认、失败与不确定处理 |
| 主应用OAuth/通讯录/SDK/回调边界 | 未指定 / 未执行 | 真实主应用 | 未执行 | 独立覆盖开启期间登录/目录/签名/回调记录，不能只验gettoken |
| iOS企业微信 | 未指定 / 未执行 | 型号/系统/企微版本未取得 | 未执行 | 工作台/深链、授权保持、旧会话撤权/停用、用户/消息管理、弱网录屏 |
| Android企业微信 | 未指定 / 未执行 | 型号/系统/企微版本未取得 | 未执行 | 同上，含重复点击与恢复 |
| 桌面企业微信 | 未指定 / 未执行 | 系统/企微版本未取得 | 未执行 | 同上，跨页缓存刷新与文件入口 |
| 生产存量/多实例env与密钥恢复 | 未指定 / 未执行 | 无生产快照/恢复库 | 未执行 | 备份校验、版本高水位、撤权/去重对账、恢复与实例重载记录 |
| 旧兼容代码/维护窗口恢复 | 未指定 / 未执行 | 没有已签核候选镜像 | 未执行 | 同时支持新授权/通知/加密/投递；否则所有访问与推送暂停证明 |

浏览器320px/1440px只验证本地页面布局；不能替代上述三个企业微信客户端。完整设备场景见 [企微回归矩阵](../specs/wecom/real-device-regression-matrix.md)。

## 9. 证据索引

### 规格与操作

- [需求](../requirements/M9-平台管理与配置升级.md)、[执行计划](../plans/M9-execplans.md)、[backlog](../plans/M9-wave-backlog.md)。
- [M9迁移发布回滚包](../guides/m9-migration-release-runbook.md)、[企微配置矩阵](../specs/wecom/production-config-matrix.md)、[手册/截图清单](../handbook/2026-09-20-截图更新清单.md)。

### 代码与测试

- `apps/api/src/database/migrations/1710000027000-m9-wave2-user-directory.ts`、`scripts/m9-preflight.sql`。
- `apps/api/test/m9-wave5-migration.integration.spec.ts`、`m9-wave5-acceptance.integration.spec.ts`、`m9-wave5-rehearsal.ts`（仅测试，不进入生产build）。
- `apps/web/src/features/settings/UserManagementPage.tsx`、`UserManagementPage.test.tsx`；既有W2/W4/领域集成与身份/前端baseApi测试。

### 运行、截图与归档

- 本轮命令日志、红绿记录、实际Swagger与SHA-256清单：`output/m9-w5/verification.json`；原始日志在同目录。`acceptance-initial-expectation.log`为已纠正403/422预期前的诊断失败，不能当作最终通过证据。
- 浏览器截图位于`output/playwright/`：`m9-w5-user-preview-1440.png`（授权预览）、`m9-w5-user-detail-1440.png`（保存结果/审计）、`m9-w5-users-320.png`（目录范围/列表）、`m9-w5-user-edit-320.png`（实际为移动详情抽屉）、`m9-w5-notification-1440.png`（保存覆盖）、`m9-w5-notification-cleared-1440.png`（清除后）、`m9-w5-settings-top-320.png`与`m9-w5-notification-cleared-320.png`（移动分段视口）。全页截图中的固定导航位置可能受截取时滚动影响，移动视觉结论以分段视口图为准；这些合成截图不充当手册现场实拍。
- W1-W4原证据按各验收索引保留，W3的当时PG环境阻断本轮已由真实全量门禁补证；不把历史未执行项倒填成当时已执行。
- 本轮未产生生产备份文件或记录真实密钥；合成pg_dump仅在一次性Testcontainers容器内，测试结束销毁。

## 10. 缺陷与后续

| 编号 | 级别 | 描述 | 责任 | 期限 | 状态 |
|---|---|---|---|---|---|
| W5-D1 | P0回滚风险 | W2 down会删除人工设置/停用/审计 | 开发 | 2026-11-17 | 已修复，真实PG红绿通过 |
| W5-D2 | P1请求循环 | 完成批次持续重启轮询 | 开发 | 2026-11-17 | 已修复，组件+浏览器红绿通过 |
| W5-F1 | P0发布条件 | 全企业目标成员及未登录成员覆盖未签核 | 企微管理员/QA | 生产发布前 | 未执行 |
| W5-F2 | P0发布条件 | 独立通知实际收发与主应用SDK/回调/OAuth现场未完成 | QA/企微管理员 | 生产发布前 | 未执行 |
| W5-F3 | P1现场条件 | iOS/Android/桌面、弱网及跨页身份现场 | QA | 生产发布前 | 未执行 |
| W5-F4 | P0发布条件 | 生产存量/备份/新旧密钥/多机重载/兼容候选与高水位恢复 | 运维/开发 | 生产发布前 | 未执行 |
| W5-F5 | P1培训材料 | M9实拍与Word/PPT图文更新 | 文档/QA | M9培训发布前 | 未执行，Markdown已说明 |

## 11. 复核签字

- 实施：Codex（仅本地代码、演练与文档）。
- 产品：未签署。
- QA：未签署真实租户/设备验收。
- 运维：未签署生产迁移、密钥、兼容恢复与发布验收。
