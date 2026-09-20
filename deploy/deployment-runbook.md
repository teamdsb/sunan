---
status: operations
owner: operations
updated: 2026-09-20
replaces: []
replaced_by: []
---
# 部署与发布操作手册

本手册描述从本地仓库发布到生产服务器的标准流程。执行前先读 `development-operations-guidelines.md`。

## 本地验证

在本地仓库执行：

```bash
pnpm --filter web test
pnpm --filter web build
pnpm --filter api test
pnpm --filter api build
```

如果只改前端，至少执行：

```bash
pnpm --filter web test
pnpm --filter web build
```

如果只改后端，至少执行：

```bash
pnpm --filter api test
pnpm --filter api build
```

## 部署前检查

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem -o StrictHostKeyChecking=no root@39.106.103.45 'set -e
cd /srv/sunan/deploy
docker compose --env-file /srv/sunan/deploy/.env ps
curl -fsS https://api.qzssncb.com/api/health
curl -fsS https://api.qzssncb.com/api/health/ready
'
```

## 同步源码

交付物包括不含私密环境文件的源码快照、源码 SHA256 清单、`linux/amd64` 镜像归档和镜像 SHA256。使用独立发布批次（例如 `20260920202534`），即使版本仍为 `0.0.8` 也不能覆盖上一批次备份。

1. 冻结工作区源码；排除 `.git`、`node_modules`、构建输出、`output` 和私密 `.env*`，保留 `.env.example`。记录源码清单和归档 SHA256。
2. 将源码归档上传到 `/var/backups/sunan/redeploy-0.0.8-<批次>/`，校验 SHA256 后解压至 `/srv/sunan/sunan-source/upload-<批次>`。
3. 完成镜像构建、上传和校验后，在切换前将 `current` 移至 `backup-<批次>`，再将 `upload-<批次>` 改名为 `current`，更新 `latest` 软链接。
4. 保留旧源码和镜像回滚标签；发布过程不自动清理历史备份。

## 更新服务器部署配置

如果本地 `deploy/docker-compose.yml` 或 `deploy/nginx/sunan.conf` 发生变化，需要同步到服务器：

```bash
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/docker-compose.yml root@39.106.103.45:/srv/sunan/deploy/docker-compose.yml
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/nginx/sunan.conf root@39.106.103.45:/srv/sunan/sunan-nginx/conf.d/sunan.conf
```

同步 Nginx 后必须测试：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
docker exec sunan-nginx nginx -t
docker exec sunan-nginx nginx -s reload
'
```

## 构建和启动

### 0.0.8 升级注意事项

- 本次新增 `1710000025000-reminder-expiry-cycle` 与 `1710000026000-file-orphan-retention`。先构建 API/Web/Nginx 镜像，保留旧运行镜像 ID 和源码，再停止旧 API、备份数据库并启动新 API，避免旧提醒扫描器与新索引并行工作。
- 生产 `.env` 修改前须备份，只将 `SUNAN_VERSION` 更新为 `0.0.8`。前端不增加版本显示。
- API 启动命令自动执行 migration 和幂等 seed；API readiness 通过后再切换 Web/Nginx。可用 `up -d --no-deps --no-build` 分服务切换，避免重建数据库、Redis、OSS。
- 2026-09-20 起生产目录迁至磁盘上的 `/srv/sunan`。旧 `/dev/sunan` 仅为兼容软链接，由 `/etc/tmpfiles.d/sunan-compat.conf` 在开机时创建；禁止在 `/dev` 下存放生产数据。备份使用 `/var/backups/sunan`。
- 生产服务器只有约 3.5 GiB 内存，禁止同时在生产构建 API 和 Web。本次使用本机 `linux/amd64` 镜像构建，再传至服务器执行 `docker load` 与 `up -d --no-deps --no-build`。构建镜像前为旧运行镜像 ID 创建独立回滚标签；同为 0.0.8 的发布用批次、源码哈希、镜像 ID 区分。
- 文件回收迁移会转存采购附件解除审计快照，并给历史解除附件设置新的 24 小时宽限期。发布前备份数据库及 OSS；先在隔离数据库恢复备份并演练迁移。
- 不可直接套用下方旧源码回滚流程恢复 0.0.7：提醒唯一索引和附件审计已变化，需先停止新 API 并评估兼容性。数据库或 OSS 恢复会覆盖发布后数据，必须明确确认后执行；已回收对象不能只靠数据库回退恢复。

### 本机构建与镜像传输

在冻结的源码目录顺序构建 API、Web、Nginx；Docker Desktop 应有足够空间，构建器限制资源。Web 的企业 ID 和应用 ID 使用当前生产公开配置，不传入任何 Secret：

```bash
RELEASE=20260920202534 # 每次使用新的批次
VERSION=0.0.8
# 已创建的构建器示例：docker buildx create --name sunan-release --driver docker-container --driver-opt memory=2g,memory-swap=3g,cpu-quota=200000
# 以下命令在冻结源码目录运行。
docker buildx build --builder sunan-release --platform linux/amd64 --load \
  --label org.opencontainers.image.version="$VERSION" --label com.sunan.release="$RELEASE" \
  -t "sunan-api:release-$RELEASE" -f apps/api/Dockerfile .
docker buildx build --builder sunan-release --platform linux/amd64 --load \
  --label org.opencontainers.image.version="$VERSION" --label com.sunan.release="$RELEASE" \
  --build-arg VITE_API_BASE_URL=https://api.qzssncb.com/api/v1 \
  --build-arg VITE_WECOM_CORP_ID="$WECOM_CORP_ID" --build-arg VITE_WECOM_AGENT_ID="$WECOM_AGENT_ID" \
  --build-arg VITE_WECOM_REDIRECT_URI=https://app.qzssncb.com/auth/callback \
  -t "sunan-web:release-$RELEASE" -f apps/web/Dockerfile .
docker buildx build --builder sunan-release --platform linux/amd64 --load \
  --label org.opencontainers.image.version="$VERSION" --label com.sunan.release="$RELEASE" \
  -t "sunan-nginx:release-$RELEASE" -f docker/nginx/Dockerfile .
docker save -o images.tar "sunan-api:release-$RELEASE" "sunan-web:release-$RELEASE" "sunan-nginx:release-$RELEASE"
shasum -a 256 images.tar > images.tar.sha256
```

将归档和校验文件传至对应服务器备份目录，执行 `sha256sum -c images.tar.sha256` 与 `docker load -i images.tar`。核对三个镜像均为 `amd64`，版本标签为 `0.0.8`，批次正确。保留运行中容器的实际镜像 ID，并分别加 `rollback-<批次>` 标签后，才将新镜像标记为 `sunan-api:0.0.8`、`sunan-web:0.0.8`、`sunan-nginx:0.0.8`。

### 分服务切换

切换前备份数据库、配置及适用的附件数据，检查迁移差异。2026-09-20 同版本发布已有 27 条迁移，没有新增数据库迁移。若有新迁移，先恢复到隔离数据库演练。以下命令在服务器执行：

```bash
set -e
cd /srv/sunan/deploy
docker compose -p deploy --env-file /srv/sunan/deploy/.env config --quiet
docker compose -p deploy --env-file /srv/sunan/deploy/.env up -d --no-deps --no-build --force-recreate --wait --wait-timeout 150 sunan-api
docker exec sunan-nginx nginx -t
docker exec sunan-nginx nginx -s reload
docker compose -p deploy --env-file /srv/sunan/deploy/.env up -d --no-deps --no-build --force-recreate --wait --wait-timeout 150 sunan-web
docker compose -p deploy --env-file /srv/sunan/deploy/.env up -d --no-deps --no-build --force-recreate sunan-nginx
docker compose -p deploy --env-file /srv/sunan/deploy/.env ps
```

Web 镜像使用自定义监听配置，Dockerfile 移除默认 IPv6 初始化脚本，避免 `apk manifest` 因网络访问阻塞启动。Compose 用 `/health` 检查 Web；先等 Web 健康再切换 Nginx。

仅前端变更时只切换 `sunan-web`，随后测试并 reload Nginx，使其解析新容器地址。生产禁止执行构建命令。任何一步失败都先检查状态，必要时按下文切回已保存镜像。

## 发布后验证

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
cd /srv/sunan/deploy
docker compose --env-file /srv/sunan/deploy/.env ps
docker ps --format "{{.Names}} {{.Status}}" | grep -E "sunan-web|sunan-api|sunan-db|sunan-redis|sunan-oss|sunan-nginx"
curl -fsS https://api.qzssncb.com/api/health
curl -fsS https://api.qzssncb.com/api/health/ready
curl -fsSI https://app.qzssncb.com | head -n 5
'
```

如果改了前端文案，可在容器内检索构建产物：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 \
  'docker exec sunan-web sh -c "grep -R \"待查文案\" -n /usr/share/nginx/html || true"'
```

## 回滚镜像和源码

先确认旧代码与当前数据库兼容。保留的 `rollback-images.yml` 应将 API、Web、Nginx 指向该批次的 `rollback-<批次>` 标签。服务器执行：

```bash
set -e
B=/var/backups/sunan/redeploy-0.0.8-20260920202534 # 选择实际批次
R=/srv/sunan
docker compose -p deploy --env-file "$R/deploy/.env" -f "$R/deploy/docker-compose.yml" -f "$B/rollback-images.yml" \
  up -d --no-deps --no-build --force-recreate --wait --wait-timeout 150 sunan-api
docker compose -p deploy --env-file "$R/deploy/.env" -f "$R/deploy/docker-compose.yml" -f "$B/rollback-images.yml" \
  up -d --no-deps --no-build --force-recreate sunan-web sunan-nginx
docker exec sunan-nginx nginx -t
curl -fsS https://api.qzssncb.com/api/health/ready
curl -fsSI https://app.qzssncb.com
```

镜像恢复后，将失败的 `current` 源码保留为 `failed-<时间>`，从对应 `backup-<批次>` 恢复源码，并更新 `latest`。记录实际运行的镜像 ID；下次发布前注意回滚覆盖文件。数据库和 OSS 不随镜像回滚自动恢复，以免覆盖新数据；确需恢复时先备份当前现场并获得用户确认。

## 查看日志

```bash
cd /srv/sunan/deploy
docker compose --env-file /srv/sunan/deploy/.env logs -f sunan-api
docker compose --env-file /srv/sunan/deploy/.env logs -f sunan-web
docker compose --env-file /srv/sunan/deploy/.env logs -f sunan-nginx
docker compose --env-file /srv/sunan/deploy/.env logs -f sunan-db
docker compose --env-file /srv/sunan/deploy/.env logs -f sunan-redis
docker compose --env-file /srv/sunan/deploy/.env logs -f sunan-oss
```
