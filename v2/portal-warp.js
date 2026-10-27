/* portal-warp.js — stepping through a 3D track tunnel pipe with flying Danmaku,
 * and mounting the armed 3D robot character beside each track on the Challenge page. */
import { ARENA_DOMAINS, HARNESS_NAMES, MODEL_CHARACTERS } from './arena-data.js';

export const PORTAL_COLORS = { econ: '#4fd1c5', fin: '#f2b545', soc: '#9d8df1' };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = x => Math.min(1, Math.max(0, x));
const smooth = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
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

// Draw a 3D perspective cylindrical tunnel pipe, flying Danmaku along the pipe walls,
// and the little armed robot firing energy pulses as it flies down the tunnel.
function drawTunnelPipe(g, cx, cy, far, t, color, danmakuItems) {
  // 12 longitudinal pipe rails converging to the vanishing point (cx, cy)
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rIn = 26, rOut = far * 1.15;
    g.strokeStyle = rgba(color, 0.24 * smooth(t / .25));
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
    g.lineTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
    g.stroke();
  }
  // 16 concentric 3D pipe rings rushing past the camera
  const numRings = 16;
  for (let i = 0; i < numRings; i++) {
    const u = ((i / numRings + t * 2.4) % 1);
    const r = 24 + Math.pow(u, 2.35) * far * 1.05;
    const alpha = Math.sin(u * Math.PI) * (.55 + .35 * smooth(t / .3));
    g.strokeStyle = i % 3 === 0 ? `rgba(255,255,255,${(alpha * .75).toFixed(3)})` : rgba(color, alpha);
    g.lineWidth = 1.2 + u * 4.5;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  // Energy bolts fired forward by the robot into the tunnel vanishing point
  for (let b = 0; b < 4; b++) {
    const bu = ((t * 3.8 + b * .25) % 1);
    const by = cy + 68 * (1 - bu);
    const bx = cx + 28 * (1 - bu);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3.2 * (1 - bu * .5);
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(cx + (bx - cx) * .65, cy + (by - cy) * .65);
    g.stroke();
  }
  g.restore();

  // Flying Danmaku pills streaming past along the left and right walls of the tunnel pipe
  if (danmakuItems?.length) {
    g.save();
    danmakuItems.forEach((text, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = (i % 4) - 1.5; // -1.5 .. +1.5
      const u = ((t * 1.55 + i / danmakuItems.length) % 1);
      const depthScale = .35 + Math.pow(u, 1.8) * 1.15;
      const dist = 70 + Math.pow(u, 1.85) * Math.min(far * .62, 480);
      const px = cx + side * dist * .82;
      const py = cy + lane * 46 * depthScale;
      const alpha = Math.sin(u * Math.PI) * smooth(t / .18) * (1 - smooth((t - .82) / .18));
      if (alpha <= .04) return;
      g.save();
      g.translate(px, py);
      g.scale(depthScale, depthScale);
      g.font = '600 13px Inter, "PingFang SC", sans-serif';
      const tw = Math.min(340, g.measureText(text).width + 38);
      const x0 = -tw / 2, y0 = -15, h = 30;
      g.fillStyle = `rgba(7, 12, 24, ${(0.84 * alpha).toFixed(3)})`;
      g.strokeStyle = rgba(color, 0.9 * alpha);
      g.lineWidth = 1.6;
      g.beginPath();
      g.roundRect(x0, y0, tw, h, 15);
      g.fill();
      g.stroke();
      g.fillStyle = rgba(color, alpha);
      g.beginPath();
      g.arc(x0 + 14, 0, 4.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = `rgba(244, 248, 255, ${alpha.toFixed(3)})`;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(text, x0 + 25, 1, tw - 34);
      g.restore();
    });
    g.restore();
  }
}

export function warp({ x, y, track, href, model, harness, lang }) {
  if (Number.isFinite(model) || Number.isFinite(harness)) {
    const cur = readLoadout();
    try { localStorage.setItem('metacase-loadout', JSON.stringify({ model: model ?? cur.model, harness: harness ?? cur.harness })); } catch {}
  }
  if (reduced()) { location.href = href; return; }
  const { c, g, W, H } = overlay(true), color = PORTAL_COLORS[track] || '#ffffff';
  const domain = ARENA_DOMAINS.find(d => d.id === track) || ARENA_DOMAINS[0];
  const isZh = typeof lang === 'number' ? lang === 1 : document.documentElement.lang.startsWith('zh');
  const danmakuItems = (domain.danmaku || []).map(pair => pair[isZh ? 1 : 0] || pair[0]);
  const far = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)), lines = streaks(180, far);
  const T = 1350, start = performance.now();
  let gone = false;
  const go = () => { if (!gone) { gone = true; location.href = href; } };
  const frame = now => {
    const t = clamp((now - start) / T), k = t * t;
    const cx = x + (W / 2 - x) * smooth(t / .45);
    const cy = y + (H / 2 - y) * smooth(t / .45);
    g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(4,7,15,${(.82 * smooth(t / .28)).toFixed(3)})`; g.fillRect(0, 0, W, H);
    drawStreaks(g, lines, cx, cy, far, k, .22 + .58 * smooth(t / .3), color);
    drawTunnelPipe(g, cx, cy, far, t, color, danmakuItems);
    g.globalCompositeOperation = 'lighter';
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, far * (.08 + .85 * k));
    glow.addColorStop(0, 'rgba(255,255,255,.92)'); glow.addColorStop(.18, rgba(color, .65)); glow.addColorStop(1, rgba(color, 0));
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    const flash = smooth((t - .78) / .22);
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash.toFixed(3)})`; g.fillRect(0, 0, W, H); }
    if (t < 1) requestAnimationFrame(frame); else go();
  };
  requestAnimationFrame(frame);
  setTimeout(go, T + 450);
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
  mountTrackGuardians();
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
      const key = new THREE.DirectionalLight(0xfff4e4, 2.6);
      key.position.set(-2.5, 4.5, 3.5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(domainColors[idx] || 0x45b5b0, 1.8);
      rim.position.set(2.5, 2.2, -2.5);
      scene.add(rim);

      const root = new THREE.Group();
      root.rotation.y = -0.32;
      scene.add(root);

      // Glowing track pedestal
      const dColor = domainColors[idx] || 0x45b5b0;
      cyl(root, 0.68, 0.76, 0.1, 0x1c2536, 0, -0.05, 0, 32);
      const pedRing = add(root, new THREE.TorusGeometry(0.7, 0.025, 10, 40), mat(dColor, { emissive: dColor, intensity: 1.4 }), 0, 0.05, 0, false);
      pedRing.rotation.x = Math.PI / 2;

      const bot = robot(PALETTE.cream, 0x67f5ff);
      bot.root.scale.setScalar(1.38);
      bot.root.position.y = 0.05;
      root.add(bot.root);

      const hullMeshes = [], eyeMeshes = [];
      bot.root.traverse(n => {
        if (!n.isMesh || !n.material) return;
        const hex = n.material.color?.getHex?.();
        if (hex === PALETTE.cream) hullMeshes.push(n);
        else if (hex === 0x67f5ff) eyeMeshes.push(n);
      });
      const trimMat = mat(0x45b5b0, { emissive: 0x45b5b0, intensity: 0.6 });
      for (const s of [-1, 1]) {
        const pld = block(bot.root, 0.14, 0.15, 0.22, trimMat, s * 0.28, 0.38, 0, 0.035);
        pld.rotation.z = -s * 0.2;
      }
      const crown = add(bot.head, new THREE.TorusGeometry(0.22, 0.024, 10, 32), mat(0xf2b545, { emissive: 0xf2b545, intensity: 0.9 }), 0, 0.48, 0, false);
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
        eyeMeshes.forEach(mesh => {
          mesh.material.color.setHex(m.eye);
          if (mesh.material.emissive) mesh.material.emissive.setHex(m.eye);
        });
        trimMat.color.setHex(m.trim);
        if (trimMat.emissive) trimMat.emissive.setHex(m.trim);
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
