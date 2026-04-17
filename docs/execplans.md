# M3 执行计划：采购管理模块（预留企业微信原生审批）

## Wave 状态

### Wave 1
- [x] WS-1A M3 需求与 SDD 规格收口
- [x] WS-1B 原生审批预留字段与契约定义

### Wave 2
- [x] WS-2A 采购单主实体与迁移
- [x] WS-2B 采购录单/列表/详情接口
- [x] WS-2C 采购审批链路（员工 -> 部门主管 -> 总经办）
- [x] WS-2D 附件绑定与审计补齐

### Wave 3
- [x] WS-3A 月报/年报/明细报表查询
- [x] WS-3B 独立报表审批单与审批流（部门主管 -> 财务部 -> 总经办）
- [x] WS-3C 报表审批审计与口径冻结

### Wave 4
- [x] WS-4A 船舶/后勤细分字典治理
- [x] WS-4B 采购单与报表 A4 PDF 导出
- [x] WS-4C 企业微信审批消息提醒

### Wave 5
- [ ] WS-5A 联调与测试补齐（含 testcontainers）
- [ ] WS-5B 企业微信上线清单与实机回归
- [ ] WS-5C M3 验收归档（含未来原生审批接入检查项）

## Wave 1：规格收口

### 目标
- 补齐 `docs/specs/procurement/` 下 API/DB/State/UI 全套规格。
- 明确本期审批后端为 `internal`，并在契约层预留 `wecom_native`。
- 固化统计口径、审批角色链、导出模板边界。

### 产出
- `docs/specs/procurement/api/*`
- `docs/specs/procurement/db/*`
- `docs/specs/procurement/state/*`
- `docs/specs/procurement/ui/*`
- `docs/specs/wecom/approval-native-bridge-spec.md`

### 验收标准
- 采购单、报表审批单均包含 `approval_channel` 与外部流程预留字段。
- 审批动作规格明确 `source=internal|external`（本期仅 internal）。
- 明确未来扩展接口返回 `501 Not Implemented` 契约（仅文档，不上线路由）。

## Wave 2：采购单主链

### 实现范围
- 建立采购单主表、审批表、附件关联表。
- 完成采购单草稿、提交、退回重提、驳回、通过链路。
- 实现 `/procurement` 列表、录单、详情、审批页基础能力。
- 覆盖关键审计日志字段并预留外部事件扩展位。

### 验收标准
- 5 部门可建立采购申请并按规则流转。
- 状态稳定覆盖 `draft/submitted/dept_approved/final_approved/rejected`。
- `approval_channel=internal` 时全链路可用，外部字段为空不影响业务。

## Wave 3：报表与报表审批

### 实现范围
- 实现月报、年报、部门明细、部门细分明细查询。
- 上线独立报表审批单及审批流程（部门主管 -> 财务部 -> 总经办）。
- 报表审批快照与导出口径一致。

### 验收标准
- 报表统计口径纳入 `submitted/dept_approved/final_approved/rejected`。
- 报表审批单支持提交、退回、驳回、通过。
- 报表查询默认支持近 3 年。

## Wave 4：字典、导出、消息

### 实现范围
- 字典治理：船舶部/后勤部细分项配置与停用。
- A4 PDF：采购单模板、报表模板后端生成并 OSS 留存。
- 企微提醒：采购与报表审批关键节点应用消息推送。

### 验收标准
- 字典仅总经办/系统管理员可维护。
- 导出文件可追溯、版式适配 A4。
- 消息触发节点与审批状态一致，频率控制符合企微约束。

## Wave 5：联调与上线

### 实现范围
- 后端集成测试、前端关键页面测试、导出与消息联调。
- iOS/Android 企业微信实机回归。
- 上线检查单补齐：域名、OAuth2、JS-SDK、回调 IP 策略、日志可观测。

### 验收标准
- M3 关键链路（录单、审批、报表、导出、消息）全部通过。
- 未来接入企业微信原生审批时无需重做业务状态机，仅补映射层。
