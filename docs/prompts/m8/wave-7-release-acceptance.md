---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M8 Wave 7 提示词：迁移、联调、上线与验收

```text
执行 M8 Wave 7，完成存量迁移、全链路联调、质量门禁、企业微信真机验收、上线材料和操作手册更新。

前置：Wave 1-6 均有通过的验收文档，且无未关闭 P0 缺陷。

必须阅读：
- AGENTS.md
- docs/requirements/M8-安全管理底座与核心闭环.md
- docs/plans/M8-execplans.md
- docs/plans/M8-wave-backlog.md
- M8 Wave 1-6 的实际验收文档
- docs/plans/wave-acceptance-template.md
- docs/guides/testing-strategy.md
- docs/specs/wecom/real-device-regression-matrix.md
- docs/specs/wecom/production-cutover-runbook.md
- docs/specs/common/operations-observability-m6.md
- docs/handbook/苏南船舶管理系统操作手册.md

完成：
1. 审核所有 migration 的 up/down、索引、外键和重复执行策略。
2. 执行存量分类、映射、迁移、数量核对、关联核对和只读兼容。
3. 验证“计划 -> 任务 -> 检查 -> 问题 -> CAPA -> 验证关闭”。
4. 验证船员、部门、管理员的数据范围和动作权限。
5. 验证拍照、签名、定位、附件、PDF、导出、消息和深链。
6. 完成性能、弱网、重复点击、并发和失败恢复测试。
7. 完成企业微信 iOS、Android、桌面真机回归。
8. 更新操作手册、截图占位、上线 runbook、监控项和培训材料。
9. 创建 Wave 7 验收、M8 总验收、上线包和 Hypercare 模板。

必须完整运行并报告：
- node scripts/generate-doc-inventory.mjs
- node scripts/check-doc-index.mjs
- pnpm --filter api lint
- pnpm --filter api test:unit
- pnpm --filter api test:integration
- pnpm --filter web test
- pnpm --filter api build
- pnpm --filter web build
- 全部新增/修改 OpenAPI validate
- git diff --check

禁止：
- 将未执行的真机测试写为通过。
- 因迁移困难删除历史记录。
- 带未关闭 P0 缺陷上线。
- 把已有仓库失败混写成本 Wave 通过。

最终报告必须给出测试总数、失败数、迁移核对数据、真机矩阵、缺陷清单、回滚结果、文档入口和验收结论。通过后才允许启动 M9 Wave 1。
```
