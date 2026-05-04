---
status: current-spec
owner: procurement
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 采购模块数据库总览

## 表清单

| 表名 | 说明 |
|---|---|
| `procurement_orders` | 采购单主表 |
| `procurement_order_approvals` | 采购单审批记录 |
| `procurement_order_files` | 采购单与附件关联 |
| `procurement_reports` | 报表审批单主表 |
| `procurement_report_approvals` | 报表审批记录 |
| `procurement_dimension_items` | 船舶/后勤细分字典 |

## 关系

- `procurement_order_approvals.order_id -> procurement_orders.id`
- `procurement_order_files.order_id -> procurement_orders.id`
- `procurement_order_files.file_id -> files.id`
- `procurement_report_approvals.report_id -> procurement_reports.id`

## 核心约束

1. 采购单与报表审批单均采用软删除与审计字段。
2. 审批记录表保留历史，不做软删除。
3. 统计口径默认纳入：`submitted`、`dept_approved`、`final_approved`、`rejected`；排除 `draft`。
4. 所有查询默认近 3 年，可通过参数缩小范围。
5. 预留原生审批接入字段：
   - `approval_channel`（`internal|wecom_native`）
   - `external_process_instance_id`
   - `external_status`
   - `external_synced_at`

## 部门编码兼容说明

为兼容现有认证数据，本模块使用以下编码：

- `general_office`
- `business_dept`
- `finance_dept`
- `shipping_dept`
- `logistics_dept`

说明：`general_office` 不带 `_dept` 是现有系统约定，M3 保持兼容。
