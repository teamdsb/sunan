# 工作平台 M4 Wave 1 验收归档

## 1. 验收结论

Wave 1（需求与 SDD 冻结）已完成。

完成日期：`2026-04-21`

## 2. 验收范围

- M4 需求文档重构与范围冻结
- 工作平台 SDD（API/DB/State/UI）索引与模板规格冻结
- 模块矩阵、权限矩阵与企业微信约束冻结

## 3. 验收清单

| 验收项 | 结论 | 证据文档 |
|---|---|---|
| M4 需求文档从占位升级为可执行范围说明 | 通过 | `docs/requirements/M4-工作平台.md` |
| 全量模块映射到六类模板 | 通过 | `docs/specs/workbench/db/workbench-module-matrix.md` |
| 平台级 API 冻结 | 通过 | `docs/specs/workbench/api/workbench-platform-api.yaml` |
| 统计 API 冻结 | 通过 | `docs/specs/workbench/api/workbench-statistics-api.yaml` |
| 审批桥 API 冻结 | 通过 | `docs/specs/workbench/api/workbench-approval-api.yaml` |
| 核心领域模型与状态机冻结 | 通过 | `docs/specs/workbench/db/workbench-domain-model.md` |
| 角色与模块权限矩阵冻结 | 通过 | `docs/specs/workbench/db/workbench-permission-matrix.md` |
| 前端壳层、记录、审批同步状态冻结 | 通过 | `docs/specs/workbench/state/*.md` |
| 页面信息架构与模板页面冻结 | 通过 | `docs/specs/workbench/ui/*.md` |
| 企业微信审批桥通用化 | 通过 | `docs/specs/wecom/approval-native-bridge-spec.md` |
| 企业微信上线专项检查单 | 通过 | `docs/specs/wecom/workbench-go-live-checklist.md` |
| `docs/execplans.md` 与 Wave 1 状态同步 | 通过 | `docs/execplans.md` |

## 4. 关键冻结结果

- 审批类业务真源：企业微信审批实例状态。
- 非审批类业务真源：系统内部状态机。
- M4 开发拆分：Wave 2 至 Wave 8 按模板类型和部门模块分批实施。
- 权限策略：复用现有 `auth-spec` 角色，不新增全局角色。

## 5. 进入 Wave 2 的前置条件

- Wave 1 规格冻结后，不在 Wave 2 随意改动模板分类和核心对象命名。
- Wave 2 如需调整字段，仅允许通过“增量兼容”方式更新规格。
- Wave 2 开始前，后端/前端需先对齐 `moduleCode`、`templateCode`、`approvalChannel` 三项关键标识。
