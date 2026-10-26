# Armory, cyberpunk layer and demonstration motion

Date: 2026-10-26. Branch `metacase/overnight-20261026`, stacked on PR #41
(`codex/metacasenet-arena-20261025`).

## What was added

| Piece | Files | Purpose |
| --- | --- | --- |
| Armory page | `v2/armory.html`, `v2/armory.css`, `v2/armory.js`, `assets/i18n/armory.zh.json` | Single-agent loadout in the spirit of a game armory: a model (primary), a harness (secondary) and up to four gear items, a readout, and deployment to a Metacase track. |
| Metacase taxonomy data | `assets/data/metacase-taxonomy.json` | English export of `metacase/summary.json` from `EasonAI-5589/inferencenet-harbor`, branch `feat/metacase-bench-v0` (3 categories, 16 sub-categories, 285 selected tasks). Chinese names live in `armory.zh.json`. |
| Cyberpunk layer | `v2/cyber.css` (all v2 pages) | Orbitron telemetry kickers, scanlined page headers, neon rules and navigation, glitch-on-hover headings, sharper cards with neon focus edges. Light theme gets a restrained variant. |
| Motion module | `v2/cyber-motion.js` | Canvas 2D effects adapted from the demonstration repository: torus connectome, ruler rings, radar scope, packet flights. |
| Placements | `v2/harness.html`, `v2/leaderboard.html`, `v2/armory.html` | Scope behind *Challenge harnesses*, packet flights behind *What a harness is*, rings behind *Compare*, torus behind the 14-model Dev100 board, torus hologram in the armory rig. |
| Homepage link | `v2/index.html`, `v2/arena.js`, `v2/arena.css` | After a harness is confirmed on the arena wheel, “Open the full armory” carries it into `armory.html?build=~<harness>~~`. |
| Navigation | every v2 page | “Armory” between Harness and Self-evolving (`language.js` common dictionary: 装备库). |
| Checks | `scripts/check.mjs`, `scripts/test-armory.mjs`, `scripts/test-cyber.mjs` | `check.mjs` now knows v2-only pages; two browser acceptance scripts. |

## Data honesty rules in the armory

- Models: the 14 models of `assets/data/dev100-v10-results.json`; vendors are the model
  makers. Harnesses: the four Dev100 v10 harnesses plus the six other harnesses already
  on the site's Harness page and homepage wheel.
- A number is shown only when that exact pair has a run:
  - **Dev100 v10** — `runs[]` of `dev100-v10-results.json`, metric `perfect`
    (labelled *Full replication*), with tasks and unknown counts. Caption: descriptive
    development comparison, not a Challenge leaderboard.
  - **Selected_1000** — `paired-results.json`, arm `baseline` when no harness is equipped
    (*Model only*) and arm `deepagents` for DeepAgents, metric `perfect`
    (`local-paper-v1`). Caption: not comparable with Dev100.
- Every other pair reads **Not yet measured**. Gear never changes a number.
- The radar counts which of six capabilities (Plan, Code, Data, Search, Memory, Verify)
  the equipped harness and gear provide. It describes the setup and is labelled as not
  a score. Harness capabilities follow each project's public description; the Dev100
  compositions may expose fewer tools (for example, DeepSeek Harness had only
  `run_python`), which the item note states.
- Deploy only records the chosen track in the loadout link; it does not submit a run.

## Interaction

- Equip by click, keyboard (Tab to an item, Enter) or drag-and-drop onto a slot; tabs use
  arrow keys. The tablist sets `data-tabs="manual"` so the generic `site.js` tabs do not
  hide the shared panel.
- Equipping flies a ghost of the card into its socket (420 ms, WAAPI, interruptible) and
  pulses the socket and the hologram. Reduced motion: no flight, no sweep, static torus.
- State persists in `localStorage` (`metacase-armory-v1`) and in the URL:
  `?build=<model>~<harness>~<gear1>,<gear2>,<gear3>,<gear4>~<track>`. The URL wins.
- Strings are English in the DOM and translated in place by `language.js`, so dynamic
  text (slots, readout, deploy) switches language with the page toggle.

## Extending the catalogue

- New model: add it to `dev100-v10-results.json` (or a future board) and, if needed, a
  vendor in `VENDOR` and a `PAIRED_ID` mapping in `v2/armory.js`.
- New harness or gear: add an entry to `HARNESSES` or `GEAR` with `axes` and a one-line
  `note`, then its Chinese strings to `assets/i18n/armory.zh.json`. A harness gets numbers
  only through a `board` id that exists in the data file.
- New taxonomy: rerun `python3 scripts/metacase_build.py` in inferencenet-harbor and
  re-export `assets/data/metacase-taxonomy.json` (English fields only; add new Chinese
  names to the dictionary).

## Motion source record

Adapted from the project owner's [demonstration repository](https://github.com/EasonAI-5589/demonstration)
at commit `50ddc08484fefe801be5f39daf87a14f44bc88f2`. All effects are pure functions of time,
pause offscreen (IntersectionObserver) and on hidden tabs, cap the device pixel ratio at 2,
and draw one static frame under reduced motion. Labels, dashboards and numbers of the
original scenes are not reused.

| Effect | Upstream | What was kept |
| --- | --- | --- |
| `torus` | `app/scenes/stanford-torus.js` — `makeView()`, `project()`, `drawNeedles()`, `drawStrands()`, `rand()`, `smoothstep()` | Yaw-pitch-roll perspective camera, needle field along the projected centreline with a travelling length wave, twisted strands with a bright pulse; tube body simplified to depth-sorted points. |
| `rings` | `app/scenes/rea-decompiler.js` — `ringXY()`, `drawRing()` | Polar ruler ticks with every fifth tick long, scan-head arc segments, the central hand-off diamond; three concentric counter-rotating rings. |
| `scope` | `app/scenes/kessler-orbital.js` — `drawScope()` | Trailing 55° radar wedge, leading edge line, blips that fade with angular distance behind the sweep. |
| `packets` | `app/spider/motion.js` — `cubicPoint()`, `flightGeometry()` | Cubic Bezier flights with 1/3–2/3 control points, sinusoidal bend and cubic ease-out arrival into target slots. |

## Checks

```sh
node scripts/check.mjs
node --test scripts/test-initiative.mjs
PLAYWRIGHT_MODULE=… node scripts/test-arena.mjs
PLAYWRIGHT_MODULE=… node scripts/test-armory.mjs
PLAYWRIGHT_MODULE=… node scripts/test-cyber.mjs
```

The browser scripts expect a static server of the repository root at the local preview
address used by `test-arena.mjs` (override with `ARMORY_URL` / `CYBER_BASE`).
`SHOTS_DIR` writes screenshots.

## Known limitations

- Desktop first. Pages pass a 390 px no-overflow check, but mobile layouts of existing
  content pages were not redesigned.
- The capability radar is qualitative by design; it should not be read as performance.
- Metacase taxonomy counts are a v0 selection; two sub-categories are still gaps.
