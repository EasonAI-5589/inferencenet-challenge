import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateSnapshot, rankModels, tableRows, METRICS } from '../leaderboard-data.js';
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
  assert.deepEqual(names('deepagents','perfect'), ['gpt-5.6-sol','claude-opus-4-8','gemini-3.1-pro-preview','kimi-k3','qwen3.7-max','deepseek-v4-pro']);
  assert.deepEqual(names('deepagents','partial_replication'), ['gpt-5.6-sol','kimi-k3','gemini-3.1-pro-preview','claude-opus-4-8','qwen3.7-max','deepseek-v4-pro']);
  assert.equal(rankModels(data,'deepagents','partial_replication')[0].metrics.partial_replication.score, 69.9);
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
  for (const arm of ['all','baseline','deepagents']) for (const metric of Object.keys(METRICS)) {
    const rows=rankModels(data,arm,metric);
    assert.equal(rows.length,arm==='all'?12:6);
    if (arm!=='all') assert.ok(rows.every(row=>row.arm===arm));
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
