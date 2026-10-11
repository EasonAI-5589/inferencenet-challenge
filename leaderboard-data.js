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

// Real buttons appear only when the script enhances the table; the generated
// fallback in index.html and leaderboard.html stays a plain table.
export function tableRows(data, view = DEFAULT_VIEW, metric = DEFAULT_METRIC, { controls, selected } = {}) {
  return rankModels(data, view, metric).map(row => {
    const { rank, model, arm, category, harness, metrics } = row;
    const key = runKey(row);
    const name = escapeHTML(modelDisplayName(model));
    const head = controls
      ? `<button type="button" class="run-toggle" data-run="${escapeHTML(key)}" aria-expanded="${key === selected}" aria-controls="${escapeHTML(controls)}" aria-describedby="${escapeHTML(controls)}-hint">${name}</button>`
      : name;
    return `<tr${controls && key === selected ? ' class="is-selected"' : ''} data-model="${escapeHTML(model.id)}" data-arm="${escapeHTML(arm)}" data-configuration="${category}"><td>${rank}</td><th scope="row">${head}</th><td class="paired-harness"><span class="harness-tag ${category}" ${category === 'baseline' ? 'aria-label="No harness"' : `data-no-translate title="${escapeHTML(harness)}"`}>${category === 'baseline' ? '—' : escapeHTML(harnessDisplayName({ harness }))}</span></td>${Object.keys(METRICS).map(key => `<td${key === metric ? ' class="is-sorted"' : ''}>${formatScore(metrics[key].score)}</td>`).join('')}</tr>`;
  }).join('\n');
}

/* Run evidence card ----------------------------------------------------------
 * Built only from fields already in the archive summary. A missing or null
 * field reads "Not recorded"; counts are never filled in and versions are
 * never inferred from model names. */
export const NOT_RECORDED = 'Not recorded';
export const RUN_CARD_HINT = 'Select a model name to show its run evidence below the table.';
// Same text as the hint site.js adds to wide tables; its translation lives in the language.js common dictionary.
export const CARD_SCROLL_HINT = 'Scroll sideways to see every column →';
const VERIFICATION = Object.freeze({
  accepted_summary: 'Published evaluation summary',
  archived_task_flags: 'Archived per-task scores',
});
const NOTES = Object.freeze({
  unknown: 'Unknown outcomes are counted in the 1,000-task denominator without earning a success.',
  profiles: 'Each metric lists the scoring profile it was computed with.',
  parity: 'These profiles have not been verified against the official scorer.',
  settings: 'This summary does not record time limits, API mode or sandbox; historical batches differ in these settings.',
});
const FACTS = ['Configuration', 'Harness as recorded', 'Harness version', 'Model call cap', 'Summary generated',
  'Interruptions', 'Task-level unknowns', 'Invalid evidence', 'Evidence class', 'Archive path', 'Source revision'];
const COLUMNS = ['Metric', 'Passed', 'Failed', 'Unknown', 'Score', 'Scoring profile', 'Source'];
const LINKS = Object.freeze([
  ['assets/data/paired-results.json', 'Data JSON'],
  ['assets/data/paired-results-provenance.json', 'Release provenance'],
  ['leaderboard.html#protocol', 'Evaluation protocol and sources'],
]);
// Fixed strings the card renders as text of their own; both page dictionaries must translate them.
export const RUN_CARD_TEXT = Object.freeze([
  'Run evidence', 'Close', 'Rank', NOT_RECORDED, 'No harness', RUN_CARD_HINT, 'Run outcomes', 'Outcomes on the 1,000 tasks',
  ...FACTS, ...COLUMNS, ...Object.values(VERIFICATION), ...Object.values(NOTES), ...LINKS.map(([, label]) => label),
]);

export const runKey = row => `${row.model.id}/${row.arm}`;
const recorded = value => value === null || value === undefined || value === '' ? NOT_RECORDED : value;

export function selectedRun(data, view, metric, key) {
  if (!key) return null;
  return rankModels(data, view, metric).find(row => runKey(row) === key) || null;
}

export function runEvidence(data, row) {
  const run = row.model.arms[row.arm];
  const baseline = row.category === 'baseline';
  const date = typeof run.generated_at === 'string' && run.generated_at.match(/^\d{4}-\d{2}-\d{2}/);
  return {
    key: runKey(row),
    model: modelDisplayName(row.model),
    configuration: VIEWS[row.category],
    rank: row.rank,
    harnessLabel: baseline ? null : run.harness,
    harnessVersion: baseline ? null : run.harness.match(/\s(v?\d[\w.+-]*)$/)?.[1] ?? NOT_RECORDED,
    modelCallCap: recorded(run.model_call_cap),
    summaryGenerated: date ? date[0] : NOT_RECORDED,
    interruptions: recorded(run.interruption_count),
    taskUnknowns: recorded(run.task_unknown_count),
    invalidEvidence: recorded(run.invalid_evidence_count),
    evidenceClass: recorded(run.evidence_class),
    archivePath: recorded(run.path),
    sourceRevision: recorded(data.source_revision),
    metrics: Object.entries(METRICS).map(([key, label]) => {
      const metric = run.metrics[key];
      return { key, label, count: metric.count, failure: metric.failure, unknown: metric.unknown, score: metric.score,
        profile: recorded(metric.profile), verification: recorded(metric.verification) };
    }),
  };
}

const shown = (value, code = false) => value === NOT_RECORDED
  ? `<span class="run-missing">${NOT_RECORDED}</span>`
  : code ? `<code>${escapeHTML(value)}</code>` : escapeHTML(value);

export function runCardHTML(data, view, metric, key, { id }) {
  const row = selectedRun(data, view, metric, key);
  if (!row) return '';
  const e = runEvidence(data, row);
  const total = rankModels(data, view, metric).length;
  const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const facts = [
    fact('Configuration', e.configuration),
    fact('Harness as recorded', e.harnessLabel === null ? 'No harness' : shown(e.harnessLabel, true)),
    e.harnessLabel === null ? '' : fact('Harness version', shown(e.harnessVersion)),
    fact('Model call cap', shown(e.modelCallCap)),
    fact('Summary generated', e.summaryGenerated === NOT_RECORDED ? shown(e.summaryGenerated)
      : `<time datetime="${e.summaryGenerated}">${e.summaryGenerated}</time>`),
    fact('Interruptions', shown(e.interruptions)),
    fact('Task-level unknowns', shown(e.taskUnknowns)),
    fact('Invalid evidence', shown(e.invalidEvidence)),
    fact('Evidence class', shown(e.evidenceClass, true)),
    fact('Archive path', shown(e.archivePath, true)),
    fact('Source revision', shown(e.sourceRevision, true)),
  ].join('');
  const outcomes = e.metrics.map(m => `<tr${m.key === metric ? ' class="is-sorted"' : ''} data-metric="${m.key}"><th scope="row">${m.label}</th><td>${m.count}</td><td>${m.failure}</td><td>${m.unknown}</td><td>${formatScore(m.score)}</td><td>${shown(m.profile, true)}</td><td>${Object.hasOwn(VERIFICATION, m.verification) ? VERIFICATION[m.verification] : shown(m.verification, true)}</td></tr>`).join('');
  const notes = [NOTES.unknown, NOTES.profiles, data.official_parity_verified === true ? '' : NOTES.parity, NOTES.settings]
    .filter(Boolean).map(note => `<li>${note}</li>`).join('');
  return `<div class="run-card-head"><div><p class="run-card-kicker">Run evidence</p>`
    + `<h3 class="run-card-title" id="${escapeHTML(id)}-title" tabindex="-1"><span>${escapeHTML(e.model)}</span> <span class="run-card-config">${e.configuration}</span></h3>`
    + `<p class="run-card-meta"><span>Rank</span> <span class="run-card-rank">${e.rank} / ${total}</span> · <span>${METRICS[metric]}</span> · <span>${VIEWS[view]}</span></p></div>`
    + `<button type="button" class="run-card-close" data-run-close>Close</button></div>`
    + `<div class="run-card-body"><dl class="run-card-facts">${facts}</dl>`
    + `<div class="table-scroll" tabindex="0" role="region" aria-label="Run outcomes"><table class="run-card-metrics"><caption>Outcomes on the 1,000 tasks</caption>`
    + `<thead><tr>${COLUMNS.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${outcomes}</tbody></table></div>`
    + `<p class="scroll-hint" aria-hidden="true" hidden>${CARD_SCROLL_HINT}</p></div>`
    + `<ul class="run-card-notes">${notes}</ul>`
    + `<p class="run-card-links">${LINKS.map(([href, label]) => `<a class="text-link" href="${href}">${label}</a>`).join('')}</p>`;
}
