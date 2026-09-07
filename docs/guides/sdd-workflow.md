---
status: current-source
owner: guides
updated: 2026-09-07
replaces: []
replaced_by: []
---
# 开发流程

工作约定见 [AGENTS.md](../../AGENTS.md)。先确认用户目标和原始业务材料，再结合代码与现有规格确定改动范围；原始要求与整理版文档不一致时，记录差异，避免把历史方案当作新的业务要求。

1. 从 [文档导航](../README.md) 找到相关领域和代码入口。
2. 核对受影响的页面、接口、数据与权限。以源码、entity 和 migration 确认实现；仅在对外接口契约或必须说明的业务决定、迁移操作发生变化时更新对应文档。不要求一次改动同步 API、DB、State、UI 四层说明，不为代码已有的信息另写规格。
3. 完成实现，运行与影响范围相适应的验证。优先保留能发现真实业务错误的测试，不为固定源码写法增加断言。
4. 说明实际变化、验证结果和仍未覆盖的场景。已有验收记录只说明当时状态，不能替代当前验证。

| 内容 | 位置 |
|---|---|
| API 契约 | `docs/specs/<领域>/api/` |
| 数据结构 | `apps/api/src/database/entities/`、`migrations/` |
| 页面与状态 | 对应页面、领域服务；旧 DB/UI/State 文档先查状态，已封存的不再维护 |
| 企业微信集成 | `docs/specs/wecom/` |
| 测试说明 | [testing-strategy.md](testing-strategy.md) |

修改 OpenAPI 后校验受影响的 YAML；数据库集成验证使用 PostgreSQL Testcontainers 与 migration。Mock 可用于开发和隔离外部服务，但验证结论需明确其范围。
