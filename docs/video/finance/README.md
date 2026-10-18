# FIN-T1-003 narrated replay — relay edition

294.866 s (4 min 55 s) · 1920×1080 · 30 fps · H.264 High (BT.709) + AAC 48 kHz mono ·
English narration `en-US-AriaNeural`, the voice of the approved PR #27 replay (requested at +12 % to match its 1.12 pace) ·
burned English / Chinese captions. Status: approved for publication.

Chapters: TASK 0.0–41.2 s; AGENT 41.7–191.7 s; HARNESS 192.2–219.4 s; CHECK 219.9–265.6 s; RESULT 266.1–294.4 s.

The task: decide each of six unposted entries (D01–D06) before the July close, with a Word report and an Excel
workbook as deliverables. The replay follows the recorded requests of qwen3.7-max in Claude Code 2.1.114
(Harbor 0.20.0): request 1–2 list, create and read; a `.docx` read with `cat` returns ZIP bytes and request 3
switches to python-docx; request 4 sends four parallel Bash calls; TodoWrite is handled by Claude Code itself;
request 15 reads the swap valuations (30 Jun −1,277,351.45, 31 Jul −4,395,835.74); requests 16–17 write the
workbook; request 19 fails with the recorded `NameError` before the save; requests 23–25 read the files back, the
model states the cause in its reply and re-runs the edit; the read-back shows 39 rows. HARNESS shows the whole
trace (50 Bash, 4 TodoWrite, no Read/Edit/Write), prompt growth from 26,560 to 99,752 tokens and the handoff:
Harbor copies tests into the same container after the agent stops. CHECK: DV01 −132,480.55 CNY/BP copied from
sheet 16 and recomputed by the judge (R11 met); D02 keeps red line G2 clear but R51 = 0.5; no formulas in five
sheets (R19 not met). RESULT: 3 met, 6 partly met, 11 not met, no penalties, both red lines clear;
reward 0.332849 = 57.25 / 172.

Boundaries: an editorial replay of the existing recorded pilot run — nothing was re-run or re-scored. Request numbers are
the 28 assistant message ids in the Claude Code session log; tool steps are run-export indexes; shot lengths follow the
narration, so the timeline is compressed and the header clock shows the recorded agent time. Claude Code and Bash run
inside the task's Docker container; the model is reached through an API. The rubric is absent during the agent run and
scores never flow back to it. The reward is one pilot run's rubric score, not accuracy and not a ranking.

`provenance.json` lists stream parameters, chapters, every shot with its narration and caption, file and source hashes.
The SRT files are generated from the same storyboard text that was synthesised.

Editable source (outside the website): `research/sufe-video-claude-relay-20261018/` — Skia renderer `engine/`,
storyboard `story/fin.py`. Rebuild: `python engine/voice.py fin && python engine/render.py fin && python engine/package.py fin`.
