---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M6 Wave 6 全量测试与冒烟测试报告

## 执行信息

- 执行日期：2026-04-22
- 执行范围：M6 Wave 6 上线前质量门禁

## 全量测试结果

1. API 全量测试
- 命令：`make test-api`
- 结果：通过
- 摘要：
  - Unit：`9/9 suites passed`，`50/50 tests passed`
  - Integration：`13/13 suites passed`，`38/38 tests passed`

2. Web 全量测试
- 命令：`make test-web`
- 结果：通过
- 摘要：`42/42 files passed`，`162/162 tests passed`

3. 构建验证
- 命令：`pnpm --filter api build`
- 结果：通过
- 命令：`pnpm --filter web build`
- 结果：通过

## 冒烟测试结果

### 服务端关键链路冒烟（集成子集）

- 命令：
`pnpm --filter api test:integration -- --runTestsByPath test/auth.integration.spec.ts test/office.integration.spec.ts test/procurement.integration.spec.ts test/procurement-report.integration.spec.ts test/procurement-wave4.integration.spec.ts test/workbench.integration.spec.ts test/files.integration.spec.ts`

- 结果：通过
- 摘要：`7/7 suites passed`，`25/25 tests passed`

### 冒烟覆盖链路映射

- 登录/OAuth：`auth.integration.spec.ts`
- 办事：`office.integration.spec.ts`
- 采购主链：`procurement.integration.spec.ts`
- 采购报表：`procurement-report.integration.spec.ts`
- 采购打印/消息/维度治理：`procurement-wave4.integration.spec.ts`
- 工作平台：`workbench.integration.spec.ts`
- 文件上传：`files.integration.spec.ts`

## 结论

- Wave 6 要求的“全量测试 + 冒烟测试”自动化部分已全绿。
- 当前仍有 Node engine 提示（仓库声明 `node 20.x`，执行环境为 `v25.x`）；不影响本次测试结果，但生产执行应统一为 Node 20 LTS。
