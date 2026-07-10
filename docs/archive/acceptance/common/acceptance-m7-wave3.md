---
status: acceptance-archive
owner: delivery
updated: 2026-07-06
replaces: []
replaced_by: []
---
# M7 Wave 3 验收记录：采购 PDF、返回与附件体验

## 1. 基本信息

- 里程碑：M7 上线体验与导航修复
- Wave：Wave 3 采购 PDF、返回与附件体验
- 验收日期：2026-07-06
- 验收环境：macOS，本地 Node v24.14.0，pnpm v11.7.0，Colima Docker 29.2.1
- 提交或分支：`Fix-ding`
- 执行人：Codex
- 复核人：待人工复核

## 2. 验收结论

- 状态：有条件通过
- 未关闭 P0：无已知代码 P0；真机企业微信未执行
- 未关闭 P1：无已知代码 P1；缺少人工截图证据
- 条件项及期限：进入 Wave 5 前补企业微信 iOS/Android/桌面真机采购直达、预览和下载截图矩阵
- 后续建议：可进入 Wave 4

## 3. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M7-W3A` | 通过 | `procurement.integration.spec.ts` 打印用例 | 根因：采购打印模板仍使用英文文案和 PDFDocEncoding 字体；中文在 PDF 内不可读 |
| `M7-W3B` | 通过 | `apps/api/src/modules/procurement/procurement.service.ts` | 打印模板改为中文字段，A4 PDF 使用 `STSong-Light` 与 `UniGB-UCS2-H`，正文写入 UTF-16BE hex |
| `M7-W3C` | 通过 | 5 个采购页面测试 | 采购新建、详情、订单审批、报表审批、报表详情均提供“返回采购首页” |
| `M7-W3D` | 通过 | `ProcurementOrderDetailPage.test.tsx` | 附件区去掉手填 fileId，改用 `FileUploadField` 上传后立即绑定采购单 |
| `M7-W3E` | 通过 | 新增采购附件下载接口与集成测试 | 附件预览和下载改走采购单权限校验后的签名 URL，非参与用户返回 404 |

## 4. 规格一致性

- [x] 需求、执行计划和 backlog 已核对，未启动 M8/M9。
- [x] API 规格与 Controller/DTO/响应一致；新增采购单附件下载签名接口继承采购单查看权限。
- [x] DB 规格与 migration/entity/index 一致；本 Wave 未新增 migration。
- [x] state 规格与合法动作和非法转换一致；本 Wave 未改状态机。
- [x] UI 规格与路由、页面、权限和移动体验一致。
- [x] 领域 README 和 `docs/inventory.md` 已更新。

## 5. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter api build` | 通过 | 0 | `nest build` |
| `pnpm --filter api test:unit` | 通过 | 0 | 12 suites / 60 tests |
| `DOCKER_HOST=unix:///Users/dingdexin/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock pnpm --filter api test:integration -- --runTestsByPath test/procurement.integration.spec.ts` | 通过 | 0 | 1 suite / 5 tests，含采购附件权限下载与中文 PDF |
| `pnpm --filter web test -- src/features/procurement/ProcurementOrderDetailPage.test.tsx src/features/procurement/ProcurementOrderCreatePage.test.tsx src/features/procurement/ProcurementApprovalPage.test.tsx src/features/procurement/ProcurementReportApprovalPage.test.tsx src/features/procurement/ProcurementReportRequestDetailPage.test.tsx src/app/navigationUiPolicy.test.ts` | 通过 | 0 | 实际执行整套 web 测试：52 files / 211 tests |
| `pnpm --filter web build` | 通过 | 0 | `tsc -b && vite build` |
| 文档索引校验 | 通过 | 0 | `generate-doc-inventory` 生成 224 个 Markdown 条目，`check-doc-index` 通过 |

## 6. 权限与安全

- [x] 采购单附件预览和下载不再直接按文件 id 取签名，必须先验证采购单可见性和订单附件关系。
- [x] 普通用户无法下载非参与采购单附件；集成测试覆盖非参与用户 404。
- [x] 打印和导出仍使用服务端生成文件并登记到文件表，未引入前端拼接下载地址。
- [x] 文件下载 URL 有时效并继承记录权限。
- [x] 重复提交、回调和自动生成具备幂等；本 Wave 未改变审批状态流转。

## 7. 数据与迁移

- [x] migration `up()` 和 `down()` 已评审；本 Wave 未新增 migration。
- [x] migration 在 PostgreSQL 测试环境执行；集成测试启动 PostgreSQL testcontainer。
- [x] 存量数据数量、关联和状态核对完成；采购附件关系通过既有实体查询。
- [x] 迁移重复执行或恢复策略已验证；本 Wave 不涉及。
- [x] 未使用 `synchronize: true`。

## 8. 前端与真机

- [ ] 企业微信工作台或消息深链可直达；Wave 5 统一真机回归。
- [ ] iOS 企业微信验证；未执行。
- [ ] Android 企业微信验证；未执行。
- [ ] 桌面企业微信验证；未执行。
- [x] 采购页面直达后可返回采购首页；路由测试覆盖 `navigate('/procurement')`。
- [x] 附件上传、绑定、预览和下载具备可恢复反馈；上传成功后刷新采购单详情。
- [x] 加载、空态、错误、权限不足和重新认证完整；沿用 RTK Query 和页面错误态。

## 9. 证据索引

### 规格

- `docs/archive/prompts/m7/wave-3-procurement-navigation-pdf.md`
- `docs/requirements/M7-上线体验与导航修复.md`
- `docs/archive/execplans/M7-execplans.md`
- `docs/archive/backlogs/common/M7-wave-backlog.md`
- `docs/requirements/M3-采购管理.md`
- `docs/specs/common/file-upload-spec.md`
- `docs/specs/common/frontend-experience-guidelines.md`
- `docs/specs/procurement/ui/page-map.md`
- `docs/specs/procurement/ui/print-export.md`
- `docs/specs/procurement/db/procurement-order-files.md`

### 代码

- `apps/api/src/modules/procurement/procurement.controller.ts`
- `apps/api/src/modules/procurement/procurement.service.ts`
- `apps/web/src/features/procurement/procurementApi.ts`
- `apps/web/src/features/procurement/ProcurementOrderCreatePage.tsx`
- `apps/web/src/features/procurement/ProcurementOrderDetailPage.tsx`
- `apps/web/src/features/procurement/ProcurementApprovalPage.tsx`
- `apps/web/src/features/procurement/ProcurementReportApprovalPage.tsx`
- `apps/web/src/features/procurement/ProcurementReportRequestDetailPage.tsx`

### 测试

- `apps/api/test/procurement.integration.spec.ts`
- `apps/web/src/features/procurement/ProcurementOrderCreatePage.test.tsx`
- `apps/web/src/features/procurement/ProcurementOrderDetailPage.test.tsx`
- `apps/web/src/features/procurement/ProcurementApprovalPage.test.tsx`
- `apps/web/src/features/procurement/ProcurementReportApprovalPage.test.tsx`
- `apps/web/src/features/procurement/ProcurementReportRequestDetailPage.test.tsx`
- `apps/web/src/app/navigationUiPolicy.test.ts`

### 迁移与运行

- 本 Wave 未新增 migration。
- Colima 环境需传：`DOCKER_HOST=unix:///Users/dingdexin/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`

### 截图或真机记录

- 未执行企业微信真机截图；Wave 5 补齐。
- PDF 自动化证据：A4 `MediaBox [0 0 595 842]`、`STSong-Light` 字体、中文标题和金额字段的 UTF-16BE hex 均已断言。

## 10. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| `M7-W3-FU-01` | P2 | 企业微信真机采购直达、附件预览和下载截图未执行 | QA | Wave 5 | 待补 |

## 11. 复核签字

- 实施负责人：Codex
- 产品负责人：待填写
- QA：待填写
- 运维：待填写
