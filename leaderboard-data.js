export const ARMS = Object.freeze({ baseline: 'Single Agent', deepagents: 'Agent + DeepAgents' });
export const VIEWS = Object.freeze({ all: 'All configurations', ...ARMS });
export const METRICS = Object.freeze({
  perfect: 'Full replication (local)',
  partial_replication: 'Partial replication',
  compilation_success: 'Execution success',
  coefficient_direction: 'Coefficient direction',
  significance_level: 'Significance level',
});
export const DEFAULT_METRIC = 'perfect';
export const DEFAULT_VIEW = 'all';

export function validateSnapshot(data) {
  if (data?.schema_version !== 1 || data.kind !== 'research_leaderboard'
      || data.tasks_per_group !== 1000 || !Array.isArray(data.models) || !data.models.length
      || data.groups !== data.models.length * 2 || data.records !== data.groups * 1000) {
    throw new Error('Invalid paired results snapshot');
  }
  const ids = new Set();
  for (const model of data.models) {
    if (!model.id || ids.has(model.id) || typeof model.name !== 'string' || !model.name.trim()) throw new Error('Invalid model');
    ids.add(model.id);
    for (const arm of Object.keys(ARMS)) {
      for (const key of Object.keys(METRICS)) {
        const metric = model.arms?.[arm]?.metrics?.[key];
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
  return data;
}

export function rankModels(data, view = DEFAULT_VIEW, metric = DEFAULT_METRIC) {
  if (!Object.hasOwn(VIEWS, view) || !Object.hasOwn(METRICS, metric)) throw new Error('Unknown ranking');
  return data.models.flatMap(model => Object.keys(ARMS)
    .filter(arm => view === 'all' || arm === view)
    .map(arm => ({ model, arm, metrics: model.arms[arm].metrics })))
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.metrics[metric].score - a.metrics[metric].score || a.index - b.index)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export const formatScore = score => `${score.toFixed(1)}%`;
export const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function tableRows(data, view = DEFAULT_VIEW, metric = DEFAULT_METRIC) {
  return rankModels(data, view, metric).map(({ rank, model, arm, metrics }) =>
    `<tr data-model="${escapeHTML(model.id)}" data-arm="${arm}"><td>${rank}</td><th scope="row">${escapeHTML(model.name)}</th><td class="paired-approach"><span class="approach-tag ${arm}">${ARMS[arm]}</span></td>${Object.keys(METRICS).map(key => `<td${key === metric ? ' class="is-sorted"' : ''}>${formatScore(metrics[key].score)}</td>`).join('')}</tr>`
  ).join('\n');
}
