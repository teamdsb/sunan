# M6 Wave 5 验收归档

## 1. 波次目标

Wave 5 目标：

- WS-5A：检查整改类模块 Batch B 规格冻结
- WS-5B：统计 / 审批 / 资产服务类模块 Batch B 规格冻结
- WS-5C：导出任务、对账任务、诊断事件规格冻结

## 2. 交付清单

### WS-5A 交付

- `docs/specs/workbench/ui/workbench-department-modules.md`
- `docs/specs/workbench/db/workbench-module-matrix.md`

完成内容：

- 冻结检查整改类 Batch B 模块（总经办隐患排查与船务检查整改链路）六维规格。
- 明确整改流程、照片对比、关闭动作、打印闭环与审批边界。
- 模块矩阵补齐 Batch B 范围标注与执行边界。

### WS-5B 交付

- `docs/specs/workbench/ui/workbench-department-modules.md`
- `docs/specs/workbench/ui/workbench-batch-b-integration-notes.md`

完成内容：

- 冻结统计 / 审批 / 资产服务类 Batch B 模块六维规格。
- 明确审批模块与系统内闭环模块的差异化要求。
- 固化 Batch B 的路由承接、状态切片与 API 复用边界。

### WS-5C 交付

- `docs/specs/workbench/ui/workbench-batch-b-integration-notes.md`
- `docs/specs/workbench/ui/workbench-admin-console.md`
- `docs/specs/workbench/state/workbench-admin-console.md`
- `docs/specs/workbench/api/workbench-admin-api.yaml`
- `docs/specs/workbench/api/workbench-approval-api.yaml`

完成内容：

- 冻结 Batch B 与管理员台在导出任务、对账任务、诊断事件上的检索和排障联动。
- 明确审批实例、导出任务、对账任务、诊断事件的筛选维度和关联链路。
- 统一“业务页面负责业务流转，管理员页负责任务检索与诊断”边界。

## 3. 验收对照

### 对照项 A：Batch B 规格完整性

- [x] 检查整改类 Batch B 模块规格齐备
- [x] 统计 / 审批 / 资产服务类 Batch B 模块规格齐备
- [x] 各模块六维描述完整可执行

### 对照项 B：管理员任务联动

- [x] 导出任务联动规则明确
- [x] 对账任务联动规则明确
- [x] 诊断事件联动规则明确

### 对照项 C：契约一致性

- [x] Batch B 业务模块与审批桥接口边界清晰
- [x] 管理员检索维度与 Wave3 API 口径一致
- [x] Wave5 文档与执行计划状态一致

## 4. 结论

M6 Wave 5 的三个工作项（WS-5A / WS-5B / WS-5C）已完成，满足进入 Wave 6 的文档前置条件。
