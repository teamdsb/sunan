---
status: acceptance-archive
owner: safety
updated: 2026-07-12
replaces: []
replaced_by: []
---
# M8 上线包索引

## 包状态

M8 仓库交付和归档材料已就绪；本任务不执行上线。用户将在本任务后自行完成企业微信三端真机，生产现场动作按实际环境和变更窗口决定。

## 已就绪

- [x] Wave 1-7 验收索引：`acceptance-m8-overall.md`
- [x] 迁移对账/回滚记录：`m8-wave7-migration-reconciliation.md`
- [x] 真机矩阵模板与实际未执行状态：`m8-wave7-real-device-matrix.md`
- [x] 生产切换：`docs/specs/wecom/production-cutover-runbook.md`
- [x] 监控：`docs/specs/common/operations-observability-m6.md`
- [x] 操作手册：`docs/handbook/苏南船舶管理系统操作手册.md`
- [x] 培训材料：`docs/handbook/M8-安全管理上线培训材料.md`
- [x] Hypercare 模板：`docs/archive/templates/safety/m8-hypercare-daily-template.md`

## 用户上线前/上线现场待办（不阻断 M8 归档）

- [ ] iOS、Android、桌面企业微信主链矩阵与截图/录屏。
- [ ] 如目标环境存在需迁移的历史来源，执行 `classify` 数量、状态和人工异常清单。
- [ ] 按实际变更制度决定是否执行生产备份、恢复演练、RTO 与恢复 smoke。
- [ ] 企业微信后台配置截图、发布/变更单、发布窗口与四方签字。
- [ ] 首周 Hypercare 实际日报和缺陷闭环。

上述事项均未在本任务中伪写为完成。是否发布由用户在三端真机及现场变更检查后决定；本文件不构成自动上线授权。
