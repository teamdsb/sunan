# M6 Wave 3 验收清单

- 企业微信环境变量标准名已统一为 `WECOM_CALLBACK_TOKEN`、`WECOM_ENCODING_AES_KEY`、`WECOM_CALLBACK_ALLOWED_IP_RANGES`、`WEB_PUBLIC_URL`、`API_PUBLIC_URL`。
- `WECOM_TOKEN` 仅作为 legacy alias 保留，不再作为主文档命名。
- 回调安全文档已覆盖签名、时间窗、nonce、幂等、来源 IP、异常留痕、人工重试与批量对账。
- 企业微信后台交付清单已包含可信域名、JS 接口安全域名、OAuth 回调域名、可见范围、模板绑定、消息接收配置与管理员名单。
- 真机回归矩阵已覆盖工作平台、办事、采购管理、我的四大板块。
