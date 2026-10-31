/* metacase-archive.js — Why it matters: retrieval by structure, in the library. The
 * Metacase closed at the end of chapter 01 stands on the reading table as the query and
 * pulls up its catalogue slip: its signature, drawn as a line through the five stages.
 * Searching by topic brings more finance (credit) volumes to the table; the query's line,
 * laid over each of their slips, shows the stages where their paths split, so they go
 * back. Searching by signature brings volumes from the other fields whose slips trace the
 * same line stage for stage; they stay beside the case, and an agent and a person step up
 * to read them. Rendered by the shared stage. */
import * as THREE from './assets/vendor/three/three.module.js';
import { PALETTE, BOOK, SIGNATURES, STAGE_COLORS, closedBook, bookTabs, mat, add, ball, block, rbox, volume, robot, person, lights } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitSafe, fitBox, toView, glowSprite } from './mc-stage.js';

// Same order as the tags in the page.
export const COLUMNS = [
  { key: 'economics', accent: PALETTE.teal }, { key: 'finance', accent: PALETTE.amber }, { key: 'social', accent: PALETTE.violet },
];
const QUERY = 1, R = 8, STEP = .31, BAY_W = 2.3, CASE_H = 2.6, SHELF_Y = [.22, 1.0, 1.78];
const S = 1.4;                                  // volumes on the table are shown larger
const TABLE = new THREE.Vector3(0, .8, 3.1);  // top centre of the reading table
const FACT_SLOTS = [-1.38, -.46, .46, 1.38], MATCH_SLOTS = [-1.84, -.92, 0, .92, 1.84];
const FORE = -Math.PI / 2;                    // turned so the fore-edge (and its tabs) faces +x
const QS = .62 * S / BOOK.PD;                 // the Metacase book, as tall as the volumes beside it
const VOL_H = .62;                            // height of a volume (and of the query) before scaling

function shade(hex, k) { return new THREE.Color(hex).lerp(new THREE.Color(k > 0 ? 0xffffff : 0x1a1d26), Math.abs(k)).getHex(); }
const hex = n => '#' + n.toString(16).padStart(6, '0');
const springy = x => { const q = clamp(x) - 1; return 1 + 2.6 * q * q * q + 1.6 * q * q; }; // eases past 1 and settles
// The signature drawn through a volume's tab tips, in the volume's own space.
function signatureLine(vol, color) {
  const g = new THREE.Group(), tips = vol.userData.tips, m = mat(color, { emissive: color, intensity: .85 });
  tips.forEach(p => ball(g, .02, m, p.x, p.y, p.z - .02, 10));
  tips.slice(1).forEach((p, i) => {
    const a = tips[i], len = a.distanceTo(p), c = add(g, new THREE.CylinderGeometry(.009, .009, len, 6), m, 0, 0, 0, false);
    c.position.copy(a).lerp(p, .5).setZ(c.position.z - .02); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(a).normalize());
  });
  vol.add(g); return g;
}

/* ---- catalogue slips: a volume's signature as a line through the five stages ---- */
const SLIP_W = .88, SLIP_H = .5, SLIP_GEO = new THREE.PlaneGeometry(SLIP_W, SLIP_H);
// own: the volume's signature, in its field's colour. against: the query's, laid over it as
// a dashed line; where the two differ the gap at that stage is marked, where they agree
// every stage is ringed.
function slipTexture(own, color, against = null) {
  const W = 512, H = 282, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), mine = SIGNATURES[own], n = mine.length;
  const X = i => 58 + i * (W - 116) / (n - 1), Y = v => H / 2 + 12 - v * (H / 2 - 52);
  const path = sig => { g.beginPath(); SIGNATURES[sig].forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke(); };
  g.fillStyle = '#fbfaf6'; g.beginPath(); g.roundRect(3, 3, W - 6, H - 6, 22); g.fill();
  g.strokeStyle = '#d9d4c7'; g.lineWidth = 5; g.stroke();
  g.lineCap = g.lineJoin = 'round';
  for (let i = 0; i < n; i++) { // the five stages, keyed by their colours as on the book's tabs
    g.strokeStyle = '#ece6d8'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(i), 44); g.lineTo(X(i), H - 24); g.stroke();
    g.fillStyle = hex(STAGE_COLORS[i]); g.beginPath(); g.roundRect(X(i) - 14, 20, 28, 10, 5); g.fill();
  }
  const theirs = against === null ? null : SIGNATURES[against];
  const same = !!theirs && mine.every((v, i) => Math.abs(v - theirs[i]) < .05);
  if (theirs && !same) {
    g.strokeStyle = 'rgba(226, 102, 122, .6)'; g.lineWidth = 18;
    mine.forEach((v, i) => { if (Math.abs(v - theirs[i]) > .1) { g.beginPath(); g.moveTo(X(i), Y(theirs[i])); g.lineTo(X(i), Y(v)); g.stroke(); } });
  }
  g.strokeStyle = hex(color); g.lineWidth = 16; path(own);
  mine.forEach((v, i) => {
    g.fillStyle = hex(STAGE_COLORS[i]); g.beginPath(); g.arc(X(i), Y(v), 16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fbfaf6'; g.lineWidth = 5; g.stroke();
  });
  if (theirs) {
    g.setLineDash([18, 12]); g.strokeStyle = hex(BOOK.COVER); g.lineWidth = 8; path(against); g.setLineDash([]);
    g.strokeStyle = same ? '#3f9d6a' : hex(BOOK.COVER);
    theirs.forEach((v, i) => { g.lineWidth = same ? 6 : 5; g.beginPath(); g.arc(X(i), Y(v), same ? 26 : 11, 0, Math.PI * 2); g.stroke(); });
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function slipFace(tex, z = 0) {
  const m = new THREE.Mesh(SLIP_GEO, new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: .3, roughness: .85, transparent: true }));
  m.position.z = z; return m;
}
// A slip that stands up out of a book: its own line, and (against) a face with the query's
// line laid over it, faded in when the two are compared, with a soft pulse as it lands.
function slip(scene, own, color, against = null) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  add(g, rbox(SLIP_W + .04, SLIP_H + .04, .016, .014), mat(0xe2d9c6), 0, 0, -.012, false);
  g.add(slipFace(slipTexture(own, color)));
  const compared = against === null ? null : slipFace(slipTexture(own, color, against), .002);
  if (compared) { compared.material.opacity = 0; g.add(compared); }
  g.userData.compared = compared;
  if (compared) { const pulse = glowSprite(against === own ? 0x3f9d6a : PALETTE.rose, SLIP_W * 2.4, 0); pulse.position.z = -.06; g.add(pulse); g.userData.pulse = pulse; }
  return g;
}

export function createArchive({ onProject = () => {}, safe = () => null, held = () => false, reduce = false } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 200);
  const light = lights(scene, { span: 12, shadowSize: 1024 });
  light.key.position.set(-5, 14, 12);

  /* ---- the reading room floor ---- */
  add(scene, new THREE.CylinderGeometry(6.4, 6.6, .4, 72), mat(0x6e5440), 0, -.2, 1).castShadow = false;
  for (let k = 0; k < 3; k++) add(scene, new THREE.TorusGeometry(2.6 + k * 1.6, .015, 4, 96), mat(0x5a4434), 0, .005, 1, false).rotation.x = Math.PI / 2;
  add(scene, new THREE.CylinderGeometry(2.8, 2.8, .03, 64), mat(0x3a4a7a), 0, .015, 3.4, false);

  /* ---- bays of bookcases on an arc, one per field ---- */
  const bays = COLUMNS.map((col, c) => {
    const a = (c - (COLUMNS.length - 1) / 2) * STEP, bay = new THREE.Group();
    bay.position.set(Math.sin(a) * R, 0, R - 2.6 - Math.cos(a) * R); bay.rotation.y = -a; scene.add(bay);
    block(bay, BAY_W, CASE_H, .1, PALETTE.ink, 0, 0, -.28, .02);
    [-1, 1].forEach(s => block(bay, .08, CASE_H, .62, 0x7a5a42, s * (BAY_W / 2 - .04), 0, 0, .02));
    block(bay, BAY_W + .1, .14, .7, mat(col.accent, { emissive: col.accent, intensity: .2 }), 0, CASE_H, 0, .03);
    SHELF_Y.forEach(y => block(bay, BAY_W - .1, .05, .56, 0x8a6a4a, 0, y - .05, 0, .01).castShadow = false);
    // spines: a full bay, with gaps left where candidate volumes stand
    const holes = c === QUERY ? [[1, 2], [1, 6], [1, 10]] : [[1, 3], [1, 9]], gaps = {};
    SHELF_Y.forEach((y, row) => {
      let x = -BAY_W / 2 + .1, k = 0;
      while (x < BAY_W / 2 - .22) {
        const w = [.1, .12, .14, .11][(k + row + c) % 4], h = [.5, .6, .56, .46, .64][(k * 3 + c + row) % 5];
        const hole = holes.some(([r, i]) => r === row && i === k);
        if (hole) gaps[k] = x + .085;
        else block(bay, w, h, .4, mat(shade(col.accent, [-.3, 0, .28, -.12, .14][(k + c * 2 + row) % 5])), x + w / 2, y, .04, .012).castShadow = false;
        x += (hole ? .17 : w) + .006; k++;
      }
    });
    return { col, bay, a, gaps };
  });

  /* ---- the reading table, with the finance case waiting on it ---- */
  const table = new THREE.Group(); table.position.set(TABLE.x, 0, TABLE.z); scene.add(table);
  block(table, 5.6, .1, 1.1, 0x7a5a42, 0, TABLE.y - .1, 0, .04);
  [[-2.6, -.4], [2.6, -.4], [-2.6, .4], [2.6, .4]].forEach(([x, z]) => block(table, .09, TABLE.y - .1, .09, 0x5a4434, x, 0, z, .02));
  block(table, 5.2, .012, .62, mat(0x2f4a3e), 0, TABLE.y, 0, .004).castShadow = false;
  [-1, 1].forEach(sx => { const end = new THREE.Group(); end.position.set(sx * 2.78, TABLE.y, 0); table.add(end); block(end, .05, .5, .4, mat(0xc9a36e, { rough: .4 }), 0, 0, 0, .02); block(end, .2, .03, .4, mat(0xc9a36e, { rough: .4 }), -sx * .08, 0, 0, .01); });
  const tableGlow = glowSprite(0xffe2b0, 6, .1); tableGlow.position.set(0, TABLE.y + .2, 0); table.add(tableGlow);

  // the query: chapter 01's Metacase, standing with its cover to the room and its
  // signature on the fore-edge (+x), like the volumes that will join it
  const query = new THREE.Group(); query.scale.setScalar(QS); scene.add(query);
  const queryBook = closedBook(); bookTabs(queryBook, 0);
  queryBook.rotation.x = Math.PI / 2; queryBook.position.set(-BOOK.PW / 2, BOOK.PD / 2, -(BOOK.T + BOOK.BOARD * 2) / 2);
  query.add(queryBook);
  const querySlot = p => TABLE.x + lerp(FACT_SLOTS[0], MATCH_SLOTS[0], ramp(p, .38, .44));
  query.position.set(querySlot(0), TABLE.y, TABLE.z);
  const queryHalo = glowSprite(PALETTE.amber, 2.6, .25); scene.add(queryHalo);
  const querySlip = slip(scene, 0, BOOK.COVER);

  // candidates: finance volumes on the same topic (other shapes), and two volumes from
  // every other field whose tabs trace the same shape
  const candidates = [];
  bays.forEach(({ col, bay, gaps }, c) => {
    const slots = c === QUERY ? [2, 6, 10] : [3, 9];
    slots.forEach((k, j) => {
      const sig = c === QUERY ? 1 + j : 0;
      const vol = volume({ color: shade(col.accent, -.05), sig }); bay.add(vol);
      const home = new THREE.Vector3(gaps[k], SHELF_Y[1], .04); vol.position.copy(home);
      const line = signatureLine(vol, 0xfff1d0); line.visible = false;
      candidates.push({ vol, bay, c, j, home, line, same: c === QUERY, slip: slip(scene, sig, col.accent, 0) });
    });
  });
  const topical = candidates.filter(k => k.same), structural = candidates.filter(k => !k.same);

  // the readers who come to the table at the end
  const agent = robot(0xf7f5f0); agent.root.scale.setScalar(.95); scene.add(agent.root);
  const reader = person(5); reader.root.scale.setScalar(.95); scene.add(reader.root);

  const target = new THREE.Vector3(), tmp = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), mid = new THREE.Vector3();
  const pointer = { x: 0, tx: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; }, { passive: true });

  // Carry a candidate from its shelf (k = 0) to a slot on the table (k = 1), turning it
  // to show its fore-edge on the way.
  function carry(cand, k, slotX) {
    const out = ramp(k, 0, .25), fly = ramp(k, .2, 1);
    if (k <= 0) {
      if (cand.vol.parent !== cand.bay) { cand.bay.attach(cand.vol); }
      cand.vol.position.copy(cand.home); cand.vol.rotation.set(0, 0, 0); cand.vol.scale.setScalar(1); cand.line.visible = false;
      return;
    }
    cand.bay.updateMatrixWorld();
    from.copy(cand.home).setZ(cand.home.z + out * .55); cand.bay.localToWorld(from);
    to.set(TABLE.x + slotX, TABLE.y, TABLE.z);
    mid.copy(from).lerp(to, .5).setY(Math.max(from.y, to.y) + 1.6);
    if (cand.vol.parent !== scene) scene.attach(cand.vol);
    const e = fly;
    cand.vol.position.copy(from).multiplyScalar((1 - e) * (1 - e)).addScaledVector(mid, 2 * (1 - e) * e).addScaledVector(to, e * e);
    cand.vol.rotation.set(0, lerp(cand.bay.rotation.y, FORE, smooth(e)), 0);
    cand.vol.scale.setScalar(lerp(1, S, smooth(e)));
    cand.line.visible = e > .85;
  }
  // Stand a slip up out of the top of a book (base at pos, height h), shown 0–1.
  function raise(s, pos, h, shown, t, i) {
    s.visible = shown > .01;
    if (!s.visible) return;
    const k = Math.max(.001, springy(shown));
    s.position.set(pos.x, pos.y + h + .05 + SLIP_H / 2 * k + (reduce ? 0 : Math.sin(t * 1.3 + i) * .012 * shown), pos.z + .02);
    s.rotation.set(-.12, 0, 0);
    s.scale.setScalar(k);
  }

  // Lay the query's line over a slip (c = 0–1).
  function compare(s, c) {
    s.userData.compared.material.opacity = c;
    s.userData.pulse.material.opacity = .5 * Math.sin(Math.PI * c);
  }

  // The chapter's three movements as functions of progress: the topic search (in, compared,
  // back), the signature search (in, compared), and the readers.
  function phases(p) {
    const facts = ramp(p, .03, .12) * (1 - ramp(p, .33, .4)), rise = ramp(p, .42, .58), reuse = ramp(p, .76, .9);
    return { facts, rise, reuse, near: smooth(Math.max(facts, rise, p > .4 ? 1 : 0)) };
  }
  // camera: the shelves, then the table and its slips, then the table with its readers
  function aimCamera(cam, rect, { rise, reuse, near }) {
    const aspect = rect.width / rect.height;
    const sf = safe(), room = sf ? { top: sf.top + 52 * near, bottom: sf.bottom } : null; // room for the labels above the slips
    const frame = fitSafe(cam, rect, room, { fov: aspect < 1 ? 42 : 32 });
    target.set(0, lerp(1.4, lerp(1.5, 1.2, reuse), near), lerp(-.6, TABLE.z, near));
    const dist = fitBox(lerp(4.2, lerp(2.2, 2.45, rise) + reuse * .8, near), lerp(1.7, lerp(.8, 1.12, reuse), near), cam.fov, frame, .96);
    const az = (reduce ? 0 : pointer.x * .14) + lerp(.06, -.06, rise), el = lerp(.16, .2, near) + reuse * .06;
    cam.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(target);
    cam.updateMatrixWorld();
  }
  // Where the query book stands, and how this chapter's camera sees it, at progress p:
  // the couriers land chapter 01's book here (p = 0) and take it on to chapter 03 (p = 1).
  const viewCamera = new THREE.PerspectiveCamera(34, 1, .1, 200), viewMatrix = new THREE.Matrix4(), slotMatrix = new THREE.Matrix4();
  function queryView(rect, p) {
    aimCamera(viewCamera, rect, phases(p));
    queryBook.updateMatrix();
    slotMatrix.compose(tmp.set(querySlot(p), TABLE.y, TABLE.z), query.quaternion, query.scale);
    viewMatrix.multiplyMatrices(slotMatrix, queryBook.matrix);
    return { camera: viewCamera, matrix: viewMatrix, key: light.key.position };
  }

  const anchor = new THREE.Vector3(), lift = new THREE.Vector3();
  // Where a label sits: just above the top of one slip, or above the middle of two.
  function labelAt(slips, opacity, rect) {
    anchor.set(0, 0, 0); slips.forEach(s => anchor.add(s.position)); anchor.divideScalar(slips.length);
    anchor.add(lift.set(0, SLIP_H / 2 * slips[0].scale.y + .08, 0));
    const s = toView(anchor, camera, rect), clear = s.y > (safe()?.top ?? 0) + 34;
    return { ...s, opacity, visible: opacity > .05 && slips.every(k => k.visible) && clear && s.front && s.inside, active: true };
  }

  function update(dt, t, p, rect) {
    pointer.x += (pointer.tx - pointer.x) * .05;
    const ph = phases(p), { facts, rise, reuse, near } = ph;
    // the query pulls up its slip: its signature, the key for the search
    const qShown = held() ? 0 : ramp(p, .03, .09);
    query.position.x = querySlot(p);
    query.visible = queryHalo.visible = !held();
    raise(querySlip, query.position, VOL_H * S, qShown, t, 0);
    // 1 · same topic: three finance volumes come down; laid over their slips, the query's
    // line shows where their paths split; they go back
    topical.forEach((cand, j) => {
      const k = clamp(facts * 1.2 - j * .07);
      carry(cand, k, FACT_SLOTS[1 + j]);
      raise(cand.slip, cand.vol.position, VOL_H * cand.vol.scale.y, ramp(k, .86, 1), t, j + 1);
      compare(cand.slip, ramp(p, .12 + j * .025, .18 + j * .025));
    });
    // 2 · same signature: two volumes from every other field join the case; their slips
    // trace its line stage for stage
    structural.forEach((cand, k) => {
      const a = clamp(rise * 1.35 - k * .09);
      carry(cand, a, MATCH_SLOTS[1 + k]);
      raise(cand.slip, cand.vol.position, VOL_H * cand.vol.scale.y, ramp(a, .86, 1), t, k + 4);
      compare(cand.slip, ramp(p, .59 + k * .015, .65 + k * .015));
    });
    const aligned = ramp(p, .64, .72);
    queryHalo.position.copy(query.position).add(tmp.set(0, VOL_H * S * .5, 0));
    queryHalo.material.opacity = .22 + facts * .15 + aligned * .25 + (reduce ? 0 : Math.sin(t * 2) * .04);
    tableGlow.material.opacity = .1 + aligned * .25;
    // 3 · for AI and people: an agent and a person come to read the aligned volumes
    agent.root.visible = reader.root.visible = reuse > .02;
    agent.root.position.set(lerp(-6.5, -3.35, reuse), 0, TABLE.z - .2); agent.root.rotation.y = lerp(Math.PI / 2, .5, reuse);
    reader.root.position.set(lerp(6.5, 3.35, reuse), 0, TABLE.z - .2); reader.root.rotation.y = lerp(-Math.PI / 2, -.5, reuse);
    agent.update(t, reuse > 0 && reuse < 1 ? 1 : 0); reader.update(t, reuse > 0 && reuse < 1 ? 1 : 0);

    aimCamera(camera, rect, ph);
    [querySlip, ...candidates.map(c => c.slip)].forEach(s => s.updateMatrixWorld());

    onProject(bays.map(({ bay }, c) => {
      bay.updateMatrixWorld();
      const s = toView(bay.localToWorld(tmp.set(0, CASE_H + .5, 0)), camera, rect);
      const o = (1 - smooth(near * 2.5)) * (c === QUERY ? 1 : .85);
      const clear = s.y > (safe()?.top ?? 0) + 6;
      return { ...s, opacity: o, visible: clear && s.front && s.inside && o > .05, active: (c === QUERY && facts > .3) || (c !== QUERY && rise > .1 && rise < .9) };
    }), { facts, rise, reuse, labels: [
      labelAt([querySlip], qShown * (1 - ramp(p, .38, .42)), rect), // until the other fields' labels take over
      labelAt([topical[1].slip], ramp(p, .15, .21) * (1 - ramp(p, .32, .35)), rect),
      labelAt([structural[0].slip, structural[1].slip], ramp(p, .6, .66) * (1 - ramp(p, .76, .8)), rect),
      labelAt([structural[2].slip, structural[3].slip], ramp(p, .62, .68) * (1 - ramp(p, .76, .8)), rect),
    ] });
  }
  function setTheme() { const bg = pageBackground(); scene.background = bg; scene.fog = new THREE.Fog(bg, 18, 44); }
  setTheme();
  return { scene, camera, update, setTheme, queryView };
}
