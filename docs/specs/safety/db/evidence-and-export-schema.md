---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# Wave 3 证据与导出数据库规格

## 表与保留规则

| 表 | 用途 | 关键字段与约束 |
|---|---|---|
| `evidence_records` | 工作平台记录的附件、签名和定位证据 | UUID；`business_type`、`business_id`、`evidence_type`、`source`、`status`、`file_id`、`summary_hash`、定位字段、采集人/时间；`file_id -> files.id ON DELETE RESTRICT`；坐标仅在 `capture_status=captured` 时非空 |
| `evidence_audits` | 证据创建、替换、归档、下载、解除关联和失败重试的不可变审计 | UUID；对象类型/ID、文件 ID、动作、原因、操作者、`request_id`、前后状态和 JSONB metadata；禁止更新/软删除 |
| `export_jobs` | 可恢复的工作平台和考勤异步导出 | UUID；`source_type`、`source_id`、查询快照、格式、状态、尝试次数、失败信息、结果文件、请求/开始/完成时间；`result_file_id -> files.id ON DELETE RESTRICT` |
| `wecom_media_transfers` | 企业微信 `media_id` 的幂等 OSS 转存 | UUID；`media_id`、category、状态、文件、失败原因、重试次数、请求人/时间；活跃记录上 `media_id` 唯一 |

`workbench_record_attachments` 和 `procurement_order_files` 保留为既有附件关系。Wave 3 解除采购附件仅物理删除其关联行；`files` 和 OSS 对象永不由该动作删除。既有工作平台附件在读模型中映射为 attachment evidence，新增签名和定位写入 `evidence_records`。

## 字段、索引与状态

- `evidence_records`：`business_type in (workbench_record)`，`evidence_type in (attachment,signature,location)`，`source in (file_upload,wecom_capture,signature_pad,device_location)`，`status in (active,replaced,archived,unlinked)`，`capture_status in (captured,denied,sdk_failed)`。索引 `(business_type,business_id,status)`、`file_id`、`captured_by,captured_at`。
- `export_jobs`：`status in (queued,running,succeeded,failed)`。索引 `(status,requested_at)` 供 worker 领取、`(source_type,source_id,requested_at)` 供授权查询；`queued/running` 不得带 `result_file_id`，`succeeded` 必须带结果文件，`failed` 必须带失败码和信息。
- `wecom_media_transfers`：`status in (queued,running,succeeded,failed)`，唯一约束 `(media_id)`；成功后同一 mediaId 返回原文件，失败可增加 retry 次数但不创建第二个转存记录。
- 业务表遵循通用审计列。`evidence_audits` 为不可变日志，只含 `created_at` 与 `created_by`，原因对 unlink/replace/archive 为 NOT NULL。

## 迁移与回滚

`up()` 创建检查约束、外键和索引，且不回填或删除既有 `files`/附件关系。`down()` 先删除 Wave 3 外键/索引和表，不删除已有附件或文件。迁移必须在 PostgreSQL testcontainers 验证：同文件多业务关联、采购解除关联、失败任务重试和 mediaId 幂等。
