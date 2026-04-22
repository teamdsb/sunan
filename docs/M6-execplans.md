# M6 执行计划：全量兑现、企微迁移、独立模块化与完美上线

## Wave 状态

### Wave 1
- [x] WS-1A M6 需求、执行计划与工作平台 M6 入口文档重构
- [x] WS-1B 工作平台模块级现状审计与矩阵重写
- [x] WS-1C `财务板块`、`海图更新` 独立 SDD 入口建立

### Wave 2
- [x] WS-2A 企业微信 JS-SDK 迁移规格冻结
- [x] WS-2B OAuth2、可信域名、回调、审批、消息生产配置口径冻结
- [x] WS-2C 真机验证、UAT、上线材料和回滚门槛冻结

### Wave 3
- [x] WS-3A 工作平台独立路由与页面 IA 冻结
- [x] WS-3B 管理员运维台 UI / State / API / 留痕规格冻结
- [x] WS-3C 核心契约更新：审批 API 查询维度与管理员 API 契约

### Wave 4
- [x] WS-4A 高频台账类模块 Batch A 规格冻结
- [x] WS-4B 高频作业闭环类模块 Batch A 规格冻结
- [x] WS-4C Batch A 打印、归档、权限、审批映射标准化

### Wave 5
- [ ] WS-5A 检查整改类模块 Batch B 规格冻结
- [ ] WS-5B 统计 / 审批 / 资产服务类模块 Batch B 规格冻结
- [ ] WS-5C 导出任务、对账任务、诊断事件规格冻结

### Wave 6
- [ ] WS-6A `财务板块` provisional SDD 完成
- [ ] WS-6B `海图更新` 正式 SDD 完成
- [ ] WS-6C 海图更新与 `chart_update` 提醒联动规则冻结

### Wave 7
- [ ] WS-7A OpenAPI 校验、模块级测试矩阵与路由级测试矩阵冻结
- [ ] WS-7B 真机回归、业务 UAT、缺陷闭环模板完成
- [ ] WS-7C 上线材料包、回滚预案和值班机制完成

## 总体策略

- M6 不降级为“首批可上线”口径，而是以“总需求文档全量兑现 + 企业微信正式发布闭环”为目标。
- 工作平台继续保留统一 bounded context、统一运行时、统一权限与统一审批桥，不做大规模后端拆模块。
- 通过“独立页面 + 模块元数据 + 通用运行时 + 新增管理员 API”实现高保真业务化。
- `财务板块` 先输出 provisional SDD；`海图更新` 从最小边界升级为正式 SDD。

## Wave 1：主线文档重构与现状审计

### 目标

- 把 M6 从目标性描述改成执行型规格。
- 统一主计划、M6 镜像计划、工作平台 README 和模块矩阵的口径。
- 明确每个模块的原始需求来源、当前代码现状、M6 页面形态与阻塞项。

### 产出

- `docs/requirements/M6-全量兑现与完美上线.md`
- `docs/execplans.md`
- `docs/M6-execplans.md`
- `docs/specs/workbench/README.md`
- `docs/specs/workbench/db/workbench-module-matrix.md`

### 验收标准

- 工作平台所有模块不再只写“已冻结”，而是明确为 `已实现 / 已有底座 / M6 待高保真 / M6 遗留`。
- `财务板块`、`海图更新` 在 SDD 目录中有独立入口。
- M6 的完成定义、发布门槛、依赖 gate 和 wave 拆分均可执行。

## Wave 2：企业微信运行时与上线规格前置冻结

### 实现范围

- JS-SDK 规格从旧 `wx.config + wx.agentConfig` 升级为“官方当前推荐接入 + legacy adapter 灰度兼容”。
- 统一 OAuth2、可信域名、JS 接口安全域名、审批回调、消息回调、模板映射、生产参数和真机验证口径。
- 建立上线材料包、真机留痕、缺陷闭环、回滚和值班模板。

### 产出

- `docs/specs/wecom/jssdk-spec.md`
- `docs/guides/wecom-dev-setup.md`
- `docs/specs/wecom/workbench-go-live-checklist.md`
- `docs/specs/wecom/workbench-real-device-regression.md`
- `docs/specs/workbench/acceptance-m6-wave2.md`

### 验收标准

- 文档直接引用企业微信当前官方依据。
- 明确 `@wecom/jssdk` / `ww.register` 目标态、legacy adapter 兼容态和回退策略。
- 真机回归与上线材料要求可直接执行。

## Wave 3：工作平台独立页面化与管理员台规格冻结

### 实现范围

- 冻结模块级独立路由、页面信息架构、共享壳层、筛选器与通用详情边界。
- 冻结管理员运维台页面、状态模型、聚合卡片、筛选器、详情抽屉与诊断事件视图。
- 新增管理员专属 API 合约，补齐审批 API 查询维度。

### 产出

- `docs/specs/workbench/ui/workbench-module-route-map.md`
- `docs/specs/workbench/ui/workbench-admin-console.md`
- `docs/specs/workbench/state/workbench-admin-console.md`
- `docs/specs/workbench/api/workbench-admin-api.yaml`
- `docs/specs/workbench/api/workbench-approval-api.yaml`
- `docs/specs/workbench/acceptance-m6-wave3.md`

### 验收标准

- 模块页与管理员页的路由、角色、入口、筛选器、主列表与详情交互全部明确。
- `GET /workbench/modules/:moduleCode/schema` 的职责收敛为“页面元数据与共享字段定义”。
- 管理员台接口不再散落在现有平台 API 中。

## Wave 4：高频模块 Batch A

### 实现范围

- 台账类：岗前培训、会议管理、安全月活动、年度工作计划、签船记录表、船舶动态记录表、培训学时、演练、值守、岸基叫应、船员会议记录、案例警示学习。
- 作业闭环类：作业人员签到台、接收工作组操作流程、围油栏、垃圾/污油水/生活污水接收、中船/平陆五步闭环。
- 统一冻结字段组、列表列、动作、打印模板和归档规则。

### 产出

- `docs/specs/workbench/ui/workbench-department-modules.md`
- `docs/specs/workbench/ui/workbench-batch-a-integration-notes.md`
- `docs/specs/workbench/acceptance-m6-wave4.md`

### 验收标准

- Batch A 模块均具备“字段组 + 页面组 + 关键动作 + 打印/归档 + 权限/审批 + 验收点”规格。
- 同类模块复用统一运行时，但不再要求所有页面都靠动态 schema 拼装。

## Wave 5：高风险模块 Batch B

### 实现范围

- 检查整改类：安全隐患排查、船舶自查排查、船舶检验、密闭空间、污油水接收作业、海事安检。
- 统计 / 审批 / 资产服务类：统计中心、船员考勤、航次计划审批、燃油加注、仓库、办公室、食堂、宿舍、车辆维修保养。
- 管理员台依赖的导出任务、对账任务、诊断事件一并冻结。

### 验收标准

- 高风险模块的审批真源、状态镜像、对账、打印和归档规格无歧义。
- 统计与资产服务模块明确哪些字段为业务确认字段，哪些需要后续补样表。

## Wave 6：遗留模块与跨域收口

### 实现范围

- `财务板块` provisional SDD：页面范围、角色、入口、与统计中心关系、导出包、审批边界、待确认项。
- `海图更新` 正式 SDD：批次、适用船舶、版本/日期、更新资源、附件、确认记录、打印归档。
- `海图更新` 与现有 `chart_update` 证照提醒类型的联动规则。

### 验收标准

- `财务板块` 中所有未被原始资料支撑的字段均显式标记 `provisional`。
- `海图更新` 不再是最小占位规格，而是可直接进入实现和测试。
- 半年提醒推导规则明确且可测试。

## Wave 7：测试、UAT 与正式发布门槛

### 实现范围

- OpenAPI 校验、模块级测试矩阵、路由级测试矩阵。
- 真机回归、UAT、缺陷闭环、发布材料、回滚预案、值班机制。

### 验收标准

- 无 P0。
- 所有 P1 有关闭结论或发布规避方案。
- 企业微信生产参数、审批模板、消息模板、回调验证、真机证据、值班与回滚材料全部齐备。

## 推荐优先级

1. `WS-1B` 模块级矩阵重写
2. `WS-2A` 企业微信 JS-SDK 迁移规格
3. `WS-3A` 工作平台独立路由与页面 IA
4. `WS-3B` 管理员运维台规格
5. `WS-6B` 海图更新正式 SDD
6. `WS-6A` 财务板块 provisional SDD

## 测试与校验计划

### 规格

- `npx swagger-cli validate docs/specs/workbench/api/workbench-approval-api.yaml`
- `npx swagger-cli validate docs/specs/workbench/api/workbench-admin-api.yaml`

### 自动化

- 管理员台集成测试：审批实例检索、重试、对账、导出任务、诊断事件
- 海图更新集成测试：记录创建、附件、确认、提醒联动
- 财务板块 provisional 契约测试
- 前端路由级测试：模块页与管理员页

### 手动与真机

- 企业微信 iOS / Android：OAuth2、JS-SDK、附件、审批、导出、打印、管理员诊断
- 各部门 UAT：字段、流程、打印、统计、权限
- 海图更新半年提醒联动抽检
