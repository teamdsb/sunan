#!/usr/bin/env bash
set -euo pipefail
release=20260909153841
cd /dev/sunan/deploy
printf '%s\n' '-- compose --'
docker compose --env-file /dev/sunan/deploy/.env ps
printf '%s\n' '-- versions --'
grep '^SUNAN_VERSION=' /dev/sunan/deploy/.env
docker inspect -f '{{.Name}} image={{.Config.Image}} id={{.Image}} label={{index .Config.Labels "org.opencontainers.image.version"}}' sunan-api sunan-web sunan-nginx
printf '%s\n' '-- migrations --'
docker exec sunan-db psql -U sunan -d sunan -Atc 'SELECT COUNT(*) FROM migrations'
docker exec sunan-db psql -U sunan -d sunan -Atc 'SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 4'
printf '%s\n' '-- health --'
curl --fail --silent https://api.qzssncb.com/api/health
printf '\n'
curl --fail --silent https://api.qzssncb.com/api/health/ready
printf '\n'
curl --fail --silent --head https://app.qzssncb.com | head -n 5
printf '%s\n' '-- auth boundary --'
code=$(curl -sS -o /tmp/unauth.json -w '%{http_code}' https://api.qzssncb.com/api/v1/certificates)
test "$code" = 401
echo "certificates=$code"
printf '%s\n' '-- web assets --'
curl -fsS https://app.qzssncb.com >/tmp/sunan-web.html
asset=$(sed -nE 's/.*(\/assets\/[^" ]+\.js).*/\1/p' /tmp/sunan-web.html | head -n 1)
test -n "$asset"
curl -fsS "https://app.qzssncb.com$asset" >/tmp/sunan-web-main.js
test -s /tmp/sunan-web-main.js
echo "main_asset=$asset"
printf '%s\n' '-- source and rollback --'
test -L /dev/sunan/sunan-source/latest
readlink /dev/sunan/sunan-source/latest
test -d /dev/sunan/sunan-source/backup-$release
test -f /dev/sunan/deploy/.env.bak-$release
test -f /dev/sunan/deploy/docker-compose.yml.bak-$release
ls -lh /var/backups/sunan/0.0.8-$release/SHA256SUMS /var/backups/sunan/0.0.8-$release/rehearsal-result.txt /var/backups/sunan/0.0.8-$release/database-cutover.sha256 /var/backups/sunan/0.0.8-$release/running-images.txt
cd /var/backups/sunan/0.0.8-$release
sha256sum -c SHA256SUMS
sha256sum -c database-cutover.sha256
printf '%s\n' '-- rollback tags --'
docker image inspect sunan-api:rollback-$release sunan-web:rollback-$release sunan-nginx:rollback-$release >/dev/null
echo rollback-tags=ok
printf '%s\n' '-- timers --'
systemctl is-active certbot.timer sunan-wecom-callback-ip-sync.timer
printf '%s\n' '-- recent errors --'
docker logs --since 10m sunan-api 2>&1 | grep -Ei 'error|exception|failed' || true
docker logs --since 10m sunan-nginx 2>&1 | grep -Ei 'error|crit|alert|emerg' || true
printf '%s\n' '-- disk --'
df -h /dev/sunan
du -sh /var/backups/sunan/0.0.8-$release /dev/sunan/sunan-source/current
