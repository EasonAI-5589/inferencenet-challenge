"""Owner-bound, streaming intake. Uploaded programs are never imported or run."""
from contextlib import contextmanager
from functools import wraps
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import sqlite3
import time

from flask import Flask, g, jsonify, redirect, request, send_file, send_from_directory
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix

from .validator import SPEC_NAMES, relative_path, strict_json, validate

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
GIB = 1024 ** 3
JSON_LIMIT = 4 * 1024 ** 2
SESSION_AGE = 7 * 86400
COOKIE = "__Host-inferencenet-session"


class Problem(Exception):
    def __init__(self, status, code, message, fields=None):
        self.status, self.code, self.message, self.fields = status, code, message, fields or []


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def timestamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def identifier(prefix):
    return prefix + "-" + secrets.token_hex(12)


def sync_directory(path):
    if os.name != "nt":
        descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    # Production binds only loopback; Caddy is the single trusted forwarding hop.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
    app.config.update(DATA_DIR=os.environ.get("SUBMIT_DATA_DIR", "/srv/inferencenet-submit/data"),
                      STAGING_DIR=os.environ.get("SUBMIT_STAGING_DIR", "/srv/inferencenet-submit/staging"),
                      ORIGIN=os.environ.get("SUBMIT_ORIGIN", "https://submit.inferencenet.cn"),
                      SECURE_COOKIE=True, MAX_CONTENT_LENGTH=GIB, PACKAGE_LIMIT=GIB,
                      USER_STORAGE_LIMIT=5 * GIB, GLOBAL_STORAGE_LIMIT=100 * GIB,
                      MIN_FREE_BYTES=5 * GIB, MAX_FILES=2000, TESTING=False)
    if config:
        app.config.update(config)
    cookie_name = COOKIE if app.config["SECURE_COOKIE"] else "inferencenet-dev-session"
    data, staging = Path(app.config["DATA_DIR"]), Path(app.config["STAGING_DIR"])
    for directory in (data, staging, data / "submissions", data / "receipts", data / ".locks"):
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    database = data / "intake.sqlite3"

    class ClosingConnection(sqlite3.Connection):
        def __exit__(self, *args):
            try:
                return super().__exit__(*args)
            finally:
                self.close()

    def connect():
        db = sqlite3.connect(database, timeout=30, isolation_level=None, factory=ClosingConnection)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA busy_timeout=30000")
        return db

    with connect() as db:
        db.executescript("""
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, owner TEXT REFERENCES users(id),
          csrf TEXT NOT NULL, expires REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS submissions(id TEXT NOT NULL, version INTEGER NOT NULL,
          owner TEXT REFERENCES users(id), type TEXT NOT NULL, upload_id TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL, license TEXT NOT NULL, created TEXT NOT NULL, expires REAL NOT NULL,
          state TEXT NOT NULL, total_bytes INTEGER NOT NULL, validation TEXT, receipt TEXT,
          PRIMARY KEY(id, version));
        CREATE TABLE IF NOT EXISTS files(upload_id TEXT NOT NULL, id TEXT NOT NULL, path TEXT NOT NULL,
          bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
          lease TEXT, lease_until REAL, PRIMARY KEY(upload_id,id), UNIQUE(upload_id,path),
          FOREIGN KEY(upload_id) REFERENCES submissions(upload_id));
        CREATE TABLE IF NOT EXISTS idempotency(owner TEXT NOT NULL, operation TEXT NOT NULL,
          key TEXT NOT NULL, request_hash TEXT NOT NULL, response TEXT NOT NULL,
          PRIMARY KEY(owner, operation, key));
        CREATE TABLE IF NOT EXISTS rate_limits(bucket TEXT NOT NULL, window INTEGER NOT NULL,
          count INTEGER NOT NULL, PRIMARY KEY(bucket,window));
        """)

    @contextmanager
    def transaction():
        db = connect()
        try:
            db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    @app.before_request
    def authenticate():
        g.owner, g.session = None, None
        g.request_id = secrets.token_hex(8)
        token = request.cookies.get(cookie_name, "")
        if token and len(token) < 256:
            with connect() as db:
                row = db.execute("SELECT s.*, u.username FROM sessions s JOIN users u ON u.id=s.owner WHERE token_hash=? AND expires>?",
                                 (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()
            if row:
                g.owner, g.session = row["owner"], row
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            if request.headers.get("Origin") != app.config["ORIGIN"]:
                raise Problem(403, "origin_rejected", "Please submit from the official submission page.")
            if request.path not in ("/api/v1/auth/register", "/api/v1/auth/login"):
                require_login()
                if not hmac.compare_digest(request.headers.get("X-CSRF-Token", ""), g.session["csrf"]):
                    raise Problem(403, "csrf_rejected", "Your session changed. Refresh the page and try again.")

    @app.after_request
    def headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Request-ID"] = g.get("request_id", "")
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.errorhandler(Problem)
    def problem(error):
        return jsonify(error={"code": error.code, "message": error.message, "fields": error.fields}, request_id=g.get("request_id")), error.status

    @app.errorhandler(HTTPException)
    def http_error(error):
        return problem(Problem(error.code, "http_error", error.description))

    @app.errorhandler(Exception)
    def unexpected(error):
        app.logger.exception("Intake request failed: %s", g.get("request_id"))
        return problem(Problem(500, "server_error", "The service could not finish this request. Retry using the same submission."))

    def require_login():
        if not g.owner:
            raise Problem(401, "login_required", "Please sign in to continue.")

    def body(required, optional=()):
        if request.mimetype != "application/json":
            raise Problem(415, "json_required", "Expected a JSON request.")
        if request.content_length is not None and request.content_length > JSON_LIMIT:
            raise Problem(413, "json_too_large", "JSON must be at most 4 MiB.")
        try:
            raw = request.stream.read(JSON_LIMIT + 1)
            if len(raw) > JSON_LIMIT:
                raise Problem(413, "json_too_large", "JSON must be at most 4 MiB.")
            value = strict_json(raw.decode("utf-8"))
        except (ValueError, UnicodeError, RecursionError):
            raise Problem(400, "invalid_json", "Invalid UTF-8 JSON, duplicate keys or non-finite numbers.")
        if not isinstance(value, dict) or set(value) - set(required) - set(optional) or set(required) - set(value):
            raise Problem(422, "invalid_fields", "Missing or unexpected request fields.")
        return value

    def rate_limit(bucket, maximum, period=3600):
        window = int(time.time()) // period
        with transaction() as db:
            db.execute("DELETE FROM rate_limits WHERE window<?", (window - 2,))
            db.execute("INSERT INTO rate_limits VALUES(?,?,1) ON CONFLICT(bucket,window) DO UPDATE SET count=count+1", (bucket, window))
            count = db.execute("SELECT count FROM rate_limits WHERE bucket=? AND window=?", (bucket, window)).fetchone()[0]
        if count > maximum:
            raise Problem(429, "rate_limited", "Too many requests. Please try again later.")

    def session_response(owner, username):
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(24)
        with transaction() as db:
            db.execute("DELETE FROM sessions WHERE expires<?", (time.time(),))
            db.execute("INSERT INTO sessions VALUES(?,?,?,?)", (hashlib.sha256(token.encode()).hexdigest(), owner, csrf, time.time() + SESSION_AGE))
        response = jsonify(user={"id": owner, "username": username}, csrf_token=csrf)
        response.set_cookie(cookie_name, token, max_age=SESSION_AGE, secure=app.config["SECURE_COOKIE"], httponly=True, samesite="Lax", path="/")
        return response

    @app.get("/api/v1/session")
    def session():
        return jsonify(user={"id": g.owner, "username": g.session["username"]} if g.owner else None,
                       csrf_token=g.session["csrf"] if g.session else None,
                       limits={"package_bytes": app.config["PACKAGE_LIMIT"], "max_files": app.config["MAX_FILES"]})

    @app.post("/api/v1/auth/register")
    def register():
        rate_limit("register:" + request.remote_addr, 8)
        value = body(("username", "password"))
        username, password = value["username"], value["password"]
        if not isinstance(username, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{2,31}", username):
            raise Problem(422, "invalid_username", "Use 3–32 letters, numbers, underscores or hyphens.")
        if not isinstance(password, str) or not 12 <= len(password) <= 128:
            raise Problem(422, "invalid_password", "Use a password with 12–128 characters.")
        owner = identifier("user")
        hashed = generate_password_hash(password, method="scrypt:32768:8:1")
        try:
            with transaction() as db:
                db.execute("INSERT INTO users VALUES(?,?,?,?)", (owner, username.lower(), hashed, time.time()))
        except sqlite3.IntegrityError:
            raise Problem(409, "username_taken", "This username is already registered.")
        return session_response(owner, username.lower()), 201

    @app.post("/api/v1/auth/login")
    def login():
        rate_limit("login:" + request.remote_addr, 30)
        value = body(("username", "password"))
        if not isinstance(value["username"], str) or not isinstance(value["password"], str) or len(value["password"]) > 128:
            raise Problem(401, "invalid_credentials", "Username or password is incorrect.")
        with connect() as db:
            user = db.execute("SELECT * FROM users WHERE username=?", (value["username"].lower(),)).fetchone()
        # A fixed dummy hash avoids an account-existence timing shortcut.
        hashed = user["password_hash"] if user else app.config["DUMMY_PASSWORD_HASH"]
        valid = check_password_hash(hashed, value["password"])
        if not user or not valid:
            raise Problem(401, "invalid_credentials", "Username or password is incorrect.")
        return session_response(user["id"], user["username"])

    app.config["DUMMY_PASSWORD_HASH"] = generate_password_hash(secrets.token_urlsafe(24), method="scrypt:32768:8:1")

    @app.post("/api/v1/auth/logout")
    def logout():
        body(())
        with transaction() as db:
            db.execute("DELETE FROM sessions WHERE token_hash=?", (g.session["token_hash"],))
        response = jsonify(ok=True)
        response.delete_cookie(cookie_name, secure=app.config["SECURE_COOKIE"], httponly=True, samesite="Lax")
        return response

    def owned(db, submission_id=None, version=None, upload_id=None):
        if upload_id:
            row = db.execute("SELECT * FROM submissions WHERE upload_id=? AND owner=?", (upload_id, g.owner)).fetchone()
        else:
            row = db.execute("SELECT * FROM submissions WHERE id=? AND version=? AND owner=?", (submission_id, version, g.owner)).fetchone()
        if not row:
            raise Problem(404, "not_found", "Submission not found.")
        return row

    def inventory(entries):
        if not isinstance(entries, list) or not 3 <= len(entries) <= app.config["MAX_FILES"]:
            raise Problem(422, "invalid_inventory", "Choose a complete folder with at most 2,000 files.")
        seen, total = set(), 0
        for entry in entries:
            if not isinstance(entry, dict) or set(entry) != {"path", "bytes", "sha256"}:
                raise Problem(422, "invalid_inventory", "Each file needs path, bytes and SHA256.")
            path = entry["path"]
            if not relative_path(path) or len(path) > 240 or len(path.split("/")) > 16 or path.casefold() == "submission.json":
                raise Problem(422, "unsafe_path", "Invalid file path.")
            parts = path.casefold().split("/")
            if path.casefold() in seen or any("/".join(parts[:i]) in seen for i in range(1, len(parts))) or any(p.startswith(path.casefold() + "/") for p in seen):
                raise Problem(422, "path_collision", "Duplicate or conflicting file paths.")
            seen.add(path.casefold())
            if type(entry["bytes"]) is not int or entry["bytes"] < 0 or not isinstance(entry["sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", entry["sha256"]):
                raise Problem(422, "invalid_inventory", "Invalid file size or SHA256.")
            total += entry["bytes"]
        if total > app.config["PACKAGE_LIMIT"]:
            raise Problem(413, "package_too_large", "The submission exceeds the 1 GiB limit.")
        return total

    def initialize(kind, submission_id=None):
        require_login()
        rate_limit("init:" + g.owner, 30)
        value = body(("schema_version", "title", "license", "files"))
        if kind not in SPEC_NAMES or value["schema_version"] != "0.1.0":
            raise Problem(422, "invalid_type", "Unsupported submission type or schema.")
        for field, limit in (("title", 200), ("license", 100)):
            if not isinstance(value[field], str) or not 1 <= len(value[field].strip()) <= limit:
                raise Problem(422, "invalid_metadata", f"Please provide a valid {field}.")
        total = inventory(value["files"])
        paths = {item["path"] for item in value["files"]}
        if not {"README.md", "LICENSE", SPEC_NAMES[kind]} <= paths:
            raise Problem(422, "missing_files", "README.md, LICENSE and the type-specific JSON are required.")
        key = request.headers.get("Idempotency-Key", "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{12,128}", key):
            raise Problem(400, "idempotency_required", "A valid Idempotency-Key is required.")
        operation = "init:" + (submission_id or kind)
        request_hash = hashlib.sha256(canonical(value)).hexdigest()
        with transaction() as db:
            previous = db.execute("SELECT * FROM idempotency WHERE owner=? AND operation=? AND key=?", (g.owner, operation, key)).fetchone()
            if previous:
                if previous["request_hash"] != request_hash:
                    raise Problem(409, "idempotency_conflict", "This request key was used for different files.")
                return jsonify(json.loads(previous["response"])), 201
            version = 1
            if submission_id:
                original = db.execute("SELECT * FROM submissions WHERE id=? AND owner=? ORDER BY version DESC LIMIT 1", (submission_id, g.owner)).fetchone()
                if not original:
                    raise Problem(404, "not_found", "Submission not found.")
                kind, version = original["type"], original["version"] + 1
            else:
                submission_id = identifier({"benchmark": "bench", "harness": "harness", "failure_case": "case"}[kind])
            db.execute("UPDATE submissions SET state='expired' WHERE state='uploading' AND expires<?", (time.time(),))
            usage = db.execute("SELECT COALESCE(SUM(total_bytes),0) FROM submissions WHERE owner=? AND state!='expired'", (g.owner,)).fetchone()[0]
            global_usage = db.execute("SELECT COALESCE(SUM(total_bytes),0) FROM submissions WHERE state!='expired'").fetchone()[0]
            owner_file_count = db.execute("SELECT COUNT(*) FROM files f JOIN submissions s ON s.upload_id=f.upload_id WHERE s.owner=? AND s.state!='expired'", (g.owner,)).fetchone()[0]
            global_file_count = db.execute("SELECT COUNT(*) FROM files f JOIN submissions s ON s.upload_id=f.upload_id WHERE s.state!='expired'").fetchone()[0]
            if owner_file_count + len(value["files"]) > 10000 or global_file_count + len(value["files"]) > 200000:
                raise Problem(413, "file_quota", "File quota reached. Please contact the project team.")
            if usage + total > app.config["USER_STORAGE_LIMIT"] or global_usage + total > app.config["GLOBAL_STORAGE_LIMIT"]:
                raise Problem(413, "storage_quota", "Storage quota reached. Please contact the project team.")
            if shutil.disk_usage(data).free - total < app.config["MIN_FREE_BYTES"]:
                raise Problem(503, "storage_unavailable", "Storage is temporarily unavailable.")
            upload_id, created = identifier("upl"), timestamp()
            db.execute("INSERT INTO submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", (submission_id, version, g.owner, kind, upload_id, value["title"].strip(), value["license"].strip(), created, time.time() + 86400, "uploading", total, None, None))
            files = []
            for entry in value["files"]:
                file_id = identifier("file")
                db.execute("INSERT INTO files(upload_id,id,path,bytes,sha256) VALUES(?,?,?,?,?)", (upload_id, file_id, entry["path"], entry["bytes"], entry["sha256"]))
                files.append({"file_id": file_id, **entry, "state": "pending"})
            response = {"submission_id": submission_id, "version": version, "type": kind, "upload_id": upload_id, "state": "uploading", "files": files,
                        "manifest_metadata": {"submitter": g.owner, "created_at": created, "spec_path": SPEC_NAMES[kind]}}
            db.execute("INSERT INTO idempotency VALUES(?,?,?,?,?)", (g.owner, operation, key, request_hash, json.dumps(response)))
        return jsonify(response), 201

    @app.post("/api/v1/submissions/<kind>/init")
    def init(kind):
        return initialize(kind)

    @app.post("/api/v1/submissions/<submission_id>/versions/init")
    def new_version(submission_id):
        with connect() as db:
            original = db.execute("SELECT type FROM submissions WHERE id=? AND owner=? LIMIT 1", (submission_id, g.owner)).fetchone()
        if not original:
            raise Problem(404, "not_found", "Submission not found.")
        return initialize(original["type"], submission_id)

    @app.put("/api/v1/uploads/<upload_id>/files/<file_id>")
    def upload(upload_id, file_id):
        lease = secrets.token_hex(16)
        with transaction() as db:
            submission = owned(db, upload_id=upload_id)
            if submission["state"] != "uploading" or submission["expires"] < time.time():
                raise Problem(409, "upload_closed", "This upload is closed or expired.")
            file = db.execute("SELECT * FROM files WHERE upload_id=? AND id=?", (upload_id, file_id)).fetchone()
            if not file:
                raise Problem(404, "not_found", "File not found.")
            if request.content_length is not None and request.content_length != file["bytes"]:
                raise Problem(422, "size_mismatch", "File size differs from the frozen inventory.")
            if file["state"] == "writing" and file["lease_until"] > time.time():
                raise Problem(409, "file_busy", "This file is already uploading.")
            active = db.execute("SELECT COUNT(*) FROM files f JOIN submissions s ON s.upload_id=f.upload_id WHERE s.owner=? AND f.state='writing' AND f.lease_until>?", (g.owner, time.time())).fetchone()[0]
            if active >= 3:
                raise Problem(429, "upload_concurrency", "Wait for another upload to finish.")
            verified = file["state"] == "verified"
            db.execute("UPDATE files SET state='writing',lease=?,lease_until=? WHERE upload_id=? AND id=?", (lease, time.time() + 7320, upload_id, file_id))
        folder = staging / upload_id / "files"
        folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        temporary, target = folder / (file_id + "." + lease), folder / file_id
        size, checksum = 0, hashlib.sha256()
        try:
            with temporary.open("xb") as stream:
                while chunk := request.stream.read(1024 * 1024):
                    size += len(chunk)
                    if size > file["bytes"]:
                        raise Problem(413, "file_too_large", "Uploaded bytes exceed the declared size.")
                    checksum.update(chunk)
                    stream.write(chunk)
                stream.flush()
                os.fsync(stream.fileno())
            if size != file["bytes"] or checksum.hexdigest() != file["sha256"]:
                raise Problem(422, "hash_mismatch", "File size or SHA256 does not match. Select the original file and retry.")
            with transaction() as db:
                current = owned(db, upload_id=upload_id)
                owned_file = db.execute("SELECT lease FROM files WHERE upload_id=? AND id=?", (upload_id, file_id)).fetchone()
                if current["state"] != "uploading" or owned_file["lease"] != lease:
                    raise Problem(409, "upload_closed", "The upload changed while this file was writing.")
                if verified:
                    temporary.unlink()
                else:
                    os.replace(temporary, target)
                db.execute("UPDATE files SET state='verified',lease=NULL,lease_until=NULL WHERE upload_id=? AND id=?", (upload_id, file_id))
        except BaseException:
            temporary.unlink(missing_ok=True)
            with transaction() as db:
                db.execute("UPDATE files SET state=?,lease=NULL,lease_until=NULL WHERE upload_id=? AND id=? AND lease=?", ("verified" if verified else "pending", upload_id, file_id, lease))
            raise
        return "", 204

    def reference_check(db, kind, spec, owner):
        if kind != "failure_case":
            return
        for name, expected_type in (("benchmark_ref", "benchmark"), ("harness_ref", "harness")):
            ref = spec[name]
            if ref.get("transport") != "server":
                raise Problem(422, "reference_unavailable", "Use a receipt from an accepted submission on this service.", [name])
            row = db.execute("SELECT * FROM submissions WHERE id=? AND version=? AND owner=? AND type=? AND state='awaiting_review'", (ref["submission_id"], ref["version"], owner, expected_type)).fetchone()
            if not row or json.loads(row["receipt"])["artifact"] != ref:
                raise Problem(422, "reference_unavailable", "The referenced version or hash is unavailable to your account.", [name])
            if expected_type == "benchmark":
                benchmark = strict_json((data / "submissions" / row["id"] / f"v{row['version']}" / "benchmark.json").read_text(encoding="utf-8"))
                splits_path = data / "submissions" / row["id"] / f"v{row['version']}" / benchmark["splits_path"]
                splits = strict_json(splits_path.read_text(encoding="utf-8"))
                if spec["task_id"] not in splits.get(spec["split"], []):
                    raise Problem(422, "reference_mismatch", "Failure task/split does not belong to the referenced benchmark.")

    def status(row):
        return {"submission_id": row["id"], "version": row["version"], "type": row["type"], "title": row["title"], "license": row["license"],
                "state": row["state"], "created_at": row["created"], "total_bytes": row["total_bytes"],
                "validation": json.loads(row["validation"]) if row["validation"] else None,
                "receipt_available": bool(row["receipt"]), "execution": {"status": "not_approved"}}

    def serialize_complete(function):
        @wraps(function)
        def locked(upload_id):
            with connect() as db:
                owned(db, upload_id=upload_id)
            # Advisory locks survive process concurrency and release automatically on crashes.
            with (data / ".locks" / upload_id).open("a+b") as handle:
                handle.seek(0)
                if handle.read(1) == b"":
                    handle.write(b"0")
                    handle.flush()
                handle.seek(0)
                try:
                    if os.name == "nt":
                        import msvcrt
                        msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                    else:
                        import fcntl
                        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except OSError:
                    raise Problem(409, "validation_busy", "Validation is running. Refresh the status shortly.")
                try:
                    return function(upload_id)
                finally:
                    handle.seek(0)
                    if os.name == "nt":
                        msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
                    else:
                        fcntl.flock(handle, fcntl.LOCK_UN)
        return locked

    @app.post("/api/v1/uploads/<upload_id>/complete")
    @serialize_complete
    def complete(upload_id):
        body(())
        if not re.fullmatch(r"[A-Za-z0-9_-]{12,128}", request.headers.get("Idempotency-Key", "")):
            raise Problem(400, "idempotency_required", "A valid Idempotency-Key is required.")
        with transaction() as db:
            row = owned(db, upload_id=upload_id)
            if row["state"] == "awaiting_review":
                return jsonify(status(row))
            if row["state"] == "validation_failed":
                return jsonify(status(row)), 422
            if row["state"] not in ("uploading", "validating"):
                raise Problem(410, "upload_expired", "This upload has expired.")
            if row["expires"] < time.time() and row["state"] == "uploading":
                raise Problem(410, "upload_expired", "This upload has expired.")
            files = db.execute("SELECT * FROM files WHERE upload_id=? ORDER BY path", (upload_id,)).fetchall()
            if any(file["state"] != "verified" for file in files):
                raise Problem(409, "files_pending", "Upload and verify every file before completing.")
            db.execute("UPDATE submissions SET state='validating' WHERE upload_id=?", (upload_id,))
        # Frozen bytes + deterministic manifest allow the same operation to resume after a crash.
        destination = data / "submissions" / row["id"] / f"v{row['version']}"
        package = staging / upload_id / "package"
        manifest = {"schema_version": "0.1.0", "submission_id": row["id"], "version": row["version"], "type": row["type"],
                    "title": row["title"], "license": row["license"], "submitter": row["owner"], "created_at": row["created"],
                    "spec_path": SPEC_NAMES[row["type"]], "files": [{key: file[key] for key in ("path", "bytes", "sha256")} for file in files]}
        manifest_bytes = canonical(manifest)
        if not destination.exists():
            package.mkdir(parents=True, exist_ok=True, mode=0o700)
            for file in files:
                target = package / file["path"]
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                if not target.exists():
                    try:
                        os.link(staging / upload_id / "files" / file["id"], target)
                    except FileExistsError:
                        pass
            manifest_path = package / "submission.json"
            try:
                with manifest_path.open("xb") as stream:
                    stream.write(manifest_bytes)
                    stream.flush()
                    os.fsync(stream.fileno())
            except FileExistsError:
                if manifest_path.read_bytes() != manifest_bytes:
                    raise Problem(409, "archive_conflict", "The existing manifest differs from this frozen upload.")
        else:
            package = destination
            if (package / "submission.json").read_bytes() != manifest_bytes:
                raise Problem(409, "archive_conflict", "The sealed version already contains different files.")
        report = validate(package)
        if report["pass"]:
            try:
                spec = strict_json((package / SPEC_NAMES[row["type"]]).read_text(encoding="utf-8"))
                with connect() as db:
                    reference_check(db, row["type"], spec, g.owner)
            except Problem as error:
                report = {"pass": False, "errors": [error.message]}
        if not report["pass"]:
            with transaction() as db:
                db.execute("UPDATE submissions SET state='validation_failed',validation=? WHERE upload_id=?", (json.dumps(report), upload_id))
                return jsonify(status(owned(db, upload_id=upload_id))), 422
        artifact = {"transport": "server", "submission_id": row["id"], "version": row["version"],
                    "submission_sha256": hashlib.sha256(manifest_bytes).hexdigest()}
        receipt = {"schema_version": "0.1.0", "submission_id": row["id"], "version": row["version"], "type": row["type"],
                   "expected_type": row["type"], "accepted_at": timestamp(), "validation": {"status": "passed"}, "artifact": artifact}
        # Publication, receipt and DB finalization are serialized, while hashing runs outside the lock.
        with transaction() as db:
            latest = owned(db, upload_id=upload_id)
            if latest["state"] == "awaiting_review":
                return jsonify(status(latest))
            if not destination.exists():
                destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                for folder, _, _ in os.walk(package, topdown=False):
                    sync_directory(folder)
                os.rename(package, destination)
            sync_directory(destination.parent)
            sync_directory(data / "submissions")
            receipt_path = data / "receipts" / row["id"] / f"v{row['version']}.json"
            receipt_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            if receipt_path.exists():
                previous_receipt = strict_json(receipt_path.read_text(encoding="utf-8"))
                if previous_receipt.get("artifact") != artifact:
                    raise Problem(409, "receipt_conflict", "An existing receipt refers to different bytes.")
                receipt = previous_receipt
            else:
                temporary_receipt = receipt_path.with_suffix("." + secrets.token_hex(8) + ".tmp")
                with temporary_receipt.open("xb") as stream:
                    stream.write(canonical(receipt))
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temporary_receipt, receipt_path)
            sync_directory(receipt_path.parent)
            sync_directory(data / "receipts")
            db.execute("UPDATE submissions SET state='awaiting_review',validation=?,receipt=? WHERE upload_id=?", (json.dumps(report), json.dumps(receipt), upload_id))
            result = status(owned(db, upload_id=upload_id))
        try:
            shutil.rmtree(staging / upload_id)
        except OSError:
            app.logger.warning("Staging cleanup pending for %s", upload_id)
        return jsonify(result)

    @app.get("/api/v1/submissions")
    def submissions():
        require_login()
        try:
            offset = max(0, int(request.args.get("cursor", "0")))
        except ValueError:
            raise Problem(400, "invalid_cursor", "Invalid page cursor.")
        if offset > 1000000:
            raise Problem(400, "invalid_cursor", "Invalid page cursor.")
        with connect() as db:
            rows = db.execute("SELECT * FROM submissions WHERE owner=? ORDER BY created DESC LIMIT 51 OFFSET ?", (g.owner, offset)).fetchall()
        return jsonify(items=[status(row) for row in rows[:50]], next_cursor=str(offset + 50) if len(rows) > 50 else None)

    @app.get("/api/v1/submissions/<submission_id>/versions/<int:version>")
    def submission(submission_id, version):
        require_login()
        with connect() as db:
            row = owned(db, submission_id, version)
            result = status(row)
            result["upload_id"] = row["upload_id"]
            result["files"] = [dict(file) for file in db.execute("SELECT id AS file_id,path,bytes,sha256,state FROM files WHERE upload_id=? ORDER BY path", (row["upload_id"],))]
        return jsonify(result)

    @app.get("/api/v1/submissions/<submission_id>/versions/<int:version>/receipt")
    def receipt(submission_id, version):
        require_login()
        with connect() as db:
            row = owned(db, submission_id, version)
        if not row["receipt"]:
            raise Problem(409, "receipt_pending", "A receipt is available after successful validation.")
        response = app.response_class(canonical(json.loads(row["receipt"])), mimetype="application/json")
        response.headers["Content-Disposition"] = f'attachment; filename="{row["id"]}-v{version}-receipt.json"'
        return response

    @app.get("/api/v1/templates/<kind>")
    def template(kind):
        require_login()
        if kind not in SPEC_NAMES:
            raise Problem(404, "not_found", "Template not found.")
        folder = HERE / "examples" / kind.replace("_", "-")
        files = {path.relative_to(folder).as_posix(): path.read_text(encoding="utf-8") for path in folder.rglob("*") if path.is_file() and path.name != "submission.json"}
        if kind == "failure_case":
            references = {}
            with connect() as db:
                for name, target_kind in (("benchmark_ref", "benchmark"), ("harness_ref", "harness")):
                    row = db.execute("SELECT receipt FROM submissions WHERE owner=? AND type=? AND state='awaiting_review' ORDER BY created DESC LIMIT 1", (g.owner, target_kind)).fetchone()
                    if not row:
                        raise Problem(409, "examples_need_references", "Submit the benchmark and harness examples first, then load this linked failure-case example.")
                    references[name] = json.loads(row["receipt"])["artifact"]
            for name in ("case.json", "evidence/run-lock.json"):
                document = strict_json(files[name])
                document.update(references)
                if name == "case.json":
                    document["synthetic_demo"] = True
                files[name] = json.dumps(document, ensure_ascii=False, indent=2)
        return jsonify(files=[{"path": path, "content": content} for path, content in sorted(files.items())], synthetic=True)

    @app.get("/")
    def root():
        return redirect("/submit/benchmark/")

    @app.get("/healthz")
    def health():
        with connect() as db:
            db.execute("SELECT 1")
        return jsonify(status="ok", service="inferencenet-submit", stage="intake")

    @app.get("/submit/<kind>/")
    def page(kind):
        if kind not in ("benchmark", "harness", "failure-case", "mine"):
            raise Problem(404, "not_found", "Page not found.")
        return send_file(HERE / "web/index.html")

    @app.get("/submit-assets/<path:name>")
    def assets(name):
        return send_from_directory(HERE / "web", name)

    @app.get("/shared/v2.css")
    def shared_css():
        return send_file(REPO / "v2/v2.css")

    @app.get("/assets/fonts/<name>")
    def font(name):
        if name not in ("inter-latin.woff2", "space-mono-latin.woff2"):
            raise Problem(404, "not_found", "Asset not found.")
        return send_file(REPO / "assets/fonts" / name)

    return app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "4198"))
    create_app({"SECURE_COOKIE": False, "ORIGIN": f"http://127.0.0.1:{port}"}).run(host="127.0.0.1", port=port, threaded=True)
