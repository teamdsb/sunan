# 企业微信开发环境配置

## 必备参数

| 参数 | 说明 |
|---|---|
| `WECOM_CORP_ID` | 企业 CorpID |
| `WECOM_AGENT_ID` | 自建应用 AgentID |
| `WECOM_AGENT_SECRET` | 应用 Secret |
| `WECOM_REDIRECT_URI` | OAuth2 回调地址 |
| `WECOM_CALLBACK_TOKEN` | 回调验签 Token |
| `WECOM_ENCODING_AES_KEY` | 回调加密 Key（启用加密回调时） |
| `WECOM_CALLBACK_ALLOWED_IP_RANGES` | 回调来源 IP 白名单 |
| `WEB_PUBLIC_URL` | 前端正式访问地址 |
| `API_PUBLIC_URL` | 后端正式访问地址 |

## 历史别名

- `WECOM_TOKEN` 仅作为历史别名说明，不再作为主配置名。

## 后台配置项

1. 在企业微信后台创建自建应用。
2. 配置工作台首页地址和可信域名。
3. 配置 JS 接口安全域名。
4. 配置 OAuth2 回调域名。
5. 配置事件接收服务器、Token 和 EncodingAESKey。
6. 配置应用可见范围与管理员名单。

## 开发注意事项

1. 企业微信 H5 必须在可信域名下调试，不能直接使用随机 localhost 域名。
2. iOS WebView 需固定签名 URL。
3. 通讯录同步和消息发送依赖可用的 `access_token` 缓存。
4. 启用回调白名单后，联调环境需要同步维护测试来源 IP 范围。

## 联调检查单

- OAuth2 能返回 `code`
- `/auth/wecom/callback` 能换到用户信息
- `wx.config` 与 `agentConfig` 均成功
- 应用消息能发送到测试成员
- 回调签名校验通过
- 若启用加密回调：`WECOM_ENCODING_AES_KEY` 验证通过

## 生产配置核对

### 域名与地址

- `WEB_PUBLIC_URL` 使用生产 HTTPS 域名。
- `API_PUBLIC_URL` 使用生产 HTTPS 域名。
- 可信域名与前端实际访问域名一致。
- OAuth2 回调域名与 `WECOM_REDIRECT_URI` 一致。
- JS 接口安全域名包含前端实际域名。

### 环境变量

- `WECOM_CORP_ID`、`WECOM_AGENT_ID`、`WECOM_AGENT_SECRET` 为生产应用参数。
- `WECOM_REDIRECT_URI` 指向生产可访问回调地址。
- `WECOM_CALLBACK_TOKEN` 与企业微信后台一致。
- `WECOM_ENCODING_AES_KEY` 在启用加密回调时已配置。
- `WECOM_CALLBACK_ALLOWED_IP_RANGES` 已与回调白名单一致。

### 发布前回归

- iOS 企业微信中 OAuth2 登录与 JS-SDK 初始化成功。
- Android 企业微信中 OAuth2 登录与 JS-SDK 初始化成功。
- `/my`、`/office`、`/procurement`、`/workbench` 可在企业微信内访问。
- 审批发起、回调、消息、附件、打印、导出链路可正常工作。

### 发布后抽检

- 抽检四大板块至少各 1 条核心链路。
- 抽检 1 条治理动作和 1 条打开/审批动作，确认审计可查询。
- 抽检 1 条消息、1 条导出、1 条打印快照，确认留痕完整。
