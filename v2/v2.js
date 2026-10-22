/* v2.js — shared behaviours of the v2 design layer. Load with defer after
 * site.js and language.js on every v2 page. Provides inertial scrolling, the
 * animated header backdrop of each content page, arrow icons for the shared
 * button and link markup, the logo replay, and links to shared assets. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) root.classList.add("rm");

  /* Inertial scrolling; native smooth scrolling remains if the library is unavailable. */
  if (!reduce && window.Lenis) {
    // A light smoothing factor keeps the page close to the wheel or trackpad, so it never feels behind.
    const lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 1 });
    window.__lenis = lenis;
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const headerOffset = () => {
    const header = document.querySelector(".site-header");
    const subnav = document.querySelector(".subnav");
    return (header ? header.offsetHeight : 64) + (subnav && getComputedStyle(subnav).position === "sticky" ? subnav.offsetHeight : 0) + 8;
  };
  // In-page links glide to their section. Tabs, panels and <details> keep site.js's hash handling.
  document.addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !window.__lenis || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    const hash = link.getAttribute("href");
    const target = hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target || target.closest('[role="tabpanel"], details') || target.matches('[role="tab"]')) return;
    event.preventDefault();
    window.__lenis.scrollTo(target, { offset: -headerOffset(), duration: 1.4 });
    history.replaceState(null, "", hash);
  });

  /* Header backdrop: each content page names its motif with data-backdrop. */
  const hero = document.querySelector(".page-hero[data-backdrop]");
  if (hero && window.Backdrop) {
    const layer = document.createElement("div");
    layer.className = "v2-backdrop";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = '<div class="v2-aurora"><i></i><i></i><i></i></div><canvas></canvas><span class="v2-veil"></span>';
    hero.prepend(layer);
    window.Backdrop.mount(layer.querySelector("canvas"), { mode: hero.dataset.backdrop, focus: [0.74, 0.5], host: hero });
  }

  /* Arrow glyphs in shared markup become icons; the glyph stays as the accessible fallback. */
  const directions = { "→": "right", "←": "left", "↓": "down", "↑": "up", "↗": "ne" };
  const markArrows = scope => {
    scope.querySelectorAll('a span[aria-hidden="true"], .button > span[aria-hidden="true"]').forEach(arrow => {
      const direction = directions[arrow.textContent.trim()];
      if (direction) arrow.dataset.arrow = direction;
    });
  };
  markArrows(document);

  /* Links that scripts render relative to the page point back to the shared assets. */
  const fixAssets = scope => {
    if (scope.matches && scope.matches('a[href^="assets/"]')) scope.setAttribute("href", "../" + scope.getAttribute("href"));
    if (scope.querySelectorAll) scope.querySelectorAll('a[href^="assets/"]').forEach(a => a.setAttribute("href", "../" + a.getAttribute("href")));
  };
  fixAssets(document.body);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) { fixAssets(node); markArrows(node); }
  }))).observe(document.body, { childList: true, subtree: true });

  /* The logo replays its derivation on hover. */
  const brand = document.querySelector(".site-header .wordmark");
  const mark = brand && brand.querySelector(".v2-mark");
  if (mark) brand.addEventListener("pointerenter", () => {
    mark.classList.remove("lg-anim");
    void mark.getBoundingClientRect();
    mark.classList.add("lg-anim");
  });
})();

/* ---- Content pages: the homepage's motion grammar on shared markup ---- */
(() => {
  if (document.body.classList.contains("v2-home")) return;
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RANGE = String.fromCharCode(0x3400) + "-" + String.fromCharCode(0x9fff);
  const CJK = new RegExp(`[${RANGE}]`), CHUNKS = new RegExp(`[${RANGE}]|[^${RANGE}]+`, "g");

  /* Kinetic headings. The original nodes stay in a visually hidden source span that
   * language.js translates in place; an aria-hidden mirror is split into words. */
  function mirror(el) {
    if (el.querySelector(":scope > .split-src")) return;
    const src = document.createElement("span"); src.className = "split-src";
    while (el.firstChild) src.append(el.firstChild);
    const vis = document.createElement("span"); vis.className = "split-vis";
    vis.setAttribute("aria-hidden", "true"); vis.setAttribute("data-no-translate", "");
    el.append(src, vis);
    const draw = () => {
      const tokens = [];
      for (const node of src.childNodes) {
        const em = node.nodeType === 1 && node.tagName === "EM";
        for (const chunk of node.textContent.match(CHUNKS) || []) {
          if (CJK.test(chunk)) tokens.push({ t: chunk, em });
          else chunk.split(/(\s+)/).forEach(p => { if (p) tokens.push({ t: p, em, space: /^\s+$/.test(p) }); });
        }
      }
      vis.textContent = "";
      let i = 0;
      tokens.forEach((tk, k) => {
        if (tk.space) {
          const prev = tokens[k - 1], next = tokens[k + 1];
          if (!(prev && next && CJK.test(prev.t.slice(-1)) && CJK.test(next.t[0]))) vis.append(" ");
          return;
        }
        const w = document.createElement("span"); w.className = tk.em ? "w em" : "w";
        const inner = document.createElement("span"); inner.textContent = tk.t; inner.style.setProperty("--wi", i++);
        w.append(inner); vis.append(w);
      });
    };
    new MutationObserver(draw).observe(src, { childList: true, characterData: true, subtree: true });
    draw();
  }
  window.__mirror = window.__mirror || mirror;

  const hero = document.querySelector(".page-hero");
  const heroTitle = hero && hero.querySelector("h1");
  if (heroTitle) mirror(heroTitle);
  document.querySelectorAll(".section-heading h2").forEach(mirror);

  /* Header: staggered entrance, page index, scroll cue, scroll-linked exit. */
  if (hero) {
    [...hero.children].filter(el => !el.classList.contains("v2-backdrop")).forEach((el, i) => el.style.setProperty("--hi", i));
    const pages = [...document.querySelectorAll(".site-header .nav-links a")];
    const current = pages.findIndex(a => a.getAttribute("aria-current") === "page");
    const index = document.createElement("span");
    index.className = "v2-hero-index"; index.setAttribute("aria-hidden", "true"); index.setAttribute("data-no-translate", "");
    index.textContent = `${String(Math.max(current, 0) + 1).padStart(2, "0")} / ${String(pages.length).padStart(2, "0")}`;
    const cue = document.createElement("span");
    cue.className = "v2-scroll-cue"; cue.setAttribute("aria-hidden", "true");
    cue.innerHTML = "<i></i><span>Scroll</span>";
    hero.append(index, cue);
    requestAnimationFrame(() => hero.classList.add("v2-in"));
    if (!reduce) {
      let pending = false;
      const exit = () => { pending = false; hero.style.setProperty("--hx", Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.9))).toFixed(4)); };
      addEventListener("scroll", () => { if (!pending) { pending = true; requestAnimationFrame(exit); } }, { passive: true });
      exit();
    }
  }

  /* Recorded videos sit in a window frame, like the homepage demos. */
  document.querySelectorAll("main figure video").forEach(video => {
    if (video.parentElement.classList.contains("v2-media")) return;
    const frame = document.createElement("div");
    frame.className = "v2-media";
    const label = (video.getAttribute("aria-label") || "").trim();
    frame.innerHTML = '<div class="v2-media-bar" aria-hidden="true"><span class="v2-dots"><i></i><i></i><i></i></span><span class="v2-media-name"></span><span class="v2-media-badge"><b></b><span>Recorded replay</span></span></div>';
    frame.querySelector(".v2-media-name").textContent = label;
    video.before(frame);
    frame.append(video);
  });

  /* Card surfaces: spotlight, pointer-tracked rim and a slight tilt on smaller cards. */
  const CARDS = ".track, .card, .plan-stage, .take-part > li, .professional-case, .professional-workflow > li, .team-member, .research-group, .contact-card, .institution-grid > *, .resource, .se-method, .gifts-feature";
  document.querySelectorAll(CARDS).forEach(card => {
    if (card.parentElement.closest(CARDS)) return;
    card.classList.add("v2-card");
    const tilt = !reduce && card.offsetHeight < 520;
    card.addEventListener("pointermove", event => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - r.left}px`);
      card.style.setProperty("--my", `${event.clientY - r.top}px`);
      if (tilt) {
        card.style.setProperty("--rx", `${(((event.clientY - r.top) / r.height - 0.5) * -3).toFixed(2)}deg`);
        card.style.setProperty("--ry", `${(((event.clientX - r.left) / r.width - 0.5) * 4).toFixed(2)}deg`);
      }
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  });

  /* Staggered reveals and the spectrum sweep at the top of each section. */
  const REVEAL = ".section-heading > *, .v2-card, .track-video, figure, .table-scroll, .diagram-scroll, .plan-stages > li, .steps > li, .page-footer-nav > a, .reading-routes > *, .take-part > *";
  const order = new Map();
  document.querySelectorAll("main " + REVEAL.split(", ").join(", main ")).forEach(el => {
    if (el.closest(".page-hero") || el.parentElement.closest(".v2-r")) return;
    el.classList.add("v2-r");
    const n = order.get(el.parentElement) || 0;
    el.style.setProperty("--i", Math.min(n, 6)); order.set(el.parentElement, n + 1);
  });
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("v2-in");
    entry.target.querySelectorAll("[data-v2-count]").forEach(countUp);
    io.unobserve(entry.target);
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  document.querySelectorAll(".v2-r, main > .section, main > section").forEach(el => io.observe(el));

  /* Numbers that stand alone in fact lists count up when they arrive. */
  function countUp(el) {
    if (el.dataset.v2Done) return;
    el.dataset.v2Done = "1";
    const target = Number(el.dataset.v2Count), text = el.textContent;
    if (reduce || !target) return;
    const t0 = performance.now(), duration = 1400;
    const step = now => {
      const k = Math.min(1, (now - t0) / duration), eased = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      el.textContent = k === 1 ? text : Math.round(target * eased).toLocaleString("en");
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  document.querySelectorAll(".dev-report-facts dd, .benchmark-stats strong, .card-label + strong, .stat strong").forEach(el => {
    if (el.children.length) return;
    const value = el.textContent.trim();
    if (/^\d{1,3}(,\d{3})*$/.test(value)) el.dataset.v2Count = value.replace(/,/g, "");
  });

  /* Reading progress along the bottom of the subnav. */
  const subnav = document.querySelector(".subnav");
  if (subnav) {
    const bar = document.createElement("span"); bar.className = "v2-progress"; bar.setAttribute("aria-hidden", "true");
    subnav.append(bar);
    const update = () => {
      const start = subnav.getBoundingClientRect().top + scrollY - 120;
      const end = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--p", Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, end - start))).toFixed(4));
    };
    addEventListener("scroll", update, { passive: true }); addEventListener("resize", update); update();
  }

  /* The homepage's flow field drifts behind the content once the header has scrolled away. */
  if (window.Backdrop) {
    const canvas = document.createElement("canvas");
    canvas.className = "field"; canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    const field = window.Backdrop.mount(canvas, { mode: "field", host: document.body, velocity: () => (window.__lenis ? window.__lenis.velocity : 0) });
    field.setTone(Number(document.body.dataset.tone || 0));
    // a fixed glow follows the section in view, cycling through the page's accent colours
    const ambient = document.createElement("div");
    ambient.className = "ambient"; ambient.setAttribute("aria-hidden", "true");
    document.body.prepend(ambient);
    const tones = ["challenges", "violet", "amber", "involve"], start = Number(document.body.dataset.tone || 0);
    const sections = [...document.querySelectorAll("main > section:not(.page-hero)")];
    const follow = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) ambient.dataset.amb = tones[(start + sections.indexOf(entry.target)) % tones.length];
    }), { rootMargin: "-45% 0px -45% 0px" });
    sections.forEach(section => follow.observe(section));
    const past = () => root.classList.toggle("past-hero", !hero || scrollY > hero.offsetHeight * 0.6);
    addEventListener("scroll", past, { passive: true }); past();
  }
})();
