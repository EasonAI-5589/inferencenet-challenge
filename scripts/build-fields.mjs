#!/usr/bin/env node
// Writes the "first fields" books of the v2 homepage (section 04) from metacase-harbor's
// metacase/summary.json: one book per field and, for each field, the list of its classes, each
// with its call number, its name and a one-line description of what it is about. On the page
// the chosen field's book stands open in the middle of the stage and its classes rise out of
// its pages as paper slips (v2/metacase.js); without the script every list is simply shown.
//   node scripts/build-fields.mjs path/to/metacase/summary.json
// The block between the fields:books markers in v2/index.html is replaced, and each class's
// Chinese name and description from the summary are written to assets/i18n/index.zh.json.
// The descriptions leave out the benchmarks a class draws on: the page says what a class asks
// of an agent, not where its tasks come from. The tablist is data-tabs="manual": metacase.js,
// not site.js's generic tabs, decides what is shown.
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
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = id => id.replace(/\./g, '-');
// Benchmark names: in parentheses (both languages), and the one that appears in a sentence.
const NAMED = [['TPC-H style economic data', 'wholesale supply-chain data'], [' TPC-H 类经济数据', '批发供应链数据']];
const describe = s => NAMED.reduce((t, [a, b]) => t.replace(a, b), s.replace(/\s*\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim());

const categories = new Map(summary.categories.map(c => [c.id, c]));
const zh = {};
const books = [], lists = [];
FIELDS.forEach((field, f) => {
  const cat = categories.get(field.id);
  if (!cat) throw new Error(`summary has no category ${field.id}`);
  // largest classes first, as in the summary's own listing
  const classes = [...cat.subcategories].sort((a, b) => b.task_count - a.task_count || a.name_en.localeCompare(b.name_en));
  const n = String(f + 1).padStart(2, '0'), open = f === 0;
  books.push(`    <button class="mc-fbook" type="button" role="tab" id="fb-tab-${field.id}" aria-controls="fb-${field.id}" aria-selected="${open}" style="--tc: ${field.color}">
      <span class="mc-art" data-art="field" data-field="${field.id}" aria-hidden="true"></span>
      <span class="mc-fbook-label">
        <small class="mono">Field ${n}</small>
        <b class="mc-fbook-title">${esc(field.name)}</b>
        <span class="mc-fbook-n"><b class="tnum">${classes.length}</b> <span>classes</span></span>
      </span>
    </button>`);
  const slips = classes.map(c => {
    const desc = describe(c.description_en);
    zh[c.name_en] = c.name_zh; zh[desc] = describe(c.description_zh);
    return `      <li class="mc-slip" id="fb-${slug(c.id)}">
        <span class="mc-call mono" data-no-translate>${esc(c.id)}</span>
        <b class="mc-slip-name">${esc(c.name_en)}</b>
        <span class="mc-slip-desc">${esc(desc)}</span>
      </li>`;
  });
  lists.push(`  <div class="mc-slips" id="fb-${field.id}" role="tabpanel" aria-labelledby="fb-tab-${field.id}" style="--tc: ${field.color}">
    <p class="mc-slips-head"><small class="mono">Field ${n}</small> <b>${esc(field.name)}</b></p>
    <ul>
${slips.join('\n')}
    </ul>
  </div>`);
});

const block = `${START} (written by scripts/build-fields.mjs from metacase-harbor metacase/summary.json, ${esc(summary.version)}) -->
<div class="mc-fieldbooks" data-fieldbooks>
  <div class="mc-bookrow" role="tablist" aria-label="Fields" data-tabs="manual">
${books.join('\n')}
  </div>
${lists.join('\n')}
</div>
${END}`;
const html = readFileSync(HTML, 'utf8'), a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < 0) throw new Error(`${HTML}: fields:books markers not found`);
writeFileSync(HTML, html.slice(0, a) + block + html.slice(b + END.length));
const dict = JSON.parse(readFileSync(ZH, 'utf8'));
Object.assign(dict, zh);
writeFileSync(ZH, JSON.stringify(dict, null, 2) + '\n');
console.log(`${HTML}: ${summary.task_count} tasks, ${summary.categories.reduce((s, c) => s + c.subcategories.length, 0)} classes; ${Object.keys(zh).length} translations`);
