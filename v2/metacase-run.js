/* metacase-run.js — 05 · The Metacase Challenge: one run under the four rules, in the
 * library's reading room. A case folder opens on a desk and its raw evidence is worked
 * into a finished deliverable (end-to-end tasks); the reference waits sealed in a locked
 * case behind a rope (hidden references); the same folder lies on every desk, each with a
 * different agent (same tasks for everyone); then each run's five stages rise and are
 * bound into a Metacase as the tabs on its fore-edge, the reference is opened for scoring,
 * and the three books go to the shelves (full trajectories). Rendered by the shared stage. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { PALETTE, BOOK, STAGE_COLORS, closedBook, bookTabs, mat, add, block, cyl, ball, rbox, robot, lights } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitSafe, fitBox, toView, glowSprite } from './mc-stage.js';

const DESKS = [-2.7, 0, 2.7], DESK_Z = 1, DESK_Y = .72;
const HARNESS = [0xf7f5f0, PALETTE.amber, PALETTE.teal];    // three agents, three harnesses
const CASE = new THREE.Vector3(0, 0, -1.7);                  // the sealed reference, behind the rope
const SHELF_Z = -3.9, CASE_H = 2.6, BAY_W = 2.4, SHELF_Y = [.22, 1.0, 1.78];
const FIELDS = [PALETTE.teal, PALETTE.amber, PALETTE.violet];
const BOOK_S = .3, SHELVED_S = .2;                           // a run's Metacase, above its desk and on the shelf
const SHEET_W = .4, SHEET_H = .5, SHEET_GEO = new THREE.PlaneGeometry(SHEET_W, SHEET_H);

const springy = x => { const q = clamp(x) - 1; return 1 + 2.6 * q * q * q + 1.6 * q * q; }; // eases past 1 and settles
function shade(hex, k) { return new THREE.Color(hex).lerp(new THREE.Color(k > 0 ? 0xffffff : 0x1a1d26), Math.abs(k)).getHex(); }

/* ---- the case's raw evidence and the deliverable, drawn once on canvas ---- */
function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), r = (x, y, ww, hh, rad, fill) => { g.beginPath(); g.roundRect(x, y, ww, hh, rad); g.fillStyle = fill; g.fill(); };
  paint(g, r, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
const EVIDENCE = [ // a paper, a data sheet, a figure, a filing with its stamp
  (g, r, W) => { r(0, 0, W, 320, 18, '#fbfaf6'); r(24, 26, 150, 14, 5, '#1f2a3a'); for (let i = 0; i < 12; i++) r(24, 58 + i * 19, (W - 48) * (i % 3 === 2 ? .6 : 1), 7, 3, '#c9cdd6'); },
  (g, r, W) => { r(0, 0, W, 320, 18, '#fbfaf6'); r(24, 24, W - 48, 26, 6, '#f2b545'); for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) r(28 + j * 70, 64 + i * 30, 30 + ((i * 5 + j * 3) % 4) * 9, 9, 4, '#9aa3b2'); },
  (g, r, W) => { r(0, 0, W, 320, 18, '#fbfaf6'); r(24, 24, 120, 12, 5, '#1f2a3a'); [90, 150, 120, 200, 230].forEach((h, i) => r(36 + i * 40, 296 - h, 26, h, 5, i === 4 ? '#7d6ad8' : '#cfc7f1')); },
  (g, r, W) => { r(0, 0, W, 320, 18, '#fbfaf6'); r(24, 24, W - 48, 34, 6, '#45b5b0'); for (let i = 0; i < 9; i++) r(24, 76 + i * 19, (W - 48) * (i % 3 === 2 ? .55 : 1), 7, 3, '#c9cdd6'); g.strokeStyle = '#e2667a'; g.lineWidth = 6; g.beginPath(); g.arc(186, 262, 28, 0, Math.PI * 2); g.stroke(); },
];
const REPORT = (g, r, W, H) => { // a finished deliverable: a titled report with its figure and a table
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

  /* ---- the reading room ---- */
  add(scene, new THREE.CylinderGeometry(7.4, 7.6, .4, 72), mat(0x6e5440), 0, -.2, -.4).castShadow = false;
  for (let k = 0; k < 3; k++) add(scene, new THREE.TorusGeometry(2.8 + k * 1.7, .015, 4, 96), mat(0x5a4434), 0, .005, -.4, false).rotation.x = Math.PI / 2;
  add(scene, new THREE.CylinderGeometry(4.6, 4.6, .03, 64), mat(0x3a4a7a), 0, .015, 1.1, false).scale.z = .42;

  // the shelves at the back, one bay per field; the middle bay keeps three gaps for the new books
  const slots = [];
  FIELDS.forEach((accent, c) => {
    const bay = new THREE.Group(); bay.position.set((c - 1) * (BAY_W + .1), 0, SHELF_Z); scene.add(bay);
    block(bay, BAY_W, CASE_H, .1, PALETTE.ink, 0, 0, -.28, .02);
    [-1, 1].forEach(s => block(bay, .08, CASE_H, .62, 0x7a5a42, s * (BAY_W / 2 - .04), 0, 0, .02));
    block(bay, BAY_W + .1, .14, .7, mat(accent, { emissive: accent, intensity: .2 }), 0, CASE_H, 0, .03);
    SHELF_Y.forEach((y, row) => {
      block(bay, BAY_W - .1, .05, .56, 0x8a6a4a, 0, y - .05, 0, .01).castShadow = false;
      let x = -BAY_W / 2 + .1, k = 0;
      while (x < BAY_W / 2 - .22) {
        const w = [.1, .12, .14, .11][(k + row + c) % 4], h = [.5, .6, .56, .46, .64][(k * 3 + c + row) % 5];
        if (c === 1 && row === 1 && k >= 5 && k <= 7) { slots.push(new THREE.Vector3(bay.position.x + x + .12, y, SHELF_Z + .06)); x += .26; k++; continue; }
        block(bay, w, h, .4, mat(shade(accent, [-.3, 0, .28, -.12, .14][(k + c * 2 + row) % 5])), x + w / 2, y, .04, .012).castShadow = false;
        x += w + .006; k++;
      }
    });
  });

  const shelfGlow = glowSprite(0xffe2b0, 3.2, 0); shelfGlow.position.set(0, SHELF_Y[1] + .35, SHELF_Z + .35); scene.add(shelfGlow);

  // the reference: sealed in a locked glass case on a plinth, behind a rope
  const vitrine = new THREE.Group(); vitrine.position.copy(CASE); scene.add(vitrine);
  block(vitrine, 1.3, .78, 1, PALETTE.stone, 0, 0, 0, .05);
  const reference = new THREE.Group(); reference.position.set(0, .8, 0); vitrine.add(reference);
  block(reference, .72, .12, .9, mat(0xd8b46a, { rough: .4 }), 0, 0, 0, .03);
  block(reference, .66, .1, .84, mat(PALETTE.cream), .02, .01, 0, .02);
  add(reference, new THREE.CylinderGeometry(.1, .1, .03, 20), mat(0xb8323f, { emissive: 0xb8323f, intensity: .3 }), 0, .14, .12);
  const glassMat = mat(0xcfe0ff, { opacity: .16, rough: .1 });
  add(vitrine, rbox(1.16, .86, .86, .04), glassMat, 0, 1.21, 0, false);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.16, .86, .86)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5 }));
  edges.position.y = 1.21; vitrine.add(edges);
  const lid = new THREE.Group(); lid.position.set(0, 1.64, -.43); vitrine.add(lid);
  add(lid, rbox(1.2, .04, .9, .02), mat(0xdfe9ff, { opacity: .35, rough: .1 }), 0, .02, .45, false);
  const lock = new THREE.Group(); lock.position.set(0, 1.0, .47); vitrine.add(lock);
  block(lock, .28, .24, .1, PALETTE.amber, 0, -.12, 0, .05);
  ball(lock, .03, PALETTE.ink, 0, -.02, .055, 8);
  const shackle = add(lock, new THREE.TorusGeometry(.09, .025, 8, 20, Math.PI), mat(PALETTE.slate), 0, .12, 0);
  const refGlow = glowSprite(PALETTE.amber, 2.2, .2); refGlow.position.set(0, 1.0, 0); vitrine.add(refGlow);
  const rope = new THREE.Group(); scene.add(rope);
  const posts = [-1.15, 0, 1.15].map(x => { cyl(rope, .05, .08, .82, mat(0xc9a36e, { rough: .35 }), x, 0, -.75, 12); ball(rope, .07, mat(0xd8b46a, { rough: .35 }), x, .86, -.75, 12); return new THREE.Vector3(x, .78, -.75); });
  posts.slice(1).forEach((b, i) => {
    const a = posts[i], m = a.clone().lerp(b, .5).setY(.56);
    add(rope, new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 16, .03, 6), mat(0x8e2a35), 0, 0, 0, false);
  });

  /* ---- three desks, the same case on each, three different agents ---- */
  const evidence = EVIDENCE.map(paint => canvasTexture(256, 320, paint)), reportTex = canvasTexture(256, 340, REPORT);
  const desks = DESKS.map((x, k) => {
    const g = new THREE.Group(); g.position.set(x, 0, DESK_Z); scene.add(g);
    block(g, 2, .08, 1, 0x7a5a42, 0, DESK_Y - .08, 0, .03);
    [[-.92, -.42], [.92, -.42], [-.92, .42], [.92, .42]].forEach(([lx, lz]) => block(g, .07, DESK_Y - .08, .07, 0x5a4434, lx, 0, lz, .02));
    block(g, 1.76, .01, .76, mat(0x2f4a3e), 0, DESK_Y, 0, .004).castShadow = false;
    // the case folder, its cover hinged on the left
    const folder = new THREE.Group(); folder.position.set(-.42, DESK_Y + .012, .08); g.add(folder);
    block(folder, .62, .02, .46, mat(0xe8dcc0), 0, 0, 0, .01);
    block(folder, .16, .025, .07, mat(PALETTE.rose), -.18, 0, -.255, .01);
    const cover = new THREE.Group(); cover.position.set(-.31, .022, 0); folder.add(cover);
    block(cover, .62, .015, .46, mat(0xd9c9a6), .31, 0, 0, .01);
    const sheets = evidence.map(tex => {
      const m = new THREE.Mesh(SHEET_GEO, new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: .25, roughness: .85, side: THREE.DoubleSide }));
      m.visible = false; g.add(m); return m;
    });
    // the deliverable, a bound report
    const report = new THREE.Group(); report.position.set(.42, DESK_Y + .01, .06); g.add(report);
    add(report, rbox(.5, .05, .66, .02), mat(0xf7f5f0), 0, .025, 0);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.46, .62), new THREE.MeshStandardMaterial({ map: reportTex, roughness: .8 }));
    face.rotation.x = -Math.PI / 2; face.position.y = .052; report.add(face);
    report.rotation.y = -.12;
    const done = glowSprite(PALETTE.green, 1.4, 0); done.position.set(.42, DESK_Y + .2, .06); g.add(done);
    const agent = robot(HARNESS[k]); agent.root.scale.setScalar(.82); agent.root.position.set(0, 0, -.78); g.add(agent.root);
    const lamp = glowSprite(0xffe2b0, 3.4, .12); lamp.position.set(0, DESK_Y + .4, 0); g.add(lamp);
    // the Metacase this run is bound into: standing, its cover to the room, its tabs on the right
    const holder = new THREE.Group(); scene.add(holder); holder.visible = false;
    const book = closedBook(); const sig = bookTabs(book, 0);
    book.rotation.x = Math.PI / 2; book.position.set(-BOOK.PW / 2, BOOK.PD / 2, -(BOOK.T + BOOK.BOARD * 2) / 2);
    holder.add(book);
    sig.tabs.forEach(t => { t.scale.set(.001, 1, 1); t.visible = false; });
    const steps = STAGE_COLORS.map(c => { const s = add(scene, rbox(.24, .05, .16, .02), mat(c, { emissive: c, intensity: .5 }), 0, 0, 0, false); s.visible = false; return s; });
    const passed = glowSprite(PALETTE.green, 1.6, 0); scene.add(passed);
    return { g, x, k, cover, sheets, report, done, agent, lamp, holder, book, sig, steps, passed };
  });
  // the scoring: the reference, opened, checks each run
  const beams = desks.map(() => { const m = add(scene, new THREE.CylinderGeometry(.012, .012, 1, 6), mat(PALETTE.amber, { emissive: PALETTE.amber, intensity: 1.6, opacity: 0 }), 0, 0, 0, false); m.material = m.material.clone(); m.material.transparent = true; return m; });

  const target = new THREE.Vector3(), tmp = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), mid = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const lift = new THREE.Vector3(), restAt = new THREE.Vector3();
  const pointer = { x: 0, tx: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; }, { passive: true });

  // One desk's run, u = 0–1: the folder opens, the evidence fans out above the desk, and is
  // worked, sheet by sheet, into the finished report.
  function work(d, u, t) {
    const open = smooth(ramp(u, 0, .16));
    d.cover.rotation.z = open * Math.PI * .96;
    d.sheets.forEach((s, i) => {
      const fan = smooth(ramp(u, .1 + i * .04, .34 + i * .04)), fold = smooth(ramp(u, .48 + i * .06, .66 + i * .06));
      s.visible = fan > .001 && fold < .999;
      if (!s.visible) return;
      from.set(-.42, DESK_Y + .04, .08);
      mid.set((i - 1.5) * .44, DESK_Y + .62 + (i % 2) * .07 + (reduce ? 0 : Math.sin(t * 1.4 + i) * .02), .02);
      to.set(.42, DESK_Y + .08, .06);
      s.position.copy(from).lerp(mid, fan).lerp(to, fold);
      s.rotation.set(lerp(-Math.PI / 2, -.08, fan) + fold * -1.3, (1.5 - i) * .12 * (1 - fold), 0);
      s.scale.setScalar(lerp(.35, 1, fan) * lerp(1, .3, fold));
    });
    const made = ramp(u, .62, .9);
    d.report.scale.setScalar(Math.max(.001, springy(made)));
    d.report.visible = made > 0;
    d.done.material.opacity = .5 * Math.sin(Math.PI * ramp(u, .82, 1));
    d.agent.head.rotation.x = u > 0 && u < 1 ? -.25 : 0;
  }
  // The run bound into its Metacase, v = 0–1: the book appears above the desk and each of
  // the five stages rises from the report into its tab; s = 0–1 takes it to the shelf.
  function bind(d, v, s, t) {
    d.holder.visible = v > 0;
    if (!d.holder.visible) { d.steps.forEach(st => { st.visible = false; }); return; }
    restAt.set(d.x, DESK_Y + .5, DESK_Z - .25);
    const slot = slots[d.k];
    const e = smooth(s);
    from.copy(restAt); to.copy(slot); mid.copy(from).lerp(to, .5).setY(Math.max(from.y, to.y) + 1.4);
    d.holder.position.copy(from).multiplyScalar((1 - e) * (1 - e)).addScaledVector(mid, 2 * (1 - e) * e).addScaledVector(to, e * e);
    d.holder.position.y += reduce || s > 0 ? 0 : Math.sin(t * 1.3 + d.k) * .02;
    d.holder.rotation.set(0, lerp(0, Math.PI / 2, e), 0);
    d.holder.scale.setScalar(Math.max(.001, springy(ramp(v, 0, .2))) * lerp(BOOK_S, SHELVED_S, e));
    d.holder.updateMatrixWorld(true);
    d.report.getWorldPosition(from);
    d.sig.tabs.forEach((tab, i) => {
      const c = ramp(v, .14 + i * .13, .34 + i * .13), st = d.steps[i];
      st.visible = c > 0 && c < 1;
      d.book.localToWorld(to.copy(d.sig.tips[i]));
      mid.copy(from).lerp(to, .5).add(tmp.set((i - 2) * .12, .5, .3));
      st.position.copy(from).multiplyScalar((1 - c) * (1 - c)).addScaledVector(mid, 2 * (1 - c) * c).addScaledVector(to, c * c);
      st.rotation.set(c * 4, c * 2, 0); st.scale.setScalar(lerp(1, .5, c));
      const k = ramp(c, .85, 1); tab.scale.set(Math.max(.001, k), 1, 1); tab.visible = k > .002;
    });
    const reveal = ramp(v, .84, 1) * (STAGE_COLORS.length + .4);
    d.sig.nodes.forEach((n, i) => { const k = clamp(reveal - i); n.scale.setScalar(Math.max(.001, k)); n.visible = k > .01; });
    d.sig.links.forEach((l, i) => { const k = clamp(reveal - i - .6); l.scale.set(1, Math.max(.001, k * l.userData.len), 1); l.visible = k > .01; });
  }

  // camera: the centre desk, the sealed reference behind it, all three desks, the books
  // above them, then the shelves. [progress, target x, y, z, half-width, half-height, elevation]
  const SHOTS = [
    [0, 0, 1.12, 1, 1.25, .5, .36], [.25, 0, 1.12, 1, 1.25, .5, .36],
    [.32, 0, 1.25, -.25, 1.6, .72, .3], [.47, 0, 1.25, -.25, 1.6, .72, .3],
    [.54, 0, 1, .8, 3.9, .92, .26], [.69, 0, 1, .8, 3.9, .92, .26],
    [.76, 0, 1.45, .5, 3.95, 1, .24], [.91, 0, 1.45, .5, 3.95, 1, .24],
    [.98, 0, 1.45, -1.4, 4.4, 1.3, .2], [1, 0, 1.45, -1.4, 4.4, 1.3, .2],
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
    const dist = fitBox(hw, hh, cam.fov, frame, .95);
    const az = (reduce ? 0 : pointer.x * .12) + .05;
    cam.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(target);
    cam.updateMatrixWorld();
  }

  function label(point, opacity, rect) {
    const s = toView(point, camera, rect), clear = s.y > (safe()?.top ?? 0) + 34;
    return { ...s, opacity, visible: opacity > .05 && clear && s.front && s.inside, active: true };
  }

  function update(dt, t, p, rect) {
    pointer.x += (pointer.tx - pointer.x) * .05;
    // 1 · end to end: the centre desk's run; 3 · the same task: the other two desks
    desks.forEach(d => work(d, d.k === 1 ? ramp(p, .03, .24) : ramp(p, .5, .68), t));
    // 2 · the reference stays locked; it is opened only for scoring, after the runs
    const scoring = ramp(p, .86, .9);
    lid.rotation.x = -scoring * 1.15;
    shackle.position.y = .12 + scoring * .1;
    refGlow.material.opacity = .2 + ramp(p, .3, .36) * (1 - ramp(p, .48, .52)) * .25 + scoring * .5 + (reduce ? 0 : Math.sin(t * 2) * .04);
    // 4 · full trajectories: each run is bound into a Metacase, checked, and shelved
    desks.forEach(d => {
      const v = ramp(p, .72 + d.k * .015, .86 + d.k * .015), s = ramp(p, .93 + d.k * .012, .985 + d.k * .005);
      bind(d, v, s, t);
      const check = ramp(p, .885, .9) * (1 - ramp(p, .93, .95));
      d.passed.material.opacity = .55 * check;
      d.passed.position.copy(d.holder.position).add(tmp.set(0, BOOK.PD * BOOK_S * .5, .1));
      const beam = beams[d.k], k = ramp(p, .87, .885) * (1 - ramp(p, .91, .93));
      beam.visible = k > .01;
      if (beam.visible) {
        vitrine.localToWorld(from.set(0, 1.2, 0)); to.copy(d.holder.position).add(tmp.set(0, BOOK.PD * BOOK_S * .5, 0));
        beam.position.copy(from).lerp(to, .5); beam.quaternion.setFromUnitVectors(up, tmp.copy(to).sub(from).normalize());
        beam.scale.set(1, from.distanceTo(to) * k, 1); beam.material.opacity = .8 * k;
      }
      d.agent.update(t, 0);
      d.lamp.material.opacity = .12 + (d.k === 1 ? .08 : ramp(p, .5, .56) * .08);
    });

    shelfGlow.material.opacity = .5 * ramp(p, .96, 1); // the new Metacases join the shelves
    aimCamera(camera, rect, p);
    const centre = desks[1];
    onProject([
      label(tmp.copy(centre.report.position).add(centre.g.position).add(lift.set(0, .42, 0)), ramp(p, .19, .23) * (1 - ramp(p, .27, .3)), rect),
      label(vitrine.localToWorld(tmp.set(0, 1.95, 0)), ramp(p, .33, .37) * (1 - ramp(p, .47, .5)), rect),
      label(tmp.set(0, DESK_Y + 1.15, DESK_Z), ramp(p, .58, .62) * (1 - ramp(p, .69, .72)), rect),
      label(tmp.copy(centre.holder.position).add(lift.set(0, BOOK.PD * BOOK_S + .14, 0)), ramp(p, .84, .87) * (1 - ramp(p, .92, .94)), rect),
    ]);
  }
  function setTheme() { const bg = pageBackground(); scene.background = bg; scene.fog = new THREE.Fog(bg, 18, 44); }
  setTheme();
  return { scene, camera, update, setTheme };
}
