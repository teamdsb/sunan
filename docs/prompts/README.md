---
status: current-index
owner: delivery
updated: 2026-11-17
replaces: []
replaced_by: []
---
# Wave 提示词索引

> M9“平台管理与配置升级”W2-W4 已实施，W5 本地迁移回归和操作包有条件通过，真实企微/三端/生产恢复尚未完成。以下提示词保留为执行与复验入口，实际状态见 [W5验收](../acceptance/M9-wave-5.md)。

## 使用方法

1. 先阅读 [M9 需求](../requirements/M9-平台管理与配置升级.md)、[执行计划](../plans/M9-execplans.md) 和 [backlog](../plans/M9-wave-backlog.md)，再进入对应 Wave。
2. 历史提示词只用于追溯，不可直接当作新的执行授权。
3. 每个 Wave 完成后使用 [Wave 验收模板](../plans/wave-acceptance-template.md) 形成验收记录。
4. 未取得命令输出和证据前，不得勾选执行计划。

## 当前 M9：平台管理与配置升级

| Wave | 主题 | 提示词 |
|---|---|---|
| 1 | 现状、身份权限、配置契约与迁移冻结 | [wave-1-identity-baseline.md](m9/wave-1-identity-baseline.md) |
| 2 | 全通讯录同步、用户管理后端与重新认证一致性 | [wave-2-user-directory.md](m9/wave-2-user-directory.md) |
| 3 | 管理后台页面与全业务权限、收件人统一 | [wave-3-admin-console.md](m9/wave-3-admin-console.md) |
| 4 | 后台推送设置、凭据与缓存隔离、通知接入 | [wave-4-message-settings.md](m9/wave-4-message-settings.md) |
| 5 | 迁移回归与验收 | [wave-5-release-acceptance.md](m9/wave-5-release-acceptance.md) |

## 已归档：M8

| Wave | 提示词 |
|---|---|
| 1 | `docs/archive/prompts/m8/wave-1-spec-baseline.md` |
| 2 | `docs/archive/prompts/m8/wave-2-permission-workflow.md` |
| 3 | `docs/archive/prompts/m8/wave-3-evidence-export.md` |
| 4 | `docs/archive/prompts/m8/wave-4-master-data.md` |
| 5 | `docs/archive/prompts/m8/wave-5-plan-task.md` |
| 6 | `docs/archive/prompts/m8/wave-6-inspection-capa.md` |
| 7 | `docs/archive/prompts/m8/wave-7-release-acceptance.md` |

原 M9 专业安全深化的 8 个 Wave 提示词已于 2026-11-16 随旧方案删除，不再作为可恢复基线。

## 通用约束

- 先冻结必要规格，再实施并验证，按风险选择有实际意义的测试。
- 系统管理员身份与主应用企业微信配置只走 env，后台只管理本里程碑明确允许的配置。
- 不修改历史归档结论，不接通本里程碑范围外的外部系统。
- 不以静态演示数据作为验收证据，不在验证命令未执行时宣称通过。
