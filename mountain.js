/* Mountain-climb leaderboard: every entry is a climber whose altitude is its score,
 * the flag marks the unconquered summit (score = max). ES module, zero dependencies.
 *
 * Markup:
 *   <figure class="mountain" data-mountain>
 *     <script type="application/json">{ "title": "…", "items": [ … ] }</script>
 *     <div class="mountain-canvas"></div>
 *   </figure>
 *   <script type="module" src="mountain.js"></script>
 *
 * The module mounts every [data-mountain] element once the DOM is ready; calling
 * mountMountains() again (or mountain(el, data) twice) re-renders in place. */

const NS = "http://www.w3.org/2000/svg";
const DEFAULTS = {
  compactBreakpoint: 700, // px; below this the pills move under the drawing
  headingLevel: 3,
  table: true,            // emit a ranked <table class="mountain-table"> when the page has none
  minGap: 28,             // px; minimum centre distance between two markers
  markerRadius: 11,
  leaderRadius: 15,
  aspect: 0.6,            // drawing height / width (1200 × 720)
  compactAspect: 0.75     // 4:3 on small screens
};

/* Terrain in unit coordinates: [x / width, altitude above the base line, 0..1 = summit]. */
const PEAK = [[-0.06, 0], [0.02, 0.06], [0.07, 0.17], [0.11, 0.14], [0.17, 0.29], [0.21, 0.26], [0.26, 0.42], [0.30, 0.39], [0.345, 0.55], [0.375, 0.53], [0.42, 0.73], [0.445, 0.71], [0.475, 0.88], [0.5, 1], [0.525, 0.87], [0.555, 0.84], [0.59, 0.72], [0.62, 0.69], [0.665, 0.52], [0.70, 0.47], [0.75, 0.34], [0.79, 0.30], [0.84, 0.18], [0.885, 0.15], [0.94, 0.06], [1.06, 0]];
const SNOW = [[0.42, 0.73], [0.445, 0.71], [0.475, 0.88], [0.5, 1], [0.525, 0.87], [0.555, 0.84], [0.59, 0.72], [0.60, 0.69], [0.592, 0.63], [0.578, 0.66], [0.567, 0.585], [0.552, 0.63], [0.541, 0.555], [0.531, 0.60], [0.52, 0.505], [0.506, 0.57], [0.495, 0.495], [0.484, 0.56], [0.471, 0.525], [0.461, 0.60], [0.451, 0.565], [0.441, 0.63], [0.431, 0.61], [0.425, 0.68]];
const SNOW_TONGUES = [
  [[0.462, 0.605], [0.482, 0.575], [0.478, 0.46], [0.470, 0.43], [0.464, 0.47]],
  [[0.512, 0.545], [0.531, 0.565], [0.535, 0.43], [0.526, 0.37], [0.519, 0.44]],
  [[0.556, 0.61], [0.573, 0.585], [0.592, 0.50], [0.585, 0.465], [0.571, 0.53]],
  [[0.388, 0.52], [0.404, 0.565], [0.416, 0.535], [0.412, 0.485], [0.398, 0.475]],
  [[0.628, 0.60], [0.646, 0.585], [0.662, 0.525], [0.652, 0.50], [0.636, 0.535]]
];
const SHADE = [[0.5, 1], [0.515, 0.80], [0.53, 0.62], [0.56, 0.45], [0.585, 0.28], [0.62, 0.12], [0.66, 0], [1.06, 0], [0.94, 0.06], [0.885, 0.15], [0.84, 0.18], [0.79, 0.30], [0.75, 0.34], [0.70, 0.47], [0.665, 0.52], [0.62, 0.69], [0.59, 0.72], [0.555, 0.84], [0.525, 0.87]];
const STRIAE = [
  [[0.36, 0.53], [0.33, 0.40], [0.29, 0.30], [0.23, 0.16]],
  [[0.41, 0.66], [0.39, 0.50], [0.35, 0.36], [0.31, 0.20]],
  [[0.66, 0.50], [0.69, 0.36], [0.74, 0.22], [0.80, 0.10]],
  [[0.60, 0.66], [0.64, 0.48], [0.68, 0.30], [0.71, 0.14]]
];
const FAR = [[-0.06, 0], [0.0, 0.22], [0.05, 0.18], [0.10, 0.36], [0.15, 0.30], [0.20, 0.44], [0.25, 0.40], [0.31, 0.52], [0.36, 0.48], [0.42, 0.56], [0.5, 0.6], [0.58, 0.55], [0.64, 0.58], [0.70, 0.48], [0.75, 0.52], [0.80, 0.40], [0.86, 0.44], [0.92, 0.28], [0.97, 0.32], [1.06, 0.16], [1.06, 0]];
const MID = [[-0.06, 0], [0.0, 0.10], [0.06, 0.20], [0.10, 0.18], [0.16, 0.36], [0.20, 0.30], [0.24, 0.33], [0.29, 0.24], [0.34, 0.28], [0.38, 0.18], [0.42, 0.24], [0.47, 0.12], [0.53, 0.14], [0.58, 0.08], [0.63, 0.16], [0.68, 0.22], [0.72, 0.20], [0.77, 0.34], [0.82, 0.42], [0.86, 0.32], [0.90, 0.36], [0.95, 0.22], [1.0, 0.28], [1.06, 0.12], [1.06, 0]];
const MID_CAPS = [
  [[0.135, 0.29], [0.16, 0.36], [0.185, 0.31], [0.175, 0.30], [0.16, 0.32], [0.148, 0.30]],
  [[0.795, 0.37], [0.82, 0.42], [0.845, 0.36], [0.835, 0.35], [0.82, 0.37], [0.807, 0.355]]
];
const FOOT = [[-0.06, 0], [0.04, 0.05], [0.12, 0.03], [0.20, 0.075], [0.28, 0.04], [0.36, 0.06], [0.45, 0.02], [0.55, 0.05], [0.64, 0.03], [0.73, 0.08], [0.82, 0.045], [0.9, 0.07], [1.06, 0.03], [1.06, 0]];
const ROUTE = [[0.34, 0], [0.30, 0.10], [0.39, 0.20], [0.33, 0.33], [0.43, 0.44], [0.40, 0.56], [0.47, 0.68], [0.455, 0.80], [0.49, 0.92], [0.5, 1]];
/* Horizontal spread sequence for markers of one side, indexed by order within that side. */
const SPREAD = [0.45, 0.78, 0.22, 0.6, 0.92, 0.35, 0.7, 0.12, 0.52, 0.85, 0.3, 0.65];

let counter = 0;
const instances = new WeakMap();

/* ---------- small helpers ---------- */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v) => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
const fmt = (v, unit) => {
  const s = num(Number(v) || 0);
  return unit === "%" ? `${s}%` : unit ? `${s} ${unit}` : s;
};
function h(tag, attrs, parent, text) {
  const n = document.createElement(tag);
  for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
function s(tag, attrs, parent, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
const px = (v) => (Math.round(v * 10) / 10).toString();

function frame(W, compact, o) {
  const aspect = compact ? o.compactAspect : W < 1000 ? Math.max(o.aspect, 0.7) : o.aspect;
  const H = Math.round(W * aspect);
  const base = H - (compact ? 26 : 30);
  const summit = Math.round(H * (compact ? 0.27 : 0.13));
  return { W, H, base, summit, range: base - summit, cx: W / 2, compact };
}
const pt = (f, p) => [p[0] * f.W, f.base - p[1] * f.range];
const pts = (f, list) => list.map((p) => pt(f, p).map(px).join(",")).join(" ");

/* Catmull-Rom spline through the points, as a cubic path. */
function smoothPath(list) {
  let d = `M${px(list[0][0])},${px(list[0][1])}`;
  for (let i = 0; i < list.length - 1; i++) {
    const p0 = list[i - 1] || list[i], p1 = list[i], p2 = list[i + 1], p3 = list[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${px(c1[0])},${px(c1[1])} ${px(c2[0])},${px(c2[1])} ${px(p2[0])},${px(p2[1])}`;
  }
  return d;
}

/* Horizontal extent of a closed polygon (pixel coordinates) along the line y. */
function extentAt(poly, y) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
      const x = a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

/* Deterministic collision resolution: sweep x outward in 6px steps inside [lo, hi],
 * then allow small vertical nudges; never places two markers closer than gap. */
function resolve(x, y, lo, hi, placed, gap) {
  const free = (X, Y) => placed.every((p) => Math.hypot(p.x - X, p.y - Y) >= gap);
  const dys = [0, -3, 3, -6, 6, -9, 9, -12, 12];
  for (const dy of dys) {
    for (let d = 0; d <= Math.max(hi - lo, 1) + 6; d += 6) {
      for (const X of d === 0 ? [x] : [x + d, x - d]) {
        if (X < lo - 0.5 || X > hi + 0.5) continue;
        if (free(X, y + dy)) return { x: X, y: y + dy };
      }
    }
  }
  let best = { x, y }, score = -1; // last resort: the least crowded spot
  for (let X = lo; X <= hi; X += 4) {
    const m = Math.min(...placed.map((p) => Math.hypot(p.x - X, p.y - y)), Infinity);
    if (m > score) { score = m; best = { x: X, y }; }
  }
  return best;
}

function normalise(data) {
  const d = Object.assign({ unit: "", max: 100, items: [], trails: [] }, data || {});
  const max = Number(d.max) > 0 ? Number(d.max) : 100;
  const items = (d.items || []).map((it) => ({
    label: String(it.label ?? it.name ?? ""), value: Number(it.value) || 0,
    group: it.group ?? "", kind: it.kind || "public", rank: it.rank
  }));
  items.sort((a, b) => (b.value - a.value) || String(a.label).localeCompare(String(b.label)));
  items.forEach((it, i) => { if (!Number.isFinite(Number(it.rank))) it.rank = i + 1; });
  items.sort((a, b) => a.rank - b.rank);
  return { ...d, max, items, trails: Array.isArray(d.trails) ? d.trails : [] };
}

/* ---------- component ---------- */
export function mountain(el, data, options = {}) {
  let inst = instances.get(el);
  if (inst) { inst.update(data, options); return inst; }
  const o = Object.assign({}, DEFAULTS, options);
  const id = el.id || `mountain-${++counter}`;
  let d = normalise(data);
  let canvas = el.querySelector(":scope > .mountain-canvas") || h("div", { class: "mountain-canvas" }, el);
  let lastWidth = -1, raf = 0, ro = null;
  el.classList.add("mountain");

  function render() {
    el.classList.add("mountain--ready"); // reveals the canvas before it is measured
    const width = canvas.clientWidth;
    if (!width) return; // hidden (closed tab, display:none): the ResizeObserver re-schedules when visible
    lastWidth = width;
    const compact = width < o.compactBreakpoint;
    el.classList.toggle("mountain--compact", compact);
    el.classList.toggle("mountain--narrow", !compact && width < 1000); // shorter pills keep the drawing wide
    canvas.replaceChildren();

    /* Header */
    const head = h("div", { class: "mountain-head" }, canvas);
    const headText = h("div", { class: "mountain-head-text" }, head);
    if (d.title) h(`h${o.headingLevel}`, { class: "mountain-title" }, headText, d.title);
    if (d.subtitle) h("p", { class: "mountain-subtitle" }, headText, d.subtitle);
    if (compact && d.date) h("p", { class: "mountain-stamp" }, head, d.date);

    /* Stage: drawing + pills */
    const stage = h("div", { class: "mountain-stage" }, canvas);
    /* Trails need vertical room on phones: a taller compact drawing keeps labels off the markers. */
    const f = frame(width, compact, d.trails.length ? { ...o, compactAspect: Math.max(o.compactAspect, 0.9) } : o);
    const svg = s("svg", {
      class: "mountain-svg", viewBox: `0 0 ${f.W} ${f.H}`, width: f.W, height: f.H,
      role: "img", "aria-labelledby": `${id}-title ${id}-desc`, focusable: "false"
    }, stage);
    const leader = d.items[0];
    const n = d.items.length;
    s("title", { id: `${id}-title` }, svg, `${d.title || "Leaderboard"}: ${n} entries climbing by ${d.metric || "score"}.`);
    s("desc", { id: `${id}-desc` }, svg, leader
      ? `Altitude is ${d.metric || "score"}; the summit flag marks ${fmt(d.max, d.unit)}. Leader: ${leader.label} at ${fmt(leader.value, d.unit)}. Full ranking in the table below.`
      : "No entries yet.");
    svg.setAttribute("aria-label", `${d.title || "Leaderboard"}: ${n} entries climbing by ${d.metric || "score"}${leader ? `; leader ${leader.label} at ${fmt(leader.value, d.unit)}` : ""}.`);

    const pills = h("ol", { class: "mountain-pills", "aria-label": `Ranked entries by ${d.metric || "score"}` }, stage);
    const pillOf = new Map();
    d.items.forEach((it) => {
      const right = it.rank % 2 === 1;
      const li = h("li", {
        class: `mountain-pill mountain-pill--${right ? "right" : "left"}${it.kind === "internal" ? " mountain-pill--internal" : ""}`,
        "data-rank": it.rank, "aria-describedby": `${id}-d${it.rank}`
      }, pills);
      const badge = h("span", { class: `mountain-badge${it.rank <= 3 ? ` mountain-badge--${["gold", "silver", "bronze"][it.rank - 1]}` : ""}`, "aria-hidden": "true" }, li, String(it.rank));
      badge.dataset.rank = it.rank;
      h("span", { class: "mountain-vh" }, li, `Rank ${it.rank}: `);
      h("span", { class: "mountain-pill-label" }, li, it.label);
      h("span", { class: "mountain-pill-value" }, li, fmt(it.value, d.unit));
      pillOf.set(it.rank, li);
    });

    /* Column geometry from the measured pills (desktop only). */
    const gutter = 16;
    let leftEdge = 0, rightEdge = f.W, maxL = 0, maxR = 0, nL = 0, nR = 0;
    if (!compact) {
      pillOf.forEach((li, rank) => {
        const w = li.offsetWidth;
        if (rank % 2 === 1) { maxR = Math.max(maxR, w); nR++; } else { maxL = Math.max(maxL, w); nL++; }
      });
      leftEdge = gutter + maxL; rightEdge = f.W - gutter - maxR;
    }

    /* Marker placement. */
    const peakPx = PEAK.map((p) => pt(f, p));
    const r0 = compact ? Math.max(9, o.markerRadius - 2) : o.markerRadius;
    const rLead = compact ? Math.max(12, o.leaderRadius - 2) : o.leaderRadius;
    const placed = [];
    const byLabel = new Map();
    const trailTo = new Map(d.trails.map((t) => [t.from, t.to]));
    const sideCount = { 1: 0, "-1": 0 };
    d.items.forEach((it) => {
      const side = it.rank % 2 === 1 ? 1 : -1;
      const k = sideCount[side]++;
      const r = it.rank === 1 ? rLead : r0;
      const y = Math.max(f.summit + 1, f.base - clamp(it.value / d.max, 0, 1) * f.range);
      const ext = extentAt(peakPx, y) || [f.cx - r, f.cx + r];
      let lo, hi;
      if (side > 0) { lo = Math.max(f.cx + 0.03 * f.W, ext[0] + r + 4); hi = Math.min(ext[1] - r - 4, rightEdge - r - 14, f.W - r - 6); }
      else { hi = Math.min(f.cx - 0.03 * f.W, ext[1] - r - 4); lo = Math.max(ext[0] + r + 4, leftEdge + r + 14, r + 6); }
      if (lo > hi) { const m = clamp((lo + hi) / 2, leftEdge + r + 14, rightEdge - r - 14); lo = hi = m; }
      let x = lo + SPREAD[k % SPREAD.length] * (hi - lo);
      const to = trailTo.get(it.label);
      if (to && byLabel.has(to)) x = clamp(byLabel.get(to).x + side * 0.07 * f.W, lo, hi);
      const p = resolve(x, y, lo, hi, placed, o.minGap);
      const m = { ...p, r, item: it, side };
      placed.push(m); byLabel.set(it.label, m);
    });
    /* Trail endpoints that are not ranked entries become unlabeled waypoints. */
    d.trails.forEach((t) => {
      [["from", t.fromValue], ["to", t.toValue]].forEach(([key, v]) => {
        const label = t[key];
        if (byLabel.has(label) || !Number.isFinite(Number(v))) return;
        const other = byLabel.get(t[key === "from" ? "to" : "from"]);
        const side = other ? other.side : 1;
        const y = Math.max(f.summit + 1, f.base - clamp(Number(v) / d.max, 0, 1) * f.range);
        const ext = extentAt(peakPx, y) || [f.cx - r0, f.cx + r0];
        const lo = Math.max(ext[0] + r0 + 4, leftEdge + r0 + 14), hi = Math.min(ext[1] - r0 - 4, rightEdge - r0 - 14);
        const x0 = other ? clamp(other.x + side * 0.08 * f.W, lo, hi) : f.cx;
        const p = resolve(x0, y, Math.min(lo, hi), Math.max(lo, hi), placed, o.minGap);
        const m = { ...p, r: r0 - 2, item: { label, value: Number(v), kind: t.kind || "internal", rank: null }, side, synthetic: true };
        placed.push(m); byLabel.set(label, m);
      });
    });

    /* Pill positions: bottom-aligned stacks on both sides, ranks ascending downwards. */
    const pillH = 28;
    const cols = { 1: [], "-1": [] };
    if (!compact) {
      const nSide = Math.max(nL, nR, 1);
      const bottom = f.base - 6;
      const pitch = clamp(Math.floor((bottom - f.H * 0.38) / nSide), 30, 34);
      const top = bottom - nSide * pitch;
      const idx = { 1: 0, "-1": 0 };
      d.items.forEach((it) => {
        const side = it.rank % 2 === 1 ? 1 : -1;
        const li = pillOf.get(it.rank);
        const w = li.offsetWidth;
        const yTop = top + idx[side]++ * pitch + (pitch - pillH) / 2;
        li.style.top = `${px(yTop)}px`;
        li.style.left = side > 0 ? `${px(f.W - gutter - w)}px` : `${px(gutter)}px`;
        cols[side].push({ rank: it.rank, cy: yTop + pillH / 2, inner: side > 0 ? f.W - gutter - w - 3 : gutter + w + 3, top: yTop, bottom: yTop + pillH });
      });
    }

    /* ---------- drawing ---------- */
    const defs = s("defs", {}, svg);
    const sky = s("linearGradient", { id: `${id}-sky`, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    s("stop", { offset: "0", class: "mtn-sky-top" }, sky);
    s("stop", { offset: "1", class: "mtn-sky-low" }, sky);
    const haze = s("linearGradient", { id: `${id}-haze`, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    s("stop", { offset: "0", class: "mtn-haze-top" }, haze);
    s("stop", { offset: "1", class: "mtn-haze-low" }, haze);

    s("rect", { class: "mtn-sky", x: 0, y: 0, width: f.W, height: f.base, fill: `url(#${id}-sky)` }, svg);
    const scene = s("g", { class: "mtn-scene", "aria-hidden": "true" }, svg);
    s("polygon", { class: "mtn-far", points: pts(f, FAR) }, scene);
    s("polygon", { class: "mtn-mid", points: pts(f, MID) }, scene);
    MID_CAPS.forEach((c) => s("polygon", { class: "mtn-cap", points: pts(f, c) }, scene));
    s("rect", { class: "mtn-haze", x: 0, y: f.base - f.range * 0.42, width: f.W, height: f.range * 0.42 + 1, fill: `url(#${id}-haze)` }, scene);
    s("polygon", { class: "mtn-near", points: pts(f, PEAK) }, scene);
    s("polygon", { class: "mtn-snow", points: pts(f, SNOW) }, scene);
    SNOW_TONGUES.forEach((t) => s("polygon", { class: "mtn-snow", points: pts(f, t) }, scene));
    s("polygon", { class: "mtn-shade", points: pts(f, SHADE) }, scene);
    STRIAE.forEach((l) => s("polyline", { class: "mtn-stria", points: pts(f, l) }, scene));
    s("polygon", { class: "mtn-foot", points: pts(f, FOOT) }, scene);
    s("polygon", { class: "mtn-outline", points: pts(f, PEAK) }, scene);
    s("polygon", { class: "mtn-outline mtn-outline--foot", points: pts(f, FOOT) }, scene);

    /* Contour lines every 25 % with a label where the pill columns leave room. */
    const contours = s("g", { class: "mtn-contours" }, scene);
    const labelFont = 12;
    [0.25, 0.5, 0.75].forEach((a) => {
      const y = f.base - a * f.range;
      s("line", { class: "mtn-contour", x1: 0, y1: px(y), x2: f.W, y2: px(y) }, contours);
      const text = `${num(a * d.max)}${d.unit === "%" ? "%" : ""}`;
      const collides = (col) => col.some((c) => y - labelFont - 4 < c.bottom && y + 2 > c.top - 4);
      if (!collides(cols[1])) s("text", { class: "mtn-contour-label", x: f.W - 10, y: px(y - 5), "text-anchor": "end" }, contours, text);
      else if (!collides(cols["-1"])) s("text", { class: "mtn-contour-label", x: 10, y: px(y - 5) }, contours, text);
    });
    s("line", { class: "mtn-base", x1: 0, y1: f.base + 0.5, x2: f.W, y2: f.base + 0.5 }, scene);
    s("text", { class: "mtn-contour-label", x: f.W - 10, y: f.base + 16, "text-anchor": "end" }, scene, `0${d.unit === "%" ? "%" : ""} · base camp`);

    /* Route and flag. */
    s("path", { class: "mtn-route", d: smoothPath(ROUTE.map((p) => pt(f, p))), fill: "none" }, scene);
    const top = pt(f, [0.5, 1]);
    const poleH = compact ? Math.min(34, Math.max(26, f.summit - 30)) : Math.max(34, f.H * 0.075);
    s("line", { class: "mtn-pole", x1: px(top[0]), y1: px(top[1]), x2: px(top[0]), y2: px(top[1] - poleH) }, scene);
    const fw = Math.max(22, f.W * 0.028), fh = fw * 0.62, fx = top[0] + 1, fy = top[1] - poleH;
    s("path", { class: "mtn-flag", d: `M${px(fx)},${px(fy)} Q${px(fx + fw * 0.55)},${px(fy + fh * 0.2)} ${px(fx + fw)},${px(fy + fh * 0.5)} Q${px(fx + fw * 0.55)},${px(fy + fh * 0.8)} ${px(fx)},${px(fy + fh)} Z` }, scene);
    if (d.peakLabel) {
      if (compact) s("text", { class: "mtn-peak-label", x: px(f.cx), y: 18, "text-anchor": "middle" }, scene, d.peakLabel);
      else s("text", { class: "mtn-peak-label", x: px(fx + fw + 10), y: px(fy + 12) }, scene, d.peakLabel);
    }
    if (!compact && d.date) s("text", { class: "mtn-stamp", x: f.W - 16, y: 26, "text-anchor": "end" }, scene, d.date);

    /* Connectors (pill → marker); straight, from the pill's inner edge, so they never cross a pill. */
    const connectors = s("g", { class: "mtn-connectors" }, scene);
    const connOf = new Map();
    if (!compact) {
      [1, -1].forEach((side) => cols[side].forEach((c) => {
        const m = placed.find((p) => p.item.rank === c.rank);
        if (!m) return;
        const dx = m.x - c.inner, dy = m.y - c.cy, len = Math.hypot(dx, dy) || 1;
        const ex = m.x - (dx / len) * (m.r + 3), ey = m.y - (dy / len) * (m.r + 3);
        connOf.set(c.rank, s("line", { class: "mtn-connector", x1: px(c.inner), y1: px(c.cy), x2: px(ex), y2: px(ey) }, connectors));
      }));
    }

    /* Trails: dashed climbing arrow from the baseline marker to the improved one. */
    const trails = s("g", { class: "mtn-trails" }, scene);
    d.trails.forEach((t) => {
      const a = byLabel.get(t.from), b = byLabel.get(t.to);
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len, ny = dx / len;
      const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      const bow = Math.min(0.22 * len, 60);
      /* Bow (and label) on the outer side of the trail: for a steep trail that is the side away from the summit line. */
      const side = a.side || 1;
      const inward = Math.abs(nx) >= 0.45 ? nx * side < 0 : ((mid[0] + nx * bow) - f.cx) * side < 0;
      if (inward) { nx = -nx; ny = -ny; }
      const c = [mid[0] + nx * bow, mid[1] + ny * bow];
      const sa = [c[0] - a.x, c[1] - a.y], la = Math.hypot(...sa) || 1;
      const sb = [c[0] - b.x, c[1] - b.y], lb = Math.hypot(...sb) || 1;
      const p0 = [a.x + (sa[0] / la) * (a.r + 5), a.y + (sa[1] / la) * (a.r + 5)];
      const p1 = [b.x + (sb[0] / lb) * (b.r + 3.5), b.y + (sb[1] / lb) * (b.r + 3.5)]; // arrowhead touches the ring
      const g = s("g", { class: "mtn-trail" }, trails);
      s("path", { class: "mtn-trail-path", d: `M${px(p0[0])},${px(p0[1])} Q${px(c[0])},${px(c[1])} ${px(p1[0])},${px(p1[1])}`, fill: "none" }, g);
      const tx = p1[0] - c[0], ty = p1[1] - c[1], tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const tip = p1, back = [tip[0] - ux * 9, tip[1] - uy * 9];
      s("polygon", { class: "mtn-trail-head", points: `${px(tip[0])},${px(tip[1])} ${px(back[0] - uy * 4)},${px(back[1] + ux * 4)} ${px(back[0] + uy * 4)},${px(back[1] - ux * 4)}` }, g);
      if (t.label) {
        const q = [0.25 * p0[0] + 0.5 * c[0] + 0.25 * p1[0], 0.25 * p0[1] + 0.5 * c[1] + 0.25 * p1[1]];
        /* On a steep trail the label hangs off its outer side (anchored at the inner edge) so it never crosses back over the trail or the markers. */
        const steep = Math.abs(nx) >= 0.45, off = steep ? 9 : 14;
        s("text", { class: "mtn-trail-label", x: px(q[0] + nx * off), y: px(q[1] + ny * off + 4), "text-anchor": steep ? (nx > 0 ? "start" : "end") : "middle" }, g, t.label);
      }
    });

    /* Markers. Drawn last so they sit above route, trails and snow. */
    const markers = s("g", { class: "mtn-markers" }, svg);
    const markerOf = new Map();
    placed.forEach((m) => {
      const it = m.item;
      const cls = ["mtn-marker"];
      if (it.rank === 1) cls.push("mtn-marker--leader");
      if (it.rank === 2) cls.push("mtn-marker--silver");
      if (it.rank === 3) cls.push("mtn-marker--bronze");
      if (it.kind === "internal") cls.push("mtn-marker--internal");
      if (m.synthetic) cls.push("mtn-marker--waypoint");
      const g = s("g", { class: cls.join(" "), transform: `translate(${px(m.x)} ${px(m.y)})` }, markers);
      s("circle", { class: "mtn-marker-halo", r: m.r + 6 }, g);
      if (it.kind === "internal") s("circle", { class: "mtn-marker-ring", r: m.r + 4.5 }, g);
      s("circle", { class: "mtn-marker-dot", r: m.r }, g);
      if (!m.synthetic) {
        s("text", { class: "mtn-marker-num", "text-anchor": "middle", dy: "0.36em" }, g, String(it.rank));
        s("text", { class: "mtn-marker-val", "text-anchor": "middle", y: -(m.r + 8) }, g, fmt(it.value, d.unit));
        s("desc", { id: `${id}-d${it.rank}` }, g, `${fmt(it.value, d.unit)} ${d.metric || ""}; rank ${it.rank} of ${n}${it.group ? `; ${it.group}` : ""}${it.kind === "internal" ? "; internal study" : ""}.`);
        markerOf.set(it.rank, g);
      } else {
        s("title", {}, g, `${it.label}: ${fmt(it.value, d.unit)}`);
      }
    });

    /* Hover / focus linking between pills and markers. */
    pillOf.forEach((li, rank) => {
      const g = markerOf.get(rank), line = connOf.get(rank);
      const set = (on) => { li.classList.toggle("is-active", on); g && g.classList.toggle("is-active", on); line && line.classList.toggle("is-active", on); };
      li.addEventListener("mouseenter", () => set(true));
      li.addEventListener("mouseleave", () => set(false));
      if (g) { g.addEventListener("mouseenter", () => set(true)); g.addEventListener("mouseleave", () => set(false)); }
    });

    /* Caption + legend. */
    const caption = h("div", { class: "mountain-caption" }, canvas);
    const noteParts = [];
    if (d.metric) noteParts.push(`Altitude = ${d.metric}${d.unit ? ` (${d.unit})` : ""}; summit = ${fmt(d.max, d.unit)}`);
    if (d.date) noteParts.push(d.date);
    if (d.caption) noteParts.push(d.caption);
    h("p", { class: "mountain-note" }, caption, noteParts.join(" · "));
    const legend = h("ul", { class: "mountain-legend", "aria-label": "Legend" }, caption);
    const key = (cls, text) => { const li = h("li", {}, legend); h("i", { class: `mtn-key ${cls}`, "aria-hidden": "true" }, li); li.appendChild(document.createTextNode(text)); };
    if (n) key("mtn-key--gold", "rank 1");
    if (d.items.some((i) => i.kind !== "internal")) key("mtn-key--public", "public result");
    if (d.items.some((i) => i.kind === "internal") || d.trails.length) key("mtn-key--internal", "internal study");
    if (d.trails.length) key("mtn-key--trail", d.trailLegend || "gain with harness");

    /* Ranked table for no-JS and screen readers: keep the page's own, or emit one. */
    let table = el.querySelector(":scope > .mountain-table, :scope > .mountain-details .mountain-table, :scope > .mountain-table-wrap .mountain-table");
    if (!table && o.table) {
      table = h("table", { class: "mountain-table" });
      h("caption", {}, table, `${d.title || "Leaderboard"} — ranked by ${d.metric || "score"}${d.date ? ` (${d.date})` : ""}.`);
      const tr = h("tr", {}, h("thead", {}, table));
      h("th", { scope: "col" }, tr, "#");
      h("th", { scope: "col" }, tr, "Entry");
      if (d.items.some((i) => i.group)) h("th", { scope: "col" }, tr, "Group");
      h("th", { scope: "col" }, tr, d.metric || "Score");
      const tb = h("tbody", {}, table);
      d.items.forEach((it) => {
        const row = h("tr", {}, tb);
        h("td", {}, row, String(it.rank));
        h("th", { scope: "row" }, row, it.label + (it.kind === "internal" ? " (internal study)" : ""));
        if (d.items.some((i) => i.group)) h("td", {}, row, it.group);
        h("td", {}, row, fmt(it.value, d.unit));
      });
      el.appendChild(table);
    }
    if (table && !table.closest(".mountain-details")) {
      const details = h("details", { class: "mountain-details" });
      h("summary", {}, details, `Ranked list · ${n} ${n === 1 ? "entry" : "entries"}`);
      table.replaceWith(details);
      details.appendChild(table);
    }
  }

  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { if (canvas.clientWidth !== lastWidth) render(); });
  }

  inst = {
    el, render,
    update(next, opts) {
      if (next) d = normalise(next);
      if (opts) Object.assign(o, opts);
      lastWidth = -1; render();
    },
    destroy() {
      ro && ro.disconnect(); cancelAnimationFrame(raf);
      instances.delete(el); el.classList.remove("mountain--ready", "mountain--compact", "mountain--narrow");
    }
  };
  instances.set(el, inst);
  render();
  if (typeof ResizeObserver === "function") { ro = new ResizeObserver(schedule); ro.observe(canvas); }
  else window.addEventListener("resize", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lastWidth = -1; schedule(); }).catch(() => {});
  return inst;
}

export function mountMountains(root = document) {
  const out = [];
  root.querySelectorAll("[data-mountain]").forEach((el) => {
    const script = el.querySelector(':scope > script[type="application/json"]');
    let data = null;
    try { data = script ? JSON.parse(script.textContent) : null; }
    catch (err) { el.classList.add("mountain--error"); return; }
    if (!data) return;
    const opts = {};
    if (el.dataset.headingLevel) opts.headingLevel = Number(el.dataset.headingLevel);
    if (el.dataset.compactBreakpoint) opts.compactBreakpoint = Number(el.dataset.compactBreakpoint);
    out.push(mountain(el, data, opts));
  });
  return out;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mountMountains(), { once: true });
  else mountMountains();
}
