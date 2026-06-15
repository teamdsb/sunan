---
status: current-spec
owner: procurement
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 采购预算状态规格

## 状态内容

- 当前年度预算汇总：`budgetSummary`
- 管理列表：`budgetItems`
- 筛选：`year`、`departmentCode`、`isEnabled`
- 编辑态：`editingBudget`、`saving`
- 审计：`auditsByBudgetId`
- 错误态：`loadError`、`saveError`

## 关键动作

- `fetchBudgetSummary`
- `fetchBudgets`
- `createBudget`
- `updateBudget`
- `fetchBudgetAudits`

## 展示约束

- 首页只在预算总额和已执行金额均大于 `0` 时显示预算卡片。
- 超预算显示真实执行率和风险色。
- 组件不得使用静态预算兜底数据。
