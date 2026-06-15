---
status: current-spec
owner: procurement
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 采购预算管理页规格

## 路由与权限

- 路由：`/procurement/budgets`
- 可维护角色：`system_admin`、`general_office`
- 其他角色不可进入管理页，但可读取采购首页预算汇总。

## 页面能力

- 默认当前年度，可切换历史年度。
- 按部门和启用状态筛选。
- 按“年度 + 部门 + 分类”新增预算。
- 调整金额或停启用时必须填写备注。
- 查看预算、执行金额、执行率、超出金额和审计历史。
- 不提供删除。

## 响应式

- 查询区使用 `.sunan-query-grid`。
- 新增和编辑表单使用 `.sunan-form-grid`。
- `<= 430px` 单列，主操作全宽。
- 表格仅自身横向滚动，不产生页面级横向滚动。
