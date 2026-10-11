/* Shared ranking board for Home and Leaderboard. Each mountBoard() call owns
 * one widget: its view, metric, selected run, card and failure state live in
 * that call alone, so the Selected_1000 leaderboard and the Dev100 study never
 * share state on one page. A board descriptor supplies the data side:
 *   { id, source, validate, views, defaultView, metrics, defaultMetric,
 *     viewFromURL?, rank, rowsHTML, cardHTML, chart, charts?, overview?, status,
 *     caption, hint, failureStatus, chartNote?, chartsLabel?, cardId? }
 * views and metrics may be functions of the validated data. rank() returns
 * rows with a stable .key and .rank; chart() returns null when the view has
 * no mountain, and overview() returns '' when the view has no overview.
 * charts() returns [] or one { key, series, title, legend, chart } per
 * mountain card; only a board that defines it gets the card group. */
import { mountain } from './mountain.js';
import {
  VIEWS, METRICS, DEFAULT_METRIC, DEFAULT_VIEW, validateSnapshot, rankModels, tableRows, chartLabel,
  runKey, runCardHTML, RUN_CARD_HINT,
} from './leaderboard-data.js?v=20261011-release';

const CHART_OPTIONS = Object.freeze({ table: false, aspect: 0.48 });
// Cards always use the compact layout, so cards of one width share one height and one 0-100% scale.
const CARD_OPTIONS = Object.freeze({ ...CHART_OPTIONS, compactBreakpoint: Infinity });
const loads = new WeakMap();
const mounted = new Map();
const choices = (value, data) => typeof value === 'function' ? value(data) : value;

// The Selected_1000 leaderboard: the unchanged archive functions behind the shared controller.
export function selectedBoardDescriptor(source) {
  return Object.freeze({
    id: 'selected-1000', source, validate: validateSnapshot,
    views: VIEWS, defaultView: DEFAULT_VIEW, metrics: METRICS, defaultMetric: DEFAULT_METRIC,
    // Older shared links used ?view=deepagents for the harness view.
    viewFromURL: url => {
      const requested = url.searchParams.get('view');
      return requested === 'deepagents' ? 'harness' : requested;
    },
    // Rows are keyed by run (model id + archive arm), never by row position.
    rank: (data, view, metric) => rankModels(data, view, metric).map(row => ({ ...row, key: runKey(row) })),
    rowsHTML: tableRows,
    cardHTML: runCardHTML,
    chart: (data, view, metric, rows) => ({
      title: view === 'all' ? 'InferenceNet Challenge Leaderboard' : VIEWS[view], metric: METRICS[metric], unit: '%', max: 100,
      peakLabel: '100% · every task replicated',
      items: rows.map(row => ({
        rank: row.rank, label: chartLabel(row, view),
        value: row.metrics[metric].score, kind: 'internal',
      })),
    }),
    status: (data, view, metric, rows) => `${VIEWS[view]} · ${rows.length} entries · ${METRICS[metric]}`,
    caption: 'Scores (%)',
    hint: RUN_CARD_HINT,
    failureStatus: 'Showing saved results for all configurations. Interactive ranking is unavailable.',
    cardId: n => `run-card-${n}`,
  });
}

export function loadBoardData(descriptor, request = input => fetch(input)) {
  return Promise.resolve(descriptor.source).then(request).then(response => {
    if (!response.ok) throw new Error('Board data unavailable');
    return response.json();
  }).then(data => descriptor.validate(data));
}

/* Board state without the DOM. Every transition builds the whole next model
 * first, so a descriptor that throws leaves the current model in place. */
export function createBoardState(descriptor, data, { cardId = `${descriptor.id}-card`, url = null } = {}) {
  const views = choices(descriptor.views, data);
  const metrics = choices(descriptor.metrics, data);
  const known = (keys, key) => typeof key === 'string' && Object.hasOwn(keys, key);
  const requested = url && descriptor.viewFromURL ? descriptor.viewFromURL(new URL(url)) : null;
  const build = ({ view, metric, selected }) => {
    if (!known(views, view) || !known(metrics, metric)) throw new Error('Unknown ranking');
    const rows = descriptor.rank(data, view, metric);
    // A run hidden by the filter closes its card instead of leaving it beside another row.
    if (!rows.some(row => row.key === selected)) selected = null;
    const controls = { controls: cardId, selected };
    return {
      view, metric, selected, rows,
      rowsHTML: descriptor.rowsHTML(data, view, metric, controls),
      overview: descriptor.overview ? descriptor.overview(data, view, metric, controls) || '' : '',
      chart: descriptor.chart(data, view, metric, rows) || null,
      charts: descriptor.charts ? descriptor.charts(data, view, metric) : [],
      caption: typeof descriptor.caption === 'function' ? descriptor.caption(data, view, metric) : descriptor.caption,
      status: descriptor.status(data, view, metric, rows),
      cardHTML: selected ? descriptor.cardHTML(data, view, metric, selected, { id: cardId }) : '',
    };
  };
  let model = build({ view: known(views, requested) ? requested : descriptor.defaultView, metric: descriptor.defaultMetric, selected: null });
  const update = change => (model = build({ ...model, ...change }));
  return {
    cardId, views, metrics,
    get model() { return model; },
    get selected() { return model.selected; },
    setView: view => update({ view }),
    setMetric: metric => update({ metric }),
    select: key => update({ selected: key }),
    close: () => update({ selected: null }),
  };
}

/* Interaction rules shared by every board. `ui` applies a model to the page;
 * `origin` is whatever control opened the card, handed back on close so the
 * focus returns there (a table row button or an overview cell). */
export function createBoardController(state, ui) {
  let origin = null;
  const repaint = model => {
    if (!model.selected) origin = null;
    ui.render(model);
  };
  function close() {
    const key = state.selected;
    const from = origin;
    origin = null;
    ui.select(state.close());
    ui.returnFocus(from, key);
  }
  return {
    setView: view => repaint(state.setView(view)),
    setMetric: metric => repaint(state.setMetric(metric)),
    activate(key, from = null) {
      // A second press on the open run closes its card where the focus already is.
      if (state.selected === key) { origin = null; ui.select(state.close()); return; }
      const model = state.select(key);
      origin = model.selected ? from : null;
      ui.select(model);
      if (model.selected) ui.openCard();
    },
    close,
    keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    },
  };
}

function nextCardId(descriptor) {
  const n = (mounted.get(descriptor.id) || 0) + 1;
  mounted.set(descriptor.id, n);
  return descriptor.cardId ? descriptor.cardId(n) : n === 1 ? `${descriptor.id}-card` : `${descriptor.id}-card-${n}`;
}

// The labelled group of mountain cards sits right after the board's single mountain.
function mountainCards(figure, label) {
  const group = document.createElement('div');
  group.className = 'mountain-cards';
  group.setAttribute('role', 'group');
  if (label) group.setAttribute('aria-label', label);
  group.hidden = true;
  figure.after(group);
  return group;
}

function mountainCard(key) {
  const card = document.createElement('figure');
  card.className = 'mountain mountain-card';
  card.dataset.chart = key;
  card.innerHTML = '<figcaption class="mountain-card-caption"><h3 class="mountain-card-title" data-no-translate></h3>'
    + '<p class="mountain-card-legend"><i class="mountain-card-key" aria-hidden="true"></i><span></span></p></figcaption>'
    + '<div class="mountain-canvas"></div>';
  return card;
}

// One card per chart, kept by key, so a metric change redraws each mountain in place.
function drawCards(group, charts) {
  group.hidden = !charts.length;
  if (!charts.length) return;
  const kept = new Map([...group.children].map(card => [card.dataset.chart, card]));
  const cards = charts.map(({ key, series, title, legend }) => {
    const card = kept.get(key) || mountainCard(key);
    card.dataset.series = series;
    card.setAttribute('aria-label', legend);
    card.querySelector('.mountain-card-title').textContent = title;
    card.querySelector('.mountain-card-legend span').textContent = legend;
    return card;
  });
  group.replaceChildren(...cards);
  charts.forEach(({ chart }, index) => mountain(cards[index], chart, CARD_OPTIONS));
}

// A data-derived option list replaces the saved options only when the two differ.
function syncOptions(select, labels) {
  const keys = Object.keys(labels);
  if ([...select.options].map(option => option.value).join('\n') === keys.join('\n')) return;
  select.replaceChildren(...keys.map(key => new Option(labels[key], key)));
}

function bindBoard(widget, descriptor, data, url) {
  const controls = widget.querySelector('.paired-controls');
  const status = widget.querySelector('[data-ranking-status]');
  const viewSelect = widget.querySelector('[data-ranking-view]');
  const metricSelect = widget.querySelector('[data-ranking-metric]');
  const figure = widget.querySelector('[data-ranking-mountain]');
  const note = widget.querySelector('[data-chart-note]');
  const overview = widget.querySelector('[data-ranking-overview]');
  const scroller = widget.querySelector('.table-scroll');
  const table = scroller.querySelector('table');
  const tbody = table.querySelector('tbody');
  const cardId = nextCardId(descriptor);
  // The first model is built before the page changes, so bad data leaves the saved table untouched.
  const state = createBoardState(descriptor, data, { cardId, url });
  const cards = descriptor.charts ? mountainCards(figure, descriptor.chartsLabel) : null;
  // One evidence region per board, keyed by run, never by row position.
  const hint = document.createElement('p');
  hint.className = 'visually-hidden';
  hint.id = `${cardId}-hint`;
  hint.textContent = descriptor.hint;
  const card = document.createElement('section');
  card.className = 'run-card';
  card.id = cardId;
  card.hidden = true;
  card.setAttribute('aria-labelledby', `${cardId}-title`);
  scroller.after(hint, card);
  syncOptions(viewSelect, state.views);
  syncOptions(metricSelect, state.metrics);
  viewSelect.value = state.model.view;
  metricSelect.value = state.model.metric;
  if (note && descriptor.chartNote && !note.textContent.trim()) note.textContent = descriptor.chartNote;

  // The card is built after site.js has scanned the page, so it checks its own table for overflow.
  function syncCardHint() {
    const scroller = card.querySelector('.table-scroll');
    const hint = card.querySelector('.scroll-hint');
    if (scroller && hint) hint.hidden = scroller.scrollWidth <= scroller.clientWidth + 1;
  }
  function showCard(model) {
    card.innerHTML = model.cardHTML;
    card.hidden = !model.selected;
    syncCardHint();
  }
  const scopes = [tbody, overview].filter(Boolean);
  const buttonIn = (scope, key) => scope && key ? scope.querySelector(`button[data-run="${CSS.escape(key)}"]`) : null;
  // Focus without the browser's own scroll, then bring the target below the sticky header and subnav.
  const reveal = (target, block) => {
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block, inline: 'nearest' });
  };
  const ui = {
    render(model) {
      tbody.innerHTML = model.rowsHTML;
      table.querySelector('caption').textContent = model.caption;
      for (const header of table.querySelectorAll('th[data-metric]')) {
        header.setAttribute('aria-sort', header.dataset.metric === model.metric ? 'descending' : 'none');
      }
      figure.hidden = !model.chart;
      if (model.chart) mountain(figure, model.chart, CHART_OPTIONS);
      if (cards) drawCards(cards, model.charts);
      if (note) note.hidden = Boolean(model.chart || model.charts.length);
      if (overview) {
        overview.innerHTML = model.overview;
        overview.hidden = !model.overview;
      }
      widget.dataset.activeView = model.view;
      widget.dataset.activeMetric = model.metric;
      status.textContent = model.status;
      showCard(model);
    },
    // Table rows and overview cells for the same run stay in step.
    select(model) {
      for (const scope of scopes) {
        for (const button of scope.querySelectorAll('button[data-run]')) {
          const on = button.dataset.run === model.selected;
          button.setAttribute('aria-expanded', String(on));
          (scope === tbody ? button.closest('tr') : button.closest('td, th') || button).classList.toggle('is-selected', on);
        }
      }
      showCard(model);
    },
    openCard() {
      card.scrollIntoView({ block: 'start' });
      card.querySelector('.run-card-title')?.focus({ preventScroll: true });
    },
    // A repaint replaces the opener, so the same run is found again in the opener's own region.
    returnFocus(origin, key) {
      reveal(origin?.button.isConnected ? origin.button : buttonIn(origin?.scope, key) || buttonIn(tbody, key), 'nearest');
    },
  };

  const controller = createBoardController(state, ui);
  for (const scope of scopes) {
    scope.addEventListener('click', event => {
      const button = event.target.closest('button[data-run]');
      if (button) controller.activate(button.dataset.run, { button, scope });
    });
  }
  card.addEventListener('click', event => { if (event.target.closest('[data-run-close]')) controller.close(); });
  card.addEventListener('keydown', event => controller.keydown(event));
  window.addEventListener('resize', syncCardHint, { passive: true });
  metricSelect.addEventListener('change', () => controller.setMetric(metricSelect.value));
  viewSelect.addEventListener('change', () => controller.setView(viewSelect.value));
  ui.render(state.model);
  controls.hidden = false;
}

/* Mounts one widget and resolves true once it is interactive, or false when
 * its source fails to load or validate. A failed board keeps its saved table
 * and says so in its own status line; nothing reaches the other boards. */
export function mountBoard(widget, descriptor, { fetch: request, url = globalThis.location?.href } = {}) {
  const status = widget.querySelector('[data-ranking-status]');
  // One request per descriptor, however many widgets show it.
  if (!loads.has(descriptor)) loads.set(descriptor, loadBoardData(descriptor, request));
  return loads.get(descriptor).then(data => {
    bindBoard(widget, descriptor, data, url);
    return true;
  }).catch(() => {
    status.classList.remove('visually-hidden');
    status.textContent = descriptor.failureStatus;
    return false;
  });
}
