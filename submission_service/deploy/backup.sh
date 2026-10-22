#!/usr/bin/env bash
set -euo pipefail
umask 077
destination=/var/backups/inferencenet-submit
install -d -m 700 -o root -g root "$destination"
snapshot=$(mktemp -d "$destination/.snapshot.XXXXXXXX")
install -d -m 700 "$snapshot/database"
trap 'rm -f "$snapshot/database/intake.sqlite3"; rmdir "$snapshot/database" "$snapshot"' EXIT
python3 - "$snapshot/database/intake.sqlite3" <<'PY'
import sqlite3, sys
with sqlite3.connect('/srv/inferencenet-submit/data/intake.sqlite3') as source:
    with sqlite3.connect(sys.argv[1]) as destination:
        source.backup(destination)
        # Only sealed packages are recoverable checkpoints. In-flight bytes may change.
        destination.execute("UPDATE submissions SET state='expired' WHERE state IN ('uploading','validating')")
PY
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="$destination/intake-$timestamp.tar.gz"
# DB snapshot precedes immutable artifact copying: new extra artifacts are harmless,
# while every accepted DB record already has its sealed files and receipt on disk.
tar -czf "$archive.tmp" -C / \
  --exclude='srv/inferencenet-submit/data/intake.sqlite3*' \
  --exclude='srv/inferencenet-submit/data/.locks' \
  --exclude='srv/inferencenet-submit/staging' \
  --exclude='srv/inferencenet-submit/app' \
  etc/caddy etc/ssh/sshd_config.d/00-inferencenet.conf \
  etc/ufw etc/apt/apt.conf.d/20auto-upgrades \
  etc/systemd/system/inferencenet-intake.service \
  etc/systemd/system/inferencenet-cleanup.service \
  etc/systemd/system/inferencenet-cleanup.timer \
  usr/local/sbin/inferencenet-backup srv/inferencenet-submit \
  -C "$snapshot" database
mv "$archive.tmp" "$archive"
sha256sum "$archive" > "$archive.sha256"
find "$destination" -maxdepth 1 -type f \( -name 'intake-*.tar.gz' -o -name 'intake-*.tar.gz.sha256' \) -mtime +7 -delete
echo "$archive"
