---
status: current-spec
owner: safety
updated: 2026-07-12
replaces: []
replaced_by: []
---
# Wave 7 存量安全记录迁移与对账数据库规格

## 迁移边界

来源限于 `goa_safety_hazard`、`shipping_self_inspection`、`shipping_vessel_inspection`、`shipping_maritime_safety_check` 四类未删除的 `workbench_records`。迁移只新增 `safety_issues` 和 `issue_sources` 映射，不更新来源状态、`payload`、附件、步骤或审计。

## 批次与逐行证据

| 表 | 用途 | 主要约束 |
|---|---|---|
| `legacy_safety_migration_batches` | 每次执行、重放和回滚的数量摘要 | `request_id` 唯一；保存来源/创建/跳过/失败数和最终状态 |
| `legacy_safety_migration_rows` | 每条来源的分类、状态映射、目标和错误 | `(batch_id,source_record_id)` 唯一；来源 FK `RESTRICT`；目标 FK `SET NULL`，使回滚后仍保留逐行证据 |

`safety_issues.idempotency_key = SHA-256("legacy-workbench:" + source_record_id)`，`issue_no` 使用同一哈希前 12 位，因此并发或重复执行不会产生重复问题。逐行使用 savepoint，单条错误记为 `failed` 而不丢失其他成功行。

## 映射

- 总经办安全隐患 -> `hazard`。
- 船舶自查/船舶检验 -> `general`。
- 海事安检 -> `external`。
- `in_progress/rework_required` -> `action_in_progress`。
- `pending_review/approval_pending` -> `pending_verification`。
- 已关闭、终止、作废、驳回或取消 -> `closed`，其他 -> `open`。
- 等级优先读取 `payload.severity/level`，无法识别时为 `minor`。
- 船舶按 UUID、编码或名称映射；无唯一匹配时保留原文快照并使用部门责任范围。

## 回滚与只读兼容

批次回滚只删除该批新建且没有 CAPA、额外来源或问题动作审计的问题和链接。已被后续业务使用的问题保留，不强删。旧工作平台记录始终可读；存在 `legacyReadOnly=true` 迁移来源链接时，数据库触发器拒绝 UPDATE/DELETE，防止绕过 UI 改写历史。新问题页面通过 `issue_sources` 返回原记录深链；批次回滚删除链接后记录恢复原有写入能力。

## 验证入口

```bash
pnpm --filter api migration:safety -- classify
pnpm --filter api migration:safety -- run <request-id>
pnpm --filter api migration:safety -- verify <batch-id>
pnpm --filter api migration:safety -- rollback <batch-id>
```

PostgreSQL 集成测试必须覆盖四类映射、并发重放、单行失败隔离、数量/关联/来源不变对账、批次回滚、全部 migration down/up 及重复 up no-op。
