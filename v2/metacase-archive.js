/* metacase-archive.js — Why it matters: retrieval by structure. A finance case asks
 * the archive for help. Same-topic tiles slide out but their signatures do not fit;
 * tiles from other fields with the same signature fly out and lock in line behind it;
 * then an agent and a person step up to reuse the aligned structure. Shared stage. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { PALETTE, mat, add, block, tile, robot, person, buildings, lights, signaturePoints } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitCamera, toView, glowSprite } from './mc-stage.js';

export const COLUMNS = [
  { key: 'economics', accent: PALETTE.teal }, { key: 'finance', accent: PALETTE.amber }, { key: 'social', accent: PALETTE.violet },
];
const QUERY = 1, ROWS = 5, SIZE = .82, Q_SIZE = 1.35;
const FACE = new THREE.Euler(Math.PI / 2, 0, 0); // tile top (the signature) faces the viewer

export function createArchive({ onProject = () => {}, reduce = false } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 200);
  const light = lights(scene, { span: 14, shadowSize: 1024 });
  light.key.position.set(-6, 14, 16);

  const floor = add(scene, new THREE.CylinderGeometry(16, 16, .4, 64), mat(0x121521), 0, -.6, 0); floor.castShadow = false;
  const pool = glowSprite(0x9fb6ff, 30, .14); pool.position.set(0, 3, -2); scene.add(pool);

  /* ---- the archive wall: economics, finance and social science, five cases each ---- */
  const wall = new THREE.Group(); scene.add(wall);
  const cells = [];
  COLUMNS.forEach((col, c) => {
    const ang = (c - (COLUMNS.length - 1) / 2) * .24, x = Math.sin(ang) * 11, z = -11 + Math.cos(ang) * 11 - 3;
    const colG = new THREE.Group(); colG.position.set(x, 0, z); colG.rotation.y = -ang; wall.add(colG);
    block(colG, 1.7, 6.6, .3, PALETTE.stone, 0, -.4, -.45, .06);
    block(colG, 1.76, .1, .34, col.accent, 0, 6.2, -.45, .03);
    const mini = buildings[col.key](col.accent); mini.scale.setScalar(.36); mini.position.set(0, 6.3, -.45); colG.add(mini);
    for (let r = 0; r < ROWS; r++) {
      const y = .45 + r * 1.18, match = c !== QUERY && (r === (c * 2 + 1) % ROWS || r === (c * 2 + 3) % ROWS);
      block(colG, 1.6, .06, .5, 0xffffff, 0, y - .62, -.15, .02);
      const t = tile({ sig: match ? 0 : 1 + (c + r * 2) % 4, edge: col.accent, size: SIZE, glow: .7 });
      t.position.set(0, y, 0); t.rotation.copy(FACE); colG.add(t);
      const cell = { t, colG, c, r, match, same: c === QUERY, home: t.position.clone() };
      if (cell.same) { // a mismatch stamp
        const stamp = new THREE.Group(); stamp.position.set(.55, y + .25, .3); colG.add(stamp);
        [1, -1].forEach(s => { const bar = block(stamp, .42, .08, .06, mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: .8 }), 0, -.04, 0, .02); bar.rotation.z = s * .785; });
        stamp.scale.setScalar(.001); cell.stamp = stamp;
      }
      cells.push(cell);
    }
  });
  const matches = cells.filter(c => c.match);

  /* ---- the query: a finance case, waiting for experience ---- */
  const query = tile({ sig: 0, edge: PALETTE.amber, size: Q_SIZE, glow: 1.4 });
  const QPOS = new THREE.Vector3(0, 3, 4.2);
  query.position.copy(QPOS); query.rotation.copy(FACE); scene.add(query);
  const qGlow = glowSprite(PALETTE.amber, 5, .25); qGlow.position.copy(QPOS); scene.add(qGlow);
  // rods through equal steps of the aligned signatures: same shape, different fields
  const qPts = signaturePoints(0, 1.6 * Q_SIZE * .78, 1.1 * Q_SIZE * .62);
  const rods = qPts.map(pt => {
    const len = (matches.length + .4) * .5, m = add(scene, new THREE.CylinderGeometry(.02, .02, len, 6), mat(0xffffff, { emissive: 0xffffff, intensity: 1.2 }), QPOS.x + pt.x, QPOS.y - pt.z, QPOS.z + .26 * Q_SIZE - len / 2, false);
    m.rotation.x = Math.PI / 2; m.scale.setScalar(.001);
    return m;
  });
  // a small stage under the aligned stack, where people and agents reuse it
  const dais = add(scene, new THREE.CylinderGeometry(2.6, 2.8, .25, 48), mat(0xe9ebef), 0, .9, 3.2); dais.scale.setScalar(.001);
  const agent = robot(0xf7f5f0); agent.root.scale.setScalar(1.2); scene.add(agent.root);
  const reader = person(5, { carry: PALETTE.amber }); reader.root.scale.setScalar(1.2); scene.add(reader.root);

  const target = new THREE.Vector3(), pointer = { x: 0, y: 0, tx: 0, ty: 0 }, tmp = new THREE.Vector3();
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; pointer.ty = e.clientY / innerHeight - .5; }, { passive: true });

  function update(dt, t, p, rect) {
    const narrow = rect.width / rect.height < 1;
    pointer.x += (pointer.tx - pointer.x) * .05; pointer.y += (pointer.ty - pointer.y) * .05;
    const facts = ramp(p, .04, .14) * (1 - ramp(p, .3, .36));
    const rise = ramp(p, .38, .66), reuse = ramp(p, .72, .86);
    query.position.y = QPOS.y + Math.sin(t * 1.4) * .06; qGlow.position.copy(query.position);
    qGlow.material.opacity = .25 + facts * .2 + rise * .3;
    cells.forEach(cell => {
      if (cell.same) { // same topic: slides out, gets stamped, goes back
        cell.t.position.copy(cell.home).add(new THREE.Vector3(0, 0, facts * 1.1));
        cell.t.userData.mark.material = cell.t.userData.mark.material; // keep the shared look
        cell.stamp.scale.setScalar(Math.max(.001, smooth((facts - .4) * 2.2) * (1 + Math.sin(t * 6) * .04)));
        cell.stamp.position.z = .3 + facts * 1.1;
      }
    });
    // same structure, other fields: fly out and lock in line behind the query
    matches.forEach((cell, k) => {
      const kk = clamp(rise * 1.3 - k * .08);
      const e = smooth(kk);
      cell.colG.updateMatrixWorld();
      const from = cell.colG.localToWorld(cell.home.clone());
      const to = QPOS.clone().add(new THREE.Vector3(0, 0, -.5 * (k + 1)));
      const mid = from.clone().lerp(to, .5).add(new THREE.Vector3(0, 2.5, 1.5));
      const pos = from.clone().multiplyScalar((1 - e) * (1 - e)).add(mid.multiplyScalar(2 * (1 - e) * e)).add(to.clone().multiplyScalar(e * e));
      if (kk > 0) {
        if (cell.t.parent !== scene) { scene.attach(cell.t); }
        cell.t.position.copy(pos); cell.t.position.y += e > .99 ? Math.sin(t * 1.4) * .06 : 0;
        cell.t.rotation.set(Math.PI / 2, (1 - e) * cell.colG.rotation.y + (1 - e) * Math.PI * 2 * (k % 2 ? 1 : -1), 0);
        cell.t.scale.setScalar(lerp(1, Q_SIZE / SIZE, e));
      } else if (cell.t.parent !== cell.colG) {
        cell.colG.attach(cell.t); cell.t.position.copy(cell.home); cell.t.rotation.copy(FACE); cell.t.scale.setScalar(1);
      }
    });
    const locked = ramp(p, .62, .68);
    rods.forEach((r, i) => { r.scale.set(1, Math.max(.001, smooth(locked * 1.4 - i * .06)), 1); r.position.y = query.position.y - qPts[i].z; });
    dais.scale.setScalar(Math.max(.001, reuse));
    agent.root.visible = reader.root.visible = reuse > .02;
    agent.root.position.set(lerp(-6, -1.7, reuse), 1.03, 3.6); agent.root.rotation.y = lerp(Math.PI / 2, .35, reuse);
    reader.root.position.set(lerp(6, 1.7, reuse), 1.03, 3.6); reader.root.rotation.y = lerp(-Math.PI / 2, -.35, reuse);
    agent.update(t, reuse < 1 ? 1 : 0); reader.update(t, reuse < 1 ? 1 : 0);

    // camera: the archive wall, then the aligned stack
    target.set(0, lerp(3.4, 2.6, reuse), lerp(-2, 2, rise));
    const r = lerp(lerp(19.5, 16, rise), 12.5, reuse) * (narrow ? 1.6 : rect.width / rect.height < 1.4 ? 1.15 : 1), az = pointer.x * .25 + lerp(.18, -.12, rise), el = .16 + pointer.y * .06 + reuse * .08;
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * r, target.y + Math.sin(el) * r, target.z + Math.cos(az) * Math.cos(el) * r);
    camera.lookAt(target);
    fitCamera(camera, rect, { shift: narrow ? 0 : .12, lift: (narrow ? .14 : -.07) - reuse * .1, fov: narrow ? 46 : 34 });
    onProject(COLUMNS.map((col, c) => {
      const colG = cells[c * ROWS].colG; colG.updateMatrixWorld();
      const s = toView(colG.localToWorld(tmp.set(0, 7.4, -.45)), camera, rect);
      const o = (1 - reuse) * (c === QUERY ? 1 : .85);
      return { ...s, opacity: o, visible: s.front && s.inside && o > .02, active: (c === QUERY && facts > .3) || (c !== QUERY && rise > .1 && rise < .9) };
    }), { query: toView(tmp.copy(query.position).add(new THREE.Vector3(0, 1.1, 0)), camera, rect), facts, rise, reuse });
  }
  function setTheme() { const bg = pageBackground(); scene.background = bg; scene.fog = new THREE.Fog(bg, 26, 60); }
  setTheme();
  return { scene, camera, update, setTheme };
}
