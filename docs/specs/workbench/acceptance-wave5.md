# 工作平台 M4 Wave 5 验收归档

## 1. 验收结论

Wave 5（检查整改类模块）已完成。

完成日期：`2026-04-21`

## 2. 验收范围

- 总经办：安全隐患排查管理
- 船务部：船舶自查排查、船舶检验、密闭空间作业、污油水接收作业、海事安全检查记录
- `inspection_rectification` 模板：步骤模板、记录创建、整改动作流转、详情追踪

## 3. 验收清单

| 验收项 | 结论 | 证据 |
|---|---|---|
| Wave 5 检查整改模块完成注册并可见 | 通过 | `apps/api/src/modules/workbench/workbench.service.ts` |
| 检查整改 schema 支持步骤模板下发 | 通过 | `GET /api/v1/workbench/modules/:moduleCode/schema` |
| 检查整改记录创建接口可用 | 通过 | `POST /api/v1/workbench/records` |
| 检查整改动作支持整改推进与退回 | 通过 | `POST /api/v1/workbench/records/:recordId/actions` |
| 前端支持检查整改录单和整改动作 | 通过 | `apps/web/src/features/workbench/WorkbenchHomePage.tsx` |
| 执行计划 Wave 5 状态已同步 | 通过 | `docs/execplans.md` |

## 4. 实现说明

- 后端扩展 `inspection_rectification` 模板：
  - 新增总经办与船务部检查整改模块的字段 section 与步骤模板。
  - 创建记录时初始化整改步骤，统一进入 `assigned` 状态。
- 后端整改动作规则：
  - `start`：首个整改步骤进入 `in_progress`。
  - `complete_step`：支持 `stepCode` 与可选整改载荷（`rectificationRequired`、`rectificationStatus`）。
  - `request_rework`：将当前步骤标记为需整改并退回 `rework_required`。
  - `submit_review`/`close_record`：复用平台通用动作链路。
- 前端工作平台页面扩展检查整改交互：
  - `inspection_rectification` 模块支持“新建检查整改记录”。
  - 详情抽屉提供“开始作业/完成当前步骤/标记整改并推进/退回整改/关闭记录”。
  - 新建时展示整改步骤模板预览。

## 5. 边界说明

- Wave 5 聚焦检查整改模板，不包含统计口径与导出能力（Wave 6）。
- 审批真源与企业微信回调能力维持 Wave 2 已有能力，本波次不新增审批模块。
