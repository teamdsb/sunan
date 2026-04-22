# M6 Wave 3 验收归档

## 1. 波次目标

Wave 3 目标：

- WS-3A：工作平台独立路由与页面 IA 冻结
- WS-3B：管理员运维台 UI / State / API / 留痕规格冻结
- WS-3C：核心契约更新（审批 API 查询维度与管理员 API 契约）

## 2. 交付清单

### WS-3A 交付

- `docs/specs/workbench/ui/workbench-module-route-map.md`

完成内容：

- 冻结模块页与管理员页路由：`/workbench`、`/workbench/modules/*`、`/workbench/admin/*`。
- 明确页面分工、路由守卫、共享壳层与筛选器原则。
- 冻结 `GET /workbench/modules/:moduleCode/schema` 职责为“页面元数据与共享字段定义”。

### WS-3B 交付

- `docs/specs/workbench/ui/workbench-admin-console.md`
- `docs/specs/workbench/state/workbench-admin-console.md`
- `docs/specs/workbench/api/workbench-admin-api.yaml`

完成内容：

- 冻结管理员台四个页面的 IA、筛选器、列表列、详情抽屉与关键动作。
- 冻结前端状态切片、筛选器模型、分页与刷新约束。
- 冻结管理员 API：导出任务、对账任务、诊断事件与汇总接口。

### WS-3C 交付

- `docs/specs/workbench/api/workbench-approval-api.yaml`
- `docs/specs/workbench/api/workbench-admin-api.yaml`

完成内容：

- 审批实例检索补齐 `dateFrom`、`dateTo`、`syncErrorCode`、`source` 查询维度。
- 管理员 API 契约按 M6 固定接口清单落地：
  - `GET /workbench/admin/export-jobs`
  - `GET /workbench/admin/export-jobs/{jobId}`
  - `GET /workbench/admin/reconcile-jobs`
  - `GET /workbench/admin/reconcile-jobs/{jobId}`
  - `GET /workbench/admin/diagnostics/events`
  - `GET /workbench/admin/diagnostics/summary`
- OpenAPI 校验通过：
  - `docs/specs/workbench/api/workbench-approval-api.yaml`
  - `docs/specs/workbench/api/workbench-admin-api.yaml`

## 3. 验收对照

### 对照项 A：路由与 IA

- [x] 模块页与管理员页路由已冻结
- [x] 页面职责边界与守卫策略明确
- [x] `schema` 职责已收敛到元数据与共享字段

### 对照项 B：管理员台规格

- [x] UI 页面结构（卡片、筛选器、列表、详情）可直接实现
- [x] 状态模型覆盖审批实例、导出任务、对账任务、诊断事件
- [x] 留痕字段和动作约束明确

### 对照项 C：API 契约

- [x] 管理员 API 六个核心查询接口齐备
- [x] 审批检索查询维度与管理员筛选器一致
- [x] OpenAPI 校验通过

## 4. 结论

M6 Wave 3 的三个工作项（WS-3A / WS-3B / WS-3C）已完成，满足进入 Wave 4 的文档前置条件。
