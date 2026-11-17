---
status: current-index
owner: docs
updated: 2026-11-17
replaces: []
replaced_by: []
---
# 执行计划入口

> 当前 M9 为“平台管理与配置升级”，W2-W4 已实施，W5 本地迁移回归与操作包有条件通过；[现场条件](acceptance/M9-wave-5.md)仍开放，未生产部署。

## 当前计划

| 文档 | 用途 |
|---|---|
| [M9 需求](requirements/M9-平台管理与配置升级.md) | 用户管理、部门与权限覆盖、重新认证、配置与 env 边界 |
| [M9 执行计划](plans/M9-execplans.md) | 5 个 Wave 的顺序、交付物和验收门槛 |
| [M9 Wave backlog](plans/M9-wave-backlog.md) | 已实施范围、现场条件和验证清单 |
| [Wave 提示词](prompts/README.md) | 各 Wave 的实施与复验入口；生产发布须另行授权 |

M9 计划查看与管理全企业通讯录成员，含从未登录的用户；应用可见范围受限时显示局部结果与限制，完整性未验证不计全目录验收通过。系统管理员身份与主应用企业微信配置继续仅由 env 管理，后台推送应用配置未填写时使用主应用。

## 已完成与已撤销

| 里程碑 | 状态 | 入口或说明 |
|---|---|---|
| M7 上线体验与导航修复 | 已完成、已归档 | [最终验收](archive/acceptance/common/acceptance-m7-wave6.md) |
| M8 安全管理底座与核心闭环 | 已完成、已归档 | [总验收](archive/acceptance/safety/acceptance-m8-overall.md)、[最终功能核查](archive/audits/M8-最终功能实现核查.md)、[历史计划](archive/execplans/M8-execplans.md) |
| 原 M9 专业安全业务深化与体系完善 | 已撤销、从未实施 | 2026-11-16 按用户要求删除原需求和暂停包，不再作为可恢复计划 |

M8 Wave 1-7 通过并归档；三端真机、生产存量和生产恢复未在归档任务执行，实际状态已在验收中披露。历史 M7/M8 材料中的 M9 指原专业安全规划，不是新 M9 的依赖或验收证据。

## 归档位置

- M1-M8 历史计划：`docs/archive/execplans/`
- M8 历史 backlog：`docs/archive/backlogs/safety/M8-wave-backlog.md`
- M8 历史提示词：`docs/archive/prompts/m8/`
- M8 验收：`docs/archive/acceptance/safety/`

## 使用规则

- 每个新 Wave 使用 [Wave 验收模板](plans/wave-acceptance-template.md) 建立独立验收记录。
- 当前实现仍以源码、migration 和领域规格为准；新 M9 需求描述的是目标行为。
- 新需求不要直接修改 M1-M8 历史执行计划或验收结论。
- 新 M9 不包含原专业安全深化或海事监管、AIS、CCTV 等外部系统集成。
