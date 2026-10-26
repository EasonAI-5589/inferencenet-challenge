# Arena motion: source code and adaptation record

The arena includes actual adapted drawing and motion code from the project owner's
[demonstration repository](https://github.com/EasonAI-5589/demonstration), inspected
at commit `50ddc08484fefe801be5f39daf87a14f44bc88f2` on 2026-10-25. The integration
is `v2/arena-motion.js`; it is not a runtime iframe, video, or external dependency.

The library homepage no longer mounts the peripheral telemetry overlay described
below. Its source and attribution remain available in `arena-motion.js`; the
current camera imports its `catmullRom` helper. The reuse table records the
historical overlay implementation, not additional visible homepage effects.

## Code reused and changed

| Upstream source | Upstream implementation | Arena integration |
| --- | --- | --- |
| [spider/motion.js, cubicPoint and flightGeometry](https://github.com/EasonAI-5589/demonstration/blob/50ddc08484fefe801be5f39daf87a14f44bc88f2/app/spider/motion.js#L73) | Cubic Bezier evaluation; 1/3 and 2/3 control-point placement; 20% endpoint bend; cubic ease-out flight. | The same cubic polynomial and control-point construction power the visible packet trails on the upper and lower connecting arcs. Launch times are normalized to case progress. The explicit bend keeps paths outside the main 3D composition. |
| [rea-decompiler.js, ringXY](https://github.com/EasonAI-5589/demonstration/blob/50ddc08484fefe801be5f39daf87a14f44bc88f2/app/scenes/rea-decompiler.js#L762) and [drawRing](https://github.com/EasonAI-5589/demonstration/blob/50ddc08484fefe801be5f39daf87a14f44bc88f2/app/scenes/rea-decompiler.js#L1315) | Polar tick placement with every fifth tick longer, a secondary arc, and short scanning arc segments. | Two transparent, cropped peripheral rings reuse this construction. Tick density is reduced to 45 per side; the opaque label band, numeric labels, dual-agent imagery and dashboards are omitted. Scan position follows the current case progress. |
| [jev-isometric.js, span/easeOut/spring](https://github.com/EasonAI-5589/demonstration/blob/50ddc08484fefe801be5f39daf87a14f44bc88f2/app/scenes/jev-isometric.js#L70) | Normalized time intervals, cubic ease-out and the analytic underdamped spring step response. | Exported as `segment`, `easeOutCubic` and `springStep`. The spring drives a small phase-settling ring at the edge. The original default damping/frequency are preserved; a critical-damping branch prevents division by zero for `zeta=1`. |
| [stanford-torus.js, rand and smoothstep](https://github.com/EasonAI-5589/demonstration/blob/50ddc08484fefe801be5f39daf87a14f44bc88f2/app/scenes/stanford-torus.js#L15) | Scalar seeded hash and cubic smoothstep. | Used for deterministic peripheral dust and opacity envelopes; no per-frame random layout. |

The new composition is intentionally sparse. The center aperture is clipped out of
the overlay, reserving it for the single agent, harness equipment and challenge
rooms. The source gallery's performance figures, model labels, multiple agents,
charts and source-image assets are not included. All lights and particles are
illustrative, with no implied benchmark scores.

## Reference website: verified implementation evidence

The public [EWM stack3d.js](https://adamleopold.github.io/ewm-challenge/assets/js/stack3d.js)
was read directly on 2026-10-25. Its camera-path section uses normalized scroll
keyframes, scalar Catmull-Rom interpolation, a blend of 35% smoothstep and 65%
linear interpolation, and logarithmic camera-radius interpolation. Its render
loop smooths the target progress using `1 - Math.pow(0.004, dt)` and pauses when
neither scene is visible. These are verified source-code observations, not a
claim that a video-reconstruction or REA command was run.

`arena-motion.js` exports the scalar `catmullRom` formula for the 3D renderer to
use with its own camera path. It does not copy the EWM camera keyframes or models.
The overlay itself uses the demonstration gallery's deterministic-time approach:
`frame = draw(progress, harness, room, phase, size)`. It does not integrate velocity
or depend on the user's scrolling speed.

## Integration API

```js
import { createTelemetry, smootherstep, segment } from './arena-motion.js';

const telemetry = createTelemetry(overlayCanvas);
telemetry.update({ progress: 0.42, phase: 2, harness: 1, room: 0, paused: true });
// Dispose on teardown, together with the main renderer.
telemetry.dispose();
```

- Place the overlay canvas absolutely over the 3D canvas, below interactive DOM
  content. Give it the same CSS dimensions. It cannot receive pointer events.
- `progress` is 0 to 1; `phase` is optional, 0 to 5; `harness` is 0 to 7 and `room`
  is 0 to 2. If `phase` is omitted it is derived using the shared chapter stops
  `[0, .16, .38, .57, .76, .93, 1]`. The separate phase value only
  affects the small edge-settling pulse.
- `paused` is accepted, but no independent animation clock runs: keeping progress
  fixed keeps the entire overlay fixed. Updating progress while paused intentionally
  allows reversible manual seeking.
- `drawTelemetry(ctx, {width, height, progress, phase, harness, room, opacity,
  reducedMotion})` is the lower-level pure renderer. Coordinates are CSS pixels;
  the caller supplies the DPR transform. It clears its overlay before drawing.
- `clamp(value, low=0, high=1)`, `lerp(a,b,t)`, `segment(progress,start,end)`,
  `smoothstep(t)` / `smoothstep(start,end,progress)`, `smootherstep` with the same
  forms, `easeOutCubic(t)`, `springStep(x,zeta=.45,omega=12)`,
  `catmullRom(p0,p1,p2,p3,t)`, `cubicPoint(t,a,b,c,d)` and
  `flightGeometry(origin,end,progress,bend)` are also exported. `PHASE_STOPS` and
  `phaseAt(progress)` expose the chapter boundaries for consistent callers.

The DOM adapter caps DPR at 1.5, coalesces updates into one animation frame, and
does not run a perpetual RAF loop. Offscreen/hidden canvases do not paint.
Reduced motion removes flying particles and replaces continuous ring scans with
six stationary positions. Observers and listeners are removed by `dispose()`.

## Verification

The module passed JavaScript syntax and exported-curve endpoint checks. An isolated
Chromium canvas run rendered 168 combinations of progress, harness and room without
console errors. Re-rendering a prior state after seeking elsewhere produced the
same image bytes. The central aperture contained zero painted pixels at desktop
size and in the reduced-motion mobile check. A paused adapter produced unchanged
image bytes across frames; repeated disposal succeeded and cleared the canvas.
This verifies the overlay independently of the arena's Three.js renderer.
