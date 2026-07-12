---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# Wave 2 工作流生命周期

## 动作

| 动作 | 合法来源 | 目标 | 授权 |
|---|---|---|---|
| `start` | `assigned` | `in_progress` | 当前步骤 executor/collaborator 或有效 delegate |
| `complete_step` | `in_progress` | 下一个步骤或 `pending_review` | 当前步骤 participant，满足 all/any/quorum |
| `return_step` | `pending_review` | `in_progress` | reviewer；指定现有步骤 |
| `terminate` | 非终态 | `terminated` | reviewer 或 system_admin |
| `void` | 非终态 | `voided` | system_admin |
| `reopen` | `closed|terminated|voided` | `assigned` | reviewer 或 system_admin |
| `delegate` | 非终态 | 原状态 | 当前 executor；有效期内代理人获得执行权 |
| `transfer` | 非终态 | 原状态 | owner/reviewer/system_admin；保留原责任轨迹 |

`submit_review`、`request_rework`、`close_record` 保持既有语义，但均须通过 ABAC。非法转换返回 409；整改责任人与 verifier 为同一人返回 422；拒绝和成功动作都写审计。
