---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# Wave 2 工作流权限数据库规格

## 表

| 表 | 用途 | 关键约束与索引 |
|---|---|---|
| `workbench_record_participants` | 记录或步骤的具名参与人、角色、完成规则与有效期 | FK 到记录/步骤；`(business_record_id, step_id, user_id, role)` 部分唯一；按记录、用户、状态索引 |
| `workbench_delegations` | 有效期内的委托执行关系 | 委托人与代理人不同；按委托人/代理人/有效期索引；软删除 |
| `workbench_record_transfers` | 责任交接的不可变审计轨迹 | FK 到记录；保留原责任人、新责任人、原因、操作人和时间 |
| `workbench_record_action_logs` 扩展 | 查看、拒绝、动作与敏感访问审计 | 新增 `request_id`、`action_scope`、`metadata`，不覆盖既有日志 |

所有表使用 UUID、`created_at`、`updated_at`、`deleted_at`、`created_by`、`updated_by`，FK 采用 `ON DELETE RESTRICT`；状态为 `active | transferred | withdrawn`。迁移必须同时包含 `up()`/`down()`，并在 PostgreSQL testcontainers 演练。

## 记录级 ABAC

读取许可 = 模块角色许可 AND (`system_admin` OR 同部门 OR 本人拥有/申请 OR 同船舶 OR 当前有效参与人)。`crew` 只能使用本人、本船或参与人分支；记录无船舶时，`crew` 只能使用本人或参与人分支。动作还需满足状态、步骤角色、代理有效期和职责隔离。
