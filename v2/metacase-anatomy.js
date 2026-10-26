/* metacase-anatomy.js — The Metacase: a closed case whose seven layers hold one whole
 * episode. Scroll (0–1) opens it layer by layer, from context at the bottom to lessons
 * at the top, then closes it again and draws its signature: the shape of how the
 * problem was solved. Rendered by the shared stage (mc-stage.js). */
import * as THREE from '../assets/vendor/three/three.module.js';
import { toon } from './mc-toon.js';
import { lights, person, signaturePoints, STAGE_COLORS } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitCamera, toView, glowSprite } from './mc-stage.js';
const ACCENTS = [0x45b5b0, 0x6aa8e8, 0x7d6ad8, 0xb07ad8, 0xe2667a, 0xf2b545, 0x3f9d6a];
const OPEN = [0.08, 0.84]; // where the stack is open; one band per layer in between

function slab(w, h, d, r) { // a rounded plate sitting on y = 0
  r = Math.min(r, h / 2 - .002, w / 2 - .01, d / 2 - .01);
  const s = new THREE.Shape(), x = -w / 2 + r, y = -d / 2 + r, iw = w - 2 * r, id = d - 2 * r;
  s.moveTo(x, y); s.lineTo(x + iw, y); s.lineTo(x + iw, y + id); s.lineTo(x, y + id); s.lineTo(x, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.01, h - 2 * r), bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, r, 0);
  return g;
}

export function createAnatomy({ onProject = () => {}, reduce = false } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 120);
  const add = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const box = (parent, w, h, d, mat, x, y, z, r = .04) => add(slab(w, h, d, r), mat, parent, x, y, z);
  const cyl = (parent, rt, rb, h, mat, x, y, z, seg = 20) => add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, parent, x, y + h / 2, z);
  const ball = (parent, r, mat, x, y, z) => add(new THREE.SphereGeometry(r, 20, 14), mat, parent, x, y, z);
  const glowMat = color => toon(color, { emissive: color, emissiveIntensity: .9 });

  lights(scene, { span: 12, shadowSize: 1024 });

  const paper = toon(0xf6f2ea), ink = toon(0x2b3466), navy = toon(0xe9ebef), slate = toon(0x8fa3c9), gold = toon(0xffc247), white = toon(0xffffff);
  const stack = new THREE.Group(); scene.add(stack);
  const W = 6, D = 4.2, H = .34;

  // Seven dioramas, one per layer of a Metacase.
  const dressers = [
    g => { // context & raw evidence: document stacks, a database, a magnifier
      for (let s = 0; s < 3; s++) for (let k = 0; k < 3 + s; k++) box(g, .9, .06, 1.15, paper, -1.9 + s * 1.1, .02 + k * .08, -.6 + s * .25, .02).rotation.y = (k % 2 ? .08 : -.06) + s * .2;
      const db = new THREE.Group(); db.position.set(1.7, 0, -.4); g.add(db);
      for (let k = 0; k < 3; k++) { cyl(db, .55, .55, .32, slate, 0, k * .38, 0, 28); cyl(db, .56, .56, .04, glowMat(ACCENTS[0]), 0, k * .38 + .3, 0, 28); }
      const lens = new THREE.Group(); lens.position.set(.3, 1, .9); lens.rotation.set(.9, 0, .5); g.add(lens);
      add(new THREE.TorusGeometry(.42, .07, 10, 28), gold, lens); add(new THREE.CylinderGeometry(.06, .07, .7, 10), ink, lens, 0, -.75, 0);
      return { lens };
    },
    g => { // prior practice: a hall of precedent and its books
      const hall = new THREE.Group(); hall.position.set(-.6, 0, -.3); g.add(hall);
      box(hall, 2.6, .2, 1.6, slate, 0, 0, 0, .05);
      for (let k = 0; k < 4; k++) cyl(hall, .13, .15, 1.1, white, -.9 + k * .6, .2, .45, 14);
      box(hall, 2.2, 1, .9, paper, 0, .2, -.25, .05);
      const roof = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-1.45, 0), new THREE.Vector2(1.45, 0), new THREE.Vector2(0, .7)]), { depth: 1.7, bevelEnabled: false });
      roof.translate(0, 0, -.85); add(roof, toon(ACCENTS[1]), hall, 0, 1.3, 0);
      [[1.9, .2], [2.3, -.6]].forEach(([x, z], s) => { for (let k = 0; k < 4; k++) box(g, .7, .16, .5, toon([0xf28cc7, 0x5fb4ff, 0xffc247, 0x7ee0a0][(k + s) % 4]), x, k * .17, z, .03).rotation.y = k * .12; });
      return {};
    },
    g => { // approaches considered: three paths diverge; one is set aside
      const paths = [-.55, 0, .55].map((a, k) => {
        const p = new THREE.Group(); p.position.set(-1.8, .02, .8); p.rotation.y = a - .0; g.add(p);
        const mat = k === 2 ? toon(0x4a5584) : toon(k === 1 ? ACCENTS[2] : 0xc9d6f0);
        box(p, 3.4, .06, .38, mat, 1.7, 0, 0, .02);
        const sign = new THREE.Group(); sign.position.set(3.2, 0, 0); p.add(sign);
        cyl(sign, .04, .04, .8, ink, 0, 0, 0, 8); box(sign, .5, .26, .06, k === 2 ? toon(0x4a5584) : paper, .15, .62, 0, .03);
        return p;
      });
      ball(g, .18, glowMat(ACCENTS[2]), -1.8, .2, .8);
      return { paths };
    },
    g => { // reasoning & candidate strategies: a floating graph with one chosen route
      const nodes = [[-2, .8, .6], [-1, 1.5, -.5], [-.2, .7, .9], [.6, 1.6, .1], [1.5, .9, -.7], [2.1, 1.4, .7]].map(v => new THREE.Vector3(...v));
      const chosen = [0, 2, 3, 5], hot = glowMat(ACCENTS[3]);
      const graph = new THREE.Group(); g.add(graph);
      const link = (a, b, mat, r) => { const d = b.clone().sub(a), m = add(new THREE.CylinderGeometry(r, r, d.length(), 8), mat, graph); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); };
      [[0, 1], [1, 3], [1, 4], [2, 4], [4, 5], [0, 2]].forEach(([a, b]) => link(nodes[a], nodes[b], slate, .03));
      for (let k = 0; k < chosen.length - 1; k++) link(nodes[chosen[k]], nodes[chosen[k + 1]], hot, .05);
      nodes.forEach((v, k) => ball(graph, chosen.includes(k) ? .22 : .17, chosen.includes(k) ? hot : paper, v.x, v.y, v.z));
      for (let k = 0; k < 4; k++) cyl(g, .05, .05, .7, ink, nodes[k].x, 0, nodes[k].z, 6);
      return { graph };
    },
    g => { // actions taken: meshing gears and a forward arrow
      const gear = (r, teeth, color, x, z) => {
        const h = new THREE.Group(); h.position.set(x, .25, z); g.add(h);
        cyl(h, r, r, .3, toon(color), 0, -.15, 0, 32);
        for (let k = 0; k < teeth; k++) { const a = k / teeth * Math.PI * 2, t = box(h, .26, .3, .2, toon(color), Math.cos(a) * r, -.15, Math.sin(a) * r, .03); t.rotation.y = -a; }
        cyl(h, r * .35, r * .35, .34, ink, 0, -.17, 0, 18);
        return h;
      };
      const gears = [gear(.8, 10, 0xf28cc7, -1.4, -.2), gear(.55, 8, 0xc9d6f0, -.12, -.6)];
      const arrow = new THREE.Group(); arrow.position.set(1.5, .5, .5); g.add(arrow);
      const shaft = add(new THREE.CylinderGeometry(.16, .16, 1.6, 14), glowMat(ACCENTS[4]), arrow); shaft.rotation.z = Math.PI / 2;
      const head = add(new THREE.ConeGeometry(.38, .7, 18), glowMat(ACCENTS[4]), arrow, 1.1, 0, 0); head.rotation.z = -Math.PI / 2;
      return { gears, arrow };
    },
    g => { // outcomes: rising bars beside a target
      const bars = [.5, .9, 1.3, 1.9].map((h, k) => { const b = box(g, .45, h, .45, toon(k === 3 ? ACCENTS[5] : 0xc9d6f0), -2 + k * .6, 0, -.3, .06); return b; });
      const target = new THREE.Group(); target.position.set(1.6, 1.15, 0); target.rotation.y = -.4; g.add(target);
      [[.95, 0xffffff], [.72, 0xf28cc7], [.48, 0xffffff], [.24, 0xf28cc7]].forEach(([r, c], k) => { const d = add(new THREE.CylinderGeometry(r, r, .08, 32), toon(c), target, 0, 0, k * .03); d.rotation.x = Math.PI / 2; });
      cyl(g, .06, .06, 1.15, ink, 1.6, 0, -.1, 8);
      const dart = add(new THREE.CylinderGeometry(.04, .04, .9, 8), glowMat(ACCENTS[5]), target, .1, .1, .45); dart.rotation.x = Math.PI / 2;
      return { bars };
    },
    g => { // interpretation & lessons: an open book under a light
      const book = new THREE.Group(); book.position.set(-.6, .05, .2); g.add(book);
      [-1, 1].forEach(s => { const leaf = box(book, 1.3, .1, 1.7, paper, s * .66, 0, 0, .03); leaf.rotation.z = s * -.12; box(book, 1.36, .06, 1.76, toon(ACCENTS[6]), s * .66, -.05, 0, .02).rotation.z = s * -.12; });
      for (let k = 0; k < 4; k++) [-1, 1].forEach(s => box(book, .9, .02, .06, ink, s * .66, .14, -.5 + k * .3, .01).rotation.z = s * -.12);
      const bulb = new THREE.Group(); bulb.position.set(1.6, 0, -.3); g.add(bulb);
      cyl(bulb, .05, .05, 1.4, ink, 0, 0, 0, 8);
      const glass = ball(bulb, .42, glowMat(0xfff1a8), 0, 1.75, 0);
      cyl(bulb, .2, .22, .25, slate, 0, 1.3, 0, 14);
      return { glass };
    },
  ];

  const plates = ACCENTS.map((accent, i) => {
    const g = new THREE.Group(); stack.add(g);
    const base = box(g, W, H, D, navy, 0, 0, 0, .14);
    const rimMat = toon(accent, { emissive: accent, emissiveIntensity: .2 });
    box(g, W + .08, .08, D + .08, rimMat, 0, H * .4, 0, .05);
    box(g, W - .4, .05, D - .4, toon(new THREE.Color(accent).lerp(new THREE.Color(0xffffff), .55).getHex()), 0, H, 0, .1);
    const props = new THREE.Group(); props.position.y = H + .02; g.add(props);
    const parts = dressers[i](props);
    return { g, base, rimMat, props, parts, accent, anchor: new THREE.Vector3(W / 2 + .15, H * .5, .4) };
  });

  // The closed case carries its signature on top; it draws itself when the case closes again.
  const signature = new THREE.Group(); scene.add(signature);
  const sigPts = signaturePoints(0, W * .74, D * .62);
  const sigNodes = sigPts.map((pt, i) => { const m = ball(signature, .1, toon(STAGE_COLORS[i], { emissive: STAGE_COLORS[i], emissiveIntensity: 1.4 }), pt.x, .05, pt.z); m.castShadow = false; return m; });
  const sigLinks = sigPts.slice(1).map((pt, i) => {
    const a = sigPts[i], len = a.distanceTo(pt), m = add(new THREE.CylinderGeometry(.045, .045, len, 8), toon(STAGE_COLORS[i], { emissive: STAGE_COLORS[i], emissiveIntensity: 1.2 }), signature, (a.x + pt.x) / 2, .05, (a.z + pt.z) / 2);
    m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(pt.z - a.z, pt.x - a.x); m.castShadow = false; m.userData.len = len;
    return m;
  });
  const sigGlow = glowSprite(0xb5a8ff, 7, 0); signature.add(sigGlow); sigGlow.position.y = .4;

  // A white plinth under a soft pool of light; two minis watch the case open.
  const plinth = new THREE.Group(); plinth.position.y = -.32; scene.add(plinth);
  add(new THREE.CylinderGeometry(5.6, 5.9, .5, 64), toon(0xe9ebef), plinth, 0, -.25, 0);
  const rim = add(new THREE.TorusGeometry(5.78, .035, 8, 96), toon(0x7d6ad8, { emissive: 0x7d6ad8, emissiveIntensity: .8 }), plinth, 0, -.12, 0); rim.rotation.x = Math.PI / 2; rim.castShadow = false;
  const pool = glowSprite(0x9fb6ff, 22, .1); pool.position.y = 3; scene.add(pool);
  const watchers = [0, 1].map(k => { const p = person(30 + k); p.root.position.set(k ? 4.3 : -4.5, -.32, k ? 2.4 : 2.9); p.root.rotation.y = k ? -.9 : .7; p.root.scale.setScalar(1.5); scene.add(p.root); return p; });

  const target = new THREE.Vector3(), v = new THREE.Vector3();
  function setTheme() {
    const bg = pageBackground();
    scene.background = bg; scene.fog = new THREE.Fog(bg, 24, 52);
  }
  // Progress map: closed (0–.08) → open, one band per layer (.08–.8) → closing (.8–.88) → signature (.88–1)
  function update(dt, t, p, rect) {
    const aspect = rect.width / rect.height;
    const open = ramp(p, .02, .1) * (1 - ramp(p, .8, .88));
    const draw = ramp(p, .88, .98);
    const band = (p - .08) / (.8 - .08), stage = clamp(Math.floor(band * 7), 0, 6);
    const gap = lerp(.42, 2.35, open);
    let activeY = 0;
    plates.forEach((plate, i) => {
      const focus = open > .5 ? clamp(1 - Math.abs(band * 7 - (i + .5)) * .9) : 0;
      plate.g.position.y = i * gap + focus * .35;
      plate.g.position.x = Math.sin(i * 1.7) * .25 * open - focus * .25;
      plate.g.rotation.y = (i - 3) * .05 * open + (reduce ? 0 : Math.sin(t * .4 + i) * .02) - focus * .12;
      plate.rimMat.emissiveIntensity = .15 + focus * 1.1 + draw * .5;
      plate.props.visible = open > .02;
      plate.props.scale.setScalar(Math.max(.001, ramp(open, .2 + i * .04, .7 + i * .04)));
      if (i === stage) activeY = plate.g.position.y;
    });
    const P = plates.map(pl => pl.parts); // idle life on the props
    if (P[0].lens) P[0].lens.rotation.y = Math.sin(t * .8) * .3;
    if (P[3].graph) P[3].graph.position.y = Math.sin(t * 1.2) * .08;
    if (P[4].gears) { P[4].gears[0].rotation.y = t * .8; P[4].gears[1].rotation.y = -t * 1.16; }
    if (P[4].arrow) P[4].arrow.position.x = 1.5 + Math.sin(t * 2) * .12;
    if (P[5].bars) P[5].bars.forEach((b, k) => { b.scale.y = .7 + .3 * ramp(band * 7 - 5, 0, .8) + Math.sin(t * 2 + k) * .02; });
    if (P[6].glass) P[6].glass.material.emissiveIntensity = 1.8 + Math.sin(t * 3) * .6;
    // the signature: faint on the closed case, hidden while open, drawn step by step at the end
    const closedTop = 6 * gap + H + .06;
    signature.position.set(0, closedTop, 0);
    signature.rotation.y = stack.rotation.y;
    signature.visible = open < .3;
    const reveal = p < .5 ? 1 : draw * 7;
    sigNodes.forEach((n, i) => { const k = clamp(reveal - i); n.scale.setScalar(Math.max(.001, k)); n.material.emissiveIntensity = p < .5 ? .5 : 1.4 + Math.sin(t * 3 + i) * .3; });
    sigLinks.forEach((l, i) => { const k = clamp(reveal - i - .5); l.scale.y = Math.max(.001, k); l.visible = k > 0; });
    sigGlow.material.opacity = draw * (.55 + Math.sin(t * 2) * .15);
    stack.rotation.y = (reduce ? 0 : t * .05) + p * 1.2;
    pool.material.opacity = .08 + draw * .08;
    watchers.forEach(w => w.update(t, 0));

    // camera: wide on the closed case, tracking the open layer, high over the signature at the end
    const followY = lerp(1.6, activeY + 1.2, open);
    target.set(0, lerp(followY, closedTop, draw), 0);
    const radius = lerp(lerp(17, 15.5, open), 12, draw) * (aspect < 1 ? 1.75 : aspect < 1.4 ? 1.22 : 1);
    const az = .5 + p * .9, el = lerp(lerp(.42, .36, open), .95, draw);
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * radius, target.y + Math.sin(el) * radius, target.z + Math.cos(az) * Math.cos(el) * radius);
    camera.lookAt(target);
    fitCamera(camera, rect, { shift: aspect > 1.15 ? -.06 : 0, lift: aspect < 1 ? -.05 : 0, fov: aspect < 1 ? 48 : 34 });
    onProject(plates.map((plate, i) => {
      v.copy(plate.anchor); plate.g.localToWorld(v);
      const s = toView(v, camera, rect), o = open * (i === stage ? 1 : .35);
      return { ...s, opacity: o, visible: o > .02 && s.front && s.inside, active: i === stage };
    }), { stage, open, draw, signature: toView(signature.getWorldPosition(v).add(new THREE.Vector3(W * .4, 0, 0)), camera, rect) });
  }
  setTheme();
  return { scene, camera, update, setTheme };
}
