# M6 Wave 4 验收归档

## 1. 波次目标

Wave 4 目标：

- WS-4A：高频台账类模块 Batch A 规格冻结
- WS-4B：高频作业闭环类模块 Batch A 规格冻结
- WS-4C：Batch A 打印、归档、权限、审批映射标准化

## 2. 交付清单

### WS-4A 交付

- `docs/specs/workbench/ui/workbench-department-modules.md`
- `docs/specs/workbench/db/workbench-module-matrix.md`

完成内容：

- 冻结 Batch A 台账类模块（总经办、业务部、船务部高频台账）六维规格。
- 每个台账模块具备字段组、页面组、关键动作、打印/归档、权限/审批、验收点。
- 模块矩阵持续保持“需求来源 -> 代码现状 -> 页面形态 -> 阻塞项”映射。

### WS-4B 交付

- `docs/specs/workbench/ui/workbench-department-modules.md`
- `docs/specs/workbench/ui/workbench-batch-a-integration-notes.md`

完成内容：

- 冻结 `business_operation_flow` 与 `zhongchuan/pinglu` 五步闭环规格。
- 明确作业闭环模块的独立入口、流程步骤、附件与打印归档要求。
- 固化 Batch A 的路由承接、状态切片与接口复用边界。

### WS-4C 交付

- `docs/specs/workbench/ui/workbench-department-modules.md`
- `docs/specs/workbench/ui/workbench-batch-a-integration-notes.md`

完成内容：

- 标准化 Batch A 的打印模板、归档动作、权限模型与审批模板映射。
- 审批映射冻结为：
  - `goa_training_onboarding_v1`（岗前培训场景）
  - `shipping_watch_v1`（值守记录系统）
- 其余 Batch A 模块明确为系统内闭环，不发起企业微信审批。

## 3. 验收对照

### 对照项 A：Batch A 规格完整性

- [x] 台账类 Batch A 模块规格齐备
- [x] 作业闭环类 Batch A 模块规格齐备
- [x] 各模块六维描述完整可执行

### 对照项 B：标准化要求

- [x] 打印模板冻结规则明确
- [x] 归档动作统一为 `archive`
- [x] 权限与审批映射边界清晰

### 对照项 C：配套说明

- [x] 路由复用边界明确
- [x] 状态切片复用边界明确
- [x] API 复用边界明确

## 4. 结论

M6 Wave 4 的三个工作项（WS-4A / WS-4B / WS-4C）已完成，满足进入 Wave 5 的文档前置条件。
