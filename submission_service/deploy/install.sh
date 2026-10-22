#!/usr/bin/env bash
# Run as root after uploading this reviewed source bundle to /tmp.
set -euo pipefail
exec >>/var/log/inferencenet-app-deploy.log 2>&1
release=${1:?release name required}
[[ "$release" =~ ^intake-[a-z0-9-]+$ ]] || exit 2
base=/srv/inferencenet-submit/app
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y python3-venv
install -d -m 755 -o root -g root "$base" "$base/releases" "$base/releases/$release"
tar -xzf /tmp/inferencenet-intake-source.tar.gz -C "$base/releases/$release"
chown -R root:root "$base/releases/$release"
chmod -R go-w "$base/releases/$release"
if [ ! -x "$base/venv/bin/python" ]; then
  python3 -m venv "$base/venv"
fi
"$base/venv/bin/python" -m pip install --disable-pip-version-check -r "$base/releases/$release/submission_service/requirements.txt"
install -d -m 700 -o root -g root /root/inferencenet-bootstrap
if [ ! -f /root/inferencenet-bootstrap/Caddyfile.pre-intake ]; then
  cp /etc/caddy/Caddyfile /root/inferencenet-bootstrap/Caddyfile.pre-intake
fi
cd "$base/releases/$release"
# Preflight while the old release is live; repeat verification with all writers stopped.
runuser -u inferencenet-submit -- "$base/venv/bin/python" -m submission_service.manage migrate-layout
if [ -f /srv/inferencenet-submit/data/intake.sqlite3 ]; then
  systemctl stop inferencenet-intake.service inferencenet-cleanup.timer inferencenet-cleanup.service inferencenet-backup.timer
  systemctl start inferencenet-backup.service
fi
# On migration failure, leave intake stopped. Rerunning safely finishes partial moves.
runuser -u inferencenet-submit -- "$base/venv/bin/python" -m submission_service.manage migrate-layout --apply
ln -sfnT "$base/releases/$release" "$base/current"
install -m 644 "$base/current/submission_service/deploy/intake.service" /etc/systemd/system/inferencenet-intake.service
install -m 644 "$base/current/submission_service/deploy/cleanup.service" /etc/systemd/system/inferencenet-cleanup.service
install -m 644 "$base/current/submission_service/deploy/cleanup.timer" /etc/systemd/system/inferencenet-cleanup.timer
systemctl daemon-reload
systemctl enable inferencenet-intake.service inferencenet-cleanup.timer
systemctl restart inferencenet-intake.service
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:8100/healthz >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent http://127.0.0.1:8100/healthz
install -m 700 "$base/current/submission_service/deploy/backup.sh" /usr/local/sbin/inferencenet-backup
systemctl start inferencenet-cleanup.timer
systemctl start inferencenet-backup.timer
install -m 644 "$base/current/submission_service/deploy/Caddyfile" /etc/caddy/Caddyfile
runuser -u caddy -- caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
curl --fail --silent https://submit.inferencenet.cn/healthz
systemctl start inferencenet-backup.service
printf '\nInstalled %s\n' "$release"
