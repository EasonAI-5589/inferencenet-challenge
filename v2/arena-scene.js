/** The Metacase Challenge arena. Procedural geometry, local Three.js r170, reversible scroll choreography.
 * Toy finish: matte white-and-grey architecture on a gridded night floor, soft accents (mc-toon.js, mc-kit.js). */
import * as THREE from "../assets/vendor/three/three.module.js";
import { catmullRom } from "./arena-motion.js";
import { toon, toonify, createPost } from "./mc-toon.js";
import { person, tile } from "./mc-kit.js";
export function createArenaScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x0e1015);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1015);
  scene.fog = new THREE.FogExp2(0x0e1015, 0.02);
  const camera = new THREE.PerspectiveCamera(53, 1, 0.1, 150);
  const stage = new THREE.Group();
  scene.add(stage);
  const state = {
    progress: 0,
    harness: 0,
    equippedHarness: null,
    room: 0,
    pointer: { x: 0, y: 0 },
    paused: false,
    language: "en",
  };
  const colors = [0x45b5b0, 0xf2b545, 0x7d6ad8],
    harnessColors = [
      0x61ebd7, 0xa791ff, 0xe5bd96, 0xb7d9ec, 0xf48cbe, 0x7dcbf7, 0xf4bd61,
      0xd4f08d,
    ];
  const geoCache = new Map(),
    allMaterials = new Set(),
    allTextures = new Set();
  const clamp = THREE.MathUtils.clamp,
    vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z),
    mix = THREE.MathUtils.lerp;
  const smooth = (a, b, t) => {
    const q = clamp((t - a) / (b - a), 0, 1);
    return q * q * (3 - 2 * q);
  };
  let disposed = false,
    visible = false,
    raf = 0,
    lastTime = 0,
    time = 0,
    width = 0,
    height = 0,
    progress = 0,
    pointerX = 0,
    pointerY = 0;
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;
  function geometry(key, factory) {
    if (!geoCache.has(key)) geoCache.set(key, factory());
    return geoCache.get(key);
  }
  function material(color) {
    const m = toon(color);
    allMaterials.add(m);
    return m;
  }
  function luminous(color, intensity = 2, opacity = 1) {
    const m = toon(color, { emissive: color, emissiveIntensity: intensity * 0.45, opacity });
    allMaterials.add(m);
    return m;
  }
  function basic(color, opacity = 1) {
    const m = new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
      side: THREE.DoubleSide,
    });
    allMaterials.add(m);
    return m;
  }
  // Toy palette: white and pale-grey shells, graphite joints, a few warm accents.
  const black = material(0x2a2e38),
    hull = material(0xd5d9e0),
    metal = material(0x9aa3b2),
    panel = material(0xf1f2f4),
    edge = material(0xc5ccd6),
    ivory = material(0xf7f5f0),
    white = material(0xffffff),
    rubber = material(0x3a3f4b),
    glass = material(0x2b3550),
    gold = material(0xf2b545),
    teal = luminous(0x45b5b0, 2),
    pale = luminous(0xd5fff4, 2.5),
    dim = luminous(0x3a3f4b, 0.2),
    roomLights = colors.map((c) => luminous(c, 2)),
    weaponLights = harnessColors.map((c) => luminous(c, 2.4));
  function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    // StandardMaterial defaults emissiveIntensity to 1 even when emissive is black.
    m.castShadow =
      (mat.isMeshStandardMaterial || mat.isMeshToonMaterial) &&
      !mat.transparent &&
      mat.emissive.getHex() === 0;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, radius = 0) {
    const g = geometry(`b:${w}:${h}:${d}:${radius}`, () => {
      const g = new THREE.BoxGeometry(
        w,
        h,
        d,
        radius ? 4 : 1,
        radius ? 4 : 1,
        radius ? 4 : 1,
      );
      if (radius) {
        const a = g.attributes.position,
          p = vec(),
          center = vec();
        for (let i = 0; i < a.count; i++) {
          p.fromBufferAttribute(a, i);
          center.set(
            clamp(p.x, -w / 2 + radius, w / 2 - radius),
            clamp(p.y, -h / 2 + radius, h / 2 - radius),
            clamp(p.z, -d / 2 + radius, d / 2 - radius),
          );
          p.sub(center).normalize().multiplyScalar(radius).add(center);
          a.setXYZ(i, p.x, p.y, p.z);
        }
        g.computeVertexNormals();
      }
      return g;
    });
    return mesh(g, mat, parent, x, y, z);
  }
  function cylinder(
    parent,
    top,
    bottom,
    h,
    mat,
    x = 0,
    y = 0,
    z = 0,
    segments = 32,
  ) {
    return mesh(
      geometry(
        `c:${top}:${bottom}:${h}:${segments}`,
        () => new THREE.CylinderGeometry(top, bottom, h, segments),
      ),
      mat,
      parent,
      x,
      y,
      z,
    );
  }
  function sphere(parent, r, mat, x = 0, y = 0, z = 0) {
    return mesh(
      geometry(`s:${r}`, () => new THREE.SphereGeometry(r, 20, 14)),
      mat,
      parent,
      x,
      y,
      z,
    );
  }
  function ring(parent, radius, tube, mat, x = 0, y = 0, z = 0, floor = true) {
    const m = mesh(
      geometry(
        `r:${radius}:${tube}`,
        () => new THREE.TorusGeometry(radius, tube, 6, 96),
      ),
      mat,
      parent,
      x,
      y,
      z,
    );
    if (floor) m.rotation.x = Math.PI / 2;
    return m;
  }
  function line(parent, points, color, opacity = 1) {
    const g = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => (Array.isArray(p) ? vec(...p) : p)),
    );
    geoCache.set(`line:${geoCache.size}`, g);
    const m = new THREE.LineBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
    });
    allMaterials.add(m);
    const l = new THREE.Line(g, m);
    parent.add(l);
    return l;
  }
  function glow(parent, color, size, x, y, z, opacity = 0.25) {
    let map = allTextures.glow;
    if (!map) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d"),
        grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.15, "#ffffff70");
      grad.addColorStop(1, "#ffffff00");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      map = new THREE.CanvasTexture(c);
      allTextures.add(map);
      allTextures.glow = map;
    }
    const m = new THREE.SpriteMaterial({
      map,
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    allMaterials.add(m);
    const sprite = new THREE.Sprite(m);
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size, 1);
    parent.add(sprite);
    return sprite;
  }
  function plateText(parent, lines, size, x, y, z, color = "#b5eadd") {
    const c = document.createElement("canvas");
    c.width = 2048;
    c.height = 512;
    const ctx = c.getContext("2d"),
      tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    allTextures.add(tex);
    const m = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    allMaterials.add(m);
    const plane = mesh(
      geometry(`text:${size}`, () => new THREE.PlaneGeometry(size, size / 4)),
      m,
      parent,
      x,
      y,
      z,
    );
    function write(copy) {
      ctx.clearRect(0, 0, 2048, 512);
      ctx.fillStyle = "rgba(10, 13, 22, 0.78)";
      ctx.beginPath();
      ctx.roundRect(224, 52, 1600, 408, 48);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '400 38px "Space Mono", ui-monospace, monospace';
      ctx.fillStyle = color;
      ctx.fillText(copy[0], 1024, 130, 1500);
      ctx.font = "700 96px Inter, Arial, sans-serif";
      ctx.fillStyle = "#f3f8fb";
      ctx.fillText(copy[1], 1024, 255, 1500);
      ctx.font = "400 36px Inter, Arial, sans-serif";
      ctx.fillStyle = "#a9b6c4";
      ctx.fillText(copy[2] || "", 1024, 370, 1500);
      tex.needsUpdate = true;
    }
    write(lines);
    return { plane, write };
  }
  function entrancePlaque(parent, copy, accent, color) {
    const c = document.createElement("canvas");
    c.width = 2048;
    c.height = 320;
    const ctx = c.getContext("2d");
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    allTextures.add(texture);
    const frame = new THREE.Group();
    frame.position.set(0, 7.52, 2.11);
    parent.add(frame);
    box(frame, 7.0, 1.26, 0.19, black, 0, 0, 0, 0.065);
    box(frame, 7.13, 0.035, 0.08, accent, 0, -0.63, 0.07);
    for (const side of [-1, 1]) {
      box(frame, 0.12, 0.84, 0.09, accent, side * 3.47, 0, 0.13);
      box(frame, 0.38, 0.035, 0.04, edge, side * 3.07, 0.45, 0.13);
    }
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    allMaterials.add(mat);
    const plane = mesh(
      geometry("entrance-plaque", () => new THREE.PlaneGeometry(6.8, 1.2)),
      mat,
      frame,
      0,
      0,
      0.113,
    );
    function write(lines) {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.font = '400 36px "Space Mono", ui-monospace, monospace';
      ctx.fillText(lines[0], 1024, 39, 1880);
      const cjk = /[\u3400-\u9fff]/.test(lines[1]);
      ctx.font = cjk
        ? '600 142px "Microsoft YaHei", Arial, sans-serif'
        : '700 150px Inter, Arial, sans-serif';
      ctx.textBaseline = "alphabetic";
      const metrics = ctx.measureText(lines[1]);
      const baseline =
        159 +
        (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) /
          2;
      ctx.fillStyle = color;
      ctx.fillText(lines[1], 1024, baseline, 1910);
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#a8c0d0";
      ctx.font = "500 34px Inter, Arial, sans-serif";
      ctx.fillText(lines[2], 1024, 286, 1860);
      texture.needsUpdate = true;
    }
    write(copy);
    return { plane, write, frame };
  }
  function challengePrompt(parent, color) {
    const c = document.createElement("canvas");
    c.width = 1600;
    c.height = 230;
    const ctx = c.getContext("2d");
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    allTextures.add(map);
    function write() {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#07121df0";
      ctx.fillRect(12, 12, 1576, 206);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(12, 12, 1576, 206);
      ctx.font = '700 130px Inter, Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const text = "Go for this challenge!";
      const metrics = ctx.measureText(text);
      const baseline =
        115 +
        (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) /
          2;
      ctx.fillStyle = color;
      ctx.fillText(text, 800, baseline, 1460);
      ctx.shadowBlur = 0;
      map.needsUpdate = true;
    }
    write();
    const material = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, reveal: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform sampler2D map;uniform float reveal;
      void main(){vec4 ink=texture2D(map,vUv);vec2 cell=floor(vUv*vec2(110.,18.));float noise=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);float visibility=smoothstep(noise-.13,noise+.13,reveal*1.26-.13);gl_FragColor=vec4(ink.rgb*1.3,ink.a*visibility);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    });
    allMaterials.add(material);
    const plane = mesh(
      geometry("challenge-prompt", () => new THREE.PlaneGeometry(4.65, 0.668)),
      material,
      parent,
      0,
      5.75,
      2.32,
    );
    plane.visible = false;
    plane.userData.redrawText = write;
    return plane;
  }
  // Full-scale circular architecture; no visible tabletop edge.
  scene.add(new THREE.HemisphereLight(0xe8eeff, 0x2a2633, 2.1));
  const key = new THREE.DirectionalLight(0xfff3e2, 2.8);
  key.position.set(-8, 14, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {
    left: -22,
    right: 22,
    top: 20,
    bottom: -20,
    near: 0.1,
    far: 65,
  });
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0002;
  scene.add(key);
  const blueRim = new THREE.DirectionalLight(0x9fb6ff, 1.1);
  blueRim.position.set(7, 8, -14);
  scene.add(blueRim);
  const whiteRim = new THREE.DirectionalLight(0xffffff, 0.8);
  whiteRim.position.set(-10, 5, -8);
  scene.add(whiteRim);
  cylinder(stage, 24, 24, 0.4, black, 0, -0.25, 0, 128);
  const ground = mesh(
    geometry("unbroken-ground", () => new THREE.PlaneGeometry(200, 200)),
    material(0x0e1015),
    stage,
    0,
    -0.075,
    0,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  cylinder(
    stage,
    18,
    18,
    0.12,
    material(0x151820),
    0,
    -0.05,
    0,
    128,
  );
  for (const r of [3.4, 6.2, 9.5, 13.5, 17.5]) {
    ring(stage, r, 0.045, metal, 0, 0.032, 0);
    ring(stage, r + 0.12, 0.012, r < 10 ? dim : teal, 0, 0.04, 0);
  }
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24,
      m = box(
        stage,
        0.055,
        0.02,
        i % 4 ? 0.32 : 0.68,
        i % 4 ? dim : teal,
        Math.sin(a) * 13.45,
        0.05,
        Math.cos(a) * 13.45,
      );
    m.rotation.y = a;
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6,
      s = Math.sin(a),
      c = Math.cos(a);
    line(
      stage,
      [
        [s * 3.6, 0.04, c * 3.6],
        [s * 9.3, 0.04, c * 9.3],
      ],
      0x416176,
      0.35,
    );
    line(
      stage,
      [
        [s * 13.8, 0.04, c * 13.8],
        [s * 18, 0.04, c * 18],
      ],
      0x416176,
      0.3,
    );
  }
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.36 + (i * 1.28) / 12),
      x = Math.cos(a) * 19.5,
      z = -Math.sin(a) * 18.5;
    if (z > 5) continue;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = -a;
    stage.add(g);
    box(g, 0.76, 8.5, 0.9, hull, 0, 4.2, 0, 0.12);
    box(g, 0.18, 7.1, 0.1, dim, 0, 4.25, 0.48);
    box(g, 1.15, 0.25, 1.2, metal, 0, 0.16, 0, 0.04);
    box(g, 1.05, 0.3, 1.1, metal, 0, 8.4, 0, 0.05);
    glow(g, 0x559de2, 4, 0, 7.4, 0.2, 0.12);
  }
  for (let i = 0; i < 20; i++) {
    const x = (i - 10) * 4.2,
      h = 7 + (Math.sin(i * 2.4) + 1) * 5;
    box(stage, 2.6, h, 3.2, black, x, h / 2 - 1, -32 - Math.cos(i) * 4);
    if (i % 3 === 0)
      box(stage, 0.035, h * 0.65, 0.04, dim, x, h / 2, -30 - Math.cos(i) * 4);
  }
  const centerSymbol = ring(stage, 1.9, 0.025, teal, 0, 0.06, 4.8);
  ring(stage, 2.05, 0.01, dim, 0, 0.055, 4.8);
  const centerGlow = glow(stage, 0x60efd9, 9, 0, 0.15, 4.8, 0.12);
  const roomDefs = [
    {
      x: -9.2,
      z: -6.3,
      turn: 0.52,
      en: [
        "TRACK 01 / REPLICATION",
        "ECONOMETRIC REPLICATION",
        "ECONOMICS · STATISTICS · SOCIAL SCIENCE",
      ],
      zh: ["赛道 01 / 研究复现", "计量经济学复现", "经济 · 统计 · 社会科学"],
    },
    {
      x: 0,
      z: -12.2,
      turn: 0,
      en: [
        "TRACK 02 / BUSINESS ANALYSIS & DELIVERABLES",
        "FINANCE & ACCOUNTING",
        "EVIDENCE · RECONCILIATION · JUDGMENT",
      ],
      zh: [
        "赛道 02 / 商业分析与交付物",
        "金融与会计",
        "证据 · 对账 · 商业判断",
      ],
    },
    {
      x: 9.2,
      z: -6.3,
      turn: -0.52,
      en: [
        "TRACK 02 / BUSINESS ANALYSIS & DELIVERABLES",
        "HUMAN RESOURCES",
        "PEOPLE · POLICY · DECISIONS",
      ],
      zh: [
        "赛道 02 / 商业分析与交付物",
        "人力资源与社会科学",
        "个体 · 制度 · 决策",
      ],
    },
  ];
  const roomTargets = roomDefs.map((d) => vec(d.x, 2.8, d.z - 1)),
    actionWindows = [
      [0.465, 0.55],
      [0.65, 0.735],
      [0.84, 0.915],
    ];
  const rooms = roomDefs.map((def, index) => {
    const group = new THREE.Group();
    group.position.set(def.x, 0, def.z);
    group.rotation.y = def.turn;
    stage.add(group);
    const accent = roomLights[index],
      color = colors[index];
    box(group, 7.2, 0.35, 6.4, black, 0, 0.1, -1.4, 0.13);
    box(group, 6.5, 0.07, 5.9, metal, 0, 0.3, -1.4, 0.03);
    box(group, 5.9, 0.04, 5.5, hull, 0, 0.35, -1.4);
    box(group, 6.8, 7.1, 0.55, panel, 0, 3.8, -4.25, 0.12);
    box(group, 0.55, 7.1, 5.9, hull, -3.25, 3.8, -1.4, 0.1);
    box(group, 0.55, 7.1, 5.9, hull, 3.25, 3.8, -1.4, 0.1);
    box(group, 7.1, 0.45, 6.2, hull, 0, 7.35, -1.4, 0.1);
    for (const side of [-1, 1]) {
      box(group, 0.74, 7.6, 1, metal, side * 3.18, 3.85, 1.35, 0.13);
      box(group, 0.3, 6.7, 0.15, black, side * 3.18, 3.9, 1.91);
      box(group, 0.07, 6.1, 0.04, accent, side * 2.9, 3.9, 1.93);
      for (let j = 0; j < 5; j++)
        box(group, 0.55, 0.1, 1.12, hull, side * 3.18, 0.9 + j * 1.4, 1.35);
      box(group, 1.05, 0.4, 1.45, panel, side * 3.18, 0.32, 1.35, 0.07);
      box(group, 0.18, 0.85, 0.12, accent, side * 3.18, 0.95, 1.98);
    }
    box(group, 7.3, 0.64, 1.2, metal, 0, 7.52, 1.35, 0.12);
    box(group, 5.8, 0.055, 0.04, accent, 0, 7.17, 2);
    box(group, 6.1, 0.055, 0.13, accent, 0, 0.38, 1.65);
    box(group, 5.8, 0.04, 0.1, accent, 0, 0.38, -3.8);
    for (let j = 0; j < 3; j++) {
      box(
        group,
        5.7 + j * 0.3,
        0.1,
        0.38,
        hull,
        0,
        0.21 - j * 0.065,
        1.9 + j * 0.38,
      );
      for (const side of [-1, 1])
        box(
          group,
          0.05,
          0.012,
          0.22,
          accent,
          side * 2.3,
          0.27 - j * 0.065,
          1.9 + j * 0.38,
        );
    }
    const doors = [-1, 1].map((side) => {
      const door = new THREE.Group();
      door.position.set(side * 1.48, 3.75, 1.48);
      group.add(door);
      box(door, 2.94, 6.5, 0.2, panel, 0, 0, 0, 0.06);
      box(door, 2.63, 5.85, 0.05, black, 0, 0, 0.14, 0.035);
      box(door, 0.045, 5.6, 0.04, accent, -side * 1.38, 0, 0.17);
      for (let j = 0; j < 5; j++)
        box(door, 1.65, 0.025, 0.025, metal, 0, -2 + j * 0.9, 0.19);
      box(door, 0.4, 1.3, 0.06, hull, -side * 0.9, 0, 0.2, 0.04);
      box(door, 0.035, 0.68, 0.025, accent, -side * 0.9, 0, 0.24);
      return door;
    });
    const interior = new THREE.Group();
    interior.position.set(0, 0.4, -1.2);
    group.add(interior);
    cylinder(interior, 1.75, 1.95, 0.32, hull, 0, 0.15, 0, 64);
    ring(interior, 1.75, 0.028, accent, 0, 0.33, 0);
    ring(interior, 1.5, 0.015, accent, 0, 0.34, 0);
    const core = new THREE.Group();
    core.position.set(0, 2.4, 0);
    interior.add(core);
    const hologram = basic(color, 0.1);
    if (index === 0) {
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * Math.PI * 2,
          x = Math.sin(a) * 1.4,
          z = Math.cos(a) * 1.4,
          h = 1.7 + Math.sin(j * 1.8) * 0.65;
        cylinder(interior, 0.18, 0.18, h, hologram, x, h / 2 + 0.45, z, 20);
        cylinder(interior, 0.19, 0.22, 0.12, metal, x, 0.43, z, 20);
        ring(interior, 0.19, 0.018, accent, x, h + 0.45, z);
        cylinder(
          interior,
          0.045,
          0.045,
          h * 0.8,
          accent,
          x,
          h * 0.4 + 0.5,
          z,
          8,
        );
      }
      const frame = new THREE.Group();
      frame.rotation.y = -0.12;
      core.add(frame);
      box(frame, 3.35, 2.25, 0.035, hologram, 0, 0.7, -0.2);
      for (let j = 0; j < 5; j++)
        line(
          frame,
          [
            [-1.55, -0.26 + j * 0.46, -0.16],
            [1.55, -0.26 + j * 0.46, -0.16],
          ],
          color,
          0.18,
        );
      line(
        frame,
        [
          [-1.55, -0.2, -0.1],
          [-1.1, 0.18, -0.1],
          [-0.66, 0.42, -0.1],
          [-0.15, 0.75, -0.1],
          [0.4, 1.1, -0.1],
          [0.95, 1.39, -0.1],
          [1.55, 1.75, -0.1],
        ],
        color,
      );
      for (let j = 0; j < 18; j++) {
        const x = -1.5 + (j / 17) * 3,
          y = 0.7 + x * 0.64 + Math.sin(j * 2.72) * 0.32;
        sphere(frame, 0.044, accent, x, y, 0.015);
        line(
          frame,
          [
            [x, y, 0.015],
            [x, 0.7 + x * 0.64, 0.015],
          ],
          color,
          0.35,
        );
      }
      plateText(
        core,
        [
          "ESTIMATE / TEST / REPRODUCE",
          "Y = Xβ + ε",
          "RAW EVIDENCE → REPRODUCIBLE RESULT",
        ],
        3.4,
        0,
        -1.7,
        1.1,
        "#8fffe1",
      );
    } else if (index === 1) {
      ring(interior, 2.1, 0.18, gold, 0, 3.2, -1.75, false);
      ring(interior, 1.77, 0.035, accent, 0, 3.2, -1.72, false);
      for (let j = 0; j < 12; j++) {
        const a = (j * Math.PI) / 6,
          b = box(
            interior,
            0.14,
            0.42,
            0.28,
            gold,
            Math.sin(a) * 2,
            3.2 + Math.cos(a) * 2,
            -1.58,
            0.025,
          );
        b.rotation.z = -a;
      }
      for (let row = 0; row < 3; row++)
        for (let j = 0; j < 4 - row; j++) {
          const b = box(
            interior,
            0.73,
            0.27,
            0.43,
            gold,
            (j - (3 - row) / 2) * 0.8,
            0.5 + row * 0.3,
            0.48,
            0.06,
          );
          b.rotation.y = row % 2 ? 0.06 : -0.03;
        }
      for (let j = 0; j < 5; j++) {
        const h = [0.7, 1.15, 0.92, 1.65, 2.05][j];
        box(core, 0.3, h, 0.24, accent, -1.1 + j * 0.55, h / 2 - 0.7, 0, 0.025);
      }
      line(
        core,
        [
          [-1.45, -0.7, 0.18],
          [1.5, -0.7, 0.18],
        ],
        color,
      );
      plateText(
        core,
        [
          "SOURCE RECORDS / FINANCIAL REVIEW",
          "EVIDENCE → VALUE",
          "RECONCILE · CALCULATE · EXPLAIN",
        ],
        4.1,
        0,
        2.7,
        0.2,
        "#ffd6a0",
      );
    } else {
      const globe = sphere(core, 1.6, hologram);
      ring(core, 1.63, 0.018, accent, 0, 0, 0, false);
      ring(core, 1.63, 0.018, accent).rotation.z = 0.6;
      const network = [];
      for (let j = 0; j < 19; j++) {
        const y = 1 - (j / 18) * 2,
          r = Math.sqrt(1 - y * y),
          a = j * 2.39996,
          p = vec(Math.cos(a) * r * 1.53, y * 1.53, Math.sin(a) * r * 1.53);
        network.push(p);
        sphere(
          core,
          j % 4 ? 0.065 : 0.11,
          j % 4 ? accent : pale,
          p.x,
          p.y,
          p.z,
        );
      }
      network.forEach((p, j) => {
        for (const k of [3, 7])
          if (j + k < network.length)
            line(core, [p, network[j + k]], color, 0.3);
      });
      plateText(
        core,
        [
          "MEASURE / INTERPRET / DECIDE",
          "PEOPLE & POLICY",
          "OUTCOMES IN THEIR ORIGINAL CONTEXT",
        ],
        3.9,
        0,
        2.7,
        0.2,
        "#d7cbff",
      );
      globe.renderOrder = -1;
    }
    const chamberLight = new THREE.PointLight(color, 28, 13, 2);
    chamberLight.position.set(0, 3.8, -0.4);
    group.add(chamberLight);
    const halo = glow(group, color, 8, 0, 3.7, -1.3, 0.15),
      scan = box(group, 5.7, 0.035, 0.04, accent, 0, 3, 0.9),
      title = entrancePlaque(
        group,
        def.en,
        accent,
        ["#8fffe1", "#ffd6a0", "#d7cbff"][index],
      ),
      prompt = challengePrompt(group, ["#8fffe1", "#ffd6a0", "#d7cbff"][index]);
    return {
      group,
      doors,
      core,
      chamberLight,
      halo,
      scan,
      title,
      prompt,
      definition: def,
    };
  });
  // Bake the page fonts once they are available; never redraw text textures per frame.
  Promise.all([
    document.fonts.load("700 150px Inter"),
    document.fonts.load('400 36px "Space Mono"'),
  ]).then(() => {
    if (disposed) return;
    rooms.forEach((room) => {
      room.title.write(
        state.language === "zh" ? room.definition.zh : room.definition.en,
      );
      room.prompt.userData.redrawText();
    });
    wake();
  });
  // Each harness has a distinct barrel, receiver and tool geometry, not merely a different tint.
  function weapon(index) {
    const g = new THREE.Group(),
      accent = weaponLights[index];
    box(g, 0.2, 0.34, 0.23, rubber, 0, -0.21, -0.05, 0.035).rotation.x = -0.22;
    box(g, 0.31, 0.25, 0.58, ivory, 0, 0.02, 0, 0.055);
    box(g, 0.25, 0.065, 0.4, metal, 0, 0.18, -0.08, 0.02);
    if (index === 0) {
      box(g, 0.25, 0.19, 0.8, hull, 0, 0.04, 0.58, 0.035);
      for (const x of [-0.18, 0.18]) {
        box(g, 0.085, 0.13, 1.02, ivory, x, 0.08, 0.68, 0.025);
        box(g, 0.035, 0.04, 0.75, accent, x, 0.13, 0.72);
      }
      box(g, 0.16, 0.12, 0.35, glass, 0, 0.27, 0.2, 0.02);
    } else if (index === 1) {
      box(g, 0.4, 0.37, 0.65, hull, 0, 0.04, 0.36, 0.055);
      sphere(g, 0.23, accent, 0, 0.07, 0.75);
      for (const z of [0.6, 0.82, 1.04])
        ring(g, 0.3, 0.035, z === 0.82 ? accent : ivory, 0, 0.07, z, false);
      for (const x of [-0.34, 0.34])
        box(g, 0.1, 0.26, 0.45, ivory, x, 0.06, 0.63, 0.025);
    } else if (index === 2) {
      box(g, 0.48, 0.34, 0.71, ivory, 0, 0.05, 0.38, 0.08);
      for (const x of [-0.13, 0.13])
        for (const y of [-0.06, 0.15]) {
          const c = cylinder(g, 0.08, 0.1, 0.12, accent, x, y, 0.8, 12);
          c.rotation.x = Math.PI / 2;
        }
      box(g, 0.36, 0.09, 0.48, hull, 0, 0.28, 0.35, 0.025);
    } else if (index === 3) {
      box(g, 0.42, 0.35, 0.6, ivory, 0, 0.04, 0.29, 0.045);
      box(g, 0.19, 0.19, 1, hull, 0, 0.08, 0.79, 0.025);
      box(g, 0.29, 0.29, 0.18, ivory, 0, 0.08, 1.27, 0.035);
      box(g, 0.17, 0.17, 0.02, accent, 0, 0.08, 1.37);
      box(g, 0.08, 0.045, 0.9, accent, 0, 0.2, 0.74);
      box(g, 0.17, 0.12, 0.3, glass, 0, 0.31, 0.24, 0.025);
    } else if (index === 4) {
      box(g, 0.35, 0.28, 0.74, hull, 0, 0.04, 0.4, 0.035);
      const c = cylinder(g, 0.24, 0.24, 0.23, accent, 0, 0.06, 0.91, 6);
      c.rotation.x = Math.PI / 2;
      for (const x of [-0.32, 0.32]) {
        const fin = box(g, 0.08, 0.46, 0.57, ivory, x, 0.08, 0.56, 0.025);
        fin.rotation.z = x;
      }
      ring(g, 0.32, 0.025, edge, 0, 0.06, 0.93, false);
    } else if (index === 5) {
      sphere(g, 0.19, accent, 0, 0.06, 0.71);
      for (let j = 0; j < 3; j++) {
        const arm = new THREE.Group();
        arm.rotation.z = (j * Math.PI * 2) / 3;
        g.add(arm);
        box(arm, 0.09, 0.13, 0.72, ivory, 0.27, 0.06, 0.54, 0.025);
        box(arm, 0.15, 0.13, 0.3, metal, 0.24, 0.06, 0.96, 0.025).rotation.y =
          -0.25;
        box(arm, 0.035, 0.04, 0.45, accent, 0.325, 0.07, 0.51);
      }
    } else if (index === 6) {
      box(g, 0.48, 0.4, 0.65, hull, 0, 0.04, 0.31, 0.05);
      const b = cylinder(g, 0.25, 0.29, 0.8, ivory, 0, 0.06, 0.82, 8);
      b.rotation.x = Math.PI / 2;
      const m = cylinder(g, 0.19, 0.19, 0.05, black, 0, 0.06, 1.24, 8);
      m.rotation.x = Math.PI / 2;
      const l = cylinder(g, 0.11, 0.11, 0.06, accent, 0, 0.06, 1.27, 8);
      l.rotation.x = Math.PI / 2;
      for (let j = 0; j < 3; j++)
        box(g, 0.045, 0.2, 0.09, accent, 0.26, 0.06, 0.2 + j * 0.15);
    } else {
      box(g, 0.25, 0.2, 0.48, ivory, 0, 0.02, 0.35, 0.04);
      box(g, 0.1, 0.1, 0.72, edge, 0, 0.05, 0.77, 0.015);
      sphere(g, 0.1, accent, 0, 0.05, 1.15);
      box(g, 0.27, 0.07, 0.35, hull, 0.15, 0.2, 0.4, 0.02);
      box(g, 0.18, 0.025, 0.22, accent, 0.15, 0.25, 0.4);
    }
    return g;
  }
  // Adult silhouette with a mechanical undersuit, independently moving knees, layered armor and a back-lit memory spine.
  const agent = new THREE.Group();
  agent.position.set(0, 0.06, 5.3);
  stage.add(agent);
  const body = new THREE.Group();
  agent.add(body);
  box(body, 0.69, 0.31, 0.44, hull, 0, 1.45, 0, 0.07);
  box(body, 0.52, 0.12, 0.49, ivory, 0, 1.57, 0.02, 0.035);
  box(body, 0.16, 0.09, 0.04, teal, 0, 1.57, 0.29, 0.015);
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.23, 1.39, 0);
    body.add(leg);
    sphere(leg, 0.17, rubber);
    box(leg, 0.31, 0.57, 0.34, ivory, 0, -0.29, 0.025, 0.065);
    box(leg, 0.035, 0.36, 0.2, metal, side * 0.17, -0.26, 0.015, 0.015);
    box(leg, 0.18, 0.37, 0.035, white, 0, -0.27, 0.21, 0.025);
    const knee = new THREE.Group();
    knee.position.set(0, -0.59, 0.015);
    leg.add(knee);
    sphere(knee, 0.14, rubber);
    box(knee, 0.32, 0.21, 0.14, hull, 0, -0.015, 0.18, 0.04);
    box(knee, 0.29, 0.51, 0.32, ivory, 0, -0.31, 0.015, 0.055);
    box(knee, 0.15, 0.31, 0.065, metal, 0, -0.3, 0.205, 0.025);
    box(knee, 0.035, 0.22, 0.025, teal, side * 0.12, -0.3, 0.19);
    box(knee, 0.34, 0.23, 0.6, hull, 0, -0.65, 0.13, 0.065);
    box(knee, 0.31, 0.065, 0.56, rubber, 0, -0.78, 0.13, 0.02);
    box(knee, 0.25, 0.07, 0.15, edge, 0, -0.65, 0.43, 0.025);
    return { leg, knee };
  });
  box(body, 0.76, 0.88, 0.45, rubber, 0, 2.04, 0, 0.13);
  box(body, 0.91, 0.47, 0.57, ivory, 0, 2.24, 0.015, 0.1);
  box(body, 0.72, 0.32, 0.46, hull, 0, 1.86, 0.04, 0.07);
  box(body, 0.65, 0.31, 0.11, white, 0, 2.24, 0.33, 0.04);
  for (const side of [-1, 1]) {
    box(
      body,
      0.28,
      0.39,
      0.08,
      ivory,
      side * 0.21,
      1.96,
      0.31,
      0.03,
    ).rotation.z = side * -0.12;
    box(body, 0.035, 0.23, 0.023, teal, side * 0.36, 2.21, 0.33);
  }
  for (let j = 0; j < 3; j++)
    box(body, 0.44, 0.07, 0.06, metal, 0, 1.68 + j * 0.11, 0.3, 0.015);
  box(body, 0.63, 0.74, 0.27, hull, 0, 2.11, -0.35, 0.07);
  box(body, 0.2, 0.65, 0.09, black, 0, 2.1, -0.53, 0.035);
  for (let j = 0; j < 6; j++) {
    box(body, 0.13, 0.055, 0.035, teal, 0, 1.86 + j * 0.1, -0.59, 0.012);
    box(body, 0.37, 0.035, 0.07, metal, 0, 1.83 + j * 0.1, -0.54, 0.008);
  }
  for (const side of [-1, 1]) {
    cylinder(body, 0.13, 0.13, 0.56, ivory, side * 0.39, 2.1, -0.34, 12);
    cylinder(body, 0.135, 0.135, 0.1, metal, side * 0.39, 1.87, -0.34, 12);
    cylinder(body, 0.135, 0.135, 0.07, teal, side * 0.39, 2.36, -0.34, 12);
  }
  cylinder(body, 0.025, 0.025, 0.48, metal, -0.32, 2.68, -0.33, 8);
  sphere(body, 0.045, teal, -0.32, 2.94, -0.33);
  cylinder(body, 0.17, 0.22, 0.13, rubber, 0, 2.58, 0, 16);
  const head = new THREE.Group();
  head.position.set(0, 2.98, 0.02);
  body.add(head);
  box(head, 0.62, 0.59, 0.62, ivory, 0, 0, 0, 0.15);
  box(head, 0.55, 0.28, 0.12, hull, 0, 0.045, 0.29, 0.055);
  box(head, 0.48, 0.2, 0.05, glass, 0, 0.06, 0.37, 0.04);
  const eyeMat = luminous(0x8ff6ff, 4.5);
  for (const side of [-1, 1]) {
    const eye = sphere(head, 0.075, eyeMat, side * 0.12, 0.06, 0.39);
    eye.scale.set(0.9, 1.25, 0.35);
  }
  box(head, 0.29, 0.11, 0.08, white, 0, -0.18, 0.3, 0.025);
  box(head, 0.25, 0.21, 0.06, hull, 0, -0.04, -0.32, 0.035);
  box(head, 0.14, 0.035, 0.025, teal, 0, 0.02, -0.36);
  box(head, 0.11, 0.03, 0.4, metal, 0, 0.3, -0.015, 0.012);
  for (const side of [-1, 1]) {
    const e = cylinder(head, 0.13, 0.13, 0.08, hull, side * 0.33, 0, 0, 12);
    e.rotation.z = Math.PI / 2;
    const l = cylinder(head, 0.055, 0.055, 0.085, teal, side * 0.35, 0, 0, 12);
    l.rotation.z = Math.PI / 2;
  }
  head.scale.setScalar(1.32);
  head.position.y += 0.1;
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.55, 2.37, 0.015);
    body.add(arm);
    sphere(arm, 0.2, rubber);
    box(arm, 0.36, 0.28, 0.43, ivory, side * 0.035, -0.015, 0, 0.08);
    box(arm, 0.25, 0.48, 0.29, ivory, 0, -0.32, 0.02, 0.055);
    box(arm, 0.035, 0.23, 0.16, teal, side * 0.15, -0.25, 0.02);
    sphere(arm, 0.13, rubber, 0, -0.59, 0.03);
    box(arm, 0.27, 0.42, 0.32, hull, 0, -0.8, 0.08, 0.055);
    box(arm, 0.18, 0.26, 0.07, ivory, 0, -0.78, 0.26, 0.03);
    box(arm, 0.25, 0.14, 0.26, rubber, 0, -1.06, 0.1, 0.03);
    return arm;
  });
  // Confirmation latches a real loadout onto the back. Carousel focus is only a preview.
  const backRack = new THREE.Group();
  backRack.position.set(-0.29, 2.08, -0.78);
  backRack.rotation.z = 0.3;
  body.add(backRack);
  const backMount = new THREE.Group();
  backMount.rotation.x = -Math.PI / 2;
  backRack.add(backMount);
  box(body, 0.48, 0.1, 0.14, metal, -0.23, 1.68, -0.68, 0.025);
  box(body, 0.35, 0.1, 0.14, metal, -0.34, 2.4, -0.67, 0.025);
  let weapons = harnessColors.map((_, i) => {
    const w = weapon(i);
    w.position.z = -0.5;
    w.scale.setScalar(1.12);
    w.visible = false;
    backMount.add(w);
    return w;
  });
  const palmEmitter = glow(arms[1], 0x8deeff, 0.34, 0, -1.06, 0.23, 0.34);
  palmEmitter.visible = false;
  const agentGround = ring(stage, 0.7, 0.014, teal, 0, 0.07, 5.3),
    agentHalo = glow(stage, 0x84dff2, 3.2, 0, 2.1, 5.3, 0.08);
  const heroLight = new THREE.PointLight(0xe5f4ff, 7.5, 7, 2);
  stage.add(heroLight);
  const inventory = new THREE.Group();
  inventory.position.set(0, 1.7, 5.3);
  stage.add(inventory);
  const inventoryGuns = harnessColors.map((c, i) => {
    const mount = new THREE.Group(),
      a = (i / 8) * Math.PI * 2;
    mount.position.set(
      Math.sin(a) * 2.35 + (i === 0 ? 0.8 : i === 4 ? -0.8 : 0),
      Math.cos(a) * 1.7 + 0.65,
      -0.35,
    );
    inventory.add(mount);
    const model = weapon(i);
    model.rotation.set(-0.15, Math.PI / 2, -0.08);
    model.scale.setScalar(0.45);
    mount.add(model);
    const platform = ring(
      mount,
      0.39,
      0.012,
      weaponLights[i],
      0.1,
      -0.24,
      0,
      false,
    );
    return { mount, model, platform };
  });
  inventory.visible = false;
  let modelLibrary;
  import("./arena-models.js")
    .then(({ loadArenaWeapons }) => loadArenaWeapons())
    .then((library) => {
      if (disposed) {
        library.dispose();
        return;
      }
      modelLibrary = library;
      weapons.forEach((w) => backMount.remove(w));
      weapons = library.weapons;
      weapons.forEach(toonify);
      weapons.forEach((w, i) => {
        w.scale.setScalar(1.95);
        w.rotation.z = 0.65;
        w.visible = i === state.equippedHarness;
        backMount.add(w);
        const slot = inventoryGuns[i];
        slot.mount.remove(slot.model);
        const preview = w.clone(true);
        preview.visible = true;
        preview.scale.setScalar(0.8);
        preview.rotation.set(-0.15, Math.PI / 2, -0.08);
        slot.mount.add(preview);
        slot.model = preview;
      });
      canvas.dataset.weaponAssets = "kenney-cc0";
      wake();
    })
    .catch((error) => {
      // The procedural silhouettes keep the same interaction usable if an asset request fails.
      canvas.dataset.weaponAssets = "procedural";
      console.warn(
        "Arena weapon models could not load; procedural silhouettes remain available.",
        error,
      );
    });
  // Foot-mounted vector thrusters: bright nozzle, translucent plasma cone and escaping particles.
  const jetGeometry = geometry(
    "thruster-envelope",
    () => new THREE.CylinderGeometry(0.14, 0.012, 1, 20, 1, true),
  );
  const thrusters = legs.map(({ knee }, index) => {
    const nozzle = new THREE.Group();
    nozzle.position.set(0, -0.8, 0.13);
    knee.add(nozzle);
    cylinder(nozzle, 0.12, 0.095, 0.11, metal, 0, -0.015, 0, 16);
    ring(nozzle, 0.095, 0.018, pale, 0, -0.079, 0);
    const plumeMaterial = new THREE.ShaderMaterial({
      uniforms: { phase: { value: 0 }, strength: { value: 1 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform float phase;uniform float strength;void main(){float axial=smoothstep(0.,.30,vUv.y);float pulse=.85+.15*sin(vUv.y*42.-phase*13.);vec3 color=mix(vec3(.035,.32,1.),vec3(.65,.94,1.),pow(vUv.y,3.));gl_FragColor=vec4(color*3.2,axial*pulse*.42*strength);}`,
    });
    allMaterials.add(plumeMaterial);
    const plume = mesh(jetGeometry, plumeMaterial, nozzle, 0, -0.58, 0);
    const core = cylinder(
      nozzle,
      0.065,
      0.008,
      0.49,
      luminous(0xb8f8ff, 6, 0.9),
      0,
      -0.32,
      0,
      12,
    );
    const halo = glow(nozzle, 0x71c9ff, 1.25, 0, -0.25, 0, 0.48);
    const positions = new Float32Array(27 * 3),
      colors = new Float32Array(27 * 3);
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3),
    );
    geoCache.set(`jet-particles-${index}`, particleGeometry);
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.033,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    allMaterials.add(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.frustumCulled = false;
    nozzle.add(particles);
    const pool = glow(stage, 0x4daeff, 1.75, 0, 0.11, 0, 0.2);
    return {
      nozzle,
      plume,
      core,
      halo,
      positions,
      colors,
      particleGeometry,
      plumeMaterial,
      pool,
    };
  });
  const routeNodes = [
      [0, 0.07, 5.3],
      [-3, 0.07, 2.6],
      [-6.9, 0.07, -1.4],
      [0, 0.07, -7],
      [7.1, 0.07, -1.5],
      [0, 0.07, 2.2],
    ],
    trace = line(stage, routeNodes, 0x62bfb8, 0.36);
  const milestoneLights = routeNodes.map((p, i) =>
    ring(
      stage,
      0.19,
      0.015,
      i < 2 ? teal : roomLights[Math.min(2, i - 2)],
      ...p,
    ),
  );
  const beamMat = luminous(0x82ffe4, 4, 0.8),
    beam = cylinder(stage, 0.027, 0.027, 1, beamMat),
    hit = glow(stage, 0x82ffe4, 2.4, 0, 0, 0, 0.6);
  beam.visible = hit.visible = false;
  const packets = Array.from({ length: 7 }, () => sphere(stage, 0.055, pale));
  const record = new THREE.Group();
  stage.add(record);
  record.visible = false;
  // The record is a Metacase tile: the same slab, edge and raised signature as on the homepage.
  const recordSpin = new THREE.Group(),
    recordTile = tile({ sig: 0, edge: 0x45b5b0, size: 1.15, glow: 1.4 });
  recordTile.rotation.x = 1.05;
  recordTile.position.y = -0.2;
  recordSpin.add(recordTile);
  record.add(recordSpin);
  // Each finished run leaves its own Metacase, which flies back to the plaza.
  const produced = colors.map((color, i) => {
      const t = tile({ sig: i + 1, edge: color, size: 0.55, glow: 1.2 });
      t.visible = false;
      stage.add(t);
      return t;
    }),
    producedHome = [-2.3, 0, 2.3].map((x) => vec(x, 4.85 - Math.abs(x) * 0.08, 3.2)),
    producedMid = vec();
  const recordRing = ring(record, 1.25, 0.018, teal);
  recordRing.rotation.z = 0.28;
  ring(record, 1.55, 0.012, dim).rotation.x = 1.2;
  glow(record, 0x4fffc7, 6, 0, 0, 0, 0.32);
  const recordTitle = plateText(
    record,
    [
      "CONTEXT → ACTION → OUTCOME",
      "A REUSABLE METACASE",
      "EXPERIENCE, WITH ITS EVIDENCE INTACT",
    ],
    5.2,
    0,
    1.85,
    0,
    "#8effdc",
  );
  const dustArray = [];
  for (let i = 0; i < 190; i++) {
    const a = Math.sin(i * 127.1 + 311.7) * 43758.5453,
      f = a - Math.floor(a);
    dustArray.push(
      Math.sin(i * 2.41) * (8 + f * 20),
      0.4 + f * 11,
      Math.cos(i * 1.71) * 21 - 6,
    );
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(dustArray, 3),
  );
  geoCache.set("dust", dustGeo);
  const dustMat = new THREE.PointsMaterial({
    color: 0xb7e9f5,
    size: 0.026,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  allMaterials.add(dustMat);
  // Little experts wait by each room; a few more stroll around the plaza.
  const crowd = [];
  roomDefs.forEach((def, r) => {
    for (let k = 0; k < 3; k++) {
      const p = person(r * 3 + k), group = new THREE.Group();
      group.add(p.root);
      const local = vec(-2.6 + k * 0.55 + (k === 2 ? 4.6 : 0), 0, 3.4 + (k % 2) * 0.4);
      rooms[r].group.updateMatrixWorld(true);
      group.position.copy(rooms[r].group.localToWorld(local));
      group.position.y = 0;
      group.lookAt(0, 0, 5);
      group.scale.setScalar(1.15);
      stage.add(group);
      crowd.push({ p, walk: 0 });
    }
  });
  for (let k = 0; k < 4; k++) {
    const p = person(20 + k), group = new THREE.Group();
    group.add(p.root); group.scale.setScalar(1.15); stage.add(group);
    crowd.push({ p, walk: 1, group, radius: 10.6 + (k % 2) * 0.8, phase: k * 1.6 });
  }
  const dust = new THREE.Points(dustGeo, dustMat);
  stage.add(dust);
  // Cartoon finish: ink outlines from depth, bloom on emissive light, vignette.
  const post = createPost(renderer, { bloom: 0.32, threshold: 0.9, vignette: 0.3 });
  function render() {
    post.render(scene, camera);
  }
  // Every shot and door is keyed to progress, so scrolling backward reconstructs the same episode.
  const shots = [
    {
      p: 0,
      camera: [0, 5.8, 17.5],
      look: [-2.2, 3, -3],
      hero: [0, 0.06, 5.3],
      heading: Math.PI,
      fov: 55,
    },
    {
      p: 0.15,
      camera: [-0.8, 5, 15],
      look: [-2.2, 2.7, -1.7],
      hero: [0, 0.06, 5.3],
      heading: Math.PI,
      fov: 53,
    },
    {
      p: 0.23,
      camera: [1.1, 4.2, 12.5],
      look: [0, 2.85, 4.6],
      hero: [0, 0.06, 5.3],
      heading: Math.PI + 0.22,
      fov: 56,
    },
    {
      p: 0.34,
      camera: [-0.9, 4.25, 12.4],
      look: [0, 2.85, 4.6],
      hero: [0, 0.06, 5.3],
      heading: Math.PI - 0.2,
      fov: 56,
    },
    {
      p: 0.43,
      camera: [-1.2, 5.4, 8.4],
      look: [-8.1, 3.25, -5.3],
      hero: [-6.8, 0.06, -1],
      heading: Math.PI + 0.42,
      fov: 57,
    },
    {
      p: 0.54,
      camera: [-2.5, 4.8, 6.6],
      look: [-9.2, 3.25, -6.4],
      hero: [-6.8, 0.06, -1.1],
      heading: Math.PI + 0.42,
      fov: 59,
    },
    {
      p: 0.62,
      camera: [-6.5, 5.5, 4.1],
      look: [0, 3.25, -10.1],
      hero: [-0.75, 0.06, -6.7],
      heading: Math.PI - 0.1,
      fov: 58,
    },
    {
      p: 0.72,
      camera: [-5.5, 4.8, 3.1],
      look: [0, 3.25, -11.2],
      hero: [-0.75, 0.06, -6.8],
      heading: Math.PI - 0.1,
      fov: 59,
    },
    {
      p: 0.81,
      camera: [1.2, 5.4, 8.4],
      look: [8.8, 3.25, -5.7],
      hero: [6.8, 0.06, -1.2],
      heading: Math.PI - 0.42,
      fov: 57,
    },
    {
      p: 0.9,
      camera: [2.5, 4.8, 6.6],
      look: [9.2, 3.25, -6.2],
      hero: [6.8, 0.06, -1.3],
      heading: Math.PI - 0.42,
      fov: 59,
    },
    {
      p: 1,
      camera: [0, 8, 20],
      look: [0, 3.3, -1.4],
      hero: [0, 0.06, 4.1],
      heading: Math.PI,
      fov: 56,
    },
  ];
  const cameraPos = vec(),
    cameraLook = vec(),
    heroPos = vec(),
    muzzle = vec(),
    beamTarget = vec(),
    beamDirection = vec(),
    beamMid = vec(),
    up = vec(0, 1, 0);
  let language = "en";
  function sampleShot(p) {
    let j = 0;
    while (j < shots.length - 2 && p > shots[j + 1].p) j++;
    const a = shots[j],
      b = shots[j + 1],
      f = smooth(a.p, b.p, p);
    const before = shots[Math.max(0, j - 1)],
      after = shots[Math.min(shots.length - 1, j + 2)];
    cameraPos.set(
      ...[0, 1, 2].map((axis) =>
        catmullRom(
          before.camera[axis],
          a.camera[axis],
          b.camera[axis],
          after.camera[axis],
          f,
        ),
      ),
    );
    cameraLook.set(...a.look).lerp(vec(...b.look), f);
    heroPos.set(...a.hero).lerp(vec(...b.hero), f);
    return {
      heading: mix(a.heading, b.heading, f),
      fov: mix(a.fov, b.fov, f),
      moving: Math.hypot(a.hero[0] - b.hero[0], a.hero[2] - b.hero[2]) > 1,
      f,
    };
  }
  function draw(dt) {
    if (disposed || !width || !height) return;
    const transitioning = Math.abs(state.progress - progress) > 0.00015,
      ambient = !reduced && !state.paused;
    if (ambient) time += dt;
    progress +=
      (state.progress - progress) * (reduced ? 1 : Math.min(1, dt * 7.5));
    pointerX +=
      ((reduced ? 0 : state.pointer.x) - pointerX) *
      (reduced ? 1 : Math.min(1, dt * 4));
    pointerY +=
      ((reduced ? 0 : state.pointer.y) - pointerY) *
      (reduced ? 1 : Math.min(1, dt * 4));
    const p = clamp(progress, 0, 1),
      shot = sampleShot(p),
      mobile = width / height < 0.9;
    if (mobile) {
      // Portrait establishing shots show all three rooms; detail shots retain their own framing.
      const wide = 1 - smooth(0.12, 0.19, p) + smooth(0.93, 1, p);
      cameraLook.x *= 1 - wide;
      cameraPos
        .sub(cameraLook)
        .multiplyScalar(mix(p > 0.15 && p < 0.38 ? 1.4 : 1.5, 1.85, wide))
        .add(cameraLook);
      shot.fov = 65;
    }
    cameraPos.x += pointerX * 0.38;
    cameraPos.y += pointerY * 0.15;
    camera.position.copy(cameraPos);
    camera.lookAt(cameraLook);
    // Portrait screens keep the landscape framing's width instead of cropping the rooms.
    camera.fov =
      camera.aspect < 1.2
        ? THREE.MathUtils.radToDeg(
            2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(shot.fov) / 2) * Math.min(1.55, 1 / camera.aspect)),
          )
        : shot.fov;
    camera.updateProjectionMatrix();
    agent.position.copy(heroPos);
    agent.rotation.y = shot.heading;
    // Flight pose depends on where the agent is along its route, not scroll direction or frame rate.
    const travel = shot.moving ? Math.sin(Math.PI * shot.f) : 0;
    const hover =
      0.58 + travel * 0.58 + (ambient ? Math.sin(time * 1.65) * 0.035 : 0);
    agent.position.y += hover;
    body.position.y = 0;
    body.rotation.x = 0.04 + travel * 0.22;
    body.rotation.z = travel * Math.sin(p * 18) * 0.045;
    legs.forEach(({ leg, knee }, i) => {
      leg.rotation.x = -0.1 - travel * 0.06 + (i ? 0.025 : -0.025);
      leg.rotation.z = i ? -0.045 : 0.045;
      knee.rotation.x = 0.3 + travel * 0.38;
    });
    arms[0].rotation.x = 0.1 + travel * 0.2;
    arms[1].rotation.x = 0.1 + travel * 0.2;
    arms[0].rotation.z = -0.1;
    arms[1].rotation.z = 0.1;
    head.rotation.x = -body.rotation.x * 0.45;
    head.rotation.y = ambient ? Math.sin(time * 0.7) * 0.035 : 0;
    weapons.forEach((w, i) => {
      w.visible = state.equippedHarness !== null && i === state.equippedHarness;
    });
    agentGround.position.set(heroPos.x, 0.07, heroPos.z);
    agentGround.material =
      state.equippedHarness === null
        ? dim
        : weaponLights[state.equippedHarness];
    agentHalo.position.set(heroPos.x, 2 + hover, heroPos.z);
    heroLight.position.copy(agent.position).add(vec(-1.6, 3.3, 2));
    agent.updateMatrixWorld(true);
    thrusters.forEach((jet, index) => {
      jet.plume.scale.y = 0.67 + travel * 0.7;
      jet.plume.position.y = -0.1 - jet.plume.scale.y * 0.5;
      jet.core.scale.y = 0.8 + travel * 0.7;
      jet.core.position.y = -0.1 - 0.245 * jet.core.scale.y;
      jet.plumeMaterial.uniforms.strength.value = 0.8 + travel * 0.25;
      jet.plumeMaterial.uniforms.phase.value = p * 33 + (ambient ? time : 0);
      jet.halo.scale.setScalar(1.0 + travel * 0.35);
      const flow = p * 38 + (ambient ? time * 1.2 : 0);
      for (let j = 0; j < 27; j++) {
        const age = (j / 27 + flow + index * 0.37) % 1,
          spread = 0.015 + age * 0.105;
        jet.positions[j * 3] = Math.sin(j * 2.4 + index) * spread;
        jet.positions[j * 3 + 1] = -0.1 - age * (0.9 + travel * 0.9);
        jet.positions[j * 3 + 2] = Math.cos(j * 1.7) * spread;
        const life = (1 - age) ** 1.7;
        jet.colors[j * 3] = 0.3 * life;
        jet.colors[j * 3 + 1] = 0.68 * life;
        jet.colors[j * 3 + 2] = life;
      }
      jet.particleGeometry.attributes.position.needsUpdate = true;
      jet.particleGeometry.attributes.color.needsUpdate = true;
      jet.nozzle.getWorldPosition(jet.pool.position);
      jet.pool.position.y = 0.1;
      jet.pool.material.opacity = 0.14 + travel * 0.07;
      jet.pool.scale.setScalar(1.25 + travel * 0.55);
    });
    const inventoryAmount = smooth(0.16, 0.22, p) * (1 - smooth(0.34, 0.39, p));
    inventory.visible = inventoryAmount > 0.01;
    inventory.scale.setScalar(Math.max(0.01, inventoryAmount));
    inventoryGuns.forEach(({ model, platform }, i) => {
      model.rotation.y =
        Math.PI / 2 + (ambient ? Math.sin(time * 0.7 + i) * 0.12 : 0);
      platform.scale.setScalar(i === state.harness ? 1.2 : 0.85);
    });
    const roomWindows = [
      [0.375, 0.45, 0.57],
      [0.565, 0.63, 0.76],
      [0.755, 0.82, 0.94],
    ];
    rooms.forEach((room, i) => {
      const [start, reveal, end] = roomWindows[i],
        open = 0.52 + 0.48 * smooth(start, reveal, p),
        active = p >= start && p < end;
      room.doors[0].position.x = -1.48 - open * 1.72;
      room.doors[1].position.x = 1.48 + open * 1.72;
      room.doors.forEach((d) => {
        d.scale.x = 1 - open * 0.94;
      });
      room.chamberLight.intensity = active ? 40 : 17;
      room.halo.material.opacity = active ? 0.2 : 0.075;
      room.scan.visible = active;
      room.scan.position.y = 1.2 + ((((p - start) / (end - start)) * 11) % 5.4);
      room.core.rotation.y =
        i === 2 ? (p - 0.755) * 4 + (ambient ? time * 0.05 : 0) : 0;
      const titleFocus = p > 0.385 && p < 0.93 ? (active ? 1 : 0.48) : 1;
      const titleInventory = 1 - smooth(0.12, 0.16, p) + smooth(0.38, 0.42, p);
      room.title.plane.material.opacity =
        titleFocus * clamp(titleInventory, 0, 1);
      // Approach and departure dissolve in spatial cells; replaying the same progress is identical.
      const threshold = room.group.localToWorld(vec(0, 0, 3.7));
      const proximity =
        1 -
        smooth(
          3.8,
          8.3,
          Math.hypot(heroPos.x - threshold.x, heroPos.z - threshold.z),
        );
      const promptReveal =
        proximity *
        smooth(start - 0.025, start + 0.035, p) *
        (1 - smooth(end - 0.025, end + 0.035, p));
      room.prompt.visible = promptReveal > 0.002;
      room.prompt.material.uniforms.reveal.value = promptReveal;
      room.core.children.forEach((child) => {
        if (child.material?.map) child.rotation.y = -room.core.rotation.y;
      });
    });
    if (state.language !== language) {
      language = state.language;
      rooms.forEach((room) =>
        room.title.write(
          language === "zh" ? room.definition.zh : room.definition.en,
        ),
      );
      recordTitle.write(
        language === "zh"
          ? [
              "情境 → 行动 → 结果",
              "一个可复用的 METACASE",
              "保留证据，让经验可以被理解和复用",
            ]
          : [
              "CONTEXT → ACTION → OUTCOME",
              "A REUSABLE METACASE",
              "EXPERIENCE, WITH ITS EVIDENCE INTACT",
            ],
      );
    }
    const activeRoom = p >= 0.76 ? 2 : p >= 0.57 ? 1 : 0,
      actionWindow = actionWindows[activeRoom],
      firing =
        state.equippedHarness !== null &&
        p > actionWindow[0] &&
        p < actionWindow[1];
    beam.visible = hit.visible = firing;
    palmEmitter.visible = firing;
    packets.forEach((packet) => {
      packet.visible = firing;
    });
    if (firing) {
      arms[1].rotation.x = -1.05;
      agent.updateMatrixWorld(true);
      arms[1].localToWorld(muzzle.set(0, -1.06, 0.23));
      beamTarget.copy(roomTargets[activeRoom]);
      beamDirection.copy(beamTarget).sub(muzzle);
      const length = beamDirection.length();
      beamDirection.normalize();
      beamMid.copy(beamTarget).add(muzzle).multiplyScalar(0.5);
      beam.position.copy(beamMid);
      beam.quaternion.setFromUnitVectors(up, beamDirection);
      beam.scale.y = length;
      beamMat.color.set(harnessColors[state.equippedHarness]);
      beamMat.emissive.set(harnessColors[state.equippedHarness]);
      hit.position.copy(beamTarget);
      hit.material.color.set(colors[activeRoom]);
      packets.forEach((packet, i) => {
        packet.position
          .copy(muzzle)
          .lerp(beamTarget, (i / 7 + (ambient ? time * 0.4 : p * 9)) % 1);
      });
    }
    const recordAmount = smooth(0.935, 0.985, p);
    record.visible = recordAmount > 0.001;
    record.scale.setScalar(Math.max(0.001, recordAmount));
    record.position.set(
      0,
      6.75 + (ambient ? Math.sin(time * 1.4) * 0.08 : 0),
      3,
    );
    recordSpin.rotation.y = Math.sin(p * 3 + time * 0.4) * 0.45;
    produced.forEach((t, i) => {
      const end = actionWindows[i][1],
        k = smooth(end - 0.01, end + 0.05, p);
      t.visible = k > 0.001;
      if (!t.visible) return;
      const from = roomTargets[i],
        to = producedHome[i];
      producedMid.copy(from).lerp(to, 0.5).y += 4.5;
      t.position
        .copy(from)
        .multiplyScalar((1 - k) * (1 - k))
        .addScaledVector(producedMid, 2 * (1 - k) * k)
        .addScaledVector(to, k * k);
      t.position.y += k > 0.99 && ambient ? Math.sin(time * 1.6 + i) * 0.06 : 0;
      t.scale.setScalar(Math.max(0.001, Math.min(1, k * 4)));
      t.rotation.set(mix(0, 1.05, k), (1 - k) * Math.PI * 2, 0);
    });
    recordRing.rotation.y = p * 4;
    recordTitle.plane.quaternion.copy(camera.quaternion);
    trace.material.opacity = 0.12 + p * 0.22;
    milestoneLights.forEach((light, i) => {
      light.scale.setScalar(i <= p * 6 ? 1.5 : 1);
    });
    centerSymbol.rotation.z = p * 0.6;
    centerGlow.material.opacity = 0.08 + inventoryAmount * 0.08;
    dust.rotation.y = time * 0.006;
    crowd.forEach((c) => {
      c.p.update(time, c.walk);
      if (c.group) {
        const a = c.phase + time * 0.12;
        c.group.position.set(Math.sin(a) * c.radius, 0, Math.cos(a) * c.radius * 0.85 - 1);
        c.group.rotation.y = a + Math.PI / 2;
      }
    });
    render();
  }
  function tick(now) {
    raf = 0;
    if (!visible || disposed || document.hidden) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;
    draw(dt);
    if (
      (!reduced && !state.paused) ||
      Math.abs(state.progress - progress) > 0.0001 ||
      (!reduced &&
        (Math.abs(state.pointer.x - pointerX) > 0.001 ||
          Math.abs(state.pointer.y - pointerY) > 0.001))
    )
      raf = requestAnimationFrame(tick);
  }
  function wake() {
    if (!disposed && visible && !document.hidden && !raf) {
      lastTime = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function resize() {
    const b = canvas.getBoundingClientRect();
    width = b.width;
    height = b.height;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    post.setSize(width, height);
    wake();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) wake();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
        lastTime = 0;
      }
    },
    { threshold: 0.01 },
  );
  io.observe(canvas);
  const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        lastTime = 0;
      } else wake();
    },
    onReduced = (event) => {
      reduced = event.matches;
      wake();
    };
  document.addEventListener("visibilitychange", onVisibility);
  motionQuery.addEventListener("change", onReduced);
  resize();
  return {
    update(next) {
      if (disposed) return;
      if (Number.isFinite(next.progress))
        state.progress = clamp(next.progress, 0, 1);
      if (Number.isFinite(next.harness))
        state.harness = clamp(Math.round(next.harness), 0, 7);
      if (Object.prototype.hasOwnProperty.call(next, "equippedHarness"))
        state.equippedHarness = Number.isFinite(next.equippedHarness)
          ? clamp(Math.round(next.equippedHarness), 0, 7)
          : null;
      if (Number.isFinite(next.room))
        state.room = clamp(Math.round(next.room), 0, 2);
      if (next.pointer)
        state.pointer = {
          x: clamp(next.pointer.x || 0, -1, 1),
          y: clamp(next.pointer.y || 0, -1, 1),
        };
      if (typeof next.paused === "boolean") state.paused = next.paused;
      if (next.language) state.language = next.language === "zh" ? "zh" : "en";
      wake();
    },
    getLabelPositions() {
      return rooms.map((room, index) => {
        const point = room.title.plane.getWorldPosition(vec()).project(camera);
        return {
          room: index,
          x: (point.x + 1) * 50,
          y: (1 - point.y) * 50,
          visible:
            point.z > -1 &&
            point.z < 1 &&
            Math.abs(point.x) < 1.2 &&
            Math.abs(point.y) < 1.2,
        };
      });
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onReduced);
      geoCache.forEach((g) => g.dispose());
      allMaterials.forEach((m) => m.dispose());
      allTextures.forEach((t) => t.dispose());
      modelLibrary?.dispose();
      post.dispose();
      renderer.dispose();
    },
  };
}
