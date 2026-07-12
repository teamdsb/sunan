---
status: operations
owner: planning
updated: 2026-07-11
replaces: []
replaced_by: []
---
# 发现与决策

## 需求
- 用户要求阅读仓库文档，规划如何将 M7/M8 推迟到后面。
- 用户要求规划 9 类已发现问题的修复文档。
- 用户要求文档符合仓库标准与格式。
- 用户要求完成每一 M 的 wave 提示词。
- 用户明确“规划好即可”，本轮不实现业务代码。
- 用户最新确认：M1-M6 的修复作为新的 M7，之前的 M7/M8 延后。

## 研究发现
- 仓库没有既有 `task_plan.md`、`findings.md`、`progress.md`。
- `docs/` 已存在当前计划入口：`docs/execplans.md`、`docs/plans/README.md`、`docs/prompts/README.md`。
- M7/M8 当前已有计划与 prompt：`docs/plans/M7-execplans.md`、`docs/plans/M8-execplans.md`、`docs/prompts/m7/`、`docs/prompts/m8/`。
- `docs/execplans.md` 原先写明“M7 为当前待实施里程碑，M8 仅在 M7 总体验收通过后启动”；用户确认后已改为“新 M7 修复优先，原 M7/M8 后移为 M8/M9”。
- `docs/plans/README.md` 原先只索引 M7/M8 当前路线；新增新 M7 修复计划后必须更新此入口。
- `docs/prompts/README.md` 原先标题和内容只覆盖 M7/M8；已扩展为“当前修复与后续升级 Wave 提示词索引”。
- `scripts/check-doc-index.mjs` 固定允许状态值；不能新增 `deferred` 状态。
- 已将当前修复执行计划重排为 `docs/plans/M7-execplans.md` 和 `docs/plans/M7-wave-backlog.md`。
- 已将六份修复提示词移动到 `docs/prompts/m7/`，作为新 M7 Wave 1-6。
- 原 M7 安全管理底座已后移为 M8：需求、执行计划、backlog、提示词目录均使用 M8。
- 原 M8 专业安全深化已后移为 M9：需求、执行计划、backlog、提示词目录均使用 M9。
- `docs/execplans.md`、`docs/plans/README.md`、`docs/prompts/README.md` 已切换为新 M7 当前优先。

## 技术决策
| 决策 | 理由 |
|------|------|
| 用新 M7 承接用户列出的问题 | 问题集中在我的、办事、采购、工作台、文件上传与导航，属于上线体验与导航修复 |
| 将 `docs/execplans.md` 作为重排主入口 | 这是仓库明确的当前执行计划入口，最能避免 Agent 误启动后移的 M8/M9 |
| 将原 M7/M8 后移为 M8/M9 | 符合用户最新命名意图，避免两个 M7 并存 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 原 M7/M8 与新 M7 命名冲突 | 将原 M7/M8 整体后移为 M8/M9 |
| 根目录规划文件缺 YAML 头会破坏文档索引校验 | 已补 `status/owner/updated/replaces/replaced_by` |
| 默认 PATH 中找不到 `node` | 使用 Codex bundled Node：`/Users/yuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` |

## 资源
- `AGENTS.md`
- `docs/README.md`
- `docs/inventory.md`
- `docs/execplans.md`
- `docs/plans/README.md`
- `docs/prompts/README.md`

## 2026-07-10：M7 审计与 M8/M9 修复需求
- 当前 `docs/execplans.md` 明确：M7 Wave 1-6 已完成本地最终门禁；M8 规划已建立、等待重新排期；M9 仍依赖 M8 总体验收。
- `docs/prompts/README.md` 索引 M8 七个 Wave 和 M9 八个 Wave 的提示词；是否每个文件实际存在、内容是否覆盖用户新报问题，仍待核实。
- 用户报告的缺口：采购见面进入“采购执行清单”的详情页后，已上传附件只有继续添加入口，没有删除能力。用户要求将修复纳入 M8/M9 升级，而非在本轮直接改业务代码。
- “M7 已全部实现”不能仅据计划自述下结论；需核对六个 Wave 验收记录、对应代码/测试与工作树状态，区分本地门禁、完整回归与生产验收。
- 初步范围对照：M7 Wave 3 的计划与提示词要求“附件绑定、预览、下载、权限回归”和视觉优化，未把“删除已绑定附件”写为验收项；这解释了该能力未被 M7 既有验收明确覆盖。
- M8 已有最贴近的承载点：`M8-W3A-1`（通用附件组件）在 backlog 中已写“选择、上传、进度、预览、删除”，而 Wave 3 提示词正文尚未明确采购执行清单详情页必须接入、已绑定附件必须可删除。因此更可能是 M8 Wave 3 的范围细化/回归缺口，而不是需要推迟到 M9。
- M7 的六份验收材料均为“有条件通过”，而 Wave 6 明确其结论是：无已知 P0/P1、仅余企业微信 iOS/Android/桌面真机截图或录屏 P2；该 P2 不阻断 M8 重新排期，但阻断生产发布前的最终截图包。
- M7 Wave 3 自动化记录覆盖采购附件上传、绑定、预览、下载及下载权限；验收记录没有删除附件的测试、API 或 UI 证据。用户新发现的行为因此不能被表述为“已通过的 M7 功能回归”，而是 M7 原范围外的真实缺口。
- 所以对“ M7 是否全部实现”的准确结论只能是：M7 **计划内的 P0/P1 已按本地自动化门禁实现并有条件验收**；但尚无企业微信真机生产证据，且新报的附件删除能力未被 M7 需求覆盖，不能笼统称为“全部完成”。
- 代码核对证实该缺口真实存在：采购后端只有附件绑定 `POST /procurement/orders/:id/attachments` 与受采购单权限保护的下载 URL `GET .../attachments/:fileId/download-url`，没有解除关联的 `DELETE` 路由；详情页也只渲染预览和下载按钮。因此必须补“解除采购单—文件关联”的受权接口、UI 删除/确认/刷新行为和 API/Web 集成回归，不能直接删除 OSS 文件或全局 `files` 元数据。
- M8 全部 7 个 Wave 提示词均存在，内容齐全且有前置条件、工作包、验证/验收要求。M8 Wave 3 正文已有“证据替换、删除和归档必须审计”，但限定为工作平台全模块；应显式扩展为复用既有采购单附件详情，并指定解除关联语义与回归测试。
- M9 全部 8 个 Wave 提示词也均存在，且 M9 Wave 1 要求先回归 M8 的证据能力。附件删除缺口不应放入 M9：M9 是 M8 验收后的专业业务深化，若把该通用底座缺口推到 M9，会违反 M9 必须复用已验收 M8 证据服务的前置。
- 当前终端默认 `PATH` 未配置 Node，首次 M7 验证命令均在启动前以 `env: node: No such file or directory` 失败；已从工作区依赖发现可用 Node/Pnpm 绝对路径，待以该运行时重跑。此错误不代表代码或测试失败。
- 第二次使用 bundled Node/Pnpm 重跑时，PnPM 因现有 `node_modules` 与运行时不匹配，试图自动执行 install 并在无 TTY 下以 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 退出；为避免删除或重装用户依赖，未设置 `CI=true` 强行继续。因此本轮不能把当前分支测试/构建标为已通过。`node scripts/check-doc-index.mjs` 已在 bundled Node 下通过（227 份 Markdown）。
- 修复方案必须采用“解除采购单与文件的关联（unlink）”而不是删除 OSS 对象或全局 `files` 元数据：同一文件可被其他业务引用，且 M8 的证据不可静默删除要求需要审计删除人、时间、原因和关联对象。删除权限应复用采购草稿编辑权限；已提交/审批记录不得无审计地移除证据。
- 用户于 2026-07-10 确认已完成 M7 真机验证并授权 M7 结束归档。Wave 6 验收已据此从“有条件通过”更新为“通过”；未虚构设备型号、版本或截图索引。
- M7 执行计划、backlog 和六份 Wave 提示词已迁入 `docs/archive/execplans/`、`docs/archive/backlogs/common/`、`docs/archive/prompts/m7/`，当前入口切换至 M8 Wave 1。
- 用户已批准推荐方案：M8 Wave 3 实施采购附件受审计解除关联，M9 Wave 1 回归该基线。已同步需求、路线图、M8/M9 执行计划/backlog、M8 Wave 3 与 M9 Wave 1 提示词、safety README 和索引。

## 2026-07-10：M8 Wave 1 文档冻结
- 本 Wave 已由用户定义为“安全管理底座的文档、架构、术语、规格目录和验收门禁”，不实现业务代码。
- 必须以需求、路线图、执行计划、backlog、平台功能对比建议、通用规格、工作平台规格与 safety 入口为真源；关键现状判断须以代码、接口或测试文件为证。
- 范围边界已明确：不新增第五个一级导航；不接外部监管、AIS、CCTV；不建设小程序；不得创建未评审的生产表、Controller、页面或占位接口。
- M8 需求、路线图、执行计划和 backlog 一致要求：Wave 1 冻结边界、术语、状态、规格清单、测试/迁移/验收/提示词门禁；Wave 2-7 的实现必须顺序受 Wave 验收约束。
- `docs/specs/safety/README.md` 已列出 Wave 2-6 的预期 API/DB/state/UI 文件名，但 Wave 1 两份文档尚为“待编写”；当前目录不能被表述为已评审实现规格。
- 通用 API 规格必须使用 `/api/v1`、复数资源、统一 `data` 响应、标准错误与软删除语义；DB 规格必须冻结 UUID、审计列、软删除、FK、索引、up/down migration 与 PostgreSQL testcontainers 验证约束。
- 代码差距基线已确认：四个一级导航由 `AppShell.tsx` 固定；工作平台的通用记录/步骤/附件已由 `WorkbenchController` 和三张 `workbench_record*` 实体承载；采购附件仅有绑定与下载接口，详情页与测试均没有删除操作；文件服务已有采购和工作平台分类测试。
- 已将任务唯一完成状态冻结为 `completed`，并同步修正 M8 backlog 中的 `done`，避免状态词典冲突。

## 2026-07-10：M8 Wave 2 启动
- Wave 1 验收证据 `docs/archive/acceptance/safety/acceptance-m8-wave1.md` 存在且状态为“通过”，无 P0/P1 blocker；Wave 2 前置满足。
- Wave 2 的首个实现范围限定为既有工作平台记录的记录级授权、步骤参与人、多人完成、状态动作和审计，不提前实现 Wave 3 证据模型或 Wave 5/6 的独立任务、检查、CAPA 实体。
- 测试运行环境根因已确认：默认 PATH 无 Node；bundled Node 为 v24，但项目声明 Node 20.x，pnpm 因现有 `node_modules` 的运行时/链接状态尝试清理并在非交互环境以 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 终止。未强制重装，以免破坏用户本地依赖；尚未进入 Jest 断言阶段。
- 直接使用现有 `apps/api/node_modules/.bin/jest` 规避 pnpm 后，TypeScript 编译问题已修正并可加载测试；实际 PostgreSQL 集成测试被 `Could not find a working container runtime strategy` 阻断。根因是本机缺少 Docker/testcontainers runtime，不是测试断言失败。

## 视觉/浏览器发现
- 未使用浏览器或视觉工具。

## 2026-07-12：M8 Wave 6 检查、问题与 CAPA
- Wave 5 已由提交 `5e36c10` 完成；`safety_tasks` 可复用参与人、完成规则、生成幂等、对账和统一待办能力。
- 四类存量来源为 `goa_safety_hazard`、`shipping_self_inspection`、`shipping_vessel_inspection` 与 `shipping_maritime_safety_check`；均属通用 `inspection_rectification` 工作平台记录，Wave 6 必须保留原记录并建立双向链接。
- 已冻结术语规定：不符合项是 `issue_type=nonconformity`，不新增平行不符合表；CAPA、措施和验证维持独立结构化生命周期。
- 用户确认采用独立安全领域对象方案：检查任务保存模板版本快照；按 `all/any/quorum` 汇总；按检查任务和检查项快照生成稳定幂等问题；CAPA 关闭需措施、证据、验证和有效性评价，重大问题限制关闭角色。
- 根目录规划文件本为历史追踪文件。误写入后已用 Git index 原文恢复，后续仅追加本 Wave 记录。

## 2026-07-12：M8 Wave 7 前置审计
- 当前 HEAD 为 `1793702 M8 Wave6完成`，工作树开始时干净。
- `docs/archive/acceptance/safety/` 仅存在 Wave 1-5 验收文档，没有 Wave 6 实际验收文档；Wave 7 的“Wave 1-6 均有通过文档”前置尚未满足。
- `docs/plans/M8-execplans.md` 仍将 `M8-W6A/B/C` 标为未完成，与 Wave 6 完成提交和自动化记录不一致。
- Wave 6 有设计文档、代码、迁移、测试和前序执行记录，但不能因此直接伪造验收结论；需基于新鲜门禁证据补齐 Wave 6 验收文件。
- Wave 3 验收记录已包含用户确认的 iOS/Android 拍照、定位、签名和预览真机结果，但 Wave 7 要求的完整主链路及桌面端回归尚无本轮实际证据，不得写为通过。
- 最终自审发现并修正两个数据保护问题：重放不再更新首次 `issue_sources.source_snapshot`；`legacyReadOnly=true` 来源由 PostgreSQL trigger 拒绝 UPDATE/DELETE，批次回滚删除链接后恢复可写。
- 回滚安全边界补强：存在 CAPA、额外来源或问题动作审计时保留目标问题，不强删。
- 最终完整门禁：API unit 79、API integration 78、Web 238，合计 395 项全通过；API lint、API/Web build、21 份 OpenAPI、267 份 Markdown 索引与 `git diff --check` 全通过。
- 当前无未关闭 P0/P1 代码缺陷，但存在两个 P0 上线门禁（非代码缺陷）：企微三平台真机未执行；生产存量/备份恢复未执行。

## 2026-07-12：M8 最终功能核查与归档口径调整
- 用户明确撤销三端真机、生产存量和生产恢复作为本次 M8 归档阻断项；三端真机将在任务后由用户自行执行。本决策只改变验收范围，不把未执行项改写为通过。
- 按 M8 八项成功标准逐条核查了实际后端模块、前端懒加载路由、OpenAPI、PostgreSQL migration 和测试：ABAC/动作隔离、统一附件/PDF/导出、主数据、计划任务/待办/日历、检查转问题、CAPA 验证关闭和企微消息深链均有实现与自动化证据。
- M8 Wave 1-7 均可按修订口径通过；未关闭 P0/P1 代码缺陷为 0。独立核查记录为 `docs/archive/audits/M8-最终功能实现核查.md`。
- M8 计划、backlog、提示词已迁入 `docs/archive/execplans/`、`docs/archive/backlogs/safety/`、`docs/archive/prompts/m8/`；M8 需求改为历史归档，safety 规格继续作为当前实现基线。
- M9 没有开始任何 Wave，已作为 `conditional-baseline` 独立封存在 `docs/archive/paused/m9/`；M8 通过不会自动触发 M9。
- 归档后最终新鲜门禁全部通过：API unit 79、API integration 78、Web 238，合计 395 项、失败 0；API lint、双端 build、21/21 OpenAPI、269 份 Markdown 索引和 `git diff --check` 均通过。

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*

## 2026-07-11：M8 Wave 5 启动记录
- 用户要求实施可复用计划任务中心、统一待办、真实日历与企业微信任务消息，明确 Wave 4 主数据已经验收。
- 当前工作树干净，最新提交为 `dfd83de M8 Wave4完成`；现有根目录规划文件仍停留在 Wave 2，需要以本 Wave 的验收目标重置当前阶段，但保留历史记录。
- 按仓库规则，后续必须先阅读 M8 需求、执行计划、backlog、Wave 5 prompt、通知/企业微信/前端体验规格、Wave 2 权限规格、Wave 4 主数据规格和安全领域入口，再冻结本 Wave 规格并按 TDD 进入实现。
- Wave 5 的硬性边界已确认：任务是后续安全领域的统一执行入口；计划/任务必须有稳定幂等键、失败补偿、审计和 PostgreSQL 级唯一约束；待办、日历和计划完成率必须由同一任务真源派生；企业微信应用消息只作提醒，不作为任务状态真源。
- 既有通知规格只覆盖证书/合同到期，企业微信消息规格已明确失败对象、`42001` 刷新后重试一次、网络至多重试三次和频率限流降速；Wave 5 需要在这份真源规格中补充任务消息的去重键、深链和发送审计。
- 企业微信 H5 页面必须支持从工作台或消息直达，OAuth 恢复后保留目标任务 URL；安全领域不得新增第五个一级导航。
- Wave 2 的授权模型可直接复用到新任务：读取需通过 ABAC，动作还需通过当前责任/参与、状态、有效代理与职责隔离；前端只能使用后端返回的可用动作，且转移必须留存原责任、新责任、原因、操作人和时间。
- Wave 4 提供可授权的船舶、人员与有效任职选择器；新计划/任务不应要求输入 UUID，已停用对象不能用于新计划。
- 代码检索确认现有系统已有证书提醒的扫描、消息发送锁与 upsert 幂等实现，以及企业微信消息服务；Wave 5 应抽取通用任务消息与任务生成机制，而不是让日历或待办继续依赖提醒模块的证书专用模型。
- 路由现有懒加载与 `backTo` 安全回跳模式；Wave 5 任务详情深链可沿用相同的本地安全回跳/认证恢复模式。
- 用户已在布局对比中选择 A：任务中心以待办为主，`待办 / 我发起 / 我参与 / 已完成 / 逾期` 是统一数据范围标签，列表与日历仅为同一真实任务筛选的双视图；移动端默认列表，用户主动切换日历。
- 用户确认计划负责人可直接创建/启用，系统管理员才可跨数据范围启用或取消；Wave 5 不增加独立计划审批流。
- OAuth 前端已有 `sunan_post_auth_redirect` 的安全本地路径保存与回调消费机制，可由任务详情路由直接复用，满足消息落地页认证恢复后回到目标任务的实现基础。
- `WecomMessageService` 已封装文本卡片、`42001` 强制刷新 token、网络超时三次尝试和无效接收人结果；Wave 5 需要补上持久化出站任务消息记录、业务去重键、重试计划和对账，而不是在服务内存中判断重复。
- TypeORM 显式维护实体与 migration 注册，Wave 5 必须同步新增实体、module `forFeature` 注册、迁移类和 config imports；当前迁移序号最后为 `1710000018000`。
- 工作平台主页和 API 是独立的既有记录中心，不能作为计划任务真源；Wave 5 应建设独立 `plan-task` 领域模块，只在工作平台入口与路由层集成。证书提醒引擎的唯一键/发送锁模式可作为 generator/message 可靠性实现的参考。
- 用户已审阅并授权继续执行 Wave 5 设计。`writing-plans` 专用 skill 不在当前可用技能列表，已用本仓库已启用的 `planning-with-files-zh` 持久化计划作为等价实现计划；此替代不改变已确认的 SDD/TDD 顺序。
- W5.1 已将计划、计划项、任务、参与人、不可变动作/转移/代理、生成运行/条目和逐接收人消息投递的契约冻结为独立安全领域规格；日历明确复用 `GET /tasks` 的真实任务数据，不存在独立静态排程接口。

## W5.1 规格编辑错误

| 错误 | 尝试次数 | 根因与解决方案 |
|---|---:|---|
| `apply_patch` 上下文校验失败 | 3 | API schema 中 `TaskCountSummary` 定义位于 `Task` schema 前，第一次原子补丁假定相反顺序；后两次依赖了前序失败后并不存在的日志。三次均在写入前拒绝；已改为按稳定文件锚点逐文件更新，并以最小补丁新增 `DeliveryCountSummary`。 |

## 2026-07-11：W5 实现验证
- `task-domain.spec.ts` 覆盖月末、闰年、稳定 key、逾期精确边界和改期/取消/转移规则，红灯为模块不存在，补齐领域实现后通过。
- `plan-task.integration.spec.ts` 在 PostgreSQL testcontainers 下通过并发生成唯一性和转移后旧责任人 403；最终以 `--detectOpenHandles --runInBand` 稳定退出，未再报告句柄泄漏。
- Wave 5 最终使用 `safety_tasks.generation_key` 作为数据库并发闸门，每次 generation run 以 `(run_id,generation_key)` 记录 created/skipped；两个并发运行累计只创建 1 个任务。
- 每日 00:05（Asia/Shanghai）调度年度/月度/周期/单次生成、逾期升级和失败投递重试；同日升级使用稳定周期键去重。
- 完整 Web 测试中的 React Router future flag 与未连接 Form 告警已清零；API lint 同时收口 Wave 4 遗留的严格类型错误，并在采购 Wave 4 集成测试中隔离真实 OSS 网络请求。
- 2026-07-11 复核显示：`--detectOpenHandles --runInBand` 可稳定结束且未报告句柄；原警告没有可复现的句柄证据。
- 规格—实现差距根因是前序只建立垂直切片：缺生成运行表、转移/代理实体、参与人完成进度、DTO/idempotency、完整 ABAC、投递对账 worker、计划项 UI 和 OAuth 目标任务回归；现有 Controller 也缺 OpenAPI 中的 PATCH/GET items、run list、delivery retry 等契约覆盖。
- 当前 `PlanManagementPage` 只建计划不建计划项；`TaskDetailPage` 对所有动作使用固定原因且没有改期/转移/代理参数，不能满足验收。
