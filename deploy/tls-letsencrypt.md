---
status: operations
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# HTTPS 与 Let's Encrypt 证书

本项目使用 Let's Encrypt 公共可信证书，不使用自签证书。

## 证书覆盖域名

- `qzssncb.com`
- `app.qzssncb.com`
- `api.qzssncb.com`
- `oss.qzssncb.com`
- `oss-console.qzssncb.com`

Nginx 容器读取：

```text
/etc/nginx/certs/qzssncb.com.crt
/etc/nginx/certs/qzssncb.com.key
```

服务器实际文件：

```text
/dev/sunan/sunan-nginx/certs/qzssncb.com.crt
/dev/sunan/sunan-nginx/certs/qzssncb.com.key
```

## 自动续费

系统 `certbot.timer` 自动续费。续费后执行 hook：

```text
/etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh
```

hook 逻辑：

```sh
install -m 0644 /etc/letsencrypt/live/qzssncb.com/fullchain.pem /dev/sunan/sunan-nginx/certs/qzssncb.com.crt
install -m 0600 /etc/letsencrypt/live/qzssncb.com/privkey.pem /dev/sunan/sunan-nginx/certs/qzssncb.com.key
docker exec sunan-nginx nginx -s reload
```

## 检查证书

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
openssl x509 -in /dev/sunan/sunan-nginx/certs/qzssncb.com.crt \
  -noout -subject -issuer -dates -ext subjectAltName
systemctl status certbot.timer --no-pager
systemctl list-timers --all --no-pager | grep certbot
'
```

公网检查：

```bash
curl -fsSI https://qzssncb.com
curl -fsSI https://app.qzssncb.com
curl -fsSI https://api.qzssncb.com/api/health
```

## 手动 dry-run

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
certbot renew --dry-run --cert-name qzssncb.com --non-interactive
'
```

## 手动重新签发或扩展域名

确保 DNS 已解析到 `39.106.103.45`，80 端口开放，Nginx 的 `/.well-known/acme-challenge/` 指向 `/dev/sunan/sunan-nginx/acme`。

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
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
docker exec sunan-nginx nginx -t
docker exec sunan-nginx nginx -s reload
'
```

## 常见问题

- `certbot renew` 失败：检查 80 端口、安全组、防火墙、DNS、`/dev/sunan/sunan-nginx/acme` 是否挂载。
- 浏览器证书旧：执行 hook 后确认 Nginx reload，再用 `openssl s_client -connect app.qzssncb.com:443 -servername app.qzssncb.com` 检查。
- 新增子域名：先加 DNS，再扩展证书，再修改 Nginx。
