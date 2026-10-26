/* metacase-courier.js — the hand-off between the hero and chapter 01. As the page scrolls
 * from the bookcase to the reading desk, the Metacase is drawn off its shelf, turns to
 * show its cover, crosses the screen and lands exactly where chapter 01's closed book
 * rests; on the way, the other materials a case is made of (a web page, a data sheet, a
 * chart, a recording) leave their own shelves and fold into its pages. Drawn last by
 * the shared stage over a fixed, full-window element, so it can cross from one chapter
 * into the next; it matches both ends by measuring where each scene shows the book. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { BOOK, BOOK_CENTRE, closedBook, lights, rbox, PALETTE } from './mc-kit.js';
import { clamp, smooth, ramp, lerp, glowSprite } from './mc-stage.js';

const smoother = x => { const p = clamp(x); return p * p * p * (p * (p * 6 - 15) + 10); };
const MEDIA = ['web', 'sheet', 'chart', 'media'];

/* ---- the other materials of a case, drawn once on canvas ---- */
function mediaTexture(kind) {
  const W = 384, H = 480, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = (x, y, w, h, rad, fill) => { g.beginPath(); g.roundRect(x, y, w, h, rad); g.fillStyle = fill; g.fill(); };
  r(0, 0, W, H, 28, '#fbfaf6');
  g.strokeStyle = '#d9d4c7'; g.lineWidth = 4; g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, 26); g.stroke();
  const lines = (x, y, n, w, gap = 22) => { for (let i = 0; i < n; i++) r(x, y + i * gap, w * (i % 3 === 2 ? .6 : 1), 9, 4, '#c9cdd6'); };
  if (kind === 'web') { // a web page: browser bar, headline, figure, text
    r(0, 0, W, 54, 0, '#e8ebf1'); g.clearRect(0, 0, 0, 0);
    ['#e2667a', '#f2b545', '#3f9d6a'].forEach((col, i) => { g.beginPath(); g.arc(30 + i * 24, 27, 8, 0, Math.PI * 2); g.fillStyle = col; g.fill(); });
    r(110, 16, 240, 22, 11, '#ffffff');
    r(30, 84, 250, 22, 6, '#1f2a3a'); r(30, 116, 180, 14, 6, '#8a93a5');
    r(30, 150, W - 60, 120, 14, '#bfe3df'); r(60, 200, 80, 50, 8, '#45b5b0'); r(160, 180, 140, 70, 8, '#8fd0ca');
    lines(30, 296, 6, W - 60);
  } else if (kind === 'sheet') { // a data sheet: header row, grid, a highlighted cell
    r(28, 30, W - 56, 40, 8, '#f2b545');
    g.strokeStyle = '#d8dce4'; g.lineWidth = 3;
    for (let i = 0; i <= 9; i++) { g.beginPath(); g.moveTo(28, 70 + i * 40); g.lineTo(W - 28, 70 + i * 40); g.stroke(); }
    for (let j = 0; j <= 4; j++) { g.beginPath(); g.moveTo(28 + j * (W - 56) / 4, 30); g.lineTo(28 + j * (W - 56) / 4, 430); g.stroke(); }
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) r(40 + j * (W - 56) / 4, 84 + i * 40, 30 + ((i * 7 + j * 3) % 5) * 9, 12, 5, '#9aa3b2');
    g.strokeStyle = '#7d6ad8'; g.lineWidth = 6; g.strokeRect(28 + 2 * (W - 56) / 4, 70 + 4 * 40, (W - 56) / 4, 40);
  } else if (kind === 'chart') { // a figure: bars and a fitted line
    r(30, 30, 220, 20, 6, '#1f2a3a');
    g.strokeStyle = '#9aa3b2'; g.lineWidth = 4; g.beginPath(); g.moveTo(44, 90); g.lineTo(44, 400); g.lineTo(W - 30, 400); g.stroke();
    [120, 190, 160, 250, 290].forEach((h, i) => r(70 + i * 56, 400 - h, 34, h, 6, i === 4 ? '#7d6ad8' : '#cfc7f1'));
    g.strokeStyle = '#45b5b0'; g.lineWidth = 8; g.beginPath(); g.moveTo(60, 330); g.bezierCurveTo(150, 300, 230, 220, W - 40, 130); g.stroke();
    lines(44, 428, 2, 200, 20);
  } else { // a recording: a video frame and its waveform
    r(24, 24, W - 48, 250, 18, '#1f2a3a');
    g.beginPath(); g.moveTo(W / 2 - 34, 108); g.lineTo(W / 2 + 46, 150); g.lineTo(W / 2 - 34, 192); g.closePath(); g.fillStyle = '#ffffff'; g.fill();
    r(24, 250, (W - 48) * .38, 8, 4, '#e2667a');
    for (let i = 0; i < 28; i++) { const h = 14 + Math.abs(Math.sin(i * 1.7) * 60) + (i % 4) * 6; r(30 + i * 11.6, 372 - h / 2, 6, h, 3, i < 11 ? '#e2667a' : '#c9cdd6'); }
    lines(30, 430, 2, 220, 20);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

/* ---- measuring a book as another scene shows it ---- */
const _qc = new THREE.Quaternion(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Vector3();
function toScreen(world, cam, rect, out = {}) {
  _n.copy(world).project(cam);
  out.x = rect.left + (_n.x * .5 + .5) * rect.width; out.y = rect.top + (-_n.y * .5 + .5) * rect.height;
  return out;
}
// Screen position (px) of the book's centre, pixels per unit of the book's own geometry,
// its rotation relative to the camera, and the key light and up direction as that camera sees them.
function screenPose(src) {
  const cam = src.camera; cam.updateMatrixWorld();
  const centre = BOOK_CENTRE.clone().applyMatrix4(src.matrix), p = toScreen(centre, cam, src.rect, {});
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
  const p2 = toScreen(centre.addScaledVector(right, .2), cam, src.rect, {});
  src.matrix.decompose(_p, _q, _s);
  cam.getWorldQuaternion(_qc); const inv = _qc.clone().invert();
  return {
    x: p.x, y: p.y, size: Math.hypot(p2.x - p.x, p2.y - p.y) / .2 * _s.x,
    q: inv.clone().multiply(_q),
    key: src.key ? src.key.clone().normalize().applyQuaternion(inv) : new THREE.Vector3(-.3, .8, .5).normalize(),
    up: new THREE.Vector3(0, 1, 0).applyQuaternion(inv),
  };
}

export function createCourier({ progress = () => 0, from = () => null, to = () => null } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 120);
  const light = lights(scene, { span: 6, shadowSize: 256 }); light.key.castShadow = false;

  // the book, centred on its middle so it can be placed by its screen position
  const carrier = new THREE.Group(); scene.add(carrier);
  const book = closedBook(); book.position.copy(BOOK_CENTRE).multiplyScalar(-1); carrier.add(book);
  book.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const halo = glowSprite(0xffe2b0, 1, 0); scene.add(halo);

  // the other materials, each a card with a cream backing
  const cards = MEDIA.map(kind => {
    const g = new THREE.Group(), map = mediaTexture(kind);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.25), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .32, roughness: .85, transparent: true }));
    const back = new THREE.Mesh(rbox(1.04, 1.29, .03, .03), new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: .85, transparent: true })); back.position.z = -.02;
    g.add(back, face); scene.add(g);
    const spark = glowSprite(0xfff1d0, 1, 0); spark.material.depthTest = false; scene.add(spark);
    return { g, face, back, spark, from: {}, at: {} };
  });

  // The courier looks through chapter 01's own camera, re-projected from that chapter's
  // frame to the whole window, so on landing its book coincides with the chapter's book
  // pixel for pixel. Positions are chosen on screen and lifted into that camera's world.
  camera.matrixAutoUpdate = false;
  const A4 = new THREE.Matrix4(), camQ = new THREE.Quaternion(), tmpQ = new THREE.Quaternion();
  function useCamera(dest, view) {
    const cam = dest.camera, r = dest.rect; cam.updateMatrixWorld();
    const sx = r.width / view.width, sy = r.height / view.height;
    const tx = 2 * (r.left - view.left + r.width / 2) / view.width - 1, ty = 1 - 2 * (r.top - view.top + r.height / 2) / view.height;
    A4.set(sx, 0, 0, tx, 0, sy, 0, ty, 0, 0, 1, 0, 0, 0, 0, 1);
    camera.projectionMatrix.multiplyMatrices(A4, cam.projectionMatrix);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.near = cam.near; camera.far = cam.far;
    camera.matrix.copy(cam.matrixWorld); camera.matrixWorld.copy(cam.matrixWorld); camera.matrixWorldInverse.copy(cam.matrixWorld).invert();
    cam.getWorldQuaternion(camQ);
  }
  // Put obj where the screen point (px) is, at a size of sizePx pixels per unit of its own
  // geometry, turned by qView relative to the camera; never farther than zMax.
  function placeOnScreen(obj, x, y, sizePx, qView, view, zMax = 60) {
    const e = camera.projectionMatrix.elements, f = e[5] * view.height / 2;
    const z = f / Math.max(1e-3, sizePx), zc = Math.min(z, zMax);
    const xn = 2 * (x - view.left) / view.width - 1, yn = 1 - 2 * (y - view.top) / view.height;
    obj.position.set((xn + e[8]) * zc / e[0], (yn + e[9]) * zc / e[5], -zc).applyMatrix4(camera.matrixWorld);
    if (qView) obj.quaternion.copy(camQ).multiply(qView);
    obj.scale.setScalar(zc / z);
    return zc;
  }
  const turn = new THREE.Quaternion(), mid = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - .3, -.34, .06));
  const qStart = new THREE.Quaternion(), qNow = new THREE.Quaternion(), keyDir = new THREE.Vector3(), upDir = new THREE.Vector3(), endKey = new THREE.Vector3();
  const bez = (a, c, b, u, out) => { const v = 1 - u; out.x = v * v * a.x + 2 * v * u * c.x + u * u * b.x; out.y = v * v * a.y + 2 * v * u * c.y + u * u * b.y; return out; };
  const at = {}, ctrl = {}, start = {}, cp = {};
  const endM = new THREE.Matrix4(), endP = new THREE.Vector3(), endQ = new THREE.Quaternion(), endS = new THREE.Vector3(), centreM = new THREE.Matrix4().makeTranslation(BOOK_CENTRE.x, BOOK_CENTRE.y, BOOK_CENTRE.z);
  const facing = new THREE.Quaternion(), back = new THREE.Vector3();

  function hide() { carrier.visible = halo.visible = false; cards.forEach(c => { c.g.visible = c.spark.visible = false; }); }

  function update(dt, t, _p, rect) {
    const k = progress(), A = k > 0 && k < 1 ? from() : null, B = A ? to() : null;
    if (!A || !B) return hide();
    const a = screenPose(A), b = screenPose(B);
    useCamera(B, rect);
    // keep the book in view while its shelf scrolls away above and its desk is still below
    const top = rect.top + Math.min(160, rect.height * .2), bottom = rect.top + rect.height * .86;
    const inView = y => clamp(y, top, Math.max(top, bottom));
    a.y = inView(a.y);
    const bY = inView(b.y);

    // 1 · drawn off the shelf, turning its cover towards us
    const pull = smooth(ramp(k, .02, .2));
    turn.setFromEuler(new THREE.Euler(0, -.7 * pull, .08 * pull));
    qStart.copy(turn).multiply(a.q);
    start.x = a.x + 26 * pull; start.y = a.y + 14 * pull;
    const startSize = a.size * (1 + 1.6 * pull);
    // 2 · across the screen in an arc, coming a little closer on the way
    const fly = smoother(ramp(k, .14, .9));
    const end = { x: b.x, y: bY };
    ctrl.x = lerp(start.x, end.x, .5) + rect.width * .07; ctrl.y = Math.max(top, Math.min(start.y, end.y) - rect.height * .1);
    bez(start, ctrl, end, fly, at);
    const size = Math.exp(lerp(Math.log(startSize), Math.log(b.size), fly) + .14 * Math.sin(Math.PI * fly));
    if (fly < .5) qNow.slerpQuaternions(qStart, mid, smooth(fly * 2)); else qNow.slerpQuaternions(mid, b.q, smooth(fly * 2 - 1));
    carrier.visible = true;
    const bookZ = placeOnScreen(carrier, at.x, at.y, size, qNow, rect);
    // 3 · laid on the desk: converge on chapter 01's book exactly
    endM.multiplyMatrices(B.matrix, centreM).decompose(endP, endQ, endS);
    const lock = smooth(ramp(fly, .72, 1)) * (1 - smooth((b.y - bY) / 120)); // only once the desk is in view
    carrier.position.lerp(endP, lock); carrier.quaternion.slerp(endQ, lock); carrier.scale.lerp(endS, lock);

    // light the book as each scene does, from the shelf's light to the desk's (in chapter 01's world)
    keyDir.copy(a.key).applyQuaternion(camQ); endKey.copy(B.key).normalize();
    keyDir.lerp(endKey, fly).normalize(); light.key.position.copy(keyDir).multiplyScalar(10).add(carrier.position); light.key.target.position.copy(carrier.position); light.key.target.updateMatrixWorld();
    upDir.copy(a.up).applyQuaternion(camQ).lerp(new THREE.Vector3(0, 1, 0), fly).normalize(); light.hemi.position.copy(upDir);

    // a soft glow behind the book while it flies
    halo.visible = true;
    back.set(0, 0, -1).applyQuaternion(camQ);
    halo.position.copy(carrier.position).addScaledVector(back, .6 * carrier.scale.x);
    halo.scale.setScalar(BOOK.PD * 1.6 * carrier.scale.x);
    halo.material.opacity = .22 * Math.sin(Math.PI * fly) + .1 * pull * (1 - fly);

    // the other materials: out of their shelves, around the book, into its pages
    const sources = A.sources || [];
    const bookPx = size * BOOK.PW;
    cards.forEach((c, i) => {
      const src = sources[i];
      if (!src) { c.g.visible = c.spark.visible = false; return; }
      toScreen(src, A.camera, A.rect, c.from); c.from.y = inView(c.from.y);
      const appear = smooth(ramp(k, .05 + i * .03, .2 + i * .03));
      const go = smoother(ramp(k, .07 + i * .035, .52 + i * .035));
      const into = smoother(ramp(k, .58 + i * .05, .78 + i * .04));
      const ang = i * Math.PI / 2 + .7 + fly * 1.4, rad = bookPx * (.95 + .12 * Math.sin(t * 1.3 + i));
      c.at.x = at.x + Math.cos(ang) * rad * 1.1; c.at.y = at.y + Math.sin(ang) * rad * .62;
      ctrl.x = lerp(c.from.x, c.at.x, .5); ctrl.y = Math.max(top, Math.min(c.from.y, c.at.y) - rect.height * (.08 + i * .03));
      bez(c.from, ctrl, c.at, go, cp);
      const sx = lerp(cp.x, at.x, into), sy = lerp(cp.y, at.y, into);
      const cardPx = lerp(lerp(16, Math.max(70, bookPx * .42), go), 6, into);
      c.g.visible = appear > .01 && into < .995;
      facing.setFromEuler(new THREE.Euler(Math.sin(t * .9 + i) * .08 * (1 - into), (i - 1.5) * .28 * (1 - into) + (1 - go) * .9, (i % 2 ? .12 : -.1) * (1 - into)));
      placeOnScreen(c.g, sx, sy, cardPx, facing, rect, bookZ * .82); // always in front of the book
      const fade = appear * (1 - smooth((into - .8) / .2));
      c.face.material.opacity = fade; c.back.material.opacity = fade;
      // a small flash as each one folds into the pages
      const flash = Math.max(0, 1 - Math.abs(into - .92) / .1);
      c.spark.visible = flash > .01; c.spark.material.opacity = .7 * flash;
      c.spark.position.copy(carrier.position).addScaledVector(back, -.4 * carrier.scale.x);
      c.spark.scale.setScalar(BOOK.PW * .9 * carrier.scale.x);
    });
  }
  hide();
  return { scene, camera, update, setTheme() {} };
}
