/* metacase.js — v2 homepage behaviours. One shared WebGL stage draws every 3D picture
 * (the library, the opening case, the archive wall and the card vignettes);
 * this file registers them, keeps the notes, captions, tags and signature rails in step
 * with scrolling, and handles reveals, counters and the section nav. Visible text stays
 * in the page so language.js translates it. */
import { createSignatureRail } from './mc-rail.js?v=20261027-eason8c';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
const V = '?v=20261029-flip';

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
const contentMax = parseFloat(getComputedStyle(root).getPropertyValue('--content-max')) || 1248;
const place = (el, s) => {
  if (!el) return;
  if (!s || !s.visible) { el.style.opacity = 0; el.classList.remove('on'); return; }
  let x = s.x;
  const notes = el.parentElement?.classList.contains('mc-notes') && el.parentElement;
  if (notes) {
    // on wide screens chapter 01's notes stand in one column on the right gutter, clear of the
    // open book, each with a leader line back to its page; elsewhere they sit beside that point,
    // kept inside the chapter
    const W = notes.clientWidth, w = el.offsetWidth || 300, wide = W > 1080;
    x = wide ? W - Math.max(24, (W - contentMax) / 2 + 24) - w - 18 : Math.min(W - w - 20, Math.max(16, x));
    el.classList.remove('flip');
    el.style.setProperty('--lead', `${Math.max(0, x - s.x).toFixed(1)}px`);
  }
  el.style.transform = `translate(${x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
  el.style.opacity = s.opacity.toFixed(3);
  el.classList.toggle('on', !!s.active);
};

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

/* ---- 01 → 02 → 03: the closed Metacase goes on, desk to reading table to library ---- */
// From the moment chapter a lets go of its pin (0) to the moment chapter b pins (1).
// The chapters and the couriers read the same values, as for the hero hand-off.
function between(a, b) {
  const pinA = a && $('.mc-scene-pin', a), pinB = b && $('.mc-scene-pin', b);
  if (!pinA || !pinB) return 1;
  const pinTop = parseFloat(getComputedStyle(pinB).top) || 0, h = pinA.offsetHeight;
  const span = Math.max(1, b.getBoundingClientRect().top - a.getBoundingClientRect().bottom + h);
  return clamp(((pinTop - a.getBoundingClientRect().bottom + h) / span - .02) / .98);
}
const memo = fn => { let at = -1, value = 0; return () => { const now = performance.now(); if (now - at > 4) { at = now; value = fn(); } return value; }; };
const k12 = memo(() => between($('#metacase'), $('#structure'))), k23 = memo(() => between($('#structure'), $('#net')));
let archiveObj = null, storyLib = null, relay12 = false, relay23 = false;
const RELEASE = .05; // the chapter keeps its book until the courier, in the same place, has faded in
const carried12 = () => relay12 && anatomyObj && archiveObj && !reduce;
const carried23 = () => relay23 && archiveObj && storyLib && !reduce;
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

  // 01: the Metacase opens. Its pages print the five stage notes (title, keywords, page lines,
  // the step words of stage 03), and are reprinted when that text changes, e.g. its language.
  const anatomy = $('#metacase'), notes = $$('[data-notes="anatomy"] li', anatomy);
  const read = (li, sel) => (li.querySelector(sel)?.textContent || '').trim();
  const stageText = () => notes.slice(0, STAGES).map(li => ({
    title: read(li, 'strong'), key: read(li, '[data-page="key"]'),
    lines: $$('[data-page="line"]', li).map(el => el.textContent.trim()),
    steps: read(li, '[data-page="steps"]').split('·').map(w => w.trim()).filter(Boolean),
  }));
  let reprint = 0;
  new MutationObserver(() => { cancelAnimationFrame(reprint); reprint = requestAnimationFrame(() => anatomyObj?.relabel()); })
    .observe($('[data-notes="anatomy"]', anatomy), { characterData: true, childList: true, subtree: true });
  const FEATHER = [72, 150]; // the chapters fade into the page at their upper and lower edges
  stage.add({ el: $('.mc-scene-pin', anatomy), near: 2.5, postOptions: { bloom: .32, threshold: .9, vignette: .2, feather: FEATHER }, progress: () => pinProgress(anatomy),
    build: () => import('./metacase-anatomy.js' + V).then(m => anatomyObj = m.createAnatomy({ reduce, stageText, safe: safeArea($('.mc-scene-pin', anatomy)), held: () => (carrying() && bookHandoff() < HANDOVER) || (carried12() && k12() > RELEASE), onProject: (list, extra) => {
      list.forEach((s, i) => place(notes[i], { ...s, opacity: s.active ? s.opacity : 0 }));
      place(notes[STAGES], { ...extra.signature, opacity: extra.draw, visible: extra.draw > .05, active: true });
    } })) });

  // 02: the archive answers by structure
  const structure = $('#structure'), archiveTags = $$('[data-tags="archive"] [data-tag]', structure), verdictTags = $$('[data-tags="verdict"] [data-tag]', structure);
  stage.add({ el: $('.mc-scene-pin', structure), near: 2.5, postOptions: { bloom: .34, threshold: .9, vignette: .2, feather: FEATHER }, progress: () => pinProgress(structure),
    build: () => import('./metacase-archive.js' + V).then(m => archiveObj = m.createArchive({ reduce, safe: safeArea($('.mc-scene-pin', structure)),
      held: () => (carried12() && k12() < HANDOVER) || (carried23() && k23() > RELEASE),
      onProject: (list, extra) => { list.forEach((s, i) => place(archiveTags[i], s)); extra.labels.forEach((s, i) => place(verdictTags[i], s)); } })) });

  // 03: the library, cross-referenced wing by wing
  const net = $('#net'), worldTags = $$('[data-tags="world"] [data-tag]', net);
  let storyBuild = null;
  const story = () => storyBuild ||= import('./metacase-library.js' + V).then(m => storyLib = m.createLibrary({ mode: 'story', reduce, held: () => carried23() && k23() < HANDOVER, onProject: list => list.forEach((s, i) => place(worldTags[i], s)) }));
  stage.add({ el: $('.mc-scene-pin', net), near: 2, postOptions: { bloom: .35, threshold: .9, vignette: .22, feather: FEATHER }, progress: () => pinProgress(net), build: story });

  // 05: the participation workflow, from a case to a contribution
  const rules = $('#rules'), runTags = $$('[data-tags="run"] [data-tag]', rules);
  if (rules) stage.add({ el: $('.mc-scene-pin', rules), near: 1.5, postOptions: { bloom: .32, threshold: .9, vignette: .2, feather: FEATHER }, progress: () => pinProgress(rules),
    build: () => import('./metacase-run.js' + V).then(m => m.createRun({ reduce, safe: safeArea($('.mc-scene-pin', rules)), onProject: list => list.forEach((s, i) => place(runTags[i], s)) })) });

  // card vignettes
  $$('.mc-art').forEach(el => stage.add({ el, near: 1, order: bookDepth(el), build: () => import('./metacase-cards.js' + V).then(m => m.createCard(el.dataset.art, el)) }));

  // the courier: on its own canvas, while the Metacase travels from shelf to desk
  if (!reduce) {
    const anatomyPin = $('.mc-scene-pin', anatomy);
    const top = createStage(courierCanvas, { reduce, clipTop });
    top.add({ el: courierEl, near: 0, build: () => import('./metacase-courier.js' + V).then(m => {
      const courier = m.createCourier({
        progress: bookHandoff, clip: clipTop,
        from: () => heroLib && { ...heroLib.featuredView(), rect: hero.getBoundingClientRect(), sources: heroLib.sources() },
        to: () => { if (!anatomyObj) return null; const rect = anatomyPin.getBoundingClientRect(); return { ...anatomyObj.restView(rect), rect }; },
      });
      courierReady = true; onScroll();
      return courier;
    }) });
    // desk → reading table → library: the same book, now closed on its signature
    const structurePin = $('.mc-scene-pin', structure), netPin = $('.mc-scene-pin', net);
    const view = (el, get) => { const rect = el.getBoundingClientRect(); return { ...get(rect), rect }; };
    top.add({ el: courierEl, near: 0, build: () => import('./metacase-courier.js' + V).then(m => {
      const courier = m.createCourier({ progress: k12, signed: true, media: false, pull: m.PULLS.desk, clip: clipTop,
        from: () => anatomyObj && view(anatomyPin, r => anatomyObj.endView(r)),
        to: () => archiveObj && view(structurePin, r => archiveObj.queryView(r, 0)) });
      relay12 = true; onScroll();
      return courier;
    }) });
    top.add({ el: courierEl, near: 0, build: () => import('./metacase-courier.js' + V).then(m => {
      const courier = m.createCourier({ progress: k23, signed: true, media: false, pull: m.PULLS.desk, clip: clipTop,
        from: () => archiveObj && view(structurePin, r => archiveObj.queryView(r, 1)),
        to: () => storyLib && view(netPin, r => storyLib.tableView(r)) });
      relay23 = true; onScroll();
      return courier;
    }) });
  }
}).catch(error => {
  root.classList.add('mc-no3d');
  console.warn('3D stage unavailable; the page stays readable.', error);
});

/* ---- chapter text in step with scrolling ---- */
function scrollToProgress(section, p) {
  const pin = $('.mc-scene-pin', section);
  if (!pin) return;
  const pinTop = parseFloat(getComputedStyle(pin).top) || 0;
  const top = scrollY + section.getBoundingClientRect().top - pinTop + clamp(p) * (section.offsetHeight - pin.offsetHeight);
  if (window.__lenis) window.__lenis.scrollTo(top);
  else window.scrollTo({ top, behavior: 'smooth' });
}
function chapter(section, { steps, rail: railSteps = steps, notes = false, targets = null }) {
  const captions = $$('.mc-captions [data-caption]', section), noteItems = $$('.mc-notes li', section);
  const railEl = $('.mc-rail', section), n = railEl ? $$('li', railEl).length : 1;
  const setRail = createSignatureRail(railEl, { onSelect: i => scrollToProgress(section, targets ? targets[i] : (i + .5) / n) });
  const setCaption = stepper(captions), setNote = stepper(noteItems);
  return p => {
    const index = steps(p);
    setRail(p, railSteps(p));
    setCaption(index);
    if (notes) setNote(index);
    section.dataset.step = index;
  };
}
const anatomySection = $('#metacase'), structureSection = $('#structure'), netSection = $('#net');
// Chapter 01 has five stages while the book is open (.13–.8 of its scroll, as in
// metacase-anatomy.js), then the signature once it is closed.
const STAGES = 5, stageAt = p => clamp(Math.floor((p - .13) / .67 * STAGES), 0, STAGES - 1);
if (anatomySection) sceneControllers.push([anatomySection, chapter(anatomySection, {
  steps: p => (p > .88 ? STAGES : p < .06 ? -1 : stageAt(p)),
  rail: p => (p < .06 ? -1 : stageAt(p)),
  targets: [0, 1, 2, 3, 4].map(i => .13 + (i + .45) / STAGES * .67),
  notes: true,
})]);
if (structureSection) sceneControllers.push([structureSection, chapter(structureSection, {
  steps: p => (p < .4 ? 0 : p < .75 ? 1 : 2),
  targets: [.2, .57, .88],
})]);
const rulesSection = $('#rules');
// 05: choose, configure, execute, verify, contribute (the phases of metacase-run.js)
if (rulesSection) sceneControllers.push([rulesSection, chapter(rulesSection, {
  steps: p => (p < .2 ? 0 : p < .4 ? 1 : p < .61 ? 2 : p < .81 ? 3 : 4),
  targets: [.16, .35, .53, .74, .95],
})]);
if (netSection) {
  const update = chapter(netSection, {
    steps: p => (p < .26 ? 0 : p < .5 ? 1 : p < .76 ? 2 : 3),
    targets: [.13, .38, .63, .88],
  });
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

/* ---- 04: the field books. With this script the three books share one stage, as on a carousel:
 * the chosen field's book in the middle, the other two smaller at the sides (a click, or the
 * arrow keys on the tabs, brings one to the middle). The chosen field is then read as an open
 * two-page book in the field's colour standing in the middle of the stage, over its 3D picture:
 * its cover opens to show all six class slots at once — three on the left-hand page and three on
 * the right-hand page (stacked on narrow screens) — with no manual page-flipping needed inside a
 * book. Choosing another field closes the cover and fades the book, the books trade places, and
 * the new field's book grows out of its picture and opens its cover. Every step checks that it is
 * still wanted, so quick choices settle on the last one. Without the script every field's classes
 * are simply listed under its name. ---- */
const fieldbooks = $('[data-fieldbooks]');
// The 3D stage draws the field books back to front: the one crossing behind, those at the sides, the chosen one.
const bookDepth = el => {
  const book = el.closest('.mc-fbook');
  return book ? () => (book.classList.contains('is-crossing') ? 1 : book.dataset.slot === 'center' ? 3 : 2) : undefined;
};
if (fieldbooks) {
  const row = $('.mc-bookrow', fieldbooks), tabs = $$('[role="tab"]', row);
  const panels = tabs.map(tab => $('#' + tab.getAttribute('aria-controls')));
  const N = tabs.length, HALF = 3;
  const MOVE = 560, EASE = 'cubic-bezier(0.05, 0.7, 0.1, 1)', STD = 'cubic-bezier(0.2, 0, 0, 1)'; // --duration-emphasized, --ease-*
  const CLOSE = 250, ARRIVE = 300, TURN = 650; // the book closing and fading; growing out of its picture; the cover opening
  const wideMQ = matchMedia('(min-width: 900px)');
  let wide = wideMQ.matches, chosen = Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'));
  let gen = 0, flights = [], seen = reduce, wanted = chosen;
  const wait = ms => new Promise(done => setTimeout(done, ms));
  const make = (cls, ...kids) => { const el = document.createElement('div'); el.className = cls; el.append(...kids.filter(Boolean)); return el; };
  fieldbooks.classList.add('is-books');

  // The cover's emblem, as on the 3D book's label (metacase-cards.js emblem()).
  function emblem(field) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 512 256'); svg.setAttribute('class', 'mc-emblem'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    let ink = '';
    if (field === 'fin') ink = [[136, 132, 64], [196, 112, 72], [256, 128, 52], [316, 92, 76], [376, 72, 70]]
      .map(([x, y, h], k) => `<g${k === 2 ? ' class="is-down"' : ''}><rect x="${x - 17}" y="${y}" width="34" height="${h}"/><rect x="${x - 3}" y="${y - 20}" width="6" height="${h + 40}"/></g>`).join('');
    else if (field === 'soc') ink = [170, 256, 342].map(x => `<circle cx="${x}" cy="104" r="27"/><path d="M${x - 52} 206a52 52 0 0 1 104 0z"/>`).join('');
    else ink = [[118, 176], [158, 150], [196, 164], [236, 128], [272, 138], [312, 106], [352, 114], [390, 84]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11"/>`).join('') + '<path class="is-line" d="M100 184 412 74"/>';
    svg.innerHTML = `<rect class="is-paper" width="512" height="256"/><rect class="is-rule" x="14" y="14" width="484" height="228"/><g class="is-ink">${ink}</g>`;
    return svg;
  }

  // One book per field. Its six class articles are placed three on the left-hand page and three
  // on the right-hand page; the list they came from stays behind, empty and hidden.
  const books = panels.map((panel, f) => {
    const b = {
      panel, tab: tabs[f], field: panel.dataset.field, pages: $$('.mc-page', panel), slots: $$('.mc-pages > li', panel),
      head: $('.mc-flip-head', panel), book: make('mc-book'), leaves: [], s: 0, settle: 0, z: 0, next: 0, anims: [],
    };
    $('.mc-pages', panel).after(b.book);
    panel.tabIndex = 0;
    bind(b);
    b.book.addEventListener('click', () => { if (!b.s) turnTo(b, 1); });
    panel.addEventListener('keydown', event => {
      const dir = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!dir || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const k = (wanted + dir + N) % N;
      tabs[k].focus();
      choose(k);
    });
    return b;
  });

  // The two-page spread of a book. Wide: the cover leaf holds the closed cover on its front and
  // the left-hand page (classes 1–3) on its back; the base holds the right-hand page (classes 4–6).
  // Narrow: the cover leaf sits over the two pages stacked one above the other.
  function bind(b, open = 0) {
    b.pages.forEach((article, i) => b.slots[i].append(article));
    b.book.replaceChildren();
    const cover = make('mc-face is-front mc-cover', make('mc-cover-label', b.head, emblem(b.field)));
    const left = make('mc-sheet is-left', ...b.pages.slice(0, HALF));
    const right = make('mc-sheet is-right', ...b.pages.slice(HALF));
    const plan = wide ? [[cover, make('mc-face is-back mc-board-page', left)]] : [[cover]];
    b.book.append(make('mc-case'), make('mc-ribbon'), make('mc-leaf is-base', make('mc-face is-front', ...(wide ? [right] : [left, right]))));
    b.leaves = plan.map(([front, back]) => { const leaf = make('mc-leaf is-cover', front, back); b.book.append(leaf); return leaf; });
    b.s = open ? 1 : 0;
    lay(b);
  }

  // the stack at rest: position 0 is closed cover, position 1 is open spread
  function lay(b) {
    clearTimeout(b.settle); b.z = 0; b.next = 0;
    b.book.dataset.s = b.s; b.book.style.removeProperty('--dur');
    b.leaves.forEach((leaf, i) => {
      leaf.classList.remove('is-turning', 'is-back');
      leaf.classList.toggle('is-turned', i < b.s);
      leaf.classList.toggle('is-gone', !wide && i < b.s);
      leaf.style.zIndex = i < b.s ? 10 + i : 10 + b.leaves.length - i;
      leaf.style.removeProperty('--delay');
    });
  }

  // Turn the cover to position s (0 = closed, 1 = open).
  function turnTo(b, s, { together = false, dur = TURN } = {}) {
    s = Math.max(0, Math.min(b.leaves.length, s));
    const from = b.s;
    if (s === from) return;
    b.s = s; b.book.dataset.s = s;
    if (reduce) { lay(b); return; }
    b.book.style.setProperty('--dur', `${dur}ms`);
    const order = [];
    if (s > from) for (let i = from; i < s; i++) order.push(i); else for (let i = from - 1; i >= s; i--) order.push(i);
    const now = performance.now();
    let last = now;
    order.forEach(i => {
      const leaf = b.leaves[i], busy = leaf.classList.contains('is-turning');
      const start = together || busy ? now : Math.max(now, b.next);
      if (!together) b.next = start + dur / 2;
      last = Math.max(last, start);
      leaf.style.setProperty('--delay', `${Math.round(start - now)}ms`);
      leaf.style.zIndex = 40 + ++b.z;
      if (!busy) { leaf.classList.remove('is-turning'); void leaf.offsetWidth; }
      leaf.classList.add('is-turning');
      leaf.classList.toggle('is-back', s < from);
      leaf.classList.remove('is-gone');
      leaf.classList.toggle('is-turned', i < s);
    });
    clearTimeout(b.settle);
    b.settle = setTimeout(() => lay(b), last - now + dur + 80);
  }

  /* -- the stage -- */
  const slotOf = k => (k === chosen ? 'center' : (k - chosen + N) % N === 1 ? 'right' : 'left');
  const art = tab => $('.mc-art', tab);
  // Lay out the stage for the current choice: the chosen book's label above the open book, the
  // other two books level with its middle (wide), or in a row above it (narrow).
  function place() {
    const centre = tabs[chosen], a = art(centre), label = $('.mc-fbook-label', centre);
    const panel = panels[chosen], bookH = books[chosen].book.offsetHeight;
    let top;
    if (wide) {
      centre.style.top = '0px';
      top = a.offsetTop;
      tabs.forEach(tab => { if (tab !== centre) tab.style.top = `${Math.round(top + bookH / 2 - art(tab).offsetTop - art(tab).offsetHeight / 2)}px`; });
    } else {
      const side = Math.max(...tabs.filter(tab => tab !== centre).map(tab => tab.offsetHeight));
      tabs.forEach(tab => { tab.style.top = tab === centre ? `${Math.round(Math.max(0, (side - label.offsetHeight) / 2))}px` : '0px'; });
      top = Math.max(side, label.offsetHeight) + 16;
    }
    fieldbooks.style.setProperty('--book-top', `${Math.round(top)}px`);
    row.style.height = `${Math.round(top + panel.offsetHeight)}px`;
  }

  // Bring field `next` to the middle: the books fly from where they are to their new slots (FLIP);
  // the one going from one side to the other passes behind the chosen one, a little smaller.
  function rotate(next, fly) {
    const before = fly ? tabs.map(tab => tab.getBoundingClientRect()) : null, was = tabs.map(tab => tab.dataset.slot);
    flights.forEach(flight => flight.cancel()); flights = [];
    chosen = next;
    tabs.forEach((tab, k) => {
      const slot = slotOf(k);
      tab.classList.toggle('is-crossing', !!fly && was[k] !== 'center' && slot !== 'center' && slot !== was[k]);
      tab.dataset.slot = slot;
    });
    place();
    if (before) tabs.forEach((tab, k) => {
      const a = before[k], b = tab.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < .01) return;
      const from = { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, to = { transform: 'none' };
      const frames = tab.classList.contains('is-crossing')
        ? [from, { offset: .5, transform: `translate(${dx / 2}px, ${dy / 2 - 24}px) scale(${(sx + 1) * .38}, ${(sy + 1) * .38})` }, to]
        : [from, to];
      const move = tab.animate(frames, { duration: MOVE, easing: EASE });
      move.finished.then(() => tab.classList.remove('is-crossing'), () => {});
      // its caption changes with its slot: hidden in flight, it fades in as the book arrives
      flights.push(move, $('.mc-fbook-label', tab).animate([{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1 }], { duration: MOVE }));
    });
    stage?.request();
  }

  const reading = (b, on) => { b.tab.classList.toggle('is-reading', on); stage?.request(); };
  const stop = b => { b.anims.forEach(anim => anim.cancel()); b.anims = []; };
  const busy = b => b.anims.some(anim => anim.playState === 'running');
  // the open book closes and fades; its 3D picture shows again underneath
  async function putAway(b, my) {
    reading(b, false);
    const o = Number(getComputedStyle(b.book).opacity);
    stop(b);
    turnTo(b, 0, { together: true, dur: CLOSE });
    b.anims = [b.book.animate([{ opacity: o }, { opacity: 0 }], { duration: CLOSE, easing: STD, fill: 'forwards' })];
    await wait(CLOSE);
    if (my !== gen) return false;
    hide(b);
    return true;
  }
  function hide(b) { stop(b); reading(b, false); b.panel.classList.remove('is-shown'); b.s = 0; lay(b); }
  // the chosen field's book grows out of its picture, closed, then opens its cover
  async function bringOut(b, my) {
    b.panel.classList.add('is-shown');
    place();
    const a = art(b.tab).getBoundingClientRect(), c = b.leaves[0].getBoundingClientRect();
    b.book.style.transformOrigin = wide ? '75% 50%' : '50% 50%';
    const k = a.width ? Math.min(.86, Math.max(.3, Math.min(a.width * .62 / c.width, a.height * .7 / c.height))) : .9;
    const dx = a.width ? a.left + a.width / 2 - (c.left + c.width / 2) : 0, dy = a.width ? a.top + a.height / 2 - (c.top + c.height / 2) : 0;
    stop(b);
    b.anims = [
      b.book.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${k})`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: ARRIVE, easing: EASE }),
    ];
    await wait(ARRIVE * .4);
    if (my !== gen) return;
    reading(b, true);
    await wait(ARRIVE * .6);
    if (my !== gen) return;
    if (seen) turnTo(b, 1);
  }

  async function choose(next, { animate = true } = {}) {
    const my = ++gen, fly = animate && !reduce && tabs.every(tab => tab.dataset.slot);
    wanted = next;
    tabs.forEach((tab, k) => { tab.setAttribute('aria-selected', String(k === next)); tab.tabIndex = k === next ? 0 : -1; });
    const target = books[next];
    if (!fly) {
      books.forEach(b => { if (b !== target) hide(b); });
      rotate(next, false);
      target.panel.classList.add('is-shown');
      stop(target); reading(target, true); place();
      target.s = seen ? 1 : 0; lay(target);
      return;
    }
    const out = books.filter(b => b.panel.classList.contains('is-shown'));
    if (out.length === 1 && out[0] === target && chosen === next && !busy(target)) { // already open here
      turnTo(target, 1);
      return;
    }
    for (const b of out) if (!(await putAway(b, my))) return;
    if (chosen !== next) {
      rotate(next, true);
      await wait(MOVE * .8);
      if (my !== gen) return;
    }
    await bringOut(target, my);
  }

  // a link to a field or to one of its classes (#fb-fin, #fb-fin-nlp) opens that field's book
  const linked = () => {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* not a field */ }
    const target = id && document.getElementById(id);
    const f = target ? tabs.findIndex((tab, i) => tab === target || panels[i].contains(target)) : -1;
    return f < 0 ? null : { f };
  };
  let start = linked();
  if (start) chosen = start.f;
  addEventListener('hashchange', () => { const to = linked(); if (to) choose(to.f); });

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => { if (i !== wanted) choose(i); });
    tab.addEventListener('keydown', event => {
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: N - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      const k = (to + N) % N;
      tabs[k].focus();
      if (k !== wanted) choose(k);
    });
  });
  // the first layout is not animated; the cover opens when the stage comes into view
  choose(chosen, { animate: false });
  if (!seen) {
    const reveal = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      reveal.disconnect();
      seen = true;
      const b = books[chosen];
      if (b.panel.classList.contains('is-shown') && !b.s) turnTo(b, 1);
    }, { threshold: .35 });
    reveal.observe(row);
  }
  // two pages side by side or stacked: the books are bound again when the window crosses the line
  wideMQ.addEventListener('change', () => {
    const at = books.map(b => b.s);
    wide = wideMQ.matches;
    books.forEach((b, i) => bind(b, at[i]));
    place(); stage?.request();
  });
  // measured again whenever the stage or a label changes size (the window, the fonts, the language)
  let queued = 0;
  const watch = new ResizeObserver(() => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; place(); stage?.request(); }); });
  [fieldbooks, ...$$('.mc-fbook-label', fieldbooks)].forEach(el => watch.observe(el));
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
    if (courierReady || relay12 || relay23) {
      const live = k => k > 0 && k < 1, landed = k => 1 - ease((k - HANDOVER) / (1 - HANDOVER));
      const k1 = courierReady ? bookHandoff() : 0, k2 = relay12 ? k12() : 0, k3 = relay23 ? k23() : 0;
      courierEl.style.display = live(k1) || live(k2) || live(k3) ? '' : 'none';
      // desk → table passes behind chapter 02's heading, as the chapters do; the others fly over
      // the page (the hero's text backdrop, the reader cards between 02 and 03)
      courierCanvas.style.zIndex = live(k2) ? '0' : '';
      const k = live(k1) ? k1 : live(k2) ? k2 : k3;
      courierCanvas.style.opacity = (live(k1) ? landed(k) : Math.min(ease(k / RELEASE), landed(k))).toFixed(3);
    }
    navUpdate();
  });
}
if (siteHeader) new ResizeObserver(() => { root.style.setProperty('--mc-hh', `${siteHeader.offsetHeight}px`); onScroll(); }).observe(siteHeader);
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();
