---
status: conditional-baseline
owner: workbench
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 财务板块字段字典（M6 Wave C 自生成补料基线）

## 1. 说明
- 生成日期：2026-04-22
- 生成方式：按 M6 Wave C 执行要求，由项目组在缺少外部原始样表时生成可落地基线。
- 适用模块：`finance_business_board`
- 适用模板：`ledger_form`
- 约束：本字典用于 M6 上线闭环；后续若拿到财务部正式样表，以变更单替换。

## 2. 字段定义
| 字段 key | 中文名称 | 类型 | 必填 | 示例 | 说明 |
|---|---|---|---|---|---|
| `voucherNo` | 业务单据号 | text | 是 | `FBB-2026-0001` | 财务业务唯一单据编号。 |
| `businessDate` | 业务日期 | date | 是 | `2026-04-22` | 业务发生日期。 |
| `counterpartyName` | 往来单位 | text | 是 | `广西某航运服务公司` | 收付款对手方。 |
| `businessCategory` | 业务类别 | text | 是 | `劳务结算` | 收入、成本、劳务、采购结算等。 |
| `amount` | 本次金额 | number | 是 | `12800` | 含税或未税金额按内部口径填写。 |
| `taxAmount` | 税额 | number | 否 | `768` | 可为空；无税业务可不填。 |
| `settlementMethod` | 结算方式 | text | 是 | `bank_transfer` | 建议枚举：`bank_transfer/cash/internal_offset/other`。 |
| `costCenter` | 成本中心 | text | 是 | `finance_center` | 财务核算口径维度。 |
| `invoiceStatus` | 发票状态 | text | 是 | `pending` | 建议枚举：`pending/issued/received/not_required`。 |
| `relatedModuleCode` | 关联业务模块 | text | 否 | `business_ship_sign` | 关联工作平台来源模块编码。 |
| `attachmentList` | 附件清单 | textarea | 否 | `合同扫描件、结算单、发票影像` | 文本型附件说明，文件实体走统一上传系统。 |
| `remark` | 备注 | textarea | 否 | `需在月底前完成复核` | 其他补充说明。 |

## 3. 校验规则
- 金额字段：`amount >= 0`，`taxAmount >= 0`。
- 日期字段：`businessDate` 不得晚于当前系统日期 + 1 天。
- 文本长度：`voucherNo` 建议 <= 64 字符，`remark` 建议 <= 1000 字符。
- 审计要求：创建与更新操作必须记录操作人、时间、来源 IP。

