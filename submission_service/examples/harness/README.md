# Toy mean harness submission

This is a local deterministic synthetic fixture, not a real LLM harness. It uses no model, credentials, network calls or random seed. It has not been uploaded to Hugging Face. Submission code is licensed Apache-2.0.

The local package root is this directory. The intended HF Dataset destination is `InferenceNet/harness-submissions`, with this directory's **contents** stored at `submissions/harness-toy-mean-001/v1/`. Upload-time receipts must bind real repository commits and this package's `submission.json` hash.

## Standalone smoke

From this package root, using Python 3.12 with no extra packages:

```bash
python -B src/submission_agent/solver.py --input smoke/input.json --output ../_runs/harness-correct/result.json --mode correct
python -B src/submission_agent/solver.py --input smoke/input.json --output ../_runs/harness-faulty/result.json --mode ignore_zero_count
```

For input `[10, 0, 20]`, the first command returns `{"mean": 10.0}`; the intentionally faulty mode returns `{"mean": 15.0}`. `ignore_zero_count` demonstrates a denominator bug for the failure-case example. It is never selected by default. `smoke/expected.json` and `smoke/expected-ignore-zero-count.json` are expected outputs for these exact two modes.

Use the sibling benchmark's independent verifier to score the outputs:

```bash
python -B ../benchmark/tasks/toy-mean-001/tests/evaluate.py --submission ../_runs/harness-correct/result.json --reference ../benchmark/tasks/toy-mean-001/tests/reference.json --output ../_runs/harness-correct/reward.json
python -B ../benchmark/tasks/toy-mean-001/tests/evaluate.py --submission ../_runs/harness-faulty/result.json --reference ../benchmark/tasks/toy-mean-001/tests/reference.json --output ../_runs/harness-faulty/reward.json
```

Expected rewards are 1 and 0, both with `verifier_error=0`. A reference failure instead yields reward null and exit 2; never treat that as a failed model answer.

## Harbor adapter

Add `src/` to the reviewed worker's Python module path and use `submission_agent.agent:ToyMeanAgent` with `kwargs={"mode":"correct"}`. The class implements Harbor 0.24.0 `BaseAgent`, declares typed options, uploads the standard-library solver, and executes one bounded Python command as the candidate user. It leaves `/output/result.json` and `/output/main.py` for the task's artifact contract. It never reads reference files.

The adapter was compared with the local Harbor 0.24.0 `BaseAgent`, `AgentOptions`, `AgentContext`, `BaseEnvironment.upload_file` and `exec` signatures. It has not been imported against an installed Harbor runtime or run through Harbor/Docker in this workstation session. No model or container integration success is claimed.

`runtime/runtime-lock.json` is an honest requirement declaration: the submission solver has zero external dependencies; the operator supplies exactly Harbor 0.24.0 and its dependency closure. It is not a completed deployment lock. The operator must resolve the Python runtime, full installed-package inventory and image digest, then record those identities in the run receipt. Do not install or import arbitrary community harness code in a privileged controller with provider credentials; use a reviewed worker.

No code-presence flag or this package's hash proves reproduction. A reproduction needs a separate execution receipt and an explicit assertion of the output; the scorer itself never replays candidate code.
