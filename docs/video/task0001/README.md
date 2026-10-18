# Task 0001 guided replay

This version expands the original replay with slower reading holds, a moving
pixel guide and baton, local highlights, particles, English synthetic narration
and burned-in English/Chinese captions. It preserves the original three-column
dashboard, five chapters and all 32 phases, including the code excerpts, tool
outputs, sub-problem progress, budgets, token counts and independent scoring.

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

The source's original 11 rendering functions and 32 phases were retained; an
additional timing and guide layer expands the 71.4-second animation into
274.6 seconds. The recorded task itself took **121.038 seconds**. Four executed
interactive tool calls, a rejected fifth request and the final evaluator run
remain distinct. The three checked values pass the task's tolerances; they
are not claimed to be numerically identical. Published references keep the
website's rounded precision. This is a historical single-task illustration,
not a new benchmark result.

## Media

- Duration: **4:34.6** (274.6 seconds), **8,238** frames.
- Video: **1920 x 1080, 30 fps**, H.264, yuv420p, BT.709, fast-start MP4.
- Audio: AAC, 48 kHz, mono. English synthetic voice: `en-US-AriaNeural`.
- Size: **37,380,095 bytes**.
- SHA-256: `3413035276e1398e427826d0746edb0961cabbb1903cdffe9d50634bf29230b5`.
- Captions are already burned into the video. SRT files are supplied for editing;
  enabling them as an extra player track would duplicate the visible captions.

The MP4 chapter navigation includes the opening in the first chapter. The TASK
card itself appears at 0:11.3; no animation timing was changed for navigation.

| Chapter | Start |
| --- | --- |
| TASK, including opening | 0:00.000 |
| AGENT | 0:42.833 |
| HARNESS | 2:38.067 |
| CHECK | 3:18.867 |
| RESULT | 4:09.667 |

## Validation

The delivered file was checked with FFprobe, and its complete audio/video streams
decoded with FFmpeg without errors. Export verified all 8,238 contiguous frames.
The unchanged source snapshot and preserved scene functions were checked by
hash, and all original intervals are covered in order. There were no JavaScript
errors in 124 layout samples. Independent keyframe review covered task details,
code and outputs, budget rejection, scoring, the result and the outro. The guide
trajectory was checked across all frames for caption intrusion and stable baton
targeting. Narration timing, levels and selected automatic transcriptions were
checked; these checks are not a claim of full human listening review.

The editable animation and export bundle is maintained separately in the research
workspace. This website change contains the approved media, captions and public
provenance, not browser profiles, rendering caches or private runtime files.
