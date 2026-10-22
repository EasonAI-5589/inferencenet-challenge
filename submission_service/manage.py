"""Local operator tools. Run as the service account; passwords never enter argv."""
import argparse
import getpass
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import time

from werkzeug.security import generate_password_hash
from .storage import migrate_layout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("cleanup", "reset-password", "migrate-layout"))
    parser.add_argument("--username")
    parser.add_argument("--apply", action="store_true", help="Apply the verified offline layout migration")
    args = parser.parse_args()
    data = Path(os.environ.get("SUBMIT_DATA_DIR", "/srv/inferencenet-submit/data"))
    staging = Path(os.environ.get("SUBMIT_STAGING_DIR", "/srv/inferencenet-submit/staging"))
    if args.command == "migrate-layout":
        print(json.dumps(migrate_layout(data, apply=args.apply), indent=2))
        return
    with sqlite3.connect(data / "intake.sqlite3", timeout=30) as db:
        if args.command == "reset-password":
            row = db.execute("SELECT id FROM users WHERE username=?", ((args.username or "").lower(),)).fetchone()
            if not row:
                raise SystemExit("Account not found")
            password = getpass.getpass("New password: ")
            if not 12 <= len(password) <= 128 or password != getpass.getpass("Confirm password: "):
                raise SystemExit("Passwords must match and contain 12–128 characters")
            db.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(password, method="scrypt:32768:8:1"), row[0]))
            db.execute("DELETE FROM sessions WHERE owner=?", (row[0],))
            print("Password changed; existing sessions revoked")
        else:
            cutoff = time.time() - 7320
            db.execute("UPDATE submissions SET state='expired' WHERE state='uploading' AND expires<?", (cutoff,))
            rows = db.execute("SELECT upload_id FROM submissions WHERE state='expired' AND expires<?", (cutoff,)).fetchall()
            for (upload_id,) in rows:
                if not re.fullmatch(r"upl-[0-9a-f]{24}", upload_id):
                    raise RuntimeError("Unexpected stored upload ID")
                folder = staging / upload_id
                if folder.is_dir() and not folder.is_symlink():
                    shutil.rmtree(folder)
            db.execute("DELETE FROM sessions WHERE expires<?", (time.time(),))
            print(f"Expired staging cleanup checked {len(rows)} uploads")


if __name__ == "__main__":
    main()
