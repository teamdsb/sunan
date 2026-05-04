---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台 M4 Wave 3 验收归档

## 1. 验收结论

Wave 3（台账/记录类模块）已完成。

完成日期：`2026-04-21`

## 2. 验收范围

- 总经办台账：培训、会议、安全月活动、年度工作计划
- 船务部台账：培训学时、演练、值守、岸基叫应、会议记录、案例学习
- 业务部台账：签船记录表、船舶动态记录表
- 台账字段 schema、录单、列表、详情回显

## 3. 验收清单

| 验收项 | 结论 | 证据 |
|---|---|---|
| Wave 3 台账模块完成注册并可见 | 通过 | `apps/api/src/modules/workbench/workbench.service.ts` |
| 台账字段 schema 接口可用 | 通过 | `GET /api/v1/workbench/modules/:moduleCode/schema` |
| 台账记录创建接口可用 | 通过 | `POST /api/v1/workbench/records` |
| 工作平台页面支持台账录单 | 通过 | `apps/web/src/features/workbench/WorkbenchHomePage.tsx` |
| 台账记录列表、详情与字段回显可用 | 通过 | `apps/web/src/features/workbench/workbenchApi.ts`、`WorkbenchHomePage.tsx` |
| 执行计划 Wave 3 状态已同步 | 通过 | `docs/execplans.md` |

## 4. 实现说明

- 后端新增 `WorkbenchRecordCreateDto`，并在工作平台控制器新增台账录单入口。
- 后端按模块下发字段 schema，前端通过 schema 动态渲染录入表单。
- 前端在选中 `ledger_form` 模块后显示“新建台账记录”能力。
- 新建记录提交后，自动刷新工作平台列表与待办聚合。

## 5. 边界说明

- Wave 3 聚焦台账类模块，不包含作业闭环类模块（Wave 4）和检查整改类模块（Wave 5）。
- 持久化实体迁移与更细粒度审批流将继续在后续 wave 演进。
