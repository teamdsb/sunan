---
status: acceptance-archive
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M8 Wave 2 验收记录：权限与流程状态链

## 结论

状态：通过。Wave 2 的记录级 ABAC、参与人动作授权、非法转换、附件/打印越权拒绝和管理员敏感查看审计均有 PostgreSQL testcontainers 集成回归。

## 证据

- 规格：`docs/specs/safety/api/workflow-and-permission-api.yaml`、`db/workflow-and-permission-schema.md`、`state/workflow-lifecycle.md`、`ui/permission-and-action-rules.md`。
- 迁移：`apps/api/src/database/migrations/1710000015000-wave8-workflow-permission.ts`。
- 集成测试：`apps/api/test/workbench.integration.spec.ts`，9 tests passed。
- 命令：API lint、unit、integration、build；Web test、build；OpenAPI validate；文档索引均已执行。

## 验收重点

- crew 非本人、非本船、非参与记录返回 403。
- 可见但非 executor 的用户不能完成步骤；指定 executor 可以完成。
- 非授权用户不能上传附件或生成打印快照。
- 非法 `assigned -> close_record` 返回 409。
- system_admin 查看敏感记录产生 `sensitive_view` 审计日志。
