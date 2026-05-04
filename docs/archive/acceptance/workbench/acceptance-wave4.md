---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台 M4 Wave 4 验收归档

## 1. 验收结论

Wave 4（作业闭环类模块）已完成。

完成日期：`2026-04-21`

## 2. 验收范围

- 业务部：作业签到台、接收工作组流程、围油栏、船舶垃圾、船舶污油水、生活污水接收
- 工作组：中船工作组五步作业闭环、平陆运河工作组五步作业闭环
- `operation_flow` 模板：步骤模板、记录创建、步骤动作流转、详情追踪

## 3. 验收清单

| 验收项 | 结论 | 证据 |
|---|---|---|
| Wave 4 作业闭环模块完成注册并可见 | 通过 | `apps/api/src/modules/workbench/workbench.service.ts` |
| 作业闭环 schema 支持步骤模板下发 | 通过 | `GET /api/v1/workbench/modules/:moduleCode/schema` |
| 作业闭环记录创建接口可用 | 通过 | `POST /api/v1/workbench/records` |
| 作业闭环动作接口支持步骤推进 | 通过 | `POST /api/v1/workbench/records/:recordId/actions` |
| 前端支持作业闭环录单和步骤动作 | 通过 | `apps/web/src/features/workbench/WorkbenchHomePage.tsx` |
| 前端 API 已接入动作接口与步骤模板 | 通过 | `apps/web/src/features/workbench/workbenchApi.ts` |
| 执行计划 Wave 4 状态已同步 | 通过 | `docs/execplans.md` |

## 4. 实现说明

- 后端在工作平台服务中扩展 `operation_flow` 业务模板：
  - 为业务部与工作组模块配置统一字段 section 与步骤模板。
  - 创建记录时自动初始化步骤状态为 `pending`。
- 后端记录动作流转规则：
  - `start`：将首个待执行步骤推进为 `in_progress`，记录状态转为 `in_progress`。
  - `complete_step`：按 `payload.stepCode` 完成当前步骤并推进下一步；无后续步骤时进入 `pending_review`。
  - `submit_review`、`close_record`：复用平台通用动作链路。
- 前端工作平台页面扩展作业闭环交互：
  - 在 `operation_flow` 模块开放“新建作业闭环记录”。
  - 详情抽屉提供“开始作业/完成当前步骤/提交审核/关闭记录”动作按钮。
  - 新建时展示步骤模板预览，保持移动端连续操作路径一致。

## 5. 边界说明

- Wave 4 聚焦作业闭环模板，不包含检查整改类模块（Wave 5）与统计口径实现（Wave 6）。
- 审批类企业微信真源流程保持 Wave 2 既有能力，本波次不新增审批模块。
