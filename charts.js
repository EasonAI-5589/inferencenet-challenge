/* charts.js — dependency-free inline SVG charts for the InferenceNet Challenge site.
 *
 * Exports: barList, stackedBars, pairedBars, ladder, mountCharts, render, formatNumber.
 * Every chart is a horizontal bar form (long category labels, phone-friendly),
 * painted with CSS classes only (.s1–.s6, .muted, .grid, .label, .value …) so the
 * colours come from site.css tokens and follow the theme toggle. Text is never
 * smaller than 12px. Below ~520px, or when labels would truncate, rows switch to
 * a stacked layout (label above its bar) so nothing is cut off. Each SVG gets
 * role="img", an aria-label, a <title> and a <desc> listing every value. The
 * authored <table class="chart-table"> stays in the DOM: it is the no-JavaScript
 * and screen-reader twin of the chart.
 *
 * Declarative use (what pages do):
 *   <figure class="chart" data-chart="barList">
 *     <figcaption class="chart-head">…</figcaption>
 *     <div class="chart-canvas"></div>
 *     <script type="application/json">{ "items": [ … ] }</script>
 *     <details class="chart-table" open>…<table>…</table></details>
 *   </figure>
 * site.js calls mountCharts() once; it is idempotent and re-renders on resize.
 */

const NS = 'http://www.w3.org/2000/svg';
const registry = new WeakMap();
let observer = null;
let measureContext = null;

const BAR = 18;          // bar thickness (px) — never thicker than 24
const PAIR_BAR = 14;     // thickness of each bar in a paired row
const GAP = 2;           // surface gap between touching fills
const RADIUS = 4;        // rounded data end
const MIN_WIDTH = 240;
const STACK_BELOW = 520; // canvas width under which labels sit above their bars

function svg(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    node.setAttribute(key, String(value));
  }
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function measurer(fontSize, fontWeight = 400, family) {
  if (!measureContext) measureContext = document.createElement('canvas').getContext('2d');
  const ctx = measureContext;
  const font = `${fontWeight} ${fontSize}px ${family || 'Inter, Arial, sans-serif'}`;
  return text => { ctx.font = font; return ctx.measureText(String(text)).width; };
}

export function formatNumber(value, decimals) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const number = Number(value);
  const digits = decimals === undefined ? (Number.isInteger(number) ? 0 : 1) : decimals;
  return number.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function valueText(value, opts) {
  const text = formatNumber(value, opts.decimals);
  if (!text) return '';
  const unit = opts.unit || '';
  return unit === '%' || unit === '' ? `${text}${unit}` : `${text} ${unit}`;
}

function niceStep(max, targetTicks) {
  if (!(max > 0)) return 1;
  const rough = max / targetTicks;
  const power = 10 ** Math.floor(Math.log10(rough));
  const candidates = [1, 2, 2.5, 5, 10].map(m => m * power);
  return candidates.find(step => max / step <= targetTicks + 0.5) || candidates[candidates.length - 1];
}

function scaleInfo(dataMax, opts, plotWidth) {
  const targetTicks = Math.max(2, Math.min(5, Math.floor(plotWidth / 90)));
  const requested = opts.max !== undefined && opts.max !== null ? Number(opts.max) : null;
  const max = requested !== null && requested > 0 ? requested : dataMax;
  const step = niceStep(max, targetTicks);
  const top = requested !== null && requested > 0 ? requested : Math.ceil((max || 1) / step) * step;
  const ticks = [];
  for (let value = 0; value <= top + step / 1000; value += step) ticks.push(+value.toFixed(6));
  if (ticks[ticks.length - 1] < top - step / 1000) ticks.push(top);
  return { max: top || 1, ticks };
}

function truncate(text, maxWidth, measure) {
  let label = String(text);
  if (measure(label) <= maxWidth) return label;
  while (label.length > 1 && measure(`${label}…`) > maxWidth) label = label.slice(0, -1);
  return `${label.replace(/\s+$/, '')}…`;
}

function barPath(x0, x1, y, height, radius) {
  const width = Math.max(0, x1 - x0);
  if (width === 0) return '';
  const r = Math.min(radius, width, height / 2);
  return `M${x0} ${y}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y + r}V${y + height - r}A${r} ${r} 0 0 1 ${x1 - r} ${y + height}H${x0}Z`;
}

function seriesClass(index) { return `s${Math.min(6, Math.max(1, index + 1))}`; }

function frame(canvas, width, height, label, description, title) {
  const root = svg('svg', {
    viewBox: `0 0 ${width} ${height}`, width: '100%', height, role: 'img',
    'aria-label': label, preserveAspectRatio: 'xMinYMin meet',
  });
  root.appendChild(svg('title', {}, title || label));
  if (description) root.appendChild(svg('desc', {}, description));
  canvas.replaceChildren(root);
  return root;
}

/* Vertical gridlines with tick labels; labels that would collide are dropped. */
function drawGrid(root, ticks, x, layout, top, bottom, tickOpts, rows) {
  const layer = svg('g', { class: 'axis' });
  const { fontSize, measure, x0, plotWidth } = layout;
  let lastRight = -Infinity;
  for (const tick of ticks) {
    const px = x(tick);
    const cls = tick === 0 ? 'baseline' : 'grid';
    // Stacked layout: gridlines only behind the bar band of each row, so they never cross the label lines.
    if (layout.stacked && rows) {
      for (let i = 0; i < rows; i++) {
        const y = layout.barTop(i);
        layer.appendChild(svg('line', { class: cls, x1: px, x2: px, y1: y - 3, y2: y + layout.barBlock + 3 }));
      }
    } else {
      layer.appendChild(svg('line', { class: cls, x1: px, x2: px, y1: top, y2: bottom }));
    }
    const text = valueText(tick, { unit: tickOpts.unit, decimals: 0 });
    const width = measure(text);
    let anchor = 'middle', tx = px, left = px - width / 2;
    if (left < x0 - 2) { anchor = 'start'; tx = x0; left = x0; }
    if (px + width / 2 > x0 + plotWidth + 2) { anchor = 'end'; tx = x0 + plotWidth; left = tx - width; }
    if (left < lastRight + 10) continue;
    lastRight = left + width;
    layer.appendChild(svg('text', { class: 'tick', x: tx, y: bottom + fontSize + 6, 'text-anchor': anchor, 'font-size': fontSize }, text));
  }
  root.appendChild(layer);
}

function chartTitleOf(canvas) {
  const figure = canvas.closest('figure, [data-chart]');
  const title = figure && figure.querySelector('.chart-title');
  return title ? title.textContent.trim() : '';
}

function ariaFor(opts, canvas, kind, summary) {
  const title = opts.ariaLabel || opts.title || chartTitleOf(canvas) || 'Chart';
  return { label: `${kind}: ${title}`, desc: summary };
}

function canvasWidth(canvas) {
  // A hidden canvas (inactive tab panel) has no width yet: borrow the nearest
  // visible ancestor's width so the SVG exists for assistive technology, then
  // re-render at the true width once the panel is shown (ResizeObserver).
  let width = canvas.clientWidth;
  let node = canvas.parentElement;
  while (!width && node) { width = Math.max(0, node.clientWidth - 48); node = node.parentElement; }
  return Math.max(MIN_WIDTH, Math.floor(width || 0));
}

/* Row layout shared by every horizontal form ------------------------------------
 * inline mode: [label column][bar … value]   stacked mode: label line, then bar. */
function rowLayout(canvas, labels, valueLabels, { barBlock, axisBand = 26, topPad = 4 }) {
  const width = canvasWidth(canvas);
  const fontSize = width < 620 ? 12 : 13;
  const family = getComputedStyle(canvas).fontFamily;
  const measure = measurer(fontSize, 400, family);
  const measureStrong = measurer(fontSize, 500, family);
  const longestLabel = Math.max(0, ...labels.map(label => measure(label)));
  const longestValue = Math.max(0, ...valueLabels.map(label => measureStrong(label)));
  const stacked = width < STACK_BELOW || longestLabel + 10 > width * 0.36;
  const labelColumn = stacked ? 0 : Math.max(72, longestLabel + 10);
  const valueColumn = Math.min(Math.max(28, longestValue + 8), Math.round(width * 0.4));
  const x0 = stacked ? 1 : labelColumn + 10;
  const plotWidth = Math.max(60, width - x0 - valueColumn - 2);
  const rowHeight = stacked ? barBlock + fontSize + 16 : barBlock + 12;
  const height = topPad + labels.length * rowHeight + axisBand;
  const rowTop = index => topPad + index * rowHeight;
  const barTop = index => rowTop(index) + (stacked ? fontSize + 10 : 6);
  const label = (index, text) => stacked
    ? svg('text', { class: 'label', x: 0, y: rowTop(index) + fontSize, 'font-size': fontSize }, text)
    : svg('text', { class: 'label', x: labelColumn, y: barTop(index) + barBlock / 2, 'text-anchor': 'end', dy: '.35em', 'font-size': fontSize }, truncate(text, labelColumn - 4, measure));
  return { width, height, fontSize, measure, measureStrong, family, stacked, labelColumn, valueColumn, x0, plotWidth, rowHeight, topPad, barBlock, rowTop, barTop, label };
}

function valueLabel(layout, x, y, text, note) {
  const node = svg('text', { class: 'value', x: x + 6, y, dy: '.35em', 'font-size': layout.fontSize }, text);
  if (note) node.appendChild(svg('tspan', { class: 'note', dx: 6, 'font-weight': 400 }, note));
  return node;
}

/* barList ---------------------------------------------------------------------- */
export function barList(canvas, opts = {}) {
  const items = (opts.items || []).map(item => ({ ...item, value: Number(item.value) || 0 }));
  if (opts.sort === 'desc') items.sort((a, b) => b.value - a.value);
  if (opts.sort === 'asc') items.sort((a, b) => a.value - b.value);
  const valueLabels = items.map(item => valueText(item.value, opts) + (item.note ? `  ${item.note}` : ''));
  const layout = rowLayout(canvas, items.map(i => i.label), valueLabels, { barBlock: BAR });
  const { max, ticks } = scaleInfo(Math.max(0, ...items.map(i => i.value)), opts, layout.plotWidth);
  const x = value => layout.x0 + (value / max) * layout.plotWidth;
  const summary = items.map(item => `${item.label}: ${valueText(item.value, opts)}${item.note ? ` (${item.note})` : ''}`).join('; ');
  const aria = ariaFor(opts, canvas, 'Bar chart', `${items.length} items. ${summary}`);
  const root = frame(canvas, layout.width, layout.height, aria.label, aria.desc, opts.title);
  const plotTop = layout.topPad, plotBottom = layout.topPad + items.length * layout.rowHeight;
  drawGrid(root, ticks, x, layout, plotTop, plotBottom, opts, items.length);
  const cls = opts.series ? seriesClass(Number(opts.series) - 1) : 's1';
  items.forEach((item, index) => {
    const y = layout.barTop(index);
    const row = svg('g', { class: 'row' });
    row.appendChild(svg('title', {}, `${item.label}: ${valueText(item.value, opts)}${item.note ? ` · ${item.note}` : ''}`));
    row.appendChild(layout.label(index, item.label));
    if (item.value > 0) row.appendChild(svg('path', { class: `mark ${item.kind === 'muted' ? 'muted' : cls}`, d: barPath(x(0), x(item.value), y, BAR, RADIUS) }));
    row.appendChild(valueLabel(layout, x(item.value), y + BAR / 2, valueText(item.value, opts), item.note));
    root.appendChild(row);
  });
  return root;
}

/* ladder ------------------------------------------------------------------------ */
export function ladder(canvas, opts = {}) {
  const highlight = new Set(Array.isArray(opts.highlight) ? opts.highlight : opts.highlight ? [opts.highlight] : []);
  const items = (opts.items || []).map(item => ({ ...item, value: Number(item.value) || 0 }));
  if (opts.sort !== 'none') items.sort((a, b) => b.value - a.value);
  const valueLabels = items.map(item => valueText(item.value, opts) + (item.note ? `  ${item.note}` : ''));
  const layout = rowLayout(canvas, items.map(i => i.label), valueLabels, { barBlock: BAR, topPad: opts.rule ? 26 : 4 });
  const ruleValue = opts.rule && Number.isFinite(Number(opts.rule.value)) ? Number(opts.rule.value) : null;
  const { max, ticks } = scaleInfo(Math.max(0, ...items.map(i => i.value), ruleValue || 0), opts, layout.plotWidth);
  const x = value => layout.x0 + (value / max) * layout.plotWidth;
  const kindOf = item => item.kind || (highlight.has(item.label) ? 'highlight' : 'muted');
  const summary = items.map((item, i) => `${i + 1}. ${item.label}: ${valueText(item.value, opts)}${item.note ? ` (${item.note})` : ''}${kindOf(item) === 'highlight' ? ' [highlighted]' : ''}`).join('; ');
  const aria = ariaFor(opts, canvas, 'Ranked bar chart', `${items.length} entries ranked by value${ruleValue !== null ? `; reference line at ${valueText(ruleValue, opts)}${opts.rule.label ? ` (${opts.rule.label})` : ''}` : ''}. ${summary}`);
  const root = frame(canvas, layout.width, layout.height, aria.label, aria.desc, opts.title);
  const plotTop = layout.topPad, plotBottom = layout.topPad + items.length * layout.rowHeight;
  drawGrid(root, ticks, x, layout, plotTop, plotBottom, opts, items.length);
  items.forEach((item, index) => {
    const y = layout.barTop(index);
    const kind = kindOf(item);
    const cls = kind === 'highlight' ? 's1' : kind === 'secondary' ? 's3' : 'muted';
    const row = svg('g', { class: `row ${kind}` });
    row.appendChild(svg('title', {}, `${item.label}: ${valueText(item.value, opts)}${item.note ? ` · ${item.note}` : ''}`));
    row.appendChild(layout.label(index, item.label));
    if (item.value > 0) row.appendChild(svg('path', { class: `mark ${cls}`, d: barPath(x(0), x(item.value), y, BAR, RADIUS) }));
    row.appendChild(valueLabel(layout, x(item.value), y + BAR / 2, valueText(item.value, opts), item.note));
    root.appendChild(row);
  });
  if (ruleValue !== null) {
    const px = x(ruleValue);
    const layer = svg('g', { class: 'reference' });
    if (layout.stacked) {
      items.forEach((item, i) => layer.appendChild(svg('line', { class: 'rule', x1: px, x2: px, y1: layout.barTop(i) - 4, y2: layout.barTop(i) + BAR + 4 })));
    } else {
      layer.appendChild(svg('line', { class: 'rule', x1: px, x2: px, y1: plotTop - 4, y2: plotBottom }));
    }
    if (opts.rule.label) {
      const text = String(opts.rule.label);
      const anchor = px + layout.measure(text) + 6 > layout.width ? 'end' : 'start';
      layer.appendChild(svg('text', { class: 'note', x: anchor === 'start' ? px + 5 : px - 5, y: plotTop - 10, 'text-anchor': anchor, 'font-size': layout.fontSize }, text));
    }
    root.appendChild(layer);
  }
  return root;
}

/* pairedBars -------------------------------------------------------------------- */
export function pairedBars(canvas, opts = {}) {
  const groups = (opts.groups || []).map(group => ({ ...group, a: Number(group.a) || 0, b: Number(group.b) || 0 }));
  const seriesLabels = opts.seriesLabels || ['Series A', 'Series B'];
  const deltaText = group => {
    const delta = group.b - group.a;
    const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
    return `${sign}${formatNumber(Math.abs(delta), opts.decimals === undefined ? 1 : opts.decimals)}`;
  };
  const valueLabels = groups.flatMap(group => [valueText(group.a, opts), valueText(group.b, opts) + (opts.showDelta ? `  ${deltaText(group)}` : '')]);
  const layout = rowLayout(canvas, groups.map(g => g.label), valueLabels, { barBlock: PAIR_BAR * 2 + GAP });
  const { max, ticks } = scaleInfo(Math.max(0, ...groups.flatMap(g => [g.a, g.b])), opts, layout.plotWidth);
  const x = value => layout.x0 + (value / max) * layout.plotWidth;
  const summary = groups.map(group => `${group.label}: ${seriesLabels[0]} ${valueText(group.a, opts)}, ${seriesLabels[1]} ${valueText(group.b, opts)}${opts.showDelta ? ` (${deltaText(group)})` : ''}`).join('; ');
  const aria = ariaFor(opts, canvas, 'Paired bar chart', `${groups.length} groups, two series (${seriesLabels.join(' vs ')}). ${summary}`);
  const root = frame(canvas, layout.width, layout.height, aria.label, aria.desc, opts.title);
  const plotTop = layout.topPad, plotBottom = layout.topPad + groups.length * layout.rowHeight;
  drawGrid(root, ticks, x, layout, plotTop, plotBottom, opts, groups.length);
  groups.forEach((group, index) => {
    const top = layout.barTop(index);
    const row = svg('g', { class: 'row' });
    row.appendChild(svg('title', {}, `${group.label} — ${seriesLabels[0]}: ${valueText(group.a, opts)}; ${seriesLabels[1]}: ${valueText(group.b, opts)}`));
    row.appendChild(layout.label(index, group.label));
    [['a', 's1', top], ['b', 's2', top + PAIR_BAR + GAP]].forEach(([key, cls, y]) => {
      const value = group[key];
      if (value > 0) row.appendChild(svg('path', { class: `mark ${cls}`, d: barPath(x(0), x(value), y, PAIR_BAR, RADIUS) }));
      row.appendChild(valueLabel(layout, x(value), y + PAIR_BAR / 2, valueText(value, opts), key === 'b' && opts.showDelta ? deltaText(group) : null));
    });
    root.appendChild(row);
  });
  return root;
}

/* stackedBars ------------------------------------------------------------------- */
export function stackedBars(canvas, opts = {}) {
  const keys = opts.keys || [];
  const rows = (opts.rows || []).map(row => {
    const parts = keys.map(key => { const part = (row.parts || []).find(p => p.key === key); return { key, value: part ? Number(part.value) || 0 : 0 }; });
    return { label: row.label, parts, total: parts.reduce((sum, part) => sum + part.value, 0) };
  });
  const normalize = Boolean(opts.normalize);
  const totalLabel = row => normalize ? `n = ${formatNumber(row.total, 0)}` : valueText(row.total, opts);
  const layout = rowLayout(canvas, rows.map(r => r.label), rows.map(totalLabel), { barBlock: BAR });
  const scaleMax = normalize ? 100 : Math.max(0, ...rows.map(r => r.total));
  const { max, ticks } = scaleInfo(scaleMax, normalize ? { max: 100 } : opts, layout.plotWidth);
  const tickOpts = normalize ? { unit: '%' } : opts;
  const x = value => layout.x0 + (value / max) * layout.plotWidth;
  const share = (row, part) => row.total ? part.value / row.total * 100 : 0;
  const summary = rows.map(row => `${row.label} (${normalize ? `n = ${formatNumber(row.total, 0)}` : valueText(row.total, opts)}): ` + row.parts.map(part => `${part.key} ${normalize ? `${formatNumber(share(row, part), 1)}%` : valueText(part.value, opts)}`).join(', ')).join('; ');
  const aria = ariaFor(opts, canvas, 'Stacked bar chart', `${rows.length} rows, ${keys.length} segments (${keys.join(', ')}). ${summary}`);
  const root = frame(canvas, layout.width, layout.height, aria.label, aria.desc, opts.title);
  const plotTop = layout.topPad, plotBottom = layout.topPad + rows.length * layout.rowHeight;
  drawGrid(root, ticks, x, layout, plotTop, plotBottom, tickOpts, rows.length);
  const inLabel = measurer(layout.fontSize - 1, 500, layout.family);
  rows.forEach((row, index) => {
    const y = layout.barTop(index);
    const group = svg('g', { class: 'row' });
    group.appendChild(svg('title', {}, `${row.label}: ` + row.parts.map(part => `${part.key} ${valueText(part.value, opts)}`).join(', ')));
    group.appendChild(layout.label(index, row.label));
    const visible = row.parts.filter(part => part.value > 0);
    let cursor = x(0);
    const scale = normalize && row.total ? 100 / row.total : 1;
    visible.forEach((part, partIndex) => {
      const width = (part.value * scale / max) * layout.plotWidth;
      const isLast = partIndex === visible.length - 1;
      const x1 = cursor + Math.max(0, width - (isLast ? 0 : GAP));
      const cls = seriesClass(keys.indexOf(part.key));
      if (x1 > cursor) {
        const mark = isLast
          ? svg('path', { class: `mark ${cls}`, d: barPath(cursor, x1, y, BAR, RADIUS) })
          : svg('rect', { class: `mark ${cls}`, x: cursor, y, width: x1 - cursor, height: BAR });
        mark.appendChild(svg('title', {}, `${part.key}: ${valueText(part.value, opts)}${normalize ? ` (${formatNumber(share(row, part), 1)}%)` : ''}`));
        group.appendChild(mark);
        const text = normalize ? `${formatNumber(share(row, part), 0)}%` : formatNumber(part.value, opts.decimals);
        if (inLabel(text) + 12 <= x1 - cursor) {
          group.appendChild(svg('text', { class: `value on-${cls}`, x: cursor + (x1 - cursor) / 2, y: y + BAR / 2, dy: '.35em', 'text-anchor': 'middle', 'font-size': layout.fontSize - 1 }, text));
        }
      }
      cursor = x1 + (isLast ? 0 : GAP);
    });
    group.appendChild(valueLabel(layout, x(normalize ? 100 : row.total), y + BAR / 2, totalLabel(row)));
    root.appendChild(group);
  });
  return root;
}

/* Legend -------------------------------------------------------------------------- */
function legendFor(type, opts) {
  if (type === 'stackedBars') return (opts.keys || []).map((key, index) => ({ label: key, cls: seriesClass(index) }));
  if (type === 'pairedBars') return (opts.seriesLabels || ['Series A', 'Series B']).map((label, index) => ({ label, cls: seriesClass(index) }));
  if (type === 'ladder' && Array.isArray(opts.legend)) return opts.legend.map(entry => ({ label: entry.label, cls: entry.kind === 'highlight' ? 's1' : entry.kind === 'secondary' ? 's3' : 'muted' }));
  return null;
}

function syncLegend(figure, canvas, type, opts) {
  const entries = legendFor(type, opts);
  const existing = figure.querySelector('.chart-legend[data-auto]');
  if (!entries || entries.length < 2) { if (existing) existing.remove(); return; }
  const list = existing || document.createElement('ul');
  list.className = 'chart-legend';
  list.setAttribute('data-auto', '');
  list.setAttribute('aria-label', 'Legend');
  list.replaceChildren(...entries.map(entry => {
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = `swatch ${entry.cls}`;
    swatch.setAttribute('aria-hidden', 'true');
    item.append(swatch, document.createTextNode(entry.label));
    return item;
  }));
  if (!existing) canvas.insertAdjacentElement('afterend', list);
}

/* Mounting ------------------------------------------------------------------------ */
const renderers = { barList, stackedBars, pairedBars, ladder };

export function render(element, type, opts) {
  const renderer = renderers[type];
  if (!renderer) throw new Error(`Unknown chart type: ${type}`);
  const canvas = element.matches('.chart-canvas') ? element : element.querySelector('.chart-canvas') || element;
  return renderer(canvas, opts);
}

function readConfig(figure) {
  const script = figure.querySelector('script[type="application/json"]');
  if (!script) return null;
  try { return JSON.parse(script.textContent); } catch { return null; }
}

function collapseTable(figure) {
  if (figure.dataset.tableCollapsed === 'true') return;
  figure.dataset.tableCollapsed = 'true';
  if (figure.dataset.table === 'open') return;
  const details = figure.querySelector('details.chart-table');
  if (details) details.open = false;
}

function draw(figure) {
  const entry = registry.get(figure);
  if (!entry) return;
  entry.lastWidth = entry.canvas.clientWidth;
  try {
    renderers[entry.type](entry.canvas, entry.opts);
    syncLegend(figure, entry.canvas, entry.type, entry.opts);
    figure.dataset.chartState = 'rendered';
    collapseTable(figure);
  } catch {
    figure.dataset.chartState = 'error';
  }
}

function ensureObserver() {
  if (observer || typeof ResizeObserver === 'undefined') return observer;
  observer = new ResizeObserver(entries => {
    for (const { target } of entries) {
      const figure = target.closest('[data-chart]');
      const entry = figure && registry.get(figure);
      if (!entry) continue;
      if (target.clientWidth !== entry.lastWidth) draw(figure);
    }
  });
  return observer;
}

export function mountCharts(root = document) {
  const figures = root.querySelectorAll ? [...root.querySelectorAll('[data-chart]')] : [];
  for (const figure of figures) {
    const type = figure.dataset.chart;
    if (!renderers[type]) { figure.dataset.chartState = 'unknown-type'; continue; }
    let entry = registry.get(figure);
    if (!entry) {
      const opts = readConfig(figure);
      if (!opts) { figure.dataset.chartState = 'invalid-json'; continue; }
      let canvas = figure.querySelector('.chart-canvas');
      if (!canvas) {
        canvas = document.createElement('div');
        canvas.className = 'chart-canvas';
        const script = figure.querySelector('script[type="application/json"]');
        (script || figure).insertAdjacentElement(script ? 'beforebegin' : 'afterbegin', canvas);
      }
      entry = { type, opts, canvas, lastWidth: -1 };
      registry.set(figure, entry);
      const ro = ensureObserver();
      if (ro) ro.observe(canvas);
    }
    draw(figure);
  }
  return figures.length;
}

export default { barList, stackedBars, pairedBars, ladder, mountCharts, render, formatNumber };
