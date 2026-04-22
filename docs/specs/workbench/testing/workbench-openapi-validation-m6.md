# 工作平台 OpenAPI 校验清单（M6 Wave7）

## 1. 文档定位

本清单用于冻结 Wave7 的 OpenAPI 校验基线，作为发布前规格一致性的强制门槛。

## 2. 校验命令

```bash
npx swagger-cli validate docs/specs/workbench/api/workbench-platform-api.yaml
npx swagger-cli validate docs/specs/workbench/api/workbench-approval-api.yaml
npx swagger-cli validate docs/specs/workbench/api/workbench-admin-api.yaml
npx swagger-cli validate docs/specs/workbench/api/workbench-statistics-api.yaml
```

## 3. 校验结果（2026-04-22）

| 规格文件 | 结果 | 备注 |
|---|---|---|
| `api/workbench-platform-api.yaml` | 通过 | 运行时主接口 |
| `api/workbench-approval-api.yaml` | 通过 | 审批桥与管理员检索维度 |
| `api/workbench-admin-api.yaml` | 通过 | 导出/对账/诊断管理员接口 |
| `api/workbench-statistics-api.yaml` | 通过 | 统计中心相关接口 |

## 4. 变更约束

- 新增或修改任一 OpenAPI 文件后，必须重新执行全部校验命令。
- 校验失败不得进入 UAT 阶段。
- 校验结论需同步到当前执行波次的验收归档。
