/**
 * MetacaseNet arena motion / deterministic Canvas 2D atmosphere.
 * Adapted from EasonAI-5589/demonstration, commit
 * 50ddc08484fefe801be5f39daf87a14f44bc88f2:
 * - app/spider/motion.js: cubicPoint(), flightGeometry()
 * - app/scenes/rea-decompiler.js: ringXY(), drawRing() ticks / scan heads
 * - app/scenes/jev-isometric.js: spring(), span(), easeOut()
 * - app/scenes/stanford-torus.js: deterministic rand(), smoothstep()
 * See docs/arena-motion-sources.md for the exact adaptation and source links.
 * All effects are a function of progress, not accumulated frame time.
 */

const TAU = Math.PI * 2;
const HARNESS_COLORS = ['#8debd9', '#baa5ff', '#f5c27e', '#95c9ed', '#e6a8c8', '#8dcfc8', '#e1d39b', '#b9b9e8'];
const ROOM_COLORS = ['#8debd9', '#f5c27e', '#baa5ff'];
export const PHASE_STOPS = Object.freeze([0, .16, .38, .57, .76, .93, 1]);
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const fract = value => value - Math.floor(value);

export const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export const lerp = (a, b, fraction) => a + (b - a) * fraction;

export function phaseAt(progress) {
  const p = clamp(progress);
  for (let phase = 0; phase < 5; phase++) if (p < PHASE_STOPS[phase + 1]) return phase;
  return 5;
}

/** Map a global progress value onto one interval; same order as Jev's span(t,a,b). */
export function segment(progress, start, end) {
  if (start === end) return progress >= end ? 1 : 0;
  return clamp((progress - start) / (end - start));
}

/** Both smoothstep(t) and smoothstep(edge0, edge1, value) are supported. */
export function smoothstep(a, b, value) {
  const t = arguments.length === 1 ? clamp(a) : segment(value, a, b);
  return t * t * (3 - 2 * t);
}

/** Quintic variant for camera / position transitions with zero endpoint acceleration. */
export function smootherstep(a, b, value) {
  const t = arguments.length === 1 ? clamp(a) : segment(value, a, b);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export const easeOutCubic = value => 1 - (1 - clamp(value)) ** 3;

// Direct adaptation of JevIsometricScene's closed-form damped spring. The defaults
// are preserved. The critically damped branch also makes zeta = 1 well-defined.
export function springStep(x, zeta = .45, omega = 12) {
  if (x <= 0) return 0;
  const damping = clamp(zeta, .001, 1);
  const frequency = Math.max(.001, omega);
  if (damping === 1) return 1 - (1 + frequency * x) * Math.exp(-frequency * x);
  const wd = frequency * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * frequency * x)
    * (Math.cos(wd * x) + damping * frequency / wd * Math.sin(wd * x));
}

// Scalar Catmull-Rom interpolation, matching the public EWM camera-path formula.
// Camera keyframes and their timing remain the arena renderer's responsibility.
export function catmullRom(p0, p1, p2, p3, progress) {
  const t = clamp(progress);
  return .5 * (2 * p1 + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

// Directly reused cubic evaluation from demonstration/app/spider/motion.js.
export function cubicPoint(t, a, b, c, d) {
  const m = 1 - t;
  return {
    x: m * m * m * a.x + 3 * m * m * t * b.x + 3 * m * t * t * c.x + t * t * t * d.x,
    y: m * m * m * a.y + 3 * m * m * t * b.y + 3 * m * t * t * c.y + t * t * t * d.y,
  };
}

// The original flightGeometry's 1/3, 2/3 control points and 20% endpoint bend
// are retained; a caller-supplied bend keeps transmissions on the screen edges.
export function flightGeometry(origin, end, progress, bend = 0) {
  const dx = end.x - origin.x, dy = end.y - origin.y;
  const controlA = { x: origin.x + dx / 3, y: origin.y + dy * .2 + bend };
  const controlB = { x: origin.x + dx * 2 / 3, y: end.y - dy * .2 + bend };
  const p = clamp(progress);
  return { origin, controlA, controlB, end, point: cubicPoint(easeOutCubic(p), origin, controlA, controlB, end), progress: p };
}

// Seeded scalar hash used by demonstration's Stanford torus. No Math.random().
const rand = seed => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453123);
const rgba = (hex, opacity) => {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  return `rgba(${channels.join(',')},${clamp(opacity).toFixed(3)})`;
};

// Direct adaptation of ReaDecompilerScene's polar coordinate helper.
const ringXY = (ring, theta, radius) => {
  const angle = ring.ang0 + theta;
  return [ring.cx + Math.cos(angle) * radius, ring.cy + Math.sin(angle) * radius];
};

function drawRing(ctx, ring, progress, color, reduced, opacity, phase) {
  const a0 = ring.ang0 - ring.sweep, a1 = ring.ang0 + ring.sweep;
  ctx.strokeStyle = rgba(color, .16 * opacity);
  ctx.lineWidth = .7;
  ctx.beginPath();
  ctx.arc(ring.cx, ring.cy, ring.radius, a0, a1);
  ctx.stroke();
  // ReaDecompilerScene.drawRing(): every fifth polar tick is longer. The dense
  // 0.31-degree source ruler is reduced to 45 ticks for a quiet peripheral frame.
  ctx.strokeStyle = rgba(color, .26 * opacity);
  ctx.beginPath();
  for (let i = 0; i <= 44; i++) {
    const theta = lerp(-ring.sweep, ring.sweep, i / 44);
    const long = i % 5 === 0;
    const [x0, y0] = ringXY(ring, theta, ring.radius - (long ? 9 : 4));
    const [x1, y1] = ringXY(ring, theta, ring.radius + 1);
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  ctx.strokeStyle = rgba(color, .07 * opacity);
  ctx.beginPath();
  ctx.arc(ring.cx, ring.cy, ring.radius + 7, a0, a1);
  ctx.stroke();

  // Same arc-mounted scan-head construction as the reference, now driven by
  // case progress. Reduced motion replaces the sweep with six stable positions.
  const scanProgress = reduced ? phase / 5 : smoothstep(progress);
  const theta = lerp(-ring.sweep + .045, ring.sweep - .045, scanProgress);
  const head = ring.ang0 + theta;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineWidth = 1.8;
  ctx.strokeStyle = rgba(color, .80 * opacity);
  ctx.shadowColor = color; ctx.shadowBlur = reduced ? 0 : 7;
  ctx.beginPath();
  ctx.arc(ring.cx, ring.cy, ring.radius, head - .018, head + .018);
  ctx.stroke();
  ctx.restore();
  const [x, y] = ringXY(ring, theta, ring.radius + 4);
  ctx.fillStyle = rgba('#e6fff7', .75 * opacity);
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

function drawTransmission(ctx, origin, end, bend, progress, launches, color, opacity, reduced) {
  const geometry = flightGeometry(origin, end, 0, bend);
  ctx.strokeStyle = rgba(color, .12 * opacity); ctx.lineWidth = .65;
  ctx.beginPath(); ctx.moveTo(origin.x, origin.y);
  ctx.bezierCurveTo(geometry.controlA.x, geometry.controlA.y, geometry.controlB.x, geometry.controlB.y, end.x, end.y);
  ctx.stroke();
  if (reduced) return;

  // Absolute launch times preserve Spider's seekable flight model. Scrubbing
  // back to the same progress recreates the same packet position and tail.
  for (const launch of launches) {
    const age = (progress - launch) / .21;
    if (age <= 0 || age >= 1) continue;
    const flight = flightGeometry(origin, end, age, bend);
    const envelope = smoothstep(0, .07, age) * (1 - smoothstep(.80, 1, age));
    for (let tail = 3; tail >= 0; tail--) {
      const q = cubicPoint(easeOutCubic(Math.max(0, age - tail * .018)), origin, flight.controlA, flight.controlB, end);
      ctx.fillStyle = rgba(color, (.74 - tail * .17) * envelope * opacity);
      ctx.beginPath(); ctx.arc(q.x, q.y, tail ? 1.1 : 1.7, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = rgba('#f0fff9', envelope * opacity);
    ctx.fillRect(flight.point.x - .6, flight.point.y - .6, 1.2, 1.2);
  }
}

function drawEdgeDetails(ctx, width, height, progress, color, reduced, opacity) {
  const inset = width < 700 ? 13 : 24;
  const arm = width < 700 ? 12 : 21;
  ctx.strokeStyle = rgba(color, .32 * opacity); ctx.lineWidth = 1;
  ctx.beginPath();
  for (const x of [inset, width - inset]) for (const y of [inset, height - inset]) {
    const sx = x < width / 2 ? 1 : -1, sy = y < height / 2 ? 1 : -1;
    ctx.moveTo(x, y + sy * arm); ctx.lineTo(x, y); ctx.lineTo(x + sx * arm, y);
  }
  ctx.stroke();

  // Sparse registration ticks, without numbers or a second dashboard.
  ctx.strokeStyle = rgba(color, .17 * opacity); ctx.lineWidth = .7;
  ctx.beginPath();
  const count = width < 700 ? 30 : 64;
  for (let i = 0; i <= count; i++) {
    const x = lerp(width * .24, width * .76, i / count);
    const length = i % 8 === 0 ? 6 : 2;
    ctx.moveTo(x, inset); ctx.lineTo(x, inset + length);
    ctx.moveTo(x, height - inset); ctx.lineTo(x, height - inset - length);
  }
  ctx.stroke();
  if (reduced) return;

  const countDust = width < 700 ? 12 : 24;
  for (let i = 0; i < countDust; i++) {
    const seed = i + 13;
    const lane = i % 4;
    const travel = fract(rand(seed) + progress * (.13 + rand(seed + 10) * .20));
    const depth = .018 + rand(seed + 29) * .065;
    const x = lane < 2 ? width * (lane ? 1 - depth : depth) : width * travel;
    const y = lane < 2 ? height * travel : height * (lane === 2 ? depth : 1 - depth);
    const alpha = (.10 + .16 * rand(seed + 20)) * Math.sin(travel * Math.PI) * opacity;
    ctx.fillStyle = rgba(color, alpha);
    ctx.fillRect(x, y, 1.2, 1.2);
  }
}

/**
 * Draw a transparent overlay in CSS pixel coordinates. The caller supplies the
 * DPR transform. There is intentionally no independent animation clock: paused
 * playback freezes the overlay and manual seeking remains fully reversible.
 */
export function drawTelemetry(ctx, options = {}) {
  const width = Math.max(0, finite(options.width, ctx.canvas?.clientWidth || 0));
  const height = Math.max(0, finite(options.height, ctx.canvas?.clientHeight || 0));
  if (!width || !height) return;
  const p = clamp(finite(options.progress));
  const phase = clamp(Math.floor(finite(options.phase, phaseAt(p))), 0, 5);
  const harness = clamp(Math.round(finite(options.harness)), 0, HARNESS_COLORS.length - 1);
  const room = clamp(Math.round(finite(options.room)), 0, 2);
  const reduced = Boolean(options.reducedMotion);
  const opacity = clamp(finite(options.opacity, .82)) * (reduced ? .7 : 1);
  const loadoutColor = HARNESS_COLORS[harness], roomColor = ROOM_COLORS[room];
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.setLineDash([]);
  // Deliberate clear aperture: the central agent and the case rooms always win.
  // Only the outer bands receive telemetry, even if future paths cross them.
  const aperture = width < 700 ? .13 : .17;
  ctx.beginPath(); ctx.rect(0, 0, width, height);
  ctx.rect(width * aperture, height * .18, width * (1 - aperture * 2), height * .64);
  ctx.clip('evenodd');

  drawEdgeDetails(ctx, width, height, p, loadoutColor, reduced, opacity);
  const radius = Math.max(height * .72, width * .38);
  const sweep = Math.asin(clamp(height * .34 / radius, .08, .82));
  const edge = width * (width < 700 ? .055 : .072);
  const left = { cx: edge - radius, cy: height * .51, radius, sweep, ang0: 0 };
  const right = { cx: width - edge + radius, cy: height * .51, radius, sweep, ang0: Math.PI };
  drawRing(ctx, left, p, loadoutColor, reduced, opacity, phase);
  drawRing(ctx, right, p, roomColor, reduced, opacity, phase);

  const origin = { x: width * .085, y: height * .20 };
  const target = { x: width * .915, y: height * .20 };
  drawTransmission(ctx, origin, target, -height * .12, p, [.025, .18, .34, .50], loadoutColor, opacity, reduced);
  const returning = { x: width * .915, y: height * .80 };
  const memory = { x: width * .085, y: height * .80 };
  const lessonGlow = lerp(.42, 1, smoothstep(.58, .91, p));
  drawTransmission(ctx, returning, memory, height * .12, p, [.52, .64, .76], roomColor, opacity * lessonGlow, reduced);

  // Jev's spring response gives each new episode phase a small, deterministic
  // settling pulse in the two edge scan lights, never a shake of the main scene.
  const local = segment(p, PHASE_STOPS[phase], PHASE_STOPS[phase + 1]);
  const settle = reduced ? 1 : springStep(local, .72, 12);
  const pulseRadius = Math.max(1, 2.1 + settle * 1.1);
  for (const x of [width * .085, width * .915]) {
    ctx.strokeStyle = rgba(roomColor, .32 * opacity); ctx.lineWidth = .75;
    ctx.beginPath(); ctx.arc(x, height * .80, pulseRadius, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Optional DOM adapter. No RAF loop: only state changes, resizes, or becoming
 * visible request one paint. Safe to dispose repeatedly. Canvas styling belongs
 * to the caller; place it absolutely over the scene with pointer-events:none.
 */
export function createTelemetry(canvas) {
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx) return { update() {}, dispose() {} };
  const doc = canvas.ownerDocument;
  const win = doc.defaultView;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { progress: 0, phase: 0, harness: 0, room: 0, paused: true };
  let disposed = false, visible = true, frame = 0, width = 0, height = 0, dpr = 1;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.pointerEvents = 'none';

  function paint() {
    frame = 0;
    if (disposed || !visible || doc.hidden || !width || !height) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTelemetry(ctx, { ...state, width, height, reducedMotion: reduced.matches });
  }
  function wake() {
    if (!disposed && visible && !doc.hidden && !frame) frame = win.requestAnimationFrame(paint);
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    dpr = Math.min(win.devicePixelRatio || 1, 1.5);
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    wake();
  }
  const resizeObserver = new win.ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const observer = new win.IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) wake();
    else { win.cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '100px' });
  observer.observe(canvas);
  function onVisibility() {
    if (doc.hidden) { win.cancelAnimationFrame(frame); frame = 0; }
    else wake();
  }
  doc.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', wake);
  win.addEventListener('resize', resize, { passive: true });
  resize();

  return {
    update(next = {}) {
      if (disposed) return;
      const old = `${state.progress}/${state.phase}/${state.harness}/${state.room}/${state.paused}`;
      if (Number.isFinite(next.progress)) state.progress = clamp(next.progress);
      state.phase = Number.isFinite(next.phase) ? clamp(Math.floor(next.phase), 0, 5) : phaseAt(state.progress);
      if (Number.isFinite(next.harness)) state.harness = clamp(Math.round(next.harness), 0, HARNESS_COLORS.length - 1);
      if (Number.isFinite(next.room)) state.room = clamp(Math.round(next.room), 0, 2);
      if (typeof next.paused === 'boolean') state.paused = next.paused;
      if (`${state.progress}/${state.phase}/${state.harness}/${state.room}/${state.paused}` !== old) wake();
    },
    dispose() {
      if (disposed) return;
      disposed = true; win.cancelAnimationFrame(frame); frame = 0;
      resizeObserver.disconnect(); observer.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', wake);
      win.removeEventListener('resize', resize);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
