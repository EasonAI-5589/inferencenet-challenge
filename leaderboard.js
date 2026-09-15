import { HEADERS, METRICS, DEFAULT_METRIC, parseLeaderboardCSV,
  sortLeaderboardRows, formatScore, readCSVResponse } from './leaderboard-data.js';

export const SOURCE_URLS = Object.freeze([
  'https://camoailab-inferencenet-leaderboard.static.hf.space/results.csv',
  'https://huggingface.co/spaces/CamoAiLab/InferenceNet-Leaderboard/raw/main/results.csv',
]);

// One eight-second budget covers both endpoints and response-body reading.
export async function fetchLeaderboard({ fetchImpl = globalThis.fetch,
  urls = SOURCE_URLS, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const duration = Math.min(10000, Math.max(1, Number(timeoutMs) || 8000));
  const timer = setTimeout(() => controller.abort(), duration);
  let lastError = new Error('Leaderboard source unavailable');
  try {
    for (const sourceUrl of urls) {
      try {
        const response = await fetchImpl(sourceUrl, {
          mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal,
        });
        const rows = parseLeaderboardCSV(await readCSVResponse(response));
        if (controller.signal.aborted) throw new Error('Leaderboard fetch timed out');
        return { rows, sourceUrl, fetchedAt: new Date().toISOString(),
          sourceCommit: response.headers.get('X-Repo-Commit') };
      } catch (error) {
        if (controller.signal.aborted) throw new Error('Leaderboard fetch timed out');
        lastError = error;
      }
    }
    throw lastError;
  } finally {
    clearTimeout(timer);
  }
}

function readStaticRows(body) {
  const ordered = [...body.rows].map((row, index) => ({
    row, index, sourceOrder: Number(row.dataset.sourceOrder),
  }));
  if (ordered.every(item => Number.isInteger(item.sourceOrder) && item.sourceOrder >= 0)
      && new Set(ordered.map(item => item.sourceOrder)).size === ordered.length) {
    ordered.sort((a, b) => a.sourceOrder - b.sourceOrder);
  }
  const records = [HEADERS, ...ordered.map(({ row }) => {
    if (row.cells.length !== 6) throw new Error('Unexpected saved table row');
    return [...row.cells].slice(1).map((cell, index) => {
      const value = cell.textContent.trim();
      return index === 0 ? value : value.replace(/%$/, '');
    });
  })];
  const csv = records.map(cells => cells.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
  return parseLeaderboardCSV(csv);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// English and UTC on every locale, in the page's own "10 Sep 2026, 20:06 UTC" form.
function localFetchTime(iso) {
  const date = new Date(iso);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

export function initLeaderboard(doc = document) {
  const body = doc.getElementById('leaderboard-body');
  const status = doc.getElementById('leaderboard-status');
  const count = doc.getElementById('leaderboard-count');
  const select = doc.getElementById('leaderboard-sort');
  const refresh = doc.getElementById('leaderboard-refresh');
  const table = doc.getElementById('leaderboard-table');
  if (![body, status, count, select, refresh, table].every(Boolean)) return;
  const sortStatus = doc.getElementById('leaderboard-sort-status');
  const scrollHint = doc.querySelector('.lb-scroll-hint');
  const scroller = table.parentElement;

  const savedSnapshotStatus = status.textContent.trim();
  let rows = [], fetchedAt = null, busy = false;
  try { rows = readStaticRows(body); } catch { /* Leave the static table visible. */ }

  function render() {
    if (rows.length === 0) return;
    const metric = METRICS.includes(select.value) ? select.value : DEFAULT_METRIC;
    const fragment = doc.createDocumentFragment();
    const sourceOrder = new Map(rows.map((row, index) => [row['Model ID'], index]));
    sortLeaderboardRows(rows, metric).forEach((row, index) => {
      const tr = doc.createElement('tr');
      tr.dataset.sourceOrder = String(sourceOrder.get(row['Model ID']));
      const values = [String(index + 1), row['Model ID'], ...METRICS.map(key => formatScore(row[key]))];
      values.forEach((value, position) => {
        const cell = doc.createElement(position === 1 ? 'th' : 'td');
        cell.textContent = value;
        if (position === 1) {
          cell.className = 'leaderboard-model';
          cell.setAttribute('scope', 'row');
        }
        tr.appendChild(cell);
      });
      fragment.appendChild(tr);
    });
    body.replaceChildren(fragment);
    table.querySelectorAll('th[data-metric]').forEach(header => {
      header.setAttribute('aria-sort', header.dataset.metric === metric ? 'descending' : 'none');
    });
    count.textContent = `${rows.length} entries`;
    select.disabled = false;
    updateScrollHint();
  }

  // The sideways-scroll cue is only shown while the table is wider than its viewport.
  function updateScrollHint() {
    if (!scrollHint || !scroller) return;
    scrollHint.hidden = scroller.scrollWidth <= scroller.clientWidth + 1;
  }

  async function synchronize() {
    if (busy) return;
    busy = true;
    refresh.disabled = true;
    table.setAttribute('aria-busy', 'true');
    status.textContent = fetchedAt
      ? `Checking Hugging Face · Showing data fetched ${localFetchTime(fetchedAt)}`
      : `Checking Hugging Face · ${savedSnapshotStatus}`;
    try {
      const latest = await fetchLeaderboard();
      rows = latest.rows;
      fetchedAt = latest.fetchedAt;
      render();
      status.textContent = `Synced from Hugging Face · Fetched ${localFetchTime(fetchedAt)}`;
    } catch {
      status.textContent = fetchedAt
        ? `Latest fetch unavailable · Showing data fetched ${localFetchTime(fetchedAt)}`
        : `${savedSnapshotStatus} · Latest fetch unavailable; showing saved snapshot.`;
    } finally {
      busy = false;
      refresh.disabled = false;
      table.setAttribute('aria-busy', 'false');
    }
  }

  render();
  refresh.hidden = false;
  if (typeof ResizeObserver === 'function' && scroller) new ResizeObserver(updateScrollHint).observe(scroller);
  select.addEventListener('change', () => {
    render();
    if (sortStatus) sortStatus.textContent = `Sorted by ${select.value} · ${rows.length} entries`;
  });
  refresh.addEventListener('click', () => { void synchronize(); });
  void synchronize();
}

if (typeof document !== 'undefined') initLeaderboard();
