---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M7 Wave 2 提示词：数据权限与流程状态链

```text
执行 M7 Wave 2，目标是完成 ABAC 数据范围、步骤参与人、多人规则、动作授权和完整流程审计。

前置：M7 Wave 1 已通过。若验收证据不存在，先报告 blocker，不直接实现。

必须阅读：
- AGENTS.md
- docs/requirements/M7-安全管理底座与核心闭环.md
- docs/plans/M7-execplans.md 的 Wave 2
- docs/plans/M7-wave-backlog.md 的 Wave 2
- docs/specs/common/auth-spec.md
- docs/specs/common/api-conventions.md
- docs/specs/common/db-conventions.md
- docs/specs/workbench/db/workbench-permission-matrix.md
- docs/specs/workbench/state/workbench-records.md
- docs/specs/safety/README.md
- Wave 1 新增的领域边界和术语规格

按 SDD/TDD 顺序完成：
1. 编写并评审 workflow-and-permission 的 API、DB、state、UI 规格。
2. 先写权限和非法状态转换测试，确认红灯。
3. 通过 migration 和实体增加参与人、代理、转移和审计数据。
4. 建立统一后端授权策略，覆盖列表、详情、动作、附件、打印和导出。
5. 落地执行人、协作人、审核人、观察人和 all/any/quorum 多人完成规则。
6. 落地退回指定步骤、终止、作废、重开、代理和任务转移。
7. 前端只展示可执行动作，但后端必须独立拒绝越权。

硬性验收：
- crew 不能读取或操作非本船、非本人、非参与任务。
- 非当前执行人不能完成步骤。
- 整改责任人与验证人冲突时按规格拦截。
- 附件、打印、导出不能绕过记录权限。
- 管理员敏感查看和全部状态动作留审计。

禁止：
- 只在前端隐藏按钮。
- 用 module role 过滤代替记录级数据范围。
- 使用 SQLite。
- 顺手重构无关模块。

至少运行：
- pnpm --filter api lint
- pnpm --filter api test:unit
- pnpm --filter api test:integration
- pnpm --filter web test
- pnpm --filter api build
- pnpm --filter web build
- 所有新增 OpenAPI 的 swagger-cli validate
- 文档索引校验

最终报告按“规格、测试、迁移、后端、前端、权限矩阵、验证结果、剩余风险”输出，并生成 Wave 2 验收文档。
```
