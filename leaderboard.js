import { ARMS, METRICS, DEFAULT_METRIC, DEFAULT_ARM, validateSnapshot, rankModels, tableRows } from './leaderboard-data.js?v=20260917-paired';
import { mountain } from './mountain.js';

const source = new URL('./assets/data/paired-results.json?v=20260917-paired', import.meta.url);
const snapshot = fetch(source).then(response => {
  if (!response.ok) throw new Error('Snapshot unavailable');
  return response.json();
}).then(validateSnapshot);

for (const widget of document.querySelectorAll('[data-paired-leaderboard]')) {
  const controls = widget.querySelector('.paired-controls');
  const status = widget.querySelector('[data-ranking-status]');
  snapshot.then(data => {
    let arm = DEFAULT_ARM;
    let metric = DEFAULT_METRIC;
    const select = widget.querySelector('[data-ranking-metric]');
    const figure = widget.querySelector('[data-ranking-mountain]');
    const viewFromURL = new URL(location.href).searchParams.get('view');
    if (Object.hasOwn(ARMS, viewFromURL)) arm = viewFromURL;

    function render() {
      for (const button of widget.querySelectorAll('[data-ranking-arm]')) {
        button.setAttribute('aria-pressed', String(button.dataset.rankingArm === arm));
      }
      for (const panel of widget.querySelectorAll('[data-ranking-panel]')) {
        const active = panel.dataset.rankingPanel === arm;
        panel.hidden = !active;
        if (!active) continue;
        panel.querySelector('tbody').innerHTML = tableRows(data, arm, metric);
        for (const header of panel.querySelectorAll('th[data-metric]')) {
          header.setAttribute('aria-sort', header.dataset.metric === metric ? 'descending' : 'none');
        }
      }
      widget.querySelector('[data-ranking-label]').textContent = ARMS[arm];
      figure.hidden = false;
      mountain(figure, {
        title: ARMS[arm], metric: METRICS[metric], unit: '%', max: 100,
        peakLabel: '100% · every task replicated',
        items: rankModels(data, arm, metric).map(({ rank, model, metrics }) => ({
          rank, label: model.name, value: metrics[metric].score, kind: 'internal',
        })),
      }, { table: false, aspect: 0.48 });
      widget.dataset.activeArm = arm;
      widget.dataset.activeMetric = metric;
      status.textContent = `${ARMS[arm]} · ${data.models.length} models · ${METRICS[metric]}`;
    }

    select.addEventListener('change', () => { metric = select.value; render(); });
    widget.querySelectorAll('[data-ranking-arm]').forEach(button => {
      button.addEventListener('click', () => { arm = button.dataset.rankingArm; render(); });
    });
    render();
    controls.hidden = false;
  }).catch(() => {
    status.textContent = 'Showing saved results for both groups. Interactive ranking is unavailable.';
  });
}
