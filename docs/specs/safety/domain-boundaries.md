---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 安全领域边界与 M8 差距基线

## 冻结结论

M8 在既有“工作平台”内建设安全管理底座，不新增第五个一级导航。所有安全入口均为 `/workbench/...` 下的工作平台路由或企业微信工作台、应用消息的深链；路由名称在相应 UI 规格评审后才可创建。

M8 不建设独立微信小程序，不接通海事监管、AIS、CCTV 或其他外部平台。外部检查、监管通知、人工上报及其回执仅作为内部记录、附件和来源信息处理，不形成外部同步、回调或自动化真源。

## 领域责任

| 边界 | M8 责任 | 复用或不负责的边界 |
|---|---|---|
| 权限与流程 | 属性数据范围、参与人、动作授权、状态审计 | 复用企业微信身份、既有审批真源；不替代企业微信审批单 |
| 证据与归档 | 附件关系、拍照、签名、定位、快照、导出及审计 | 复用文件服务和 OSS；不物理删除仍被引用的全局文件 |
| 安全主数据 | 船舶、人员任职、设备、证书的安全关系与受控选择 | 不复制企业微信组织或既有采购基础数据 |
| 计划与任务 | 计划、计划项、执行任务、待办、日历、催办和转移 | 不把工作平台通用记录直接等同为安全任务 |
| 检查与 CAPA | 检查模板/结果、问题、不符合、根因、措施、验证与关闭 | 不把结构化问题和 CAPA 写入通用 `payload` 代替领域对象 |
| 采购联动 | Wave 3 为采购执行清单接入受审计附件解除关联 | 不新建采购审批；不删除 OSS 对象或全局文件元数据 |

## 当前实现差距与证据

| 判断 | 现有证据 | Wave 处理 |
|---|---|---|
| 一级导航当前只有“我的、办事、采购管理、工作平台”四组 | `apps/web/src/layouts/AppShell.tsx` 的 `groupIconMap`、`bottomIconMap` 与 `currentModuleKey` 仅列出 `my`、`office`、`procurement`、`workbench` | 保持四组；安全能力从工作平台进入 |
| 工作平台已有通用记录、步骤、附件、动作和打印基础 | `apps/api/src/modules/workbench/workbench.controller.ts` 的 `/api/v1/workbench/records`、`actions`、`attachments`、`print`；`workbench-record*.entity.ts` | Wave 2-6 在其上增加独立安全领域规格，不修改本 Wave 的生产对象 |
| 现有工作平台记录是通用模板记录，步骤只有单一 `completedBy` 与 JSON 载荷 | `apps/api/src/database/entities/workbench-record.entity.ts` 的 `payload`；`workbench-record-step.entity.ts` 的 `completedBy`、`stepPayload` | Wave 2 评审参与人、多方完成和权限模型；Wave 5/6 不以这些字段替代任务或 CAPA 实体 |
| 文件上传已有采购和工作平台分类及单元测试 | `apps/api/src/modules/files/files.constants.ts`；`apps/api/src/modules/files/files.service.spec.ts` 的“uses domain storage prefixes”用例 | Wave 3 复用文件服务并补充证据关系、签名、定位和解除关联审计 |
| 采购附件现有绑定和受权下载，尚无解除关联接口或界面动作 | `POST /api/v1/procurement/orders/:id/attachments`、`GET /api/v1/procurement/orders/:id/attachments/:fileId/download-url` 位于 `apps/api/src/modules/procurement/procurement.controller.ts`；`ProcurementOrderDetailPage.tsx` 已绑定附件列表只有“预览/下载”；其测试仅覆盖绑定和下载 | Wave 3 定义且评审解除关联 API、草稿编辑权限、二次确认、审计和文件复用回归 |
| 安全专用规格和实现尚未建立 | `docs/specs/safety/` 在本 Wave 开始前只有 `README.md`；`apps/api/src/database/entities/` 无计划、任务、检查、问题或 CAPA 的独立实体 | Wave 1 只冻结目录、术语与门禁；后续 Wave 的规格评审通过后才可新增 migration、实体、Controller 或页面 |

## 跨领域规则

1. 后端对列表、详情、动作、附件、打印和导出使用同一授权上下文；前端可见性不是安全控制。
2. 自动创建、提醒、导出和外部回执登记必须指定触发条件、幂等键、失败补偿和审计来源。
3. 每项安全记录保留来源领域和来源记录标识；源记录不因迁移或关闭被覆盖。
4. 状态、对象、接口、表和页面都先在相应规格评审，再进入测试和实现。

## Wave 与规格归属

| Wave | 可开始的领域变更 | 规格入口 |
|---|---|---|
| 2 | 授权上下文、流程参与人和动作状态 | `api/workflow-and-permission-api.yaml`、`db/workflow-and-permission-schema.md`、`state/workflow-lifecycle.md`、`ui/permission-and-action-rules.md` |
| 3 | 证据关系、附件解除关联、签名、定位、PDF 与导出 | `api/evidence-and-export-api.yaml`、`db/evidence-and-export-schema.md`、`state/evidence-jobs.md`、`ui/mobile-evidence-components.md` |
| 4 | 船舶、人员任职、设备和证书关系 | `api/master-data-api.yaml`、`db/master-data-schema.md`、`ui/master-data-pages.md` |
| 5 | 计划、计划项、任务、待办和日历 | `api/plan-task-api.yaml`、`db/plan-task-schema.md`、`state/task-lifecycle.md`、`ui/task-center-and-calendar.md` |
| 6 | 检查、问题、不符合与 CAPA | `api/inspection-capa-api.yaml`、`db/inspection-capa-schema.md`、`state/inspection-capa-lifecycle.md`、`ui/inspection-and-capa-pages.md` |

这些文件名和目录为冻结的规格入口，不表示 API、表、Controller、页面或占位接口已经获准创建。
