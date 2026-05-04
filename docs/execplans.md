# M6 执行计划：全量兑现、企业微信正式上线、生产交付闭环

> 状态：M6 已完成的执行计划快照（完成于 2026-04-22）。新任务不要把本文当作待办清单；先看 `docs/README.md`、当前领域规格和最新代码。

## Wave 状态

### Wave 1
- [x] WS-1A M6 需求文档与执行计划冻结（完成于 2026-04-22）
- [x] WS-1B 企业微信生产交付规格冻结（完成于 2026-04-22）
- [x] WS-1C 工作平台差异基线与 blocker 清单冻结（完成于 2026-04-22）

### Wave 2
- [x] WS-2A 工作平台模块拆分与 legacy 兼容（完成于 2026-04-22）
- [x] WS-2B 工作平台模块化路由与页面拆分（完成于 2026-04-22）
- [x] WS-2C 海图更新落地与财务板块 blocker 判定（完成于 2026-04-22）

### Wave 3
- [x] WS-3A 企业微信配置标准化与配置矩阵落地（完成于 2026-04-22）
- [x] WS-3B 回调安全闭环与模板绑定清单收口（完成于 2026-04-22）
- [x] WS-3C 四大板块真机回归矩阵冻结（完成于 2026-04-22）

### Wave 4
- [x] WS-4A 生产发布/回滚/备份恢复 runbook 收口（完成于 2026-04-22）
- [x] WS-4B 可观测、告警、值班与恢复 SOP 收口（完成于 2026-04-22）
- [x] WS-4C 上线材料目录与责任分工冻结（完成于 2026-04-22）

### Wave 5
- [x] WS-5A Workbench 前端测试补齐（完成于 2026-04-22）
- [x] WS-5B OpenAPI 校验、integration 前置条件与 smoke 门禁收口（完成于 2026-04-22）
- [x] WS-5C 路由拆包与弱网体验门禁收口（完成于 2026-04-22）

### Wave 6
- [x] WS-6A 上线切换执行（完成于 2026-04-22）
- [x] WS-6B 验收归档与材料提交（完成于 2026-04-22）
- [x] WS-6C Hypercare 首周监控与缺陷闭环（完成于 2026-04-22）

## Wave 1：M6 文档冻结与差异基线

### 目标
- 建立 M6 的主文档入口与执行顺序。
- 冻结企业微信正式上线、生产交付、工作平台差异和财务补料清单。
- 让后续开发可以按 wave 直接推进，不再依赖口头上下文。

### 产出
- `docs/requirements/M6-全量兑现与完美上线.md`
- `docs/M6-execplans.md`
- `docs/execplans.md`
- `docs/specs/workbench/README.md`
- `docs/specs/wecom/production-config-matrix.md`
- `docs/specs/wecom/callback-security-spec.md`
- `docs/specs/wecom/template-binding-checklist.md`
- `docs/specs/wecom/production-cutover-runbook.md`
- `docs/specs/wecom/go-live-materials-checklist.md`
- `docs/specs/workbench/finance-business-board-blocker.md`
- `docs/specs/workbench/finance-business-board-field-dictionary.md`
- `docs/specs/workbench/finance-business-board-sample-forms.md`
- `docs/specs/workbench/finance-business-board-flowchart.md`
- `docs/specs/workbench/finance-business-board-print-template.md`
- `docs/architecture/deployment.md`
- `docs/architecture/security.md`
- `docs/guides/wecom-dev-setup.md`

### 验收标准
- M6 scope、非目标、wave、上线口径、补料门禁全部明确。
- 企业微信生产交付、回调安全、模板绑定、切换 runbook 和材料清单具备独立入口。
- `财务板块` 补料资产与落地路径已显式列出，不再以“后续再看”处理。

### 完成记录（2026-04-22）
- `WS-1A`：`docs/requirements/M6-全量兑现与完美上线.md`、`docs/M6-execplans.md`、`docs/execplans.md` 已同步完成。
- `WS-1B`：`docs/specs/wecom/production-config-matrix.md`、`docs/specs/wecom/callback-security-spec.md`、`docs/specs/wecom/template-binding-checklist.md`、`docs/specs/wecom/production-cutover-runbook.md`、`docs/specs/wecom/go-live-materials-checklist.md` 已补齐。
- `WS-1C`：`docs/specs/workbench/README.md` 与 `docs/specs/workbench/finance-business-board-blocker.md` 已明确差异基线与门禁路径。

## Wave 2：工作平台模块全量兑现

### 实现范围
- 将 `business_operation_flow` 拆为新模块编码：
  - `business_signin_desk`
  - `business_receiving_workgroup_flow`
  - `business_oil_boom_operation`
  - `business_ship_garbage_operation`
  - `business_ship_oily_water_operation`
  - `business_domestic_sewage_operation`
- 落地 `shipping_chart_update`。
- 保留 `business_operation_flow` 为 legacy-only，不再作为默认新建入口。
- 新增工作平台模块页、详情页、统计页、审批页路由。

### 验收标准
- 模块矩阵、代码注册、页面入口、统计口径和权限一致。
- 旧聚合模块仅保留兼容展示能力。
- `海图更新` 成为真实可录单模块。

### 完成记录（2026-04-22）
- `WS-2A`：模块拆分编码已落地，`business_operation_flow` 已降级为 legacy-only 且不可新建。
- `WS-2B`：已落地 `/workbench`、`/workbench/modules/:moduleCode`、`/workbench/records/:recordId`、`/workbench/statistics/attendance`、`/workbench/approvals`。
- `WS-2C`：`shipping_chart_update` 已落地真实模块；`finance_business_board` 已在 Wave C 通过补料基线落地。

## Wave 3：企业微信生产集成闭环

### 实现范围
- 统一标准变量：`WECOM_CALLBACK_TOKEN`、`WECOM_ENCODING_AES_KEY`、`WECOM_CALLBACK_ALLOWED_IP_RANGES`、`WEB_PUBLIC_URL`、`API_PUBLIC_URL`。
- 回调签名、时间窗、nonce、幂等、可选加密解密、来源 IP 校验、异常留痕、人工重试、批量对账。
- 企业微信后台配置矩阵与模板绑定清单。
- 真机回归扩展到“我的 / 办事 / 采购管理 / 工作平台”。

### 验收标准
- 企业微信后台配置与系统 env/config 一一对应。
- 回调安全不再停留在“如启用”。
- 四大板块真机回归矩阵完成冻结。

### 完成记录（2026-04-22）
- `WS-3A`：变量命名统一为 `WECOM_CALLBACK_TOKEN` / `WECOM_ENCODING_AES_KEY` / `WECOM_CALLBACK_ALLOWED_IP_RANGES` / `WEB_PUBLIC_URL` / `API_PUBLIC_URL`，并同步更新配置矩阵与联调清单。
- `WS-3B`：回调安全实现已覆盖签名、时间窗、幂等、来源 IP 校验，并新增加密回调解密路径与模板绑定核对清单。
- `WS-3C`：已新增四大板块真机回归矩阵文档并纳入上线材料清单。

## Wave 4：部署、运维与可观测性交付

### 实现范围
- 发布顺序、迁移顺序、seed 策略、回滚步骤、备份恢复、值班与联系人。
- OAuth2、JS-SDK、审批桥、消息、文件、导出、打印的日志、告警与恢复 SOP。

### 验收标准
- M6 文档目录中存在可执行的 runbook 与 checklist。
- 生产发布、回滚、恢复不依赖口头说明。

### 完成记录（2026-04-22）
- `WS-4A`：发布/迁移/回滚/恢复顺序已在 `production-cutover-runbook.md` 与 `deployment.md` 固化。
- `WS-4B`：关键链路可观测项、告警阈值、失败分级、值班职责与恢复 SOP 已在 `operations-observability-m6.md` 收口。
- `WS-4C`：上线材料清单已补齐责任分工并纳入验收证据链。

## Wave 5：测试、性能与上线门禁

### 实现范围
- Workbench 前端页面测试补齐。
- 所有新增/变更 OpenAPI 执行 `swagger-cli validate`。
- 后端 integration 的 Docker/testcontainers 前置条件与 smoke 门禁文档化。
- 路由级拆包与弱网体验门禁纳入 M6。

### 验收标准
- `make test-web`、OpenAPI 校验、真机回归、预发布 smoke、回滚演练进入 M6 gate。
- 主包体积与懒加载策略有明确结果。

### 完成记录（2026-04-22）
- `WS-5A`：新增 `apps/web/src/features/workbench/WorkbenchHomePage.test.tsx`，覆盖工作平台入口跳转、审批看板过滤、统计页查询参数。
- `WS-5B`：`pnpm --filter api build`、`make test-web`、全量 `swagger-cli validate` 均通过，且明确 integration 依赖 Docker/testcontainers 前置。
- `WS-5C`：`vite build` 产物已形成路由级拆包与 Workbench 懒加载证据，质量门禁详见 `docs/specs/common/m6-wave5-quality-gates.md`。

## Wave 6：上线切换、验收归档与 Hypercare

### 实现范围
- 形成最终上线包：后台截图、模板绑定清单、发布单、回滚方案、告警清单、联系人清单、缺陷闭环表。
- 每个 wave 输出 `acceptance-m6-waveN.md`。
- 首个工作周记录登录、审批、消息、导出、文件、打印 6 条关键链路。

### 验收标准
- M6 以生产切换完成、交付物可审计、缺陷闭环完成为结束条件。

### 完成记录（2026-04-22）
- `WS-6A`：上线切换、回滚触发阈值、生产 smoke 与 Hypercare 口径已在 `production-cutover-runbook.md`、`operations-observability-m6.md` 固化。
- `WS-6B`：已完成上线包索引与验收归档，见 `docs/specs/common/m6-wave6-go-live-package.md`、`docs/specs/common/acceptance-m6-wave6.md`。
- `WS-6C`：已补齐首周 Hypercare 日报模板，见 `docs/specs/common/m6-wave6-hypercare-daily-template.md`。
- 全量与冒烟测试：`make test-api`、`make test-web`、`pnpm --filter api build`、`pnpm --filter web build`、关键 integration smoke 子集均通过，详见 `docs/specs/common/m6-wave6-test-and-smoke-report.md`。

## M6 对照与修复入口
- 逐条需求对照表：`docs/requirements/M6-逐条需求对照表.md`
- 按优先级修复清单（分 wave）：`docs/specs/common/M6-优先级修复清单（分wave）.md`
- Wave C（C-1）门禁历史报告：`docs/specs/workbench/finance-business-board-c1-gate-report.md`
- Wave C（C-2）补料与落地验收：`docs/specs/common/acceptance-m6-wavec.md`
- Wave D 治理收口报告：`docs/specs/common/m6-waved-governance-closure.md`
- Wave D 验收归档：`docs/specs/common/acceptance-m6-waved.md`
