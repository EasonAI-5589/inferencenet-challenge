/* mc-kit.js — the homepage's toy kit: soft matte materials, rounded blocks, chunky
 * big-headed people and robots, small buildings, floating islands, clouds and, at the
 * centre of it all, the Metacase tile with its structure signature. Everything is
 * procedural; scenes compose these pieces. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { mergeGeometries } from '../assets/vendor/three/BufferGeometryUtils.js';

export const PALETTE = {
  wall: 0xf1f2f4, stone: 0xd5d9e0, slate: 0x9aa3b2, ink: 0x2a2f3b, window: 0x334061, floor: 0x0e1015,
  green: 0x3f9d6a, leaf: 0x56b87c, teal: 0x45b5b0, sky: 0x6aa8e8, violet: 0x7d6ad8, rose: 0xe2667a,
  amber: 0xf2b545, orange: 0xef8a4b, cream: 0xf6efe0,
  skins: [0xf3cfa8, 0xe0a979, 0xb97b52, 0x8a5636],
  shirts: [0x4a7fd4, 0xe2667a, 0x3f9d6a, 0xf2b545, 0x7d6ad8, 0x45b5b0, 0xef8a4b, 0xf1f2f4],
  pants: [0x2f3a56, 0x3a3f4b, 0x5b4a3a, 0x24304a],
  hair: [0x2b2118, 0x5a3a22, 0xd9a441, 0x1d1d22, 0x8b3d2a],
};

const materials = new Map(), geometries = new Map();
export function mat(color, { emissive = 0, intensity = 1, rough = .78, opacity = 1 } = {}) {
  const key = `${color}:${emissive}:${intensity}:${rough}:${opacity}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: rough, metalness: 0, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  return materials.get(key);
}
export const glowMat = (color, intensity = 1.4) => mat(color, { emissive: color, intensity, rough: .5 });

// A rounded box centred on its origin (corners pushed out onto spheres).
export function rbox(w, h, d, r = .06) {
  const key = `rb:${w}:${h}:${d}:${r}`;
  if (!geometries.has(key)) {
    const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3), a = g.attributes.position, p = new THREE.Vector3(), c = new THREE.Vector3();
    r = Math.min(r, w / 2, h / 2, d / 2);
    for (let i = 0; i < a.count; i++) {
      p.fromBufferAttribute(a, i);
      c.set(THREE.MathUtils.clamp(p.x, -w / 2 + r, w / 2 - r), THREE.MathUtils.clamp(p.y, -h / 2 + r, h / 2 - r), THREE.MathUtils.clamp(p.z, -d / 2 + r, d / 2 - r));
      p.sub(c); if (p.lengthSq() > 0) p.normalize().multiplyScalar(r); p.add(c);
      a.setXYZ(i, p.x, p.y, p.z);
    }
    g.computeVertexNormals();
    geometries.set(key, g);
  }
  return geometries.get(key);
}
function cached(key, make) { if (!geometries.has(key)) geometries.set(key, make()); return geometries.get(key); }
export function add(parent, geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
// Blocks sit on y = 0 of their parent unless told otherwise.
export const block = (parent, w, h, d, color, x = 0, y = 0, z = 0, r = .06) => add(parent, rbox(w, h, d, r), typeof color === 'number' ? mat(color) : color, x, y + h / 2, z);
export const cyl = (parent, rt, rb, h, color, x = 0, y = 0, z = 0, seg = 16) => add(parent, cached(`cy:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), typeof color === 'number' ? mat(color) : color, x, y + h / 2, z);
export const ball = (parent, r, color, x = 0, y = 0, z = 0, seg = 16) => add(parent, cached(`ba:${r}:${seg}`, () => new THREE.SphereGeometry(r, seg, Math.round(seg * .7))), typeof color === 'number' ? mat(color) : color, x, y, z);
function gable(w, d, h) { // a pitched roof, ridge along x
  return cached(`gb:${w}:${d}:${h}`, () => {
    const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 1 });
    g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2); return g;
  });
}
function windows(parent, w, h, rows, cols, z, y0 = .3, color = PALETTE.window) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = -w / 2 + (c + .5) * (w / cols), y = y0 + r * (h / rows);
    block(parent, w / cols * .48, h / rows * .42, .04, PALETTE.stone, x, y - .02, z, .015);
    block(parent, w / cols * .38, h / rows * .32, .05, color, x, y, z + .01, .01);
  }
}

/* ---- people: Kenney-style minis — big head, boxy body, stubby legs ---- */
export function person(seed = 0, { hardHat = false, carry = 0 } = {}) {
  const P = PALETTE, pick = (list, k) => list[(seed * k + k) % list.length];
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legs = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * .09, .3, 0); body.add(g); block(g, .15, .3, .17, pick(P.pants, 3), 0, -.3, 0, .05); return g; });
  block(body, .42, .38, .3, pick(P.shirts, 5), 0, .28, 0, .09);
  const arms = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * .26, .6, 0); body.add(g); block(g, .11, .3, .13, pick(P.shirts, 5), 0, -.3, 0, .05); ball(g, .065, pick(P.skins, 7), 0, -.33, 0, 10); return g; });
  const head = new THREE.Group(); head.position.y = .66; body.add(head);
  const skin = pick(P.skins, 7);
  block(head, .44, .4, .4, skin, 0, 0, 0, .12);
  const hair = pick(P.hair, 11);
  if (hardHat) { add(head, cached('hat', () => new THREE.SphereGeometry(.27, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat(P.amber), 0, .3, 0); block(head, .58, .04, .5, P.amber, 0, .28, .04, .02); }
  else if (seed % 4 === 1) { block(head, .47, .1, .43, hair, 0, .34, 0, .05); block(head, .2, .05, .14, hair, 0, .36, .22, .02); } // cap
  else { block(head, .46, .16, .42, hair, 0, .29, -.01, .08); block(head, .46, .22, .1, hair, 0, .14, -.17, .05); }
  [-1, 1].forEach(s => block(head, .05, .07, .02, P.ink, s * .09, .17, .2, .02));
  let load = null;
  if (carry) { load = tile({ sig: (seed % SIGNATURES.length), edge: carry, size: .26 }); load.position.set(0, .52, .26); load.rotation.x = -1.2; body.add(load); }
  return {
    root, load,
    update(t, walking = 1) {
      const swing = Math.sin(t * 7 + seed) * .55 * walking;
      legs[0].rotation.x = swing; legs[1].rotation.x = -swing;
      if (load) { arms[0].rotation.x = arms[1].rotation.x = -1.1; } else { arms[0].rotation.x = -swing * .8; arms[1].rotation.x = swing * .8; }
      body.position.y = Math.abs(Math.sin(t * 7 + seed)) * .035 * walking;
      head.rotation.y = Math.sin(t * .9 + seed) * .25 * (1 - walking);
    },
  };
}

/* ---- buildings, each about 2 × 2 on the ground, front facing +z ---- */
export const buildings = {
  // economics: a lecture hall with a pitched roof and a chart board
  economics(accent = PALETTE.teal) {
    const g = new THREE.Group();
    block(g, 2.1, 1.25, 1.5, PALETTE.wall, 0, 0, -.1);
    add(g, gable(2.3, 1.75, .7), mat(accent), 0, 1.25, -.1);
    windows(g, 1.7, .9, 1, 4, .66, .55);
    block(g, .42, .62, .06, PALETTE.ink, 0, 0, .66, .03);
    const board = new THREE.Group(); board.position.set(1.25, 0, .9); board.rotation.y = -.5; g.add(board);
    cyl(board, .03, .03, .5, PALETTE.ink, 0, 0, 0, 6); block(board, .7, .48, .05, PALETTE.wall, 0, .48, 0, .02);
    [.12, .22, .17, .3].forEach((h, i) => block(board, .08, h, .03, accent, -.2 + i * .13, .55, .03, .01));
    return g;
  },
  // finance: a bank with columns and a coin
  finance(accent = PALETTE.amber) {
    const g = new THREE.Group();
    block(g, 2.2, .16, 1.7, PALETTE.stone, 0, 0, 0, .03);
    block(g, 1.9, 1.05, 1.1, PALETTE.wall, 0, .16, -.2);
    for (let i = 0; i < 4; i++) cyl(g, .09, .1, .95, PALETTE.wall, -.75 + i * .5, .16, .55, 12);
    block(g, 2.15, .16, 1.6, PALETTE.wall, 0, 1.12, -.02, .03);
    add(g, gable(2.15, 1.6, .45), mat(accent), 0, 1.28, -.02);
    const coin = cyl(g, .26, .26, .07, mat(PALETTE.amber, { emissive: PALETTE.amber, intensity: .45, rough: .4 }), .95, 1.7, .6, 20); coin.rotation.x = Math.PI / 2;
    return g;
  },
  // healthcare: a clinic with a cross
  healthcare(accent = PALETTE.rose) {
    const g = new THREE.Group();
    block(g, 1.9, 1.5, 1.4, PALETTE.wall, 0, 0, -.1);
    block(g, 1.1, .8, 1, PALETTE.wall, 1.25, 0, .1);
    block(g, 2, .1, 1.5, PALETTE.stone, 0, 1.5, -.1, .03);
    windows(g, 1.6, 1.2, 2, 3, .61, .35);
    const cross = new THREE.Group(); cross.position.set(0, 1.85, -.1); g.add(cross);
    block(cross, .5, .16, .12, accent, 0, -.08, 0, .03); block(cross, .16, .5, .12, accent, 0, -.25, 0, .03);
    block(g, .6, .5, .05, accent, 1.25, .1, .61, .02);
    return g;
  },
  // policy: a domed hall with a flag
  policy(accent = PALETTE.violet) {
    const g = new THREE.Group();
    block(g, 2.1, .14, 1.6, PALETTE.stone, 0, 0, 0, .03);
    block(g, 1.9, 1, 1.2, PALETTE.wall, 0, .14, -.15);
    for (let i = 0; i < 5; i++) cyl(g, .07, .08, .85, PALETTE.wall, -.8 + i * .4, .14, .58, 10);
    block(g, 2, .12, 1.5, PALETTE.wall, 0, 1.0, 0, .03);
    cyl(g, .55, .6, .3, PALETTE.wall, 0, 1.12, -.15, 24);
    add(g, cached('dome', () => new THREE.SphereGeometry(.56, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mat(accent), 0, 1.42, -.15);
    cyl(g, .02, .02, .5, PALETTE.ink, 0, 1.9, -.15, 6); block(g, .3, .18, .02, PALETTE.rose, .16, 2.2, -.15, .01);
    return g;
  },
  // law: a courthouse with the scales
  law(accent = PALETTE.green) {
    const g = new THREE.Group();
    block(g, 2, .14, 1.6, PALETTE.stone, 0, 0, 0, .03);
    for (let i = 0; i < 3; i++) cyl(g, .12, .13, 1, PALETTE.wall, -.6 + i * .6, .14, .5, 12);
    block(g, 1.7, 1.1, 1.0, PALETTE.wall, 0, .14, -.25);
    block(g, 2, .12, 1.5, PALETTE.wall, 0, 1.14, 0, .03);
    add(g, gable(2, 1.5, .5), mat(accent), 0, 1.26, 0);
    const sc = new THREE.Group(); sc.position.set(1.25, 0, .75); g.add(sc);
    cyl(sc, .03, .04, .9, PALETTE.ink, 0, 0, 0, 8); block(sc, .6, .04, .04, PALETTE.amber, 0, .9, 0, .01);
    [-.27, .27].forEach(x => cyl(sc, .12, .08, .04, PALETTE.amber, x, .66, 0, 14));
    return g;
  },
  // social science: a university hall with a clock tower
  social(accent = PALETTE.violet) {
    const g = new THREE.Group();
    block(g, 2.2, .14, 1.6, PALETTE.stone, 0, 0, 0, .03);
    block(g, 2, 1.1, 1.1, PALETTE.wall, 0, .14, -.2);
    windows(g, 1.7, .8, 2, 4, .36, .45);
    add(g, gable(2.1, 1.25, .45), mat(accent), 0, 1.24, -.2);
    block(g, .6, 1.9, .6, PALETTE.wall, 0, .14, .2, .05);
    add(g, cached('spire', () => new THREE.ConeGeometry(.42, .6, 4)), mat(accent), 0, 2.34, .2).rotation.y = Math.PI / 4;
    const face = cyl(g, .2, .2, .04, PALETTE.cream, 0, 1.6, .5, 20); face.rotation.x = Math.PI / 2;
    block(g, .02, .14, .02, PALETTE.ink, 0, 1.62, .53, .005);
    return g;
  },
  // business: office towers
  business(accent = PALETTE.sky) {
    const g = new THREE.Group();
    [[-.6, 1.8, .8], [.25, 2.7, .85], [.95, 1.3, .7]].forEach(([x, h, w], i) => {
      block(g, w, h, w, i === 1 ? PALETTE.stone : PALETTE.wall, x, 0, -.1 + i * .15, .05);
      windows(g, w * .85, h - .3, Math.round(h / .38), 2, -.1 + i * .15 + w / 2 + .01, .25, accent);
      block(g, w * .9, .08, w * .9, accent, x, h, -.1 + i * .15, .02);
    });
    return g;
  },
};
export function tree(scale = 1, color = PALETTE.leaf) {
  const g = new THREE.Group();
  cyl(g, .06, .08, .35, 0x7a5236, 0, 0, 0, 7);
  add(g, cached('crown', () => new THREE.IcosahedronGeometry(.32, 0)), mat(color), 0, .55, 0);
  add(g, cached('crown2', () => new THREE.IcosahedronGeometry(.22, 0)), mat(color), .08, .82, .02);
  g.scale.setScalar(scale);
  return g;
}
/* ---- the Metacase tile: a white slab, a domain-coloured edge, and its signature —
 * the five-stage shape of how the problem was solved — raised on top. ---- */
export const SIGNATURES = [
  [0, -.7, .4, -.9, .6],
  [0, .6, .9, -.3, -.6],
  [0, -.4, -.7, .8, .5],
  [0, .8, -.5, .6, -.8],
  [0, -.2, .7, .9, -.6],
];
// The five stages of a Metacase: evidence & cutoff, priors & strategy, trajectory,
// verified outcome, reflection & reuse.
export const STAGE_COLORS = [0x45b5b0, 0x7d6ad8, 0x6aa8e8, 0xf2b545, 0x3f9d6a];
// Points of a signature laid across a w × d face (x along the steps, z as the bend).
export function signaturePoints(sig, w, d, y = 0) {
  const n = SIGNATURES[sig].length;
  return SIGNATURES[sig].map((dz, i) => new THREE.Vector3(-w / 2 + w * i / (n - 1), y, dz * d / 2));
}
export function signatureGeometry(sig, w, d, r = .028) {
  return cached(`sig:${sig}:${w}:${d}:${r}`, () => {
    const pts = signaturePoints(sig, w, d), parts = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b), g = new THREE.CylinderGeometry(r, r, len, 6, 1);
      g.rotateZ(Math.PI / 2); g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x)); g.translate((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
      parts.push(g);
    }
    pts.forEach(p => { const g = new THREE.SphereGeometry(r * 2, 10, 8); g.translate(p.x, 0, p.z); parts.push(g); });
    return mergeGeometries(parts.map(g => g.toNonIndexed()));
  });
}
export function tile({ sig = 0, edge = PALETTE.teal, size = 1, glow = .9 } = {}) {
  const g = new THREE.Group(), w = 1.6 * size, d = 1.1 * size, h = .26 * size;
  add(g, rbox(w, h, d, .07 * size), mat(0xf7f5f0), 0, h / 2, 0);
  add(g, rbox(w + .05 * size, .07 * size, d + .05 * size, .03 * size), mat(edge, { emissive: edge, intensity: .25 }), 0, h * .38, 0, false);
  // the signature's material is the tile's own, so scenes can make one tile glow on its own
  const mark = add(g, signatureGeometry(sig, w * .78, d * .62, .026 * size), new THREE.MeshStandardMaterial({ color: edge, emissive: edge, emissiveIntensity: glow, roughness: .4, metalness: 0 }), 0, h + .015 * size, 0, false);
  g.userData = { mark, sig, w, d, h };
  return g;
}

/* ---- floating islands: a grassy cap, an earth rim and a craggy underside ---- */
export function island({ radius = 3.2, grass = 0x9fd6a8, seed = 1, sides = 10 } = {}) {
  const g = new THREE.Group(), random = rngKit(seed);
  const capGeo = new THREE.CylinderGeometry(radius, radius * .97, .45, sides, 1);
  add(g, capGeo, new THREE.MeshStandardMaterial({ color: grass, roughness: .9, flatShading: true }), 0, -.22, 0);
  add(g, new THREE.CylinderGeometry(radius * .97, radius * .86, .5, sides, 1), new THREE.MeshStandardMaterial({ color: 0x9a7556, roughness: .95, flatShading: true }), 0, -.7, 0);
  const rock = new THREE.ConeGeometry(radius * .86, radius * 1.45, sides, 3);
  const pos = rock.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < radius * .7) { pos.setX(i, pos.getX(i) * (1 + (random() - .5) * .22)); pos.setZ(i, pos.getZ(i) * (1 + (random() - .5) * .22)); } }
  rock.computeVertexNormals(); rock.rotateX(Math.PI);
  add(g, rock, new THREE.MeshStandardMaterial({ color: 0x6f6359, roughness: 1, flatShading: true }), 0, -.95 - radius * .725, 0);
  for (let k = 0; k < 3; k++) {
    const r = radius * (.16 + random() * .1), a = random() * Math.PI * 2, bit = add(g, new THREE.DodecahedronGeometry(r, 0), new THREE.MeshStandardMaterial({ color: 0x6f6359, roughness: 1, flatShading: true }), Math.cos(a) * radius * .5, -radius * (1.3 + random() * .6), Math.sin(a) * radius * .5);
    bit.rotation.set(random() * 3, random() * 3, 0);
  }
  return g;
}
function rngKit(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
export function cloud(scale = 1) {
  const g = new THREE.Group();
  [[0, 0, 0, .55], [.5, .05, .05, .42], [-.48, .02, -.05, .4], [.12, .28, 0, .4], [-.2, .2, .2, .3]].forEach(([x, y, z, r]) => add(g, cached(`cl:${r}`, () => new THREE.IcosahedronGeometry(r, 1)), mat(0xffffff, { emissive: 0x8a96c8, intensity: .45, rough: 1 }), x, y, z, false));
  g.scale.setScalar(scale);
  return g;
}
// A small robot: the agent of the Challenge, in the same toy style as the people.
export function robot(color = 0xf7f5f0, eye = 0x8ff6ff) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  block(body, .5, .48, .38, color, 0, .12, 0, .13);
  [-1, 1].forEach(s => block(body, .12, .14, .16, PALETTE.ink, s * .14, 0, 0, .04));
  const head = new THREE.Group(); head.position.y = .62; body.add(head);
  block(head, .52, .4, .4, color, 0, 0, 0, .12);
  block(head, .42, .2, .04, PALETTE.ink, 0, .1, .2, .05);
  const eyeMat = mat(eye, { emissive: eye, intensity: 2.2 });
  [-1, 1].forEach(s => block(head, .07, .1, .03, eyeMat, s * .1, .15, .225, .02));
  cyl(head, .015, .015, .2, PALETTE.ink, 0, .4, 0, 6); ball(head, .05, mat(PALETTE.amber, { emissive: PALETTE.amber, intensity: 1.6 }), 0, .62, 0, 10);
  return {
    root, head,
    update(t, walking = 0) { body.position.y = Math.abs(Math.sin(t * 7)) * .035 * walking + (Math.sin(t * 2) + 1) * .005; head.rotation.y = Math.sin(t * .8) * .3 * (1 - walking); },
  };
}
export function crane(color = PALETTE.amber) {
  const g = new THREE.Group();
  block(g, .7, .2, .7, PALETTE.ink, 0, 0, 0, .04);
  const mast = new THREE.Group(); g.add(mast);
  for (let k = 0; k < 7; k++) { block(mast, .22, .44, .22, color, 0, .2 + k * .44, 0, .02); block(mast, .26, .04, .26, PALETTE.ink, 0, .2 + k * .44, 0, .01); }
  const jib = new THREE.Group(); jib.position.y = 3.3; g.add(jib);
  block(jib, 3.2, .16, .18, color, .9, 0, 0, .02); block(jib, .7, .3, .3, PALETTE.ink, -.95, -.05, 0, .04);
  block(jib, .3, .35, .3, PALETTE.slate, 0, .16, 0, .04);
  const cable = add(jib, new THREE.CylinderGeometry(.012, .012, 1, 4), mat(PALETTE.ink), 2.2, -.5, 0, false);
  const hook = new THREE.Group(); hook.position.set(2.2, -1, 0); jib.add(hook);
  return { root: g, jib, cable, hook };
}
export function scaffold(w = 1.6, h = 2, d = 1.2) {
  const g = new THREE.Group(), poleMat = mat(PALETTE.slate), boardMat = mat(0xc9a36e);
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) add(g, cached(`pole:${h}`, () => new THREE.CylinderGeometry(.03, .03, h, 6)), poleMat, x, h / 2, z);
  for (let y = .6; y < h; y += .7) { block(g, w + .1, .05, d + .1, boardMat, 0, y, 0, .01); }
  return g;
}
export function bookStack(n = 4, seed = 2) {
  const g = new THREE.Group(), colors = [PALETTE.rose, PALETTE.sky, PALETTE.amber, PALETTE.green, PALETTE.violet];
  for (let k = 0; k < n; k++) { const b = block(g, .5, .12, .36, colors[(k + seed) % colors.length], 0, k * .125, 0, .02); b.rotation.y = (k % 2 ? .1 : -.08); }
  return g;
}

// Soft light for the toy look: sky/ground fill, a warm key with soft shadows, a cool rim.
export function lights(scene, { span = 24, shadowSize = 2048 } = {}) {
  const hemi = new THREE.HemisphereLight(0xe8eeff, 0x2a2633, 1.9);
  const key = new THREE.DirectionalLight(0xfff3e2, 2.4);
  key.position.set(span * .5, span, span * .4); key.castShadow = true; key.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: span * 4 });
  key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  const rim = new THREE.DirectionalLight(0x9fb6ff, .9); rim.position.set(-span, span * .4, -span * .6);
  scene.add(hemi, key, rim);
  return { hemi, key, rim };
}

/* ---- the Metacase as a book: five stages, marked by tabs on the fore-edge ---- */
// How far stage tab i of a signature sticks out of the pages. The five tab tips
// together trace the signature: the shape of how the problem was solved.
export const tabDepth = (sig, i, scale = 1) => (.06 + (SIGNATURES[sig][i] + 1) * .1) * scale;
// A standing volume on y = 0: spine towards +z, fore-edge (with its chapter tabs) towards -z.
export function volume({ color = PALETTE.teal, sig = 0, w = .16, h = .62, d = .44 } = {}) {
  const g = new THREE.Group(), cover = mat(color), board = w * .12;
  [-1, 1].forEach(s => block(g, board, h, d, cover, s * (w / 2 - board / 2), 0, 0, .012));
  block(g, w, h, d * .12, cover, 0, 0, d / 2 - d * .06, .012);
  block(g, w * 1.02, h * .05, d * .12 + .004, PALETTE.cream, 0, h * .7, d / 2 - d * .06, .004).castShadow = false;
  block(g, w - board * 2 + .004, h * .94, d * .9, PALETTE.cream, 0, h * .03, -d * .04, .006).castShadow = false;
  // cloth cover details: a cream title label and two gilt bands on each board
  const gilt = mat(0xd8b46a, { rough: .45 }), label = mat(PALETTE.cream);
  [-1, 1].forEach(sd => {
    const x = sd * (w / 2 + .002);
    block(g, .006, h * .2, d * .52, label, x, h * .5, d * .04, .003).castShadow = false;
    const title = labelPlane(METACASE_LABEL(), d * .5, h * .19); title.rotation.set(0, sd * Math.PI / 2, 0); title.position.set(x + sd * .0045, h * .6, d * .04); g.add(title);
    [h * .14, h * .84].forEach(y => block(g, .006, h * .018, d * .9, gilt, x, y, 0, .002).castShadow = false);
  });
  const tabs = [], tips = [], n = SIGNATURES[sig].length, s = h * .66 / (n - 1), th = s * .56;
  for (let i = 0; i < n; i++) {
    const td = tabDepth(sig, i, d / .44 * .5), y = h * .12 + i * s;
    const tab = block(g, w * .46, th, td + .02, mat(STAGE_COLORS[i]), 0, y, -d * .49 - td / 2 + .01, .008);
    tab.castShadow = false; tabs.push(tab);
    tips.push(new THREE.Vector3(0, y + th / 2, -d * .49 - td));
  }
  g.userData = { tabs, tips, w, h, d, sig };
  return g;
}

/* ---- printed labels: canvas text on a plane, for titles on covers and pages ---- */
const labelCache = new Map();
// lines: [{ text, size (px at 1024 wide), weight, color, font, track }]; returns a texture.
export function labelTexture(key, lines, { width = 1024, height = 512, bg = null } = {}) {
  if (labelCache.has(key)) return labelCache.get(key);
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = items => {
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, width, height);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const total = items.reduce((s, l) => s + l.size * 1.25, 0);
    let y = height / 2 - total / 2;
    items.forEach(l => {
      ctx.font = `${l.weight || 600} ${l.size}px ${l.font || 'Inter, Arial, sans-serif'}`;
      ctx.fillStyle = l.color || '#1f2a3a';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${l.track || 0}px`;
      ctx.fillText(l.text, width / 2, y + l.size * .625, width * .92);
      y += l.size * 1.25;
    });
    tex.needsUpdate = true;
  };
  draw(lines);
  document.fonts?.ready.then(() => draw(lines));
  tex.userData.redraw = draw;
  labelCache.set(key, tex);
  return tex;
}
// A flat label facing +y (lay it on a surface), w × d in world units.
export function labelPlane(tex, w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .8 }));
  m.rotation.x = -Math.PI / 2; return m;
}
export const METACASE_LABEL = () => labelTexture('metacase', [
  { text: 'METACASE', size: 150, weight: 750, color: '#1f2a3a', track: 18 },
  { text: 'ONE COMPLETE EPISODE', size: 46, weight: 500, color: '#6b7280', font: '"Space Mono", ui-monospace, monospace', track: 6 },
]);

/* ---- the Metacase book, closed: the volume chapter 01 opens on its desk ---- */
// Shared by chapter 01, the hero bookcase it is taken from and the courier that carries it
// between them, so the three always show the same object. Origin: bottom of the spine,
// the pages run towards +x, the cover faces +y.
export const BOOK = { PW: 2.4, PD: 3.2, T: .42, BOARD: .06, COVER: 0x2c5468 };
export const BOOK_CENTRE = new THREE.Vector3(BOOK.PW / 2, (BOOK.T + BOOK.BOARD * 2) / 2, 0);
export function closedBook() {
  const { PW, PD, T, BOARD } = BOOK, g = new THREE.Group();
  const cover = mat(BOOK.COVER, { rough: .9 }), edge = mat(PALETTE.cream), gilt = mat(0xd8b46a, { rough: .4 });
  block(g, PW + .1, BOARD, PD + .12, cover, PW / 2, 0, 0, .02);
  block(g, PW, T, PD, edge, PW / 2, BOARD, 0, .02);
  block(g, .14, T + BOARD * 2, PD + .12, cover, 0, 0, 0, .04);
  for (let k = 1; k < 6; k++) block(g, .006, .004, PD - .04, mat(0xe4dccb), PW + .001, BOARD + k * T / 6, 0, .001).castShadow = false;
  [.18, .82].forEach(f => block(g, .16, .03, PD + .14, gilt, 0, (T + BOARD * 2) * f, 0, .01).castShadow = false);
  const front = new THREE.Group(); front.position.set(PW / 2 + .05, BOARD + T + BOARD / 2, 0); g.add(front);
  add(front, rbox(PW + .1, BOARD, PD + .12, .02), cover);
  add(front, rbox(PW * .62, .01, .62, .006), mat(PALETTE.cream), 0, BOARD / 2 + .004, -.35, false);
  const title = labelPlane(METACASE_LABEL(), PW * .6, PW * .3); title.position.set(0, BOARD / 2 + .013, -.35); front.add(title);
  [[0, -PD / 2 + .14, PW - .1, .025], [0, PD / 2 - .14, PW - .1, .025]].forEach(([x, z, w, d]) => add(front, rbox(w, .01, d, .004), gilt, x, BOARD / 2 + .004, z, false));
  [-1, 1].forEach(sx => add(front, rbox(.025, .01, PD - .28, .004), gilt, sx * (PW / 2 - .1), BOARD / 2 + .004, 0, false));
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(front, rbox(.22, .016, .22, .02), gilt, sx * (PW / 2 - .04), BOARD / 2 + .002, sz * (PD / 2 - .02), false)));
  [0, 2, 4].forEach((i, k) => add(front, rbox(.1, .012, .1, .02), mat(STAGE_COLORS[i]), -.25 + k * .25, BOARD / 2 + .008, .35, false));
  return g;
}
// The chapter tabs on a closedBook()'s fore-edge and the thread through their tips: the
// Metacase's signature. Chapter 01 grows them chapter by chapter; the couriers and the
// later chapters show the same book with all five in place.
export function bookTabs(book, sig = 0) {
  const { PW, PD, T, BOARD } = BOOK, tabs = [], tips = [];
  const n = SIGNATURES[sig].length;
  for (let i = 0; i < n; i++) {
    const td = .12 + tabDepth(sig, i, 2.6), z = -PD / 2 + PD * (.1 + .8 * (i + .5) / n), y = BOARD + T * .5 - .09;
    const tab = new THREE.Group(); tab.position.set(PW - .02, y, z); book.add(tab);
    add(tab, rbox(td + .04, .18, .38, .025), mat(STAGE_COLORS[i], { emissive: STAGE_COLORS[i], intensity: .25 }), (td + .04) / 2, .09, 0);
    tabs.push(tab); tips.push(new THREE.Vector3(PW + td, y + .2, z));
  }
  const thread = mat(0xfff6e0, { emissive: 0xfff1d0, intensity: .9 });
  const nodes = tips.map((p, i) => ball(book, .06, mat(STAGE_COLORS[i], { emissive: STAGE_COLORS[i], intensity: 1.1 }), p.x, p.y + .02, p.z, 14));
  const links = tips.slice(1).map((p, i) => {
    const a = tips[i], m = add(book, cached('thread', () => new THREE.CylinderGeometry(.018, .018, 1, 8)), thread, 0, 0, 0, false);
    m.position.copy(a).lerp(p, .5).setY(a.y + .02); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(a).normalize());
    m.userData.len = a.distanceTo(p); m.scale.y = m.userData.len;
    return m;
  });
  return { tabs, tips, nodes, links };
}
