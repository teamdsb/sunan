---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M9 Wave 8 提示词：全域联调、上线与验收

```text
执行 M9 Wave 8，完成 M8/M9 全域联调、数据迁移、质量门禁、企业微信真机验收、上线切换、操作手册更新和最终能力复评。

前置：M9 Wave 1-7 均通过，且无未关闭 P0。

必须阅读：
- AGENTS.md
- docs/plans/M8-M9-upgrade-roadmap.md
- docs/requirements/M8-安全管理底座与核心闭环.md
- docs/requirements/M9-专业安全业务深化与体系完善.md
- docs/plans/M8-execplans.md
- docs/plans/M9-execplans.md
- docs/plans/M8-wave-backlog.md
- docs/plans/M9-wave-backlog.md
- M8/M9 已完成 Wave 的实际验收文档
- docs/plans/wave-acceptance-template.md
- docs/specs/safety/README.md 及全部现行 safety 规格
- 企业微信真机、切换和运维文档
- docs/handbook/苏南船舶管理系统操作手册.md
- docs/handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md

必须验证以下跨域链路：
1. 人员任职/证书/健康/培训/熟悉 -> 航次资格快照与阻断。
2. 航次或高风险作业 -> 检查 -> 问题 -> CAPA -> 验证关闭。
3. 应急演习/事故/防台 -> 改进任务或 CAPA。
4. 设备维护 -> 缺陷 -> 修理/备件 -> 采购 -> 验收 -> 关闭。
5. 指定人员/船长复查/管理评审 -> 问题和任务。
6. 内审 -> 不符合项 -> CAPA -> 报告和分发。
7. 人工监管事项 -> 材料 -> 人工上报 -> 回执归档。

完成：
- 分域迁移、数量与关联核对、回滚和恢复演练。
- 全量权限、安全、并发、性能、弱网和失败恢复。
- iOS、Android、桌面企业微信真机回归。
- 更新操作手册中的实际步骤和截图占位。
- 重新审计平台对比文档，将每项状态附代码、页面和测试证据。
- 创建 Wave 8 验收、M9 总验收、上线包和 Hypercare。

必须完整运行并报告：
- node scripts/generate-doc-inventory.mjs
- node scripts/check-doc-index.mjs
- pnpm --filter api lint
- pnpm --filter api test:unit
- pnpm --filter api test:integration
- pnpm --filter web test
- pnpm --filter api build
- pnpm --filter web build
- 全部 OpenAPI validate
- git diff --check

禁止将未执行、被阻塞或失败的项目标为通过。最终报告必须给出测试数量、失败数量、迁移核对、真机矩阵、性能结果、缺陷、回滚、文档入口和最终验收结论。
```
