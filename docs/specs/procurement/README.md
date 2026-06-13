---
status: current-index
owner: procurement
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 采购管理模块规格（里程碑 M3）

## 模块定位

“采购管理”模块负责采购录单、审批、报表、打印导出与附件留存，并支持近 3 年历史查询。

本期采用内部审批流实现；同时在 API/DB/状态机/审计层预留企业微信原生审批接入字段与契约。

## 规格文档清单

| 层次 | 文件 | 状态 |
|---|---|---|
| API | `api/procurement-order-api.yaml` | Wave 1 已收口 |
| API | `api/procurement-approval-api.yaml` | Wave 1 已收口 |
| API | `api/procurement-report-api.yaml` | Wave 1 已收口 |
| API | `api/procurement-dictionary-api.yaml` | Wave 1 已收口 |
| DB | `db/schema.md` | Wave 1 已收口 |
| DB | `db/procurement-orders.md` | Wave 1 已收口 |
| DB | `db/procurement-order-approvals.md` | Wave 1 已收口 |
| DB | `db/procurement-order-files.md` | Wave 1 已收口 |
| DB | `db/procurement-reports.md` | Wave 1 已收口 |
| DB | `db/procurement-report-approvals.md` | Wave 1 已收口 |
| DB | `db/procurement-dimension-items.md` | Wave 1 已收口 |
| State | `state/procurement-slice.md` | Wave 1 已收口 |
| State | `state/report-slice.md` | Wave 1 已收口 |
| State | `state/dictionary-slice.md` | Wave 1 已收口 |
| UI | `ui/page-map.md` | Wave 1 已收口 |
| UI | `ui/order-create-page.md` | Wave 1 已收口 |
| UI | `ui/order-list-page.md` | Wave 1 已收口 |
| UI | `ui/approval-page.md` | Wave 1 已收口 |
| UI | `ui/report-page.md` | Wave 1 已收口 |
| UI | `ui/report-approval-page.md` | Wave 1 已收口 |
| UI | `ui/dictionary-admin-page.md` | Wave 1 已收口 |
| UI | `ui/print-export.md` | Wave 1 已收口 |
| Design | `budget-and-responsive-form-design.md` | 待书面复核 |

## 核心范围

- 采购单：录单、草稿、提交、审批、退回、驳回
- 报表：月报、年报、部门明细、部门细分明细
- 报表审批：独立报表审批单（部门主管 -> 财务部 -> 总经办）
- A4 导出：采购单与报表模板分离
- 附件留存：采购附件上传与绑定
- 历史查询：默认支持近 3 年
- 字典治理：船舶部/后勤部细分项由总经办与系统管理员维护

## 原生审批预留策略

- `approval_channel`：`internal`（本期启用）/`wecom_native`（预留）
- 外部流程字段（可空）：
  - `external_process_instance_id`
  - `external_status`
  - `external_synced_at`
- 审批动作来源：`source=internal|external`（本期仅 `internal`）
- 未来扩展接口仅在规格定义，不在本期生产路由上线

## Wave 1 验收对照

| 验收项 | 对应规格 |
|---|---|
| 采购单包含 `approval_channel` 与外部流程预留字段 | `db/procurement-orders.md`、`api/procurement-order-api.yaml` |
| 报表审批单包含 `approval_channel` 与外部流程预留字段 | `db/procurement-reports.md`、`api/procurement-report-api.yaml` |
| 审批动作明确 `source=internal|external` | `db/procurement-order-approvals.md`、`db/procurement-report-approvals.md`、`api/procurement-approval-api.yaml` |
| 未来桥接接口 `501 Not Implemented` 契约 | `docs/specs/wecom/approval-native-bridge-spec.md` |

## 约束对齐

- API 约定遵循 `docs/specs/common/api-conventions.md`
- DB 约定遵循 `docs/specs/common/db-conventions.md`
- 认证授权遵循 `docs/specs/common/auth-spec.md`
- 企业微信相关约束遵循 `docs/specs/wecom/*.md`

## Wave 5 交付与验收

- 验收归档：`docs/archive/acceptance/procurement/acceptance-wave5.md`
- 上线清单：`docs/specs/wecom/procurement-go-live-checklist.md`
