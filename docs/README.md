---
status: current-index
owner: docs
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 文档入口

> 状态：当前文档导航入口。日常开发只从这里和领域 README 进入；完整清单见 `inventory.md`。

## 状态口径

| 状态 | 含义 |
|---|---|
| `current-index` | 导航入口，优先从这里找文档 |
| `current-source` | 当前实现或规格决策的主要依据 |
| `current-spec` | 仍需维护的领域/API/DB/UI/state 规格 |
| `operations` | 上线、配置、回滚、观测或生产检查依据 |
| `conditional-baseline` | 当前可用，但收到正式业务材料后需按变更单替换 |
| `audit-snapshot` | 基于特定日期代码或资料的检查结果，可能随代码变化过期 |
| `acceptance-archive` | 已完成 wave/里程碑的验收证据，不作为新需求待办 |
| `historical-archive` | 已完成里程碑、计划或 backlog 的历史资料 |
| `superseded` | 已过期或被后续文档替代，只保留作追溯 |
| `template` | 复制或参考使用的模板 |

## 推荐入口

| 场景 | 入口 |
|---|---|
| 完整 Markdown 清单 | [inventory.md](inventory.md) |
| 历史归档目录 | [archive/README.md](archive/README.md) |
| Agent/仓库工作规则 | [../AGENTS.md](../AGENTS.md) |
| Claude Code 上下文 | [../CLAUDE.md](../CLAUDE.md) |
| 项目概览 | [../README.md](../README.md) |
| 原始产品基线 | [需求文档.md](需求文档.md) |
| 苏南平台操作手册 | [handbook/苏南船舶管理系统操作手册.md](handbook/苏南船舶管理系统操作手册.md) |
| 平台功能对比与升级建议 | [handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md](handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md) |
| 执行计划入口 | [execplans.md](execplans.md) |
| M7/M8 升级总路线图 | [plans/M7-M8-upgrade-roadmap.md](plans/M7-M8-upgrade-roadmap.md) |
| 当前计划与 Wave backlog | [plans/README.md](plans/README.md) |
| Wave 实施提示词 | [prompts/README.md](prompts/README.md) |
| M7 需求 | [requirements/M7-安全管理底座与核心闭环.md](requirements/M7-安全管理底座与核心闭环.md) |
| M8 需求 | [requirements/M8-专业安全业务深化与体系完善.md](requirements/M8-专业安全业务深化与体系完善.md) |
| 架构入口 | [architecture/overview.md](architecture/overview.md) |
| 开发流程 | [guides/sdd-workflow.md](guides/sdd-workflow.md) |
| 通用规格 | [specs/common/README.md](specs/common/README.md) |
| 企业微信规格 | [specs/wecom/README.md](specs/wecom/README.md) |
| 我的模块规格 | [specs/my/README.md](specs/my/README.md) |
| 办事模块规格 | [specs/office/README.md](specs/office/README.md) |
| 采购模块规格 | [specs/procurement/README.md](specs/procurement/README.md) |
| 工作平台规格 | [specs/workbench/README.md](specs/workbench/README.md) |
| 安全管理规格 | [specs/safety/README.md](specs/safety/README.md) |

## 过期、已取代或易误用文档

| 文档 | 状态 | 当前替代/说明 |
|---|---|---|
| [archive/audits/M6-逐条需求对照表.md](archive/audits/M6-逐条需求对照表.md) | `audit-snapshot` | 基于 2026-04-22 代码审计；复审需重新跑代码对照 |
| [archive/backlogs/common/M6-优先级修复清单（分wave）.md](archive/backlogs/common/M6-优先级修复清单（分wave）.md) | `historical-archive` | Wave A-D 已完成，证据看 `docs/archive/acceptance/common/` |
| [archive/backlogs/workbench/m5-optimization-backlog.md](archive/backlogs/workbench/m5-optimization-backlog.md) | `historical-archive` | M5 backlog，M6 后新优化需重新立项 |
| [archive/superseded/wecom/workbench-real-device-regression.md](archive/superseded/wecom/workbench-real-device-regression.md) | `superseded` | 使用 [specs/wecom/real-device-regression-matrix.md](specs/wecom/real-device-regression-matrix.md) |
| [archive/superseded/workbench/finance-business-board-c1-gate-report.md](archive/superseded/workbench/finance-business-board-c1-gate-report.md) | `superseded` | 使用 `finance-business-board-blocker.md` 与 `finance-business-board-*.md` |

## 维护规则

- 新增、移动或删除 Markdown 后运行 `node scripts/generate-doc-inventory.mjs`，再运行 `node scripts/check-doc-index.mjs`。
- 新文档必须包含 YAML 状态头，并登记到 [inventory.md](inventory.md)。
- `archive/` 下文档只用于追溯；当前开发应优先使用领域 README 与当前规格。
