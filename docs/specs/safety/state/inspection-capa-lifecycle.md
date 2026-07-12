---
status: current-spec
owner: safety
updated: 2026-07-12
replaces: []
replaced_by: []
---
# Wave 6 检查、问题与 CAPA 生命周期

## 模板与计划

| 对象/动作 | 合法来源 | 目标 | 授权与不变量 |
|---|---|---|---|
| template create | 无 | draft version | 管理员或被授予模板维护范围的人员；至少一条检查项。 |
| version create | published | draft | 模板维护者；复制产生下一个版本，不修改已发布版本。 |
| publish | draft | published | 模板维护者/管理员；项目码、序号唯一且所有必填规则有效。 |
| retire | published | retired | 管理员；不取消已生成检查。 |
| inspection-plan create | 无 | active task plan | 负责人/管理员；绑定 published 模板版本、合法人员、船舶、规则与期限。 |
| generate/reconcile | active task plan | 原状态 | 复用 Wave 5 生成键与权限；每个新任务只创建一份检查快照。 |

## 多人检查

```text
pending -> in_progress -> submitted -> completed
pending | in_progress -> cancelled
```

- executor/collaborator 只能保存和提交自己的结果槽；每一必填快照项必须填结论，`nonconforming` 在规则要求时必须附至少一份证据。
- submit 必须绑定签名证据，设置该人的全部结果为 `submitted`，并写入不可变签认动作。已提交人员不能再改写结果，除非 verifier 明确发起返工动作。
- 汇总人在 `all`、`any` 或 `quorum` 的已签认人数达到 Wave 5 任务快照规则前不得将检查置为 `completed`；不足时返回 422，显示已完成/所需人数但不泄露其他人结果细节。
- 汇总事务对每个不符合快照项目写一次稳定转单 job；重复汇总、请求重放、并发 worker 或补偿不得创建第二个问题。
- `completed/cancelled` 为终态；未授权、已完成或不满足门槛的转换返回 403/409/422，并保留审计。

## 问题与 CAPA

| 动作 | 合法来源 | 目标 | 授权与前置条件 |
|---|---|---|---|
| create issue | 无 | `open` | 记录创建者须有来源记录与责任范围权限；自动转单由内部 worker 使用稳定键。 |
| start analysis | `open` | `analyzing` | 问题责任人、reviewer 或管理员；写 root cause 或 CAPA。 |
| assign action | `analyzing/action_in_progress` | `action_in_progress` | CAPA 负责人、reviewer 或管理员；措施必须有类型、责任人和期限。 |
| submit action | `draft/assigned/in_progress/returned` | action `submitted` | 仅该措施责任人或有效 delegate；提交完成说明与至少一份 active 证据。 |
| accept action | action `submitted` | action `accepted` | CAPA verifier/reviewer；不得接受本人措施。 |
| request verification | 全部必需措施 accepted | CAPA `pending_verification`、issue `pending_verification` | verifier/reviewer；根因与纠正/预防措施均存在。 |
| verify passed | CAPA `pending_verification` | CAPA `verified` | 独立 verifier；必须有结论和有效性评价。 |
| verify failed | CAPA `pending_verification` | CAPA `in_progress` | 独立 verifier；必须有返工原因，最近验证保留 failed。 |
| close | issue open/analyzing/action_in_progress/pending_verification | issue/CAPA `closed` | major/critical 只允许 verifier/reviewer/system_admin；所有关闭门槛通过。 |
| reopen | issue `closed` | `open` | reviewer/system_admin；必须写原因，保留原 CAPA/验证历史。 |

验证人不得是任一 active CAPA action 的责任人；普通 executor 永远没有 `close` 动作。`availableActions` 是后端 ABAC、责任范围、参与关系、状态与职责隔离的交集，前端只消费该字段。

## 关闭与返工门槛

1. issue 必须关联 CAPA，且 CAPA 已 `verified`。
2. 根因分析、至少一项 `corrective` 和至少一项 `preventive` action 必须存在。
3. 每项 required action 必须 `accepted`，并具备 active 完成证据；证据替换/撤回保留审计，不能静默覆盖。
4. 最近一次 verification 必须 `passed`，填写有效性评价；`failed` 使 CAPA 返回 `in_progress`，不能关闭。
5. critical 或 major issue 的关闭者必须满足高级角色门槛；所有关闭写 request ID、操作者、门槛快照和评论。

## 转单补偿与统计

转单 worker 状态为 `queued -> running -> succeeded|failed|skipped`。worker 崩溃或 DB 冲突转为 failed 并保存诊断；授权的 reconcile 将失败或未关联 issue 的 job 重新排队。自动转单的 `dedupe_key` 不因重试变化。

统计从 `safety_issues -> issue_sources -> inspection_results -> inspections -> template_snapshot`，以及 `safety_issues -> safety_capas -> capa_actions/verifications` 实时聚合。任何统计项都返回受权的来源/问题/CAPA 链接；无读取权的数据不参与调用者的汇总与下钻。
