---
status: operations
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 新服务器初始化手册

本手册用于从一台干净服务器重新搭建苏南船舶生产环境。当前线上服务器已经完成这些步骤，日常发布请看 `deployment-runbook.md`。

## 当前线上基线

2026-06-08 远端检查：

- OS：Debian GNU/Linux 13 trixie
- Docker：`Docker version 29.5.0`
- Docker Compose：`Docker Compose version v5.1.3`
- Docker daemon 国内镜像源：
  - `https://docker.m.daocloud.io`
  - `https://docker.1ms.run`
- Docker 日志限制：
  - `max-size=100m`
  - `max-file=3`

## 1. 安装 Docker

在 Debian/Ubuntu 系统上可使用官方源安装稳定版 Docker。不同系统版本命令可能略有差异，执行前应参考 Docker 官方文档确认。

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker --version
docker compose version
```

## 2. 配置 Docker 国内镜像源和日志限制

```bash
mkdir -p /etc/docker
cat >/etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

systemctl daemon-reload
systemctl restart docker
docker info | sed -n '/Registry Mirrors:/,/Live Restore/p'
```

## 3. 创建目录

```bash
mkdir -p \
  /dev/sunan/deploy \
  /dev/sunan/sunan-source/current \
  /dev/sunan/sunan-db/data \
  /dev/sunan/sunan-redis/data \
  /dev/sunan/sunan-oss/data \
  /dev/sunan/sunan-api/logs \
  /dev/sunan/sunan-nginx/conf.d \
  /dev/sunan/sunan-nginx/certs \
  /dev/sunan/sunan-nginx/acme \
  /dev/sunan/sunan-nginx/logs \
  /dev/sunan/sunan-wecom-ips \
  /dev/sunan/sunan-images \
  /dev/sunan/backups

chmod 700 /dev/sunan/deploy /dev/sunan/backups
```

## 4. 上传部署文件

从本地仓库上传：

```bash
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/docker-compose.yml root@39.106.103.45:/dev/sunan/deploy/docker-compose.yml
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/.env.example root@39.106.103.45:/dev/sunan/deploy/.env.example
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/nginx/sunan.conf root@39.106.103.45:/dev/sunan/sunan-nginx/conf.d/sunan.conf
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/scripts/sunan-update-wecom-callback-ips.py root@39.106.103.45:/usr/local/sbin/sunan-update-wecom-callback-ips
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/systemd/sunan-wecom-callback-ip-sync.service root@39.106.103.45:/etc/systemd/system/sunan-wecom-callback-ip-sync.service
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/systemd/sunan-wecom-callback-ip-sync.timer root@39.106.103.45:/etc/systemd/system/sunan-wecom-callback-ip-sync.timer
```

服务器上设置权限：

```bash
chmod 755 /usr/local/sbin/sunan-update-wecom-callback-ips
systemctl daemon-reload
systemctl enable --now sunan-wecom-callback-ip-sync.timer
```

## 5. 创建生产 `.env`

```bash
cp /dev/sunan/deploy/.env.example /dev/sunan/deploy/.env
chmod 600 /dev/sunan/deploy/.env
vim /dev/sunan/deploy/.env
```

需要填入强密码、JWT Secret、企业微信真实参数。变量含义见 `environment-variables.md`。

强密码可用：

```bash
openssl rand -base64 36
```

## 6. 上传源码

按 `deployment-runbook.md` 的“同步源码”执行。确保服务器存在：

```text
/dev/sunan/sunan-source/current/package.json
/dev/sunan/sunan-source/current/apps/api
/dev/sunan/sunan-source/current/apps/web
```

## 7. 初始化 Nginx 和 ACME

首次签发 Let's Encrypt 前，如果 443 证书还不存在，Nginx 可能无法启动。可临时使用 certbot standalone，或先准备临时自签证书让 Nginx 启动。当前线上已经是 Let's Encrypt 证书。

推荐当前方案：

1. 确认 DNS 指向服务器公网 IP。
2. 确认 80/443 安全组开放。
3. 用 certbot webroot 签发证书。

```bash
apt-get update
apt-get install -y certbot

certbot certonly --webroot -w /dev/sunan/sunan-nginx/acme \
  --cert-name qzssncb.com \
  -d qzssncb.com \
  -d app.qzssncb.com \
  -d api.qzssncb.com \
  -d oss.qzssncb.com \
  -d oss-console.qzssncb.com \
  --agree-tos --register-unsafely-without-email --non-interactive
```

安装续费 hook：

```bash
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat >/etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh <<'EOF'
#!/bin/sh
set -eu
CERT_NAME="qzssncb.com"
SRC="/etc/letsencrypt/live/${CERT_NAME}"
DST="/dev/sunan/sunan-nginx/certs"
install -m 0644 "${SRC}/fullchain.pem" "${DST}/qzssncb.com.crt"
install -m 0600 "${SRC}/privkey.pem" "${DST}/qzssncb.com.key"
if docker ps --format "{{.Names}}" | grep -qx sunan-nginx; then
  docker exec sunan-nginx nginx -s reload
fi
EOF
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh
/etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh
systemctl enable --now certbot.timer
```

## 8. 企业微信校验文件

把企业微信下载的校验文件放到：

```text
/dev/sunan/sunan-nginx/acme/WW_verify_syXtjgUoSgMs7TpJ.txt
```

示例：

```bash
printf '%s\n' 'syXtjgUoSgMs7TpJ' > /dev/sunan/sunan-nginx/acme/WW_verify_syXtjgUoSgMs7TpJ.txt
chmod 644 /dev/sunan/sunan-nginx/acme/WW_verify_syXtjgUoSgMs7TpJ.txt
```

## 9. 启动服务

```bash
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env up -d --build
docker compose --env-file /dev/sunan/deploy/.env ps
```

## 10. 初始化企业微信回调 IP

```bash
systemctl start sunan-wecom-callback-ip-sync.service
systemctl status sunan-wecom-callback-ip-sync.service --no-pager
cat /dev/sunan/sunan-wecom-ips/state.json
```

## 11. 最终验证

```bash
curl -fsSI https://qzssncb.com
curl -fsSI https://app.qzssncb.com
curl -fsS https://api.qzssncb.com/api/health
curl -fsS https://app.qzssncb.com/WW_verify_syXtjgUoSgMs7TpJ.txt
systemctl list-timers --all --no-pager | grep -E 'certbot|sunan-wecom'
```

## 注意

本文件的 `cat >` 命令是服务器初始化手册中的人工执行示例；如果修改仓库文件，仍应遵守仓库约定使用 `apply_patch`。
