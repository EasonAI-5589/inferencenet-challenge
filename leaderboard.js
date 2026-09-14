import { HEADERS, METRICS, DEFAULT_METRIC, parseLeaderboardCSV,
  sortLeaderboardRows, formatScore, readCSVResponse } from './leaderboard-data.js';

export const SOURCE_URLS = Object.freeze([
  'https://camoailab-inferencenet-leaderboard.static.hf.space/results.csv',
  'https://huggingface.co/spaces/CamoAiLab/InferenceNet-Leaderboard/raw/main/results.csv',
]);

const ASCENT_LIMIT = 10;
const RANK_POSITIONS = Object.freeze([
  [70, 69], [30, 73], [77.5, 76], [24.5, 79], [67, 82],
  [34, 83], [81.5, 85], [21, 86], [64, 88], [38, 89],
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

function localFetchTime(iso) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium', timeStyle: 'long',
  }).format(new Date(iso));
}

function medalClass(rank) {
  if (rank === 1) return 'is-gold';
  if (rank === 2) return 'is-silver';
  if (rank === 3) return 'is-bronze';
  return '';
}

export function ascentPosition(_score, rankIndex = 0) {
  const index = Math.min(RANK_POSITIONS.length - 1, Math.max(0, Math.trunc(rankIndex)));
  const [x, y] = RANK_POSITIONS[index];
  return { x, y };
}

function setModelHighlight(doc, modelId, highlighted) {
  doc.querySelectorAll('[data-model-id]').forEach(element => {
    if (element.dataset.modelId === modelId) element.classList.toggle('is-active', highlighted);
  });
  doc.querySelectorAll('#leaderboard-body tr').forEach(row => {
    if (row.dataset.modelId === modelId) row.classList.toggle('is-highlighted', highlighted);
  });
}

function bindHighlight(doc, element, modelId) {
  element.addEventListener('mouseenter', () => setModelHighlight(doc, modelId, true));
  element.addEventListener('mouseleave', () => setModelHighlight(doc, modelId, false));
  element.addEventListener('focus', () => setModelHighlight(doc, modelId, true));
  element.addEventListener('blur', () => setModelHighlight(doc, modelId, false));
}

function makeCallout(doc, row, rank, metric, sideIndex, side) {
  const item = doc.createElement('li');
  item.className = 'ascent-callout';
  item.style.setProperty('--callout-y', `${61 + sideIndex * 8}%`);
  const link = doc.createElement('a');
  link.href = '#leaderboard-table';
  link.dataset.modelId = row['Model ID'];
  link.setAttribute('aria-label', `Rank ${rank}, ${row['Model ID']}, ${formatScore(row[metric])}. Jump to full table.`);

  const rankLabel = doc.createElement('span');
  rankLabel.className = `ascent-callout-rank ${medalClass(rank)}`.trim();
  rankLabel.textContent = String(rank);
  const name = doc.createElement('span');
  name.className = 'ascent-callout-name';
  name.textContent = row['Model ID'];
  name.title = row['Model ID'];
  if (side === 'left') link.append(rankLabel, name);
  else link.append(name, rankLabel);
  item.appendChild(link);
  bindHighlight(doc, link, row['Model ID']);
  return { item, calloutY: 61 + sideIndex * 8, anchorX: side === 'left' ? 19 : 81 };
}

function renderAscent(doc, orderedRows, metric) {
  const scene = doc.getElementById('leaderboard-ascent-scene');
  const climbers = doc.getElementById('ascent-climbers');
  const links = doc.getElementById('ascent-links');
  const left = doc.getElementById('ascent-callouts-left');
  const right = doc.getElementById('ascent-callouts-right');
  const mobile = doc.getElementById('ascent-mobile');
  const metricLabel = doc.getElementById('ascent-current-metric');
  if (![scene, climbers, links, left, right, mobile, metricLabel].every(Boolean)) return;

  climbers.replaceChildren();
  links.replaceChildren();
  left.replaceChildren();
  right.replaceChildren();
  mobile.replaceChildren();
  metricLabel.textContent = metric;

  const top = orderedRows.slice(0, ASCENT_LIMIT);
  scene.setAttribute('aria-label', `Top ${top.length} approaches arranged on a mountain by rank for ${metric}. ${top[0]['Model ID']} leads at ${formatScore(top[0][metric])}.`);
  const sideCounts = { left: 0, right: 0 };

  top.forEach((row, index) => {
    const rank = index + 1;
    const position = ascentPosition(row[metric], index);
    const marker = doc.createElement('a');
    marker.href = '#leaderboard-table';
    marker.className = `ascent-climber ${medalClass(rank)}`.trim();
    marker.style.left = `${position.x}%`;
    marker.style.top = `${position.y}%`;
    marker.style.setProperty('--rank', String(rank));
    marker.dataset.modelId = row['Model ID'];
    marker.textContent = String(rank);
    marker.setAttribute('aria-label', `Rank ${rank}: ${row['Model ID']}, ${formatScore(row[metric])}. Jump to full table.`);
    climbers.appendChild(marker);
    bindHighlight(doc, marker, row['Model ID']);

    const side = rank % 2 === 1 ? 'right' : 'left';
    const callout = makeCallout(doc, row, rank, metric, sideCounts[side], side);
    sideCounts[side] += 1;
    (side === 'left' ? left : right).appendChild(callout.item);

    const line = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(callout.anchorX));
    line.setAttribute('y1', String(callout.calloutY));
    line.setAttribute('x2', String(position.x));
    line.setAttribute('y2', String(position.y));
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    line.setAttribute('class', 'ascent-link');
    line.dataset.modelId = row['Model ID'];
    links.appendChild(line);

    if (rank <= 5) {
      const mobileRow = doc.createElement('li');
      mobileRow.className = 'ascent-mobile-row';
      mobileRow.dataset.modelId = row['Model ID'];
      const mobileRank = doc.createElement('span');
      mobileRank.className = `ascent-mobile-rank ${medalClass(rank)}`.trim();
      mobileRank.textContent = String(rank);
      const mobileName = doc.createElement('span');
      mobileName.className = 'ascent-mobile-name';
      mobileName.textContent = row['Model ID'];
      const mobileScore = doc.createElement('span');
      mobileScore.className = 'ascent-mobile-score';
      mobileScore.textContent = formatScore(row[metric]);
      mobileRow.append(mobileRank, mobileName, mobileScore);
      mobile.appendChild(mobileRow);
    }
  });
}

export function initLeaderboard(doc = document) {
  const body = doc.getElementById('leaderboard-body');
  const status = doc.getElementById('leaderboard-status');
  const count = doc.getElementById('leaderboard-count');
  const select = doc.getElementById('leaderboard-sort');
  const refresh = doc.getElementById('leaderboard-refresh');
  const table = doc.getElementById('leaderboard-table');
  if (![body, status, count, select, refresh, table].every(Boolean)) return;

  const savedSnapshotStatus = status.textContent.trim();
  let rows = [], fetchedAt = null, busy = false;
  try { rows = readStaticRows(body); } catch { /* Leave the static table visible. */ }

  function render() {
    if (rows.length === 0) return;
    const metric = METRICS.includes(select.value) ? select.value : DEFAULT_METRIC;
    const orderedRows = sortLeaderboardRows(rows, metric);
    const fragment = doc.createDocumentFragment();
    const sourceOrder = new Map(rows.map((row, index) => [row['Model ID'], index]));
    orderedRows.forEach((row, index) => {
      const tr = doc.createElement('tr');
      tr.dataset.sourceOrder = String(sourceOrder.get(row['Model ID']));
      tr.dataset.modelId = row['Model ID'];
      const values = [String(index + 1), row['Model ID'], ...METRICS.map(key => formatScore(row[key]))];
      values.forEach((value, position) => {
        const cell = doc.createElement(position === 1 ? 'th' : 'td');
        cell.textContent = value;
        if (position === 0) cell.className = 'leaderboard-rank';
        if (position === 1) {
          cell.className = 'leaderboard-model';
          cell.setAttribute('scope', 'row');
        }
        tr.appendChild(cell);
      });
      tr.addEventListener('mouseenter', () => setModelHighlight(doc, row['Model ID'], true));
      tr.addEventListener('mouseleave', () => setModelHighlight(doc, row['Model ID'], false));
      fragment.appendChild(tr);
    });
    body.replaceChildren(fragment);
    table.querySelectorAll('th[data-metric]').forEach(header => {
      header.setAttribute('aria-sort', header.dataset.metric === metric ? 'descending' : 'none');
    });
    count.textContent = `${rows.length} entries`;
    select.disabled = false;
    renderAscent(doc, orderedRows, metric);
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
  select.addEventListener('change', render);
  refresh.addEventListener('click', () => { void synchronize(); });
  void synchronize();
}

if (typeof document !== 'undefined') initLeaderboard();
