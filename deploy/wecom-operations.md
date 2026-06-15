---
status: operations
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 企业微信运维手册

本项目把企业微信作为主要运行容器：OAuth 登录、JS-SDK、可信域名、接收消息回调、审批回调和工作平台审批都依赖企业微信配置。

## 企业微信后台建议配置

| 配置项 | 建议值 |
|---|---|
| H5 首页 | `https://app.qzssncb.com` |
| OAuth2.0 网页授权回调域名 | `app.qzssncb.com` |
| 授权回调页面 | `https://app.qzssncb.com/auth/callback` |
| JS-SDK 可信域名 | `app.qzssncb.com` |
| 需要根域名校验时 | `qzssncb.com` |
| 接收消息服务器 URL | `https://api.qzssncb.com/api/v1/wecom/callback` |
| 审批回调 URL | `https://api.qzssncb.com/api/v1/wecom/approval/callback` |

## 域名归属校验文件

企业微信校验文件：

```text
WW_verify_syXtjgUoSgMs7TpJ.txt
```

服务器位置：

```text
/dev/sunan/sunan-nginx/acme/WW_verify_syXtjgUoSgMs7TpJ.txt
```

可访问地址：

- `http://qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- `https://qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- `http://app.qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- `https://app.qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`

验证：

```bash
curl -fsS http://qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt
curl -fsS https://app.qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt
```

## 真实参数来源

真实值写在服务器 `/dev/sunan/deploy/.env`，不要写入仓库。

| 变量 | 后台位置 |
|---|---|
| `WECOM_CORP_ID` | 企业微信管理后台 -> 我的企业 -> 企业信息 -> 企业 ID |
| `WECOM_AGENT_ID` | 应用管理 -> 自建应用 -> AgentId |
| `WECOM_AGENT_SECRET` | 应用管理 -> 自建应用 -> Secret |
| `WECOM_SYSTEM_ADMIN_USER_IDS` | 通讯录成员 UserID，多个用英文逗号 |
| `WECOM_CALLBACK_TOKEN` | 应用回调/接收消息配置 Token |
| `WECOM_ENCODING_AES_KEY` | 应用回调/接收消息配置 EncodingAESKey |

检查是否已配置：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 '
set -e
for key in WECOM_CORP_ID WECOM_AGENT_ID WECOM_AGENT_SECRET WECOM_CALLBACK_TOKEN WECOM_ENCODING_AES_KEY; do
  if grep -q "^${key}=." /dev/sunan/deploy/.env; then echo "${key}=SET"; else echo "${key}=EMPTY"; fi
done
'
```

## 回调 IP 自动白名单

依据企业微信官方接口：

- 获取企业微信接口 IP 段：`https://developer.work.weixin.qq.com/document/path/92520`
- 获取企业微信回调 IP 段：`https://developer.work.weixin.qq.com/document/path/92521`

服务器每日 03:20 执行：

```text
sunan-wecom-callback-ip-sync.timer
```

脚本：

```text
/usr/local/sbin/sunan-update-wecom-callback-ips
```

本地脚本源文件：

```text
deploy/scripts/sunan-update-wecom-callback-ips.py
```

输出目录：

```text
/dev/sunan/sunan-wecom-ips
```

关键文件：

| 文件 | 用途 |
|---|---|
| `callback-ip-list.auto.txt` | 企业微信官方回调 IP |
| `callback-ip-list.txt` | 官方 IP + `.env` 手动追加 IP |
| `callback-allow.conf` | Nginx `allow` 配置 |
| `api-domain-ip-list.txt` | 企业微信 API 域名 IP |
| `state.json` | 最近同步状态 |

手动执行：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
systemctl start sunan-wecom-callback-ip-sync.service
systemctl status sunan-wecom-callback-ip-sync.service --no-pager
cat /dev/sunan/sunan-wecom-ips/state.json
docker exec sunan-nginx nginx -t
'
```

## 接收消息回调

Nginx 对以下路径启用企业微信来源 IP allow/deny：

```text
/api/v1/wecom/callback
/api/v1/wecom/approval/callback
```

后端会做签名、时间戳偏移、加密消息校验。

企业微信后台 URL 校验时，如果失败：

1. 检查 DNS 和证书。
2. 检查 Nginx 是否 include 最新 `callback-allow.conf`。
3. 检查企业微信后台填写的 Token/EncodingAESKey 是否与 `.env` 一致。
4. 查后端日志：

```bash
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-api
```

## 工作平台审批真实调用链路

工作平台审批按“企业微信审批流程引擎”接入：

1. 前端点击发起企业微信审批。
2. 后端 `POST /api/v1/wecom/approval/launch` 检查模块模板绑定。
3. 如果没有绑定模板，后端调用企业微信“创建审批模板 API”自动创建模板。
4. 返回的 `template_id` 写入 `wecom_approval_template_bindings.wecom_template_id`。
5. 系统生成唯一 `thirdNo`，写入 `wecom_approval_instance_syncs.process_instance_id`。
6. 前端在企业微信客户端通过 `wx.invoke('thirdPartyOpenPage', ...)` 打开审批页。
7. 企业微信回调到 `https://api.qzssncb.com/api/v1/wecom/approval/callback`。
8. 后端完成验签、解密、幂等和系统状态更新。
9. 管理员可通过对账/重试接口调用企业微信 `getopenapprovaldata` 获取真实状态。

数据库确认模板：

```bash
docker exec -it sunan-db psql -U sunan -d sunan -c \
  "select module_code, template_code, wecom_template_id, enabled, updated_at from wecom_approval_template_bindings order by updated_at desc limit 10;"
```

数据库确认实例：

```bash
docker exec -it sunan-db psql -U sunan -d sunan -c \
  "select process_instance_id, wecom_template_id, external_status, approval_sync_status, updated_at from wecom_approval_instance_syncs order by updated_at desc limit 10;"
```

## 上线首测

1. 在企业微信后台确认自建应用有审批模板创建/审批流程引擎权限。
2. 在企业微信客户端打开 `https://app.qzssncb.com`。
3. 使用可见范围内成员登录。
4. 新建一个需要审批的工作平台记录。
5. 点击“发起企业微信审批”。
6. 应打开企业微信审批页。
7. 提交后在企业微信后台确认真实审批单。
8. 查询数据库模板和实例记录。

## 官方文档

- OAuth2 网页授权：企业微信开发文档后台搜索“网页授权登录”。
- JS-SDK：企业微信开发文档后台搜索“JS-SDK”。
- 获取接口 IP 段：`https://developer.work.weixin.qq.com/document/path/92520`
- 获取回调 IP 段：`https://developer.work.weixin.qq.com/document/path/92521`
- 审批 API：企业微信开发文档后台搜索“审批流程引擎”。
