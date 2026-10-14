import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NOT_RECORDED, CARD_SCROLL_HINT } from '../leaderboard-data.js';
import {
  DEV_METRICS, DEFAULT_DEV_METRIC, DEFAULT_DEV_VIEW, DEV_BOARD, DEV_CARD_TEXT,
  validateDevBoard, devViews, rankDevRuns, devTableRows, devMatrixHTML, devOverview, selectedDevRun, devRunEvidence,
  devRunCardHTML, devChart, devCharts, devStatus, devSavedStatus, devReportHTML, devDataText, devBoardDescriptor,
} from '../leaderboard-dev100-data.js';
import { devWidget, devBlock, replaceDevBlock, buildDevBoard } from './build-dev100-board.mjs';

const root = new URL('../', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const KEYS = Object.keys(DEV_METRICS);
// test-leaderboard.mjs forbids these on both pages, so nothing generated may contain them.
const RETIRED = /Fourteen|14 entries|GPT 4o -|32\.8%|69\.7%/;
const FLAG = '<span class="dev-missing-flag" aria-hidden="true">†</span><span class="visually-hidden">Includes scored tasks with no recorded value for this metric.</span>';

/* Synthetic fixture: two models × two harnesses on ten tasks -------------------
 * Model A on Harness Two is the regression cell: every task is scored, yet two
 * scored tasks carry no partial or significance flag, so those metrics have
 * unknowns of their own while nothing failed. */
const HASH = 'ab'.repeat(32);
const GENERATED = '2026-10-11T16:35:49.651444+00:00';
const PROVIDER_DEFAULT = 'Provider default, no explicit override';
const PROVENANCE_KEYS = ['new_native', 'offline_derived_deepagents_metric', 'historical_deepagents_metric', 'inherited_native_sdk'];
const outcome = (scored, perfect, failed, unknown, pending, parts = {}) => ({
  scored, perfect, scored_not_perfect: scored - perfect, failed, unknown, pending,
  failed_infrastructure: 0, failed_billing: 0, failed_model: 0, failed_unattributed: failed,
  unknown_infrastructure: 0, unknown_provider_rejected: 0, unknown_provider_access: 0, unknown_provider: 0, unknown_deadline: 0,
  unknown_unattributed: unknown, ...parts,
});
const OUTCOME_KEYS = Object.keys(outcome(0, 0, 0, 0, 0));
const scores = pairs => Object.fromEntries(KEYS.map((key, i) => {
  const [yes, no] = pairs[i];
  return [key, { true: yes, false: no, unknown_or_pending: 10 - yes - no, denominator: 10, score: 10 * yes }];
}));
const spread = values => ({
  values: values.map(([value, slots]) => ({ value, slots })), not_recorded_slots: 10 - values.reduce((sum, [, slots]) => sum + slots, 0),
});
const caps = (slots, overrides = {}) => ({ model_calls: 6, tool_calls: 4, output_tokens: 32768, wall_seconds: 1800, tool_timeout_seconds: 90, ...overrides, slots });
const run = (model, harness, outcomes, pairs, settings, provenance) => ({
  model, harness, denominator: 10, complete: outcomes.pending === 0, outcomes, metrics: scores(pairs), settings,
  provenance: { ...Object.fromEntries(PROVENANCE_KEYS.map(key => [key, 0])), ...provenance },
});
const sumBy = (rows, keys) => Object.fromEntries(keys.map(key => [key, rows.reduce((sum, row) => sum + row[key], 0)]));

function fixture() {
  const runs = [
    run('a', 'h1', outcome(8, 5, 1, 1, 0, { failed_infrastructure: 1, failed_billing: 1, failed_unattributed: 0, unknown_deadline: 1, unknown_unattributed: 0 }),
      [[5, 3], [6, 2], [7, 1], [8, 0], [6, 2]],
      { harness_version: spread([['1.0.0', 8]]), route: spread([['vendor/model-a', 10]]), thinking: spread([[PROVIDER_DEFAULT, 8]]),
        run_date: spread([['2026-10-11', 6], ['2026-10-10', 2]]), budget: { values: [caps(8)], not_recorded_slots: 2 } },
      { new_native: 8, historical_deepagents_metric: 2 }),
    run('a', 'h2', outcome(10, 7, 0, 0, 0), [[7, 3], [5, 3], [8, 2], [9, 1], [6, 2]],
      { harness_version: spread([]), route: spread([['vendor/model-a', 10]]), thinking: spread([]), run_date: spread([]),
        budget: { values: [caps(10, { output_tokens: null, wall_seconds: null })], not_recorded_slots: 0 } },
      { new_native: 10 }),
    run('b', 'h1', outcome(8, 5, 0, 1, 1, { unknown_infrastructure: 1, unknown_unattributed: 0 }), [[5, 3], [4, 4], [4, 4], [4, 4], [4, 4]],
      { harness_version: spread([['1.0.0', 10]]), route: spread([]), thinking: spread([['high', 10]]), run_date: spread([['2026-10-11', 10]]),
        budget: { values: [], not_recorded_slots: 10 } },
      { offline_derived_deepagents_metric: 6, inherited_native_sdk: 4 }),
    run('b', 'h2', outcome(4, 2, 4, 2, 0, { failed_infrastructure: 3, failed_billing: 2, failed_unattributed: 1, unknown_provider_rejected: 1, unknown_unattributed: 1 }),
      [[2, 2], [3, 1], [3, 1], [4, 0], [2, 2]],
      { harness_version: spread([]), route: spread([['vendor/model-b', 4]]), thinking: spread([]), run_date: spread([]),
        budget: { values: [], not_recorded_slots: 10 } },
      { historical_deepagents_metric: 6, inherited_native_sdk: 4 }),
  ];
  const totals = sumBy(runs.map(item => item.outcomes), OUTCOME_KEYS);
  return {
    schema_version: 1, kind: 'inferencenet_dev_board', board_id: 'dev100-v10', official_leaderboard_result: false, comparable_with: [],
    evidence_status: 'accepted-final-report',
    report: { label: 'fixture-campaign-report', generated_at: GENERATED, report_schema_version: 9,
      sha256: { json: HASH, csv: HASH, md: HASH }, plan_sha256: HASH, accepted_at: null },
    dataset: { id: 'dev-fixture', label: 'Development fixture', tasks: 10, split: 'development', task_ids_published: false, relation: null },
    denominator_per_group: 10, groups: 4, records: 40,
    metrics: KEYS.map(key => ({ key, label: DEV_METRICS[key], definition: null, profile: 'local-paper-v1' })),
    harnesses: [
      { id: 'h1', label: 'Harness One', version: '1.0.0', version_scope: 'Fixture scope.', description: null },
      { id: 'h2', label: 'Harness Two', version: null, version_scope: null, description: 'Second fixture harness.' },
    ],
    models: [{ id: 'a', label: 'Model A', recorded_name: 'model-a-recorded' }, { id: 'b', label: 'Model B', recorded_name: null }],
    runs, totals,
    report_summary: {
      generated_at: GENERATED, totals: { ...totals }, provenance: sumBy(runs.map(item => item.provenance), PROVENANCE_KEYS),
      attempt_ledger: { attempts: 46, selected: 40, superseded: 6 },
      unknown_reasons: { deadline: 1, infrastructure: 1, provider_rejected: 1, unattributed: 1 },
      failure_reasons: { billing_http_402: 3, provider_timeout: 1, unattributed: 1 },
      stages: 2, acceptance: null,
    },
    field_evidence: Object.fromEntries(['outcomes', 'metrics', 'provenance', 'budget', 'thinking', 'harness_version', 'route', 'run_date']
      .map(key => [key, `Fixture evidence for ${key}.`])),
    caveats: ['Fixture caveat.'],
  };
}

// Re-derive counts after removing or adding runs.
function settle(data) {
  data.groups = data.runs.length;
  data.records = data.groups * data.denominator_per_group;
  data.totals = sumBy(data.runs.map(item => item.outcomes), OUTCOME_KEYS);
  Object.assign(data.report_summary, {
    totals: { ...data.totals }, provenance: sumBy(data.runs.map(item => item.provenance), PROVENANCE_KEYS),
    unknown_reasons: { unattributed: data.totals.unknown }, failure_reasons: { unattributed: data.totals.failed },
  });
  return data;
}

const card = (data, key, view = 'all', metric = 'perfect') => devRunCardHTML(data, view, metric, key, { id: 'dev100-v10-card' });
const fact = (html, label) => html.match(new RegExp(`<dt>${label}</dt><dd>([\\s\\S]*?)</dd></div>`))[1];
const plainText = html => html.replace(/<[^>]+>/g, '');
const cell = (html, metric, column) => {
  const tr = html.match(new RegExp(`<tr[^>]*data-metric="${metric}"[^>]*>([\\s\\S]*?)</tr>`))[1];
  return [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1])[column];
};
const count = (html, pattern) => (html.match(pattern) || []).length;

/* Validator ------------------------------------------------------------------ */
test('the synthetic fixture passes the development validator', () => {
  const data = fixture();
  assert.equal(validateDevBoard(data), data);
  const lean = fixture();
  delete lean.report_summary.failure_reasons;   // optional when the slots cannot support it
  assert.equal(validateDevBoard(lean), lean);
});

test('a scored task missing a metric flag is accepted; more true and false than scored tasks is not', () => {
  const data = fixture();
  assert.equal(data.runs[1].outcomes.scored, 10);
  assert.deepEqual(data.runs[1].metrics.partial, { true: 5, false: 3, unknown_or_pending: 2, denominator: 10, score: 50 });
  validateDevBoard(data);
  Object.assign(data.runs[0].metrics.partial, { true: 6, false: 3, unknown_or_pending: 1, score: 60 });   // nine flags on eight scored tasks
  assert.throws(() => validateDevBoard(data), /partial has more true and false than scored tasks in a\/h1/);
});

const REJECTS = [
  ['non-positive denominator', d => { d.denominator_per_group = 0; }, /Invalid denominator/],
  ['run denominator', d => { d.runs[0].denominator = 9; }, /Denominator differs in a\/h1/],
  ['metric denominator', d => { d.runs[0].metrics.partial.denominator = 9; }, /Invalid partial counts in a\/h1/],
  ['outcome sum', d => { d.runs[0].outcomes.pending = 1; }, /Outcomes do not sum to the denominator in a\/h1/],
  ['perfect split', d => { d.runs[0].outcomes.scored_not_perfect = 2; }, /Perfect and not-perfect do not sum to scored in a\/h1/],
  ['failure attribution', d => { d.runs[0].outcomes.failed_unattributed = 1; }, /Failure attribution does not sum in a\/h1/],
  ['billing above infrastructure', d => { d.runs[3].outcomes.failed_billing = 4; }, /Billing failures exceed infrastructure failures in b\/h2/],
  ['unknown attribution', d => { d.runs[0].outcomes.unknown_deadline = 0; }, /Unknown attribution does not sum in a\/h1/],
  ['negative outcome', d => { d.runs[0].outcomes.failed_model = -1; }, /Invalid outcomes in a\/h1/],
  ['extra outcome key', d => { d.runs[0].outcomes.skipped = 0; }, /Invalid outcomes in a\/h1/],
  ['metric sum', d => { d.runs[0].metrics.partial.unknown_or_pending = 3; }, /partial does not sum to the denominator in a\/h1/],
  ['metric above scored', d => { Object.assign(d.runs[0].metrics.partial, { true: 6, false: 3, unknown_or_pending: 1, score: 60 }); },
    /partial has more true and false than scored tasks in a\/h1/],
  ['score drift', d => { d.runs[0].metrics.direction.score = 80.01; }, /direction score drifts from its counts in a\/h1/],
  ['perfect true', d => { Object.assign(d.runs[0].metrics.perfect, { true: 4, false: 4, score: 40 }); }, /Full replication differs from the outcomes in a\/h1/],
  ['perfect false', d => { Object.assign(d.runs[0].metrics.perfect, { false: 2, unknown_or_pending: 3 }); }, /Full replication differs from the outcomes in a\/h1/],
  ['retired not_scored field', d => { const m = d.runs[0].metrics.partial; m.not_scored = m.unknown_or_pending; delete m.unknown_or_pending; },
    /Invalid partial counts in a\/h1/],
  ['duplicate pair', d => { d.runs[2].model = 'a'; }, /Duplicate run a\/h1/],
  ['unknown model', d => { d.runs[0].model = 'c'; }, /Run does not resolve to a declared model and harness/],
  ['unknown harness', d => { d.runs[0].harness = 'h3'; }, /Run does not resolve to a declared model and harness/],
  ['group count', d => { d.groups = 5; }, /Group or record count differs from the runs/],
  ['record count', d => { d.records = 39; }, /Group or record count differs from the runs/],
  ['totals', d => { d.totals.failed++; }, /Totals differ from the runs/],
  ['summary totals', d => { d.report_summary.totals.scored--; }, /Report summary totals differ from the runs/],
  ['summary provenance', d => { d.report_summary.provenance.new_native++; }, /Report summary provenance differs from the runs/],
  ['unknown reasons', d => { d.report_summary.unknown_reasons.deadline++; }, /Unknown reasons do not sum to the unknown total/],
  ['failure reasons', d => { d.report_summary.failure_reasons.unattributed++; }, /Failure reasons do not sum to the failed total/],
  ['summary date', d => { d.report_summary.generated_at = '2026-10-12T00:00:00Z'; }, /Invalid report summary/],
  ['attempt ledger', d => { d.report_summary.attempt_ledger = {}; }, /Invalid attempt ledger/],
  ['task_ids key', d => { d.runs[0].task_ids = ['t1']; }, /Task IDs are not published \(data\.runs\[0\]\)/],
  ['nested task_id key', d => { d.report_summary.acceptance = { task_id: 'x' }; }, /Task IDs are not published/],
  ['metric declaration order', d => { d.metrics.reverse(); }, /Metric declarations differ from the board metrics/],
  ['metric declaration label', d => { d.metrics[1].label = 'Partial replication'; }, /Metric declarations differ from the board metrics/],
  ['run metric missing', d => { delete d.runs[0].metrics.significance; }, /Metric keys differ in a\/h1/],
  ['run metric extra', d => { d.runs[0].metrics.compilation = { ...d.runs[0].metrics.direction }; }, /Metric keys differ in a\/h1/],
  ['thinking slots', d => { d.runs[0].settings.thinking.not_recorded_slots = 3; }, /thinking slots do not sum to the denominator in a\/h1/],
  ['route slots', d => { d.runs[0].settings.route.values[0].slots = 9; }, /route slots do not sum to the denominator in a\/h1/],
  ['harness version slots', d => { d.runs[2].settings.harness_version.not_recorded_slots = 1; }, /harness_version slots do not sum to the denominator in b\/h1/],
  ['run date slots', d => { d.runs[0].settings.run_date.values[1].slots = 3; }, /run_date slots do not sum to the denominator in a\/h1/],
  ['budget slots', d => { d.runs[0].settings.budget.not_recorded_slots = 0; }, /budget slots do not sum to the denominator in a\/h1/],
  ['negative slots', d => { Object.assign(d.runs[0].settings.thinking, { values: [{ value: PROVIDER_DEFAULT, slots: -1 }], not_recorded_slots: 11 }); },
    /Invalid thinking setting in a\/h1/],
  ['empty thinking value', d => { d.runs[0].settings.thinking.values[0].value = ' '; }, /Invalid thinking setting in a\/h1/],
  ['null thinking value', d => { d.runs[0].settings.thinking.values[0].value = null; }, /Invalid thinking setting in a\/h1/],
  ['duplicate distribution value', d => { d.runs[0].settings.run_date.values[1].value = '2026-10-11'; }, /Invalid run_date setting in a\/h1/],
  ['impossible run date', d => { d.runs[0].settings.run_date.values[0].value = '2026-02-30'; }, /Invalid run_date setting in a\/h1/],
  ['run date with time', d => { d.runs[0].settings.run_date.values[0].value = GENERATED; }, /Invalid run_date setting in a\/h1/],
  ['zero budget cap', d => { d.runs[0].settings.budget.values[0].output_tokens = 0; }, /Invalid budget setting in a\/h1/],
  ['fractional budget cap', d => { d.runs[0].settings.budget.values[0].wall_seconds = 1.5; }, /Invalid budget setting in a\/h1/],
  ['missing budget field', d => { delete d.runs[0].settings.budget.values[0].tool_calls; }, /Invalid budget setting in a\/h1/],
  ['all-null budget entry', d => { Object.assign(d.runs[0].settings.budget.values[0], { model_calls: null, tool_calls: null, output_tokens: null, wall_seconds: null, tool_timeout_seconds: null }); },
    /Invalid budget setting in a\/h1/],
  ['missing settings key', d => { delete d.runs[0].settings.run_date; }, /Settings keys differ in a\/h1/],
  ['provenance sum', d => { d.runs[0].provenance.new_native = 7; }, /Provenance does not sum to the denominator in a\/h1/],
  ['provenance key', d => { d.runs[0].provenance.unknown_source = 0; }, /Invalid provenance in a\/h1/],
  ['official result', d => { d.official_leaderboard_result = true; }, /never an official leaderboard result/],
  ['comparable board', d => { d.comparable_with = ['selected-1000']; }, /not comparable with another board/],
  ['published task IDs', d => { d.dataset.task_ids_published = true; }, /Invalid dataset/],
  ['dataset size', d => { d.dataset.tasks = 100; }, /Invalid dataset/],
  ['completion with pending', d => { d.runs[2].complete = true; }, /Invalid completion in b\/h1/],
  ['declared model without a run', d => { d.models.push({ id: 'c', label: 'Model C', recorded_name: null }); }, /A declared model or harness has no run/],
  ['reserved harness id', d => { d.harnesses[1].id = 'all'; d.runs[1].harness = 'all'; d.runs[3].harness = 'all'; }, /reserved for the combined view/],
  ['slash in an id', d => { d.models[0].id = 'a/x'; for (const item of d.runs) if (item.model === 'a') item.model = 'a/x'; }, /Invalid model declaration/],
  ['field evidence keys', d => { delete d.field_evidence.run_date; }, /Invalid field evidence/],
  ['field evidence value', d => { d.field_evidence.route = 3; }, /Invalid field evidence/],
  ['report hash', d => { d.report.sha256.md = 'xyz'; }, /Invalid report/],
  ['report timestamp', d => { d.report.generated_at = '2026-10-11'; }, /Invalid report/],
  ['caveats', d => { d.caveats = ['']; }, /Invalid caveats/],
  ['kind', d => { d.kind = 'research_leaderboard'; }, /Invalid development snapshot/],
];

test('each broken invariant rejects the snapshot for its own reason', () => {
  for (const [name, mutate, reason] of REJECTS) {
    const data = fixture();
    mutate(data);
    assert.throws(() => validateDevBoard(data), reason, name);
  }
});

test('a required key holds null when not recorded and is never accepted missing or undefined', () => {
  for (const [name, mutate, reason] of [
    ['recorded model name', d => { delete d.models[1].recorded_name; }, /Invalid model declaration/],
    ['harness version', d => { delete d.harnesses[1].version; }, /Invalid harness declaration/],
    ['harness version scope', d => { d.harnesses[1].version_scope = undefined; }, /Invalid harness declaration/],
    ['dataset relation', d => { delete d.dataset.relation; }, /Invalid dataset/],
    ['report acceptance date', d => { delete d.report.accepted_at; }, /Invalid report/],
    ['summary acceptance', d => { delete d.report_summary.acceptance; }, /Invalid acceptance record/],
    ['budget cap', d => { d.runs[1].settings.budget.values[0].output_tokens = undefined; }, /Invalid budget setting in a\/h2/],
    ['metric definition', d => { d.metrics[0].definition = undefined; }, /Metric declarations differ/],
  ]) {
    const data = fixture();
    mutate(data);
    assert.throws(() => validateDevBoard(data), reason, name);
  }
});

test('server paths, URLs, hosts, addresses and handles are rejected anywhere without being echoed', () => {
  const leaks = ['/mnt/data/run', `/${'Users'}/me/run`, '/home/me/run', '/root/run', 'C:\\runs', 'D:/runs', 'https://example.org/x',
    'http://gateway', `${'local'}host:8080`, '192.0.2.10', 'ops@example', 'aibox-12ab'];
  for (const leak of leaks) {
    const data = fixture();
    data.caveats = [`See ${leak} for details.`];
    assert.throws(() => validateDevBoard(data), error => /Private string at data\.caveats\[0\]/.test(error.message) && !error.message.includes(leak), leak);
  }
  const deep = fixture();
  deep.runs[0].settings.route.values[0].value = 'gateway 192.0.2.10';
  assert.throws(() => validateDevBoard(deep), /Private string at data\.runs\[0\]\.settings\.route\.values\[0\]\.value/);
  const key = fixture();
  key.report_summary.attempt_ledger['/mnt/x'] = 1;
  assert.throws(() => validateDevBoard(key), /Private key at data\.report_summary\.attempt_ledger/);
});

test('validation and every rendering leave the snapshot untouched', () => {
  const data = fixture();
  const before = JSON.stringify(data);
  validateDevBoard(data);
  for (const view of Object.keys(devViews(data))) for (const metric of KEYS) {
    const rows = rankDevRuns(data, view, metric);
    devTableRows(data, view, metric, { controls: 'c', selected: rows[0].key });
    card(data, rows[0].key, view, metric);
    devChart(data, view, metric, rows);
    devStatus(data, view, metric, rows);
    devOverview(data, view, metric, { controls: 'c', selected: rows[0].key });
  }
  devReportHTML(data);
  devWidget(data);
  devDataText(data);
  assert.equal(JSON.stringify(data), before);
});

/* Ranking -------------------------------------------------------------------- */
test('ties share a competition rank and keep data order', () => {
  const data = fixture();
  const ranked = (view, metric) => rankDevRuns(data, view, metric).map(row => `${row.rank}:${row.key}`);
  assert.deepEqual(ranked('all', 'perfect'), ['1:a/h2', '2:a/h1', '2:b/h1', '4:b/h2']);
  assert.deepEqual(ranked('h1', 'perfect'), ['1:a/h1', '1:b/h1']);
  assert.deepEqual(ranked('all', 'partial'), ['1:a/h1', '2:a/h2', '3:b/h1', '4:b/h2']);
  assert.deepEqual(ranked('all', 'direction'), ['1:a/h2', '2:a/h1', '3:b/h1', '3:b/h2']);
  const [first] = rankDevRuns(data);
  assert.deepEqual(Object.keys(first), ['key', 'rank', 'model', 'harness', 'run', 'index']);
  assert.equal(first.run, data.runs[1]);
  assert.deepEqual([first.model, first.harness, first.index], ['a', 'h2', 1]);
  // Float noise within the validator's tolerance never splits a tie.
  data.runs[0].metrics.perfect.score = 50.0000004;
  validateDevBoard(data);
  assert.deepEqual(ranked('all', 'perfect'), ['1:a/h2', '2:a/h1', '2:b/h1', '4:b/h2']);
});

test('each harness view filters its own runs, and unknown views or metrics throw', () => {
  const data = fixture();
  assert.deepEqual(devViews(data), { all: 'All harnesses', h1: 'Harness One', h2: 'Harness Two' });
  assert.deepEqual(Object.keys(devViews(data)), ['all', 'h1', 'h2']);
  assert.equal(rankDevRuns(data).length, 4);
  for (const harness of ['h1', 'h2']) for (const metric of KEYS) {
    const rows = rankDevRuns(data, harness, metric);
    assert.equal(rows.length, 2);
    assert.ok(rows.every(row => row.harness === harness));
    assert.ok(rows[0].run.metrics[metric].score >= rows[1].run.metrics[metric].score);
  }
  for (const [view, metric] of [['h3', 'perfect'], ['harness', 'perfect'], ['all', 'partial_replication'], ['all', 'compilation_success']]) {
    assert.throws(() => rankDevRuns(data, view, metric), /Unknown ranking/);
    assert.throws(() => devStatus(data, view, metric, []), /Unknown ranking/);
    assert.throws(() => devChart(data, view, metric, []), /Unknown ranking/);
    assert.throws(() => devOverview(data, view, metric), /Unknown ranking/);
  }
  assert.throws(() => devMatrixHTML(data, 'nope'), /Unknown ranking/);
  assert.equal(DEFAULT_DEV_VIEW, 'all');
  assert.equal(DEFAULT_DEV_METRIC, 'perfect');
  assert.ok(Object.isFrozen(DEV_METRICS));
});

/* Table rows ----------------------------------------------------------------- */
test('rows start with the board marker and only the enhanced table has buttons', () => {
  const data = fixture();
  const saved = devTableRows(data);
  assert.equal(saved.split('\n').length, 4);
  assert.ok(saved.split('\n').every(row => row.startsWith('<tr data-board="dev100-v10" ')));
  assert.doesNotMatch(saved, /<tr data-model=|<button/);
  const html = devTableRows(data, 'all', 'perfect', { controls: 'dev100-v10-card', selected: 'b/h1' });
  assert.equal(count(html, /<button type="button" class="run-toggle"/g), 4);
  assert.equal(count(html, /aria-controls="dev100-v10-card" aria-describedby="dev100-v10-card-hint"/g), 4);
  assert.deepEqual([...html.matchAll(/data-run="([^"]+)" aria-expanded="true"/g)].map(m => m[1]), ['b/h1']);
  assert.match(html, /<tr data-board="dev100-v10" class="is-selected" data-run-model="b" data-run-harness="h1">/);
  assert.equal(count(html, /class="is-selected"/g), 1);
  const [first, , , last] = html.split('\n');
  // Scores, then the ranked metric's unknowns, then scored, failed and unknown tasks and the source mix.
  assert.ok(first.endsWith('<td class="is-sorted">70.0%</td><td>50.0%</td><td>80.0%</td><td>90.0%</td><td>60.0%</td>'
    + '<td class="dev-count">0</td><td class="dev-count">10</td><td class="dev-count">0</td><td class="dev-count">0</td><td class="dev-source"><span>New</span> 10</td></tr>'));
  assert.ok(last.endsWith('<td class="dev-count">6</td><td class="dev-count">4</td><td class="dev-count">4</td><td class="dev-count">2</td>'
    + '<td class="dev-source"><span>Historical</span> 6 · <span>Inherited SDK</span> 4</td></tr>'));
  assert.match(devTableRows(data, 'all', 'partial').split('\n')[0], /<td>50\.0%<\/td><td class="is-sorted">60\.0%<\/td>/);
  assert.equal(count(html, /<td class="dev-count">/g), 16);
  // Proper nouns are left untranslated.
  assert.match(first, /<th scope="row" data-no-translate>.*Model A.*<\/th><td class="dev-harness"><span class="harness-tag harness" data-no-translate>Harness Two<\/span><\/td>/);
});

/* Evidence card -------------------------------------------------------------- */
test('null fields read Not recorded, recorded zeros stay 0 and the run date never borrows the report date', () => {
  const data = fixture();
  const missing = `<span class="run-missing">${NOT_RECORDED}</span>`;
  const b2 = card(data, 'b/h2');
  for (const label of ['Model as recorded', 'Harness version', 'Thinking setting', 'Run dates', 'Recorded budget caps']) {
    assert.equal(fact(b2, label), missing, label);
  }
  assert.equal(fact(b2, 'Route model'), `<ul class="run-card-dist"><li><code>vendor/model-b</code> · 4 <span>tasks</span></li><li>${missing} · 6 <span>tasks</span></li></ul>`);
  assert.equal(fact(b2, 'Report generated'), '<time datetime="2026-10-11">2026-10-11</time>');
  const a1 = card(data, 'a/h1');
  assert.equal(fact(a1, 'Run dates'), '<ul class="run-card-dist">'
    + '<li><time datetime="2026-10-11">2026-10-11</time> · 6 <span>tasks</span></li>'
    + '<li><time datetime="2026-10-10">2026-10-10</time> · 2 <span>tasks</span></li>'
    + `<li>${missing} · 2 <span>tasks</span></li></ul>`);
  assert.equal(fact(a1, 'Thinking setting'), `<ul class="run-card-dist"><li><span>${PROVIDER_DEFAULT}</span> · 8 <span>tasks</span></li><li>${missing} · 2 <span>tasks</span></li></ul>`);
  assert.equal(fact(a1, 'Model as recorded'), '<code>model-a-recorded</code>');
  const a2 = card(data, 'a/h2');
  assert.equal(fact(a2, 'Recorded budget caps'), '<ul class="run-card-dist"><li><span>Model calls</span> 6 · <span>Tool calls</span> 4 · '
    + `<span>Output tokens</span> ${missing} · <span>Wall time (s)</span> ${missing} · <span>Tool timeout (s)</span> 90 · 10 <span>tasks</span></li></ul>`);
  assert.equal(plainText(fact(a1, 'Recorded budget caps')), 'Model calls 6 · Tool calls 4 · Output tokens 32,768 · Wall time (s) 1,800 · Tool timeout (s) 90 · 8 tasksNot recorded · 2 tasks');
  for (const label of ['Failed', 'Unknown', 'Pending']) assert.equal(fact(a2, label), '0', label);
  assert.equal(cell(b2, 'direction', 1), '0');
  for (const key of ['a/h1', 'a/h2', 'b/h1', 'b/h2']) assert.doesNotMatch(card(data, key), /undefined|null|NaN|Invalid Date/);
  const evidence = devRunEvidence(data, selectedDevRun(data, 'all', 'perfect', 'b/h2'));
  assert.equal(evidence.modelRecorded, NOT_RECORDED);
  assert.deepEqual(evidence.harnessVersion, { values: [], notRecorded: 10 });
  assert.deepEqual(evidence.runDates, { values: [], notRecorded: 10 });
  assert.notEqual(evidence.outcomes, data.runs[3].outcomes);
  assert.deepEqual(devRunEvidence(data, selectedDevRun(data, 'all', 'perfect', 'a/h2')).budget.values[0].value,
    { model_calls: 6, tool_calls: 4, output_tokens: NOT_RECORDED, wall_seconds: NOT_RECORDED, tool_timeout_seconds: 90 });
});

test('failures and unknowns keep their attribution, and each metric keeps its own unknowns', () => {
  const data = fixture();
  const b2 = card(data, 'b/h2');
  assert.equal(plainText(fact(b2, 'Failed')), '4 (Infrastructure 3 · Billing, within infrastructure 2 · Model-attributed 0 · Unattributed 1)');
  assert.equal(plainText(fact(b2, 'Unknown')), '2 (Infrastructure 0 · Provider rejection 1 · Provider access 0 · Other provider error 0 · Deadline 0 · Unattributed 1)');
  assert.equal(plainText(fact(card(data, 'b/h1'), 'Provenance mix')), 'Offline-derived DeepAgents metric · 6 tasksInherited native SDK run · 4 tasks');
  const a2 = card(data, 'a/h2');
  assert.match(a2, /<thead><tr><th scope="col">Metric<\/th><th scope="col">True<\/th><th scope="col">False<\/th><th scope="col">Unknown or missing<\/th><th scope="col">Score<\/th><\/tr><\/thead>/);
  assert.deepEqual([0, 1, 2, 3].map(i => cell(a2, 'perfect', i)), ['7', '3', '0', '70.0%']);
  assert.deepEqual([0, 1, 2, 3].map(i => cell(a2, 'partial', i)), ['5', '3', '2', `50.0%${FLAG}`]);   // two scored tasks without the flag
  assert.match(card(data, 'a/h2', 'all', 'significance'), /<tr class="is-sorted" data-metric="significance"><th scope="row">Correct significance<\/th>/);
  assert.equal(count(a2, /class="is-sorted"/g), 1);
  assert.equal(plainText(fact(a2, 'Tasks')), '10 · Development split');
  assert.equal(fact(a2, 'Evidence status'), 'Accepted final report');
  assert.equal(fact(a2, 'Report'), `<code>fixture-campaign-report</code> · <code>sha256:${HASH.slice(0, 12)}</code>`);
});

test('the card keeps the shared evidence-card shape, notes and links', () => {
  const data = fixture();
  const html = card(data, 'a/h1', 'h1', 'partial');
  assert.ok(html.startsWith('<div class="run-card-head"><div><p class="run-card-kicker">Run evidence</p>'));
  assert.match(html, /<h3 class="run-card-title" id="dev100-v10-card-title" tabindex="-1"><span data-no-translate>Model A<\/span> <span class="run-card-config" data-no-translate>Harness One<\/span><\/h3>/);
  assert.match(html, /<span>Rank<\/span> <span class="run-card-rank">1 \/ 2<\/span> · <span>Coefficient and SE within 5%<\/span> · <span data-no-translate>Harness One<\/span>/);
  assert.match(card(data, 'a/h1'), /<span class="run-card-rank">2 \/ 4<\/span> · <span>Full replication<\/span> · <span>All harnesses<\/span>/);
  assert.match(html, /<button type="button" class="run-card-close" data-run-close>Close<\/button><\/div><div class="run-card-body"><dl class="run-card-facts">/);
  assert.ok(html.includes(`<div class="table-scroll" tabindex="0" role="region" aria-label="Run outcomes"><table class="run-card-metrics dev-card-metrics"><caption>Outcomes on the 100 development tasks</caption>`));
  assert.ok(html.includes(`</table></div><p class="scroll-hint" aria-hidden="true" hidden>${CARD_SCROLL_HINT}</p></div><ul class="run-card-notes">`));
  for (const note of [
    /not directly comparable with the 1,000-task Selected_1000 board/,
    /stay in the 100-task denominator; they are never counted as false or as successes/,
    /Unknown or missing covers failed, unknown or pending tasks plus scored tasks with no recorded value for that metric/,
    /routes, reasoning settings and budgets differ, so differences are descriptive only/,
    /Budget caps are the limits recorded with each run, not independent measurements of execution/,
    /Billing and infrastructure failures are not model-capability failures/,
  ]) assert.match(html, note);
  assert.doesNotMatch(html, /not run|never ran|did not run/i);
  for (const href of ['assets/data/dev100-v10-results.json', 'assets/data/dev100-v10-results-provenance.json', 'assets/data/dev100-v10-results.csv',
    'leaderboard.html#leaderboard-dev100-method']) assert.ok(html.includes(`<a class="text-link" href="${href}">`), href);
});

test('a dagger marks scores whose unknowns include scored tasks without a recorded value', () => {
  const data = fixture();
  const row = (metric, model, harness) => devTableRows(data, 'all', metric).split('\n').find(line => line.includes(`data-run-model="${model}" data-run-harness="${harness}"`));
  // Model A on Harness Two: every task scored, two without a partial flag.
  assert.ok(row('partial', 'a', 'h2').includes(`<td>70.0%</td><td class="is-sorted">50.0%${FLAG}</td><td>80.0%</td><td>90.0%</td><td>60.0%</td><td class="dev-count">2</td>`));
  assert.ok(!row('perfect', 'a', 'h2').includes('†'));
  // Model B on Harness Two: all six unknowns are failed or unknown tasks, so no mark.
  assert.ok(row('partial', 'b', 'h2').includes('<td class="is-sorted">30.0%</td><td>30.0%</td><td>40.0%</td><td>20.0%</td><td class="dev-count">6</td>'));
  for (const [metric, marks] of [['perfect', 0], ['partial', 1], ['coefficient_only', 0], ['direction', 0], ['significance', 1]]) {
    assert.equal(count(devTableRows(data, 'all', metric), /†/g), marks, metric);
  }
  const a2 = card(data, 'a/h2');
  assert.equal(count(a2, /†/g), 2);
  assert.equal(cell(a2, 'significance', 3), `60.0%${FLAG}`);
  assert.equal(count(card(data, 'b/h2'), /†/g), 0);
  assert.ok(devMatrixHTML(data, 'partial').includes('<span class="dev-cell-score">50.0%</span> <span class="dev-cell-counts"><span>Unknown or missing</span> 2</span>'));
});

test('a run filtered out of the view has no card', () => {
  const data = fixture();
  assert.equal(card(data, 'a/h1', 'h2'), '');
  assert.equal(card(data, 'c/h1'), '');
  assert.equal(devRunCardHTML(data, 'all', 'perfect', null, { id: 'c' }), '');
  assert.equal(selectedDevRun(data, 'h2', 'perfect', 'a/h1'), null);
  assert.equal(selectedDevRun(data, 'h1', 'perfect', 'b/h1').rank, 1);
  assert.equal(selectedDevRun(data, 'all', 'perfect', ''), null);
});

test('text from the snapshot is escaped in rows, grid, card and summary', () => {
  const data = fixture();
  data.models[0].label = 'Model <b>A</b> & "x"';
  data.models[0].recorded_name = '<script>x</script>';
  data.harnesses[0].label = 'Harness <i>One</i>';
  data.runs[0].settings.route.values[0].value = 'vendor/<img src=x>';
  data.runs[0].settings.thinking.values[0].value = 'deep & "careful" <think>';
  data.report.label = 'report <x>';
  data.dataset.label = 'Dev <set>';
  data.field_evidence.route = 'Route <em>seen</em>';
  data.caveats = ['Caveat <u>x</u>'];
  validateDevBoard(data);
  const rows = devTableRows(data, 'all', 'perfect', { controls: 'c', selected: 'a/h1' });
  const a1 = card(data, 'a/h1');
  for (const html of [rows, devMatrixHTML(data, 'perfect', { controls: 'c' }), a1, devReportHTML(data), devWidget(data)]) {
    assert.doesNotMatch(html, /<b>|<script>|<i>|<img|<think>|<x>|<set>|<em>|<u>/);
  }
  assert.match(rows, /Model &lt;b&gt;A&lt;\/b&gt; &amp; &quot;x&quot;/);
  assert.match(a1, /<code>&lt;script&gt;x&lt;\/script&gt;<\/code>/);
  assert.match(a1, /<span>deep &amp; &quot;careful&quot; &lt;think&gt;<\/span>/);
  assert.match(a1, /<code>vendor\/&lt;img src=x&gt;<\/code>/);
  // Chart labels and status lines are text the renderer sets with textContent.
  const h1 = rankDevRuns(data, 'h1');
  assert.equal(devChart(data, 'h1', 'perfect', h1).items[0].label, 'Model <b>A</b> & "x"');
  assert.equal(devStatus(data, 'h1', 'perfect', h1), 'Harness <i>One</i> · 2 entries · Full replication');
});

/* Grid, chart, status and descriptor ----------------------------------------- */
test('the overview grid gives every model and harness a selectable cell with visible numbers', () => {
  const data = fixture();
  const options = { controls: 'dev100-v10-card', selected: 'a/h2' };
  const html = devMatrixHTML(data, 'perfect', options);
  assert.ok(html.startsWith('<table class="dev-matrix" data-board="dev100-v10"><caption><span>Full replication</span> · <span>Scores (%) by model and harness</span></caption>'));
  assert.ok(html.includes('<thead><tr><th scope="col">Model</th><th scope="col" data-no-translate>Harness One</th><th scope="col" data-no-translate>Harness Two</th></tr></thead>'));
  assert.equal(count(html, /<button type="button" class="dev-cell"/g), 4);
  assert.deepEqual([...html.matchAll(/data-run="([^"]+)"/g)].map(m => m[1]), ['a/h1', 'a/h2', 'b/h1', 'b/h2']);
  assert.deepEqual([...html.matchAll(/data-run="([^"]+)" aria-expanded="true"/g)].map(m => m[1]), ['a/h2']);
  assert.equal(count(html, /aria-controls="dev100-v10-card" aria-describedby="dev100-v10-card-hint"/g), 4);
  assert.deepEqual([...html.matchAll(/data-level="(\d)"/g)].map(m => Number(m[1])), [2, 3, 2, 1]);
  assert.deepEqual([...devMatrixHTML(data, 'direction').matchAll(/data-level="(\d)"/g)].map(m => Number(m[1])), [4, 4, 2, 2]);
  assert.match(html, /<td class="is-selected" data-level="3"><button type="button" class="dev-cell" data-run="a\/h2"/);
  assert.equal(count(html, /class="is-selected"/g), 1);
  assert.ok(html.includes('<span class="visually-hidden" data-no-translate>Model B · Harness Two · </span><span class="dev-cell-score">20.0%</span> <span class="dev-cell-counts"><span>Unknown or missing</span> 6</span>'));
  assert.deepEqual([...devMatrixHTML(data, 'significance').matchAll(/<span>Unknown or missing<\/span> (\d+)/g)].map(m => Number(m[1])),
    data.runs.map(item => item.metrics.significance.unknown_or_pending));
  const saved = devMatrixHTML(data);
  assert.doesNotMatch(saved, /<button|visually-hidden" data-no-translate/);
  assert.match(saved, /<td data-level="3"><span class="dev-cell-score">70\.0%<\/span>/);
  const sparse = fixture();
  sparse.runs.pop();
  validateDevBoard(settle(sparse));
  assert.equal(count(devMatrixHTML(sparse), /<td class="dev-matrix-empty"><span aria-hidden="true">—<\/span><span class="visually-hidden">No run<\/span><\/td>/g), 1);
  assert.equal(devOverview(data, 'all', 'perfect', options), html);
  assert.equal(devOverview(data, 'h1', 'perfect', options), '');
});

test('the mountain draws one harness at a time and names the ranked metric at the summit', () => {
  const data = fixture();
  assert.equal(devChart(data, 'all', 'perfect', rankDevRuns(data)), null);
  assert.deepEqual(devChart(data, 'h1', 'direction', rankDevRuns(data, 'h1', 'direction')), {
    title: 'Harness One', metric: 'Correct sign', unit: '%', max: 100, peakLabel: '100% · Correct sign on every task',
    items: [{ rank: 1, label: 'Model A', value: 80, kind: 'internal' }, { rank: 2, label: 'Model B', value: 40, kind: 'internal' }],
  });
  assert.deepEqual(devChart(data, 'h1', 'perfect', rankDevRuns(data, 'h1')).items.map(item => item.rank), [1, 1]);
  for (const metric of KEYS) assert.ok(DEV_CARD_TEXT.includes(devChart(data, 'h2', metric, rankDevRuns(data, 'h2', metric)).peakLabel), metric);
});

test('the combined view draws one mountain card per harness; a single harness keeps one mountain', () => {
  const data = fixture();
  for (const metric of KEYS) {
    const charts = devCharts(data, 'all', metric);
    assert.deepEqual(charts.map(card => [card.key, card.series, card.title]), [['h1', 1, 'Harness One'], ['h2', 2, 'Harness Two']], metric);
    for (const card of charts) {
      const rows = rankDevRuns(data, card.key, metric);
      // The card's mountain is the single-harness mountain: same metric label, scale, ranks and recorded scores.
      assert.deepEqual(card.chart, devChart(data, card.key, metric, rows));
      assert.equal(card.chart.metric, DEV_METRICS[metric]);
      assert.deepEqual(card.chart.items.map(item => item.value), rows.map(row => row.run.metrics[metric].score));
      // The legend and the card's aria-label name the harness in the status shape language.js translates.
      assert.equal(card.legend, `${card.title} · ${rows.length} entries · ${DEV_METRICS[metric]}`);
      assert.equal(card.legend, devStatus(data, card.key, metric, rows));
    }
    for (const view of ['h1', 'h2']) assert.deepEqual(devCharts(data, view, metric), [], `${view} keeps its one mountain`);
  }
  assert.throws(() => devCharts(data, 'h9', 'perfect'), /Unknown ranking/);
  assert.throws(() => devCharts(data, 'all', 'bogus'), /Unknown ranking/);
  assert.ok(DEV_CARD_TEXT.includes(DEV_BOARD.chartsLabel));
});

test('status lines keep the shapes language.js and the page dictionary translate', async () => {
  const data = fixture();
  assert.equal(devStatus(data, 'all', 'perfect', rankDevRuns(data)), 'All harnesses · 4 entries · Full replication');
  assert.equal(devStatus(data, 'h2', 'significance', rankDevRuns(data, 'h2', 'significance')), 'Harness Two · 2 entries · Correct significance');
  const language = await readFile(new URL('language.js', root), 'utf8');
  assert.ok(language.includes('value.match(/^(.+) · (\\d+) entries · (.+)$/)'));
  assert.equal(devSavedStatus(data), 'v10 final report · 11 Oct 2026');
  // The UTC date of generated_at, whatever offset the report was written with.
  data.report.generated_at = '2026-10-12T00:35:49+08:00';
  assert.equal(devSavedStatus(data), 'v10 final report · 11 Oct 2026');
});

test('the descriptor exposes the board to the shared renderer without DOM access', () => {
  const data = fixture();
  const descriptor = devBoardDescriptor('assets/data/dev100-v10-results.json');
  assert.ok(Object.isFrozen(descriptor));
  assert.deepEqual(Object.keys(descriptor), ['id', 'source', 'validate', 'views', 'defaultView', 'metrics', 'defaultMetric', 'viewFromURL',
    'rank', 'rowsHTML', 'cardHTML', 'chart', 'charts', 'overview', 'status', 'caption', 'hint', 'failureStatus', 'chartNote', 'chartsLabel']);
  assert.equal(descriptor.id, 'dev100-v10');
  assert.equal(descriptor.source, 'assets/data/dev100-v10-results.json');
  for (const [key, value] of Object.entries({ validate: validateDevBoard, views: devViews, rank: rankDevRuns, rowsHTML: devTableRows,
    cardHTML: devRunCardHTML, chart: devChart, charts: devCharts, overview: devOverview, status: devStatus, metrics: DEV_METRICS })) assert.equal(descriptor[key], value, key);
  assert.deepEqual([descriptor.defaultView, descriptor.defaultMetric], ['all', 'perfect']);
  for (const key of ['caption', 'hint', 'failureStatus', 'chartNote', 'chartsLabel']) assert.equal(descriptor[key], DEV_BOARD[key], key);
  assert.equal(descriptor.viewFromURL('https://example.org/leaderboard.html?view=harness&dev-harness=h2#leaderboard-dev100'), 'h2');
  assert.equal(descriptor.viewFromURL('https://example.org/leaderboard.html?view=h2'), null);
  assert.deepEqual(descriptor.views(data), devViews(data));
});

/* Translation coverage ------------------------------------------------------- */
// Text nodes and translatable attributes, skipping what language.js skips.
const normalize = text => text.replace(/\s+/g, ' ').trim();
const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[entity]));
function translatable(html) {
  const out = [];
  const stack = [];
  for (const [, close, tag, attrs = '', text] of html.matchAll(/<(\/?)([a-z][\w-]*)([^>]*)>|([^<]+)/gi)) {
    if (text !== undefined) {
      if (!stack.at(-1)?.skip && normalize(text)) out.push(normalize(decode(text)));
    } else if (close) {
      const at = stack.findLastIndex(entry => entry.tag === tag);
      if (at >= 0) stack.length = at;
    } else {
      const skip = Boolean(stack.at(-1)?.skip) || /^(script|style|pre|code|textarea)$/i.test(tag) || /\sdata-no-translate\b/.test(attrs);
      if (!skip) for (const [, value] of attrs.matchAll(/\s(?:aria-label|title|alt|placeholder)="([^"]*)"/g)) out.push(normalize(decode(value)));
      if (!/^(br|hr|img|input|meta|link|wbr)$/i.test(tag)) stack.push({ tag, skip });
    }
  }
  return out;
}

test('every rendered string is a fixed board string, a listed data string or language-neutral', () => {
  const data = fixture();
  data.evidence_status = 'verified-partial-report';   // an unmapped status renders as data prose
  data.dataset.relation = 'Fixture relation sentence.';
  validateDevBoard(data);
  const html = [
    devWidget(data), devReportHTML(data), devTableRows(data, 'all', 'perfect', { controls: 'c', selected: 'a/h1' }),
    devMatrixHTML(data, 'perfect', { controls: 'c' }), devMatrixHTML(data, 'perfect'),
    ...data.runs.flatMap(item => Object.keys(devViews(data)).map(view => card(data, `${item.model}/${item.harness}`, view))),
  ].join('\n');
  const allowed = new Set([...DEV_CARD_TEXT, ...devDataText(data), CARD_SCROLL_HINT]);
  assert.deepEqual([...new Set(translatable(html))].filter(text => /[A-Za-z]/.test(text) && !allowed.has(text)), []);
  assert.deepEqual(devDataText(data), [PROVIDER_DEFAULT, 'high', 'verified-partial-report', 'Development fixture', 'Fixture relation sentence.',
    ...Object.values(data.field_evidence), 'Fixture caveat.', 'v10 final report · 11 Oct 2026']);
  assert.equal(new Set(DEV_CARD_TEXT).size, DEV_CARD_TEXT.length);
  assert.ok(Object.isFrozen(DEV_CARD_TEXT));
});

const zh = JSON.parse(await readFile(new URL('assets/i18n/leaderboard.zh.json', root), 'utf8'));
const language = await readFile(new URL('language.js', root), 'utf8');
const commonStart = language.indexOf('const common = {');
const common = new Set([...language.slice(commonStart, language.indexOf('};', commonStart)).matchAll(/'((?:[^'\\]|\\.)*)'\s*:/g)].map(m => m[1]));
const untranslated = texts => texts.filter(text => !Object.hasOwn(zh, text) && !common.has(text));
// Lane D adds the development dictionary entries; until the first one lands this reports what is missing.
const pending = Object.hasOwn(zh, DEV_BOARD.caption) ? false : `development translations not added yet (${untranslated(DEV_CARD_TEXT).length} fixed strings missing)`;

test('every fixed development string has a Chinese translation on the leaderboard page', { skip: pending }, () => {
  assert.deepEqual(untranslated(DEV_CARD_TEXT), []);
});

/* Generated page block -------------------------------------------------------- */
test('the generated widget follows the renderer contract and stays a plain table', () => {
  const data = fixture();
  const html = devWidget(data);
  assert.ok(html.startsWith('<div class="paired-board dev-board" data-dev-leaderboard>\n  <div class="paired-controls" hidden>'));
  for (const part of [
    '<select data-ranking-view aria-label="Filter harness"><option value="all">All harnesses</option><option value="h1" data-no-translate>Harness One</option><option value="h2" data-no-translate>Harness Two</option></select>',
    `<select data-ranking-metric aria-label="Ranking metric">${KEYS.map(key => `<option value="${key}">${DEV_METRICS[key]}</option>`).join('')}</select>`,
    '<figure class="mountain" data-ranking-mountain hidden><div class="mountain-canvas"></div></figure>',
    `<p class="dev-chart-note" data-chart-note hidden>${DEV_BOARD.chartNote}</p>`,
    '<div class="dev-overview" data-ranking-overview hidden></div>',
    '<p class="paired-scroll-note">Scroll the table to see all metrics →</p>',
    '<div class="table-scroll" tabindex="0" role="region" aria-label="Development results"><table class="dev-table">',
    `<caption>${DEV_BOARD.caption}</caption>`,
    '<th scope="col" data-metric="significance" aria-sort="none">Correct significance</th><th scope="col" class="dev-count">Unknown or missing (ranked metric)</th>'
      + '<th scope="col" class="dev-count">Scored</th><th scope="col" class="dev-count">Failed</th><th scope="col" class="dev-count">Unknown</th><th scope="col" class="dev-source">Source mix</th></tr></thead>',
    `<tbody>${devTableRows(data)}</tbody>`,
    '<span>Every score uses all 100 tasks; failed and unknown runs stay in the denominator.</span><a href="assets/data/dev100-v10-results.csv" download>Download development results CSV ↓</a>',
    '<p class="dev-missing-note">† Includes scored tasks with no recorded value for this metric: historical DeepAgents results recorded Full replication only.</p>',
    '<p class="paired-status visually-hidden" data-ranking-status role="status">v10 final report · 11 Oct 2026</p>',
  ]) assert.ok(html.includes(part), part);
  // Every hook the shared renderer queries appears exactly once, with one header per metric.
  for (const [hook, n] of [[/\sdata-ranking-view[\s>]/g, 1], [/\sdata-ranking-metric[\s>]/g, 1], [/\sdata-ranking-mountain[\s>]/g, 1],
    [/\sdata-chart-note[\s>]/g, 1], [/\sdata-ranking-overview[\s>]/g, 1], [/\sdata-ranking-status[\s>]/g, 1], [/class="table-scroll"/g, 1],
    [/<th scope="col" data-metric="/g, 5], [/<table\b/g, 1], [/<caption>/g, 1], [/<tbody>/g, 1]]) assert.equal(count(html, hook), n, String(hook));
  assert.deepEqual([...html.matchAll(/<th scope="col" data-metric="([^"]+)" aria-sort="([^"]+)">/g)].map(m => `${m[1]}:${m[2]}`),
    ['perfect:descending', 'partial:none', 'coefficient_only:none', 'direction:none', 'significance:none']);
  assert.doesNotMatch(html, /<button|<tr data-model=|class="paired-table"|\sid="/);
  const block = devBlock(data);
  assert.doesNotMatch(block, RETIRED);
  assert.equal(count(block, /\sid="/g), 1);
  assert.ok(block.endsWith(devReportHTML(data)));
});

test('the static report summary lists totals, attribution, sources and field evidence', () => {
  const data = fixture();
  const html = devReportHTML(data);
  assert.ok(html.startsWith('<div class="dev-report" id="leaderboard-dev100-report">\n  <h3>v10 report summary</h3>'));
  assert.equal(plainText(fact(html, 'Task slots')), '40');
  assert.equal(plainText(fact(html, 'Failed')), '5 (Infrastructure 4 · Billing, within infrastructure 3 · Model-attributed 0 · Unattributed 1)');
  assert.equal(plainText(fact(html, 'Provenance mix')), 'New native run · 18 tasksOffline-derived DeepAgents metric · 6 tasksHistorical DeepAgents metric · 8 tasksInherited native SDK run · 8 tasks');
  assert.equal(fact(html, 'Attempt ledger'), '<code>attempts</code> 46 · <code>selected</code> 40 · <code>superseded</code> 6');
  assert.equal(fact(html, 'Failure reasons'), '<code>billing_http_402</code> 3 · <code>provider_timeout</code> 1 · <code>unattributed</code> 1');
  assert.equal(fact(html, 'Acceptance'), `<span class="run-missing">${NOT_RECORDED}</span>`);
  assert.equal(fact(html, 'Dataset relation'), `<span class="run-missing">${NOT_RECORDED}</span>`);
  assert.equal(fact(html, 'Report generated'), '<time datetime="2026-10-11">2026-10-11</time>');
  assert.equal(fact(html, 'Run dates'), '<span>Fixture evidence for run_date.</span>');
  assert.match(html, /<h4>Caveats<\/h4>\n  <ul class="dev-report-caveats"><li>Fixture caveat\.<\/li><\/ul>/);
  for (const href of ['assets/data/dev100-v10-results.json', 'assets/data/dev100-v10-results-provenance.json', 'assets/data/dev100-v10-results.csv']) {
    assert.ok(html.includes(`<a class="text-link" href="${href}">`), href);
  }
  const lean = fixture();
  delete lean.report_summary.failure_reasons;
  lean.report_summary.acceptance = { status: 'accepted', reviewed: true, checks: 12, note: null, evidence: 'Stated in the delivery audit.' };
  validateDevBoard(lean);
  const leaner = devReportHTML(lean);
  assert.doesNotMatch(leaner, /Failure reasons|\n\s*\n/);
  assert.equal(fact(leaner, 'Acceptance'), '<code>status</code> <code>accepted</code> · <code>reviewed</code> <code>true</code> · <code>checks</code> 12 · '
    + `<code>note</code> <span class="run-missing">${NOT_RECORDED}</span> · <code>evidence</code> <span>Stated in the delivery audit.</span>`);
  assert.ok(devDataText(lean).includes('Stated in the delivery audit.'));
  assert.ok(!devDataText(lean).includes('accepted'));
});

test('the build replaces exactly one development marker pair and never the Selected_1000 block', () => {
  const START = '<!-- dev100-ranking:start -->';
  const END = '<!-- dev100-ranking:end -->';
  const paired = '<!-- paired-ranking:start -->\n<p>saved board</p>\n<!-- paired-ranking:end -->';
  const page = `<main>${paired}<section>${START}\nstale\n${END}</section></main>`;
  const next = replaceDevBlock(page, 'NEW');
  assert.equal(next, `<main>${paired}<section>${START}\nNEW\n${END}</section></main>`);
  assert.equal(replaceDevBlock(next, 'NEW'), next);
  for (const bad of [paired, `${START}${END}${START}${END}`, `${START} open`, `${END} ${START}`, `${START}${START}${END}`, `${START}${END}${END}`]) {
    assert.throws(() => replaceDevBlock(bad, 'NEW'), /Expected one development results marker pair/, bad);
  }
  assert.throws(() => replaceDevBlock(`${START}${paired}${END}`, 'NEW'), /enclose the Selected_1000 block/);
});

test('the build writes a validated block into a page copy and leaves invalid sources unwritten', async () => {
  const pageURL = new URL('leaderboard.html', root);
  const original = await readFile(pageURL, 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'dev100-board-'));
  try {
    const source = join(dir, 'dev100-v10-results.json');
    const page = join(dir, 'leaderboard.html');
    const data = fixture();
    await writeFile(source, JSON.stringify(data));
    const html = original.includes('<!-- dev100-ranking:start -->') ? original
      : original.replace('</main>', '<!-- dev100-ranking:start -->\n<!-- dev100-ranking:end -->\n</main>');
    await writeFile(page, html);
    await buildDevBoard({ source, page });
    const built = await readFile(page, 'utf8');
    assert.ok(built.includes(`<!-- dev100-ranking:start -->\n${devBlock(data)}\n<!-- dev100-ranking:end -->`));
    const paired = text => text.match(/<!-- paired-ranking:start -->[\s\S]*?<!-- paired-ranking:end -->/g);
    assert.deepEqual(paired(built), paired(html));
    for (const pattern of [/<tr data-model=/g, /class="paired-table"/g]) assert.equal(count(built, pattern), count(html, pattern));
    assert.doesNotMatch(built, RETIRED);
    await buildDevBoard({ source, page });
    assert.equal(await readFile(page, 'utf8'), built);
    const broken = fixture();
    broken.runs[0].outcomes.pending = 1;
    await writeFile(source, JSON.stringify(broken));
    await assert.rejects(buildDevBoard({ source, page }), /Outcomes do not sum to the denominator/);
    assert.equal(await readFile(page, 'utf8'), built);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  assert.equal(await readFile(pageURL, 'utf8'), original);
});

/* Published v10 snapshot (written by the evidence lane) ------------------------ */
const realBytes = await readFile(new URL('assets/data/dev100-v10-results.json', root)).catch(() => null);
const absent = realBytes ? false : 'assets/data/dev100-v10-results.json has not been written yet';
const real = realBytes && JSON.parse(realBytes);

test('the published v10 snapshot validates and matches its provenance hashes', { skip: absent }, async () => {
  assert.equal(validateDevBoard(real), real);
  const provenance = JSON.parse(await readFile(new URL('assets/data/dev100-v10-results-provenance.json', root), 'utf8'));
  assert.equal(provenance.sha256, sha(realBytes));
  assert.equal(provenance.csv_sha256, sha(await readFile(new URL('assets/data/dev100-v10-results.csv', root))));
});

test('the published v10 snapshot keeps the audited counts', { skip: absent }, () => {
  assert.deepEqual([real.groups, real.records, real.denominator_per_group], [56, 5600, 100]);
  assert.ok(real.runs.every(item => item.denominator === 100));
  const pick = (object, keys) => Object.fromEntries(keys.map(key => [key, object[key]]));
  assert.deepEqual(pick(real.totals, ['scored', 'perfect', 'failed', 'unknown', 'pending', 'failed_infrastructure', 'failed_billing', 'failed_model', 'failed_unattributed']),
    { scored: 3786, perfect: 2204, failed: 1502, unknown: 312, pending: 0, failed_infrastructure: 128, failed_billing: 105, failed_model: 0, failed_unattributed: 1374 });
  const metricTotals = Object.fromEntries(KEYS.map(key => [key, ['true', 'false', 'unknown_or_pending']
    .map(field => real.runs.reduce((sum, item) => sum + item.metrics[key][field], 0))]));
  assert.deepEqual(metricTotals, { perfect: [2204, 1582, 1814], partial: [2401, 1149, 2050], coefficient_only: [2770, 780, 2050],
    direction: [3429, 121, 2050], significance: [2867, 683, 2050] });
  assert.deepEqual(real.report_summary.provenance, { new_native: 3982, offline_derived_deepagents_metric: 182, historical_deepagents_metric: 236, inherited_native_sdk: 1200 });
  assert.equal(rankDevRuns(real).length, 56);
  assert.deepEqual(real.harnesses.map(item => item.label).sort(), ['Claude Agent SDK', 'DeepAgents', 'DeepSeek Harness', 'OpenAI Agents SDK']);
  for (const harness of real.harnesses) assert.equal(rankDevRuns(real, harness.id).length, 14, harness.id);
  assert.equal(real.models.length, 14);
  const grid = [...devMatrixHTML(real, 'perfect', { controls: 'x' }).matchAll(/<button type="button" class="dev-cell" data-run="([^"]+)"/g)].map(m => m[1]);
  assert.equal(grid.length, 56);
  assert.equal(new Set(grid).size, 56);
  assert.equal(devSavedStatus(real), 'v10 final report · 11 Oct 2026');
  assert.doesNotMatch(devBlock(real), RETIRED);
});

test('historical DeepAgents cells without non-perfect flags are marked, not shown as collapses', { skip: absent }, () => {
  const marked = metric => devTableRows(real, 'all', metric).split('\n').filter(line => line.includes('†'))
    .map(line => line.match(/data-run-model="([^"]+)" data-run-harness="([^"]+)"/).slice(1).join('/')).sort();
  assert.deepEqual(marked('perfect'), []);
  for (const metric of KEYS.slice(1)) {
    assert.deepEqual(marked(metric), ['deepseek-v4-pro/deepagents', 'gemini31-pro/deepagents', 'kimi-k3/deepagents', 'qwen37-max/deepagents'], metric);
  }
  const gemini = real.runs.find(item => item.model === 'gemini31-pro' && item.harness === 'deepagents');
  assert.deepEqual(gemini.metrics.partial, { true: 4, false: 6, unknown_or_pending: 90, denominator: 100, score: 4 });
  assert.equal(gemini.metrics.partial.unknown_or_pending - gemini.outcomes.failed - gemini.outcomes.unknown - gemini.outcomes.pending, 85);
  const row = devTableRows(real, 'all', 'partial').split('\n').find(line => line.includes('data-run-model="gemini31-pro" data-run-harness="deepagents"'));
  assert.ok(row.includes(`<td class="is-sorted">4.0%${FLAG}</td>`));
  assert.match(row, /†<\/span><span class="visually-hidden">[^<]+<\/span><\/td>(?:<td>[\d.]+%<\/td>){3}<td class="dev-count">90<\/td>/);
  assert.ok(!devTableRows(real, 'all', 'perfect').split('\n').find(line => line.includes('data-run-model="gemini31-pro" data-run-harness="deepagents"')).includes('†'));
  assert.ok(devMatrixHTML(real, 'partial').includes('<span class="dev-cell-score">4.0%</span> <span class="dev-cell-counts"><span>Unknown or missing</span> 90</span>'));
  const geminiCard = devRunCardHTML(real, 'all', 'partial', 'gemini31-pro/deepagents', { id: 'x' });
  assert.equal(cell(geminiCard, 'partial', 3), `4.0%${FLAG}`);
  assert.equal(cell(geminiCard, 'perfect', 3), `${gemini.metrics.perfect.score.toFixed(1)}%`);
});

test('leaderboard.html carries the saved development block generated from the snapshot', { skip: absent }, async t => {
  const html = await readFile(new URL('leaderboard.html', root), 'utf8');
  const block = html.match(/<!-- dev100-ranking:start -->([\s\S]*?)<!-- dev100-ranking:end -->/);
  if (!block) return t.skip('leaderboard.html has no development markers yet');
  if (!block[1].trim()) return t.skip('the development block has not been generated yet: run node scripts/build-dev100-board.mjs');
  const current = validateDevBoard(JSON.parse(await readFile(new URL('assets/data/dev100-current-results.json', root), 'utf8')));
  assert.equal(block[1], `\n${devBlock(current)}\n`, 'stale development block: run node scripts/build-dev100-board.mjs');
});

test('every data string the board renders has a Chinese translation on the leaderboard page', { skip: absent || pending }, () => {
  assert.deepEqual(untranslated(devDataText(real)), []);
});
