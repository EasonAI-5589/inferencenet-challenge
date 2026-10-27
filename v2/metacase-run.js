/* metacase-run.js — 05 · The Metacase Challenge: what a participant does, in a workroom.
 * (1) Choose: a participant takes a case from a track's shelf and opens it on the desk: its
 *     goal, its evidence and its constraints.
 * (2) Configure: they give the agent a model, which reasons and decides, and a harness, which
 *     lends it tools, a workflow and its run settings.
 * (3) Execute: the agent reads, plans, calls tools and writes until it delivers; every step
 *     adds a page to the trajectory on the stand beside the desk.
 * (4) Verify: the deliverable goes into the verifier, the only place the sealed reference is
 *     piped to; the checks come back mixed, and the failing step is pinned in the trajectory.
 * (5) Contribute: what the run yields is set out as three kinds of contribution: a Metacase, the
 *     Model & Harness, and a Failure Case.
 * Rendered by the shared stage; the page's labels follow the objects through onProject. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { PALETTE, BOOK, closedBook, bookTabs, mat, add, block, cyl, ball, rbox, robot, person, lights, modelCore, wrench, lens, terminal, toolbox, dossier } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitSafe, fitBox, toView, glowSprite } from './mc-stage.js';

const DESK_Z = .8, DESK_Y = .72, WALL_Z = -2.6, WALL_H = 3.4;
const TRACKS = [PALETTE.teal, PALETTE.amber, PALETTE.violet];  // Economics, Finance, Social science
const CABINET = new THREE.Vector3(-3.35, 0, -1.25);
const STAND = new THREE.Vector3(1.42, 0, .95);                   // the trajectory stand
const VERIFIER = new THREE.Vector3(2.75, 0, .05), SAFE = new THREE.Vector3(3.55, 0, -1.45);
const PLINTHS = [-1.55, 0, 1.55], PLINTH_Z = 2.05, PLINTH_H = .42;
const PAGES = 12, FAILED = 8;                                     // trajectory pages; the step the check pins
const SHEET_GEO = new THREE.PlaneGeometry(.4, .5);

const springy = x => { const q = clamp(x) - 1; return 1 + 2.6 * q * q * q + 1.6 * q * q; }; // eases past 1 and settles
const arc = (out, a, b, k, lift) => out.copy(a).lerp(b, k).setY(lerp(a.y, b.y, k) + Math.sin(Math.PI * k) * lift);

/* ---- what the case holds, drawn once on canvas: its goal, two pieces of evidence, its constraints ---- */
function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), r = (x, y, ww, hh, rad, fill) => { g.beginPath(); g.roundRect(x, y, ww, hh, rad); g.fillStyle = fill; g.fill(); };
  paint(g, r, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
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

export function createRun({ onProject = () => {}, safe = () => null, reduce = false } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
  const light = lights(scene, { span: 12, shadowSize: 1024 });
  light.key.position.set(-5, 14, 12);
  const tmp = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), at = new THREE.Vector3();

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

  /* ---- the desk, the participant and the agent ---- */
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

  const participant = person(3); participant.root.scale.setScalar(.92); scene.add(participant.root);
  const agent = robot(0xf7f5f0); agent.root.scale.setScalar(.82); agent.root.position.set(0, 0, DESK_Z - .76); scene.add(agent.root);

  /* ---- the model and the harness ---- */
  const model = modelCore(PALETTE.violet); model.root.visible = false; scene.add(model.root);
  const CORE_AT = new THREE.Vector3(0, 1.2, DESK_Z - .66);
  const rig = new THREE.Group(); rig.position.set(0, 0, DESK_Z - .92); rig.visible = false; scene.add(rig);
  const brass = mat(0xd8b46a, { rough: .35 });
  [-1, 1].forEach(s => block(rig, .05, .62, .05, brass, s * .46, .56, 0, .02));
  [.9, 1.16].forEach(y => block(rig, .97, .045, .05, brass, 0, y, 0, .02));
  const box = toolbox(PALETTE.rose); box.root.scale.setScalar(.5); scene.add(box.root);
  const BOX_AT = new THREE.Vector3(.66, DESK_Y, DESK_Z - .2);
  const tools = [wrench(), lens()];
  const SLOTS = [new THREE.Vector3(-.58, 1.0, DESK_Z - .84), new THREE.Vector3(.58, 1.0, DESK_Z - .84)];
  tools.forEach(tool => { tool.visible = false; scene.add(tool); });
  const term = terminal(); term.root.position.set(-.6, DESK_Y, DESK_Z - .22); term.root.rotation.y = .35; term.root.scale.setScalar(.9); scene.add(term.root);
  add(scene, new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.46, .95, DESK_Z - .92), new THREE.Vector3(-.78, 1.0, DESK_Z - .55), new THREE.Vector3(-.6, DESK_Y + .1, DESK_Z - .25)), 16, .012, 6), brass, 0, 0, 0, false);

  /* ---- the trajectory: one page per step, stacked on its stand ---- */
  const stand = new THREE.Group(); stand.position.copy(STAND); scene.add(stand);
  cyl(stand, .16, .22, .06, PALETTE.ink, 0, 0, 0, 16); cyl(stand, .04, .05, .78, 0x7a5a42, 0, .06, 0, 10);
  block(stand, .5, .04, .38, 0x7a5a42, 0, .84, 0, .02);
  const STEP_COLORS = [PALETTE.teal, PALETTE.violet, PALETTE.sky, PALETTE.amber];   // read, plan, tool call, write
  const failMat = new THREE.MeshStandardMaterial({ color: PALETTE.cream, emissive: PALETTE.rose, emissiveIntensity: 0, roughness: .8 });
  const pages = Array.from({ length: PAGES }, (_, k) => {
    const m = block(stand, .4, .016, .3, k === FAILED ? failMat : mat(PALETTE.cream), ((k * 37) % 5 - 2) * .008, .89 + k * .02, ((k * 13) % 5 - 2) * .006, .005);
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
  const marker = new THREE.Group(); marker.visible = false; scene.add(marker);
  cyl(marker, .006, .006, .14, PALETTE.ink, 0, 0, 0, 6); ball(marker, .04, mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: .8 }), 0, .16, 0, 12);

  /* ---- what a participant can contribute: three plinths, three kinds of contribution ---- */
  const plinths = PLINTHS.map(x => { const g = new THREE.Group(); g.position.set(x, 0, PLINTH_Z); scene.add(g); cyl(g, .36, .4, PLINTH_H, PALETTE.stone, 0, 0, 0, 28); add(g, new THREE.TorusGeometry(.38, .02, 6, 40), brass, 0, PLINTH_H, 0, false).rotation.x = Math.PI / 2; return g; });
  const metacase = new THREE.Group(); metacase.visible = false; scene.add(metacase);
  const book = closedBook(); bookTabs(book, 2);
  book.rotation.x = Math.PI / 2; book.position.set(-BOOK.PW / 2, BOOK.PD / 2, -(BOOK.T + BOOK.BOARD * 2) / 2); metacase.add(book);
  const failure = dossier(); failure.root.visible = false; scene.add(failure.root);
  const flashes = PLINTHS.map(x => { const f = glowSprite(0xfff1d0, 1.6, 0); f.position.set(x, PLINTH_H + .4, PLINTH_Z); scene.add(f); return f; });

  const target = new THREE.Vector3();
  const pointer = { x: 0, tx: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; }, { passive: true });

  // camera: the cabinet and the desk, the agent, the desk and its stand, the verifier, the plinths.
  // [progress, target x, y, z, half-width, half-height, elevation]
  const SHOTS = [
    [0, -1.55, .9, .35, 2.3, .8, .3], [.15, -.9, .92, .55, 1.9, .7, .3],
    [.21, -.1, .98, .45, 1.25, .5, .3], [.38, -.1, .98, .45, 1.25, .5, .3],
    [.44, .55, .98, .65, 1.45, .52, .3], [.6, .55, .98, .65, 1.45, .52, .3],
    [.66, 1.85, .98, .1, 1.9, .66, .28], [.8, 1.85, .98, .1, 1.9, .66, .28],
    [.86, 0, .82, 1.75, 2.2, .62, .3], [1, 0, .82, 1.75, 2.2, .62, .3],
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

  function update(dt, t, p, rect) {
    pointer.x += (pointer.tx - pointer.x) * .05;

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

    // 2 · configure: the model goes to the agent, the harness frame goes on, its tools clip in
    const coreK = ramp(p, .21, .28);
    from.copy(participant.root.position).add(to.set(.25, .95, .1));
    arc(model.root.position, from, CORE_AT, smooth(coreK), .5);
    model.root.position.y += coreK >= 1 && !reduce ? Math.sin(t * 2) * .02 : 0;
    model.ring.rotation.z = t * 1.2;
    model.core.material.emissiveIntensity = 1.1 + Math.sin(t * 3) * .25;
    const frameK = ramp(p, .26, .31);
    rig.visible = frameK > 0; rig.scale.set(1, Math.max(.001, springy(frameK)), 1);
    tools.forEach((tool, k) => {
      const c = ramp(p, .29 + k * .03, .34 + k * .03);
      tool.visible = c > 0;
      arc(tool.position, from.copy(BOX_AT).setY(BOX_AT.y + .25), SLOTS[k], smooth(c), .45);
      tool.rotation.set(0, 0, (1 - c) * 3 + (k ? -.3 : .3));
      tool.scale.setScalar(.9);
    });
    box.lid.rotation.x = -smooth(ramp(p, .27, .3)) * (1 - smooth(ramp(p, .37, .4))) * 1.4;
    term.screen.material.emissiveIntensity = .2 + ramp(p, .33, .37) * .6 + (work > 0 && work < 1 && !reduce ? Math.sin(t * 9) * .12 : 0);

    // 3 · execute: the agent works the case into a report, and every step adds a page
    const made = ramp(work, .62, .9);
    report.visible = made > 0;
    report.position.copy(REPORT_AT);
    report.rotation.set(0, -.12, 0);
    report.scale.setScalar(Math.max(.001, springy(made)));
    const count = Math.floor(work * PAGES + .001);
    pages.forEach((pg, k) => { pg.m.visible = pg.tab.visible = k < count; });
    agent.head.rotation.x = work > 0 && work < 1 ? -.2 : 0;
    agent.update(t, 0);
    spark.visible = work > 0 && work < 1;
    if (spark.visible) {
      const u = (work * PAGES) % 1;
      stand.localToWorld(to.set(0, .92 + count * .02, 0));
      arc(spark.position, SLOTS[Math.floor(work * PAGES) % 2], to, u, .35);
    }

    // 4 · verify: the report goes into the verifier; the reference is piped to it, and only to it;
    //     the checks come back mixed, and the failing step is pinned in the trajectory
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
    const pin = ramp(p, .74, .78);
    marker.visible = pin > 0 && p < .9;
    if (marker.visible) { verifier.localToWorld(from.set(0, .9, .4)); stand.localToWorld(to.set(.18, .92 + FAILED * .02, .1)); arc(marker.position, from, to, smooth(pin), .5); }
    failMat.emissiveIntensity = .8 * ramp(p, .77, .79) * (reduce ? 1 : .8 + Math.sin(t * 4) * .2);

    // 5 · contribute: a Metacase from the record, the Model & Harness packed, the Failure Case filed
    const rise = ramp(p, .8, .85);
    plinths.forEach(g => { g.visible = rise > 0; g.scale.set(1, Math.max(.001, springy(rise)), 1); });
    const packs = [0, 1, 2].map(k => ramp(p, .83 + k * .025, .91 + k * .025));
    stand.localToWorld(from.set(0, 1.2, 0)); to.set(PLINTHS[0], PLINTH_H, PLINTH_Z);
    metacase.visible = packs[0] > 0;
    arc(metacase.position, from, to, smooth(packs[0]), .9);
    metacase.scale.setScalar(Math.max(.001, lerp(.08, .27, smooth(packs[0]))));
    metacase.rotation.y = (1 - packs[0]) * 2 - .25;
    arc(box.root.position, BOX_AT, to.set(PLINTHS[1], PLINTH_H, PLINTH_Z), smooth(packs[1]), .8);
    box.root.scale.setScalar(lerp(.5, .62, smooth(packs[1])));
    box.root.rotation.y = -packs[1] * .3;
    model.root.visible = coreK > 0;
    if (packs[1] > 0) {
      const k1 = smooth(packs[1]);
      model.root.position.lerp(to.set(PLINTHS[1], PLINTH_H + .62, PLINTH_Z), k1);
      tools.forEach((tool, k) => { tool.position.lerp(to.set(PLINTHS[1] + (k ? .2 : -.2), PLINTH_H + .62, PLINTH_Z + .05), k1); tool.rotation.z = lerp(tool.rotation.z, k ? -.6 : .6, k1); });
      rig.scale.y = Math.max(.001, 1 - k1);
    }
    failure.root.visible = packs[2] > 0;
    verifier.localToWorld(from.set(0, 1.1, .2));
    arc(failure.root.position, from, to.set(PLINTHS[2], PLINTH_H + .02, PLINTH_Z), smooth(packs[2]), .8);
    failure.root.rotation.set(lerp(-1.2, -.35, smooth(packs[2])), -.15, 0);
    failure.root.scale.setScalar(Math.max(.001, lerp(.3, .82, smooth(packs[2]))));
    flashes.forEach((f, k) => { f.material.opacity = .55 * Math.max(0, 1 - Math.abs(packs[k] - .95) / .1); });

    aimCamera(camera, rect, p);
    const above = (obj, y) => obj.getWorldPosition(tmp).add(at.set(0, y, 0));
    const lift = rect.width / rect.height < .8 ? .55 : 0; // on portrait screens B's label stands above A's and C's
    onProject([
      label(tmp.set(-.1, DESK_Y + 1.12, DESK_Z + .05), shown(p, .14, .17, .2, .22), rect),                        // the case
      label(above(model.root, .32), shown(p, .24, .27, .31, .33), rect),                                         // the model
      label(above(tools[1], .3), shown(p, .33, .35, .39, .41), rect),                                            // the harness
      label(stand.localToWorld(tmp.set(0, 1.25, 0)), shown(p, .46, .5, .6, .62), rect),                          // the trajectory
      label(verifier.localToWorld(tmp.set(0, 1.45, 0)), shown(p, .64, .67, .8, .82), rect),                      // the verifier
      label(verifier.localToWorld(tmp.set(0, .95, .4)), shown(p, .72, .75, .8, .82), rect),                      // the result
      label(tmp.set(PLINTHS[0], PLINTH_H + 1.05, PLINTH_Z), ramp(p, .9, .93), rect),                              // A · Metacase
      label(tmp.set(PLINTHS[1], PLINTH_H + 1.05 + lift, PLINTH_Z), ramp(p, .92, .95), rect),                      // B · Model & Harness
      label(tmp.set(PLINTHS[2], PLINTH_H + 1.05, PLINTH_Z), ramp(p, .94, .97), rect),                             // C · Failure Case
    ]);
  }
  function setTheme() { const bg = pageBackground(); scene.background = bg; scene.fog = new THREE.Fog(bg, 18, 44); }
  setTheme();
  return { scene, camera, update, setTheme };
}
