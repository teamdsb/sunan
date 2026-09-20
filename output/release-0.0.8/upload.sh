#!/usr/bin/env bash
set -euo pipefail
release=20260909153841
key=/Users/yuan/Downloads/teamdsb-sunan.pem
remote=root@39.106.103.45
archive=output/release-0.0.8/source.tar.gz
git ls-files -z --cached --others --exclude-standard | COPYFILE_DISABLE=1 tar --no-xattrs --null --exclude='output/*' --exclude='.playwright-cli/*' --exclude='node_modules/*' --exclude='*/node_modules/*' --exclude='*/dist/*' --exclude='*/dist-review-no-mock/*' --exclude='*/.env' --exclude='*/.env.local' --exclude='*/.env.*.local' -czf "$archive" -T -
tar -tzf "$archive" | awk '/(^|\/)\.env$|(^|\/)node_modules\/|(^|\/)dist\/|^output\/|^\.playwright-cli\// { print; bad=1 } END { exit bad }'
shasum -a 256 "$archive"
du -h "$archive"
scp -i "$key" "$archive" "$remote:/var/backups/sunan/0.0.8-$release/source.tar.gz"
digest=$(shasum -a 256 "$archive" | awk '{print $1}')
ssh -i "$key" "$remote" "set -e
cd /var/backups/sunan/0.0.8-$release
echo '$digest  source.tar.gz' | sha256sum -c -
mkdir /dev/sunan/sunan-source/upload-$release
tar -xzf source.tar.gz -C /dev/sunan/sunan-source/upload-$release
df -h /dev/sunan
"
