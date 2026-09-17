import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateSnapshot, rankModels, tableRows, chartLabel, METRICS } from '../leaderboard-data.js';
const root = new URL('../', import.meta.url);
const bytes = await readFile(new URL('assets/data/paired-results.json', root));
const data = JSON.parse(bytes);

test('accepted release preserves 12,000 records and its pinned checksum', async () => {
  assert.equal(validateSnapshot(data).records, 12000);
  const provenance = JSON.parse(await readFile(new URL('assets/data/paired-results-provenance.json', root)));
  assert.equal(provenance.sha256, createHash('sha256').update(bytes).digest('hex'));
});

test('each approach has its own ranking, with full and partial replication kept distinct', () => {
  const names = (arm, metric) => rankModels(data, arm, metric).map(row => row.model.id);
  assert.deepEqual(names('baseline','perfect'), ['gpt-5.6-sol','gemini-3.1-pro-preview','kimi-k3','qwen3.7-max','claude-opus-4-8','deepseek-v4-pro']);
  assert.deepEqual(names('harness','perfect'), ['gpt-5.6-sol','claude-opus-4-8','gemini-3.1-pro-preview','kimi-k3','qwen3.7-max','deepseek-v4-pro']);
  assert.deepEqual(names('harness','partial_replication'), ['gpt-5.6-sol','kimi-k3','gemini-3.1-pro-preview','claude-opus-4-8','qwen3.7-max','deepseek-v4-pro']);
  assert.equal(rankModels(data,'harness','partial_replication')[0].metrics.partial_replication.score, 69.9);
});

test('the default is one globally sorted table of all 12 model configurations', () => {
  const rows = rankModels(data);
  assert.deepEqual(rows.map(r => `${r.model.id}/${r.arm}`), [
    'gpt-5.6-sol/deepagents','claude-opus-4-8/deepagents','gemini-3.1-pro-preview/deepagents',
    'kimi-k3/deepagents','gpt-5.6-sol/baseline','qwen3.7-max/deepagents',
    'gemini-3.1-pro-preview/baseline','kimi-k3/baseline','qwen3.7-max/baseline',
    'claude-opus-4-8/baseline','deepseek-v4-pro/deepagents','deepseek-v4-pro/baseline',
  ]);
  assert.deepEqual(rows.map(r=>r.rank),Array.from({length:12},(_,i)=>i+1));
});

test('all three filters and all five metrics sort descending without mutating source data', () => {
  const before = JSON.stringify(data);
  for (const arm of ['all','baseline','harness']) for (const metric of Object.keys(METRICS)) {
    const rows=rankModels(data,arm,metric);
    assert.equal(rows.length,arm==='all'?12:6);
    if (arm!=='all') assert.ok(rows.every(row=>row.category===arm));
    for (let i=1;i<rows.length;i++) assert.ok(rows[i-1].metrics[metric].score >= rows[i].metrics[metric].score);
  }
  assert.equal(JSON.stringify(data),before);
});

test('invalid denominators, changed scores and mixed scoring profiles reject the snapshot', () => {
  for (const [key,value] of [['denominator',995],['score',69.7],['profile','local-paper-v1']]) {
    const bad=structuredClone(data);
    bad.models[0].arms.deepagents.metrics.partial_replication[key]=value;
    assert.throws(()=>validateSnapshot(bad));
  }
});

test('each page contains exactly one combined fallback table and no legacy entries', async () => {
  for (const file of ['index.html','leaderboard.html']) {
    const html=await readFile(new URL(file,root),'utf8');
    assert.ok(html.includes(tableRows(data)));
    assert.equal((html.match(/class="paired-table"/g)||[]).length,1);
    assert.equal((html.match(/<tr data-model=/g)||[]).length,12);
    assert.doesNotMatch(html,/data-ranking-panel|data-ranking-arm/);
    assert.doesNotMatch(html,/Fourteen|14 entries|GPT 4o -|32\.8%|69\.7%/);
  }
  const js=await readFile(new URL('leaderboard.js',root),'utf8');
  assert.doesNotMatch(js,/https?:|results\.csv/);
});


test('another harness joins the same ranking and generic filter without changing archive IDs', () => {
  const expanded = structuredClone(data);
  const run = structuredClone(expanded.models[0].arms.deepagents);
  run.harness = 'Test Harness <alpha>';
  expanded.models[0].arms.experimental = run;
  expanded.groups++;
  expanded.records += 1000;
  validateSnapshot(expanded);
  assert.equal(rankModels(expanded).length, 13);
  assert.equal(rankModels(expanded, 'baseline').length, 6);
  const harnessRows = rankModels(expanded, 'harness');
  assert.equal(harnessRows.length, 7);
  const row = harnessRows.find(row => row.arm === 'experimental');
  assert.equal(row.category, 'harness');
  assert.equal(chartLabel(row, 'harness'), 'GPT-5.6 Sol · Test Harness <alpha>');
  assert.match(tableRows(expanded), /Test Harness &lt;alpha&gt;/);
  assert.match(tableRows(expanded), /title="DeepAgents 0\.7\.13"/);
  assert.equal(expanded.models[0].arms.deepagents.harness, 'DeepAgents');
});

test('configuration categories follow harness metadata rather than the archive arm name', () => {
  const renamed = structuredClone(data);
  const model = renamed.models[0];
  model.arms.control = model.arms.baseline;
  delete model.arms.baseline;
  model.arms.experimental = model.arms.deepagents;
  delete model.arms.deepagents;
  validateSnapshot(renamed);
  assert.equal(rankModels(renamed, 'baseline').find(row => row.model.id === model.id).arm, 'control');
  assert.equal(rankModels(renamed, 'harness').find(row => row.model.id === model.id).arm, 'experimental');
});

test('missing harness metadata and inconsistent group totals reject the snapshot', () => {
  for (const harness of [undefined, null, '', '   ']) {
    const bad = structuredClone(data);
    bad.models[0].arms.deepagents.harness = harness;
    assert.throws(() => validateSnapshot(bad));
  }
  const bad = structuredClone(data);
  bad.groups++;
  bad.records += 1000;
  assert.throws(() => validateSnapshot(bad));
});
