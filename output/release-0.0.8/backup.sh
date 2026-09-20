#!/usr/bin/env bash
set -euo pipefail
umask 077
release=20260909153841
backup=/var/backups/sunan/0.0.8-$release
mkdir -p "$backup"
chmod 700 /var/backups/sunan "$backup"
docker exec sunan-db pg_dump -U sunan -d sunan -Fc > "$backup/database.dump"
docker exec -i sunan-db pg_restore --list < "$backup/database.dump" > "$backup/database.list"
tar -czf "$backup/config.tar.gz" -C /dev/sunan deploy sunan-nginx/conf.d sunan-nginx/certs sunan-nginx/acme sunan-wecom-ips
tar -czf "$backup/oss.tar.gz" -C /dev/sunan/sunan-oss data
python3 - <<'PY'
import json, subprocess
args = json.loads(subprocess.check_output(['docker', 'inspect', 'sunan-redis']))[0]['Config']['Cmd']
index = max(i for i, value in enumerate(args) if value == '--user')
user = args[index + 1]
password = next(value[1:] for value in args[index + 2:] if value.startswith('>'))
subprocess.run(['docker', 'exec', '-e', 'REDISCLI_AUTH=' + password, 'sunan-redis', 'redis-cli', '--user', user, '--rdb', '/tmp/sunan-release-008.rdb'], check=True)
PY
docker cp sunan-redis:/tmp/sunan-release-008.rdb "$backup/redis.rdb"
docker exec sunan-redis redis-check-rdb /tmp/sunan-release-008.rdb
for service in api web nginx; do
  id=$(docker inspect -f '{{.Image}}' "sunan-$service")
  docker tag "$id" "sunan-$service:rollback-$release"
  docker inspect -f '{{.Name}} {{.Config.Image}} {{.Image}}' "sunan-$service"
done > "$backup/previous-images.txt"
cd "$backup"
sha256sum database.dump config.tar.gz oss.tar.gz redis.rdb > SHA256SUMS
sha256sum -c SHA256SUMS
tar -tzf oss.tar.gz > oss.list
tar -tzf config.tar.gz > config.list
du -sh "$backup"
cat previous-images.txt
printf 'BACKUP=%s\n' "$backup"
