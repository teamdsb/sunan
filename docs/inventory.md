---
status: current-index
owner: docs
updated: 2026-05-04
replaces: []
replaced_by: []
---

# Markdown 文档清单

> 本文件由 `node scripts/generate-doc-inventory.mjs` 生成，覆盖仓库内所有 Markdown 文档（不含 `node_modules`）。日常导航请优先使用 [README.md](README.md)。

总数：222 个 Markdown 文件。

## repository-root

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [AGENTS.md](../AGENTS.md) | `current-index` | `repository` | Repository Guidelines |
| [CLAUDE.md](../CLAUDE.md) | `current-index` | `repository` | CLAUDE.md |
| [README.md](../README.md) | `current-index` | `repository` | sunan |
| [deploy/README.md](../deploy/README.md) | `current-index` | `operations` | 苏南船舶部署文档索引 |
| [deploy/backup-restore.md](../deploy/backup-restore.md) | `operations` | `operations` | 备份与恢复手册 |
| [deploy/bootstrap-server.md](../deploy/bootstrap-server.md) | `operations` | `operations` | 新服务器初始化手册 |
| [deploy/deployment-runbook.md](../deploy/deployment-runbook.md) | `operations` | `operations` | 部署与发布操作手册 |
| [deploy/development-operations-guidelines.md](../deploy/development-operations-guidelines.md) | `operations` | `operations` | 开发与运维操作规范 |
| [deploy/environment-variables.md](../deploy/environment-variables.md) | `operations` | `operations` | 生产环境变量说明 |
| [deploy/server-inventory.md](../deploy/server-inventory.md) | `operations` | `operations` | 生产服务器资源清单 |
| [deploy/tls-letsencrypt.md](../deploy/tls-letsencrypt.md) | `operations` | `operations` | HTTPS 与 Let's Encrypt 证书 |
| [deploy/troubleshooting.md](../deploy/troubleshooting.md) | `operations` | `operations` | 故障处理手册 |
| [deploy/wecom-operations.md](../deploy/wecom-operations.md) | `operations` | `operations` | 企业微信运维手册 |
| [findings.md](../findings.md) | `operations` | `planning` | 发现与决策 |
| [progress.md](../progress.md) | `operations` | `planning` | 进度日志 |
| [task_plan.md](../task_plan.md) | `operations` | `planning` | 任务计划：新 M7 修复与 M8/M9 顺延文档规划 |

## docs-root

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/README.md](README.md) | `current-index` | `docs` | 文档入口 |
| [docs/execplans.md](execplans.md) | `current-index` | `docs` | 执行计划入口 |
| [docs/glossary.md](glossary.md) | `current-spec` | `docs` | 领域术语表 |
| [docs/inventory.md](inventory.md) | `current-index` | `docs` | Markdown 文档清单 |
| [docs/需求文档.md](需求文档.md) | `current-source` | `docs` | 附件一 |

## architecture

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/architecture/deployment.md](architecture/deployment.md) | `operations` | `architecture` | 部署架构 |
| [docs/architecture/overview.md](architecture/overview.md) | `current-source` | `architecture` | 系统架构概览 |
| [docs/architecture/security.md](architecture/security.md) | `current-source` | `architecture` | 安全设计 |
| [docs/architecture/tech-stack.md](architecture/tech-stack.md) | `current-source` | `architecture` | 技术选型与版本锁定 |

## architecture/adr

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/architecture/adr/000-template.md](architecture/adr/000-template.md) | `template` | `architecture` | ADR 模板 |
| [docs/architecture/adr/001-wecom-h5-spa.md](architecture/adr/001-wecom-h5-spa.md) | `current-source` | `architecture` | ADR-001 企业微信 H5 单页应用 |
| [docs/architecture/adr/002-react-antd-pro.md](architecture/adr/002-react-antd-pro.md) | `current-source` | `architecture` | ADR-002 React 18 + Ant Design Pro |
| [docs/architecture/adr/003-nestjs-postgresql.md](architecture/adr/003-nestjs-postgresql.md) | `current-source` | `architecture` | ADR-003 NestJS + PostgreSQL |
| [docs/architecture/adr/004-aliyun-oss-storage.md](architecture/adr/004-aliyun-oss-storage.md) | `current-source` | `architecture` | ADR-004 阿里云 OSS 文件存储 |
| [docs/architecture/adr/005-sdd-tdd-methodology.md](architecture/adr/005-sdd-tdd-methodology.md) | `current-source` | `architecture` | ADR-005 SDD + TDD 开发方法 |

## guides

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/guides/getting-started.md](guides/getting-started.md) | `current-index` | `guides` | 快速开始 |
| [docs/guides/qa-testing-my-module.md](guides/qa-testing-my-module.md) | `historical-archive` | `guides` | "我的"模块 QA 测试指南 |
| [docs/guides/sdd-workflow.md](guides/sdd-workflow.md) | `current-source` | `guides` | SDD 工作流程 |
| [docs/guides/testing-strategy.md](guides/testing-strategy.md) | `current-source` | `guides` | 测试策略 |
| [docs/guides/wecom-dev-setup.md](guides/wecom-dev-setup.md) | `current-spec` | `guides` | 企业微信开发环境配置 |

## requirements

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/requirements/M1-我的.md](requirements/M1-我的.md) | `current-spec` | `requirements` | 里程碑 1 需求文档："我的"模块 |
| [docs/requirements/M2-办事.md](requirements/M2-办事.md) | `current-spec` | `requirements` | 里程碑 2 需求文档: "办事"模块 |
| [docs/requirements/M3-采购管理.md](requirements/M3-采购管理.md) | `current-spec` | `requirements` | 里程碑 3 需求文档："采购管理"模块 |
| [docs/requirements/M4-工作平台.md](requirements/M4-工作平台.md) | `current-spec` | `requirements` | 里程碑 4 需求文档：工作平台全量业务实现 |
| [docs/requirements/M5-上线强化与遗留收口.md](requirements/M5-上线强化与遗留收口.md) | `historical-archive` | `requirements` | 里程碑 5 需求文档：上线强化与遗留收口 |
| [docs/requirements/M6-全量兑现与完美上线.md](requirements/M6-全量兑现与完美上线.md) | `current-spec` | `requirements` | 里程碑 6 需求文档：全量兑现与完美上线 |
| [docs/requirements/M7-上线体验与导航修复.md](requirements/M7-上线体验与导航修复.md) | `current-spec` | `requirements` | 里程碑 7 需求文档：上线体验与导航修复 |
| [docs/requirements/M8-安全管理底座与核心闭环.md](requirements/M8-安全管理底座与核心闭环.md) | `current-spec` | `requirements` | 里程碑 8 需求文档：安全管理底座与核心闭环 |
| [docs/requirements/M9-专业安全业务深化与体系完善.md](requirements/M9-专业安全业务深化与体系完善.md) | `current-spec` | `requirements` | 里程碑 9 需求文档：专业安全业务深化与体系完善 |
| [docs/requirements/非功能需求.md](requirements/非功能需求.md) | `current-source` | `requirements` | 非功能需求 |

## plans

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/plans/M7-execplans.md](plans/M7-execplans.md) | `current-spec` | `planning` | M7 执行计划：上线体验与导航修复 |
| [docs/plans/M7-wave-backlog.md](plans/M7-wave-backlog.md) | `current-spec` | `planning` | M7 分 Wave 实施清单：上线体验与导航修复 |
| [docs/plans/M8-M9-upgrade-roadmap.md](plans/M8-M9-upgrade-roadmap.md) | `current-spec` | `planning` | M8-M9 升级总路线图：安全管理数字化闭环 |
| [docs/plans/M8-execplans.md](plans/M8-execplans.md) | `current-spec` | `planning` | M8 执行计划：安全管理底座与核心闭环 |
| [docs/plans/M8-wave-backlog.md](plans/M8-wave-backlog.md) | `current-spec` | `planning` | M8 分 Wave 实施清单 |
| [docs/plans/M9-execplans.md](plans/M9-execplans.md) | `current-spec` | `planning` | M9 执行计划：专业安全业务深化与体系完善 |
| [docs/plans/M9-wave-backlog.md](plans/M9-wave-backlog.md) | `current-spec` | `planning` | M9 分 Wave 实施清单 |
| [docs/plans/README.md](plans/README.md) | `current-index` | `planning` | 当前执行计划索引 |
| [docs/plans/wave-acceptance-template.md](plans/wave-acceptance-template.md) | `template` | `planning` | Mx Wave N 验收模板 |

## prompts

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/prompts/README.md](prompts/README.md) | `current-index` | `delivery` | 当前修复与后续升级 Wave 提示词索引 |
| [docs/prompts/m7/wave-1-upload-and-my-polish.md](prompts/m7/wave-1-upload-and-my-polish.md) | `operations` | `delivery` | M7 Wave 1 提示词：文件上传与我的板块视觉收口 |
| [docs/prompts/m7/wave-2-office-css-search.md](prompts/m7/wave-2-office-css-search.md) | `operations` | `delivery` | M7 Wave 2 提示词：办事分类 CSS 与搜索体验 |
| [docs/prompts/m7/wave-3-procurement-navigation-pdf.md](prompts/m7/wave-3-procurement-navigation-pdf.md) | `operations` | `delivery` | M7 Wave 3 提示词：采购返回、附件与中文 PDF |
| [docs/prompts/m7/wave-4-workbench-navigation-density.md](prompts/m7/wave-4-workbench-navigation-density.md) | `operations` | `delivery` | M7 Wave 4 提示词：工作台返回、组件密度与导航锚点 |
| [docs/prompts/m7/wave-5-wecom-direct-regression.md](prompts/m7/wave-5-wecom-direct-regression.md) | `operations` | `delivery` | M7 Wave 5 提示词：企业微信直达与跨模块回归 |
| [docs/prompts/m7/wave-6-final-acceptance-gate.md](prompts/m7/wave-6-final-acceptance-gate.md) | `operations` | `delivery` | M7 Wave 6 提示词：最终收口与 M8/M9 重启门禁 |
| [docs/prompts/m8/wave-1-spec-baseline.md](prompts/m8/wave-1-spec-baseline.md) | `operations` | `delivery` | M8 Wave 1 提示词：文档、架构与规格基线 |
| [docs/prompts/m8/wave-2-permission-workflow.md](prompts/m8/wave-2-permission-workflow.md) | `operations` | `delivery` | M8 Wave 2 提示词：数据权限与流程状态链 |
| [docs/prompts/m8/wave-3-evidence-export.md](prompts/m8/wave-3-evidence-export.md) | `operations` | `delivery` | M8 Wave 3 提示词：证据、打印、导出与移动能力 |
| [docs/prompts/m8/wave-4-master-data.md](prompts/m8/wave-4-master-data.md) | `operations` | `delivery` | M8 Wave 4 提示词：安全主数据中心 |
| [docs/prompts/m8/wave-5-plan-task.md](prompts/m8/wave-5-plan-task.md) | `operations` | `delivery` | M8 Wave 5 提示词：计划任务、统一待办与日历 |
| [docs/prompts/m8/wave-6-inspection-capa.md](prompts/m8/wave-6-inspection-capa.md) | `operations` | `delivery` | M8 Wave 6 提示词：检查、问题与 CAPA |
| [docs/prompts/m8/wave-7-release-acceptance.md](prompts/m8/wave-7-release-acceptance.md) | `operations` | `delivery` | M8 Wave 7 提示词：迁移、联调、上线与验收 |
| [docs/prompts/m9/wave-1-baseline-specs.md](prompts/m9/wave-1-baseline-specs.md) | `operations` | `delivery` | M9 Wave 1 提示词：M8 基线回归与专业规格冻结 |
| [docs/prompts/m9/wave-2-personnel-safety.md](prompts/m9/wave-2-personnel-safety.md) | `operations` | `delivery` | M9 Wave 2 提示词：人员安全与培训资格 |
| [docs/prompts/m9/wave-3-ship-operations.md](prompts/m9/wave-3-ship-operations.md) | `operations` | `delivery` | M9 Wave 3 提示词：航次与船舶高风险作业 |
| [docs/prompts/m9/wave-4-emergency-incident.md](prompts/m9/wave-4-emergency-incident.md) | `operations` | `delivery` | M9 Wave 4 提示词：应急、事故险情与防台 |
| [docs/prompts/m9/wave-5-equipment-spares.md](prompts/m9/wave-5-equipment-spares.md) | `operations` | `delivery` | M9 Wave 5 提示词：设备维护、修理、备件与采购 |
| [docs/prompts/m9/wave-6-safety-governance.md](prompts/m9/wave-6-safety-governance.md) | `operations` | `delivery` | M9 Wave 6 提示词：安全责任、费用与管理复查 |
| [docs/prompts/m9/wave-7-documents-audit.md](prompts/m9/wave-7-documents-audit.md) | `operations` | `delivery` | M9 Wave 7 提示词：受控文件、内审、统计与档案 |
| [docs/prompts/m9/wave-8-release-acceptance.md](prompts/m9/wave-8-release-acceptance.md) | `operations` | `delivery` | M9 Wave 8 提示词：全域联调、上线与验收 |

## specs/common

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/specs/common/README.md](specs/common/README.md) | `current-index` | `common` | 通用规格索引 |
| [docs/specs/common/api-conventions.md](specs/common/api-conventions.md) | `current-source` | `common` | API 规范 |
| [docs/specs/common/auth-spec.md](specs/common/auth-spec.md) | `current-spec` | `common` | 认证与授权规格 |
| [docs/specs/common/db-conventions.md](specs/common/db-conventions.md) | `current-source` | `common` | 数据库规范 |
| [docs/specs/common/file-upload-spec.md](specs/common/file-upload-spec.md) | `current-spec` | `common` | 文件上传规格 |
| [docs/specs/common/frontend-experience-guidelines.md](specs/common/frontend-experience-guidelines.md) | `current-spec` | `common` | 前端体验与企业微信 H5 指引 |
| [docs/specs/common/notification-spec.md](specs/common/notification-spec.md) | `current-spec` | `common` | 通知推送规格 |
| [docs/specs/common/operations-observability-m6.md](specs/common/operations-observability-m6.md) | `operations` | `common` | M6 生产运维与可观测交付（Wave 4） |

## specs/my

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/specs/my/README.md](specs/my/README.md) | `current-index` | `my` | 我的模块规格（里程碑 M1） |
| [docs/specs/my/db/certificate-reminders.md](specs/my/db/certificate-reminders.md) | `current-spec` | `my` | `certificate_reminders` 表规格 |
| [docs/specs/my/db/certificate-types.md](specs/my/db/certificate-types.md) | `current-spec` | `my` | `certificate_types` 表规格 |
| [docs/specs/my/db/certificates.md](specs/my/db/certificates.md) | `current-spec` | `my` | `certificates` 与 `certificate_files` 表规格 |
| [docs/specs/my/db/enterprise-policy.md](specs/my/db/enterprise-policy.md) | `current-spec` | `my` | `enterprise_policies` 与 `enterprise_policy_files` 表规格 |
| [docs/specs/my/db/enterprise-profile.md](specs/my/db/enterprise-profile.md) | `current-spec` | `my` | `enterprise_profiles` 与 `enterprise_profile_files` 表规格 |
| [docs/specs/my/db/personnel.md](specs/my/db/personnel.md) | `current-spec` | `my` | `personnel` 表规格 |
| [docs/specs/my/db/schema.md](specs/my/db/schema.md) | `current-spec` | `my` | "我的"模块数据库总览 |
| [docs/specs/my/db/ship-monitors.md](specs/my/db/ship-monitors.md) | `current-spec` | `my` | `ship_monitors` 表规格 |
| [docs/specs/my/db/user-settings.md](specs/my/db/user-settings.md) | `current-spec` | `my` | `user_settings` 表规格 |
| [docs/specs/my/db/vehicles.md](specs/my/db/vehicles.md) | `current-spec` | `my` | `vehicles` 表规格 |
| [docs/specs/my/db/vessels.md](specs/my/db/vessels.md) | `current-spec` | `my` | `vessels` 表规格 |
| [docs/specs/my/state/auth-slice.md](specs/my/state/auth-slice.md) | `current-spec` | `my` | `auth` 状态规格 |
| [docs/specs/my/state/certificate-slice.md](specs/my/state/certificate-slice.md) | `current-spec` | `my` | `certificateApi` 状态规格 |
| [docs/specs/my/state/enterprise-slice.md](specs/my/state/enterprise-slice.md) | `current-spec` | `my` | `enterpriseApi` 状态规格 |
| [docs/specs/my/state/monitor-slice.md](specs/my/state/monitor-slice.md) | `current-spec` | `my` | `monitorApi` 状态规格 |
| [docs/specs/my/state/reminder-slice.md](specs/my/state/reminder-slice.md) | `current-spec` | `my` | `reminderApi` 状态规格 |
| [docs/specs/my/state/settings-slice.md](specs/my/state/settings-slice.md) | `current-spec` | `my` | `settingsApi` 状态规格 |
| [docs/specs/my/state/store-structure.md](specs/my/state/store-structure.md) | `current-spec` | `my` | "我的"模块前端状态总览 |
| [docs/specs/my/ui/certificate-detail-page.md](specs/my/ui/certificate-detail-page.md) | `current-spec` | `my` | 电子证照详情页规格 |
| [docs/specs/my/ui/certificate-list-page.md](specs/my/ui/certificate-list-page.md) | `current-spec` | `my` | 电子证照列表页规格 |
| [docs/specs/my/ui/enterprise-policy-page.md](specs/my/ui/enterprise-policy-page.md) | `current-spec` | `my` | 企业制度页面规格 |
| [docs/specs/my/ui/enterprise-profile-page.md](specs/my/ui/enterprise-profile-page.md) | `current-spec` | `my` | 企业资料页面规格 |
| [docs/specs/my/ui/monitor-page.md](specs/my/ui/monitor-page.md) | `current-spec` | `my` | 船舶监控页面规格 |
| [docs/specs/my/ui/page-map.md](specs/my/ui/page-map.md) | `current-spec` | `my` | "我的"模块页面地图 |
| [docs/specs/my/ui/reminder-dashboard-page.md](specs/my/ui/reminder-dashboard-page.md) | `current-spec` | `my` | 证书提醒页面规格 |
| [docs/specs/my/ui/settings-page.md](specs/my/ui/settings-page.md) | `current-spec` | `my` | 设置页面规格 |

## specs/office

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/specs/office/README.md](specs/office/README.md) | `current-index` | `office` | 办事模块规格（里程碑 M2） |
| [docs/specs/office/db/office-categories.md](specs/office/db/office-categories.md) | `current-spec` | `office` | office_categories |
| [docs/specs/office/db/office-entries.md](specs/office/db/office-entries.md) | `current-spec` | `office` | office_entries |
| [docs/specs/office/db/office-entry-audits.md](specs/office/db/office-entry-audits.md) | `current-spec` | `office` | office_entry_audits |
| [docs/specs/office/db/schema.md](specs/office/db/schema.md) | `current-spec` | `office` | 办事模块数据库总览 |
| [docs/specs/office/state/office-admin-slice.md](specs/office/state/office-admin-slice.md) | `current-spec` | `office` | 办事治理状态规格 |
| [docs/specs/office/state/office-slice.md](specs/office/state/office-slice.md) | `current-spec` | `office` | 办事模块状态规格 |
| [docs/specs/office/ui/office-admin-page.md](specs/office/ui/office-admin-page.md) | `current-spec` | `office` | 办事治理台页面规格 |
| [docs/specs/office/ui/office-home-page.md](specs/office/ui/office-home-page.md) | `current-spec` | `office` | 办事首页页面规格 |
| [docs/specs/office/ui/office-search-page.md](specs/office/ui/office-search-page.md) | `current-spec` | `office` | 办事搜索页页面规格 |
| [docs/specs/office/ui/page-map.md](specs/office/ui/page-map.md) | `current-spec` | `office` | 办事模块页面地图 |

## specs/procurement

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/specs/procurement/README.md](specs/procurement/README.md) | `current-index` | `procurement` | 采购管理模块规格（里程碑 M3） |
| [docs/specs/procurement/budget-and-responsive-form-design.md](specs/procurement/budget-and-responsive-form-design.md) | `current-spec` | `procurement` | 采购年度预算与全站响应式表单设计 |
| [docs/specs/procurement/db/procurement-budgets.md](specs/procurement/db/procurement-budgets.md) | `current-spec` | `procurement` | procurement_budgets 与 procurement_budget_audits 表规格 |
| [docs/specs/procurement/db/procurement-dimension-items.md](specs/procurement/db/procurement-dimension-items.md) | `current-spec` | `procurement` | procurement_dimension_items 表规格 |
| [docs/specs/procurement/db/procurement-order-approvals.md](specs/procurement/db/procurement-order-approvals.md) | `current-spec` | `procurement` | procurement_order_approvals 表规格 |
| [docs/specs/procurement/db/procurement-order-files.md](specs/procurement/db/procurement-order-files.md) | `current-spec` | `procurement` | procurement_order_files 表规格 |
| [docs/specs/procurement/db/procurement-orders.md](specs/procurement/db/procurement-orders.md) | `current-spec` | `procurement` | procurement_orders 表规格 |
| [docs/specs/procurement/db/procurement-report-approvals.md](specs/procurement/db/procurement-report-approvals.md) | `current-spec` | `procurement` | procurement_report_approvals 表规格 |
| [docs/specs/procurement/db/procurement-reports.md](specs/procurement/db/procurement-reports.md) | `current-spec` | `procurement` | procurement_reports 表规格 |
| [docs/specs/procurement/db/schema.md](specs/procurement/db/schema.md) | `current-spec` | `procurement` | 采购模块数据库总览 |
| [docs/specs/procurement/state/budget-slice.md](specs/procurement/state/budget-slice.md) | `current-spec` | `procurement` | 采购预算状态规格 |
| [docs/specs/procurement/state/dictionary-slice.md](specs/procurement/state/dictionary-slice.md) | `current-spec` | `procurement` | 采购字典状态规格 |
| [docs/specs/procurement/state/procurement-slice.md](specs/procurement/state/procurement-slice.md) | `current-spec` | `procurement` | 采购模块状态规格 |
| [docs/specs/procurement/state/report-slice.md](specs/procurement/state/report-slice.md) | `current-spec` | `procurement` | 报表模块状态规格 |
| [docs/specs/procurement/ui/approval-page.md](specs/procurement/ui/approval-page.md) | `current-spec` | `procurement` | 采购审批页规格 |
| [docs/specs/procurement/ui/budget-admin-page.md](specs/procurement/ui/budget-admin-page.md) | `current-spec` | `procurement` | 采购预算管理页规格 |
| [docs/specs/procurement/ui/dictionary-admin-page.md](specs/procurement/ui/dictionary-admin-page.md) | `current-spec` | `procurement` | 字典治理页规格 |
| [docs/specs/procurement/ui/order-create-page.md](specs/procurement/ui/order-create-page.md) | `current-spec` | `procurement` | 采购录单页规格 |
| [docs/specs/procurement/ui/order-list-page.md](specs/procurement/ui/order-list-page.md) | `current-spec` | `procurement` | 采购单列表页规格 |
| [docs/specs/procurement/ui/page-map.md](specs/procurement/ui/page-map.md) | `current-spec` | `procurement` | 采购模块页面地图 |
| [docs/specs/procurement/ui/print-export.md](specs/procurement/ui/print-export.md) | `current-spec` | `procurement` | 打印与导出规格 |
| [docs/specs/procurement/ui/report-approval-page.md](specs/procurement/ui/report-approval-page.md) | `current-spec` | `procurement` | 报表审批页规格 |
| [docs/specs/procurement/ui/report-page.md](specs/procurement/ui/report-page.md) | `current-spec` | `procurement` | 报表页规格 |

## specs/safety

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/specs/safety/README.md](specs/safety/README.md) | `current-index` | `safety` | 安全管理领域规格索引 |

## specs/wecom

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/specs/wecom/README.md](specs/wecom/README.md) | `current-index` | `wecom` | 企业微信规格索引 |
| [docs/specs/wecom/approval-native-bridge-spec.md](specs/wecom/approval-native-bridge-spec.md) | `current-spec` | `wecom` | 企业微信原生审批桥接规格（M4 通用） |
| [docs/specs/wecom/approval-ops-spec.md](specs/wecom/approval-ops-spec.md) | `current-spec` | `wecom` | 工作平台企业微信审批运维规格（M5） |
| [docs/specs/wecom/callback-security-spec.md](specs/wecom/callback-security-spec.md) | `current-source` | `wecom` | 企业微信回调安全规格（M6） |
| [docs/specs/wecom/go-live-materials-checklist.md](specs/wecom/go-live-materials-checklist.md) | `operations` | `wecom` | 企业微信上线材料清单（M6） |
| [docs/specs/wecom/jssdk-spec.md](specs/wecom/jssdk-spec.md) | `current-spec` | `wecom` | 企业微信 JS-SDK 规格 |
| [docs/specs/wecom/message-push-spec.md](specs/wecom/message-push-spec.md) | `current-spec` | `wecom` | 企业微信消息推送规格 |
| [docs/specs/wecom/oauth2-spec.md](specs/wecom/oauth2-spec.md) | `current-spec` | `wecom` | 企业微信 OAuth2 规格 |
| [docs/specs/wecom/procurement-go-live-checklist.md](specs/wecom/procurement-go-live-checklist.md) | `operations` | `wecom` | 采购模块企业微信上线检查清单（Wave5） |
| [docs/specs/wecom/production-config-matrix.md](specs/wecom/production-config-matrix.md) | `operations` | `wecom` | 企业微信生产配置矩阵（M6） |
| [docs/specs/wecom/production-cutover-runbook.md](specs/wecom/production-cutover-runbook.md) | `operations` | `wecom` | 企业微信正式上线切换 Runbook（M6） |
| [docs/specs/wecom/real-device-regression-matrix.md](specs/wecom/real-device-regression-matrix.md) | `current-source` | `wecom` | 企业微信四大板块真机回归矩阵（M6） |
| [docs/specs/wecom/template-binding-checklist.md](specs/wecom/template-binding-checklist.md) | `operations` | `wecom` | 企业微信审批模板绑定清单（M6） |
| [docs/specs/wecom/token-cache-spec.md](specs/wecom/token-cache-spec.md) | `current-spec` | `wecom` | 企业微信 Token 缓存规格 |
| [docs/specs/wecom/workbench-go-live-checklist.md](specs/wecom/workbench-go-live-checklist.md) | `operations` | `wecom` | 企业微信上线检查清单（M6） |

## specs/workbench

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/specs/workbench/README.md](specs/workbench/README.md) | `current-index` | `workbench` | 工作平台模块规格 |
| [docs/specs/workbench/db/workbench-domain-model.md](specs/workbench/db/workbench-domain-model.md) | `current-spec` | `workbench` | 工作平台领域模型 |
| [docs/specs/workbench/db/workbench-module-matrix.md](specs/workbench/db/workbench-module-matrix.md) | `current-source` | `workbench` | 工作平台模块矩阵 |
| [docs/specs/workbench/db/workbench-permission-matrix.md](specs/workbench/db/workbench-permission-matrix.md) | `current-spec` | `workbench` | 工作平台权限矩阵（M4 Wave 1 冻结） |
| [docs/specs/workbench/db/workbench-runtime-schema.md](specs/workbench/db/workbench-runtime-schema.md) | `current-spec` | `workbench` | 工作平台运行时存储规格（M5） |
| [docs/specs/workbench/finance-business-board-blocker.md](specs/workbench/finance-business-board-blocker.md) | `acceptance-archive` | `workbench` | 财务板块 Blocker（M6，已解除） |
| [docs/specs/workbench/finance-business-board-field-dictionary.md](specs/workbench/finance-business-board-field-dictionary.md) | `conditional-baseline` | `workbench` | 财务板块字段字典（M6 Wave C 自生成补料基线） |
| [docs/specs/workbench/finance-business-board-flowchart.md](specs/workbench/finance-business-board-flowchart.md) | `conditional-baseline` | `workbench` | 财务板块流程图（M6 Wave C 自生成补料基线） |
| [docs/specs/workbench/finance-business-board-print-template.md](specs/workbench/finance-business-board-print-template.md) | `conditional-baseline` | `workbench` | 财务板块打印模板（M6 Wave C 自生成补料基线） |
| [docs/specs/workbench/finance-business-board-sample-forms.md](specs/workbench/finance-business-board-sample-forms.md) | `conditional-baseline` | `workbench` | 财务板块样表（M6 Wave C 自生成补料基线） |
| [docs/specs/workbench/state/workbench-approval-sync.md](specs/workbench/state/workbench-approval-sync.md) | `current-spec` | `workbench` | 工作平台审批同步状态规格 |
| [docs/specs/workbench/state/workbench-records.md](specs/workbench/state/workbench-records.md) | `current-spec` | `workbench` | 工作平台记录状态规格 |
| [docs/specs/workbench/state/workbench-shell.md](specs/workbench/state/workbench-shell.md) | `current-spec` | `workbench` | 工作平台壳层状态规格 |
| [docs/specs/workbench/ui/workbench-department-modules.md](specs/workbench/ui/workbench-department-modules.md) | `current-spec` | `workbench` | 工作平台部门模块高保真要求 |
| [docs/specs/workbench/ui/workbench-information-architecture.md](specs/workbench/ui/workbench-information-architecture.md) | `current-spec` | `workbench` | 工作平台信息架构 |
| [docs/specs/workbench/ui/workbench-template-pages.md](specs/workbench/ui/workbench-template-pages.md) | `current-spec` | `workbench` | 工作平台模板页面规格 |

## archive-root

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/README.md](archive/README.md) | `current-index` | `archive` | 文档归档索引 |

## archive/execplans

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/execplans/M1-execplans.md](archive/execplans/M1-execplans.md) | `historical-archive` | `archive` | M1 执行计划（历史归档） |
| [docs/archive/execplans/M2-execplans.md](archive/execplans/M2-execplans.md) | `historical-archive` | `archive` | M2 执行计划：办事模块“门户治理版”（历史归档） |
| [docs/archive/execplans/M3-execplans.md](archive/execplans/M3-execplans.md) | `historical-archive` | `archive` | M3 执行计划：采购管理模块（预留企业微信原生审批）（历史归档） |
| [docs/archive/execplans/M4-execplans.md](archive/execplans/M4-execplans.md) | `historical-archive` | `archive` | M4 执行计划：工作平台全量业务实现（企业微信审批为主）（历史归档） |
| [docs/archive/execplans/M5-execplans.md](archive/execplans/M5-execplans.md) | `historical-archive` | `archive` | M5 执行计划：上线强化、工作平台正式化、遗留规格收口（历史归档） |
| [docs/archive/execplans/M6-execplans.md](archive/execplans/M6-execplans.md) | `historical-archive` | `archive` | M6 执行计划：全量兑现、企业微信正式上线、生产交付闭环（历史归档） |
| [docs/archive/execplans/execplans-m6-completed-snapshot.md](archive/execplans/execplans-m6-completed-snapshot.md) | `historical-archive` | `archive` | M6 执行计划：全量兑现、企业微信正式上线、生产交付闭环 |

## archive/acceptance/common

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/acceptance/common/acceptance-m6-wave1.md](archive/acceptance/common/acceptance-m6-wave1.md) | `acceptance-archive` | `archive` | M6 Wave 1 验收清单 |
| [docs/archive/acceptance/common/acceptance-m6-wave4.md](archive/acceptance/common/acceptance-m6-wave4.md) | `acceptance-archive` | `archive` | M6 Wave 4 验收清单 |
| [docs/archive/acceptance/common/acceptance-m6-wave5.md](archive/acceptance/common/acceptance-m6-wave5.md) | `acceptance-archive` | `archive` | M6 Wave 5 验收清单 |
| [docs/archive/acceptance/common/acceptance-m6-wave6.md](archive/acceptance/common/acceptance-m6-wave6.md) | `acceptance-archive` | `archive` | M6 Wave 6 验收清单 |
| [docs/archive/acceptance/common/acceptance-m6-wavec.md](archive/acceptance/common/acceptance-m6-wavec.md) | `acceptance-archive` | `archive` | M6 Wave C 验收记录（财务板块补料与落地） |
| [docs/archive/acceptance/common/acceptance-m6-waved.md](archive/acceptance/common/acceptance-m6-waved.md) | `acceptance-archive` | `archive` | M6 Wave D 验收记录（治理与上线证据收口） |
| [docs/archive/acceptance/common/acceptance-m7-wave1.md](archive/acceptance/common/acceptance-m7-wave1.md) | `acceptance-archive` | `delivery` | M7 Wave 1 验收记录：文件上传与我的板块视觉收口 |
| [docs/archive/acceptance/common/m6-wave5-quality-gates.md](archive/acceptance/common/m6-wave5-quality-gates.md) | `acceptance-archive` | `archive` | M6 Wave 5 质量门禁与证据 |
| [docs/archive/acceptance/common/m6-wave6-go-live-package.md](archive/acceptance/common/m6-wave6-go-live-package.md) | `acceptance-archive` | `archive` | M6 Wave 6 上线包索引（可审计） |
| [docs/archive/acceptance/common/m6-wave6-test-and-smoke-report.md](archive/acceptance/common/m6-wave6-test-and-smoke-report.md) | `acceptance-archive` | `archive` | M6 Wave 6 全量测试与冒烟测试报告 |
| [docs/archive/acceptance/common/m6-waved-governance-closure.md](archive/acceptance/common/m6-waved-governance-closure.md) | `acceptance-archive` | `archive` | M6 Wave D 治理收口报告（D-1 / D-2 / D-3） |

## archive/acceptance/procurement

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/acceptance/procurement/acceptance-wave5.md](archive/acceptance/procurement/acceptance-wave5.md) | `acceptance-archive` | `archive` | M3 采购模块 Wave5 验收归档 |

## archive/acceptance/wecom

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/acceptance/wecom/acceptance-m6-wave3.md](archive/acceptance/wecom/acceptance-m6-wave3.md) | `acceptance-archive` | `archive` | M6 Wave 3 验收清单 |
| [docs/archive/acceptance/wecom/go-live-preflight-2026-04-22.md](archive/acceptance/wecom/go-live-preflight-2026-04-22.md) | `acceptance-archive` | `archive` | 企业微信上线前最终核对（M6） |

## archive/acceptance/workbench

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/acceptance/workbench/acceptance-m5-wave1.md](archive/acceptance/workbench/acceptance-m5-wave1.md) | `acceptance-archive` | `archive` | 工作平台 M5 Wave 1 验收归档 |
| [docs/archive/acceptance/workbench/acceptance-m5-wave2.md](archive/acceptance/workbench/acceptance-m5-wave2.md) | `acceptance-archive` | `archive` | M5 Wave 2 验收归档（工作平台底座正式化） |
| [docs/archive/acceptance/workbench/acceptance-m5-wave3.md](archive/acceptance/workbench/acceptance-m5-wave3.md) | `acceptance-archive` | `archive` | M5 Wave 3 验收归档（审批桥强化与上线留痕） |
| [docs/archive/acceptance/workbench/acceptance-m5-wave4.md](archive/acceptance/workbench/acceptance-m5-wave4.md) | `acceptance-archive` | `archive` | M5 Wave 4 验收归档（数据正确性与交付一致性） |
| [docs/archive/acceptance/workbench/acceptance-m6-wave2.md](archive/acceptance/workbench/acceptance-m6-wave2.md) | `acceptance-archive` | `archive` | M6 Wave 2 验收清单 |
| [docs/archive/acceptance/workbench/acceptance-wave1.md](archive/acceptance/workbench/acceptance-wave1.md) | `acceptance-archive` | `archive` | 工作平台 M4 Wave 1 验收归档 |
| [docs/archive/acceptance/workbench/acceptance-wave2.md](archive/acceptance/workbench/acceptance-wave2.md) | `acceptance-archive` | `archive` | 工作平台 M4 Wave 2 验收归档 |
| [docs/archive/acceptance/workbench/acceptance-wave3.md](archive/acceptance/workbench/acceptance-wave3.md) | `acceptance-archive` | `archive` | 工作平台 M4 Wave 3 验收归档 |
| [docs/archive/acceptance/workbench/acceptance-wave4.md](archive/acceptance/workbench/acceptance-wave4.md) | `acceptance-archive` | `archive` | 工作平台 M4 Wave 4 验收归档 |
| [docs/archive/acceptance/workbench/acceptance-wave5.md](archive/acceptance/workbench/acceptance-wave5.md) | `acceptance-archive` | `archive` | 工作平台 M4 Wave 5 验收归档 |
| [docs/archive/acceptance/workbench/acceptance-wave6.md](archive/acceptance/workbench/acceptance-wave6.md) | `acceptance-archive` | `archive` | 工作平台 M4 Wave 6 验收归档 |
| [docs/archive/acceptance/workbench/acceptance-wave7.md](archive/acceptance/workbench/acceptance-wave7.md) | `acceptance-archive` | `archive` | 工作平台 M4 Wave 7 验收归档 |
| [docs/archive/acceptance/workbench/acceptance-wave8.md](archive/acceptance/workbench/acceptance-wave8.md) | `acceptance-archive` | `archive` | 工作平台 M4 Wave 8 验收归档 |

## archive/audits

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/audits/M6-逐条需求对照表.md](archive/audits/M6-逐条需求对照表.md) | `audit-snapshot` | `archive` | M6 逐条需求对照表（基于 2026-04-22 代码审计） |

## archive/backlogs/common

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/backlogs/common/M6-优先级修复清单（分wave）.md](archive/backlogs/common/M6-优先级修复清单（分wave）.md) | `historical-archive` | `archive` | M6 优先级修复清单（分 Wave，含 API/DB/UI 改动点） |

## archive/backlogs/workbench

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/backlogs/workbench/m5-optimization-backlog.md](archive/backlogs/workbench/m5-optimization-backlog.md) | `historical-archive` | `archive` | 工作平台 M5 实施 Backlog |

## archive/superseded/wecom

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/superseded/wecom/workbench-real-device-regression.md](archive/superseded/wecom/workbench-real-device-regression.md) | `superseded` | `archive` | 工作平台企业微信真机回归与留痕模板（M5） |

## archive/superseded/workbench

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/superseded/workbench/finance-business-board-c1-gate-report.md](archive/superseded/workbench/finance-business-board-c1-gate-report.md) | `superseded` | `archive` | 财务板块 C-1 补料关口执行报告（M6） |

## archive/templates/common

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/archive/templates/common/m6-wave6-hypercare-daily-template.md](archive/templates/common/m6-wave6-hypercare-daily-template.md) | `template` | `archive` | M6 Wave 6 Hypercare 每日日志模板 |

## handbook

| 文档 | 状态 | 负责人 | 标题 |
|---|---|---|---|
| [docs/handbook/航运公司安全管理数字化平台PC、小程序端操作手册.md](handbook/航运公司安全管理数字化平台PC、小程序端操作手册.md) | `audit-snapshot` | `external-reference` | 航运公司 |
| [docs/handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md](handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md) | `audit-snapshot` | `docs` | 苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议 |
| [docs/handbook/苏南船舶管理系统操作手册.md](handbook/苏南船舶管理系统操作手册.md) | `operations` | `docs` | 苏南船舶管理系统操作手册 |
