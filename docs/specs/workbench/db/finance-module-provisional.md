# 财务板块 provisional SDD（M6）

## 1. 文档定位

本文件定义 `财务板块` 的 provisional SDD。由于原始资料仅确认“财务部已设置财务板块模块目录”，尚不足以冻结完整字段级 API，因此本文件只冻结：

- 模块定位
- 页面范围
- 角色与入口
- 与统计中心关系
- 导出包边界
- 审批边界
- 待确认项

凡未被原始资料或业务确认稿支撑的内容，均标记为 `provisional`。

## 2. 已确认输入

来源：

- `docs/需求文档.md` 4.4.2
- 当前系统已存在 `finance_attendance` 统计中心

已确认事实：

- 财务部存在独立“财务板块”模块目录。
- 财务板块不应被统计中心完全替代。
- 财务板块与统计中心存在协同关系，但边界尚未最终确认。

## 3. 模块定位

- 模块名称：财务板块
- 目标 `moduleCode`：`finance_board`
- SDD 状态：`provisional`
- 所属域：工作平台
- 页面目标：财务事项承载页、导出包中心、与统计中心的关联查看

## 4. 角色与入口

默认入口角色：

- `finance`
- `general_office`
- `system_admin`

默认入口方式：

- `/workbench` 首页模块入口
- `/workbench/modules/finance_board`

## 5. 与统计中心的关系

已冻结关系：

- `finance_attendance` 负责考勤、作业票、劳务费统计及对账。
- `finance_board` 不重复承担统计中心已确认的基础统计口径。
- `finance_board` 更偏向“财务业务承载 + 导出包 + 资料归档”的模块容器。

未冻结关系：

- 是否包含最终审批动作
- 是否承载额外的结算或凭证录入
- 是否直接维护劳务费或费用明细

## 6. 数据与存储边界

### 6.1 已冻结

- 不新增独立业务数据库表作为前置条件。
- 初期继续复用工作平台统一 `record / attachment / print / action log` 运行时。
- 页面详情所需的业务字段先放在 `payload` 中，并按 `confirmed` / `provisional` 分类。

### 6.2 provisional 字段分层

#### confirmed

- `periodMonth`
- `businessCategory`
- `summary`
- `attachmentIds`
- `exportPackageStatus`

#### provisional

- `settlementType`
- `amountSubtotal`
- `taxAmount`
- `counterpartyName`
- `voucherRefs`
- `approvalRequired`

说明：

- `confirmed` 只表示“可作为暂行规格占位进入实现”，不表示业务方已完成最终口径确认。
- `provisional` 字段在实现时必须有醒目标识，不得伪装成最终口径。

## 7. 导出包边界

已冻结：

- 财务板块必须提供“导出包”视图。
- 导出包至少聚合：
  - 附件
  - 关联统计中心结果
  - 打印快照

未冻结：

- 导出包最终模板格式
- 导出包字段顺序
- 是否直接输出给外部财务系统

## 8. 审批边界

当前状态：

- 未确认财务板块是否必须接入企业微信审批
- M6 文档阶段不冻结审批模板编码

决策：

- 文档与实现中必须把审批能力视为 `provisional`
- 若进入实现前仍无确认，不得默认发起企业微信审批

## 9. 待确认项

- 财务板块的原始纸质样表
- 财务板块与统计中心的最终职责边界
- 是否存在独立审批流
- 导出包最终交付对象与模板格式
- 是否包含凭证、结算或额外金额字段

## 10. 验收口径

财务板块在 M6 阶段的验收不是“字段完全确认”，而是：

- 形成独立 SDD，不再散落在原始需求文本中
- 明确入口、角色、页面范围、与统计中心关系、导出包边界和待确认项
- 所有未确认字段显式标记 `provisional`
