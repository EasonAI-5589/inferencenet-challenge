/* metacase-cards.js — small 3D pictures for the homepage cards, in the same toy kit
 * and light as the chapters: the tracks, the two kinds of reader, the invitation, the three
 * kinds of contribution and the benchmark snapshot. Each is a looping vignette drawn by the
 * shared stage. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { PALETTE, BOOK, mat, add, block, cyl, ball, tile, volume, robot, person, buildings, tree, island, crane, scaffold, bookStack, lights, STAGE_COLORS, rbox, closedBook, bookTabs, modelCore, wrench, lens, terminal, toolbox, dossier } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, fitCamera, glowSprite } from './mc-stage.js';

const loopPhase = (t, period, offset = 0) => ((t + offset) % period) / period;

// A standing Metacase: the closed book with its tabs, cover to the viewer.
function standingBook(g, sig, scale) {
  const holder = new THREE.Group(); holder.scale.setScalar(scale); g.add(holder);
  const book = closedBook(); bookTabs(book, sig);
  book.rotation.x = Math.PI / 2; book.position.set(-BOOK.PW / 2, BOOK.PD / 2, -(BOOK.T + BOOK.BOARD * 2) / 2); holder.add(book);
  return holder;
}
const plinth = (g, x = 0, r = .9) => { cyl(g, r, r * 1.08, .3, PALETTE.stone, x, 0, 0, 32); add(g, new THREE.TorusGeometry(r * 1.02, .03, 6, 48), mat(0xd8b46a, { rough: .35 }), x, .3, 0, false).rotation.x = Math.PI / 2; };

const BUILDERS = {
  // A · a Metacase: the record of a case, its five stages on the fore-edge
  metacase(g) {
    plinth(g);
    const book = standingBook(g, 2, .62); book.position.y = .3;
    const halo = glowSprite(0xffe7b8, 2.4, .2); halo.position.set(.8, 1.3, .2); g.add(halo);
    return t => { book.rotation.y = -.45 + Math.sin(t * .5) * .25; halo.material.opacity = .18 + Math.sin(t * 2) * .05; };
  },
  // B · a Model & Harness: the agent, the model's core above it, the harness's tools and toolbox
  harness(g) {
    plinth(g, 0, 1.2);
    const bot = robot(0xf7f5f0); bot.root.scale.setScalar(1.15); bot.root.position.set(-.35, .3, 0); g.add(bot.root);
    const core = modelCore(PALETTE.violet); core.root.position.set(-.35, 1.95, 0); g.add(core.root);
    const box = toolbox(PALETTE.rose); box.root.scale.setScalar(.8); box.root.position.set(.75, .3, .25); box.root.rotation.y = -.5; box.lid.rotation.x = -1.1; g.add(box.root);
    const w = wrench(), l = lens(); w.position.set(-1.05, 1.2, .1); l.position.set(.25, 1.25, .1); g.add(w, l);
    return t => { bot.update(t, 0); core.ring.rotation.z = t * 1.2; core.root.position.y = 1.95 + Math.sin(t * 1.6) * .05; w.rotation.z = .4 + Math.sin(t * 1.3) * .15; l.rotation.z = -.3 + Math.sin(t * 1.1 + 1) * .15; g.rotation.y = -.25 + Math.sin(t * .3) * .12; };
  },
  // C · a Failure Case: the dossier, the failing step marked, a lens over it
  failure(g) {
    plinth(g, 0, 1.1);
    const d = dossier(); d.root.scale.setScalar(1.9); d.root.position.y = .32; d.root.rotation.set(-.12, -.2, 0); g.add(d.root);
    const l = lens(PALETTE.amber); l.scale.setScalar(2.2); g.add(l);
    return t => { l.position.set(.1 + Math.sin(t * .7) * .18, 1.15 + Math.sin(t * 1.4) * .05, .45); l.rotation.set(-.9, 0, -.4); d.pin.position.y = .02 + Math.abs(Math.sin(t * 2)) * .04; };
  },
  // the hundred tasks: a long row of volumes and a stack beside it
  tasks(g) {
    for (let k = 0; k < 14; k++) { const v = volume({ color: [PALETTE.teal, 0x3c9d98, 0x57c2bd][k % 3], sig: k % 5 }); v.scale.setScalar(1.4); v.position.set(-1.25 + k * .2, 0, 0); v.rotation.y = -Math.PI / 2; g.add(v); }
    const stack = bookStack(4, 1); stack.position.set(1.95, 0, .2); stack.scale.setScalar(1.3); g.add(stack);
    return t => { g.rotation.y = -.2 + Math.sin(t * .3) * .08; };
  },
  // the models: a row of agents, each a different model
  models(g) {
    const bots = [0xf7f5f0, PALETTE.amber, PALETTE.teal, PALETTE.violet].map((c, k) => { const b = robot(c); b.root.position.set(-1.35 + k * .9, 0, (k % 2) * .25); b.root.scale.setScalar(.9); g.add(b.root); return b; });
    return t => { bots.forEach((b, k) => { b.update(t + k, 0); b.root.position.y = Math.abs(Math.sin(t * 2 + k)) * .04; }); };
  },
  // the harnesses: an open toolbox, a terminal and the tools they lend
  harnesses(g) {
    const box = toolbox(PALETTE.rose); box.root.position.set(-.55, 0, 0); box.root.rotation.y = .35; box.lid.rotation.x = -1.2; g.add(box.root);
    const term = terminal(); term.root.position.set(.8, 0, -.1); term.root.scale.setScalar(1.6); term.root.rotation.y = -.35; g.add(term.root);
    const w = wrench(), l = lens(); w.scale.setScalar(1.6); l.scale.setScalar(1.6); g.add(w, l);
    return t => { w.position.set(-.75, 1.1 + Math.sin(t * 1.5) * .06, .2); w.rotation.z = .5; l.position.set(-.25, 1.15 + Math.sin(t * 1.5 + 1.2) * .06, .25); l.rotation.z = -.4; term.screen.material.emissiveIntensity = .5 + Math.sin(t * 4) * .15; };
  },
  // economics: data points pulled into a fitted line on the economics island
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
  // finance: a ledger reconciled line by line
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
  // social science: a survey answered by the people around the hall
  social(g) {
    const isl = island({ radius: 2.1, grass: 0xd6cff5, seed: 8 }); g.add(isl);
    const b = buildings.social(PALETTE.violet); b.scale.setScalar(.7); b.position.set(-.5, 0, -.6); g.add(b);
    const crowd = [0, 1, 2].map(k => { const p = person(60 + k); p.root.scale.setScalar(.75); p.root.position.set(.3 + k * .55, 0, 1.1 - k * .15); p.root.rotation.y = -.4; g.add(p.root); return p; });
    const bars = new THREE.Group(); bars.position.set(.9, 2.3, -.1); g.add(bars);
    block(bars, 1.7, 1.2, .05, 0xf7f5f0, 0, -.6, -.06, .02);
    const cols = [.35, .7, .5, .9].map((h, k) => ({ h, m: block(bars, .22, 1, .06, [PALETTE.violet, PALETTE.sky, PALETTE.violet, PALETTE.rose][k], -.5 + k * .33, -.45, 0, .01) }));
    return (t) => {
      const u = loopPhase(t, 6);
      cols.forEach((c, k) => { const s = Math.max(.02, c.h * smooth((u - k * .12) / .3) * (1 - smooth((u - .9) / .1))); c.m.scale.y = s; });
      crowd.forEach((p, k) => p.update(t + k, 0));
      g.rotation.y = .2 + Math.sin(t * .25) * .1;
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
  // the invitation: contributors bring new cases to the shelves, and the room fills as they arrive
  join(g) {
    add(g, new THREE.CylinderGeometry(3.5, 3.6, .2, 56), mat(0x6e5440), 0, -.1, 0).castShadow = false;
    add(g, new THREE.CylinderGeometry(1.8, 1.8, .02, 48), mat(0x34436e), .3, .01, .9, false);
    const shelf = new THREE.Group(); shelf.position.z = -1.3; g.add(shelf);
    const BW = 1.25, H = 2.2, ROWS = [.14, .86, 1.58], FIELDS = [PALETTE.teal, PALETTE.amber, PALETTE.violet];
    const open = [];
    FIELDS.forEach((c, i) => {
      const x0 = (i - 1) * BW;
      block(shelf, BW, H, .1, PALETTE.ink, x0, 0, -.26, .02);
      [-1, 1].forEach(s => block(shelf, .07, H, .54, 0x7a5a42, x0 + s * (BW / 2 - .035), 0, 0, .02));
      block(shelf, BW + .06, .12, .6, mat(c, { emissive: c, intensity: .22 }), x0, H, 0, .03);
      ROWS.forEach((y, r) => {
        block(shelf, BW - .07, .04, .5, 0x8a6a4a, x0, y - .04, 0, .01).castShadow = false;
        let x = x0 - BW / 2 + .09, k = 0;
        while (x < x0 + BW / 2 - .22) {
          const w = [.1, .12, .11, .13][(k + r + i) % 4], h = [.46, .52, .5, .42][(k * 3 + r + i) % 4];
          if (r === 2 - (i % 2) && k >= 4) open.push({ x: x + w / 2, y, w, h, c }); // room still to fill
          else block(shelf, w, h, .34, mat(new THREE.Color(c).lerp(new THREE.Color(0x1a1d26), [.1, .3, 0, .2][(k + r) % 4]).getHex()), x + w / 2, y, .04, .01).castShadow = false;
          x += w + .006; k++;
        }
      });
    });
    open.forEach(o => { block(shelf, o.w, o.h, .34, mat(0xdfe6ff, { opacity: .14 }), o.x, o.y, .04, .01).castShadow = false; });
    const arrivals = open.map(o => { const m = block(shelf, o.w, o.h, .34, mat(o.c, { emissive: o.c, intensity: .3 }), o.x, o.y, .04, .01); m.castShadow = false; return m; });
    const glow = glowSprite(0xffe2b0, 5, .12); glow.position.set(0, 1.6, -.6); g.add(glow);
    // two people and an agent, each bringing one case at a time
    const carriers = [0, 1, 2].map(j => {
      const c = j === 2 ? robot(0xf7f5f0) : person(70 + j * 5, { carry: PALETTE.cream });
      if (c.load) c.load.visible = false;
      c.root.scale.setScalar(.72); g.add(c.root);
      const book = volume({ color: FIELDS[j], sig: j }); book.scale.setScalar(.75); book.rotation.y = Math.PI / 2;
      book.position.set(0, j === 2 ? .55 : .5, .3); c.root.add(book);
      return { c, book, from: new THREE.Vector3(-3.4, 0, 1.2 + j * .55), to: new THREE.Vector3(3.4, 0, 1.6 - j * .4) };
    });
    const P = 9, STEP = 3, at = new THREE.Vector3(), next = new THREE.Vector3(), slot = new THREE.Vector3();
    return (t) => {
      // one delivery every STEP seconds; after twelve the shelves hold a moment, then begin again
      const done = (Math.floor(Math.max(0, t - 1.5) / STEP) + (t >= 1.5 ? 1 : 0)) % (open.length + 1);
      arrivals.forEach((m, n) => { const k = n < done ? 1 : 0; m.scale.setScalar(Math.max(.001, lerp(m.scale.x, k, .12))); m.visible = m.scale.x > .01; });
      carriers.forEach(({ c, book, from, to }, j) => {
        const u = (((t - STEP * j + 3) % P) + P) % P / P, n = STEP * Math.floor((t - STEP * j + 3) / P) + j;
        const o = open[n % (open.length + 1)] || open[open.length - 1];
        slot.set(o.x, 0, shelf.position.z + .55);
        if (u < .5) { at.copy(from).lerp(slot, smooth(u / .5)); next.copy(slot); }
        else if (u < .58) { at.copy(slot); next.copy(slot).add(new THREE.Vector3(0, 0, -1)); }
        else { at.copy(slot).lerp(to, smooth((u - .58) / .42)); next.copy(to); }
        c.root.position.copy(at);
        if (next.distanceToSquared(at) > 1e-4) c.root.rotation.y = Math.atan2(next.x - at.x, next.z - at.z);
        c.root.visible = u > .02 && u < .98;
        book.visible = u < .5;
        c.update(t, u < .5 || u > .58 ? 1 : 0);
      });
      glow.material.opacity = .12 + .04 * Math.sin(t * 1.5);
      g.rotation.y = Math.sin(t * .2) * .1;
    };
  },
};
const FRAMING = { // camera target y, distance, elevation[, always show the full width]
  replication: [1.3, 10, .3], business: [1.4, 10, .3], social: [1.4, 10, .3], next: [1.2, 9.5, .32],
  ai: [1.4, 8.5, .22], people: [1.1, 8, .22], join: [1.1, 10, .34, true],
  metacase: [1.0, 7.4, .2], harness: [1.0, 8, .2], failure: [.7, 6.6, .45],
  tasks: [.4, 6.2, .3, true], models: [.6, 6.4, .25, true], harnesses: [.6, 6.2, .3, true],
};

export function createCard(kind) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const l = lights(scene, { span: 7, shadowSize: 512 });
  l.key.position.set(-4, 9, 7);
  const g = new THREE.Group(); scene.add(g);
  const step = BUILDERS[kind](g);
  const [ty, dist, el, whole = false] = FRAMING[kind];
  const target = new THREE.Vector3(0, ty, 0);
  // the picture's half-width: a tall, narrow card (and the invitation, always) shows all of
  // it from side to side; elsewhere the hand-set framing may crop it on purpose
  step(0); g.updateMatrixWorld(true);
  const box = new THREE.Box3();
  g.traverse(o => { if (o.isMesh) box.expandByObject(o); });
  const half = Math.max(-box.min.x, box.max.x);
  return {
    scene, camera,
    update(dt, t, p, rect) {
      step(t);
      const narrow = rect.width / rect.height < 1.1;
      const across = Math.tan(Math.PI / 12) * rect.width / Math.max(1, rect.height); // tan of half the horizontal field of view
      const d = Math.max(dist * (narrow ? 1.15 : 1), whole || narrow ? half / across / .94 + half * Math.sin(el) : 0);
      camera.position.set(0, ty + Math.sin(el) * d, Math.cos(el) * d);
      camera.lookAt(target);
      fitCamera(camera, rect, { fov: 30 });
    },
  };
}
