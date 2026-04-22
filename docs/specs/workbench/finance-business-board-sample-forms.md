# 财务板块样表（M6 Wave C 自生成补料基线）

## 1. 说明
- 生成日期：2026-04-22
- 适用模块：`finance_business_board`
- 用途：用于冻结 M6 财务板块最小可用录单结构与联调样本数据。

## 2. 表单样式（录入视图）
| 分组 | 字段 | 控件 | 必填 |
|---|---|---|---|
| 基础信息 | 业务单据号 `voucherNo` | 单行文本 | 是 |
| 基础信息 | 业务日期 `businessDate` | 日期选择 | 是 |
| 基础信息 | 往来单位 `counterpartyName` | 单行文本 | 是 |
| 业务信息 | 业务类别 `businessCategory` | 单行文本 | 是 |
| 业务信息 | 本次金额 `amount` | 数字输入 | 是 |
| 业务信息 | 税额 `taxAmount` | 数字输入 | 否 |
| 结算信息 | 结算方式 `settlementMethod` | 单行文本 | 是 |
| 结算信息 | 成本中心 `costCenter` | 单行文本 | 是 |
| 结算信息 | 发票状态 `invoiceStatus` | 单行文本 | 是 |
| 关联信息 | 关联业务模块 `relatedModuleCode` | 单行文本 | 否 |
| 资料留存 | 附件清单 `attachmentList` | 多行文本 | 否 |
| 资料留存 | 备注 `remark` | 多行文本 | 否 |

## 3. 样例记录（联调）
| 字段 | 样例值 |
|---|---|
| `voucherNo` | `FBB-2026-0001` |
| `businessDate` | `2026-04-22` |
| `counterpartyName` | `广西某航运服务公司` |
| `businessCategory` | `劳务结算` |
| `amount` | `12800` |
| `taxAmount` | `768` |
| `settlementMethod` | `bank_transfer` |
| `costCenter` | `finance_center` |
| `invoiceStatus` | `pending` |
| `relatedModuleCode` | `business_ship_sign` |
| `attachmentList` | `合同扫描件、结算单、付款凭证` |
| `remark` | `首批 M6 样例数据` |

