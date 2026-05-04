---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M5 Wave 4 验收归档（数据正确性与交付一致性）

## 1. 验收范围

- WS-4A 统计导出与财务对账口径固化
- WS-4B 打印模板标准化与关键链路可观测性收口
- WS-4C 遗留模块边界收口（财务板块、海图更新）

## 2. 交付产物

### 2.1 统计导出与财务对账接口

- `apps/api/src/modules/workbench/workbench.controller.ts`
- `apps/api/src/modules/workbench/workbench.service.ts`
- `apps/api/src/modules/workbench/dto/workbench-attendance-export-query.dto.ts`
- `apps/api/src/modules/workbench/dto/workbench-attendance-reconcile.dto.ts`

新增能力：

- `GET /api/v1/workbench/statistics/attendance/export`
- `POST /api/v1/workbench/statistics/attendance/reconcile`
- 角色约束：`system_admin` / `general_office` / `finance`

### 2.2 打印与可观测性

- `apps/api/src/modules/workbench/workbench.service.ts`

改进点：

- 打印快照返回结构标准化，补齐 `recordId` 与 `renderedFormat`
- 关键链路日志留痕：审批发起/回调/重试/对账、统计导出/对账、打印快照

### 2.3 遗留模块边界收口

- `docs/specs/workbench/db/workbench-module-matrix.md`
- `docs/specs/workbench/ui/workbench-department-modules.md`
- `docs/archive/backlogs/workbench/m5-optimization-backlog.md`

说明：

- `财务板块`、`海图更新` 保持“规格纳入、开发后置”策略，不提前发明字段实现。

## 3. WS 验收结论

### WS-4A

- 结论：完成。
- 依据：考勤导出/对账接口、DTO、权限收敛与集成测试覆盖已完成。

### WS-4B

- 结论：完成。
- 依据：打印返回结构标准化与关键链路日志留痕已落地。

### WS-4C

- 结论：完成。
- 依据：遗留模块边界与后置策略在 M5 文档体系内已统一收口。

## 4. 测试与冒烟结果

- 后端全量测试：`make test-api` 通过。
- 前端全量测试：`make test-web` 通过（41 files / 155 tests 全部通过）。
- 冒烟测试：`pnpm --filter api test -- workbench.integration.spec.ts` 通过。
  - 覆盖：记录链路、附件、打印、审批回调、管理员诊断、重试、对账、权限矩阵基线、考勤导出与对账。
- OpenAPI 校验：两份 workbench OpenAPI 均通过 `swagger-cli validate`。

## 5. 风险与后续动作

- 当前无阻塞上线的测试风险。
- 建议保留前端测试稳定性治理议题（作为持续优化项）：
  - 继续收敛慢用例的超时和异步等待策略
  - 保持 JSDOM 兼容 mock 与组件测试边界清晰
