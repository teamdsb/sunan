#!/usr/bin/env bash
set -euo pipefail
umask 077
release=20260909153841
export SUNAN_VERSION=0.0.8
export SUNAN_SOURCE_DIR=/dev/sunan/sunan-source/upload-$release
backup=/var/backups/sunan/0.0.8-$release
docker run --rm --network none --entrypoint node -v "$SUNAN_SOURCE_DIR:/source:ro" sunan-api:0.0.7 -e '
const fs = require("fs");
for (const file of ["package.json", "apps/api/package.json", "apps/web/package.json"]) {
  if (JSON.parse(fs.readFileSync("/source/" + file)).version !== "0.0.8") throw Error(file);
}
for (const file of ["apps/api/.env", "apps/web/.env", "deploy/.env"]) {
  if (fs.existsSync("/source/" + file)) throw Error("Unexpected private environment file");
}
console.log("SOURCE_VERSION=0.0.8 MIGRATIONS=" + fs.readdirSync("/source/apps/api/src/database/migrations").filter(x => x.endsWith(".ts")).length);
'
docker compose -p deploy --env-file /dev/sunan/deploy/.env -f "$SUNAN_SOURCE_DIR/deploy/docker-compose.yml" config --quiet
docker compose -p deploy --env-file /dev/sunan/deploy/.env -f "$SUNAN_SOURCE_DIR/deploy/docker-compose.yml" --progress plain build sunan-api sunan-web sunan-nginx > "$backup/build.log" 2>&1 || { tail -n 60 "$backup/build.log"; exit 1; }
docker image inspect -f '{{.RepoTags}} {{.Id}} {{.Created}} {{index .Config.Labels "org.opencontainers.image.version"}}' sunan-api:0.0.8 sunan-web:0.0.8 sunan-nginx:0.0.8 | tee "$backup/new-images.txt"
docker run --rm --network none --entrypoint node sunan-api:0.0.8 -e 'const fs = require("fs"); if(require("./package.json").version !== "0.0.8") throw Error("version"); if(!fs.existsSync("dist/main.js")) throw Error("entry"); console.log(process.version, "API_PACKAGE=0.0.8", "MIGRATIONS=" + fs.readdirSync("dist/database/migrations").filter(x=>x.endsWith(".js")).length);'
docker inspect -f '{{.Name}} {{.Image}}' sunan-api sunan-web sunan-nginx
