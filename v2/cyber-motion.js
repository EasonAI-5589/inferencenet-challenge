/**
 * Cyber motion: deterministic Canvas 2D effects for the Model and Harness parts of v2.
 * Adapted from EasonAI-5589/demonstration, commit 50ddc08484fefe801be5f39daf87a14f44bc88f2:
 * - app/scenes/stanford-torus.js: makeView()/project() perspective camera, needle field along a
 *   torus centreline, twisted strands with travelling pulses, rand()/smoothstep()
 * - app/scenes/rea-decompiler.js: ringXY() polar ticks (every fifth tick long), scan-head arcs
 * - app/scenes/kessler-orbital.js: drawScope() trailing radar wedge and fading blips
 * - app/spider/motion.js: cubicPoint() and flightGeometry() packet flights with eased arrival
 * Every frame is a pure function of time t (seconds), so effects can pause, scrub and render a
 * static frame for reduced motion. Labels, numbers and dashboards of the originals are omitted.
 *
 * Usage:
 *   import { mount } from './cyber-motion.js';
 *   const fx = mount(canvas, { effect: 'torus' | 'rings' | 'scope' | 'packets', hue: '#8debd9', seed: 1 });
 *   fx.setHue('#f5c27e'); fx.pulse(); fx.destroy();
 * Canvases with data-cyber="<effect>" (optional data-cyber-hue) are mounted automatically.
 */
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const LOOP = TAU / 24;
const fract = x => x - Math.floor(x);
const rand = seed => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453123);
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');

function rgbOf(color) {
  const probe = rgbOf.ctx || (rgbOf.ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true }));
  probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = color; probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a).toFixed(3)})`;

export function cubicPoint(t, a, b, c, d) {
  const m = 1 - t;
  return { x: m * m * m * a.x + 3 * m * m * t * b.x + 3 * m * t * t * c.x + t * t * t * d.x,
           y: m * m * m * a.y + 3 * m * m * t * b.y + 3 * m * t * t * c.y + t * t * t * d.y };
}

/* Torus connectome ------------------------------------------------------------------------- */
function torusEffect(seed) {
  const needles = Array.from({ length: 420 }, (_, i) => ({
    theta: rand(seed + i * 1.37) * TAU, len: 0.12 + 0.55 * rand(seed + i * 2.11) ** 2,
    jitter: (rand(seed + i * 3.7) - 0.5) * 0.5, phase: rand(seed + i * 5.3) * TAU, warm: rand(seed + i * 7.9) > 0.72,
    pearl: rand(seed + i * 9.1) > 0.9 }));
  const strands = Array.from({ length: 16 }, (_, i) => ({ v0: rand(seed + i * 11.3) * TAU, twist: 2 + 3 * rand(seed + i * 13.1),
    spin: (rand(seed + i * 17.7) - 0.5) * 0.6, lift: 1.02 + 0.12 * rand(seed + i * 19.3), pulse: rand(seed + i * 23.9) }));
  let view;
  const camera = (t, still) => {
    const k = still ? 0 : 1;
    const yaw = -53.5 * DEG + Math.sin(t * LOOP) * 9 * DEG * k;
    const pitch = 18 * DEG + Math.sin(t * LOOP * 2) * 3 * DEG * k;
    const roll = 11.6 * DEG;
    view = { cyw: Math.cos(yaw), syw: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), cr: Math.cos(roll), sr: Math.sin(roll) };
  };
  // Same rotation order as StanfordTorusScene.project(): yaw about Y, pitch about X, roll in screen.
  const project = (X, Y, Z, g) => {
    const x1 = X * view.cyw + Z * view.syw, z1 = Z * view.cyw - X * view.syw;
    const y2 = Y * view.cp - z1 * view.sp, z2 = Y * view.sp + z1 * view.cp;
    const s = g.D / (g.D - z2);
    return [g.cx + (x1 * view.cr - y2 * view.sr) * s, g.cy + (x1 * view.sr + y2 * view.cr) * s, z2, s];
  };
  return (ctx, w, h, t, hue, still, energy) => {
    const R = Math.min(w, h) * 0.3, r = R * 0.26;
    const g = { cx: w / 2, cy: h / 2, D: R * 3.1 };
    camera(t, still);
    const center = [];
    for (let k = 0; k <= 180; k++) {
      const th = (k / 180) * TAU;
      center.push(project(R * Math.sin(th), -R * Math.cos(th), 0, g));
    }
    // Guide rings inside the hollow.
    ctx.lineWidth = 1;
    for (const [scale, a] of [[0.62, 0.32], [0.74, 0.16]]) {
      ctx.strokeStyle = rgba(hue, a);
      ctx.beginPath();
      for (let k = 0; k <= 96; k++) {
        const th = (k / 96) * TAU, p = project(R * scale * Math.sin(th), -R * scale * Math.cos(th), 0, g);
        k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    }
    // Needles: radial spikes from the projected centreline, a travelling wave lengthens them.
    const wave = still ? 0 : t * LOOP * 3;
    const tips = [];
    ctx.lineWidth = 0.9;
    for (const warmPass of [false, true]) {
      ctx.strokeStyle = warmPass ? 'rgba(245,194,126,0.72)' : rgba(hue, 0.62);
      ctx.beginPath();
      for (const n of needles) {
        if (n.warm !== warmPass) continue;
        const fk = (n.theta / TAU) * 180, k0 = Math.floor(fk) % 180, f = fk - Math.floor(fk);
        const a = center[k0], b = center[k0 + 1];
        const cx = a[0] + (b[0] - a[0]) * f, cy = a[1] + (b[1] - a[1]) * f;
        let nx = b[1] - a[1], ny = -(b[0] - a[0]); const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
        const cj = Math.cos(n.jitter), sj = Math.sin(n.jitter);
        const dx = nx * cj - ny * sj, dy = nx * sj + ny * cj;
        const hw = r * a[3];
        const reach = hw + R * n.len * (1 + 0.16 * Math.sin(3 * n.theta - wave + n.phase)) * (0.7 + 0.3 * energy);
        ctx.moveTo(cx + dx * hw * 0.6, cy + dy * hw * 0.6);
        ctx.lineTo(cx + dx * reach, cy + dy * reach);
        if (n.pearl) tips.push(cx + dx * reach, cy + dy * reach, a[2]);
      }
      ctx.stroke();
    }
    // Tube body as depth-sorted translucent bands.
    const bands = [];
    for (let i = 0; i < 64; i++) {
      const th = (i / 64) * TAU;
      for (let j = 0; j < 10; j++) {
        const v = (j / 10) * TAU, ring = R + r * Math.cos(v);
        const p = project(ring * Math.sin(th), -ring * Math.cos(th), r * Math.sin(v), g);
        bands.push(p);
      }
    }
    bands.sort((p, q) => p[2] - q[2]);
    for (const p of bands) {
      const depth = clamp((p[2] + R) / (2 * R));
      ctx.fillStyle = rgba(hue, 0.035 + 0.11 * depth);
      ctx.fillRect(p[0] - 1.2, p[1] - 1.2, 2.4, 2.4);
    }
    // Twisted strands with a bright travelling pulse (drawStrands()).
    for (const s of strands) {
      const head = fract(s.pulse + (still ? 0 : t * LOOP * 2 / TAU)) * 120;
      ctx.strokeStyle = rgba(hue, 0.42);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const pulse = [];
      for (let k = 0; k <= 120; k++) {
        const th = (k / 120) * TAU, v = s.v0 + s.twist * th + (still ? 0 : s.spin * t);
        const ring = R + r * s.lift * Math.cos(v);
        const p = project(ring * Math.sin(th), -ring * Math.cos(th), r * s.lift * Math.sin(v), g);
        k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        if (k <= head && k >= head - 6) pulse.push(p);
      }
      ctx.stroke();
      if (pulse.length > 1) {
        ctx.strokeStyle = 'rgba(244,244,245,0.9)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        pulse.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(244,244,245,0.85)';
    for (let i = 0; i < tips.length; i += 3) { ctx.beginPath(); ctx.arc(tips[i], tips[i + 1], 1.5, 0, TAU); ctx.fill(); }
  };
}

/* REA dual rings: polar ruler ticks and scan heads ------------------------------------------ */
function ringsEffect(seed) {
  return (ctx, w, h, t, hue, still, energy) => {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
    const rings = [{ r: R, dir: 1, a: 0.55 }, { r: R * 0.78, dir: -1, a: 0.4 }, { r: R * 0.56, dir: 1, a: 0.3 }];
    rings.forEach((ring, idx) => {
      const rot = still ? idx * 0.4 : t * LOOP * ring.dir * (1 + idx * 0.5);
      ctx.strokeStyle = rgba(hue, ring.a * 0.7);
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      const step = 2.4;
      for (let deg = 0; deg < 360; deg += step) {
        const long = Math.round(deg / step) % 5 === 0;
        const a = rot + deg * DEG;
        const r0 = ring.r - (long ? 9 : 4), r1 = ring.r;
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      }
      ctx.stroke();
      ctx.strokeStyle = rgba(hue, ring.a * 0.5);
      ctx.beginPath(); ctx.arc(cx, cy, ring.r + 4, 0, TAU); ctx.stroke();
      // Short scanning arc segments (drawRing() second track).
      const scans = 3 + idx;
      ctx.lineWidth = 2.2;
      for (let k = 0; k < scans; k++) {
        const base = rot * 1.7 + (k / scans) * TAU + rand(seed + idx * 7 + k) * 0.6;
        ctx.strokeStyle = k === 0 ? 'rgba(244,244,245,0.85)' : rgba(hue, 0.75 * (0.6 + 0.4 * energy));
        ctx.beginPath(); ctx.arc(cx, cy, ring.r + 4, base, base + (8 + 10 * rand(seed + k)) * DEG); ctx.stroke();
      }
    });
    // Handoff diamond at the centre.
    const s = R * 0.08 * (1 + 0.15 * energy);
    ctx.strokeStyle = rgba(hue, 0.9);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy); ctx.closePath(); ctx.stroke();
  };
}

/* Kessler radar scope ----------------------------------------------------------------------- */
function scopeEffect(seed) {
  return (ctx, w, h, t, hue, still, energy) => {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.44;
    const lead = still ? -0.6 : t * LOOP * 4;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    const wedge = ctx.createLinearGradient(cx, cy, cx + Math.cos(lead) * r, cy + Math.sin(lead) * r);
    wedge.addColorStop(0, rgba(hue, 0.04)); wedge.addColorStop(1, rgba(hue, 0.28 + 0.12 * energy));
    ctx.fillStyle = wedge;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, lead - 55 * DEG, lead); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(hue, 0.9); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(lead) * r, cy + Math.sin(lead) * r); ctx.stroke();
    for (let k = 0; k < 18; k++) {
      const a = rand(seed + k * 7) * TAU, d = r * (0.18 + 0.75 * rand(seed + k * 7 + 3));
      const behind = (((lead - a) % TAU) + TAU) % TAU;
      const fresh = still ? 0.7 : 0.3 + 0.7 * Math.exp(-behind / 2.2);
      const hot = rand(seed + k * 7 + 5) > 0.7;
      ctx.fillStyle = hot ? `rgba(240,140,92,${0.85 * fresh})` : rgba(hue, 0.85 * fresh);
      ctx.fillRect(cx + Math.cos(a) * d - 1.3, cy + Math.sin(a) * d - 1.3, 2.6, 2.6);
    }
    ctx.restore();
    ctx.strokeStyle = rgba(hue, 0.22); ctx.lineWidth = 1;
    for (const k of [1, 0.66, 0.33]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
  };
}

/* Spider-style packet flights between a source column and target slots ---------------------- */
function packetsEffect(seed) {
  return (ctx, w, h, t, hue, still, energy) => {
    const origin = { x: w * 0.12, y: h * 0.5 };
    const slots = 9;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < slots; i++) {
      const y = h * (0.12 + 0.76 * (i + 0.5) / slots);
      ctx.strokeStyle = rgba(hue, 0.12);
      ctx.beginPath(); ctx.moveTo(w * 0.86, y); ctx.lineTo(w * 0.96, y); ctx.stroke();
    }
    const flights = 14;
    for (let i = 0; i < flights; i++) {
      const duration = 1.08 + rand(seed + i) * 0.8;
      const period = duration + 1.4;
      const age = still ? 0.6 + 0.4 * rand(seed + i * 3) : fract((t + rand(seed + i * 5) * period) / period) * period / duration;
      if (age > 1.25) continue;
      const progress = clamp(age), eased = 1 - (1 - progress) ** 3;
      const slot = Math.floor(rand(seed + i * 11) * slots);
      const end = { x: w * 0.86, y: h * (0.12 + 0.76 * (slot + 0.5) / slots) };
      const dx = end.x - origin.x, bend = Math.sin(i * 2.399) * h * 0.06;
      const a = { x: origin.x + dx / 3, y: origin.y + (end.y - origin.y) * 0.2 + bend };
      const b = { x: origin.x + dx * 2 / 3, y: end.y - (end.y - origin.y) * 0.2 + bend };
      ctx.strokeStyle = rgba(hue, 0.18 + 0.2 * energy);
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) { const p = cubicPoint((k / 24) * eased, origin, a, b, end); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.stroke();
      const head = cubicPoint(eased, origin, a, b, end);
      ctx.fillStyle = progress >= 1 ? rgba(hue, 1.25 - age) : 'rgba(244,244,245,0.9)';
      ctx.beginPath(); ctx.arc(head.x, head.y, progress >= 1 ? 3 : 1.8, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = rgba(hue, 0.9);
    ctx.beginPath(); ctx.arc(origin.x, origin.y, 4 + 2 * energy, 0, TAU); ctx.fill();
  };
}

const EFFECTS = { torus: torusEffect, rings: ringsEffect, scope: scopeEffect, packets: packetsEffect };

export function mount(canvas, { effect = 'torus', hue = '#8debd9', seed = 1, maxDpr = 2 } = {}) {
  const ctx = canvas.getContext('2d');
  const draw = (EFFECTS[effect] || torusEffect)(seed);
  let color = rgbOf(hue), visible = false, raf = 0, start = performance.now(), energy = 0, energyAt = -1e9, size = [0, 0];
  const still = () => reduceQuery.matches;
  const resize = () => {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(maxDpr, devicePixelRatio || 1);
    size = [rect.width, rect.height];
    canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    frame(performance.now());
  };
  function frame(now) {
    const t = (now - start) / 1000;
    energy = still() ? 0.5 : Math.exp(-(now - energyAt) / 700);
    ctx.clearRect(0, 0, size[0], size[1]);
    if (size[0] > 0) draw(ctx, size[0], size[1], still() ? 6 : t, color, still(), energy);
  }
  const loop = now => { frame(now); raf = visible && !document.hidden && !still() ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf && visible && !document.hidden && !still()) raf = requestAnimationFrame(loop); else if (still()) frame(performance.now()); };
  const io = new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); kick(); }, { rootMargin: '120px' });
  io.observe(canvas);
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  document.addEventListener('visibilitychange', kick);
  reduceQuery.addEventListener('change', kick);
  canvas.dataset.cyberMounted = effect;
  return {
    get running() { return raf !== 0; },
    setHue(next) { color = rgbOf(next); frame(performance.now()); },
    pulse() { energyAt = performance.now(); kick(); },
    destroy() { cancelAnimationFrame(raf); raf = 0; io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', kick); },
  };
}

export function autoMount(root = document) {
  const hueOf = canvas => canvas.dataset.cyberHue || getComputedStyle(canvas).color || '#8debd9';
  const mounted = [...root.querySelectorAll('canvas[data-cyber]:not([data-cyber-mounted])')].map((canvas, i) =>
    [canvas, mount(canvas, { effect: canvas.dataset.cyber, hue: hueOf(canvas), seed: i + 1 })]);
  // The canvas colour comes from CSS; follow the theme toggle.
  if (mounted.length) new MutationObserver(() => mounted.forEach(([canvas, fx]) => fx.setHue(hueOf(canvas))))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return mounted.map(([, fx]) => fx);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => autoMount());
else autoMount();
