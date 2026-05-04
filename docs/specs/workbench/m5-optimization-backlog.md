# 工作平台 M5 实施 Backlog

## 1. 文档目的

本清单承接 M4 Wave 8 验收结论，将 M5 从“优化项沉淀”升级为“可执行 backlog”，用于指导文档冻结、开发优先级、测试收口与上线准备。

## 2. 优先级定义

- P0：上线稳定性与合规风险，必须优先处理。
- P1：影响核心效率与运维质量，应在 M5 主体完成。
- P2：体验与扩展优化，可按资源滚动推进。

## 3. Backlog 总表

| 优先级 | 主题 | 是否首批开发 | 目标 | 关键依赖 | 验收口径 |
|---|---|---|---|---|---|
| P0 | 工作平台运行时持久化 | 是 | 将记录、步骤、附件、打印快照、审批实例从内存态迁移为 PostgreSQL 运行时实体 | `db/workbench-runtime-schema.md`、TypeORM migration | 工作平台不再依赖内存 `Map` |
| P0 | 企业微信真机回归留痕 | 是 | 在目标环境形成 iOS / Android 真机回归证据 | `docs/specs/wecom/workbench-real-device-regression.md` | 每条核心链路都有截图或录屏、设备信息、执行人、时间 |
| P0 | 审批桥容错与告警 | 是 | 补齐回调失败、对账失败、重试失败的治理闭环 | `docs/specs/wecom/approval-ops-spec.md` | 审批异常实例可检索、可重试、可对账、可审计 |
| P0 | 权限矩阵自动化校验 | 是 | 将模块可见性和关键动作权限纳入自动化回归 | `docs/specs/workbench/db/workbench-permission-matrix.md` | 关键角色路径有自动化用例和 CI 检查 |
| P1 | 统计口径固化与导出 | 是 | 固定月度统计导出模板和财务对账口径 | `api/workbench-platform-api.yaml` | 导出与在线统计、财务对账结果一致 |
| P1 | 打印模板标准化 | 是 | 建立统一 A4 打印模板体系与快照字段规则 | `db/workbench-runtime-schema.md`、打印 UI spec | 同类模板打印输出版式一致、可归档追溯 |
| P1 | 可观测与追踪 | 是 | 收口日志、指标、SLI/SLO 与告警面板需求 | `docs/specs/wecom/workbench-go-live-checklist.md` | 审批、导出、消息、JS-SDK、关键 API 均可追踪 |
| P2 | 前端性能优化 | 否 | 路由与模块级拆分，降低首屏负担 | Web 构建分析 | 构建产物和首屏性能基线有改善 |
| P2 | 批量操作能力 | 否 | 支持批量归档、批量导出等运营能力 | 运行时实体已落地 | API 和页面交互可支持批量动作 |
| P2 | 数据治理 | 否 | 建立冷热分层、归档策略和保留周期 | 运行时实体、归档规则 | 历史数据保留周期和检索策略清晰 |
| P2 | 财务板块遗留规格 | 否 | 将原始需求中的 `财务板块` 纳入边界文档，不冻结字段级 API | 原始需求文档 | 形成边界说明与待确认清单 |
| P2 | 海图更新遗留规格 | 否 | 将 `海图更新` 纳入最小可执行 SDD | 原始需求文档 | 明确最小字段范围与模板归类 |

## 4. 建议实施顺序

1. P0：工作平台运行时持久化 + 审批桥容错 + 真机回归留痕 + 权限自动化。
2. P1：统计导出/对账 + 打印模板标准化 + 可观测体系。
3. P2：性能优化 + 批量操作 + 数据治理 + 遗留规格进一步细化。

## 5. 与 Wave 的对应关系

| Wave | 对应 backlog |
|---|---|
| Wave 1 | 文档冻结、审批运维规格、真机回归模板、遗留规格边界 |
| Wave 2 | 工作平台运行时持久化、测试基线、运行时迁移与索引治理 |
| Wave 3 | 审批桥容错与告警、真机留痕、权限自动化 |
| Wave 4 | 统计导出/对账、打印标准化、可观测、遗留模块收口 |

## 6. 依赖关系

- 企业微信配置与回调环境：`docs/specs/wecom/workbench-go-live-checklist.md`
- 权限基础：`docs/specs/common/auth-spec.md`
- 工作平台规格索引：`docs/specs/workbench/README.md`
- 运行时实体边界：`docs/specs/workbench/db/workbench-runtime-schema.md`
- 审批运维边界：`docs/specs/wecom/approval-ops-spec.md`

## 7. 实施约束

- M5 首批不重做 M1-M4 历史文档和历史验收结论。
- `财务板块`、`海图更新` 均纳入目录，但不强行发明字段、流程或 API。
- 所有新增接口、状态和表级对象必须与 `docs/specs/common/api-conventions.md` 和 `docs/specs/common/db-conventions.md` 对齐。

## 8. 验收建议

- 每个 backlog 项至少包含：目标、影响范围、监控指标、回滚策略、验收口径。
- P0 / P1 项纳入里程碑验收；P2 项可作为滚动交付。
- 文档冻结后，优先进入 `WS-2A 工作平台运行时持久化与审批实例落库`。
