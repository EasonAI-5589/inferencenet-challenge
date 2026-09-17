import { readFile, writeFile } from 'node:fs/promises';
import { VIEWS, METRICS, DEFAULT_METRIC, validateSnapshot, escapeHTML, tableRows } from '../leaderboard-data.js';
const root = new URL('../', import.meta.url);
const data = validateSnapshot(JSON.parse(await readFile(new URL('assets/data/paired-results.json', root), 'utf8')));
const widget = `<div class="paired-board" data-paired-leaderboard>
  <div class="paired-controls" hidden>
    <label><span>Approach</span><select data-ranking-view aria-label="Filter approach">${Object.entries(VIEWS).map(([key, label]) => `<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
    <label><span>Rank by</span><select data-ranking-metric aria-label="Ranking metric">${Object.entries(METRICS).map(([key, label]) => `<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
  </div>
  <figure class="mountain" data-ranking-mountain hidden><div class="mountain-canvas"></div></figure>
  <p class="paired-scroll-note">Scroll the table to see all metrics →</p>
  <div class="table-scroll" tabindex="0" role="region" aria-label="Leaderboard results"><table class="paired-table">
    <caption>Scores (%)</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Model</th><th scope="col">Approach</th>${Object.entries(METRICS).map(([key, label]) => `<th scope="col" data-metric="${key}" aria-sort="${key === DEFAULT_METRIC ? 'descending' : 'none'}">${label}</th>`).join('')}</tr></thead>
    <tbody>${tableRows(data)}</tbody>
  </table></div>
  <div class="paired-foot"><span>Every score uses all 1,000 tasks; failures and unknowns stay in the denominator.</span><a href="assets/data/paired-results.csv" download>Download results CSV ↓</a></div>
  <p class="paired-status visually-hidden" data-ranking-status role="status">Published results · 17 Sep 2026</p>
</div>`;
for (const file of ['index.html', 'leaderboard.html']) {
  const url = new URL(file, root);
  const html = await readFile(url, 'utf8');
  const pattern = /<!-- paired-ranking:start -->[\s\S]*?<!-- paired-ranking:end -->/g;
  if ([...html.matchAll(pattern)].length !== 1) throw new Error(`Expected one results marker in ${file}`);
  await writeFile(url, html.replace(pattern, `<!-- paired-ranking:start -->\n${widget}\n<!-- paired-ranking:end -->`));
  console.log(`Generated ${file} from the shared six-model snapshot.`);
}
