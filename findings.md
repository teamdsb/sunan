---
status: operations
owner: planning
updated: 2026-07-14
replaces: []
replaced_by: []
---
# 发现与决策

## 2026-07-14：苏南操作手册全面更新
- 用户要求阅读分析整个项目，全面、详细更新 `docs/handbook` 下的苏南操作手册。
- 本轮以当前需求、当前规格和 `apps/web/src` 实际路由/页面为证据；归档计划只作历史参考，暂停的 M9 不写成现有功能。
- `docs/handbook` 当前有 4 份文档，主更新目标为 `docs/handbook/苏南船舶管理系统操作手册.md`；M8 培训材料和平台对比文档作为补充输入，不替代当前实现核验。
- 当前生产版本证据为 `0.0.4`；企业微信是主要运行容器，手册应优先说明工作台直达、OAuth 恢复和移动端短任务流程，而不是假定用户总从 `/my` 开始。
- 主手册当前为 859 行，已覆盖四大板块和安全主链概览，但安全管理只有概览，没有按实际专用页面说明安全主数据、计划、任务、检查模板/计划、检查执行、问题、CAPA、独立验证和返工。
- 当前前端路由还包含采购预算、报表申请详情、任务详情、计划详情、检查模板、检查计划、检查列表/详情、问题列表/详情等入口，主手册需要补齐。
- 参考平台 PC/小程序手册为 4749 行且标记 `audit-snapshot`，不能作为苏南现状直接照录；可用来检查业务术语和训练场景，但每项操作必须由当前规格与代码证实。
- 主手册应继续集中维护在一个可搜索文件中，并增加角色化快速上手、入口地图、统一交互、逐模块操作、状态/权限矩阵、移动现场、管理员排障、FAQ、合规和截图验收清单。
- 采购当前默认走系统内审批；企业微信原生审批字段为预留能力，不能在主流程中写成已经启用。采购单状态为草稿、已提交、部门通过、终审通过、已驳回；报表审批增加财务通过节点。
- 采购详情支持上传绑定、下载和解除附件关联；解除必须填写原因，操作只解除业务关联、不删除原文件。采购还包含近 3 年查询边界、年度预算管理、预算审计和报表审批单参数/汇总快照。
- 安全主数据 H5 当前提供船舶/人员/设备类型切换、受控搜索选择器和有效档案查看，页面未提供普通用户直接新建/编辑按钮；治理能力不能写成当前 H5 的普通操作。
- 检查模板 H5 当前创建包含一个首检查项的草稿；可见列表只展示是否已有当前版本，页面没有发布按钮。检查计划使用已发布模板版本，要求负责人、可选协作检查人、首次检查时间，当前页面按一次性、全部完成、60 分钟时限创建。
- 任务中心范围固定为待办、我发起、我参与、已完成、逾期；列表/日历来自同一任务查询。日历按 Asia/Shanghai 分月，日期格最多直显两个任务，更多任务显示数量标签。
- 任务详情仅渲染后端 `availableActions`：开始/完成直接执行；阻塞、改期、取消、催办、升级、代理、转移必须在弹窗填写原因，其中改期填新计划/截止时间，代理填代理人和有效期，转移填新负责人。详情还显示企业微信消息投递、失败重试、参与人、转移/代理记录和动作时间线。
- 通用安全计划支持年度、月度、周期和单次；计划项字段为任务名称、负责人、可选参与人、首次执行时间、月度日期/周期天数、all/any/quorum 完成规则和办理时限。计划草稿至少有计划项后才能启用；暂停不取消历史任务，退役不可恢复。
- 现场检查按固定模板版本逐项填写符合/不符合/不适用、说明和按规则要求的证据；每名参与人独立保存并上传签名后提交，只有出现 `summarize` 动作且完成门槛满足时才能汇总。
- 问题/CAPA 当前页面覆盖来源回链、等级/状态、指定独立验证人、五问法根因、纠正/预防措施、责任人和期限、完成说明+至少一份证据、措施接受、提交验证、验证通过/返工、验证关闭。关闭必须满足根因、纠正与预防措施、全部必要措施已接受、独立验证通过和有效性评价等门槛。
- 现手册把“企业资料”误写成公司统一社会信用代码/联系人主档；实际页面的资料条目只分资质/公告，新建字段为标题和分类，详情维护标题、分类、草稿/已发布/已归档、描述和附件，并支持删除。
- 企业制度新建字段为制度标题、制度编码、版本；列表支持关键字/状态筛选和发布，详情维护标题、草稿/已发布/已废弃、摘要、附件，并显示版本历史。
- 电子证照支持船舶、车辆、人员、设备四类持有对象；新增使用受控持有对象和证照类型，字段含标题、编号、签发日、到期日、提前提醒天数、签发机构、状态、备注和附件。详情页当前只编辑标题、到期日、状态和新增附件。
- 提醒看板分待处理、已逾期、已确认，支持按对象/证书类型汇总与列表筛选；有权限人员可触发异步手动扫描，接收人或管理角色可确认提醒。设置的提醒视图、证照分组和推送开关改动后自动保存，失败会回滚。
- 船舶监控管理页实际新增字段为船舶 ID、监控名称、监控地址；普通用户仅见启用入口，管理角色可见全部并新增，当前 H5 没有编辑/停用操作按钮。
- 文件限制：证照 PDF/JPG/PNG/JPEG 20MB；制度 PDF/DOC/DOCX 50MB；采购附件 PDF/JPG/PNG/DOC/DOCX/XLS/XLSX 20MB；检查照片 JPG/PNG/JPEG 10MB；通用附件同采购附件 20MB。预览依赖企业微信 JS-SDK，下载 URL 有效期短，不应长期转发。
- 主手册已重构为 1929 行、16 章，新增当前版本/边界、角色与职责隔离、路由地图、通用状态/上传/审批/导出、逐模块操作、安全专用闭环、移动现场、角色速查、管理员巡检、18 类 FAQ 和 64 项截图清单。
- 自检确认主手册不存在重复标题或 TODO/TBD；M9、小程序、mock、模板发布按钮、采购附件时机等只出现在明确的范围边界或风险说明中。
- `docs/README.md` 已有“苏南平台操作手册”当前入口，不需要新增导航文件；后续只需更新该索引日期/说明（如必要）并重新生成 inventory。
- 二次代码复核确认工作平台首页固定入口只有考勤统计、审批看板和既有模块卡片；安全主数据/计划/任务/模板/检查/问题路由存在但没有全部加入侧栏或首页按钮。手册已改为说明企业微信独立工作台深链、任务消息、来源回链、检查计划链接或管理员配置入口。
- 采购审批的 `return` 回到 `draft`，可编辑并因保留既有提交时间显示“重新提交”；`reject` 进入只读 `rejected`。采购单和报表详情的 PDF 按钮对有读取权限的当前状态可用，只有终审通过后的版本应作为正式归档件。
- README 导航已使用带版本日期的显示标签，稳定校验点应是 Markdown 链接目标 `handbook/苏南船舶管理系统操作手册.md`，不应把可变的显示文字写死在正则中。

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

## 2026-07-12：新版本生产发布
- 用户已明确授权读取部署文档、重建相关文件或 Docker 镜像并上线新版本平台。
- 用户要求同步处理全局版本号，给出的版本口径是 `0.0.4`，且明确不涉及前端页面中的版本展示；需先核对仓库版本真源和现有值，再判断这是目标值还是已存在值。
- 当前分支为 `main`，跟踪 `origin/main`；开始时仅发现 `.superpowers/brainstorm/97677-1783745506/` 下 4 个既有删除项，视为用户已有变更，本次发布不得恢复、覆盖或纳入版本调整。
- 下一步以仓库部署/runbook 文档和实际脚本为准确认发布目标、镜像策略、生产数据库迁移/备份、回滚和验收流程。
- `deploy/deployment-runbook.md` 明确当前生产交付方式不是推送镜像归档，而是把排除本地环境文件/构建产物的源码同步到 `39.106.103.45:/dev/sunan/sunan-source/current`，再由 `/dev/sunan/deploy/docker-compose.yml` 在服务器原地 `up -d --build`。
- 生产域名为 `https://app.qzssncb.com` 与 `https://api.qzssncb.com`；部署前后至少检查 Compose 服务状态、`/api/health`、`/api/health/ready` 和 Web 响应头。
- `deploy/docker-compose.yml`、`deploy/docker-compose.prod.yml` 及 `deploy/.env.example` 当前版本默认值均为 `0.0.3`；因此用户所说“现在版本号是 0.0.4”与仓库状态结合后可明确解释为本次目标版本 `0.0.4`，无需再询问是否升级到 `0.0.5`。
- 架构与企业微信切换文档要求 migration 前完成生产 PostgreSQL 备份；标准同步/构建手册本身没有执行备份命令。本次必须在生产重建前补做可验证备份并记录回滚源，不可只照抄 `up -d --build`。
- Compose 中 API 容器启动命令会自动执行 schema migration 和幂等 seed；新安全领域还存在独立存量迁移 CLI，需在上线前核对生产来源数量并决定是否执行 `classify/run/verify`，不能把 schema migration 与存量业务迁移混为一谈。
- 生产 Compose 使用固定容器名和版本化 API/Web/Nginx 镜像标签；持久化 PostgreSQL、Redis、OSS、日志、证书和企业微信 IP 列表均挂载在 `/dev/sunan/`，源码轮换不会覆盖这些数据卷。
- 全仓产品版本真源共有 6 个受控文件：根 `package.json`、`apps/api/package.json`、`apps/web/package.json`、当前生产 `deploy/docker-compose.yml`、对照快照 `deploy/docker-compose.prod.yml` 和 `deploy/.env.example`；这些位置均仍是 `0.0.3`。`pnpm-lock.yaml` 不记录 workspace 自身版本，现有 `package-lock.json` 的根 package 条目也没有 version 字段，因此不应机械改锁文件。
- Dockerfile 不直接写产品版本；Compose 通过 `SUNAN_VERSION` 同时控制 API/Web/Nginx 镜像 tag 与 OCI version label。前端源码中没有产品版本展示绑定，本次只改 package metadata/部署 metadata，符合“不涉及前端页面版本显示”。
- `deploy/README.md` 声明 `deploy/docker-compose.yml` 是服务器当前真源，`docker-compose.prod.yml` 只是早期快照；发布时必须同步当前 Compose，不能让服务器继续保留 `0.0.3` 默认标签。
- 备份手册给出可验证的 PostgreSQL `pg_dump -Fc` 和 `pg_restore --list`，并建议同时备份生产配置与 Redis AOF；发布手册会自动轮换源码备份。API 容器启动前迁移，因此数据库备份必须先于 `docker compose up`。
- Git 历史提交 `4752c84` 是上一轮 `0.0.2 → 0.0.3` 的全局发布升级，精确联动 11 个文件；本次按同一已验证边界升级为 `0.0.4`，避免遗漏后端默认值、测试期望、环境模板和运维清单。
- 本机 Node 为 v24.18.0（高于仓库声明的 Node 20.x），pnpm 10.33.0、Docker 29.6.1、Compose 5.2.0 和 Docker daemon 均可用；实际镜像构建由 Dockerfile 固定使用 Node 20，发布构建不会依赖宿主 Node 24。
- `git diff --check` 与产品版本残留扫描通过；唯一命中的 `0.0.3` 是依赖 `@nestjs/passport` 的包版本，不是平台版本。
- 本地 `docker compose config --quiet` 因 Compose 中生产绝对路径 `/dev/sunan/deploy/.env` 不存在而拒绝，属于校验环境缺失而非 YAML 解析失败；不能为方便校验把真实生产 `.env` 复制回本地，应在远端用真实路径复验。
- 版本更新后的完整本地测试门禁已新鲜通过：Web 61 files / 238 tests、API unit 16 suites / 79 tests、API PostgreSQL testcontainers integration 18 suites / 78 tests，合计 395 tests、失败 0。
- `pnpm build` 已完成 Web 与 API 生产构建，`pnpm lint` 已完成 API 全量 ESLint，均退出 0；Web 产物维持按路由拆分的独立 chunk。
- 当前共有 21 份 OpenAPI YAML；发布门禁要求全部验证。文档索引生成/检查和 `git diff --check` 也需要在版本文档修改后重新执行。
- 安全存量迁移 CLI 的 `classify` 为只读分类；`run <request-id>` 创建可重放批次并返回/复用批次对账；`verify <batch-id>` 需要实际 batch UUID。生产 runbook 要求在 schema migration 前保存 classify、迁移后 run+verify，不能把 request-id 错当 batch-id。
- 两套发布文档存在重要层级差异：`deploy/deployment-runbook.md` 是日常源码部署流程，但最新企业微信生产切换 runbook 增加了备份、预演、M8 存量迁移和真机/恢复硬门禁。本次生产操作必须采用更严格顺序，不能直接执行日常手册的一步式重建。
- 21/21 份 OpenAPI 已逐份通过 `swagger-cli validate`；文档 inventory 已重建为 269 个 Markdown，`check-doc-index` 和 `git diff --check` 均通过。
- 2026-07-12 22:29 生产只读预检：服务器在线，当前 `SUNAN_VERSION=0.0.3`，API/Web/Nginx 均为 `0.0.3` 且 API/DB/Redis healthy，OSS/Web/Nginx Up；公网 API live/ready 与 Web 200 均正常。
- 生产真实 `.env` 的关键敏感项均为 SET（只核对存在性，未输出值），当前生产 Compose `config --quiet` 通过；企业微信 IP 同步与 certbot timer 均 active。
- 生产磁盘 79G、已用 20G、可用 56G；Docker build cache 约 17G，但空间足够，不需要冒险清理。最近一次数据库/配置/Redis 备份为 2026-07-07，本次上线前必须生成新备份。
- 生产当前源码/镜像仍是 `0.0.3`，数据库 migrations 仅 15 条，最新到 Wave 4/采购预算；当前源码没有安全存量迁移 CLI。新版本将首次带入 Wave 5/6/7 schema 与存量迁移能力，风险显著高于纯版本标签重建，需拆分“构建镜像、classify、schema migration、存量 run/verify、切流”。
- 首次按旧手册在线 tar Redis AOF 时，`appendonly.aof.*.incr.aof` 在读取期间持续增长，tar 返回非零并由 `set -e` 中止。诊断确认 PostgreSQL dump 与配置归档均有效；Redis 归档虽可列目录但不具备一致性保证。
- Redis 当前 AOF 正常、无 rewrite、最近 RDB save 正常，且容器内 `redis-cli` 支持 `--rdb`。根因是备份方法与活跃 AOF 写入冲突；采用复制协议生成时间点 RDB，再用 `redis-check-rdb` 验证，是不停止生产服务且可验证的一致性方案。
- 一致性备份已于 `20260712223040` 完成：PostgreSQL custom dump（258 个 restore entries）、生产配置归档、Redis 时间点 RDB 均已验证并设为 mode 600；三份文件的 SHA-256 清单已保存。失败的在线 AOF tar 已删除，避免被误当可恢复备份。
- 生产需从 15 条 migration 升到 22 条，共新增 7 条：工作流权限、证据审计、证据/导出、主数据、计划任务、检查/CAPA、存量迁移支撑。`up` 路径以新增列（带默认值）、新表/索引/约束/触发器为主，没有删除现有表或列；旧 API 在 schema migration 窗口内保持向后兼容的风险较低。
- `classify` 只查询现有 `workbench_records` 四类模块并计算映射，不依赖新迁移表，因此可用构建好的 `0.0.4` 镜像在 schema migration 前只读执行。`run` 必须等 7 条 schema migration 完成后执行。
- 当前工作区本任务变更与 4 个用户已有 `.superpowers` 删除项可明确区分；发布 tar 应继续排除 `.superpowers`，避免把本地设计会话状态带到生产构建上下文。
- 源码流式包经本地独立验证为 2,816,000 bytes；远端 `upload-20260712223349` 已完整落位，现网 `current` 仍为 `0.0.3`。首次上传命令失败发生在后置校验：本地双引号提前把远端 `$UPLOAD` 展开为空，误查根目录；并非 tar、网络或远端磁盘故障。
- 远端源码已在校验环境文件缺失、版本号和迁移 CLI 后原子切换为 `0.0.4` 构建上下文；旧源码保留为 `/dev/sunan/sunan-source/backup-20260712223349`，运行容器不挂载源码，因此切换期间现网未受影响。
- 生产已构建 `sunan-api:0.0.4`、`sunan-web:0.0.4`、`sunan-nginx:0.0.4`，三者 OCI version label 均为 `0.0.4`；构建日志已保存。现网 API/Web/Nginx 仍运行 `0.0.3`，符合“先构建、后迁移/切流”。
- schema 前安全存量 `classify` 已用 `0.0.4` 镜像只读运行并保存报告，结果 `[]`；生产四类来源记录数为 0，现网 API 仍为 `0.0.3`。
- 首次恢复演练校验脚本的表名/引号/退出码处理不可靠，末尾 `passed` 已明确作废。使用无嵌套引号的 SSH stdin 脚本完整重做后，PostgreSQL dump 成功恢复到临时库：15 条 migrations、4 个企微用户、0 条工作平台记录、9 个文件元数据；所有 SQL 由 `ON_ERROR_STOP` 保护，临时库已确认删除，恢复演练真实通过。
- 生产 schema 已由一次性 `0.0.4` 容器从 15 条成功迁移到 22 条；新增 7 条名称逐一核对通过。迁移后旧 `0.0.3` API 的 live/ready 仍正常，证明 schema 切换未破坏现网旧服务。
- 安全存量批次 `074c54d9-8ac1-4169-81de-8012a9659c04` / request `release-0.0.4-20260712223349` 已完成。run 与独立 verify JSON 完全一致：source/created/skipped/failed/unchanged/linked 全为 0，批次 1 条、映射行 0。
- `docker compose run` 在 SSH stdin heredoc 中会消费后续脚本输入；首次 run 实际成功，缺少的是后续 verify。显式从 `/dev/null` 输入后 verify 与严格 JSON/数据库断言通过，未创建重复批次。
- 服务器实际 Compose 与旧源码 hash 一致、Nginx 挂载配置与新旧源码均一致，未发现运维侧漂移。已备份生产 `.env`/Compose，把实际 Compose 同步到 `0.0.4` 真源并仅修改 `SUNAN_VERSION=0.0.4`；远端 `config --quiet` 通过，运行容器尚未切换。
- API 已单独切换为 `sunan-api:0.0.4`，容器 healthy、OCI label 与进程环境均为 `0.0.4`，migration=22，公网 live/ready 通过；内置回切未触发。
- Web 与 Nginx 随后单独切换为 `0.0.4`，容器运行、OCI label、Nginx `-t`、公网 Web 200 和 API ready 均通过；任务中心、计划管理、检查/CAPA 三个新懒加载 chunk 在容器内存在且公网可取。
- 完成前独立复验通过：Compose 配置、API/DB/Redis 健康、三个应用镜像/标签/状态、22 条 migration、4 张关键安全表、0 行存量批次、三份备份 SHA-256、5 份发布证据、10 条 Web 直达路由、4 个受保护 API 的 401、3 个新懒加载资产、公网 live/ready、系统 timers 均符合预期。
- 切换后最近 20 分钟 API/Nginx 错误标记均为 0，未残留一次性 Compose 容器；服务器侧和本机外部网络重复检查均返回 Web 200、API live/ready。
- 不能由本次自动化代替的唯一现场项是企业微信 iOS、Android、桌面三端的真实 OAuth/JS-SDK/业务主链操作；该项不得表述为已执行。
- 最终本地一致性复验确认 11 个全局版本文件全部为 `0.0.4`，前端 `apps/web/src` 中没有版本号/`SUNAN_VERSION` 展示引用；文档索引 269 份、diff 格式均通过。用户已有 4 个 `.superpowers` 删除项保持原样，未被恢复或纳入版本文件。

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
