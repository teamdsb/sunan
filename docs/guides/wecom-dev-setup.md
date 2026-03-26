# 企业微信开发环境配置

## 必备参数

| 参数 | 说明 |
|---|---|
| `WECOM_CORP_ID` | 企业 CorpID |
| `WECOM_AGENT_ID` | 自建应用 AgentID |
| `WECOM_AGENT_SECRET` | 应用 Secret |
| `WECOM_REDIRECT_URI` | OAuth2 回调地址 |
| `WECOM_TOKEN` | 回调校验 Token（如启用） |
| `WECOM_ENCODING_AES_KEY` | 回调加密 Key（如启用） |

## 后台配置项

1. 在企业微信后台创建自建应用。
2. 配置工作台首页地址和可信域名。
3. 配置 JS 接口安全域名。
4. 配置 OAuth2 回调域名。
5. 如需消息推送，配置接收事件服务器。

## 开发注意事项

1. 企业微信 H5 必须在可信域名下调试，不能直接使用随机 localhost 域名。
2. iOS WebView 需固定签名 URL。
3. 通讯录同步和消息发送依赖可用的 `access_token` 缓存。

## 联调检查单

- OAuth2 能返回 `code`
- `/auth/wecom/callback` 能换到用户信息
- `wx.config` 与 `agentConfig` 均成功
- 应用消息能发送到测试成员
