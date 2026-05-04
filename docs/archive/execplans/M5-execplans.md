---
status: historical-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M5 执行计划：上线强化、工作平台正式化、遗留规格收口（历史归档）

> M5 实现已完成（2026-04-22），本文档为历史参考。

## Wave 状态

### Wave 1
- [x] WS-1A M5 需求文档与执行计划冻结
- [x] WS-1B 工作平台运行时存储与接口规格冻结
- [x] WS-1C 企业微信审批运维与真机回归规格冻结

### Wave 2
- [x] WS-2A 工作平台运行时持久化与审批实例落库
- [x] WS-2B 工作平台集成测试基线建立
- [x] WS-2C 记录/附件/打印/步骤运行时迁移与索引治理

### Wave 3
- [x] WS-3A 审批桥验签、幂等、重试、对账能力实现
- [x] WS-3B 企业微信真机回归留痕与上线材料收口
- [x] WS-3C 权限矩阵自动化校验与异常诊断能力实现

### Wave 4
- [x] WS-4A 统计导出与财务对账口径固化
- [x] WS-4B 打印模板标准化与关键链路可观测性收口
- [x] WS-4C 遗留模块边界收口（财务板块、海图更新）

## Wave 1：M5 文档冻结

### 目标
- 将 M5 从“优化项清单”升级为可执行里程碑。
- 冻结工作平台运行时存储、审批运维、真机回归和上线留痕的规格入口。
- 将 `财务板块`、`海图更新` 以遗留规格方式纳入 SDD 目录。

### 产出
- `docs/requirements/M5-上线强化与遗留收口.md`
- `docs/archive/execplans/M5-execplans.md`
- `docs/specs/workbench/db/workbench-runtime-schema.md`
- `docs/specs/wecom/approval-ops-spec.md`
- `docs/archive/superseded/wecom/workbench-real-device-regression.md`
- `docs/archive/backlogs/workbench/m5-optimization-backlog.md`
- `docs/specs/workbench/api/workbench-platform-api.yaml`
- `docs/specs/workbench/api/workbench-approval-api.yaml`

### 验收标准
- M5 目标、范围、非目标和上线口径明确。
- 工作平台运行时存储对象和审批运维对象完成冻结。
- 遗留模块已进入工作平台模块矩阵与 UI 边界文档。
- 企业微信真机回归与上线留痕模板可直接执行。

### Wave 1 完成说明（2026-04-22）
- 已完成 M5 需求与执行计划冻结：
  - `docs/requirements/M5-上线强化与遗留收口.md`
  - `docs/execplans.md`
  - `docs/archive/execplans/M5-execplans.md`
- 已完成工作平台运行时存储与接口规格冻结：
  - `docs/specs/workbench/db/workbench-runtime-schema.md`
  - `docs/specs/workbench/api/workbench-platform-api.yaml`
  - `docs/specs/workbench/api/workbench-approval-api.yaml`
  - `docs/specs/workbench/state/workbench-records.md`
  - `docs/specs/workbench/state/workbench-approval-sync.md`
- 已完成企业微信审批运维与真机回归规格冻结：
  - `docs/specs/wecom/approval-ops-spec.md`
  - `docs/specs/wecom/workbench-go-live-checklist.md`
  - `docs/archive/superseded/wecom/workbench-real-device-regression.md`
- 已完成遗留模块边界纳入：
  - `docs/specs/workbench/db/workbench-module-matrix.md`
  - `docs/specs/workbench/ui/workbench-department-modules.md`
  - `docs/archive/backlogs/workbench/m5-optimization-backlog.md`
- 已完成 Wave 1 验收归档：
  - `docs/archive/acceptance/workbench/acceptance-m5-wave1.md`

## Wave 2：工作平台底座正式化

### 实现范围
- 引入工作平台运行时实体与数据库迁移。
- 将记录、步骤、附件、动作日志、打印快照和审批实例镜像从内存态迁移到 PostgreSQL。
- 为工作平台建立 `apps/api/test` 下的集成测试基线。

### 推荐优先级
- 若 M5 只先开发一个部分，优先选择 `WS-2A 工作平台运行时持久化与审批实例落库`。
- 该项完成后，后续审批告警、导出、对账、真机回归与管理员诊断才有稳定落点。

### 验收标准
- `workbench` 记录与审批实例不再依赖内存 `Map`。
- 运行时实体可支持列表、详情、动作、附件、打印和审批查询。
- 集成测试使用 PostgreSQL testcontainers，覆盖核心工作平台链路。

### Wave 2 完成说明（2026-04-22）
- 已完成工作平台运行时实体与迁移落地：
  - `apps/api/src/database/entities/workbench-*.entity.ts`
  - `apps/api/src/database/entities/wecom-approval-*.entity.ts`
  - `apps/api/src/database/migrations/1710000011000-wave5-workbench-runtime.ts`
- 已完成 `workbench` 服务从内存态到 PostgreSQL 持久化改造：
  - `apps/api/src/modules/workbench/workbench.service.ts`
  - `apps/api/src/modules/workbench/workbench.module.ts`
  - `apps/api/src/modules/workbench/workbench.controller.ts`
  - `apps/api/src/modules/workbench/workbench-approval.controller.ts`
- 已完成测试基线与数据源接入：
  - `apps/api/test/workbench.integration.spec.ts`
  - `apps/api/test/pg-test-container.ts`
  - `apps/api/src/database/typeorm.config.ts`
- 本地验证结果：
  - `pnpm --filter api build` 通过。
  - `pnpm --filter api test -- workbench.integration.spec.ts` 通过（Docker 环境）。

## Wave 3：企业微信审批桥强化与上线留痕

### 实现范围
- 审批回调验签、幂等、解密、重放保护、失败重试和对账补偿。
- 审批异常实例检索、管理员重试与诊断接口。
- iOS / Android 企业微信真机回归执行、截图/录屏证据留存。
- 权限矩阵自动化校验与 CI 收口。

### 验收标准
- 审批实例支持按状态检索异常、待回调、待对账记录。
- 回调失败、重试失败和消息异常均有告警面板或告警事件定义。
- 真机回归报告与缺陷闭环模板可直接作为上线材料提交。

### Wave 3 完成说明（2026-04-22）
- 已完成审批桥强化实现：
  - 审批回调验签、时间戳校验与签名参数校验
  - 回调事件去重表与 `eventId + processInstanceId/callbackVersion` 重放保护
  - 审批实例管理员分页诊断接口 `GET /api/v1/wecom/approval/instances`
  - 管理员重试接口 `POST /api/v1/wecom/approval/retry`
  - 管理员对账接口 `POST /api/v1/wecom/approval/reconcile`（系统管理员权限收敛）
- 已完成权限矩阵自动化校验基线：
  - `apps/api/test/workbench.integration.spec.ts` 增加模块可见性与越权校验用例
- 已完成 Wave 3 验收归档：
  - `docs/archive/acceptance/workbench/acceptance-m5-wave3.md`
- 本地验证结果：
  - `pnpm --filter api build` 通过。
  - `pnpm --filter api test -- workbench.integration.spec.ts` 通过（单元+集成）。
- 说明：
  - WS-3B 的“真机回归留痕”执行模板已在 Wave 1 冻结（`docs/archive/superseded/wecom/workbench-real-device-regression.md`），本轮完成了后端能力和验收链路，真机执行记录需按模板由业务测试设备补录。

## Wave 4：数据正确性与交付一致性

### 实现范围
- 固化考勤导出、财务对账、打印模板标准化与快照归档。
- 收口关键链路 SLI/SLO、指标、日志和应急处理要求。
- 将 `财务板块`、`海图更新` 形成最小可执行 SDD 边界。

### 验收标准
- 导出、对账和打印口径一致，可追溯到统一规格。
- 关键接口、审批回调、导出任务、消息发送均纳入可观测范围。
- `财务板块` 与 `海图更新` 均有清晰的边界与待确认清单，不再散落在原始需求文本中。

### Wave 4 完成说明（2026-04-22）
- 已完成统计导出与财务对账接口落地：
  - `GET /api/v1/workbench/statistics/attendance/export`
  - `POST /api/v1/workbench/statistics/attendance/reconcile`
  - 对应实现：`apps/api/src/modules/workbench/workbench.controller.ts`、`apps/api/src/modules/workbench/workbench.service.ts`
- 已完成打印返回结构标准化与关键链路日志留痕：
  - 打印快照返回补齐 `recordId`、`renderedFormat`
  - 审批发起/回调/重试/对账、考勤导出/对账、打印快照统一日志留痕
- 已完成 Wave4 验收归档：
  - `docs/archive/acceptance/workbench/acceptance-m5-wave4.md`
- 全量测试与冒烟测试结果：
  - `make test-api` 通过（API unit + integration 全量通过）。
  - `make test-web` 通过（前端 41 个测试文件、155 个测试全部通过）。
  - `pnpm --filter api test -- workbench.integration.spec.ts` 通过，覆盖 Wave2~Wave4 关键链路，作为本次冒烟验证通过依据。
  - OpenAPI 校验通过：
    - `npx swagger-cli validate docs/specs/workbench/api/workbench-platform-api.yaml`
    - `npx swagger-cli validate docs/specs/workbench/api/workbench-approval-api.yaml`
