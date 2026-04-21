# 工作平台 M5 Wave 1 验收归档

## 1. 验收结论

Wave 1（M5 文档冻结）已完成。

完成日期：`2026-04-22`

## 2. 验收范围

- M5 需求与执行计划冻结
- 工作平台运行时存储与接口规格冻结
- 企业微信审批运维与真机回归规格冻结
- 遗留模块（`财务板块`、`海图更新`）边界纳入

## 3. 验收清单

| 验收项 | 结论 | 证据 |
|---|---|---|
| M5 目标、范围、非目标和上线口径明确 | 通过 | `docs/requirements/M5-上线强化与遗留收口.md` |
| M5 执行计划已切换并完成 Wave 1 收口 | 通过 | `docs/execplans.md`、`docs/M5-execplans.md` |
| 工作平台运行时存储规格已冻结 | 通过 | `docs/specs/workbench/db/workbench-runtime-schema.md` |
| 工作平台平台接口已升级为持久化型契约 | 通过 | `docs/specs/workbench/api/workbench-platform-api.yaml` |
| 工作平台审批接口已补齐管理员检索/重试/对账契约 | 通过 | `docs/specs/workbench/api/workbench-approval-api.yaml` |
| 审批运维规格与真机回归模板已形成 | 通过 | `docs/specs/wecom/approval-ops-spec.md`、`docs/specs/wecom/workbench-real-device-regression.md` |
| 遗留模块已进入模块矩阵与 UI 边界文档 | 通过 | `docs/specs/workbench/db/workbench-module-matrix.md`、`docs/specs/workbench/ui/workbench-department-modules.md` |
| M5 backlog 已从优化清单升级为实施清单 | 通过 | `docs/specs/workbench/m5-optimization-backlog.md` |

## 4. 校验记录

- OpenAPI 校验通过：
  - `npx swagger-cli validate docs/specs/workbench/api/workbench-platform-api.yaml`
  - `npx swagger-cli validate docs/specs/workbench/api/workbench-approval-api.yaml`

## 5. 边界与说明

- 本波次仅完成文档与规格冻结，不包含代码实现与迁移执行。
- M1-M4 历史验收文档与历史需求语义保持不变。
- `财务板块` 与 `海图更新` 在 M5 先冻结边界，开发后置到后续 wave。

## 6. 进入 Wave 2 的前置条件

1. 按 `workbench-runtime-schema.md` 落地 TypeORM 实体与 migration。
2. 将 `workbench` 运行态从内存存储切换为 PostgreSQL。
3. 建立 `apps/api/test` 下工作平台集成测试基线（testcontainers）。
4. 保持审批桥单真源规则，并接入异常检索与重试能力。
