---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M8 Wave 4 安全主数据数据库规格

`vessels`、`personnel` 与 `certificates` 是兼容保留的主表。Wave 4 新建的所有表均使用 UUID、`created_at`、`updated_at`、`deleted_at`、`created_by`、`updated_by`，并使用 PostgreSQL 外键和部分索引。

| 表 | 核心字段 | 约束与索引 |
|---|---|---|
| `safety_equipment_categories` | `code`, `name`, `status` | `code` 部分唯一；状态 `active/inactive` |
| `safety_equipment` | `code`, `name`, `category_id`, `vessel_id`, `status` | 编码部分唯一；分类、船舶外键 `RESTRICT`；`(vessel_id,status)` 索引 |
| `vessel_personnel_assignments` | `vessel_id`, `personnel_id`, `role_code`, `effective_from`, `effective_to`, `status` | 外键 `RESTRICT`；人员有效任职索引；日期必须递增；同一人员有效区间不得相交 |
| `master_data_import_batches` | `import_type`, `content_hash`, `status`, `summary` | `(import_type,content_hash)` 唯一，保存可重放对账摘要 |
| `master_data_import_rows` | `batch_id`, `row_no`, `natural_key`, `outcome`, `error_code`, `before_snapshot` | `(batch_id,row_no)` 唯一；保存新增/更新/跳过/失败及补偿信息 |
| `workbench_master_data_references` | `source_domain`, `source_record_id`, `field_key`, `object_type`, `raw_value`, `object_id`, `display_snapshot`, `mapping_status` | `(source_domain,source_record_id,field_key,object_type)` 部分唯一；永不改写来源 payload |

`certificates.owner_type` 扩充为 `equipment`，设备证书由 `owner_type='equipment'` 和 `owner_id=safety_equipment.id` 表达。迁移将先解除旧 owner-type 检查，再加入包含 equipment 的检查；`down()` 恢复前必须拒绝仍有设备证书的回退，确保不丢失 payload 或关联。

迁移顺序：创建结构与索引 → 扩展证书持有者类型 → 建立文本映射（只新增行）→ 对账。`down()` 删除 Wave 4 的表和触发器，不删除 `workbench_records.payload`、文件、现有船舶、人员或证书；批次数据恢复只允许使用 `before_snapshot` 显式补偿，避免覆盖后续人工变更。
