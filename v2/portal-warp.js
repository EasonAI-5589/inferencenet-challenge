/* portal-warp.js — stepping through a track portal. On the homepage the chosen doorway
 * floods with light and the page warps into it: streaks rush out from the portal in the
 * track's colour and the screen burns to white. The Challenge page then opens on that
 * track and the light collapses onto its heading as a shockwave. Canvas 2D on a
 * full-window overlay; with reduced motion both ends are skipped. */
export const PORTAL_COLORS = { econ: '#4fd1c5', fin: '#f2b545', soc: '#9d8df1' };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = x => Math.min(1, Math.max(0, x));
const smooth = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a.toFixed(3)})`;

function overlay(blocking) {
  const c = document.createElement('canvas');
  c.className = 'portal-warp'; c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '9999', pointerEvents: blocking ? 'auto' : 'none' });
  document.body.append(c);
  const dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  return { c, g, W, H };
}
// The same streaks every time: angle, start, speed, width, and whether it burns white.
function streaks(n, far) {
  let s = 7;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  return Array.from({ length: n }, () => ({ a: rand() * Math.PI * 2, r: rand() * far * .12, v: .35 + rand() * .95, w: .6 + rand() * 1.9, white: rand() < .3 }));
}
function drawStreaks(g, lines, x, y, far, k, alpha, color) {
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (const l of lines) {
    const r0 = l.r + far * k * l.v * 1.3, r1 = r0 + far * (.02 + .45 * k * l.v);
    const c = Math.cos(l.a), s = Math.sin(l.a);
    g.strokeStyle = l.white ? `rgba(255,255,255,${(alpha * .9).toFixed(3)})` : rgba(color, alpha);
    g.lineWidth = l.w * (1 + 2.2 * k);
    g.beginPath(); g.moveTo(x + c * r0, y + s * r0); g.lineTo(x + c * r1, y + s * r1); g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}

// Leave through the portal at (x, y) and open href once the screen has burned to white.
export function warp({ x, y, track, href }) {
  if (reduced()) { location.href = href; return; }
  const { c, g, W, H } = overlay(true), color = PORTAL_COLORS[track] || '#ffffff';
  const far = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)), lines = streaks(240, far);
  const T = 1050, start = performance.now();
  let gone = false;
  const go = () => { if (!gone) { gone = true; location.href = href; } };
  const frame = now => {
    const t = clamp((now - start) / T), k = t * t * t;
    g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(3,5,12,${(.6 * smooth(t / .35)).toFixed(3)})`; g.fillRect(0, 0, W, H);
    drawStreaks(g, lines, x, y, far, k, .25 + .75 * smooth(t / .3), color);
    g.globalCompositeOperation = 'lighter';
    const glow = g.createRadialGradient(x, y, 0, x, y, far * (.1 + .95 * k));
    glow.addColorStop(0, 'rgba(255,255,255,.95)'); glow.addColorStop(.22, rgba(color, .7)); glow.addColorStop(1, rgba(color, 0));
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    const flash = smooth((t - .7) / .3);
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash.toFixed(3)})`; g.fillRect(0, 0, W, H); }
    if (t < 1) requestAnimationFrame(frame); else go();
  };
  requestAnimationFrame(frame);
  setTimeout(go, T + 450); // if frames stall (a hidden tab), still go
  // coming back through the browser's history: no white screen left behind
  addEventListener('pageshow', event => { if (event.persisted) c.remove(); }, { once: true });
}

// Arrive at a track: the white light collapses onto its heading and rings out from it.
// flash: false for a move within the page (only the ring).
export function arrive({ track, target, flash = true }) {
  target.classList.add('is-arrived');
  setTimeout(() => target.classList.remove('is-arrived'), 2600);
  if (reduced()) return;
  const { c, g, W, H } = overlay(false), color = PORTAL_COLORS[track] || '#ffffff';
  const far = Math.hypot(W, H), lines = streaks(180, far);
  const T = 1200, start = performance.now();
  const frame = now => {
    const t = clamp((now - start) / T), r = target.getBoundingClientRect();
    const x = r.left + Math.min(r.width / 2, 120), y = Math.max(0, Math.min(H, r.top + 56));
    g.clearRect(0, 0, W, H);
    const white = flash ? 1 - smooth(t / .4) : 0;
    if (white > 0) { g.fillStyle = `rgba(255,255,255,${white.toFixed(3)})`; g.fillRect(0, 0, W, H); }
    const inward = flash ? 1 - smooth(t / .55) : 0; // streaks fall back into the heading
    if (inward > 0) drawStreaks(g, lines, x, y, far, inward * inward, .8 * inward, color);
    const wave = smooth(t / .9), ring = far * .7 * wave;
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 3 + 10 * (1 - wave);
    g.strokeStyle = rgba(color, .85 * (1 - wave)); g.beginPath(); g.arc(x, y, ring, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${(.5 * (1 - wave)).toFixed(3)})`; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, ring * .82, 0, Math.PI * 2); g.stroke();
    const glow = g.createRadialGradient(x, y, 0, x, y, 220);
    glow.addColorStop(0, rgba(color, .55 * (1 - wave))); glow.addColorStop(1, rgba(color, 0));
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    if (t < 1) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}

// On the Challenge page: arriving through a portal (?via=portal#track-…), and the track
// gates at the top of the page, which land with the same ring.
const page = document.body && document.body.classList.contains('v2-page-challenge');
if (page) {
  const params = new URLSearchParams(location.search);
  if (params.get('via') === 'portal') {
    history.replaceState(history.state, '', location.pathname + location.hash);
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      // land on the track at once (the browser's own jump to the fragment comes late), then arrive
      const land = () => target.scrollIntoView({ block: 'start', behavior: 'instant' });
      land(); requestAnimationFrame(land);
      arrive({ track: target.id.replace('track-', ''), target });
    }
  }
  document.querySelectorAll('.track-gate').forEach(gate => gate.addEventListener('click', () => {
    const target = document.getElementById(gate.getAttribute('href').slice(1));
    if (target) setTimeout(() => arrive({ track: gate.dataset.gate, target, flash: false }), 650);
  }));
}
