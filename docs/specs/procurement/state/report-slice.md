---
status: current-spec
owner: procurement
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 报表模块状态规格

## 范围

用于月报/年报/明细查询、报表审批单与导出状态管理。

## 状态内容

- 查询筛选：`year`、`month`、`departmentCode`、`dimensionType`、`dimensionKey`、`dateRange`
- 聚合结果：`monthlySummary`、`yearlySummary`、`departmentDetails`、`dimensionDetails`
- 报表审批单：`reportRequestList`、`reportRequestDetail`
- 报表审批动作：`reportApprovalLoading`、`reportApprovalError`
- 导出态：`exporting`、`exportFileId`、`exportError`

## 关键动作

- `fetchMonthlyReport`
- `fetchYearlyReport`
- `fetchDepartmentDetails`
- `fetchDimensionDetails`
- `createReportRequest`
- `submitReportRequest`
- `approveReportRequest` / `rejectReportRequest` / `returnReportRequest`
- `exportReportPdf`
