---
status: current-spec
owner: planning
updated: 2026-07-04
replaces: []
replaced_by: []
---
# M8-M9 升级总路线图：安全管理数字化闭环

## 1. 文档定位

本文是 M8、M9 的总规划入口，承接 M1-M6 已形成的企业微信 H5、四大板块、采购闭环和工作平台底座，并将平台从“通用动态表单与流程”升级为“可审计的航运安全管理领域平台”。

本文负责跨里程碑边界、能力依赖和总体退出标准。字段、状态、API、数据库和页面细节应在各 Wave 实施前写入 `docs/specs/safety/` 及相关既有领域规格。

## 1.1 当前调度说明

2026-07-04 起，M8/M9 顺延到 M7 上线体验与导航修复验收之后。当前修复入口为 `docs/plans/M7-execplans.md`。

在以下门禁通过前，不得启动 M8/M9 业务实现：

1. M7 Wave 1-6 验收完成。
2. 文件上传、采购 PDF、返回路径、工作台模块导航和企业微信直达回归无 P0/P1 遗留。
3. 文档索引、提示词索引、测试和构建结果可复核。

本文仍作为未来升级规格保留，不代表当前立即实施顺序。

## 2. 规划依据

- `docs/需求文档.md`
- `docs/requirements/M4-工作平台.md`
- `docs/requirements/M6-全量兑现与完美上线.md`
- `docs/handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md`
- `docs/specs/common/README.md`
- `docs/specs/workbench/README.md`
- `docs/specs/wecom/README.md`

## 3. 总体产品决策

### 3.1 保持四大板块

M8/M9 不新增第五个一级导航。专业安全能力继续归入“工作平台”，并支持企业微信工作台应用、消息和待办直接深链到目标任务。

建议路由采用：

- `/workbench/tasks`
- `/workbench/calendar`
- `/workbench/safety/master-data/*`
- `/workbench/safety/inspections/*`
- `/workbench/safety/issues/*`
- `/workbench/safety/personnel/*`
- `/workbench/safety/operations/*`
- `/workbench/safety/emergency/*`
- `/workbench/safety/equipment/*`
- `/workbench/safety/documents/*`
- `/workbench/safety/audits/*`

路由名称在对应 UI 规格评审后冻结，本文不替代页面规格。

### 3.2 通用底座与专业聚合流程分层

- 通用底座负责权限、任务、步骤、附件、签名、定位、消息、打印、导出和审计。
- 专业领域负责检查项、CAPA、人员资格、高风险作业、应急、设备、文件和内审规则。
- 不为每个业务复制一套状态机。
- 不用一个通用 JSON 表承载所有专业关系。

### 3.3 企业微信仍是主运行容器

- OAuth、组织身份、应用消息、JS-SDK 和原生审批继续复用。
- 移动端能力通过企业微信 H5 实现，不建设独立微信小程序。
- 关键任务必须支持工作台或消息深链直达。

### 3.4 不接通外部系统

M8/M9 明确不接通海事监管、AIS、CCTV、装载仪或其他外部平台。

允许：

- 保留现有外部链接入口。
- 内部登记外部检查、监管通知和人工上报结果。
- 上传外部回执、报告和截图。
- 记录人工上报时间、经办人和状态。

禁止：

- 新建未经确认的外部 API。
- 伪造模拟接口并宣称完成集成。
- 将外部系统状态作为内部自动化真源。

## 4. 两期边界

| 里程碑 | 核心目标 | 完成标志 |
|---|---|---|
| M8 | 建成可信运行底座、计划任务中心和检查问题 CAPA 核心闭环 | 安全任务可分派、执行、留证、整改、验证、关闭和统计 |
| M9 | 建成人员、作业、应急、设备、文件内审等专业安全业务 | 主要安全管理体系链路在内部可完整运行并归档 |

## 5. M8 能力范围

1. 安全领域术语、主数据和架构边界。
2. 船舶、本人、部门、任务参与人和状态组合权限。
3. 步骤执行人、多人并行、审核人、退回、终止、作废和审计。
4. 统一附件、拍照、签名、定位、打印、导出和下载。
5. 船舶、人员、任职、设备和证书基础主数据。
6. 计划、任务、统一待办、日历、提醒、催办和任务转移。
7. 检查模板、检查计划、多人检查、问题、不符合项、CAPA 和验证。
8. 真实看板、数据迁移、回归测试和 M8 上线。

## 6. M9 能力范围

1. 船员调配、交接、健康、资格、培训、考试和熟悉职责。
2. 航次安全校验、燃油、有限空间、明火、危险货物、高空舷外、岸电和环保作业。
3. 应急计划、训练、演习、评价、应急事件、事故险情和防台。
4. 设备树、维护计划、缺陷、修理、厂修、备件和库存。
5. 安全责任、费用、指定人员监督、船长复查和管理评审。
6. 受控文件、外来文件、分发回执、内审和报告。
7. 内部统计、档案、PDF 水印和人工监管上报留痕。
8. 全域联调、数据质量、真机验收和操作手册更新。

## 7. 关键依赖顺序

```text
M8 Wave 1 规格冻结
  -> Wave 2 权限与流程
  -> Wave 3 证据与归档
  -> Wave 4 主数据
  -> Wave 5 计划任务与待办
  -> Wave 6 检查问题 CAPA
  -> Wave 7 联调上线
  -> M9 Wave 1 基线回归
  -> M9 Wave 2-7 专业领域
  -> M9 Wave 8 全域上线
```

以下依赖不可倒置：

- CAPA 必须依赖任务参与人权限和证据服务。
- 航次资格校验必须依赖人员任职、证书和熟悉职责。
- 设备维护计划必须依赖设备主数据和计划任务中心。
- 内审不符合项必须复用 M8 问题与 CAPA 中心。
- 安全费用必须复用采购管理，不新建重复采购审批。

## 8. 目标领域模型

| 领域 | 主要对象 |
|---|---|
| 主数据 | vessel、personnel、vessel_assignment、equipment、certificate |
| 流程权限 | workflow_instance、workflow_step、task_participant、delegation |
| 证据 | business_attachment、signature_evidence、location_evidence、document_snapshot |
| 计划任务 | plan、plan_item、task、task_schedule、reminder、task_transfer |
| 检查问题 | checklist、inspection_plan、inspection_task、inspection_result、issue |
| CAPA | root_cause、corrective_action、preventive_action、verification |
| 人员安全 | qualification、health_record、familiarization、training、assessment |
| 作业安全 | work_permit、safety_check、measurement、operation_log |
| 应急事故 | emergency_plan、drill、evaluation、incident、response_log |
| 设备维修 | equipment_plan、maintenance_task、defect、repair、spare_inventory |
| 文件内审 | controlled_document、distribution、audit_plan、audit_record、audit_report |

实际表名必须在 DB 规格中按仓库命名规范冻结。

## 9. 非功能基线

- 所有业务时间存储为 UTC，界面按 `+08:00` 展示。
- 所有业务表使用 UUID、审计字段、软删除和数据库外键。
- 集成测试使用 PostgreSQL testcontainers，不使用 SQLite。
- 所有 API 使用 `/api/v1`、统一响应信封和 OpenAPI 规格。
- 所有导出、附件、PDF 和深链继承业务记录权限。
- 移动端最小可用宽度 320px，关键按钮点击区域不小于 44px。
- 弱网场景不得重复创建任务、措施、审批和附件绑定。
- 看板指标必须可追溯到真实数据查询。

## 10. 总体验收门槛

### M8 退出门槛

- 船员无法查看非本人、非本船、非参与任务。
- 非执行人无法推进步骤，整改人与验证人按规则隔离。
- 计划可自动生成任务，任务进入统一待办和日历。
- 检查问题可自动生成不符合项并完成 CAPA 验证关闭。
- 现场证据、PDF 和导出均可下载并受权限保护。
- M8 迁移、回滚、真机回归和验收证据完整。

### M9 退出门槛

- 人员资格和熟悉职责可作为航次审批前置条件。
- 高风险作业具备许可、检查、检测、监护、签名和证据。
- 应急、事故、设备、文件和内审发现的问题统一进入 CAPA。
- 设备维护可追踪至缺陷、修理、采购、备件和验收。
- 受控文件和内审报告可生成带版本与水印的归档文件。
- 外部监管事项可内部登记和人工上报留痕，但无外部接口依赖。

## 11. 变更控制

- 任何新增领域对象必须先更新安全领域 README 和对应 API/DB/state/UI 规格。
- 任何跨模块自动化必须记录触发条件、幂等键、失败补偿和审计日志。
- 任何验收结论必须附代码、测试、迁移、截图或运行记录。
- 如 M8 基础能力未通过验收，M9 对应依赖 Wave 不得开始。
