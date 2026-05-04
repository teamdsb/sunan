---
status: current-spec
owner: procurement
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 报表页规格

## 页面目标

提供采购统计视图和报表审批单创建入口。

## 视图

- 月度采购数据表
- 年度采购数据表（含月趋势）
- 部门采购明细
- 部门细分明细（船舶/后勤）

## 统计口径

纳入状态：`submitted`、`dept_approved`、`final_approved`、`rejected`。

排除状态：`draft`、软删除。

## 操作

- 生成报表审批单（草稿）
- 提交报表审批单
- 导出 A4 PDF
