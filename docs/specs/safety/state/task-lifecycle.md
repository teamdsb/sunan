---
status: current-spec
owner: safety
updated: 2026-07-11
replaces: []
replaced_by: []
---
# Wave 5 计划、任务与消息生命周期

## 计划与生成

| 动作 | 合法来源 | 目标 | 授权与不变量 |
|---|---|---|---|
| create/update | 新建或 `draft/paused` | `draft/paused` | 计划负责人在 ABAC 范围内；更新计划项产生未来规则版本，不改写已生成任务。 |
| activate | `draft/paused` | `active` | 负责人或系统管理员；至少一个启用计划项；激活后才可生成。 |
| pause | `active` | `paused` | 负责人或系统管理员；停止新生成，不取消历史任务。 |
| retire | `draft/active/paused` | `retired` | 负责人或系统管理员；永久停止生成，不能重新启用。 |
| generate/reconcile | `active` | 原状态 | 负责人/管理员的手工触发或内部 worker；必须使用 generation key、持久化运行和审计。 |

年度、月度、周期和单次规则均在计划的 `Asia/Shanghai` 时区展开。月度锚点溢出取当月最后一天但不改变下次的原始锚点；到期时间必须不早于发生时间。`succeeded` 的生成运行并不表示所有窗口任务都新建，`skipped` 是同键任务已存在的正常结果。

## 任务与参与人

| 动作 | 合法来源 | 目标 | 授权与前置条件 |
|---|---|---|---|
| start | `pending` | `in_progress` | 当前负责人、活跃 executor/collaborator 或有效 delegate。 |
| complete | `pending/in_progress/blocked` | `completed` | 当前可执行人；满足 `all/any/quorum` 完成门槛。 |
| block | `pending/in_progress` | `blocked` | 当前可执行人；非空阻塞原因。 |
| reschedule | 非终态 | 原状态 | 计划负责人、任务发起人或系统管理员；新计划时间/期限有效且非空原因。 |
| cancel | 非终态 | `cancelled` | 计划负责人、任务发起人或系统管理员；非空原因。 |
| transfer | 非终态 | 原状态 | 计划负责人、任务发起人或系统管理员；来源和目标不同，目标为可用人员；旧执行关系转为 `transferred`。 |
| delegate | 非终态 | 原状态 | 当前负责人或可管理者；代理人与委托人不同，且有合法有效期；不更改责任人。 |
| remind/escalate | 非终态 | 原状态 | 可管理者或内部逾期 worker；只创建去重投递和动作轨迹，不改变任务状态。 |

`completed` 是唯一完成状态。逾期为派生值：仅当状态不是 `completed/cancelled` 且 `due_at < clock.now()` 时为真；等于期限瞬间不逾期。所有动作写入前后快照、原因（需要时）、操作者和请求 ID；非法状态返回 409，职责冲突/无效人员/日期/原因返回 422。

参与关系沿用 `active -> transferred | withdrawn`。`transferred` 的旧责任人保留历史轨迹和只读审计，但不再得到 `start/complete/block` 的 `availableActions`。代理仅在 `active` 且当前时间位于有效期时拥有执行权，所有代理动作以实际代理人为操作者写入审计。

## 投递与深链

```text
queued --worker claim--> dispatching --WeCom success--> sent
  ^                         |                         |
  |                         +--retryable error--> failed
  +---- authorized retry --------------------------+
```

- 仅 worker 能原子领取 `queued`；卡住的 `dispatching` 由超时恢复流程标为 `failed` 并记录诊断。
- `42001` 刷新 access token 后重试一次；网络失败最多三次；`invaliduser` 为不可重试失败。每次尝试更新同一投递记录并向 `attemptHistory` 追加结果，授权的人工重试另写任务动作日志。
- 仅 `failed` 且可重试的投递可重新排队。去重键在重试中不变，`sent/skipped` 不允许重试。
- 文本卡片深链到 `/workbench/tasks/{taskId}?notificationId={deliveryId}`。认证缺失/失效时 OAuth 把完整本地路径保存在安全回跳存储；认证成功后才读取任务且重新执行 ABAC，不因消息链接绕过权限。
