#!/usr/bin/env node
// Writes the "first fields" books of the v2 homepage (section 04) from metacase-harbor's
// metacase/summary.json: one book per field, its classes as the contents, and each class's
// task description, what it tests, sources, grading, status and pending adapters.
//   node scripts/build-fields.mjs path/to/metacase/summary.json
// The block between the fields:books markers in v2/index.html is replaced, and each class's
// Chinese name and description from the summary are written to assets/i18n/index.zh.json.
// Other translations (grading labels, what a class tests, adapter notes) live in that file.
import { readFileSync, writeFileSync } from 'node:fs';

const [summaryPath] = process.argv.slice(2);
if (!summaryPath) { console.error('usage: node scripts/build-fields.mjs path/to/summary.json'); process.exit(1); }
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const HTML = 'v2/index.html', ZH = 'assets/i18n/index.zh.json';
const START = '<!-- fields:books:start', END = '<!-- fields:books:end -->';

// The fields in page order, with the names and colours the rest of the homepage uses.
const FIELDS = [
  { id: 'econ', name: 'Economics', color: 'var(--track-1)' },
  { id: 'fin', name: 'Finance', color: 'var(--track-2)' },
  { id: 'soc', name: 'Social science', color: 'var(--mc-violet)' },
];
const STATUS = {
  ready: ['Ready', 'At least five pinned, runnable public tasks.'],
  partial: ['Partial', 'Depends on restricted material or on adapters still to be generated.'],
  gap: ['To add', 'No runnable tasks yet: an adapter still has to be generated.'],
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const slug = id => id.replace(/\./g, '-');
const gradingLabel = g => ({ deterministic: 'Deterministic', llm_judge: 'LLM judge', rubric_llm_judge: 'Rubric (LLM judge)' }[g] || cap(g));
// One line for a class: deterministic, LLM-judged, rubric-graded, or a mix of these.
function evaluation(sources) {
  const kinds = new Set();
  sources.forEach(({ grading: g }) => {
    if (g.startsWith('mixed')) kinds.add('mixed');
    else { if (g.includes('deterministic')) kinds.add('det'); if (g.includes('rubric')) kinds.add('rubric'); else if (g.includes('llm')) kinds.add('llm'); }
  });
  if (kinds.has('mixed')) return 'Mixed';
  const key = ['det', 'rubric', 'llm'].filter(k => kinds.has(k)).join('+');
  return { det: 'Deterministic', llm: 'LLM judge', rubric: 'Rubric', 'det+rubric': 'Deterministic + Rubric', 'det+llm': 'Deterministic + LLM judge' }[key] || 'Mixed';
}

const categories = new Map(summary.categories.map(c => [c.id, c]));
const zh = {};
const books = [], spreads = [];
FIELDS.forEach((field, f) => {
  const cat = categories.get(field.id);
  if (!cat) throw new Error(`summary has no category ${field.id}`);
  const classes = [...cat.subcategories].sort((a, b) => b.task_count - a.task_count || a.name_en.localeCompare(b.name_en));
  const n = String(f + 1).padStart(2, '0'), open = f === 0;
  books.push(`    <button class="mc-fbook" type="button" role="tab" id="fb-tab-${field.id}" aria-controls="fb-${field.id}" aria-selected="${open}" style="--tc: ${field.color}">
      <span class="mc-fbook-edge" aria-hidden="true"></span>
      <span class="mc-fbook-cover">
        <small class="mono">Field ${n}</small>
        <b class="mc-fbook-title">${esc(field.name)}</b>
        <span class="mc-fbook-n"><b class="tnum">${cat.task_count}</b> <span>candidate records</span></span>
        <span class="mc-fbook-k"><b class="tnum">${classes.length}</b> <span>classes</span></span>
      </span>
    </button>`);
  const toc = [], entries = [];
  classes.forEach((c, k) => {
    const id = `fb-${slug(c.id)}`, on = k === 0, [statusName, statusNote] = STATUS[c.status] || [cap(c.status), ''];
    zh[c.name_en] = c.name_zh; zh[c.description_en] = c.description_zh;
    toc.push(`          <li><button type="button" role="tab" id="${id}-tab" aria-controls="${id}" aria-selected="${on}" data-status="${c.status}">
            <span class="mc-toc-name">${esc(c.name_en)}</span>
            <span class="mc-toc-bar" style="--share: ${(c.task_count / cat.task_count).toFixed(3)}" aria-hidden="true"></span>
            <b class="mc-toc-n tnum">${c.task_count}</b>
            <span class="mc-status">${statusName}</span>
          </button></li>`);
    const sources = c.sources.map(s => `<li><span class="mc-src-name" data-no-translate>${esc(s.kind === 'adapter' ? s.label.replace(/^adapter:/, '') + ' adapter' : s.label)}</span><span class="mc-src-meta">${s.kind === 'adapter' ? '<span>to generate</span>' : `<b class="tnum">${s.tasks}</b> <span>${s.tasks === 1 ? 'task' : 'tasks'}</span>`} · <span>${esc(gradingLabel(s.grading))}</span>${s.availability === 'requires_private_materials' ? ' · <span>private materials</span>' : ''}</span></li>`).join('');
    const pending = c.pending_adapters.map(a => `<li><span class="mc-src-name" data-no-translate>${esc(a.adapter)}</span><span class="mc-src-meta"><b class="tnum">${a.upstream_tasks}</b> <span>upstream tasks</span></span><span class="mc-src-note">${esc(a.note)}</span></li>`).join('');
    entries.push(`        <article class="mc-entry" id="${id}" role="tabpanel" aria-labelledby="${id}-tab" data-status="${c.status}">
          <header class="mc-entry-head"><span class="mc-call mono" data-no-translate>${esc(c.id)}</span><h4>${esc(c.name_en)}</h4><span class="mc-status">${statusName}</span></header>
          <p class="mc-entry-desc">${esc(c.description_en)}</p>
          <dl class="mc-entry-facts">
            <div><dt>Candidate tasks</dt><dd><b class="tnum">${c.task_count}</b></dd></div>
            <div><dt>What it tests</dt><dd>${esc(cap(c.capability))}</dd></div>
            <div><dt>Sources</dt><dd><ul class="mc-sources">${sources}</ul></dd></div>
            <div><dt>Evaluation</dt><dd>${evaluation(c.sources)}</dd></div>
            <div><dt>Status</dt><dd><span>${statusName}</span>: <span>${statusNote}</span></dd></div>${pending ? `
            <div><dt>Waiting on</dt><dd><ul class="mc-sources">${pending}</ul></dd></div>` : ''}
          </dl>
        </article>`);
  });
  spreads.push(`  <section class="mc-spread" id="fb-${field.id}" role="tabpanel" aria-labelledby="fb-tab-${field.id}" style="--tc: ${field.color}"${open ? '' : ' data-closed'}>
    <div class="mc-page mc-page-l">
      <header class="mc-page-head"><small class="mono">Field ${n} · Contents</small><h3>${esc(field.name)}</h3><p><b class="tnum">${cat.task_count}</b> <span>candidate records in</span> <b class="tnum">${classes.length}</b> <span>classes</span></p></header>
      <ol class="mc-toc" role="tablist" aria-label="${esc(field.name)}: classes">
${toc.join('\n')}
      </ol>
    </div>
    <div class="mc-page mc-page-r">
${entries.join('\n')}
    </div>
  </section>`);
});

const block = `${START} (written by scripts/build-fields.mjs from metacase-harbor metacase/summary.json, ${esc(summary.version)}) -->
<div class="mc-fieldbooks" data-fieldbooks>
  <div class="mc-bookrow" role="tablist" aria-label="Fields">
${books.join('\n')}
  </div>
${spreads.join('\n')}
</div>
${END}`;
const html = readFileSync(HTML, 'utf8'), a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < 0) throw new Error(`${HTML}: fields:books markers not found`);
writeFileSync(HTML, html.slice(0, a) + block + html.slice(b + END.length));
const dict = JSON.parse(readFileSync(ZH, 'utf8'));
Object.assign(dict, zh);
writeFileSync(ZH, JSON.stringify(dict, null, 2) + '\n');
console.log(`${HTML}: ${summary.task_count} candidate records, ${summary.categories.reduce((s, c) => s + c.subcategories.length, 0)} classes; ${Object.keys(zh).length} translations`);
