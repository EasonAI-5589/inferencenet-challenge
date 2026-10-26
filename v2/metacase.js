/* metacase.js — v2 homepage behaviours. One shared WebGL stage draws every 3D picture
 * (the library, the opening case, the archive wall and the card vignettes);
 * this file registers them, keeps the notes, captions, tags and signature rails in step
 * with scrolling, and handles reveals, counters and the section nav. Visible text stays
 * in the page so language.js translates it. */
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
const V = '?v=20261027-copy2';

/* ---- layout helpers ---- */
const siteHeader = $('.site-header'), subnav = $('.mc-subnav');
function clipTop() { // the stage never draws under the sticky header and section nav
  const h = siteHeader ? siteHeader.getBoundingClientRect().bottom : 0;
  if (!subnav) return h;
  const s = subnav.getBoundingClientRect();
  return s.top <= h + 1 ? s.bottom : h;
}
function pinProgress(section) {
  const pin = $('.mc-scene-pin', section), r = section.getBoundingClientRect();
  const range = section.offsetHeight - pin.offsetHeight;
  return clamp((parseFloat(getComputedStyle(pin).top) - r.top) / Math.max(1, range));
}
const place = (el, s) => {
  if (!el) return;
  if (!s || !s.visible) { el.style.opacity = 0; el.classList.remove('on'); return; }
  if (el.parentElement?.classList.contains('mc-notes')) el.classList.toggle('flip', s.x + el.offsetWidth + 40 > el.parentElement.clientWidth);
  el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
  el.style.opacity = s.opacity.toFixed(3);
  el.classList.toggle('on', !!s.active);
};

/* ---- the signature rail: chapter progress drawn as a seven-step signature ---- */
const SIG = [0, -.6, .2, -.9, .1, .7, -.2];
function rail(ol) {
  if (!ol) return () => {};
  const items = $$('li', ol), n = items.length, NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'mc-rail-line'); svg.setAttribute('preserveAspectRatio', 'none');
  ol.prepend(svg);
  const base = document.createElementNS(NS, 'polyline'), ink = document.createElementNS(NS, 'polyline');
  base.setAttribute('class', 'base'); ink.setAttribute('class', 'ink'); svg.append(base, ink);
  const dots = items.map(() => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 4); svg.append(c); return c; });
  let length = 0;
  const layout = () => {
    const w = ol.clientWidth, h = 26; svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const pts = items.map((_, i) => [(i + .5) / n * w, h / 2 + SIG[Math.round(i / Math.max(1, n - 1) * 6)] * (h / 2 - 5)]);
    const str = pts.map(p => p.join(',')).join(' ');
    base.setAttribute('points', str); ink.setAttribute('points', str);
    dots.forEach((d, i) => { d.setAttribute('cx', pts[i][0]); d.setAttribute('cy', pts[i][1]); });
    length = pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
    ink.style.strokeDasharray = length;
  };
  new ResizeObserver(layout).observe(ol); layout();
  return (fraction, active) => { // fraction 0–1 along the rail, active item index
    ink.style.strokeDashoffset = length * (1 - clamp(fraction));
    items.forEach((li, i) => { li.classList.toggle('on', i === active); li.classList.toggle('done', i < active); dots[i].classList.toggle('on', i <= active); });
  };
}
// Captions or notes: exactly one item is current.
const stepper = list => { let last = -2; return index => { if (index === last) return; last = index; list.forEach((el, i) => el.classList.toggle('current', i === index)); }; };

// The band of a pinned chapter that its picture may use: below the heading, above the
// captions, rail and (on phones) the notes. Measured at most a few times a second.
function safeArea(pin) {
  let cache = null, at = 0;
  return () => {
    const now = performance.now();
    if (cache && now - at < 250) return cache;
    const r = pin.getBoundingClientRect(), head = $('.mc-scene-head', pin);
    const top = head ? head.getBoundingClientRect().bottom - r.top + 20 : 0;
    const below = [...$$('.mc-scene-foot, .mc-captions li', pin), ...(matchMedia('(max-width: 860px)').matches ? $$('.mc-notes li', pin) : [])];
    let bottom = r.height;
    below.forEach(el => { const b = el.getBoundingClientRect(); if (b.height) bottom = Math.min(bottom, b.top - r.top - 16); });
    cache = { top, bottom }; at = now;
    return cache;
  };
}

/* ---- hero → 01: how far the Metacase has travelled from its shelf to the desk ---- */
// 0 with the page at the top, 1 when chapter 01 pins; the courier, the hero bookcase and
// chapter 01 all read this same value, so the book is never shown twice or not at all.
let heroLib = null, anatomyObj = null, courierReady = false, handoffAt = -1, handoffK = 0;
function bookHandoff() {
  const now = performance.now();
  if (now - handoffAt < 4) return handoffK;
  const section = $('#metacase'), pin = section && $('.mc-scene-pin', section);
  if (!pin) return (handoffK = 1);
  const pinTop = parseFloat(getComputedStyle(pin).top) || 0, top = section.getBoundingClientRect().top;
  const total = Math.max(1, top + scrollY - pinTop);
  handoffAt = now;
  return (handoffK = clamp(((total - (top - pinTop)) / total - .03) / .97));
}
const carrying = () => courierReady && heroLib && anatomyObj && !reduce;
const courierEl = document.createElement('div');
courierEl.className = 'mc-courier'; courierEl.setAttribute('aria-hidden', 'true');
document.body.append(courierEl);
// The courier has its own canvas above the page text (below the header and section nav),
// so the travelling book is never hidden by the hero's text backdrop. Over the last few
// percent it fades out while chapter 01's own book, in the same place, is already shown.
const courierCanvas = document.createElement('canvas');
courierCanvas.className = 'mc-stage mc-stage-top'; courierCanvas.setAttribute('aria-hidden', 'true');
document.body.append(courierCanvas);
const HANDOVER = .94;

/* ---- the stage ---- */
let stage = null;
const canvas = document.createElement('canvas');
canvas.className = 'mc-stage'; canvas.setAttribute('aria-hidden', 'true');
document.body.prepend(canvas);
const sceneControllers = [];

import('./mc-stage.js' + V).then(({ createStage }) => {
  stage = createStage(canvas, { reduce, clipTop });
  root.classList.add('mc-3d');
  new MutationObserver(() => stage.setTheme()).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // hero: the library, in lamplight
  const hero = $('.mc-hero'), heroTags = $$('[data-tags="hero"] [data-tag]');
  stage.add({ el: hero, near: 2, postOptions: { bloom: .35, threshold: .9, vignette: 0 },
    build: () => import('./metacase-library.js' + V).then(m => heroLib = m.createLibrary({ mode: 'hero', reduce, extracted: () => carrying() && bookHandoff() > 0, onProject: list => list.forEach((s, i) => place(heroTags[i], { ...s, opacity: s.opacity * ((hero.clientWidth <= 860 ? s.y < 420 : s.x > hero.clientWidth * .47) ? 1 : 0) })) })) });

  // 01: the Metacase opens
  const anatomy = $('#metacase'), notes = $$('[data-notes="anatomy"] li', anatomy);
  stage.add({ el: $('.mc-scene-pin', anatomy), near: 2.5, postOptions: { bloom: .32, threshold: .9, vignette: .2 }, progress: () => pinProgress(anatomy),
    build: () => import('./metacase-anatomy.js' + V).then(m => anatomyObj = m.createAnatomy({ reduce, safe: safeArea($('.mc-scene-pin', anatomy)), held: () => carrying() && bookHandoff() < HANDOVER, onProject: (list, extra) => {
      list.forEach((s, i) => place(notes[i], { ...s, opacity: s.active ? s.opacity : 0 }));
      place(notes[7], { ...extra.signature, opacity: extra.draw, visible: extra.draw > .05, active: true });
    } })) });

  // 02: the archive answers by structure
  const structure = $('#structure'), archiveTags = $$('[data-tags="archive"] [data-tag]', structure);
  stage.add({ el: $('.mc-scene-pin', structure), near: 2.5, postOptions: { bloom: .34, threshold: .9, vignette: .2 }, progress: () => pinProgress(structure),
    build: () => import('./metacase-archive.js' + V).then(m => m.createArchive({ reduce, safe: safeArea($('.mc-scene-pin', structure)), onProject: list => list.forEach((s, i) => place(archiveTags[i], s)) })) });

  // 03: the library, cross-referenced wing by wing
  const net = $('#net'), worldTags = $$('[data-tags="world"] [data-tag]', net);
  stage.add({ el: $('.mc-scene-pin', net), postOptions: { bloom: .35, threshold: .9, vignette: .22 }, progress: () => pinProgress(net),
    build: () => import('./metacase-library.js' + V).then(m => m.createLibrary({ mode: 'story', reduce, onProject: list => list.forEach((s, i) => place(worldTags[i], s)) })) });

  // card vignettes
  $$('.mc-art').forEach(el => stage.add({ el, near: 1, build: () => import('./metacase-cards.js' + V).then(m => m.createCard(el.dataset.art)) }));

  // the courier: on its own canvas, while the Metacase travels from shelf to desk
  if (!reduce) {
    const anatomyPin = $('.mc-scene-pin', anatomy);
    const top = createStage(courierCanvas, { reduce, clipTop });
    top.add({ el: courierEl, near: 0, build: () => import('./metacase-courier.js' + V).then(m => {
      const courier = m.createCourier({
        progress: bookHandoff,
        from: () => heroLib && { ...heroLib.featuredView(), rect: hero.getBoundingClientRect(), sources: heroLib.sources() },
        to: () => { if (!anatomyObj) return null; const rect = anatomyPin.getBoundingClientRect(); return { ...anatomyObj.restView(rect), rect }; },
      });
      courierReady = true; onScroll();
      return courier;
    }) });
  }
}).catch(error => {
  root.classList.add('mc-no3d');
  console.warn('3D stage unavailable; the page stays readable.', error);
});

/* ---- chapter text in step with scrolling ---- */
function chapter(section, { steps, rail: railSteps = steps, notes = false }) {
  const captions = $$('.mc-captions [data-caption]', section), noteItems = $$('.mc-notes li', section);
  const setRail = rail($('.mc-rail', section)), setCaption = stepper(captions), setNote = stepper(noteItems);
  return p => {
    const index = steps(p);
    setRail(p, railSteps(p));
    setCaption(index);
    if (notes) setNote(index);
    section.dataset.step = index;
  };
}
const anatomySection = $('#metacase'), structureSection = $('#structure'), netSection = $('#net');
if (anatomySection) sceneControllers.push([anatomySection, chapter(anatomySection, {
  steps: p => (p > .88 ? 7 : p < .06 ? -1 : clamp(Math.floor((p - .08) / .72 * 7), 0, 6)),
  rail: p => (p < .06 ? -1 : clamp(Math.floor((p - .08) / .72 * 7), 0, 6)),
  notes: true,
})]);
if (structureSection) sceneControllers.push([structureSection, chapter(structureSection, { steps: p => (p < .36 ? 0 : p < .7 ? 1 : 2) })]);
if (netSection) {
  const update = chapter(netSection, { steps: p => (p < .26 ? 0 : p < .5 ? 1 : p < .76 ? 2 : 3) });
  sceneControllers.push([netSection, p => {
    update(p);
    netSection.classList.toggle('is-foundation', p >= .76);
  }]);
}

// reveals, staggered within their parent
const revealer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  entry.target.classList.add('in');
  revealer.unobserve(entry.target);
  $$('[data-count]', entry.target).forEach(countUp);
}), { rootMargin: '0px 0px -12% 0px' });
$$('.mc-r').forEach(node => { node.style.setProperty('--i', [...node.parentElement.children].filter(c => c.classList.contains('mc-r')).indexOf(node)); revealer.observe(node); });
function countUp(node) {
  const target = Number(node.dataset.count);
  if (reduce || !target) return;
  const start = performance.now();
  const step = now => { const k = ease((now - start) / 1400); node.textContent = Math.round(target * k); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// cards catch a light where the pointer is
if (!reduce) $$('.mc-card').forEach(card => {
  card.addEventListener('pointermove', event => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${((event.clientX - r.left) / r.width * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${((event.clientY - r.top) / r.height * 100).toFixed(1)}%`);
  });
});

// section nav: the section in view, and reading progress
const spies = $$('.mc-subnav a');
const spyTargets = spies.map(a => $(a.getAttribute('href')));
const bar = $('.mc-subnav-bar');
function navUpdate() {
  const mid = innerHeight * .4;
  let current = -1;
  spyTargets.forEach((target, i) => { if (target && target.getBoundingClientRect().top < mid) current = i; });
  spies.forEach((a, i) => a.classList.toggle('active', i === current));
  if (bar && subnav) {
    const start = subnav.offsetTop, end = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', clamp((scrollY - start) / Math.max(1, end - start)).toFixed(4));
  }
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    sceneControllers.forEach(([section, fn]) => { if (getComputedStyle($('.mc-scene-pin', section)).position === 'sticky') fn(pinProgress(section)); });
    if (courierReady) {
      const k = bookHandoff();
      courierEl.style.display = k > 0 && k < 1 ? '' : 'none';
      courierCanvas.style.opacity = (1 - ease((k - HANDOVER) / (1 - HANDOVER))).toFixed(3);
    }
    navUpdate();
  });
}
if (siteHeader) new ResizeObserver(() => { root.style.setProperty('--mc-hh', `${siteHeader.offsetHeight}px`); onScroll(); }).observe(siteHeader);
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();
