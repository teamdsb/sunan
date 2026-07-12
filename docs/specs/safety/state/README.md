---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 安全领域状态规格目录

本目录冻结状态规格入口。状态定义以 `../terminology-and-status.md` 为唯一词典；每份状态规格须补充合法动作、前置条件、执行角色、并行完成规则、非法转换响应、审计与幂等。

| Wave | 预期文件 | 范围 |
|---|---|---|
| 2 | `workflow-lifecycle.md` | 流程步骤、参与人、退回、终止、作废、代理与转移 |
| 3 | `evidence-jobs.md` | 已冻结：证据替换/解除关联与导出任务状态 |
| 5 | `task-lifecycle.md` | 计划、任务、提醒和日历状态 |
| 6 | `inspection-capa-lifecycle.md` | 已冻结：多人检查、问题、CAPA、措施、验证、返工与关闭状态 |

未经状态规格评审，页面、接口和 job 不得自行新增状态值或直接写入状态字段。
