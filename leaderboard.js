import { ARMS, VIEWS, METRICS, DEFAULT_METRIC, DEFAULT_VIEW, validateSnapshot, rankModels, tableRows } from './leaderboard-data.js?v=20260917-combined';
import { mountain } from './mountain.js';

const source = new URL('./assets/data/paired-results.json?v=20260917-combined', import.meta.url);
const snapshot = fetch(source).then(response => {
  if (!response.ok) throw new Error('Snapshot unavailable');
  return response.json();
}).then(validateSnapshot);

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
    const viewFromURL = new URL(location.href).searchParams.get('view');
    if (Object.hasOwn(VIEWS, viewFromURL)) view = viewFromURL;
    viewSelect.value = view;

    function render() {
      const rows = rankModels(data, view, metric);
      table.querySelector('tbody').innerHTML = tableRows(data, view, metric);
      table.querySelector('caption').textContent = `${VIEWS[view]} · scores over all 1,000 tasks (%)`;
      for (const header of table.querySelectorAll('th[data-metric]')) {
        header.setAttribute('aria-sort', header.dataset.metric === metric ? 'descending' : 'none');
      }
      widget.querySelector('[data-ranking-label]').textContent = view === 'all' ? 'Combined leaderboard' : VIEWS[view];
      figure.hidden = false;
      mountain(figure, {
        title: VIEWS[view], metric: METRICS[metric], unit: '%', max: 100,
        peakLabel: '100% · every task replicated',
        items: rows.map(({ rank, model, arm, metrics }) => ({
          rank, label: view === 'all' ? `${model.name} · ${ARMS[arm]}` : model.name,
          value: metrics[metric].score, kind: 'internal',
        })),
      }, { table: false, aspect: 0.48 });
      widget.dataset.activeView = view;
      widget.dataset.activeMetric = metric;
      status.textContent = `${VIEWS[view]} · ${rows.length} entries · ${METRICS[metric]}`;
    }

    select.addEventListener('change', () => { metric = select.value; render(); });
    viewSelect.addEventListener('change', () => { view = viewSelect.value; render(); });
    render();
    controls.hidden = false;
  }).catch(() => {
    status.textContent = 'Showing saved results for all configurations. Interactive ranking is unavailable.';
  });
}
