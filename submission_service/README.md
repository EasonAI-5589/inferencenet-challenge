# Self-hosted submission intake

Production: <https://submit.inferencenet.cn/submit/benchmark/>,
<https://submit.inferencenet.cn/submit/harness/>,
<https://submit.inferencenet.cn/submit/failure-case/>.

This is a Flask + Gunicorn service behind Caddy. It shares the existing v2 design
tokens, fonts, theme/language storage keys and logo. It runs separately from the
GitHub Pages website; its private runtime files never belong in this repository.

Users register with a username and a 12–128 character password. Sessions are
server-side, owner-bound, seven days long, and stored by token hash. Production
uses a host-only Secure/HttpOnly/SameSite cookie and CSRF + Origin checks. No HF
account, mail service or client-side access token is required. Password hashes
use scrypt. Account recovery is a local operator action; no email recovery is
claimed. Registration/login limits apply per IP behind the single Caddy hop.

## Storage and protocol

The user chose the existing system disk; a separate disk is not a prerequisite.

```text
/srv/inferencenet-submit/data/
  intake.sqlite3                 # users, sessions, ownership, versions, inventory
  submissions/
    benchmark/<id>/v<version>/   # immutable payload + generated submission.json
    harness/<id>/v<version>/
    failure-case/<id>/v<version>/
  receipts/<id>/v<version>.json
/srv/inferencenet-submit/staging/<upload_id>/
```

The dedicated non-login service account owns data/staging (700). The app code is
root-owned, read-only to the service, and runs under a restricted systemd unit.
Its single writable parent bind mount keeps staging/data on the same mount for
atomic rename; Unix ownership still limits writes to data/staging.
The application binds only `127.0.0.1:8100` and trusts exactly one forwarding hop.

See [the current server API](../docs/submissions/SELF-HOSTED.md). The historical
HF-first proposal remains in API-DESIGN.md for background; it does not define the
deployed authentication or storage transport.

## Local development and checks

Python 3.12 or newer:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r submission_service/requirements.txt pytest
SUBMIT_DATA_DIR=/tmp/inferencenet-local/data \
SUBMIT_STAGING_DIR=/tmp/inferencenet-local/staging \
  .venv/bin/python -m submission_service.app
```

The local-only runner binds `127.0.0.1:4198` and uses an insecure development
cookie. Gunicorn's factory always retains production Secure cookies.

```sh
python -m pytest submission_service/tests -q
node scripts/check.mjs
node --check submission_service/web/intake.js
```

The synthetic templates are copied from the reviewed v0.1 fixtures. They are
never executed by intake. The failure-case demo explicitly retains unresolved
runtime and score fields. Loading it links the newest benchmark/harness receipts
in the current account; a mismatch with the toy task/split is rejected on submit.
Real cases require real fixed runtime evidence. No score, reproduction, official
acceptance or automatic evaluation is inferred from upload success.

## Deployment

The reviewed bundle contains `submission_service/`, `v2/v2.css` and the two
required font files. Exclude caches, virtual environments and runtime data.
Upload the bundle to `/tmp/inferencenet-intake-source.tar.gz`, and run the reviewed
`deploy/install.sh` as root with a unique `intake-...` release name. It installs
dependencies in a dedicated venv, enables the intake/cleanup units, waits for
loopback health, and switches Caddy after the application is ready. Follow logs
with `journalctl -u inferencenet-intake -f`. No credentials are embedded in deploy
sources. Keep the workstation SSH identity and host pinning outside Git.

The installer preflights the classified storage layout, stops intake/cleanup and
backup timers, takes a pre-migration backup, then migrates existing directories
before activating the new release. Each submission directory is renamed on the
same filesystem after all package and receipt hashes pass verification. IDs,
versions, ownership, manifests, receipts and API references do not change.
Unknown directories, conflicting destinations or mismatching bytes stop the
preflight without moving anything. An interrupted move can be rerun safely.

For a manual migration, stop intake, cleanup and backup jobs first, preserve a
backup, then run from the new release as the service account:

```sh
python -m submission_service.manage migrate-layout         # verify and preview
python -m submission_service.manage migrate-layout --apply # verify and move
```

Restart intake and the cleanup/backup timers afterwards. If apply fails, keep
intake stopped until the conflict is resolved and the migration completes.
Rollback by switching the release symlink only to a release supporting classified
paths. The original flat-layout release needs an offline reverse migration or
compatible restore plan; it cannot read the new paths. Keep data/staging intact.
The initial Caddy placeholder configuration is preserved privately on the server.

The existing daily backup timer now uses SQLite's online backup API. It snapshots
the DB before copying immutable accepted packages and receipts; in-flight records
are marked expired in the backup copy, never in the live DB. The archive stores
the stable database at `database/intake.sqlite3`; restore that file to data/ while
the intake service is stopped, without an old WAL/SHM alongside it. Restore the
sealed package/receipt directories, fix ownership, then start and verify intake.
Production artifacts are never deleted by cleanup; only abandoned staging expires
after 24 hours plus the maximum in-flight lease. The existing ongoing off-machine
backup destination remains an operator configuration item.

An operator can reset a password without putting it in shell history:

```sh
cd /srv/inferencenet-submit/app/current
sudo -u inferencenet-submit /srv/inferencenet-submit/app/venv/bin/python \
  -m submission_service.manage reset-password --username ACCOUNT
```

This revokes the account's current sessions. Admission limits are 1 GiB / 2,000
files per version, 5 GiB / 10,000 retained files per account, 100 GiB / 200,000
retained files globally, and a 5 GiB free-space reserve. JSON/TOML total is capped
at 32 MiB; per-document JSON/TOML is 4 MiB, per JSONL line 1 MiB. Admission checks,
streamed bytes, hashes, portable paths, case-fold collisions and type validation
all run on the server. Submitted code is never imported, built or executed.
