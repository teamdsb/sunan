---
status: acceptance-archive
owner: delivery
updated: 2026-07-05
replaces: []
replaced_by: []
---
# M7 Wave 1 验收记录：文件上传与我的板块视觉收口

## 1. 基本信息

- 里程碑：M7 上线体验与导航修复
- Wave：Wave 1 文件上传与我的板块视觉收口
- 验收日期：2026-07-05
- 验收环境：macOS，本地 Node v24.14.0，pnpm v11.7.0，Colima Docker 29.2.1
- 提交或分支：`Fix-ding`
- 执行人：Codex
- 复核人：待人工复核

## 2. 验收结论

- 状态：有条件通过
- 未关闭 P0：无已知代码 P0；真机企业微信未执行
- 未关闭 P1：无已知代码 P1；缺少人工截图证据
- 条件项及期限：进入 Wave 5 前补企业微信 iOS/Android/桌面真机或浏览器截图矩阵

## 3. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M7-W1A` | 通过 | `pnpm --filter api test:integration -- --runTestsByPath test/files.integration.spec.ts` | 根因：采购/工作台附件分类未进入 presign 白名单；AliOSS PUT 元数据头未纳入签名选项，易触发直传拒绝 |
| `M7-W1B` | 通过 | `apps/api/src/modules/files/*`，`test/files.integration.spec.ts` | 保持 OSS 预签名直传；新增采购/工作台附件前缀与 callback/download-url 回归 |
| `M7-W1C` | 通过 | `apps/web/src/features/files/*`，`pnpm --filter web test` | 上传失败显示中文业务错误，并保留 native 文件重试按钮 |
| `M7-W1D` | 通过 | `apps/web/src/app/app.css`，`dashboardLayoutCss.test.ts` | `/my` hero、指标、侧栏、入口卡片和移动端高度已压缩 |
| `M7-W1E` | 通过 | API/Web/build 命令见下方 | 采购附件、工作台附件绑定使用现有集成测试回归 |

## 4. 规格一致性

- [x] 需求、执行计划和 backlog 已核对，未启动 M8/M9。
- [x] API 规格与 Controller/DTO/响应一致。
- [x] DB 规格与 migration/entity/index 一致；本 Wave 未新增 migration。
- [x] state 规格与合法动作和非法转换一致；本 Wave 未改状态机。
- [x] UI 规格与路由、页面、权限和移动体验一致。
- [x] 领域 README 和 `docs/inventory.md` 已更新。

## 5. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm install` | 通过 | 0 | pnpm 11 需要 `allowBuilds`，已显式允许 Nest/esbuild/protobufjs |
| `pnpm --filter api test:unit` | 通过 | 0 | 12 suites / 60 tests |
| `DOCKER_HOST=unix:///Users/dingdexin/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock pnpm --filter api test:integration -- --runTestsByPath test/files.integration.spec.ts` | 通过 | 0 | 1 suite / 6 tests |
| `DOCKER_HOST=unix:///Users/dingdexin/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock pnpm --filter api test:integration -- --runTestsByPath test/procurement.integration.spec.ts` | 通过 | 0 | 1 suite / 4 tests，含采购附件绑定 |
| `DOCKER_HOST=unix:///Users/dingdexin/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock pnpm --filter api test:integration -- --runTestsByPath test/workbench.integration.spec.ts` | 通过 | 0 | 1 suite / 4 tests，含工作台附件绑定 |
| `pnpm --filter web test` | 通过 | 0 | 50 files / 199 tests |
| `pnpm --filter api build` | 通过 | 0 | `nest build` |
| `pnpm --filter web build` | 通过 | 0 | `tsc -b && vite build` |
| OpenAPI validate | 不适用 | 0 | 本 Wave 未改 OpenAPI YAML |
| 文档索引校验 | 通过 | 0 | `node scripts/generate-doc-inventory.mjs`、`node scripts/check-doc-index.mjs` |

## 6. 权限与安全

- [x] 列表、详情、动作、附件、打印和导出使用一致权限；本 Wave 未放宽权限。
- [x] 普通用户无法访问其他船舶或非参与任务；沿用既有守卫和绑定接口测试。
- [x] 管理员敏感操作有审计；本 Wave 未改审计。
- [x] 文件下载 URL 有时效并继承记录权限；`download-url` 仍由后端生成 OSS 预签名 URL。
- [x] 重复 callback 具备幂等；同 ossKey callback 返回已有文件记录。

## 7. 数据与迁移

- [x] migration `up()` 和 `down()` 已评审；本 Wave 未新增 migration。
- [x] migration 在 PostgreSQL 测试环境执行；集成测试启动 PostgreSQL testcontainer。
- [x] 存量数据数量、关联和状态核对完成；采购/工作台附件绑定测试通过。
- [x] 迁移重复执行或恢复策略已验证；本 Wave 不涉及。
- [x] 未使用 `synchronize: true`。

## 8. 前端与真机

- [ ] 企业微信工作台或消息深链可直达；Wave 5 统一真机回归。
- [ ] iOS 企业微信验证；未执行。
- [ ] Android 企业微信验证；未执行。
- [ ] 桌面企业微信验证；未执行。
- [x] 320px 及常见移动宽度无页面横向滚动；通过 CSS 策略测试和 web build 约束，待截图补证。
- [x] 加载、空态、错误、权限不足和重新认证完整；上传错误态和重试路径已测试。
- [x] 弱网和重复点击有正确反馈；上传失败不伪造成功，用户可重试。

## 9. 证据索引

### 规格

- `docs/requirements/M7-上线体验与导航修复.md`
- `docs/plans/M7-execplans.md`
- `docs/plans/M7-wave-backlog.md`
- `docs/specs/common/file-upload-spec.md`
- `docs/specs/common/frontend-experience-guidelines.md`

### 代码

- `apps/api/src/modules/files/files.constants.ts`
- `apps/api/src/modules/files/files.service.ts`
- `apps/api/src/modules/files/oss.service.ts`
- `apps/api/src/types/ali-oss.d.ts`
- `apps/web/src/features/files/FileUploadField.tsx`
- `apps/web/src/features/files/useFileUpload.ts`
- `apps/web/src/features/files/types.ts`
- `apps/web/src/app/app.css`
- `pnpm-workspace.yaml`

### 测试

- `apps/api/src/modules/files/files.service.spec.ts`
- `apps/api/test/files.integration.spec.ts`
- `apps/web/src/features/files/FileUploadField.test.tsx`
- `apps/web/src/features/files/useFileUpload.test.tsx`
- `apps/web/src/features/files/useFileUpload.mock.test.tsx`
- `apps/web/src/app/dashboardLayoutCss.test.ts`

### 迁移与运行

- 本 Wave 未新增 migration。
- Colima 环境需传：`DOCKER_HOST=unix:///Users/dingdexin/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`

### 截图或真机记录

- 未执行真机截图；Wave 5 补齐。

## 10. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| `M7-W1-FU-01` | P2 | 企业微信真机截图未执行 | QA | Wave 5 | 待补 |

## 11. 复核签字

- 实施负责人：Codex
- 产品负责人：待填写
- QA：待填写
- 运维：待填写
