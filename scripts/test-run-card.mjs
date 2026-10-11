import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateSnapshot, rankModels, tableRows, METRICS,
  NOT_RECORDED, runKey, selectedRun, runEvidence, runCardHTML, RUN_CARD_TEXT, CARD_SCROLL_HINT,
} from '../leaderboard-data.js';

const root = new URL('../', import.meta.url);
const data = validateSnapshot(JSON.parse(await readFile(new URL('assets/data/paired-results.json', root), 'utf8')));
const row = (key, view = 'all', metric = 'perfect') => selectedRun(data, view, metric, key);
const fact = (html, label) => html.match(new RegExp(`<dt>${label}</dt><dd>([\\s\\S]*?)</dd>`))[1].replace(/<[^>]+>/g, '');
const cell = (html, metric, column) => {
  const tr = html.match(new RegExp(`<tr[^>]*data-metric="${metric}"[^>]*>([\\s\\S]*?)</tr>`))[1];
  return [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1])[column];
};

test('interactive rows use real buttons, and only the selected run is expanded', () => {
  const html = tableRows(data, 'all', 'perfect', { controls: 'run-card-1', selected: 'kimi-k3/deepagents' });
  assert.equal((html.match(/<button type="button"/g) || []).length, 12);
  assert.equal((html.match(/aria-controls="run-card-1"/g) || []).length, 12);
  const expanded = [...html.matchAll(/data-run="([^"]+)" aria-expanded="true"/g)].map(m => m[1]);
  assert.deepEqual(expanded, ['kimi-k3/deepagents']);
  assert.match(html, /<tr class="is-selected" data-model="kimi-k3" data-arm="deepagents"/);
  // The static fallback stays a plain table, so the generated pages are unchanged.
  assert.doesNotMatch(tableRows(data), /<button/);
});

test('a selection follows the filters and closes when its run is filtered out', () => {
  assert.equal(row('gpt-5.6-sol/deepagents', 'baseline'), null);
  assert.equal(row('gpt-5.6-sol/deepagents', 'harness').rank, 1);
  assert.equal(row('claude-opus-4-8/deepagents', 'harness', 'partial_replication').rank, 4);
  assert.equal(row('no-such-model/deepagents'), null);
  assert.equal(runCardHTML(data, 'baseline', 'perfect', 'gpt-5.6-sol/deepagents', { id: 'c' }), '');
  assert.equal(runKey(rankModels(data)[0]), 'gpt-5.6-sol/deepagents');
});

test('null or missing archive fields read Not recorded and are never filled with 0', () => {
  const kimi = runEvidence(data, row('kimi-k3/deepagents'));
  assert.equal(kimi.interruptions, NOT_RECORDED);       // null in the 16 Sep batch
  assert.equal(kimi.taskUnknowns, 4);
  assert.equal(kimi.harnessLabel, 'DeepAgents 0.7.13');
  assert.equal(kimi.harnessVersion, '0.7.13');
  const gpt = runEvidence(data, row('gpt-5.6-sol/deepagents'));
  assert.equal(gpt.interruptions, 10);
  assert.equal(gpt.taskUnknowns, NOT_RECORDED);         // null in the 13 Sep batch
  assert.equal(gpt.harnessLabel, 'DeepAgents');
  assert.equal(gpt.harnessVersion, NOT_RECORDED);       // no version in the label, so none is guessed
  assert.equal(gpt.summaryGenerated, '2026-09-13');

  const stripped = structuredClone(data);
  const run = stripped.models.find(m => m.id === 'kimi-k3').arms.deepagents;
  delete run.model_call_cap; delete run.generated_at; delete run.path; run.evidence_class = null;
  const html = runCardHTML(stripped, 'all', 'perfect', 'kimi-k3/deepagents', { id: 'c' });
  for (const label of ['Model call cap', 'Summary generated', 'Interruptions', 'Evidence class', 'Archive path']) {
    assert.equal(fact(html, label), NOT_RECORDED, label);
  }
  assert.doesNotMatch(html, /Invalid Date|undefined|null|NaN/);
});

test('a recorded zero stays 0 while a missing count reads Not recorded', () => {
  const html = runCardHTML(data, 'all', 'compilation_success', 'claude-opus-4-8/baseline', { id: 'c' });
  assert.equal(cell(html, 'compilation_success', 2), '0');           // unknown = 0 in the archive
  assert.equal(cell(html, 'compilation_success', 1), '533');
  assert.equal(fact(html, 'Task-level unknowns'), NOT_RECORDED);   // null in the 13 Sep batch
  assert.equal(fact(html, 'Invalid evidence'), '0');                 // a recorded zero
});

test('each metric shows its own counts and the scoring profile recorded with it', () => {
  const html = runCardHTML(data, 'all', 'perfect', 'deepseek-v4-pro/deepagents', { id: 'c' });
  assert.deepEqual([0, 1, 2].map(i => cell(html, 'perfect', i)), ['183', '169', '648']);
  assert.match(cell(html, 'perfect', 4), /local-paper-v1/);
  for (const key of Object.keys(METRICS).filter(k => k !== 'perfect')) assert.match(cell(html, key, 4), /hf-leaderboard-v1/);
  // Profiles come from the archive, not from a fixed list in the card.
  const changed = structuredClone(data);
  changed.models.find(m => m.id === 'deepseek-v4-pro').arms.deepagents.metrics.significance_level.profile = 'audit-profile-x';
  assert.match(cell(runCardHTML(changed, 'all', 'perfect', 'deepseek-v4-pro/deepagents', { id: 'c' }), 'significance_level', 4), /audit-profile-x/);
  // The ranked metric is marked in the card.
  assert.match(runCardHTML(data, 'all', 'significance_level', 'deepseek-v4-pro/deepagents', { id: 'c' }),
    /<tr class="is-sorted" data-metric="significance_level">/);
});

test('unknown is explained as counted without success, never as not run', () => {
  for (const key of ['gpt-5.6-sol/baseline', 'deepseek-v4-pro/deepagents']) {
    const html = runCardHTML(data, 'all', 'perfect', key, { id: 'c' });
    assert.match(html, /counted in the 1,000-task denominator without earning a success/);
    assert.doesNotMatch(html, /not run|never ran|did not run|未运行/i);
  }
});

test('archive text is escaped in rows and cards', () => {
  const expanded = structuredClone(data);
  const run = structuredClone(expanded.models[0].arms.deepagents);
  run.harness = 'Test Harness <alpha> & "beta"';
  run.path = 'results/<x>';
  expanded.models[0].arms.experimental = run;
  expanded.groups++; expanded.records += 1000;
  validateSnapshot(expanded);
  const key = 'gpt-5.6-sol/experimental';
  const rows = tableRows(expanded, 'harness', 'perfect', { controls: 'c', selected: key });
  const card = runCardHTML(expanded, 'harness', 'perfect', key, { id: 'c' });
  for (const html of [rows, card]) {
    assert.match(html, /Test Harness &lt;alpha&gt; &amp; &quot;beta&quot;/);
    assert.doesNotMatch(html, /<alpha>|<x>/);
  }
  assert.equal(runEvidence(expanded, selectedRun(expanded, 'harness', 'perfect', key)).harnessVersion, NOT_RECORDED);
});

test('every fixed card string has a Chinese translation on both pages that show the board', async () => {
  for (const page of ['index', 'leaderboard']) {
    const zh = JSON.parse(await readFile(new URL(`assets/i18n/${page}.zh.json`, root), 'utf8'));
    for (const text of RUN_CARD_TEXT) assert.ok(Object.hasOwn(zh, text), `${page}: ${text}`);
  }
});

test('the card table carries the shared sideways-scroll hint, hidden until it overflows', async () => {
  const html = runCardHTML(data, 'all', 'perfect', 'kimi-k3/deepagents', { id: 'c' });
  assert.match(html, new RegExp(`</table></div><p class="scroll-hint" aria-hidden="true" hidden>${CARD_SCROLL_HINT}</p>`));
  // One string for every wide table: site.js uses the same text and language.js translates it once.
  const site = await readFile(new URL('site.js', root), 'utf8');
  const language = await readFile(new URL('language.js', root), 'utf8');
  assert.ok(site.includes(`'${CARD_SCROLL_HINT}'`));
  assert.match(language, new RegExp(`'${CARD_SCROLL_HINT}': '[^']+'`));
});
