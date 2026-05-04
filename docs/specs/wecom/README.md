---
status: current-index
owner: wecom
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 企业微信规格索引

> 状态：当前企业微信集成入口。OAuth2、JS-SDK、token、回调、审批桥、消息、真机回归和上线切换从这里进入。

## 当前集成规格

| 文件 | 状态 | 用途 |
|---|---|---|
| `oauth2-spec.md` | 当前规格 | 企业微信 OAuth2 登录、回调和用户映射 |
| `jssdk-spec.md` | 当前规格 | JS-SDK 签名、agentConfig 和前端初始化 |
| `token-cache-spec.md` | 当前规格 | access token 缓存、刷新和并发控制 |
| `message-push-spec.md` | 当前规格 | 企业微信消息推送契约 |
| `approval-native-bridge-spec.md` | 当前规格 | 企业微信原生审批桥接预留与契约 |
| `approval-ops-spec.md` | 当前规格 | 审批异常、重试、对账和运维闭环 |
| `callback-security-spec.md` | 当前真源 | 回调签名、时间窗、nonce、幂等、IP 和加密处理 |

## 生产上线与回归

| 文件 | 状态 | 用途 |
|---|---|---|
| `production-config-matrix.md` | 运维上线 | 企业微信后台配置和系统环境变量矩阵 |
| `template-binding-checklist.md` | 运维上线 | 审批模板绑定核对 |
| `production-cutover-runbook.md` | 运维上线 | 正式上线切换、回滚和恢复 runbook |
| `go-live-materials-checklist.md` | 运维上线 | 上线材料和证据清单 |
| `real-device-regression-matrix.md` | 当前真源 | M6 及后续四大板块真机回归矩阵 |
| `workbench-go-live-checklist.md` | 运维上线 | 工作平台上线检查清单 |
| `procurement-go-live-checklist.md` | 运维上线 | 采购模块上线检查清单 |

## 归档入口

| 归档 | 状态 | 说明 |
|---|---|---|
| `docs/archive/acceptance/wecom/` | 验收归档 | M6 Wave 3 验收与 2026-04-22 preflight |
| `docs/archive/superseded/wecom/workbench-real-device-regression.md` | 已取代 | M5 工作平台真机回归模板；改用 `real-device-regression-matrix.md` |

## 使用规则

- 涉及企业微信登录、JS-SDK、消息、审批、回调或生产域名时，先查本索引。
- M6 及后续真机回归使用 `real-device-regression-matrix.md`，不要复用 M5 单工作平台模板。
- 上线配置以 `production-config-matrix.md` 和 `production-cutover-runbook.md` 为准。
