/* metacase-library.js — the Metacase network, drawn as a library (a visual metaphor
 * only; the page copy speaks of Metacases). Three wings of bookcases hold the first
 * fields (economics, finance, social science), one bay per class: coloured volumes are
 * candidate records, translucent ones the room still to fill. Glowing threads link
 * volumes in different wings that share a structure, and new volumes arrive in the
 * empty places. Used twice: the hero (ambient) and chapter 03 (scroll-driven:
 * own cases → shared structures → reuse → new cases arrive). */
import * as THREE from '../assets/vendor/three/three.module.js';
import { PALETTE, BOOK, closedBook, bookTabs, mat, add, block, cyl, person, robot, tile, lights } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitCamera, toView, glowSprite } from './mc-stage.js';

// Bays per wing: [catalogue class, volumes, bay width in units]. Counts follow
// metacase-harbor v0.1 (metacase/summary.json); econometric replication is shelved as its
// 41 parent papers (100 coefficient tasks). Empty bays are classes still to add.
export const WINGS = [
  { key: 'economics', accent: PALETTE.teal, bays: [['econ.replication', 41, 2], ['econ.monetary', 15, 1], ['econ.markets', 15, 1], ['econ.data', 22, 1], ['econ.statistics', 0, 1]] },
  { key: 'finance', accent: PALETTE.amber, bays: [['fin.filings', 10, 1], ['fin.payments', 15, 1], ['fin.nlp', 20, 1], ['fin.numeric', 15, 1], ['fin.credit', 15, 1], ['fin.accounting', 15, 1]] },
  { key: 'social', accent: PALETTE.violet, bays: [['soc.law', 20, 1], ['soc.hr', 5, 1], ['soc.business', 6, 1], ['soc.society', 12, 1], ['soc.psychology', 0, 1]] },
];
const R = 10, UNIT = 1.1, GAP = .7, CASE_H = 2.6, SHELF_Y = [.22, 1.0, 1.78];
// [wing a, bay a, wing b, bay b] — volumes solved the same way, in different wings
const THREADS = [[0, 0, 1, 5], [1, 2, 2, 0], [0, 3, 2, 3], [1, 0, 0, 1], [2, 1, 1, 4]];
const SHOTS = [ // [progress, target, radius, azimuth, elevation]
  [0, 'table', 5.4, .32, .5], [.1, 'wing0', 9, -.55, .2], [.22, 'wing0', 8.5, -.35, .18],
  [.32, 'centre', 22, 0, .42], [.48, 'centre', 20, .18, .36],
  [.56, 'walker', 7, .5, .26], [.72, 'walker', 7.5, .2, .24],
  [.82, 'room', 22, -.1, .32], [1, 'room', 25, .08, .36],
  [1.5, 'plan', 31, 0, 1.22], // past the chapter, behind the initiative: the three wings from above, as chapter 04 lists them
];

function shade(hex, k) { return new THREE.Color(hex).lerp(new THREE.Color(k > 0 ? 0xffffff : 0x1a1d26), Math.abs(k)).getHex(); }
function dome() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x05070e) }, horizon: { value: new THREE.Color(0x161a2e) } },
    vertexShader: 'varying float vY;void main(){vY=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float vY;uniform vec3 top;uniform vec3 horizon;void main(){gl_FragColor=vec4(mix(horizon,top,smoothstep(-.1,.6,vY)),1.);\n#include <colorspace_fragment>\n}',
  });
  return new THREE.Mesh(new THREE.SphereGeometry(160, 32, 16), m);
}
// A rolling library ladder leaning on a bookcase face.
function ladder(h = 2.6) {
  const g = new THREE.Group(), wood = mat(0x8a6a4a);
  [-.22, .22].forEach(x => { const r = block(g, .06, h, .06, wood, x, 0, 0, .02); r.rotation.x = -.18; });
  for (let y = .35; y < h - .1; y += .42) { const s = block(g, .44, .04, .05, wood, 0, y, -y * .18, .01); s.castShadow = false; }
  return g;
}
function lamp(parent, x, y, z, color = 0xffd9a0) {
  cyl(parent, .03, .05, .5, PALETTE.ink, x, y, z, 8);
  const shadeMesh = cyl(parent, .1, .2, .16, mat(color, { emissive: color, intensity: .9 }), x, y + .5, z, 16);
  const glow = glowSprite(color, 1.6, .5); glow.position.set(x, y + .55, z); parent.add(glow);
  return { shade: shadeMesh, glow };
}

// The Metacase that chapter 01 opens stands here: finance wing, fourth bay, middle shelf.
const FEATURED = { wing: 1, bay: 3, shelf: 1 }, FEATURED_H = .62;
const TABLE_BOOK = .3; // the same book, lying on the reading table in chapter 03
// Where the other materials of a case come from (wing, bay, shelf): chapter 01's courier
// draws a web page, a data sheet, a chart and a recording out of these shelves.
const SOURCES = [[0, 0, 2], [0, 3, 0], [2, 0, 2], [2, 3, 1]];

export function createLibrary({ mode = 'hero', onProject = () => {}, extracted = () => false, held = () => false, reduce = false } = {}) {
  const story = mode === 'story';
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 400);
  const sky = dome(); scene.add(sky);
  const light = lights(scene, { span: 18, shadowSize: 2048 });
  light.key.position.set(-6, 22, 16);
  const random = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

  /* ---- the reading room: a round parquet floor and a rug ---- */
  const floorGeo = new THREE.CylinderGeometry(14, 14, .5, 96, 1);
  floorGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(floorGeo.attributes.position.count * 3), 3));
  const floor = add(scene, floorGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), 0, -.25, -2); floor.castShadow = false;
  const paintFloor = bg => { // warm wood in the middle, the page colour at the rim
    const pos = floorGeo.attributes.position, col = floorGeo.attributes.color, wood = new THREE.Color(0x5e4838), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getZ(i)) / 14; c.copy(wood).lerp(bg, smooth((r - .25) / .75)); col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true;
  };
  for (let k = 0; k < 3; k++) add(scene, new THREE.TorusGeometry(4 + k * 1.7, .015, 4, 96), mat(0x4a392c), 0, .005, -2, false).rotation.x = Math.PI / 2;
  add(scene, new THREE.CylinderGeometry(2.9, 2.9, .04, 64), mat(0x34436e), 0, .02, .4, false);
  add(scene, new THREE.TorusGeometry(2.65, .045, 4, 64), mat(PALETTE.amber), 0, .05, .4, false).rotation.x = Math.PI / 2;
  // dust motes in the lamplight
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => (i % 3 === 1 ? random() * 9 : (random() - .5) * 26)), 3)),
    new THREE.PointsMaterial({ color: 0xffe2b0, size: .05, transparent: true, opacity: .55, depthWrite: false }));
  scene.add(motes);

  let featuredSlot = null;
  const ghosts = [], arrivals = []; // [parent, x, y, z, w, h] for translucent volumes still to come
  function fillGhosts(parent, shelves, bw, startShelf, startX, seed) {
    let shelf = startShelf, x = startX, k = seed;
    while (shelf < shelves.length) {
      const w = [.11, .13, .12, .1][k % 4], h = [.5, .58, .54, .46][(k * 3) % 4];
      if (x + w > bw / 2 - .1) { shelf++; x = -bw / 2 + .1; continue; }
      ghosts.push([parent, x + w / 2, shelves[shelf], .04, w, h]); x += w + .006; k++;
    }
  }

  /* ---- the wings: bays along an arc, facing the reading table ---- */
  const units = WINGS.reduce((s, w) => s + w.bays.reduce((a, b) => a + b[2], 0), 0);
  const span = (units * UNIT + GAP * (WINGS.length - 1)) / R; // radians
  const at = (a, r = R) => new THREE.Vector3(Math.sin(a) * r, 0, -Math.cos(a) * r);
  let cursor = -span / 2;
  const wings = WINGS.map((w, wi) => {
    const group = new THREE.Group(); scene.add(group);
    const start = cursor, bays = [];
    w.bays.forEach(([id, count, width], bi) => {
      const a = cursor + width * UNIT / R / 2, bw = width * UNIT;
      cursor += width * UNIT / R;
      const bay = new THREE.Group(); bay.position.copy(at(a)); bay.rotation.y = -a; group.add(bay);
      block(bay, bw, CASE_H, .1, PALETTE.ink, 0, 0, -.28, .02);
      [-1, 1].forEach(s => block(bay, .08, CASE_H, .62, 0x7a5a42, s * (bw / 2 - .04), 0, 0, .02));
      block(bay, bw + .1, .14, .7, mat(w.accent, { emissive: w.accent, intensity: .18 }), 0, CASE_H, 0, .03); // cornice in the wing's colour
      SHELF_Y.forEach(y => block(bay, bw - .1, .05, .56, 0x8a6a4a, 0, y - .05, 0, .01).castShadow = false);
      // one volume per candidate record, shelved bottom-up, left to right
      const books = [];
      let shelf = 0, x = -bw / 2 + .1;
      for (let k = 0; k < count && shelf < SHELF_Y.length; k++) {
        const bwid = [.1, .12, .13, .11][(k + bi) % 4], bh = [.5, .62, .56, .46, .66][(k * 3 + wi) % 5];
        if (x + bwid > bw / 2 - .1) { shelf++; x = -bw / 2 + .1; if (shelf >= SHELF_Y.length) break; }
        if (!featuredSlot && wi === FEATURED.wing && bi === FEATURED.bay && shelf === FEATURED.shelf) { // leave room for the Metacase
          featuredSlot = { bay, x: x + .06, y: SHELF_Y[shelf] }; x += .14;
        }
        const tone = [-.25, 0, .3, -.1, .15][(k + bi * 2) % 5];
        const b = block(bay, bwid, bh, .38, mat(shade(w.accent, tone)), x + bwid / 2, SHELF_Y[shelf], .04, .012);
        b.castShadow = false;
        if (k % 5 === 3) block(bay, bwid * 1.02, .035, .385, PALETTE.cream, x + bwid / 2, SHELF_Y[shelf] + bh * .72, .04, .005).castShadow = false; // a band on the spine
        books.push(b); x += bwid + .006;
      }
      const first = ghosts.length;
      fillGhosts(bay, SHELF_Y, bw, shelf, x, bi * 3 + wi);
      ghosts.slice(first, first + 2).forEach(([parent, gx, gy, gz, gw, gh]) => { // new cases arriving
        const b = block(parent, gw, gh, .38, mat(shade(w.accent, .35)), gx, gy, gz, .012); b.castShadow = false; arrivals.push({ b, k: arrivals.length });
      });
      if (!count) { // a class still to add: an empty bay with a notice
        const easel = new THREE.Group(); easel.position.set(0, 0, .55); bay.add(easel);
        block(easel, .5, .36, .04, PALETTE.cream, 0, .7, 0, .02);
        block(easel, .34, .04, .05, w.accent, 0, .96, .01, .01);
        [-1, 1].forEach(s => { const leg = block(easel, .04, .9, .04, 0x7a5a42, s * .18, 0, -.08, .01); leg.rotation.x = .12; });
      }
      bays.push({ id, count, bay, books, a });
    });
    const end = cursor; cursor += GAP / R;
    const mid = (start + end) / 2;
    if (wi !== 1) { const l = ladder(); l.position.copy(at(end - .06, R - .62)); l.rotation.y = -(end - .06); group.add(l); }
    return { w, group, bays, mid, start, end, top: at(mid, R - 2.4).setY(.15) };
  });

  /* ---- the Metacase of chapter 01, standing spine-out on its shelf ---- */
  const featured = closedBook(), fs = FEATURED_H / BOOK.PD;
  // pages run into the shelf (-z), the cover faces the next volume (-x), the head is up
  featured.matrixAutoUpdate = true;
  featured.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)));
  featured.scale.setScalar(fs);
  featured.position.set(featuredSlot.x + (BOOK.T + BOOK.BOARD * 2) * fs / 2, featuredSlot.y + BOOK.PD * fs / 2, .23);
  featuredSlot.bay.add(featured);
  const featuredGlow = glowSprite(0xffe2b0, .9, 0); featuredGlow.position.set(featuredSlot.x, featuredSlot.y + .32, .3); featuredSlot.bay.add(featuredGlow);
  const sourcePoints = SOURCES.map(([wi, bi, sh]) => ({ bay: wings[wi].bays[bi].bay, local: new THREE.Vector3(0, SHELF_Y[sh] + .3, .22) }));

  /* ---- a balcony along the whole arc, with a lamp above each wing ---- */
  const gallery = new THREE.Group(); scene.add(gallery);
  const slabs = 30;
  for (let k = 0; k < slabs; k++) {
    const a = -span / 2 - .06 + (span + .12) * (k + .5) / slabs, p = at(a, R - .2);
    const s = block(gallery, (span + .12) * R / slabs + .04, .18, 1.3, 0x6e5440, p.x, CASE_H + .14, p.z, .02); s.rotation.y = -a;
    const rail = block(gallery, (span + .12) * R / slabs + .04, .05, .05, 0xc9a36e, ...at(a, R - .85).setY(CASE_H + .95).toArray(), .01); rail.rotation.y = -a;
    if (k % 2 === 0) cyl(gallery, .025, .025, .6, 0xc9a36e, ...at(a, R - .85).setY(CASE_H + .32).toArray(), 6);
  }
  const balconyLamps = wings.map(w => lamp(gallery, ...at(w.mid, R - .9).setY(CASE_H + .23).toArray(), 0xffd9a0));
  const UP_H = 2.3, UP_Y = CASE_H + .23, UP_SHELVES = [.2, 1.02];
  wings.forEach((wg, wi) => wg.bays.forEach((b, bi) => {
    const width = WINGS[wi].bays[bi][2] * UNIT;
    const up = new THREE.Group(); up.position.copy(at(b.a, R + .15)).setY(UP_Y); up.rotation.y = -b.a; gallery.add(up);
    block(up, width, UP_H, .1, PALETTE.ink, 0, 0, -.28, .02);
    [-1, 1].forEach(sd => block(up, .08, UP_H, .6, 0x7a5a42, sd * (width / 2 - .04), 0, 0, .02));
    UP_SHELVES.forEach(y => block(up, width - .1, .05, .54, 0x8a6a4a, 0, y - .05, 0, .01).castShadow = false);
    // the upper shelves hold more of the field's volumes, in deeper tones
    let shelf = 0, x = -width / 2 + .1, k = 0;
    const filled = Math.round((width - .2) / .118 * 2 * .55);
    for (; k < filled && shelf < UP_SHELVES.length; k++) {
      const w = [.1, .12, .11, .13][(k + bi) % 4], h = [.52, .6, .48, .56][(k * 3 + wi) % 4];
      if (x + w > width / 2 - .1) { shelf++; x = -width / 2 + .1; if (shelf >= UP_SHELVES.length) break; }
      block(up, w, h, .36, mat(shade(WINGS[wi].accent, [-.45, -.3, -.15, -.38][(k + bi) % 4])), x + w / 2, UP_SHELVES[shelf], .04, .012).castShadow = false;
      x += w + .006;
    }
    fillGhosts(up, UP_SHELVES, width, shelf, x, bi + wi * 7);
  }));
  for (let k = 0; k < slabs; k++) { // the crown moulding along the top of the upper storey
    const a = -span / 2 - .06 + (span + .12) * (k + .5) / slabs, p = at(a, R + .15);
    const c = block(gallery, (span + .12) * (R + .15) / slabs + .05, .22, .8, 0x6e5440, p.x, UP_Y + UP_H, p.z, .03); c.rotation.y = -a;
    const band = block(gallery, (span + .12) * (R - .25) / slabs + .05, .05, .04, 0xc9a36e, ...at(a, R - .26).setY(UP_Y + UP_H + .08).toArray(), .01); band.rotation.y = -a;
  }
  // light falling from a high window onto the reading table
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xffdcaa, transparent: true, opacity: .016, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shaft = add(scene, new THREE.CylinderGeometry(.5, 3.2, 18, 40, 1, true), shaftMat, 0, 9, -.4, false); shaft.receiveShadow = false;
  const shaftCore = add(scene, new THREE.CylinderGeometry(.2, 1.8, 18, 32, 1, true), shaftMat.clone(), 0, 9, -.4, false); shaftCore.material.opacity = .011; shaftCore.receiveShadow = false;

  scene.updateMatrixWorld(true);
  const ghostMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, .34), new THREE.MeshStandardMaterial({ color: 0xdfe6ff, transparent: true, opacity: .1, roughness: .6, depthWrite: false }), ghosts.length);
  const m4 = new THREE.Matrix4(), local = new THREE.Matrix4();
  ghosts.forEach(([parent, x, y, z, w, h], i) => { local.compose(new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, 1)); m4.multiplyMatrices(parent.matrixWorld, local); ghostMesh.setMatrixAt(i, m4); });
  ghostMesh.castShadow = false; ghostMesh.receiveShadow = false; scene.add(ghostMesh);

  /* ---- the reading table, where a Metacase lies open ---- */
  const table = new THREE.Group(); table.position.set(0, 0, .4); scene.add(table);
  block(table, 3.2, .12, 1.3, 0x7a5a42, 0, .82, 0, .04);
  [[-1.4, -.5], [1.4, -.5], [-1.4, .5], [1.4, .5]].forEach(([x, z]) => block(table, .1, .82, .1, 0x5a4434, x, 0, z, .02));
  // in the story, the Metacase carried here from chapter 02 lies closed on its signature;
  // in the hero, an open case
  let tableBook = null;
  if (story) {
    tableBook = closedBook(); bookTabs(tableBook, 0); tableBook.scale.setScalar(TABLE_BOOK); tableBook.rotation.y = .12;
    tableBook.position.set(-.3 - BOOK.PW * TABLE_BOOK / 2, .94, 0); table.add(tableBook);
  } else {
    const open = tile({ sig: 0, edge: PALETTE.teal, size: .5, glow: 1.3 }); open.position.set(-.3, .94, 0); open.rotation.y = .15; table.add(open);
  }
  const tableGlow = glowSprite(0xffe2b0, 2.2, 0); tableGlow.material.depthTest = false; tableGlow.position.set(-.3, 1.05, 0); table.add(tableGlow);
  const stack = new THREE.Group(); stack.position.set(.9, .94, .1); table.add(stack);
  [PALETTE.amber, PALETTE.violet, PALETTE.teal].forEach((c, k) => { const b = block(stack, .55, .1, .38, c, 0, k * .105, 0, .02); b.rotation.y = k * .2 - .1; });
  lamp(table, -1.2, .94, -.3); lamp(table, 1.3, .94, -.35);
  const reader = person(5); scene.add(reader.root);
  if (story) { reader.root.position.set(1.95, 0, .95); reader.root.rotation.y = -1.82; } // at the end of the table, clear of the opening shot
  else { reader.root.position.set(.2, 0, 1.55); reader.root.rotation.y = Math.PI; }
  const browsers = [[0, 2, -.4], [1, 3, .3], [2, 2, -.2]].map(([wi, bi, turn], k) => {
    const b = wings[wi].bays[bi], p = person(11 + k * 3, {}); p.root.position.copy(at(b.a, R - 1.15)); p.root.rotation.y = Math.PI - b.a + turn; scene.add(p.root);
    return p;
  });

  /* ---- cross-references: threads between volumes that share a structure ---- */
  const tmp = new THREE.Vector3();
  const bookPos = (wi, bi) => { const b = wings[wi].bays[bi], book = b.books[Math.min(b.books.length - 1, 4)]; book.updateWorldMatrix(true, false); return book.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .3, 0)); };
  const threads = THREADS.map(([wa, ba, wb, bb], j) => {
    const A = bookPos(wa, ba), B = bookPos(wb, bb), mid = A.clone().lerp(B, .5);
    mid.x *= .55; mid.z *= .55; mid.y = Math.max(A.y, B.y) + 3.2 + j * .45;
    const curve = new THREE.QuadraticBezierCurve3(A, mid, B), color = WINGS[wa].accent;
    const geo = new THREE.TubeGeometry(curve, 80, .045, 6, false);
    const tube = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .92, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(tube);
    const sig = tile({ sig: (j + 1) % 5, edge: color, size: .38, glow: 1.6 }); scene.add(sig);
    const ends = [glowSprite(color, 1.3, 0), glowSprite(WINGS[wb].accent, 1.3, 0)]; ends[0].position.copy(A); ends[1].position.copy(B); scene.add(...ends);
    return { curve, tube, geo, sig, ends, count: geo.index.count, wa, wb };
  });

  /* ---- an agent and a person borrowing across the wings ---- */
  const agent = robot(0xf7f5f0); agent.root.scale.setScalar(.9); scene.add(agent.root);
  const carried = tile({ sig: 2, edge: PALETTE.amber, size: .26 }); carried.position.set(0, .55, .3); carried.rotation.x = -1.1; agent.root.add(carried);
  const courier = person(23, { carry: PALETTE.violet }); courier.root.scale.setScalar(.9); scene.add(courier.root);
  const walkR = R - 1.9;

  const beacon = glowSprite(0xffd9a0, 9, .12); beacon.position.set(0, 4.2, -1.5); scene.add(beacon);
  const target = new THREE.Vector3(), centre = new THREE.Vector3(0, 1.6, -4), roomTarget = new THREE.Vector3(0, 1.8, -4.6), tableTarget = new THREE.Vector3(-.1, 1.05, .4), planTarget = new THREE.Vector3(0, 0, -6.2);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; pointer.ty = e.clientY / innerHeight - .5; }, { passive: true });

  function shotAt(p) {
    let i = 0; while (i < SHOTS.length - 2 && p > SHOTS[i + 1][0]) i++;
    const A = SHOTS[i], B = SHOTS[i + 1], k = smooth((p - A[0]) / (B[0] - A[0]));
    const pos = s => s === 'centre' ? centre : s === 'room' ? roomTarget : s === 'plan' ? planTarget : s === 'table' ? tableTarget : s === 'walker' ? agent.root.position.clone().add(new THREE.Vector3(0, 1, 0)) : at(wings[+s.slice(4)].mid, R - 1).setY(1.3);
    target.copy(pos(A[1])).lerp(pos(B[1]), k);
    return { r: Math.exp(lerp(Math.log(A[2]), Math.log(B[2]), k)), az: lerp(A[3], B[3], k), el: lerp(A[4], B[4], k) };
  }

  function orbit(cam, r, az, el) {
    cam.position.set(target.x + Math.sin(az) * Math.cos(el) * r, target.y + Math.sin(el) * r, target.z + Math.cos(az) * Math.cos(el) * r);
    cam.lookAt(target);
  }
  function aimStory(cam, rect, p) {
    const narrow = rect.width / rect.height < 1, { r, az, el } = shotAt(p);
    orbit(cam, r * (narrow ? 1.4 : 1), az, el);
    fitCamera(cam, rect, { fov: narrow ? 46 : 36 });
    cam.updateMatrixWorld();
  }

  function update(dt, t, p, rect) {
    pointer.x += (pointer.tx - pointer.x) * .04; pointer.y += (pointer.ty - pointer.y) * .04;
    motes.rotation.y = t * .01;
    reader.update(t, 0); browsers.forEach(b => b.update(t, 0));
    const out = extracted();
    featured.visible = !out;
    if (tableBook) { tableBook.visible = !held(); tableGlow.material.opacity = tableBook.visible ? .22 * (1 - ramp(p, .04, .12)) : 0; }
    featuredGlow.material.opacity = story || out ? 0 : .28 + Math.sin(t * 1.6) * .1; // a hint of where chapter 01 begins

    // cross-references draw themselves; in the hero they come and go in turn
    const linked = story ? ramp(p, .24, .46) : 1;
    threads.forEach((th, j) => {
      const k = story ? clamp(linked * 1.6 - j * .15) : clamp(((t * .12 + j * .21) % 1.3) / .45) * (1 - smooth(((t * .12 + j * .21) % 1.3 - 1.05) / .2));
      th.geo.setDrawRange(0, Math.floor(th.count * k / 6) * 6);
      th.tube.visible = k > .002;
      const tip = th.curve.getPoint(clamp(k)), lit = smooth(k * 3);
      th.sig.visible = k > .02; th.sig.position.copy(th.curve.getPoint(.5)); th.sig.position.y += .25 + Math.sin(t * 1.5 + j) * .08;
      th.sig.scale.setScalar(Math.max(.001, smooth((k - .45) * 4))); th.sig.rotation.y = t * .6 + j;
      th.ends[0].material.opacity = .9 * lit; th.ends[1].material.opacity = .9 * smooth((k - .9) * 10);
      th.ends[1].position.copy(k < 1 ? tip : th.curve.getPoint(1));
    });

    // borrowing: the agent walks from the economics wing to the social-science wing, the courier the other way
    const wa = wings[0].mid + .05, wb = wings[2].mid - .05;
    let u = story ? ramp(p, .52, .74) : ((t * .045) % 2), dir = 1;
    if (!story && u > 1) { u = 2 - u; dir = -1; }
    const aa = lerp(wa, wb, u), next = lerp(wa, wb, clamp(u + .01 * dir));
    agent.root.visible = !story || p > .46;
    agent.root.position.copy(at(aa, walkR)); agent.root.rotation.y = Math.atan2(at(next, walkR).x - agent.root.position.x, at(next, walkR).z - agent.root.position.z) || 0;
    agent.update(t, 1);
    const uc = story ? 1 - ramp(p, .54, .76) : 1 - (((t * .038 + .6) % 2) > 1 ? 2 - ((t * .038 + .6) % 2) : (t * .038 + .6) % 2);
    const ac = lerp(wa, wb, uc), nc = lerp(wa, wb, clamp(uc - .01));
    courier.root.visible = !story || (p > .5 && p < .8);
    courier.root.position.copy(at(ac, walkR - .9)); courier.root.rotation.y = Math.atan2(at(nc, walkR - .9).x - courier.root.position.x, at(nc, walkR - .9).z - courier.root.position.z) || 0;
    courier.update(t, 1);

    // new cases arrive in the empty places in the last chapter of the story
    const arrive = story ? ramp(p, .78, .95) : 1;
    arrivals.forEach(({ b, k }) => { const s = story ? smooth(arrive * 1.6 - (k / arrivals.length) * .6) : 1; b.visible = s > .01; b.scale.set(1, Math.max(.001, s), 1); });
    balconyLamps.forEach(l => { l.glow.material.opacity = .4 + .15 * arrive; });
    beacon.material.opacity = .1 + Math.sin(t * .8) * .02 + (story ? linked * .05 : .04);

    // camera
    if (story) aimStory(camera, rect, p);
    else {
      target.set(.9, 2.2, -5.2);
      let r = 24 * (1 - .12 * clamp(window.scrollY / Math.max(1, rect.height)));
      const az = .34 + Math.sin(t * .05) * .1 + pointer.x * .12, el = .14 + pointer.y * .03, stacked = rect.width <= 860;
      if (!stacked) r *= Math.max(1, 1.5 * rect.height / rect.width);
      orbit(camera, r, az, el);
      if (stacked) fitCamera(camera, rect, { band: 440, lift: -.06, fov: 42 });
      else fitCamera(camera, rect, { shift: rect.width < 1100 ? .24 : .22, lift: -.02, fov: 42 });
    }
    sky.position.copy(camera.position);

    // tags: the three fields (only for the chapter itself, not the view behind the initiative)
    if (p > 1) return;
    const tags = wings.map((w, i) => ({ pt: w.top, show: story ? ramp(p, .08, .14) : 1, active: story && ((p < .3 && i === 0) || (p > .3 && p < .5) || p > .8) }));
    onProject(tags.map(({ pt, show, active }) => {
      const s = toView(tmp.copy(pt), camera, rect), o = show * (s.front && s.inside ? 1 : 0);
      return { ...s, opacity: o, visible: o > .02, active };
    }));
  }
  function setTheme() {
    const bg = pageBackground(), lightTheme = document.documentElement.dataset.theme === 'light';
    sky.material.uniforms.top.value.copy(bg);
    sky.material.uniforms.horizon.value.set(lightTheme ? 0xe6e2da : 0x161a2e);
    scene.fog = new THREE.Fog(bg, 40, 120);
    paintFloor(bg);
    light.hemi.intensity = lightTheme ? 2.3 : 1.8;
  }
  setTheme();
  // For the courier: the featured book as this view shows it, and where the other materials sit.
  function featuredView() { featured.updateMatrixWorld(true); camera.updateMatrixWorld(); return { camera, matrix: featured.matrixWorld, key: light.key.position }; }
  function sources() { return sourcePoints.map(({ bay, local }) => bay.localToWorld(local.clone())); }
  // For the courier from chapter 02: the book on the reading table as the story opens.
  const tableCamera = new THREE.PerspectiveCamera(36, 1, .1, 400);
  function tableView(rect) { aimStory(tableCamera, rect, 0); tableBook.updateMatrixWorld(true); return { camera: tableCamera, matrix: tableBook.matrixWorld, key: light.key.position }; }
  return { scene, camera, update, setTheme, featuredView, sources, tableView };
}
