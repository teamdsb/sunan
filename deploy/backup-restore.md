---
status: operations
owner: operations
updated: 2026-09-20
replaces: []
replaced_by: []
---
# 备份与恢复手册

所有生产数据在磁盘目录 `/srv/sunan` 下，备份存放于 `/var/backups/sunan`。禁止把生产数据或唯一备份放在 `/dev` 内存文件系统。备份前先确认磁盘空间和挂载类型：

```bash
df -h
findmnt -T /srv/sunan
findmnt -T /var/backups
du -sh /srv/sunan/*
```

建议备份目录：

```text
/var/backups/sunan
```

创建：

```bash
mkdir -p /var/backups/sunan
chmod 700 /var/backups/sunan
```

## PostgreSQL 备份

逻辑备份：

```bash
TS=$(date +%Y%m%d%H%M%S)
docker exec sunan-db pg_dump -U sunan -d sunan -Fc > /var/backups/sunan/sunan-db-$TS.dump
chmod 600 /var/backups/sunan/sunan-db-$TS.dump
```

验证备份文件：

```bash
docker exec -i sunan-db pg_restore --list < /var/backups/sunan/sunan-db-YYYYMMDDHHMMSS.dump | head
```

恢复前必须停 API：

```bash
cd /srv/sunan/deploy
docker compose --env-file /srv/sunan/deploy/.env stop sunan-api
```

恢复到现有数据库会覆盖数据，需谨慎：

```bash
docker exec -i sunan-db pg_restore -U sunan -d sunan --clean --if-exists < /var/backups/sunan/sunan-db-YYYYMMDDHHMMSS.dump
docker compose --env-file /srv/sunan/deploy/.env up -d sunan-api
```

## Redis 备份

Redis 使用 AOF，数据目录：

```text
/srv/sunan/sunan-redis/data
```

备份：

```bash
TS=$(date +%Y%m%d%H%M%S)
tar -czf /var/backups/sunan/sunan-redis-data-$TS.tar.gz -C /srv/sunan/sunan-redis data
chmod 600 /var/backups/sunan/sunan-redis-data-$TS.tar.gz
```

恢复前停 Redis 和 API：

```bash
cd /srv/sunan/deploy
docker compose --env-file /srv/sunan/deploy/.env stop sunan-api sunan-redis
tar -xzf /var/backups/sunan/sunan-redis-data-YYYYMMDDHHMMSS.tar.gz -C /srv/sunan/sunan-redis
docker compose --env-file /srv/sunan/deploy/.env up -d sunan-redis sunan-api
```

## OSS / MinIO 备份

对象文件目录：

```text
/srv/sunan/sunan-oss/data
```

备份：

```bash
TS=$(date +%Y%m%d%H%M%S)
tar -czf /var/backups/sunan/sunan-oss-data-$TS.tar.gz -C /srv/sunan/sunan-oss data
chmod 600 /var/backups/sunan/sunan-oss-data-$TS.tar.gz
```

对象存储可能较大，长期建议使用 `rsync` 到独立磁盘或云存储。

## 配置备份

备份部署配置、Nginx、证书副本、企业微信 IP 状态：

```bash
TS=$(date +%Y%m%d%H%M%S)
tar -czf /var/backups/sunan/sunan-config-$TS.tar.gz \
  /srv/sunan/deploy \
  /srv/sunan/sunan-nginx/conf.d \
  /srv/sunan/sunan-nginx/certs \
  /srv/sunan/sunan-nginx/acme \
  /srv/sunan/sunan-wecom-ips
chmod 600 /var/backups/sunan/sunan-config-$TS.tar.gz
```

注意：该备份包含 `.env` 和私钥，只能保存在安全位置。

## 源码备份

部署脚本会自动把旧源码移动到：

```text
/srv/sunan/sunan-source/backup-YYYYMMDDHHMMSS
```

如需手动备份当前源码：

```bash
TS=$(date +%Y%m%d%H%M%S)
cp -a /srv/sunan/sunan-source/current /srv/sunan/sunan-source/backup-manual-$TS
```

## 推荐备份顺序

上线前完整备份：

```bash
set -e
mkdir -p /var/backups/sunan
TS=$(date +%Y%m%d%H%M%S)
docker exec sunan-db pg_dump -U sunan -d sunan -Fc > /var/backups/sunan/sunan-db-$TS.dump
tar -czf /var/backups/sunan/sunan-config-$TS.tar.gz /srv/sunan/deploy /srv/sunan/sunan-nginx/conf.d /srv/sunan/sunan-nginx/certs /srv/sunan/sunan-nginx/acme /srv/sunan/sunan-wecom-ips
tar -czf /var/backups/sunan/sunan-redis-data-$TS.tar.gz -C /srv/sunan/sunan-redis data
echo backup-$TS
```

OSS 数据量大时可单独安排窗口备份。
