/* evolution.js — phase 2 trajectory charts for evolution.html. Classic script,
 * load with `defer`. Reads the published snapshot in
 * assets/data/modular-rsi-evolution.json, draws one SVG panel per module
 * lineage (accepted versions joined to their parent by step lines, rejected
 * candidates below the axis, annotated problem › change callouts) and redraws
 * when the metric changes. Labels are authored in English; language.js
 * translates the rendered text nodes, after which callouts are re-measured.
 * Without JavaScript the values table on the page stays readable. */
(() => {
  const root = document.querySelector('[data-rsi-evolution]');
  if (!root) return;
  const NS = 'http://www.w3.org/2000/svg';
  const select = root.querySelector('[data-rsi-metric]');
  const controls = root.querySelector('[data-rsi-controls]');
  const fallback = root.querySelector('[data-rsi-fallback]');
  const panelsBox = root.querySelector('.rsi-panels');
  const canvases = [...root.querySelectorAll('[data-rsi-panel]')];
  const scriptURL = document.currentScript && document.currentScript.src;
  const dataURL = new URL('assets/data/modular-rsi-evolution.json', scriptURL || window.location.href);
  if (scriptURL) dataURL.search = new URL(scriptURL).search;
  const axisTitles = {
    perfect: 'Full replication (%)', partial: 'Coef. and SE within 5% (%)',
    direction: 'Correct sign (%)', significance: 'Correct significance (%)', scored: 'Scored result (%)',
  };
  const ROW_H = 40;
  const BOX_H = 34;
  let data = null;
  let metric = 'perfect';
  const drawnWidth = new WeakMap();

  const el = (name, attrs = {}, text) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function ticksFor(lo, hi) {
    const step = [1, 2, 5, 10, 20].find(size => (hi - lo) / size <= 5) || 25;
    const ticks = [];
    for (let value = Math.ceil(lo / step) * step; value <= hi + 1e-9; value += step) ticks.push(value);
    return ticks;
  }

  function draw(canvas) {
    const panel = data.panels.find(item => item.id === canvas.dataset.rsiPanel);
    if (!panel) return;
    const width = Math.max(320, Math.round(canvas.clientWidth || 560));
    drawnWidth.set(canvas, width);
    const points = panel.points;
    const slots = Math.max(...points.map(point => point.x)) + 1;
    const notes = points.filter(point => point.kind !== 'initial');
    const narrow = width < 520;
    const rows = narrow ? notes.length : Math.min(2, notes.length);
    const laneTop = 4;
    const top = laneTop + rows * ROW_H + 24;
    const plotH = narrow ? 150 : 170;
    const bottom = top + plotH;
    const rejectY = bottom + 18;
    const axisY = rejectY + 12;
    const height = axisY + 40;
    const left = 46;
    const right = width - 14;
    const x = slot => left + 30 + slot * ((right - left - 60) / Math.max(1, slots - 1));
    const valueOf = point => point.values[metric] / data.run.denominator * 100;
    const values = points.filter(point => point.values).map(valueOf);
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    const pad = Math.max(2, (hi - lo) * 0.25);
    lo = Math.max(0, Math.floor(lo - pad));
    hi = Math.min(100, Math.ceil(hi + pad));
    if (hi - lo < 6) { const mid = (hi + lo) / 2; lo = Math.max(0, Math.floor(mid - 3)); hi = Math.min(100, Math.ceil(mid + 3)); }
    const y = value => bottom - (value - lo) / (hi - lo) * plotH;
    const byX = new Map(points.map(point => [point.x, point]));

    const svg = el('svg', {
      viewBox: `0 0 ${width} ${height}`, class: 'rsi-chart', role: 'img',
      'aria-label': `Evolution trajectory: ${panel.id}`,
    });
    for (const tick of ticksFor(lo, hi)) {
      svg.append(el('line', { x1: left, x2: right, y1: y(tick), y2: y(tick), class: 'rsi-grid' }));
      svg.append(el('text', { x: left - 8, y: y(tick) + 3.5, 'text-anchor': 'end', class: 'rsi-tick' }, String(tick)));
    }
    svg.append(el('line', { x1: left, x2: right, y1: axisY - 4, y2: axisY - 4, class: 'rsi-axis' }));
    svg.append(el('line', { x1: left, x2: left, y1: top - 8, y2: axisY - 4, class: 'rsi-axis' }));
    for (let slot = 0; slot < slots; slot++) {
      svg.append(el('text', { x: x(slot), y: axisY + 11, 'text-anchor': 'middle', class: 'rsi-tick' }, String(slot)));
    }
    svg.append(el('text', { x: (left + right) / 2, y: height - 6, 'text-anchor': 'middle', class: 'rsi-axis-title' }, 'Candidate evaluations'));
    svg.append(el('text', {
      x: 0, y: 0, transform: `translate(12 ${(top + bottom) / 2}) rotate(-90)`,
      'text-anchor': 'middle', class: 'rsi-axis-title',
    }, axisTitles[metric]));

    // Step lines: each accepted version joins its parent; the latest one runs to the edge.
    let current = byX.get(0);
    const segments = [];
    for (const point of points) {
      if (point.kind !== 'accepted' && point.kind !== 'frozen') continue;
      const parent = byX.get(point.parent);
      segments.push(`M${x(parent.x)} ${y(valueOf(parent))} H${x(point.x)} V${y(valueOf(point))}`);
      current = point;
    }
    segments.push(`M${x(current.x)} ${y(valueOf(current))} H${right}`);
    svg.append(el('path', { d: segments.join(' '), class: 'rsi-step' }));

    // Callouts and their leaders; positions are refined in fit() after measuring text.
    const leaders = el('g');
    const callouts = el('g');
    notes.forEach((point, index) => {
      const px = x(point.x);
      const py = point.values ? y(valueOf(point)) - 7 : rejectY - 8;
      const row = narrow ? index : index % 2;
      const group = el('g', {
        class: `rsi-callout${point.kind === 'rejected' ? ' is-rejected' : ''}`,
        'data-cx': px, 'data-px': px, 'data-py': py, 'data-top': laneTop + row * ROW_H, 'data-row': row,
      });
      group.append(el('rect', { x: px - 80, y: laneTop + row * ROW_H, width: 160, height: BOX_H, rx: 3 }));
      group.append(el('text', { x: px - 72, y: laneTop + row * ROW_H + 14, class: 'rsi-problem' }, point.problem));
      const fix = el('text', { x: px - 72, y: laneTop + row * ROW_H + 28, class: 'rsi-fix' });
      if (point.kind === 'rejected') fix.append(el('tspan', {}, `Rejected · ${point.reason}`));
      else { fix.append(el('tspan', { class: 'rsi-chevron' }, '> ')); fix.append(el('tspan', {}, point.fix)); }
      group.append(fix);
      callouts.append(group);
      leaders.append(el('line', { x1: px, y1: laneTop + row * ROW_H + BOX_H, x2: px, y2: py, class: 'rsi-leader' }));
    });
    svg.append(leaders);

    for (const point of points) {
      const px = x(point.x);
      if (point.kind === 'rejected') {
        svg.append(el('path', { d: `M${px - 5} ${rejectY - 5} L${px + 5} ${rejectY + 5} M${px + 5} ${rejectY - 5} L${px - 5} ${rejectY + 5}`, class: 'rsi-reject' }));
        continue;
      }
      const py = y(valueOf(point));
      if (point.kind === 'frozen') {
        svg.append(el('polygon', { points: `${px},${py - 8} ${px + 8},${py} ${px},${py + 8} ${px - 8},${py}`, class: 'rsi-frozen' }));
      } else {
        svg.append(el('circle', { cx: px, cy: py, r: 5.5, class: 'rsi-point' }));
      }
      const last = point.x === slots - 1;
      svg.append(el('text', {
        x: last ? px - 10 : px + 10, y: py - 9, 'text-anchor': last ? 'end' : 'start', class: 'rsi-value',
      }, valueOf(point).toFixed(1)));
      if (point.kind === 'initial') {
        const tagY = py + 34 <= rejectY - 8 ? py + 12 : py - 40;
        const tag = el('g', { class: 'rsi-tag', 'data-x': px - 12, 'data-y': tagY });
        tag.append(el('rect', { x: px - 12, y: tagY, width: 96, height: 20, rx: 3 }));
        tag.append(el('text', { x: px - 4, y: tagY + 14 }, 'Initial harness'));
        svg.append(tag);
      }
    }
    svg.append(callouts);
    canvas.replaceChildren(svg);
    requestAnimationFrame(() => fit(svg, width));
  }

  // Size callouts to their (possibly translated) text and keep each row free of overlaps.
  function fit(svg, width) {
    const rows = new Map();
    for (const group of svg.querySelectorAll('.rsi-callout')) {
      const texts = [...group.querySelectorAll('text')];
      let textWidth = 0;
      for (const text of texts) {
        try { textWidth = Math.max(textWidth, text.getComputedTextLength()); } catch { textWidth = Math.max(textWidth, 150); }
      }
      const item = { group, w: Math.ceil(textWidth) + 16, cx: Number(group.dataset.cx) };
      const row = group.dataset.row;
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push(item);
    }
    for (const items of rows.values()) {
      items.sort((a, b) => a.cx - b.cx);
      let cursor = 4;
      for (const item of items) {
        item.left = Math.max(cursor, Math.min(item.cx - item.w / 2, width - 4 - item.w));
        cursor = item.left + item.w + 8;
      }
      const overflow = items[items.length - 1].left + items[items.length - 1].w - (width - 4);
      if (overflow > 0) {
        for (let index = items.length - 1; index >= 0; index--) {
          const limit = index === 0 ? 4 : items[index - 1].left + items[index - 1].w + 8;
          items[index].left = Math.max(limit, items[index].left - overflow);
        }
      }
      for (const item of items) {
        const { group, left, w } = item;
        const topY = Number(group.dataset.top);
        const rect = group.querySelector('rect');
        rect.setAttribute('x', left);
        rect.setAttribute('width', w);
        group.querySelectorAll('text').forEach(text => text.setAttribute('x', left + 8));
        const index = [...svg.querySelectorAll('.rsi-callout')].indexOf(group);
        const leader = svg.querySelectorAll('.rsi-leader')[index];
        if (leader) {
          const px = Number(group.dataset.px);
          leader.setAttribute('x1', Math.min(left + w - 10, Math.max(left + 10, px)));
          leader.setAttribute('y1', topY + BOX_H);
        }
      }
    }
    const tag = svg.querySelector('.rsi-tag');
    if (tag) {
      const text = tag.querySelector('text');
      let textWidth = 86;
      try { textWidth = text.getComputedTextLength(); } catch {}
      tag.querySelector('rect').setAttribute('width', Math.ceil(textWidth) + 16);
    }
  }

  function drawAll() { canvases.forEach(draw); }
  function refresh() {
    if (!data) return;
    for (const canvas of canvases) {
      const width = Math.round(canvas.clientWidth || 0);
      const svg = canvas.querySelector('svg');
      if (!svg || Math.abs(width - (drawnWidth.get(canvas) || 0)) > 24) draw(canvas);
      else fit(svg, drawnWidth.get(canvas));
    }
  }

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(refresh);
  });
  if (select) select.addEventListener('change', () => { metric = select.value; if (data) drawAll(); });

  fetch(dataURL)
    .then(response => { if (!response.ok) throw new Error('Snapshot unavailable'); return response.json(); })
    .then(json => {
      if (!json || !Array.isArray(json.panels) || !json.run || !json.run.denominator) throw new Error('Invalid snapshot');
      data = json;
      if (select && axisTitles[select.value]) metric = select.value;
      if (controls) controls.hidden = false;
      if (fallback) fallback.hidden = true;
      drawAll();
    })
    .catch(() => { if (panelsBox) panelsBox.hidden = true; });
})();
