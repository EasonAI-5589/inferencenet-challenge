/* metacase-world.js — the Metacase network as an archipelago. Each field is a floating island
 * holding its own Metacases; where cases share a structure, their tiles form a bridge
 * between islands; people and agents carry experience across; fields still to come
 * are islands under construction. Used twice: the hero (ambient) and the network
 * chapter (scroll-driven: own cases → bridges → crossing → new fields). */
import * as THREE from '../assets/vendor/three/three.module.js';
import { PALETTE, mat, add, block, cyl, person, robot, buildings, tree, island, cloud, tile, crane, scaffold, lights, STAGE_COLORS } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitCamera, toView, glowSprite } from './mc-stage.js';

export const FIELDS = [
  { key: 'economics', accent: PALETTE.teal, pos: [-10, 0, -3], r: 3.4, now: true },
  { key: 'finance', accent: PALETTE.amber, pos: [-1.5, 1.2, -10.5], r: 3.2, now: true },
  { key: 'business', accent: PALETTE.sky, pos: [9.5, .5, -7], r: 3.2, now: true },
  { key: 'healthcare', accent: PALETTE.rose, pos: [11.5, -.6, 4], r: 3.2, now: false },
  { key: 'policy', accent: PALETTE.violet, pos: [1.5, -.8, 11], r: 3.1, now: false },
  { key: 'law', accent: PALETTE.green, pos: [-11, .3, 7.5], r: 3.1, now: false },
];
const HUB = { pos: [0, 2.4, 0], r: 3 };
// [from, to, signature, built now?] — `6` is the hub
const BRIDGES = [[0, 1, 1, true], [1, 2, 2, true], [0, 6, 3, true], [2, 6, 0, true], [1, 6, 4, true], [2, 3, 2, false], [0, 5, 4, false], [6, 4, 1, false]];
const SHOTS = [ // [progress, target (string = field index or 'hub' or 'walker'), radius, azimuth, elevation]
  [0, 0, 17, .9, .36], [.22, 0, 15, 1.2, .32],
  [.32, 'centre', 32, 1.25, .55], [.48, 'centre', 30, 1.6, .5],
  [.56, 'walker', 9, 2.0, .32], [.72, 'walker', 9, 2.3, .3],
  [.82, 'world', 52, 2.45, .66], [1, 'world', 56, 2.75, .62],
];

function grassFor(accent) { return new THREE.Color(0x9fd6a8).lerp(new THREE.Color(accent), .3).getHex(); }
function skyDome() {
  const geo = new THREE.SphereGeometry(160, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x05070e) }, horizon: { value: new THREE.Color(0x141a33) } },
    vertexShader: 'varying float vY;void main(){vY=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float vY;uniform vec3 top;uniform vec3 horizon;void main(){gl_FragColor=vec4(mix(horizon,top,smoothstep(-.1,.6,vY)),1.);\n#include <colorspace_fragment>\n}',
  });
  return new THREE.Mesh(geo, m);
}

export function createWorld({ mode = 'hero', onProject = () => {}, reduce = false } = {}) {
  const story = mode === 'story';
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 400);
  const sky = skyDome(); scene.add(sky);
  const light = lights(scene, { span: 30, shadowSize: 2048 });
  light.key.position.set(-14, 30, 18);
  const random = (() => { let s = 11; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

  // a sea of clouds below the islands
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let i = 0; i < 70; i++) {
    const c = cloud(1.1 + random() * 1.6), a = random() * Math.PI * 2, d = 8 + random() * 44;
    c.position.set(Math.cos(a) * d, -11 - random() * 3, Math.sin(a) * d); c.rotation.y = random() * 6; clouds.add(c);
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 1500 }, () => (random() - .5) * 280).map((v, i) => (i % 3 === 1 ? Math.abs(v) * .6 + 20 : v)), 3)),
    new THREE.PointsMaterial({ color: 0xc8d4ff, size: .35, transparent: true, opacity: .6, depthWrite: false, sizeAttenuation: true }));
  scene.add(stars);

  /* ---- islands ---- */
  const walkers = [];
  const islands = FIELDS.map((f, i) => {
    const g = new THREE.Group(); g.position.set(...f.pos); scene.add(g);
    const body = island({ radius: f.r, grass: grassFor(f.accent), seed: i + 3 }); g.add(body);
    const b = buildings[f.key](f.accent); b.position.set(0, 0, -.5); b.scale.setScalar(.95); g.add(b);
    b.lookAt(-f.pos[0] * 10, 0, -f.pos[2] * 10); // face the hub
    const pile = new THREE.Group(); pile.position.set(f.r * .5, 0, f.r * .25); g.add(pile); // the Metacases this field holds
    for (let k = 0; k < (f.now ? 4 : 1); k++) { const t = tile({ sig: (i + k) % 5, edge: f.accent, size: .42 }); t.position.y = k * .13; t.rotation.y = k * .35; pile.add(t); }
    for (let k = 0; k < 4; k++) { const t = tree(.7 + random() * .4); const a = random() * Math.PI * 2, d = f.r * (.55 + random() * .3); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(t); }
    let rig = null;
    if (!f.now) { // still under construction
      const sc = scaffold(2.3, 2.1, 1.7); sc.position.copy(b.position); sc.rotation.copy(b.rotation); g.add(sc);
      rig = crane(); rig.root.position.set(-f.r * .55, 0, f.r * .3); rig.root.rotation.y = random() * 6; g.add(rig.root);
      const hang = tile({ sig: i % 5, edge: f.accent, size: .4 }); rig.hook.add(hang); hang.position.y = -.15;
    }
    for (let k = 0; k < 3; k++) {
      const p = person(i * 3 + k, { hardHat: !f.now }); g.add(p.root);
      walkers.push({ p, r: f.r * (.45 + k * .12), speed: .3 + k * .07, phase: k * 2.1 + i, walk: k !== 2 });
    }
    return { f, g, rig, top: new THREE.Vector3(...f.pos).add(new THREE.Vector3(0, 3.8, 0)) };
  });

  /* ---- the hub: an archive tower that grows tile by tile ---- */
  const hub = new THREE.Group(); hub.position.set(...HUB.pos); scene.add(hub);
  hub.add(island({ radius: HUB.r, grass: 0xc9c2ef, seed: 21, sides: 12 }));
  cyl(hub, 1.25, 1.4, .3, PALETTE.stone, 0, 0, 0, 24);
  const tower = new THREE.Group(); tower.position.y = .3; hub.add(tower);
  const towerTiles = [];
  for (let k = 0; k < 26; k++) {
    const t = tile({ sig: k % 5, edge: [PALETTE.teal, PALETTE.amber, PALETTE.sky, PALETTE.rose, PALETTE.violet, PALETTE.green][k % 6], size: .55 });
    const a = k * 1.1; t.position.set(Math.cos(a) * .32, k * .155, Math.sin(a) * .32); t.rotation.y = -a; tower.add(t); towerTiles.push(t);
  }
  const beacon = glowSprite(0xb5a8ff, 3.2, .8); tower.add(beacon);
  const beam = add(tower, new THREE.CylinderGeometry(.05, .05, 30, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xb5a8ff, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, 0, false);

  /* ---- bridges made of tiles that share one signature ---- */
  const anchor = i => (i === 6 ? new THREE.Vector3(...HUB.pos) : new THREE.Vector3(...FIELDS[i].pos));
  const radius = i => (i === 6 ? HUB.r : FIELDS[i].r);
  const bridges = BRIDGES.map(([a, b, sig, built], j) => {
    const A = anchor(a), B = anchor(b), dir = B.clone().sub(A).setY(0).normalize();
    const start = A.clone().add(dir.clone().multiplyScalar(radius(a) * .92)), end = B.clone().sub(dir.clone().multiplyScalar(radius(b) * .92));
    const dist = start.distanceTo(end), n = Math.max(3, Math.floor(dist / .95)), edge = a === 6 ? FIELDS[b].accent : FIELDS[a].accent;
    const at = u => start.clone().lerp(end, u).add(new THREE.Vector3(0, Math.sin(u * Math.PI) * dist * .08, 0));
    const group = new THREE.Group(); scene.add(group);
    const tiles = Array.from({ length: n }, (_, k) => {
      const u = (k + .5) / n, p = at(u), q = at(Math.min(1, u + .01)), t = tile({ sig, edge, size: .58, glow: 1.1 });
      t.position.copy(p); t.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), q.sub(p).normalize()); group.add(t);
      return { t, home: p.clone(), q: t.quaternion.clone() };
    });
    const ropeMat = new THREE.LineBasicMaterial({ color: 0xd9c9a8, transparent: true, opacity: .8 });
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    [-1, 1].forEach(sd => {
      const pts = Array.from({ length: 33 }, (_, k) => at(k / 32).add(side.clone().multiplyScalar(sd * .42)).add(new THREE.Vector3(0, .42 - Math.sin(k / 32 * Math.PI * 6) * .04, 0)));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat));
      for (let k = 0; k <= 4; k++) cyl(group, .025, .025, .42, 0x8a6a4a, ...at(k / 4).add(side.clone().multiplyScalar(sd * .42)).toArray(), 6);
    });
    return { a, b, sig, built, tiles, at, group, edge, n };
  });
  const builtBridges = bridges.filter(b => b.built), formingBridges = bridges.filter(b => !b.built);

  // travellers: people carrying cases and agents crossing the built bridges
  const travellers = Array.from({ length: 6 }, (_, k) => {
    const br = builtBridges[k % builtBridges.length], agent = k % 3 === 2;
    const who = agent ? robot(0xf7f5f0) : person(30 + k, { carry: br.edge });
    who.root.scale.setScalar(.85); scene.add(who.root);
    return { who, br, speed: .05 + (k % 3) * .012, offset: k * .27, agent };
  });
  const guide = travellers[2]; // the agent the camera follows across in the story

  // falling tiles leave a short glow as they drop into place
  const sparks = Array.from({ length: 4 }, () => { const s = glowSprite(0xffffff, 1.8, 0); scene.add(s); return s; });

  const target = new THREE.Vector3(), centre = new THREE.Vector3(0, 1, -3), world = new THREE.Vector3(0, 0, 0);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; pointer.ty = e.clientY / innerHeight - .5; }, { passive: true });

  function place(t, k, n, appear, now) { // a tile drops from above onto its slot
    const fall = 1 - smooth(appear);
    t.t.visible = appear > .001;
    t.t.position.copy(t.home).add(new THREE.Vector3(0, fall * 9, 0));
    t.t.rotation.setFromQuaternion(t.q); t.t.rotateY(fall * 3);
    t.t.scale.setScalar(Math.max(.001, smooth(appear * 3)));
  }
  function shotAt(p) {
    let i = 0; while (i < SHOTS.length - 2 && p > SHOTS[i + 1][0]) i++;
    const A = SHOTS[i], B = SHOTS[i + 1], k = smooth((p - A[0]) / (B[0] - A[0]));
    const pos = s => s === 'centre' ? centre : s === 'world' ? world : s === 'walker' ? guide.who.root.position.clone().add(new THREE.Vector3(0, 1, 0)) : islands[s].g.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    target.copy(pos(A[1])).lerp(pos(B[1]), k);
    return { r: Math.exp(lerp(Math.log(A[2]), Math.log(B[2]), k)), az: lerp(A[3], B[3], k), el: lerp(A[4], B[4], k) };
  }

  function update(dt, t, p, rect) {
    const narrow = rect.width / rect.height < 1;
    pointer.x += (pointer.tx - pointer.x) * .04; pointer.y += (pointer.ty - pointer.y) * .04;
    clouds.rotation.y = t * .006;
    walkers.forEach(w => {
      const a = w.phase + t * w.speed * (w.walk ? 1 : 0);
      w.p.root.position.set(Math.cos(a) * w.r, 0, Math.sin(a) * w.r);
      w.p.root.rotation.y = w.walk ? -a : -a + Math.PI / 2;
      w.p.update(t, w.walk ? 1 : 0);
    });
    islands.forEach((is, i) => { // islands bob gently; future fields rise in the story's last chapter
      const rise = story && !is.f.now ? ramp(p, .76, .9) : 1;
      is.g.visible = rise > .01;
      is.g.position.y = is.f.pos[1] + Math.sin(t * .5 + i) * .12 - (1 - rise) * 16;
      if (is.rig) { is.rig.jib.rotation.y = Math.sin(t * .3 + i) * .6; is.rig.hook.position.y = -1.2 - Math.sin(t * .8 + i) * .4; is.rig.cable.scale.y = 1.2 + Math.sin(t * .8 + i) * .4; is.rig.cable.position.y = -is.rig.cable.scale.y / 2; }
    });
    hub.position.y = HUB.pos[1] + Math.sin(t * .4) * .1;
    const towerShown = story ? 6 + Math.round(ramp(p, .5, .95) * 20) : 26;
    towerTiles.forEach((tt, k) => { tt.visible = k < towerShown; });
    tower.rotation.y = t * .15;
    beacon.position.y = towerShown * .155 + .6; beacon.material.opacity = .55 + Math.sin(t * 2) * .2;
    beam.position.y = beacon.position.y + 15; beam.material.opacity = story ? .08 + ramp(p, .5, .7) * .12 : .16;

    // bridges: the built ones assemble in chapter two of the story; the forming ones loop in the hero
    let spark = 0;
    builtBridges.forEach((br, j) => br.tiles.forEach((tt, k) => {
      const appear = story ? clamp((p - .24 - (j * br.n + k) / (builtBridges.length * 14) * .2) / .03) : 1;
      place(tt, k, br.n, appear);
      if (appear > 0 && appear < 1 && spark < sparks.length) { sparks[spark].position.copy(tt.t.position); sparks[spark].material.color.set(br.edge); sparks[spark++].material.opacity = .9 * (1 - appear); }
    }));
    formingBridges.forEach((br, j) => br.tiles.forEach((tt, k) => {
      const cycle = (t * .09 + j * .33) % 1.25;
      const appear = story ? clamp((p - .84 - k / br.n * .14) / .02) : clamp((cycle - k / br.n * .9) / .06) * (1 - smooth((cycle - 1.12) / .1));
      place(tt, k, br.n, appear * (story ? ramp(p, .76, .9) : 1));
      if (appear > 0 && appear < 1 && spark < sparks.length) { sparks[spark].position.copy(tt.t.position); sparks[spark].material.color.set(br.edge); sparks[spark++].material.opacity = .9 * (1 - appear); }
    }));
    for (; spark < sparks.length; spark++) sparks[spark].material.opacity = 0;

    // travellers walk to and fro; in the story the agent's crossing follows the scroll
    travellers.forEach(tr => {
      let u = (t * tr.speed + tr.offset) % 2, dirn = 1;
      if (u > 1) { u = 2 - u; dirn = -1; }
      if (story && tr === guide) { u = ramp(p, .52, .74); dirn = 1; }
      const on = story ? (tr === guide ? ramp(p, .48, .52) : ramp(p, .5, .56)) : 1;
      tr.who.root.visible = on > .5;
      const pos = tr.br.at(.04 + u * .92), next = tr.br.at(clamp(.04 + u * .92 + .01 * dirn));
      tr.who.root.position.copy(pos).add(new THREE.Vector3(0, .17, 0));
      tr.who.root.rotation.y = Math.atan2(next.x - pos.x, next.z - pos.z);
      tr.who.update(t, 1);
    });

    // camera
    let r, az, el;
    if (story) ({ r, az, el } = shotAt(p));
    else { target.set(1, -.5, -1); r = 54 * (1 - .2 * clamp(window.scrollY / Math.max(1, rect.height))); az = .7 + t * .02 + pointer.x * .25; el = .5 + pointer.y * .08; }
    const stacked = !story && rect.width <= 860; // the hero text sits under the picture
    if (story) r *= narrow ? 1.35 : 1;
    else if (!stacked) r *= Math.max(1, 1.6 * rect.height / rect.width); // keep the islands right of the text
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * r, target.y + Math.sin(el) * r, target.z + Math.cos(az) * Math.cos(el) * r);
    camera.lookAt(target);
    if (stacked) fitCamera(camera, rect, { band: 440, lift: -.08, fov: 40 });
    else if (story) fitCamera(camera, rect, { fov: narrow ? 46 : 36 });
    else fitCamera(camera, rect, { shift: rect.width < 1100 ? .34 : .3, fov: 36 });
    sky.position.copy(camera.position);

    onProject(islands.map((is, i) => {
      const s = toView(is.g.position.clone().add(new THREE.Vector3(0, 3.6, 0)), camera, rect);
      const show = (story ? (is.f.now ? ramp(p, .02, .08) : ramp(p, .84, .9)) : 1) * (s.front && s.inside ? 1 : 0);
      return { ...s, opacity: show, visible: show > .02, active: story && ((p < .3 && i === 0) || (p > .8 && !is.f.now)) };
    }));
  }
  function setTheme() {
    const bg = pageBackground(), lightTheme = document.documentElement.dataset.theme === 'light';
    sky.material.uniforms.top.value.copy(bg);
    sky.material.uniforms.horizon.value.set(lightTheme ? 0xdfe6f5 : 0x141a33);
    scene.fog = new THREE.Fog(bg, 60, 160);
    light.hemi.intensity = lightTheme ? 2.3 : 1.9;
  }
  setTheme();
  return { scene, camera, update, setTheme };
}
