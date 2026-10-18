// InferenceNet professional-task STORY renderer (16:9, same visual language as replay.js and agent-replay-demo-v2).
// Loads ?data=<json> (schema inferencenet-protask-story/1, built by build_story_data.py) and draws the stage for any
// time t (ms). Numbers and sentences come from the data file; only fixed labels and short descriptive captions are
// written here. Helpers are copied from replay.js so that file stays untouched.
"use strict";
(() => {
  const params = new URLSearchParams(location.search);
  const DATA_URL = params.get("data") || "data/fin-story.json";
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const C = {
    model: "#f0925f", harness: "#b9a4f7", sandbox: "#73d59c", scorer: "#8fadd6", pass: "#73d59c", fail: "#f2777a",
    warn: "#e6c069", brand: "#8fadd6", fg: "#dbe1ea", dim: "#7f8899", faint: "#364052", edge: "#222b39", off: "#4a5468",
  };
  const ROLE_KEYS = ["model", "harness", "sandbox", "scorer"];
  const NODE_X = [394, 558, 722, 886];
  const TRACK_Y = 128;
  const KINDS = {
    csv: { color: "#6cc4c0", label: "CSV" }, xlsx: { color: "#8fcf8a", label: "XLSX" }, docx: { color: "#7fa8e8", label: "DOCX" },
    pdf: { color: "#e8857f", label: "PDF" }, html: { color: "#e0b46a", label: "HTML" }, log: { color: "#9aa3b2", label: "LOG" },
  };
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

  // ---------- helpers (copied from replay.js) ----------
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const clamp01 = (x) => clamp(x, 0, 1);
  const lerp = (a, b, p) => a + (b - a) * clamp01(p);
  const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  const easeBack = (x) => { x = clamp01(x); const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const bump = (dt, rise = 160, fall = 1100) => (dt < 0 ? 0 : dt < rise ? dt / rise : Math.max(0, 1 - (dt - rise) / fall));
  const num = (v) => typeof v === "number" && Number.isFinite(v);
  const has = (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
  const pad2 = (n) => String(n).padStart(2, "0");
  const word = (n) => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtW = (w) => (Math.abs(w - Math.round(w)) < 1e-9 ? String(Math.round(w)) : String(Number(w.toFixed(2))));
  const fmt2 = (x) => `${x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtAmount = (x) => (num(x) ? `${fmt2(x)} CNY` : "—");
  const ext = (name) => String(name || "").split(".").pop().toLowerCase();
  const kindOf = (k) => KINDS[k] || { color: "#9aa3b2", label: String(k || "file").toUpperCase().slice(0, 4) };
  function mmss(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h ? `${h}:${pad2(m)}:${pad2(sec % 60)}` : `${pad2(m)}:${pad2(sec % 60)}`;
  }
  function minSec(sec) {
    sec = Math.round(sec || 0);
    const m = Math.floor(sec / 60);
    return m ? `${m} min ${sec % 60} s` : `${sec} s`;
  }
  const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a})`;
  function mulberry32(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function el(tag, cls, style, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (style) node.setAttribute("style", style);
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function setText(node, text) { if (node.__t !== text) { node.textContent = text; node.__t = text; } }
  function setHTML(node, html) { if (node.__h !== html) { node.innerHTML = html; node.__h = html; } }
  function css(node, prop, value) { const k = `__${prop}`; if (node[k] !== value) { node.style[prop] = value; node[k] = value; } }
  function show(node, a) { css(node, "opacity", a.toFixed(3)); css(node, "visibility", a > 0.001 ? "visible" : "hidden"); }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function svgEl(svg, tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    svg.append(node);
    return node;
  }
  const cleanText = (s) => String(s ?? "").replace(/\ufeff/g, "").replace(/\r/g, "").replace(/\t/g, "  ").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "·");
  const oneLine = (s) => cleanText(s).replace(/\s+/g, " ").trim();
  function fitFont(node, maxW, maxPx, minPx) {
    let px = maxPx;
    node.style.fontSize = `${px}px`;
    while (px > minPx && node.scrollWidth > maxW + 0.5) { px -= 1; node.style.fontSize = `${px}px`; }
    return px;
  }
  function icon(kind, size, color, sw = 2.4) {
    const body = {
      model: `<path d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z" fill="${color}"/>`,
      harness: `<path d="M12 2.5 L20.5 7.25 V16.75 L12 21.5 L3.5 16.75 V7.25 Z" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" fill="${color}"/>`,
      sandbox: `<rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="${color}" stroke-width="${sw}"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.2" fill="${color}"/>`,
      scorer: `<circle cx="12" cy="12" r="8.8" fill="none" stroke="${color}" stroke-width="${sw}"/><circle cx="12" cy="12" r="3.6" fill="${color}"/>`,
      task: `<rect x="4.5" y="2.5" width="15" height="19" rx="2.5" fill="none" stroke="${color}" stroke-width="${sw * 0.9}"/><path d="M8.5 8 H15.5 M8.5 12 H15.5 M8.5 16 H12.5" stroke="${color}" stroke-width="${sw * 0.9}" stroke-linecap="round"/>`,
      check: `<circle cx="12" cy="12" r="9.6" fill="none" stroke="${color}" stroke-width="${sw * 0.9}"/><path d="M7.3 12.4 L10.6 15.7 L16.8 8.7" fill="none" stroke="${color}" stroke-width="${sw * 1.1}" stroke-linecap="round" stroke-linejoin="round"/>`,
      cross: `<circle cx="12" cy="12" r="9.6" fill="none" stroke="${color}" stroke-width="${sw * 0.9}"/><path d="M8.6 8.6 L15.4 15.4 M15.4 8.6 L8.6 15.4" stroke="${color}" stroke-width="${sw * 1.1}" stroke-linecap="round"/>`,
      partial: `<circle cx="12" cy="12" r="9.6" fill="none" stroke="${color}" stroke-width="${sw * 0.9}"/><path d="M12 4.4 A7.6 7.6 0 0 1 12 19.6 Z" fill="${color}"/>`,
      alert: `<path d="M12 3 L21.5 20 H2.5 Z" fill="none" stroke="${color}" stroke-width="${sw * 0.9}" stroke-linejoin="round"/><path d="M12 9.5 V14" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="${color}"/>`,
      search: `<circle cx="10.5" cy="10.5" r="6.8" fill="none" stroke="${color}" stroke-width="${sw}"/><path d="M15.6 15.6 L21 21" stroke="${color}" stroke-width="${sw * 1.1}" stroke-linecap="round"/>`,
      improve: `<path d="M19.5 12 A7.5 7.5 0 1 1 15.8 5.5" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/><path d="M14.2 2.6 L16.6 5.7 L13.4 8" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`,
    }[kind] || "";
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24">${body}</svg>`;
  }
  function fileIcon(kind, size) {
    const c = kindOf(kind).color;
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M5.5 2.5 H14.5 L19 7 V21.5 H5.5 Z" fill="${rgba(c, 0.13)}" stroke="${c}" stroke-width="1.7" stroke-linejoin="round"/>`
      + `<path d="M14.5 2.5 V7 H19" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/><rect x="8" y="12.2" width="8" height="1.9" rx=".9" fill="${c}"/><rect x="8" y="16" width="5.5" height="1.9" rx=".9" fill="${c}"/></svg>`;
  }
  function todoIcon(status, size) {
    if (status === "completed") return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${C.model}"/><path d="M7.6 12.3 L10.7 15.3 L16.5 8.9" fill="none" stroke="#0b1017" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (status === "in_progress") return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4" fill="none" stroke="${C.model}" stroke-width="2.2"/><path d="M12 6 A6 6 0 0 1 12 18 Z" fill="${C.model}"/></svg>`;
    if (status === "pending") return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4" fill="none" stroke="${C.off}" stroke-width="2.2"/></svg>`;
    return "";
  }
  function lockSVG(size, color, open) {
    const lift = (4.6 * open).toFixed(2);
    const swing = (3.4 * open).toFixed(2);
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24">`
      + `<path d="M8 11 V7.6 a4 4 0 0 1 8 0 V11" transform="translate(${swing} ${-lift})" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`
      + `<rect x="4.5" y="10.5" width="15" height="11" rx="2.4" fill="${color}"/><circle cx="12" cy="15.6" r="1.6" fill="#0b1017"/></svg>`;
  }
  function spinnerSVG(size, color, t) {
    const a = ((t / 2.4) % 360).toFixed(0);
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="${rgba(color, 0.25)}" stroke-width="2.6"/>`
      + `<path d="M12 4 A8 8 0 0 1 20 12" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" transform="rotate(${a} 12 12)"/></svg>`;
  }
  function renderRings(svg, cx, cy, tt, color, r0, r1, period, count = 2) {
    if (!svg.__rings) svg.__rings = Array.from({ length: count }, () => svgEl(svg, "circle", { cx, cy, fill: "none", "stroke-width": 1.6 }));
    svg.__rings.forEach((c, k) => {
      const q = (((tt / period) + k / count) % 1 + 1) % 1;
      c.setAttribute("r", (r0 + (r1 - r0) * easeOut(q)).toFixed(1));
      c.setAttribute("stroke", color);
      c.setAttribute("opacity", (0.55 * (1 - q)).toFixed(3));
    });
  }
  const placePtc = (node, x, y, rot, s, a) => {
    node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${rot.toFixed(1)}deg) scale(${s.toFixed(3)})`;
    node.style.opacity = a.toFixed(3);
  };

  // ---------- boot ----------
  let readyResolve;
  let readyReject;
  window.replayReady = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });
  window.replayReady.catch(() => {});
  async function boot() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`cannot load ${DATA_URL} (HTTP ${res.status})`);
      const data = await res.json();
      await Promise.all(["400 13px Inter", "500 13px Inter", "600 13px Inter", "700 13px Inter", "800 13px Inter", "italic 500 13px Inter"]
        .map((f) => document.fonts.load(f)));
      await document.fonts.ready;
      build(data);
      readyResolve(window.replay.total);
    } catch (err) {
      $("err").innerHTML = `<div class="ab" style="left:40px;top:300px;width:1200px;white-space:normal;font:600 22px/30px var(--sans);color:#f2777a">Story failed: ${esc(err && err.message || err)}</div>`;
      console.error(err);
      readyReject(err);
    }
  }

  // =====================================================================================================
  function build(D) {
    if (D.schema !== "inferencenet-protask-story/1") throw new Error(`unexpected schema ${D.schema}`);
    const Q = D.question || {};
    const T = D.task || {};
    const SC = D.scene || {};
    const E = D.entries || [];
    const AC = D.across || [];
    const RB = D.rubric || {};
    const A = D.agent || {};
    const RV = D.reveals || [];
    const RS = D.result || {};
    const PV = D.provenance || {};
    const JU = RB.judge || {};
    const MODEL = (A.usage && A.usage.returned_models && A.usage.returned_models.length ? A.usage.returned_models.join(" / ") : A.model) || "model";
    const HARNESS = A.harness || "harness";
    const JMODEL = JU.usage && JU.usage.returned_models && JU.usage.returned_models.length ? JU.usage.returned_models.join(" / ") : JU.configured_model;
    const JDEFAULT = JU.configured_model && JMODEL && JU.configured_model !== JMODEL ? JU.configured_model : null;
    const U = A.usage || {};
    const isPos = (c) => c.group !== "gating" && !c.negate;
    const isPen = (c) => c.group !== "gating" && c.negate;
    const wOf = (c) => (num(c.weight) ? Math.abs(c.weight) : 1);
    const COUNTS = RS.counts || {};
    const N_PEN = (COUNTS.penalty_clear || 0) + (COUNTS.penalty_triggered || 0);
    const N_RED = (COUNTS.redline_clear || 0) + (COUNTS.redline_triggered || 0);
    const REWARD = num(RS.reward) ? RS.reward : null;

    // ---------- agent segments: key steps, montage parts, report step, end card ----------
    const KS = A.key_steps || [];
    const MONT = A.montage || { steps: [] };
    const REP = A.report_step;
    const splits = KS.map((k) => k.i).filter((i) => i > MONT.from && i < MONT.to).sort((a, b) => a - b);
    const parts = [];
    {
      let cur = [];
      let si = 0;
      for (const s of MONT.steps || []) {
        while (si < splits.length && s.i > splits[si]) { if (cur.length) parts.push(cur); cur = []; si++; }
        cur.push(s);
      }
      if (cur.length) parts.push(cur);
    }
    const SEGS = [
      ...KS.map((k) => ({ type: k.kind === "plan" ? "plan" : k.kind === "say" ? "say" : "tool", step: k, i: k.i })),
      ...parts.map((p, n) => ({ type: "montage", steps: p, i: p[0].i, part: n })),
      ...(REP ? [{ type: "report", step: REP, i: REP.i }] : []),
    ].sort((a, b) => a.i - b.i);
    SEGS.push({ type: "stats", i: Infinity });
    const lastIndex = (sg) => (sg.type === "montage" ? sg.steps[sg.steps.length - 1].i : sg.type === "say" && sg.step.also && sg.step.also.length ? sg.step.also[sg.step.also.length - 1].i : sg.i);
    const realEndOf = (sg) => {
      if (sg.type === "montage") return sg.steps[sg.steps.length - 1].t_s;
      const st = sg.type === "say" && sg.step.also && sg.step.also.length ? sg.step.also[sg.step.also.length - 1] : sg.step;
      return num(st.end_s) ? st.end_s : st.t_s;
    };
    let prevI = -1;
    let prevReal = 0;
    for (const sg of SEGS) {
      sg.ms = sg.type === "tool" ? (sg.step.is_error ? 4100 : 3600) : sg.type === "plan" ? 3100 : sg.type === "say" ? 4400
        : sg.type === "montage" ? Math.round(1000 + 90 * sg.steps.length) : sg.type === "report" ? 4100 : 2200;
      if (sg.type !== "stats") {
        sg.skipped = Math.max(0, sg.i - prevI - 1);
        sg.prevReal = prevReal;
        prevI = lastIndex(sg);
        prevReal = realEndOf(sg);
      }
    }
    const AGENT_MS = sum(SEGS.map((s) => s.ms));

    // ---------- timeline ----------
    const PH = [];
    const add = (kind, ms, ch) => PH.push({ kind, ms, ch });
    add("open", 4800, -1);
    add("card", 1300, 0); add("task", 10400, 0);
    add("card", 1300, 1); add("agent", AGENT_MS, 1);
    add("card", 1300, 2); add("check", 19400, 2);
    add("result", 4800, 3); add("outro", 5200, 3);
    let acc = 0;
    for (const ph of PH) { ph.start = acc; acc += ph.ms; ph.end = acc; }
    const TOTAL = acc;
    const P = (kind) => PH.find((x) => x.kind === kind);
    const OPEN = P("open"); const TASK = P("task"); const AG = P("agent"); const CK = P("check"); const RSP = P("result"); const OUT = P("outro");
    {
      let t0 = AG.start;
      for (const sg of SEGS) { sg.start = t0; t0 += sg.ms; sg.end = t0; }
    }
    const phaseIndexAt = (t) => { const i = PH.findIndex((x) => t < x.end); return i < 0 ? PH.length - 1 : i; };
    const segAt = (t) => SEGS.find((s) => t < s.end) || SEGS[SEGS.length - 1];
    // when each entry's decision lands on the checklist: as its section appears in the report's doc view
    // (row j reaches opacity 0.6 at doc-phase q = (0.108 + 0.15 j) / 1.25, see renderAgent)
    const REPSEG = SEGS.find((s) => s.type === "report");
    const LAND = E.map((e, j) => {
      if (!REPSEG) return Infinity;
      const ph = segPhases(REPSEG);
      const a = ph[ph.findIndex(([n]) => n === "doc") - 1][1];
      return REPSEG.start + REPSEG.ms * (a + (1 - a) * ((0.108 + 0.15 * j) / 1.25));
    });

    const CHAPTERS = [
      { label: "TASK", icon: "task", color: C.brand, title: "The task", sub: `One ${String(T.domain_en || "").toLowerCase()} task, ${E.length} pending entries, a sealed rubric` },
      { label: "AGENT", icon: "model", color: C.model, title: "The agent works", sub: `${MODEL} works through ${HARNESS}, inside the container` },
      { label: "CHECK", icon: "scorer", color: C.scorer, title: "Independent check", sub: JU.mode ? `${cap1(JU.mode)}, after the agent has finished` : "The rubric is unsealed" },
      { label: "RESULT", icon: "check", color: C.scorer, title: "Result", sub: "" },
    ];
    const CAPS = [];
    const cap = (from, to, text, sub) => { if (to > from && has(text)) CAPS.push({ from, to, text, sub }); };

    // ---------- top bar ----------
    const RAIL = { x: 356, w: 648 };
    const CH_W = RAIL.w / CHAPTERS.length;
    CHAPTERS.forEach((c, i) => {
      const ps = PH.filter((x) => x.ch === i);
      c.start = ps[0].start;
      c.end = ps[ps.length - 1].end;
      c.node = el("div", "chap", `left:${RAIL.x + i * CH_W}px;width:${CH_W}px`);
      c.node.innerHTML = `<i>${pad2(i + 1)}</i>${c.label}`;
      c.track = el("div", "track", `left:${RAIL.x + i * CH_W + 12}px;width:${CH_W - 24}px`);
      c.fill = el("b");
      c.fill.style.background = c.color;
      c.track.append(c.fill);
      $("rail").append(c.node, c.track);
    });

    // ---------- pipeline ----------
    const ROLES = [
      { key: "model", label: "MODEL", sub: MODEL }, { key: "harness", label: "HARNESS", sub: HARNESS },
      { key: "sandbox", label: "SANDBOX", sub: "Docker container" }, { key: "scorer", label: "JUDGE", sub: JMODEL || "judge" },
    ];
    const NODES = ROLES.map((r, i) => {
      const node = el("div", "card", `left:${NODE_X[i] - 79}px;top:72px;width:158px;height:44px;border-radius:9px`);
      node.innerHTML = `<div class="ab" style="left:9px;top:13px">${icon(r.key, 18, C[r.key])}</div>`
        + `<div class="ab kick" style="left:34px;top:6px;color:${C[r.key]}">${r.label}</div>`
        + `<div class="ab dim clip sans" style="left:34px;top:22px;width:118px;font-size:11px;line-height:16px">${esc(r.sub)}</div>`;
      $("nodes").append(node);
      return node;
    });
    const railSvg = $("railsvg");
    svgEl(railSvg, "line", { x1: NODE_X[0], y1: TRACK_Y, x2: NODE_X[3], y2: TRACK_Y, stroke: "#222b39", "stroke-width": 2, "stroke-linecap": "round" });
    const TICKS = NODE_X.map((x) => svgEl(railSvg, "circle", { cx: x, cy: TRACK_Y, r: 3.4, fill: "#2b3546" }));
    const TOKEN_GLOW = svgEl(railSvg, "circle", { cy: TRACK_Y, r: 15, opacity: 0 });
    const TOKEN_RING = svgEl(railSvg, "circle", { cy: TRACK_Y, r: 8, fill: "none", "stroke-width": 1.6, opacity: 0 });
    const TOKEN = svgEl(railSvg, "circle", { cy: TRACK_Y, r: 6.5, opacity: 0 });
    const railX = (pos) => { const i = Math.min(2, Math.floor(pos)); return NODE_X[i] + (NODE_X[i + 1] - NODE_X[i]) * (pos - i); };

    // =================================================================== 01 the task
    const STK = $("sc-task");
    // (a) scene card
    const scene = el("div", "card", "left:28px;top:140px;width:1224px;height:456px");
    STK.append(scene);
    scene.append(el("div", "ab kick brand", "left:24px;top:18px", ["THE TASK", T.id, has(T.version) ? `v${T.version}` : null].filter(has).join(" · ")));
    const sTitle = el("div", "ab sans clip", "left:24px;top:42px;width:720px;font-weight:600;line-height:40px;color:#fff", T.title_zh || "");
    scene.append(sTitle);
    fitFont(sTitle, 720, 32, 20);
    scene.append(el("div", "ab sans dim clip", "left:24px;top:86px;width:720px;font-size:15px;line-height:21px", T.title_en || ""));
    scene.append(el("div", "ab kick dim", "left:24px;top:124px;font-weight:400;font-size:10.5px", "ROLE"));
    scene.append(el("div", "ab sans fg clip", "left:72px;top:120px;width:672px;font-size:15px;line-height:21px", T.role_zh || ""));
    scene.append(el("div", "ab sans dim clip", "left:72px;top:141px;width:672px;font-size:12px;line-height:17px", T.role_en || ""));
    const BRIEF = (T.brief || []).filter((b) => b && (has(b.zh) || has(b.en)));
    const bPitch = BRIEF.length ? Math.min(52, 270 / BRIEF.length) : 52;
    const BULLETS = BRIEF.map((b, i) => {
      const row = el("div", "ab", `left:24px;top:${176 + i * bPitch}px;width:720px;height:${bPitch}px`);
      row.append(el("div", "ab", `left:0;top:2px;width:20px;height:20px;border:1.5px solid ${rgba(C.brand, 0.7)};border-radius:6px;text-align:center;font:700 11px/17px var(--mono);color:${C.brand}`, String(i + 1)));
      row.append(el("div", "ab sans fg clip", "left:32px;top:0;width:688px;font-size:15px;line-height:22px", b.zh || b.en));
      if (has(b.zh) && has(b.en)) row.append(el("div", "ab sans dim clip", "left:32px;top:22px;width:688px;font-size:12px;line-height:17px", b.en));
      scene.append(row);
      return row;
    });
    // right side: profile chips, materials strip, deliverables
    const R0 = 790;
    scene.append(el("div", "ab", `left:${R0 - 22}px;top:20px;height:416px;border-left:1px solid #222b39`));
    const chips = el("div", "ab", `left:${R0}px;top:16px;display:flex;gap:8px`);
    chips.innerHTML = [
      has(T.domain_en) ? `<span class="chipi sans" style="color:${C.brand}">${esc([T.domain_en, T.domain_zh].filter(has).join(" · "))}</span>` : "",
      has(T.difficulty) ? `<span class="chipi" style="color:#aeb6c4">difficulty ${esc(T.difficulty)}</span>` : "",
      has(T.complexity) ? `<span class="chipi" style="color:#aeb6c4">complexity ${esc(T.complexity)}</span>` : "",
    ].join("");
    scene.append(chips);
    if (num(T.expert_minutes)) {
      const h = T.expert_minutes / 60;
      scene.append(el("div", "ab kick dim", `left:${R0}px;top:58px;font-weight:400;font-size:10.5px`, "EXPERT ESTIMATE"));
      scene.append(el("div", "ab sans fg", `left:${R0}px;top:74px;font-weight:600;font-size:34px;line-height:42px`,
        T.expert_minutes >= 90 ? `≈${Number((Math.round(h * 2) / 2).toFixed(1))} h` : `≈${Math.round(T.expert_minutes)} min`));
    }
    const KB = Object.entries(SC.materials_by_kind || {}).sort((a, b) => b[1] - a[1]);
    scene.append(el("div", "ab kick dim", `left:${R0}px;top:136px;font-weight:400;font-size:10.5px`, "INPUT FILES"));
    scene.append(el("div", "ab sans fg", `left:${R0}px;top:152px;font-weight:600;font-size:22px;line-height:28px`, num(SC.materials) ? String(SC.materials) : ""));
    {
      const strip = el("div", "ab", `left:${R0}px;top:188px;width:410px;height:12px;border-radius:4px;overflow:hidden;display:flex;gap:2px`);
      const tot = sum(KB.map(([, n]) => n)) || 1;
      strip.innerHTML = KB.map(([k, n]) => `<span style="display:block;height:12px;width:${((n / tot) * 410).toFixed(1)}px;background:${kindOf(k).color}"></span>`).join("");
      scene.append(strip);
      const leg = el("div", "ab", `left:${R0}px;top:208px;display:flex;gap:12px;align-items:center;font-size:11.5px`);
      leg.innerHTML = KB.map(([k, n]) => `<span style="display:inline-flex;align-items:center;gap:5px;color:${kindOf(k).color}">${fileIcon(k, 14)}${n} ${kindOf(k).label}</span>`).join("");
      scene.append(leg);
    }
    scene.append(el("div", "ab kick dim", `left:${R0}px;top:250px;font-weight:400;font-size:10.5px`, "TO DELIVER"));
    (T.deliverables || []).slice(0, 3).forEach((d, j) => {
      const row = el("div", "ab", `left:${R0}px;top:${272 + j * 58}px;width:410px;height:50px`);
      const ic = el("div", "ab", "left:0;top:4px");
      ic.innerHTML = fileIcon(d.kind || ext(d.name), 24);
      row.append(ic, el("div", "ab sans clip", "left:34px;top:0;width:376px;font-weight:600;font-size:13.5px;line-height:19px;color:#e8edf3", d.name),
        el("div", "ab sans dim clip", "left:34px;top:20px;width:376px;font-size:12px;line-height:17px", d.desc_en || d.desc_zh || ""));
      scene.append(row);
    });
    // (b) six entry cards
    const EW = 397;
    const EH = 157;
    const ENTRY_CARDS = E.map((e, j) => {
      const x = 28 + (j % 3) * (EW + 16);
      const y = 140 + Math.floor(j / 3) * (EH + 12);
      const card = el("div", "ent", `left:${x}px;top:${y}px;width:${EW}px;height:${EH}px`);
      card.append(el("div", "ab", "left:14px;top:12px", null));
      card.lastChild.innerHTML = `<span class="eid">${esc(e.id)}</span><span class="sans" style="margin-left:9px;font-size:14px;color:#e8edf3">${esc(e.object)}</span>`;
      card.append(el("div", "pill dim sans", "right:12px;top:13px", e.status_zh || ""));
      card.append(el("div", "ab sans clamp", "left:14px;top:44px;width:369px;font-size:15px;line-height:21px;color:#fff;-webkit-line-clamp:2", e.proposal_zh || ""));
      card.append(el("div", "ab sans clamp dim", "left:14px;top:90px;width:369px;font-size:12px;line-height:16px;-webkit-line-clamp:2", e.title_en || ""));
      card.append(el("div", "ab mono", `left:14px;top:128px;font-size:13px;line-height:18px;color:${num(e.amount) ? "#c3cbd6" : C.off}`, fmtAmount(e.amount)));
      STK.append(card);
      return { card, x, y, tx: 40, ty: 112 + j * 80 };
    });
    // (c) sealed rubric
    const sealed = el("div", "ab", `left:28px;top:484px;width:1224px;height:104px;border:1.5px solid ${rgba(C.scorer, 0.6)};border-radius:10px;background:rgba(14,20,30,.96)`);
    const sealedIc = el("div", "ab", "left:28px;top:30px");
    sealedIc.innerHTML = lockSVG(42, C.scorer, 0);
    sealed.append(sealedIc,
      el("div", "ab kick scorer", "left:92px;top:24px", "RUBRIC SEALED"),
      el("div", "ab sans fg", "left:92px;top:44px;font-weight:600;font-size:21px;line-height:30px",
        `${RB.scored} scored criteria · ${RB.penalties} penalty checks · ${RB.red_lines} red lines — the agent never sees it`));
    STK.append(sealed);
    const TA = 4000;
    const TB = 8300;
    const TFLY = 9950;
    cap(TASK.start, TASK.start + TA, `The task: ${T.title_en || T.title_zh || T.id}`, esc(T.role_en || ""));
    {
      const statuses = [...new Set(E.map((e) => e.status_zh).filter(has))];
      cap(TASK.start + TA, TASK.start + TB, `The shared-service centre filed ${word(E.length)} pending entries`,
        `${E.map((e) => esc(e.id)).join(" · ")}${statuses.length === 1 ? ` · all ${esc(statuses[0])}` : ""}`);
    }
    cap(TASK.start + TB, TASK.end, "The scoring rubric stays sealed. The agent never sees it.",
      `${RB.scored} scored criteria · ${RB.penalties} penalty checks · ${RB.red_lines} red lines`);

    // =================================================================== 02 the agent works
    const SAG = $("sc-agent");
    // left: the six entries as a checklist
    const chk = el("div", "card", "left:28px;top:72px;width:264px;height:524px");
    SAG.append(chk);
    chk.append(el("div", "ab kick brand", "left:16px;top:13px", "PENDING ENTRIES"));
    chk.append(el("div", "ab dim sans", "left:16px;top:31px;font-size:11px;line-height:15px", "icons: its own plan · badges: its decision"));
    // the todo that names this entry and no other (the "read all … (D01-D06)" item names two)
    const todoFor = (todos, id) => (todos || []).find((td) => {
      const m = String(td.text || "").match(/\bD0\d\b/g) || [];
      return m.length === 1 && m[0] === id;
    }) || null;
    const CHK = E.map((e, j) => {
      const row = el("div", "chk", `top:${52 + j * 78}px;height:76px`);
      const ic = el("div", "ab", "left:8px;top:5px");
      const head = el("div", "ab", "left:28px;top:3px");
      head.innerHTML = `<span class="eid" style="font-size:11.5px;line-height:18px;padding:0 6px">${esc(e.id)}</span><span class="sans" style="margin-left:7px;font-size:12px;color:#aeb6c4">${esc(e.object)}</span>`;
      const prop = el("div", "ab sans clamp", "left:8px;top:26px;width:226px;font-size:12.5px;line-height:17px;color:#c9d1dc;-webkit-line-clamp:2", e.proposal_zh || "");
      const dec = el("div", "ab sans clamp", "left:8px;top:26px;width:226px;font-size:11.5px;line-height:15px;color:#e8edf3;-webkit-line-clamp:3");
      dec.innerHTML = `<span class="dec ${e.decision.kind === "accept" ? "accept" : "reject"}">${e.decision.kind === "accept" ? "ACCEPT" : "REJECT"}</span> ${esc(e.decision.summary_en || "")}`;
      row.append(ic, head, prop, dec);
      chk.append(row);
      return { e, row, ic, prop, dec };
    });
    // centre: session card and its views
    const cMain = el("div", "card", "left:312px;top:140px;width:656px;height:456px");
    SAG.append(cMain);
    const vThink = el("div", "layer");
    const thinkRings = document.createElementNS(NS, "svg");
    thinkRings.setAttribute("width", "240"); thinkRings.setAttribute("height", "240"); thinkRings.setAttribute("viewBox", "0 0 240 240");
    thinkRings.setAttribute("style", "position:absolute;left:520px;top:132px;overflow:visible");
    const thinkIc = el("div", "ab", "left:608px;top:220px");
    thinkIc.innerHTML = icon("model", 64, C.model);
    const thinkTitle = el("div", "ab sans ctr", "left:312px;width:656px;top:316px;color:#fff;font-weight:600;font-size:24px;line-height:30px", `${MODEL} is working`);
    const thinkNext = el("div", "ab ctr clip", "left:332px;width:616px;top:354px;font-size:13.5px;color:#aeb6c4");
    const thinkTime = el("div", "ab sans ctr model", "left:312px;width:656px;top:382px;font-weight:600;font-size:30px;line-height:38px");
    const thinkSkip = el("div", "ab ctr dim", "left:312px;width:656px;top:428px;font-size:12.5px");
    vThink.append(thinkRings, thinkIc, thinkTitle, thinkNext, thinkTime, thinkSkip);
    SAG.append(vThink);
    const vCode = el("div", "layer");
    const cdIc = el("div", "ab", "left:332px;top:157px");
    const cdTitle = el("div", "ab sans fg clip", "left:360px;top:154px;width:430px;font-weight:600;font-size:16px;line-height:24px");
    const cdStatus = el("div", "ab", "right:332px;top:156px;display:flex;align-items:center;gap:7px;font-size:12.5px");
    const cdBarBox = el("div", "ab", "left:332px;top:188px;width:616px;height:2px;background:#1c2431;overflow:hidden");
    const cdBar = el("div", "ab", `left:0;top:0;height:2px;width:160px;background:linear-gradient(90deg, transparent, ${C.sandbox}, transparent)`);
    cdBarBox.append(cdBar);
    const cdCode = el("div", "codebox", "left:332px;top:200px;width:616px");
    const cdDiv = el("div", "divider", "left:332px;width:616px;top:360px", "output");
    const cdOut = el("div", "outbox", "left:332px;top:384px;width:616px");
    const cdStamp = el("div", "ab", `left:770px;top:392px;padding:3px 16px;border:3px solid ${C.fail};border-radius:8px;color:${C.fail};font:800 30px/38px var(--sans);letter-spacing:.14em;background:rgba(11,16,23,.9)`, "ERROR");
    vCode.append(cdIc, cdTitle, cdStatus, cdBarBox, cdCode, cdDiv, cdOut, cdStamp);
    SAG.append(vCode);
    const vPlan = el("div", "layer");
    const plIc = el("div", "ab", "left:332px;top:157px");
    plIc.innerHTML = icon("harness", 18, C.harness);
    const plTitle = el("div", "ab sans harness", "left:360px;top:154px;font-weight:600;font-size:16px;line-height:24px", "TodoWrite · its own plan");
    const plRows = el("div", "ab", "left:332px;top:196px;width:616px;height:380px");
    vPlan.append(plIc, plTitle, plRows);
    SAG.append(vPlan);
    const vSay = el("div", "layer");
    const sayIc = el("div", "ab", "left:332px;top:157px");
    sayIc.innerHTML = icon("model", 18, C.model);
    const sayWho = el("div", "ab sans model", "left:360px;top:154px;font-weight:600;font-size:16px;line-height:24px", `${MODEL} · message`);
    const sayText = el("div", "ab sans clamp", `left:352px;top:214px;width:576px;padding-left:16px;border-left:3px solid ${C.model};font-style:italic;font-weight:500;font-size:22px;line-height:32px;color:#f4e6dc;-webkit-line-clamp:5`);
    vSay.append(sayIc, sayWho, sayText);
    SAG.append(vSay);
    const vTick = el("div", "layer");
    const tkIc = el("div", "ab", "left:332px;top:157px");
    tkIc.innerHTML = icon("sandbox", 18, C.sandbox);
    const tkTitle = el("div", "ab sans sandbox", "left:360px;top:154px;font-weight:600;font-size:16px;line-height:24px", "Reading the materials");
    const tkRange = el("div", "ab dim", "right:332px;top:157px;font-size:12.5px");
    const tkVp = el("div", "ab", "left:332px;top:196px;width:616px;height:384px;overflow:hidden;-webkit-mask-image:linear-gradient(to bottom, transparent 0, #000 40px)");
    const tkIn = el("div", "ab", "left:0;top:0;width:616px");
    tkVp.append(tkIn);
    vTick.append(tkIc, tkTitle, tkRange, tkVp);
    SAG.append(vTick);
    const vDoc = el("div", "layer");
    const vStats = el("div", "layer");
    SAG.append(vDoc, vStats);
    // right: run counters and the agent's plan
    const run = el("div", "card", "left:988px;top:72px;width:264px;height:228px");
    SAG.append(run);
    run.append(el("div", "ab", "left:15px;top:13px", null));
    run.lastChild.innerHTML = icon("harness", 16, C.harness);
    run.append(el("div", "ab kick harness", "left:38px;top:15px", "RUN"));
    run.append(el("div", "ab dim", "left:16px;top:44px;font-size:12px", "real time"));
    const rClock = el("div", "ab sans fg", "left:16px;top:60px;font-weight:600;font-size:32px;line-height:40px");
    const rStep = el("div", "ab dim", "right:16px;top:76px;font-size:12px");
    run.append(rClock, rStep);
    run.append(el("div", "ab dim", "left:16px;top:110px;font-size:12px", "files read"));
    const rFiles = el("div", "ab fg", "right:16px;top:110px;font-size:12px");
    const rFilesNote = el("div", "ab dim", "left:16px;top:181px;font-size:10.5px;line-height:14px");
    run.append(rFiles, rFilesNote);
    const GRID = { x: 16, y: 132, w: 232, h: 46 };
    const NMAT = num(SC.materials) ? SC.materials : 0;
    const gcols = 11;
    const grows = Math.max(1, Math.ceil(NMAT / gcols));
    const gcw = (GRID.w - (gcols - 1) * 3) / gcols;
    const gch = Math.min(10, (GRID.h - (grows - 1) * 3) / grows);
    const CELLS = Array.from({ length: NMAT }, (_, j) => {
      const node = el("div", "ab", `left:${GRID.x + (j % gcols) * (gcw + 3)}px;top:${GRID.y + Math.floor(j / gcols) * (gch + 3)}px;width:${gcw}px;height:${gch}px;border-radius:2px;background:#1c2431`);
      run.append(node);
      return node;
    });
    const rToolsLbl = el("div", "ab dim", "left:16px;top:202px;font-size:12px", "tool calls in the run");
    const rTools = el("div", "ab fg", "right:16px;top:202px;font-size:12px");
    run.append(rToolsLbl, rTools);
    const plan = el("div", "card", "left:988px;top:312px;width:264px;height:284px");
    SAG.append(plan);
    plan.append(el("div", "ab", "left:15px;top:13px", null));
    plan.lastChild.innerHTML = icon("model", 16, C.model);
    plan.append(el("div", "ab kick model", "left:38px;top:15px", "ITS PLAN"));
    const planCount = el("div", "ab", "right:16px;top:14px;font-size:12px");
    plan.append(planCount, el("div", "ab dim sans", "left:16px;top:36px;font-size:11px;line-height:16px", "TodoWrite, as the agent updates it"));
    const PLANS = (A.plans || []).slice().sort((a, b) => a.i - b.i);
    const maxTodos = Math.max(0, ...PLANS.map((p) => (p.todos || []).length));
    const PROW_H = maxTodos ? Math.min(26, (284 - 62) / maxTodos) : 26;
    const PROWS = Array.from({ length: maxTodos }, (_, j) => {
      const row = el("div", "ab", `left:12px;top:${58 + j * PROW_H}px;width:240px;height:${PROW_H - 2}px;border-radius:5px`);
      const ic = el("div", "ab", `left:6px;top:${(PROW_H - 2 - 14) / 2}px`);
      const tx = el("div", "ab sans clip", `left:28px;top:${(PROW_H - 2 - 16) / 2}px;width:206px;font-size:11.5px;line-height:16px`);
      row.append(ic, tx);
      plan.append(row);
      return { row, ic, tx };
    });

    // files read: exact union of files in the shown steps up to the end of the montage window
    const FILE_EVENTS = [];
    {
      const seen = new Set();
      const push = (files, at) => { for (const f of files || []) if (!seen.has(f)) { seen.add(f); FILE_EVENTS.push({ f, at, color: kindOf(ext(f)).color }); } };
      for (const sg of SEGS) {
        if (sg.type === "stats" || sg.i > MONT.to) continue;
        if (sg.type === "montage") sg.steps.forEach((s, n) => push(s.files, sg.start + (n + 0.6) * (sg.ms * 0.9 / sg.steps.length)));
        else if (sg.type === "tool") push(sg.step.files, sg.start + sg.ms * 0.47);
      }
    }
    const MONT_END_STEP = (MONT.to ?? -1) + 1;
    const STATS = SEGS[SEGS.length - 1];

    // the plan in force at a segment: latest plan step with index ≤ the segment's last step
    const planAtIndex = (i) => { let p = null; for (const pl of PLANS) if (pl.i <= i) p = pl; return p; };
    const segPlan = (sg) => (sg.type === "stats" ? PLANS[PLANS.length - 1] || null : planAtIndex(sg.type === "montage" ? sg.steps[sg.steps.length - 1].i : sg.i));

    // ---------- centre view builders ----------
    const BORING = /^\s*(python3?\s+(-c\s*)?["']?\s*$|python3?\s*<<-?\s*['"]?\w+['"]?\s*$|import\s+[\w., ]+$|from\s+\S+\s+import\s+.+$|PYEOF\s*$|["']\s*\)?\s*(2>\/dev\/null)?\s*$|$)/;
    const codeLines = (detail, max = 7) => {
      const lines = cleanText(detail).split("\n").map((l) => l.replace(/\s+$/, ""));
      const good = lines.filter((l) => !BORING.test(l));
      return (good.length ? good : lines.filter((l) => l.trim())).slice(0, max);
    };
    const outLines = (result, isErr, max = 9) => {
      const raw = cleanText(result).split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
      if (isErr && raw.length > max) return [raw[0], ...raw.slice(-(max - 1))];
      return raw.slice(0, max);
    };
    // per-segment prepared content
    for (const sg of SEGS) {
      if (sg.type === "tool" || sg.type === "report") {
        sg.code = codeLines(sg.step.detail, sg.type === "report" ? 6 : 7);
        sg.out = outLines(sg.step.result, sg.step.is_error, 8);
        sg.title = `${sg.step.tool || "Bash"} · ${oneLine(sg.step.label || "")}`;
      } else if (sg.type === "say") {
        const also = (sg.step.also || [])[0];
        sg.text = oneLine(sg.step.text || "");
        if (also) { sg.code = codeLines(also.detail, 7); sg.out = outLines(also.result, also.is_error, 8); sg.title = `${also.tool || "Bash"} · ${oneLine(also.label || "")}`; sg.also = also; }
      } else if (sg.type === "montage") {
        sg.rows = sg.steps.map((s) => {
          const row = el("div", "ab", "left:0;width:616px;height:34px");
          const f = (s.files || [])[0] || "";
          row.innerHTML = `<div class="ab dim" style="left:0;top:8px;font-size:11.5px">+${mmss(s.t_s)}</div>`
            + `<div class="ab" style="left:58px;top:7px">${fileIcon(ext(f), 18)}</div>`
            + `<div class="ab sans clip" style="left:84px;top:1px;width:530px;font-weight:600;font-size:13px;line-height:18px;color:#e8edf3">${esc(f)}</div>`
            + `<div class="ab sans dim clip" style="left:84px;top:18px;width:530px;font-size:11.5px;line-height:15px">${esc(oneLine(s.label || ""))}</div>`;
          tkIn.append(row);
          return row;
        });
      }
    }
    // report document view: the agent's own section headings and decisions
    {
      const ic = el("div", "ab", "left:332px;top:157px");
      ic.innerHTML = fileIcon("docx", 18);
      const doc = (T.deliverables || []).find((d) => ext(d.name) === "docx");
      vDoc.append(ic, el("div", "ab sans fg clip", "left:360px;top:154px;width:440px;font-weight:600;font-size:15px;line-height:24px", doc ? doc.name : ""),
        el("div", "ab sandbox", "right:332px;top:157px;font-size:12.5px", "saved"));
    }
    const DOC_ROWS = E.map((e, j) => {
      const row = el("div", "ab", `left:332px;top:${196 + j * 64}px;width:616px;height:58px;border-left:2px solid ${rgba(C.model, 0.7)};padding-left:12px`);
      row.append(el("div", "ab sans clip", "left:14px;top:2px;width:600px;font-weight:600;font-size:13.5px;line-height:19px;color:#e8edf3", e.decision.heading_zh || e.id),
        el("div", "ab sans clip model", "left:14px;top:23px;width:600px;font-size:13px;line-height:18px", e.decision.decision_zh || ""),
        el("div", "ab sans clip dim", "left:14px;top:41px;width:600px;font-size:11.5px;line-height:16px", (e.decision.decision_lines_zh || [])[0] || ""));
      vDoc.append(row);
      return row;
    });
    // end-of-run stats
    {
      const box = el("div", "ab", "left:332px;top:160px;width:616px;height:420px");
      const ic = el("div", "ab", "left:0;top:0");
      ic.innerHTML = icon("harness", 20, C.harness);
      box.append(ic, el("div", "ab kick harness", "left:30px;top:2px", "RUN COMPLETE"),
        el("div", "ab", "right:0;top:0;font-size:13px", null));
      box.lastChild.innerHTML = `<span class="dim">real time </span><span class="fg">${minSec(A.duration_s)}</span>`;
      const big = [[String(A.model_responses), "model responses"], [String(A.tool_calls), "tool calls"],
        [`${A.files_opened} / ${SC.materials}`, "files opened"]].filter(([v]) => v !== "undefined");
      big.forEach(([v, k], n) => {
        box.append(el("div", "ab sans fg", `left:${n * 205}px;top:38px;font-weight:600;font-size:34px;line-height:42px`, v));
        box.append(el("div", "ab dim", `left:${n * 205}px;top:82px;font-size:12px`, k));
      });
      box.append(el("div", "ab", "left:0;width:616px;top:118px;border-top:1px solid #222b39"));
      const tok = [["input · uncached", U.input_tokens], ["input · cache read", U.cache_read_input_tokens],
        ["input · cache write", U.cache_creation_input_tokens], ["output", U.output_tokens]].filter(([, v]) => num(v));
      box.append(el("div", "ab kick dim", "left:0;top:134px;font-weight:400", "TOKENS · FROM THE REQUEST LEDGER"));
      tok.forEach(([k, v], n) => {
        box.append(el("div", "ab dim", `left:0;top:${162 + n * 30}px;font-size:14px;line-height:22px`, k));
        box.append(el("div", "ab sans fg", `left:200px;top:${160 + n * 30}px;font-weight:600;font-size:18px;line-height:24px`, fmtInt(v)));
      });
      if (num(U.requests)) box.append(el("div", "ab dim", "left:0;top:290px;font-size:12px", `${fmtInt(U.requests)} model requests in the ledger`));
      if (has(A.provider)) box.append(el("div", "ab dim clip", "left:0;top:312px;width:616px;font-size:12px", `${MODEL} via ${A.provider}`));
      vStats.append(box);
    }

    // agent captions
    for (const sg of SEGS) {
      if (sg.type === "stats") {
        cap(sg.start, sg.end, `The run ends after ${minSec(A.duration_s)} of real time`,
          `${A.model_responses} model responses · ${A.tool_calls} tool calls · ${A.files_opened} of ${SC.materials} files opened`);
      } else if (sg.type === "montage") {
        cap(sg.start, sg.end, MONT.caption_en, esc(MONT.caption_zh || ""));
      } else {
        const st = sg.step;
        cap(sg.start, sg.end, st.caption_en || (sg.title || ""), [st.caption_zh, sg.type !== "say" && sg.type !== "plan" ? oneLine(st.label || "") : null].filter(has).map(esc).join(" · "));
      }
    }

    // =================================================================== 03 independent check
    const SCK = $("sc-check");
    const ck = el("div", "card", "left:28px;top:140px;width:1224px;height:456px");
    SCK.append(ck);
    {
      const h = el("div", "ab", "left:20px;top:12px;display:flex;align-items:center;gap:9px");
      h.innerHTML = `${icon("scorer", 18, C.scorer)}<span class="sans scorer" style="font-weight:600;font-size:16px;line-height:24px">Independent check</span>`;
      ck.append(h);
      ck.append(el("div", "ab dim", "right:20px;top:16px;font-size:12px", [JMODEL ? `judge model ${JMODEL}` : null, JDEFAULT ? `package default ${JDEFAULT}` : null].filter(Boolean).join(" · ")));
      ck.append(el("div", "ab dim clip", "left:20px;top:40px;width:1184px;font-size:11.5px;line-height:16px", [JU.harness, JU.mode].filter(has).join(" · ")));
      const labels = [["ENTRY", 20], ["AGENT", 380], ["CRITERIA · ID AND WEIGHT", 470]];
      labels.forEach(([k, x]) => ck.append(el("div", "ab kick dim", `left:${x}px;top:66px;font-weight:400;font-size:10px`, k)));
      ck.append(el("div", "ab kick dim", "right:20px;top:66px;font-weight:400;font-size:10px", "EARNED / POSSIBLE"));
    }
    const ROWS = [...E.map((e) => ({ e, crit: e.criteria || [] })), { e: null, crit: AC }];
    const ROW_Y0 = 86;
    const ROW_H = 46;
    const ROW_T0 = 600;
    const ROW_MS = 760;
    const verdictStyle = (c) => {
      const v = c.verdict;
      const val = num(c.value) ? clamp01(c.value) : 0;
      if (v === "met") return { border: rgba(C.pass, 0.85), bg: rgba(C.pass, 0.18), id: C.pass, st: "met", stc: C.pass };
      if (v === "partial") return { border: rgba(C.warn, 0.85), bg: "transparent", fill: rgba(C.warn, 0.28), fw: val, id: C.warn, st: num(c.raw) && num(c.points) ? `${c.raw}/${c.points}` : fmtW(val), stc: C.warn };
      if (v === "not_met") return { border: rgba(C.fail, 0.8), bg: rgba(C.fail, 0.06), id: C.fail, st: "not met", stc: C.fail };
      if (v === "penalty_clear") return { border: "#566072", dash: true, bg: "transparent", id: "#aeb6c4", st: "clear", stc: C.dim };
      if (v === "penalty_triggered") return { border: C.fail, bg: rgba(C.fail, 0.3), id: "#fff", st: `−${fmtW(wOf(c) * (1 - val))}`, stc: "#fff" };
      if (v === "redline_clear") return { border: rgba(C.pass, 0.6), bg: "transparent", id: "#aeb6c4", st: "clear", stc: C.pass, red: true };
      return { border: C.fail, bg: rgba(C.fail, 0.35), id: "#fff", st: "VIOLATED", stc: "#fff", red: true };
    };
    const ROWS_DOM = ROWS.map((r, j) => {
      const y = ROW_Y0 + j * ROW_H;
      const row = el("div", "ab", `left:0;top:${y}px;width:1224px;height:${ROW_H}px`);
      if (j) row.append(el("div", "ab", "left:20px;width:1184px;top:0;border-top:1px solid #1c2431"));
      if (r.e) {
        const head = el("div", "ab", "left:20px;top:5px");
        head.innerHTML = `<span class="eid" style="font-size:11.5px;line-height:18px;padding:0 6px">${esc(r.e.id)}</span><span class="sans" style="margin-left:8px;font-size:12px;color:#aeb6c4">${esc(r.e.object)}</span>`;
        row.append(head, el("div", "ab sans clip", "left:20px;top:25px;width:340px;font-size:12.5px;line-height:17px;color:#c9d1dc", r.e.proposal_zh || ""));
        const d = el("div", "ab", "left:380px;top:14px");
        d.innerHTML = `<span class="dec ${r.e.decision.kind === "accept" ? "accept" : "reject"}" style="font-size:11px;line-height:18px;padding:0 8px">${r.e.decision.kind === "accept" ? "ACCEPT" : "REJECT"}</span>`;
        row.append(d);
      } else {
        row.append(el("div", "ab sans", "left:20px;top:5px;font-weight:600;font-size:13px;line-height:18px;color:#e8edf3", "Across the close"),
          el("div", "ab sans dim clip", "left:20px;top:25px;width:340px;font-size:12px;line-height:17px", "criteria about the whole close"));
        row.append(el("div", "ab dim", "left:380px;top:14px;font-size:12px", "—"));
      }
      let cx = 470;
      const chipsDom = r.crit.map((c) => {
        const s = verdictStyle(c);
        const w = s.red ? 104 : 74;
        const node = el("div", "cc", `left:${cx}px;top:6px;width:${w}px`);
        cx += w + 6;
        const fl = el("div", "fl", `width:${s.fw ? (s.fw * 100).toFixed(1) : 0}%;background:${s.fill || "transparent"}`);
        node.append(fl, el("div", "id", null, c.id), el("div", "w", null, s.red ? "red line" : `w${fmtW(wOf(c))}`), el("div", "st", null, s.st));
        row.append(node);
        return { c, s, node };
      });
      const pos = r.crit.filter(isPos);
      const earned = sum(pos.map((c) => wOf(c) * clamp01(num(c.value) ? c.value : 0)));
      const possible = sum(pos.map(wOf));
      const tally = el("div", "ab mono", "right:20px;top:13px;font-size:14px;line-height:20px;text-align:right");
      row.append(tally);
      ck.append(row);
      return { r, row, chipsDom, earned, possible, tally, at: CK.start + ROW_T0 + j * ROW_MS };
    });
    const totalEarned = sum(ROWS_DOM.map((r) => r.earned));
    if (num(RS.earned_positive_weight) && Math.abs(totalEarned - RS.earned_positive_weight) > 0.005) console.warn("row tallies differ from result.earned_positive_weight", totalEarned, RS.earned_positive_weight);
    const totalRow = el("div", "ab", `left:20px;top:${ROW_Y0 + ROWS.length * ROW_H + 10}px;width:1184px;height:24px;border-top:1px solid #2b3546;padding-top:6px`);
    const totalTxt = el("div", "ab", "right:0;top:6px;font-size:13px");
    totalRow.append(el("div", "ab kick dim", "left:0;top:8px;font-weight:400;font-size:10px", "RUNNING TALLY"), totalTxt);
    ck.append(totalRow);
    // reveals
    const REV0 = 7400;   // rows finish ≈5.9 s; the completed scorecard holds until the first reveal
    const TALLY0 = 16400;
    const REV_MS = RV.length ? (TALLY0 - REV0) / RV.length : 0;
    const vbox = (x, w, y, h) => el("div", "ab", `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:1px solid #273042;border-radius:10px;background:rgba(255,255,255,.025)`);
    const verdictBadge = (verdict, label) => {
      const ok = verdict === "met" || verdict === "redline_clear" || verdict === "penalty_clear";
      const part = verdict === "partial";
      const col = ok ? C.pass : part ? C.warn : C.fail;
      return `<span style="display:inline-flex;align-items:center;gap:8px;color:${col};font:700 15px/22px var(--sans);letter-spacing:.06em">${icon(ok ? "check" : part ? "partial" : "cross", 22, col)}${esc(label)}</span>`;
    };
    const REVEALS = RV.map((rv, n) => {
      const card = el("div", "ab", "left:16px;top:60px;width:1192px;height:384px;border:1.5px solid rgba(143,173,214,.55);border-radius:12px;background:#0d131c;box-shadow:0 20px 50px rgba(0,0,0,.55)");
      const cd = rv.criterion_data || {};
      card.append(el("div", "ab kick brand", "left:24px;top:18px", `REVEAL ${n + 1} OF ${RV.length} · ${cd.id || rv.criterion}${cd.group === "gating" ? " · red line" : ` · weight ${fmtW(wOf(cd))}`}`));
      card.append(el("div", "ab sans", "left:24px;top:38px;font-weight:600;font-size:26px;line-height:34px;color:#fff", rv.title_en || ""));
      if (rv.key === "dv01") {
        const b1 = vbox(24, 352, 92, 200);
        b1.append(el("div", "ab kick dim", "left:16px;top:14px;font-weight:400", "THE RUBRIC EXPECTS"),
          el("div", "ab sans fg", "left:16px;top:38px;font-size:13px", `DV01 of ${rv.trade}`),
          el("div", "ab sans", "left:16px;top:62px;font-weight:600;font-size:34px;line-height:42px;color:#fff", fmt2(rv.expected)),
          el("div", "ab sans dim", "left:16px;top:108px;font-size:13px", rv.unit_zh || ""));
        const b2 = vbox(392, 352, 92, 200);
        b2.append(el("div", "ab kick dim", "left:16px;top:14px;font-weight:400", "THE AGENT'S WORKBOOK"),
          el("div", "ab mono fg", "left:16px;top:38px;font-size:13px", `${rv.agent.sheet}!${rv.agent.cell}`),
          el("div", "ab sans", "left:16px;top:62px;font-weight:600;font-size:34px;line-height:42px;color:#fff", fmt2(rv.agent.value)),
          el("div", "ab sans dim", "left:16px;top:108px;font-size:13px", rv.agent.unit || ""),
          el("div", "ab sans model clamp", "left:16px;top:140px;width:320px;font-size:13px;line-height:18px;-webkit-line-clamp:2", `taken from the valuation sheet (${rv.agent.source_note})`));
        const b3 = vbox(760, 408, 92, 200);
        b3.append(el("div", "ab kick dim", "left:16px;top:14px;font-weight:400", "THE JUDGE RE-DERIVES IT"),
          el("div", "ab sans fg clip", "left:16px;top:38px;width:376px;font-size:12.5px", `${rv.source.file} · ${rv.source.method}`),
          el("div", "ab mono dim", "left:16px;top:66px;font-size:12.5px", "(up 5BP − down 5BP) / 10"),
          el("div", "ab mono fg", "left:16px;top:90px;font-size:13px", `(${fmt2(rv.source.up_5bp)} − (${fmt2(rv.source.down_5bp)})) / 10`),
          el("div", "ab sans", "left:16px;top:118px;font-weight:600;font-size:28px;line-height:36px;color:#fff", `= ${fmt2((rv.source.up_5bp - rv.source.down_5bp) / 10)}`));
        card.append(b1, b2, b3);
        const vb = el("div", "ab", "left:24px;top:312px");
        vb.innerHTML = verdictBadge(cd.verdict, cd.verdict === "met" ? `${cd.id} MET` : `${cd.id} ${String(cd.verdict || "").toUpperCase()}`);
        card.append(vb, el("div", "ab dim clamp sans", "left:220px;top:306px;width:948px;font-size:12px;line-height:17px;-webkit-line-clamp:3", oneLine(cd.reasoning_excerpt || "")));
      } else if (rv.key === "red-line") {
        const b1 = vbox(24, 560, 92, 150);
        b1.append(el("div", "ab kick dim", "left:16px;top:14px;font-weight:400", "THE PENDING ENTRY (D02)"));
        String(rv.original_zh || "").split("\n").filter(has).slice(0, 3).forEach((l, k) => b1.append(el("div", "ab sans clip", `left:16px;top:${42 + k * 28}px;width:528px;font-size:15px;line-height:22px;color:#e8edf3`, l)));
        const b2 = vbox(608, 560, 92, 150);
        b2.append(el("div", "ab kick model", "left:16px;top:14px", "THE AGENT'S ENTRY"),
          el("div", "ab sans clip", `left:16px;top:34px;width:528px;font-size:12.5px;line-height:18px;color:${C.model}`, rv.agent_decision_zh || ""));
        (rv.agent_entry_zh || []).slice(0, 3).forEach((l, k) => b2.append(el("div", "ab sans clip", `left:16px;top:${58 + k * 27}px;width:528px;font-size:15px;line-height:22px;color:#fff`, l)));
        const pd = rv.partner_data || {};
        const b3 = vbox(24, 560, 254, 116);
        const g = el("div", "ab", "left:16px;top:12px");
        g.innerHTML = verdictBadge(cd.verdict, `RED LINE ${cd.id} ${cd.verdict === "redline_clear" ? "CLEAR" : "VIOLATED"}`);
        b3.append(g, el("div", "ab sans dim clamp", "left:16px;top:46px;width:528px;font-size:12px;line-height:17px;-webkit-line-clamp:3", oneLine(cd.text_zh || "")));
        const b4 = vbox(608, 560, 254, 116);
        const p2 = el("div", "ab", "left:16px;top:12px");
        p2.innerHTML = verdictBadge(pd.verdict, `${pd.id} PARTIAL · ${pd.raw} OF ${pd.points}`);
        b4.append(p2, el("div", "ab sans dim clamp", "left:16px;top:46px;width:528px;font-size:12px;line-height:17px;-webkit-line-clamp:3", oneLine(pd.reasoning_excerpt || "")));
        card.append(b1, b2, b3, b4);
      } else if (rv.key === "formulas") {
        card.append(el("div", "ab sans clamp", "left:24px;top:88px;width:1144px;font-size:15px;line-height:22px;color:#e8edf3;-webkit-line-clamp:2", cd.text_zh || ""));
        const fb = rv.formulas_by_sheet || {};
        Object.entries(fb).forEach(([name, n2], k) => {
          const b = vbox(24 + k * 232, 216, 150, 104);
          b.append(el("div", "ab sans clip", "left:14px;top:12px;width:188px;font-size:13px;line-height:18px;color:#c9d1dc", name),
            el("div", "ab sans", `left:14px;top:38px;font-weight:600;font-size:34px;line-height:42px;color:${n2 ? "#fff" : C.fail}`, String(n2)),
            el("div", "ab dim", "left:62px;top:56px;font-size:12px", "formulas"));
          card.append(b);
        });
        const vb = el("div", "ab", "left:24px;top:276px");
        vb.innerHTML = verdictBadge(cd.verdict, `${cd.id} ${cd.verdict === "not_met" ? "NOT MET" : String(cd.verdict || "").toUpperCase()}`);
        card.append(vb, el("div", "ab dim sans", "left:220px;top:280px;font-size:13px", `${rv.total_formulas} formulas in ${Object.keys(fb).length} sheets`),
          el("div", "ab dim clamp sans", "left:24px;top:314px;width:1144px;font-size:12px;line-height:17px;-webkit-line-clamp:3", oneLine(cd.reasoning_excerpt || "")));
      }
      ck.append(card);
      return { rv, card, start: CK.start + REV0 + n * REV_MS, end: CK.start + REV0 + (n + 1) * REV_MS };
    });
    // tally
    const tallyBox = el("div", "ab", "left:16px;top:60px;width:1192px;height:384px;border:1.5px solid rgba(143,173,214,.55);border-radius:12px;background:#0d131c");
    {
      tallyBox.append(el("div", "ab kick brand", "left:24px;top:18px", "THE SCORE"));
      const rows3 = [
        ["positive weight earned", `${fmtW(RS.earned_positive_weight)} / ${fmtW(RB.positive_weight)}`],
        ["penalty checks triggered", `${COUNTS.penalty_triggered || 0} of ${N_PEN}`],
        ["red lines", `${COUNTS.redline_triggered ? `${COUNTS.redline_triggered} violated` : `${N_RED} of ${N_RED} clear`}`],
      ];
      rows3.forEach(([k, v], n) => {
        tallyBox.append(el("div", "ab sans dim", `left:24px;top:${92 + n * 70}px;font-size:19px;line-height:26px`, k));
        tallyBox.append(el("div", "ab sans fg", `left:300px;top:${88 + n * 70}px;font-weight:600;font-size:26px;line-height:34px`, v));
      });
      tallyBox.append(el("div", "ab", "left:620px;top:72px;height:268px;border-left:1px solid #2b3546"));
      tallyBox.append(el("div", "ab kick dim", "left:660px;top:92px;font-weight:400", "REWARD (0 TO 1)"));
      tallyBox.append(el("div", "ab sans dim", "left:660px;top:122px;font-size:18px;line-height:26px",
        `${fmtW(RS.earned_positive_weight)} / ${fmtW(RB.positive_weight)}${COUNTS.penalty_triggered ? " minus penalties" : ""}${COUNTS.redline_triggered ? ", vetoed by a red line" : ""} =`));
    }
    const tallyNum = el("div", "ab sans", "left:660px;top:156px;font-weight:600;font-size:96px;line-height:108px;color:#fff");
    tallyBox.append(tallyNum);
    ck.append(tallyBox);
    cap(CK.start, CK.start + 2600, "An independent judge scores the report and the workbook",
      [JU.harness, JU.mode, JMODEL].filter(has).map(esc).join(" · "));
    cap(CK.start + 2600, CK.start + 5900, "Criteria are grouped under the entry they name",
      "editorial grouping · green met · amber partial · red not met · dashed penalty clear");
    cap(CK.start + 5900, CK.start + REV0, `${COUNTS.met} met · ${COUNTS.partial} partial · ${COUNTS.not_met} not met`,
      `positive weight earned ${fmtW(RS.earned_positive_weight)} of ${fmtW(RB.positive_weight)}`);
    REVEALS.forEach((r) => cap(r.start, r.end, r.rv.caption_en || r.rv.title_en,
      [r.rv.criterion_data && r.rv.criterion_data.id, r.rv.title_en].filter(has).map(esc).join(" · ")));
    cap(CK.start + TALLY0, CK.end, "The score: earned weight over all positive weight",
      `${fmtW(RS.earned_positive_weight)} / ${fmtW(RB.positive_weight)} · ${COUNTS.penalty_triggered || 0} of ${N_PEN} penalties triggered · red lines ${COUNTS.redline_triggered ? "violated" : "clear"}`);

    // =================================================================== 04 result and outro
    const ovR = $("ov-result");
    ovR.append(el("div", "ab", `left:0;top:0;width:1280px;height:720px;background:radial-gradient(45% 55% at 50% 36%, ${rgba(C.scorer, 0.13)} 0%, ${rgba(C.scorer, 0)} 70%), #06090d`));
    const ring = document.createElementNS(NS, "svg");
    ring.setAttribute("width", "200"); ring.setAttribute("height", "200"); ring.setAttribute("viewBox", "0 0 200 200");
    ring.setAttribute("style", "position:absolute;left:540px;top:96px;overflow:visible");
    svgEl(ring, "circle", { cx: 100, cy: 100, r: 82, fill: "none", stroke: "#1c2431", "stroke-width": 12 });
    const ringArc = svgEl(ring, "circle", { cx: 100, cy: 100, r: 82, fill: "none", stroke: C.scorer, "stroke-width": 12, "stroke-linecap": "round", transform: "rotate(-90 100 100)", "stroke-dasharray": "0 600" });
    ovR.append(ring);
    const rNum = el("div", "ab sans ctr", "top:162px;font-weight:600;font-size:48px;line-height:56px;color:#fff");
    const rTitle = el("div", "ab ctr kick", `top:318px;font-size:13px;letter-spacing:.24em;color:${C.scorer}`, "RUBRIC REWARD · 0 TO 1");
    const rRun = el("div", "ab sans ctr fg", "top:346px;font-size:19px;line-height:26px", [`${MODEL} + ${HARNESS}`, T.id, T.title_zh].filter(has).join(" · "));
    const rCounts = el("div", "ab ctr fg", "top:386px;font-size:15px",
      `${COUNTS.met} met · ${COUNTS.partial} partial · ${COUNTS.not_met} not met · ${COUNTS.penalty_triggered || 0} of ${N_PEN} penalties triggered · red lines ${COUNTS.redline_triggered ? "violated" : "clear"}`);
    const rRef = el("div", "ab ctr sans", "top:424px;font-size:17px;line-height:24px;color:#c9d1dc", num(RS.reference_reward) ? `Same rubric, reference answer: ${RS.reference_reward.toFixed(3)}` : "");
    const rPilot = el("div", "ab ctr dim", "top:466px;font-size:12.5px;letter-spacing:.04em", "Pilot run: one agent run, one judge pass");
    ovR.append(rNum, rTitle, rRun, rCounts, rRef, rPilot);

    const ovE = $("ov-end");
    ovE.append(el("div", "ab", "left:0;top:0;width:1280px;height:720px;background:radial-gradient(70% 60% at 50% 45%, #0f1621 0%, #070a0f 75%)"));
    const eMark = el("div", "mark", "left:614px;top:64px;width:52px;height:52px;border-radius:12px;font-size:36px;line-height:50px", "N");
    const eWord = el("div", "ab ctr big-word", "top:124px;font-size:46px;line-height:54px");
    eWord.innerHTML = "Inference<span>Net</span>";
    const eSp = el("div", "ab ctr spaced", "top:184px", "PROFESSIONAL TASKS");
    const eQ = el("div", "ab ctr sans", "top:222px;color:#fff;font-weight:600;font-size:36px;line-height:44px", Q.closing_question || "");
    ovE.append(eMark, eWord, eSp, eQ);
    const LOOP = [["task", C.brand, "Professional task"], ["model", C.model, "Agent run"], ["scorer", C.scorer, "Independent rubric check"],
      ["search", C.warn, "Understand failures"], ["improve", C.pass, "Improve"]];
    const LBW = 192;
    const LGAP = 26;
    const LX0 = 640 - (LOOP.length * LBW + (LOOP.length - 1) * LGAP) / 2;
    const LY = 300;
    const loopSvg = document.createElementNS(NS, "svg");
    loopSvg.setAttribute("width", "1280"); loopSvg.setAttribute("height", "720"); loopSvg.setAttribute("viewBox", "0 0 1280 720");
    loopSvg.setAttribute("style", "position:absolute;left:0;top:0;overflow:visible");
    ovE.append(loopSvg);
    const LARROWS = [];
    const LBOX = LOOP.map(([ic, col, label], i) => {
      const x = LX0 + i * (LBW + LGAP);
      const box = el("div", "ab", `left:${x}px;top:${LY}px;width:${LBW}px;height:78px;border:1px solid ${rgba(col, 0.5)};border-radius:10px;background:${rgba(col, 0.07)}`);
      const ii = el("div", "ab", `left:${(LBW - 22) / 2}px;top:12px`);
      ii.innerHTML = icon(ic, 22, col);
      box.append(ii, el("div", "ab sans ctr", "top:42px;font-weight:600;font-size:14px;line-height:20px;color:#e8edf3", label));
      ovE.append(box);
      if (i < LOOP.length - 1) {
        const ax = x + LBW + 6;
        const g = svgEl(loopSvg, "g", { opacity: 0 });
        svgEl(g, "path", { d: `M${ax} ${LY + 39} H${ax + LGAP - 12}`, stroke: "#566072", "stroke-width": 1.6, fill: "none" });
        svgEl(g, "path", { d: `M${ax + LGAP - 16} ${LY + 35} L${ax + LGAP - 10} ${LY + 39} L${ax + LGAP - 16} ${LY + 43}`, stroke: "#566072", "stroke-width": 1.6, fill: "none" });
        LARROWS.push(g);
      }
      return box;
    });
    const xFirst = LX0 + LBW / 2;
    const xLast = LX0 + (LOOP.length - 1) * (LBW + LGAP) + LBW / 2;
    const loopBack = svgEl(loopSvg, "path", { d: `M${xLast} ${LY + 80} C${xLast} ${LY + 122}, ${xFirst} ${LY + 122}, ${xFirst} ${LY + 86}`, stroke: rgba(C.brand, 0.6), "stroke-width": 1.6, fill: "none", "stroke-dasharray": "5 5" });
    const loopHead = svgEl(loopSvg, "path", { d: `M${xFirst - 5} ${LY + 92} L${xFirst} ${LY + 84} L${xFirst + 5} ${LY + 92}`, stroke: rgba(C.brand, 0.8), "stroke-width": 1.6, fill: "none" });
    const eUrl = el("div", "ab ctr url", "top:446px");
    eUrl.innerHTML = "<span>easonai-5589.github.io/inferencenet-challenge</span>";
    const eNote = el("div", "ab ctr dim clamp", "top:508px;left:140px;right:140px;font-size:12px;line-height:17px;-webkit-line-clamp:2", PV.note || "");
    const eTrial = el("div", "ab ctr clip", "top:548px;left:100px;right:100px;font-size:11px;line-height:16px;color:#566072",
      [has(PV.trial) ? `trial ${PV.trial}` : null, has(PV.generated_at) ? `data generated ${PV.generated_at}` : null].filter(Boolean).join(" · "));
    ovE.append(eUrl, eNote, eTrial);

    // =================================================================== open
    const ovO = $("ov-open");
    const ptcLayer = el("div", "layer");
    ovO.append(ptcLayer);
    const oMark = el("div", "mark", "left:610px;top:150px;width:60px;height:60px;border-radius:14px;font-size:42px;line-height:58px", "N");
    const oWord = el("div", "ab ctr big-word", "top:224px;font-size:52px;line-height:60px");
    oWord.innerHTML = "Inference<span>Net</span>";
    const oQ = el("div", "ab ctr sans", "top:316px;color:#fff;font-weight:600;font-size:34px;line-height:42px", Q.title_question || "");
    const oQz = el("div", "ab ctr sans", "top:366px;color:#aeb6c4;font-size:18px;line-height:26px", Q.title_question_zh || "");
    const oSub = el("div", "ab ctr dim", "top:416px;font-size:13px;letter-spacing:.08em", ["Professional Tasks", T.domain_en, T.id].filter(has).join(" · "));
    ovO.append(oMark, oWord, oQ, oQz, oSub);
    const rnd = mulberry32(20261018);
    const OPEN_WORDS = [T.id, ...E.map((e) => e.id), ...E.map((e) => e.object), ...KB.map(([k]) => `.${k}`)].filter(has);
    const OPEN_PTC = Array.from({ length: 78 }, (_, i) => {
      const color = [C.model, C.harness, C.sandbox, C.scorer, C.brand][Math.floor(rnd() * 5)];
      const node = el("div", "ptc");
      if (i % 3 === 0 && OPEN_WORDS.length) {
        node.textContent = OPEN_WORDS[Math.floor(rnd() * OPEN_WORDS.length)];
        node.style.font = `${(13 + rnd() * 8).toFixed(1)}px/1 var(--mono)`;
        node.style.color = color;
      } else if (i % 3 === 1 && KB.length) {
        node.innerHTML = fileIcon(KB[Math.floor(rnd() * KB.length)][0], Math.round(14 + rnd() * 14));
      } else {
        node.innerHTML = icon(ROLE_KEYS[Math.floor(rnd() * 4)], Math.round(12 + rnd() * 16), color);
      }
      ptcLayer.append(node);
      const ang = rnd() * Math.PI * 2;
      const rad = 260 + rnd() * 300;
      return { node, x0: 640 + Math.cos(ang) * rad * 1.25, y0: 300 + Math.sin(ang) * rad * 0.62, x1: 640 + (rnd() - 0.5) * 26, y1: 180 + (rnd() - 0.5) * 20,
        delay: rnd() * 500, curve: (rnd() - 0.5) * 240, spin: (rnd() - 0.5) * 260, dx: (rnd() - 0.5) * 36, dy: (rnd() - 0.5) * 36 };
    });

    // =================================================================== renderers
    const ovCard = $("ov-card");
    function renderOpen(t) {
      for (const q of OPEN_PTC) {
        const k = clamp01((t - 150 - q.delay * 0.6) / 1300);
        const e2 = ease(k);
        const ox = q.x0 + q.dx * (t / 1000);
        const oy = q.y0 + q.dy * (t / 1000);
        const nx = -(q.y1 - oy);
        const ny = q.x1 - ox;
        const len = Math.hypot(nx, ny) || 1;
        const bend = Math.sin(Math.PI * e2) * q.curve;
        placePtc(q.node, lerp(ox, q.x1, e2) + (nx / len) * bend, lerp(oy, q.y1, e2) + (ny / len) * bend, q.spin * e2, 1 - 0.5 * e2,
          clamp01((t - q.delay * 0.4) / 400) * (1 - clamp01((k - 0.8) / 0.2)) * 0.9);
      }
      const logo = easeBack((t - 1250) / 600);
      for (const node of [oMark, oWord]) { node.style.opacity = clamp01((t - 1250) / 400); node.style.transform = `scale(${(0.86 + 0.14 * logo).toFixed(3)})`; }
      oQ.style.opacity = clamp01((t - 1600) / 400);
      oQ.style.transform = `translateY(${((1 - easeOut((t - 1600) / 550)) * 12).toFixed(1)}px)`;
      oQz.style.opacity = clamp01((t - 1900) / 400);
      oSub.style.opacity = clamp01((t - 2200) / 400);
    }
    function renderCard(t, ph) {
      const c = CHAPTERS[ph.ch];
      const tt = t - ph.start;
      show(ovCard, Math.min(clamp01(tt / 260), clamp01((ph.ms - tt) / 320)));
      css($("cc-bg"), "background", `radial-gradient(38% 46% at 50% 40%, ${rgba(c.color, 0.16)} 0%, rgba(5, 7, 10, .97) 72%)`);
      setHTML($("cc-ic"), icon(c.icon, 80, c.color, 2));
      $("cc-ic").style.transform = `scale(${(0.7 + 0.3 * easeBack(tt / 520)).toFixed(3)})`;
      renderRings($("cc-rings"), 160, 160, tt, c.color, 46, 158, 1300);
      setText($("cc-n"), `CHAPTER ${pad2(ph.ch + 1)}`);
      setText($("cc-t"), c.title);
      setText($("cc-s"), c.sub);
      const up = (1 - easeOut((tt - 120) / 420)) * 14;
      $("cc-t").style.transform = `translateY(${up.toFixed(1)}px)`;
      $("cc-s").style.transform = `translateY(${(up * 1.3).toFixed(1)}px)`;
      $("cc-t").style.opacity = clamp01((tt - 120) / 300);
      $("cc-s").style.opacity = clamp01((tt - 260) / 300);
    }
    function renderTask(t) {
      const tt = t - TASK.start;
      const aOut = 1 - clamp01((tt - (TA - 250)) / 300);
      show(scene, clamp01((tt + 650) / 300) * aOut);
      BULLETS.forEach((b, i) => { const a = clamp01((tt - 250 - i * 150) / 320); css(b, "opacity", a.toFixed(3)); css(b, "transform", `translateY(${((1 - easeOut(a)) * 8).toFixed(1)}px)`); });
      const fly = clamp01((tt - TFLY) / (TASK.ms - TFLY - 60));
      ENTRY_CARDS.forEach((ec, j) => {
        const at = TA + 80 + j * 540;
        const a = clamp01((tt - at) / 320);
        const fe = ease(fly);
        if (fly > 0) {
          css(ec.card, "transform", `translate(${((ec.tx - ec.x) * fe).toFixed(1)}px, ${((ec.ty - ec.y) * fe).toFixed(1)}px) scale(${(1 - 0.4 * fe).toFixed(3)})`);
          css(ec.card, "opacity", (1 - clamp01((fly - 0.7) / 0.3)).toFixed(3));
        } else {
          css(ec.card, "transform", `translateY(${((1 - easeOut(a)) * 14).toFixed(1)}px) scale(${(0.96 + 0.04 * easeOut(a)).toFixed(3)})`);
          css(ec.card, "opacity", a.toFixed(3));
        }
        const g = bump(tt - at, 120, 800);
        css(ec.card, "boxShadow", g > 0 ? `0 0 22px ${rgba(C.brand, 0.4 * g)}` : "none");
      });
      const sa = clamp01((tt - TB) / 380) * (1 - clamp01((tt - TFLY) / 400));
      show(sealed, sa);
      css(sealed, "transform", `translateY(${((1 - easeOut(clamp01((tt - TB) / 380))) * 10).toFixed(1)}px)`);
      const lg = bump(tt - TB - 100, 150, 900);
      css(sealed, "boxShadow", lg > 0 ? `0 0 26px ${rgba(C.scorer, 0.4 * lg)}` : "none");
    }
    // agent chapter
    let codeCache = null;
    function renderCodeView(sg, t, phase, q, spinT) {
      const isErr = sg.type === "tool" && sg.step.is_error;
      setHTML(cdIc, icon("sandbox", 18, C.sandbox));
      setText(cdTitle, sg.title || "");
      let status;
      if (phase === "type") status = `<span class="model">model · writing</span>`;
      else if (phase === "run") status = `${spinnerSVG(13, C.sandbox, spinT)}<span class="sandbox">running</span>`;
      else {
        const st = sg.type === "say" ? sg.also : sg.step;
        const dur = num(st.end_s) && num(st.t_s) ? ` · ${(st.end_s - st.t_s).toFixed(1)} s` : "";
        status = isErr ? `<span style="color:#1a0b0c;background:${C.fail};padding:1px 8px;border-radius:5px;font-weight:700">ERROR · exit 1</span>` : `<span class="sandbox">done${dur}</span>`;
      }
      setHTML(cdStatus, status);
      const lines = sg.code || [];
      const total = sum(lines.map((l) => l.length)) || 1;
      let budget = phase === "type" ? Math.floor(clamp01(q / 0.92) * total) : Infinity;
      const key = `${sg.start}|${phase}|${budget === Infinity ? "all" : budget}`;
      if (codeCache !== key) {
        codeCache = key;
        setHTML(cdCode, lines.map((text, i) => {
          if (phase === "type" && budget <= 0) return "";
          const part = text.slice(0, Math.max(0, budget));
          const done = part.length === text.length;
          budget -= text.length;
          const caret = phase === "type" && budget <= 0 && (!done || i === lines.length - 1) ? `<span class="caret"></span>` : "";
          return `<div class="cl"><span class="ln">${i + 1}</span>${esc(part)}${caret}</div>`;
        }).join(""));
      }
      const out = sg.out || [];
      const nOut = phase === "output" ? Math.floor(clamp01(q / (isErr || sg.type !== "tool" ? 0.3 : 0.5)) * (out.length + 1)) : 0;
      setHTML(cdOut, out.slice(0, nOut).map((l) => {
        const err = isErr && (/^Exit code|Error|Traceback/.test(l));
        const ok = /saved|enhanced/i.test(l) && !isErr;
        return `<div class="ol" style="color:${err ? C.fail : ok ? C.sandbox : "#c3cbd6"}">${esc(l)}</div>`;
      }).join(""));
      // dramatic moment: the failed script gets a stamp once its traceback is on screen
      const sa = isErr && phase === "output" ? clamp01((q - 0.34) / 0.06) : 0;
      css(cdStamp, "opacity", sa.toFixed(3));
      css(cdStamp, "transform", `rotate(-8deg) scale(${(1.8 - 0.8 * easeBack((q - 0.34) / 0.1)).toFixed(3)})`);
      const rq = phase === "run" ? ((t % 700) / 700) : 0;
      css(cdBar, "opacity", phase === "run" ? "1" : "0");
      css(cdBar, "transform", `translateX(${(-160 + 776 * rq).toFixed(1)}px)`);
    }
    function renderThink(sg, t, tt) {
      renderRings(thinkRings, 120, 120, tt, C.model, 34, 116, 950, 3);
      thinkIc.style.transform = `scale(${(1 + 0.06 * Math.sin(tt / 150)).toFixed(3)})`;
      const st = sg.step;
      const next = sg.type === "plan" ? "next: TodoWrite · writes its plan" : sg.type === "say" ? "next: a message, then a tool call"
        : `next: ${sg.title}`;
      setText(thinkNext, next);
      setText(thinkSkip, sg.skipped ? `${sg.skipped} step${sg.skipped > 1 ? "s" : ""} not shown in this story` : "");
      void st;
    }
    function segPhases(sg) {
      if (sg.type === "tool") return [["think", 0.14], ["type", 0.36], ["run", 0.45], ["output", 1]];
      if (sg.type === "plan") return [["think", 0.18], ["plan", 1]];
      if (sg.type === "say") return [["think", 0.08], ["say", 0.45], ["type", 0.55], ["run", 0.6], ["output", 1]];
      if (sg.type === "report") return [["think", 0.08], ["type", 0.2], ["run", 0.25], ["output", 0.33], ["doc", 1]];
      if (sg.type === "montage") return [["tick", 1]];
      return [["stats", 1]];
    }
    function phaseOf(sg, p) {
      const ph = segPhases(sg);
      let a = 0;
      for (const [name, b] of ph) { if (p < b || b === 1) return { name, q: clamp01((p - a) / Math.max(1e-6, b - a)), a, b }; a = b; }
      return { name: ph[ph.length - 1][0], q: 1, a, b: 1 };
    }
    function realAt(t) {
      if (t < AG.start) return 0;
      const sg = segAt(t);
      if (t >= AG.end || sg.type === "stats") return A.duration_s || 0;
      const p = clamp01((t - sg.start) / sg.ms);
      const ph = phaseOf(sg, p);
      if (sg.type === "montage") {
        const rows = sg.steps;
        const k = clamp01(p / 0.9) * rows.length;
        const n = Math.min(rows.length - 1, Math.floor(k));
        const nx = rows[Math.min(rows.length - 1, n + 1)].t_s;
        return lerp(rows[n].t_s, nx, k - n);
      }
      const st = sg.step;
      const tStart = sg.type === "say" ? st.t_s : st.t_s;
      if (ph.name === "think") return lerp(sg.prevReal, tStart, ph.q);
      if (sg.type === "say") {
        const also = sg.also;
        if (ph.name === "say") return lerp(st.t_s, also ? also.t_s : st.t_s, ph.q);
        if (!also) return st.t_s;
        if (ph.name === "type" || ph.name === "run") return lerp(also.t_s, num(also.end_s) ? also.end_s : also.t_s, ph.name === "run" ? 0.5 + ph.q / 2 : ph.q / 2);
        return num(also.end_s) ? also.end_s : also.t_s;
      }
      const end = num(st.end_s) ? st.end_s : st.t_s;
      if (ph.name === "type" || ph.name === "run") return lerp(st.t_s, end, ph.name === "run" ? 0.5 + ph.q / 2 : ph.q / 2);
      return end;
    }
    function renderAgent(t, spinT) {
      const sg = segAt(t);
      const p = clamp01((t - sg.start) / sg.ms);
      const ph = phaseOf(sg, p);
      const tt = t - sg.start;
      const views = { think: vThink, code: vCode, plan: vPlan, say: vSay, tick: vTick, doc: vDoc, stats: vStats };
      const vk = ph.name === "type" || ph.name === "run" || ph.name === "output" ? "code" : ph.name;
      const segIn = clamp01((t - (sg.start + ph.a * sg.ms)) / 220);
      for (const [k, node] of Object.entries(views)) show(node, k === vk ? (t < AG.start ? 0 : segIn) : 0);
      const isErr = sg.type === "tool" && sg.step.is_error;
      const col = vk === "think" || vk === "say" || vk === "plan" ? (vk === "plan" ? C.harness : C.model) : vk === "stats" ? C.harness : isErr && ph.name === "output" ? C.fail : C.sandbox;
      css(cMain, "borderColor", rgba(col, 0.5));
      const errGlow = isErr && ph.name === "output" ? 0.25 + 0.2 * Math.abs(Math.sin(tt / 240)) : 0;
      css(cMain, "boxShadow", `0 0 0 1px ${rgba(col, 0.1)}, 0 0 ${errGlow ? 60 : 44}px ${rgba(col, errGlow || 0.1)}, 0 18px 50px rgba(0, 0, 0, .45)`);
      if (vk === "think") { renderThink(sg, t, tt); setText(thinkTime, `real time ${mmss(realAt(t))}`); }
      if (vk === "code") renderCodeView(sg, t, ph.name, ph.q, spinT);
      if (vk === "say") { setText(sayText, sg.text || ""); css(sayText, "opacity", clamp01(ph.q / 0.2).toFixed(3)); }
      if (vk === "plan") {
        const todos = sg.step.todos || [];
        if (!plRows.__built) {
          plRows.__built = true;
          plRows.__rows = todos.map((td, j) => {
            const row = el("div", "ab", `left:0;top:${j * 40}px;width:616px;height:36px`);
            row.innerHTML = `<div class="ab" style="left:4px;top:8px">${todoIcon(td.status, 18)}</div><div class="ab sans clip" style="left:34px;top:7px;width:578px;font-size:15px;line-height:22px;color:${td.status === "in_progress" ? "#fff" : "#c3cbd6"}">${esc(td.text)}</div>`;
            plRows.append(row);
            return row;
          });
        }
        plRows.__rows.forEach((row, j) => { const a = clamp01((ph.q * 1.6 - j * 0.12) / 0.2); css(row, "opacity", a.toFixed(3)); css(row, "transform", `translateX(${((1 - easeOut(a)) * 10).toFixed(1)}px)`); });
      }
      if (vk === "tick") {
        const rows = sg.rows;
        setText(tkRange, `steps ${sg.steps[0].i + 1}–${sg.steps[sg.steps.length - 1].i + 1} · ${sg.steps.length} tool calls shown`);
        const k = clamp01(p / 0.9) * rows.length;
        const shown = Math.min(rows.length, Math.floor(k) + 1);
        const topRow = Math.max(0, shown - 11);
        for (const r of SEGS.filter((s) => s.type === "montage")) for (const rr of r.rows) css(rr, "display", r === sg ? "block" : "none");
        rows.forEach((row, n) => {
          css(row, "top", `${(n - topRow) * 34}px`);
          css(row, "opacity", n < shown ? (n === shown - 1 ? clamp01((k - n) / 0.5) : 0.75).toFixed(3) : "0");
        });
      }
      if (vk === "doc") {
        const q2 = ph.q;
        DOC_ROWS.forEach((row, j) => { const a = clamp01((q2 * 1.25 - j * 0.15) / 0.18); css(row, "opacity", a.toFixed(3)); css(row, "transform", `translateY(${((1 - easeOut(a)) * 8).toFixed(1)}px)`); });
      }
      // left checklist: plan states and decisions
      const pl = segPlan(sg);
      CHK.forEach((c, j) => {
        const td = pl ? todoFor(pl.todos, c.e.id) : null;
        setHTML(c.ic, td ? todoIcon(td.status, 14) : "");
        const landAt = LAND[j];
        const dA = clamp01((t - landAt) / 250);
        css(c.dec, "visibility", dA > 0 ? "visible" : "hidden");
        css(c.dec, "opacity", dA.toFixed(3));
        css(c.prop, "opacity", (1 - dA).toFixed(3));
        // the register rows (D01…D06) are printed in the first step's output: highlight each entry as its line appears
        const k0 = SEGS[0];
        const lineAt = k0 && k0.type === "tool" ? k0.start + (0.45 + 0.55 * 0.5 * ((j + 2) / ((k0.out || []).length + 1))) * k0.ms : Infinity;
        const g = Math.max(bump(t - landAt, 100, 900), bump(t - lineAt, 80, 300));
        css(c.row, "background", g > 0 ? rgba(C.model, 0.16 * g) : "transparent");
      });
      // right: run counters and plan
      const real = realAt(t);
      setText(rClock, mmss(real));
      const inStats = t >= STATS.start;
      const nFiles = inStats ? (num(A.files_opened) ? A.files_opened : FILE_EVENTS.length) : FILE_EVENTS.filter((f) => t >= f.at).length;
      setHTML(rFiles, `${nFiles} <span class="dim">/ ${NMAT}</span>`);
      const afterMont = SEGS.some((s) => s.type === "montage" && t >= s.end) && !SEGS.some((s) => s.type === "montage" && t < s.end);
      setText(rFilesNote, inStats ? "files opened, whole run" : afterMont ? `files named in steps 1–${MONT_END_STEP}` : "");
      const curStep = sg.type === "stats" ? null : sg.type === "montage"
        ? sg.steps[Math.min(sg.steps.length - 1, Math.floor(clamp01(p / 0.9) * sg.steps.length))].i
        : (sg.type === "say" && sg.also && (ph.name === "type" || ph.name === "run" || ph.name === "output")) ? sg.also.i
          : ph.name === "think" && sg.skipped ? null : sg.i;
      setText(rStep, curStep === null ? "" : `step ${curStep + 1}`);
      CELLS.forEach((cell, j) => {
        const fe = FILE_EVENTS[j];
        const on = j < nFiles;
        const g = fe && on ? bump(t - fe.at, 60, 600) : 0;
        css(cell, "background", on ? (fe ? fe.color : C.brand) : "#1c2431");
        css(cell, "boxShadow", g > 0 ? `0 0 ${(10 * g).toFixed(1)}px ${rgba(fe.color, 0.8 * g)}` : "none");
      });
      setHTML(rTools, num(A.tool_calls) ? `${A.tool_calls}` : "");
      css(rTools, "color", inStats ? "#ffffff" : C.dim);
      css(rToolsLbl, "color", inStats ? "#c3cbd6" : C.dim);
      const todos = pl ? pl.todos || [] : [];
      PROWS.forEach((r, j) => {
        const td = todos[j];
        css(r.row, "visibility", td ? "visible" : "hidden");
        if (!td) return;
        setHTML(r.ic, todoIcon(td.status, 14));
        setText(r.tx, td.text || "");
        css(r.tx, "color", td.status === "completed" ? "#c3cbd6" : td.status === "in_progress" ? "#fff" : C.dim);
      });
      setHTML(planCount, todos.length ? `<span class="dim">${todos.filter((x) => x.status === "completed").length} / ${todos.length} done</span>` : `<span class="dim">no plan yet</span>`);
      // focus: dim side panels unless they update
      let lf = 0;
      let rf = 0;
      for (const s2 of SEGS) {
        if (s2.type === "plan") { lf = Math.max(lf, bump(t - (s2.start + 0.5 * s2.ms), 150, 1400)); rf = Math.max(rf, bump(t - (s2.start + 0.5 * s2.ms), 150, 1400)); }
        if (s2.type === "report") lf = Math.max(lf, t >= (LAND[0] ?? s2.start) - 300 && t < s2.end + 600 ? 1 : 0);
        if (s2.type === "montage") rf = Math.max(rf, t >= s2.start && t < s2.end ? 1 : 0);
        if (s2.type === "tool" && s2 === SEGS[0]) lf = Math.max(lf, t >= s2.start + 0.45 * s2.ms && t < s2.end ? 1 : 0);
      }
      if (inStats) { lf = 1; rf = 1; }
      for (const pl2 of PLANS) {
        const s2 = SEGS.find((s) => s.type !== "stats" && s.type !== "montage" && s.i >= pl2.i && (s.type === "plan" ? s.i === pl2.i : true));
        if (s2 && s2.type !== "plan") rf = Math.max(rf, bump(t - s2.start, 150, 1200));
      }
      css(chk, "opacity", (0.6 + 0.4 * lf).toFixed(3));
      css(run, "opacity", (0.6 + 0.4 * rf).toFixed(3));
      css(plan, "opacity", (0.6 + 0.4 * rf).toFixed(3));
    }
    function dotAgent(t) {
      const sg = segAt(t);
      const p = clamp01((t - sg.start) / sg.ms);
      const ph = phaseOf(sg, p);
      const q = ph.q;
      if (sg.type === "stats") return { pos: 1, active: 1 };
      if (sg.type === "montage") return { pos: 2, active: 2, pulse: true };
      if (ph.name === "think" || ph.name === "say") return { pos: 0, active: 0, pulse: true };
      if (ph.name === "plan") {
        if (q < 0.12) return { pos: ease(q / 0.12), active: q < 0.1 ? 0 : 1 };
        if (q < 0.82) return { pos: 1, active: 1, pulse: true };
        return { pos: 1 - ease((q - 0.82) / 0.12), active: q < 0.92 ? 1 : 0 };
      }
      if (ph.name === "type") return q < 0.72 ? { pos: 0, active: 0 } : { pos: ease((q - 0.72) / 0.28), active: q < 0.95 ? 0 : 1 };
      if (ph.name === "run") return { pos: 1 + ease(q / 0.45), active: q < 0.45 ? 1 : 2, pulse: q >= 0.45 };
      if (ph.name === "output") return q < 0.45 ? { pos: 2, active: 2 } : { pos: 2 - 2 * ease((q - 0.45) / 0.4), active: q < 0.65 ? 2 : 0 };
      if (ph.name === "doc") return { pos: 0, active: 0 };
      return { pos: 0, active: 0 };
    }
    function renderCheck(t) {
      const tt = t - CK.start;
      const revOn = REVEALS.find((r) => t >= r.start && t < r.end);
      const tallyOn = tt >= TALLY0;
      const dimRows = revOn || tallyOn ? 0.1 : 1;
      let total = 0;
      ROWS_DOM.forEach((r, j) => {
        const a = clamp01((t - r.at) / 300);
        css(r.row, "opacity", (a * dimRows).toFixed(3));
        r.chipsDom.forEach((cd, n) => {
          const at = r.at + 200 + n * 90;
          const on = t >= at;
          const s = cd.s;
          const pop = bump(t - at, 90, 500);
          css(cd.node, "opacity", on ? "1" : "0");
          css(cd.node, "borderColor", s.border);
          css(cd.node, "borderStyle", s.dash ? "dashed" : "solid");
          css(cd.node, "background", s.bg);
          css(cd.node, "transform", `scale(${(1 + 0.08 * pop).toFixed(3)})`);
          cd.node.children[1].style.color = s.id;
          cd.node.children[3].style.color = s.stc;
        });
        // the row tally counts up as its chips appear
        const shown = sum(r.chipsDom.filter((cd, n) => t >= r.at + 200 + n * 90 && isPos(cd.c)).map((cd) => wOf(cd.c) * clamp01(num(cd.c.value) ? cd.c.value : 0)));
        const done = t >= r.at + 200 + r.chipsDom.length * 90;
        setHTML(r.tally, r.possible ? `<span style="color:#e8edf3">${fmtW(Math.round(shown * 100) / 100)}</span><span class="dim"> / ${fmtW(r.possible)}</span>` : `<span class="dim">—</span>`);
        total += done ? r.earned : shown;
      });
      const allDone = ROWS_DOM.every((r) => t >= r.at + 200 + r.chipsDom.length * 90);
      setHTML(totalTxt, `<span class="dim">positive weight earned </span><span class="fg">${fmtW(Math.round((allDone ? RS.earned_positive_weight : total) * 100) / 100)} / ${fmtW(RB.positive_weight)}</span>`
        + `<span class="dim"> · ${allDone ? `${COUNTS.penalty_triggered || 0} of ${N_PEN} penalties triggered · red lines ${COUNTS.redline_triggered ? "violated" : "clear"}` : "…"}</span>`);
      css(totalRow, "opacity", (clamp01((tt - ROW_T0) / 300) * dimRows).toFixed(3));
      REVEALS.forEach((r) => {
        const a = Math.min(clamp01((t - r.start) / 320), clamp01((r.end - t) / 260));
        show(r.card, t >= r.start && t < r.end ? a : 0);
        css(r.card, "transform", `scale(${(0.97 + 0.03 * easeOut(clamp01((t - r.start) / 400))).toFixed(3)})`);
      });
      const ta = clamp01((tt - TALLY0) / 320);
      show(tallyBox, tallyOn ? ta : 0);
      setText(tallyNum, REWARD !== null ? lerp(0, REWARD, easeOut((tt - TALLY0 - 500) / 900)).toFixed(3) : "—");
    }
    function rail(t, ph, scene) {
      let pos = null;
      let pulse = false;
      const lit = new Set();
      let dot = true;
      if (scene === "task") { dot = false; const tt = t - TASK.start; if (tt >= TB && tt < TFLY + 400) lit.add(3); }
      else if (scene === "agent") {
        if (t < AG.start) dot = false;
        else { const d = dotAgent(t); pos = d.pos; pulse = d.pulse; if (Math.abs(pos - Math.round(pos)) < 0.05) lit.add(Math.round(pos)); }
      } else if (scene === "check") {
        const tt = t - CK.start;
        pos = 2 + ease(tt / 600);
        lit.add(tt >= 600 ? 3 : 2);
        pulse = tt >= 600 && tt < TALLY0;
      } else dot = false;
      if (ph.kind === "card") dot = false;
      NODES.forEach((node, i) => {
        const on = lit.has(i);
        const col = C[ROLE_KEYS[i]];
        css(node, "opacity", on ? "1" : "0.5");
        css(node, "borderColor", on ? rgba(col, 0.9) : "#222b39");
        css(node, "background", on ? rgba(col, 0.13) : "rgba(16, 22, 31, .92)");
        css(node, "boxShadow", on ? `0 0 22px ${rgba(col, 0.28)}` : "none");
        TICKS[i].setAttribute("fill", on ? col : "#2b3546");
      });
      if (dot && pos !== null) {
        const col = C[ROLE_KEYS[clamp(Math.round(pos), 0, 3)]];
        const x = railX(clamp(pos, 0, 3));
        for (const c of [TOKEN, TOKEN_GLOW]) { c.setAttribute("cx", x.toFixed(1)); c.setAttribute("fill", col); }
        TOKEN.setAttribute("opacity", 1);
        TOKEN_GLOW.setAttribute("opacity", 0.22);
        if (pulse) {
          const q = (((t % 900) + 900) % 900) / 900;
          TOKEN_RING.setAttribute("cx", x.toFixed(1));
          TOKEN_RING.setAttribute("r", (7 + 10 * easeOut(q)).toFixed(1));
          TOKEN_RING.setAttribute("stroke", col);
          TOKEN_RING.setAttribute("opacity", ((1 - q) * 0.8).toFixed(3));
        } else TOKEN_RING.setAttribute("opacity", 0);
      } else for (const c of [TOKEN, TOKEN_GLOW, TOKEN_RING]) c.setAttribute("opacity", 0);
    }
    function renderResult(t) {
      const tt = t - RSP.start;
      show(ovR, t < OUT.start ? clamp01(tt / 400) : 1 - clamp01((t - OUT.start) / 450));
      const q = easeOut((tt - 200) / 1100);
      const circ = 2 * Math.PI * 82;
      const val = REWARD !== null ? REWARD : 0;
      ringArc.setAttribute("stroke-dasharray", `${(circ * val * q).toFixed(2)} ${circ.toFixed(2)}`);
      ringArc.setAttribute("opacity", val * q > 0.002 ? 1 : 0);
      setText(rNum, REWARD !== null ? lerp(0, REWARD, q).toFixed(3) : "—");
      rNum.style.opacity = clamp01((tt - 150) / 300);
      rTitle.style.opacity = clamp01((tt - 450) / 350);
      rRun.style.opacity = clamp01((tt - 700) / 400);
      rCounts.style.opacity = clamp01((tt - 950) / 400);
      rRef.style.opacity = clamp01((tt - 1500) / 400);
      rPilot.style.opacity = clamp01((tt - 1900) / 400);
    }
    function renderEnd(t) {
      const tt = t - OUT.start;
      show(ovE, clamp01((tt - 250) / 500));
      for (const [node, at] of [[eMark, 250], [eWord, 300], [eSp, 380], [eQ, 600]]) node.style.opacity = clamp01((tt - at) / 400);
      eQ.style.transform = `translateY(${((1 - easeOut((tt - 600) / 500)) * 10).toFixed(1)}px)`;
      LBOX.forEach((b, i) => {
        const a = clamp01((tt - 1100 - i * 220) / 350);
        b.style.opacity = a;
        b.style.transform = `translateY(${((1 - easeOut(a)) * 10).toFixed(1)}px)`;
        if (i > 0) LARROWS[i - 1].setAttribute("opacity", a.toFixed(3));
      });
      const la = clamp01((tt - 1100 - LOOP.length * 220) / 400);
      loopBack.setAttribute("opacity", la);
      loopHead.setAttribute("opacity", la);
      eUrl.style.opacity = clamp01((tt - 2600) / 400);
      eNote.style.opacity = clamp01((tt - 2900) / 400);
      eTrial.style.opacity = clamp01((tt - 3000) / 400);
    }
    CAPS.sort((a, b) => a.from - b.from);
    const capMain = $("cap-main");
    const capSub = $("cap-sub");
    let capKey = null;
    function renderCaption(t) {
      const cp = CAPS.find((c) => t >= c.from && t < c.to);
      if (!cp) { css(capMain, "opacity", "0"); css(capSub, "opacity", "0"); return; }
      if (capKey !== cp) { capKey = cp; capMain.textContent = cp.text; fitFont(capMain, 1200, 25, 18); }
      const a = Math.min(clamp01((t - cp.from) / 240), clamp01((cp.to - t) / 200));
      css(capMain, "opacity", a.toFixed(3));
      css(capMain, "transform", `translateY(${((1 - easeOut((t - cp.from) / 320)) * 6).toFixed(1)}px)`);
      setHTML(capSub, typeof cp.sub === "function" ? cp.sub(t) : cp.sub || "");
      css(capSub, "opacity", a.toFixed(3));
    }
    const SCENES = { task: STK, agent: SAG, check: SCK };
    const SCENE_OF = { task: "task", agent: "agent", check: "check", result: "check" };
    function sceneAt(pi, p) {
      const ph = PH[pi];
      if (ph.kind === "card") return p < 0.5 ? SCENE_OF[PH[pi - 1] && PH[pi - 1].kind] || null : SCENE_OF[PH[pi + 1] && PH[pi + 1].kind] || null;
      return SCENE_OF[ph.kind] || null;
    }
    function renderAt(t) {
      t = clamp(t, 0, TOTAL - 1);
      const pi = phaseIndexAt(t);
      const ph = PH[pi];
      const p = clamp01((t - ph.start) / ph.ms);
      const openA = t < OPEN.end ? 1 - clamp01((t - (OPEN.end - 500)) / 500) : 0;
      show($("ov-open"), openA);
      if (openA > 0) renderOpen(t);
      show($("top"), t < OPEN.end ? clamp01((t - (OPEN.end - 700)) / 600) : ph.kind === "outro" ? 1 - clamp01((t - ph.start) / 500) : 1);
      if (ph.kind === "card") renderCard(t, ph); else show(ovCard, 0);
      if (t >= RSP.start) renderResult(t); else show(ovR, 0);
      if (ph.kind === "outro") renderEnd(t); else show(ovE, 0);
      CHAPTERS.forEach((c) => {
        css(c.fill, "width", `${(clamp01((t - c.start) / (c.end - c.start)) * 100).toFixed(2)}%`);
        css(c.node, "color", t >= c.start && t < c.end ? "#ffffff" : t >= c.end ? c.color : "#4a5468");
      });
      setHTML($("clock"), "");
      const scene2 = sceneAt(pi, p);
      for (const [k, node] of Object.entries(SCENES)) show(node, k === scene2 ? 1 : 0);
      const pipeA = t < OPEN.end ? clamp01((t - (OPEN.end - 300)) / 300) : ph.kind === "outro" ? 1 - clamp01((t - ph.start) / 400) : 1;
      for (const n of [railSvg, $("nodes")]) show(n, pipeA);
      if (scene2 === "task") renderTask(t);
      if (scene2 === "agent") renderAgent(Math.max(t, AG.start), t);
      if (scene2 === "check") renderCheck(Math.max(t, CK.start));
      rail(t, ph, scene2);
      renderCaption(t);
    }

    // ---------- playback ----------
    let t = (Math.max(0, Number(params.get("t") || 0)) * 1000) % TOTAL;
    let paused = params.has("pause");
    let lastNow = performance.now();
    function frame(now) {
      const dt = Math.min(100, now - lastNow);
      lastNow = now;
      if (!paused) t = (t + dt) % TOTAL;
      renderAt(t);
      requestAnimationFrame(frame);
    }
    function fitStage() {
      if (params.has("capture")) { $("stage").style.transform = "none"; document.body.style.display = "block"; return; }
      const s = Math.min(2, (innerWidth - 32) / 1280, (innerHeight - 32) / 720);
      $("stage").style.transform = `scale(${Math.max(0.2, s)})`;
    }
    addEventListener("resize", fitStage);
    addEventListener("keydown", (e) => {
      if (e.code === "Space") { paused = !paused; e.preventDefault(); }
      if (e.code === "ArrowRight") t = (t + 2000) % TOTAL;
      if (e.code === "ArrowLeft") t = (t - 2000 + TOTAL) % TOTAL;
    });
    window.replay = {
      renderAt, total: TOTAL, phases: PH, segments: SEGS.map((s) => ({ type: s.type, i: s.i, start: s.start, end: s.end })), captions: CAPS,
      posterMs: RSP.start + 2400, mock: false, partial: [],
      chapters: CHAPTERS.map((c) => ({ label: c.label, title: c.title, start: c.start, end: c.end })),
      seek(ms) { t = ms; paused = true; renderAt(t); },
    };
    fitStage();
    renderAt(t);
    requestAnimationFrame(frame);
  }

  boot();
})();
