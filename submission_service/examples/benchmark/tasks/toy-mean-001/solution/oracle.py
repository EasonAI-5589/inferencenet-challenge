"""Independent standard-library oracle for this synthetic task only."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    values = payload["values"]
    if not isinstance(values, list) or not values:
        raise ValueError("values must be a nonempty list")
    if any(type(value) not in (int, float) or not math.isfinite(value) for value in values):
        raise ValueError("values must contain finite numbers")
    mean = math.fsum(values) / len(values)
    if not math.isfinite(mean):
        raise ValueError("mean must remain finite")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"mean": mean}, allow_nan=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
