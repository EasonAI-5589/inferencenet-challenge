#!/usr/bin/env bash
set -euo pipefail
mkdir -p /output
cp /solution/oracle.py /output/main.py
python -I -B /solution/oracle.py --input /data/input.json --output /output/result.json
