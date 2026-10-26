/* Development board: 100 development tasks from the v10 four-harness report.
 * Pure functions over the sanitized public snapshot; no DOM and no fetch. The
 * Selected_1000 validator and table in leaderboard-data.js stay as they are:
 * this board has its own validator, metrics, denominators and evidence card.
 * A value the report did not record is null and reads "Not recorded", never 0.
 * Failed, unknown and pending tasks stay in every denominator and are never
 * counted as false or as a success. */
import { escapeHTML, formatScore, NOT_RECORDED, CARD_SCROLL_HINT } from './leaderboard-data.js?v=20261011-release';

// Scored with the pinned local-paper-v1 scorer; labels follow the Evolution page, not the Selected_1000 profiles.
export const DEV_METRICS = Object.freeze({
  perfect: 'Full replication',
  partial: 'Coefficient and SE within 5%',
  coefficient_only: 'Coefficient within 5%',
  direction: 'Correct sign',
  significance: 'Correct significance',
});
export const DEFAULT_DEV_METRIC = 'perfect';
export const DEFAULT_DEV_VIEW = 'all';
const ALL_HARNESSES = 'All harnesses';
export const DEV_BOARD = Object.freeze({
  id: 'dev100-v10',
  caption: 'Scores (%) on 100 development tasks',
  hint: 'Select a model or a grid cell to show its run evidence below the table.',
  failureStatus: 'Showing saved development results. Interactive ranking is unavailable.',
  chartNote: 'Choose one harness to draw its mountain. The grid and the table list all 56 combinations.',
  chartsLabel: 'Mountains by harness',
});

/* Snapshot schema ------------------------------------------------------------ */
const FAILED = Object.freeze({
  failed_infrastructure: 'Infrastructure', failed_billing: 'Billing, within infrastructure',
  failed_model: 'Model-attributed', failed_unattributed: 'Unattributed',
});
const UNKNOWN = Object.freeze({
  unknown_infrastructure: 'Infrastructure', unknown_provider_rejected: 'Provider rejection', unknown_provider_access: 'Provider access',
  unknown_provider: 'Other provider error', unknown_deadline: 'Deadline', unknown_unattributed: 'Unattributed',
});
const OUTCOMES = ['scored', 'perfect', 'scored_not_perfect', 'failed', 'unknown', 'pending', ...Object.keys(FAILED), ...Object.keys(UNKNOWN)];
const METRIC_FIELDS = ['true', 'false', 'unknown_or_pending', 'denominator', 'score'];
// Every task slot has exactly one source: [table label, card label].
const PROVENANCE = Object.freeze({
  new_native: ['New', 'New native run'],
  offline_derived_deepagents_metric: ['Offline-derived', 'Offline-derived DeepAgents metric'],
  historical_deepagents_metric: ['Historical', 'Historical DeepAgents metric'],
  inherited_native_sdk: ['Inherited SDK', 'Inherited native SDK run'],
});
const BUDGET = Object.freeze({
  model_calls: 'Model calls', tool_calls: 'Tool calls', output_tokens: 'Output tokens',
  wall_seconds: 'Wall time (s)', tool_timeout_seconds: 'Tool timeout (s)',
});
// Per-slot settings, each a distribution over the denominator; slots with no record are counted, not guessed.
const SETTINGS = ['harness_version', 'route', 'thinking', 'run_date', 'budget'];
// How the report established each published field, one sentence per field.
const FIELD_EVIDENCE = Object.freeze({
  outcomes: 'Outcomes', metrics: 'Metrics', provenance: 'Provenance', budget: 'Recorded budget caps',
  thinking: 'Thinking setting', harness_version: 'Harness version', route: 'Route model', run_date: 'Run dates',
});
// Public text never carries server paths, drive paths, URLs, hosts, addresses or handles.
const PRIVATE = [/\/mnt\//, /\/Users\//, /\/home\//, /\/root\//, /\b[A-Za-z]:[\\/]/, /https?:\/\//i, /local\s*host/i,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/, /@/, /\baibox-/i];
const ID = /^[A-Za-z][\w.-]*$/;
const SNAKE = /^[a-z][a-z0-9_]*$/;

const need = (ok, message) => { if (!ok) throw new Error(message); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isInteger(value) && value >= 0;
const text = value => typeof value === 'string' && value.trim() !== '';
const optional = value => value === null || text(value);
const sha256 = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const utcDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value);
const timestamp = value => typeof value === 'string' && !Number.isNaN(Date.parse(value))
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
const exactly = (object, keys) => plain(object) && Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key));
// A key the schema requires must be present: null where it is nullable, never undefined.
const fields = (object, checks) => plain(object) && Object.entries(checks).every(([key, check]) => Object.hasOwn(object, key) && check(object[key]));
const total = values => values.reduce((sum, value) => sum + value, 0);
const columns = (rows, keys) => Object.fromEntries(keys.map(key => [key, total(rows.map(row => row[key]))]));
const counts = (object, keys) => exactly(object, keys) && keys.every(key => count(object[key]));
const tally = object => plain(object) && Object.keys(object).length > 0 && Object.entries(object).every(([key, value]) => SNAKE.test(key) && count(value));

// Keys and strings at any depth: task IDs are never published and nothing private leaks.
function scan(value, path) {
  if (typeof value === 'string') need(!PRIVATE.some(pattern => pattern.test(value)), `Private string at ${path}`);
  else if (Array.isArray(value)) value.forEach((item, index) => scan(item, `${path}[${index}]`));
  else if (plain(value)) {
    for (const [key, item] of Object.entries(value)) {
      need(!/^task_?ids?$/i.test(key), `Task IDs are not published (${path})`);
      need(!PRIVATE.some(pattern => pattern.test(key)), `Private key at ${path}`);
      scan(item, `${path}.${key}`);
    }
  }
}

function declared(list, kind, nullable) {
  need(Array.isArray(list) && list.length > 0, `Invalid ${kind} list`);
  const checks = { id: id => typeof id === 'string' && ID.test(id), label: text, ...Object.fromEntries(nullable.map(key => [key, optional])) };
  const ids = new Set();
  for (const item of list) {
    need(fields(item, checks) && !ids.has(item.id), `Invalid ${kind} declaration`);
    ids.add(item.id);
  }
  return ids;
}

// Returns the slots a distribution covers, recorded values plus not-recorded slots.
function slots(distribution, valid, identity, message) {
  need(exactly(distribution, ['values', 'not_recorded_slots']) && Array.isArray(distribution.values)
    && count(distribution.not_recorded_slots), message);
  const seen = new Set();
  for (const item of distribution.values) {
    need(plain(item) && valid(item) && count(item.slots) && !seen.has(identity(item)), message);
    seen.add(identity(item));
  }
  return distribution.not_recorded_slots + total(distribution.values.map(item => item.slots));
}

function checkRun(run, n, models, harnesses) {
  need(plain(run) && models.has(run.model) && harnesses.has(run.harness), 'Run does not resolve to a declared model and harness');
  const key = `${run.model}/${run.harness}`;
  need(run.denominator === n, `Denominator differs in ${key}`);
  const o = run.outcomes;
  need(counts(o, OUTCOMES), `Invalid outcomes in ${key}`);
  need(o.scored + o.failed + o.unknown + o.pending === n, `Outcomes do not sum to the denominator in ${key}`);
  need(o.perfect + o.scored_not_perfect === o.scored, `Perfect and not-perfect do not sum to scored in ${key}`);
  need(o.failed_infrastructure + o.failed_model + o.failed_unattributed === o.failed, `Failure attribution does not sum in ${key}`);
  need(o.failed_billing <= o.failed_infrastructure, `Billing failures exceed infrastructure failures in ${key}`);
  need(total(Object.keys(UNKNOWN).map(field => o[field])) === o.unknown, `Unknown attribution does not sum in ${key}`);
  need(typeof run.complete === 'boolean' && (!run.complete || o.pending === 0), `Invalid completion in ${key}`);
  need(exactly(run.metrics, Object.keys(DEV_METRICS)), `Metric keys differ in ${key}`);
  for (const metric of Object.keys(DEV_METRICS)) {
    const m = run.metrics[metric];
    need(exactly(m, METRIC_FIELDS) && ['true', 'false', 'unknown_or_pending'].every(field => count(m[field])) && m.denominator === n,
      `Invalid ${metric} counts in ${key}`);
    need(m.true + m.false + m.unknown_or_pending === n, `${metric} does not sum to the denominator in ${key}`);
    // A metric can be missing on a scored slot, so its unknowns are its own and never derived from scored.
    need(m.true + m.false <= o.scored, `${metric} has more true and false than scored tasks in ${key}`);
    need(Number.isFinite(m.score) && Math.abs(m.score - 100 * m.true / n) <= 0.000001, `${metric} score drifts from its counts in ${key}`);
  }
  need(run.metrics.perfect.true === o.perfect && run.metrics.perfect.false === o.scored_not_perfect,
    `Full replication differs from the outcomes in ${key}`);
  need(exactly(run.settings, SETTINGS), `Settings keys differ in ${key}`);
  for (const setting of ['harness_version', 'route', 'thinking', 'run_date']) {
    const valid = setting === 'run_date' ? utcDay : text;
    need(slots(run.settings[setting], item => exactly(item, ['value', 'slots']) && valid(item.value), item => item.value,
      `Invalid ${setting} setting in ${key}`) === n, `${setting} slots do not sum to the denominator in ${key}`);
  }
  const budgetKeys = Object.keys(BUDGET);
  need(slots(run.settings.budget,
    item => exactly(item, [...budgetKeys, 'slots']) && budgetKeys.every(field => item[field] === null || (Number.isInteger(item[field]) && item[field] > 0))
      && budgetKeys.some(field => item[field] !== null),
    item => budgetKeys.map(field => item[field]).join(), `Invalid budget setting in ${key}`) === n,
  `budget slots do not sum to the denominator in ${key}`);
  need(counts(run.provenance, Object.keys(PROVENANCE)), `Invalid provenance in ${key}`);
  need(total(Object.values(run.provenance)) === n, `Provenance does not sum to the denominator in ${key}`);
  return key;
}

export function validateDevBoard(data) {
  need(plain(data) && data.schema_version === 1 && data.kind === 'inferencenet_dev_board' && data.board_id === DEV_BOARD.id,
    'Invalid development snapshot');
  scan(data, 'data');
  need(data.official_leaderboard_result === false, 'A development snapshot is never an official leaderboard result');
  need(Array.isArray(data.comparable_with) && data.comparable_with.length === 0, 'The development board is not comparable with another board');
  need(text(data.evidence_status), 'Invalid evidence status');
  const n = data.denominator_per_group;
  need(Number.isInteger(n) && n > 0, 'Invalid denominator');
  need(Array.isArray(data.runs) && data.runs.length > 0 && data.groups === data.runs.length && data.records === data.groups * n,
    'Group or record count differs from the runs');
  need(fields(data.report, {
    label: text, generated_at: timestamp, report_schema_version: version => Number.isInteger(version) && version > 0,
    sha256: hashes => fields(hashes, { json: sha256, csv: sha256, md: sha256 }), plan_sha256: sha256,
    accepted_at: value => value === null || timestamp(value),
  }), 'Invalid report');
  need(fields(data.dataset, {
    id: text, label: text, tasks: tasks => tasks === n, split: split => split === 'development',
    task_ids_published: published => published === false, relation: optional,
  }), 'Invalid dataset');
  const keys = Object.keys(DEV_METRICS);
  need(Array.isArray(data.metrics) && data.metrics.length === keys.length && data.metrics.every((metric, index) => fields(metric, {
    key: key => key === keys[index], label: label => label === DEV_METRICS[keys[index]], definition: optional, profile: optional,
  })), 'Metric declarations differ from the board metrics');
  const models = declared(data.models, 'model', ['recorded_name']);
  const harnesses = declared(data.harnesses, 'harness', ['version', 'version_scope', 'description']);
  need(!harnesses.has(DEFAULT_DEV_VIEW), 'The harness id "all" is reserved for the combined view');
  const pairs = new Set();
  for (const run of data.runs) {
    const key = checkRun(run, n, models, harnesses);
    need(!pairs.has(key), `Duplicate run ${key}`);
    pairs.add(key);
  }
  need([...models].every(id => data.runs.some(run => run.model === id))
    && [...harnesses].every(id => data.runs.some(run => run.harness === id)), 'A declared model or harness has no run');
  const totals = columns(data.runs.map(run => run.outcomes), OUTCOMES);
  need(exactly(data.totals, OUTCOMES) && OUTCOMES.every(key => data.totals[key] === totals[key]), 'Totals differ from the runs');
  const summary = data.report_summary;
  need(plain(summary) && summary.generated_at === data.report.generated_at && count(summary.stages), 'Invalid report summary');
  need(exactly(summary.totals, OUTCOMES) && OUTCOMES.every(key => summary.totals[key] === totals[key]), 'Report summary totals differ from the runs');
  const sources = columns(data.runs.map(run => run.provenance), Object.keys(PROVENANCE));
  need(exactly(summary.provenance, Object.keys(PROVENANCE)) && Object.keys(PROVENANCE).every(key => summary.provenance[key] === sources[key]),
    'Report summary provenance differs from the runs');
  need(tally(summary.attempt_ledger), 'Invalid attempt ledger');
  need(tally(summary.unknown_reasons) && total(Object.values(summary.unknown_reasons)) === totals.unknown,
    'Unknown reasons do not sum to the unknown total');
  // Failure reasons are optional: present only when the report's slots support them.
  need(!Object.hasOwn(summary, 'failure_reasons') || (tally(summary.failure_reasons) && total(Object.values(summary.failure_reasons)) === totals.failed),
    'Failure reasons do not sum to the failed total');
  need(Object.hasOwn(summary, 'acceptance') && (summary.acceptance === null || (plain(summary.acceptance)
    && Object.entries(summary.acceptance).every(([key, value]) => SNAKE.test(key) && (value === null || ['string', 'number', 'boolean'].includes(typeof value))))),
  'Invalid acceptance record');
  need(exactly(data.field_evidence, Object.keys(FIELD_EVIDENCE)) && Object.values(data.field_evidence).every(text), 'Invalid field evidence');
  need(Array.isArray(data.caveats) && data.caveats.every(text), 'Invalid caveats');
  return data;
}

/* Ranking ------------------------------------------------------------------ */
export const devViews = data => ({ [DEFAULT_DEV_VIEW]: ALL_HARNESSES, ...Object.fromEntries(data.harnesses.map(harness => [harness.id, harness.label])) });
const modelOf = (data, id) => data.models.find(model => model.id === id);
const harnessOf = (data, id) => data.harnesses.find(harness => harness.id === id);
const runKey = run => `${run.model}/${run.harness}`;

function checkRanking(data, view, metric) {
  const views = devViews(data);
  if (!Object.hasOwn(views, view) || !Object.hasOwn(DEV_METRICS, metric)) throw new Error('Unknown ranking');
  return views;
}

export function rankDevRuns(data, view = DEFAULT_DEV_VIEW, metric = DEFAULT_DEV_METRIC) {
  checkRanking(data, view, metric);
  // Every run shares one denominator, so the integer count orders exactly like the score and float
  // noise cannot split a tie. Ties share a rank (1, 2, 2, 4) and keep data order.
  const rows = data.runs.map((run, index) => ({ key: runKey(run), model: run.model, harness: run.harness, run, index }))
    .filter(row => view === DEFAULT_DEV_VIEW || row.harness === view)
    .sort((a, b) => b.run.metrics[metric].true - a.run.metrics[metric].true || a.index - b.index);
  let rank = 0;
  return rows.map((row, index) => {
    if (!index || rows[index - 1].run.metrics[metric].true !== row.run.metrics[metric].true) rank = index + 1;
    return { key: row.key, rank, model: row.model, harness: row.harness, run: row.run, index: row.index };
  });
}

// Historical DeepAgents slots recorded Full replication only, so some scored tasks have no value for the
// other metrics. A † marks a score whose unknowns include such tasks, so a gap never reads as a collapse.
const MISSING_FLAG = 'Includes scored tasks with no recorded value for this metric.';
const flag = `<span class="dev-missing-flag" aria-hidden="true">†</span><span class="visually-hidden">${MISSING_FLAG}</span>`;
const unrecorded = (run, key) => run.metrics[key].unknown_or_pending > run.outcomes.failed + run.outcomes.unknown + run.outcomes.pending;
const toggle = (className, key, selected, controls, content) => `<button type="button" class="${className}" data-run="${escapeHTML(key)}" aria-expanded="${key === selected}" aria-controls="${escapeHTML(controls)}" aria-describedby="${escapeHTML(controls)}-hint">${content}</button>`;
const sourceMix = provenance => Object.entries(PROVENANCE).filter(([key]) => provenance[key])
  .map(([key, [label]]) => `<span>${label}</span> ${provenance[key]}`).join(' · ');

// Real buttons appear only when the script enhances the table; the generated
// fallback in leaderboard.html stays a plain table. Rows never start with
// data-model, so the Selected_1000 row count on the page is unaffected.
export function devTableRows(data, view = DEFAULT_DEV_VIEW, metric = DEFAULT_DEV_METRIC, { controls, selected } = {}) {
  return rankDevRuns(data, view, metric).map(({ key, rank, run }) => {
    const name = escapeHTML(modelOf(data, run.model).label);
    const o = run.outcomes;
    return `<tr data-board="${DEV_BOARD.id}"${controls && key === selected ? ' class="is-selected"' : ''} data-run-model="${escapeHTML(run.model)}" data-run-harness="${escapeHTML(run.harness)}">`
      + `<td>${rank}</td><th scope="row" data-no-translate>${controls ? toggle('run-toggle', key, selected, controls, name) : name}</th>`
      + `<td class="dev-harness"><span class="harness-tag harness" data-no-translate>${escapeHTML(harnessOf(data, run.harness).label)}</span></td>`
      + Object.keys(DEV_METRICS).map(key => key === metric
        ? `<td class="is-sorted">${formatScore(run.metrics[key].score)}${unrecorded(run, key) ? flag : ''}</td>`
        : `<td>${formatScore(run.metrics[key].score)}</td>`).join('')
      + `<td class="dev-count">${run.metrics[metric].unknown_or_pending}</td><td class="dev-count">${o.scored}</td><td class="dev-count">${o.failed}</td><td class="dev-count">${o.unknown}</td>`
      + `<td class="dev-source">${sourceMix(run.provenance)}</td></tr>`;
  }).join('\n');
}

/* Overview grid: every model against every harness, for the combined view. The
 * numbers stay in the cells; data-level (0-4) only drives a secondary tint. Each
 * cell counts the ranked metric's unknowns; lifecycle failures stay in the table. */
const MATRIX_CAPTION = 'Scores (%) by model and harness';
export function devMatrixHTML(data, metric = DEFAULT_DEV_METRIC, { controls, selected } = {}) {
  checkRanking(data, DEFAULT_DEV_VIEW, metric);
  const cell = (model, harness) => {
    const run = data.runs.find(run => run.model === model.id && run.harness === harness.id);
    if (!run) return '<td class="dev-matrix-empty"><span aria-hidden="true">—</span><span class="visually-hidden">No run</span></td>';
    const key = runKey(run);
    const m = run.metrics[metric];
    const body = `<span class="dev-cell-score">${formatScore(m.score)}</span> <span class="dev-cell-counts"><span>Unknown or missing</span> ${m.unknown_or_pending}</span>`;
    // A button outside the table's row and column headers still names its model and harness.
    const named = `<span class="visually-hidden" data-no-translate>${escapeHTML(model.label)} · ${escapeHTML(harness.label)} · </span>${body}`;
    return `<td${controls && key === selected ? ' class="is-selected"' : ''} data-level="${Math.min(4, Math.floor(5 * m.true / run.denominator))}">${controls ? toggle('dev-cell', key, selected, controls, named) : body}</td>`;
  };
  return `<table class="dev-matrix" data-board="${DEV_BOARD.id}"><caption><span>${DEV_METRICS[metric]}</span> · <span>${MATRIX_CAPTION}</span></caption>`
    + `<thead><tr><th scope="col">Model</th>${data.harnesses.map(harness => `<th scope="col" data-no-translate>${escapeHTML(harness.label)}</th>`).join('')}</tr></thead>`
    + `<tbody>${data.models.map(model => `<tr><th scope="row" data-no-translate>${escapeHTML(model.label)}</th>${data.harnesses.map(harness => cell(model, harness)).join('')}</tr>`).join('\n')}</tbody></table>`;
}

/* Run evidence card -----------------------------------------------------------
 * Built only from the public snapshot. Settings are per-slot distributions, so
 * mixed versions, routes, reasoning settings and budgets inside one cell show
 * as such, with the slots that have no record counted beside them. */
const FACTS = ['Model', 'Model as recorded', 'Route model', 'Harness', 'Harness version', 'Thinking setting', 'Recorded budget caps',
  'Run dates', 'Tasks', 'Scored', 'Failed', 'Unknown', 'Pending', 'Provenance mix', 'Evidence status', 'Report', 'Report generated'];
const COLUMNS = ['Metric', 'True', 'False', 'Unknown or missing', 'Score'];
const CARD_CAPTION = 'Outcomes on the 100 development tasks';
const EVIDENCE = Object.freeze({ 'accepted-final-report': 'Accepted final report' });
// The summit names the ranked metric, so a full score on Correct sign never reads as full replication.
const peak = metric => `100% · ${DEV_METRICS[metric]} on every task`;
const DEV_SCOPE_NOTE = 'This is a descriptive comparison on a fixed 100-task development set; it is not an official Challenge ranking.';
// Keep the archived caveat in the source data; the page no longer displays the other board.
const displayDevCaveat = caveat => caveat === 'This is a descriptive comparison on a fixed 100-task development set; it is not a Challenge leaderboard and is not directly comparable with the Selected_1000 board.'
  ? DEV_SCOPE_NOTE : caveat;
const DEV_NOTES = Object.freeze([
  DEV_SCOPE_NOTE,
  'Failed and unknown tasks stay in the 100-task denominator; they are never counted as false or as successes.',
  'Unknown or missing covers failed, unknown or pending tasks plus scored tasks with no recorded value for that metric.',
  'Historical DeepAgents slots and new runs have separate provenance, and their routes, reasoning settings and budgets differ, so differences are descriptive only.',
  'Budget caps are the limits recorded with each run, not independent measurements of execution.',
  'Billing and infrastructure failures are not model-capability failures.',
]);
const DEV_LINKS = Object.freeze([
  ['assets/data/dev100-v10-results.json', 'Development data JSON'],
  ['assets/data/dev100-v10-results-provenance.json', 'Development provenance'],
  ['assets/data/dev100-v10-results.csv', 'Development results CSV'],
  ['leaderboard.html#leaderboard-dev100-method', 'Development method and sources'],
]);
const REPORT_TEXT = ['v10 report summary', 'Dataset', 'Dataset relation', 'Task slots', 'New-run stages', 'Attempt ledger', 'Unknown reasons',
  'Failure reasons', 'Acceptance', 'How each field was established', 'Caveats'];
// Static strings in the widget that scripts/build-dev100-board.mjs writes into leaderboard.html.
const WIDGET_TEXT = ['Rank by', 'Filter harness', 'Ranking metric', 'Development results', 'Scroll the table to see all metrics →', 'Unknown or missing (ranked metric)',
  '† Includes scored tasks with no recorded value for this metric: historical DeepAgents results recorded Full replication only.',
  'Every score uses all 100 tasks; failed and unknown runs stay in the denominator.', 'Download development results CSV ↓'];
// Every fixed string the dev table, grid, card, controls and summary render; the leaderboard dictionary must translate them.
export const DEV_CARD_TEXT = Object.freeze([...new Set([
  'Run evidence', 'Close', 'Rank', NOT_RECORDED, ALL_HARNESSES, ...Object.values(DEV_METRICS),
  DEV_BOARD.caption, DEV_BOARD.hint, DEV_BOARD.failureStatus, DEV_BOARD.chartNote, DEV_BOARD.chartsLabel,
  'Harness', 'Scored', 'Failed', 'Unknown', 'Source mix', MATRIX_CAPTION, 'No run', 'Run outcomes', 'Development split', 'task', 'tasks', MISSING_FLAG,
  ...Object.keys(DEV_METRICS).map(peak),
  ...FACTS, ...COLUMNS, CARD_CAPTION, ...Object.values(FAILED), ...Object.values(UNKNOWN), ...Object.values(BUDGET),
  ...Object.values(PROVENANCE).flat(), ...Object.values(EVIDENCE), ...DEV_NOTES, ...DEV_LINKS.map(([, label]) => label),
  ...REPORT_TEXT, ...Object.values(FIELD_EVIDENCE), ...WIDGET_TEXT,
])]);

// Prose from the data renders as its own text node, so a dictionary entry can match it whole.
const prose = value => `<span>${escapeHTML(value)}</span>`;
// The dataset's display name on the Metacase Challenge site; the data file itself is left as recorded (its sha256 is in the provenance).
const datasetLabel = data => data.dataset.label.replace(/^InferenceNet development set/, 'Dev100 development set');
const sentence = value => typeof value === 'string' && /\s/.test(value.trim());
const recorded = value => value === null || value === undefined || value === '' ? NOT_RECORDED : value;
const missing = `<span class="run-missing">${NOT_RECORDED}</span>`;
const shown = (value, code = false) => value === NOT_RECORDED ? missing : code ? `<code>${escapeHTML(value)}</code>` : escapeHTML(value);
const number = value => value.toLocaleString('en-US');
// Report dates are the UTC date of generated_at, whatever offset the report was written with.
const reportDate = data => new Date(data.report.generated_at).toISOString().slice(0, 10);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = date => `<time datetime="${date}">${date}</time>`;
const tasks = n => `${n} <span>${n === 1 ? 'task' : 'tasks'}</span>`;
const breakdown = (labels, outcomes) => ` <span class="run-card-breakdown">(${Object.entries(labels).map(([key, label]) => `<span>${label}</span> ${number(outcomes[key])}`).join(' · ')})</span>`;
const share = ({ values, not_recorded_slots }, pick = item => item.value) => ({
  values: values.map(item => ({ value: pick(item), slots: item.slots })), notRecorded: not_recorded_slots,
});
// One line per recorded value with its task count, then the tasks with no record.
const spread = ({ values, notRecorded }, render) => values.length
  ? `<ul class="run-card-dist">${[...values.map(({ value, slots }) => [render(value), slots]), ...(notRecorded ? [[missing, notRecorded]] : [])]
    .map(([html, slots]) => `<li>${html} · ${tasks(slots)}</li>`).join('')}</ul>`
  : missing;
const budgetHTML = budget => Object.entries(BUDGET).map(([key, label]) => `<span>${label}</span> ${budget[key] === NOT_RECORDED ? missing : number(budget[key])}`).join(' · ');

export function selectedDevRun(data, view, metric, key) {
  if (!key) return null;
  return rankDevRuns(data, view, metric).find(row => row.key === key) || null;
}

export function devRunEvidence(data, row) {
  const { run } = row;
  const model = modelOf(data, run.model);
  return {
    key: row.key,
    rank: row.rank,
    model: model.label,
    modelRecorded: recorded(model.recorded_name),
    harness: harnessOf(data, run.harness).label,
    route: share(run.settings.route),
    harnessVersion: share(run.settings.harness_version),
    thinking: share(run.settings.thinking),
    runDates: share(run.settings.run_date),
    budget: share(run.settings.budget, item => Object.fromEntries(Object.keys(BUDGET).map(key => [key, recorded(item[key])]))),
    tasks: data.dataset.tasks,
    outcomes: { ...run.outcomes },
    provenance: Object.entries(PROVENANCE).filter(([key]) => run.provenance[key]).map(([key, [, label]]) => ({ key, label, count: run.provenance[key] })),
    evidenceStatus: data.evidence_status,
    report: { label: data.report.label, sha256: data.report.sha256.json.slice(0, 12), generated: reportDate(data) },
    metrics: Object.entries(DEV_METRICS).map(([key, label]) => {
      const metric = run.metrics[key];
      return { key, label, true: metric.true, false: metric.false, unknownOrPending: metric.unknown_or_pending, score: metric.score,
        unrecorded: unrecorded(run, key) };
    }),
  };
}

export function devRunCardHTML(data, view, metric, key, { id }) {
  const row = selectedDevRun(data, view, metric, key);
  if (!row) return '';
  const e = devRunEvidence(data, row);
  const o = e.outcomes;
  const total = rankDevRuns(data, view, metric).length;
  const code = value => `<code>${escapeHTML(value)}</code>`;
  const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const facts = [
    fact('Model', `<span data-no-translate>${escapeHTML(e.model)}</span>`),
    fact('Model as recorded', shown(e.modelRecorded, true)),
    fact('Route model', spread(e.route, code)),
    fact('Harness', `<span data-no-translate>${escapeHTML(e.harness)}</span>`),
    fact('Harness version', spread(e.harnessVersion, code)),
    fact('Thinking setting', spread(e.thinking, prose)),
    fact('Recorded budget caps', spread(e.budget, budgetHTML)),
    fact('Run dates', spread(e.runDates, day)),
    fact('Tasks', `${e.tasks} · <span>Development split</span>`),
    fact('Scored', o.scored),
    fact('Failed', `${o.failed}${o.failed ? breakdown(FAILED, o) : ''}`),
    fact('Unknown', `${o.unknown}${o.unknown ? breakdown(UNKNOWN, o) : ''}`),
    fact('Pending', o.pending),
    fact('Provenance mix', `<ul class="run-card-dist">${e.provenance.map(p => `<li><span>${p.label}</span> · ${tasks(p.count)}</li>`).join('')}</ul>`),
    fact('Evidence status', Object.hasOwn(EVIDENCE, e.evidenceStatus) ? EVIDENCE[e.evidenceStatus] : prose(e.evidenceStatus)),
    fact('Report', `${code(e.report.label)} · ${code(`sha256:${e.report.sha256}`)}`),
    fact('Report generated', day(e.report.generated)),
  ].join('');
  const outcomes = e.metrics.map(m => `<tr${m.key === metric ? ' class="is-sorted"' : ''} data-metric="${m.key}"><th scope="row">${m.label}</th><td>${m.true}</td><td>${m.false}</td><td>${m.unknownOrPending}</td><td>${formatScore(m.score)}${m.unrecorded ? flag : ''}</td></tr>`).join('');
  return `<div class="run-card-head"><div><p class="run-card-kicker">Run evidence</p>`
    + `<h3 class="run-card-title" id="${escapeHTML(id)}-title" tabindex="-1"><span data-no-translate>${escapeHTML(e.model)}</span> <span class="run-card-config" data-no-translate>${escapeHTML(e.harness)}</span></h3>`
    + `<p class="run-card-meta"><span>Rank</span> <span class="run-card-rank">${e.rank} / ${total}</span> · <span>${DEV_METRICS[metric]}</span> · <span${view === DEFAULT_DEV_VIEW ? '' : ' data-no-translate'}>${escapeHTML(devViews(data)[view])}</span></p></div>`
    + `<button type="button" class="run-card-close" data-run-close>Close</button></div>`
    + `<div class="run-card-body"><dl class="run-card-facts">${facts}</dl>`
    + `<div class="table-scroll" tabindex="0" role="region" aria-label="Run outcomes"><table class="run-card-metrics dev-card-metrics"><caption>${CARD_CAPTION}</caption>`
    + `<thead><tr>${COLUMNS.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${outcomes}</tbody></table></div>`
    + `<p class="scroll-hint" aria-hidden="true" hidden>${CARD_SCROLL_HINT}</p></div>`
    + `<ul class="run-card-notes">${DEV_NOTES.map(note => `<li>${note}</li>`).join('')}</ul>`
    + `<p class="run-card-links">${DEV_LINKS.map(([href, label]) => `<a class="text-link" href="${href}">${label}</a>`).join('')}</p>`;
}

/* Chart, status and the static report summary ------------------------------ */
// The mountain shows one harness at a time; 56 climbers on one slope would overlap.
export function devChart(data, view, metric, rows) {
  const views = checkRanking(data, view, metric);
  if (view === DEFAULT_DEV_VIEW) return null;
  return {
    title: views[view], metric: DEV_METRICS[metric], unit: '%', max: 100, peakLabel: peak(metric),
    items: rows.map(row => ({ rank: row.rank, label: modelOf(data, row.model).label, value: row.run.metrics[metric].score, kind: 'internal' })),
  };
}

// The combined view draws one mountain card per harness: the same metric and 0-100% scale, each with its
// own models ranked within that harness. A single-harness view keeps its one mountain from devChart.
export function devCharts(data, view, metric) {
  checkRanking(data, view, metric);
  if (view !== DEFAULT_DEV_VIEW) return [];
  return data.harnesses.map((harness, index) => {
    const rows = rankDevRuns(data, harness.id, metric);
    return {
      key: harness.id, series: index % 4 + 1, title: harness.label,
      legend: devStatus(data, harness.id, metric, rows), chart: devChart(data, harness.id, metric, rows),
    };
  });
}

// The saved status line, like "Published results · 17 Sep 2026" on the Selected_1000 board.
export function devSavedStatus(data) {
  const [year, month, date] = reportDate(data).split('-');
  return `v10 final report · ${Number(date)} ${MONTHS[month - 1]} ${year}`;
}

// Same shape as the Selected_1000 status line, so language.js translates it with the existing pattern.
export function devStatus(data, view, metric, rows) {
  const views = checkRanking(data, view, metric);
  return `${views[view]} · ${rows.length} entries · ${DEV_METRICS[metric]}`;
}

export function devOverview(data, view, metric, options = {}) {
  checkRanking(data, view, metric);
  return view === DEFAULT_DEV_VIEW ? devMatrixHTML(data, metric, options) : '';
}

// Readable without JavaScript; generated into leaderboard.html after the widget.
export function devReportHTML(data) {
  const summary = data.report_summary;
  const t = summary.totals;
  const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  // Raw keys and identifiers stay code; a recorded sentence renders as translatable prose.
  const raw = object => Object.entries(object).map(([key, value]) => `<code>${escapeHTML(key)}</code> ${typeof value === 'number' ? number(value)
    : value === null ? missing : sentence(value) ? prose(value) : `<code>${escapeHTML(value)}</code>`}`).join(' · ');
  const facts = [
    fact('Report', `<code>${escapeHTML(data.report.label)}</code> · <code>sha256:${data.report.sha256.json.slice(0, 12)}</code>`),
    fact('Report generated', day(reportDate(data))),
    fact('Dataset', `${prose(datasetLabel(data))} · ${tasks(data.dataset.tasks)} · <span>Development split</span>`),
    fact('Dataset relation', data.dataset.relation === null ? missing : prose(data.dataset.relation)),
    fact('Task slots', number(data.records)),
    fact('Scored', number(t.scored)),
    fact(DEV_METRICS.perfect, number(t.perfect)),
    fact('Failed', `${number(t.failed)}${breakdown(FAILED, t)}`),
    fact('Unknown', `${number(t.unknown)}${breakdown(UNKNOWN, t)}`),
    fact('Pending', number(t.pending)),
    fact('Provenance mix', `<ul class="run-card-dist">${Object.entries(PROVENANCE).filter(([key]) => summary.provenance[key])
      .map(([key, [, label]]) => `<li><span>${label}</span> · ${tasks(summary.provenance[key])}</li>`).join('')}</ul>`),
    fact('New-run stages', number(summary.stages)),
    fact('Attempt ledger', raw(summary.attempt_ledger)),
    fact('Unknown reasons', raw(summary.unknown_reasons)),
    summary.failure_reasons ? fact('Failure reasons', raw(summary.failure_reasons)) : '',
    fact('Acceptance', summary.acceptance === null ? missing : raw(summary.acceptance)),
  ].filter(Boolean).join('\n    ');
  return `<div class="dev-report" id="leaderboard-dev100-report">
  <h3>v10 report summary</h3>
  <dl class="dev-report-facts">
    ${facts}
  </dl>
  <p class="dev-report-links">${DEV_LINKS.slice(0, 3).map(([href, label]) => `<a class="text-link" href="${href}">${label}</a>`).join('')}</p>
</div>`;
}

// Strings from the data that render as translatable text rather than code or a
// proper noun, normalized like language.js; the page dictionary must carry each.
export function devDataText(data) {
  return [...new Set([
    ...data.runs.flatMap(run => run.settings.thinking.values.map(item => item.value)),
    ...(Object.hasOwn(EVIDENCE, data.evidence_status) ? [] : [data.evidence_status]),
    datasetLabel(data), data.dataset.relation ?? '', ...Object.values(data.field_evidence), ...data.caveats.map(displayDevCaveat),
    ...Object.values(data.report_summary.acceptance ?? {}).filter(sentence), devSavedStatus(data),
  ].map(value => value.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}

/* Board descriptor for the shared renderer. Views come from the data, so
 * `views` is a function; the URL parameter is the board's own. */
export const devBoardDescriptor = source => Object.freeze({
  id: DEV_BOARD.id,
  source,
  validate: validateDevBoard,
  views: devViews,
  defaultView: DEFAULT_DEV_VIEW,
  metrics: DEV_METRICS,
  defaultMetric: DEFAULT_DEV_METRIC,
  viewFromURL: url => new URL(url).searchParams.get('dev-harness'),
  rank: rankDevRuns,
  rowsHTML: devTableRows,
  cardHTML: devRunCardHTML,
  chart: devChart,
  charts: devCharts,
  overview: devOverview,
  status: devStatus,
  caption: DEV_BOARD.caption,
  hint: DEV_BOARD.hint,
  failureStatus: DEV_BOARD.failureStatus,
  chartNote: DEV_BOARD.chartNote,
  chartsLabel: DEV_BOARD.chartsLabel,
});
