# 苏南船舶 Docker 部署说明

本文件记录钦州市苏南船舶服务有限公司项目在服务器上的 Docker 部署方式、域名分配、持久化目录、证书续费和企业微信参数准备事项。

服务器生产资源统一放在 `/dev/sunan` 下。可直接运行的 Compose 文件为服务器上的 `/dev/sunan/deploy/docker-compose.yml`，本仓库对应文件为 `deploy/docker-compose.yml`。

## 当前部署状态

已按“可直接运行的 `docker-compose.yml`”方式部署，不使用镜像归档包作为交付物。服务器上的服务已启动：

- 前端：`sunan-web:stable`
- 后端：`sunan-api:stable`
- 数据库：`sunan-db:16-stable`
- Redis：`sunan-redis:7.4-stable`
- OSS/对象存储：`sunan-oss:2025-09-07-stable`
- OSS 初始化工具：`sunan-oss-mc:2025-08-13-stable`
- Nginx：`sunan-nginx:stable`

Docker 已安装稳定版，Docker daemon 已配置国内镜像源。服务通过 Compose 编排，数据库、Redis、OSS、API、Web 和 Nginx 运行在同一个 `sunan` Docker 网络内。

## 文件位置

- 本地仓库 Compose 文件：`deploy/docker-compose.yml`
- 服务器 Compose 文件：`/dev/sunan/deploy/docker-compose.yml`
- 服务器环境变量文件：`/dev/sunan/deploy/.env`
- 服务器 Nginx 配置目录：`/dev/sunan/sunan-nginx/conf.d`
- 服务器证书目录：`/dev/sunan/sunan-nginx/certs`
- 服务器 ACME 校验目录：`/dev/sunan/sunan-nginx/acme`
- 企业微信回调 IP 自动白名单目录：`/dev/sunan/sunan-wecom-ips`
- 服务器源码目录：`/dev/sunan/sunan-source/current`

## 域名分配

- 前端：`https://app.qzssncb.com`
- 后端 API：`https://api.qzssncb.com`
- OSS S3 接口：`https://oss.qzssncb.com`
- OSS 控制台：`https://oss-console.qzssncb.com`
- 根域名：`https://qzssncb.com`，已配置为 `301` 跳转到前端

当前线上验证结果：

- `https://qzssncb.com` 正常返回 `301`，跳转到 `https://app.qzssncb.com/`
- `https://api.qzssncb.com/api/health` 返回 `{"data":{"status":"ok"}}`

## 持久化目录

所有生产数据统一持久化在 `/dev/sunan` 下：

- PostgreSQL 数据：`/dev/sunan/sunan-db/data`
- Redis 数据：`/dev/sunan/sunan-redis/data`
- OSS 文件数据：`/dev/sunan/sunan-oss/data`
- API 日志：`/dev/sunan/sunan-api/logs`
- Nginx 配置：`/dev/sunan/sunan-nginx/conf.d`
- Nginx 证书：`/dev/sunan/sunan-nginx/certs`
- Nginx ACME 校验文件：`/dev/sunan/sunan-nginx/acme`
- Nginx 日志：`/dev/sunan/sunan-nginx/logs`
- 企业微信回调 IP 自动白名单：`/dev/sunan/sunan-wecom-ips`
- 本地 Docker 相关镜像/备份预留目录：`/dev/sunan/sunan-images`
- 部署源码：`/dev/sunan/sunan-source/current`

## 账号与密码

统一账号命名规则为 `sunan`：

- 数据库用户：`sunan`
- Redis ACL 用户：`sunan`
- OSS/MinIO Access Key：`sunan`

真实强密码、JWT 密钥和企业微信回调 Token 存放在服务器的 `/dev/sunan/deploy/.env` 中。出于安全原因，不把真实密码写入仓库文档。

查看生产环境变量示例：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 \
  'grep -E "^(DB_USER|DB_PASSWORD|REDIS_USER|REDIS_PASSWORD|OSS_ACCESS_KEY_ID|OSS_ACCESS_KEY_SECRET|JWT_SECRET|WECOM_CALLBACK_TOKEN)=" /dev/sunan/deploy/.env'
```

## 常用运维命令

以下命令在服务器 `/dev/sunan/deploy` 目录执行：

```bash
docker compose --env-file /dev/sunan/deploy/.env up -d --build
docker compose --env-file /dev/sunan/deploy/.env ps
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-api
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-nginx
```

重载 Nginx：

```bash
docker compose --env-file /dev/sunan/deploy/.env exec -T sunan-nginx nginx -s reload
```

检查 API 健康状态：

```bash
curl -fsS https://api.qzssncb.com/api/health
```

## HTTPS 证书

证书使用 Let’s Encrypt 公共可信证书，不是自签证书。

当前证书覆盖：

- `qzssncb.com`
- `app.qzssncb.com`
- `api.qzssncb.com`
- `oss.qzssncb.com`
- `oss-console.qzssncb.com`

当前证书有效期到 `2026-08-17 12:50:39 UTC`。证书 SAN 中已确认包含 `DNS:qzssncb.com`。

自动续费由系统的 `certbot.timer` 负责。续费后，部署钩子 `/etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh` 会自动将新证书复制到 `/dev/sunan/sunan-nginx/certs`，并重载 `sunan-nginx`。

已验证：

- `certbot.timer` 状态为 `enabled` 和 `active`
- `certbot renew --dry-run --cert-name qzssncb.com --non-interactive` 已通过

后续需要保持：

- 服务器 `80` 和 `443` 端口开放
- `qzssncb.com` 和相关子域名继续解析到 `39.106.103.45`
- Nginx 保留 `/.well-known/acme-challenge/` 的 HTTP-01 校验配置

手动重新签发或扩展证书时可执行：

```bash
certbot certonly --webroot -w /dev/sunan/sunan-nginx/acme \
  --cert-name qzssncb.com \
  --expand \
  -d qzssncb.com \
  -d app.qzssncb.com \
  -d api.qzssncb.com \
  -d oss.qzssncb.com \
  -d oss-console.qzssncb.com \
  --agree-tos --register-unsafely-without-email --non-interactive

/etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh
```

## 企业微信真实参数准备

企业微信真实参数需要从企业微信管理后台获取，然后写入服务器 `/dev/sunan/deploy/.env`。

需要准备：

- `WECOM_CORP_ID`：企业微信管理后台 -> 我的企业 -> 企业信息 -> 企业 ID
- `WECOM_AGENT_ID`：应用管理 -> 自建应用 -> 对应应用的 AgentId
- `WECOM_AGENT_SECRET`：应用管理 -> 自建应用 -> 对应应用的 Secret
- `WECOM_SYSTEM_ADMIN_USER_IDS`：通讯录中的成员 UserID，多个用英文逗号分隔
- `WECOM_CALLBACK_TOKEN`：应用回调/接收消息配置中的 Token，需要与后台一致
- `WECOM_ENCODING_AES_KEY`：应用回调/接收消息配置中的 EncodingAESKey，启用加密回调时必填
- `WECOM_CALLBACK_ALLOWED_IP_RANGES`：手动追加的企业微信回调来源 IP 白名单，可留空；系统会每日自动拉取官方回调 IP 段

建议在企业微信后台配置：

- H5 首页：`https://app.qzssncb.com`
- 应用 OAuth2.0 网页授权回调域名：`app.qzssncb.com`
- 授权回调页面：`https://app.qzssncb.com/auth/callback`
- 授权回调域：`app.qzssncb.com`
- 可调用 JS-SDK、跳转小程序的可信域名：优先填 `app.qzssncb.com`
- 如企业微信后台需要同时校验根域名，可增加：`qzssncb.com`
- 接收消息服务器 URL：`https://api.qzssncb.com/api/v1/wecom/callback`
- 审批业务回调地址：`https://api.qzssncb.com/api/v1/wecom/approval/callback`

`/api/v1/wecom/callback` 已支持企业微信 URL 校验请求，会按 Token 校验签名，并在加密模式下解密 `echostr` 后以纯文本返回。2026-05-21 已写入真实 `WECOM_CORP_ID`、`WECOM_AGENT_ID`、`WECOM_AGENT_SECRET`、`WECOM_SYSTEM_ADMIN_USER_IDS`、`WECOM_CALLBACK_TOKEN` 和 `WECOM_ENCODING_AES_KEY`；`WECOM_CALLBACK_ALLOWED_IP_RANGES` 已恢复为默认空值，并由每日自动任务合并官方回调 IP 段与后续手写追加值。

已验证：

- 企业微信 `gettoken` 返回 `errcode=0`
- 企业级 `jsapi_ticket` 返回 `errcode=0`
- 应用级 `agent_config` ticket 返回 `errcode=0`
- 加密 URL 校验请求经公网 `https://api.qzssncb.com/api/v1/wecom/callback` 返回纯文本 `echostr`
- 前端构建包已包含新的 `WECOM_CORP_ID` 和 `WECOM_AGENT_ID`

企业微信 API 调用 IP 白名单已生效，服务器公网 IP `39.106.103.45` 可正常获取 `access_token`、企业级 `jsapi_ticket` 和应用级 `agent_config` ticket。

## 企业微信回调 IP 自动白名单

依据企业微信官方文档：

- 获取企业微信接口 IP 段：<https://developer.work.weixin.qq.com/document/path/92520>
- 获取企业微信回调 IP 段：<https://developer.work.weixin.qq.com/document/path/92521>

服务器已配置每日定时任务，自动调用企业微信接口获取最新回调 IP 段，并更新回调入口的来源 IP 白名单：

- 脚本：`/usr/local/sbin/sunan-update-wecom-callback-ips`
- systemd service：`sunan-wecom-callback-ip-sync.service`
- systemd timer：`sunan-wecom-callback-ip-sync.timer`
- 执行时间：每天 `03:20`
- 自动 IP 文件：`/dev/sunan/sunan-wecom-ips/callback-ip-list.auto.txt`
- 自动 + env 合并后的 IP 文件：`/dev/sunan/sunan-wecom-ips/callback-ip-list.txt`
- Nginx 回调 allow 配置：`/dev/sunan/sunan-wecom-ips/callback-allow.conf`
- 拉取状态文件：`/dev/sunan/sunan-wecom-ips/state.json`

`WECOM_CALLBACK_ALLOWED_IP_RANGES` 仍然生效。系统会把自动拉取的企业微信回调 IP 段与 `.env` 中手动填写的 `WECOM_CALLBACK_ALLOWED_IP_RANGES` 合并后使用：

- Nginx 对 `https://api.qzssncb.com/api/v1/wecom/callback` 和 `https://api.qzssncb.com/api/v1/wecom/approval/callback` 做来源 IP allow/deny。
- 后端业务回调校验会读取 `WECOM_CALLBACK_ALLOWED_IP_RANGES_FILE=/run/sunan/wecom-ips/callback-ip-list.txt`，并继续合并 `.env` 中的 `WECOM_CALLBACK_ALLOWED_IP_RANGES`。
- `.env` 中该变量可以留空作为默认值；如后续需要临时补充 IP 或 CIDR，直接写入后重新执行同步脚本即可生效。

手动执行同步：

```bash
systemctl start sunan-wecom-callback-ip-sync.service
systemctl status sunan-wecom-callback-ip-sync.service --no-pager
systemctl list-timers sunan-wecom-callback-ip-sync.timer
```

企业微信域名归属校验文件：

- 文件名：`WW_verify_syXtjgUoSgMs7TpJ.txt`
- 文件内容：`syXtjgUoSgMs7TpJ`
- 服务器存放位置：`/dev/sunan/sunan-nginx/acme/WW_verify_syXtjgUoSgMs7TpJ.txt`
- 已验证可访问：`http://qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- 已验证可访问：`https://qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- 已验证可访问：`http://app.qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`
- 已验证可访问：`https://app.qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt`

查看接收消息服务器配置需要填写的 Token 和 EncodingAESKey：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 \
  'grep -E "^(WECOM_CALLBACK_TOKEN|WECOM_ENCODING_AES_KEY)=" /dev/sunan/deploy/.env'
```

项目内企业微信文档：

- `docs/guides/wecom-dev-setup.md`
- `docs/specs/wecom/README.md`
- `docs/specs/wecom/production-config-matrix.md`
- `docs/specs/wecom/oauth2-spec.md`
- `docs/specs/wecom/jssdk-spec.md`
- `docs/specs/wecom/callback-security-spec.md`
- `docs/specs/wecom/workbench-go-live-checklist.md`
- `docs/specs/wecom/production-cutover-runbook.md`

企业微信官方文档：

- 网页授权：<https://developer.work.weixin.qq.com/document/path/91335>
- 构造网页授权链接：<https://developer.work.weixin.qq.com/document/path/91022>
- 获取访问用户身份：<https://developer.work.weixin.qq.com/document/path/91023>
- 回调配置：<https://developer.work.weixin.qq.com/document/path/90930>
- JS-SDK：<https://developer.work.weixin.qq.com/document/path/90514>
- JS-SDK 签名算法：<https://developer.work.weixin.qq.com/document/path/90539>
- 发送应用消息：<https://developer.work.weixin.qq.com/document/path/90236>
- 审批流程引擎：<https://developer.work.weixin.qq.com/document/path/90269>

## 后续仍需配置或确认

- 在企业微信后台填入真实应用参数，并同步更新 `/dev/sunan/deploy/.env`
- 企业微信后台确认可信域名、OAuth 回调域名和 JS-SDK 安全域名
- 如启用企业微信回调加密，确认 `WECOM_ENCODING_AES_KEY` 已写入生产环境
- 如有短信、支付、第三方审批或外部 OSS 供应商切换，再补充对应生产参数
- 定期检查磁盘空间，重点关注 `/dev/sunan/sunan-db/data`、`/dev/sunan/sunan-oss/data` 和 `/dev/sunan/sunan-nginx/logs`
