import hashlib
import json
from pathlib import Path
import secrets

import pytest

from submission_service.app import create_app

ORIGIN = "http://localhost"


@pytest.fixture
def app(tmp_path):
    return create_app({"TESTING": True, "DATA_DIR": str(tmp_path / "data"),
                       "STAGING_DIR": str(tmp_path / "stage"), "MIN_FREE_BYTES": 0,
                       "SECURE_COOKIE": False, "ORIGIN": ORIGIN})


def account(app, name=None):
    client = app.test_client()
    response = client.post("/api/v1/auth/register", json={"username": name or "person" + secrets.token_hex(4), "password": "valid-password-123456"}, headers={"Origin": ORIGIN})
    assert response.status_code == 201, response.json
    return client, {"Origin": ORIGIN, "X-CSRF-Token": response.json["csrf_token"], "Idempotency-Key": secrets.token_hex(16)}


def example(client, kind):
    response = client.get("/api/v1/templates/" + kind)
    assert response.status_code == 200, response.json
    return {file["path"]: file["content"].encode() for file in response.json["files"]}


def initialize(client, headers, kind, files, url=None):
    payload = {"schema_version": "0.1.0", "title": "Test example", "license": "MIT", "files": [
        {"path": path, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()} for path, content in sorted(files.items())]}
    response = client.post(url or "/api/v1/submissions/" + kind + "/init", json=payload, headers=headers)
    assert response.status_code == 201, response.json
    return response.json, payload


def upload(client, headers, initialized, files):
    for file in initialized["files"]:
        response = client.put(f"/api/v1/uploads/{initialized['upload_id']}/files/{file['file_id']}", data=files[file["path"]], content_type="application/octet-stream", headers=headers)
        assert response.status_code == 204, response.json


def complete(client, headers, initialized):
    return client.post(f"/api/v1/uploads/{initialized['upload_id']}/complete", json={}, headers=headers)


def accepted(client, headers, kind):
    files = example(client, kind)
    initialized, _ = initialize(client, {**headers, "Idempotency-Key": secrets.token_hex(16)}, kind, files)
    upload(client, headers, initialized, files)
    response = complete(client, headers, initialized)
    assert response.status_code == 200, response.json
    assert response.json["state"] == "awaiting_review"
    return initialized


def test_three_types_and_immutable_receipts(app):
    client, headers = account(app)
    for kind in ("benchmark", "harness", "failure_case"):
        initialized = accepted(client, headers, kind)
        path = Path(app.config["DATA_DIR"]) / "submissions" / initialized["submission_id"] / "v1"
        manifest_bytes = (path / "submission.json").read_bytes()
        receipt = client.get(f"/api/v1/submissions/{initialized['submission_id']}/versions/1/receipt").json
        assert receipt["artifact"]["submission_sha256"] == hashlib.sha256(manifest_bytes).hexdigest()
        assert receipt["artifact"]["transport"] == "server"
        repeated = complete(client, {**headers, "Idempotency-Key": secrets.token_hex(16)}, initialized)
        assert repeated.status_code == 200
        assert (path / "submission.json").read_bytes() == manifest_bytes
        if kind == "failure_case":
            lock = json.loads((path / "evidence/run-lock.json").read_text())
            assert lock["actual_runtime_hash"] is None


def test_other_account_and_anonymous_cannot_read_or_write(app):
    owner, headers = account(app)
    initialized = accepted(owner, headers, "harness")
    other, other_headers = account(app)
    base = f"/api/v1/submissions/{initialized['submission_id']}/versions/1"
    for suffix in ("", "/receipt"):
        assert other.get(base + suffix).status_code == 404
        assert app.test_client().get(base + suffix).status_code == 401
    assert complete(other, other_headers, initialized).status_code == 404


def test_csrf_origin_and_logout(app):
    client, headers = account(app)
    assert client.post("/api/v1/auth/logout", json={}, headers={"Origin": ORIGIN}).status_code == 403
    assert client.post("/api/v1/auth/logout", json={}, headers={**headers, "Origin": "https://foreign.example"}).status_code == 403
    assert client.post("/api/v1/auth/logout", json={}, headers=headers).status_code == 200
    assert client.get("/api/v1/session").json["user"] is None


def test_init_retries_do_not_allocate_duplicates(app):
    client, headers = account(app)
    files = example(client, "harness")
    first, payload = initialize(client, headers, "harness", files)
    second = client.post("/api/v1/submissions/harness/init", json=payload, headers=headers)
    assert second.json["upload_id"] == first["upload_id"]
    payload["title"] = "Different title"
    assert client.post("/api/v1/submissions/harness/init", json=payload, headers=headers).status_code == 409
    assert len(client.get("/api/v1/submissions").json["items"]) == 1


@pytest.mark.parametrize("path", ["../outside", "/absolute", "a\\b", "CON", "nested/../secret", "submission.json", "SUBMISSION.JSON"])
def test_unsafe_paths_rejected_before_filesystem_writes(app, path):
    client, headers = account(app)
    files = example(client, "harness")
    files[path] = b"untrusted"
    payload = {"schema_version": "0.1.0", "title": "x", "license": "MIT", "files": [
        {"path": p, "bytes": len(v), "sha256": hashlib.sha256(v).hexdigest()} for p, v in files.items()]}
    assert client.post("/api/v1/submissions/harness/init", json=payload, headers=headers).status_code == 422


def test_corrupted_and_incomplete_uploads_are_retryable(app):
    client, headers = account(app)
    files = example(client, "harness")
    initialized, _ = initialize(client, headers, "harness", files)
    entry = initialized["files"][0]
    url = f"/api/v1/uploads/{initialized['upload_id']}/files/{entry['file_id']}"
    assert client.put(url, data=b"x" * entry["bytes"], headers=headers).status_code == 422
    assert complete(client, headers, initialized).status_code == 409
    upload(client, headers, initialized, files)
    assert client.put(url, data=files[entry["path"]], headers=headers).status_code == 204
    assert complete(client, headers, initialized).status_code == 200
    assert client.put(url, data=files[entry["path"]], headers=headers).status_code == 409


def test_schema_and_json_errors_have_no_receipt(app):
    client, headers = account(app)
    files = example(client, "harness")
    files["harness.json"] = b'{"interface":"one","interface":"two"}'
    initialized, _ = initialize(client, headers, "harness", files)
    upload(client, headers, initialized, files)
    response = complete(client, headers, initialized)
    assert response.status_code == 422
    assert "duplicate JSON key" in str(response.json)
    assert client.get(f"/api/v1/submissions/{initialized['submission_id']}/versions/1/receipt").status_code == 409


def test_new_version_preserves_original(app):
    client, headers = account(app)
    original = accepted(client, headers, "harness")
    files = example(client, "harness")
    files["README.md"] += b"\nVersion two\n"
    next_version, _ = initialize(client, headers, "harness", files, f"/api/v1/submissions/{original['submission_id']}/versions/init")
    assert next_version["version"] == 2
    upload(client, headers, next_version, files)
    assert complete(client, headers, next_version).status_code == 200
    parent = Path(app.config["DATA_DIR"]) / "submissions" / original["submission_id"]
    assert (parent / "v1/README.md").read_bytes() != (parent / "v2/README.md").read_bytes()


def test_sealed_artifact_survives_interrupted_db_finalization(app, monkeypatch):
    client, headers = account(app)
    files = example(client, "harness")
    initialized, _ = initialize(client, headers, "harness", files)
    upload(client, headers, initialized, files)
    # Simulate publication before the transaction recording receipt/state commits.
    import submission_service.app as module
    rename = module.os.rename
    def interrupted(source, destination):
        rename(source, destination)
        raise OSError("simulated crash after atomic publication")
    monkeypatch.setattr(module.os, "rename", interrupted)
    assert complete(client, headers, initialized).status_code == 500
    monkeypatch.setattr(module.os, "rename", rename)
    assert complete(client, headers, initialized).status_code == 200


def test_limits_reject_without_creating_upload(app):
    client, headers = account(app)
    files = example(client, "harness")
    initialized, payload = initialize(client, headers, "harness", files)
    payload["files"][0]["bytes"] = 1073741825
    assert client.post("/api/v1/submissions/harness/init", json=payload, headers={**headers, "Idempotency-Key": secrets.token_hex(16)}).status_code == 413
    payload["files"][0]["bytes"] = -1
    assert client.post("/api/v1/submissions/harness/init", json=payload, headers={**headers, "Idempotency-Key": secrets.token_hex(16)}).status_code == 422


def test_no_payload_execution(app):
    client, headers = account(app)
    files = example(client, "harness")
    marker = Path(app.config["DATA_DIR"]) / "executed.txt"
    files["src/submission_agent/agent.py"] = f"from pathlib import Path\nPath({str(marker)!r}).write_text('executed')\n".encode()
    initialized, _ = initialize(client, headers, "harness", files)
    upload(client, headers, initialized, files)
    assert complete(client, headers, initialized).status_code == 200
    assert not marker.exists()


def test_private_reference_cannot_be_reused_by_another_account(app):
    owner, owner_headers = account(app)
    accepted(owner, owner_headers, "benchmark")
    accepted(owner, owner_headers, "harness")
    private_case = example(owner, "failure_case")
    other, headers = account(app)
    initialized, _ = initialize(other, headers, "failure_case", private_case)
    upload(other, headers, initialized, private_case)
    response = complete(other, headers, initialized)
    assert response.status_code == 422
    assert "unavailable to your account" in str(response.json)


def test_expired_upload_cannot_publish_after_cleanup(app):
    import sqlite3
    client, headers = account(app)
    files = example(client, "harness")
    initialized, _ = initialize(client, headers, "harness", files)
    upload(client, headers, initialized, files)
    with sqlite3.connect(Path(app.config["DATA_DIR"]) / "intake.sqlite3") as db:
        db.execute("UPDATE submissions SET state='expired' WHERE upload_id=?", (initialized["upload_id"],))
    assert complete(client, headers, initialized).status_code == 410


def test_duplicate_portable_paths_and_file_prefixes(app):
    client, headers = account(app)
    files = example(client, "harness")
    initialized, payload = initialize(client, headers, "harness", files)
    payload["files"].append({"path": "readme.MD", "bytes": 0, "sha256": hashlib.sha256(b"").hexdigest()})
    assert client.post("/api/v1/submissions/harness/init", json=payload, headers={**headers, "Idempotency-Key": secrets.token_hex(16)}).status_code == 422
    payload["files"][-1]["path"] = "src"
    assert client.post("/api/v1/submissions/harness/init", json=payload, headers={**headers, "Idempotency-Key": secrets.token_hex(16)}).status_code == 422
