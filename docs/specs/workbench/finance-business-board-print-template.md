---
status: conditional-baseline
owner: workbench
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 财务板块打印模板（M6 Wave C 自生成补料基线）

## 1. 说明
- 生成日期：2026-04-22
- 适用模块：`finance_business_board`
- 输出格式：`pdf`
- 纸张规格：`A4`

## 2. 版式结构
1. 页眉：公司名称、模块名称、打印时间、打印人。
2. 基本信息区：`voucherNo`、`businessDate`、`counterpartyName`、`businessCategory`。
3. 金额信息区：`amount`、`taxAmount`、`settlementMethod`、`costCenter`。
4. 状态与关联区：`invoiceStatus`、`relatedModuleCode`。
5. 附件与备注区：`attachmentList`、`remark`。
6. 页脚：记录编号、审批状态、二维码（可选）。

## 3. 字段映射
| 打印标签 | 字段 key |
|---|---|
| 业务单据号 | `voucherNo` |
| 业务日期 | `businessDate` |
| 往来单位 | `counterpartyName` |
| 业务类别 | `businessCategory` |
| 本次金额 | `amount` |
| 税额 | `taxAmount` |
| 结算方式 | `settlementMethod` |
| 成本中心 | `costCenter` |
| 发票状态 | `invoiceStatus` |
| 关联业务模块 | `relatedModuleCode` |
| 附件清单 | `attachmentList` |
| 备注 | `remark` |

## 4. 打印验收点
- 字段缺省值必须显示为 `-`，禁止空白错位。
- 金额字段统一两位小数。
- 打印快照应写入 `workbench_print_snapshots`，可追溯 `paperSize=A4`。

