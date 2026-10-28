#!/usr/bin/env node
// Writes the "first fields" books of the v2 homepage (section 04) from metacase-harbor's
// metacase/summary.json: one book per field, and in each book one page per class (its call
// number, its name and a line on what it asks of an agent). Every book has at least six pages: a
// field with fewer classes is padded with pages that say, honestly, that the next class is in
// preparation (no name, code or description is invented for it). On the page the chosen field's
// book is opened in the middle of the stage and read by turning its pages (v2/metacase.js);
// without the script every book is simply a list of its pages.
//   node scripts/build-fields.mjs path/to/metacase/summary.json
// The block between the fields:books markers in v2/index.html is replaced, and the Chinese text
// (class names and descriptions from the summary, the page labels and the book's buttons) is
// written to assets/i18n/index.zh.json. The descriptions leave out the benchmarks a class draws on:
// the page says what a class asks of an agent, not where its tasks come from. The tablist is
// data-tabs="manual": metacase.js, not site.js's generic tabs, decides what is shown.
import { readFileSync, writeFileSync } from 'node:fs';

const [summaryPath] = process.argv.slice(2);
if (!summaryPath) { console.error('usage: node scripts/build-fields.mjs path/to/summary.json'); process.exit(1); }
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const HTML = 'v2/index.html', ZH = 'assets/i18n/index.zh.json';
const START = '<!-- fields:books:start', END = '<!-- fields:books:end -->';
const PAGES = 6; // every book has at least this many pages

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

// The strings of the book itself, and their Chinese.
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const PENDING_LINE = 'More classes are being added to this field.';
const UI = { 'Previous page': '上一页', 'Next page': '下一页', 'Book pages': '书页', [PENDING_LINE]: '这一领域正在陆续加入更多类别。' };
const pageOf = (i, n) => `Page ${i} of ${n}`;
const pending = k => `Class ${k} · in preparation`;
const ARROW = { '-1': 'M14.5 6.5 9 12l5.5 5.5', 1: 'M9.5 6.5 15 12l-5.5 5.5' };

const categories = new Map(summary.categories.map(c => [c.id, c]));
const zh = { ...UI };
const books = [], panels = [];
FIELDS.forEach((field, f) => {
  const cat = categories.get(field.id);
  if (!cat) throw new Error(`summary has no category ${field.id}`);
  // largest classes first, as in the summary's own listing
  const classes = [...cat.subcategories].sort((a, b) => b.task_count - a.task_count || a.name_en.localeCompare(b.name_en));
  const n = String(f + 1).padStart(2, '0'), open = f === 0, total = Math.max(PAGES, classes.length);
  books.push(`    <button class="mc-fbook" type="button" role="tab" id="fb-tab-${field.id}" aria-controls="fb-${field.id}" aria-selected="${open}" style="--tc: ${field.color}">
      <span class="mc-art" data-art="field" data-field="${field.id}" aria-hidden="true"></span>
      <span class="mc-fbook-label">
        <small class="mono">Field ${n}</small>
        <b class="mc-fbook-title">${esc(field.name)}</b>
        <span class="mc-fbook-n"><b class="tnum">${classes.length}</b> <span>classes</span></span>
      </span>
    </button>`);
  const pages = [], index = [];
  for (let i = 1; i <= total; i++) {
    const c = classes[i - 1], id = c ? `fb-${slug(c.id)}` : `fb-${field.id}-class-${i}`;
    const folio = `        <p class="mc-folio"><span class="mc-visually-hidden">${pageOf(i, total)}</span><span class="mono" aria-hidden="true" data-no-translate>${i} / ${total}</span></p>`;
    zh[pageOf(i, total)] = `第 ${i} 页，共 ${total} 页`;
    let name;
    if (c) {
      const desc = describe(c.description_en);
      zh[c.name_en] = c.name_zh; zh[desc] = describe(c.description_zh);
      name = c.name_en;
      pages.push(`      <li><article class="mc-page" id="${id}" aria-labelledby="${id}-name">
        <p class="mc-call mono" data-no-translate>${esc(c.id)}</p>
        <h3 class="mc-page-name" id="${id}-name">${esc(c.name_en)}</h3>
        <p class="mc-page-desc">${esc(desc)}</p>
${folio}
      </article></li>`);
    } else { // a class still to come: the page is left blank but for a pencilled note
      name = pending(i);
      zh[name] = `第${CN[i] ?? i}类 · 筹备中`;
      pages.push(`      <li><article class="mc-page is-pending" id="${id}" aria-labelledby="${id}-name">
        <h3 class="mc-page-name" id="${id}-name">${esc(name)}</h3>
        <p class="mc-page-desc">${esc(PENDING_LINE)}</p>
${folio}
      </article></li>`);
    }
    index.push(`        <button type="button" data-page="${i}"${c ? '' : ' class="is-pending"'} title="${esc(name)}"><span aria-hidden="true">${i}</span><span class="mc-visually-hidden">${esc(name)}</span></button>`);
  }
  const turn = (dir, label) => `      <button class="mc-flip-turn" type="button" data-turn="${dir}" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ARROW[dir]}"/></svg></button>`;
  panels.push(`  <div class="mc-flip" id="fb-${field.id}" role="tabpanel" aria-labelledby="fb-tab-${field.id}" data-field="${field.id}" style="--tc: ${field.color}">
    <p class="mc-flip-head"><small class="mono">Field ${n}</small> <b>${esc(field.name)}</b></p>
    <ol class="mc-pages">
${pages.join('\n')}
    </ol>
    <div class="mc-flip-ui" hidden>
${turn('-1', 'Previous page')}
      <div class="mc-flip-index" role="group" aria-label="Book pages">
${index.join('\n')}
      </div>
${turn(1, 'Next page')}
    </div>
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
console.log(`${HTML}: ${summary.task_count} tasks, ${summary.categories.reduce((s, c) => s + c.subcategories.length, 0)} classes in books of ${PAGES}+ pages; ${Object.keys(zh).length} translations`);
