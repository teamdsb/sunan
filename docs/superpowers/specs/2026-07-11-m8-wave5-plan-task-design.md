---
status: current-spec
owner: safety
updated: 2026-07-11
replaces: []
replaced_by: []
---
# M8 Wave 5 计划任务中心设计

## 目标与边界

Wave 5 建立安全领域可复用的计划—任务执行中心。年度、月度、周期和单次计划通过计划项生成实际任务；任务是待办、我发起、我参与、已完成、逾期、日历、计划完成率和企业微信消息的唯一数据真源。安全任务在既有“工作平台”及企业微信深链中呈现，不新增一级导航、独立小程序、外部监管接口或新的企业微信审批真源。

计划负责人可在其现有 ABAC 数据范围内创建、编辑并启用计划；系统管理员可跨范围启用、暂停、退役或取消任务。Wave 5 不新增计划审批流。既有工作平台记录和证书提醒保留原模型：前者不承担计划任务真源，后者不被扩展为通用任务表。

## 架构与职责

新增独立 `PlanTaskModule`，依赖主数据、Wave 2 授权服务和企业微信消息服务，但不让其依赖工作平台页面或提醒领域的数据模型。

- 计划服务：校验负责人和范围，维护计划、计划项和未来规则变更。
- 生成器：把计划项在给定窗口内展开为发生时点，以数据库唯一约束和稳定生成键创建或恢复任务；记录每次运行、失败和对账结果。
- 任务服务：查询统一任务数据集，执行任务状态、改期、取消、催办、升级、代理和转移动作，并写入不可变审计。
- 消息出站服务：从任务动作或定时扫描创建一人一条的持久化投递记录，按去重键投递企业微信文本卡片，并复用既有 token 刷新与网络重试能力。
- 前端任务中心：在单一 `/workbench/tasks` 查询模型上提供 A 布局的列表和日历视图；计划管理和任务详情同属工作平台路由块，按路由懒加载。

## 数据模型与幂等

所有新增表使用 UUID、审计字段、软删除、`TIMESTAMPTZ`、外键 `RESTRICT`、外键索引和仅对未删除行生效的唯一索引。数据库以 UTC 保存时点；计划规则使用明确的 IANA 时区，Wave 5 默认且仅支持 `Asia/Shanghai`，展示层按任务时区格式化。

| 表 | 用途与关键约束 |
|---|---|
| `safety_plans` | 计划名称、类型（`annual/monthly/periodic/one_time`）、负责人、时区、`draft/active/paused/retired`、范围摘要和 `vessel_id`。负责人、船舶均为受控引用；停用主数据不得进入新计划。 |
| `safety_plan_items` | 可独立展开的计划项，保存负责人、参与人完成规则、开始/期限规则、`rule_version` 和启用状态。规则变更增加版本，已生成任务不回写。 |
| `safety_tasks` | 实际执行任务，保存来源计划/计划项、发生时点、期限、负责人、状态、任务范围快照和 `generation_key`。`generation_key` 仅由计划项、规则版本和计划时区中的规范化发生时点组成；未删除任务上唯一。 |
| `safety_task_participants` | `executor/collaborator/reviewer/observer/delegate` 参与关系、有效期和 `active/transferred/withdrawn` 状态；按任务、用户和状态查询。 |
| `safety_task_action_logs` | 任务状态、改期、取消、催办、升级、代理和转移的不可变轨迹，含原因、操作人、请求 ID、前后快照和发生时间。 |
| `safety_task_transfers` 与 `safety_task_delegations` | 分别保存责任交接和有有效期的代理；转移必须同时失效原执行资格，代理不会变更责任人。 |
| `safety_task_generation_runs` 与 `safety_task_generation_entries` | 记录计划窗口、触发来源、运行状态、成功/跳过/失败计数、条目级错误、尝试次数和任务关联。条目按 `generation_key` 唯一，供重试和对账。 |
| `safety_task_notification_deliveries` | 一位接收人一次投递，保存任务、消息类型、去重键、文本卡片快照、`queued/dispatching/sent/failed/skipped`、企业微信错误、尝试次数、下次重试和发送时间。未删除记录的 `dedupe_key` 唯一。 |

生成器在同一数据库事务中锁定或创建生成条目，再插入任务。唯一冲突一律读取既有条目/任务并标为跳过，绝不生成副本。失败只将条目/投递记录改为可诊断的 `failed`，后续运行或显式重试复用同一键；对账按计划窗口输出期望发生数、成功、跳过、失败、缺失任务和孤立任务。计划完成率从该计划的非取消任务计算：`completed / (all - cancelled)`；分母为零时返回 `0` 和明确空态。

月度锚点超过当月最大日时取当月最后一天，下一周期仍以原始锚点计算，不能发生逐月漂移；例如 31 日计划在平年二月为 28 日、闰年二月为 29 日。周期与单次计划在计划时区展开后再转换并保存为 UTC。

## API 与授权

OpenAPI 统一使用 `/api/v1`、复数资源、`data` 信封、标准错误和 `X-Request-Id`。所有创建、生成、动作和投递重试请求接受 `Idempotency-Key`；同键、同操作者、同语义返回首次结果，键语义冲突返回 `409`。

- `GET/POST /plans`、`GET/PATCH /plans/{planId}`、`POST /plans/{planId}/actions`：管理计划与 `activate/pause/retire` 动作。
- `GET/POST /plans/{planId}/items`、`PATCH /plans/{planId}/items/{itemId}`：管理计划项与规则版本。已生成任务只能通过任务动作改期或取消。
- `POST /plans/{planId}/generation-runs`、`GET /plans/{planId}/generation-runs`：手动触发窗口生成、查询运行与对账。定时触发走同一领域服务和审计路径。
- `GET /tasks`：`view=todo|initiated|participated|completed|overdue`、范围、状态、负责人、计划、船舶、`startAt/endAt` 和分页过滤。日历直接使用相同查询和同一任务摘要，前端按本地日期分组，不调用静态排程端点。
- `GET /tasks/{taskId}`：返回任务、范围快照、参与人、动作轨迹、通知投递摘要和服务器计算的 `availableActions`。
- `POST /tasks/{taskId}/actions`：接收 `start/complete/block/reschedule/cancel/remind/escalate/delegate/transfer` 与相应原因、日期、接收人或代理有效期。非法状态转换为 `409`；无权限为 `403`；缺少原因、无效日期、停用人员或职责冲突为 `422`。
- `GET /tasks/{taskId}/notification-deliveries`、`POST /tasks/{taskId}/notification-deliveries/{deliveryId}/retry`：仅返回或重放调用方可管理的任务投递记录；重试仍使用原去重键。

读取、列表和详情始终先走 Wave 2 ABAC。负责人和有效代理可执行被分派的任务；计划负责人、任务发起人和系统管理员可在授权范围内改期、取消、催办、升级、代理或转移。转移会把原执行人的任务参与关系改为 `transferred`，因此原责任人后续 `start/complete/block` 均返回 `403`，但历史动作、转移记录和只读可见性保留。前端只显示 `availableActions`，不自行推断权限。

## 状态、时间与消息规则

计划沿用 `draft -> active -> paused -> retired`。任务沿用 `pending -> in_progress -> blocked -> completed`，且 `pending|in_progress|blocked -> cancelled`；`completed` 是唯一完成状态。取消、改期、转移、催办、升级和代理都是有原因、请求 ID 和审计的动作，不得直接 PATCH 状态字段。

逾期不是任务状态：仅当任务尚未完成或取消且 `due_at < now` 时 `isOverdue=true`。期限瞬间本身不算逾期；任务时钟统一从可注入的服务取得，避免应用服务器时区和测试时间不一致。改期仅允许合法非终态任务，必须记录原期限、新期限和原因；取消必须记录原因。多人完成沿用 Wave 2 的 `all/any/quorum` 规则，达成门槛才可完成。

催办、转移、将近期限和逾期升级分别形成消息类型。去重键包含任务、接收人、消息类型和业务周期（如期限日或升级级别），保证同一周期不会重复发送；未确认的周期提醒可按规则再次创建新的周期投递。投递先持久化再调用 `WecomMessageService`：`42001` 强制刷新 token 后重试一次，网络错误最多三次并写入失败原因和下次重试时间，`invaliduser` 标为不可重试失败。文本卡片 URL 使用 `/workbench/tasks/{taskId}?notificationId={deliveryId}`；前端的 OAuth 安全回跳保存此完整本地路径，认证成功后回到目标任务。

## UI、路由与移动体验

任务中心位于 `/workbench/tasks`，任务详情为 `/workbench/tasks/:taskId`，计划管理位于 `/workbench/plans` 与 `/workbench/plans/:planId`。路由均独立懒加载，工作平台主页不预加载任务中心。

任务中心采用用户确认的 A 布局：顶部固定数据范围标签“待办、我发起、我参与、已完成、逾期”，下方以“列表 / 日历”切换同一筛选条件和 API 查询。移动端默认列表；日历为主动切换的月视图，日期格仅显示该日期真实任务的状态数量，选择日期后显示同一数据集中的任务。桌面端可并排显示当月日历和所选日期清单，但不引入不同数据接口或静态样例。

任务详情优先展示状态、期限、负责人、参与人、范围、可执行动作、转移/改期/取消轨迹及通知发送结果。页面覆盖加载、空态、网络错误、403、401 后 OAuth 恢复、重复提交禁用、弱网重试、320px 单列与至少 44px 可点区域。蓝白企业 H5 视觉语言沿用现有系统；本 Wave 只新增布局和任务组件，不替换现有品牌或导航风格。

## TDD、迁移与验收

实施顺序为冻结 API/DB/state/UI 规格，先编写失败测试，再建实体、迁移、服务、Controller、前端和消息集成。测试最小集：

- 单元：年度/月度/周期/单次展开、31 日月末钳制、闰年、`Asia/Shanghai` 转 UTC、期限精确边界、状态转换、完成门槛和稳定生成键。
- PostgreSQL integration：migration up/down、外键/部分唯一索引、重复运行、并发生成、失败重试、对账、ABAC、转移后原责任人拒绝、代理有效期、改期/取消审计和投递去重。
- API 合约：计划、计划项、任务、生成运行、日历同源查询、所有动作的成功、401、403、404、409 与 422。
- Web：A 布局范围标签、列表/日历同数据、加载/空态/错误/权限不足、重复提交、真实 API 日历、深链 OAuth 恢复和移动端交互。
- 消息：投递记录、token 刷新、网络失败重试、无效接收人、重复触发不重复发、失败可重试与审计。

迁移 `up()` 创建表、索引与约束；`down()` 只删除 Wave 5 新增对象，绝不删除既有工作平台记录、提醒、主数据、文件或历史审计。最终证据必须包含任务生成幂等、待办数据范围、日历同源查询、转移权限、企业微信消息投递/深链和全量受影响验证结果。
