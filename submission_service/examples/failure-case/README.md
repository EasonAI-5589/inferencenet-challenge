# Failure case: zero omitted from the mean denominator

This is a **synthetic, local-only submission example**. The evidence was authored as fixture data. It does not claim a historical execution, a measured reward, a model response, or a reproduction result.

The public toy task uses `[10, 0, 20]`. Its arithmetic mean is `10`. The toy harness mode `ignore_zero_count` is designed to divide the sum by the number of nonzero values, producing `15`. The packaged output is `evidence/output/answer.json`. The benchmark verifier is the authority for scoring and numerical tolerance.

`case.json` records the observation, expected behavior, dependency references, evidence paths, and visibility rules. The task belongs to the benchmark's `validation` split. `reproduce.json` declares one deterministic offline replay with no seed because the toy computation has no randomness. The requested runtime profile is `toy-python312-harbor024-example`, with a 30-second timeout, one attempt, and zero model requests. A later verifier may confirm the expected failure; until then, the actual score is `null`, `score_available` is false, and classification remains `unresolved`.

`evidence/run-lock.json` is explicitly a **synthetic fixture request**, not an accepted production run lock. It binds the requested task, split, dependencies, parameters, budget, and the actual SHA-256 of the example scorer. The profile requires host Python 3.12, candidate Python 3.12.7, and Harbor 0.24.0, but an installed runtime inventory and image digest have not been frozen. A local fixture check may record the available local Python's actual version in its external report; that does not establish Harbor runtime compatibility.

## Local dependency references

Both dependency paths resolve relative to the containing `examples/` directory:

```json
{"transport": "local_fixture", "path": "benchmark"}
{"transport": "local_fixture", "path": "harness"}
```

These references are accepted only in an explicitly enabled local-fixture workflow. They are not valid production submissions. A production dependency uses `transport: "hf"` with all of `repo_type: "dataset"`, `repo_id`, a full 40-character hexadecimal `revision`, repository-relative submission directory `path`, and `submission_sha256`. Consumers must fetch `submission.json` from that exact commit/path and check its digest before fetching and validating its listed files. Floating branches and tags are not accepted.

## Evidence and interpretation

- `evidence/observed_run.json` declares that no execution has occurred. It contains no invented run timestamp or host.
- `evidence/run-lock.json` captures the unresolved fixture request and scorer digest, without claiming an accepted runtime.
- `evidence/events.jsonl` contains a fixture description, not a real tool or model trace.
- `evidence/output/answer.json` contains the hand-authored failing output.
- `submission.json` covers every other package file with its byte count and SHA-256 digest.

The intended failure predicate is `reward < 1`, but only after an actual verifier reports an available score without a verifier error. Missing scores, provider failures, transport errors, and verifier failures remain unscored errors. They must not be converted to zero or attributed to the model. The deterministic toy bug illustrates a harness failure and does not establish anything about model capability.

Read `reproduce.md` for the distinction between scoring the saved output and running the harness again. Keep new reports outside this package so that the fixture and its integrity manifest remain immutable.

## Isolation

The toy answers are public examples. Real hidden reference answers and detailed verifier outputs belong in a separate evaluator-controlled repository or artifact store. A directory named `private/` in a public repository provides no access control. Do not give the candidate agent failure-case descriptions, reference values, secret values, verifier logs, or scorer credentials. Publish only explicitly allowed, sanitized evidence; a removed `reference` field alone may not prevent detailed numerical errors from revealing a hidden answer.

No credentials or network access are needed for this fixture. Production manifests may name required secret environment variables but must never include their values. A complete production case must bind its run evidence, task, harness, model settings, runtime, and scoring protocol to immutable identities.

All example material in this package is dedicated under CC0-1.0; see `LICENSE`.
