import { readFile, writeFile } from 'node:fs/promises';
import { ARMS, METRICS, DEFAULT_ARM, DEFAULT_METRIC, validateSnapshot, escapeHTML, tableRows } from '../leaderboard-data.js';
const root = new URL('../', import.meta.url);
const data = validateSnapshot(JSON.parse(await readFile(new URL('assets/data/paired-results.json', root), 'utf8')));
const widget = `<div class="paired-board" data-paired-leaderboard>
  <div class="paired-controls" hidden>
    <div class="paired-switch" role="group" aria-label="Leaderboard view">
      ${Object.entries(ARMS).map(([key, label]) => `<button type="button" data-ranking-arm="${key}" aria-pressed="${key === DEFAULT_ARM}">${label}</button>`).join('\n      ')}
    </div>
    <label><span>Rank by</span><select data-ranking-metric aria-label="Ranking metric">${Object.entries(METRICS).map(([key, label]) => `<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
  </div>
  <div class="paired-heading"><h3 data-ranking-label>Two ways to solve</h3><p>6 models · 1,000 tasks per group · 17 Sep 2026</p></div>
  <figure class="mountain" data-ranking-mountain hidden><div class="mountain-canvas"></div></figure>
  <p class="paired-scroll-note">Scroll the table to see all metrics →</p>
  ${Object.entries(ARMS).map(([arm, label]) => `<div class="paired-panel" data-ranking-panel="${arm}">
    <h4>${label}</h4><div class="table-scroll" tabindex="0" role="region" aria-label="${label} results"><table class="paired-table">
      <caption>${label} · scores over all 1,000 tasks (%)</caption>
      <thead><tr><th scope="col">#</th><th scope="col">Model</th>${Object.entries(METRICS).map(([key, label]) => `<th scope="col" data-metric="${key}" aria-sort="${key === DEFAULT_METRIC ? 'descending' : 'none'}">${label}</th>`).join('')}</tr></thead>
      <tbody>${tableRows(data, arm)}</tbody>
    </table></div>
  </div>`).join('\n')}
  <div class="paired-foot"><span>Every score uses all 1,000 tasks; failures and unknowns stay in the denominator.</span><a href="assets/data/paired-results.csv" download>Download results CSV ↓</a></div>
  <p class="paired-status" data-ranking-status role="status">Published results · 17 Sep 2026</p>
</div>`;
for (const file of ['index.html', 'leaderboard.html']) {
  const url = new URL(file, root);
  const html = await readFile(url, 'utf8');
  const pattern = /<!-- paired-ranking:start -->[\s\S]*?<!-- paired-ranking:end -->/g;
  if ([...html.matchAll(pattern)].length !== 1) throw new Error(`Expected one results marker in ${file}`);
  await writeFile(url, html.replace(pattern, `<!-- paired-ranking:start -->\n${widget}\n<!-- paired-ranking:end -->`));
  console.log(`Generated ${file} from the shared six-model snapshot.`);
}
