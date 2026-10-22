#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
python -I -B /tests/evaluate.py \
  --submission /output/result.json \
  --reference /tests/reference.json \
  --output /logs/verifier/reward.json
