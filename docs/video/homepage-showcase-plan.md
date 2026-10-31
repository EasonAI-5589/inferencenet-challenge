# Homepage showcase video: plan (stage 1, for Yujie Cai)

Status 2026-10-31: plan only, nothing rendered yet. Capture is blocked on this Mac (see "Blocker").

## What the video shows

One seamless loop, about 24 s, 1920×1080, built from the real homepage (`v2/index.html` at `c72812e`).
It follows `design-to-motion`: rebuild the exact frame, start empty, let each visual act out what it
does, end where it began.

| Beat | Time | Source on the page | What moves |
| --- | --- | --- | --- |
| 1 Hero | 0–4 s | `.mc-hero` | Title and lead fade in as on load; the three host crests settle; cursor rests on "Join the Challenge" |
| 2 A Metacase opens | 4–9 s | `#metacase` | The book opens through its five stages, one note card at a time |
| 3 Retrieval | 9–13 s | `#structure` | Topic match, then solution match: the matching slips ring their stages |
| 4 Fields | 13–17 s | `#fields` | Economics book opens to its six slots, ending on the new summary slot (152 tasks · 5 classes) |
| 5 Loadout | 17–21 s | `#arena` phase 1 | Provider, model, effort, harness light in turn; summary line updates |
| 6 Results | 21–24 s | `#tracks` | Counters run up to 285, 8 × 5, 9; the three submit links appear; cut back to beat 1 |

Every number on screen is the page's own (summary.json v0.1 and the Dev100 results card). No new figures.

## How it is made

1. Fidelity first: record the page itself at fixed scroll positions rather than redrawing it, so
   the video can never drift from the site.
2. Deterministic capture: drive scroll progress per frame (the chapters already map scroll to a
   0–1 progress, so each beat is a progress range), render 30 fps frames, encode with ffmpeg.
3. Exports: `homepage-showcase.mp4` (H.264, 1920×1080), a website GIF and an 800×500 GIF, plus a poster
   frame, into `assets/video/` with a new `?v=` tag, following the existing `docs/video/*` receipts
   (`provenance.json`, `render-receipt.json`).
4. Reduced motion: the homepage link stays a plain link to the recording; no autoplay on the page.

## Blocker

Frame capture needs a scripted browser. On this Mac, Playwright is disabled and Chrome must not be
restarted with remote debugging (SentinelOne rules), and `scripts/test-arena.mjs` already fails for the
missing `playwright` module. Options, for the user to choose:

- Capture on a machine where a headless browser is allowed (for example the NTU or AliPAI CPU host),
  using the same scroll-progress script.
- Record the six beats by hand with screen recording at 1920×1080, then cut and encode with ffmpeg here.

Until then the homepage points "Watch an agent run" at the existing replay
(`challenge.html#replication-demo`, `assets/video/agent-replay-task0001.mp4`).
