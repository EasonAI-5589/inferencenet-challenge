import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  validateDevBoard, rankDevRuns, devMatrixHTML, devRunEvidence, devRunCardHTML,
  devReportHTML, devCollectionCSV,
} from '../leaderboard-dev100-data.js';

const root = new URL('../', import.meta.url);
const baseBytes = await readFile(new URL('assets/data/dev100-v10-results.json', root));
const base = JSON.parse(baseBytes);
const supplement = JSON.parse(await readFile(new URL('assets/data/dev100-sol-responses-high.json', root), 'utf8'));
const input = () => structuredClone({ schema_version: 2, kind: 'inferencenet_dev_board_collection', base, supplements: [supplement] });
const current = () => validateDevBoard(input());
const key = 'gpt56-sol/modular_rsi_v2';

test('one v2 addition preserves the audited snapshot and all 56 historical runs', () => {
  assert.equal(createHash('sha256').update(baseBytes).digest('hex'), '148f67bfba9f64a552328acf3b68be9bef2b337e705ba63c5419457687dd13ea');
  const source = input(), before = JSON.stringify(source), data = validateDevBoard(source);
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual([data.groups, data.records, data.harnesses.length], [57, 5700, 5]);
  assert.deepEqual(data.runs.slice(0, 56), base.runs);
  assert.equal(data.runs.find(run => run.model === 'gpt56-sol' && run.harness === 'deepagents').metrics.perfect.score, 65);
  assert.equal(data.runs.filter(run => run.harness === 'modular_rsi_v2').length, 1);
  assert.equal(data.runs.some(run => run.harness === 'deepagents_responses_high'), false);
  assert.equal(rankDevRuns(data).find(row => row.key === key).rank, 1);
});

test('the addition uses the same local-paper-v1 metrics, not the HF webpage interpretation', () => {
  const run = current().runs.find(run => run.harness === 'modular_rsi_v2');
  assert.deepEqual(Object.fromEntries(Object.entries(run.metrics).map(([metric, value]) => [metric, value.score])), {
    perfect: 67, partial: 70, coefficient_only: 78, direction: 95, significance: 80,
  });
  assert.deepEqual([run.outcomes.scored, run.outcomes.failed, run.outcomes.unknown], [98, 2, 0]);
  for (const metric of Object.values(run.metrics)) {
    assert.equal(metric.denominator, 100);
    assert.equal(metric.true + metric.false + metric.unknown_or_pending, 100);
  }
});

test('tampered counts, dataset identity, profiles and duplicate cells are rejected', () => {
  const invalid = [
    [d => { d.supplements[0].runs[0].metrics.perfect.score = 68; }, /score drifts/],
    [d => { d.supplements[0].runs[0].outcomes.scored = 99; }, /Outcomes do not sum/],
    [d => { d.supplements[0].dataset.id = 'another-development-set'; }, /dataset differs/],
    [d => { d.supplements[0].dataset.selection_sha256 = 'ab'.repeat(32); }, /dataset differs/],
    [d => { d.supplements[0].metrics[1].profile = 'hf-webpage'; }, /metric definitions differ/],
    [d => { d.supplements[0].runs[0].source.protocol_sha256 = 'ab'.repeat(32); }, /source differs/],
    [d => { d.supplements.push(structuredClone(d.supplements[0])); }, /Duplicate run/],
    [d => { d.supplements[0].runs[0].harness = 'deepagents'; d.supplements[0].harnesses[0] = structuredClone(base.harnesses.find(h => h.id === 'deepagents')); }, /Duplicate run/],
  ];
  for (const [mutate, pattern] of invalid) { const data = input(); mutate(data); assert.throws(() => validateDevBoard(data), pattern); }
});

test('new run source is shown only on its own card; v10 report stays immutable', () => {
  const data = current(), rows = rankDevRuns(data);
  const evidence = devRunEvidence(data, rows.find(row => row.key === key));
  assert.equal(evidence.report.label, supplement.report.label);
  assert.equal(evidence.report.sha256, supplement.report.sha256.json.slice(0, 12));
  const historical = devRunEvidence(data, rows.find(row => row.key === 'gpt56-sol/deepagents'));
  assert.equal(historical.report.label, base.report.label);
  const card = devRunCardHTML(data, 'all', 'perfect', key, { id: 'test-card' });
  assert.match(card, /assets\/data\/dev100-sol-responses-high\.json/);
  assert.doesNotMatch(card, /assets\/data\/dev100-v10-results\.json/);
  assert.equal(devReportHTML(data), devReportHTML(base));
});

test('missing model combinations remain empty and CSV follows all 57 actual runs', () => {
  const data = current(), matrix = devMatrixHTML(data, 'perfect');
  assert.equal((matrix.match(/dev-matrix-empty/g) || []).length, 13);
  const csv = devCollectionCSV(data), lines = csv.trim().split('\n');
  assert.equal(lines.length, 58);
  assert.equal(lines.filter(line => line.includes(',modular_rsi_v2,')).length, 1);
  assert.match(lines.find(line => line.includes(',modular_rsi_v2,')), /,98,67,31,2,0,0,/);
  assert.match(lines.find(line => line.startsWith('gpt56-sol,') && line.includes(',deepagents,')), /,98,65,33,2,0,0,/);
  assert.doesNotMatch(csv, /deepagents_responses_high/);
});
