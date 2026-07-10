---
status: current-index
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 安全管理领域规格索引

> 本目录是 M8/M9 新增的专业安全领域入口。Wave 1 已冻结领域边界、术语、测试、迁移与规格目录；具体 API、DB、state 和 UI 规格仍须在对应 Wave 实施前创建、评审并通过校验。

## 领域定位

安全领域不是第五个一级产品板块。用户仍从企业微信工作台和“工作平台”进入，安全领域负责提供跨现有模块复用的专业数据与闭环。

## M8 计划规格

| Wave | 层次 | 计划文件 | 当前状态 |
|---|---|---|---|
| 1 | Architecture | `domain-boundaries.md` | 已冻结 |
| 1 | Common | `terminology-and-status.md` | 已冻结 |
| 1 | Test | `testing-matrix.md` | 已冻结 |
| 1 | Migration | `migration-principles.md` | 已冻结 |
| 1 | API directory | `api/README.md` | 已冻结；规格待编写 |
| 1 | DB directory | `db/README.md` | 已冻结；规格待编写 |
| 1 | State directory | `state/README.md` | 已冻结；规格待编写 |
| 1 | UI directory | `ui/README.md` | 已冻结；规格待编写 |
| 2 | API | `api/workflow-and-permission-api.yaml` | 待编写 |
| 2 | DB | `db/workflow-and-permission-schema.md` | 待编写 |
| 2 | State | `state/workflow-lifecycle.md` | 待编写 |
| 2 | UI | `ui/permission-and-action-rules.md` | 待编写 |
| 3 | API | `api/evidence-and-export-api.yaml` | 待编写 |
| 3 | DB | `db/evidence-and-export-schema.md` | 待编写 |
| 3 | State | `state/evidence-jobs.md` | 待编写 |
| 3 | UI | `ui/mobile-evidence-components.md` | 待编写 |
| 4 | API | `api/master-data-api.yaml` | 待编写 |
| 4 | DB | `db/master-data-schema.md` | 待编写 |
| 4 | UI | `ui/master-data-pages.md` | 待编写 |
| 5 | API | `api/plan-task-api.yaml` | 待编写 |
| 5 | DB | `db/plan-task-schema.md` | 待编写 |
| 5 | State | `state/task-lifecycle.md` | 待编写 |
| 5 | UI | `ui/task-center-and-calendar.md` | 待编写 |
| 6 | API | `api/inspection-capa-api.yaml` | 待编写 |
| 6 | DB | `db/inspection-capa-schema.md` | 待编写 |
| 6 | State | `state/inspection-capa-lifecycle.md` | 待编写 |
| 6 | UI | `ui/inspection-and-capa-pages.md` | 待编写 |

“待编写”表示该 Wave 的具体合约尚未评审，不能据此新增生产表、Controller、页面或占位接口；“已冻结”只表示入口、边界和门禁已经确定。

### 已登记的 M8 Wave 3 跨模块修复

- 采购执行清单详情必须在 Wave 3 接入通用附件的受审计解除关联能力。
- 实施前先冻结 `evidence-and-export` 规格，并同步更新采购 API、DB、state、UI 规格；删除只解除采购单—文件关联，绝不直接删除 OSS 对象或可被其他业务引用的全局文件记录。
- M9 Wave 1 必须把该采购附件增删链路作为 M8 基线回归项。

## M9 计划规格

| Wave | 领域 | 计划规格组 | 当前状态 |
|---|---|---|---|
| 2 | 人员安全 | `personnel-safety-*` | 待编写 |
| 3 | 船舶作业 | `ship-operation-*` | 待编写 |
| 4 | 应急事故防台 | `emergency-incident-*` | 待编写 |
| 5 | 设备维修备件 | `equipment-maintenance-*` | 待编写 |
| 6 | 安全治理 | `safety-governance-*` | 待编写 |
| 7 | 文件内审档案 | `document-audit-archive-*` | 待编写 |

每组至少包含：

- `api/*.yaml`
- `db/*.md`
- `state/*.md`
- `ui/*.md`

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
- M8 Wave 提示词入口：`docs/prompts/README.md`
- Wave 1 提示词：`docs/prompts/m8/wave-1-spec-baseline.md`

## 外部集成边界

M8/M9 不创建海事监管、AIS、CCTV 等外部 API 规格。人工监管登记属于内部安全业务规格，不得命名为外部同步或接口回调。
