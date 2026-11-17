---
status: current-index
owner: planning
updated: 2026-11-17
replaces: []
replaced_by: []
---
# 当前执行计划索引

> 当前 M9“平台管理与配置升级”W2-W4 已实施，W5 本地演练/回归和操作包有条件通过；现场发布条件仍开放。本目录保存当前计划与验收模板。

## 当前文件

| 文档 | 状态 | 用途 |
|---|---|---|
| [M9-execplans.md](M9-execplans.md) | 本地有条件验收，现场未完成 | 5 个 Wave 的执行顺序、交付和验收门槛 |
| [M9-wave-backlog.md](M9-wave-backlog.md) | W5本地完成，现场未完成 | 用户目录、权限与部门覆盖、后台配置的工作清单 |
| [wave-acceptance-template.md](wave-acceptance-template.md) | 模板 | 每个 Wave 的统一验收记录格式 |

## M9 Wave 顺序

| Wave | 主题 |
|---|---|
| 1 | 现状、身份权限、配置契约与迁移冻结 |
| 2 | 全通讯录同步、用户管理后端与重新认证一致性 |
| 3 | 管理后台页面与全业务权限、收件人统一 |
| 4 | 后台推送设置、凭据与缓存隔离、通知接入 |
| 5 | 迁移回归与验收 |

全通讯录目标包含全企业未登录成员；授权可见范围不足时明确提示，局部或完整性未验证不计全目录验收通过。系统管理员与主应用企业微信设置只走 env。具体决策见 [M9 需求](../requirements/M9-平台管理与配置升级.md)。

## 已完成与已撤销

- M8 总验收：`docs/archive/acceptance/safety/acceptance-m8-overall.md`
- M8 最终功能核查：`docs/archive/audits/M8-最终功能实现核查.md`
- M8 历史执行计划：`docs/archive/execplans/M8-execplans.md`
- M8 历史 backlog：`docs/archive/backlogs/safety/M8-wave-backlog.md`
- M8 历史提示词：`docs/archive/prompts/m8/`
- 原 M9 专业安全深化已于 2026-11-16 撤销，原需求及暂停包已删除，不再恢复执行。

## 配套入口

- [执行计划总入口](../execplans.md)
- [M9 需求](../requirements/M9-平台管理与配置升级.md)
- [提示词索引](../prompts/README.md)
- [安全领域当前实现规格](../specs/safety/README.md)

## 使用规则

1. 实施前先冻结必要的接口、身份来源、配置边界和迁移规则，按风险选择有实际意义的测试。
2. 未通过当前 Wave 验收，不得将其任务标记为完成。
3. 不把计划目标写成当前已实现功能，不以静态演示数据作为验收证据。
4. 不修改历史验收结论，也不把原 M9 资料视为新 M9 的执行依据。
