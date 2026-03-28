# 采购管理模块规格索引

本目录用于承载里程碑 3 "采购管理"模块的详细规格。方向性说明见 [../../requirements/M3-采购管理.md](../../requirements/M3-%E9%87%87%E8%B4%AD%E7%AE%A1%E7%90%86.md)。

当前状态：目录结构已确定，以下文件待 Codex 逐步编写。

## API

| 文件 | 状态 | 说明 |
|---|---|---|
| `api/procurement-order-api.yaml` | 待编写 | 采购申请单创建、查询、更新、提交等接口 |
| `api/procurement-approval-api.yaml` | 待编写 | 审批动作、审批记录查询等接口 |
| `api/procurement-report-api.yaml` | 待编写 | 月报、年报、部门明细、细分明细报表接口 |

## DB

| 文件 | 状态 | 说明 |
|---|---|---|
| `db/schema.md` | 待编写 | 采购模块数据库关系总览 |
| `db/procurement-orders.md` | 待编写 | 采购申请单表设计 |
| `db/procurement-approvals.md` | 待编写 | 审批记录表设计 |

## State

| 文件 | 状态 | 说明 |
|---|---|---|
| `state/procurement-slice.md` | 待编写 | 采购录单、列表、详情相关前端状态 |
| `state/report-slice.md` | 待编写 | 报表筛选、聚合结果与导出状态 |

## UI

| 文件 | 状态 | 说明 |
|---|---|---|
| `ui/page-map.md` | 待编写 | 页面入口、路由与权限映射 |
| `ui/order-create-page.md` | 待编写 | 采购录单页规格 |
| `ui/order-list-page.md` | 待编写 | 采购单列表与查询页规格 |
| `ui/approval-page.md` | 待编写 | 审批处理页规格 |
| `ui/report-page.md` | 待编写 | 报表页与打印导出交互规格 |

## 编写顺序建议

1. API 与 DB 规格先行，先固定实体、状态和查询口径。
2. State 规格随后补齐，确保前后端状态命名一致。
3. UI 规格最后展开，并补充打印导出细节。
