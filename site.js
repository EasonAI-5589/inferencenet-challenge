/* site.js — shared behaviours for the multi-page Metacase Challenge site.
 * Classic script, load with `defer` on every page. Provides: the mobile menu
 * (same behaviour as script.js), the reading-progress bar, in-page subnav
 * scroll-spy, generic accessible tabs for [role="tablist"], focusable scroll
 * containers (tabindex only while they overflow), chart mounting via a
 * dynamic import of charts.js, and the motion hooks of site.css section 11
 * (subnav marker, arrow directions, once-only reveals). Theme switching stays
 * in theme.js.
 * When the legacy script.js is also present on a page (index.html), this file
 * leaves the menu, progress bar and .sample-tabs to it. */
(() => {
  const scriptUrl = document.currentScript && document.currentScript.src ? document.currentScript.src : null;
  // Keep previously shared Home team links working after the page split.
  const homeFile = window.location.pathname.split('/').pop();
  const teamAnchors = new Map([
    ['#team', '#team'], ['#team-title', '#team'], ['#leadership-title', '#team'],
    ['#labs', '#labs'], ['#labs-title', '#labs'], ['#ntu-gifts', '#ntu-gifts'],
    ['#gifts-title', '#ntu-gifts'], ['#hku-ai-agents-lab', '#hku-ai-agents-lab'],
    ['#hku-lab-title', '#hku-ai-agents-lab'],
  ]);
  if (!homeFile || homeFile === 'index.html') {
    const redirectTeamLink = () => {
      const target = teamAnchors.get(window.location.hash);
      if (!target) return false;
      window.location.replace(new URL(`teams.html${target}`, window.location.href));
      return true;
    };
    if (redirectTeamLink()) return;
    window.addEventListener('hashchange', redirectTeamLink);
  }
  document.documentElement.classList.add('js');
  const legacy = Boolean(document.querySelector('script[src="script.js"], script[src$="/script.js"]'));

  /* Page switches: a site page the visitor hovers or presses in the navigation or
   * the page pager is prerendered (Chromium), so it is shown finished, with fonts,
   * header controls and translation in place, and the transition in site.css
   * section 11 has nothing left to settle. */
  if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
    const rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({
      prerender: [{
        where: { and: [{ href_matches: '/*' }, { selector_matches: '.nav-links a:not([aria-current="page"]), .page-footer-nav a' }] },
        eagerness: 'moderate',
      }],
    });
    document.head.append(rules);
  }

  /* Mobile menu -------------------------------------------------------------- */
  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('nav-links');
  if (menu && nav && !legacy) {
    const symbol = menu.querySelector('span');
    const setOpen = open => {
      nav.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', String(open));
      if (symbol) symbol.textContent = open ? '−' : '+';
    };
    setOpen(true);
    menu.hidden = false;
    menu.addEventListener('click', () => {
      // Only a visitor's own toggle animates; the menu starts open without motion.
      nav.dataset.animate = '';
      setOpen(menu.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')
        && menu.getClientRects().length && menu.closest('.site-header').contains(document.activeElement)) {
        setOpen(false); menu.focus();
      }
    });
  }

  // Navigation can occupy two rows. Only scroll offsets use the measured
  // height; --header-h continues to control the navigation's minimum height.
  const header = document.querySelector('.site-header');
  if (header) {
    let lastHeight = 0;
    const syncHeaderOffset = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      if (height !== lastHeight) {
        lastHeight = height;
        document.documentElement.style.setProperty('--header-offset', `${height}px`);
      }
    };
    syncHeaderOffset();
    if ('ResizeObserver' in window) new ResizeObserver(syncHeaderOffset).observe(header);
    else window.addEventListener('resize', syncHeaderOffset, { passive: true });
  }

  /* Reading progress + subnav scroll-spy ------------------------------------- */
  const progress = legacy ? null : document.getElementById('reading-progress');
  const subnavLinks = [...document.querySelectorAll('.subnav a[href^="#"]')]
    .map(link => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter(item => item.target);
  if (progress) {
    // The bar scales on the compositor instead of changing width every scroll frame.
    progress.style.width = '100%';
    progress.style.transformOrigin = '0 50%';
  }
  // One marker slides to the current section (site.css section 11).
  const track = subnavLinks.length ? subnavLinks[0].link.closest('.subnav ol, .subnav ul') : null;
  if (track) track.classList.add('has-marker');
  let marked = null;
  let markerShown = false;
  const placeMarker = (link, remeasure) => {
    if (!track || (link === marked && !remeasure)) return;
    marked = link;
    if (!link || !track.contains(link) || !link.getClientRects().length) {
      track.style.setProperty('--marker-opacity', '0');
      markerShown = false;
      return;
    }
    const box = track.getBoundingClientRect();
    const rect = link.getBoundingClientRect();
    // A marker that appears, or a layout that changed, takes its place without sliding.
    const instant = remeasure || !markerShown;
    if (instant) track.classList.add('is-placing');
    track.style.setProperty('--marker-x', `${rect.left - box.left - track.clientLeft + track.scrollLeft}px`);
    track.style.setProperty('--marker-y', `${rect.bottom - box.top - track.clientTop + track.scrollTop - 2}px`);
    track.style.setProperty('--marker-scale', String(rect.width / 100));
    if (instant) {
      void getComputedStyle(track, '::after').transform;
      track.classList.remove('is-placing');
    }
    track.style.setProperty('--marker-opacity', '1');
    markerShown = true;
  };
  if (progress || subnavLinks.length) {
    let pending = false;
    let remeasure = true;
    const update = () => {
      pending = false;
      if (progress) {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0})`;
      }
      if (subnavLinks.length) {
        const threshold = Math.round(window.innerHeight * 0.3);
        let active = null;
        subnavLinks.forEach(item => { if (item.target.getBoundingClientRect().top <= threshold) active = item; });
        if (!active && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) active = subnavLinks[subnavLinks.length - 1];
        subnavLinks.forEach(item => {
          if (item === active) item.link.setAttribute('aria-current', 'location');
          else item.link.removeAttribute('aria-current');
        });
        placeMarker(active ? active.link : null, remeasure);
      }
      remeasure = false;
    };
    const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
    const relayout = () => { remeasure = true; schedule(); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', relayout, { passive: true });
    if (track && document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    update();
  }

  /* Arrows on buttons and the page pager lean the way they point (site.css 11). */
  const arrowDirections = { '→': 'right', '←': 'left', '↓': 'down', '↑': 'up' };
  for (const arrow of document.querySelectorAll('.button > span[aria-hidden="true"], .page-footer-nav span[aria-hidden="true"]')) {
    const direction = arrowDirections[arrow.textContent.trim()];
    if (direction) arrow.dataset.arrow = direction;
  }

  /* Once-only reveals on narrative pages (<main data-motion="reveal">) -------- */
  // Armed by the first scroll, so blocks already on screen never blink and a
  // page that is printed or captured without scrolling is never hidden.
  const revealScope = document.querySelector('main[data-motion~="reveal"]');
  const revealable = [
    '.section-heading > *', '.card-grid > *', '.home-replays > *', '.participate-now > h3', '.participate-steps > *',
    '.team-grid > *', '.contributors', '.research-groups > *', '.research-group-grid > *', '.contact-grid > *', '.plan-stages > *', '.take-part > *',
    '.track', '.anchor-schools', '.participate-panel', '.home-status', '.home-resources', '.home-citations', '.home-source',
  ].join(', ');
  if (revealScope && 'IntersectionObserver' in window && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const block = entry.target;
        observer.unobserve(block);
        // Blocks arriving together cascade 60ms apart, capped so none waits long.
        block.style.setProperty('--reveal-delay', `${Math.min(order++, 4) * 60}ms`);
        block.dataset.reveal = 'in';
        block.addEventListener('transitionend', function settled(event) {
          if (event.target !== block || event.propertyName !== 'transform') return;
          block.removeEventListener('transitionend', settled);
          block.removeAttribute('data-reveal');
          block.style.removeProperty('--reveal-delay');
        });
      }
    }, { rootMargin: '0px 0px -48px 0px' });
    const arm = () => {
      window.removeEventListener('scroll', arm);
      const fold = window.innerHeight;
      for (const block of revealScope.querySelectorAll(revealable)) {
        if (block.parentElement.closest(revealable) || block.getBoundingClientRect().top <= fold) continue;
        block.dataset.reveal = '';
        observer.observe(block);
      }
    };
    window.addEventListener('scroll', arm, { passive: true });
  }

  /* Generic accessible tabs ---------------------------------------------------- */
  const tabGroups = [];
  const tablists = [...document.querySelectorAll('[role="tablist"]')]
    .filter(list => list.dataset.tabs !== 'manual' && !(legacy && list.classList.contains('sample-tabs')));
  tablists.forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls') || ''));
    if (!tabs.length || panels.some(panel => !panel)) return;
    const group = { list, tabs, panels, current: -1 };
    const select = (index, { focus = false, updateHash = false } = {}) => {
      if (index < 0 || index >= tabs.length) return;
      group.current = index;
      tabs.forEach((tab, position) => {
        const selected = position === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[position].hidden = !selected;
      });
      if (focus) tabs[index].focus();
      if (updateHash && list.hasAttribute('data-tabs-hash') && panels[index].id) {
        const hash = `#${panels[index].id}`;
        if (window.location.hash !== hash) history.replaceState(null, '', hash);
      }
      window.dispatchEvent(new Event('resize'));
    };
    panels.forEach((panel, index) => {
      panel.setAttribute('role', 'tabpanel');
      if (tabs[index].id) panel.setAttribute('aria-labelledby', tabs[index].id);
      if (!panel.hasAttribute('tabindex')) panel.tabIndex = 0;
    });
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index, { updateHash: true }));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        select(next, { focus: true, updateHash: true });
      });
    });
    group.select = select;
    tabGroups.push(group);
    const initial = Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'));
    select(initial);
  });

  // Deep links: a hash that names a tab, a panel, or anything inside a panel or <details> opens it.
  const openForHash = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    let opened = false;
    for (let node = target.parentElement; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS' && !node.open) { node.open = true; opened = true; }
    }
    tabGroups.forEach(group => {
      const tabIndex = group.tabs.indexOf(target);
      if (tabIndex >= 0) { group.select(tabIndex); opened = true; return; }
      const panelIndex = group.panels.findIndex(panel => panel === target || panel.contains(target));
      if (panelIndex >= 0 && panelIndex !== group.current) { group.select(panelIndex); opened = true; }
    });
    if (opened) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    return opened;
  };
  openForHash();
  window.addEventListener('hashchange', openForHash);

  /* Scroll containers: a tab stop only while they actually overflow ----------- */
  const scrollers = [...document.querySelectorAll('.table-scroll, .diagram-scroll, .mountain-table-wrap, .code-panel pre')];
  if (scrollers.length) {
    // Wide figures and tables say so while they overflow sideways; both leaderboard boards keep their own note.
    const hintText = el => el.matches('.diagram-scroll') ? 'Scroll sideways to see the whole figure →'
      : el.matches('.table-scroll') && !el.closest('[data-paired-leaderboard], [data-dev-leaderboard]') ? 'Scroll sideways to see every column →' : '';
    const syncHint = el => {
      const text = hintText(el);
      if (!text) return;
      const sideways = el.scrollWidth > el.clientWidth + 1;
      let hint = el.nextElementSibling && el.nextElementSibling.classList.contains('scroll-hint') ? el.nextElementSibling : null;
      if (sideways && !hint) {
        hint = document.createElement('p');
        hint.className = 'scroll-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = text;
        el.after(hint);
      }
      if (hint) hint.hidden = !sideways;
    };
    const sync = el => {
      const overflowing = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      if (overflowing) { if (el.getAttribute('tabindex') !== '0') el.setAttribute('tabindex', '0'); }
      else if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
      syncHint(el);
    };
    scrollers.forEach(sync);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(entries => entries.forEach(entry => sync(entry.target)));
      scrollers.forEach(el => observer.observe(el));
    }
    window.addEventListener('resize', () => scrollers.forEach(sync), { passive: true });
  }

  /* Auto-fit timeline tag boxes to rendered text width (EN / ZH) -------------- */
  const fitTimelineTags = () => {
    for (const node of document.querySelectorAll('.hs-timeline .hs-node')) {
      const rect = node.querySelector('rect.hs-tag');
      const texts = [...node.querySelectorAll('text')];
      if (!rect || !texts.length) continue;
      let maxW = 0;
      for (const t of texts) {
        try { maxW = Math.max(maxW, t.getComputedTextLength()); } catch {}
      }
      if (maxW > 0) rect.setAttribute('width', String(Math.ceil(maxW + 20)));
    }
  };
  if (document.querySelector('.hs-timeline')) {
    fitTimelineTags();
    window.addEventListener('resize', fitTimelineTags, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTimelineTags);
  }

  /* Charts ----------------------------------------------------------------------- */
  if (document.querySelector('[data-chart]')) {
    const base = scriptUrl || window.location.href;
    import(new URL('charts.js', base).href)
      .then(module => { module.mountCharts(); window.dispatchEvent(new Event('resize')); })
      .catch(() => { document.documentElement.classList.add('charts-unavailable'); });
  }
})();
