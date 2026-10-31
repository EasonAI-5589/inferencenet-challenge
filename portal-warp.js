/* portal-warp.js — the portal flight from index.html into challenge.html, rendered in WebGL:
 * a dark cylindrical tunnel whose energy rings and danmaku boards rush past the camera, with
 * the armed Robot Hero (the chosen Model's armour, the chosen Harness's weapon) diving through
 * it. On the Challenge page the same hero flies out of the tunnel and lands on the track's 3D
 * guardian stage beside the heading; the guardians themselves are mounted here as well. */
import { ARENA_DOMAINS, HARNESS_NAMES, MODEL_CHARACTERS, EFFORTS, DEFAULT_EFFORT } from './arena-data.js?v=20261028-cascade';

export const PORTAL_COLORS = { econ: '#4fd1c5', fin: '#f2b545', soc: '#9d8df1' };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const smooth = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
const mix = (a, b, t) => a + (b - a) * t;
const SPACE = 0x04070f; // the tunnel's deep-space dark; nothing in the flight is lit white

// The loadout chosen in the arena: provider (model), the provider's model (variant), the
// reasoning effort and the harness.
function readLoadout() {
  try {
    const raw = JSON.parse(localStorage.getItem('metacase-loadout') || '{}');
    const model = clamp(Math.round(Number(raw.model) || 0), 0, MODEL_CHARACTERS.length - 1);
    return {
      model,
      variant: clamp(Math.round(Number(raw.variant) || 0), 0, MODEL_CHARACTERS[model].variants.length - 1),
      effort: clamp(Number.isInteger(raw.effort) ? raw.effort : DEFAULT_EFFORT, 0, EFFORTS.length - 1),
      harness: clamp(Math.round(Number(raw.harness) || 0), 0, HARNESS_NAMES.length - 1),
    };
  } catch {
    return { model: 0, variant: 0, effort: DEFAULT_EFFORT, harness: 0 };
  }
}
function saveLoadout(l) {
  const m = MODEL_CHARACTERS[l.model];
  try {
    localStorage.setItem('metacase-loadout', JSON.stringify({ ...l, provider: m.provider, modelName: m.variants[l.variant], effortName: EFFORTS[l.effort], harnessName: HARNESS_NAMES[l.harness] }));
  } catch {}
}
const loadoutLine = l => `${MODEL_CHARACTERS[l.model].provider} · ${MODEL_CHARACTERS[l.model].variants[l.variant]} · ${EFFORTS[l.effort]} × ${HARNESS_NAMES[l.harness]}`;

// Three.js, the toy kit and the harness weapons, requested as soon as this module loads so a
// flight can start the moment a portal is taken (the weapons arrive a little later).
let kitPromise;
function deps() {
  kitPromise ||= Promise.all([
    import('./assets/vendor/three/three.module.js'), import('./mc-kit.js'), import('./arena-models.js'),
  ]).then(([THREE, kit, { loadArenaWeapons }]) => ({ THREE, kit, weapons: loadArenaWeapons().catch(() => null) }));
  return kitPromise;
}
deps().catch(() => {});

function overlay(blocking) {
  const c = document.createElement('canvas');
  c.className = 'portal-warp'; c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '9999', pointerEvents: blocking ? 'auto' : 'none' });
  document.body.append(c);
  return c;
}

// The model's brand plate, painted for the chest of every armed robot: the provider's mark
// (filled, on its 0..24 grid), its name and the chosen model.
function paintChest(ctx, m, l = { variant: 0 }) {
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
  ctx.strokeStyle = m.color;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(14, 14, 228, 228, 40);
  ctx.fill();
  ctx.stroke();
  if (m.logo && typeof Path2D !== 'undefined') {
    ctx.save();
    ctx.translate(68, 36);
    ctx.scale(5, 5); // 24 units → 120 px
    ctx.fillStyle = m.color;
    ctx.fill(new Path2D(m.logo), m.rule || 'nonzero');
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px Inter, Arial, sans-serif';
  ctx.fillText(m.badge, 128, 186, 212);
  ctx.fillStyle = '#c9d4e6';
  ctx.font = '600 20px Inter, Arial, sans-serif';
  ctx.fillText(m.variants[l.variant] || m.variants[0], 128, 216, 212);
}

// The tunnel wall: dark panels with seams and a light strip in the track's colour.
function panelTexture(THREE, color) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#060b16'; g.fillRect(0, 0, 256, 256);
  g.globalAlpha = .4; g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(4, 4, 248, 248);
  g.globalAlpha = .9; g.fillStyle = color; g.fillRect(118, 0, 20, 10); g.fillRect(118, 246, 20, 10);
  g.globalAlpha = .16; g.fillRect(0, 124, 256, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(18, 44); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// One danmaku board: a dark pill with the track's rim, the model's dot and the line of text.
function boardTexture(THREE, text, color, accent) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), font = '600 44px Inter, system-ui, sans-serif';
  g.font = font;
  const w = Math.min(1600, Math.ceil(g.measureText(text).width) + 130);
  c.width = w; c.height = 96;
  g.fillStyle = 'rgba(7, 13, 26, 0.92)'; g.strokeStyle = color; g.lineWidth = 4;
  g.beginPath(); g.roundRect(4, 4, w - 8, 88, 44); g.fill(); g.stroke();
  g.fillStyle = accent; g.beginPath(); g.arc(50, 48, 12, 0, Math.PI * 2); g.fill();
  g.font = font; g.fillStyle = '#f0f6ff'; g.textBaseline = 'middle'; g.fillText(text, 80, 50);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { tex, aspect: w / 96 };
}

// The tunnel around a camera at the origin looking down -Z: the pipe, energy rings and speed
// streaks flying towards the camera, and the track's danmaku boards along both walls.
function tunnel(THREE, track, accent, zh) {
  const color = PORTAL_COLORS[track] || PORTAL_COLORS.econ;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SPACE, 16, 120);
  scene.add(new THREE.HemisphereLight(0xeef4ff, 0x1a2030, 2.1));
  const key = new THREE.DirectionalLight(0xfff4e4, 2.6); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(color), 2.4); rim.position.set(3, 2, -6); scene.add(rim);
  const fading = []; // [material, full opacity]: the tunnel dissolves as the Challenge page opens
  const faded = (mtl, o = 1) => { fading.push([mtl, o]); return mtl; };
  const glow = (c, o = 1) => faded(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }), o);

  const wall = panelTexture(THREE, color);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 240, 48, 1, true), faded(new THREE.MeshBasicMaterial({ map: wall, side: THREE.BackSide, transparent: true })));
  pipe.rotation.x = Math.PI / 2; pipe.position.z = -110; scene.add(pipe);

  const ringGeo = new THREE.TorusGeometry(6.3, .075, 8, 96), RING_GAP = 10, RINGS = 18;
  const rings = Array.from({ length: RINGS }, (_, i) => {
    const r = new THREE.Mesh(ringGeo, glow(i % 3 === 0 ? accent : color)); r.position.z = -i * RING_GAP; scene.add(r); return r;
  });

  const N = 150, seeds = Array.from({ length: N }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), r: 3.4 + ((i * 7919) % 97) / 97 * 3.2, z: ((i * 104729) % 1000) / 1000 * 150, v: .7 + ((i * 31) % 11) / 11 * .6 }));
  const lines = new Float32Array(N * 6), streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(lines, 3));
  const streakMat = faded(new THREE.LineBasicMaterial({ color, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false }), .75);
  scene.add(new THREE.LineSegments(streakGeo, streakMat));

  const domain = ARENA_DOMAINS.find(d => d.id === track) || ARENA_DOMAINS[0];
  const texts = (domain.danmaku || []).map(pair => pair[zh ? 1 : 0] || pair[0]), BOARD_GAP = 14, LOOP = Math.max(1, texts.length) * BOARD_GAP;
  const boards = texts.map((text, i) => {
    const { tex, aspect } = boardTexture(THREE, text, color, accent), side = i % 2 ? 1 : -1, h = .6;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), faded(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })));
    b.position.set(side * 4.7, -1.9 + (i % 4) * 1.25, -10 - i * BOARD_GAP);
    b.rotation.y = -side * 1.05; // turned towards the middle of the tunnel
    scene.add(b); return b;
  });

  let travelled = 0;
  return {
    scene, color,
    step(dt, speed, alpha = 1) {
      travelled += speed * dt;
      wall.offset.y = -((travelled / 240 * 44) % 1);
      rings.forEach(r => { r.position.z += speed * dt; if (r.position.z > 4) r.position.z -= RINGS * RING_GAP; r.rotation.z += dt * .4; });
      boards.forEach(b => { b.position.z += speed * dt * .9; if (b.position.z > 6) b.position.z -= LOOP; });
      const len = .25 + speed * .02;
      seeds.forEach((s, i) => {
        const z = ((s.z + travelled * s.v) % 150) - 146, x = Math.cos(s.a) * s.r, y = Math.sin(s.a) * s.r;
        lines.set([x, y, z, x, y, z - len], i * 6);
      });
      streakGeo.attributes.position.needsUpdate = true;
      fading.forEach(([mtl, o]) => { mtl.opacity = o * alpha; });
    },
  };
}

/* The armed Robot Hero: the kit's robot in the model's armour (hull, dark limbs, glowing eyes),
 * a crown and pauldrons in its trim, its brand plate on the chest, a thruster flame under each
 * foot and the harness's weapon in the right hand, firing laser pulses ahead. Its own copies of
 * the materials let it fade without touching the shared kit materials. The root sits at the
 * robot's waist, so it pitches and banks about its middle. */
const HERO_H = 1.1;
function hero(THREE, kit, m, harness, l) {
  const { robot, block, add, mat, PALETTE } = kit;
  const root = new THREE.Group(), pose = new THREE.Group(); root.add(pose);
  const bot = robot(m.hull, m.eye); bot.root.position.y = -.5; pose.add(bot.root);
  bot.head.children.slice(4).forEach(o => { o.visible = false; }); // the antenna gives way to the crown
  const mats = [];
  bot.root.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (o.material.color.getHex() === PALETTE.ink) o.material.color.setHex(m.limb || 0x1b2230);
    mats.push(o.material);
  });
  const trim = mat(m.trim, { emissive: m.trim, intensity: .75 }).clone(); mats.push(trim);
  [-1, 1].forEach(s => { block(bot.root, .14, .15, .22, trim, s * .28, .38, 0, .035).rotation.z = -s * .2; });
  add(bot.head, new THREE.TorusGeometry(.22, .026, 10, 32), trim, 0, .48, 0, false).rotation.x = .2;

  const chest = document.createElement('canvas'); chest.width = chest.height = 256;
  paintChest(chest.getContext('2d'), m, l);
  const plateTex = new THREE.CanvasTexture(chest); plateTex.colorSpace = THREE.SRGBColorSpace;
  const plateMat = new THREE.MeshBasicMaterial({ map: plateTex, transparent: true }); mats.push(plateMat);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(.3, .28), plateMat); plate.position.set(0, .34, .196); bot.root.add(plate);

  const flames = [-1, 1].map(s => {
    const f = new THREE.Group(); f.position.set(s * .14, 0, 0); bot.root.add(f);
    [[.085, .5, m.trim, .65], [.045, .34, m.eye, .95]].forEach(([r, h, c, o]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 18, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.rotation.x = Math.PI; cone.position.y = -h / 2; f.add(cone); mats.push(cone.material);
    });
    return f;
  });

  const hand = new THREE.Group(); hand.position.set(.36, .42, .28); hand.rotation.set(-.15, -.12, .08); bot.root.add(hand);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, .02, .5); hand.add(muzzle);
  let weapon = null;
  const arm = lib => { if (!lib || weapon) return; weapon = lib.weapons[harness]?.clone(true); if (weapon) { weapon.scale.setScalar(.88); hand.add(weapon); } };

  // laser pulses: short glowing bolts leaving the muzzle along the robot's heading
  const boltGeo = new THREE.CapsuleGeometry(.05, 1.3, 4, 10).rotateX(Math.PI / 2), Z = new THREE.Vector3(0, 0, 1);
  const bolts = Array.from({ length: 10 }, () => {
    const b = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: m.trim, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    b.visible = false; b.userData = { life: 0, dir: new THREE.Vector3() }; return b;
  });
  let scene = null, cooldown = 0;
  const q = new THREE.Quaternion();
  return {
    root, pose, arm,
    place(s) { scene = s; s.add(root); bolts.forEach(b => s.add(b)); },
    step(t, dt, firing) {
      bot.update(t, 0);
      flames.forEach((f, k) => { f.scale.set(1, .85 + Math.sin(t * 38 + k * 2) * .15, 1); });
      cooldown -= dt;
      if (firing && cooldown <= 0 && scene) {
        const b = bolts.find(x => !x.visible);
        if (b) {
          cooldown = .09; b.visible = true; b.userData.life = 1;
          muzzle.getWorldPosition(b.position);
          b.userData.dir.copy(Z).applyQuaternion(pose.getWorldQuaternion(q));
          b.quaternion.setFromUnitVectors(Z, b.userData.dir);
        }
      }
      bolts.forEach(b => {
        if (!b.visible) return;
        b.userData.life -= dt * 1.6;
        b.position.addScaledVector(b.userData.dir, 34 * dt);
        b.material.opacity = Math.max(0, b.userData.life);
        if (b.userData.life <= 0) b.visible = false;
      });
    },
    fade(a) {
      mats.forEach(mtl => { mtl.transparent = true; mtl.opacity = a * (mtl.userData.full ??= mtl.opacity); });
      if (weapon) weapon.visible = a > .5;
    },
  };
}

// A renderer and camera filling the overlay; screen points map onto planes in front of it.
function stage(THREE, canvas) {
  const W = innerWidth, H = innerHeight;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(SPACE, 1);
  const camera = new THREE.PerspectiveCamera(58, W / H, .05, 200);
  const ray = new THREE.Vector3();
  return {
    W, H, renderer, camera,
    // the point at distance `depth` in front of the camera, under screen point (px, py)
    toWorld(px, py, depth, out) {
      ray.set(px / W * 2 - 1, 1 - py / H * 2, .5).unproject(camera).sub(camera.position).normalize();
      return out.copy(camera.position).addScaledVector(ray, depth / -ray.z);
    },
    // world units per screen pixel at that distance
    unit(depth) { return 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / H; },
    lens(fov) { camera.fov = fov; camera.updateProjectionMatrix(); },
    dispose() { renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); },
  };
}

export async function warp({ x, y, track, href, model, variant, effort, harness, lang }) {
  const cur = readLoadout();
  const pick = (v, fallback, hi) => Number.isFinite(v) ? clamp(Math.round(v), 0, hi) : fallback;
  const activeModel = pick(model, cur.model, MODEL_CHARACTERS.length - 1);
  const flight = {
    model: activeModel,
    variant: pick(variant, activeModel === cur.model ? cur.variant : 0, MODEL_CHARACTERS[activeModel].variants.length - 1),
    effort: pick(effort, cur.effort, EFFORTS.length - 1),
    harness: pick(harness, cur.harness, HARNESS_NAMES.length - 1),
  };
  const activeHarness = flight.harness;
  saveLoadout(flight);
  if (reduced()) { location.href = href; return; }
  let gone = false;
  const go = () => { if (!gone) { gone = true; location.href = href; } };
  const canvas = overlay(true);
  addEventListener('pageshow', event => { if (event.persisted) canvas.remove(); }, { once: true });
  // the portal opens from the point that was taken: a dark iris over the page
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  canvas.style.clipPath = `circle(0px at ${x}px ${y}px)`;
  canvas.style.background = '#04070f';
  setTimeout(go, 3200); // whatever happens, the page is reached
  let THREE, kit, weapons;
  try { ({ THREE, kit, weapons } = await deps()); } catch { go(); return; }

  const m = MODEL_CHARACTERS[activeModel] || MODEL_CHARACTERS[0];
  const zh = typeof lang === 'number' ? lang === 1 : document.documentElement.lang.startsWith('zh');
  const view = stage(THREE, canvas), world = tunnel(THREE, track, m.color, zh), robot = hero(THREE, kit, m, activeHarness, flight);
  robot.place(world.scene); weapons.then(robot.arm);
  const centre = new THREE.Vector3(0, -.35, -4.2), from = view.toWorld(x, y, 4.2, new THREE.Vector3());
  const T = 1600, start = performance.now();
  let last = start;
  const frame = now => {
    const t = clamp((now - start) / T), dt = Math.min(.05, (now - last) / 1000); last = now;
    const open = smooth(t / .26);
    canvas.style.clipPath = open < 1 ? `circle(${(R * open).toFixed(1)}px at ${x}px ${y}px)` : 'none';
    const boost = smooth((t - .42) / .58);
    view.lens(mix(58, 90, boost));
    view.camera.position.set(Math.sin(now * .031) * .03 * boost, Math.cos(now * .027) * .03 * boost, 0);
    world.step(dt, mix(14, 160, boost));
    // the hero leaps from the portal to the middle facing us, turns down the tunnel and dives
    const enter = smooth(t / .32), turn = smooth((t - .22) / .3);
    robot.root.position.lerpVectors(from, centre, enter);
    robot.root.position.z -= boost * 3.4;
    robot.root.scale.setScalar(mix(.55, 1, enter));
    robot.root.rotation.y = Math.PI * turn;
    robot.pose.rotation.set(mix(-.12, .55, turn), 0, Math.sin(now * .004) * .22 * boost + (1 - turn) * .12);
    robot.step(now / 1000, dt, turn > .85);
    view.renderer.render(world.scene, view.camera);
    if (t < 1) requestAnimationFrame(frame); else go();
  };
  requestAnimationFrame(frame);
}

// Arrive at a track on challenge.html: the tunnel carries on over the page and dissolves while
// the hero flies out of it, towards the reader, and lands on the track's 3D guardian stage beside
// the heading with a ring of light. Without the tunnel (a track gate) only the ring is drawn.
export async function arrive({ track, target, flash = true }) {
  target.classList.add('is-arrived');
  setTimeout(() => target.classList.remove('is-arrived'), 2600);
  if (reduced()) return;
  const canvas = overlay(false);
  if (flash) canvas.style.background = '#04070f'; // still inside the tunnel until the first frame
  let THREE, kit, weapons;
  try { ({ THREE, kit, weapons } = await deps()); } catch { canvas.remove(); return; }

  const loadout = readLoadout(), m = MODEL_CHARACTERS[loadout.model] || MODEL_CHARACTERS[0];
  const zh = document.documentElement.lang.startsWith('zh');
  const view = stage(THREE, canvas), world = tunnel(THREE, track, m.color, zh);
  canvas.style.background = 'none';
  let robot = null;
  if (flash) { robot = hero(THREE, kit, m, loadout.harness, loadout); robot.place(world.scene); weapons.then(robot.arm); }
  else world.step(0, 0, 0);
  const DEPTH = 5, from = new THREE.Vector3(0, -.3, -9), lift = new THREE.Vector3(), dest = new THREE.Vector3(), feet = new THREE.Vector3();
  const rings = [m.color, PORTAL_COLORS[track] || PORTAL_COLORS.econ].map((c, k) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, .035 - k * .01, 8, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: 0, depthWrite: false }));
    world.scene.add(r); return r;
  });
  const T = flash ? 1550 : 800, start = performance.now();
  let last = start;
  const frame = now => {
    const t = clamp((now - start) / T), dt = Math.min(.05, (now - last) / 1000); last = now;
    const guardian = target.querySelector('.track-guardian-canvas'), r = (guardian || target).getBoundingClientRect();
    const cx = guardian ? r.left + r.width / 2 : r.left + Math.min(r.width * .78, view.W - 140);
    const cy = guardian ? r.top + r.height / 2 : Math.max(96, Math.min(view.H - 96, r.top + 88));
    const size = guardian ? r.height * .56 : 120; // the guardian robot's height on the page
    if (flash) {
      const bg = 1 - smooth((t - .22) / .45);
      view.renderer.setClearColor(SPACE, bg);
      view.lens(mix(86, 50, smooth(t / .55)));
      world.step(dt, mix(130, 6, smooth(t / .6)), bg);
    } else {
      view.renderer.setClearColor(SPACE, 0);
      view.lens(50);
    }
    view.toWorld(cx, cy, DEPTH, dest);
    const scale = size * view.unit(DEPTH) / HERO_H;
    feet.copy(dest).y -= HERO_H * scale * .5;
    if (robot) {
      // out of the tunnel towards the reader, then a rising arc down onto the stage
      const p = smooth((t - .06) / .72), u = 1 - p;
      lift.copy(from).lerp(dest, .5).y += 1.6;
      robot.root.position.set(0, 0, 0).addScaledVector(from, u * u).addScaledVector(lift, 2 * u * p).addScaledVector(dest, p * p);
      robot.root.scale.setScalar(mix(1, scale, smooth((t - .3) / .5)));
      robot.root.rotation.y = Math.atan2(dest.x - from.x, 6) * .35 * (1 - p);
      robot.pose.rotation.set(mix(-.35, 0, p), 0, Math.sin(now * .005) * .2 * (1 - p));
      robot.step(now / 1000, dt, p < .5);
      robot.fade(1 - smooth((t - .86) / .12));
    }
    // the touchdown: two rings of light spreading over the stage
    const wave = smooth(flash ? (t - .7) / .3 : t / .9);
    rings.forEach((ring, k) => {
      ring.position.copy(feet);
      ring.rotation.set(Math.PI / 2 - .45, 0, 0);
      ring.scale.setScalar(Math.max(.001, scale * (.35 + wave * (2.2 - k * .5))));
      ring.material.opacity = wave > 0 && wave < 1 ? (1 - wave) * (.95 - k * .2) : 0;
    });
    view.renderer.render(world.scene, view.camera);
    if (t < 1) requestAnimationFrame(frame); else view.dispose();
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
    const { THREE, kit: { robot, block, cyl, add, mat, PALETTE }, weapons } = await deps();
    const weaponLib = await weapons;
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
        paintChest(chestCtx, m, loadout);
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
        text.textContent = loadoutLine(loadout);
      }
      syncLoadout();

      badge.addEventListener('click', () => {
        loadout.harness = (loadout.harness + 1) % HARNESS_NAMES.length;
        if (loadout.harness === 0) { loadout.model = (loadout.model + 1) % MODEL_CHARACTERS.length; loadout.variant = 0; }
        saveLoadout(loadout);
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
