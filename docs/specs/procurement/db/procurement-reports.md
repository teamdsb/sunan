# procurement_reports 表规格

## 表用途

存储独立报表审批单（不是聚合结果物化表）。

## 字段定义

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PK | 主键 |
| `report_no` | VARCHAR(32) | UNIQUE（软删除过滤） | 报表审批单编号 |
| `report_type` | VARCHAR(32) | NOT NULL | `monthly`/`yearly` |
| `period_year` | INTEGER | NOT NULL | 年度 |
| `period_month` | INTEGER | NULL | 月度报表时必填 |
| `department_code` | VARCHAR(32) | NULL | 可按部门发起 |
| `snapshot_params` | JSONB | NOT NULL default `{}` | 统计筛选参数快照 |
| `snapshot_summary` | JSONB | NOT NULL default `{}` | 汇总结果快照 |
| `status` | VARCHAR(32) | NOT NULL | `draft/submitted/dept_approved/finance_approved/final_approved/rejected` |
| `approval_channel` | VARCHAR(32) | NOT NULL default `internal` | 审批通道 |
| `external_process_instance_id` | VARCHAR(128) | NULL | 外部流程实例ID（预留） |
| `external_status` | VARCHAR(64) | NULL | 外部流程状态（预留） |
| `external_synced_at` | TIMESTAMPTZ | NULL | 最近外部同步时间（预留） |
| `submitted_at` | TIMESTAMPTZ | NULL | 提交时间 |
| `final_approved_at` | TIMESTAMPTZ | NULL | 终审通过时间 |
| `export_pdf_file_id` | UUID | NULL | 导出PDF文件ID |
| `created_by` | VARCHAR(64) | NOT NULL | 创建人 UserId |
| `updated_by` | VARCHAR(64) | NOT NULL | 更新人 UserId |
| `created_at` | TIMESTAMPTZ | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 更新时间 |
| `deleted_at` | TIMESTAMPTZ | NULL | 软删除时间 |

## 规则

1. 报表聚合按实时查询得到，`snapshot_*` 用于审批留痕与导出一致性。
2. 仅统计近 3 年范围内采购数据。
3. 本期审批链：部门主管 -> 财务部 -> 总经办。
