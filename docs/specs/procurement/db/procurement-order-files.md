# procurement_order_files 表规格

## 表用途

维护采购单与附件文件（`files` 表）的多对多关系。

## 字段定义

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PK | 主键 |
| `order_id` | UUID | FK -> `procurement_orders.id` | 采购单ID |
| `file_id` | UUID | FK -> `files.id` | 文件ID |
| `relation_type` | VARCHAR(32) | NOT NULL default `attachment` | 关联类型，预留后续扩展 |
| `created_by` | VARCHAR(64) | NOT NULL | 关联人 UserId |
| `created_at` | TIMESTAMPTZ | NOT NULL | 关联时间 |

## 索引与约束

- 唯一索引：`uq_procurement_order_files_order_file` on (`order_id`, `file_id`)
- 普通索引：`idx_procurement_order_files_order_id` on (`order_id`)
- 普通索引：`idx_procurement_order_files_file_id` on (`file_id`)
