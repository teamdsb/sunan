---
status: current-index
owner: safety
updated: 2026-11-16
replaces: []
replaced_by: []
---
# 安全管理领域规格索引

> 本目录是安全管理当前实现规格入口。M8 已完成并归档，M8 规格继续作为生产实现基线维护。原 M9 专业安全深化方案已撤销，未创建其专业领域实现规格；新 M9 为[平台管理与配置升级](../../requirements/M9-平台管理与配置升级.md)，已规划、实施未开始。

## 领域定位

安全领域不是第五个一级产品板块。用户仍从企业微信工作台和“工作平台”进入，安全领域负责提供跨现有模块复用的专业数据与闭环。

## M8 已实现规格

| Wave | 层次 | 计划文件 | 当前状态 |
|---|---|---|---|
| 1 | Architecture | `domain-boundaries.md` | 已冻结 |
| 1 | Common | `terminology-and-status.md` | 已冻结 |
| 1 | Test | `testing-matrix.md` | 已冻结 |
| 1 | Migration | `migration-principles.md` | 已冻结 |
| 1 | API directory | `api/README.md` | 已实现并维护 |
| 1 | DB directory | `db/README.md` | 已实现并维护 |
| 1 | State directory | `state/README.md` | 已实现并维护 |
| 1 | UI directory | `ui/README.md` | 已实现并维护 |
| 2 | API/DB/State/UI | `workflow-and-permission-*` | 已实现并通过 Wave 2 验收 |
| 3 | API/DB/State/UI | `evidence-and-export-*` | 已实现并通过 Wave 3 验收 |
| 4 | API | `api/master-data-api.yaml` | 已实现并通过 Wave 4 验收 |
| 4 | DB | `db/master-data-schema.md` | 已迁移并通过 Wave 4 验收 |
| 4 | UI | `ui/master-data-pages.md` | 已实现并通过 Wave 4 验收 |
| 5 | API | `api/plan-task-api.yaml` | 已实现并通过 Wave 5 验收 |
| 5 | DB | `db/plan-task-schema.md` | 已迁移并通过 Wave 5 验收 |
| 5 | State | `state/task-lifecycle.md` | 已实现并通过 Wave 5 验收 |
| 5 | UI | `ui/task-center-and-calendar.md` | 已实现并通过 Wave 5 验收 |
| 6 | API/DB/State/UI | `inspection-capa-*` | 已实现并通过 Wave 6 验收 |
| 7 | Migration | `db/legacy-migration-schema.md` | 已实现并通过本地/合成演练；生产现场未在 M8 归档任务执行 |

M8 总验收和最终功能核查分别见 `docs/archive/acceptance/safety/acceptance-m8-overall.md`、`docs/archive/audits/M8-最终功能实现核查.md`。

### 已登记的 M8 Wave 3 跨模块修复

- 采购执行清单详情必须在 Wave 3 接入通用附件的受审计解除关联能力。
- 实施前先冻结 `evidence-and-export` 规格，并同步更新采购 API、DB、state、UI 规格；删除只解除采购单—文件关联，绝不直接删除 OSS 对象或可被其他业务引用的全局文件记录。
- 后续涉及 M8 基线回归时，应覆盖该采购附件增删链路；该要求不再绑定原 M9 的 Wave 编号。

## 原专业安全深化计划已撤销

原 M9 的需求、路线、执行计划、backlog 和提示词已于 2026-11-16 按用户要求删除；不再保留待实施的专业领域规格清单。人员安全、船舶作业、应急事故、设备维修、专业安全治理和文件内审等新增业务如需建设，应另行立项，不属于新 M9 的范围。

## 固定复用规则

- API：`docs/specs/common/api-conventions.md`
- DB：`docs/specs/common/db-conventions.md`
- 权限：`docs/specs/common/auth-spec.md`
- 文件：`docs/specs/common/file-upload-spec.md`
- 通知：`docs/specs/common/notification-spec.md`
- 前端体验：`docs/specs/common/frontend-experience-guidelines.md`
- 企业微信：`docs/specs/wecom/README.md`
- 工作平台运行时：`docs/specs/workbench/README.md`
- 采购联动：`docs/specs/procurement/README.md`

## 规格评审门禁

1. OpenAPI YAML 必须通过 `swagger-cli validate`。
2. DB 规格必须说明外键、索引、唯一约束、软删除和迁移回滚。
3. 状态规格必须给出合法状态、动作、执行角色和非法转换。
4. UI 规格必须覆盖直达、移动端、加载、空态、错误、权限和弱网。
5. 自动生成任务或问题必须说明幂等键、失败补偿和审计。
6. 未评审规格不得进入实现。

## Wave 1 冻结的辅助门禁

- 测试与验收矩阵：`testing-matrix.md`
- 数据迁移与兼容：`migration-principles.md`
- Wave 验收模板：`docs/plans/wave-acceptance-template.md`
- 历史 M8 提示词入口：`docs/prompts/README.md`
- Wave 1 历史提示词：`docs/archive/prompts/m8/wave-1-spec-baseline.md`

## 外部集成边界

M8 安全底座与新 M9 平台管理升级均不新增海事监管、AIS、CCTV 等外部 API 规格。人工监管登记属于内部安全业务规格，不得命名为外部同步或接口回调。
