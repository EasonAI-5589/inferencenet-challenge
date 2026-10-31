#!/usr/bin/env node
// Writes the "first fields" books of the v2 homepage (section 04) from metacase-harbor's
// metacase/summary.json: one book per field, and in each book six class entries (call number,
// name and a line on what it asks of an agent), shown three to a page across an open two-page
// spread. Every book has six slots: a field with five classes ends with a summary slot (its task and
// class counts from the summary, how runs are checked, and a link into its Challenge track).
//   node scripts/build-fields.mjs path/to/metacase/summary.json
// The block between the fields:books markers in v2/index.html is replaced, and the Chinese text
// (class names and descriptions from the summary, and the summary-slot lines) is written to
// assets/i18n/index.zh.json. The descriptions leave out the benchmarks a class draws on: the page
// says what a class asks of an agent, not where its tasks come from. The tablist is
// data-tabs="manual": metacase.js, not site.js's generic tabs, decides what is shown.
import { readFileSync, writeFileSync } from 'node:fs';

const [summaryPath] = process.argv.slice(2);
if (!summaryPath) { console.error('usage: node scripts/build-fields.mjs path/to/summary.json'); process.exit(1); }
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const HTML = 'v2/index.html', ZH = 'assets/i18n/index.zh.json';
const START = '<!-- fields:books:start', END = '<!-- fields:books:end -->';
const SLOTS = 6; // three classes on the left page, three on the right

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

// A field with fewer classes than slots closes its book with a summary slot: the field's task and
// class counts from the summary, how runs are checked, and the way into its track. Nothing is
// invented: the counts come from summary.json, the link from the Challenge page's track anchors.
const CHECK_LINE = 'Every task is scored against references the agent never sees.';
const UI = { [CHECK_LINE]: '每道题都对照 Agent 看不到的参考答案评分。', 'Field summary': '领域概览' };
const FIELD_ZH = { econ: '经济', fin: '金融', soc: '社科' };
const countLine = (tasks, n) => [`${tasks} tasks · ${n} classes`, `${tasks} 道题 · ${n} 个类别`];
const enterLine = (field) => [`Enter the ${field.name} track`, `进入${FIELD_ZH[field.id]}赛道`];

const categories = new Map(summary.categories.map(c => [c.id, c]));
const zh = { ...UI };
const books = [], panels = [];
FIELDS.forEach((field, f) => {
  const cat = categories.get(field.id);
  if (!cat) throw new Error(`summary has no category ${field.id}`);
  // largest classes first, as in the summary's own listing
  const classes = [...cat.subcategories].sort((a, b) => b.task_count - a.task_count || a.name_en.localeCompare(b.name_en));
  const n = String(f + 1).padStart(2, '0'), open = f === 0, total = Math.max(SLOTS, classes.length);
  if (classes.length < SLOTS - 1) throw new Error(`${field.id}: ${classes.length} classes leave more than one empty slot`);
  books.push(`    <button class="mc-fbook" type="button" role="tab" id="fb-tab-${field.id}" aria-controls="fb-${field.id}" aria-selected="${open}" style="--tc: ${field.color}">
      <span class="mc-art" data-art="field" data-field="${field.id}" aria-hidden="true"></span>
      <span class="mc-fbook-label">
        <small class="mono">Field ${n}</small>
        <b class="mc-fbook-title">${esc(field.name)}</b>
        <span class="mc-fbook-n"><b class="tnum">${classes.length}</b> <span>classes</span></span>
      </span>
    </button>`);
  const pages = [];
  for (let i = 1; i <= total; i++) {
    const c = classes[i - 1], id = c ? `fb-${slug(c.id)}` : `fb-${field.id}-class-${i}`;
    if (c) {
      const desc = describe(c.description_en);
      zh[c.name_en] = c.name_zh; zh[desc] = describe(c.description_zh);
      pages.push(`      <li><article class="mc-page" id="${id}" aria-labelledby="${id}-name">
        <p class="mc-call mono" data-no-translate>${esc(c.id)}</p>
        <h3 class="mc-page-name" id="${id}-name">${esc(c.name_en)}</h3>
        <p class="mc-page-desc">${esc(desc)}</p>
      </article></li>`);
    } else { // the closing slot: the field in numbers, how it is checked, and the way into its track
      const [count, countZh] = countLine(cat.task_count, classes.length), [enter, enterZh] = enterLine(field);
      zh[count] = countZh; zh[enter] = enterZh;
      pages.push(`      <li><article class="mc-page is-summary" id="${id}" aria-labelledby="${id}-name">
        <p class="mc-call mono">Field summary</p>
        <h3 class="mc-page-name tnum" id="${id}-name">${esc(count)}</h3>
        <p class="mc-page-desc">${esc(CHECK_LINE)}</p>
        <a class="mc-page-go" href="challenge.html#track-${field.id}"><span>${esc(enter)}</span><span aria-hidden="true">→</span></a>
      </article></li>`);
    }
  }
  panels.push(`  <div class="mc-flip" id="fb-${field.id}" role="tabpanel" aria-labelledby="fb-tab-${field.id}" data-field="${field.id}" style="--tc: ${field.color}">
    <p class="mc-flip-head"><small class="mono">Field ${n}</small> <b>${esc(field.name)}</b></p>
    <ol class="mc-pages">
${pages.join('\n')}
    </ol>
  </div>`);
});

const block = `${START} (written by scripts/build-fields.mjs from metacase-harbor metacase/summary.json, ${esc(summary.version)}) -->
<div class="mc-fieldbooks" data-fieldbooks>
  <div class="mc-bookrow" role="tablist" aria-label="Fields" data-tabs="manual">
${books.join('\n')}
  </div>
${panels.join('\n')}
</div>
${END}`;
const html = readFileSync(HTML, 'utf8'), a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < 0) throw new Error(`${HTML}: fields:books markers not found`);
writeFileSync(HTML, html.slice(0, a) + block + html.slice(b + END.length));
const dict = JSON.parse(readFileSync(ZH, 'utf8'));
Object.assign(dict, zh);
writeFileSync(ZH, JSON.stringify(dict, null, 2) + '\n');
console.log(`${HTML}: ${summary.task_count} tasks, ${summary.categories.reduce((s, c) => s + c.subcategories.length, 0)} classes in two-page spreads of ${SLOTS} slots; ${Object.keys(zh).length} translations`);
