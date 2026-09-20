#!/usr/bin/env bash
set -euo pipefail
umask 077
release=20260909153841
backup=/var/backups/sunan/0.0.8-$release
sourcebase=/dev/sunan/sunan-source
compose() { docker compose --env-file /dev/sunan/deploy/.env -f /dev/sunan/deploy/docker-compose.yml "$@"; }
test -f "$backup/rehearsal-result.txt"
grep -q 'REHEARSAL=PASS' "$backup/rehearsal-result.txt"
for service in api web nginx; do
  test "$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.version"}}' "sunan-$service:0.0.8")" = 0.0.8
done
test -d "$sourcebase/upload-$release"
test ! -e "$sourcebase/backup-$release"
cp /dev/sunan/deploy/.env /dev/sunan/deploy/.env.bak-$release
cp /dev/sunan/deploy/docker-compose.yml /dev/sunan/deploy/docker-compose.yml.bak-$release
test "$(grep -c '^SUNAN_VERSION=' /dev/sunan/deploy/.env)" = 1
sed 's/^SUNAN_VERSION=.*/SUNAN_VERSION=0.0.8/' /dev/sunan/deploy/.env > /dev/sunan/deploy/.env.new-$release
chmod 600 /dev/sunan/deploy/.env.new-$release
mv "$sourcebase/current" "$sourcebase/backup-$release"
mv "$sourcebase/upload-$release" "$sourcebase/current"
ln -sfn "$sourcebase/current" "$sourcebase/latest"
cp "$sourcebase/current/deploy/docker-compose.yml" /dev/sunan/deploy/docker-compose.yml.new-$release
mv /dev/sunan/deploy/docker-compose.yml.new-$release /dev/sunan/deploy/docker-compose.yml
mv /dev/sunan/deploy/.env.new-$release /dev/sunan/deploy/.env
unset SUNAN_VERSION SUNAN_SOURCE_DIR
compose config --quiet
grep '^SUNAN_VERSION=' /dev/sunan/deploy/.env
date -u +%Y-%m-%dT%H:%M:%SZ > "$backup/cutover-start.txt"
compose stop -t 45 sunan-api
docker exec sunan-db pg_dump -U sunan -d sunan -Fc > "$backup/database-cutover.dump"
docker exec -i sunan-db pg_restore --list < "$backup/database-cutover.dump" > "$backup/database-cutover.list"
sha256sum "$backup/database-cutover.dump" > "$backup/database-cutover.sha256"
compose up -d --no-deps --no-build --wait --wait-timeout 150 sunan-api
docker exec sunan-nginx nginx -t
docker exec sunan-nginx nginx -s reload
curl --retry 5 --retry-delay 2 --retry-all-errors -fsS https://api.qzssncb.com/api/health/ready
test "$(docker exec sunan-db psql -U sunan -d sunan -Atc 'SELECT COUNT(*) FROM migrations')" = 27
compose up -d --no-deps --no-build --force-recreate sunan-web
compose up -d --no-deps --no-build --force-recreate sunan-nginx
docker exec sunan-nginx nginx -t
curl --retry 5 --retry-delay 2 --retry-all-errors -fsS https://api.qzssncb.com/api/health/ready
curl --retry 5 --retry-delay 2 --retry-all-errors -fsSI https://app.qzssncb.com
compose ps
docker inspect -f '{{.Name}} {{.Config.Image}} {{.Image}} {{index .Config.Labels "org.opencontainers.image.version"}}' sunan-api sunan-web sunan-nginx | tee "$backup/running-images.txt"
date -u +%Y-%m-%dT%H:%M:%SZ > "$backup/cutover-complete.txt"
