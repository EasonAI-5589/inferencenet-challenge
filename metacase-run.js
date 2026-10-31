/* metacase-run.js — 05 · The Metacase Challenge: what a participant does, in a workroom.
 * (1) Choose: a participant takes a case from a track's shelf and opens it on the desk: its
 *     goal, its evidence and its constraints.
 * (2) Configure: as in the arena, the model is the agent's character and the harness its weapon.
 *     The participant hands the robot behind the desk a model, which reasons and decides: it
 *     powers up in that provider's armour, brand plate, crest and visor. Then a harness, which
 *     lends it tools, a workflow and its run settings: a blaster that docks at its right shoulder.
 * (3) Execute: the agent reads, plans, calls tools and writes until it delivers; every call
 *     leaves the harness's muzzle and adds a page to the trajectory on the stand by the desk.
 * (4) Verify: the deliverable goes into the verifier, the only place the sealed reference is
 *     piped to; the checks come back mixed, the failing page lifts out of the trajectory with its
 *     failing lines in red, and the verifier pins it.
 * (5) Contribute: what the run yields is set out as three kinds of contribution: a Metacase, the
 *     Model & Harness (the armed agent itself) and a Failure Case (that page, standing as a
 *     diagnostic board).
 * Rendered by the shared stage; the page's labels follow the objects through onProject. */
import * as THREE from './assets/vendor/three/three.module.js';
import { PALETTE, BOOK, closedBook, bookTabs, mat, add, block, cyl, ball, rbox, robot, person, lights, blaster, lens, terminal } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitSafe, fitBox, toView, glowSprite } from './mc-stage.js';
import { toonify } from './mc-toon.js';
import { MODEL_CHARACTERS, HARNESS_NAMES, EFFORTS, DEFAULT_EFFORT } from './arena-data.js?v=20261028-cascade';

const DESK_Z = .8, DESK_Y = .72, WALL_Z = -2.6, WALL_H = 3.4;
const TRACKS = [PALETTE.teal, PALETTE.amber, PALETTE.violet];  // Economics, Finance, Social science
const CABINET = new THREE.Vector3(-3.35, 0, -1.25);
const STAND = new THREE.Vector3(1.42, 0, .95);                   // the trajectory stand
const VERIFIER = new THREE.Vector3(2.75, 0, .05), SAFE = new THREE.Vector3(3.55, 0, -1.45);
const PLINTHS = [-1.55, 0, 1.55], PLINTH_Z = 2.05, PLINTH_H = .42;
const PAGES = 12, FAILED = 8;                                     // trajectory pages; the step the check pins
const SHEET_GEO = new THREE.PlaneGeometry(.4, .5);
// The agent stands behind the desk, low and dormant until it is given a model; on plinth B it
// stands a little smaller. Its plate, weapon and the weapon's length are in the robot's units.
const AGENT_Z = DESK_Z - .7, AGENT_S = .82, AGENT_ON_PLINTH = .62, AGENT_Y = [.4, .5];
const PLATE_AT = new THREE.Vector3(0, .41, .199);
const GUN_AT = new THREE.Vector3(.46, .38, .26), GUN_TURN = new THREE.Euler(.1, 1, .1), GUN_SIZE = .8;
const BARE = { hull: 0xf7f5f0, limb: PALETTE.ink, eye: 0x8ff6ff, trim: 0xd5d9e0 };  // before it has a model

const springy = x => { const q = clamp(x) - 1; return 1 + 2.6 * q * q * q + 1.6 * q * q; }; // eases past 1 and settles
const arc = (out, a, b, k, lift) => out.copy(a).lerp(b, k).setY(lerp(a.y, b.y, k) + Math.sin(Math.PI * k) * lift);

/* ---- what the case holds, drawn on canvas: its goal, two pieces of evidence, its constraints ---- */
function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), r = (x, y, ww, hh, rad, fill) => { g.beginPath(); g.roundRect(x, y, ww, hh, rad); g.fillStyle = fill; g.fill(); };
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); paint(g, r, w, h); tex.needsUpdate = true; };
  draw(); document.fonts?.ready.then(draw); // printed text is drawn again once the page's fonts are in
  tex.userData.redraw = draw;
  return tex;
}
const lines = (r, y, n, W, w = W - 48) => { for (let i = 0; i < n; i++) r(24, y + i * 19, w * (i % 3 === 2 ? .6 : 1), 7, 3, '#c9cdd6'); };
const CASE_PAGES = [
  (g, r, W) => { r(0, 0, W, 320, 18, '#fbfaf6'); g.strokeStyle = '#45b5b0'; g.lineWidth = 10; [70, 46, 22].forEach(rad => { g.beginPath(); g.arc(W / 2, 112, rad, 0, Math.PI * 2); g.stroke(); }); r(W / 2 - 8, 104, 16, 16, 8, '#e2667a'); lines(r, 214, 4, W); }, // the goal
  (g, r, W) => { r(0, 0, W, 320, 18, '#fbfaf6'); r(24, 26, 150, 14, 5, '#1f2a3a'); lines(r, 58, 12, W); },                                                                 // a paper
  (g, r, W) => { r(0, 0, W, 320, 18, '#fbfaf6'); r(24, 24, W - 48, 26, 6, '#f2b545'); for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) r(28 + j * 70, 64 + i * 30, 30 + ((i * 5 + j * 3) % 4) * 9, 9, 4, '#9aa3b2'); }, // a data sheet
  (g, r, W) => { r(0, 0, W, 320, 18, '#fbfaf6'); r(24, 24, W - 48, 30, 6, '#7d6ad8'); for (let i = 0; i < 5; i++) { r(30, 80 + i * 44, 18, 18, 4, '#7d6ad8'); r(62, 84 + i * 44, (W - 100) * (i % 2 ? .7 : 1), 9, 4, '#c9cdd6'); } }, // the constraints
];
const REPORT = (g, r, W, H) => { // the deliverable: a titled report with a figure and a table
  r(0, 0, W, H, 16, '#fbfaf6'); r(0, 0, W, 54, 0, '#2c5468');
  r(22, 74, 150, 16, 5, '#1f2a3a'); r(22, 98, 96, 10, 4, '#8a93a5');
  r(22, 124, W - 44, 104, 10, '#e9f3f2');
  g.strokeStyle = '#45b5b0'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(36, 210); g.bezierCurveTo(90, 190, 140, 150, W - 36, 140); g.stroke();
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) r(22 + j * ((W - 44) / 3), 246 + i * 22, (W - 44) / 3 - 8, 12, 4, i ? '#d5d9e0' : '#9aa3b2');
};

/* ---- the failure case, as its diagnostic trace prints it: the run's steps, the two that failed
 * in red, the one they threw off in amber, and the diagnosis. Laid out on 512 × 680. ---- */
const TRACE = [ // step, call, its detail, verdict, tag
  ['01', 'load_evidence()', 'panel.dta', 'pass', 'PASS'],
  ['02', 'clean_sample()', 'N = 1.94M', 'pass', 'PASS'],
  ['03', 'fe_ols(y ~ treat,', 'cluster=None)', 'fail', 'FAIL'],
  ['04', 'verify_se()', '0.041 vs ref 0.012', 'fail', 'SE +18.4%'],
  ['05', 'submit_result()', 'p-val mismatch', 'drift', 'DRIFT'],
];
const INKS = { // row, edge bar and its width, step number, call, detail, tag, tag text
  pass: ['#eef3ef', '#22a06b', 6, '#7b8794', '#1f2a3a', '#64748b', '#d1fadf', '#15803d'],
  fail: ['#fee2e2', '#e11d48', 14, '#e11d48', '#be123c', '#be123c', '#e11d48', '#ffffff'],
  drift: ['#fff4e0', '#f59e0b', 8, '#b45309', '#7c4a03', '#b45309', '#fde68a', '#92400e'],
};
const ROWS = { top: 110, h: 82, step: 88 };
// The print on the board (the failing page, grown) and where its rows fall on it, in board units.
const FACE = { w: .64, h: .85 }, LEAN = .16, ON_STAND = .42;
const rowY = (i, at = .5) => (.5 - (ROWS.top + i * ROWS.step + ROWS.h * at) / 680) * FACE.h;
const mono = (s, w = 700) => `${w} ${s}px "Space Mono", ui-monospace, monospace`, sans = (s, w = 800) => `${w} ${s}px Inter, Arial, sans-serif`;
const spaced = (g, px) => { if ('letterSpacing' in g) g.letterSpacing = `${px}px`; };
function fit(g, text, font, size, maxW) { let s = size; g.font = font(s); while (g.measureText(text).width > maxW && s > 10) g.font = font(--s); }
function capsule(g, text, x, cy, h, fill, ink, size, fromRight = false) { // returns its left and right edges
  g.font = sans(size); spaced(g, 1);
  const w = g.measureText(text).width + h * .8, left = fromRight ? x - w : x;
  g.beginPath(); g.roundRect(left, cy - h / 2, w, h, h / 2); g.fillStyle = fill; g.fill();
  g.fillStyle = ink; g.textAlign = 'center'; g.fillText(text, left + w / 2, cy + 1);
  g.textAlign = 'left'; spaced(g, 0);
  return [left, left + w];
}
const TRACE_PRINT = (g, r, W, H) => {
  g.scale(W / 512, H / 680); g.textBaseline = 'middle'; g.textAlign = 'left';
  r(0, 0, 512, 680, 0, '#fbfaf6');
  r(0, 0, 512, 100, 0, '#1f2a3a');
  const [, end] = capsule(g, 'FAIL CASE', 16, 38, 40, '#e11d48', '#ffffff', 19);
  g.fillStyle = '#ffffff'; fit(g, 'TRAJECTORY & DIAGNOSIS', sans, 25, 496 - end - 14); g.fillText('TRAJECTORY & DIAGNOSIS', end + 14, 39);
  g.fillStyle = '#9fb1c9'; spaced(g, 2); fit(g, 'FAILURE CASE · DIAGNOSTIC TRACE', s => mono(s, 400), 15, 480); g.fillText('FAILURE CASE · DIAGNOSTIC TRACE', 16, 80); spaced(g, 0);
  TRACE.forEach(([n, call, detail, verdict, label], i) => {
    const [bg, bar, barW, num, ink, sub, fill, text] = INKS[verdict], y = ROWS.top + i * ROWS.step;
    r(12, y, 488, ROWS.h, 10, bg);
    if (verdict === 'fail') { g.strokeStyle = '#fca5a5'; g.lineWidth = 2; g.beginPath(); g.roundRect(13, y + 1, 486, ROWS.h - 2, 9); g.stroke(); }
    r(12, y, barW, ROWS.h, [10, 0, 0, 10], bar);
    g.fillStyle = num; g.font = mono(27); g.fillText(n, 36, y + 28);
    g.fillStyle = ink; fit(g, call, mono, 31, 406); g.fillText(call, 82, y + 28);
    const [left] = capsule(g, label, 490, y + 59, 30, fill, text, 16, true);
    g.fillStyle = sub; fit(g, detail, s => mono(s, verdict === 'pass' ? 400 : 700), 22, left - 92); g.fillText(detail, 82, y + 60);
  });
  // the root cause
  r(12, 554, 488, 114, 14, '#9f1239');
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(42, 571); g.lineTo(58, 599); g.lineTo(26, 599); g.closePath(); g.fill();
  g.fillStyle = '#9f1239'; g.font = sans(17, 900); g.textAlign = 'center'; g.fillText('!', 42, 590); g.textAlign = 'left';
  g.fillStyle = '#fecdd3'; spaced(g, 2); g.font = sans(19); g.fillText('DIAGNOSIS:', 70, 586); spaced(g, 0);
  g.fillStyle = '#ffffff'; fit(g, 'Missing two-way cluster SE', sans, 34, 460); g.fillText('Missing two-way cluster SE', 28, 632);
};

/* ---- the model's pieces, as the arena draws its characters (arena-scene.js) ---- */
// The chest plate: the provider's mark (filled, on its 0..24 grid), its name, and the model and
// reasoning effort chosen in the loadout. 512 × 320.
function paintPlate(g, m, variant, effort) {
  g.fillStyle = 'rgba(6, 10, 20, 0.92)'; g.strokeStyle = m.color; g.lineWidth = 8;
  g.beginPath(); g.roundRect(16, 16, 480, 288, 48); g.fill(); g.stroke();
  g.save(); g.translate(42, 76); g.scale(7, 7); g.fillStyle = m.color; g.fill(new Path2D(m.logo), m.rule || 'nonzero'); g.restore();
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff'; g.font = sans(50); g.fillText(m.badge, 232, 104, 248);
  g.fillStyle = '#dbe4f3'; g.font = sans(32, 600); g.fillText(m.variants[variant] || m.variants[0], 234, 164, 246);
  for (let k = 0; k < EFFORTS.length; k++) { const h = 12 + k * 7; g.fillStyle = k <= effort ? m.color : 'rgba(255, 255, 255, 0.16)'; g.fillRect(234 + k * 16, 244 - h, 10, h); }
  g.fillStyle = m.color; g.font = mono(28); g.fillText(EFFORTS[effort].toUpperCase(), 310, 232, 170);
}
// The six head crests, one per provider in MODEL_CHARACTERS order. The arena centres its boxes and
// cylinders on their y; the kit's sit on it, so `box` and `drum` lower them by half their height.
const box = (g, w, h, d, m, x, y, z, r) => block(g, w, h, d, m, x, y - h / 2, z, r);
const drum = (g, rt, rb, h, m, x, y, z, seg) => cyl(g, rt, rb, h, m, x, y - h / 2, z, seg);
const hoop = (g, r, tube, m, x, y, z) => add(g, new THREE.TorusGeometry(r, tube, 8, 48), m, x, y, z, false);
const CRESTS = [
  (g, trim, glow) => { box(g, .26, .08, .06, trim, 0, .41, .18, .02); [-.09, 0, .09].forEach((x, k) => box(g, .05, k === 1 ? .16 : .11, .05, k === 1 ? glow : trim, x, .47 + (k === 1 ? .02 : 0), .18, .015)); }, // a three-pronged crown
  (g, trim, glow) => { hoop(g, .26, .025, trim, 0, .56, 0).rotation.x = .18; ball(g, .055, glow, 0, .38, .2, 16); },                                                                     // a halo
  (g, trim, glow) => { [-1, 1].forEach(s => { box(g, .05, .28, .08, s < 0 ? trim : glow, s * .18, .48, .06, .02).rotation.z = -s * .38; }); box(g, .22, .06, .06, glow, 0, .36, .2, .02); }, // twin wings and a brow
  (g, trim, glow) => { hoop(g, .18, .028, glow, 0, .5, .12).rotation.y = Math.PI / 2; [-1, 1].forEach(s => { drum(g, .06, .06, .08, trim, s * .28, .2, 0, 12).rotation.z = Math.PI / 2; }); }, // a crescent fin and ear pods
  (g, trim, glow) => { box(g, .46, .06, .12, trim, 0, .28, .18, .02); [-1, 1].forEach(s => { box(g, .05, .24, .18, glow, s * .22, .44, -.05, .015).rotation.x = -.35; }); },              // a visor fin and dorsal blades
  (g, trim, glow) => { [-1, 1].forEach(s => { box(g, .24, .06, .05, trim, s * .11, .43, .19, .015).rotation.z = s * .42; }); ball(g, .06, glow, 0, .41, .21, 16); },                         // a star-winged crest
];
// The loadout chosen in the arena: provider, its model, reasoning effort and harness. Without
// one, OpenAI's emerald and the first harness.
function loadout() {
  const whole = (v, hi, fallback) => Number.isInteger(v) && v >= 0 && v <= hi ? v : fallback;
  try {
    const saved = JSON.parse(localStorage.getItem('metacase-loadout') || '{}'), model = whole(saved.model, MODEL_CHARACTERS.length - 1, 0);
    return { model, variant: whole(saved.variant, MODEL_CHARACTERS[model].variants.length - 1, 0), effort: whole(saved.effort, EFFORTS.length - 1, DEFAULT_EFFORT), harness: whole(saved.harness, HARNESS_NAMES.length - 1, 0) };
  } catch { return { model: 0, variant: 0, effort: DEFAULT_EFFORT, harness: 0 }; }
}

export function createRun({ onProject = () => {}, safe = () => null, reduce = false } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
  const light = lights(scene, { span: 12, shadowSize: 1024 });
  light.key.position.set(-5, 14, 12);
  const tmp = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), at = new THREE.Vector3(), hand = new THREE.Vector3();
  const turn = new THREE.Euler(), q = new THREE.Quaternion(), spin = new THREE.Quaternion(), place = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() };

  /* ---- the workroom: a plank floor, a panelled wall and, on it, the board of the three tracks ---- */
  for (let i = 0; i < 22; i++) block(scene, 24, .04, .47, [0x7a5a42, 0x6e5440, 0x735644][i % 3], (i % 2) * .4 - .2, -.04, WALL_Z + .26 + i * .48, .01).castShadow = false;
  block(scene, 24, WALL_H + 2, .2, mat(0x4f3c2f), 0, 0, WALL_Z, .02);
  block(scene, 24, .9, .06, mat(0x5f4838), 0, 0, WALL_Z + .12, .02);
  block(scene, 24, .05, .08, mat(0x7a5a42), 0, .9, WALL_Z + .14, .01).castShadow = false;
  const board = new THREE.Group(); board.position.set(0, 1.35, WALL_Z + .12); scene.add(board);
  block(board, 3.6, 1.5, .05, mat(0xb98a5a), 0, 0, 0, .02);
  TRACKS.forEach((c, t) => {
    block(board, 1.02, .1, .02, mat(c, { emissive: c, intensity: .3 }), -1.15 + t * 1.15, 1.28, .03, .01).castShadow = false;
    for (let i = 0; i < 4; i++) {
      const x = -1.15 + t * 1.15 + (i % 2 ? .23 : -.23), y = .14 + Math.floor(i / 2) * .56;
      const brief = block(board, .42, .5, .012, mat(PALETTE.cream), x, y, .03, .006);
      brief.rotation.z = ((i * 7 + t * 3) % 5 - 2) * .035; brief.castShadow = false;
      ball(board, .03, mat(c), x, y + .44, .05, 8);
    }
  });

  // the case cabinet: one shelf per track, each a row of case folders; the participant takes one
  const cabinet = new THREE.Group(); cabinet.position.copy(CABINET); cabinet.rotation.y = .55; scene.add(cabinet);
  block(cabinet, 1.7, 1.62, .1, PALETTE.ink, 0, 0, -.28, .02);
  [-1, 1].forEach(s => block(cabinet, .07, 1.62, .6, 0x7a5a42, s * .82, 0, 0, .02));
  block(cabinet, 1.76, .08, .62, 0x7a5a42, 0, 1.62, 0, .02);
  const CASE_SLOT = new THREE.Vector3(.08, 1.3, .02);
  TRACKS.forEach((c, t) => {
    const y = 1.12 - t * .5;
    block(cabinet, 1.62, .05, .56, 0x8a6a4a, 0, y - .05, 0, .01).castShadow = false;
    block(cabinet, 1.62, .04, .02, mat(c, { emissive: c, intensity: .35 }), 0, y - .05, .29, .01).castShadow = false;
    for (let k = 0; k < 11; k++) {
      if (t === 0 && k === 6) continue; // the case taken from the Economics shelf
      const tone = new THREE.Color(c).lerp(new THREE.Color(k % 3 ? 0xffffff : 0x1a1d26), .18 + (k % 4) * .06).getHex();
      block(cabinet, .1, .36 + (k * 7 % 4) * .025, .42, mat(tone), -.7 + k * .13, y, .02, .012).castShadow = false;
    }
  });

  // the case itself: a folder in the Economics colour, carried to the desk and opened
  const folder = new THREE.Group(); scene.add(folder);
  block(folder, .62, .02, .46, mat(0xe8dcc0), 0, 0, 0, .01);
  block(folder, .16, .025, .07, mat(TRACKS[0]), -.18, 0, -.255, .01);
  const flap = new THREE.Group(); flap.position.set(-.31, .022, 0); folder.add(flap);
  block(flap, .62, .015, .46, mat(new THREE.Color(TRACKS[0]).lerp(new THREE.Color(0xffffff), .35).getHex()), .31, 0, 0, .01);
  const sheets = CASE_PAGES.map(paint => {
    const tex = canvasTexture(256, 320, paint);
    const m = new THREE.Mesh(SHEET_GEO, new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: .25, roughness: .85, side: THREE.DoubleSide }));
    m.visible = false; scene.add(m); return m;
  });

  /* ---- the desk and the participant ---- */
  const desk = new THREE.Group(); desk.position.set(0, 0, DESK_Z); scene.add(desk);
  block(desk, 2, .08, 1, 0x7a5a42, 0, DESK_Y - .08, 0, .03);
  [[-.92, -.42], [.92, -.42], [-.92, .42], [.92, .42]].forEach(([x, z]) => block(desk, .07, DESK_Y - .08, .07, 0x5a4434, x, 0, z, .02));
  block(desk, 1.76, .01, .76, mat(0x2f4a3e), 0, DESK_Y, 0, .004).castShadow = false;
  const deskLamp = glowSprite(0xffe2b0, 3.2, .12); deskLamp.position.set(0, DESK_Y + .3, 0); desk.add(deskLamp);
  const reportTex = canvasTexture(256, 340, REPORT);
  const report = new THREE.Group(); scene.add(report);
  add(report, rbox(.5, .05, .66, .02), mat(0xf7f5f0), 0, .025, 0);
  const reportFace = new THREE.Mesh(new THREE.PlaneGeometry(.46, .62), new THREE.MeshStandardMaterial({ map: reportTex, roughness: .8 }));
  reportFace.rotation.x = -Math.PI / 2; reportFace.position.y = .052; report.add(reportFace);
  const REPORT_AT = new THREE.Vector3(.4, DESK_Y + .01, DESK_Z + .14);
  const term = terminal(); term.root.position.set(-.6, DESK_Y, DESK_Z - .22); term.root.rotation.y = .35; term.root.scale.setScalar(.9); scene.add(term.root);
  const participant = person(3); participant.root.scale.setScalar(.92); scene.add(participant.root);

  /* ---- the agent, as the arena draws it: the kit's robot, given a model's armour, brand plate,
   * crest and visor, and carrying a harness as its weapon ---- */
  const agent = robot(BARE.hull); scene.add(agent.root);
  const body = agent.root.children[0], head = agent.head, [, visor, eye, , aerial, aerialTip] = head.children;
  // its own copies of the kit's shared materials, so the model's colours stay on this robot
  const own = new Map();
  agent.root.traverse(o => { if (!o.isMesh) return; if (!own.has(o.material)) own.set(o.material, o.material.clone()); o.material = own.get(o.material); });
  visor.material = visor.material.clone();
  const hullMat = body.children[0].material, limbMat = body.children[1].material, eyeMat = eye.material, visorMat = visor.material;
  const trimMat = new THREE.MeshStandardMaterial({ color: BARE.trim, roughness: .5 }), coreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0, roughness: .4 });
  [-1, 1].forEach(s => { block(body, .16, .18, .26, trimMat, s * .3, .36, 0, .045).rotation.z = -s * .24; }); // pauldrons
  block(body, .43, .28, .012, PALETTE.ink, 0, .27, .19, .006).castShadow = false;                            // the plate's slot
  ball(body, .032, coreMat, 0, .2, .2, 12).castShadow = false;                                                // the chest core
  const crests = CRESTS.map(build => { const g = new THREE.Group(); build(g, trimMat, coreMat); g.visible = false; head.add(g); return g; });
  agent.root.updateMatrixWorld(true);
  const crestTop = crests.map(g => new THREE.Box3().setFromObject(g).max.y);                                 // in the robot's units
  const halo = glowSprite(0xffffff, 1.1, 0); halo.position.set(0, .5, -.12); head.add(halo);
  // thrusters, lit for the hop to the plinth
  const flameMats = [.65, .95].map(opacity => new THREE.MeshBasicMaterial({ transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const flames = [-1, 1].map(s => {
    const f = new THREE.Group(); f.position.set(s * .14, .02, 0); f.visible = false; body.add(f);
    [[.085, .5], [.045, .34]].forEach(([r, h], k) => { add(f, new THREE.ConeGeometry(r, h, 18, 1, true), flameMats[k], 0, -h / 2, 0, false).rotation.x = Math.PI; });
    return f;
  });
  // what the participant hands over flies to its place on the robot and keeps to it there
  const plateAt = new THREE.Object3D(); plateAt.position.copy(PLATE_AT); body.add(plateAt);
  const gunAt = new THREE.Object3D(); gunAt.position.copy(GUN_AT); gunAt.rotation.copy(GUN_TURN); body.add(gunAt);
  let dressed = loadout();
  const plateTex = canvasTexture(512, 320, g => paintPlate(g, MODEL_CHARACTERS[dressed.model], dressed.variant, dressed.effort));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(.4, .25), new THREE.MeshBasicMaterial({ map: plateTex, transparent: true, side: THREE.DoubleSide })); plate.visible = false; scene.add(plate);
  const gun = new THREE.Group(); gun.visible = false; scene.add(gun);
  const dockFlash = glowSprite(0xfff1d0, .9, 0); scene.add(dockFlash);
  const muzzleFlash = glowSprite(0xfff1d0, .42, 0); scene.add(muzzleFlash);
  function dock(obj, anchor, k, lift, turns) {
    anchor.updateWorldMatrix(true, false); anchor.matrixWorld.decompose(place.p, place.q, place.s);
    obj.visible = k > 0;
    arc(obj.position, hand, place.p, k, lift);
    obj.quaternion.copy(place.q).multiply(spin.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (1 - k) * turns * Math.PI * 2));
    obj.scale.copy(place.s).multiplyScalar(lerp(.55, 1, k));
    obj.updateMatrixWorld();
  }
  // Dressing the robot in a loadout: the plate, the crest and the target colours. The harness is
  // the arena's 3D weapon once it has loaded, and the kit's blaster until then (or without it).
  const dress = { hull: new THREE.Color(), limb: new THREE.Color(), eye: new THREE.Color(), trim: new THREE.Color() };
  const bare = { hull: new THREE.Color(BARE.hull), limb: new THREE.Color(BARE.limb), eye: new THREE.Color(BARE.eye), trim: new THREE.Color(BARE.trim) };
  let armory = null, weapon = null, armed = null, worn = '', checked = -Infinity;
  const keyOf = l => JSON.stringify(l) + !!armory;
  function wear(l) {
    const m = MODEL_CHARACTERS[l.model];
    dressed = l; plateTex.userData.redraw();
    crests.forEach((g, i) => { g.visible = i === l.model; });
    ['hull', 'limb', 'eye', 'trim'].forEach(k => dress[k].setHex(m[k]));
    coreMat.color.setHex(m.eye); coreMat.emissive.setHex(m.eye); visorMat.emissive.setHex(m.eye); trimMat.emissive.setHex(m.trim);
    flameMats[0].color.setHex(m.trim); flameMats[1].color.setHex(m.eye); halo.material.color.setHex(m.eye);
    padMat.color.setHex(m.trim); padMat.emissive.setHex(m.trim); padGlow.material.color.setHex(m.trim);
    // acts 2 and 3 frame the robot from the desk to its crest (and, in act 2, the Model tag above it)
    const crown = AGENT_Y[1] + crestTop[l.model] * AGENT_S, reach = crown + .155;
    SHOTS[2][2] = SHOTS[3][2] = (reach + .66) / 2; SHOTS[2][5] = SHOTS[3][5] = (reach - .66) / 2;
    SHOTS[4][2] = SHOTS[5][2] = Math.max(1.04, crown + .06 - SHOTS[4][5]);
    const want = armory ? armory.weapons[l.harness] : m.trim;
    if (want === armed) return;
    armed = want;
    if (weapon) gun.remove(weapon);
    weapon = armory ? want : blaster(want); weapon.scale.setScalar(GUN_SIZE); gun.add(weapon);
  }
  import('./arena-models.js?v=20261028-cascade').then(m => m.loadArenaWeapons()).then(library => {
    library.weapons.forEach(toonify); armory = library; checked = -Infinity; // the next frame arms the robot with it
  }).catch(() => {}); // the kit's blaster stays in hand

  /* ---- the trajectory: one page per step, stacked on its stand ---- */
  const stand = new THREE.Group(); stand.position.copy(STAND); scene.add(stand);
  cyl(stand, .16, .22, .06, PALETTE.ink, 0, 0, 0, 16); cyl(stand, .04, .05, .78, 0x7a5a42, 0, .06, 0, 10);
  block(stand, .5, .04, .38, 0x7a5a42, 0, .84, 0, .02);
  const STEP_COLORS = [PALETTE.teal, PALETTE.violet, PALETTE.sky, PALETTE.amber];   // read, plan, tool call, write
  const failMat = new THREE.MeshStandardMaterial({ color: PALETTE.cream, emissive: PALETTE.rose, emissiveIntensity: 0, roughness: .8 });
  const pageAt = k => new THREE.Vector3(((k * 37) % 5 - 2) * .008, .89 + k * .02, ((k * 13) % 5 - 2) * .006), FAILED_AT = pageAt(FAILED);
  const pages = Array.from({ length: PAGES }, (_, k) => {
    const o = pageAt(k), m = block(stand, .4, .016, .3, k === FAILED ? failMat : mat(PALETTE.cream), o.x, o.y, o.z, .005);
    const tab = block(stand, .06, .018, .06, mat(STEP_COLORS[k % 4], { emissive: STEP_COLORS[k % 4], intensity: .3 }), .2, .89 + k * .02, -.1 + (k % 4) * .06, .005);
    m.visible = tab.visible = false; m.castShadow = tab.castShadow = false;
    return { m, tab };
  });
  const spark = ball(scene, .04, mat(0xffffff, { emissive: 0xfff1d0, intensity: 2 }), 0, 0, 0, 10); spark.visible = false;

  /* ---- the verifier, and the sealed reference piped only to it ---- */
  const verifier = new THREE.Group(); verifier.position.copy(VERIFIER); verifier.rotation.y = -.35; scene.add(verifier);
  block(verifier, 1.0, 1.0, .7, mat(0xdfe3ea), 0, 0, 0, .08);
  block(verifier, 1.04, .08, .74, mat(PALETTE.teal, { emissive: PALETTE.teal, intensity: .25 }), 0, 1.0, 0, .03);
  block(verifier, .6, .03, .12, PALETTE.ink, 0, 1.08, 0, .01);                                    // the slot
  block(verifier, .76, .36, .02, PALETTE.ink, 0, .5, .36, .03);                                   // the panel
  const lamps = [0, 1, 2, 3].map(k => { const m = new THREE.MeshStandardMaterial({ color: 0x4b5160, emissive: 0x000000, roughness: .5 }); ball(verifier, .055, m, -.27 + k * .18, .7, .38, 12); return m; });
  [0, 1, 2].forEach(k => block(verifier, [.5, .36, .44][k], .02, .01, mat(0x9aa3b2), -.06, .58 - k * .06, .375, .005).castShadow = false);
  const VERDICT = [PALETTE.green, PALETTE.green, PALETTE.amber, PALETTE.rose];          // pass, pass, partial, fail
  const vault = new THREE.Group(); vault.position.copy(SAFE); scene.add(vault);
  block(vault, 1.0, .7, .8, PALETTE.stone, 0, 0, 0, .05);
  block(vault, .6, .1, .74, mat(0xd8b46a, { rough: .4 }), 0, .72, 0, .03);
  block(vault, .54, .08, .68, mat(PALETTE.cream), .02, .73, 0, .02);
  add(vault, new THREE.CylinderGeometry(.08, .08, .03, 20), mat(0xb8323f, { emissive: 0xb8323f, intensity: .3 }), 0, .84, .1);
  add(vault, rbox(.92, .7, .74, .04), mat(0xcfe0ff, { opacity: .16, rough: .1 }), 0, 1.06, 0, false);
  const lock = new THREE.Group(); lock.position.set(0, .92, .4); vault.add(lock);
  block(lock, .26, .22, .1, PALETTE.amber, 0, -.11, 0, .05);
  add(lock, new THREE.TorusGeometry(.085, .024, 8, 20, Math.PI), mat(PALETTE.slate), 0, .11, 0);
  const pipeCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(SAFE.x - .2, 1.42, SAFE.z), new THREE.Vector3(SAFE.x - .35, 1.75, SAFE.z + .6), new THREE.Vector3(VERIFIER.x + .25, 1.55, VERIFIER.z - .35), new THREE.Vector3(VERIFIER.x + .1, 1.06, VERIFIER.z - .15)]);
  add(scene, new THREE.TubeGeometry(pipeCurve, 40, .035, 8), mat(0xb87333, { rough: .4 }), 0, 0, 0, false);
  const pulse = glowSprite(0xffd36b, .7, 0); scene.add(pulse);
  const verdictGlow = glowSprite(PALETTE.amber, 2, 0); verdictGlow.position.set(VERIFIER.x, .7, VERIFIER.z + .4); scene.add(verdictGlow);
  // the verifier's pin: it flies onto the failing page and stays in it
  const marker = new THREE.Group(); marker.visible = false; scene.add(marker);
  cyl(marker, .006, .006, .14, PALETTE.ink, 0, 0, 0, 6); ball(marker, .04, mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: .8 }), 0, .16, 0, 12);
  const PIN = new THREE.Vector3(-FACE.w / 2 + .008, rowY(2, .4), .004);                       // in the edge of failing row 03, leaning out
  const PIN_TURN = new THREE.Quaternion().setFromUnitVectors(THREE.Object3D.DEFAULT_UP, new THREE.Vector3(-.55, .12, .83).normalize());

  /* ---- the failure case: the failing page of the trajectory, printed with its diagnostic trace.
   * On the stand it is a page; on plinth C it stands as a board, in a dark frame with a red index
   * tab, its failing rows raised in glowing red and a lens held over them. Its origin is the
   * middle of the print. ---- */
  const failure = new THREE.Group(); failure.visible = false; scene.add(failure);
  const traceTex = canvasTexture(1024, 1360, TRACE_PRINT); traceTex.anisotropy = 8;
  add(failure, rbox(FACE.w, FACE.h, .006, .003), mat(0xf3ecdc), 0, 0, 0).castShadow = false;
  add(failure, new THREE.PlaneGeometry(FACE.w, FACE.h), new THREE.MeshStandardMaterial({ map: traceTex, emissiveMap: traceTex, emissive: 0xffffff, emissiveIntensity: .14, roughness: .82 }), 0, 0, .0035, false).receiveShadow = false;
  const pieces = [];
  const piece = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(.001); failure.add(g); pieces.push(g); return g; };
  add(piece(0, 0, -.024), rbox(FACE.w + .07, FACE.h + .07, .04, .02), mat(PALETTE.ink), 0, 0, 0);                                 // the frame
  block(piece(-FACE.w / 2 + .14, FACE.h / 2 + .02, -.024), .2, .07, .03, mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: .35 }), 0, 0, 0, .012); // the index tab
  const raised = mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: 1.2 });
  [2, 3].forEach(i => { block(piece(-FACE.w / 2 + .019, rowY(i, 0), .004), .02, rowY(i, 0) - rowY(i, 1), .024, raised, 0, rowY(i, 1) - rowY(i, 0), 0, .008).castShadow = false; });
  const magnifier = lens(PALETTE.rose); magnifier.rotation.z = -.15;
  magnifier.children[1].material = magnifier.children[1].material.clone(); magnifier.children[1].material.opacity = .15; // clear enough to read the tags through
  magnifier.position.set(0, -.08, 0); piece(.235, (rowY(2) + rowY(3)) / 2, .06).add(magnifier);
  // its stand on plinth C: a dark base with a red lip, and the board's place in it
  const easel = new THREE.Group(); easel.rotation.y = -.14; easel.scale.setScalar(.001);
  block(easel, .52, .06, .24, PALETTE.ink, 0, 0, 0, .02);
  block(easel, .52, .014, .02, mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: .6 }), 0, .03, .12, .006).castShadow = false;

  /* ---- what a participant can contribute: three plinths, three kinds of contribution ---- */
  const brass = mat(0xd8b46a, { rough: .35 });
  const plinths = PLINTHS.map(x => { const g = new THREE.Group(); g.position.set(x, 0, PLINTH_Z); scene.add(g); cyl(g, .36, .4, PLINTH_H, PALETTE.stone, 0, 0, 0, 28); add(g, new THREE.TorusGeometry(.38, .02, 6, 40), brass, 0, PLINTH_H, 0, false).rotation.x = Math.PI / 2; return g; });
  const metacase = new THREE.Group(); metacase.visible = false; scene.add(metacase);
  const book = closedBook(); bookTabs(book, 2);
  book.rotation.x = Math.PI / 2; book.position.set(-BOOK.PW / 2, BOOK.PD / 2, -(BOOK.T + BOOK.BOARD * 2) / 2); metacase.add(book);
  // B: the armed robot itself stands on a ring lit in its model's colour
  const padMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0, roughness: .4 });
  add(plinths[1], new THREE.TorusGeometry(.27, .02, 8, 48), padMat, 0, PLINTH_H + .012, 0, false).rotation.x = Math.PI / 2;
  const padGlow = glowSprite(0xffffff, 1.3, 0); padGlow.position.set(0, PLINTH_H + .1, 0); plinths[1].add(padGlow);
  // C: where the board stands
  easel.position.set(0, PLINTH_H, -.02); plinths[2].add(easel);
  const BOARD_AT = new THREE.Vector3(PLINTHS[2], 0, PLINTH_Z).add(new THREE.Vector3(0, .06 + (FACE.h / 2 + .035) * Math.cos(LEAN), -(FACE.h / 2 + .035) * Math.sin(LEAN)).applyEuler(easel.rotation)).add(easel.position);
  const BOARD_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-LEAN, easel.rotation.y, 0, 'YXZ'));
  const flashes = PLINTHS.map(x => { const f = glowSprite(0xfff1d0, 1.6, 0); f.position.set(x, PLINTH_H + .4, PLINTH_Z); scene.add(f); return f; });

  const target = new THREE.Vector3();
  const pointer = { x: 0, tx: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; }, { passive: true });

  // camera: the cabinet and the desk, the agent, the desk and its stand, the verifier, the plinths.
  // [progress, target x, y, z, half-width, half-height, elevation]
  const SHOTS = [
    [0, -1.55, .9, .35, 2.3, .8, .3], [.15, -.9, .92, .55, 1.9, .7, .3],
    [.21, -.2, 1.13, .42, 1.3, .6, .3], [.38, -.2, 1.13, .42, 1.3, .6, .3],
    [.44, .55, 1.04, .65, 1.45, .56, .3], [.6, .55, 1.04, .65, 1.45, .56, .3],
    [.66, 1.85, .98, .1, 1.9, .66, .28], [.8, 1.85, .98, .1, 1.9, .66, .28],
    [.86, 0, .86, 1.75, 2.2, .62, .3], [1, 0, .86, 1.75, 2.2, .62, .3],
  ];
  const shot = new Array(6);
  function shotAt(p) {
    let i = 0; while (i < SHOTS.length - 2 && p > SHOTS[i + 1][0]) i++;
    const a = SHOTS[i], b = SHOTS[i + 1], f = smooth((p - a[0]) / Math.max(1e-4, b[0] - a[0]));
    for (let j = 0; j < 6; j++) shot[j] = lerp(a[j + 1], b[j + 1], f);
    return shot;
  }
  function aimCamera(cam, rect, p) {
    const aspect = rect.width / rect.height;
    const sf = safe(), room = sf ? { top: sf.top + 44, bottom: sf.bottom } : null; // room for the labels
    const frame = fitSafe(cam, rect, room, { fov: aspect < 1 ? 42 : 32 });
    const [tx, ty, tz, hw, hh, el] = shotAt(p);
    target.set(tx, ty, tz);
    // on portrait screens the plinths' labels need more room at the sides than the plinths do
    const dist = fitBox(hw * (aspect < .8 ? lerp(1, 1.3, ramp(p, .8, .86)) : 1), hh, cam.fov, frame, .95);
    const az = (reduce ? 0 : pointer.x * .1) + .04;
    cam.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(target);
    cam.updateMatrixWorld();
  }
  function label(point, opacity, rect) {
    const s = toView(point, camera, rect), clear = s.y > (safe()?.top ?? 0) + 34;
    return { ...s, opacity, visible: opacity > .05 && clear && s.front && s.inside, active: true };
  }
  const shown = (p, a, b, c, d) => ramp(p, a, b) * (1 - ramp(p, c, d));
  wear(dressed); worn = keyOf(dressed);

  function update(dt, t, p, rect) {
    pointer.x += (pointer.tx - pointer.x) * .05;
    // the loadout can change in the arena above while this chapter is built; look again now and then
    const now = performance.now();
    if (now - checked > 500) { checked = now; const l = loadout(); if (keyOf(l) !== worn) { worn = keyOf(l); wear(l); } }
    const packs = [0, 1, 2].map(k => ramp(p, .83 + k * .025, .91 + k * .025));

    // 1 · choose: the participant takes the Economics case from the cabinet and opens it on the desk
    const walk = ramp(p, .02, .11), lay = ramp(p, .105, .13), open = ramp(p, .125, .15);
    from.set(-2.75, 0, -.45); to.set(-1.55, 0, DESK_Z - .15);
    const heading = Math.atan2(to.x - from.x, to.z - from.z);
    participant.root.position.copy(from).lerp(to, smooth(walk));
    participant.root.rotation.y = lerp(heading, Math.PI * .55, smooth(ramp(p, .11, .14)));
    participant.update(t, walk > 0 && walk < 1 ? 1 : 0);
    cabinet.updateMatrixWorld();
    const slot = cabinet.localToWorld(tmp.copy(CASE_SLOT));
    at.copy(participant.root.position).add(from.set(Math.sin(heading) * .3, .6, Math.cos(heading) * .3));
    folder.position.copy(slot).lerp(at, smooth(ramp(walk, 0, .2)));
    folder.position.lerp(to.set(-.32, DESK_Y + .012, DESK_Z + .14), smooth(lay));
    folder.rotation.set(lerp(-1.2, 0, smooth(Math.max(lay, ramp(walk, .1, .3) * .6))), lerp(.55, 0, smooth(lay)), 0);
    flap.rotation.z = smooth(open) * Math.PI * .96;
    const work = ramp(p, .41, .58);
    // the case's pages fan up to be read, then settle flat on the desk while the agent is set
    // up, and are worked into the report while it runs
    const settle = smooth(ramp(p, .2, .235));
    sheets.forEach((s, i) => {
      const fan = smooth(ramp(p, .13 + i * .012, .19 + i * .012)), fold = smooth(ramp(work, .1 + i * .1, .38 + i * .1));
      s.visible = fan > .001 && fold < .999;
      if (!s.visible) return;
      from.set(-.32, DESK_Y + .04, DESK_Z + .14);
      at.set(-.1 + (i - 1.5) * .44, DESK_Y + .64 + (i % 2) * .07 + (reduce ? 0 : Math.sin(t * 1.4 + i) * .015), DESK_Z + .05);
      s.position.copy(from).lerp(at, fan).lerp(tmp.set(-.62 + i * .14, DESK_Y + .02 + i * .004, DESK_Z + .22), settle).lerp(REPORT_AT, fold);
      s.rotation.set(lerp(lerp(-Math.PI / 2, -.08, fan), -Math.PI / 2 + .05, settle) - fold * 1.3, lerp((1.5 - i) * .12, .1 - i * .06, settle) * (1 - fold), 0);
      s.scale.setScalar(lerp(.35, 1, fan) * lerp(1, .6, settle) * lerp(1, .3, fold));
    });

    // 2 · configure: the participant hands the agent its model, the provider's brand plate, and it
    //     powers up: it rises, the antenna gives way to the provider's crest, armour, visor and eyes
    //     take its colours. Then the harness: a weapon that docks at its right shoulder
    const give = ramp(p, .21, .255), power = ramp(p, .25, .3), arm = ramp(p, .31, .355);
    const lit = smooth(power), hop = smooth(packs[1]);
    hullMat.color.lerpColors(bare.hull, dress.hull, lit); limbMat.color.lerpColors(bare.limb, dress.limb, lit); visorMat.color.copy(limbMat.color);
    eyeMat.color.lerpColors(bare.eye, dress.eye, lit); eyeMat.emissive.copy(eyeMat.color); eyeMat.emissiveIntensity = lerp(.5, 2.2, lit);
    trimMat.color.lerpColors(bare.trim, dress.trim, lit); trimMat.emissiveIntensity = .55 * lit; visorMat.emissiveIntensity = .45 * lit; coreMat.emissiveIntensity = 1.6 * lit;
    crests[dressed.model].scale.setScalar(Math.max(.001, springy(ramp(p, .265, .3))));
    aerial.visible = aerialTip.visible = lit < .98; aerial.scale.y = Math.max(.001, 1 - lit); aerialTip.position.y = lerp(.62, .45, lit);
    halo.material.opacity = .32 * lit * (reduce ? 1 : .85 + Math.sin(t * 2.4) * .15);
    // 5 · contribute (B): the armed agent hops from the desk to its plinth, turning once on the way
    at.set(0, lerp(AGENT_Y[0], AGENT_Y[1], springy(ramp(p, .25, .29))), AGENT_Z); to.set(PLINTHS[1], PLINTH_H + .012, PLINTH_Z);
    arc(agent.root.position, at, to, hop, .95);
    agent.root.scale.setScalar(lerp(AGENT_S, AGENT_ON_PLINTH, hop));
    agent.root.rotation.y = hop * Math.PI * 2;
    agent.update(t, 0);
    head.rotation.x = lerp(.3, 0, lit) + .16 * shown(p, .41, .44, .56, .59);           // it wakes, and looks down at its work
    const thrust = Math.sin(Math.PI * hop);
    flames.forEach((f, i) => { f.visible = thrust > .02; f.scale.set(1, Math.max(.001, thrust * (reduce ? 1 : .85 + Math.sin(t * 38 + i * 2) * .15)), 1); });
    hand.copy(participant.root.position).add(tmp.set(.28, .92, .12));
    dock(plate, plateAt, smooth(give), .45, 1);
    dock(gun, gunAt, smooth(arm), .55, 1);
    dockFlash.position.copy(gun.position); dockFlash.material.opacity = .85 * shown(p, .345, .355, .36, .385);
    term.screen.material.emissiveIntensity = .2 + ramp(p, .35, .38) * .6 + (work > 0 && work < 1 && !reduce ? Math.sin(t * 9) * .12 : 0);

    // 3 · execute: the agent works the case into a report; every call leaves the harness's muzzle
    //     and adds a page to the trajectory
    const made = ramp(work, .62, .9);
    report.visible = made > 0;
    report.position.copy(REPORT_AT);
    report.rotation.set(0, -.12, 0);
    report.scale.setScalar(Math.max(.001, springy(made)));
    const count = Math.floor(work * PAGES + .001);
    pages.forEach((pg, k) => { pg.m.visible = pg.tab.visible = k < count; });
    spark.visible = work > 0 && work < 1;
    muzzleFlash.material.opacity = 0;
    if (spark.visible) {
      const u = (work * PAGES) % 1;
      stand.localToWorld(to.set(0, .92 + count * .02, 0));
      gun.localToWorld(from.set(0, 0, .5 * GUN_SIZE));
      arc(spark.position, from, to, u, .35);
      muzzleFlash.position.copy(from); muzzleFlash.material.opacity = .8 * (1 - ramp(u, 0, .3));
    }

    // 4 · verify: the report goes into the verifier; the reference is piped to it, and only to it;
    //     the checks come back mixed; the failing page slides out of the trajectory and tilts up to
    //     show its failing lines in red, and the verifier pins it
    const send = ramp(p, .62, .665), flow = ramp(p, .66, .7);
    if (send > 0) {
      verifier.updateMatrixWorld(); verifier.localToWorld(to.set(0, 1.15, 0));
      arc(report.position, REPORT_AT, to, smooth(send), .7);
      report.rotation.set(-send * 1.4, -.12 - send, 0); report.scale.setScalar(lerp(1, .6, send)); report.visible = send < .98;
    }
    pulse.visible = flow > 0 && flow < 1;
    if (pulse.visible) pipeCurve.getPoint(flow, pulse.position);
    pulse.material.opacity = .9 * Math.sin(Math.PI * flow);
    lamps.forEach((m, k) => {
      const on = ramp(p, .685 + k * .015, .7 + k * .015);
      m.color.setHex(on > 0 ? VERDICT[k] : 0x4b5160); m.emissive.setHex(VERDICT[k]); m.emissiveIntensity = on * 1.4;
    });
    verdictGlow.material.opacity = .35 * shown(p, .7, .74, .82, .86);
    failMat.emissiveIntensity = .8 * ramp(p, .745, .765) * (reduce ? 1 : .8 + Math.sin(t * 4) * .2);
    // 5 · contribute (C): that page flies to its plinth and stands up there as the board
    const slide = ramp(p, .745, .765), tilt = ramp(p, .755, .785), file = smooth(packs[2]);
    failure.visible = slide > 0;
    if (failure.visible) {
      stand.localToWorld(at.copy(FAILED_AT).add(tmp.set(0, .017, .22 * slide)));
      at.y += .18 * tilt;
      arc(failure.position, at, BOARD_AT, file, .5);
      failure.quaternion.setFromEuler(turn.set(.95 * tilt - Math.PI / 2, 0, 0)).slerp(BOARD_Q, file);
      failure.scale.setScalar(lerp(ON_STAND, 1, file));
      failure.updateMatrixWorld();
    }
    const stood = springy(ramp(p, .935, .97));
    pieces.forEach(g => g.scale.setScalar(Math.max(.001, stood)));
    easel.scale.setScalar(Math.max(.001, springy(ramp(p, .9, .935))));
    const pin = ramp(p, .77, .8);
    marker.visible = failure.visible && pin > 0;
    if (marker.visible) {
      verifier.localToWorld(from.set(0, .9, .4)); failure.localToWorld(to.copy(PIN));
      arc(marker.position, from, to, smooth(pin), .5);
      marker.quaternion.identity().slerp(q.copy(failure.quaternion).multiply(PIN_TURN), smooth(pin));
    }

    // 5 · contribute: a Metacase from the record, the Model & Harness on its ring, the Failure Case
    //     on its stand
    const rise = ramp(p, .8, .85);
    plinths.forEach(g => { g.visible = rise > 0; g.scale.set(1, Math.max(.001, springy(rise)), 1); });
    stand.localToWorld(from.set(0, 1.2, 0)); to.set(PLINTHS[0], PLINTH_H, PLINTH_Z);
    metacase.visible = packs[0] > 0;
    arc(metacase.position, from, to, smooth(packs[0]), .9);
    metacase.scale.setScalar(Math.max(.001, lerp(.08, .27, smooth(packs[0]))));
    metacase.rotation.y = (1 - packs[0]) * 2 - .25;
    const landed = ramp(p, .92, .95);
    padMat.emissiveIntensity = 1.4 * landed; padGlow.material.opacity = .45 * landed;
    flashes.forEach((f, k) => { f.material.opacity = .55 * Math.max(0, 1 - Math.abs(packs[k] - .95) / .1); });

    aimCamera(camera, rect, p);
    const above = (obj, y) => obj.getWorldPosition(tmp).add(at.set(0, y, 0));
    const lift = rect.width / rect.height < .8 ? .55 : 0; // on portrait screens B's label stands above A's and C's
    onProject([
      label(tmp.set(-.1, DESK_Y + 1.12, DESK_Z + .05), shown(p, .14, .17, .2, .22), rect),                        // the case
      label(body.localToWorld(tmp.set(0, crestTop[dressed.model] + .14, 0)), shown(p, .265, .285, .325, .345), rect), // the model, above its crest
      label(gun.localToWorld(tmp.set(0, .2, .45)), shown(p, .35, .37, .395, .415), rect),                          // the harness, above its muzzle
      label(stand.localToWorld(tmp.set(0, 1.25, 0)), shown(p, .46, .5, .6, .62), rect),                          // the trajectory
      label(verifier.localToWorld(tmp.set(0, 1.45, 0)), shown(p, .64, .67, .8, .82), rect),                      // the verifier
      label(verifier.localToWorld(tmp.set(0, .95, .4)), shown(p, .72, .75, .8, .82), rect),                      // the result
      label(tmp.set(PLINTHS[0], PLINTH_H + 1.05, PLINTH_Z), ramp(p, .9, .93), rect),                              // A · Metacase
      label(tmp.set(PLINTHS[1], PLINTH_H + 1.05 + lift, PLINTH_Z), ramp(p, .92, .95), rect),                      // B · Model & Harness
      label(tmp.set(PLINTHS[2], PLINTH_H + 1.06, PLINTH_Z), ramp(p, .94, .97), rect),                             // C · Failure Case
    ]);
  }
  function setTheme() { const bg = pageBackground(); scene.background = bg; scene.fog = new THREE.Fog(bg, 18, 44); }
  setTheme();
  scene.updateMatrixWorld(true);
  return { scene, camera, update, setTheme };
}
