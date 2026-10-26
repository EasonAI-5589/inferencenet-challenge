/* metacase-archive.js — Why it matters: retrieval by structure, in the library. A finance
 * case lies on the reading table. Searching by topic pulls more finance volumes off
 * their shelf, but turned to their fore-edge their chapter tabs trace other shapes, so
 * they go back. Searching by structure pulls one volume from each other field whose tabs
 * trace the same shape; they line up beside the case, and an agent and a person step up
 * to read them. Rendered by the shared stage. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { PALETTE, mat, add, block, cyl, ball, volume, robot, person, lights } from './mc-kit.js';
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

function shade(hex, k) { return new THREE.Color(hex).lerp(new THREE.Color(k > 0 ? 0xffffff : 0x1a1d26), Math.abs(k)).getHex(); }
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
function stamp(color) {
  const g = new THREE.Group(), m = mat(color, { emissive: color, intensity: .9 });
  [1, -1].forEach(s => { const bar = block(g, .34, .07, .05, m, 0, -.035, 0, .02); bar.rotation.z = s * .785; });
  return g;
}

export function createArchive({ onProject = () => {}, safe = () => null, reduce = false } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 200);
  const light = lights(scene, { span: 12, shadowSize: 1024 });
  light.key.position.set(-5, 14, 12);
  const random = (() => { let s = 11; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

  /* ---- the reading room floor ---- */
  add(scene, new THREE.CylinderGeometry(6.4, 6.6, .4, 72), mat(0x6e5440), 0, -.2, 1).castShadow = false;
  for (let k = 0; k < 3; k++) add(scene, new THREE.TorusGeometry(2.6 + k * 1.6, .015, 4, 96), mat(0x5a4434), 0, .005, 1, false).rotation.x = Math.PI / 2;
  add(scene, new THREE.CylinderGeometry(2.8, 2.8, .03, 64), mat(0x3a4a7a), 0, .015, 3.4, false);

  /* ---- six bays of bookcases on an arc, one per field ---- */
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

  const query = volume({ color: PALETTE.amber, sig: 0 });
  query.scale.setScalar(S); query.rotation.y = FORE; query.position.set(TABLE.x + FACT_SLOTS[0], TABLE.y, TABLE.z); scene.add(query);
  const queryLine = signatureLine(query, 0xfff1d0);
  const queryHalo = glowSprite(PALETTE.amber, 2.6, .25); scene.add(queryHalo);

  // candidates: finance volumes on the same topic (other shapes), and two volumes from
  // every other field whose tabs trace the same shape
  const candidates = [];
  bays.forEach(({ col, bay, gaps }, c) => {
    const slots = c === QUERY ? [2, 6, 10] : [3, 9];
    slots.forEach((k, j) => {
      const sig = c === QUERY ? 1 + j : 0;
      const vol = volume({ color: shade(col.accent, -.05), sig }); bay.add(vol);
      const home = new THREE.Vector3(gaps[k], SHELF_Y[1], .04); vol.position.copy(home);
      const line = signatureLine(vol, c === QUERY ? PALETTE.rose : 0xfff1d0); line.visible = false;
      const x = stamp(PALETTE.rose); x.visible = false; scene.add(x);
      candidates.push({ vol, bay, c, j, home, line, x, same: c === QUERY });
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

  function update(dt, t, p, rect) {
    const aspect = rect.width / rect.height;
    pointer.x += (pointer.tx - pointer.x) * .05;
    // 1 · same topic: three finance volumes come down, show other shapes, go back
    const facts = ramp(p, .04, .16) * (1 - ramp(p, .3, .37));
    const judged = ramp(p, .17, .24) * (1 - ramp(p, .29, .32));
    topical.forEach((cand, j) => {
      carry(cand, clamp(facts * 1.2 - j * .07), FACT_SLOTS[1 + j]);
      cand.x.visible = judged > .02 && cand.vol.parent === scene;
      if (cand.x.visible) { cand.x.position.copy(cand.vol.position).add(tmp.set(.15, .62 * S + .3, 0)); cand.x.scale.setScalar(Math.max(.001, smooth(judged * 1.6 - j * .15)) * (1 + Math.sin(t * 6) * .04)); }
    });
    // 2 · same structure: one volume from every other field joins the case on the table
    const rise = ramp(p, .38, .66);
    structural.forEach((cand, k) => carry(cand, clamp(rise * 1.35 - k * .09), MATCH_SLOTS[1 + k]));
    const aligned = ramp(p, .62, .7);
    query.position.x = TABLE.x + lerp(FACT_SLOTS[0], MATCH_SLOTS[0], ramp(p, .34, .42));
    queryLine.visible = true;
    queryHalo.position.copy(query.position).add(tmp.set(0, .62 * S * .5, 0));
    queryHalo.material.opacity = .22 + facts * .15 + aligned * .25 + (reduce ? 0 : Math.sin(t * 2) * .04);
    tableGlow.material.opacity = .1 + aligned * .25;
    // 3 · for AI and people: an agent and a person come to read the aligned volumes
    const reuse = ramp(p, .72, .86);
    agent.root.visible = reader.root.visible = reuse > .02;
    agent.root.position.set(lerp(-6.5, -3.35, reuse), 0, TABLE.z - .2); agent.root.rotation.y = lerp(Math.PI / 2, .5, reuse);
    reader.root.position.set(lerp(6.5, 3.35, reuse), 0, TABLE.z - .2); reader.root.rotation.y = lerp(-Math.PI / 2, -.5, reuse);
    agent.update(t, reuse > 0 && reuse < 1 ? 1 : 0); reader.update(t, reuse > 0 && reuse < 1 ? 1 : 0);

    // camera: the shelves, then the table, then the table with its readers
    const frame = fitSafe(camera, rect, safe(), { fov: aspect < 1 ? 42 : 32 });
    const near = smooth(Math.max(facts, rise, reuse > 0 ? 1 : 0));
    target.set(0, lerp(1.4, 1.25 - reuse * .2, near), lerp(-.6, TABLE.z, near));
    const dist = fitBox(lerp(4.2, 2.6 + reuse * .9, near), lerp(1.7, lerp(.75, .95, reuse), near), camera.fov, frame, .96);
    const az = (reduce ? 0 : pointer.x * .14) + lerp(.06, -.06, rise), el = lerp(.16, .2, near) + reuse * .06;
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(target);

    onProject(bays.map(({ bay }, c) => {
      bay.updateMatrixWorld();
      const s = toView(bay.localToWorld(tmp.set(0, CASE_H + .5, 0)), camera, rect);
      const o = (1 - smooth(near * 2.5)) * (c === QUERY ? 1 : .85);
      const clear = s.y > (safe()?.top ?? 0) + 6;
      return { ...s, opacity: o, visible: clear && s.front && s.inside && o > .05, active: (c === QUERY && facts > .3) || (c !== QUERY && rise > .1 && rise < .9) };
    }), { facts, rise, reuse });
  }
  function setTheme() { const bg = pageBackground(); scene.background = bg; scene.fog = new THREE.Fog(bg, 18, 44); }
  setTheme();
  return { scene, camera, update, setTheme };
}
