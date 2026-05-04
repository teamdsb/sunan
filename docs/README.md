# 文档总索引

> 最后整理：2026-05-04。本文覆盖仓库内所有 Markdown 文档（不含 `node_modules`），用于判断入口、状态和是否可作为当前依据。

## 状态口径

| 状态 | 含义 |
|---|---|
| 当前索引 | 导航入口，优先从这里找文档 |
| 当前真源 | 当前实现或规格决策的主要依据 |
| 当前规格 | 仍需维护的领域/API/DB/UI/state 规格 |
| 运维上线 | 上线、配置、回滚、观测或生产检查依据 |
| 条件基线 | 当前可用，但若收到正式业务材料需按变更单替换 |
| 审计快照 | 基于特定日期代码或资料的检查结果，可能随代码变化过期 |
| 验收归档 | 已完成 wave/里程碑的验收证据，不作为新需求待办 |
| 历史归档 | 已完成里程碑、计划或 backlog 的历史资料 |
| 已取代 | 已过期或已被后续文档替代，只保留作追溯 |
| 模板 | 复制或参考使用的模板 |

## 推荐入口

| 场景 | 入口 |
|---|---|
| Agent/仓库工作规则 | [../AGENTS.md](../AGENTS.md) |
| Claude Code 上下文 | [../CLAUDE.md](../CLAUDE.md) |
| 项目概览 | [../README.md](../README.md) |
| 文档完整清单 | [README.md](README.md) |
| 原始产品基线 | [需求文档.md](需求文档.md) |
| M6 完成快照 | [execplans.md](execplans.md) |
| 架构入口 | [architecture/overview.md](architecture/overview.md) |
| 开发流程 | [guides/sdd-workflow.md](guides/sdd-workflow.md) |
| 通用规格 | [specs/common/README.md](specs/common/README.md) |
| 企业微信规格 | [specs/wecom/README.md](specs/wecom/README.md) |
| 我的模块规格 | [specs/my/README.md](specs/my/README.md) |
| 办事模块规格 | [specs/office/README.md](specs/office/README.md) |
| 采购模块规格 | [specs/procurement/README.md](specs/procurement/README.md) |
| 工作平台规格 | [specs/workbench/README.md](specs/workbench/README.md) |

## 过期、已取代或易误用文档

| 文档 | 状态 | 当前替代/说明 |
|---|---|---|
| [execplans.md](execplans.md) | 历史归档 | M6 已完成，不作为当前待办 |
| [requirements/M6-逐条需求对照表.md](requirements/M6-逐条需求对照表.md) | 审计快照 | 基于 2026-04-22 代码审计；复审需重新跑代码对照 |
| [specs/common/M6-优先级修复清单（分wave）.md](specs/common/M6-优先级修复清单（分wave）.md) | 历史归档 | Wave A-D 已完成，证据看 common 验收与上线包 |
| [specs/workbench/m5-optimization-backlog.md](specs/workbench/m5-optimization-backlog.md) | 历史归档 | M5 backlog，M6 后新优化需重新立项 |
| [specs/wecom/workbench-real-device-regression.md](specs/wecom/workbench-real-device-regression.md) | 已取代 | 使用 [specs/wecom/real-device-regression-matrix.md](specs/wecom/real-device-regression-matrix.md) |
| [specs/workbench/finance-business-board-c1-gate-report.md](specs/workbench/finance-business-board-c1-gate-report.md) | 已取代 | 使用 `finance-business-board-blocker.md` 与 `finance-business-board-*.md` |

## 完整 Markdown 清单

### 仓库根目录

| 文档 | 状态 | 说明 |
|---|---|---|
| [../AGENTS.md](../AGENTS.md) | 当前索引 | Agent 工作规则和顶层导航 |
| [../CLAUDE.md](../CLAUDE.md) | 当前索引 | Claude Code 项目上下文 |
| [../README.md](../README.md) | 当前索引 | 项目简要说明 |

### docs 根目录

| 文档 | 状态 | 说明 |
|---|---|---|
| [README.md](README.md) | 当前索引 | 全量 Markdown 文档索引 |
| [需求文档.md](需求文档.md) | 当前真源 | 原始产品需求基线 |
| [glossary.md](glossary.md) | 当前规格 | 领域术语表 |
| [execplans.md](execplans.md) | 历史归档 | M6 已完成执行计划快照 |
| [M1-execplans.md](M1-execplans.md) | 历史归档 | M1 执行计划 |
| [M2-execplans.md](M2-execplans.md) | 历史归档 | M2 执行计划 |
| [M3-execplans.md](M3-execplans.md) | 历史归档 | M3 执行计划 |
| [M4-execplans.md](M4-execplans.md) | 历史归档 | M4 执行计划 |
| [M5-execplans.md](M5-execplans.md) | 历史归档 | M5 执行计划 |
| [M6-execplans.md](M6-execplans.md) | 历史归档 | M6 执行计划归档副本 |

### architecture

| 文档 | 状态 | 说明 |
|---|---|---|
| [architecture/overview.md](architecture/overview.md) | 当前真源 | 系统架构概览 |
| [architecture/tech-stack.md](architecture/tech-stack.md) | 当前真源 | 技术栈和版本锁定 |
| [architecture/security.md](architecture/security.md) | 当前真源 | 安全设计 |
| [architecture/deployment.md](architecture/deployment.md) | 运维上线 | 部署架构和生产发布约束 |

### architecture/adr

| 文档 | 状态 | 说明 |
|---|---|---|
| [architecture/adr/000-template.md](architecture/adr/000-template.md) | 模板 | ADR 模板 |
| [architecture/adr/001-wecom-h5-spa.md](architecture/adr/001-wecom-h5-spa.md) | 当前真源 | 企业微信 H5 SPA 决策 |
| [architecture/adr/002-react-antd-pro.md](architecture/adr/002-react-antd-pro.md) | 当前真源 | React + Ant Design Pro 决策 |
| [architecture/adr/003-nestjs-postgresql.md](architecture/adr/003-nestjs-postgresql.md) | 当前真源 | NestJS + PostgreSQL 决策 |
| [architecture/adr/004-aliyun-oss-storage.md](architecture/adr/004-aliyun-oss-storage.md) | 当前真源 | OSS 文件存储决策 |
| [architecture/adr/005-sdd-tdd-methodology.md](architecture/adr/005-sdd-tdd-methodology.md) | 当前真源 | SDD + TDD 方法决策 |

### guides

| 文档 | 状态 | 说明 |
|---|---|---|
| [guides/getting-started.md](guides/getting-started.md) | 当前索引 | 本地启动和常用命令 |
| [guides/sdd-workflow.md](guides/sdd-workflow.md) | 当前真源 | SDD 工作流程 |
| [guides/testing-strategy.md](guides/testing-strategy.md) | 当前真源 | 测试分层和约束 |
| [guides/wecom-dev-setup.md](guides/wecom-dev-setup.md) | 当前规格 | 企业微信开发环境配置 |
| [guides/qa-testing-my-module.md](guides/qa-testing-my-module.md) | 历史归档 | M1 我的模块手工 QA 指南，可用于回归参考 |

### requirements

| 文档 | 状态 | 说明 |
|---|---|---|
| [requirements/M1-我的.md](requirements/M1-我的.md) | 当前规格 | 我的模块需求基线 |
| [requirements/M2-办事.md](requirements/M2-办事.md) | 当前规格 | 办事模块需求基线 |
| [requirements/M3-采购管理.md](requirements/M3-采购管理.md) | 当前规格 | 采购管理需求基线 |
| [requirements/M4-工作平台.md](requirements/M4-工作平台.md) | 当前规格 | 工作平台需求基线 |
| [requirements/M5-上线强化与遗留收口.md](requirements/M5-上线强化与遗留收口.md) | 历史归档 | M5 上线强化需求 |
| [requirements/M6-全量兑现与完美上线.md](requirements/M6-全量兑现与完美上线.md) | 当前规格 | M6 全量兑现与上线需求 |
| [requirements/M6-逐条需求对照表.md](requirements/M6-逐条需求对照表.md) | 审计快照 | 2026-04-22 代码审计对照 |
| [requirements/非功能需求.md](requirements/非功能需求.md) | 当前真源 | 非功能需求 |

### specs/common

| 文档 | 状态 | 说明 |
|---|---|---|
| [specs/common/README.md](specs/common/README.md) | 当前索引 | 通用规格索引 |
| [specs/common/api-conventions.md](specs/common/api-conventions.md) | 当前真源 | API 规范 |
| [specs/common/db-conventions.md](specs/common/db-conventions.md) | 当前真源 | 数据库规范 |
| [specs/common/auth-spec.md](specs/common/auth-spec.md) | 当前规格 | 认证与授权 |
| [specs/common/file-upload-spec.md](specs/common/file-upload-spec.md) | 当前规格 | 文件上传 |
| [specs/common/notification-spec.md](specs/common/notification-spec.md) | 当前规格 | 通知推送 |
| [specs/common/operations-observability-m6.md](specs/common/operations-observability-m6.md) | 运维上线 | M6 运维与可观测 |
| [specs/common/M6-优先级修复清单（分wave）.md](specs/common/M6-优先级修复清单（分wave）.md) | 历史归档 | M6 Wave A-D 修复清单 |
| [specs/common/m6-wave5-quality-gates.md](specs/common/m6-wave5-quality-gates.md) | 验收归档 | Wave 5 质量门禁 |
| [specs/common/m6-wave6-go-live-package.md](specs/common/m6-wave6-go-live-package.md) | 运维上线 | M6 上线包索引 |
| [specs/common/m6-wave6-hypercare-daily-template.md](specs/common/m6-wave6-hypercare-daily-template.md) | 模板 | Hypercare 日报模板 |
| [specs/common/m6-wave6-test-and-smoke-report.md](specs/common/m6-wave6-test-and-smoke-report.md) | 验收归档 | 全量测试与冒烟报告 |
| [specs/common/m6-waved-governance-closure.md](specs/common/m6-waved-governance-closure.md) | 验收归档 | Wave D 治理收口 |
| [specs/common/acceptance-m6-wave1.md](specs/common/acceptance-m6-wave1.md) | 验收归档 | M6 Wave 1 验收 |
| [specs/common/acceptance-m6-wave4.md](specs/common/acceptance-m6-wave4.md) | 验收归档 | M6 Wave 4 验收 |
| [specs/common/acceptance-m6-wave5.md](specs/common/acceptance-m6-wave5.md) | 验收归档 | M6 Wave 5 验收 |
| [specs/common/acceptance-m6-wave6.md](specs/common/acceptance-m6-wave6.md) | 验收归档 | M6 Wave 6 验收 |
| [specs/common/acceptance-m6-wavec.md](specs/common/acceptance-m6-wavec.md) | 验收归档 | M6 Wave C 验收 |
| [specs/common/acceptance-m6-waved.md](specs/common/acceptance-m6-waved.md) | 验收归档 | M6 Wave D 验收 |

### specs/my

| 文档 | 状态 | 说明 |
|---|---|---|
| [specs/my/README.md](specs/my/README.md) | 当前索引 | 我的模块规格入口 |
| [specs/my/db/schema.md](specs/my/db/schema.md) | 当前规格 | 我的模块数据库总览 |
| [specs/my/db/vessels.md](specs/my/db/vessels.md) | 当前规格 | vessels 表 |
| [specs/my/db/vehicles.md](specs/my/db/vehicles.md) | 当前规格 | vehicles 表 |
| [specs/my/db/personnel.md](specs/my/db/personnel.md) | 当前规格 | personnel 表 |
| [specs/my/db/certificate-types.md](specs/my/db/certificate-types.md) | 当前规格 | certificate_types 表 |
| [specs/my/db/enterprise-profile.md](specs/my/db/enterprise-profile.md) | 当前规格 | enterprise_profiles 与附件 |
| [specs/my/db/enterprise-policy.md](specs/my/db/enterprise-policy.md) | 当前规格 | enterprise_policies 与附件 |
| [specs/my/db/certificates.md](specs/my/db/certificates.md) | 当前规格 | certificates 与附件 |
| [specs/my/db/certificate-reminders.md](specs/my/db/certificate-reminders.md) | 当前规格 | certificate_reminders 表 |
| [specs/my/db/ship-monitors.md](specs/my/db/ship-monitors.md) | 当前规格 | ship_monitors 表 |
| [specs/my/db/user-settings.md](specs/my/db/user-settings.md) | 当前规格 | user_settings 表 |
| [specs/my/state/store-structure.md](specs/my/state/store-structure.md) | 当前规格 | 前端 store 结构 |
| [specs/my/state/auth-slice.md](specs/my/state/auth-slice.md) | 当前规格 | auth 状态 |
| [specs/my/state/enterprise-slice.md](specs/my/state/enterprise-slice.md) | 当前规格 | enterpriseApi 状态 |
| [specs/my/state/certificate-slice.md](specs/my/state/certificate-slice.md) | 当前规格 | certificateApi 状态 |
| [specs/my/state/reminder-slice.md](specs/my/state/reminder-slice.md) | 当前规格 | reminderApi 状态 |
| [specs/my/state/monitor-slice.md](specs/my/state/monitor-slice.md) | 当前规格 | monitorApi 状态 |
| [specs/my/state/settings-slice.md](specs/my/state/settings-slice.md) | 当前规格 | settingsApi 状态 |
| [specs/my/ui/page-map.md](specs/my/ui/page-map.md) | 当前规格 | 页面地图 |
| [specs/my/ui/enterprise-profile-page.md](specs/my/ui/enterprise-profile-page.md) | 当前规格 | 企业资料页 |
| [specs/my/ui/enterprise-policy-page.md](specs/my/ui/enterprise-policy-page.md) | 当前规格 | 企业制度页 |
| [specs/my/ui/certificate-list-page.md](specs/my/ui/certificate-list-page.md) | 当前规格 | 电子证照列表页 |
| [specs/my/ui/certificate-detail-page.md](specs/my/ui/certificate-detail-page.md) | 当前规格 | 电子证照详情页 |
| [specs/my/ui/reminder-dashboard-page.md](specs/my/ui/reminder-dashboard-page.md) | 当前规格 | 证书提醒页 |
| [specs/my/ui/monitor-page.md](specs/my/ui/monitor-page.md) | 当前规格 | 船舶监控页 |
| [specs/my/ui/settings-page.md](specs/my/ui/settings-page.md) | 当前规格 | 设置页 |

### specs/office

| 文档 | 状态 | 说明 |
|---|---|---|
| [specs/office/README.md](specs/office/README.md) | 当前索引 | 办事模块规格入口 |
| [specs/office/db/schema.md](specs/office/db/schema.md) | 当前规格 | 办事模块数据库总览 |
| [specs/office/db/office-categories.md](specs/office/db/office-categories.md) | 当前规格 | office_categories 表 |
| [specs/office/db/office-entries.md](specs/office/db/office-entries.md) | 当前规格 | office_entries 表 |
| [specs/office/db/office-entry-audits.md](specs/office/db/office-entry-audits.md) | 当前规格 | office_entry_audits 表 |
| [specs/office/state/office-slice.md](specs/office/state/office-slice.md) | 当前规格 | 办事状态 |
| [specs/office/state/office-admin-slice.md](specs/office/state/office-admin-slice.md) | 当前规格 | 办事治理状态 |
| [specs/office/ui/page-map.md](specs/office/ui/page-map.md) | 当前规格 | 页面地图 |
| [specs/office/ui/office-home-page.md](specs/office/ui/office-home-page.md) | 当前规格 | 办事首页 |
| [specs/office/ui/office-search-page.md](specs/office/ui/office-search-page.md) | 当前规格 | 办事搜索页 |
| [specs/office/ui/office-admin-page.md](specs/office/ui/office-admin-page.md) | 当前规格 | 办事治理台 |

### specs/procurement

| 文档 | 状态 | 说明 |
|---|---|---|
| [specs/procurement/README.md](specs/procurement/README.md) | 当前索引 | 采购管理规格入口 |
| [specs/procurement/acceptance-wave5.md](specs/procurement/acceptance-wave5.md) | 验收归档 | M3 采购 Wave 5 验收 |
| [specs/procurement/db/schema.md](specs/procurement/db/schema.md) | 当前规格 | 采购数据库总览 |
| [specs/procurement/db/procurement-orders.md](specs/procurement/db/procurement-orders.md) | 当前规格 | procurement_orders 表 |
| [specs/procurement/db/procurement-order-approvals.md](specs/procurement/db/procurement-order-approvals.md) | 当前规格 | procurement_order_approvals 表 |
| [specs/procurement/db/procurement-order-files.md](specs/procurement/db/procurement-order-files.md) | 当前规格 | procurement_order_files 表 |
| [specs/procurement/db/procurement-reports.md](specs/procurement/db/procurement-reports.md) | 当前规格 | procurement_reports 表 |
| [specs/procurement/db/procurement-report-approvals.md](specs/procurement/db/procurement-report-approvals.md) | 当前规格 | procurement_report_approvals 表 |
| [specs/procurement/db/procurement-dimension-items.md](specs/procurement/db/procurement-dimension-items.md) | 当前规格 | procurement_dimension_items 表 |
| [specs/procurement/state/procurement-slice.md](specs/procurement/state/procurement-slice.md) | 当前规格 | 采购状态 |
| [specs/procurement/state/report-slice.md](specs/procurement/state/report-slice.md) | 当前规格 | 报表状态 |
| [specs/procurement/state/dictionary-slice.md](specs/procurement/state/dictionary-slice.md) | 当前规格 | 字典状态 |
| [specs/procurement/ui/page-map.md](specs/procurement/ui/page-map.md) | 当前规格 | 页面地图 |
| [specs/procurement/ui/order-create-page.md](specs/procurement/ui/order-create-page.md) | 当前规格 | 采购录单页 |
| [specs/procurement/ui/order-list-page.md](specs/procurement/ui/order-list-page.md) | 当前规格 | 采购单列表页 |
| [specs/procurement/ui/approval-page.md](specs/procurement/ui/approval-page.md) | 当前规格 | 采购审批页 |
| [specs/procurement/ui/report-page.md](specs/procurement/ui/report-page.md) | 当前规格 | 报表页 |
| [specs/procurement/ui/report-approval-page.md](specs/procurement/ui/report-approval-page.md) | 当前规格 | 报表审批页 |
| [specs/procurement/ui/dictionary-admin-page.md](specs/procurement/ui/dictionary-admin-page.md) | 当前规格 | 字典治理页 |
| [specs/procurement/ui/print-export.md](specs/procurement/ui/print-export.md) | 当前规格 | 打印与导出 |

### specs/wecom

| 文档 | 状态 | 说明 |
|---|---|---|
| [specs/wecom/README.md](specs/wecom/README.md) | 当前索引 | 企业微信规格入口 |
| [specs/wecom/oauth2-spec.md](specs/wecom/oauth2-spec.md) | 当前规格 | OAuth2 登录 |
| [specs/wecom/jssdk-spec.md](specs/wecom/jssdk-spec.md) | 当前规格 | JS-SDK |
| [specs/wecom/token-cache-spec.md](specs/wecom/token-cache-spec.md) | 当前规格 | token 缓存 |
| [specs/wecom/message-push-spec.md](specs/wecom/message-push-spec.md) | 当前规格 | 消息推送 |
| [specs/wecom/approval-native-bridge-spec.md](specs/wecom/approval-native-bridge-spec.md) | 当前规格 | 原生审批桥 |
| [specs/wecom/approval-ops-spec.md](specs/wecom/approval-ops-spec.md) | 当前规格 | 审批运维 |
| [specs/wecom/callback-security-spec.md](specs/wecom/callback-security-spec.md) | 当前真源 | 回调安全 |
| [specs/wecom/production-config-matrix.md](specs/wecom/production-config-matrix.md) | 运维上线 | 生产配置矩阵 |
| [specs/wecom/template-binding-checklist.md](specs/wecom/template-binding-checklist.md) | 运维上线 | 模板绑定清单 |
| [specs/wecom/production-cutover-runbook.md](specs/wecom/production-cutover-runbook.md) | 运维上线 | 上线切换 runbook |
| [specs/wecom/go-live-materials-checklist.md](specs/wecom/go-live-materials-checklist.md) | 运维上线 | 上线材料清单 |
| [specs/wecom/go-live-preflight-2026-04-22.md](specs/wecom/go-live-preflight-2026-04-22.md) | 验收归档 | 上线前最终核对 |
| [specs/wecom/real-device-regression-matrix.md](specs/wecom/real-device-regression-matrix.md) | 当前真源 | 四大板块真机回归矩阵 |
| [specs/wecom/workbench-go-live-checklist.md](specs/wecom/workbench-go-live-checklist.md) | 运维上线 | 工作平台上线检查 |
| [specs/wecom/procurement-go-live-checklist.md](specs/wecom/procurement-go-live-checklist.md) | 运维上线 | 采购模块上线检查 |
| [specs/wecom/workbench-real-device-regression.md](specs/wecom/workbench-real-device-regression.md) | 已取代 | M5 工作平台真机模板 |
| [specs/wecom/acceptance-m6-wave3.md](specs/wecom/acceptance-m6-wave3.md) | 验收归档 | M6 Wave 3 验收 |

### specs/workbench

| 文档 | 状态 | 说明 |
|---|---|---|
| [specs/workbench/README.md](specs/workbench/README.md) | 当前索引 | 工作平台规格入口 |
| [specs/workbench/m5-optimization-backlog.md](specs/workbench/m5-optimization-backlog.md) | 历史归档 | M5 实施 backlog |
| [specs/workbench/finance-business-board-blocker.md](specs/workbench/finance-business-board-blocker.md) | 验收归档 | 财务板块 blocker 已解除记录 |
| [specs/workbench/finance-business-board-c1-gate-report.md](specs/workbench/finance-business-board-c1-gate-report.md) | 已取代 | C-1 初判历史记录 |
| [specs/workbench/finance-business-board-field-dictionary.md](specs/workbench/finance-business-board-field-dictionary.md) | 条件基线 | 财务板块字段字典 |
| [specs/workbench/finance-business-board-sample-forms.md](specs/workbench/finance-business-board-sample-forms.md) | 条件基线 | 财务板块样表 |
| [specs/workbench/finance-business-board-flowchart.md](specs/workbench/finance-business-board-flowchart.md) | 条件基线 | 财务板块流程图 |
| [specs/workbench/finance-business-board-print-template.md](specs/workbench/finance-business-board-print-template.md) | 条件基线 | 财务板块打印模板 |
| [specs/workbench/db/workbench-domain-model.md](specs/workbench/db/workbench-domain-model.md) | 当前规格 | 工作平台领域模型 |
| [specs/workbench/db/workbench-runtime-schema.md](specs/workbench/db/workbench-runtime-schema.md) | 当前规格 | 工作平台运行时存储 |
| [specs/workbench/db/workbench-module-matrix.md](specs/workbench/db/workbench-module-matrix.md) | 当前真源 | 工作平台模块矩阵 |
| [specs/workbench/db/workbench-permission-matrix.md](specs/workbench/db/workbench-permission-matrix.md) | 当前规格 | 工作平台权限矩阵 |
| [specs/workbench/state/workbench-shell.md](specs/workbench/state/workbench-shell.md) | 当前规格 | 工作平台壳层状态 |
| [specs/workbench/state/workbench-records.md](specs/workbench/state/workbench-records.md) | 当前规格 | 工作平台记录状态 |
| [specs/workbench/state/workbench-approval-sync.md](specs/workbench/state/workbench-approval-sync.md) | 当前规格 | 工作平台审批同步 |
| [specs/workbench/ui/workbench-information-architecture.md](specs/workbench/ui/workbench-information-architecture.md) | 当前规格 | 信息架构 |
| [specs/workbench/ui/workbench-template-pages.md](specs/workbench/ui/workbench-template-pages.md) | 当前规格 | 模板页面规格 |
| [specs/workbench/ui/workbench-department-modules.md](specs/workbench/ui/workbench-department-modules.md) | 当前规格 | 部门模块高保真要求 |
| [specs/workbench/acceptance-wave1.md](specs/workbench/acceptance-wave1.md) | 验收归档 | M4 Wave 1 验收 |
| [specs/workbench/acceptance-wave2.md](specs/workbench/acceptance-wave2.md) | 验收归档 | M4 Wave 2 验收 |
| [specs/workbench/acceptance-wave3.md](specs/workbench/acceptance-wave3.md) | 验收归档 | M4 Wave 3 验收 |
| [specs/workbench/acceptance-wave4.md](specs/workbench/acceptance-wave4.md) | 验收归档 | M4 Wave 4 验收 |
| [specs/workbench/acceptance-wave5.md](specs/workbench/acceptance-wave5.md) | 验收归档 | M4 Wave 5 验收 |
| [specs/workbench/acceptance-wave6.md](specs/workbench/acceptance-wave6.md) | 验收归档 | M4 Wave 6 验收 |
| [specs/workbench/acceptance-wave7.md](specs/workbench/acceptance-wave7.md) | 验收归档 | M4 Wave 7 验收 |
| [specs/workbench/acceptance-wave8.md](specs/workbench/acceptance-wave8.md) | 验收归档 | M4 Wave 8 验收 |
| [specs/workbench/acceptance-m5-wave1.md](specs/workbench/acceptance-m5-wave1.md) | 验收归档 | M5 Wave 1 验收 |
| [specs/workbench/acceptance-m5-wave2.md](specs/workbench/acceptance-m5-wave2.md) | 验收归档 | M5 Wave 2 验收 |
| [specs/workbench/acceptance-m5-wave3.md](specs/workbench/acceptance-m5-wave3.md) | 验收归档 | M5 Wave 3 验收 |
| [specs/workbench/acceptance-m5-wave4.md](specs/workbench/acceptance-m5-wave4.md) | 验收归档 | M5 Wave 4 验收 |
| [specs/workbench/acceptance-m6-wave2.md](specs/workbench/acceptance-m6-wave2.md) | 验收归档 | M6 Wave 2 验收 |
