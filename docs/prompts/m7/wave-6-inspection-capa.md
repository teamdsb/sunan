---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M7 Wave 6 提示词：检查、问题与 CAPA

```text
执行 M7 Wave 6，建设检查模板、多人检查、统一问题、不符合项、根因、纠正预防措施和验证关闭。

前置：Wave 5 计划任务中心已验收。

必须阅读：
- AGENTS.md
- docs/requirements/M7-安全管理底座与核心闭环.md
- docs/plans/M7-execplans.md
- docs/plans/M7-wave-backlog.md
- docs/handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md
- Wave 2 权限、Wave 3 证据、Wave 5 任务规格
- docs/specs/workbench 中检查整改相关规格
- docs/specs/safety/README.md

按 SDD/TDD 完成：
1. 冻结 inspection-capa API、DB、state、UI 规格。
2. 先写模板版本、多人完成、自动转单幂等、关闭门槛和返工测试。
3. 实现检查模板、检查项、版本、适用范围和导入来源。
4. 检查计划生成任务，每个参与人保存独立结果和签认。
5. 实现统一问题实体：来源、类型、等级、船舶、责任范围和期限。
6. 按规则自动生成不符合项或整改任务，失败可补偿。
7. 实现根因分析、纠正措施、预防措施、完成证据、验证、返工、有效性评价和关闭。
8. 接入现有安全隐患、船舶自查、船舶检验和海事安检，保留双向来源链接。

硬性验收：
- 已发出的检查任务保留模板版本快照。
- 多人检查未达到完成门槛不能汇总。
- 自动转单重复触发不产生重复问题。
- 重大问题不能由普通执行人直接关闭。
- 问题未完成措施、证据或验证时不能关闭。
- 所有统计可下钻到来源检查项和 CAPA。

运行 API unit/integration、web tests、build、OpenAPI、migration 和文档校验。最终报告展示一条完整“计划 -> 多人检查 -> 不符合 -> CAPA -> 验证关闭”证据链。
```
