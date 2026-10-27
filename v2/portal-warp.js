/* portal-warp.js — continuous dark-space 3D tunnel flight where the armed Robot Hero
 * is the visual centerpiece flying from index.html into challenge.html, plus the live
 * Three.js 3D guardian robot mounted beside each track on the Challenge page. */
import { ARENA_DOMAINS, HARNESS_NAMES, MODEL_CHARACTERS } from './arena-data.js';

export const PORTAL_COLORS = { econ: '#4fd1c5', fin: '#f2b545', soc: '#9d8df1' };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const smooth = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
const mix = (a, b, t) => a + (b - a) * t;
const hexCss = n => `#${Number(n).toString(16).padStart(6, '0')}`;
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${clamp(a).toFixed(3)})`;

function readLoadout() {
  try {
    const raw = JSON.parse(localStorage.getItem('metacase-loadout') || '{}');
    return {
      model: clamp(Math.round(Number(raw.model) || 0), 0, MODEL_CHARACTERS.length - 1),
      harness: clamp(Math.round(Number(raw.harness) || 0), 0, HARNESS_NAMES.length - 1),
    };
  } catch {
    return { model: 0, harness: 0 };
  }
}

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

function streaks(n, far) {
  let s = 7;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  return Array.from({ length: n }, () => ({
    a: rand() * Math.PI * 2,
    r: (0.14 + rand() * 0.22) * far,
    v: 0.35 + rand() * 0.95,
    w: 0.7 + rand() * 1.8,
    accent: rand() < 0.35,
  }));
}

function drawStreaks(g, lines, x, y, far, k, alpha, color, modelColor) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (const l of lines) {
    const r0 = l.r + far * k * l.v * 0.95;
    const r1 = r0 + far * (0.025 + 0.28 * k * l.v);
    const c = Math.cos(l.a), s = Math.sin(l.a);
    g.strokeStyle = l.accent ? rgba(modelColor || color, alpha * 0.85) : rgba(color, alpha * 0.65);
    g.lineWidth = l.w * (1 + 1.5 * k);
    g.beginPath(); g.moveTo(x + c * r0, y + s * r0); g.lineTo(x + c * r1, y + s * r1); g.stroke();
  }
  g.restore();
}

// Draw dark-space 3D cylindrical tunnel pipe with colored rings and peripheral Danmaku,
// keeping the center of the tunnel clear and dark so the Robot Hero is the unmistakable focal point.
function drawTunnelPipe(g, cx, cy, far, t, color, danmakuItems, modelColor, alphaScale = 1) {
  g.save();
  // Subtle dark-space radial vignette: dark core, colored outer tunnel walls
  const bgGrad = g.createRadialGradient(cx, cy, 40, cx, cy, far * 0.95);
  bgGrad.addColorStop(0, `rgba(6, 11, 22, ${(0.94 * alphaScale).toFixed(3)})`);
  bgGrad.addColorStop(0.55, `rgba(8, 15, 30, ${(0.92 * alphaScale).toFixed(3)})`);
  bgGrad.addColorStop(1, `rgba(4, 7, 15, ${(0.96 * alphaScale).toFixed(3)})`);
  g.fillStyle = bgGrad;
  g.fillRect(0, 0, cx * 2 + far, cy * 2 + far);

  // 12 longitudinal pipe rails converging toward a soft inner ring (rIn = 95 so center stays clean for the robot)
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rIn = 92, rOut = far * 1.1;
    g.strokeStyle = rgba(i % 2 === 0 ? color : (modelColor || color), 0.22 * alphaScale);
    g.lineWidth = 1.35;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
    g.lineTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
    g.stroke();
  }
  // 14 concentric 3D pipe rings rushing past the camera outside the robot's central flight lane
  const numRings = 14;
  for (let i = 0; i < numRings; i++) {
    const u = ((i / numRings + t * 2.1) % 1);
    const r = 88 + Math.pow(u, 2.2) * far * 0.98;
    const alpha = Math.sin(u * Math.PI) * 0.52 * alphaScale;
    g.strokeStyle = i % 3 === 0 ? rgba(modelColor || color, alpha * 0.85) : rgba(color, alpha);
    g.lineWidth = 1.2 + u * 3.6;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();

  // Flying Danmaku pills streaming past along the outer left and right walls of the tunnel pipe
  if (danmakuItems?.length) {
    g.save();
    danmakuItems.forEach((text, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = (i % 4) - 1.5;
      const u = ((t * 1.35 + i / danmakuItems.length) % 1);
      const depthScale = 0.48 + Math.pow(u, 1.65) * 0.92;
      const dist = 175 + Math.pow(u, 1.7) * Math.min(far * 0.56, 460);
      const px = cx + side * dist;
      const py = cy + lane * 54 * depthScale;
      const alpha = Math.sin(u * Math.PI) * alphaScale * 0.92;
      if (alpha <= 0.05) return;
      g.save();
      g.translate(px, py);
      g.scale(depthScale, depthScale);
      g.font = '600 13px Inter, system-ui, sans-serif';
      const tw = Math.min(340, g.measureText(text).width + 38);
      const x0 = -tw / 2, y0 = -15, h = 30;
      g.fillStyle = `rgba(7, 13, 26, ${(0.88 * alpha).toFixed(3)})`;
      g.strokeStyle = rgba(color, 0.85 * alpha);
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(x0, y0, tw, h, 15);
      g.fill();
      g.stroke();
      g.fillStyle = rgba(modelColor || color, alpha);
      g.beginPath();
      g.arc(x0 + 14, 0, 4.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = `rgba(240, 246, 255, ${alpha.toFixed(3)})`;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(text, x0 + 25, 1, tw - 34);
      g.restore();
    });
    g.restore();
  }
}

// Render the armed 3D-shaded Robot Hero in the center of the tunnel with its selected Model
// armor color, dark limbs, chest brand logo, head crest, thruster flames, and equipped weapon.
function drawHeroRobot(g, x, y, scale, t, modelIdx, harnessIdx, trackColor, alpha = 1) {
  if (alpha <= 0.01) return;
  const m = MODEL_CHARACTERS[modelIdx] || MODEL_CHARACTERS[0];
  const hName = HARNESS_NAMES[harnessIdx] || HARNESS_NAMES[0];
  const hullHex = hexCss(m.hull);
  const limbHex = hexCss(m.limb || 0x1e293b);
  const eyeHex = hexCss(m.eye);
  const trimHex = m.color || hexCss(m.trim);

  g.save();
  g.globalAlpha = clamp(alpha);
  g.translate(x, y);
  const bob = Math.sin(t * Math.PI * 4) * 5;
  const bank = Math.sin(t * Math.PI * 2) * 0.065;
  g.translate(0, bob);
  g.scale(scale, scale);

  // Colored magnetic aura around the robot (dark-friendly, no white washout)
  const aura = g.createRadialGradient(0, 0, 12, 0, 0, 118);
  aura.addColorStop(0, rgba(trimHex, 0.34));
  aura.addColorStop(0.55, rgba(trackColor, 0.16));
  aura.addColorStop(1, rgba(trackColor, 0));
  g.fillStyle = aura;
  g.beginPath();
  g.arc(0, 0, 118, 0, Math.PI * 2);
  g.fill();

  // Energy bolts fired forward into the tunnel from the equipped weapon on the right
  for (let b = 0; b < 3; b++) {
    const bu = ((t * 3.6 + b * 0.33) % 1);
    const bx0 = 56 * (1 - bu * 0.72);
    const by0 = -4 - bu * 92;
    const bx1 = 56 * (1 - (bu + 0.12) * 0.72);
    const by1 = -4 - (bu + 0.12) * 92;
    g.strokeStyle = b % 2 === 0 ? trimHex : trackColor;
    g.lineWidth = 3.4 * (1 - bu * 0.55);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(bx0, by0);
    g.lineTo(bx1, by1);
    g.stroke();
  }

  g.save();
  g.rotate(bank);

  // Dual thruster flame plumes under the robot's boots
  for (const sx of [-17, 17]) {
    const flameLen = 30 + Math.sin(t * 28 + sx) * 7;
    const flameGrad = g.createLinearGradient(sx, 42, sx, 42 + flameLen);
    flameGrad.addColorStop(0, eyeHex);
    flameGrad.addColorStop(0.45, trimHex);
    flameGrad.addColorStop(1, rgba(trimHex, 0));
    g.fillStyle = flameGrad;
    g.beginPath();
    g.moveTo(sx - 8, 42);
    g.lineTo(sx + 8, 42);
    g.lineTo(sx, 42 + flameLen);
    g.closePath();
    g.fill();
  }

  // Articulated legs & boots (dark metallic limb color)
  for (const sx of [-17, 17]) {
    g.fillStyle = limbHex;
    g.strokeStyle = trimHex;
    g.lineWidth = 1.6;
    g.beginPath();
    g.roundRect(sx - 8, 22, 16, 22, 6);
    g.fill();
    g.stroke();
  }

  // Left & right arms + shoulder pauldrons
  for (const sx of [-1, 1]) {
    g.save();
    g.translate(sx * 39, -2);
    g.rotate(sx * -0.18);
    // Shoulder pauldron in model accent color
    g.fillStyle = trimHex;
    g.beginPath();
    g.roundRect(-10, -14, 20, 14, 6);
    g.fill();
    // Arm segment
    g.fillStyle = limbHex;
    g.strokeStyle = hullHex;
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(-8, -2, 16, 24, 6);
    g.fill();
    g.stroke();
    g.restore();
  }

  // 3D-shaded Torso Hull in the model's signature color
  const torsoGrad = g.createLinearGradient(-32, -26, 32, 28);
  torsoGrad.addColorStop(0, hullHex);
  torsoGrad.addColorStop(1, limbHex);
  g.fillStyle = torsoGrad;
  g.strokeStyle = trimHex;
  g.lineWidth = 2.4;
  g.beginPath();
  g.roundRect(-32, -24, 64, 50, 14);
  g.fill();
  g.stroke();

  // Chest brand plate with the model's vector logo & badge
  g.fillStyle = '#070d19';
  g.strokeStyle = trimHex;
  g.lineWidth = 1.8;
  g.beginPath();
  g.roundRect(-22, -18, 44, 38, 9);
  g.fill();
  g.stroke();

  if (m.logo && typeof Path2D !== 'undefined') {
    g.save();
    g.translate(-11, -15);
    g.scale(0.92, 0.92);
    g.strokeStyle = trimHex;
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke(new Path2D(m.logo));
    g.restore();
  }
  g.fillStyle = '#f8fafc';
  g.font = '800 7.5px "JetBrains Mono", Inter, monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(m.badge || m.short, 0, 12);

  // 3D-shaded Head unit + dark visor + glowing eyes + model crown crest
  g.fillStyle = hullHex;
  g.strokeStyle = trimHex;
  g.lineWidth = 2.2;
  g.beginPath();
  g.roundRect(-26, -62, 52, 34, 12);
  g.fill();
  g.stroke();

  // Ear pods
  g.fillStyle = trimHex;
  g.beginPath();
  g.roundRect(-31, -52, 5, 14, 2.5);
  g.roundRect(26, -52, 5, 14, 2.5);
  g.fill();

  // Visor screen
  g.fillStyle = '#060b14';
  g.beginPath();
  g.roundRect(-20, -55, 40, 20, 7);
  g.fill();

  // Glowing eyes
  g.fillStyle = eyeHex;
  g.shadowColor = eyeHex;
  g.shadowBlur = 10;
  g.beginPath();
  g.arc(-9, -45, 4.2, 0, Math.PI * 2);
  g.arc(9, -45, 4.2, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;

  // Model-specific head crest above the helmet
  g.strokeStyle = trimHex;
  g.fillStyle = trimHex;
  g.lineWidth = 2.4;
  if (modelIdx === 0) {
    // Sol: halo ring
    g.beginPath();
    g.ellipse(0, -68, 16, 5, 0, 0, Math.PI * 2);
    g.stroke();
  } else if (modelIdx === 1) {
    // Opus: twin horns
    g.beginPath();
    g.moveTo(-12, -62); g.lineTo(-18, -76); g.lineTo(-6, -62);
    g.moveTo(12, -62); g.lineTo(18, -76); g.lineTo(6, -62);
    g.fill();
  } else if (modelIdx === 2) {
    // Gemini: twin orbital prisms
    g.beginPath();
    g.arc(-12, -69, 4.5, 0, Math.PI * 2);
    g.arc(12, -69, 4.5, 0, Math.PI * 2);
    g.fill();
  } else if (modelIdx === 3) {
    // Kimi: crescent arc
    g.beginPath();
    g.arc(0, -64, 14, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  } else if (modelIdx === 4) {
    // DeepSeek: dorsal fin crest
    g.beginPath();
    g.moveTo(0, -78); g.lineTo(-7, -62); g.lineTo(7, -62);
    g.closePath();
    g.fill();
  } else {
    // Qwen: star crown
    g.beginPath();
    g.moveTo(0, -77); g.lineTo(-9, -62); g.lineTo(9, -62);
    g.closePath();
    g.stroke();
  }

  // Equipped Harness 3D-styled blaster hovering beside right arm
  g.save();
  g.translate(54, -4);
  g.rotate(-0.22);
  g.fillStyle = '#0f172a';
  g.strokeStyle = trackColor;
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(-12, -18, 24, 34, 6);
  g.fill();
  g.stroke();
  // Blaster barrel & glowing muzzle core
  g.fillStyle = trimHex;
  g.beginPath();
  g.roundRect(-5, -28, 10, 12, 3);
  g.fill();
  g.fillStyle = eyeHex;
  g.beginPath();
  g.arc(0, -29, 4.5, 0, Math.PI * 2);
  g.fill();
  g.restore();

  g.restore(); // un-rotate bank

  // Floating HUD loadout nameplate beneath the robot
  const label = `${m.short}  x  ${hName}`;
  g.font = '700 11px "JetBrains Mono", Inter, sans-serif';
  const lw = Math.max(136, g.measureText(label).width + 28);
  g.fillStyle = 'rgba(7, 12, 24, 0.9)';
  g.strokeStyle = trimHex;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-lw / 2, 58, lw, 24, 12);
  g.fill();
  g.stroke();
  g.fillStyle = '#f8fafc';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 0, 70);

  g.restore();
}

export function warp({ x, y, track, href, model, harness, lang }) {
  const cur = readLoadout();
  const activeModel = Number.isFinite(model) ? model : cur.model;
  const activeHarness = Number.isFinite(harness) ? harness : cur.harness;
  try {
    localStorage.setItem('metacase-loadout', JSON.stringify({ model: activeModel, harness: activeHarness }));
  } catch {}
  if (reduced()) { location.href = href; return; }
  const { c, g, W, H } = overlay(true), color = PORTAL_COLORS[track] || '#4fd1c5';
  const m = MODEL_CHARACTERS[activeModel] || MODEL_CHARACTERS[0];
  const domain = ARENA_DOMAINS.find(d => d.id === track) || ARENA_DOMAINS[0];
  const isZh = typeof lang === 'number' ? lang === 1 : document.documentElement.lang.startsWith('zh');
  const danmakuItems = (domain.danmaku || []).map(pair => pair[isZh ? 1 : 0] || pair[0]);
  const far = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)), lines = streaks(140, far);
  const T = 1180, start = performance.now();
  let gone = false;
  const go = () => { if (!gone) { gone = true; location.href = href; } };
  const frame = now => {
    const t = clamp((now - start) / T), k = t * t;
    const enter = smooth(t / 0.36);
    const cx = mix(x, W / 2, enter);
    const cy = mix(y, H / 2, enter);
    g.clearRect(0, 0, W, H);
    const bgAlpha = smooth(t / 0.22);
    drawTunnelPipe(g, cx, cy, far, t, color, danmakuItems, m.color, bgAlpha);
    drawStreaks(g, lines, cx, cy, far, k, 0.25 + 0.55 * enter, color, m.color);
    // The armed Robot Hero is the visual centerpiece flying into the tunnel center
    const rx = mix(x, W / 2, enter);
    const ry = mix(y + 18, H / 2 + 6, enter);
    const rScale = mix(0.82, 1.36, smooth(t / 0.55));
    drawHeroRobot(g, rx, ry, rScale, t, activeModel, activeHarness, color, smooth(t / 0.14));
    if (t < 1) requestAnimationFrame(frame); else go();
  };
  requestAnimationFrame(frame);
  setTimeout(go, T + 400);
  addEventListener('pageshow', event => { if (event.persisted) c.remove(); }, { once: true });
}

// Arrive at a track on challenge.html:
// Seamless continuation from the dark tunnel where the Robot Hero flies out of the tunnel center
// and lands directly onto the track's 3D guardian stage beside the heading (zero white flash).
export function arrive({ track, target, flash = true }) {
  target.classList.add('is-arrived');
  setTimeout(() => target.classList.remove('is-arrived'), 2600);
  if (reduced()) return;
  const loadout = readLoadout();
  const m = MODEL_CHARACTERS[loadout.model] || MODEL_CHARACTERS[0];
  const domain = ARENA_DOMAINS.find(d => d.id === track) || ARENA_DOMAINS[0];
  const isZh = document.documentElement.lang.startsWith('zh');
  const danmakuItems = (domain.danmaku || []).map(pair => pair[isZh ? 1 : 0] || pair[0]);
  const { c, g, W, H } = overlay(false), color = PORTAL_COLORS[track] || '#4fd1c5';
  const far = Math.hypot(W, H), lines = streaks(120, far);
  const T = flash ? 1150 : 750, start = performance.now();
  const frame = now => {
    const t = clamp((now - start) / T);
    const guardianCanvas = target.querySelector('.track-guardian-canvas');
    const r = (guardianCanvas || target).getBoundingClientRect();
    const destX = guardianCanvas ? r.left + r.width / 2 : r.left + Math.min(r.width * 0.78, W - 140);
    const destY = guardianCanvas ? r.top + r.height / 2 : Math.max(96, Math.min(H - 96, r.top + 88));
    g.clearRect(0, 0, W, H);

    if (flash) {
      // Tunnel iris opens up smoothly over the Challenge page without any white flash
      const tunnelAlpha = 1 - smooth((t - 0.28) / 0.62);
      if (tunnelAlpha > 0.01) {
        drawTunnelPipe(g, W / 2, H / 2, far, 0.5 + t * 0.6, color, danmakuItems, m.color, tunnelAlpha);
        drawStreaks(g, lines, W / 2, H / 2, far, (1 - t) * 0.7, 0.6 * tunnelAlpha, color, m.color);
      }
      // Robot Hero swoops from the tunnel center (W/2, H/2 + 6) directly onto the track guardian stage (destX, destY)
      const moveP = smooth((t - 0.08) / 0.76);
      const rx = mix(W / 2, destX, moveP);
      const ry = mix(H / 2 + 6, destY, moveP) - Math.sin(moveP * Math.PI) * 42;
      const rScale = mix(1.36, 0.88, moveP);
      const robotAlpha = 1 - smooth((t - 0.74) / 0.24);
      drawHeroRobot(g, rx, ry, rScale, 0.6 + t, loadout.model, loadout.harness, color, robotAlpha);
    }

    // Colored touchdown shockwave ring around the landed robot guardian
    const wave = smooth(flash ? (t - 0.35) / 0.65 : t / 0.9);
    if (wave > 0 && wave < 1) {
      const ring = 260 * wave;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.lineWidth = 3 + 7 * (1 - wave);
      g.strokeStyle = rgba(m.color || color, 0.85 * (1 - wave));
      g.beginPath(); g.arc(destX, destY, ring, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = rgba(color, 0.65 * (1 - wave));
      g.lineWidth = 1.8;
      g.beginPath(); g.arc(destX, destY, ring * 0.72, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    if (t < 1) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}

// On the Challenge page: arriving through a portal (?via=portal#track-…), and the track
// gates at the top of the page, which land with the same ring.
const page = document.body && document.body.classList.contains('v2-page-challenge');
if (page) {
  mountTrackGuardians();
  const params = new URLSearchParams(location.search);
  if (params.get('via') === 'portal') {
    history.replaceState(history.state, '', location.pathname + location.hash);
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      const land = () => target.scrollIntoView({ block: 'start', behavior: 'instant' });
      land(); requestAnimationFrame(land);
      arrive({ track: target.id.replace('track-', ''), target, flash: true });
    }
  }
  document.querySelectorAll('.track-gate').forEach(gate => gate.addEventListener('click', () => {
    const target = document.getElementById(gate.getAttribute('href').slice(1));
    if (target) setTimeout(() => arrive({ track: gate.dataset.gate, target, flash: false }), 650);
  }));
}

async function mountTrackGuardians() {
  const tracks = [...document.querySelectorAll('.field-track')];
  if (!tracks.length) return;
  const loadout = readLoadout();
  const containers = tracks.map((trackEl, idx) => {
    const head = trackEl.querySelector('.track-head');
    const title = trackEl.querySelector(':scope > h3');
    const summary = trackEl.querySelector(':scope > .track-summary');
    const banner = document.createElement('div');
    banner.className = 'track-hero-row';
    const copyCol = document.createElement('div');
    copyCol.className = 'track-hero-copy';
    trackEl.insertBefore(banner, head);
    if (head) copyCol.append(head);
    if (title) copyCol.append(title);
    if (summary) copyCol.append(summary);
    const stageCard = document.createElement('div');
    stageCard.className = 'track-guardian';
    stageCard.setAttribute('data-no-translate', '');
    const canvas = document.createElement('canvas');
    canvas.className = 'track-guardian-canvas';
    canvas.width = 240;
    canvas.height = 176;
    canvas.setAttribute('aria-hidden', 'true');
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'track-guardian-badge';
    const dot = document.createElement('i'), text = document.createElement('span');
    badge.append(dot, text);
    stageCard.append(canvas, badge);
    banner.append(copyCol, stageCard);
    return { trackEl, idx, canvas, badge, dot, text };
  });

  try {
    const [THREE, { robot, block, cyl, add, mat, PALETTE }, { loadArenaWeapons }] = await Promise.all([
      import('../assets/vendor/three/three.module.js'),
      import('./mc-kit.js'),
      import('./arena-models.js'),
    ]);
    const weaponLib = await loadArenaWeapons().catch(() => null);
    const domainColors = [0x45b5b0, 0xf2b545, 0x7d6ad8];

    const views = containers.map(({ canvas, badge, dot, text, idx }) => {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(240, 176, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 240 / 176, 0.1, 40);
      camera.position.set(0.35, 1.55, 3.65);
      camera.lookAt(0, 0.85, 0);

      scene.add(new THREE.HemisphereLight(0xeef4ff, 0x1a2030, 2.2));
      const key = new THREE.DirectionalLight(0xfff4e4, 2.8);
      key.position.set(-2.5, 4.5, 3.5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(domainColors[idx] || 0x45b5b0, 1.8);
      rim.position.set(2.5, 2.2, -2.5);
      scene.add(rim);

      const root = new THREE.Group();
      root.rotation.y = -0.28;
      scene.add(root);

      const dColor = domainColors[idx] || 0x45b5b0;
      cyl(root, 0.68, 0.76, 0.1, 0x1c2536, 0, -0.05, 0, 32);
      const pedRing = add(root, new THREE.TorusGeometry(0.7, 0.025, 10, 40), mat(dColor, { emissive: dColor, intensity: 1.4 }), 0, 0.05, 0, false);
      pedRing.rotation.x = Math.PI / 2;

      const bot = robot(PALETTE.cream, 0x67f5ff);
      if (bot.head.children[4]) bot.head.children[4].visible = false;
      if (bot.head.children[5]) bot.head.children[5].visible = false;
      bot.root.scale.setScalar(1.38);
      bot.root.position.y = 0.05;
      root.add(bot.root);

      const hullMeshes = [], darkMeshes = [], eyeMeshes = [];
      bot.root.traverse(n => {
        if (!n.isMesh || !n.material) return;
        const hex = n.material.color?.getHex?.();
        if (hex === PALETTE.cream) hullMeshes.push(n);
        else if (hex === 0x1b2230) darkMeshes.push(n);
        else if (hex === 0x67f5ff) eyeMeshes.push(n);
      });
      const trimMat = mat(0x10a37f, { emissive: 0x10a37f, intensity: 0.75 });
      for (const s of [-1, 1]) {
        const pld = block(bot.root, 0.14, 0.15, 0.22, trimMat, s * 0.28, 0.38, 0, 0.035);
        pld.rotation.z = -s * 0.2;
      }

      // Chest brand logo canvas texture on the 3D guardian robot
      const chestCanvas = document.createElement('canvas');
      chestCanvas.width = 256;
      chestCanvas.height = 256;
      const chestCtx = chestCanvas.getContext('2d');
      const chestTex = new THREE.CanvasTexture(chestCanvas);
      chestTex.colorSpace = THREE.SRGBColorSpace;
      const chestPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.28),
        new THREE.MeshBasicMaterial({ map: chestTex, transparent: true }),
      );
      chestPlane.position.set(0, 0.28, 0.215);
      bot.root.add(chestPlane);

      function paintGuardianChest(m) {
        chestCtx.clearRect(0, 0, 256, 256);
        chestCtx.fillStyle = 'rgba(8, 12, 22, 0.92)';
        chestCtx.strokeStyle = m.color;
        chestCtx.lineWidth = 10;
        chestCtx.beginPath();
        chestCtx.roundRect(14, 14, 228, 228, 40);
        chestCtx.fill();
        chestCtx.stroke();
        if (m.logo && typeof Path2D !== 'undefined') {
          chestCtx.save();
          chestCtx.translate(56, 30);
          chestCtx.scale(6.0, 6.0);
          chestCtx.strokeStyle = m.color;
          chestCtx.lineWidth = 2.2;
          chestCtx.lineCap = 'round';
          chestCtx.lineJoin = 'round';
          chestCtx.stroke(new Path2D(m.logo));
          chestCtx.restore();
        }
        chestCtx.fillStyle = '#ffffff';
        chestCtx.font = '800 34px "JetBrains Mono", Inter, sans-serif';
        chestCtx.textAlign = 'center';
        chestCtx.fillText(m.badge || m.short, 128, 214);
        chestTex.needsUpdate = true;
      }

      const crown = add(bot.head, new THREE.TorusGeometry(0.22, 0.026, 10, 32), trimMat, 0, 0.48, 0, false);
      crown.rotation.x = 0.2;

      const weaponHand = new THREE.Group();
      weaponHand.position.set(0.36, 0.42, 0.28);
      weaponHand.rotation.set(-0.15, -0.35, 0.08);
      bot.root.add(weaponHand);
      const weaponClones = weaponLib
        ? weaponLib.weapons.map(w => {
            const c = w.clone(true);
            c.scale.setScalar(0.88);
            weaponHand.add(c);
            return c;
          })
        : [];

      function syncLoadout() {
        const m = MODEL_CHARACTERS[loadout.model] || MODEL_CHARACTERS[0];
        const hName = HARNESS_NAMES[loadout.harness] || HARNESS_NAMES[0];
        hullMeshes.forEach(mesh => mesh.material.color.setHex(m.hull));
        darkMeshes.forEach(mesh => mesh.material.color.setHex(m.limb || 0x1b2230));
        eyeMeshes.forEach(mesh => {
          mesh.material.color.setHex(m.eye);
          if (mesh.material.emissive) mesh.material.emissive.setHex(m.eye);
        });
        trimMat.color.setHex(m.trim);
        if (trimMat.emissive) trimMat.emissive.setHex(m.trim);
        paintGuardianChest(m);
        weaponClones.forEach((wc, wIdx) => { wc.visible = wIdx === loadout.harness; });
        dot.style.background = m.color;
        dot.style.boxShadow = `0 0 8px ${m.color}`;
        text.textContent = `${m.short} × ${hName}`;
      }
      syncLoadout();

      badge.addEventListener('click', () => {
        loadout.harness = (loadout.harness + 1) % HARNESS_NAMES.length;
        if (loadout.harness === 0) loadout.model = (loadout.model + 1) % MODEL_CHARACTERS.length;
        try { localStorage.setItem('metacase-loadout', JSON.stringify(loadout)); } catch {}
        views.forEach(v => v.syncLoadout());
      });

      return { renderer, scene, camera, bot, weaponHand, syncLoadout, idx };
    });

    const tick = now => {
      const t = now * 0.001;
      views.forEach(v => {
        v.bot.update(t + v.idx, 0);
        v.weaponHand.position.y = 0.42 + Math.sin(t * 2.2 + v.idx) * 0.025;
        v.renderer.render(v.scene, v.camera);
      });
      if (!reduced()) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } catch (err) {
    console.warn('Track guardian 3D preview skipped:', err);
  }
}
