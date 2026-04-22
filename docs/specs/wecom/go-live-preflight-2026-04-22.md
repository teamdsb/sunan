# 企业微信上线前最终核对（M6）

## 执行信息

- 执行日期：`2026-04-22`
- 执行人：`Codex`
- 结论：`条件通过（可进入上线切换窗口）`
- Go/No-Go：`GO（附带前置人工核对项）`

## 总体结论

- 代码与测试门禁已通过：API/Web 测试全绿，API/Web 构建通过，关键 OpenAPI 校验通过。
- 企业微信生产上线仍需完成后台与环境实配核对，这部分属于人工/运维步骤，不可由仓库内自动化完全替代。
- 在完成“阻断项清单”中的人工核对后，可按 Runbook 执行正式切换。

## 核对结果

状态说明：
- `PASS`：已通过并有仓库内证据
- `PENDING`：需企业微信后台或生产环境人工核对
- `BLOCKER`：不满足则不得切换

| 类别 | 条目 | 状态 | 证据/说明 |
|---|---|---|---|
| 测试门禁 | `make test-api` | `PASS` | unit `9/9`、tests `50/50`；integration `13/13`、tests `41/41` |
| 测试门禁 | `make test-web` | `PASS` | files `42/42`、tests `163/163` |
| 构建门禁 | `pnpm --filter api build` | `PASS` | 构建完成 |
| 构建门禁 | `pnpm --filter web build` | `PASS` | 构建完成，已拆分 workbench 路由 chunk |
| 接口门禁 | `swagger-cli validate`（workbench） | `PASS` | `docs/specs/workbench/api/workbench-platform-api.yaml` 校验通过 |
| 企业微信配置 | 标准变量命名与文档一致 | `PASS` | [env.ts](/Users/yuan/项目/sunan/sunan/apps/api/src/config/env.ts), [production-config-matrix.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/production-config-matrix.md) |
| 企业微信回调安全 | 验签/时间窗/IP 校验/加密解密逻辑存在 | `PASS` | [workbench.service.ts](/Users/yuan/项目/sunan/sunan/apps/api/src/modules/workbench/workbench.service.ts), [callback-security-spec.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/callback-security-spec.md) |
| 工作平台上线能力 | 模块化路由入口存在 | `PASS` | [workbenchRouteConfig.ts](/Users/yuan/项目/sunan/sunan/apps/web/src/router/workbenchRouteConfig.ts) |
| 企业微信后台实配 | 首页/可信域名/JS 安全域名/OAuth 回调 | `PENDING` | 需企业微信管理员在后台逐项核对并截图留档 |
| 企业微信后台实配 | 回调 URL/Token/EncodingAESKey | `PENDING` | 需生产环境与后台一致性核对 |
| 企业微信后台实配 | 应用可见范围与管理员名单 | `PENDING` | 需按组织架构与角色矩阵核对 |
| 真机回归 | iOS/Android 四大板块核心链路复测 | `PENDING` | 需执行并留存截图/录屏 |
| 发布切换 | 生产备份恢复演练记录 | `BLOCKER` | 缺失则不得切换（Runbook 明确门禁） |
| 发布切换 | 预发布全量迁移 + smoke + 回滚 rehearsal | `BLOCKER` | 缺失则不得切换（Runbook 明确门禁） |

## 阻断项清单（上线前必须完成）

1. 完成企业微信后台配置实配核对并留档截图：
   - 工作台首页地址、可信域名、JS 接口安全域名、OAuth2 回调域名。
   - 事件接收服务器 URL、Token、EncodingAESKey（如启用）。
2. 完成生产备份恢复演练记录并归档。
3. 完成预发布全量迁移、生产 smoke rehearsal、回滚 rehearsal，并记录结果。
4. 完成 iOS + Android 真机回归证据留档（四大板块核心链路）。

## 建议上线判定

- 当前判定：`可进入切换窗口准备（Pre-GO）`。
- 最终判定条件：上述阻断项全部关闭后，将状态更新为 `GO`，再执行 [production-cutover-runbook.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/production-cutover-runbook.md)。

## 关联文档

- [workbench-go-live-checklist.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/workbench-go-live-checklist.md)
- [production-config-matrix.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/production-config-matrix.md)
- [production-cutover-runbook.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/production-cutover-runbook.md)
- [go-live-materials-checklist.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/go-live-materials-checklist.md)
