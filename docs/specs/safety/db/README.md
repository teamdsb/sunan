---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 安全领域 DB 规格目录

本目录只冻结数据库规格文件名和评审顺序；Wave 1 不新增生产表、实体或 migration。每份 DB 规格必须遵循 `../../common/db-conventions.md`，说明 UUID 主键、审计字段、软删除、外键、索引、唯一约束、数据保留、`up()`/`down()` 与 PostgreSQL 演练。

| Wave | 预期文件 | 范围 |
|---|---|---|
| 2 | `workflow-and-permission-schema.md` | 数据范围、参与人、代理与动作审计 |
| 3 | `evidence-and-export-schema.md` | 证据关系、签名、定位、快照和导出任务 |
| 4 | `master-data-schema.md` | 船舶、人员任职、设备和证书关系 |
| 5 | `plan-task-schema.md` | 计划、计划项、任务、日程、提醒和转移 |
| 6 | `inspection-capa-schema.md` | 检查、结果、问题、CAPA、措施和验证 |

迁移设计和数据兼容必须同时满足 `../migration-principles.md`；未评审的文件名不构成建表授权。
