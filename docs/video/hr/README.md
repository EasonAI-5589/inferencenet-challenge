# HR-T3-114 narrated replay — relay edition

245.433 s (4 min 05 s) · 1920×1080 · 30 fps · H.264 High (BT.709) + AAC 48 kHz mono ·
English narration `en-US-AriaNeural`, the voice of the approved PR #27 replay (requested at +12 % to match its 1.12 pace) ·
burned English / Chinese captions. Status: approved for publication.

Chapters: TASK 0.0–42.0 s; AGENT 42.5–145.1 s; HARNESS 145.5–173.5 s; CHECK 174.0–217.1 s; RESULT 217.5–244.9 s.

The task (fictional, synthetic records): review a six-week supervisor training at three cold-chain sites
against a delayed fourth site, then decide acceptance and payment for three vendor work packages (¥816,000).
The replay follows the recorded requests of qwen3.7-max in Claude Code 2.1.114 (Harbor 0.20.0): request 2 sends
eight parallel previews; TodoWrite keeps the plan; the data-use rule is read from the task materials; request 7
is one 19,223-token response that the Write tool saves as a 1,336-line script; the first run (no error) labels
WP-A “验收通过” while retaining 10 %; the model names problems in its own WP-A logic and sample filter, runs two
checks, two Reads and four Edits, and the re-run makes WP-A “附条件验收” (220,320 / 24,480). No tool call failed.
HARNESS: 33 Bash, 4 TodoWrite, 1 Write, 2 Read, 4 Edit; prompt growth from 25,021 to 89,340 tokens; handoff into
the same container. CHECK (judge qwen3.7-plus, 34 criterion sessions): R20 met; per-site comparisons R14–R16 and
the source index R1/R19 not met; penalty R32 triggered because all ten people with too few opportunities were
marked as not meeting the standard (−7 raw weighted points). RESULT: 6 of 28 positive criteria met, 1 of 6
penalties; reward 0.207547 = (29 − 7) / 106.

Boundaries: an editorial replay of the existing recorded pilot run — nothing was re-run or re-scored. Request numbers are
the 28 assistant message ids in the Claude Code session log; tool steps are run-export indexes; shot lengths follow the
narration, so the timeline is compressed and the header clock shows the recorded agent time. Claude Code and Bash run
inside the task's Docker container; the model is reached through an API. The rubric is absent during the agent run and
scores never flow back to it. The reward is one pilot run's rubric score, not accuracy and not a ranking.

`provenance.json` lists stream parameters, chapters, every shot with its narration and caption, file and source hashes.
The SRT files are generated from the same storyboard text that was synthesised.

Editable source (outside the website): `research/sufe-video-claude-relay-20261018/` — Skia renderer `engine/`,
storyboard `story/hr.py`. Rebuild: `python engine/voice.py hr && python engine/render.py hr && python engine/package.py hr`.
