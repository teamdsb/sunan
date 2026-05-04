# 采购模块企业微信上线检查清单（Wave5）

## 文档目标

用于 M3 采购模块在企业微信环境的上线前核对与实机回归记录，覆盖 OAuth2、JS-SDK、回调安全、消息可达与观测能力。

## 一次性配置核对

- [ ] 企业微信自建应用工作台首页为生产 HTTPS 域名（包含 `/procurement` 入口）。
- [ ] 可信域名与实际前端访问域名一致。
- [ ] OAuth2 回调域名与 `WECOM_REDIRECT_URI` 一致。
- [ ] JS 接口安全域名包含前端实际域名。
- [ ] 消息接收配置（如启用）中的 `Token` 和 `EncodingAESKey` 已校验通过。
- [ ] 回调来源 IP 策略已配置（白名单或网关层校验）。

## 环境变量核对

### API

- [ ] `WECOM_CORP_ID`
- [ ] `WECOM_AGENT_ID`
- [ ] `WECOM_AGENT_SECRET`
- [ ] `WECOM_REDIRECT_URI`
- [ ] `WECOM_CALLBACK_TOKEN`（启用消息回调时）
- [ ] `WECOM_ENCODING_AES_KEY`（启用消息回调时）

### Web

- [ ] `VITE_WECOM_CORP_ID`
- [ ] `VITE_WECOM_AGENT_ID`
- [ ] `VITE_WECOM_REDIRECT_URI`
- [ ] `VITE_API_BASE_URL` 指向生产 API 域名

## 实机回归（企业微信容器）

| 场景 | iOS 企业微信 | Android 企业微信 | 结果 |
|---|---|---|---|
| OAuth2 登录并进入采购首页 | [ ] | [ ] | [ ] 通过 |
| 采购单草稿创建与提交 | [ ] | [ ] | [ ] 通过 |
| 采购审批页通过/退回/驳回 | [ ] | [ ] | [ ] 通过 |
| 报表页生成月报/年报审批单 | [ ] | [ ] | [ ] 通过 |
| 报表审批页通过/退回/驳回 | [ ] | [ ] | [ ] 通过 |
| 采购单 A4 PDF 导出 | [ ] | [ ] | [ ] 通过 |
| 报表审批单 A4 PDF 导出 | [ ] | [ ] | [ ] 通过 |
| 关键审批节点应用消息提醒 | [ ] | [ ] | [ ] 通过 |

## 发布前冒烟（服务端/前端）

- [ ] API 集成测试通过（testcontainers）。
- [ ] Web 测试通过（含 procurement 页面回归）。
- [ ] 核心链路冒烟通过：录单 -> 提交 -> 审批 -> 报表 -> 导出 -> 消息。

## 发布后观测与抽检

- [ ] 采集并确认 `procurement` 相关错误日志无异常峰值。
- [ ] 抽检 3 条采购单审批流，状态机与审批轨迹一致。
- [ ] 抽检 2 条报表审批流，快照与导出口径一致。
- [ ] 抽检 3 条企业微信提醒消息，模板字段与目标用户正确。

## 回滚条件

满足任一条件执行回滚：

- OAuth2 登录失败率显著升高且 30 分钟内无法恢复。
- 审批状态流转出现卡单或跨级跳转。
- PDF 导出不可用且影响核心审批流程。
- 消息重复推送或漏推严重影响业务处理。

## 关联文档

- `docs/specs/wecom/oauth2-spec.md`
- `docs/specs/wecom/jssdk-spec.md`
- `docs/specs/wecom/message-push-spec.md`
- `docs/specs/wecom/approval-native-bridge-spec.md`
- `docs/specs/procurement/acceptance-wave5.md`

## 历史别名说明

- `WECOM_TOKEN` 仅作为 legacy alias 保留，不再作为主配置名。
