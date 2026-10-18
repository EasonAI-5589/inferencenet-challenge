# Task 0001 DeepAgents execution walkthrough

This version explains each round through a graphical execution flow, with
reading holds, a moving pixel guide and baton, local highlights, particles,
English synthetic narration and burned-in English/Chinese captions. The original
three-column layout and five-chapter order remain. The center column now shows
requests, execution and returned observations; code is supporting evidence in
the editable animation, rather than the main video view.

- [Video](../../../assets/video/agent-replay-task0001.mp4)
- [Poster](../../../assets/video/agent-replay-task0001-poster.jpg)
- [English SRT](captions.en.srt), [Chinese SRT](captions.zh.srt), [bilingual SRT](captions.bilingual.srt)
- [Machine-readable provenance and checksums](provenance.json)

## Content and source

The recorded example is **task 0001, GPT-5.6 Sol + DeepAgents**, run
`sol-deepagents-full1000-20260911-chain-03`. The animation derives from
[`video-demo/task0001` at commit `884e89e`](https://github.com/EasonAI-5589/inferencenet-challenge/tree/884e89e58f62a185cd06572979fbd1548ea67e4b/video-demo/task0001).
The derived `replay-data.js` snapshot is unchanged. Private raw traces are not
included, and no new model evaluation was run to make this video.

The source's original 11 rendering functions and all 32 chronological intervals
are retained, with an explanatory execution-flow overlay in the center column.
V3.2 keeps the approved v3.1 pacing: **37 shots over 285.266667 seconds**, with
all scenes, information and their order preserved. Each of the **8,558 frames**
is rendered directly from the animation source at 30 fps on this presentation
timeline; the picture is not made by dropping frames from the earlier MP4.
Narration is derived from the original v3 lossless audio with FFmpeg `atempo`
at the same exact ratio **9585 / 8558**, approximately **1.120004674×**, preserving
pitch. Captions and chapter timestamps follow the same presentation timeline.

The motion update corrects a one-frame disagreement between the current shot
and the original phase at a boundary. The pixel guide, baton and flow signals
now move continuously across those boundaries; panel, chapter and card handoffs
also transition without an intermediate content flash. The baton stays outside
the guide's body and the main card text, while the flow signals use paths around
the node labels. The result foreground fades out before the outro foreground
appears, keeping the result title and the InferenceNet logo separate.
The original code excerpts and stdout remain in the snapshot and are accessible
through an evidence control in the editable browser animation. That control is
not shown in the MP4; not every original code view is directly displayed.

The walkthrough distinguishes these recorded events:

1. Four `run_python` calls execute through InferenceNet's custom tool, with
   observations returned to the model context.
2. A fifth requested tool execution is refused by this evaluation's budget gate.
   It is not a fifth executed tool call or a native DeepAgents-only feature.
3. The sixth model call submits the final program; submission is not execution.
4. The independent evaluator runs that program, produces the result JSON, then
   compares the prediction with the sealed reference.

The inactive historical tool shelf lists `ls`, `read_file`, `write_file`,
`edit_file`, `glob` and `grep` as setup context; no calls to those six tools are
observed here. Separately, the walkthrough makes no claim that `write_todos`,
`task` or subagents were called. The Stata data is read inside Python. The
six-subproblem checklist is explanatory bookkeeping, not a `write_todos` trace.
Returned observations explain the flow without inventing private chain-of-thought.

The recorded task itself took **121.038 seconds**, with **6 model calls**, **4
executed interactive tool calls**, and **46,496 total recorded tokens**. The three
checked values pass the task's tolerances; they are not claimed to be numerically
identical. Coefficient and standard error use 1% relative error; p-value uses 0.01
absolute error. Published references keep the website's rounded precision. This
is a historical single-task illustration, not a new benchmark result or evidence
that one harness outperforms another.

## Media

- Duration: **4:45.27** (285.266667 seconds; rounded to **4 min 45 sec** on the homepage),
  **8,558** frames.
- Video: **1920 x 1080, 30 fps**, H.264, yuv420p, BT.709, fast-start MP4.
- Audio: AAC, 48 kHz, mono. English synthetic voice: `en-US-AriaNeural`.
- Exact byte size and SHA-256 are recorded in [provenance.json](provenance.json).
- Captions are already burned into the video. SRT files are supplied for editing;
  enabling them as an extra player track would duplicate the visible captions.

The MP4 chapter navigation includes the opening in the first chapter. The TASK
card itself appears at **0:09.375**. Times below follow the approved presentation
timeline, which scales the v3 narration timeline by the exact speed ratio;
values are rounded to the nearest millisecond.

| Chapter | Start |
| --- | --- |
| TASK, including opening | 0:00.000 |
| AGENT | 0:37.530 |
| HARNESS | 2:50.743 |
| CHECK | 3:31.160 |
| RESULT | 4:20.922 |

## Validation

The retained v3 source and factual review checked the unchanged replay snapshot
and 11 original rendering functions by hash, chronological coverage, and all
37 bilingual narration records and execution-graph events against the derived
snapshot. No new model run or factual scene has been added for v3.2.

The v3.2 review of **124 rendered stills** and the mathematical motion checks
passed. The motion audit traverses all **8,558 output frames**
and shot boundaries, checking guide and baton continuity, caption clearance,
baton/body and baton/card-text intersections, and flow-signal clearance from
node text. Mathematical geometry checks are separate from visual frame review.

Final encoded-video QA passed: FFprobe metadata and frame count, complete FFmpeg
audio/video decoding, 8,558 continuous video packet timestamps, homepage media
and audio loading, and five chapter seeks. Contact sheets from 1,025 consecutive
encoded frames across 14 motion ranges were visually reviewed, including the
opening, loop transitions, chapter changes and outro. No previously observed
one-frame jump or title overlap was seen in those samples. Final media hashes
and export evidence are in this version's provenance record.

These are targeted motion checks plus full decoding, not a claim of subjective
viewing of the entire film. The retained ASR and signal-level checks concern the
original v3 narration; ASR was not rerun and no full human listening review is
claimed for v3.2.

The editable animation and export bundle is maintained separately in the research
workspace. This website change contains the proposed media, captions and public
provenance, not browser profiles, rendering caches or private runtime files.
