# M6 执行计划：全量兑现、企业微信正式上线、生产交付闭环

## Wave 状态

### Wave 1
- [ ] WS-1A M6 需求文档与执行计划冻结
- [ ] WS-1B 企业微信生产交付规格冻结
- [ ] WS-1C 工作平台差异基线与 blocker 清单冻结

### Wave 2
- [ ] WS-2A 工作平台模块拆分与 legacy 兼容
- [ ] WS-2B 工作平台模块化路由与页面拆分
- [ ] WS-2C 海图更新落地与财务板块 blocker 判定

### Wave 3
- [ ] WS-3A 企业微信配置标准化与配置矩阵落地
- [ ] WS-3B 回调安全闭环与模板绑定清单收口
- [ ] WS-3C 四大板块真机回归矩阵冻结

### Wave 4
- [ ] WS-4A 生产发布/回滚/备份恢复 runbook 收口
- [ ] WS-4B 可观测、告警、值班与恢复 SOP 收口
- [ ] WS-4C 上线材料目录与责任分工冻结

### Wave 5
- [ ] WS-5A Workbench 前端测试补齐
- [ ] WS-5B OpenAPI 校验、integration 前置条件与 smoke 门禁收口
- [ ] WS-5C 路由拆包与弱网体验门禁收口

### Wave 6
- [ ] WS-6A 上线切换执行
- [ ] WS-6B 验收归档与材料提交
- [ ] WS-6C Hypercare 首周监控与缺陷闭环

## Wave 1：M6 文档冻结与差异基线

### 目标
- 建立 M6 主文档入口。
- 明确当前代码与已冻结规格之间的差异。
- 冻结企业微信正式上线与生产交付的文档入口。

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

### 验收标准
- M6 的目标、范围、wave、门禁、上线口径和 blocker 清单明确。
- 工作平台 README 不再默认“规格已收口即代码已兑现”。
- 企业微信生产交付、回调安全、切换 runbook 和材料清单均有独立入口。

## Wave 2：工作平台模块全量兑现

### 实现范围
- 新增业务模块编码并替换聚合模块新建入口。
- 新增 `/workbench/modules/:moduleCode`、`/workbench/records/:recordId`、`/workbench/statistics/attendance`、`/workbench/approvals`。
- 将 `business_operation_flow` 变为 legacy-only。
- 落地 `shipping_chart_update`。
- 形成 `finance_business_board` blocker 判定结果。

### 验收标准
- 新模块编码、路由、统计口径与规格一致。
- 旧聚合模块不再作为默认新建入口。
- `海图更新` 可以真实录单、留存、打印。

## Wave 3：企业微信生产集成闭环

### 实现范围
- 统一标准变量：`WECOM_CALLBACK_TOKEN`、`WECOM_ENCODING_AES_KEY`、`WECOM_CALLBACK_ALLOWED_IP_RANGES`、`WEB_PUBLIC_URL`、`API_PUBLIC_URL`。
- 回调安全闭环、后台配置矩阵、模板绑定清单、真机回归矩阵。

### 验收标准
- 企业微信后台配置和系统配置可双向对照。
- 回调安全不再停留于“如启用”。
- 四大板块均有真机回归矩阵。

## Wave 4：部署、运维与可观测性交付

### 实现范围
- 发布顺序、迁移顺序、seed、回滚、备份恢复、值班、恢复 SOP。
- OAuth2、JS-SDK、审批桥、消息、文件、导出、打印的可观测要求。

### 验收标准
- runbook、checklist、告警与联系人清单可直接执行。
- 不依赖口头说明即可完成生产发布与回滚。

## Wave 5：测试、性能与上线门禁

### 实现范围
- Workbench 前端测试补齐。
- OpenAPI 校验收口。
- integration 的 Docker/testcontainers 前置条件文档化。
- 路由级拆包与弱网体验门禁收口。

### 验收标准
- `make test-web`、OpenAPI 校验、Smoke、真机回归、回滚演练纳入上线门禁。
- 当前主包体积问题有明确整改结果或降级解释。

## Wave 6：上线切换、验收归档与 Hypercare

### 实现范围
- 形成最终上线包。
- 输出 `acceptance-m6-waveN.md`。
- 首个工作周记录登录、审批、消息、导出、文件、打印 6 条关键链路。

### 验收标准
- M6 以生产切换完成、交付物可审计、缺陷闭环完成结束。
