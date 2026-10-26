/* metacase-cards.js — small 3D pictures for the homepage cards, in the same toy kit
 * and light as the chapters: how a run becomes a Metacase, the tracks, the two kinds
 * of reader and the invitation. Each is a looping vignette drawn by the shared stage. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { PALETTE, mat, add, block, cyl, ball, tile, robot, person, buildings, tree, island, crane, scaffold, bookStack, lights, signaturePoints, STAGE_COLORS, rbox } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, fitCamera, glowSprite } from './mc-stage.js';

const loopPhase = (t, period, offset = 0) => ((t + offset) % period) / period;
const pulse = (u, a, b) => smooth((u - a) / .08) * (1 - smooth((u - b) / .08));

const BUILDERS = {
  // a case opens into its seven layers and closes again
  complete(g) {
    const plates = STAGE_COLORS.map((c, i) => {
      const p = new THREE.Group(); g.add(p);
      add(p, rbox(2.2, .14, 1.5, .05), mat(0xf7f5f0), 0, .07, 0);
      add(p, rbox(2.24, .04, 1.54, .02), mat(c, { emissive: c, intensity: .3 }), 0, .05, 0, false);
      return p;
    });
    const top = tile({ sig: 0, edge: PALETTE.violet, size: 1.38 }); g.add(top);
    return (t) => {
      const u = loopPhase(t, 6), open = smooth(u / .28) * (1 - smooth((u - .72) / .22));
      plates.forEach((p, i) => { p.position.y = i * lerp(.15, .5, open); p.rotation.y = (i - 3) * .07 * open; p.position.x = (i - 3) * .08 * open; });
      top.position.y = 7 * lerp(.15, .5, open); top.rotation.y = .2 * open;
      g.rotation.y = -.5 + Math.sin(t * .4) * .15;
    };
  },
  // the reference stays sealed until evaluation
  withheld(g) {
    const inner = tile({ sig: 3, edge: PALETTE.amber, size: 1 }); inner.position.y = .55; g.add(inner);
    const glass = add(g, rbox(2.3, 1.9, 1.7, .12), mat(0xcfe0ff, { opacity: .16, rough: .1 }), 0, 1, 0, false);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 1.9, 1.7)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 }));
    edges.position.y = 1; g.add(edges);
    block(g, 2.5, .18, 1.9, PALETTE.stone, 0, -.05, 0, .05);
    const lock = new THREE.Group(); lock.position.set(0, .75, .95); g.add(lock);
    block(lock, .55, .48, .2, PALETTE.amber, 0, -.3, 0, .08);
    ball(lock, .06, PALETTE.ink, 0, -.1, .11, 8);
    const shackle = add(lock, new THREE.TorusGeometry(.18, .05, 8, 20, Math.PI), mat(PALETTE.slate), 0, .18, 0);
    const light = glowSprite(PALETTE.amber, 2.6, 0); light.position.y = .8; g.add(light);
    return (t) => {
      const u = loopPhase(t, 5), open = pulse(u, .45, .85);
      shackle.position.y = .18 + open * .16; shackle.rotation.y = open * .8;
      inner.position.y = .55 + open * .35; inner.userData.mark.material.emissiveIntensity = .3 + open * 1.4;
      light.material.opacity = open * .7;
      g.rotation.y = -.45 + Math.sin(t * .4) * .12;
    };
  },
  // three different agents, the same case each
  same(g) {
    const tiles = [], bots = [];
    [-1.6, 0, 1.6].forEach((x, i) => {
      cyl(g, .45, .5, .42, PALETTE.stone, x, 0, .55, 24);
      const t = tile({ sig: 2, edge: PALETTE.sky, size: .55 }); t.position.set(x, .5, .55); g.add(t); tiles.push(t);
      const b = robot([0xf7f5f0, PALETTE.amber, PALETTE.teal][i]); b.root.position.set(x, 0, -.55); b.root.scale.setScalar(1.1); g.add(b.root); bots.push(b);
    });
    return (t) => {
      const beat = .6 + Math.max(0, Math.sin(t * 2.4)) * 1.2;
      tiles.forEach((tl, i) => { tl.userData.mark.material.emissiveIntensity = beat; tl.rotation.y = Math.sin(t * .8) * .3; tl.position.y = .5 + Math.sin(t * 2.4) * .04; });
      bots.forEach(b => b.update(t, 0));
      g.rotation.y = Math.sin(t * .35) * .15;
    };
  },
  // every step of the run leaves a trace
  recorded(g) {
    const pts = signaturePoints(0, 4.4, 2.4);
    const stones = pts.map((p, i) => add(g, new THREE.CylinderGeometry(.24, .26, .1, 20), mat(0xf7f5f0, { emissive: STAGE_COLORS[i], intensity: 0 }), p.x, .05, p.z));
    const bot = robot(0xf7f5f0); bot.root.scale.setScalar(.85); g.add(bot.root);
    const rec = new THREE.Group(); g.add(rec);
    block(rec, .36, .26, .22, PALETTE.ink, 0, -.13, 0, .05); cyl(rec, .07, .09, .12, PALETTE.slate, 0, -.06, .14, 12).rotation.x = Math.PI / 2;
    const dot = ball(rec, .04, mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: 2 }), .12, .08, .12, 8);
    const stoneMats = stones.map(s => (s.material = s.material.clone()));
    return (t) => {
      const u = loopPhase(t, 7), along = clamp(u / .85) * 6, k = Math.floor(along), f = along - k;
      const a = pts[Math.min(6, k)], b = pts[Math.min(6, k + 1)];
      bot.root.position.set(lerp(a.x, b.x, f), .1, lerp(a.z, b.z, f));
      bot.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) || 0;
      bot.update(t, u < .85 ? 1 : 0);
      stoneMats.forEach((m, i) => { m.emissiveIntensity = i <= along + .2 ? 1.1 : 0; });
      rec.position.set(bot.root.position.x - .6, 1.6, bot.root.position.z + .8); rec.lookAt(bot.root.position);
      dot.visible = Math.sin(t * 6) > 0;
      g.rotation.y = -.15 + Math.sin(t * .25) * .08;
    };
  },
  // track one: data points pulled into a fitted line on the economics island
  replication(g) {
    const isl = island({ radius: 2.1, grass: 0xa9dccf, seed: 4 }); g.add(isl);
    const b = buildings.economics(PALETTE.teal); b.scale.setScalar(.7); b.position.set(-.6, 0, -.5); g.add(b);
    const chart = new THREE.Group(); chart.position.set(.6, 2.6, .2); g.add(chart);
    const random = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const dots = Array.from({ length: 26 }, () => { const x = random() * 2.4 - 1.2, y = x * .5 + (random() - .5) * .6; return add(chart, new THREE.SphereGeometry(.06, 10, 8), mat(PALETTE.teal, { emissive: PALETTE.teal, intensity: .8 }), x, y, (random() - .5) * .6, false); });
    const line = add(chart, new THREE.CylinderGeometry(.03, .03, 3, 8), mat(0xffffff, { emissive: 0xffffff, intensity: 1.2 }), 0, 0, 0, false);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.8, 1.8, .8)), new THREE.LineBasicMaterial({ color: 0x9aa3b2, transparent: true, opacity: .5 })); chart.add(frame);
    return (t) => {
      const u = loopPhase(t, 6), fit = smooth(u / .5) * (1 - smooth((u - .9) / .1));
      line.rotation.z = Math.PI / 2 - lerp(-.3, Math.atan(.5), fit);
      dots.forEach((d, i) => d.scale.setScalar(.6 + .5 * clamp(fit * 26 - i)));
      chart.rotation.y = -.35 + Math.sin(t * .4) * .1;
      g.rotation.y = .3 + Math.sin(t * .25) * .1;
    };
  },
  // track two: a ledger reconciled line by line
  business(g) {
    const isl = island({ radius: 2.1, grass: 0xe8d49a, seed: 6 }); g.add(isl);
    const b = buildings.finance(PALETTE.amber); b.scale.setScalar(.7); b.position.set(-.5, 0, -.6); g.add(b);
    const books = bookStack(4); books.position.set(1.3, 0, .6); g.add(books);
    const sheets = [0, 1, 2].map(k => {
      const s = new THREE.Group(); s.position.set(.7 + k * .25, 2.2 + k * .55, -.2 - k * .2); g.add(s);
      block(s, 1.5, .9, .04, 0xf7f5f0, 0, -.45, 0, .02);
      for (let r = 0; r < 4; r++) block(s, .9, .06, .02, PALETTE.slate, -.15, .3 - r * .2 - .45 + .45, .03, .01);
      const check = new THREE.Group(); check.position.set(.55, 0, .05); s.add(check);
      const c1 = block(check, .18, .06, .03, PALETTE.green, -.05, -.05, 0, .01); c1.rotation.z = -.8;
      const c2 = block(check, .34, .06, .03, PALETTE.green, .08, 0, 0, .01); c2.rotation.z = .9;
      return { s, check };
    });
    return (t) => {
      const u = loopPhase(t, 6);
      sheets.forEach((sh, k) => { sh.check.scale.setScalar(Math.max(.001, smooth((u - .2 - k * .2) / .1) * (1 - smooth((u - .92) / .08)))); sh.s.rotation.y = -.3 + Math.sin(t * .6 + k) * .05; sh.s.position.y = 2.2 + k * .55 + Math.sin(t + k) * .05; });
      g.rotation.y = .25 + Math.sin(t * .25) * .1;
    };
  },
  // next fields: an island under construction
  next(g) {
    const isl = island({ radius: 2.1, grass: 0xd6cff5, seed: 9 }); g.add(isl);
    const sc = scaffold(1.8, 1.6, 1.3); sc.position.set(-.3, 0, -.3); g.add(sc);
    const rig = crane(); rig.root.scale.setScalar(.7); rig.root.position.set(1.1, 0, .5); g.add(rig.root);
    const hang = tile({ sig: 1, edge: PALETTE.violet, size: .5 }); rig.hook.add(hang); hang.position.y = -.2;
    const crew = [0, 1].map(k => { const p = person(50 + k, { hardHat: true }); p.root.scale.setScalar(.8); p.root.position.set(-1 + k * .8, 0, 1.1); g.add(p.root); return p; });
    return (t) => {
      rig.jib.rotation.y = Math.sin(t * .35) * .9;
      const drop = .8 + Math.sin(t * .7) * .5; rig.hook.position.y = -drop; rig.cable.scale.y = drop; rig.cable.position.y = -drop / 2;
      crew.forEach((c, k) => { c.root.position.x = -1 + k * .8 + Math.sin(t * .6 + k) * .4; c.root.rotation.y = Math.cos(t * .6 + k) > 0 ? Math.PI / 2 : -Math.PI / 2; c.update(t, 1); });
      g.rotation.y = -.3 + Math.sin(t * .25) * .1;
    };
  },
  // for AI systems: an agent reasons over aligned structures
  ai(g) {
    const stack = [PALETTE.rose, PALETTE.teal, PALETTE.amber, PALETTE.green].map((c, k) => { const t = tile({ sig: 0, edge: c, size: .8 }); t.position.set(0, 1.7, -k * .38); t.rotation.x = Math.PI / 2; g.add(t); return t; });
    const bot = robot(0xf7f5f0); bot.root.scale.setScalar(1.3); bot.root.position.set(-1.3, 0, 1); bot.root.rotation.y = .9; g.add(bot.root);
    const glow = glowSprite(0x8ff6ff, 3, .3); glow.position.set(0, 1.7, -.4); g.add(glow);
    block(g, 3.4, .12, 2.4, PALETTE.stone, 0, -.12, 0, .05);
    return (t) => {
      stack.forEach((s, k) => { s.position.y = 1.7 + Math.sin(t * 1.5 - k * .5) * .08; s.userData.mark.material.emissiveIntensity = 1 + Math.sin(t * 3 - k) * .5; });
      glow.material.opacity = .25 + Math.sin(t * 3) * .1; bot.update(t, 0);
      g.rotation.y = -.3 + Math.sin(t * .3) * .12;
    };
  },
  // for people: two readers on a bench with an open case
  people(g) {
    block(g, 3.4, .12, 2.4, PALETTE.stone, 0, -.12, 0, .05);
    const bench = new THREE.Group(); bench.position.z = -.3; g.add(bench);
    block(bench, 2, .1, .5, 0xb07f55, 0, .45, 0, .03); [-.85, .85].forEach(x => block(bench, .1, .45, .45, PALETTE.ink, x, 0, 0, .02));
    const readers = [0, 1].map(k => { const p = person(60 + k * 3); p.root.position.set(-.45 + k * .9, .5, -.25); p.root.scale.setScalar(.95); g.add(p.root); return p; });
    const open = new THREE.Group(); open.position.set(0, 1.85, .4); g.add(open);
    STAGE_COLORS.forEach((c, i) => { const pl = add(open, rbox(1.1, .06, .7, .03), mat(0xf7f5f0), 0, i * .12, 0); add(open, rbox(1.12, .02, .72, .01), mat(c, { emissive: c, intensity: .4 }), 0, i * .12 - .02, 0, false); pl.rotation.y = (i - 3) * .06; });
    return (t) => {
      readers.forEach((r, k) => r.update(t + k, 0));
      open.rotation.y = Math.sin(t * .6) * .4; open.position.y = 1.85 + Math.sin(t * 1.2) * .05;
      g.rotation.y = .3 + Math.sin(t * .3) * .1;
    };
  },
  // the invitation: people carry cases onto a bridge that grows toward the archive
  join(g) {
    const isl = island({ radius: 2.4, grass: 0xbfe8e4, seed: 12 }); isl.position.set(-3.2, 0, 0); g.add(isl);
    const hub = island({ radius: 1.8, grass: 0xc9c2ef, seed: 14 }); hub.position.set(3.6, .6, -1); g.add(hub);
    const tower = new THREE.Group(); tower.position.set(3.6, .6, -1); g.add(tower);
    for (let k = 0; k < 12; k++) { const t = tile({ sig: k % 5, edge: [PALETTE.teal, PALETTE.amber, PALETTE.sky, PALETTE.rose, PALETTE.violet, PALETTE.green][k % 6], size: .42 }); const a = k * 1.1; t.position.set(Math.cos(a) * .2, k * .12, Math.sin(a) * .2); t.rotation.y = -a; tower.add(t); }
    const beacon = glowSprite(0xb5a8ff, 2.4, .7); beacon.position.set(3.6, 2.4, -1); g.add(beacon);
    const start = new THREE.Vector3(-1, 0, 0), end = new THREE.Vector3(2, .6, -.8), N = 6;
    const slots = Array.from({ length: N }, (_, k) => { const u = (k + .5) / N, p = start.clone().lerp(end, u); p.y += Math.sin(u * Math.PI) * .4; const t = tile({ sig: 2, edge: PALETTE.teal, size: .5 }); t.position.copy(p); t.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), end.clone().sub(start).normalize()); g.add(t); return { t, p }; });
    const carriers = [0, 1, 2].map(k => { const p = person(70 + k, { carry: [PALETTE.teal, PALETTE.amber, PALETTE.rose][k] }); p.root.scale.setScalar(.75); g.add(p.root); return p; });
    return (t) => {
      const u = loopPhase(t, 8), built = Math.floor(clamp(u / .8) * N + 1);
      slots.forEach((s, k) => { s.t.visible = k < built; s.t.position.y = s.p.y + (k === built - 1 ? (1 - smooth((u * N / .8) % 1)) * 1.2 : 0); });
      carriers.forEach((c, k) => { const v = (t * .12 + k / 3) % 1, p = new THREE.Vector3(-4.2, 0, .6).lerp(start.clone().lerp(end, .9 * Math.min(1, built / N)), v); c.root.position.copy(p); c.root.rotation.y = Math.PI / 2; c.update(t, 1); });
      tower.rotation.y = t * .2; beacon.material.opacity = .55 + Math.sin(t * 2) * .2;
      g.rotation.y = Math.sin(t * .2) * .08;
    };
  },
};
const FRAMING = { // camera target y, distance, elevation
  complete: [1.4, 9, .42], withheld: [1, 8, .32], same: [.7, 8, .28], recorded: [.3, 7, .5],
  replication: [1.3, 10, .3], business: [1.4, 10, .3], next: [1.2, 9.5, .32],
  ai: [1.4, 8.5, .22], people: [1.1, 8, .22], join: [1, 13, .3],
};

export function createCard(kind) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const l = lights(scene, { span: 7, shadowSize: 512 });
  l.key.position.set(-4, 9, 7);
  const g = new THREE.Group(); scene.add(g);
  const step = BUILDERS[kind](g);
  const [ty, dist, el] = FRAMING[kind];
  const target = new THREE.Vector3(0, ty, 0);
  return {
    scene, camera,
    update(dt, t, p, rect) {
      step(t);
      const narrow = rect.width / rect.height < 1.1;
      const d = dist * (narrow ? 1.15 : 1);
      camera.position.set(0, ty + Math.sin(el) * d, Math.cos(el) * d);
      camera.lookAt(target);
      fitCamera(camera, rect, { fov: 30 });
    },
  };
}
