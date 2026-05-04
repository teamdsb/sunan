---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M6 Wave 4 验收清单

## 验收结论

- 状态：`通过`
- 验收日期：`2026-04-22`
- 对应任务：`WS-4A`、`WS-4B`、`WS-4C`

- 生产环境变量矩阵、发布顺序、迁移顺序、备份恢复与回滚 SOP 已文档化。
- 发布流程明确为：数据库备份 -> 迁移演练 -> 预发布 smoke -> 企业微信后台切换 -> 生产发布 -> 回归抽检 -> hypercare。
- 关键可观测链路已覆盖 OAuth、JS-SDK、审批发起/回调/重试/对账、消息发送、文件上传回调、导出任务、打印快照。
- 告警阈值、失败分级、值班人与恢复触发条件已写入文档。

## 证据索引

- `WS-4A`
- [deployment.md](/Users/yuan/项目/sunan/sunan/docs/architecture/deployment.md)
- [production-cutover-runbook.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/production-cutover-runbook.md)
- `WS-4B`
- [security.md](/Users/yuan/项目/sunan/sunan/docs/architecture/security.md)
- [operations-observability-m6.md](/Users/yuan/项目/sunan/sunan/docs/specs/common/operations-observability-m6.md)
- `WS-4C`
- [go-live-materials-checklist.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/go-live-materials-checklist.md)
