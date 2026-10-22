# Reproducing this synthetic failure case

This document describes a local demonstration. **The package does not claim that these steps have been run.** `verification_status: "not_run"` and the null score in the original evidence must remain unchanged. A consumer writes a separate verification report with its actual commands, dependency hashes, outputs, scoring results, and execution provenance.

1. Validate `submission.json`: every listed path is a confined relative regular file; every byte count and SHA-256 digest matches; no required file is missing. Resolve the explicitly local benchmark and harness references from the `examples/` root and validate both packages. In production, resolve and verify the pinned HF dependency manifests instead.
2. Load the benchmark contract for `toy-mean-001`, including its allowed candidate input and verifier. The reference answer and scoring implementation stay outside the candidate's accessible files.
3. Choose the verification operation described below. Record the choice in a new report; the operations support different claims.
4. Accept a reproduced failure only when the benchmark verifier produces an available score with no verifier error and `reward < 1`. Record all errors and all attempts. Do not retry until a preferred result appears.

## Score only

Pass the saved `evidence/output/answer.json` to the benchmark's isolated verifier. Do not execute the harness or candidate code. This can confirm that the **saved output** fails the fixed scoring rule. It cannot establish that the harness actually generated the saved output.

## Fresh run / offline replay

`reproduce.json` fixes `mode: "offline_replay"`, `attempts: 1`, and the harness keyword argument `mode: "ignore_zero_count"`. It requests runtime profile `toy-python312-harbor024-example` and resource limits of 30 seconds and zero model requests. A consumer must enforce these limits. For this example, offline replay means a **new deterministic solver execution without a model provider**, not playback of the invented events line.

`evidence/run-lock.json` records the matching fixture request, including the scorer's actual file digest. It is not a production acceptance receipt. Its requested host Python 3.12, candidate Python 3.12.7, and Harbor 0.24.0 remain requirements: the operator must supply and freeze the installed inventory and actual image digest. A local demonstration may run with the available local Python and record its actual version in the external verification report, while leaving Harbor integration unverified.

Use the harness entry point and task input declared in the linked packages. The solver interface is:

```text
python solver.py --input <task-input.json> --output <new-output.json> --mode ignore_zero_count
```

The consumer resolves the paths from the validated benchmark/harness manifests and selects a fresh output directory outside this package. Give the candidate only the allowed task inputs; do not mount this failure-case directory, benchmark references, or verifier evidence into the candidate environment. After the candidate exits, freeze its output bytes and pass them to a separate verifier. Never run candidate code after reference answers are installed in that environment.

A later report can then distinguish successful execution of the prescribed bug from verification of the saved fixture. Preserve the original `answer.json`, `observed_run.json`, and `events.jsonl`; never replace them with new execution artifacts.

## Seeds, tolerance, and error classification

This toy solver has no randomness, so `deterministic` is true and `seed` is null with a reason. This is not a claim that provider-backed model inference is deterministic. Real cases must preserve their actual sampling parameters, seed support, seed values or explicit absence, model identity, and bounded attempt policy. Repeated stochastic reproductions belong in separate diagnostic results with all scored and unscored attempts reported.

Numerical tolerance and the reward definition come from the benchmark verifier. The case cannot redefine them after seeing the result. Infrastructure or verifier errors produce an inconclusive/blocked verification with unknown score, not a model failure. A valid zero score remains a valid task outcome and is not a reason to silently rerun it.
