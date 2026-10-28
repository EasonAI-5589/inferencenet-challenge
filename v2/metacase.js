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
const V = '?v=20261028-fieldspop';

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

/* ---- 04: the field books. With this script the three books share one stage: the chosen field's
 * book stands open in the middle, the largest, and its classes rise out of its pages as paper
 * slips that settle in a column on either side of it (below 1180px, in a list under the books);
 * the other two wait at the sides, smaller and dimmer. Choosing one of them brings it to the
 * middle, the books trading places as on a carousel, while the slips on show fold back into their
 * own book. Every move starts from wherever things are, so a quick second choice simply turns
 * them round. The books are tabs with the usual keys: arrows (Home, End) move between them.
 * Without the script every field's classes are simply listed under its name. ---- */
const fieldbooks = $('[data-fieldbooks]');
// The 3D stage draws the field books back to front: the one crossing behind, those at the sides, the chosen one.
const bookDepth = el => {
  const book = el.closest('.mc-fbook');
  return book ? () => (book.classList.contains('is-crossing') ? 1 : book.dataset.slot === 'center' ? 3 : 2) : undefined;
};
if (fieldbooks) {
  const row = $('.mc-bookrow', fieldbooks), books = $$('[role="tab"]', row);
  const panels = books.map(tab => $('#' + tab.getAttribute('aria-controls')));
  const N = books.length, PAGES = [.56, .44]; // where a book's open pages are in its picture
  const MOVE = 560, EASE = 'cubic-bezier(0.05, 0.7, 0.1, 1)'; // --duration-emphasized, --ease-emphasized
  const RISE = 260, ROW = 70, GAP = 14; // slips rise once their book is nearly in the middle, row after row
  const TILT = [-.8, .5, -.4, .7, -.5, .35]; // slips set down by hand, not quite square
  let chosen = Math.max(0, books.findIndex(tab => tab.getAttribute('aria-selected') === 'true'));
  let seen = reduce, flights = [];
  fieldbooks.classList.add('is-books');
  panels.forEach(panel => { panel.tabIndex = 0; });
  const slotOf = k => (k === chosen ? 'center' : (k - chosen + N) % N === 1 ? 'right' : 'left');
  // positions in the stage come from the layout, which the books' flights leave alone
  const at = el => { let x = 0, y = 0; for (let n = el; n && n !== fieldbooks; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y }; };
  const art = book => $('.mc-art', book);
  const pages = book => { const a = art(book), p = at(a); return { x: p.x + a.offsetWidth * PAGES[0], y: p.y + a.offsetHeight * PAGES[1] }; };
  const halves = panel => { const items = $$('.mc-slip', panel), half = Math.ceil(items.length / 2); return [items.slice(0, half), items.slice(half)]; };
  const tall = list => list.reduce((sum, li) => sum + li.offsetHeight, 0) + GAP * Math.max(0, list.length - 1);

  // Lay out the stage for the current choice: the books in their slots, every field's slips in
  // their places, and for each slip the way back into its own book (--ox, --oy).
  function place() {
    const css = getComputedStyle(fieldbooks), wide = css.getPropertyValue('--fb-wide').trim() === '1';
    const gap = parseFloat(css.getPropertyValue('--fb-gap')) || 22, centre = books[chosen];
    const columns = panels.map(halves);
    if (wide) panels.forEach((panel, f) => columns[f].forEach((list, c) => list.forEach(li => { li.dataset.side = c ? 'r' : 'l'; })));
    else panels.forEach(panel => $$('.mc-slip', panel).forEach(li => { li.dataset.side = 's'; li.style.left = li.style.top = ''; li.style.removeProperty('--tilt'); }));
    let H = centre.offsetHeight;
    if (wide) columns.forEach(pair => pair.forEach(list => { H = Math.max(H, tall(list)); }));
    H = Math.round(H + (wide ? 48 : 0));
    row.style.height = `${H}px`;
    // the books stand on the line through the middle of the chosen book's picture
    const top = Math.round((H - centre.offsetHeight) / 2), axis = top + art(centre).offsetTop + art(centre).offsetHeight / 2;
    books.forEach(book => { book.style.top = `${book === centre ? top : Math.round(axis - art(book).offsetTop - art(book).offsetHeight / 2)}px`; });
    panels.forEach((panel, f) => {
      const o = pages(books[f]), items = $$('.mc-slip', panel);
      const hinge = (li, x, y, delay) => {
        li.style.setProperty('--ox', `${Math.round(o.x - x)}px`);
        li.style.setProperty('--oy', `${Math.round(o.y - y)}px`);
        li.style.setProperty('--d', delay);
      };
      if (wide) columns[f].forEach((list, c) => {
        let y = (H - tall(list)) / 2;
        list.forEach((li, r) => {
          const w = li.offsetWidth, h = li.offsetHeight, x = c ? centre.offsetLeft + centre.offsetWidth + gap : centre.offsetLeft - gap - w;
          li.style.left = `${Math.round(x)}px`; li.style.top = `${Math.round(y)}px`;
          li.style.setProperty('--tilt', `${TILT[(r * 2 + c) % TILT.length]}deg`);
          hinge(li, c ? x : x + w, y + h / 2, r * ROW + c * 35);
          y += h + GAP;
        });
      });
      else items.forEach((li, i) => { const p = at(li); hinge(li, p.x + li.offsetWidth / 2, p.y, Math.min(i, 6) * 55); });
      items.forEach((li, i) => li.style.setProperty('--fd', (items.length - 1 - i) * 18));
    });
  }

  // Bring field `next` to the middle. The books fly from where they are to their new slots (FLIP);
  // the one going from one side to the other passes behind the chosen one, a little smaller.
  function choose(next, animate = true) {
    const fly = animate && !reduce && books.every(book => book.dataset.slot);
    const before = fly ? books.map(book => book.getBoundingClientRect()) : null, was = books.map(book => book.dataset.slot);
    flights.forEach(flight => flight.cancel()); flights = [];
    chosen = next;
    books.forEach((tab, k) => {
      const on = k === next, slot = slotOf(k);
      tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1;
      tab.classList.toggle('is-crossing', fly && was[k] !== 'center' && slot !== 'center' && slot !== was[k]);
      tab.dataset.slot = slot;
    });
    place();
    panels.forEach((panel, k) => {
      panel.classList.toggle('is-current', k === next);
      if (k !== next) panel.classList.remove('is-open');
    });
    if (seen) rise(panels[next], animate ? RISE : 0);
    if (before) books.forEach((tab, k) => {
      const a = before[k], b = tab.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < .01) return;
      const from = { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, to = { transform: 'none' };
      const frames = tab.classList.contains('is-crossing')
        ? [from, { offset: .5, transform: `translate(${dx / 2}px, ${dy / 2 - 24}px) scale(${(sx + 1) * .38}, ${(sy + 1) * .38})` }, to]
        : [from, to];
      const move = tab.animate(frames, { duration: MOVE, easing: EASE });
      move.finished.then(() => tab.classList.remove('is-crossing'), () => {});
      // its caption changes size with its slot: hidden in flight, it fades in as the book arrives
      flights.push(move, $('.mc-fbook-label', tab).animate([{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1 }], { duration: MOVE }));
    });
    stage?.request();
  }
  function rise(panel, delay) {
    if (panel.classList.contains('is-open')) return;
    // slips folded away out of sight start from the book in the middle, not from where it stood;
    // slips still on their way back turn round at once
    const first = $('.mc-slip', panel), away = !first || getComputedStyle(first).opacity === '0';
    if (away) { panel.classList.add('is-snap'); void panel.offsetWidth; panel.classList.remove('is-snap'); }
    panel.style.setProperty('--rise', `${away ? delay : 0}ms`);
    panel.classList.add('is-open');
  }

  // a link to a field or to one of its classes (#fb-fin, #fb-fin-nlp) brings that field's book to the middle
  const linked = () => {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* not a field */ }
    const target = id && document.getElementById(id);
    return target ? books.findIndex((tab, i) => tab === target || panels[i].contains(target)) : -1;
  };
  if (linked() >= 0) chosen = linked();
  addEventListener('hashchange', () => { const k = linked(); if (k >= 0 && k !== chosen) choose(k); });

  books.forEach((tab, i) => {
    tab.addEventListener('click', () => { if (i !== chosen) choose(i); });
    tab.addEventListener('keydown', event => {
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: N - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      const k = (to + N) % N;
      books[k].focus();
      if (k !== chosen) choose(k);
    });
  });
  // the first layout is not animated
  panels.forEach(panel => panel.classList.add('is-snap'));
  choose(chosen, false);
  void fieldbooks.offsetWidth;
  panels.forEach(panel => panel.classList.remove('is-snap'));
  // measured again whenever the stage or a slip changes size (the window, the fonts, the language)
  let queued = 0;
  const watch = new ResizeObserver(() => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; place(); stage?.request(); }); });
  [fieldbooks, ...$$('.mc-slip, .mc-fbook-label', fieldbooks)].forEach(el => watch.observe(el));
  // the slips first rise when the stage comes into view
  if (!seen) {
    const reveal = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      reveal.disconnect();
      seen = true;
      rise(panels[chosen], 160);
    }, { threshold: .35 });
    reveal.observe(row);
  }
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
