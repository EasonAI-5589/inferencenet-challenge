export const VIEWS = Object.freeze({ all: 'All', baseline: 'Model', harness: 'Model + Harness' });
export const METRICS = Object.freeze({
  perfect: 'Full replication',
  partial_replication: 'Partial replication',
  compilation_success: 'Execution success',
  coefficient_direction: 'Coefficient direction',
  significance_level: 'Significance level',
});
export const DEFAULT_METRIC = 'perfect';
export const DEFAULT_VIEW = 'all';

export const modelDisplayName = model => model.id === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro' : model.name;
export const configurationType = run => run.harness === 'none' ? 'baseline' : 'harness';
export const harnessDisplayName = run => /^DeepAgents(?: \d[\w.+-]*)?$/.test(run.harness) ? 'DeepAgents' : run.harness;
export const chartLabel = ({ model, category, harness }, view) => view === 'baseline'
  ? modelDisplayName(model)
  : `${modelDisplayName(model)} · ${category === 'baseline' ? 'Model' : harnessDisplayName({ harness })}`;

export function validateSnapshot(data) {
  if (data?.schema_version !== 1 || data.kind !== 'research_leaderboard'
      || data.tasks_per_group !== 1000 || !Array.isArray(data.models) || !data.models.length
      || !Number.isInteger(data.groups) || data.groups < 1 || data.records !== data.groups * 1000) {
    throw new Error('Invalid paired results snapshot');
  }
  const ids = new Set();
  let groups = 0;
  for (const model of data.models) {
    if (typeof model.id !== 'string' || !model.id.trim() || ids.has(model.id)
        || typeof model.name !== 'string' || !model.name.trim()
        || !model.arms || typeof model.arms !== 'object' || Array.isArray(model.arms)
        || !Object.keys(model.arms).length) throw new Error('Invalid model');
    ids.add(model.id);
    for (const [arm, run] of Object.entries(model.arms)) {
      if (!arm.trim() || !run || typeof run.harness !== 'string' || !run.harness.trim()) {
        throw new Error('Invalid harness configuration');
      }
      groups++;
      for (const key of Object.keys(METRICS)) {
        const metric = run.metrics?.[key];
        if (!metric || metric.denominator !== 1000
            || ![metric.count, metric.unknown, metric.failure].every(n => Number.isInteger(n) && n >= 0)
            || metric.count + metric.unknown + metric.failure !== 1000
            || !Number.isFinite(metric.score) || Math.abs(metric.score - metric.count / 10) > 0.000001
            || metric.profile !== (key === 'perfect' ? 'local-paper-v1' : 'hf-leaderboard-v1')) {
          throw new Error('Invalid metric');
        }
      }
    }
  }
  if (groups !== data.groups) throw new Error('Invalid group count');
  return data;
}

export function rankModels(data, view = DEFAULT_VIEW, metric = DEFAULT_METRIC) {
  if (!Object.hasOwn(VIEWS, view) || !Object.hasOwn(METRICS, metric)) throw new Error('Unknown ranking');
  return data.models.flatMap(model => Object.entries(model.arms)
    .filter(([, run]) => view === 'all' || configurationType(run) === view)
    .map(([arm, run]) => ({ model, arm, category: configurationType(run), harness: run.harness, metrics: run.metrics })))
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.metrics[metric].score - a.metrics[metric].score || a.index - b.index)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export const formatScore = score => `${score.toFixed(1)}%`;
export const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function tableRows(data, view = DEFAULT_VIEW, metric = DEFAULT_METRIC) {
  return rankModels(data, view, metric).map(({ rank, model, arm, category, harness, metrics }) =>
    `<tr data-model="${escapeHTML(model.id)}" data-arm="${escapeHTML(arm)}" data-configuration="${category}"><td>${rank}</td><th scope="row">${escapeHTML(modelDisplayName(model))}</th><td class="paired-harness"><span class="harness-tag ${category}" ${category === 'baseline' ? 'aria-label="No harness"' : `data-no-translate title="${escapeHTML(harness)}"`}>${category === 'baseline' ? '—' : escapeHTML(harnessDisplayName({ harness }))}</span></td>${Object.keys(METRICS).map(key => `<td${key === metric ? ' class="is-sorted"' : ''}>${formatScore(metrics[key].score)}</td>`).join('')}</tr>`
  ).join('\n');
}
