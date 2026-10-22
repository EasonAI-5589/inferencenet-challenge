#!/usr/bin/env python3
"""Validate the v0.1 package contract without importing or running submitted code.

This is an integrity/format check, not a security scanner or execution sandbox.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path, PurePosixPath
import re
import sys
import tomllib


SPEC_NAMES = {"benchmark": "benchmark.json", "harness": "harness.json", "failure_case": "case.json"}
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
HEX40 = re.compile(r"[0-9a-f]{40}\Z")
RESERVED_NAMES = {"CON", "PRN", "AUX", "NUL"} | {f"{prefix}{i}" for prefix in ("COM", "LPT") for i in range(1, 10)}


def relative_path(value):
    if not isinstance(value, str) or not value or "\\" in value or ":" in value or any(ord(c) < 32 for c in value):
        return False
    return not PurePosixPath(value).is_absolute() and all(p not in ("", ".", "..") and not p.endswith((" ", ".")) and p.split(".")[0].upper() not in RESERVED_NAMES for p in value.split("/"))


def finite_number(value):
    return type(value) is int or (type(value) is float and math.isfinite(value))


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def strict_json(text):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError(f"duplicate JSON key: {key}")
            result[key] = value
        return result

    def constant(value):
        raise ValueError(f"non-finite JSON value: {value}")

    def number(value):
        parsed = float(value)
        if parsed in (float("inf"), float("-inf")):
            raise ValueError(f"non-finite JSON number: {value}")
        return parsed

    return json.loads(text, object_pairs_hook=pairs, parse_constant=constant, parse_float=number)


def linked(path):
    return path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction())


def validate(package, allow_local_fixtures=False):
    errors = []
    root = Path(package).absolute()

    def check(condition, message):
        if not condition:
            errors.append(message)
        return bool(condition)

    def load(path):
        try:
            if path.stat().st_size > 4 * 1024 * 1024:
                raise ValueError("JSON documents must be at most 4 MiB")
            return strict_json(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, ValueError, RecursionError) as exc:
            errors.append(f"{path.name}: {exc}")
            return None

    if not check(root.is_dir() and not linked(root), "package must be a directory, not a symlink/junction"):
        return {"pass": False, "errors": errors}
    actual = set()
    for folder, dirs, files in os.walk(root, followlinks=False, onerror=lambda exc: errors.append(str(exc))):
        for name in sorted(dirs + files):
            path = Path(folder) / name
            rel = path.relative_to(root).as_posix()
            if linked(path):
                errors.append(f"symlink/junction forbidden: {rel}")
                if name in dirs:
                    dirs.remove(name)
            elif path.is_file():
                actual.add(rel)
            elif name not in dirs:
                errors.append(f"not a regular file: {rel}")
    if not check("submission.json" in actual, "missing submission.json"):
        return {"pass": False, "errors": errors}
    structured_sizes = [(root / rel).stat().st_size for rel in actual if rel.endswith((".json", ".toml"))]
    structured_bytes = sum(structured_sizes)
    if not check(all(size <= 4 * 1024 * 1024 for size in structured_sizes), "JSON/TOML documents must each be at most 4 MiB"):
        return {"pass": False, "errors": errors}
    if not check(structured_bytes <= 32 * 1024 * 1024, "JSON/TOML documents together must be at most 32 MiB"):
        return {"pass": False, "errors": errors}
    manifest = load(root / "submission.json")
    if not check(isinstance(manifest, dict), "submission.json must be an object"):
        return {"pass": False, "errors": errors}
    check(manifest.get("schema_version") == "0.1.0", "schema_version must be 0.1.0")
    kind = manifest.get("type")
    if not check(isinstance(kind, str) and kind in SPEC_NAMES, "invalid submission type"):
        kind = None
    check(isinstance(manifest.get("submission_id"), str) and bool(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", manifest["submission_id"])), "submission_id must be a lowercase slug")
    check(type(manifest.get("version")) is int and manifest["version"] > 0, "version must be a positive integer")
    for name in ("title", "license", "submitter"):
        check(isinstance(manifest.get(name), str) and bool(manifest[name].strip()), f"{name} must be a nonempty string")
    check(isinstance(manifest.get("submitter"), str) and bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", manifest["submitter"])), "submitter must be a stable account identifier")
    try:
        stamp = manifest.get("created_at")
        parsed = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
        check("T" in stamp and parsed.tzinfo is not None and parsed.utcoffset() == timezone.utc.utcoffset(parsed), "created_at must be an ISO timestamp in UTC")
    except (ValueError, TypeError, AttributeError):
        errors.append("created_at must be an ISO timestamp in UTC")
    check(kind is not None and manifest.get("spec_path") == SPEC_NAMES[kind], "spec_path must be the fixed file for its type")
    entries = manifest.get("files")
    declared = set()
    portable = set()
    if check(isinstance(entries, list), "files must be an array"):
        for entry in entries:
            if not check(isinstance(entry, dict), "files entry must be an object"):
                continue
            rel = entry.get("path")
            if not check(relative_path(rel) and rel.casefold() != "submission.json", f"invalid manifest path: {rel!r}"):
                continue
            check(rel not in declared, f"duplicate manifest path: {rel}")
            check(rel.casefold() not in portable, f"duplicate portable path: {rel}")
            declared.add(rel)
            portable.add(rel.casefold())
            check(type(entry.get("bytes")) is int and entry["bytes"] >= 0, f"invalid bytes: {rel}")
            check(isinstance(entry.get("sha256"), str) and bool(HEX64.fullmatch(entry["sha256"])), f"invalid sha256: {rel}")
            if rel in actual:
                try:
                    check((root / rel).stat().st_size == entry.get("bytes"), f"size mismatch: {rel}")
                    check(digest(root / rel) == str(entry.get("sha256")).lower(), f"sha256 mismatch: {rel}")
                except OSError as exc:
                    errors.append(f"cannot read {rel}: {exc}")
    check(declared == actual - {"submission.json"}, f"file inventory mismatch: missing={sorted(declared - actual)}, undeclared={sorted(actual - declared - {'submission.json'})}")
    documents = {}
    for rel in sorted(actual - {"submission.json"}):
        if rel.endswith(".json"):
            documents[rel] = load(root / rel)
        elif rel.endswith(".jsonl"):
            line_number = 0
            try:
                with (root / rel).open("rb") as stream:
                    while line := stream.readline(1024 * 1024 + 1):
                        line_number += 1
                        if len(line) > 1024 * 1024:
                            raise ValueError("JSONL lines must be at most 1 MiB")
                        if line.strip():
                            strict_json(line.decode("utf-8"))
            except (OSError, UnicodeError, ValueError, RecursionError) as exc:
                errors.append(f"{rel}:{line_number}: {exc}")
    spec = documents.get(SPEC_NAMES.get(kind))
    if check(isinstance(spec, dict), "type spec must be a JSON object"):
        validate_kind(kind, spec, root, actual, documents, check, errors, allow_local_fixtures)
    return {"pass": not errors, "errors": errors}


def validate_kind(kind, spec, root, actual, documents, check, errors, allow_local_fixtures):
    def required(rel):
        return check(relative_path(rel) and rel in actual, f"required file missing or invalid: {rel!r}")

    def object_field(name):
        return check(isinstance(spec.get(name), dict), f"{name} must be an object")

    required("README.md")
    required("LICENSE")
    if kind in ("benchmark", "harness"):
        required("smoke/input.json")
        required("smoke/expected.json")
    if kind == "benchmark":
        required("provenance.json")
        check(spec.get("format") == "harbor-task-v1.4", "unsupported benchmark format")
        for name in ("benchmark_id", "version"):
            check(isinstance(spec.get(name), str) and bool(spec[name].strip()), f"{name} is required")
        for name in ("metric_spec", "runtime_profile", "oracle_policy"):
            object_field(name)
        ids = spec.get("task_ids")
        if not check(isinstance(ids, list) and bool(ids) and all(isinstance(x, str) and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", x) for x in ids), "task_ids must be a nonempty list of slug IDs"):
            return
        check(len(ids) == len(set(ids)), "duplicate task IDs")
        tasks_path = spec.get("tasks_path")
        if not check(relative_path(tasks_path), "invalid tasks_path"):
            return
        prefix = tasks_path + "/"
        actual_ids = {p[len(prefix):].split("/")[0] for p in actual if p.startswith(prefix)}
        check(actual_ids == set(ids), "task directories must exactly match task_ids")
        for task_id in ids:
            base = f"{tasks_path}/{task_id}"
            for rel in ("instruction.md", "task.toml", "environment/Dockerfile", "solution/solve.sh", "tests/test.sh", "tests/Dockerfile"):
                required(f"{base}/{rel}")
            if f"{base}/task.toml" in actual:
                try:
                    task_file = root / base / "task.toml"
                    if task_file.stat().st_size > 4 * 1024 * 1024:
                        raise ValueError("task.toml must be at most 4 MiB")
                    task = tomllib.loads(task_file.read_text(encoding="utf-8"))
                    check(task.get("schema_version") == "1.4", f"unsupported task schema: {task_id}")
                    metadata = task.get("metadata", {})
                    check(isinstance(metadata, dict) and metadata.get("task_id") == task_id, f"task metadata ID mismatch: {task_id}")
                    verifier = task.get("verifier", {})
                    environment = task.get("environment", {})
                    check(isinstance(verifier, dict) and verifier.get("environment_mode") == "separate", f"verifier must use a separate environment: {task_id}")
                    check(isinstance(environment, dict) and environment.get("network_mode") == "no-network", f"candidate environment must declare no-network: {task_id}")
                    verifier_env = verifier.get("environment", {}) if isinstance(verifier, dict) else {}
                    check(isinstance(verifier_env, dict) and verifier_env.get("network_mode") == "no-network", f"verifier environment must declare no-network: {task_id}")
                except (OSError, UnicodeError, ValueError, RecursionError) as exc:
                    errors.append(f"{base}/task.toml: {exc}")
        splits_path = spec.get("splits_path")
        if required(splits_path):
            splits = documents.get(splits_path)
            if check(isinstance(splits, dict) and set(splits) == {"train", "validation", "sealed_test"}, "splits must declare train, validation, sealed_test"):
                members = []
                for name, values in splits.items():
                    if check(isinstance(values, list) and all(isinstance(x, str) for x in values), f"invalid split: {name}"):
                        members.extend(values)
                check(len(members) == len(set(members)), "split membership must be disjoint with no duplicate IDs")
                check(set(members) == set(ids), "splits must cover exactly the declared task IDs")
    elif kind == "harness":
        check(spec.get("interface") == "harbor-base-agent-v0.24.0", "unsupported harness interface")
        source = spec.get("source_path")
        entry = spec.get("import_path")
        valid_source = check(relative_path(source) and any(p.startswith(source + "/") for p in actual), "source_path must contain declared source files")
        valid_entry = check(isinstance(entry, str) and bool(re.fullmatch(r"[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*:[A-Za-z_]\w*", entry, re.ASCII)), "import_path must be module:Class")
        if valid_source and valid_entry:
            module = source + "/" + entry.split(":")[0].replace(".", "/")
            check(module + ".py" in actual or module + "/__init__.py" in actual, "import_path module is absent from source_path")
        required(spec.get("runtime_lock_path"))
        for name in ("kwargs", "model_requirements", "tool_policy"):
            object_field(name)
        compatible = spec.get("compatible_benchmark_releases")
        check(isinstance(compatible, list) and bool(compatible) and all(isinstance(x, dict) and isinstance(x.get("benchmark_id"), str) and bool(x["benchmark_id"]) and isinstance(x.get("version"), str) and bool(x["version"]) for x in compatible), "compatible_benchmark_releases must name benchmark IDs and versions")
    elif kind == "failure_case":
        for name in ("reproduce.json", "reproduce.md", "evidence/observed_run.json", "evidence/events.jsonl"):
            required(name)
        for name, fixture in (("benchmark_ref", "benchmark"), ("harness_ref", "harness")):
            ref = spec.get(name)
            if not check(isinstance(ref, dict), f"{name} must be an object"):
                continue
            if ref.get("transport") == "local_fixture":
                check(allow_local_fixtures, f"{name}: local_fixture is forbidden for formal intake")
                check(ref.get("path") == fixture and set(ref) == {"transport", "path"}, f"{name}: local_fixture path must be {fixture!r}, with no extra fields")
            elif ref.get("transport") == "server":
                check(set(ref) == {"transport", "submission_id", "version", "submission_sha256"}, f"{name}: unexpected server reference fields")
                check(isinstance(ref.get("submission_id"), str) and bool(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", ref["submission_id"])), f"{name}: invalid server submission ID")
                check(type(ref.get("version")) is int and ref["version"] > 0, f"{name}: version must be positive")
                check(isinstance(ref.get("submission_sha256"), str) and bool(HEX64.fullmatch(ref["submission_sha256"])), f"{name}: invalid manifest SHA256")
            else:
                check(ref.get("transport") == "hf", f"{name}: transport must be hf")
                check(ref.get("repo_type") == "dataset", f"{name}: repo_type must be dataset")
                check(isinstance(ref.get("repo_id"), str) and bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]*", ref["repo_id"])), f"{name}: repo_id must be owner/name")
                check(isinstance(ref.get("revision"), str) and bool(HEX40.fullmatch(ref["revision"])), f"{name}: revision must be a complete 40-hex commit")
                check(relative_path(ref.get("path")), f"{name}: invalid HF path")
                check(isinstance(ref.get("submission_sha256"), str) and bool(HEX64.fullmatch(ref["submission_sha256"])), f"{name}: submission_sha256 must be 64 hex characters")
        for name in ("task_id", "split"):
            check(isinstance(spec.get(name), str) and bool(spec[name]), f"{name} must be nonempty")
        required(spec.get("reproduction"))
        reproduction = documents.get("reproduce.json")
        if check(isinstance(reproduction, dict), "reproduce.json must be an object"):
            check(reproduction.get("mode") in ("score_only", "offline_replay", "live_agent_rerun"), "unsupported reproduction mode")
            check(type(reproduction.get("attempts")) is int and reproduction["attempts"] > 0, "reproduction attempts must be a positive integer")
            check(reproduction.get("task_id") == spec.get("task_id"), "reproduction task_id must match case")
            check(isinstance(reproduction.get("kwargs"), dict), "reproduction kwargs must be an object")
            predicate = reproduction.get("failure_predicate")
            if check(isinstance(predicate, dict), "failure_predicate must be an object"):
                if predicate.get("kind") == "reward_below":
                    check(predicate.get("metric") == "reward", "reward_below must use metric reward")
                    check(finite_number(predicate.get("threshold")), "failure_predicate threshold must be finite")
                elif predicate.get("kind") == "outcome_is":
                    check(predicate.get("outcome_class") in ("infrastructure_error", "verifier_error", "task_failure", "unresolved"), "invalid failure_predicate outcome_class")
                else:
                    errors.append("failure_predicate kind must be reward_below or outcome_is")
        lock_path = spec.get("run_lock_path")
        run_lock = documents.get(lock_path) if required(lock_path) else None
        if check(isinstance(run_lock, dict), "run_lock_path must point to a JSON object"):
            check(isinstance(run_lock.get("scorer_sha256"), str) and bool(HEX64.fullmatch(run_lock["scorer_sha256"])), "run lock scorer_sha256 must be 64 lowercase hex characters")
            fixture = allow_local_fixtures and all(isinstance(spec.get(name), dict) and spec[name].get("transport") == "local_fixture" for name in ("benchmark_ref", "harness_ref"))
            # Demonstration evidence remains explicitly unresolved; never invent an actual runtime hash.
            fixture = fixture or (spec.get("synthetic_demo") is True and all(isinstance(spec.get(name), dict) and spec[name].get("transport") == "server" for name in ("benchmark_ref", "harness_ref")))
            fixture = fixture and run_lock.get("kind") == "fixture_run_request" and run_lock.get("status") == "synthetic_request_not_accepted_run_lock"
            runtime_hash = run_lock.get("actual_runtime_hash")
            check((isinstance(runtime_hash, str) and bool(HEX64.fullmatch(runtime_hash))) or (fixture and runtime_hash is None and run_lock.get("operator_runtime_status") == "unresolved_example"), "run lock requires actual_runtime_hash; only an explicitly marked unresolved synthetic example may leave it null")
            for name in ("task_id", "split", "benchmark_ref", "harness_ref"):
                check(run_lock.get(name) == spec.get(name), f"run lock {name} must match case")
            if isinstance(reproduction, dict):
                for name in ("kwargs", "attempts"):
                    check(run_lock.get(name) == reproduction.get(name), f"run lock {name} must match reproduction")
            observed_run = documents.get("evidence/observed_run.json")
            if check(isinstance(observed_run, dict), "observed_run must be a JSON object"):
                check(observed_run.get("task_id") == spec.get("task_id"), "observed_run task_id must match case")
                check(observed_run.get("harness_kwargs") == run_lock.get("kwargs"), "observed_run kwargs must match run lock")
        if object_field("evidence"):
            for rel in spec["evidence"].values():
                required(rel)
        if object_field("observed"):
            observed = spec["observed"]
            output_keys = [name for name in ("output_path", "missing_output_evidence_path") if observed.get(name) is not None]
            if check(len(output_keys) == 1, "observed requires exactly one output_path or missing_output_evidence_path"):
                required(observed[output_keys[0]])
            check(type(observed.get("score_available")) is bool, "observed.score_available must be boolean")
            check(observed.get("score_available") is True or observed.get("reward") is None, "an unavailable score must have reward=null")
            if observed.get("score_available") is True:
                check(finite_number(observed.get("reward")), "an available score must be a finite number")
                check(type(observed.get("verifier_error")) is int and observed["verifier_error"] == 0, "an available score requires verifier_error=0")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    parser.add_argument("--allow-local-fixtures", action="store_true", help="allow bundled cross-package demo references; not for intake")
    args = parser.parse_args()
    try:
        result = validate(args.package, args.allow_local_fixtures)
    except (OSError, ValueError, TypeError, RecursionError) as exc:
        result = {"pass": False, "errors": [f"validation failed: {exc}"]}
    print(json.dumps(result, indent=2))
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
