/* Armory: compose one agent from a model, a harness and gear, then deploy it to a Metacase track.
 * Models and measured numbers come from the site's published data files. A number appears only
 * for a model x harness pair that has a run in those files; everything else is "not yet measured".
 * English strings are translated in place by language.js (assets/i18n/armory.zh.json). */
import { mount } from './cyber-motion.js';

const root = document.querySelector('main.armory');
const STORE = 'metacase-armory-v1';
const AXES = [['plan', 'Plan'], ['code', 'Code'], ['data', 'Data'], ['search', 'Search'], ['memory', 'Memory'], ['verify', 'Verify']];
const VENDOR = {
  'gpt56-sol': 'OpenAI', 'gpt61-sol': 'OpenAI', 'gpt6-astra': 'OpenAI', 'gemini31-pro': 'Google', 'gemini38-flash': 'Google',
  'qwen37-max': 'Alibaba Qwen', 'qwen38-max': 'Alibaba Qwen', 'kimi-k3': 'Moonshot AI', 'claude-opus48': 'Anthropic',
  'claude-opus55': 'Anthropic', 'claude-fable51': 'Anthropic', 'deepseek-v4-pro': 'DeepSeek', 'deepseek-v41-flash': 'DeepSeek', 'glm53': 'Zhipu AI',
};
// Model ids of the Selected_1000 board (paired-results.json) for the same models.
const PAIRED_ID = { 'gpt56-sol': 'gpt-5.6-sol', 'claude-opus48': 'claude-opus-4-8', 'kimi-k3': 'kimi-k3', 'gemini31-pro': 'gemini-3.1-pro-preview', 'qwen37-max': 'qwen3.7-max', 'deepseek-v4-pro': 'deepseek-v4-pro' };
const HARNESSES = [
  { id: 'deepagents', name: 'DeepAgents', kind: 'Library harness', board: 'deepagents', paired: 'deepagents', axes: ['plan', 'memory'], note: 'Planning tool, virtual file system and sub-agents.' },
  { id: 'deepseek', name: 'DeepSeek Harness', kind: 'Plugin runtime', board: 'deepseek', axes: ['code'], note: 'Plugin runtime. The Dev100 composition exposes run_python as its only tool.' },
  { id: 'claude-sdk', name: 'Claude Agent SDK', kind: 'SDK harness', board: 'claude', axes: ['code', 'search', 'plan'], note: 'The Claude Code agent loop as a library, with its bundled CLI.' },
  { id: 'openai-sdk', name: 'OpenAI Agents SDK', kind: 'SDK harness', board: 'openai_agents', axes: ['plan', 'verify'], note: 'Tool calling, handoffs between agents and guardrails.' },
  { id: 'claude-code', name: 'Claude Code', kind: 'CLI harness', axes: ['code', 'search', 'plan'], note: 'Terminal agent with file editing, shell and sub-agents.' },
  { id: 'codex', name: 'Codex CLI', kind: 'CLI harness', axes: ['code'], note: 'Terminal agent with a sandboxed shell and patch editing.' },
  { id: 'opencode', name: 'OpenCode', kind: 'Server runtime', axes: ['code', 'plan'], note: 'Client and server coding agent with sub-agents.' },
  { id: 'openhands', name: 'OpenHands SDK', kind: 'Agent runtime', axes: ['code', 'search'], note: 'Agent, conversation and workspace with code execution and browsing.' },
  { id: 'terminus', name: 'Terminus-2', kind: 'Reference loop', axes: ['code'], note: 'The terminal reference agent of Harbor.' },
  { id: 'mini-swe', name: 'mini-SWE-agent', kind: 'Minimal loop', axes: ['code'], note: 'A minimal loop with bash as its only tool.' },
];
const GEAR = [
  { id: 'python', name: 'Python sandbox', kind: 'Tool', axes: ['code', 'data'], note: 'Run analysis code in an isolated container.' },
  { id: 'stata', name: 'Stata / R runtime', kind: 'Tool', axes: ['code', 'data'], note: 'Estimate with the packages used in the original papers.' },
  { id: 'sql', name: 'SQL & dbt workspace', kind: 'Tool', axes: ['data'], note: 'Query and transform relational data.' },
  { id: 'office', name: 'Spreadsheet & document I/O', kind: 'Tool', axes: ['data'], note: 'Read and write .xlsx and .docx deliverables.' },
  { id: 'web', name: 'Web search & fetch', kind: 'Tool', axes: ['search'], note: 'Find and read public sources.' },
  { id: 'memory', name: 'Case memory', kind: 'Skill', axes: ['memory'], note: 'Carry notes and lessons across steps and cases.' },
  { id: 'subagents', name: 'Sub-agents', kind: 'Skill', axes: ['plan'], note: 'Delegate parts of a case to focused helpers.' },
  { id: 'verifier', name: 'Verifier gate', kind: 'Skill', axes: ['verify'], note: 'Check outputs before submission.' },
];
const TRACK_HUE = { fin: 'var(--ar-gear)', econ: 'var(--ar-model)', soc: 'var(--ar-harness)' };
const HUE = { model: '#8debd9', harness: '#baa5ff', gear: '#f5c27e' };

if (root) init().catch(error => {
  console.warn('Armory data unavailable; the page stays readable.', error);
  const status = root.querySelector('.ar-status');
  if (status) status.textContent = 'The loadout data could not be loaded.';
});

async function init() {
  const load = name => fetch(new URL(`../assets/data/${name}`, import.meta.url)).then(response => {
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    return response.json();
  });
  const [dev, paired, taxonomy] = await Promise.all([load('dev100-v10-results.json'), load('paired-results.json'), load('metacase-taxonomy.json')]);
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value == null) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : value);
    }
    node.append(...children.filter(child => child != null));
    return node;
  };

  const runs = new Map(dev.runs.map(run => [`${run.model}|${run.harness}`, run]));
  const pairedById = new Map(paired.models.map(model => [model.id, model]));
  const models = dev.models.map(model => ({
    id: model.id, name: model.label, kind: VENDOR[model.id] || 'Model',
    boards: dev.runs.filter(run => run.model === model.id).length, paired: pairedById.get(PAIRED_ID[model.id]),
  }));
  const items = new Map([
    ...models.map(model => [`model:${model.id}`, { ...model, type: 'model' }]),
    ...HARNESSES.map(harness => [`harness:${harness.id}`, { ...harness, type: 'harness' }]),
    ...GEAR.map(gear => [`gear:${gear.id}`, { ...gear, type: 'gear' }]),
  ]);
  const categories = taxonomy.categories;

  const state = { model: null, harness: null, gear: [null, null, null, null], track: null, tab: 'model' };
  restore();

  /* Inventory ------------------------------------------------------------------------------ */
  const grid = $('#inv-panel');
  function renderInventory() {
    $$('[role="tab"]').forEach(tab => {
      const selected = tab.dataset.tab === state.tab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) grid.setAttribute('aria-labelledby', tab.id);
    });
    grid.dataset.type = state.tab;
    const list = [...items.entries()].filter(([, item]) => item.type === state.tab);
    grid.replaceChildren(...list.map(([key, item]) => {
      const equipped = isEquipped(key);
      const tags = el('span', { class: 'ar-item-tags' });
      if (item.type === 'model') {
        tags.append(el('span', { class: 'ar-tag is-measured', text: 'Dev100 · 4 harnesses' }));
        if (item.paired) tags.append(el('span', { class: 'ar-tag is-measured', text: 'Selected_1000' }));
      } else if (item.type === 'harness') {
        tags.append(item.board ? el('span', { class: 'ar-tag is-measured', text: 'Measured on Dev100' }) : el('span', { class: 'ar-tag', text: 'Not yet measured' }));
      } else {
        tags.append(...item.axes.map(axis => el('span', { class: 'ar-tag', text: AXES.find(([id]) => id === axis)[1] })));
      }
      const button = el('button', { class: `ar-item${equipped ? ' is-equipped' : ''}`, type: 'button', draggable: 'true', 'data-key': key, 'aria-pressed': String(equipped) },
        el('span', { class: 'ar-item-kind', text: item.kind }),
        el('strong', { class: 'ar-item-name', 'data-no-translate': item.type !== 'gear', text: item.name }),
        item.note ? el('span', { class: 'ar-item-note', text: item.note }) : null,
        tags);
      return el('li', {}, button);
    }));
  }
  grid.addEventListener('click', event => {
    const button = event.target.closest('.ar-item');
    if (button) equip(button.dataset.key, null, button);
  });
  grid.addEventListener('dragstart', event => {
    const button = event.target.closest('.ar-item');
    if (!button) return;
    event.dataTransfer.setData('text/plain', button.dataset.key);
    event.dataTransfer.effectAllowed = 'copy';
    root.dataset.dragging = items.get(button.dataset.key).type;
  });
  grid.addEventListener('dragend', () => { delete root.dataset.dragging; });
  $$('[role="tab"]').forEach(tab => {
    tab.addEventListener('click', () => { state.tab = tab.dataset.tab; renderInventory(); });
    tab.addEventListener('keydown', event => {
      const tabs = $$('[role="tab"]'), index = tabs.indexOf(tab);
      const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : null;
      if (next === null) return;
      event.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      state.tab = target.dataset.tab;
      renderInventory();
      target.focus();
    });
  });

  /* Slots ---------------------------------------------------------------------------------- */
  const slotType = slot => slot.startsWith('gear') ? 'gear' : slot;
  function slotValue(slot) {
    if (slot === 'model') return state.model && `model:${state.model}`;
    if (slot === 'harness') return state.harness && `harness:${state.harness}`;
    const id = state.gear[Number(slot.split('-')[1])];
    return id && `gear:${id}`;
  }
  function isEquipped(key) {
    const [type, id] = key.split(':');
    return type === 'gear' ? state.gear.includes(id) : state[type] === id;
  }
  function renderSlots() {
    $$('.ar-slot').forEach(node => {
      const key = slotValue(node.dataset.slot), item = key && items.get(key);
      node.classList.toggle('is-filled', Boolean(item));
      node.querySelector('[data-slot-name]').textContent = item ? item.name : 'Empty slot';
      node.querySelector('[data-slot-name]').toggleAttribute('data-no-translate', Boolean(item) && item.type !== 'gear');
      node.querySelector('[data-slot-sub]').textContent = item ? item.kind : '';
      node.querySelector('.ar-slot-clear').hidden = !item;
    });
  }
  $$('.ar-slot').forEach(node => {
    const slot = node.dataset.slot;
    node.querySelector('.ar-slot-open').addEventListener('click', () => {
      state.tab = slotType(slot);
      renderInventory();
      grid.querySelector('.ar-item')?.focus();
    });
    node.querySelector('.ar-slot-clear').addEventListener('click', () => {
      const key = slotValue(slot);
      if (!key) return;
      if (slot === 'model') state.model = null;
      else if (slot === 'harness') state.harness = null;
      else state.gear[Number(slot.split('-')[1])] = null;
      announce('Removed', items.get(key).name);
      update();
      node.querySelector('.ar-slot-open').focus();
    });
    node.addEventListener('dragover', event => {
      if (root.dataset.dragging === slotType(slot)) { event.preventDefault(); node.classList.add('is-target'); }
    });
    node.addEventListener('dragleave', () => node.classList.remove('is-target'));
    node.addEventListener('drop', event => {
      event.preventDefault();
      node.classList.remove('is-target');
      const key = event.dataTransfer.getData('text/plain');
      if (items.get(key)?.type === slotType(slot)) equip(key, slot, null);
    });
  });

  function equip(key, slot, source) {
    const item = items.get(key);
    if (!item) return;
    const [type, id] = key.split(':');
    if (type === 'gear') {
      if (state.gear.includes(id)) {
        state.gear[state.gear.indexOf(id)] = null;
        announce('Removed', item.name);
        update();
        return;
      }
      const index = slot ? Number(slot.split('-')[1]) : (state.gear.indexOf(null) >= 0 ? state.gear.indexOf(null) : 3);
      state.gear[index] = id;
      slot = `gear-${index}`;
    } else {
      state[type] = id;
      slot = type;
    }
    const target = root.querySelector(`.ar-slot[data-slot="${slot}"]`);
    fly(source, target, type);
    announce('Equipped', item.name);
    holo?.setHue(HUE[type]);
    holo?.pulse();
    update();
  }

  // The item card flies into its socket; the socket answers with a short pulse.
  function fly(source, target, type) {
    if (!target) return;
    target.classList.remove('is-hit');
    void target.offsetWidth;
    target.classList.add('is-hit');
    if (!source || reduced.matches || !source.animate) return;
    const from = source.getBoundingClientRect(), to = target.getBoundingClientRect();
    const ghost = source.cloneNode(true);
    ghost.classList.add('ar-ghost');
    ghost.dataset.type = type;
    ghost.removeAttribute('id');
    Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    document.body.append(ghost);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const scale = Math.min(1, to.width / from.width);
    ghost.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 0.95 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.15 },
    ], { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }).finished.finally(() => ghost.remove());
  }

  function announce(verb, name) {
    $('.ar-status').replaceChildren(el('span', { text: verb }), ' ', el('b', { text: name }));
  }

  /* Readout -------------------------------------------------------------------------------- */
  function coverage() {
    const counts = Object.fromEntries(AXES.map(([id]) => [id, 0]));
    const sources = [state.harness && items.get(`harness:${state.harness}`), ...state.gear.map(id => id && items.get(`gear:${id}`))].filter(Boolean);
    for (const source of sources) for (const axis of source.axes) counts[axis]++;
    return counts;
  }
  function renderRadar() {
    const svg = $('.ar-radar'), counts = coverage(), cx = 100, cy = 100, R = 66;
    const point = (i, r) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / AXES.length); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const ns = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs) => { const node = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v); return node; };
    const title = svg.querySelector('title');
    svg.replaceChildren(title);
    for (const ring of [1 / 3, 2 / 3, 1]) svg.append(svgEl('polygon', { class: 'ar-radar-ring', points: AXES.map((_, i) => point(i, R * ring).join(',')).join(' ') }));
    AXES.forEach(([id, label], i) => {
      const [x, y] = point(i, R), [lx, ly] = point(i, R + 18);
      svg.append(svgEl('line', { class: 'ar-radar-axis', x1: cx, y1: cy, x2: x, y2: y }));
      const text = svgEl('text', { class: `ar-radar-label${counts[id] ? ' is-on' : ''}`, x: lx, y: ly + 3, 'text-anchor': 'middle' });
      text.textContent = label;
      svg.append(text);
    });
    const shape = svgEl('polygon', { class: 'ar-radar-shape', points: AXES.map(([id], i) => point(i, R * Math.max(0.06, Math.min(3, counts[id]) / 3)).join(',')).join(' ') });
    svg.append(shape);
  }
  function metricBlock(source, label, metric, note) {
    return el('div', { class: 'ar-m-card' },
      el('div', { class: 'ar-m-head' }, el('span', { class: 'ar-m-src', 'data-no-translate': true, text: source }), el('span', { class: 'ar-m-label', text: label })),
      el('div', { class: 'ar-m-score' }, el('b', { 'data-no-translate': true, text: `${Number(metric.score).toFixed(1)}%` }), el('span', { text: 'Full replication' })),
      el('dl', {},
        el('dt', { text: 'Tasks' }), el('dd', { 'data-no-translate': true, text: String(metric.denominator) }),
        el('dt', { text: 'Fully replicated' }), el('dd', { 'data-no-translate': true, text: String(metric.true ?? metric.count) }),
        el('dt', { text: 'Unknown, kept in the denominator' }), el('dd', { 'data-no-translate': true, text: String(metric.unknown_or_pending ?? metric.unknown ?? 0) })),
      el('p', { class: 'ar-m-note', text: note }));
  }
  function renderReadout() {
    const model = state.model && items.get(`model:${state.model}`);
    const harness = state.harness && items.get(`harness:${state.harness}`);
    const gearCount = state.gear.filter(Boolean).length;
    const callsign = $('[data-ar-callsign]');
    const name = text => el('span', { 'data-no-translate': true, text });
    if (!model && !harness) callsign.replaceChildren(el('span', { text: 'Unassembled' }));
    else callsign.replaceChildren(name(model ? model.name : '\u2014'), name(' \u00d7 '),
      harness ? name(harness.name) : el('span', { text: 'Model only' }), gearCount ? name(` +${gearCount}`) : '');
    root.dataset.complete = String(Boolean(model && harness));
    renderRadar();
    const box = $('[data-ar-measured]');
    const blocks = [];
    if (model && harness?.board) {
      const run = runs.get(`${model.id}|${harness.board}`);
      if (run) blocks.push(metricBlock('Dev100 v10', 'Development set · 100 tasks', run.metrics.perfect, 'Descriptive development comparison, not a Challenge leaderboard.'));
    }
    if (model?.paired) {
      const arm = harness ? (harness.paired && model.paired.arms[harness.paired]) : model.paired.arms.baseline;
      if (arm) blocks.push(metricBlock('Selected_1000', harness ? 'Model + DeepAgents · 1,000 tasks' : 'Model only · 1,000 tasks', arm.metrics.perfect, 'local-paper-v1 profile. Not comparable with Dev100.'));
    }
    if (!model) box.replaceChildren(el('p', { class: 'ar-m-empty', text: 'Equip a model to look up measured results.' }));
    else if (blocks.length) box.replaceChildren(el('h4', { text: 'Measured for this exact pair' }), ...blocks);
    else box.replaceChildren(el('div', { class: 'ar-m-card is-unmeasured' },
      el('b', { text: 'Not yet measured' }),
      el('p', { text: 'No run of this exact model and harness appears on the site\u2019s boards. Gear never changes a number.' })));
  }

  /* Deploy --------------------------------------------------------------------------------- */
  const tracks = $('[data-ar-tracks]');
  tracks.replaceChildren(...categories.map((category, index) => el('article', { class: 'ar-track', 'data-track': category.id, style: `--track: ${TRACK_HUE[category.id] || 'var(--ar-model)'}` },
    el('div', { class: 'ar-track-inner' },
      el('span', { class: 'ar-track-index', 'data-no-translate': true, text: `0${index + 1}` }),
      el('h3', { text: category.name_en }),
      el('p', { class: 'ar-track-count' }, el('b', { 'data-no-translate': true, text: String(category.task_count) }), ' ', el('span', { text: 'tasks selected' })),
      el('ul', { class: 'ar-subs' }, ...category.subcategories.map(sub => el('li', { class: `is-${sub.status}` },
        el('span', { class: 'ar-sub-name', text: sub.name_en }),
        el('span', { class: 'ar-sub-count', 'data-no-translate': true, text: String(sub.task_count) }),
        el('span', { class: 'ar-sub-status', text: sub.status === 'ready' ? 'Ready' : sub.status === 'partial' ? 'Partial' : 'Gap' })))),
      el('button', { class: 'button ar-deploy', type: 'button', 'data-deploy': category.id }, el('span', { text: 'Deploy here' }))))));
  tracks.addEventListener('click', event => {
    const button = event.target.closest('[data-deploy]');
    if (!button) return;
    const status = $('[data-ar-deploy]');
    if (!state.model) { status.replaceChildren(el('span', { text: 'Equip a model first.' })); return; }
    state.track = button.dataset.deploy;
    update();
    const category = categories.find(c => c.id === state.track);
    status.replaceChildren(el('span', { text: 'Deployed to' }), ' ', el('b', { text: category.name_en }), '. ',
      el('span', { text: 'Saved in your loadout link. This does not submit a run.' }));
  });
  function renderTracks() {
    $$('.ar-track').forEach(node => node.classList.toggle('is-chosen', node.dataset.track === state.track));
  }

  /* Persistence ---------------------------------------------------------------------------- */
  function encode() {
    return [state.model || '', state.harness || '', state.gear.map(id => id || '').join(','), state.track || ''].join('~');
  }
  function decode(text) {
    const [model, harness, gear = '', track] = String(text || '').split('~');
    if (items.has(`model:${model}`)) state.model = model;
    if (items.has(`harness:${harness}`)) state.harness = harness;
    gear.split(',').slice(0, 4).forEach((id, i) => { state.gear[i] = items.has(`gear:${id}`) && !state.gear.includes(id) ? id : null; });
    if (categories.some(category => category.id === track)) state.track = track;
  }
  function restore() {
    const fromUrl = new URLSearchParams(location.search).get('build');
    let saved = null;
    try { saved = localStorage.getItem(STORE); } catch {}
    decode(fromUrl ?? saved);
  }
  function persist() {
    const code = encode(), url = new URL(location.href);
    if (code.replace(/[~,]/g, '')) url.searchParams.set('build', code); else url.searchParams.delete('build');
    history.replaceState(history.state, '', url);
    try { localStorage.setItem(STORE, code); } catch {}
  }
  $('[data-ar-share]').addEventListener('click', async () => {
    persist();
    let copied = false;
    try { await navigator.clipboard.writeText(location.href); copied = true; } catch {}
    $('.ar-status').replaceChildren(el('span', { text: copied ? 'Loadout link copied.' : 'Copy the address bar to share this loadout.' }));
  });
  $('[data-ar-reset]').addEventListener('click', () => {
    Object.assign(state, { model: null, harness: null, gear: [null, null, null, null], track: null });
    $('[data-ar-deploy]').replaceChildren();
    $('.ar-status').replaceChildren(el('span', { text: 'Loadout cleared.' }));
    update();
  });

  function update() {
    renderInventory();
    renderSlots();
    renderReadout();
    renderTracks();
    persist();
  }

  const holoCanvas = $('.ar-holo');
  const holo = holoCanvas ? mount(holoCanvas, { effect: 'torus', hue: HUE.model, seed: 7 }) : null;
  root.dataset.ready = 'true';
  update();
}
