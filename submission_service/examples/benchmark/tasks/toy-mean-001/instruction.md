Read `/data/input.json`, whose `values` array contains finite numbers. Compute the arithmetic mean of **all** values. Zero-valued observations count in the denominator.

Before the agent deadline, write `/output/result.json` as one JSON object with exactly one field, `mean`, containing a finite number. Save any program you use as `/output/main.py` if desired. The scorer reads the submitted JSON only and will never execute your code to rescue a missing answer.

The task has no network access. Use only the declared input. Reference answers and oracle material are not available in the candidate environment.
