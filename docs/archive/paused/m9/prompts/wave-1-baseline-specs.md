---
status: conditional-baseline
owner: delivery
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M9 Wave 1 提示词：M8 基线回归与专业规格冻结

```text
执行 M9 Wave 1。目标是验证 M8 生产底座、冻结 M9 六组专业领域规格，并阻断未解决的 P0 问题。本 Wave 不实现专业业务代码。

前置：M8 总验收为通过。

必须阅读：
- AGENTS.md
- docs/archive/paused/m9/M8-M9-upgrade-roadmap.md
- docs/requirements/M8-安全管理底座与核心闭环.md
- docs/requirements/M9-专业安全业务深化与体系完善.md
- docs/archive/execplans/M8-execplans.md
- docs/archive/paused/m9/M9-execplans.md
- docs/archive/paused/m9/M9-wave-backlog.md
- M8 总验收和所有 Wave 验收
- docs/specs/safety/README.md
- docs/specs/common/README.md
- docs/specs/workbench/README.md
- docs/specs/procurement/README.md

完成：
1. 回归 M8 权限、流程、证据、主数据、任务、消息、导出和 CAPA；必须覆盖采购执行清单详情的附件上传、预览、下载和受审计解除关联，确认无权或非草稿状态不能删除，解除关联不删除全局文件或其他业务关联。
2. 形成 M8 P0/P1 缺陷清单；存在 P0 时停止 M9 实现。
3. 检查船舶、人员、任职、设备和证书主数据质量。
4. 冻结 personnel-safety、ship-operation、emergency-incident、equipment-maintenance、safety-governance、document-audit-archive 六组 API/DB/state/UI 规格目录。
5. 冻结资格快照、采购来源关联、CAPA 来源关联、档案归档和人工监管登记矩阵。
6. 冻结各 Wave 迁移、回滚、测试、真机和验收门禁。
7. 明确不接海事监管、AIS、CCTV，不建设模拟外部接口。

验证：
- 完整执行 M8 自动化回归和 build。
- 校验全部现行 OpenAPI。
- 运行文档索引和 git diff --check。
- 扫描专业规格是否存在重复实体、冲突状态或不明确真源。

最终报告包括 M8 回归结果、主数据质量指标、P0 blocker、冻结的专业规格矩阵、跨域真源矩阵和 Wave 1 验收。只有无 P0 blocker 时才建议进入 Wave 2。
```
