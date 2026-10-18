// Node checks for the two boards on leaderboard.html: the shared renderer's state
// machine and controller, failure isolation of the development source, and the
// static page contract. Real-browser interaction runs in test-dual-board.browser.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { VIEWS, METRICS, validateSnapshot, tableRows, runCardHTML, chartLabel, RUN_CARD_HINT } from '../leaderboard-data.js';
import { createBoardState, createBoardController, loadBoardData, mountBoard, selectedBoardDescriptor } from '../leaderboard-board.js';
import { devBoardDescriptor } from '../leaderboard-dev100-data.js';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const exists = file => access(new URL(file, root)).then(() => true, () => false);
const paired = validateSnapshot(JSON.parse(await read('assets/data/paired-results.json')));
const DEV_JSON = 'assets/data/dev100-v10-results.json';
const devData = await exists(DEV_JSON) ? JSON.parse(await read(DEV_JSON)) : null;
const malformed = JSON.parse(await readFile(new URL('fixtures/dev100-malformed.json', import.meta.url), 'utf8'));
const selected = selectedBoardDescriptor('assets/data/paired-results.json');
const PAGE = 'https://example.org/leaderboard.html';
const PAGES = ['index.html', 'data.html', 'agent.html', 'harness.html', 'evolution.html', 'leaderboard.html', 'teams.html'];
const TAG = '20261018-dev100-challenge';
// The Challenge series and subtrack scope share one language release tag.
const LANGUAGE_TAG = '20261018-branding-review';
const PAIRED_SHA256 = '8fac641c124d4ba956dd6dca6f8763a50d754bad0e5169552efafd139d49330b';
const pairedBlock = html => html.match(/<!-- paired-ranking:start -->[\s\S]*?<!-- paired-ranking:end -->/g);
const devBlock = html => html.slice(html.indexOf('<!-- dev100-ranking:start -->'), html.indexOf('<!-- dev100-ranking:end -->'));
const pattern = text => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/* A small stand-in with the development board's shape: views derived from the
 * data, shared ranks for ties, an overview in All and no mountain there. */
const fixture = {
  harnesses: [{ id: 'alpha', label: 'Alpha' }, { id: 'beta', label: 'Beta' }],
  runs: [
    { model: 'm1', harness: 'alpha', perfect: 40, partial: 60 },
    { model: 'm2', harness: 'alpha', perfect: 40, partial: 50 },
    { model: 'm1', harness: 'beta', perfect: 70, partial: 80 },
    { model: 'm2', harness: 'beta', perfect: 10, partial: 30 },
  ],
};
const stubViews = data => ({ all: 'All harnesses', ...Object.fromEntries(data.harnesses.map(harness => [harness.id, harness.label])) });
const stubRank = (data, view, metric) => {
  const rows = data.runs.map((run, index) => ({ key: `${run.model}/${run.harness}`, run, index }))
    .filter(row => view === 'all' || row.run.harness === view)
    .sort((a, b) => b.run[metric] - a.run[metric] || a.index - b.index);
  return rows.map(row => ({ ...row, rank: rows.findIndex(other => other.run[metric] === row.run[metric]) + 1 }));
};
const stubButton = (key, { controls, selected }) => `<button type="button" data-run="${key}" aria-expanded="${key === selected}" aria-controls="${controls}" aria-describedby="${controls}-hint">${key}</button>`;
const devStub = (overrides = {}) => ({
  id: 'dev-stub', source: 'dev-stub.json',
  validate: data => { if (!Array.isArray(data?.runs) || !data.runs.length) throw new Error('Invalid development snapshot'); return data; },
  views: stubViews, defaultView: 'all',
  metrics: { perfect: 'Full replication', partial: 'Coefficient and SE within 5%' }, defaultMetric: 'perfect',
  viewFromURL: url => url.searchParams.get('dev-harness'),
  rank: stubRank,
  rowsHTML: (data, view, metric, options) => stubRank(data, view, metric)
    .map(row => `<tr data-board="dev-stub"${row.key === options.selected ? ' class="is-selected"' : ''}><td>${row.rank}</td><th scope="row">${stubButton(row.key, options)}</th></tr>`).join('\n'),
  cardHTML: (data, view, metric, key, { id }) => stubRank(data, view, metric).some(row => row.key === key)
    ? `<h3 class="run-card-title" id="${id}-title" tabindex="-1">${key}</h3><button type="button" data-run-close>Close</button>` : '',
  chart: (data, view, metric, rows) => view === 'all' ? null
    : { title: stubViews(data)[view], metric, unit: '%', max: 100, items: rows.map(row => ({ rank: row.rank, label: row.key, value: row.run[metric] })) },
  overview: (data, view, metric, options) => view === 'all'
    ? `<table class="dev-matrix">${stubRank(data, 'all', metric).map(row => `<tr><td>${stubButton(row.key, options)}</td></tr>`).join('')}</table>` : '',
  status: (data, view, metric, rows) => `${stubViews(data)[view]} · ${rows.length} entries · ${metric}`,
  caption: 'Fixture scores (%)', hint: 'Select a fixture run.', failureStatus: 'Showing saved development results. Interactive ranking is unavailable.',
  ...overrides,
});

test('the Selected_1000 descriptor preserves archived results under its historical label', () => {
  assert.equal(selected.cardId(1), 'run-card-1');
  assert.equal(selected.hint, RUN_CARD_HINT);
  assert.equal(selected.failureStatus, 'Showing saved results for all configurations. Interactive ranking is unavailable.');
  const state = createBoardState(selected, paired, { cardId: 'run-card-1', url: PAGE });
  for (const view of Object.keys(VIEWS)) for (const metric of Object.keys(METRICS)) {
    state.setView(view);
    const model = state.setMetric(metric);
    // Rows, metrics and interaction stay unchanged; the title identifies the historical archive.
    assert.equal(model.rowsHTML, tableRows(paired, view, metric, { controls: 'run-card-1', selected: null }));
    assert.equal(model.caption, 'Scores (%)');
    assert.equal(model.status, `${VIEWS[view]} · ${model.rows.length} entries · ${METRICS[metric]}`);
    assert.equal(model.overview, '');
    // The Selected_1000 board defines no mountain cards, so it keeps its one mountain in every view.
    assert.deepEqual(model.charts, []);
    assert.deepEqual(model.chart, {
      title: view === 'all' ? 'Historical research results' : VIEWS[view], metric: METRICS[metric], unit: '%', max: 100,
      peakLabel: '100% · every task replicated',
      items: model.rows.map(row => ({ rank: row.rank, label: chartLabel(row, view), value: row.metrics[metric].score, kind: 'internal' })),
    });
  }
  state.setView('all');
  const model = state.select('kimi-k3/deepagents');
  assert.equal(model.cardHTML, runCardHTML(paired, 'all', model.metric, 'kimi-k3/deepagents', { id: 'run-card-1' }));
  assert.equal(model.rowsHTML, tableRows(paired, 'all', model.metric, { controls: 'run-card-1', selected: 'kimi-k3/deepagents' }));
  // ?view= keeps the legacy deepagents alias; anything else falls back to All.
  const viewFor = query => createBoardState(selected, paired, { url: `${PAGE}${query}` }).model.view;
  assert.deepEqual(['?view=deepagents', '?view=baseline', '?view=harness', '?view=bogus', '', '?dev-harness=deepagents'].map(viewFor),
    ['harness', 'baseline', 'harness', 'all', 'all', 'all']);
});

test('two boards keep separate state, card ids and selections', () => {
  const url = `${PAGE}?view=deepagents&dev-harness=beta`;
  const a = createBoardState(selected, paired, { cardId: 'run-card-1', url });
  const b = createBoardState(devStub(), fixture, { cardId: 'dev-stub-card', url });
  assert.deepEqual([a.model.view, b.model.view], ['harness', 'beta']);
  const snapshot = state => JSON.stringify(state.model);
  const untouched = snapshot(b);
  a.setView('all'); a.setMetric('partial_replication'); a.select('kimi-k3/deepagents');
  assert.equal(snapshot(b), untouched);
  const kept = snapshot(a);
  b.setView('all'); b.setMetric('partial'); b.select('m1/beta');
  assert.equal(snapshot(a), kept);
  assert.deepEqual([a.model.selected, b.model.selected], ['kimi-k3/deepagents', 'm1/beta']);
  // Each board names only its own card, in its rows, its overview and its card.
  assert.match(a.model.cardHTML, /id="run-card-1-title"/);
  assert.match(b.model.cardHTML, /id="dev-stub-card-title"/);
  assert.doesNotMatch(a.model.rowsHTML + a.model.cardHTML, /dev-stub-card/);
  assert.doesNotMatch(b.model.rowsHTML + b.model.overview + b.model.cardHTML, /run-card-1/);
  // The legacy ?view=deepagents never reaches a board with its own parameter.
  assert.equal(createBoardState(devStub(), fixture, { url: `${PAGE}?view=deepagents` }).model.view, 'all');
  assert.equal(createBoardState(devStub(), fixture).cardId, 'dev-stub-card');
});

test('a selection hidden by the filter closes its card on either board', () => {
  const a = createBoardState(selected, paired, { cardId: 'run-card-1' });
  a.setView('harness');
  a.select('gpt-5.6-sol/deepagents');
  assert.equal(a.setView('baseline').selected, null);
  assert.equal(a.model.cardHTML, '');
  assert.equal(a.setView('harness').selected, null);
  // A run that stays visible keeps its card, rebuilt for the new view.
  a.setView('all');
  a.select('gpt-5.6-sol/baseline');
  assert.equal(a.setView('baseline').selected, 'gpt-5.6-sol/baseline');
  assert.match(a.model.cardHTML, /run-card-1-title/);
  const b = createBoardState(devStub(), fixture, { cardId: 'dev-stub-card' });
  b.select('m1/alpha');
  assert.match(b.model.overview, /data-run="m1\/alpha" aria-expanded="true"/);
  assert.equal(b.setView('beta').selected, null);
  assert.equal(b.model.cardHTML, '');
  assert.equal(b.model.overview, '');
});

test('state transitions are all-or-nothing', () => {
  const state = createBoardState(devStub({ chart: (data, view) => { if (view === 'beta') throw new Error('bad chart'); return null; } }), fixture);
  state.select('m1/alpha');
  const before = state.model;
  assert.throws(() => state.setView('beta'), /bad chart/);
  assert.throws(() => state.setView('nope'), /Unknown ranking/);
  assert.throws(() => state.setMetric('nope'), /Unknown ranking/);
  assert.equal(state.model, before);
  // An unknown run closes the card instead of opening an empty one.
  assert.equal(state.select('m9/none').selected, null);
  assert.equal(state.model.cardHTML, '');
});

test('one controller handles toggling, Escape and focus return for both boards', () => {
  const recorder = () => {
    const calls = [];
    return {
      calls,
      render: model => calls.push(['render', model.view, model.selected]),
      select: model => calls.push(['select', model.selected]),
      openCard: () => calls.push(['openCard']),
      returnFocus: (origin, key) => calls.push(['returnFocus', origin, key]),
    };
  };
  for (const [descriptor, data, key, hiding] of [[selected, paired, 'kimi-k3/deepagents', 'baseline'], [devStub(), fixture, 'm2/alpha', 'beta']]) {
    const state = createBoardState(descriptor, data, { cardId: 'c' });
    const ui = recorder();
    const controller = createBoardController(state, ui);
    const row = { region: 'table' };
    const cell = { region: 'overview' };
    controller.activate(key, row);
    assert.deepEqual(ui.calls.splice(0), [['select', key], ['openCard']]);
    let prevented = false;
    controller.keydown({ key: 'Escape', preventDefault: () => { prevented = true; } });
    assert.ok(prevented);
    assert.deepEqual(ui.calls.splice(0), [['select', null], ['returnFocus', row, key]]);
    controller.keydown({ key: 'Enter', preventDefault: () => assert.fail('only Escape is handled') });
    assert.deepEqual(ui.calls.splice(0), []);
    // Opened from an overview cell, the focus goes back to that cell rather than the table row.
    controller.activate(key, cell);
    controller.close();
    assert.deepEqual(ui.calls.splice(0), [['select', key], ['openCard'], ['select', null], ['returnFocus', cell, key]]);
    // A second press on the open run, from either region, closes it where the focus is.
    controller.activate(key, row);
    controller.activate(key, cell);
    assert.deepEqual(ui.calls.splice(0), [['select', key], ['openCard'], ['select', null]]);
    // A filter that hides the open run closes the card and forgets its opener.
    controller.activate(key, row);
    controller.setView(hiding);
    controller.close();
    assert.deepEqual(ui.calls.splice(0), [['select', key], ['openCard'], ['render', hiding, null], ['select', null], ['returnFocus', null, null]]);
  }
});

test('a malformed development source fails only the development board', async () => {
  const respond = body => async () => ({ ok: true, json: async () => structuredClone(body) });
  const results = await Promise.allSettled([
    loadBoardData(selected, respond(paired)),
    loadBoardData(devBoardDescriptor('dev.json'), respond(malformed)),
    loadBoardData(devBoardDescriptor('dev.json'), async () => ({ ok: false, json: async () => ({}) })),
    loadBoardData(devBoardDescriptor('dev.json'), async () => { throw new TypeError('offline'); }),
  ]);
  assert.deepEqual(results.map(result => result.status), ['fulfilled', 'rejected', 'rejected', 'rejected']);
  assert.equal(results[0].value.records, 12000);
  // The failed widget keeps its saved rows and says so in its own status line.
  const widget = () => {
    const status = { textContent: 'Saved status', classes: new Set(['paired-status', 'visually-hidden']) };
    status.classList = { remove: name => status.classes.delete(name) };
    const tbody = { innerHTML: '<tr data-board="dev100-v10">saved</tr>' };
    return { status, tbody, querySelector: selector => ({ '[data-ranking-status]': status, tbody })[selector] ?? null };
  };
  const dev = devBoardDescriptor('dev.json');
  let requests = 0;
  const request = async () => { requests++; return { ok: true, json: async () => structuredClone(malformed) }; };
  const [first, second, bystander] = [widget(), widget(), widget()];
  assert.deepEqual(await Promise.all([mountBoard(first, dev, { fetch: request, url: PAGE }), mountBoard(second, dev, { fetch: request, url: PAGE })]), [false, false]);
  assert.equal(requests, 1);
  for (const { status, tbody } of [first, second]) {
    assert.equal(status.textContent, dev.failureStatus);
    assert.equal(status.classes.has('visually-hidden'), false);
    assert.equal(tbody.innerHTML, '<tr data-board="dev100-v10">saved</tr>');
  }
  assert.equal(bystander.status.textContent, 'Saved status');
  assert.notEqual(dev.failureStatus, selected.failureStatus);
});

test('leaderboard.html shows Dev100 first, then the Selected_1000 historical results, and keeps every old anchor', async () => {
  const html = await read('leaderboard.html');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  for (const id of ['leaderboard-selected-1000', 'leaderboard-dev100', 'leaderboard-dev100-method', 'rankings', 'public', 'climb', 'table', 'research', 'protocol']) {
    assert.ok(ids.includes(id), id);
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  // The on-page navigation lists the boards in section order: the development release, then historical research results.
  assert.match(html, /<nav class="board-nav" aria-label="On this page"><a href="#leaderboard-dev100">Dev100 \/ v10 development release<\/a><a href="#leaderboard-selected-1000">Selected_1000 historical research results<\/a><\/nav>/);
  const at = text => html.indexOf(text);
  const order = ['class="board-nav"', 'id="leaderboard-dev100"', '<!-- dev100-ranking:start -->', '<!-- dev100-ranking:end -->', 'id="leaderboard-dev100-method"',
    'id="leaderboard-selected-1000"', 'id="rankings"', '<!-- paired-ranking:start -->', '<!-- paired-ranking:end -->', 'id="research"', 'id="protocol"'].map(at);
  assert.ok(order.every((position, index) => position > (order[index - 1] ?? -1)), 'sections and markers in page order');
  assert.match(html, /<p class="kicker">01 \/ Dev100 · v10<\/p><h2 id="dev100-title">Dev100 \/ v10 development release<\/h2>/);
  assert.match(html, /<p class="kicker">02 \/ Selected_1000<\/p><h2 id="rankings-title">Historical research results · 1,000 tasks<\/h2>/);
  assert.match(html, /<p class="kicker">03 \/ Research<\/p>/);
  // The replication subtrack reuses Dev100; historical archives keep their original scope.
  assert.match(html, /The econometric replication subtrack will open-source the existing Dev100 set of 100 tasks\./);
  assert.match(html, /The subtrack data package, official rules, submission channel and dates have not been published\./);
  assert.match(html, /historical development results for 14 models × 4 harnesses; it is not an official Challenge ranking\./);
  assert.doesNotMatch(html, /final target|harness study|diagnostic study/i);
  // The report entry and the files it names are public artifacts on this page, never server paths.
  for (const href of ['#leaderboard-dev100-report', 'assets/data/dev100-v10-results.json', 'assets/data/dev100-v10-results-provenance.json', 'assets/data/dev100-v10-results.csv']) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
  assert.match(html, /Report generated <time datetime="2026-10-11T16:35:49Z">11 Oct 2026<\/time>/);
});

test('exactly one development marker pair, only on leaderboard.html', async () => {
  const html = await read('leaderboard.html');
  assert.equal(html.split('<!-- dev100-ranking:start -->').length, 2);
  assert.equal(html.split('<!-- dev100-ranking:end -->').length, 2);
  assert.doesNotMatch(devBlock(html), /paired-ranking:/);
  for (const page of PAGES.filter(name => name !== 'leaderboard.html')) assert.doesNotMatch(await read(page), /dev100-ranking:|data-dev-leaderboard/, page);
});

test('the Selected_1000 block is byte-identical on both pages', async () => {
  for (const page of ['index.html', 'leaderboard.html']) {
    const blocks = pairedBlock(await read(page));
    assert.equal(blocks.length, 1, page);
    assert.equal(createHash('sha256').update(blocks[0]).digest('hex'), PAIRED_SHA256, page);
  }
});

test('the development module loads only on leaderboard.html, with the release tags', async () => {
  const script = `<script type="module" src="leaderboard-dev100.js?v=${TAG}"></script>`;
  for (const page of PAGES) {
    const html = await read(page);
    if (page === 'leaderboard.html') assert.equal(html.split(script).length, 2);
    else assert.doesNotMatch(html, /leaderboard-dev100(?:-data)?\.js/, page);
  }
  for (const page of ['index.html', 'leaderboard.html']) {
    const html = await read(page);
    for (const asset of ['leaderboard.js', 'leaderboard.css']) assert.match(html, new RegExp(`"${pattern(asset)}\\?v=${TAG}"`), `${page}: ${asset}`);
    const languageTag = page === 'index.html' ? '20261018-guided-replay' : LANGUAGE_TAG;
    assert.match(html, new RegExp(`"language\\.js\\?v=${languageTag}"`), `${page}: language.js`);
  }
  assert.match(await read('data.html'), new RegExp(`"language\\.js\\?v=${LANGUAGE_TAG}"`));
  assert.match(await read('leaderboard.html'), new RegExp(`"site\\.js\\?v=${TAG}"`));
});

test('home keeps its single board and links the development release', async () => {
  const html = await read('index.html');
  assert.equal((html.match(/data-paired-leaderboard/g) || []).length, 1);
  assert.ok(html.includes('href="leaderboard.html#leaderboard-dev100"'));
  assert.match(html, /<time datetime="2026-10-11T16:35:49Z">11 Oct 2026<\/time><p><strong>Dev100 development release\.<\/strong> The v10 report on Dev100, the 100-task development set, [^<]*was generated on this date/);
  assert.match(html, /<span>The econometric replication subtrack will open-source the existing Dev100 set of 100 tasks\.<\/span> <a class="text-link" href="leaderboard\.html#leaderboard-dev100">Dev100 \/ v10 development release: /);
  assert.doesNotMatch(html, /harness study|development diagnostics|Separate development study/);
});

test('board modules stay local and share one renderer instance', async () => {
  const [entry, dev, board] = await Promise.all(['leaderboard.js', 'leaderboard-dev100.js', 'leaderboard-board.js'].map(read));
  for (const source of [entry, dev, board]) assert.doesNotMatch(source, /https?:|results\.csv/);
  // One specifier means one module instance, so both boards share mountain.js's id counter.
  for (const source of [entry, dev]) assert.match(source, new RegExp(`from '\\./leaderboard-board\\.js\\?v=${TAG}'`));
  assert.match(board, /from '\.\/mountain\.js';/);
  assert.match(board, /from '\.\/leaderboard-data\.js\?v=20261011-release';/);
  // Mountain cards exist only for a descriptor that draws them, as one labelled group of figures.
  assert.match(board, /const cards = descriptor\.charts \? mountainCards\(figure, descriptor\.chartsLabel\) : null;/);
  assert.match(board, /group\.setAttribute\('role', 'group'\);\n\s*if \(label\) group\.setAttribute\('aria-label', label\);/);
  assert.match(board, /card\.setAttribute\('aria-label', legend\);/);
  assert.match(board, /mountain\(cards\[index\], chart, CARD_OPTIONS\)/);
  assert.match(dev, /devBoardDescriptor\(new URL\('\.\/assets\/data\/dev100-v10-results\.json\?v=20261012-dual-board', import\.meta\.url\)\)/);
  assert.match(entry, /selectedBoardDescriptor\(new URL\('\.\/assets\/data\/paired-results\.json\?v=20260917-harness', import\.meta\.url\)\)/);
  // Escape and the close button reach the same controller on every board.
  assert.match(board, /card\.addEventListener\('keydown', event => controller\.keydown\(event\)\)/);
  assert.match(board, /card\.addEventListener\('click', event => \{ if \(event\.target\.closest\('\[data-run-close\]'\)\) controller\.close\(\); \}\)/);
});

// Selectors the renderer queries, matched against the markup each widget provides.
const HOOKS = ['[data-ranking-status]', '.paired-controls', '[data-ranking-view]', '[data-ranking-metric]', '[data-ranking-mountain]', '.table-scroll', '[data-chart-note]', '[data-ranking-overview]'];
const OPTIONAL = new Set(['[data-chart-note]', '[data-ranking-overview]']);
const hookCount = (markup, hook) => (markup.match(hook.startsWith('.')
  ? new RegExp(`class="(?:[^"]* )?${pattern(hook.slice(1))}(?: [^"]*)?"`, 'g')
  : new RegExp(`\\s${pattern(hook.slice(1, -1))}(?=[\\s>=])`, 'g')) || []).length;

test('renderer hooks match the Selected_1000 block and the development widget template', async () => {
  const board = await read('leaderboard-board.js');
  for (const hook of HOOKS) assert.ok(board.includes(`'${hook}'`), `renderer queries ${hook}`);
  const block = pairedBlock(await read('leaderboard.html'))[0];
  for (const hook of HOOKS) assert.equal(hookCount(block, hook), OPTIONAL.has(hook) ? 0 : 1, `Selected_1000 block: ${hook}`);
  const template = await read('scripts/build-dev100-board.mjs');
  for (const hook of HOOKS) assert.equal(hookCount(template, hook), 1, `build-dev100-board.mjs: ${hook}`);
});

test('the generated development block carries each renderer hook once', async t => {
  const block = devBlock(await read('leaderboard.html'));
  if (!block.includes('data-dev-leaderboard')) return t.skip('dev100-ranking block not generated yet');
  assert.equal(hookCount(block, '[data-dev-leaderboard]'), 1);
  for (const hook of HOOKS) assert.equal(hookCount(block, hook), 1, hook);
  assert.match(block, /id="leaderboard-dev100-report"/);
  assert.equal((block.match(/class="paired-table"|<tr data-model=/g) || []).length, 0);
});

test('the real development descriptor drives the shared state', { skip: !devData && 'dev100-v10-results.json not generated yet' }, () => {
  const dev = devBoardDescriptor('dev.json');
  const data = dev.validate(structuredClone(devData));
  const state = createBoardState(dev, data, { cardId: 'dev100-v10-card', url: `${PAGE}?view=deepagents` });
  assert.equal(state.model.view, 'all', 'the legacy Selected_1000 parameter never reaches this board');
  const harness = data.harnesses[1].id;
  assert.equal(createBoardState(dev, data, { url: `${PAGE}?dev-harness=${harness}` }).model.view, harness);
  // All: every run in the table and the same runs as overview cells; no mountain.
  const keys = state.model.rows.map(row => row.key);
  assert.equal(new Set(keys).size, data.groups);
  const cells = [...state.model.overview.matchAll(/class="dev-cell" data-run="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual([...cells].sort(), [...keys].sort());
  assert.equal(state.model.chart, null);
  assert.doesNotMatch(state.model.rowsHTML, /<tr data-model=/);
  // All: one mountain card per harness, each with that harness's models under the active metric.
  for (const metric of Object.keys(dev.metrics)) {
    const charts = state.setMetric(metric).charts;
    assert.deepEqual(charts.map(card => card.key), data.harnesses.map(harness => harness.id), metric);
    for (const card of charts) {
      const runs = data.runs.filter(run => run.harness === card.key);
      assert.equal(card.title, data.harnesses.find(harness => harness.id === card.key).label);
      assert.equal(card.chart.metric, dev.metrics[metric]);
      assert.equal(card.chart.items.length, runs.length);
      assert.deepEqual(card.chart.items.map(item => item.value).sort((a, b) => a - b), runs.map(run => run.metrics[metric].score).sort((a, b) => a - b));
      assert.equal(card.legend, `${card.title} · ${runs.length} entries · ${dev.metrics[metric]}`);
    }
  }
  state.setMetric(dev.defaultMetric);
  // One harness: its runs, a mountain with one climber each, no cards and no overview.
  for (const { id } of data.harnesses) {
    const model = state.setView(id);
    assert.ok(model.rows.length > 0 && model.rows.every(row => row.harness === id));
    assert.equal(model.chart.items.length, model.rows.length);
    assert.deepEqual(model.charts, []);
    assert.equal(model.overview, '');
  }
  // One selection, marked in both regions, with one card.
  state.setView('all');
  const model = state.select(keys[0]);
  const expanded = new RegExp(`data-run="${pattern(keys[0])}" aria-expanded="true"`);
  assert.match(model.rowsHTML, expanded);
  assert.match(model.overview, expanded);
  assert.equal((model.rowsHTML.match(/aria-expanded="true"/g) || []).length, 1);
  assert.equal((model.overview.match(/aria-expanded="true"/g) || []).length, 1);
  assert.match(model.cardHTML, /id="dev100-v10-card-title"/);
});

test('a drifted copy of the real development data fails validation', { skip: !devData && 'dev100-v10-results.json not generated yet' }, async () => {
  const drifted = structuredClone(devData);
  drifted.runs[0].metrics.perfect.score += 1;
  await assert.rejects(loadBoardData(devBoardDescriptor('dev.json'), async () => ({ ok: true, json: async () => drifted })));
});

/* Every English string this lane added to the two pages needs a translation in
 * that page's dictionary or the shared one in language.js. The development
 * widget's own strings are covered by test-dev100.mjs. */
const textNodes = html => html.replace(/<!--[\s\S]*?-->/g, '').split(/<[^>]+>/)
  .map(text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim())
  .filter(text => /[A-Za-z]/.test(text));
// The markup strictly after `from` (which ends a tag) and before `to`.
const between = (html, from, to) => {
  const start = html.indexOf(from);
  const end = html.indexOf(to, start + from.length);
  assert.ok(start >= 0 && end > start, `${from} … ${to}`);
  return html.slice(start + from.length, end);
};
// The content of the nearest <tag> that contains `marker`.
const enclosing = (html, marker, tag) => {
  const at = html.indexOf(marker);
  assert.ok(at >= 0, marker);
  const start = html.lastIndexOf(`<${tag}`, at);
  return html.slice(html.indexOf('>', start) + 1, html.indexOf(`</${tag}>`, at));
};

test('every page string added for the two boards has a Chinese translation', async () => {
  const language = await read('language.js');
  const common = new Set([...language.slice(language.indexOf('const common = {'), language.indexOf('};')).matchAll(/'((?:[^'\\]|\\.)*)':/g)].map(match => match[1]));
  const lb = await read('leaderboard.html');
  const home = await read('index.html');
  const added = {
    leaderboard: [
      between(lb, '<section class="page-hero container" aria-labelledby="page-title">', '</section>'),
      between(lb, 'aria-labelledby="rankings-title">', '<!-- paired-ranking:start -->'),
      between(lb, 'aria-labelledby="dev100-title">', '<!-- dev100-ranking:start -->'),
      between(lb, '<!-- dev100-ranking:end -->', '<section class="section container ruled board-section" id="leaderboard-selected-1000"'),
      between(lb, '<!-- paired-ranking:end -->', '<section class="section container ruled" id="research"'),
      between(lb, '<span id="protocol"></span>', '</h2>'),
    ].flatMap(textNodes),
    index: [enclosing(home, 'datetime="2026-10-11T16:35:49Z"', 'li'), enclosing(home, 'The econometric replication subtrack will open-source the existing Dev100 set of 100 tasks.', 'p')].flatMap(textNodes),
  };
  const missing = {};
  for (const [page, strings] of Object.entries(added)) {
    const zh = JSON.parse(await read(`assets/i18n/${page}.zh.json`));
    missing[page] = [...new Set(strings)].filter(text => !Object.hasOwn(zh, text) && !common.has(text));
  }
  assert.deepEqual(missing, { leaderboard: [], index: [] });
});
