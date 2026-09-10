export const HEADERS = Object.freeze([
  'Model ID', 'Compilation Success', 'Partial Replication',
  'Correct Coefficient Direction', 'Significant Level Correctness',
]);
export const METRICS = Object.freeze(HEADERS.slice(1));
export const DEFAULT_METRIC = 'Partial Replication';
export const MAX_CSV_BYTES = 256 * 1024;
export const MAX_ROWS = 1000;

// Small RFC-style CSV reader: quoted commas/newlines and doubled quotes work;
// malformed records reject the whole update instead of changing valid scores.
export function parseLeaderboardCSV(input) {
  if (typeof input !== 'string') throw new Error('CSV must be text');
  if (new TextEncoder().encode(input).byteLength > MAX_CSV_BYTES) throw new Error('CSV size limit exceeded');
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const records = [];
  let row = [], field = '', quoted = false, closedQuote = false;
  function finishField() {
    row.push(field);
    field = '';
    closedQuote = false;
  }
  function finishRow() {
    finishField();
    if (row.length !== 1 || row[0].trim() !== '') records.push(row);
    if (records.length > MAX_ROWS + 1) throw new Error('CSV row limit exceeded');
    row = [];
  }
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character !== '"') field += character;
      else if (text[index + 1] === '"') { field += '"'; index += 1; }
      else { quoted = false; closedQuote = true; }
    } else if (character === ',') finishField();
    else if (character === '\n') finishRow();
    else if (closedQuote) throw new Error('Malformed CSV after closing quote');
    else if (character === '"') {
      if (field !== '') throw new Error('Malformed CSV quote');
      quoted = true;
    } else field += character;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (field !== '' || row.length > 0 || closedQuote) finishRow();
  const header = records.shift();
  if (!header || header.length !== HEADERS.length || header.some((value, index) => value.trim() !== HEADERS[index])) {
    throw new Error('Unexpected leaderboard CSV headers');
  }
  if (records.length === 0) throw new Error('Leaderboard CSV is empty');
  const models = new Set();
  return records.map(cells => {
    if (cells.length !== HEADERS.length) throw new Error('Unexpected CSV row width');
    const model = cells[0].trim();
    if (!model) throw new Error('Model ID is empty');
    if (models.has(model)) throw new Error('Duplicate Model ID');
    models.add(model);
    const result = { 'Model ID': model };
    METRICS.forEach((metric, index) => {
      const value = cells[index + 1].trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
        throw new Error(`Invalid metric: ${metric}`);
      }
      const score = Number(value);
      if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`Invalid metric: ${metric}`);
      result[metric] = score;
    });
    return result;
  });
}

export function sortLeaderboardRows(rows, metric = DEFAULT_METRIC) {
  if (!METRICS.includes(metric)) throw new Error('Unknown leaderboard metric');
  return rows.map((row, index) => ({ row, index }))
    .sort((a, b) => b.row[metric] - a.row[metric] || a.index - b.index)
    .map(item => item.row);
}

export function formatScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) throw new Error('Invalid metric score');
  return `${(score === 0 ? 0 : score).toFixed(1)}%`;
}

// Bound the decoded response while streaming, even when Content-Length is absent
// or describes compressed bytes. A failed update leaves the current table intact.
export async function readCSVResponse(response) {
  if (!response.ok) {
    if (response.body) void response.body.cancel().catch(() => {});
    throw new Error(`HTTP ${response.status}`);
  }
  const declaredSize = Number(response.headers.get('Content-Length'));
  if (declaredSize > MAX_CSV_BYTES) {
    if (response.body) void response.body.cancel().catch(() => {});
    throw new Error('CSV size limit exceeded');
  }
  if (!response.body) throw new Error('Empty CSV response');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_CSV_BYTES) throw new Error('CSV size limit exceeded');
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
