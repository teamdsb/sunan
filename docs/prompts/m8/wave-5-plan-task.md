---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M8 Wave 5 提示词：计划任务、统一待办与日历

```text
执行 M8 Wave 5，建设可被后续所有安全领域复用的计划任务中心、统一待办、真实日历和企业微信任务消息。

前置：Wave 4 主数据已验收。

必须阅读：
- AGENTS.md
- docs/requirements/M8-安全管理底座与核心闭环.md
- docs/plans/M8-execplans.md
- docs/plans/M8-wave-backlog.md
- docs/specs/common/notification-spec.md
- docs/specs/wecom/message-push-spec.md
- docs/specs/common/frontend-experience-guidelines.md
- Wave 2 权限规格、Wave 4 主数据规格
- docs/specs/safety/README.md

按 SDD/TDD 完成：
1. 冻结 plan-task API、DB、state、UI 规格。
2. 先写周期边界、重复生成、并发、改期、取消和转移测试。
3. 实现年度、月度、周期和单次计划及计划项。
4. 使用稳定幂等键生成任务，失败可重试和对账。
5. 实现待办、我发起的、我参与的、已完成和逾期。
6. 实现真实任务日历，删除或替换静态排程数据。
7. 实现改期、取消、催办、升级、代理和任务转移。
8. 企业微信应用消息深链到目标任务，并记录发送、失败、重试和去重。

硬性验收：
- 重复运行生成器不会重复建任务。
- 日历、待办和计划完成率来自同一真实任务数据。
- 转移后旧责任人不能继续执行，但历史轨迹保留。
- 消息深链经历 OAuth 恢复后仍回到目标任务。
- 月末、闰年、时区和逾期边界有自动化测试。

验证：
- 运行完整受影响测试、API/Web build、OpenAPI 校验和文档索引校验。

最终报告：
- 附任务生成幂等、待办数据范围、日历和企业微信消息证据。
```
