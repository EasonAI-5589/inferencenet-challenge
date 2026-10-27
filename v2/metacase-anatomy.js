/* metacase-anatomy.js — The Metacase as a pop-up book. Scroll (0–1) opens the book on a
 * reading desk and turns it through the five stages of a Metacase. Each stage is printed
 * flat on its page: a headline card, a card with its phrase and key lines, and a figure.
 * As the stage begins the cards fold up on their creases, then the figure unfolds from
 * the paper into a small 3D scene that tells the stage; at the end everything folds flat
 * again and the turning leaf carries it over. Each stage leaves a coloured tab on the
 * fore-edge; closed again, the five tab tips trace the book's signature: the shape of how
 * the problem was solved. Rendered by the shared stage (mc-stage.js). */
import * as THREE from '../assets/vendor/three/three.module.js';
import { BOOK, bookTabs, labelPlane, labelTexture, METACASE_LABEL, PALETTE, mat, add, block, cyl, ball, rbox, lights, person, robot, buildings, STAGE_COLORS } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, pageBackground, fitSafe, fitBox, toView, glowSprite } from './mc-stage.js';

const { PW, PD, T, BOARD } = BOOK;             // page width (x), page depth (z), page block, cover board (shared with closedBook)
const CHAPTERS = [.13, .8];                    // where the book is open; one band per stage
const SIG = 0, N = STAGE_COLORS.length;
const band = p => (p - CHAPTERS[0]) / (CHAPTERS[1] - CHAPTERS[0]) * N;
const springy = x => { const p = clamp(x) - 1; return 1 + 2.6 * p * p * p + 1.6 * p * p; }; // eases past 1 and settles
const hex = n => '#' + n.toString(16).padStart(6, '0');
// a stage colour deepened towards the page's ink, for small print on the cream stock
const ink = n => hex([16, 8, 0].reduce((v, k) => v | Math.round(((n >> k) & 255) * .6 + ((0x1f2a3a >> k) & 255) * .4) << k, 0));

// What each stage prints on its page (a title, its keywords and two lines) comes from the
// page's own stage notes, through pages(); the book, the notes and the rail share one text.
const blank = i => ({ title: `${i + 1}`, key: '', lines: [], steps: [] });
// The page layout (book space, z from the head −PD/2 to the tail +PD/2): the headline card
// stands at the back, the phrase card in front of it, the figure in front of both; flat,
// the cards lie towards the head and the figure lies towards the reader, so nothing overlaps.
const HEAD = { w: 2.2, h: .94, z: -.8 }, NOTE = { w: 2.15, h: .6, z: -.44 };
const FIG = { hinge: .66, z: .5, scale: .86 };

/* ---- printed cards ---- */
function printed(w, h, paint) {
  const W = 1024, H = Math.round(W * h / w), c = document.createElement('canvas'); c.width = W; c.height = H;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = () => { const g = c.getContext('2d'); g.clearRect(0, 0, W, H); paint(g, W, H); tex.needsUpdate = true; };
  draw(); document.fonts?.ready.then(draw);
  tex.userData.redraw = draw;
  return tex;
}
function paper(g, W, H) { // cream stock with a warm gilt edge
  g.fillStyle = '#f6efe0'; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 18); g.fill();
  g.strokeStyle = '#d8b46a'; g.lineWidth = 6; g.beginPath(); g.roundRect(12, 12, W - 24, H - 24, 14); g.stroke();
}
function fit(g, text, font, size, maxW) { let s = size; g.font = font(s); while (g.measureText(text).width > maxW && s > 12) { s -= 2; g.font = font(s); } }
const sans = s => `750 ${s}px Inter, Arial, sans-serif`, mono = s => `700 ${s}px "Space Mono", ui-monospace, monospace`;
const headline = (i, text) => (g, W, H) => {
  const col = hex(STAGE_COLORS[i]), { title } = text(i);
  paper(g, W, H);
  g.fillStyle = col; g.beginPath(); g.roundRect(56, 52, 132, 98, 18); g.fill();
  g.fillStyle = '#ffffff'; g.font = mono(62); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1).padStart(2, '0'), 122, 103);
  g.textAlign = 'left'; g.fillStyle = '#1f2a3a'; fit(g, title, sans, 74, W - 280); g.fillText(title, 214, 104);
  g.fillStyle = '#d8b46a'; g.fillRect(56, 182, W - 112, 4);
  g.fillStyle = '#e4dccb'; for (let k = 0; k < 6; k++) g.fillRect(56, 222 + k * 28, (W - 112) * (k % 3 === 2 ? .55 : 1), 8);
  g.fillStyle = col; g.fillRect(12, H - 36, W - 24, 22);
};
const phrase = (i, text) => (g, W, H) => {
  const col = hex(STAGE_COLORS[i]), { key, lines } = text(i), label = key.toUpperCase();
  paper(g, W, H);
  g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = ink(STAGE_COLORS[i]); fit(g, label, mono, 44, W - 110); g.fillText(label, W / 2, 54);
  g.fillStyle = '#d8b46a'; g.fillRect(70, 90, W - 140, 3);
  g.textAlign = 'left';
  lines.forEach((line, k) => {
    g.fillStyle = col; g.fillRect(74, 128 + k * 74, 20, 20);
    g.fillStyle = '#1f2a3a'; fit(g, line, s => `600 ${s}px Inter, Arial, sans-serif`, 54, W - 170); g.fillText(line, 114, 139 + k * 74);
  });
};
// A card hinged along its edge nearest the reader. Flat, it lies on the page towards the
// head with its print facing up; folded up, it stands on the crease facing the reader.
function card(parent, tex, { w, h, z }, lift) {
  const hinge = new THREE.Group(); hinge.position.set(PW / 2, lift, z); parent.add(hinge);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .82, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .08, alphaTest: .5 }));
  face.rotation.x = -Math.PI / 2; face.position.set(0, .004, -h / 2); face.castShadow = face.receiveShadow = true; hinge.add(face);
  add(hinge, rbox(w, .006, h, .003), mat(0xe9dfc8), 0, 0, -h / 2);
  return hinge;
}

/* ---- the five figures, one per stage. Each stands within about ±.85 × ±.45 and under .9
 * high around its origin; tick(t, rise) animates it once it has unfolded. ---- */
const FIGURES = [
  g => { // raw papers, filings and ledgers, and a cutoff that freezes what was known
    for (let k = 0; k < 4; k++) block(g, .5, .028, .6, PALETTE.cream, -.42 + k * .04, k * .032, -.08 + k * .02, .01).rotation.y = k * .12 - .2;
    [.26, .42, .34].forEach((h, k) => block(g, .11, h, .11, STAGE_COLORS[0], .14 + k * .16, 0, -.28, .02));
    block(g, .78, .04, .07, 0xe8dcc4, -.31, 0, .3, .01);                                  // the timeline, known up to the cutoff
    block(g, .62, .04, .07, mat(0x9aa3b2, { opacity: .45 }), .42, 0, .3, .01);            // and greyed out after it
    for (let k = 0; k < 6; k++) block(g, .014, .08, .08, k < 3 ? PALETTE.ink : 0xb8bfcc, -.64 + k * .26, 0, .3, .004);
    const blade = new THREE.MeshStandardMaterial({ color: 0xd8b46a, emissive: 0xd8b46a, emissiveIntensity: .7, roughness: .4 });
    block(g, .03, .62, .3, blade, .09, 0, .3, .01);                                        // the cutoff
    const lens = new THREE.Group(); lens.position.set(-.38, .5, .08); lens.rotation.set(.5, 0, .5); g.add(lens);
    add(lens, new THREE.TorusGeometry(.17, .03, 10, 28), mat(PALETTE.amber));
    add(lens, new THREE.CircleGeometry(.15, 24), mat(0xbfe9ff, { opacity: .45 }), 0, 0, 0, false);
    cyl(lens, .024, .028, .3, PALETTE.ink, 0, -.46, 0, 8);
    return t => { lens.rotation.y = Math.sin(t * .8) * .4; blade.emissiveIntensity = .6 + Math.sin(t * 3) * .25; };
  },
  g => { // institutional practice, candidate routes weighed, flawed ones set aside, one chosen
    const hall = buildings.policy(PALETTE.sky); hall.scale.setScalar(.27); hall.position.set(-.56, 0, -.26); g.add(hall);
    const stand = new THREE.Group(); stand.position.set(.54, 0, -.28); stand.scale.setScalar(.62); g.add(stand);
    cyl(stand, .3, .36, .08, PALETTE.ink, 0, 0, 0, 24); cyl(stand, .035, .045, .72, 0xc9a36e, 0, .08, 0, 10);
    const beam = new THREE.Group(); beam.position.y = .82; stand.add(beam);
    block(beam, 1.3, .05, .06, 0xc9a36e, 0, -.025, 0, .02);
    const pans = [-1, 1].map(s => {
      const pan = new THREE.Group(); pan.position.x = s * .6; beam.add(pan);
      cyl(pan, .01, .01, .26, PALETTE.slate, 0, -.27, 0, 4); cyl(pan, .2, .17, .04, mat(STAGE_COLORS[1]), 0, -.3, 0, 20);
      ball(pan, .06, s > 0 ? PALETTE.amber : PALETTE.slate, 0, -.21, 0, 12);
      return pan;
    });
    const chosen = new THREE.MeshStandardMaterial({ color: STAGE_COLORS[1], emissive: STAGE_COLORS[1], emissiveIntensity: .5, roughness: .6 });
    const cross = mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: .8 });
    [-.45, -.08, .28].forEach((a, k) => {
      const path = new THREE.Group(); path.position.set(-.22, 0, .22); path.rotation.y = -a; g.add(path);
      block(path, .8, .035, .12, k === 1 ? chosen : 0xc9d6f0, .4, 0, 0, .02);
      if (k === 1) { const flag = block(path, .18, .12, .02, chosen, .86, .3, 0, .01); cyl(path, .014, .014, .44, PALETTE.ink, .78, 0, 0, 6); flag.position.x = .87; return; }
      const x = new THREE.Group(); x.position.set(.84, .16, 0); path.add(x);
      [1, -1].forEach(s => { const bar = block(x, .22, .045, .035, cross, 0, -.022, 0, .01); bar.rotation.z = s * .785; });
    });
    return t => { beam.rotation.z = -.1 + Math.sin(t * 1.4) * .04; pans.forEach(p => { p.rotation.z = -beam.rotation.z; }); chosen.emissiveIntensity = .45 + Math.sin(t * 2.6) * .25; };
  },
  (g, words) => { // a model decides and its harness carries out the steps, inside a reproducible container
    const word = k => (words()[k] || '').toUpperCase(), lines = k => [{ text: word(k), size: 150, weight: 700, color: '#1f2a3a', font: '"Space Mono", ui-monospace, monospace', track: 4 }];
    const tags = [0, 1, 2, 3].map(k => {
      const h = .12 + k * .13, x = -.54 + k * .36;
      block(g, .34, h, .5, k === 3 ? STAGE_COLORS[2] : 0xdde8f6, x, 0, 0, .03);
      const tex = labelTexture('step-' + k, lines(k), { width: 1024, height: 256 });
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(.3, .075), new THREE.MeshStandardMaterial({ roughness: .8, transparent: true, map: tex }));
      tag.position.set(x, h - .05, .252); g.add(tag);
      return () => tex.userData.redraw(lines(k));
    });
    g.userData.relabel = () => tags.forEach(redraw => redraw());
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.62, .78, .74)), new THREE.LineBasicMaterial({ color: STAGE_COLORS[2], transparent: true, opacity: .6 }));
    box.position.set(0, .39, 0); g.add(box);
    const bot = robot(0xf7f5f0); bot.root.scale.setScalar(.36); g.add(bot.root);
    const stepX = [-.54, -.18, .18, .54], stepY = [.12, .25, .38, .51];
    return t => {
      const cycle = (t * .55) % 4, k = Math.min(3, Math.floor(cycle)), f = cycle - k;
      if (k < 3) {
        const jump = ramp(f, .42, .92);
        const x = lerp(stepX[k], stepX[k + 1], jump);
        const y = lerp(stepY[k], stepY[k + 1], jump) + Math.sin(jump * Math.PI) * .15 + .006;
        bot.root.position.set(x, y, .02);
        bot.root.rotation.y = Math.PI / 2;
        bot.update(t, jump > .01 && jump < .99 ? 1 : 0);
      } else {
        const back = ramp(f, .58, .96);
        const x = lerp(stepX[3], stepX[0], back);
        const y = lerp(stepY[3], stepY[0], back) + Math.sin(back * Math.PI) * .22 + .006;
        bot.root.position.set(x, y, .02);
        bot.root.rotation.y = back > .05 ? -Math.PI / 2 : Math.PI / 2;
        bot.update(t, back > .01 && back < .99 ? 1 : 0);
      }
    };
  },
  g => { // the deliverable checked against its reference: a rubric with a pass, a partial and a miss
    const verdicts = [PALETTE.green, PALETTE.green, PALETTE.amber, PALETTE.rose];
    const bars = [.56, .5, .3, .12].map((h, k) => block(g, .13, h, .13, mat(verdicts[k]), -.64 + k * .19, 0, -.15, .02));
    block(g, .78, .012, .03, 0x2a2f3b, -.36, .44, -.24, .004);                        // the pass mark behind the bars
    block(g, .74, .012, .03, 0xb8bfcc, -.36, .2, -.24, .004);                          // nothing above the bars, clear of the card's print
    const target = new THREE.Group(); target.position.set(.48, .36, 0); g.add(target);
    [.26, .18, .1].forEach((r, k) => add(target, new THREE.TorusGeometry(r, .026, 8, 32), mat(k % 2 ? 0xffffff : PALETTE.rose)));
    ball(target, .045, PALETTE.ink, .13, .09, .03, 12);                                   // close, but off the centre
    cyl(g, .018, .018, .24, PALETTE.ink, .48, 0, 0, 6);
    const marks = new THREE.Group(); marks.position.set(-.3, .03, .36); marks.rotation.x = -Math.PI / 2 + .35; g.add(marks); // laid on the page, in front of the bars
    const tick = (x, c) => { const m = mat(c, { emissive: c, intensity: .7 }); block(marks, .1, .04, .04, m, x - .045, -.04, 0, .015).rotation.z = -.8; block(marks, .19, .04, .04, m, x + .035, -.015, 0, .015).rotation.z = .9; };
    tick(-.26, PALETTE.green);
    block(marks, .18, .045, .04, mat(PALETTE.amber, { emissive: PALETTE.amber, intensity: .7 }), 0, -.02, 0, .015);       // partial
    [1, -1].forEach(sd => { block(marks, .2, .045, .04, mat(PALETTE.rose, { emissive: PALETTE.rose, intensity: .7 }), .27, -.02, 0, .015).rotation.z = sd * .785; }); // missed
    return t => { bars.forEach((b, k) => { b.scale.y = .96 + Math.sin(t * 2 + k) * .04; }); marks.position.y = .03 + Math.abs(Math.sin(t * 2.4)) * .02; };
  },
  g => { // what was learned, distilled, and carried into the next run
    cyl(g, .26, .3, .05, PALETTE.ink, 0, 0, -.05, 24);
    cyl(g, .08, .1, .16, PALETTE.slate, 0, .05, -.05, 14);
    const glow = new THREE.MeshStandardMaterial({ color: 0xfff1c2, emissive: 0xffd36b, emissiveIntensity: 1.8, roughness: .4 });
    ball(g, .18, glow, 0, .42, -.05, 24);
    const halo = glowSprite(0xffd36b, 1.2, .35); halo.position.set(0, .42, -.05); g.add(halo);
    [-1, 1].forEach(s => { const leaf = block(g, .38, .02, .44, PALETTE.cream, s * .56, .02, .16, .01); leaf.rotation.z = s * -.14; });
    const orbit = new THREE.Group(); orbit.position.set(0, .42, -.05); orbit.rotation.x = 1.2; g.add(orbit);
    add(orbit, new THREE.TorusGeometry(.34, .012, 6, 48), mat(STAGE_COLORS[4], { emissive: STAGE_COLORS[4], intensity: .9 }), 0, 0, 0, false);
    const runner = ball(orbit, .045, mat(0xffffff, { emissive: 0xffffff, intensity: 1.5 }), .34, 0, 0, 10);
    return (t, rise) => {
      glow.emissiveIntensity = 1.6 + Math.sin(t * 3) * .4;
      halo.material.opacity = (.3 + Math.sin(t * 3) * .08) * rise;
      runner.position.set(Math.cos(t * 1.6) * .34, Math.sin(t * 1.6) * .34, 0);
    };
  },
];

export function createAnatomy({ onProject = () => {}, safe = () => null, held = () => false, reduce = false, stageText = () => [] } = {}) {
  const text = i => stageText()[i] || blank(i);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 120);
  const light = lights(scene, { span: 8, shadowSize: 1024 });
  light.key.position.set(-4, 10, 7);

  /* ---- the reading desk ---- */
  block(scene, 9, .3, 6.4, 0x6e5440, 0, -.3, .2, .06).castShadow = false;
  block(scene, 9.1, .04, 6.5, 0x5a4434, 0, -.34, .2, .02).castShadow = false;
  const lampG = new THREE.Group(); lampG.position.set(-3.4, 0, -2.1); scene.add(lampG);
  cyl(lampG, .3, .36, .08, PALETTE.ink, 0, 0, 0, 20); cyl(lampG, .03, .03, 1.5, PALETTE.ink, 0, .08, 0, 8);
  cyl(lampG, .22, .42, .34, mat(0x3f9d6a), .0, 1.45, 0, 20);
  const lampGlow = glowSprite(0xffd9a0, 4, .5); lampGlow.position.set(0, 1.4, 0); lampG.add(lampGlow);
  const pool = glowSprite(0xffe2b0, 9, .14); pool.position.set(.6, .05, .2); pool.material.depthTest = false; scene.add(pool); // a soft pool of light, never cut by the desk or the book
  // a closed companion volume and an ink pot, kept quiet at the edge of the light
  block(scene, 1.3, .22, 1.8, mat(0x6b3a3a), 3.4, 0, -1.6, .03).rotation.y = .25;
  block(scene, 1.24, .16, 1.74, mat(PALETTE.cream), 3.42, .03, -1.6, .02).rotation.y = .25;
  cyl(scene, .16, .2, .26, PALETTE.ink, -3.0, 0, 1.4, 16);

  /* ---- the book: a back board, a block of pages, a front cover on a hinge ---- */
  const book = new THREE.Group(); scene.add(book);
  const cover = mat(BOOK.COVER, { rough: .9 }), edge = mat(PALETTE.cream), gilt = mat(0xd8b46a, { rough: .4 });
  block(book, PW + .1, BOARD, PD + .12, cover, PW / 2, 0, 0, .02);             // back board
  block(book, PW, T, PD, edge, PW / 2, BOARD, 0, .02).castShadow = true;        // right-hand pages
  block(book, .14, T + BOARD * 2, PD + .12, cover, 0, 0, 0, .04);              // spine
  const rightTop = BOARD + T;
  for (let k = 1; k < 6; k++) block(book, .006, .004, PD - .04, mat(0xe4dccb), PW + .001, BOARD + k * T / 6, 0, .001).castShadow = false;
  [.18, .82].forEach(f => block(book, .16, .03, PD + .14, gilt, 0, (T + BOARD * 2) * f, 0, .01).castShadow = false);
  const ribbon = block(book, .05, .004, .7, mat(0xb8323f), PW * .62, rightTop, PD / 2 - .05, .002); ribbon.castShadow = false;
  const ink = mat(0x9aa3b2);
  const runLines = n => [{ text: 'METACASE', size: 120, weight: 750, color: '#1f2a3a', track: 14 }, { text: `${String(n + 1).padStart(2, '0')} · ${text(n).title.toUpperCase()}`, size: 52, weight: 500, color: '#6b7280', font: '"Space Mono", ui-monospace, monospace', track: 4 }];
  const runTex = labelTexture('metacase-run', runLines(0), { width: 1024, height: 320 });
  const runHead = labelPlane(runTex, PW * .7, PW * .7 * 320 / 1024); runHead.position.set(-PW / 2, 0, -PD / 2 + .62); book.add(runHead);
  let runStage = 0;
  // the left-hand pages grow as stages are turned
  const leftPages = add(book, rbox(PW, 1, PD, .01), edge, -PW / 2, 0, 0);
  const leftHeading = new THREE.MeshStandardMaterial({ color: STAGE_COLORS[0], roughness: .7 });
  const leftBand = add(book, rbox(PW * .78, .006, .16, .003), leftHeading, -PW / 2, 0, -PD / 2 + .3, false);
  const leftLines = [];
  for (let k = 0; k < 9; k++) leftLines.push(add(book, rbox(PW * (k % 3 === 2 ? .5 : .78), .004, .05, .002), ink, -PW / 2 - (k % 3 === 2 ? PW * .14 : 0), 0, -PD / 2 + 1.0 + k * .22, false));
  // the front cover, hinged at the spine; it lands on the desk to the left
  const hinge = new THREE.Group(); book.add(hinge);
  const front = new THREE.Group(); front.position.x = PW / 2 + .05; hinge.add(front);
  add(front, rbox(PW + .1, BOARD, PD + .12, .02), cover);
  add(front, rbox(PW * .62, .01, .62, .006), mat(PALETTE.cream), 0, BOARD / 2 + .004, -.35, false);
  const coverTitle = labelPlane(METACASE_LABEL(), PW * .6, PW * .3); coverTitle.position.set(0, BOARD / 2 + .013, -.35); front.add(coverTitle);
  // a gilt frame with corner caps
  [[0, -PD / 2 + .14, PW - .1, .025], [0, PD / 2 - .14, PW - .1, .025]].forEach(([x, z, w, d]) => add(front, rbox(w, .01, d, .004), gilt, x, BOARD / 2 + .004, z, false));
  [-1, 1].forEach(sx => add(front, rbox(.025, .01, PD - .28, .004), gilt, sx * (PW / 2 - .1), BOARD / 2 + .004, 0, false));
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(front, rbox(.22, .016, .22, .02), gilt, sx * (PW / 2 - .04), BOARD / 2 + .002, sz * (PD / 2 - .02), false)));
  // three small tabs on the cover, a preview of the signature inside
  [0, 2, 4].forEach((i, k) => add(front, rbox(.1, .012, .1, .02), mat(STAGE_COLORS[i]), -.25 + k * .25, BOARD / 2 + .008, .35, false));
  // the leaf being turned
  const leafPivot = new THREE.Group(); book.add(leafPivot);
  const leaf = add(leafPivot, rbox(PW, .01, PD, .004), edge, PW / 2, 0, 0); leaf.castShadow = true;

  // stage tabs on the fore-edge (x = PW) and the signature thread through their tips,
  // drawn when the book is closed (the same pieces the couriers and chapters 02–03 show)
  const { tabs, tips, nodes, links } = bookTabs(book, SIG);
  const sigGlow = glowSprite(0xffe7b8, 2.6, 0); sigGlow.position.set(PW + .35, rightTop, 0); scene.add(sigGlow);

  // the five printed pages. Each is pivoted at the spine like the leaf, so the turning leaf
  // can carry the page it has finished with over to the left.
  const reprint = []; // redraws every printed text, when the page's stage text changes (e.g. its language)
  const pages = FIGURES.map((build, i) => {
    const sheet = new THREE.Group(); book.add(sheet);
    const headTex = printed(HEAD.w, HEAD.h, headline(i, text)), noteTex = printed(NOTE.w, NOTE.h, phrase(i, text));
    const head = card(sheet, headTex, HEAD, .006);
    const note = card(sheet, noteTex, NOTE, .011);
    reprint.push(headTex.userData.redraw, noteTex.userData.redraw);
    // the figure is hinged on its front edge: flat, it lies towards the reader as a print
    // of itself; unfolding, it swings up and gains its depth
    const pivot = new THREE.Group(); pivot.position.set(PW / 2, .006, FIG.hinge); sheet.add(pivot);
    const squash = new THREE.Group(); pivot.add(squash);
    const body = new THREE.Group(); body.position.z = FIG.z - FIG.hinge; body.scale.setScalar(FIG.scale); squash.add(body);
    const tick = build(body, () => text(i).steps);
    if (body.userData.relabel) reprint.push(body.userData.relabel);
    return { sheet, head, note, pivot, squash, tick, rise: 0, anchor: new THREE.Vector3(PW + .2, rightTop + .55, -.2) };
  });
  // The pose of a page u of the way through its stage: the cards fold up (0–.24), the figure
  // unfolds (.10–.40) and plays, then everything folds flat again (.74–.86) before the turn.
  function pose(page, u) {
    const back = 1 - ramp(u, .74, .86), unfold = ramp(u, .1, .4) * back;
    page.head.rotation.x = Math.PI * .46 * springy(ramp(u, 0, .18)) * back;
    page.note.rotation.x = Math.PI * .44 * springy(ramp(u, .04, .22)) * back;
    page.pivot.rotation.x = Math.PI / 2 * (1 - springy(ramp(u, .1, .4)) * back);
    page.squash.scale.z = lerp(.03, 1, smooth(unfold));
    page.rise = unfold;
    return ramp(u, .02, .2) * back; // how far the cards stand
  }

  // two small readers on the desk, who turn to whatever the page is showing
  const reader = person(3); reader.root.scale.setScalar(.62); reader.root.position.set(-1.4, 0, 2.3); scene.add(reader.root);
  const agent = robot(0xf7f5f0); agent.root.scale.setScalar(.62); agent.root.position.set(3.0, 0, 1.9); scene.add(agent.root);
  const REST = { reader: Math.PI + .5, agent: -2.4 }, look = new THREE.Vector3();
  const facing = (actor, at) => Math.atan2(at.x - actor.root.position.x, at.z - actor.root.position.z);

  const target = new THREE.Vector3(), aim = new THREE.Vector3(), v = new THREE.Vector3();
  const pointer = { x: 0, tx: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth - .5; }, { passive: true });

  // camera: the closed book from above; open, lower and a little closer, so the cards and
  // figures read as standing off the flat page; closed again, the fore-edge with its signature
  function aimCamera(cam, rect, openness, b, draw) {
    const aspect = rect.width / rect.height, wide = aspect > 1.15;
    const frame = fitSafe(cam, rect, safe(), { fov: aspect < 1 ? 42 : 32, shift: wide ? -.05 : 0 });
    target.set(lerp(PW / 2, .2, openness), lerp(.35, .62, openness), lerp(0, -.12, openness));
    aim.set(PW + .35, .3, 0);
    target.lerp(aim, smooth(draw * 1.3));
    const fin = smooth(draw * 1.3);
    const dist = fitBox(lerp(lerp(1.9, 2.45, openness), 1.25, fin), lerp(lerp(1.45, 1.22, openness), 1.75, fin), cam.fov, frame, lerp(.97, .95, fin));
    const az = lerp(lerp(-.35, -.14, openness) + (reduce ? 0 : pointer.x * .2) + clamp(b / N) * .2, .15, smooth(draw * 1.3));
    const el = lerp(lerp(.58, .5, openness), 1.2, smooth(draw * 1.3));
    cam.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(target);
    cam.updateMatrixWorld();
  }
  // Where the closed book rests at the start of the chapter, for a view of the given size:
  // the courier lands the carried book exactly here.
  const restCamera = new THREE.PerspectiveCamera(34, 1, .1, 120), endCamera = new THREE.PerspectiveCamera(34, 1, .1, 120);
  function restView(rect) {
    aimCamera(restCamera, rect, 0, -1, 0);
    book.updateMatrixWorld();
    return { camera: restCamera, matrix: book.matrixWorld, key: light.key.position };
  }
  // Where it lies at the end, closed on its signature: the next courier picks it up here.
  function endView(rect) {
    aimCamera(endCamera, rect, 0, N, 1);
    book.updateMatrixWorld();
    return { camera: endCamera, matrix: book.matrixWorld, key: light.key.position };
  }

  function update(dt, t, p, rect) {
    pointer.x += (pointer.tx - pointer.x) * .05;
    const opening = ramp(p, .05, CHAPTERS[0]), closing = ramp(p, CHAPTERS[1], .87), draw = ramp(p, .88, .98);
    const openness = opening * (1 - closing);
    const b = band(p), stage = p < CHAPTERS[0] ? -1 : p >= CHAPTERS[1] ? N : clamp(Math.floor(b), 0, N - 1);
    const current = clamp(stage, 0, N - 1), u = p < CHAPTERS[0] ? 0 : p >= CHAPTERS[1] ? 1 : b - current;

    // the cover swings over the spine and settles on the left
    const swing = openness * Math.PI;
    hinge.rotation.z = swing; hinge.position.y = lerp(rightTop + BOARD / 2, BOARD / 2, smooth(openness * 1.4 - .4));
    // pages turned so far build up the left-hand side
    const turned = clamp(b, 0, N - 1);
    const leftT = (.04 + turned * .04) * smooth(openness * 2 - 1), leftY = BOARD + .004;
    leftPages.visible = leftT > .005; leftPages.scale.y = Math.max(.001, leftT); leftPages.position.y = leftY + leftT / 2;
    leftBand.position.y = leftY + leftT + .003; runHead.position.y = leftY + leftT + .01; runHead.visible = leftPages.visible; leftLines.forEach(l => { l.position.y = leftY + leftT + .002; l.visible = leftPages.visible; }); leftBand.visible = leftPages.visible && turned >= 1;
    if (stage >= 0 && stage < N && stage !== runStage) { runStage = stage; runTex.userData.redraw(runLines(stage)); }
    leftHeading.color.setHex(STAGE_COLORS[clamp(Math.floor(turned) - 1, 0, N - 1)]);

    // turning: the last part of every stage carries a leaf, and the page on it, across
    const turning = stage >= 0 && stage < N - 1 ? ramp(u, .86, 1) : 0;
    leafPivot.visible = turning > .001 && turning < .999;
    leafPivot.rotation.z = turning * Math.PI; leafPivot.position.y = lerp(rightTop + .006, leftY + leftT + .006, turning);

    // the printed pages: the current one stands up and tells its stage; the next one waits
    // flat beneath the turning leaf
    let stand = 0;
    pages.forEach((page, i) => {
      const shown = openness > .02 && (i === current || (i === current + 1 && turning > .001));
      page.sheet.visible = shown;
      if (!shown) return;
      if (i === current) {
        stand = pose(page, u);
        page.sheet.rotation.z = turning * Math.PI;
        page.sheet.position.y = turning > 0 ? leafPivot.position.y + .002 : rightTop;
      } else {
        pose(page, 0); page.sheet.rotation.z = 0; page.sheet.position.y = rightTop;
      }
      if (page.rise > .02 && !reduce) page.tick(t, page.rise);
    });
    tabs.forEach((tab, i) => { const k = ramp(b - i, .3, .55); tab.scale.set(Math.max(.001, k), 1, 1); tab.visible = k > .002; });

    // the signature: the tips of the five tabs, joined when the book is closed
    const reveal = draw * (N + .4);
    nodes.forEach((n, i) => { const k = clamp(reveal - i); n.scale.setScalar(Math.max(.001, k)); n.visible = k > .01; });
    links.forEach((l, i) => { const k = clamp(reveal - i - .6); l.scale.set(1, Math.max(.001, k * l.userData.len), 1); l.visible = k > .01; });
    sigGlow.material.opacity = draw * (.45 + Math.sin(t * 2) * .1);
    pool.material.opacity = .12 + openness * .06;

    // the readers: they turn to the figure as it unfolds, then to the fore-edge at the end
    const engaged = stage >= 0 && stage < N ? pages[current].rise : 0;
    look.set(PW / 2, 0, FIG.z); if (draw > 0) look.set(PW + .3, 0, 0);
    const attend = Math.max(engaged, draw);
    reader.root.rotation.y = lerp(REST.reader, facing(reader, look), attend);
    agent.root.rotation.y = lerp(REST.agent, facing(agent, look), attend);
    reader.root.position.y = current === 3 ? Math.max(0, Math.sin(t * 5)) * .05 * engaged : 0;   // a pass: a small hop
    agent.root.position.y = current === 2 ? Math.abs(Math.sin(t * 6)) * .04 * engaged : 0;       // its own run: busy
    reader.update(t, 0); agent.update(t, current === 2 || current === 4 ? engaged : 0);

    aimCamera(camera, rect, openness, b, draw);
    book.visible = sigGlow.visible = !held();
    book.updateMatrixWorld();

    onProject(pages.map((page, i) => {
      const s = toView(book.localToWorld(v.copy(page.anchor)), camera, rect), o = i === current && stage < N ? stand : 0;
      return { ...s, opacity: o, visible: o > .02 && s.front && s.inside, active: i === stage };
    }), { stage, open: openness, draw, signature: toView(v.set(PW + 1.45, tips[2].y, tips[2].z), camera, rect) });
  }
  function setTheme() { const bg = pageBackground(); scene.background = bg; scene.fog = new THREE.Fog(bg, 16, 40); }
  setTheme();
  function relabel() { reprint.forEach(redraw => redraw()); runTex.userData.redraw(runLines(Math.max(0, runStage))); }
  return { scene, camera, update, setTheme, restView, endView, relabel };
}
