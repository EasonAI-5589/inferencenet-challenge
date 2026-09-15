/* site.js — shared behaviours for the multi-page InferenceNet Challenge site.
 * Classic script, load with `defer` on every page. Provides: the mobile menu
 * (same behaviour as script.js), the reading-progress bar, in-page subnav
 * scroll-spy, generic accessible tabs for [role="tablist"], focusable scroll
 * containers (tabindex only while they overflow), and chart mounting via a
 * dynamic import of charts.js. Theme switching stays in theme.js.
 * When the legacy script.js is also present on a page (index.html), this file
 * leaves the menu, progress bar and .sample-tabs to it. */
(() => {
  const scriptUrl = document.currentScript && document.currentScript.src ? document.currentScript.src : null;
  document.documentElement.classList.add('js');
  const legacy = Boolean(document.querySelector('script[src="script.js"], script[src$="/script.js"]'));

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
    menu.hidden = false;
    menu.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') !== 'true'));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); menu.focus(); }
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', event => { if (event.matches) setOpen(false); });
  }

  /* Reading progress + subnav scroll-spy ------------------------------------- */
  const progress = legacy ? null : document.getElementById('reading-progress');
  const subnavLinks = [...document.querySelectorAll('.subnav a[href^="#"]')]
    .map(link => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter(item => item.target);
  if (progress || subnavLinks.length) {
    let pending = false;
    const update = () => {
      pending = false;
      if (progress) {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = `${total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0}%`;
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
      }
    };
    const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    update();
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

  // Deep links: a hash that names a tab, a panel, or anything inside a panel opens that panel.
  const openForHash = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    let opened = false;
    tabGroups.forEach(group => {
      const tabIndex = group.tabs.indexOf(target);
      if (tabIndex >= 0) { group.select(tabIndex); opened = true; return; }
      const panelIndex = group.panels.findIndex(panel => panel === target || panel.contains(target));
      if (panelIndex >= 0 && panelIndex !== group.current) { group.select(panelIndex); opened = true; }
    });
    if (opened) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    return opened;
  };
  if (tabGroups.length) {
    openForHash();
    window.addEventListener('hashchange', openForHash);
  }

  /* Scroll containers: a tab stop only while they actually overflow ----------- */
  const scrollers = [...document.querySelectorAll('.table-scroll, .diagram-scroll, .mountain-table-wrap, .code-panel pre')];
  if (scrollers.length) {
    const sync = el => {
      const overflowing = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      if (overflowing) { if (el.getAttribute('tabindex') !== '0') el.setAttribute('tabindex', '0'); }
      else if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
    };
    scrollers.forEach(sync);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(entries => entries.forEach(entry => sync(entry.target)));
      scrollers.forEach(el => observer.observe(el));
    }
    window.addEventListener('resize', () => scrollers.forEach(sync), { passive: true });
  }

  /* Charts ----------------------------------------------------------------------- */
  if (document.querySelector('[data-chart]')) {
    const base = scriptUrl || window.location.href;
    import(new URL('charts.js', base).href)
      .then(module => { module.mountCharts(); window.dispatchEvent(new Event('resize')); })
      .catch(() => { document.documentElement.classList.add('charts-unavailable'); });
  }
})();
