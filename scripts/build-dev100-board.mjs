// Writes the saved development table and v10 report summary into leaderboard.html
// from the validated Dev100 snapshot. Only the dev100-ranking block changes; the
// Selected_1000 paired-ranking block and index.html are never touched.
import { readFile, writeFile } from 'node:fs/promises';
import { escapeHTML } from '../leaderboard-data.js';
import {
  DEV_BOARD, DEV_METRICS, DEFAULT_DEV_METRIC, DEFAULT_DEV_VIEW,
  validateDevBoard, devViews, devTableRows, devReportHTML, devSavedStatus,
} from '../leaderboard-dev100-data.js';
const root = new URL('../', import.meta.url);
const START = '<!-- dev100-ranking:start -->';
const END = '<!-- dev100-ranking:end -->';
const PAIRED = /<!-- paired-ranking:start -->[\s\S]*?<!-- paired-ranking:end -->/g;

export const devWidget = data => `<div class="paired-board dev-board" data-dev-leaderboard>
  <div class="paired-controls" hidden>
    <label><span>Harness</span><select data-ranking-view aria-label="Filter harness">${Object.entries(devViews(data)).map(([key, label]) => `<option value="${escapeHTML(key)}"${key === DEFAULT_DEV_VIEW ? '' : ' data-no-translate'}>${escapeHTML(label)}</option>`).join('')}</select></label>
    <label><span>Rank by</span><select data-ranking-metric aria-label="Ranking metric">${Object.entries(DEV_METRICS).map(([key, label]) => `<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
  </div>
  <figure class="mountain" data-ranking-mountain hidden><div class="mountain-canvas"></div></figure>
  <p class="dev-chart-note" data-chart-note hidden>${DEV_BOARD.chartNote}</p>
  <div class="dev-overview" data-ranking-overview hidden></div>
  <p class="paired-scroll-note">Scroll the table to see all metrics →</p>
  <div class="table-scroll" tabindex="0" role="region" aria-label="Development results"><table class="dev-table">
    <caption>${DEV_BOARD.caption}</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Model</th><th scope="col">Harness</th>${Object.entries(DEV_METRICS).map(([key, label]) => `<th scope="col" data-metric="${key}" aria-sort="${key === DEFAULT_DEV_METRIC ? 'descending' : 'none'}">${label}</th>`).join('')}<th scope="col" class="dev-count">Unknown or missing (ranked metric)</th><th scope="col" class="dev-count">Scored</th><th scope="col" class="dev-count">Failed</th><th scope="col" class="dev-count">Unknown</th><th scope="col" class="dev-source">Source mix</th></tr></thead>
    <tbody>${devTableRows(data)}</tbody>
  </table></div>
  <div class="paired-foot"><span>Every score uses all 100 tasks; failed and unknown runs stay in the denominator.</span><a href="assets/data/dev100-v10-results.csv" download>Download development results CSV ↓</a></div>
  <p class="dev-missing-note">† Includes scored tasks with no recorded value for this metric: historical DeepAgents results recorded Full replication only.</p>
  <p class="paired-status visually-hidden" data-ranking-status role="status">${devSavedStatus(data)}</p>
</div>`;

export const devBlock = data => `${devWidget(data)}\n${devReportHTML(data)}`;

// Exactly one marker pair, in order, and never around the Selected_1000 block.
export function replaceDevBlock(html, block, file = 'leaderboard.html') {
  const from = html.indexOf(START);
  const to = html.indexOf(END);
  if (html.split(START).length !== 2 || html.split(END).length !== 2 || to < from) {
    throw new Error(`Expected one development results marker pair in ${file}`);
  }
  if (html.slice(from, to).includes('paired-ranking:')) throw new Error(`Development markers enclose the Selected_1000 block in ${file}`);
  const next = `${html.slice(0, from)}${START}\n${block}\n${END}${html.slice(to + END.length)}`;
  const paired = text => [...text.matchAll(PAIRED)].map(match => match[0]).join('\n');
  if (paired(next) !== paired(html)) throw new Error(`The Selected_1000 block in ${file} would change`);
  return next;
}

export async function buildDevBoard({
  source = new URL('assets/data/dev100-v10-results.json', root),
  page = new URL('leaderboard.html', root),
} = {}) {
  const data = validateDevBoard(JSON.parse(await readFile(source, 'utf8')));
  await writeFile(page, replaceDevBlock(await readFile(page, 'utf8'), devBlock(data)));
  return data;
}

if (import.meta.main) {
  const data = await buildDevBoard();
  console.log(`Generated leaderboard.html from the ${DEV_BOARD.id} snapshot (${data.groups} runs).`);
}
