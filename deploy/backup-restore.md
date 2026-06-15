---
status: operations
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 备份与恢复手册

所有生产数据在 `/dev/sunan` 下。备份前先确认磁盘空间：

```bash
df -h
du -sh /dev/sunan/*
```

建议备份目录：

```text
/dev/sunan/backups
```

创建：

```bash
mkdir -p /dev/sunan/backups
chmod 700 /dev/sunan/backups
```

## PostgreSQL 备份

逻辑备份：

```bash
TS=$(date +%Y%m%d%H%M%S)
docker exec sunan-db pg_dump -U sunan -d sunan -Fc > /dev/sunan/backups/sunan-db-$TS.dump
chmod 600 /dev/sunan/backups/sunan-db-$TS.dump
```

验证备份文件：

```bash
docker exec -i sunan-db pg_restore --list < /dev/sunan/backups/sunan-db-YYYYMMDDHHMMSS.dump | head
```

恢复前必须停 API：

```bash
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env stop sunan-api
```

恢复到现有数据库会覆盖数据，需谨慎：

```bash
docker exec -i sunan-db pg_restore -U sunan -d sunan --clean --if-exists < /dev/sunan/backups/sunan-db-YYYYMMDDHHMMSS.dump
docker compose --env-file /dev/sunan/deploy/.env up -d sunan-api
```

## Redis 备份

Redis 使用 AOF，数据目录：

```text
/dev/sunan/sunan-redis/data
```

备份：

```bash
TS=$(date +%Y%m%d%H%M%S)
tar -czf /dev/sunan/backups/sunan-redis-data-$TS.tar.gz -C /dev/sunan/sunan-redis data
chmod 600 /dev/sunan/backups/sunan-redis-data-$TS.tar.gz
```

恢复前停 Redis 和 API：

```bash
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env stop sunan-api sunan-redis
tar -xzf /dev/sunan/backups/sunan-redis-data-YYYYMMDDHHMMSS.tar.gz -C /dev/sunan/sunan-redis
docker compose --env-file /dev/sunan/deploy/.env up -d sunan-redis sunan-api
```

## OSS / MinIO 备份

对象文件目录：

```text
/dev/sunan/sunan-oss/data
```

备份：

```bash
TS=$(date +%Y%m%d%H%M%S)
tar -czf /dev/sunan/backups/sunan-oss-data-$TS.tar.gz -C /dev/sunan/sunan-oss data
chmod 600 /dev/sunan/backups/sunan-oss-data-$TS.tar.gz
```

对象存储可能较大，长期建议使用 `rsync` 到独立磁盘或云存储。

## 配置备份

备份部署配置、Nginx、证书副本、企业微信 IP 状态：

```bash
TS=$(date +%Y%m%d%H%M%S)
tar -czf /dev/sunan/backups/sunan-config-$TS.tar.gz \
  /dev/sunan/deploy \
  /dev/sunan/sunan-nginx/conf.d \
  /dev/sunan/sunan-nginx/certs \
  /dev/sunan/sunan-nginx/acme \
  /dev/sunan/sunan-wecom-ips
chmod 600 /dev/sunan/backups/sunan-config-$TS.tar.gz
```

注意：该备份包含 `.env` 和私钥，只能保存在安全位置。

## 源码备份

部署脚本会自动把旧源码移动到：

```text
/dev/sunan/sunan-source/backup-YYYYMMDDHHMMSS
```

如需手动备份当前源码：

```bash
TS=$(date +%Y%m%d%H%M%S)
cp -a /dev/sunan/sunan-source/current /dev/sunan/sunan-source/backup-manual-$TS
```

## 推荐备份顺序

上线前完整备份：

```bash
set -e
mkdir -p /dev/sunan/backups
TS=$(date +%Y%m%d%H%M%S)
docker exec sunan-db pg_dump -U sunan -d sunan -Fc > /dev/sunan/backups/sunan-db-$TS.dump
tar -czf /dev/sunan/backups/sunan-config-$TS.tar.gz /dev/sunan/deploy /dev/sunan/sunan-nginx/conf.d /dev/sunan/sunan-nginx/certs /dev/sunan/sunan-nginx/acme /dev/sunan/sunan-wecom-ips
tar -czf /dev/sunan/backups/sunan-redis-data-$TS.tar.gz -C /dev/sunan/sunan-redis data
echo backup-$TS
```

OSS 数据量大时可单独安排窗口备份。
