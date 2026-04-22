# M6 Wave 5 质量门禁与证据

## 执行时间

- 执行日期：2026-04-22
- 执行人：Codex 联合开发流程

## 门禁结果总览

- `WS-5A`：通过
- `WS-5B`：通过
- `WS-5C`：通过

## 验证命令与结果

1. 前端测试
- 命令：`make test-web`
- 结果：通过（`42 files / 162 tests`）

2. 后端构建
- 命令：`pnpm --filter api build`
- 结果：通过

3. 前端构建
- 命令：`pnpm --filter web build`
- 结果：通过

4. OpenAPI 全量校验（15 份）
- 命令：`npx swagger-cli validate <spec-file>`
- 结果：全部通过
- 覆盖文件：
  - `docs/specs/my/api/certificate-api.yaml`
  - `docs/specs/my/api/certificate-reminder-api.yaml`
  - `docs/specs/my/api/enterprise-policy-api.yaml`
  - `docs/specs/my/api/enterprise-profile-api.yaml`
  - `docs/specs/my/api/settings-api.yaml`
  - `docs/specs/my/api/ship-monitor-api.yaml`
  - `docs/specs/office/api/office-admin-api.yaml`
  - `docs/specs/office/api/office-entry-api.yaml`
  - `docs/specs/procurement/api/procurement-approval-api.yaml`
  - `docs/specs/procurement/api/procurement-dictionary-api.yaml`
  - `docs/specs/procurement/api/procurement-order-api.yaml`
  - `docs/specs/procurement/api/procurement-report-api.yaml`
  - `docs/specs/workbench/api/workbench-approval-api.yaml`
  - `docs/specs/workbench/api/workbench-platform-api.yaml`
  - `docs/specs/workbench/api/workbench-statistics-api.yaml`

## Workbench 测试补齐范围（WS-5A）

- 新增：`apps/web/src/features/workbench/WorkbenchHomePage.test.tsx`
- 覆盖点：
  - 路由感知入口跳转：`/workbench`、`/workbench/modules/:moduleCode`、`/workbench/records/:recordId`、`/workbench/statistics/attendance`、`/workbench/approvals`
  - 审批看板模块过滤与记录查询参数校验
  - `statisticsOnly` 统计页渲染与查询参数校验

## 性能门禁结果（WS-5C）

本次构建输出已满足“路由级拆包 + Workbench 懒加载”门禁，证据如下：

- Workbench 独立 chunk：
  - `WorkbenchHomePage-*.js`：约 `17.25 kB`（gzip 约 `4.99 kB`）
  - `WorkbenchModulePage-*.js`、`WorkbenchRecordDetailPage-*.js`、`WorkbenchAttendancePage-*.js`、`WorkbenchApprovalPage-*.js` 均已独立产物
- 主入口 `index-*.js`：约 `106.39 kB`（gzip 约 `26.14 kB`）
- 第三方依赖拆包：
  - `vendor-antd-*.js`：约 `977.73 kB`（gzip 约 `303.39 kB`）
  - `vendor-*.js`：约 `314.99 kB`（gzip 约 `106.73 kB`）

## 前置条件与风险说明（WS-5B）

- 后端 integration（testcontainers）前置条件保持不变：必须有 Docker/等效 container runtime。
- 本地当前 Node 版本为 `v25.x`，与仓库 `node 20.x` engine 声明不一致；本次门禁执行虽通过，但上线前环境仍应以 Node 20 LTS 为准。
