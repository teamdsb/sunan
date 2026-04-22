# M6 Wave 3 验收清单

## 验收结论

- 状态：`通过`
- 验收日期：`2026-04-22`
- 对应任务：`WS-3A`、`WS-3B`、`WS-3C`

- 企业微信环境变量标准名已统一为 `WECOM_CALLBACK_TOKEN`、`WECOM_ENCODING_AES_KEY`、`WECOM_CALLBACK_ALLOWED_IP_RANGES`、`WEB_PUBLIC_URL`、`API_PUBLIC_URL`。
- `WECOM_TOKEN` 仅作为 legacy alias 保留，不再作为主文档命名。
- 回调安全文档已覆盖签名、时间窗、nonce、幂等、来源 IP、异常留痕、人工重试与批量对账。
- 企业微信后台交付清单已包含可信域名、JS 接口安全域名、OAuth 回调域名、可见范围、模板绑定、消息接收配置与管理员名单。
- 真机回归矩阵已覆盖工作平台、办事、采购管理、我的四大板块。

## 证据索引

- `WS-3A`
- [env.ts](/Users/yuan/项目/sunan/sunan/apps/api/src/config/env.ts)
- [production-config-matrix.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/production-config-matrix.md)
- [wecom-dev-setup.md](/Users/yuan/项目/sunan/sunan/docs/guides/wecom-dev-setup.md)
- [procurement-go-live-checklist.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/procurement-go-live-checklist.md)
- `WS-3B`
- [workbench.service.ts](/Users/yuan/项目/sunan/sunan/apps/api/src/modules/workbench/workbench.service.ts)
- [workbench-approval-callback.dto.ts](/Users/yuan/项目/sunan/sunan/apps/api/src/modules/workbench/dto/workbench-approval-callback.dto.ts)
- [callback-security-spec.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/callback-security-spec.md)
- [template-binding-checklist.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/template-binding-checklist.md)
- `WS-3C`
- [real-device-regression-matrix.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/real-device-regression-matrix.md)
- [workbench-go-live-checklist.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/workbench-go-live-checklist.md)
- [go-live-materials-checklist.md](/Users/yuan/项目/sunan/sunan/docs/specs/wecom/go-live-materials-checklist.md)
