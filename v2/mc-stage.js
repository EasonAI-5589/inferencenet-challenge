/* mc-stage.js — one WebGL renderer for every 3D picture on the homepage. A fixed,
 * transparent canvas sits behind the page; each view draws its scene into the
 * on-screen rectangle of its own element, so large pinned chapters and small card
 * illustrations share one context, one light model and one finish. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { createPost } from './mc-toon.js';

export function createStage(canvas, { reduce = false, clipTop = () => 0 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  const views = [];
  let frame = 0, last = performance.now(), clock = 0, W = 0, H = 0, dirty = true;
  const size = () => {
    const w = innerWidth, h = innerHeight;
    if (w !== W || h !== H) { W = w; H = h; renderer.setSize(W, H, false); }
  };

  /* A view: { el, build() → { scene, camera, update(dt, t, progress, rect) }, post?, progress?(), onFrame?(object, rect), near? } */
  function add(view) {
    views.push(Object.assign({ near: 1.5, object: null, building: false, post: null, postSize: '' }, view));
    request();
  }

  function draw(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!reduce) clock += dt;
    size();
    renderer.setRenderTarget(null);
    renderer.setScissorTest(false);
    renderer.clear(true, true, true);
    const top = clipTop();
    let animating = false;
    for (const v of views) {
      const r = v.el.getBoundingClientRect();
      const near = r.bottom > -H * v.near && r.top < H * (1 + v.near) && r.width > 0;
      if (near && !v.object && !v.building) {
        v.building = true;
        Promise.resolve(v.build()).then(object => { v.object = object; object.setTheme?.(); request(); })
          .catch(error => { console.warn('A 3D view could not be built.', error); v.el.dataset.renderer = 'fallback'; });
      }
      const y0 = Math.max(r.top, top), y1 = Math.min(r.bottom, H);
      if (!v.object || y1 <= y0 || r.right <= 0 || r.left >= W) continue;
      animating = true;
      const o = v.object;
      o.update(dt, clock, v.progress ? v.progress(r) : 0, r);
      const rect = { x: r.left, y: H - r.bottom, w: r.width, h: r.height, sx: Math.max(0, r.left), sy: H - y1, sw: Math.min(W, r.right) - Math.max(0, r.left), sh: y1 - y0 };
      if (v.postOptions) {
        if (!v.post) v.post = createPost(renderer, v.postOptions);
        const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
        if (key !== v.postSize) { v.postSize = key; v.post.setSize(r.width, r.height); }
        v.post.render(o.scene, o.camera, rect);
      } else {
        renderer.setViewport(rect.x, rect.y, rect.w, rect.h);
        renderer.setScissor(rect.sx, rect.sy, rect.sw, rect.sh);
        renderer.setScissorTest(true);
        renderer.clearDepth();
        renderer.render(o.scene, o.camera);
        renderer.setScissorTest(false);
      }
      v.onFrame?.(o, r);
      v.el.dataset.renderer = 'webgl';
    }
    dirty = false;
    return animating;
  }
  function tick(now) {
    frame = 0;
    if (document.hidden) return;
    const animating = draw(now);
    if (!reduce && animating) frame = requestAnimationFrame(tick);
  }
  function request() { dirty = true; if (!frame) frame = requestAnimationFrame(tick); }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); request(); } });
  return { add, request, renderer, setTheme() { views.forEach(v => v.object?.setTheme?.()); request(); } };
}

/* Helpers shared by the scenes */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
export const ramp = (p, a, b) => smooth((p - a) / (b - a));
export const lerp = (a, b, t) => a + (b - a) * t;
export function pageBackground() { return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg-canvas').trim() || '#05070e'); }
// Fit the camera to a view rectangle; `shift` moves the subject sideways (fraction of width).
// band: frame the picture in the top `band` pixels of the view (stacked mobile layouts).
export function fitCamera(camera, rect, { shift = 0, lift = 0, fov, band = 0 } = {}) {
  const h = band ? Math.min(band, rect.height) : rect.height;
  camera.aspect = rect.width / Math.max(1, h);
  if (fov) camera.fov = fov;
  if (shift || lift || band) camera.setViewOffset(rect.width, h, -rect.width * shift, h * lift, rect.width, rect.height);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
const v3 = new THREE.Vector3();
// Project a world point into a view rectangle (CSS pixels relative to the view).
export function toView(point, camera, rect) {
  v3.copy(point).project(camera);
  return { x: (v3.x * .5 + .5) * rect.width, y: (-v3.y * .5 + .5) * rect.height, front: v3.z < 1 && v3.z > -1, inside: Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 };
}
export function glowSprite(color, size, opacity = 1) {
  if (!glowSprite.map) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.3, 'rgba(255,255,255,.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    glowSprite.map = new THREE.CanvasTexture(c); glowSprite.map.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite.map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}
