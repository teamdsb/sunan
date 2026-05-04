# 工作平台 M4 Wave 6 验收归档

## 1. 验收结论

Wave 6（考勤统计类模块）已完成。

完成日期：`2026-04-21`

## 2. 验收范围

- 财务部：统计中心（手机打卡、范围口径、时段口径、出差/外派口径）
- 船务部：船员考勤
- 业务部与工作组：作业闭环签到数据纳入统计汇总

## 3. 验收清单

| 验收项 | 结论 | 证据 |
|---|---|---|
| Wave 6 考勤模块 schema 可用 | 通过 | `apps/api/src/modules/workbench/workbench.service.ts` |
| 考勤统计模板录单可用 | 通过 | `POST /api/v1/workbench/records` |
| 月度考勤统计接口可用 | 通过 | `GET /api/v1/workbench/statistics/attendance` |
| 统计口径覆盖时段/范围/出差外派 | 通过 | `getAttendanceStatistics` 聚合逻辑 |
| 前端统计看板可按月查看 | 通过 | `apps/web/src/features/workbench/WorkbenchHomePage.tsx` |
| 执行计划 Wave 6 状态已同步 | 通过 | `docs/execplans.md` |

## 4. 实现说明

- 后端新增 `attendance_statistics` 模板 schema：
  - `finance_attendance`（财务统计中心）
  - `shipping_attendance`（船员考勤）
- 后端新增统计接口：
  - `GET /api/v1/workbench/statistics/attendance?month=YYYY-MM`
  - 支持统一口径输出：上午/下午、范围内/范围外、出差/外派、模块分布。
- 前端工作平台页面新增统计看板：
  - 在考勤统计模块下展示核心统计指标与模块分布表。
  - 支持输入 `YYYY-MM` 进行月度查询。

## 5. 边界说明

- Wave 6 统计能力以工作平台当前记录为数据源，导出文件模板与财务对账自动化在后续 wave 继续深化。
- 企业微信审批真源流程沿用 Wave 2，不在本波次新增审批模块。
