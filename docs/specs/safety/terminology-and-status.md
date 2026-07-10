---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 安全领域唯一术语与状态

本文件是 M8 的唯一业务词典。后续 API 字段、数据库枚举、状态规格、页面标签、测试夹具和验收记录必须使用本文件的英文值；不得为同一概念另设同义状态。

## 对象术语

| 中文术语 | 英文标识 | 唯一定义 | 不得混用为 |
|---|---|---|---|
| 计划 | `plan` | 用于按年度、月度、周期或单次规则生成执行任务的配置 | 具体执行记录、待办 |
| 计划项 | `plan_item` | 计划内可独立生成一组任务的最小配置单元 | 检查项、措施 |
| 任务 | `task` | 指向一个业务目标、可由参与人执行和完成的实际工作项 | 工作平台任意记录、计划 |
| 任务参与人 | `task_participant` | 任务上下文中具名且可审计的人员关系 | 系统角色、企业微信组织成员 |
| 检查 | `inspection` | 按检查模板或检查计划执行并产生检查结果的一次活动 | 单个检查项、问题 |
| 检查项结果 | `inspection_result` | 某检查项在一次检查中的结论、说明和证据 | 问题或不符合 |
| 问题 | `issue` | 来自检查、隐患、自查、检验或人工登记、需要处置的统一结构化对象 | 仅文本整改说明 |
| 不符合 | `nonconformity` | `issue_type=nonconformity` 的问题分类；沿用问题生命周期，不另建平行闭环 | 所有问题的同义词 |
| CAPA | `capa` | 针对一个问题组织根因、纠正措施、预防措施和验证的闭环容器 | 单条措施或验证记录 |
| 措施 | `action` | CAPA 内一条可分派、有期限的纠正或预防行动 | CAPA、验证 |
| 验证 | `verification` | 与执行责任隔离的人员对 CAPA 完成证据和有效性作出的结论 | 措施执行、关闭动作 |
| 证据 | `evidence` | 与业务对象建立可审计关联的附件、照片、签名、定位或归档快照 | 原始 OSS 对象本身 |

## 参与人角色

| 标识 | 含义 | 动作边界 |
|---|---|---|
| `executor` | 执行人 | 提交本人被分派的任务、检查结果或措施 |
| `collaborator` | 协作人 | 按任务规则提交协作结果，不替代审核/验证 |
| `reviewer` | 审核人 | 审核流程步骤，不自动具有验证权 |
| `verifier` | 验证人 | 对 CAPA 进行通过或退回；不得验证本人负责的措施 |
| `observer` | 观察人 | 只读并接收通知，不推进状态 |
| `delegate` | 代理执行人 | 在有效代理期内代为执行；原责任、代理关系与动作均须审计 |

## 生命周期

### 计划 `plan`

`draft -> active -> paused -> retired`

- `draft`：可编辑，尚不生成任务。
- `active`：按计划项生成任务。
- `paused`：保留历史，不生成新任务。
- `retired`：永久停止生成；不得重新激活，需复制为新计划。

### 任务 `task`

`pending -> in_progress -> blocked -> completed`

`pending | in_progress | blocked -> cancelled`

- `completed` 是唯一完成状态；不得使用 `done`。
- `blocked` 必须记录阻塞原因和恢复动作。
- `cancelled` 必须记录取消原因，且不等同于软删除。

### 检查 `inspection`

`pending -> in_progress -> submitted -> completed`

`pending | in_progress -> cancelled`

- `submitted` 表示检查人已提交结果，尚未完成汇总或审核。
- `completed` 仅在多人完成规则、必填结果和所需证据全部满足后使用。

### 问题 `issue`

`open -> analyzing -> action_in_progress -> pending_verification -> closed`

- `reopen` 是从 `closed` 回到 `open` 的动作，必须记录原因，不是独立状态。
- `closed` 要求关联 CAPA 已验证通过，或在规则允许的无 CAPA 情形留下豁免审计。

### CAPA `capa`

`draft -> in_progress -> pending_verification -> verified -> closed`

- `verified` 表示验证结论通过；`closed` 表示已同步满足问题关闭规则。
- 验证失败或措施退回使 CAPA 回到 `in_progress`，并保留失败结论。

### 措施 `action`

`draft -> assigned -> in_progress -> submitted -> accepted`

`submitted -> returned -> in_progress`；`draft | assigned | in_progress -> cancelled`

- 每条措施必须有 `corrective` 或 `preventive` 类型、责任人和期限。
- `accepted` 仅表示措施材料被接收；不等同 CAPA 或问题关闭。

### 验证 `verification`

`pending -> passed | failed`

- `passed` 使 CAPA 进入 `verified` 的候选状态。
- `failed` 必须携带返工说明，并使 CAPA 回到 `in_progress`。

### 证据 `evidence`

`active -> superseded | withdrawn`

- 证据不可静默替换或物理删除。
- `superseded` 必须链接替代证据；`withdrawn` 必须记录原因、操作人、时间和业务对象。
- 解除业务关系不删除 OSS 对象或仍被其他关系引用的文件元数据。

### 任务参与人 `task_participant`

`active -> transferred | withdrawn`

- `transferred` 必须保留交接人、接收人、时间和原因。
- `withdrawn` 只移除后续权限，不抹除已完成动作。

## 统一状态规则

1. `status` 只表达对象生命周期；审批通道状态、外部来源状态和软删除状态必须使用独立字段。
2. 状态变更是动作而非直接字段更新，必须记录操作人、发生时间、原因、请求 ID 和前后状态。
3. 软删除只适用于尚未归档且无保留义务的业务对象；`cancelled`、`retired`、`withdrawn` 和 `closed` 都不是软删除。
4. 枚举、非法转换、权限角色和并行完成规则在对应 Wave 的 state 规格中扩展，不得修改本文件的对象含义或状态名。
