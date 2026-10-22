"""Deterministic fixture CLI; ignore_zero_count intentionally demonstrates a bug."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


def solve(values: list[int | float], mode: str = "correct") -> float:
    if not isinstance(values, list) or not values:
        raise ValueError("values must be a nonempty list")
    if any(type(value) not in (int, float) or not math.isfinite(value) for value in values):
        raise ValueError("values must contain finite JSON numbers")
    if mode not in {"correct", "ignore_zero_count"}:
        raise ValueError("Unknown solver mode")
    # This deliberately faulty arm isolates a denominator bug, rather than changing the input.
    count = sum(value != 0 for value in values) if mode == "ignore_zero_count" else len(values)
    if count == 0:
        raise ValueError("The selected mode has an empty denominator")
    mean = math.fsum(values) / count
    if not math.isfinite(mean):
        raise ValueError("mean must remain finite")
    return mean


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mode", choices=("correct", "ignore_zero_count"), default="correct")
    args = parser.parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or set(payload) != {"values"}:
        raise ValueError("Input must contain exactly one values field")
    mean = solve(payload["values"], args.mode)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"mean": mean}, allow_nan=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
