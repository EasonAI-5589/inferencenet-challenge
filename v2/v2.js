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
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
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
    scope.querySelectorAll('.button > span[aria-hidden="true"], .text-link > span[aria-hidden="true"], .page-footer-nav span[aria-hidden="true"]').forEach(arrow => {
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
