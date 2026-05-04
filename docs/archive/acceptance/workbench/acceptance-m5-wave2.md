---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M5 Wave 2 验收归档（工作平台底座正式化）

## 1. 验收范围

- WS-2A 工作平台运行时持久化与审批实例落库
- WS-2B 工作平台集成测试基线建立
- WS-2C 记录/附件/打印/步骤运行时迁移与索引治理

## 2. 交付产物

### 2.1 数据库实体与迁移

- `apps/api/src/database/entities/workbench-module.entity.ts`
- `apps/api/src/database/entities/workbench-template.entity.ts`
- `apps/api/src/database/entities/workbench-record.entity.ts`
- `apps/api/src/database/entities/workbench-record-step.entity.ts`
- `apps/api/src/database/entities/workbench-record-attachment.entity.ts`
- `apps/api/src/database/entities/workbench-record-action-log.entity.ts`
- `apps/api/src/database/entities/workbench-print-snapshot.entity.ts`
- `apps/api/src/database/entities/wecom-approval-template-binding.entity.ts`
- `apps/api/src/database/entities/wecom-approval-instance-sync.entity.ts`
- `apps/api/src/database/migrations/1710000011000-wave5-workbench-runtime.ts`

### 2.2 运行时服务改造

- `apps/api/src/modules/workbench/workbench.module.ts`
- `apps/api/src/modules/workbench/workbench.service.ts`
- `apps/api/src/modules/workbench/workbench.controller.ts`
- `apps/api/src/modules/workbench/workbench-approval.controller.ts`

改造结果：

- `WorkbenchService` 不再使用内存 `Map` 承载记录与审批实例。
- `/workbench/records`、`/workbench/records/:recordId`、动作、附件、打印接口均基于 PostgreSQL。
- 企业微信审批发起、回调、实例查询、对账改为读写 `wecom_approval_instance_syncs`。

### 2.3 数据源与测试基线

- `apps/api/src/database/typeorm.config.ts`
- `apps/api/test/pg-test-container.ts`
- `apps/api/test/workbench.integration.spec.ts`

## 3. Wave 2 验收结论

### WS-2A

- 结论：完成。
- 依据：运行时记录、步骤、附件、动作日志、打印快照、审批实例均有实体与迁移，并由服务层实际读写。

### WS-2B

- 结论：完成（基线已建立）。
- 依据：新增 `workbench.integration.spec.ts`，覆盖录单、步骤流转、附件、打印、审批发起、回调幂等、对账。

### WS-2C

- 结论：完成。
- 依据：`1710000011000-wave5-workbench-runtime.ts` 创建了 Wave2 目标表、索引、约束、`updated_at` trigger。

## 4. 验证记录

- 已执行：`pnpm --filter api build`，结果通过。
- 已执行：`pnpm --filter api test -- workbench.integration.spec.ts`。
  - 单元测试通过。
  - 集成测试在当前环境失败：`Could not find a working container runtime strategy`。

## 5. 风险与后续动作

- 当前环境缺少 testcontainers 可用容器 runtime，无法在本机完成 Wave2 集成测试实跑验收。
- 进入 Wave3 前，需在具备 Docker（或兼容容器运行时）的 CI/开发机执行：
  - `pnpm --filter api test -- workbench.integration.spec.ts`
  - 并归档测试日志与通过截图。
