---
status: operations
owner: planning
updated: 2026-07-10
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

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
