/* metacase-anatomy.js — The Metacase as one volume of the library. Scroll (0–1) opens the
 * book on a reading desk and turns it through its seven chapters, from context to
 * lessons; each chapter rises off the page as a pop-up and leaves a coloured tab on the
 * fore-edge. Closed again, the seven tab tips trace the book's signature: the shape of
 * how the problem was solved. Rendered by the shared stage (mc-stage.js). */
import * as THREE from '../assets/vendor/three/three.module.js';
import { labelPlane, labelTexture, METACASE_LABEL, PALETTE, mat, add, block, cyl, ball, rbox, lights, person, robot, buildings, bookStack, tabDepth, STAGE_COLORS } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitSafe, fitBox, toView, glowSprite } from './mc-stage.js';

const PW = 2.4, PD = 3.2, T = .42, BOARD = .06; // page width (x), page depth (z), page block, cover board
const CHAPTERS = [.13, .8];                        // where the book is open; one band per chapter
const SIG = 0;
const band = p => (p - CHAPTERS[0]) / (CHAPTERS[1] - CHAPTERS[0]) * 7;

// Seven pop-ups, one per chapter. Each stands on the page around its origin, under ~1.1 high.
const POPUPS = [
  g => { // context & raw evidence: papers, the original data, a magnifier
    for (let k = 0; k < 4; k++) block(g, .55, .03, .7, PALETTE.cream, -.55 + k * .05, k * .035, -.1 + k * .03, .01).rotation.y = k * .12 - .2;
    [.35, .6, .45].forEach((h, k) => block(g, .14, h, .14, STAGE_COLORS[0], .25 + k * .2, 0, -.25, .02));
    const lens = new THREE.Group(); lens.position.set(.1, .75, .25); lens.rotation.set(.5, 0, .5); g.add(lens);
    add(lens, new THREE.TorusGeometry(.22, .04, 10, 28), mat(PALETTE.amber));
    add(lens, new THREE.CircleGeometry(.2, 24), mat(0xbfe9ff, { opacity: .45 }), 0, 0, 0, false);
    cyl(lens, .03, .035, .4, PALETTE.ink, 0, -.62, 0, 8);
    return t => { lens.rotation.y = Math.sin(t * .8) * .4; };
  },
  g => { // prior practice: an institution and the precedents it kept
    const hall = buildings.policy(PALETTE.sky); hall.scale.setScalar(.42); hall.position.set(-.25, 0, -.2); g.add(hall);
    const stack = bookStack(4, 1); stack.scale.setScalar(.8); stack.position.set(.6, 0, .35); g.add(stack);
    const elder = person(7); elder.root.scale.setScalar(.45); elder.root.position.set(.45, 0, -.15); elder.root.rotation.y = -.6; g.add(elder.root);
    return t => elder.update(t, 0);
  },
  g => { // approaches considered: three paths fan out; one is set aside
    const flags = [-.5, 0, .5].map((a, k) => {
      const path = new THREE.Group(); path.position.set(-.6, 0, .35); path.rotation.y = a + Math.PI / 2 - Math.PI / 2; g.add(path);
      path.rotation.y = -a;
      const color = k === 2 ? 0x5a6290 : k === 1 ? STAGE_COLORS[2] : 0xc9d6f0;
      block(path, 1.3, .04, .16, color, .65, 0, 0, .02);
      cyl(path, .018, .018, .6, PALETTE.ink, 1.3, 0, 0, 6);
      const flag = block(path, .26, .16, .02, k === 2 ? 0x5a6290 : color, 1.43, .4, 0, .01);
      if (k === 2) { const x = new THREE.Group(); x.position.set(1.3, .75, 0); path.add(x); [1, -1].forEach(s => { const bar = block(x, .26, .05, .04, mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: .6 }), 0, -.025, 0, .01); bar.rotation.z = s * .785; }); }
      return flag;
    });
    return t => flags.forEach((f, k) => { f.rotation.y = Math.sin(t * 2 + k) * .25; });
  },
  g => { // reasoning & candidate strategies: weighing one against another
    cyl(g, .35, .42, .1, PALETTE.ink, 0, 0, 0, 24);
    cyl(g, .04, .05, .8, 0xc9a36e, 0, .1, 0, 10);
    const beam = new THREE.Group(); beam.position.y = .92; g.add(beam);
    block(beam, 1.5, .05, .06, 0xc9a36e, 0, -.025, 0, .02);
    const pans = [-1, 1].map(s => {
      const pan = new THREE.Group(); pan.position.x = s * .7; beam.add(pan);
      cyl(pan, .01, .01, .3, PALETTE.slate, 0, -.3, 0, 4);
      cyl(pan, .24, .2, .04, mat(STAGE_COLORS[3]), 0, -.34, 0, 20);
      for (let k = 0; k < (s > 0 ? 3 : 2); k++) ball(pan, .07, s > 0 ? PALETTE.amber : PALETTE.slate, -.08 + k * .08, -.23, 0, 12);
      return pan;
    });
    return t => { beam.rotation.z = -.12 + Math.sin(t * 1.4) * .04; pans.forEach(p => { p.rotation.z = -beam.rotation.z; }); };
  },
  g => { // actions taken: step by step
    for (let k = 0; k < 4; k++) block(g, .4, .16 + k * .16, .6, k === 3 ? STAGE_COLORS[4] : 0xf3d9de, -.6 + k * .4, 0, 0, .03);
    const bot = robot(0xf7f5f0); bot.root.scale.setScalar(.5); g.add(bot.root);
    return t => {
      const u = (t * .35) % 1, k = Math.min(3, Math.floor(u * 4));
      bot.root.position.set(-.6 + u * 1.6, .16 + k * .16 + Math.abs(Math.sin(u * 4 * Math.PI)) * .08, 0); bot.root.rotation.y = Math.PI / 2; bot.update(t, 1);
    };
  },
  g => { // outcomes: measured against the goal
    const bars = [.3, .45, .62, .85].map((h, k) => block(g, .16, h, .16, k === 3 ? STAGE_COLORS[5] : 0xf6e2b0, -.55 + k * .24, 0, -.1, .02));
    const target = new THREE.Group(); target.position.set(.6, .45, .1); g.add(target);
    [.32, .22, .12].forEach((r, k) => add(target, new THREE.TorusGeometry(r, .03, 8, 32), mat(k % 2 ? 0xffffff : PALETTE.rose)));
    ball(target, .05, PALETTE.rose, 0, 0, 0, 12);
    cyl(g, .02, .02, .3, PALETTE.ink, .6, 0, .1, 6);
    return t => bars.forEach((b, k) => { b.scale.y = .85 + Math.sin(t * 2 + k) * .06 + .15; });
  },
  g => { // interpretation & lessons: what to carry into the next case
    const glass = ball(g, .22, mat(0xfff1c2, { emissive: 0xffd36b, intensity: 1.8, rough: .4 }), 0, .62, 0, 24);
    cyl(g, .1, .12, .18, PALETTE.slate, 0, .28, 0, 14);
    cyl(g, .3, .34, .06, PALETTE.ink, 0, 0, 0, 24);
    const halo = glowSprite(0xffd36b, 1.6, .35); halo.position.set(0, .62, 0); g.add(halo);
    [-1, 1].forEach(s => { const leaf = block(g, .42, .02, .5, PALETTE.cream, s * .62, .02, .3, .01); leaf.rotation.z = s * -.14; });
    return t => { glass.material.emissiveIntensity = 1.6 + Math.sin(t * 3) * .4; halo.material.opacity = .3 + Math.sin(t * 3) * .08; };
  },
];

export function createAnatomy({ onProject = () => {}, safe = () => null, reduce = false } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 120);
  const light = lights(scene, { span: 8, shadowSize: 1024 });
  light.key.position.set(-4, 10, 7);

  /* ---- the reading desk ---- */
  block(scene, 9, .3, 6.4, 0x6e5440, 0, -.3, .2, .06).castShadow = false;
  block(scene, 9.1, .04, 6.5, 0x5a4434, 0, -.34, .2, .02).castShadow = false;
  const lampG = new THREE.Group(); lampG.position.set(-3.4, 0, -2.1); scene.add(lampG);
  cyl(lampG, .3, .36, .08, PALETTE.ink, 0, 0, 0, 20); cyl(lampG, .03, .03, 1.5, PALETTE.ink, 0, .08, 0, 8);
  cyl(lampG, .22, .42, .34, mat(0x3f9d6a), .0, 1.45, 0, 20);
  const lampGlow = glowSprite(0xffd9a0, 4, .5); lampGlow.position.set(0, 1.4, 0); lampG.add(lampGlow);
  const pool = glowSprite(0xffe2b0, 9, .14); pool.position.set(.6, .05, .2); scene.add(pool);
  // a closed companion volume and an ink pot, kept quiet at the edge of the light
  block(scene, 1.3, .22, 1.8, mat(0x6b3a3a), 3.4, 0, -1.6, .03).rotation.y = .25;
  block(scene, 1.24, .16, 1.74, mat(PALETTE.cream), 3.42, .03, -1.6, .02).rotation.y = .25;
  cyl(scene, .16, .2, .26, PALETTE.ink, -3.0, 0, 1.4, 16);

  /* ---- the book: a back board, a block of pages, a front cover on a hinge ---- */
  const book = new THREE.Group(); scene.add(book);
  const cover = mat(0x2c5468, { rough: .9 }), edge = mat(PALETTE.cream), gilt = mat(0xd8b46a, { rough: .4 });
  block(book, PW + .1, BOARD, PD + .12, cover, PW / 2, 0, 0, .02);             // back board
  block(book, PW, T, PD, edge, PW / 2, BOARD, 0, .02).castShadow = true;        // right-hand pages
  block(book, .14, T + BOARD * 2, PD + .12, cover, 0, 0, 0, .04);              // spine
  const rightTop = BOARD + T;
  for (let k = 1; k < 6; k++) block(book, .006, .004, PD - .04, mat(0xe4dccb), PW + .001, BOARD + k * T / 6, 0, .001).castShadow = false;
  [.18, .82].forEach(f => block(book, .16, .03, PD + .14, gilt, 0, (T + BOARD * 2) * f, 0, .01).castShadow = false);
  const ribbon = block(book, .05, .004, .7, mat(0xb8323f), PW * .62, rightTop, PD / 2 - .05, .002); ribbon.castShadow = false;
  // printed lines and a chapter heading band on the right-hand page
  const ink = mat(0x9aa3b2), heading = new THREE.MeshStandardMaterial({ color: STAGE_COLORS[0], roughness: .7 });
  for (let k = 0; k < 9; k++) block(book, PW * (k % 3 === 2 ? .5 : .78), .004, .05, ink, PW / 2 - (k % 3 === 2 ? PW * .14 : 0), rightTop, -PD / 2 + 1.0 + k * .22, .002).castShadow = false;
  add(book, rbox(PW * .78, .006, .16, .003), heading, PW / 2, rightTop + .003, -PD / 2 + .3, false);
  const NAMES = ['CONTEXT & RAW EVIDENCE', 'PRIOR PRACTICE', 'APPROACHES CONSIDERED', 'REASONING', 'ACTIONS TAKEN', 'OUTCOMES', 'INTERPRETATION & LESSONS'];
  const runTex = labelTexture('metacase-run', [{ text: 'METACASE', size: 120, weight: 750, color: '#1f2a3a', track: 14 }, { text: 'CH 1 · ' + NAMES[0], size: 52, weight: 500, color: '#6b7280', font: '"Space Mono", ui-monospace, monospace', track: 4 }], { width: 1024, height: 320 });
  const runHead = labelPlane(runTex, PW * .7, PW * .7 * 320 / 1024); runHead.position.set(-PW / 2, 0, -PD / 2 + .62); book.add(runHead);
  let runStage = 0;
  // the left-hand pages grow as chapters are turned
  const leftPages = add(book, rbox(PW, 1, PD, .01), edge, -PW / 2, 0, 0);
  const leftHeading = new THREE.MeshStandardMaterial({ color: STAGE_COLORS[0], roughness: .7 });
  const leftBand = add(book, rbox(PW * .78, .006, .16, .003), leftHeading, -PW / 2, 0, -PD / 2 + .3, false);
  const leftLines = [];
  for (let k = 0; k < 9; k++) leftLines.push(add(book, rbox(PW * (k % 3 === 2 ? .5 : .78), .004, .05, .002), ink, -PW / 2 - (k % 3 === 2 ? PW * .14 : 0), 0, -PD / 2 + 1.0 + k * .22, false));
  // the front cover, hinged at the spine; it lands on the desk to the left
  const hinge = new THREE.Group(); book.add(hinge);
  const front = new THREE.Group(); front.position.x = PW / 2 + .05; hinge.add(front);
  add(front, rbox(PW + .1, BOARD, PD + .12, .02), cover);
  add(front, rbox(PW * .62, .01, .62, .006), mat(PALETTE.cream), 0, BOARD / 2 + .004, -.35, false);
  const coverTitle = labelPlane(METACASE_LABEL(), PW * .6, PW * .3); coverTitle.position.set(0, BOARD / 2 + .013, -.35); front.add(coverTitle);
  // a gilt frame with corner caps
  [[0, -PD / 2 + .14, PW - .1, .025], [0, PD / 2 - .14, PW - .1, .025]].forEach(([x, z, w, d]) => add(front, rbox(w, .01, d, .004), gilt, x, BOARD / 2 + .004, z, false));
  [-1, 1].forEach(sx => add(front, rbox(.025, .01, PD - .28, .004), gilt, sx * (PW / 2 - .1), BOARD / 2 + .004, 0, false));
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(front, rbox(.22, .016, .22, .02), gilt, sx * (PW / 2 - .04), BOARD / 2 + .002, sz * (PD / 2 - .02), false)));
  // three small tabs on the cover, a preview of the signature inside
  [0, 3, 5].forEach((i, k) => add(front, rbox(.1, .012, .1, .02), mat(STAGE_COLORS[i]), -.25 + k * .25, BOARD / 2 + .008, .35, false));
  // the leaf being turned
  const leafPivot = new THREE.Group(); book.add(leafPivot);
  const leaf = add(leafPivot, rbox(PW, .01, PD, .004), edge, PW / 2, 0, 0); leaf.castShadow = true;

  // chapter tabs on the fore-edge (x = PW): together they trace the signature
  const tabs = [], tips = [];
  for (let i = 0; i < 7; i++) {
    const td = .12 + tabDepth(SIG, i, 2.6), z = -PD / 2 + PD * (.1 + .8 * (i + .5) / 7), y = BOARD + T * .5 - .09;
    const tab = new THREE.Group(); tab.position.set(PW - .02, y, z); book.add(tab);
    add(tab, rbox(td + .04, .18, .3, .025), mat(STAGE_COLORS[i], { emissive: STAGE_COLORS[i], intensity: .25 }), (td + .04) / 2, .09, 0);
    tabs.push(tab); tips.push(new THREE.Vector3(PW + td, y + .2, z));
  }
  // the signature thread through the tab tips, drawn when the book is closed
  const threadMat = mat(0xfff6e0, { emissive: 0xfff1d0, intensity: .9 });
  const nodes = tips.map((p, i) => ball(scene, .06, mat(STAGE_COLORS[i], { emissive: STAGE_COLORS[i], intensity: 1.1 }), p.x, p.y + .02, p.z, 14));
  const links = tips.slice(1).map((p, i) => {
    const a = tips[i], len = a.distanceTo(p), m = add(scene, new THREE.CylinderGeometry(.018, .018, 1, 8), threadMat, 0, 0, 0, false);
    m.position.copy(a).lerp(p, .5).setY(a.y + .02); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(a).normalize()); m.userData.len = len;
    return m;
  });
  const sigGlow = glowSprite(0xffe7b8, 2.6, 0); sigGlow.position.set(PW + .35, rightTop, 0); scene.add(sigGlow);

  // the seven pop-ups
  const pops = POPUPS.map((build, i) => {
    const g = new THREE.Group(); g.position.set(PW / 2, rightTop, .25); book.add(g);
    const tick = build(g); g.userData.size = 1.25; g.scale.set(1.25, .001, 1.25); g.visible = false;
    return { g, tick, anchor: new THREE.Vector3(PW * .95, rightTop + 1.25, .4) };
  });

  // two small readers on the desk
  const reader = person(3); reader.root.scale.setScalar(.62); reader.root.position.set(-1.4, 0, 2.3); reader.root.rotation.y = Math.PI + .5; scene.add(reader.root);
  const agent = robot(0xf7f5f0); agent.root.scale.setScalar(.62); agent.root.position.set(3.0, 0, 1.9); agent.root.rotation.y = -2.4; scene.add(agent.root);

  const target = new THREE.Vector3(), aim = new THREE.Vector3(), v = new THREE.Vector3();
  const pointer = { x: 0, tx: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; }, { passive: true });

  function update(dt, t, p, rect) {
    const aspect = rect.width / rect.height, wide = aspect > 1.15;
    pointer.x += (pointer.tx - pointer.x) * .05;
    const opening = ramp(p, .05, CHAPTERS[0]), closing = ramp(p, CHAPTERS[1], .87), draw = ramp(p, .88, .98);
    const openness = opening * (1 - closing);
    const b = band(p), stage = p < CHAPTERS[0] ? -1 : p >= CHAPTERS[1] ? 7 : clamp(Math.floor(b), 0, 6);

    // the cover swings over the spine and settles on the left
    const swing = openness * Math.PI;
    hinge.rotation.z = swing; hinge.position.y = lerp(rightTop + BOARD / 2, BOARD / 2, smooth(openness * 1.4 - .4));
    // pages turned so far build up the left-hand side
    const turned = clamp(b, 0, 6);
    const leftT = (.04 + turned * .03) * smooth(openness * 2 - 1), leftY = BOARD + .004;
    leftPages.visible = leftT > .005; leftPages.scale.y = Math.max(.001, leftT); leftPages.position.y = leftY + leftT / 2;
    leftBand.position.y = leftY + leftT + .003; runHead.position.y = leftY + leftT + .01; runHead.visible = leftPages.visible; leftLines.forEach(l => { l.position.y = leftY + leftT + .002; l.visible = leftPages.visible; }); leftBand.visible = leftPages.visible && turned >= 1;
    if (stage >= 0 && stage <= 6) heading.color.setHex(STAGE_COLORS[stage]);
    if (stage >= 0 && stage <= 6 && stage !== runStage) { runStage = stage; runTex.userData.redraw([{ text: 'METACASE', size: 120, weight: 750, color: '#1f2a3a', track: 14 }, { text: `CH ${stage + 1} · ${NAMES[stage]}`, size: 52, weight: 500, color: '#6b7280', font: '"Space Mono", ui-monospace, monospace', track: 4 }]); }
    leftHeading.color.setHex(STAGE_COLORS[clamp(Math.floor(turned) - 1, 0, 6)]);

    // turning: the last part of every chapter carries a leaf across
    const within = b - Math.floor(b), turning = stage >= 0 && stage < 6 && p < CHAPTERS[1] ? ramp(within, .8, 1) : 0;
    leafPivot.visible = turning > .001 && turning < .999;
    leafPivot.rotation.z = turning * Math.PI; leafPivot.position.y = lerp(rightTop + .006, leftY + leftT + .006, turning);

    pops.forEach((pop, i) => {
      const u = b - i, last = i === 6;
      const up = ramp(u, .02, .26), down = last ? closing : ramp(u, .66, .8);
      const k = p < CHAPTERS[0] ? 0 : up * (1 - down);
      pop.g.visible = k > .002; pop.g.scale.y = Math.max(.001, k) * pop.g.userData.size;
      if (pop.g.visible && !reduce) pop.tick(t);
    });
    tabs.forEach((tab, i) => { const k = ramp(b - i, .3, .55); tab.scale.set(Math.max(.001, k), 1, 1); tab.visible = k > .002; });

    // the signature: the tips of the seven tabs, joined when the book is closed
    const reveal = draw * 7.4;
    nodes.forEach((n, i) => { const k = clamp(reveal - i); n.scale.setScalar(Math.max(.001, k)); n.visible = k > .01; });
    links.forEach((l, i) => { const k = clamp(reveal - i - .6); l.scale.set(1, Math.max(.001, k * l.userData.len), 1); l.visible = k > .01; });
    sigGlow.material.opacity = draw * (.45 + Math.sin(t * 2) * .1);
    pool.material.opacity = .12 + openness * .06;
    reader.update(t, 0); agent.update(t, 0);

    // camera: the closed book, the open spread, then the fore-edge with its signature
    const frame = fitSafe(camera, rect, safe(), { fov: aspect < 1 ? 42 : 32, shift: wide ? -.05 : 0 });
    target.set(lerp(PW / 2, .1, openness), lerp(.35, .55, openness), lerp(0, .15, openness));
    aim.set(PW + .35, .3, 0);
    target.lerp(aim, smooth(draw * 1.3));
    const fin = smooth(draw * 1.3);
    const dist = fitBox(lerp(lerp(1.9, 2.75, openness), 1.25, fin), lerp(lerp(1.45, 1.5, openness), 1.75, fin), camera.fov, frame, lerp(.97, .95, fin));
    const az = lerp(lerp(-.35, -.12, openness) + (reduce ? 0 : pointer.x * .2) + clamp(b / 7) * .2, .15, smooth(draw * 1.3));
    const el = lerp(lerp(.58, .7, openness), 1.2, smooth(draw * 1.3));
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(target);
    book.updateMatrixWorld();

    onProject(pops.map((pop, i) => {
      const s = toView(book.localToWorld(v.copy(pop.anchor)), camera, rect), o = pop.g.visible ? clamp(pop.g.scale.y / pop.g.userData.size * 1.4) : 0;
      return { ...s, opacity: o, visible: o > .02 && s.front && s.inside, active: i === stage };
    }), { stage, open: openness, draw, signature: toView(v.set(PW + 1.45, tips[3].y, tips[3].z), camera, rect) });
  }
  function setTheme() { const bg = pageBackground(); scene.background = bg; scene.fog = new THREE.Fog(bg, 16, 40); }
  setTheme();
  return { scene, camera, update, setTheme };
}
