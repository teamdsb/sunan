---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 安全领域 API 规格目录

本目录只冻结 API 规格文件名和评审顺序；当前不含未评审的 OpenAPI、Controller 或占位接口。每个 YAML 创建前必须遵循 `../../common/api-conventions.md`，使用 `/api/v1`、复数资源、统一响应信封、标准错误和已声明的软删除语义，并通过 `swagger-cli validate`。

| Wave | 预期文件 | 范围 |
|---|---|---|
| 2 | `workflow-and-permission-api.yaml` | 数据范围、参与人、动作授权与审计查询 |
| 3 | `evidence-and-export-api.yaml` | 证据关系、受审计解除关联、签名、定位、快照与导出任务 |
| 4 | `master-data-api.yaml` | 船舶、人员任职、设备和证书安全关系 |
| 5 | `plan-task-api.yaml` | 计划、计划项、任务、待办、日历、提醒与转移 |
| 6 | `inspection-capa-api.yaml` | 检查、问题、不符合、CAPA、措施与验证 |

具体路径、请求/响应 schema、错误码、鉴权和幂等要求在对应 Wave 规格评审后写入，未经评审不得据此实现接口。
