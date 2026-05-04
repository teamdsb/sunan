---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台 M4 Wave 2 验收归档

## 1. 验收结论

Wave 2（工作平台公共底座 + 企业微信集成底座）已完成。

完成日期：`2026-04-21`

## 2. 验收范围

- 工作平台模块注册、首页壳层与待办聚合
- 通用记录列表/详情、附件上传、打印快照、操作日志基础能力
- 企业微信审批桥基础接口（发起、回调、实例查询、对账）

## 3. 验收清单

| 验收项 | 结论 | 证据 |
|---|---|---|
| 工作平台后端模块与平台接口落地 | 通过 | `apps/api/src/modules/workbench/workbench.controller.ts`、`workbench.service.ts` |
| 模块注册与待办聚合接口可用 | 通过 | `GET /api/v1/workbench/modules`、`GET /api/v1/workbench/dashboard` |
| 通用记录列表与详情接口可用 | 通过 | `GET /api/v1/workbench/records`、`GET /api/v1/workbench/records/:recordId` |
| 动作、附件、打印基础接口可用 | 通过 | `POST /api/v1/workbench/records/:recordId/actions`、`attachments`、`print` |
| 企业微信审批桥接口可用 | 通过 | `apps/api/src/modules/workbench/workbench-approval.controller.ts` |
| 前端 `/workbench` 从占位页升级为真实壳层页面 | 通过 | `apps/web/src/features/workbench/WorkbenchHomePage.tsx` |
| 前端工作平台 API 已接入 | 通过 | `apps/web/src/features/workbench/workbenchApi.ts` |
| 路由已接入工作平台首页 | 通过 | `apps/web/src/router/AppRoutes.tsx` |

## 4. 已实现能力说明

- `WS-2A`：工作平台模块注册与首页壳层
  - 已实现模块卡片、待办统计、审批待办统计、模块选择。
- `WS-2B`：通用记录详情/附件/打印/日志
  - 已实现记录列表、详情抽屉、步骤展示、附件展示、日志展示。
  - 已实现附件上传和打印快照后端接口。
- `WS-2C`：企业微信审批桥
  - 已实现审批发起、审批回调、实例查询、对账接口骨架和状态映射。

## 5. 风险与边界

- Wave 2 为公共底座，数据层当前以服务内种子数据与内存态承载，满足联调与页面开发基线。
- Wave 3 开始需逐步将业务数据迁移到正式持久化实体和迁移脚本中。
