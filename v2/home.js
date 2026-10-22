/* home.js — v2 homepage behaviours. Load with defer after language.js and v2.js.
 * Translation stays with language.js: headings keep their original text in a
 * visually hidden source span, and only a mirrored copy is split for motion,
 * so switching language re-renders the motion layer from translated text. */

/* ---- Replay console, spotlight cards, magnetic buttons ---- */
(() => {
  const con = document.getElementById("console");
  const scenes = con.querySelectorAll(".scene");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let userPaused = false;

  function restart() {
    con.classList.remove("run");
    void con.offsetWidth; // reflow so CSS animations replay from 0
    con.classList.add("run");
  }
  function show(id) {
    con.dataset.scene = id;
    scenes.forEach(s => s.classList.toggle("live", s.dataset.id === String(id)));
    con.querySelectorAll("[data-scene-btn]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.sceneBtn === String(id))));
    restart();
  }
  scenes.forEach(s => s.querySelector(".timer").addEventListener("animationend", () => {
    if (!reduce.matches && s.classList.contains("live")) show(s.dataset.id === "1" ? 2 : 1);
  }));
  con.querySelectorAll("[data-scene-btn]").forEach(b => b.addEventListener("click", () => show(b.dataset.sceneBtn)));

  const pp = document.getElementById("playpause");
  let offscreen = false;
  function syncPause() {
    con.classList.toggle("paused", userPaused || offscreen || document.hidden);
    pp.querySelector(".ic-pause").hidden = userPaused;
    pp.querySelector(".ic-play").hidden = !userPaused;
    pp.setAttribute("aria-label", userPaused ? "Play replay" : "Pause replay");
  }
  pp.addEventListener("click", () => { userPaused = !userPaused; syncPause(); });
  new IntersectionObserver(([e]) => { offscreen = !e.isIntersecting; syncPause(); }, { threshold: 0.15 }).observe(con);
  document.addEventListener("visibilitychange", syncPause);

  document.querySelectorAll(".card").forEach(card => card.addEventListener("pointermove", e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  if (!reduce.matches) document.querySelectorAll(".magnetic").forEach(btn => {
    btn.addEventListener("pointermove", e => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--tx", `${((e.clientX - r.left) / r.width - 0.5) * 6}px`);
      btn.style.setProperty("--ty", `${((e.clientY - r.top) / r.height - 0.5) * 6}px`);
    });
    btn.addEventListener("pointerleave", () => { btn.style.setProperty("--tx", "0px"); btn.style.setProperty("--ty", "0px"); });
  });
})();

/* ---- Motion engine: mirrored kinetic type, reveals, counters, parallax, tilt ---- */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RANGE = String.fromCharCode(0x3400) + "-" + String.fromCharCode(0x9fff);
  const CJK = new RegExp(`[${RANGE}]`);
  const CHUNKS = new RegExp(`[${RANGE}]|[^${RANGE}]+`, "g");

  // Tokens of the source: words, or single CJK characters; <em> dims, .hl highlights.
  function tokensOf(src) {
    const out = [];
    for (const node of src.childNodes) {
      const el = node.nodeType === 1 ? node : null;
      const em = !!el && el.tagName === "EM", hl = !!el && el.classList.contains("hl");
      for (const chunk of node.textContent.match(CHUNKS) || []) {
        if (CJK.test(chunk)) out.push({ t: chunk, em, hl });
        else chunk.split(/(\s+)/).forEach(p => { if (p) out.push({ t: p, em, hl, space: /^\s+$/.test(p) }); });
      }
    }
    // Chinese text needs no spaces between characters, even where the English fragments had them.
    return out.filter((tk, i) => !(tk.space && i > 0 && i < out.length - 1 && CJK.test(out[i - 1].t.slice(-1)) && CJK.test(out[i + 1].t[0])));
  }

  // Keep the original nodes (translated in place by language.js) in a hidden
  // source span and draw an aria-hidden mirror that is never translated.
  function mirror(el, opts = {}) {
    const src = document.createElement("span"); src.className = "split-src";
    while (el.firstChild) src.append(el.firstChild);
    const vis = document.createElement("span"); vis.className = "split-vis";
    vis.setAttribute("aria-hidden", "true"); vis.setAttribute("data-no-translate", "");
    el.append(src, vis);
    function draw() {
      vis.textContent = "";
      const made = []; let i = 0;
      for (const tk of tokensOf(src)) {
        if (tk.space) { vis.append(" "); continue; }
        if (opts.scrub) {
          const s = document.createElement("span"); s.className = tk.hl ? "tk hl" : "tk"; s.textContent = tk.t;
          vis.append(s); made.push(s);
        } else {
          const w = document.createElement("span"); w.className = tk.em ? "w em" : "w";
          const inner = document.createElement("span"); inner.textContent = tk.t; inner.style.setProperty("--wi", i++);
          w.append(inner); vis.append(w); made.push(w);
        }
      }
      if (opts.onDraw) opts.onDraw(made);
    }
    new MutationObserver(draw).observe(src, { childList: true, characterData: true, subtree: true });
    draw();
  }
  window.__mirror = mirror;
  document.querySelectorAll("[data-split]").forEach(el => mirror(el));

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const to = +el.dataset.count;
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1500;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      el.textContent = Math.round(to * e).toLocaleString("en");
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // staggered reveals: index each .reveal within its parent, reveal once on entry
  const seen = new Map();
  document.querySelectorAll(".reveal").forEach(el => {
    const n = seen.get(el.parentElement) || 0;
    el.style.setProperty("--i", n); seen.set(el.parentElement, n + 1);
  });
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    e.target.querySelectorAll("[data-count]").forEach(countUp);
    io.unobserve(e.target);
  }), { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
  document.querySelectorAll(".reveal, [data-observe]").forEach(el => io.observe(el));
  setTimeout(() => document.querySelectorAll(".hero [data-count]").forEach(countUp), reduce ? 0 : 900);

  // scroll-linked: hero exit, parallax, section ambience
  const hero = document.querySelector(".hero");
  const para = [...document.querySelectorAll("[data-parallax]")];
  const ambient = document.querySelector(".ambient");
  const ambs = [...document.querySelectorAll(".ambient i")];
  const secs = ambs.map(a => document.getElementById(a.dataset.amb));
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight;
    if (!reduce) {
      hero.style.setProperty("--hx", Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.9))).toFixed(4));
      for (const el of para) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        el.style.setProperty("--py", ((r.top + r.height / 2 - vh / 2) * -parseFloat(el.dataset.parallax)).toFixed(1) + "px");
      }
    }
    let cur = -1;
    secs.forEach((sec, i) => { if (sec && sec.getBoundingClientRect().top <= vh * 0.45) cur = i; });
    ambs.forEach((a, i) => a.classList.toggle("on", i === cur));
    if (ambient) ambient.dataset.amb = cur >= 0 ? ambs[cur].dataset.amb : "";
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener("resize", frame);
  frame();

  if (reduce) return;

  // hero console: resting 3D pose that follows the pointer and flattens on hover
  const con = document.getElementById("console");
  const REST = { x: 4, y: -6 };
  let cx = REST.x, cy = REST.y, tx = REST.x, ty = REST.y, running = false;
  function tiltLoop() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    con.style.setProperty("--crx", cx.toFixed(2) + "deg");
    con.style.setProperty("--cry", cy.toFixed(2) + "deg");
    running = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.02;
    if (running) requestAnimationFrame(tiltLoop);
  }
  const kick = () => { if (!running) { running = true; requestAnimationFrame(tiltLoop); } };
  hero.addEventListener("pointermove", e => {
    if (con.contains(e.target)) { tx = 0; ty = 0; }
    else {
      const r = hero.getBoundingClientRect();
      tx = REST.x - ((e.clientY - r.top) / r.height - 0.5) * 6;
      ty = REST.y + ((e.clientX - r.left) / r.width - 0.5) * 9;
    }
    kick();
  });
  hero.addEventListener("pointerleave", () => { tx = REST.x; ty = REST.y; kick(); });

  // cards: subtle 3D tilt toward the pointer
  document.querySelectorAll("[data-tilt]").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--rx", (((e.clientY - r.top) / r.height - 0.5) * -5).toFixed(2) + "deg");
      card.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(2) + "deg");
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  });
})();

/* ---- Manifesto scrub, pinned workflow, aims panels, dividers, media label ---- */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STICKY_TOP = 112;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const man = document.getElementById("manifesto");
  let tokens = [];

  const flow = document.getElementById("flow");
  const fSticky = flow.querySelector(".flow-sticky"), track = flow.querySelector(".flow-track");
  const panels = [...track.children], steps = [...flow.querySelectorAll(".s4")];
  let dist = 0;
  function layoutFlow() {
    if (reduce) { flow.classList.add("static"); panels.forEach(p => p.classList.add("act")); return; }
    dist = Math.max(0, track.scrollWidth - innerWidth);
    flow.style.height = Math.round(fSticky.offsetHeight + dist * 1.15 + innerHeight * 0.25) + "px";
  }

  function scrubFrame() {
    const vh = innerHeight;
    const mr = man.getBoundingClientRect();
    const mp = clamp((STICKY_TOP - mr.top) / (man.offsetHeight - (vh - STICKY_TOP)));
    const n = tokens.length, win = 5;
    tokens.forEach((t, i) => t.style.setProperty("--o", reduce ? 1 : clamp((mp * 1.12 * (n + win) - i) / win).toFixed(3)));
    man.querySelector(".m-foot").style.setProperty("--mp", mp.toFixed(3));
    if (!reduce) {
      const fr = flow.getBoundingClientRect();
      const total = flow.offsetHeight - fSticky.offsetHeight;
      const fp = clamp((STICKY_TOP - fr.top) / Math.max(1, total));
      track.style.setProperty("--fx", (-Math.min(1, fp * 1.08) * dist).toFixed(1) + "px");
      const k = panels.length, idx = Math.min(k - 1, Math.floor(fp * 1.08 * k));
      panels.forEach((el, i) => el.classList.toggle("act", i === idx));
      steps.forEach((st, i) => { st.style.setProperty("--f", clamp(fp * 1.08 * k - i).toFixed(3)); st.classList.toggle("on", i <= idx); });
    }
  }
  window.__mirror(man.querySelector("[data-scrub]"), { scrub: true, onDraw: made => { tokens = made; scrubFrame(); } });
  let tick = false;
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; scrubFrame(); }); } }, { passive: true });
  addEventListener("resize", () => { layoutFlow(); scrubFrame(); });
  // translated copy changes panel widths: relayout when language.js switches language
  new MutationObserver(() => requestAnimationFrame(() => { layoutFlow(); scrubFrame(); })).observe(root, { attributes: true, attributeFilter: ["lang"] });
  layoutFlow(); scrubFrame();
  if (document.fonts) document.fonts.ready.then(() => { layoutFlow(); scrubFrame(); });

  const axs = [...document.querySelectorAll(".aims-x > .ax")];
  const activate = el => axs.forEach(a => a.classList.toggle("active", a === el));
  axs.forEach(a => { a.addEventListener("pointerenter", () => activate(a)); a.addEventListener("focusin", () => activate(a)); });

  const dio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("seen"); dio.unobserve(e.target); } }), { threshold: 0.05 });
  document.querySelectorAll(".section").forEach(el => dio.observe(el));

  // a small label follows the pointer over labelled media only
  if (reduce || matchMedia("(hover: none)").matches) return;
  const cur = document.querySelector(".cursor"), lab = cur.querySelector(".cursor-label");
  let x = -100, y = -100, tx = -100, ty = -100, label = "";
  addEventListener("pointermove", e => {
    tx = e.clientX; ty = e.clientY; cur.classList.add("on");
    const labelled = e.target.closest("[data-cursor]");
    const control = e.target.closest("a, button");
    const show = labelled && !(control && labelled.contains(control) && control !== labelled);
    cur.classList.toggle("big", !!show);
    const next = show ? labelled.dataset.cursor : "";
    if (next !== label) { label = next; lab.textContent = next; }
  }, { passive: true });
  document.addEventListener("pointerleave", () => cur.classList.remove("on"));
  (function loop() {
    x += (tx - x) * 0.22; y += (ty - y) * 0.22;
    cur.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    requestAnimationFrame(loop);
  })();
})();

/* ---- Section sub-nav: scrollspy + reading progress ---- */
(() => {
  const nav = document.querySelector(".home-subnav");
  const links = [...nav.querySelectorAll("[data-spy]")];
  const sections = links.map(a => document.getElementById(a.dataset.spy));
  const bar = nav.querySelector(".progress");
  function update() {
    const y = innerHeight * 0.35;
    let current = null;
    sections.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= y) current = i; });
    links.forEach((a, i) => a.classList.toggle("active", i === current));
    const first = sections[0].getBoundingClientRect().top + scrollY, last = sections.at(-1);
    const end = last.getBoundingClientRect().bottom + scrollY - innerHeight;
    bar.style.setProperty("--p", Math.min(1, Math.max(0, (scrollY - first + innerHeight * 0.35) / (end - first))));
  }
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
})();

/* ---- Demo media: hover preview (muted), click to play with sound ---- */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("[data-media]").forEach(m => {
    const v = m.querySelector("video");
    m.querySelector(".play-btn").addEventListener("click", () => {
      m.classList.add("engaged"); m.classList.remove("previewing");
      v.controls = true; v.muted = false; v.play().catch(() => {});
    });
    m.addEventListener("pointerenter", () => {
      if (reduce.matches || m.classList.contains("engaged")) return;
      m.classList.add("previewing"); v.muted = true; v.play().catch(() => {});
    });
    m.addEventListener("pointerleave", () => {
      if (m.classList.contains("engaged")) return;
      m.classList.remove("previewing"); v.pause(); v.currentTime = 0;
    });
  });
})();

/* ---- Hero background: a living inference network ---- */
(() => {
  const hero = document.querySelector(".hero");
  const cvs = document.getElementById("net");
  const ctx = cvs.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let W = 0, H = 0;

  // stable layout from a seeded PRNG; motion uses Math.random
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const LAYERS = [10, 14, 16, 14, 10, 6];
  const layers = [], nodes = [], edges = [];
  LAYERS.forEach((n, li) => {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const node = {
        x: -1 + li * (2 / (LAYERS.length - 1)) + (rnd() - 0.5) * 0.14,
        y: ((i + 0.5) / n - 0.5) * 1.55 * (1 - li * 0.07) + (rnd() - 0.5) * 0.09,
        z: (rnd() - 0.5) * 1.2,
        out: [], sx: 0, sy: 0, s: 1, glow: 0, gc: 0
      };
      arr.push(node); nodes.push(node);
    }
    layers.push(arr);
  });
  const d2 = (a, b) => (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
  for (let li = 0; li < layers.length - 1; li++) layers[li].forEach(a => {
    [...layers[li + 1]].sort((p, q) => d2(a, p) - d2(a, q)).slice(0, 3).forEach(b => { const e = { a, b }; a.out.push(e); edges.push(e); });
  });

  // resolve CSS colors (including oklch) to rgb triplets
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgb = c => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = c; probe.fillRect(0, 0, 1, 1); const d = probe.getImageData(0, 0, 1, 1).data; return `${d[0]},${d[1]},${d[2]}`; };
  let C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const dark = document.documentElement.dataset.theme !== "light";
    C = { t: [rgb(cs.getPropertyValue("--track-1").trim()), rgb(cs.getPropertyValue("--track-2").trim())], ink: dark ? "255,255,255" : "14,20,32", edgeA: dark ? 0.09 : 0.08, nodeA: dark ? 0.35 : 0.3 };
  }
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  readColors();

  function resize() {
    const r = hero.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    cvs.style.width = W + "px"; cvs.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(hero);
  resize();

  let mx = 0, my = 0, tmx = 0, tmy = 0, px = -1e4, py = -1e4;
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    px = e.clientX - r.left; py = e.clientY - r.top;
    tmx = px / W - 0.5; tmy = py / H - 0.5;
    hero.style.setProperty("--px", px + "px"); hero.style.setProperty("--py", py + "px");
  });
  hero.addEventListener("pointerleave", () => { px = py = -1e4; tmx = tmy = 0; });

  function project(time) {
    const ay = -0.62 + mx * 0.38 + Math.sin(time * 0.00011) * 0.14, ax = 0.16 + my * 0.22;
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    for (const n of nodes) {
      const x1 = n.x * cy - n.z * sy, z1 = n.x * sy + n.z * cy;
      const y1 = n.y * cx - z1 * sx, z2 = n.y * sx + z1 * cx;
      const s = 2.6 / (2.6 + z2);
      n.sx = W * 0.62 + x1 * s * W * 0.37; n.sy = H * 0.48 + y1 * s * H * 0.6; n.s = s;
    }
  }

  const pulses = [];
  function spawn() {
    const a = layers[0][(Math.random() * layers[0].length) | 0];
    pulses.push({ e: a.out[(Math.random() * a.out.length) | 0], t: 0, dur: 700 + Math.random() * 700, c: Math.random() < 0.55 ? 0 : 1 });
  }
  function step(dt) {
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt / p.dur;
      if (p.t >= 1) {
        const b = p.e.b; b.glow = 1; b.gc = p.c;
        if (b.out.length && Math.random() < 0.9) { p.e = b.out[(Math.random() * b.out.length) | 0]; p.t = 0; }
        else pulses.splice(i, 1);
      }
    }
    for (const n of nodes) n.glow = Math.max(0, n.glow - dt / 900);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (const e of edges) {
      const a = C.edgeA * ((e.a.s + e.b.s) / 2 - 0.55) * 1.6;
      ctx.strokeStyle = `rgba(${C.ink},${Math.max(0.015, a)})`;
      ctx.beginPath(); ctx.moveTo(e.a.sx, e.a.sy); ctx.lineTo(e.b.sx, e.b.sy); ctx.stroke();
    }
    // pointer constellation
    for (const n of nodes) {
      const d = Math.hypot(n.sx - px, n.sy - py);
      if (d < 150) {
        ctx.strokeStyle = `rgba(${C.t[0]},${(1 - d / 150) * 0.5})`;
        ctx.beginPath(); ctx.moveTo(n.sx, n.sy); ctx.lineTo(px, py); ctx.stroke();
        n.glow = Math.max(n.glow, (1 - d / 150) * 0.8); n.gc = 0;
      }
    }
    // pulses with comet trails
    ctx.lineCap = "round";
    for (const p of pulses) {
      const { a, b } = p.e, t0 = Math.max(0, p.t - 0.35);
      const hx = a.sx + (b.sx - a.sx) * p.t, hy = a.sy + (b.sy - a.sy) * p.t;
      const tx = a.sx + (b.sx - a.sx) * t0, ty = a.sy + (b.sy - a.sy) * t0;
      // a two-step trail and a solid head: no per-frame gradients or shadow blur
      const col = C.t[p.c], mx = (tx + hx) / 2, my = (ty + hy) / 2;
      ctx.lineWidth = 1.6 * b.s;
      ctx.strokeStyle = `rgba(${col},0.22)`; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = `rgba(${col},0.8)`; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = `rgba(${col},0.22)`; ctx.beginPath(); ctx.arc(hx, hy, 5 * b.s, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(${col},1)`; ctx.beginPath(); ctx.arc(hx, hy, 1.9 * b.s, 0, 7); ctx.fill();
    }
    ctx.lineWidth = 1;
    for (const n of nodes) {
      const r = (1.1 + 1.5 * n.s) * (1 + n.glow * 0.8);
      if (n.glow > 0.02) {
        ctx.fillStyle = `rgba(${C.t[n.gc]},${n.glow * 0.25})`;
        ctx.beginPath(); ctx.arc(n.sx, n.sy, r * 4, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(${C.t[n.gc]},${0.5 + n.glow * 0.5})`;
      } else ctx.fillStyle = `rgba(${C.ink},${C.nodeA * (n.s - 0.4)})`;
      ctx.beginPath(); ctx.arc(n.sx, n.sy, r, 0, 7); ctx.fill();
    }
  }

  let running = true, last = 0, acc = 0, raf = 0;
  function frame(time) {
    const dt = Math.min(48, time - (last || time)); last = time;
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    acc += dt; while (acc > 85) { acc -= 85; if (pulses.length < 46) spawn(); }
    step(dt); project(time); draw();
    raf = running ? requestAnimationFrame(frame) : 0;
  }
  function setRunning(on) {
    running = on && !reduce.matches;
    if (running && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  if (reduce.matches) { for (let i = 0; i < 180; i++) { if (i % 2 === 0) spawn(); step(40); } project(0); draw(); }
  else raf = requestAnimationFrame(frame);
  new IntersectionObserver(([e]) => setRunning(e.isIntersecting)).observe(hero);
  document.addEventListener("visibilitychange", () => setRunning(!document.hidden));
  new ResizeObserver(() => { if (!running) { project(0); draw(); } }).observe(hero);
})();

/* ---- Homepage living field: flows behind content, tinted by the active section ---- */
(() => {
  if (!window.Backdrop) return;
  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const field = Backdrop.mount(document.getElementById("field"), {
    mode: "field", host: document.body,
    velocity: () => (window.__lenis ? window.__lenis.velocity : 0),
  });
  const order = [["manifesto", 0], ["challenges", 0], ["flow", 0], ["demos", 1], ["aims", 2], ["involve", 3]];
  function update() {
    root.classList.toggle("past-hero", scrollY > hero.offsetHeight * 0.6);
    let tone = 0;
    for (const [id, t] of order) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < innerHeight * 0.5) tone = t; }
    field.setTone(tone);
  }
  addEventListener("scroll", update, { passive: true });
  update();
})();
