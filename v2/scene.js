/* scene.js — interactive layered scenes on v2 pages. Each .v2-stack holds an
 * ordered list of layers (L1 at the top of the stack) and a canvas stage that
 * draws them as stacked isometric planes with tiles, links, pulses and moving
 * agents. Hovering a layer in either place highlights it in both; dragging the
 * stage turns the stack. Tile labels are read from each layer's chips, so they
 * follow the page language. Load with defer on pages that contain a .v2-stack. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const D = Math.PI / 180, A = 1, GAP = 1, EL = 33;

  /* Scene layouts in plane units (-1..1). Tiles name the chip that labels them;
   * links join tiles as [layer, tile] pairs, within a layer or across layers. */
  const SCENES = {
    home: {
      layers: [
        { c: "t1", agents: 3, tiles: [
          { x: -0.42, z: -0.28, w: 0.62, d: 0.46, h: 0.16, c: "t1", label: 0 },
          { x: 0.42, z: -0.28, w: 0.62, d: 0.46, h: 0.16, c: "t2", label: 1 },
          { x: 0, z: 0.46, w: 0.78, d: 0.3, h: 0.06, c: "n", label: 2, files: 3 }] },
        { c: "v", agents: 4, tiles: [
          { x: -0.38, z: -0.05, w: 0.56, d: 0.56, h: 0.12, c: "v", label: 0 },
          { x: 0.4, z: -0.05, w: 0.56, d: 0.56, h: 0.22, c: "v", label: 1, ring: true }] },
        { c: "t2", agents: 3, tiles: [
          { x: -0.48, z: -0.3, w: 0.5, d: 0.4, h: 0.1, c: "t1", label: 0 },
          { x: 0.42, z: -0.3, w: 0.6, d: 0.4, h: 0.06, c: "t2", label: 1, bars: [0.16, 0.28, 0.1, 0.22] },
          { x: 0, z: 0.45, w: 0.72, d: 0.3, h: 0.12, c: "v", label: 2 }] },
      ],
      links: [[[0, 0], [1, 1]], [[0, 1], [1, 1]], [[0, 2], [1, 0]], [[1, 0], [1, 1]],
              [[1, 1], [2, 0]], [[2, 0], [2, 1]], [[2, 1], [2, 2]]],
    },
    challenge: {
      layers: [
        { c: "t1", agents: 3, tiles: [
          { x: -0.42, z: -0.3, w: 0.62, d: 0.44, h: 0.16, c: "t1", label: 0 },
          { x: 0.42, z: -0.3, w: 0.62, d: 0.44, h: 0.16, c: "t2", label: 1 },
          { x: 0, z: 0.45, w: 0.8, d: 0.3, h: 0.05, c: "n", label: 2, files: 4 }] },
        { c: "v", agents: 4, tiles: [
          { x: -0.46, z: -0.22, w: 0.46, d: 0.46, h: 0.2, c: "v", label: 0, ring: true },
          { x: 0.32, z: -0.22, w: 0.74, d: 0.46, h: 0.1, c: "v", label: 1 },
          { x: 0.05, z: 0.5, w: 0.74, d: 0.28, h: 0.06, c: "n", label: 2 }] },
        { c: "t2", agents: 3, tiles: [
          { x: -0.42, z: -0.32, w: 0.6, d: 0.4, h: 0.1, c: "t1", label: 0 },
          { x: 0.42, z: -0.32, w: 0.6, d: 0.4, h: 0.1, c: "t2", label: 1 },
          { x: 0, z: 0.42, w: 0.8, d: 0.34, h: 0.05, c: "v", label: 2, bars: [0.3, 0.22, 0.16, 0.1, 0.06] }] },
      ],
      links: [[[0, 0], [1, 1]], [[0, 1], [1, 1]], [[0, 2], [1, 2]], [[1, 0], [1, 1]], [[1, 1], [1, 2]],
              [[1, 1], [2, 0]], [[1, 1], [2, 1]], [[2, 0], [2, 2]], [[2, 1], [2, 2]]],
    },
    harness: {
      layers: [
        { c: "t1", agents: 2, tiles: [
          { x: -0.05, z: -0.15, w: 0.9, d: 0.62, h: 0.24, c: "t1", label: 0, ring: true },
          { x: 0.1, z: 0.6, w: 0.62, d: 0.22, h: 0.05, c: "n", label: 1 }] },
        { c: "v", agents: 4, tiles: [
          { x: -0.46, z: -0.46, w: 0.52, d: 0.4, h: 0.12, c: "v", label: 0 },
          { x: 0.46, z: -0.46, w: 0.52, d: 0.4, h: 0.12, c: "v", label: 1 },
          { x: -0.46, z: 0.4, w: 0.52, d: 0.4, h: 0.12, c: "v", label: 2 },
          { x: 0.46, z: 0.4, w: 0.52, d: 0.4, h: 0.12, c: "v", label: 3 }] },
        { c: "t2", agents: 3, tiles: [
          { x: -0.4, z: -0.3, w: 0.66, d: 0.46, h: 0.14, c: "t2", label: 0 },
          { x: 0.46, z: -0.3, w: 0.5, d: 0.46, h: 0.05, c: "n", label: 1, files: 3 },
          { x: 0, z: 0.46, w: 0.74, d: 0.3, h: 0.1, c: "t1", label: 2 }] },
      ],
      links: [[[0, 0], [1, 0]], [[1, 3], [0, 0]], [[1, 0], [1, 1]], [[1, 1], [1, 3]], [[1, 3], [1, 2]],
              [[1, 1], [2, 0]], [[2, 0], [1, 2]], [[2, 1], [2, 0]], [[2, 0], [2, 2]]],
    },
    evolution: {
      layers: [
        { c: "t1", agents: 4, tiles: [
          { x: -0.4, z: -0.12, w: 0.6, d: 0.7, h: 0.06, c: "n", label: 0, files: 4 },
          { x: 0.42, z: -0.12, w: 0.56, d: 0.56, h: 0.2, c: "t1", label: 1, ring: true }] },
        { c: "v", agents: 3, tiles: [
          { x: -0.46, z: -0.3, w: 0.5, d: 0.4, h: 0.06, c: "n", label: 0, files: 3 },
          { x: 0.38, z: -0.3, w: 0.6, d: 0.4, h: 0.06, c: "v", label: 1, bars: [0.12, 0.24, 0.18, 0.08] },
          { x: 0, z: 0.45, w: 0.82, d: 0.32, h: 0.14, c: "v", label: 2 }] },
        { c: "t2", agents: 3, tiles: [
          { x: -0.38, z: -0.1, w: 0.62, d: 0.6, h: 0.12, c: "t2", label: 0 },
          { x: 0.44, z: -0.1, w: 0.48, d: 0.48, h: 0.22, c: "t1", label: 1, ring: true }] },
      ],
      links: [[[0, 0], [0, 1]], [[0, 1], [1, 0]], [[0, 1], [1, 1]], [[1, 0], [1, 2]], [[1, 1], [1, 2]],
              [[1, 2], [2, 0]], [[2, 0], [2, 1]], [[2, 1], [0, 1], "loop"]],
    },
  };

  const PALETTE = {
    dark: { t1: [80, 210, 207], t2: [240, 181, 74], v: [167, 139, 250], n: [150, 164, 190], ink: [238, 242, 247], base: [10, 15, 26], grid: 0.2 },
    light: { t1: [24, 128, 136], t2: [184, 112, 20], v: [104, 78, 196], n: [92, 104, 124], ink: [14, 20, 32], base: [255, 255, 255], grid: 0.28 },
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
  const isLatin = s => [...s].every(ch => ch.charCodeAt(0) < 0x250);

  /* Soft glows come from cached sprites: one radial gradient per colour and theme. */
  const sprites = new Map();
  function sprite(rgb) {
    const key = rgb.join();
    if (sprites.has(key)) return sprites.get(key);
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, rgba(rgb, 1)); r.addColorStop(0.18, rgba(rgb, 0.8)); r.addColorStop(0.45, rgba(rgb, 0.18)); r.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    sprites.set(key, c);
    return c;
  }

  function mount(host) {
    const def = SCENES[host.dataset.scene];
    const canvas = host.querySelector(".v2-stack-stage canvas");
    if (!def || !canvas) return;
    const stage = canvas.parentElement, ctx = canvas.getContext("2d");
    const items = [...host.querySelectorAll(".v2-stack-layers > li")];
    const n = def.layers.length;
    const layers = def.layers.map((L, i) => ({ ...L, y: (n - 1 - i) * GAP, lift: 0, glow: i === 0 ? 1 : 0.4, labels: [] }));
    let pal = PALETTE.dark, font = "monospace";
    let W = 0, H = 0, dpr = 1, S = 100, cx = 0, cy = 0;
    let ca = 0, sa = 0, ce = 0, se = 0;
    const view = { yaw: 45, yawT: 45, base: 45, el: EL, elT: EL };
    let active = 0, hot = null, engaged = false, lastCycle = 0, intro = reduce ? 1 : 0, visible = false, running = false, last = 0, t = 0;
    let drag = null;

    /* Agents wander between tiles on their layer and leave a short trail. */
    const rnd = (a, b) => a + Math.random() * (b - a);
    const agents = [];
    layers.forEach((L, li) => {
      for (let k = 0; k < (L.agents || 0); k++) {
        const a = { li, x: rnd(-0.8, 0.8), z: rnd(-0.8, 0.8), tx: 0, tz: 0, v: rnd(0.25, 0.42), trail: [] };
        retarget(a); agents.push(a);
      }
    });
    function retarget(a) {
      const tiles = layers[a.li].tiles, tile = tiles[Math.floor(Math.random() * tiles.length)];
      // aim for the edge of a tile, so agents travel between tiles rather than over them
      const side = Math.random() < 0.5 ? 1 : -1;
      if (Math.random() < 0.5) { a.tx = tile.x + side * (tile.w / 2 + 0.06); a.tz = tile.z + rnd(-tile.d / 2, tile.d / 2); }
      else { a.tx = tile.x + rnd(-tile.w / 2, tile.w / 2); a.tz = tile.z + side * (tile.d / 2 + 0.06); }
      a.tx = Math.max(-0.92, Math.min(0.92, a.tx)); a.tz = Math.max(-0.92, Math.min(0.92, a.tz));
    }
    const pulses = def.links.map((link, k) => ({ link, p: (k * 0.37) % 1, v: link[2] === "loop" ? 0.18 : rnd(0.32, 0.5) }));

    function readLabels() {
      items.forEach((item, i) => {
        if (layers[i]) layers[i].labels = [...item.querySelectorAll(".v2-stack-chips li")].map(li => li.textContent.trim());
      });
    }
    function readTheme() {
      pal = document.documentElement.dataset.theme === "light" ? PALETTE.light : PALETTE.dark;
      font = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";
    }

    function resize() {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      // fit the stack (three planes at the default view) with a margin
      const spanX = 2 * Math.SQRT2 * A, spanY = 2 * Math.SQRT2 * A * Math.sin(EL * D) + (n - 1) * GAP * Math.cos(EL * D) + 0.45;
      S = Math.min(W / (spanX * 1.16), H / (spanY * 1.12));
      cx = W / 2;
      cy = H / 2 + ((n - 1) * GAP / 2) * Math.cos(EL * D) * S - 0.12 * S;
      if (!running) draw();
    }

    const proj = (x, y, z) => {
      const xr = x * ca - z * sa, zr = x * sa + z * ca;
      return [cx + xr * S, cy - y * ce * S + zr * se * S, zr * ce + y * se];
    };
    const layerY = i => layers[i].y + layers[i].lift + (1 - ease(intro)) * (n - 1 - i) * 0.55;
    const ease = k => 1 - Math.pow(1 - k, 3);

    function poly(pts) {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
    }

    /* Text laid flat on a plane: the transform maps text space onto the x/z axes. */
    function flatText(text, x, y, z, size, color, align, maxW) {
      const o = proj(x, y, z), F = 24;
      ctx.font = `700 ${F}px ${font}`;
      let k = size / F;
      if (maxW) { const w = ctx.measureText(text).width * k; if (w > maxW) k *= maxW / w; }
      ctx.setTransform(dpr * ca * S * k, dpr * sa * se * S * k, -dpr * sa * S * k, dpr * ca * se * S * k, dpr * o[0], dpr * o[1]);
      ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function box(x, z, w, d, y0, h, rgb, k, alphaTop) {
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y0 + h;
      const front = [proj(x0, y0, z1), proj(x1, y0, z1), proj(x1, y1, z1), proj(x0, y1, z1)];
      const right = [proj(x1, y0, z1), proj(x1, y0, z0), proj(x1, y1, z0), proj(x1, y1, z1)];
      const top = [proj(x0, y1, z0), proj(x1, y1, z0), proj(x1, y1, z1), proj(x0, y1, z1)];
      poly(front); ctx.fillStyle = rgba(pal.base, 0.9); ctx.fill(); ctx.fillStyle = rgba(rgb, 0.16 + 0.12 * k); ctx.fill();
      poly(right); ctx.fillStyle = rgba(pal.base, 0.9); ctx.fill(); ctx.fillStyle = rgba(rgb, 0.1 + 0.08 * k); ctx.fill();
      poly(top); ctx.fillStyle = rgba(pal.base, 0.94); ctx.fill(); ctx.fillStyle = rgba(rgb, alphaTop); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(rgb, 0.35 + 0.5 * k); ctx.stroke();
      poly(front); ctx.strokeStyle = rgba(rgb, 0.2 + 0.25 * k); ctx.stroke();
      poly(right); ctx.stroke();
      return top;
    }

    const inside = (pts, px, py) => {
      let hit = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };

    const tileTop = (li, ti) => { const tl = layers[li].tiles[ti]; return [tl.x, layerY(li) + tl.h, tl.z]; };
    function linkPath(link) {
      const [[la, ta], [lb, tb], kind] = link;
      const a = proj(...tileTop(la, ta)), b = proj(...tileTop(lb, tb));
      if (kind === "loop") {
        const out = 0.36 * S * 2.2;
        return { a, b, c1: [Math.max(a[0], b[0]) + out, a[1] - 0.1 * S], c2: [Math.max(a[0], b[0]) + out, b[1] + 0.1 * S], cubic: true };
      }
      if (la === lb) {
        const lift = 0.16 * S + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.18;
        return { a, b, c1: [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - lift] };
      }
      return { a, b };
    }
    function pointOn(path, p) {
      const { a, b, c1, c2 } = path, q = 1 - p;
      if (c2) return [q * q * q * a[0] + 3 * q * q * p * c1[0] + 3 * q * p * p * c2[0] + p * p * p * b[0],
                      q * q * q * a[1] + 3 * q * q * p * c1[1] + 3 * q * p * p * c2[1] + p * p * p * b[1]];
      if (c1) return [q * q * a[0] + 2 * q * p * c1[0] + p * p * b[0], q * q * a[1] + 2 * q * p * c1[1] + p * p * b[1]];
      return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
    }
    function strokePath(path) {
      ctx.beginPath(); ctx.moveTo(path.a[0], path.a[1]);
      if (path.c2) ctx.bezierCurveTo(path.c1[0], path.c1[1], path.c2[0], path.c2[1], path.b[0], path.b[1]);
      else if (path.c1) ctx.quadraticCurveTo(path.c1[0], path.c1[1], path.b[0], path.b[1]);
      else ctx.lineTo(path.b[0], path.b[1]);
      ctx.stroke();
    }
    function drawLink(pl) {
      const [[la], [lb]] = pl.link, path = linkPath(pl.link);
      const k = Math.max(layers[la].glow, layers[lb].glow), rgb = pal[layers[la].c];
      ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t * 16;
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(rgb, (0.18 + 0.42 * k) * ease(intro)); strokePath(path);
      ctx.setLineDash([]);
      const img = sprite(rgb);
      for (let j = 0; j < 4; j++) {
        const p = pl.p - j * 0.035;
        if (p < 0) continue;
        const [x, y] = pointOn(path, p), s = (j ? 9 - j * 1.6 : 16) * (0.7 + 0.5 * k);
        ctx.globalAlpha = (j ? 0.5 - j * 0.1 : 1) * ease(intro);
        ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    const hits = [];
    function drawLayer(i) {
      const L = layers[i], y = layerY(i), k = L.glow, rgb = pal[L.c], fade = ease(intro);
      ctx.globalAlpha = fade;
      const corners = [proj(-A, y, -A), proj(A, y, -A), proj(A, y, A), proj(-A, y, A)];
      hits[i] = { plane: corners, tiles: [] };
      // glass plane: opaque enough to separate layers, tinted by the layer colour
      poly(corners);
      ctx.fillStyle = rgba(pal.base, 0.62); ctx.fill();
      const g = ctx.createLinearGradient(corners[0][0], corners[0][1], corners[2][0], corners[2][1]);
      g.addColorStop(0, rgba(rgb, 0.03 + 0.11 * k)); g.addColorStop(1, rgba(rgb, 0.01 + 0.04 * k));
      ctx.fillStyle = g; ctx.fill();
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = k > 0.6 ? -t * 10 : 0;
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(rgb, 0.2 + 0.6 * k); ctx.stroke();
      ctx.setLineDash([]);
      if (k > 0.05) { ctx.lineWidth = 4; ctx.strokeStyle = rgba(rgb, 0.08 * k); ctx.stroke(); ctx.lineWidth = 1; }
      // corner brackets
      ctx.strokeStyle = rgba(rgb, 0.45 + 0.5 * k); ctx.lineWidth = 1.5;
      [[-A, -A, 1, 1], [A, -A, -1, 1], [A, A, -1, -1], [-A, A, 1, -1]].forEach(([x, z, sx, sz]) => {
        const p = proj(x, y, z), px = proj(x + sx * 0.14, y, z), pz = proj(x, y, z + sz * 0.14);
        ctx.beginPath(); ctx.moveTo(px[0], px[1]); ctx.lineTo(p[0], p[1]); ctx.lineTo(pz[0], pz[1]); ctx.stroke();
      });
      ctx.lineWidth = 1;
      // dot grid
      ctx.fillStyle = rgba(pal.ink, pal.grid * (0.45 + 0.55 * k));
      for (let a = 1; a < 8; a++) for (let b = 1; b < 8; b++) {
        const p = proj(-A + a * 0.25, y, -A + b * 0.25);
        ctx.fillRect(p[0] - 0.75, p[1] - 0.75, 1.5, 1.5);
      }
      // layer number along the front-left edge
      flatText(`L${i + 1}`, -A + 0.06, y, A - 0.1, 0.13, rgba(rgb, 0.55 + 0.45 * k), "left");
      // tiles, far ones first
      const order = L.tiles.map((tl, ti) => [ti, tl.x * sa + tl.z * ca]).sort((p, q) => p[1] - q[1]);
      for (const [ti] of order) {
        const tl = L.tiles[ti], c = pal[tl.c], isHot = hot && hot[0] === i && hot[1] === ti;
        const tk = Math.min(1, k + (isHot ? 0.6 : 0));
        const top = box(tl.x, tl.z, tl.w, tl.d, y, tl.h, c, tk, 0.1 + 0.2 * tk);
        hits[i].tiles[ti] = top;
        const yt = y + tl.h;
        if (tl.files) for (let f = 0; f < tl.files; f++) {
          const fx = tl.x - tl.w / 2 + 0.1 + f * ((tl.w - 0.2) / Math.max(1, tl.files - 1)) * 0.999;
          box(fx, tl.z - tl.d / 2 + 0.07, 0.07, 0.05, yt, 0.035 + 0.01 * f, c, tk, 0.25 + 0.3 * tk);
        }
        if (tl.bars) tl.bars.forEach((bh, b) => {
          const bx = tl.x + tl.w / 2 - 0.08 - b * 0.085;
          box(bx, tl.z - tl.d / 2 + 0.08, 0.05, 0.05, yt, bh * (0.6 + 0.4 * fade) * (reduce ? 1 : 0.85 + 0.15 * Math.sin(t * 1.6 + b)), c, tk, 0.4 + 0.4 * tk);
        });
        if (tl.ring) {
          // a slowly turning orbit marks the component that does the work
          const rr = Math.min(tl.w, tl.d) * 0.36, spin = t * 0.8;
          ctx.beginPath();
          for (let s = 0; s <= 40; s++) {
            const ang = (s / 40) * Math.PI * 2, p = proj(tl.x + Math.cos(ang) * rr, yt + 0.002, tl.z + Math.sin(ang) * rr);
            s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
          }
          ctx.strokeStyle = rgba(c, 0.3 + 0.5 * tk); ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
          const dot = proj(tl.x + Math.cos(spin) * rr, yt, tl.z + Math.sin(spin) * rr), s = 12 + 6 * tk;
          ctx.drawImage(sprite(c), dot[0] - s / 2, dot[1] - s / 2, s, s);
        }
        const label = L.labels[tl.label];
        if (label) {
          const text = isLatin(label) ? label.toUpperCase() : label;
          const ty = tl.ring ? tl.z + tl.d / 2 - 0.09 : tl.z + (tl.files || tl.bars ? 0.06 : 0);
          flatText(text, tl.x, yt, ty, 0.09, rgba(isHot || k > 0.6 ? pal.ink : c, 0.78 + 0.22 * tk), "center", tl.w - 0.1);
        }
      }
      // agents: a short beam with a glowing head, trailing their recent path
      const img = sprite(rgb);
      for (const a of agents) {
        if (a.li !== i) continue;
        if (a.trail.length > 1) {
          ctx.beginPath();
          a.trail.forEach((q, j) => { const p = proj(q[0], y + 0.01, q[1]); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
          ctx.strokeStyle = rgba(rgb, 0.25 + 0.3 * k); ctx.stroke();
        }
        const p = proj(a.x, y, a.z), hgt = (0.09 + 0.04 * k) * S * ce;
        ctx.strokeStyle = rgba(rgb, 0.5); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - hgt); ctx.stroke();
        ctx.fillStyle = rgba(rgb, 0.5); ctx.beginPath(); ctx.ellipse(p[0], p[1], 3, 3 * se, 0, 0, Math.PI * 2); ctx.fill();
        const s = 14 + 8 * k;
        ctx.drawImage(img, p[0] - s / 2, p[1] - hgt - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    function draw() {
      if (!W) return;
      const sway = reduce ? 0 : Math.sin(t * 0.22) * 2.5;
      ca = Math.cos((view.yaw + sway) * D); sa = Math.sin((view.yaw + sway) * D);
      ce = Math.cos(view.el * D); se = Math.sin(view.el * D);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // bottom layer first; links across a gap are drawn once the lower layer is down
      for (let i = n - 1; i >= 0; i--) {
        drawLayer(i);
        pulses.forEach(pl => {
          const [[la], [lb], kind] = pl.link;
          if (kind === "loop") return;
          if (Math.max(la, lb) === i) drawLink(pl);
        });
      }
      pulses.forEach(pl => { if (pl.link[2] === "loop") drawLink(pl); });
    }

    function step(dt) {
      t += dt;
      if (intro < 1) intro = Math.min(1, intro + dt / 1.4);
      const f = 1 - Math.pow(0.0015, dt);
      view.yaw += (view.yawT - view.yaw) * f; view.el += (view.elT - view.el) * f;
      layers.forEach((L, i) => {
        const on = i === active;
        L.glow += ((on ? 1 : 0.18) - L.glow) * f;
        L.lift += ((on ? 0.12 : 0) - L.lift) * f;
      });
      for (const a of agents) {
        const dx = a.tx - a.x, dz = a.tz - a.z, dist = Math.hypot(dx, dz);
        if (dist < 0.03) retarget(a);
        else { const m = Math.min(dist, a.v * dt); a.x += (dx / dist) * m; a.z += (dz / dist) * m; }
        a.trail.push([a.x, a.z]); if (a.trail.length > 14) a.trail.shift();
      }
      pulses.forEach(pl => { pl.p += pl.v * dt; if (pl.p > 1.14) pl.p = 0; });
      if (!engaged && t - lastCycle > 4.2) { setActive((active + 1) % n); lastCycle = t; }
    }

    function frame(now) {
      if (!visible) { running = false; return; }
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      if (now - last < 1000 / 45 - 2) return;
      last = now;
      step(dt); draw();
    }
    function start() {
      if (running || reduce) return;
      running = true; last = performance.now(); requestAnimationFrame(frame);
    }

    function setActive(i) {
      if (i === active && items[i] && items[i].classList.contains("is-active")) return;
      active = i;
      items.forEach((item, k) => item.classList.toggle("is-active", k === i));
      if (reduce) { layers.forEach((L, k) => { L.glow = k === i ? 1 : 0.18; L.lift = k === i ? 0.12 : 0; }); draw(); }
    }
    function setHot(next) {
      const same = (hot && next && hot[0] === next[0] && hot[1] === next[1]) || (!hot && !next);
      if (same) return;
      hot = next;
      items.forEach((item, li) => item.querySelectorAll(".v2-stack-chips li").forEach((chip, ci) => {
        const tile = next && li === next[0] && layers[li].tiles[next[1]];
        chip.classList.toggle("is-hot", Boolean(tile && tile.label === ci));
      }));
      stage.style.cursor = drag ? "grabbing" : "";
      if (reduce) draw();
    }

    /* Pointer: tilt follows the pointer, a drag turns the stack, hover picks a layer and tile. */
    const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
    stage.addEventListener("pointerdown", e => {
      drag = { x: e.clientX, base: view.base, id: e.pointerId };
      stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", e => {
      const [px, py, r] = local(e);
      if (drag && drag.id === e.pointerId) {
        if (Math.abs(e.clientX - drag.x) > 3 && !stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
        view.base = Math.max(16, Math.min(74, drag.base + (e.clientX - drag.x) * 0.3));
        view.yawT = view.base;
      } else {
        view.yawT = view.base + (px / r.width - 0.5) * 8;
        view.elT = EL + (py / r.height - 0.5) * -6;
      }
      engaged = true; lastCycle = t;
      let found = null, layer = -1;
      for (let i = 0; i < n && hits[i]; i++) {
        hits[i].tiles.forEach((top, ti) => { if (!found && top && inside(top, px, py)) found = [i, ti]; });
        if (found) { layer = i; break; }
        if (inside(hits[i].plane, px, py)) { layer = i; break; }
      }
      if (layer >= 0) setActive(layer);
      setHot(found);
      if (reduce) draw();
    });
    const release = e => {
      if (drag && drag.id === e.pointerId) { drag = null; stage.classList.remove("is-dragging"); }
    };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);
    stage.addEventListener("pointerleave", () => {
      view.yawT = view.base; view.elT = EL; engaged = false; setHot(null);
      if (reduce) draw();
    });
    items.forEach((item, i) => {
      const pick = () => { engaged = true; lastCycle = t; setActive(i); };
      item.addEventListener("pointerenter", pick);
      item.addEventListener("focusin", pick);
      item.addEventListener("pointerleave", () => { engaged = false; lastCycle = t; });
      item.addEventListener("click", e => { if (!e.target.closest("a")) pick(); });
    });

    readTheme(); readLabels(); setActive(0);
    new MutationObserver(() => { readLabels(); if (!running) draw(); })
      .observe(host.querySelector(".v2-stack-layers"), { childList: true, characterData: true, subtree: true });
    new MutationObserver(() => { readTheme(); if (!running) draw(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(entries => entries.forEach(entry => {
      visible = entry.isIntersecting;
      if (visible) start();
    }), { rootMargin: "80px 0px" }).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!running) draw(); });
  }

  document.querySelectorAll(".v2-stack[data-scene]").forEach(mount);
})();
