#!/usr/bin/env bash
set -euo pipefail
umask 077
release=20260909153841
backup=/var/backups/sunan/0.0.8-$release
export SUNAN_SOURCE_DIR=/dev/sunan/sunan-source/upload-$release
export SUNAN_VERSION=0.0.8
checkdb=sunan-release-check-$release
if docker inspect "$checkdb" >/dev/null 2>&1; then exit 1; fi
docker run -d --name "$checkdb" --network sunan --memory=256m --tmpfs /var/lib/postgresql/data:rw,size=128m -e POSTGRES_DB=sunan -e POSTGRES_USER=sunan -e POSTGRES_PASSWORD=sunan-release-isolated-check sunan-db:16-stable >/dev/null
trap 'docker rm -f "$checkdb" >/dev/null' EXIT
for attempt in $(seq 1 30); do
  if docker exec "$checkdb" pg_isready -U sunan -d sunan >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$checkdb" pg_isready -U sunan -d sunan
docker exec -i "$checkdb" pg_restore --exit-on-error -U sunan -d sunan < "$backup/database.dump"
docker exec "$checkdb" psql -U sunan -d sunan -Atc 'SELECT COUNT(*) FROM files' > "$backup/rehearsal-files-before.txt"
docker compose -p deploy --env-file /dev/sunan/deploy/.env -f "$SUNAN_SOURCE_DIR/deploy/docker-compose.yml" run -T --rm --no-deps --name sunan-migration-check-$release -e DB_HOST="$checkdb" -e DB_PASSWORD=sunan-release-isolated-check -e SUNAN_VERSION=0.0.8 --entrypoint node sunan-api dist/database/run-migrations.js
docker compose -p deploy --env-file /dev/sunan/deploy/.env -f "$SUNAN_SOURCE_DIR/deploy/docker-compose.yml" run -T --rm --no-deps --name sunan-seed-check-$release -e DB_HOST="$checkdb" -e DB_PASSWORD=sunan-release-isolated-check -e SUNAN_VERSION=0.0.8 --entrypoint node sunan-api dist/database/seeds/run-seed.js
docker exec "$checkdb" psql -U sunan -d sunan -Atc 'SELECT COUNT(*) FROM files' > "$backup/rehearsal-files-after.txt"
cmp "$backup/rehearsal-files-before.txt" "$backup/rehearsal-files-after.txt"
test "$(docker exec "$checkdb" psql -U sunan -d sunan -Atc 'SELECT COUNT(*) FROM migrations')" = 27
docker exec "$checkdb" psql -U sunan -d sunan -Atc "SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 2"
docker exec "$checkdb" psql -U sunan -d sunan -Atc "SELECT COUNT(*) FROM pg_trigger WHERE tgname IN ('guard_recycled_file_key', 'guard_print_snapshot_file')"
printf '%s\n' 'REHEARSAL=PASS; migrations=27; file rows preserved; seed completed' | tee "$backup/rehearsal-result.txt"
