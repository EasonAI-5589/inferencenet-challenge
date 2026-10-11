import { VIEWS, METRICS, DEFAULT_METRIC, DEFAULT_VIEW, validateSnapshot, rankModels, tableRows, chartLabel, selectedRun, runCardHTML, RUN_CARD_HINT } from './leaderboard-data.js?v=20261011-release';
import { mountain } from './mountain.js';

const source = new URL('./assets/data/paired-results.json?v=20260917-harness', import.meta.url);
const snapshot = fetch(source).then(response => {
  if (!response.ok) throw new Error('Snapshot unavailable');
  return response.json();
}).then(validateSnapshot);

let cards = 0;
for (const widget of document.querySelectorAll('[data-paired-leaderboard]')) {
  const controls = widget.querySelector('.paired-controls');
  const status = widget.querySelector('[data-ranking-status]');
  snapshot.then(data => {
    let view = DEFAULT_VIEW;
    let metric = DEFAULT_METRIC;
    const select = widget.querySelector('[data-ranking-metric]');
    const viewSelect = widget.querySelector('[data-ranking-view]');
    const table = widget.querySelector('.paired-table');
    const figure = widget.querySelector('[data-ranking-mountain]');
    const tbody = table.querySelector('tbody');
    // One evidence region per board, keyed by run (model id + archive arm), never by row position.
    const cardId = `run-card-${++cards}`;
    const hint = document.createElement('p');
    hint.className = 'visually-hidden';
    hint.id = `${cardId}-hint`;
    hint.textContent = RUN_CARD_HINT;
    const card = document.createElement('section');
    card.className = 'run-card';
    card.id = cardId;
    card.hidden = true;
    card.setAttribute('aria-labelledby', `${cardId}-title`);
    widget.querySelector('.table-scroll').after(hint, card);
    let selected = null;
    const requestedView = new URL(location.href).searchParams.get('view');
    const viewFromURL = requestedView === 'deepagents' ? 'harness' : requestedView;
    if (Object.hasOwn(VIEWS, viewFromURL)) view = viewFromURL;
    viewSelect.value = view;

    // The card is built after site.js has scanned the page, so it checks its own table for overflow.
    function syncCardHint() {
      const scroller = card.querySelector('.table-scroll');
      const hint = card.querySelector('.scroll-hint');
      if (scroller && hint) hint.hidden = scroller.scrollWidth <= scroller.clientWidth + 1;
    }

    function renderCard() {
      card.innerHTML = selected ? runCardHTML(data, view, metric, selected, { id: cardId }) : '';
      card.hidden = !selected;
      syncCardHint();
    }

    function choose(key) {
      selected = key;
      for (const button of tbody.querySelectorAll('button[data-run]')) {
        const on = button.dataset.run === selected;
        button.setAttribute('aria-expanded', String(on));
        button.closest('tr').classList.toggle('is-selected', on);
      }
      renderCard();
    }

    function render() {
      const rows = rankModels(data, view, metric);
      // A run hidden by the filter closes its card instead of leaving it beside another row.
      if (selected && !selectedRun(data, view, metric, selected)) selected = null;
      tbody.innerHTML = tableRows(data, view, metric, { controls: cardId, selected });
      table.querySelector('caption').textContent = 'Scores (%)';
      for (const header of table.querySelectorAll('th[data-metric]')) {
        header.setAttribute('aria-sort', header.dataset.metric === metric ? 'descending' : 'none');
      }
      figure.hidden = false;
      mountain(figure, {
        title: view === 'all' ? 'InferenceNet Challenge Leaderboard' : VIEWS[view], metric: METRICS[metric], unit: '%', max: 100,
        peakLabel: '100% · every task replicated',
        items: rows.map(row => ({
          rank: row.rank, label: chartLabel(row, view),
          value: row.metrics[metric].score, kind: 'internal',
        })),
      }, { table: false, aspect: 0.48 });
      widget.dataset.activeView = view;
      widget.dataset.activeMetric = metric;
      status.textContent = `${VIEWS[view]} · ${rows.length} entries · ${METRICS[metric]}`;
      renderCard();
    }

    const buttonFor = key => key && tbody.querySelector(`button[data-run="${CSS.escape(key)}"]`);
    // Focus without the browser's own scroll, then bring the target below the sticky header and subnav.
    const reveal = (target, block) => {
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block, inline: 'nearest' });
    };
    const close = () => { const key = selected; choose(null); reveal(buttonFor(key), 'nearest'); };
    tbody.addEventListener('click', event => {
      const button = event.target.closest('button[data-run]');
      if (!button) return;
      if (selected === button.dataset.run) { choose(null); return; }
      choose(button.dataset.run);
      card.scrollIntoView({ block: 'start' });
      card.querySelector('.run-card-title')?.focus({ preventScroll: true });
    });
    card.addEventListener('click', event => { if (event.target.closest('[data-run-close]')) close(); });
    card.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    });

    window.addEventListener('resize', syncCardHint, { passive: true });
    select.addEventListener('change', () => { metric = select.value; render(); });
    viewSelect.addEventListener('change', () => { view = viewSelect.value; render(); });
    render();
    controls.hidden = false;
  }).catch(() => {
    status.classList.remove('visually-hidden');
    status.textContent = 'Showing saved results for all configurations. Interactive ranking is unavailable.';
  });
}
