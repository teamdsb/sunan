---
status: current-spec
owner: procurement
updated: 2026-05-04
replaces: []
replaced_by: []
---
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

## Wave 3 解除关联与审计

- `DELETE /procurement/orders/{id}/attachments/{fileId}` 只删除 `procurement_order_files` 中对应的关联行；禁止由该动作删除 `files` 表记录或 OSS 对象。
- 解除关联复用采购草稿编辑权限：仅采购单创建人或系统管理员可操作，且订单必须为 `draft`；无权返回 403，非草稿返回 422，不存在的关联返回 404。
- 每次成功或拒绝的解除关联写入 `evidence_audits`：动作、操作人、时间、非空原因、`procurement_order` 对象 ID、文件 ID、关联 ID（如存在）与 request ID。审计不可变。
- 关联解除后，如果文件还被任何其他业务关系引用，引用保持有效；即使没有其他引用，清理也只能走独立的文件保留策略，不能由采购接口触发。
