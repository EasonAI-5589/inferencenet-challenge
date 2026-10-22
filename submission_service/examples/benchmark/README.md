# Toy mean benchmark submission

This is a local synthetic fixture, not a deployed benchmark or a real LLM evaluation. It has not been uploaded to Hugging Face. All values and reference answers were authored for this example and are licensed CC0-1.0.

The local package root is this directory. The intended HF Dataset destination is `InferenceNet/benchmark-submissions`, with this directory's **contents** stored at `submissions/bench-toy-mean-001/v1/`. An accepted receipt must bind a real HF commit SHA and the exact `submission.json` hash; no remote revision is invented here.

## Task contract

`tasks/toy-mean-001/environment/data/input.json` contains `{"values": [10, 0, 20]}`. All three observations count, so the expected output is `{"mean": 10.0}`. Excluding the zero from the denominator incorrectly produces 15. The sole task is in the validation split; train and sealed-test splits are empty.

The Harbor 1.4 task declares separate candidate and verifier environments, both with no network. The candidate image includes only the input. `solution/` supplies the independent oracle and `tests/` holds the score-only verifier and reference. Neither directory is copied into the candidate image. Real hidden answers and solution files must remain private when publishing a benchmark.

## Run the independent local smoke

From this package root, using Python 3.12 with no extra packages:

```bash
python -B tasks/toy-mean-001/solution/oracle.py --input smoke/input.json --output ../_runs/oracle/result.json
python -B tasks/toy-mean-001/tests/evaluate.py --submission ../_runs/oracle/result.json --reference tasks/toy-mean-001/tests/reference.json --output ../_runs/oracle/reward.json
```

Expected oracle artifact: `{"mean": 10.0}`. Expected reward: `{"reward": 1, "verifier_error": 0}`. Output paths are outside the package so the hashed submission stays unchanged.

The verifier CLI is `evaluate.py --submission PATH --reference PATH --output PATH`. It reads bounded JSON with exactly one finite `mean`, rejects duplicate keys and unsafe file types, and never imports or executes candidate code. Missing, malformed or incorrect submissions score zero with exit 0. Invalid or missing reference data and infrastructure I/O errors produce `{"reward": null, "verifier_error": 1}` with exit 2. A null reward is an unscored diagnostic, **not** a normal Harbor numeric reward; the controller must preserve this infrastructure failure and block publication rather than replace it with zero.

## Harbor integration boundary

The wrapper and task declarations were checked against local Harbor 0.24.0 source. Only the standalone Python fixture is locally exercised; no Harbor job or Docker build has been run for this example. The operator must validate Harbor task parsing, artifact transfer, no-network isolation and the separate verifier on its frozen runtime before accepting a run.

The Dockerfiles use the illustrative tag `python:3.12.7-slim`. No immutable image digest is claimed. The operator must resolve and record candidate and verifier image identity, full runtime inventory, exact Harbor version, and the execution protocol in its run lock. This package is not directly accepted by the project's current `dev100_campaign.py`, which enforces exactly the fixed 100 econometrics tasks and their scoring protocol.

The schema and SHA256 inventory describe bytes and provenance. They do not prove that externally submitted Dockerfiles, oracle programs or verifiers are safe to execute. Review them before execution.
