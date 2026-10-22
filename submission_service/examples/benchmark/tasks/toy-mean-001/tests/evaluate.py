"""Score a JSON artifact without importing or executing candidate code.

Exit 0: a scored outcome, including missing/invalid output and an incorrect mean.
Exit 2: reference, I/O, or scorer infrastructure error; reward is unknown (null).
"""
from __future__ import annotations

import argparse
import json
import math
import stat
import sys
from pathlib import Path

# One scalar needs little space; bound parsing so a bad artifact cannot exhaust the verifier.
MAX_JSON_BYTES = 65536
# The synthetic task's integer sum is exact; this permits only harmless float serialization noise.
ABSOLUTE_TOLERANCE = 1e-12


def unique_object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def read_mean(path: Path) -> float:
    absolute = path.absolute()
    if any(part.is_symlink() for part in (absolute, *absolute.parents)):
        raise ValueError("Artifact path must not contain a symlink")
    info = absolute.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_JSON_BYTES:
        raise ValueError("Artifact must be a bounded regular file")
    with absolute.open("rb") as stream:
        payload = stream.read(MAX_JSON_BYTES + 1)
    if len(payload) > MAX_JSON_BYTES:
        raise ValueError("Artifact is too large")
    value = json.loads(payload.decode("utf-8"), object_pairs_hook=unique_object)
    if not isinstance(value, dict) or set(value) != {"mean"}:
        raise ValueError("Expected exactly one mean field")
    number = value["mean"]
    if type(number) not in (int, float) or not math.isfinite(number):
        raise ValueError("mean must be a finite JSON number")
    return float(number)


def score(submission: Path, reference: Path) -> tuple[dict, int]:
    try:
        expected = read_mean(reference)
    except (OSError, ValueError, OverflowError):
        print("Reference is unavailable or invalid; no score assigned.", file=sys.stderr)
        return {"reward": None, "verifier_error": 1}, 2
    try:
        observed = read_mean(submission)
    except (FileNotFoundError, ValueError, OverflowError):
        return {"reward": 0, "verifier_error": 0}, 0
    except OSError:
        print("Submission could not be read due to an I/O error; no score assigned.", file=sys.stderr)
        return {"reward": None, "verifier_error": 1}, 2
    reward = int(math.isclose(observed, expected, rel_tol=0.0, abs_tol=ABSOLUTE_TOLERANCE))
    return {"reward": reward, "verifier_error": 0}, 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--submission", type=Path, required=True)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    reward, exit_code = score(args.submission, args.reference)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(reward, allow_nan=False) + "\n", encoding="utf-8")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
