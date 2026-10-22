"""Private package paths and an offline, restartable layout migration."""
import hashlib
import os
from pathlib import Path
import re
import sqlite3

from .validator import digest, linked, relative_path, strict_json

TYPE_DIRECTORIES = {"benchmark": "benchmark", "harness": "harness", "failure_case": "failure-case"}
TYPE_PREFIXES = {"benchmark": "bench", "harness": "harness", "failure_case": "case"}


def package_path(data, kind, submission_id, version):
    return Path(data) / "submissions" / TYPE_DIRECTORIES[kind] / submission_id / f"v{version}"


def sync_directory(path):
    if os.name != "nt":
        descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)


def verify_package(path, row, data):
    """Check immutable bytes before moving them, without rewriting a manifest."""
    actual = set()
    for folder, directories, files in os.walk(path, followlinks=False):
        for name in directories + files:
            entry = Path(folder) / name
            if linked(entry) or (name in files and not entry.is_file()):
                raise ValueError(f"Non-regular entry: {entry}")
            if name in files:
                actual.add(entry.relative_to(path).as_posix())
    raw = (path / "submission.json").read_bytes()
    manifest = strict_json(raw.decode("utf-8"))
    if (manifest["submission_id"], manifest["type"], manifest["version"]) != (row["id"], row["type"], row["version"]):
        raise ValueError(f"Manifest identity differs from database: {path}")
    inventory = manifest["files"]
    declared = {entry["path"] for entry in inventory}
    if len(declared) != len(inventory) or actual != declared | {"submission.json"}:
        raise ValueError(f"Unexpected or missing payload files: {path}")
    total = 0
    for entry in inventory:
        if not relative_path(entry["path"]) or entry["path"].casefold() == "submission.json":
            raise ValueError(f"Unsafe manifest path: {path}")
        payload = path / entry["path"]
        if payload.stat().st_size != entry["bytes"] or digest(payload) != entry["sha256"]:
            raise ValueError(f"Payload differs from manifest: {payload}")
        total += entry["bytes"]
    if row["receipt"]:
        receipt = strict_json(row["receipt"])
        receipt_path = data / "receipts" / row["id"] / f"v{row['version']}.json"
        if linked(receipt_path) or strict_json(receipt_path.read_text(encoding="utf-8")) != receipt:
            raise ValueError(f"Receipt differs from database: {receipt_path}")
        if receipt["artifact"]["submission_sha256"] != hashlib.sha256(raw).hexdigest():
            raise ValueError(f"Manifest differs from receipt: {path}")
    elif row["state"] == "awaiting_review":
        raise ValueError(f"Accepted version has no receipt: {path}")
    return len(inventory), total


def migrate_layout(data, apply=False):
    """Run with intake/cleanup/backup stopped. A dry run verifies the complete plan.

    Each submission directory is renamed atomically on the same filesystem. A
    rerun verifies already moved directories and finishes any remaining moves.
    Conflicts and integrity errors abort the preflight before any rename occurs.
    """
    data = Path(data)
    root, database = data / "submissions", data / "intake.sqlite3"
    report = {"applied": apply, "submissions_to_move": 0, "versions_to_move": 0,
              "already_classified_versions": 0, "files_verified": 0, "bytes_verified": 0,
              "versions_by_type": {name: 0 for name in TYPE_DIRECTORIES.values()}}
    if linked(data) or linked(root) or linked(database):
        raise ValueError("Data, submissions and database paths must not be links")
    if not database.exists():
        if root.exists() and any(root.iterdir()):
            raise ValueError("Cannot classify existing packages without their database")
        return report
    with sqlite3.connect(database) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute("SELECT id,version,type,state,receipt FROM submissions ORDER BY id,version").fetchall()
    groups = {}
    for row in rows:
        kind, submission_id = row["type"], row["id"]
        if kind not in TYPE_DIRECTORIES or not re.fullmatch(TYPE_PREFIXES[kind] + r"-[0-9a-f]{24}", submission_id) or row["version"] < 1:
            raise ValueError("Unexpected stored submission identity")
        group = groups.setdefault(submission_id, [])
        if group and group[0]["type"] != kind:
            raise ValueError("A submission ID has conflicting types")
        group.append(row)
    if root.exists():
        for entry in root.iterdir():
            if linked(entry) or not entry.is_dir():
                raise ValueError(f"Unexpected storage entry: {entry}")
            if entry.name in TYPE_DIRECTORIES.values():
                for child in entry.iterdir():
                    if linked(child) or not child.is_dir() or child.name not in groups or TYPE_DIRECTORIES[groups[child.name][0]["type"]] != entry.name:
                        raise ValueError(f"Unknown classified submission: {child}")
            elif entry.name not in groups:
                raise ValueError(f"Unknown legacy submission: {entry}")
    moves = []
    for submission_id, versions in groups.items():
        kind = versions[0]["type"]
        source = root / submission_id
        destination = package_path(data, kind, submission_id, 1).parent
        if source.exists() and destination.exists():
            raise ValueError(f"Both legacy and classified directories exist: {submission_id}")
        current = source if source.exists() else destination
        if current.exists():
            expected = {f"v{row['version']}" for row in versions}
            if any(linked(entry) or not entry.is_dir() or entry.name not in expected for entry in current.iterdir()):
                raise ValueError(f"Unexpected version directory: {current}")
        count = 0
        for row in versions:
            version_path = current / f"v{row['version']}"
            if not version_path.exists():
                if row["state"] == "awaiting_review":
                    raise ValueError(f"Accepted package is missing: {version_path}")
                continue
            file_count, total = verify_package(version_path, row, data)
            report["files_verified"] += file_count
            report["bytes_verified"] += total
            report["versions_by_type"][TYPE_DIRECTORIES[kind]] += 1
            count += 1
        if source.exists():
            moves.append((source, destination))
            report["versions_to_move"] += count
        else:
            report["already_classified_versions"] += count
    report["submissions_to_move"] = len(moves)
    if apply:
        for source, destination in moves:
            destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            os.rename(source, destination)
            sync_directory(destination.parent)
            sync_directory(root)
    return report
