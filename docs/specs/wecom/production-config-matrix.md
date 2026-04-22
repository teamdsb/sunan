# 企业微信生产配置矩阵（M6）

## 文档定位

本矩阵用于将企业微信后台配置、系统环境变量、部署域名与责任人统一对齐，作为正式上线和排障的唯一核对入口。

## 系统环境变量

| 变量 | 说明 | 生产要求 |
|---|---|---|
| `WECOM_CORP_ID` | 企业 CorpID | 与自建应用所属企业一致 |
| `WECOM_AGENT_ID` | 自建应用 AgentId | 与企业微信后台一致 |
| `WECOM_AGENT_SECRET` | 应用 Secret | 仅后端持有 |
| `WECOM_REDIRECT_URI` | OAuth2 回调地址 | 指向生产 HTTPS 地址 |
| `WECOM_CALLBACK_TOKEN` | 回调验签 Token | 与企业微信后台一致 |
| `WECOM_ENCODING_AES_KEY` | 回调加密 Key | 启用加密回调时必填 |
| `WECOM_CALLBACK_ALLOWED_IP_RANGES` | 回调来源 IP 白名单 | 逗号分隔 CIDR |
| `WECOM_CALLBACK_SIGNATURE_REQUIRED` | 回调验签开关 | 生产建议固定为 `true` |
| `WEB_PUBLIC_URL` | 前端正式地址 | 用于 H5 访问与消息链接 |
| `API_PUBLIC_URL` | 后端正式地址 | 用于回调、排障与接口核对 |
| `WECOM_SYSTEM_ADMIN_USER_IDS` | 企业微信超管用户 ID 列表 | 逗号分隔 |

## 历史别名

- `WECOM_TOKEN` 仅作为历史别名说明，不再作为主配置名。
- `APP_DOMAIN` 在 M6 之后只保留兼容用途，正式对外地址以 `WEB_PUBLIC_URL` / `API_PUBLIC_URL` 为准。

## 企业微信后台配置矩阵

| 配置项 | 后台位置 | 对应系统配置 | 说明 |
|---|---|---|---|
| 工作台首页地址 | 自建应用设置 | `WEB_PUBLIC_URL` | 指向企业微信 H5 首页 |
| 可信域名 | 自建应用设置 | `WEB_PUBLIC_URL` 域名 | H5 必须可访问 |
| JS 接口安全域名 | 自建应用设置 | `WEB_PUBLIC_URL` 域名 | 用于 `wx.config` / `agentConfig` |
| OAuth2 回调域名 | 自建应用设置 | `WECOM_REDIRECT_URI` | 必须与回调地址一致 |
| 接收事件服务器 URL | 应用消息/回调设置 | `API_PUBLIC_URL` | 指向审批/消息回调入口 |
| Token | 应用消息/回调设置 | `WECOM_CALLBACK_TOKEN` | 用于验签 |
| EncodingAESKey | 应用消息/回调设置 | `WECOM_ENCODING_AES_KEY` | 启用加密回调时使用 |
| 应用可见范围 | 自建应用设置 | 组织架构与角色矩阵 | 覆盖四大板块目标成员 |

## 责任分工

| 项目 | 责任方 |
|---|---|
| 企业微信后台配置 | 企业微信管理员 |
| 后端环境变量配置 | 后端负责人 |
| 前端域名与 CDN 配置 | 前端/运维负责人 |
| 模板绑定与审批核对 | 业务管理员 + 开发负责人 |
| 上线前最终核对 | 项目负责人 |
