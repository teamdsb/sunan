---
status: operations
owner: wecom
updated: 2026-05-21
replaces: []
replaced_by: []
---
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
| `WECOM_CALLBACK_ALLOWED_IP_RANGES` | 手动追加的回调来源 IP 白名单 | 逗号分隔 IP/CIDR，可留空 |
| `WECOM_CALLBACK_ALLOWED_IP_RANGES_FILE` | 自动回调 IP 白名单文件 | 由每日任务生成，容器内路径为 `/run/sunan/wecom-ips/callback-ip-list.txt` |
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
| 工作台首页地址 | 自建应用设置 | `WEB_PUBLIC_URL` | 当前填 `https://app.qzssncb.com` |
| 可信域名 | 自建应用设置 | `WEB_PUBLIC_URL` 域名 | 当前填 `app.qzssncb.com` |
| JS 接口安全域名 | 自建应用设置 | `WEB_PUBLIC_URL` 域名 | 当前填 `app.qzssncb.com`，用于 `wx.config` / `agentConfig` |
| OAuth2 回调域名 | 自建应用设置 | `WECOM_REDIRECT_URI` | 当前填 `app.qzssncb.com`，授权回调页面为 `https://app.qzssncb.com/auth/callback` |
| 接收事件服务器 URL | 应用消息/回调设置 | `API_PUBLIC_URL` | 当前填 `https://api.qzssncb.com/api/v1/wecom/callback` |
| Token | 应用消息/回调设置 | `WECOM_CALLBACK_TOKEN` | 用于验签 |
| EncodingAESKey | 应用消息/回调设置 | `WECOM_ENCODING_AES_KEY` | 启用加密回调时使用 |
| 应用可见范围 | 自建应用设置 | 组织架构与角色矩阵 | 覆盖四大板块目标成员 |

接收事件服务器 URL 当前已支持企业微信 URL 校验请求：后端会按 Token 校验签名，并在加密模式下解密 `echostr` 后以纯文本返回。

2026-05-21 已写入真实 `WECOM_CORP_ID`、`WECOM_AGENT_ID`、`WECOM_AGENT_SECRET`、`WECOM_SYSTEM_ADMIN_USER_IDS`、`WECOM_CALLBACK_TOKEN` 和 `WECOM_ENCODING_AES_KEY`；`WECOM_CALLBACK_ALLOWED_IP_RANGES` 已恢复为默认空值，并由每日自动任务合并官方回调 IP 段与后续手写追加值。

已验证企业微信 `gettoken`、企业级 `jsapi_ticket` 和应用级 `agent_config` ticket 均返回 `errcode=0`，加密 URL 校验请求经公网 `https://api.qzssncb.com/api/v1/wecom/callback` 返回纯文本 `echostr`。

企业微信 API 调用 IP 白名单已生效，服务器公网 IP `39.106.103.45` 可正常获取 `access_token`、企业级 `jsapi_ticket` 和应用级 `agent_config` ticket。

## 回调 IP 自动白名单

依据企业微信官方文档：

- 获取企业微信接口 IP 段：<https://developer.work.weixin.qq.com/document/path/92520>
- 获取企业微信回调 IP 段：<https://developer.work.weixin.qq.com/document/path/92521>

系统每日通过 `sunan-wecom-callback-ip-sync.timer` 拉取企业微信回调 IP 段，并生成：

- `/dev/sunan/sunan-wecom-ips/callback-ip-list.auto.txt`：企业微信官方回调 IP 段
- `/dev/sunan/sunan-wecom-ips/callback-ip-list.txt`：官方回调 IP 段 + `.env` 手动追加 IP 段
- `/dev/sunan/sunan-wecom-ips/callback-allow.conf`：Nginx 回调入口 allow 配置

`WECOM_CALLBACK_ALLOWED_IP_RANGES` 仍然生效，不会被自动任务覆盖。后端与 Nginx 均按“官方自动 IP 段 + env 手写 IP 段”的并集进行校验。默认情况下该变量可以留空；需要临时加白时，可以在 `.env` 中写入逗号分隔的 IP/CIDR 后手动执行 `systemctl start sunan-wecom-callback-ip-sync.service`。

## 域名归属校验

企业微信域名归属校验文件已上传：

- 文件名：`WW_verify_syXtjgUoSgMs7TpJ.txt`
- 文件内容：`syXtjgUoSgMs7TpJ`
- 已验证地址：`http://qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- 已验证地址：`https://qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- 已验证地址：`http://app.qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- 已验证地址：`https://app.qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`

如企业微信后台要求“可信域名最多 10 个”，当前建议只填：

- `app.qzssncb.com`

如后台同时要求根域名归属，可补充：

- `qzssncb.com`

## 责任分工

| 项目 | 责任方 |
|---|---|
| 企业微信后台配置 | 企业微信管理员 |
| 后端环境变量配置 | 后端负责人 |
| 前端域名与 CDN 配置 | 前端/运维负责人 |
| 模板绑定与审批核对 | 业务管理员 + 开发负责人 |
| 上线前最终核对 | 项目负责人 |
