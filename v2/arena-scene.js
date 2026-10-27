/** The Metacase Challenge arena. Procedural geometry, local Three.js r170, reversible scroll choreography.
 * A Challenge reading room in the same library as the adjacent chapters.
 * Shared toy-kit geometry, warm wood, cream walls and theme-aware lighting. */
import * as THREE from "../assets/vendor/three/three.module.js";
import { catmullRom } from "./arena-motion.js";
import { toon, toonify, createPost } from "./mc-toon.js";
import { person, robot, tile, PALETTE } from "./mc-kit.js";
import { pageBackground } from "./mc-stage.js";
import { ARENA_DOMAINS, HARNESS_NAMES } from "./arena-data.js";
import { createCampusDetails } from "./arena-campus.js";
import { createRoomSubtracks } from "./arena-subtracks.js";
export function createArenaScene(canvas, { onWeaponProject, onPortalProject } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(pageBackground());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = pageBackground();
  scene.fog = new THREE.FogExp2(scene.background, 0.009);
  const camera = new THREE.PerspectiveCamera(53, 1, 0.1, 150);
  const stage = new THREE.Group();
  scene.add(stage);
  const state = {
    progress: 0,
    arrival: 1,
    model: 0,
    harness: 0,
    equippedHarness: null,
    room: 0,
    pointer: { x: 0, y: 0 },
    paused: false,
    language: "en",
    portalFocus: "",
    portalCharge: false,
  };
  let frameDt = 1 / 60;
  const colors = ARENA_DOMAINS.map(domain => domain.color),
    harnessColors = [
      0x61ebd7, 0xa791ff, 0xe5bd96, 0xb7d9ec, 0xf48cbe, 0x7dcbf7, 0xf4bd61,
      0xd4f08d,
    ];
  const geoCache = new Map(),
    allMaterials = new Set(),
    allTextures = new Set();
  // The kit caches geometry and materials across the homepage's WebGL scenes.
  // Keep private copies here so disposing this independently loaded chapter can
  // never invalidate the islands, cards or robots in another chapter.
  const kitGeometry = new Map(), kitMaterials = new Map();
  function localKit(object) {
    object.traverse(node => {
      if (!node.isMesh) return;
      if (!kitGeometry.has(node.geometry)) {
        const copy = node.geometry.clone();
        kitGeometry.set(node.geometry, copy);
        geoCache.set(`kit:${geoCache.size}`, copy);
      }
      node.geometry = kitGeometry.get(node.geometry);
      const copyMaterial = original => {
        if (!kitMaterials.has(original)) {
          const copy = original.clone();
          kitMaterials.set(original, copy);
          allMaterials.add(copy);
        }
        return kitMaterials.get(original);
      };
      node.material = Array.isArray(node.material) ? node.material.map(copyMaterial) : copyMaterial(node.material);
    });
    return object;
  }
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
  // The library's materials: warm wood, cream walls and coloured volumes (see metacase-library.js).
  const wood = material(0x7a5a42),
    woodDark = material(0x5a4434),
    parquet = material(0x6e5440),
    wall = material(0xf1ece0);
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
    radius = Math.min(radius, w / 2, h / 2, d / 2);
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
  function entrancePlaque(parent, copy, accent, color, index = 0) {
    const frame = new THREE.Group();
    frame.position.set(0, 7.52, 2.11);
    parent.add(frame);
    box(frame, 7.0, 1.26, 0.19, woodDark, 0, 0, 0, 0.065);
    box(frame, 6.78, 1.06, 0.025, wall, 0, 0, 0.105, 0.025);
    box(frame, 6.7, 0.045, 0.08, accent, 0, -0.58, 0.07, 0.015);
    for (const side of [-1, 1]) {
      box(frame, 0.12, 0.72, 0.09, accent, side * 3.34, 0, 0.13, 0.03);
      // Architectural wing ribs flanking the central crest (no text on the lintel)
      box(frame, 1.55, 0.055, 0.05, accent, side * 1.95, 0.12, 0.13, 0.02);
      box(frame, 1.05, 0.04, 0.045, gold, side * 1.7, -0.12, 0.13, 0.015);
      sphere(frame, 0.065, accent, side * 0.92, 0, 0.15);
    }
    // Central 3D domain crest medallion on the lintel
    const crest = new THREE.Group();
    crest.position.set(0, 0, 0.14);
    frame.add(crest);
    const ringMesh = mesh(
      geometry("crest-ring", () => new THREE.TorusGeometry(0.42, 0.04, 12, 36)),
      accent,
      crest,
      0,
      0,
      0.02,
    );
    ringMesh.castShadow = false;
    cylinder(crest, 0.39, 0.39, 0.04, woodDark, 0, 0, 0, 32).rotation.x = Math.PI / 2;
    if (index === 0) {
      // Economics crest: rising empirical bars + trend line
      [-0.18, -0.06, 0.06, 0.18].forEach((x, k) => {
        const h = [0.2, 0.32, 0.26, 0.44][k];
        box(crest, 0.07, h, 0.06, k === 3 ? accent : gold, x, -0.2 + h / 2, 0.04, 0.015);
      });
      const trend = box(crest, 0.48, 0.035, 0.05, accent, 0, 0.05, 0.06, 0.01);
      trend.rotation.z = 0.42;
    } else if (index === 1) {
      // Finance crest: balance scale & ledger coin
      box(crest, 0.05, 0.46, 0.05, gold, 0, -0.02, 0.04, 0.015);
      box(crest, 0.48, 0.04, 0.05, accent, 0, 0.16, 0.05, 0.015);
      for (const s of [-1, 1]) {
        sphere(crest, 0.075, accent, s * 0.2, -0.02, 0.05);
      }
      cylinder(crest, 0.14, 0.16, 0.05, gold, 0, -0.22, 0.04, 18);
    } else {
      // Social science crest: interconnected triad network
      const pts = [
        [0, 0.2],
        [-0.2, -0.14],
        [0.2, -0.14],
      ];
      pts.forEach(([x, y], k) => {
        sphere(crest, 0.085, k === 0 ? accent : gold, x, y, 0.05);
      });
      box(crest, 0.4, 0.03, 0.04, accent, 0, -0.14, 0.04, 0.01);
      [-1, 1].forEach((s) => {
        const leg = box(crest, 0.36, 0.03, 0.04, accent, s * 0.1, 0.03, 0.04, 0.01);
        leg.rotation.z = -s * 1.02;
      });
    }
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    allMaterials.add(mat);
    const plane = new THREE.Group();
    plane.material = mat;
    frame.add(plane);
    function write() {}
    return { plane, write, frame };
  }
  function challengePrompt(parent, color) {
    const material = new THREE.ShaderMaterial({
      uniforms: { reveal: { value: 0 }, tint: { value: new THREE.Color(color) } },
      transparent: true,
      depthWrite: false,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform float reveal;uniform vec3 tint;
      void main(){
        vec2 p = (vUv - 0.5) * vec2(6.0, 2.0);
        float d = abs(p.x) * 0.35 + abs(p.y);
        float gem = smoothstep(0.55, 0.18, d) * reveal;
        gl_FragColor = vec4(mix(tint, vec3(1.0), 0.45), gem * 0.85);
      }`,
    });
    allMaterials.add(material);
    const plane = mesh(
      geometry("challenge-prompt", () => new THREE.PlaneGeometry(1.8, 0.36)),
      material,
      parent,
      0,
      6.52,
      2.26,
    );
    plane.scale.setScalar(0.86);
    plane.visible = false;
    plane.userData.redrawText = () => {};
    return plane;
  }
  // Soft sky fill and warm shadows match the surrounding toy-world chapters.
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
  // Reuse the latest homepage's round parquet hall; campus adds the bookcases.
  cylinder(stage, 24, 24, 0.4, woodDark, 0, -0.25, 0, 128);
  const ground = mesh(
    geometry("unbroken-ground", () => new THREE.PlaneGeometry(200, 200)),
    material(0x05070e),
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
    parquet,
    0,
    -0.05,
    0,
    128,
  );
  for (const r of [3.4, 6.2, 9.5, 13.5, 17.5]) ring(stage, r, 0.03, woodDark, 0, 0.02, 0);
  // a reading-room rug where the agent starts
  cylinder(stage, 2.6, 2.6, 0.04, material(0x3a4a7a), 0, 0.01, 5.1, 64);
  ring(stage, 2.35, 0.05, gold, 0, 0.05, 5.1);
  const centerSymbol = ring(stage, 1.9, 0.025, teal, 0, 0.06, 4.8);
  ring(stage, 2.05, 0.01, dim, 0, 0.055, 4.8);
  const centerGlow = glow(stage, 0x60efd9, 9, 0, 0.15, 4.8, 0.12);
  const roomDefs = ARENA_DOMAINS.map((domain, index) => ({
    x: [-9.2, 0, 9.2][index], z: [-6.3, -12.2, -6.3][index],
    turn: [0.52, 0, -0.52][index], id: domain.id,
    en: ['', domain.name[0].toUpperCase()],
    zh: ['', domain.name[1]],
  }));
  const roomTargets = roomDefs.map((d) => vec(d.x, 2.8, d.z - 1)),
    actionWindows = [
      [0.465, 0.55],
      [0.65, 0.735],
      [0.84, 0.915],
    ];
  // Each doorway is a portal to its track: a vortex in the field's colour fills the opening
  // (spiral arms falling inward, a flickering rim, arcs of light), sparks are drawn into it
  // and a ring of glyphs turns on the floor before it. The room stays visible through the
  // middle; pointing at a portal's link makes it surge, and stepping through floods it.
  const NOISE = `float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}`;
  const sparkScale = { value: 1 };
  function portalVeil(group, color, index) {
    const uniforms = { time: { value: 0 }, power: { value: 0 }, surge: { value: 0 }, tint: { value: new THREE.Color(color) } };
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
    const mat = new THREE.ShaderMaterial({
      uniforms, ...additive, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform float time;uniform float power;uniform float surge;uniform vec3 tint;${NOISE}
        void main(){vec2 q=(vUv-.5)*vec2(2.,2.34);float r=length(q),a=atan(q.y,q.x),t=time*(1.+surge*1.6),z=log(max(r,.03));
        float inside=smoothstep(1.03,.93,r);
        float arms=pow(.5+.5*sin(a*3.-z*7.+t*2.4),3.);
        float flow=n21(vec2(a*1.6+t*.5,z*4.-t*2.));
        float swirl=(arms*.75+flow*.45)*smoothstep(.2,.92,r)*inside;
        float rings=pow(.5+.5*sin(z*11.-t*5.),6.)*inside*smoothstep(.05,.6,r);
        float rim=exp(-pow((r-.97)*16.,2.))*(1.+.45*sin(a*11.-t*6.)+.5*flow);
        float arcs=smoothstep(.72,1.,n21(vec2(a*5.,t*2.6)))*exp(-pow((r-1.04)*10.,2.));
        float core=exp(-r*r*5.)*surge;
        vec3 hot=mix(tint,vec3(1.),.6);
        vec3 col=tint*(swirl*.85+rings*.42+surge*.4*inside)+hot*(rim*1.25+arcs*1.9)+vec3(core*1.3);
        gl_FragColor=vec4(col*power*(1.+surge*.6),1.);
        #include <colorspace_fragment>
        }`,
    });
    allMaterials.add(mat);
    const veil = new THREE.Mesh(geometry("portal-veil", () => new THREE.PlaneGeometry(5.3, 6.2)), mat);
    veil.position.set(0, 3.7, 1.2); veil.renderOrder = 2; group.add(veil);
    // sparks: each follows an inward spiral from in front of the doorway into its centre
    const N = 72, seeds = new Float32Array(N * 3);
    for (let k = 0; k < N * 3; k++) seeds[k] = Math.abs((Math.sin((k + 1) * 12.9898 + index * 78.233) * 43758.5453) % 1);
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    sparkGeometry.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 3));
    const sparkMat = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, scale: sparkScale }, ...additive,
      vertexShader: `attribute vec3 seed;uniform float time;uniform float power;uniform float surge;uniform float scale;varying float vA;
        void main(){float sp=.35+seed.z*.65;float u=fract(seed.y+time*.16*sp*(1.+surge*2.5));
        float rr=mix(1.22,.06,pow(u,1.35)),ang=seed.x*6.2832+u*(5.+seed.z*3.);
        vec3 p=vec3(cos(ang)*rr*2.55,3.7+sin(ang)*rr*2.98,1.25+(1.-u)*(.4+seed.z*1.8));
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=scale*(.07+.09*seed.z)*(1.-.5*u)/max(.1,-mv.z);
        vA=smoothstep(0.,.15,u)*(1.-smoothstep(.8,1.,u))*power*(.55+surge);}`,
      fragmentShader: `uniform vec3 tint;varying float vA;
        void main(){float d=length(gl_PointCoord-.5);float g=smoothstep(.5,0.,d);g*=g;
        gl_FragColor=vec4(mix(tint,vec3(1.),.35+.5*g)*g*vA*1.8,1.);
        #include <colorspace_fragment>
        }`,
    });
    allMaterials.add(sparkMat);
    const sparks = new THREE.Points(sparkGeometry, sparkMat); sparks.frustumCulled = false; sparks.renderOrder = 3; group.add(sparks);
    // the glyph ring on the floor before the doorway
    const glyphMat = new THREE.ShaderMaterial({
      uniforms, ...additive,
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform float time;uniform float power;uniform float surge;uniform vec3 tint;
        void main(){vec2 q=vUv-.5;float r=length(q)*2.,a=atan(q.y,q.x),t=time*(1.+surge*2.);
        float ring=exp(-pow((r-.94)*40.,2.))+exp(-pow((r-.72)*55.,2.))*.7;
        float ticks=step(.55,fract(a*36./6.2832+t*.15))*smoothstep(.78,.8,r)*smoothstep(.9,.88,r);
        float runes=step(.7,fract(a*12./6.2832-t*.08))*step(.5,fract(r*9.))*smoothstep(.45,.5,r)*smoothstep(.68,.64,r)*.5;
        float k=(ring+ticks*.6+runes+exp(-r*r*3.)*.3*surge)*smoothstep(1.,.96,r);
        gl_FragColor=vec4(mix(tint,vec3(1.),.25)*k*power*(.55+surge),1.);
        #include <colorspace_fragment>
        }`,
    });
    allMaterials.add(glyphMat);
    const glyph = new THREE.Mesh(geometry("portal-glyph", () => new THREE.PlaneGeometry(4.4, 4.4)), glyphMat);
    glyph.rotation.x = -Math.PI / 2; glyph.position.set(0, 0.04, 4.6); glyph.renderOrder = 1; group.add(glyph);
    return { veil, mat, uniforms, sparks, glyph, surge: 0 };
  }
  const portalPoint = vec(), portalList = [];
  const rooms = roomDefs.map((def, index) => {
    const group = new THREE.Group();
    group.position.set(def.x, 0, def.z);
    group.rotation.y = def.turn;
    stage.add(group);
    const accent = roomLights[index],
      color = colors[index];
    // Reading rooms share the library's finish: wood frame, cream walls, a coloured trim.
    const black = woodDark, metal = wood, hull = wall, panel = wall;
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
        ["#246d68", "#855c1c", "#65519e"][index],
        index,
      ),
      prompt = challengePrompt(group, ["#246d68", "#855c1c", "#65519e"][index]);
    const subtracks = createRoomSubtracks({ domain: ARENA_DOMAINS[index], index });
    group.add(subtracks.root);
    const portal = portalVeil(group, color, index);
    return {
      group,
      portal,
      doors,
      core,
      chamberLight,
      halo,
      scan,
      title,
      prompt,
      subtracks,
      definition: def,
    };
  });
  const campus = createCampusDetails({ rooms: roomDefs, localKit });
  stage.add(campus.root);
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
      room.subtracks.redraw(state.language);
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
  // The same little robot used by the preceding Metacase chapters. Its original
  // head, visor, eyes, antenna, body and feet are retained; only the flight rig is new.
  const agent = new THREE.Group();
  agent.position.set(0, 0.06, 5.3);
  stage.add(agent);
  const body = new THREE.Group();
  agent.add(body);
  const toyRobot = robot(PALETTE.cream, 0x8ff6ff);
  localKit(toyRobot.root);
  toyRobot.root.scale.setScalar(2.85);
  body.add(toyRobot.root);
  const head = toyRobot.head;
  canvas.dataset.robotModel = "mc-kit";

  // Six distinct 3D Model Character loadouts (armor tint, visor glow, chest core, shoulder pauldrons & head crest)
  const MODEL_PALETTES = [
    { hull: 0xf7f8fb, eye: 0x67f5ff, trim: 0x45b5b0 }, // 0: GPT-5.6 Sol (Tactician)
    { hull: 0xfaf0dc, eye: 0xffd666, trim: 0xf2b545 }, // 1: Claude Opus 4.8 (Scholar)
    { hull: 0xe6edff, eye: 0xc4a7ff, trim: 0x7d6ad8 }, // 2: Gemini 3.1 Pro (Twin-Core)
    { hull: 0xdce8fa, eye: 0x8be9fd, trim: 0x6aa8e8 }, // 3: Kimi K3 (Explorer)
    { hull: 0xe2f5f2, eye: 0x5eead4, trim: 0x2dd4bf }, // 4: DeepSeek V4 Pro (Reasoner)
    { hull: 0xf9ebf0, eye: 0xff9eb5, trim: 0xe2667a }, // 5: Qwen3.7-Max (Vanguard)
  ];
  const robotHullMeshes = [], robotEyeMeshes = [];
  toyRobot.root.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const hex = node.material.color?.getHex?.();
    if (hex === PALETTE.cream) robotHullMeshes.push(node);
    else if (hex === 0x8ff6ff) robotEyeMeshes.push(node);
  });
  const charTrimMat = luminous(0x45b5b0, 1.3, 0.25);
  const charCoreMat = luminous(0x67f5ff, 2.6, 0.15);
  // Shoulder pauldrons & chest core on the robot torso
  const torsoArmor = new THREE.Group();
  toyRobot.root.add(torsoArmor);
  for (const s of [-1, 1]) {
    const pauldron = box(torsoArmor, 0.14, 0.16, 0.24, charTrimMat, s * 0.29, 0.46, 0, 0.04);
    pauldron.rotation.z = -s * 0.22;
  }
  sphere(torsoArmor, 0.075, charCoreMat, 0, 0.36, 0.19);
  ring(torsoArmor, 0.11, 0.015, charTrimMat, 0, 0.36, 0.195, false).rotation.x = Math.PI / 2;

  // Six distinct 3D head crests mounted on `head`
  const modelCrests = MODEL_PALETTES.map((mp, idx) => {
    const g = new THREE.Group();
    const mTrim = luminous(mp.trim, 1.4, 0.25), mGlow = luminous(mp.eye, 2.4, 0.15);
    if (idx === 0) {
      // Sol: golden sun-crown crest with 3 prongs
      box(g, 0.26, 0.08, 0.06, gold, 0, 0.41, 0.18, 0.02);
      [-0.09, 0, 0.09].forEach((x, k) => box(g, 0.05, k === 1 ? 0.16 : 0.11, 0.05, k === 1 ? mGlow : gold, x, 0.47 + (k === 1 ? 0.02 : 0), 0.18, 0.015));
    } else if (idx === 1) {
      // Opus: floating scholar halo ring above the head
      const haloRing = ring(g, 0.26, 0.025, gold, 0, 0.56, 0, false);
      haloRing.rotation.x = 0.18;
      sphere(g, 0.055, mGlow, 0, 0.38, 0.2);
    } else if (idx === 2) {
      // Gemini: twin V-wing antennae + prism brow
      for (const s of [-1, 1]) {
        const wing = box(g, 0.05, 0.28, 0.08, s < 0 ? mTrim : mGlow, s * 0.18, 0.48, 0.06, 0.02);
        wing.rotation.z = -s * 0.38;
      }
      box(g, 0.22, 0.06, 0.06, mGlow, 0, 0.36, 0.2, 0.02);
    } else if (idx === 3) {
      // Kimi: crescent moon fin + side ear pods
      const fin = ring(g, 0.18, 0.028, mGlow, 0, 0.5, 0.12, false);
      fin.rotation.y = Math.PI / 2;
      for (const s of [-1, 1]) cylinder(g, 0.06, 0.06, 0.08, mTrim, s * 0.28, 0.2, 0, 12).rotation.z = Math.PI / 2;
    } else if (idx === 4) {
      // DeepSeek: neural matrix visor fin + dual dorsal blades
      box(g, 0.46, 0.06, 0.12, mTrim, 0, 0.28, 0.18, 0.02);
      for (const s of [-1, 1]) {
        const blade = box(g, 0.05, 0.24, 0.18, mGlow, s * 0.22, 0.44, -0.05, 0.015);
        blade.rotation.x = -0.35;
      }
    } else {
      // Qwen: star-wing V-crest on forehead
      for (const s of [-1, 1]) {
        const horn = box(g, 0.24, 0.06, 0.05, mTrim, s * 0.11, 0.43, 0.19, 0.015);
        horn.rotation.z = s * 0.42;
      }
      sphere(g, 0.065, gold, 0, 0.4, 0.21);
    }
    g.visible = idx === 0;
    head.add(g);
    return g;
  });
  let appliedModel = -1;
  function applyCharacterModel(idx) {
    if (idx === appliedModel) return;
    appliedModel = idx;
    const mp = MODEL_PALETTES[idx] || MODEL_PALETTES[0];
    robotHullMeshes.forEach((m) => m.material.color.setHex(mp.hull));
    robotEyeMeshes.forEach((m) => {
      m.material.color.setHex(mp.eye);
      if (m.material.emissive) m.material.emissive.setHex(mp.eye);
    });
    charTrimMat.color.setHex(mp.trim);
    charTrimMat.emissive.setHex(mp.trim);
    charCoreMat.color.setHex(mp.eye);
    charCoreMat.emissive.setHex(mp.eye);
    modelCrests.forEach((c, i) => {
      c.visible = i === idx;
    });
  }
  applyCharacterModel(0);
  const jetMounts = [-1, 1].map(side => {
    const mount = new THREE.Group();
    mount.position.set(side * 0.14 * 2.85, 0.015, 0);
    body.add(mount);
    return mount;
  });
  // One world-space mount follows a back anchor, then glides into an aiming
  // position beside the robot. Keeping the parent stable makes reverse seeking exact.
  const backAnchor = new THREE.Group();
  backAnchor.position.set(-0.35, 1.5, -0.69);
  backAnchor.rotation.set(-Math.PI / 2, 0, 0.25);
  body.add(backAnchor);
  box(body, 0.42, 0.13, 0.14, metal, -0.26, 0.96, -0.57, 0.035);
  const weaponMount = new THREE.Group();
  stage.add(weaponMount);
  const backPosition = vec(), hoverPosition = vec(), cameraRight = vec();
  const backRotation = new THREE.Quaternion(), aimRotation = new THREE.Quaternion();
  const aimMatrix = new THREE.Matrix4(), muzzleAxis = vec(0, 0, 1);
  const aimVector = vec(), actualAim = vec(), labelPosition = vec(), weaponRotation = new THREE.Quaternion();
  let weapons = harnessColors.map((_, i) => {
    const raw = weapon(i), bounds = new THREE.Box3().setFromObject(raw);
    const size = bounds.getSize(vec()), centre = bounds.getCenter(vec());
    raw.position.sub(centre);
    const normalized = new THREE.Group(); normalized.add(raw);
    normalized.scale.setScalar(1 / Math.max(0.01, size.z));
    const w = new THREE.Group(); w.add(normalized);
    w.scale.setScalar(1.65); w.visible = false;
    weaponMount.add(w);
    return w;
  });
  const agentGround = ring(stage, 0.7, 0.014, teal, 0, 0.07, 5.3),
    agentHalo = glow(stage, 0x84dff2, 3.2, 0, 2.1, 5.3, 0.08);
  // Ground contact is also scroll-owned: the expanding ripples disappear once
  // the feet settle, and retrace the same shape when the visitor scrolls back.
  const landingRipples = [0, 1].map(i => ring(stage, 0.8, 0.018,
    basic(i ? 0xc5eee0 : 0x78d8cf, 0), 0, 0.085 + i * 0.006, 5.3));
  const landingDustPositions = new Float32Array(32 * 3);
  const landingDustGeometry = new THREE.BufferGeometry();
  landingDustGeometry.setAttribute("position", new THREE.BufferAttribute(landingDustPositions, 3));
  geoCache.set("landing-dust", landingDustGeometry);
  const landingDustMaterial = new THREE.PointsMaterial({ color: 0xbce9db,
    size: 0.065, transparent: true, opacity: 0, depthWrite: false });
  allMaterials.add(landingDustMaterial);
  const landingDust = new THREE.Points(landingDustGeometry, landingDustMaterial);
  landingDust.frustumCulled = false;
  stage.add(landingDust);
  const heroLight = new THREE.PointLight(0xe5f4ff, 7.5, 7, 2);
  stage.add(heroLight);
  const inventory = new THREE.Group();
  stage.add(inventory);
  const wheelLight = new THREE.PointLight(0xffffff, 18, 12, 1.5);
  stage.add(wheelLight);
  const slotRay = vec();
  const inventoryGuns = harnessColors.map((c, i) => {
    const mount = new THREE.Group();
    inventory.add(mount);
    // 3D beveled metallic weapon pedestal + glowing holo-rings
    const baseDisc = cylinder(mount, 0.3, 0.36, 0.07, hull, 0, -0.2, 0, 24);
    baseDisc.rotation.x = 0.32;
    const platform = ring(
      mount,
      0.34,
      0.022,
      weaponLights[i],
      0,
      -0.16,
      0.02,
      false,
    );
    platform.rotation.x = 0.32;
    const orbitRing = ring(
      mount,
      0.4,
      0.012,
      weaponLights[i],
      0,
      0.02,
      0,
      false,
    );
    orbitRing.rotation.set(0.85, 0.3, 0);
    const model = weapon(i);
    model.rotation.set(0.24, Math.PI * 0.68, -0.14);
    model.scale.setScalar(0.58);
    mount.add(model);
    return { mount, model, platform, orbitRing, baseDisc };
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
      weapons.forEach((w) => weaponMount.remove(w));
      weapons = library.weapons;
      weapons.forEach(toonify);
      weapons.forEach((w, i) => {
        w.scale.setScalar(1.65);
        w.rotation.set(0, 0, 0);
        w.visible = i === state.equippedHarness;
        weaponMount.add(w);
        const slot = inventoryGuns[i];
        slot.mount.remove(slot.model);
        const preview = w.clone(true);
        preview.visible = true;
        preview.scale.setScalar(1.02);
        preview.rotation.set(0.22, Math.PI * 0.68, -0.14);
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
    () => new THREE.CylinderGeometry(0.21, 0.018, 1, 20, 1, true),
  );
  const thrusters = jetMounts.map((mount, index) => {
    const nozzle = new THREE.Group();
    nozzle.position.set(0, 0, 0);
    mount.add(nozzle);
    cylinder(nozzle, 0.12, 0.095, 0.11, metal, 0, -0.015, 0, 16);
    const nozzleGlow = luminous(0xe3ffff, 12);
    ring(nozzle, 0.115, 0.025, nozzleGlow, 0, -0.079, 0);
    const plumeMaterial = new THREE.ShaderMaterial({
      uniforms: { phase: { value: 0 }, strength: { value: 1 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform float phase;uniform float strength;void main(){float axial=smoothstep(0.,.30,vUv.y);float pulse=.85+.15*sin(vUv.y*42.-phase*13.);vec3 color=mix(vec3(.01,.18,1.),vec3(.06,.72,1.),pow(vUv.y,2.));gl_FragColor=vec4(color*2.4,axial*pulse*.85*strength);}`,
    });
    allMaterials.add(plumeMaterial);
    const plume = mesh(jetGeometry, plumeMaterial, nozzle, 0, -0.58, 0);
    const core = cylinder(
      nozzle,
      0.085,
      0.014,
      0.62,
      luminous(0xe1ffff, 12, 0.98),
      0,
      -0.32,
      0,
      12,
    );
    const halo = glow(nozzle, 0x39cfff, 1.4, 0, -0.12, 0, 0.95);
    const thrustLight = new THREE.PointLight(0x77e9ff, 8, 2.8, 2);
    thrustLight.position.y = -0.16;
    nozzle.add(thrustLight);
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
      particles,
      nozzleGlow,
      thrustLight,
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
  // Human domain experts make the scale legible; the flying robot remains the one agent.
  const crowd = [];
  roomDefs.forEach((def, r) => {
    for (let k = 0; k < 2; k++) {
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
  const dust = new THREE.Points(dustGeo, dustMat);
  stage.add(dust);
  // Cartoon finish: ink outlines from depth, bloom on emissive light, vignette.
  const post = createPost(renderer, { bloom: 0.16, threshold: 0.9, vignette: 0.12 });
  function setTheme() {
    const background = pageBackground();
    const light = document.documentElement.dataset.theme === "light";
    scene.background.copy(background);
    scene.fog.color.copy(background);
    scene.fog.density = light ? 0.012 : 0.009;
    renderer.setClearColor(background);
    ground.material.color.copy(background);
    post.set({ bloom: light ? 0.08 : 0.16, vignette: light ? 0 : 0.12 });
    dustMat.opacity = light ? 0.12 : 0.32;
    wake();
  }
  const themeObserver = new MutationObserver(setTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  setTheme();
  function render() {
    post.render(scene, camera);
  }
  // Every shot and door is keyed to progress, so scrolling backward reconstructs the same episode.
  const shots = [
    {
      p: 0,
      camera: [0, 10, 25],
      look: [-2.7, 1.8, -4],
      hero: [0, 0.06, 5.3],
      heading: Math.PI,
      fov: 52,
    },
    {
      p: 0.15,
      camera: [-0.8, 8.6, 22],
      look: [-2.7, 2.1, -3],
      hero: [0, 0.06, 5.3],
      heading: Math.PI,
      fov: 53,
    },
    {
      p: 0.23,
      camera: [1.1, 4.2, 12.5],
      look: [0, 2.85, 4.6],
      hero: [0, 0.06, 5.3],
      heading: 1.2,
      fov: 56,
    },
    {
      p: 0.34,
      camera: [-0.9, 4.25, 12.4],
      look: [0, 2.85, 4.6],
      hero: [0, 0.06, 5.3],
      heading: 1.05,
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
      camera: [0, 11.5, 28],
      look: [-1.6, 2, -3],
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
    frameDt = dt;
    sparkScale.value = height * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
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
    // Align the loadout portrait with the shared page grid's 57% wheel centre.
    const wheelShift = smooth(0.15, 0.21, p) * (1 - smooth(0.35, 0.4, p));
    if (!mobile && wheelShift > 0.001) camera.setViewOffset(width, height, -width * 0.07 * wheelShift, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    agent.position.copy(heroPos);
    const inventoryAmount = smooth(0.14, 0.21, p) * (1 - smooth(0.35, 0.395, p));
    // During the Equip wheel phase, turn the character toward the viewer so its
    // 3D face, visor, chest core, shoulder pauldrons and model crest are in full view.
    agent.rotation.y = mix(shot.heading, 0.22 + (ambient ? Math.sin(time * 0.8) * 0.14 : 0), inventoryAmount);
    // The preceding chapter supplies arrival 0..1. The descent, touchdown and
    // takeoff are functions of scroll position, so none need a timer to finish.
    // Reduced motion opens with the robot already grounded; manual episode
    // seeking still shows the appropriate stationary flight pose.
    const arrival = reduced ? 1 : clamp(state.arrival, 0, 1);
    const takeoff = smooth(0, 0.12, p);
    const descent = 1 - smooth(0, 1, arrival);
    const travel = shot.moving ? Math.sin(Math.PI * shot.f) : 0;
    const descentHeight = 8.5 * descent * (1 - takeoff);
    const hover = descentHeight + takeoff * (1.10 + travel * 0.64 +
      (ambient ? Math.sin(time * 1.65) * 0.045 : 0));
    const impact = smooth(0.89, 0.95, arrival) * (1 - smooth(0.95, 1, arrival)) * (1 - takeoff);
    const airborne = smooth(0.035, 0.40, hover);
    const braking = smooth(0.25, 0.72, arrival) * (1 - smooth(0.90, 1, arrival));
    const enginePower = (1 - takeoff) * airborne * (0.45 + braking * 0.75) +
      takeoff * (1.05 + travel * 0.25);
    agent.position.y += hover;
    body.position.y = 0;
    body.scale.set(1 + impact * 0.018, 1 - impact * 0.045, 1 + impact * 0.018);
    body.rotation.x = takeoff * (0.04 + travel * 0.22) +
      (1 - takeoff) * Math.sin(arrival * Math.PI) * -0.08;
    body.rotation.z = takeoff * travel * Math.sin(p * 18) * 0.045;
    toyRobot.update(takeoff > 0.001 ? (ambient ? time : p * 4) : 0, 0);
    head.rotation.x = -body.rotation.x * 0.45;
    canvas.dataset.arrivalProgress = arrival.toFixed(4);
    canvas.dataset.agentAltitude = hover.toFixed(4);
    canvas.dataset.landingState = arrival < 0.999 && takeoff < 0.999
      ? "descending" : p < 0.001 ? "landed" : p < 0.12 ? "taking-off" : "hovering";
    const contact = smooth(0.86, 1, arrival);
    const dustOpacity = Math.sin(contact * Math.PI) * (1 - takeoff) * (reduced ? 0 : 1);
    landingRipples.forEach((ripple, index) => {
      ripple.position.set(heroPos.x, 0.085 + index * 0.006, heroPos.z);
      ripple.scale.setScalar(0.45 + contact * (index ? 3.5 : 2.6));
      ripple.material.opacity = dustOpacity * (index ? 0.27 : 0.5);
      ripple.visible = dustOpacity > 0.002;
    });
    landingDust.position.set(heroPos.x, 0.08, heroPos.z);
    landingDust.visible = dustOpacity > 0.002;
    landingDustMaterial.opacity = dustOpacity * 0.65;
    for (let i = 0; i < 32; i++) {
      const angle = i * 2.39996;
      const radius = 0.55 + contact * (1.25 + (i % 5) * 0.18);
      landingDustPositions[i * 3] = Math.cos(angle) * radius;
      landingDustPositions[i * 3 + 1] = Math.sin(contact * Math.PI) * (0.04 + (i % 4) * 0.04);
      landingDustPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    landingDustGeometry.attributes.position.needsUpdate = true;
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
    const activeRoom = p >= 0.76 ? 2 : p >= 0.57 ? 1 : 0;
    const deployment = smooth(0.355, 0.425, p) * (1 - smooth(0.925, 0.98, p));
    backAnchor.getWorldPosition(backPosition);
    backAnchor.getWorldQuaternion(backRotation);
    cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    cameraRight.y = 0; cameraRight.normalize();
    hoverPosition.copy(agent.position).addScaledVector(cameraRight, 2.05);
    hoverPosition.y += 1.65 + (ambient ? Math.sin(time * 1.7 + 0.7) * 0.07 : 0);
    weaponMount.position.copy(backPosition).lerp(hoverPosition, deployment);
    aimMatrix.lookAt(roomTargets[activeRoom], weaponMount.position, up);
    aimRotation.setFromRotationMatrix(aimMatrix);
    weaponMount.quaternion.copy(backRotation).slerp(aimRotation, deployment);
    weapons.forEach(w => w.scale.setScalar(mix(1.65, 2.05, deployment)));
    weaponMount.updateMatrixWorld(true);
    const selectedWeapon = weapons[state.equippedHarness];
    const selectedName = HARNESS_NAMES[state.equippedHarness] || "";
    const mode = deployment > 0.01 ? "hover" : "back";
    let aimDot = 0;
    if (selectedWeapon) {
      selectedWeapon.getWorldQuaternion(weaponRotation);
      actualAim.copy(muzzleAxis).applyQuaternion(weaponRotation).normalize();
      aimVector.copy(roomTargets[activeRoom]).sub(weaponMount.position).normalize();
      aimDot = actualAim.dot(aimVector);
    }
    canvas.dataset.weaponMode = selectedWeapon ? mode : "none";
    canvas.dataset.weaponHarness = selectedName;
    canvas.dataset.weaponTarget = selectedWeapon && deployment > 0.5 ? ARENA_DOMAINS[activeRoom].id : "";
    canvas.dataset.weaponAimDot = aimDot.toFixed(5);
    labelPosition.copy(weaponMount.position).add(vec(0, 0.82, 0)).project(camera);
    onWeaponProject?.({
      x: (labelPosition.x + 1) * width / 2,
      y: (1 - labelPosition.y) * height / 2,
      visible: !!selectedWeapon && deployment > 0.65 && labelPosition.z > -1 && labelPosition.z < 1 && Math.abs(labelPosition.x) < 0.94 && Math.abs(labelPosition.y) < 0.94,
      name: selectedName, mode, room: ARENA_DOMAINS[activeRoom].id, aimDot,
    });
    thrusters.forEach((jet, index) => {
      const running = enginePower > 0.015;
      jet.plume.visible = jet.core.visible = jet.halo.visible = jet.particles.visible = running;
      jet.nozzleGlow.emissiveIntensity = enginePower * 5.4;
      jet.thrustLight.intensity = (8 + travel * 5) * enginePower;
      jet.plume.scale.y = (0.78 + travel * 0.7) * (0.55 + 0.45 * Math.min(1, enginePower));
      jet.plume.position.y = -0.1 - jet.plume.scale.y * 0.5;
      jet.core.scale.y = 0.8 + travel * 0.7;
      jet.core.position.y = -0.1 - 0.31 * jet.core.scale.y;
      jet.plumeMaterial.uniforms.strength.value = enginePower;
      jet.halo.material.opacity = 0.95 * Math.min(1, enginePower);
      jet.plumeMaterial.uniforms.phase.value = p * 33 + (ambient ? time : 0);
      jet.halo.scale.setScalar(1.35 + travel * 0.35);
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
      jet.pool.material.opacity = (0.14 + travel * 0.07) * enginePower;
      jet.pool.scale.setScalar(1.25 + travel * 0.55);
    });
    applyCharacterModel(state.model || 0);
    inventory.visible = inventoryAmount > 0.01;
    wheelLight.visible = inventory.visible;
    wheelLight.intensity = 22 * inventoryAmount;
    wheelLight.position.copy(camera.position);
    // Place each of the 8 3D weapons at the exact unprojected screen ray of its wheel sector,
    // compensating for camera.setViewOffset(-0.07 * width * wheelShift)
    const wheelDiam = mobile
      ? Math.min(width * 0.82, Math.max(260, Math.min(330, height - 395)))
      : Math.min(width * 0.46, height * 0.64, 540);
    const wheelCx = width * (mobile ? 0.5 : 0.58);
    const wheelCy = height * (mobile ? 0.4 : 0.46);
    const slotRadiusPx = (198 / 600) * wheelDiam;
    const slotDist = 5.8;
    camera.updateMatrixWorld();
    inventoryGuns.forEach(({ mount, model, platform, orbitRing }, i) => {
      const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
      const sx = wheelCx + Math.cos(a) * slotRadiusPx;
      const sy = wheelCy + Math.sin(a) * slotRadiusPx - wheelDiam * 0.018;
      slotRay.set((sx / width) * 2 - 1, -(sy / height) * 2 + 1, 0.5).unproject(camera);
      slotRay.sub(camera.position).normalize();
      mount.position.copy(camera.position).addScaledVector(slotRay, slotDist);
      mount.quaternion.copy(camera.quaternion);
      const selected = i === state.harness || i === state.equippedHarness;
      const scalePop = inventoryAmount * (selected ? 1.15 : 0.9);
      mount.scale.setScalar(Math.max(0.001, scalePop));
      model.rotation.y =
        Math.PI * 0.68 + (ambient ? Math.sin(time * 1.1 + i * 0.8) * 0.32 : 0);
      model.rotation.x = 0.24 + (selected ? 0.08 : 0);
      const baseScale = canvas.dataset.weaponAssets === "kenney-cc0" ? 0.86 : 0.55;
      model.scale.setScalar(baseScale);
      platform.scale.setScalar(selected ? 1.14 : 0.88);
      if (orbitRing && ambient) orbitRing.rotation.z = time * (selected ? 1.6 : 0.6) + i;
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
      room.subtracks.update({
        time, language: state.language, reduced: !ambient,
        active: smooth(start, reveal, p) * (1 - smooth(end - 0.025, end + 0.015, p)),
      });
      room.doors[0].position.x = -1.48 - open * 1.72;
      room.doors[1].position.x = 1.48 + open * 1.72;
      room.doors.forEach((d) => {
        d.scale.x = 1 - open * 0.94;
      });
      room.chamberLight.intensity = active ? 40 : 17;
      // the portal: lit for the room in focus, and for all three at the entrance and at the end
      const overview = 1 - smooth(0.13, 0.17, p), finale = smooth(0.92, 0.96, p);
      const power = Math.max(active ? 1 : 0.25, overview * 0.95, finale);
      // pointed at: a surge; stepped through: a flood
      const want = state.portalFocus === ARENA_DOMAINS[i].id ? (state.portalCharge ? 2.4 : 0.7) : 0;
      room.portal.surge += (want - room.portal.surge) * Math.min(1, frameDt * (state.portalCharge ? 4 : 6));
      room.portal.uniforms.power.value = power;
      room.portal.uniforms.surge.value = room.portal.surge;
      room.portal.uniforms.time.value = ambient ? time : 0;
      room.group.updateMatrixWorld();
      // two anchors: the threshold (for the full link) and the foot of the doorway (for a compact one,
      // below the vortex so the portal itself stays in view)
      portalPoint.set(0, 0.95, 2.75); room.group.localToWorld(portalPoint).project(camera);
      const low = { x: (portalPoint.x + 1) * width / 2, y: (1 - portalPoint.y) * height / 2, ok: portalPoint.z > -1 && portalPoint.z < 1 && Math.abs(portalPoint.x) < 0.96 && Math.abs(portalPoint.y) < 0.96 };
      portalPoint.set(0, 1.25, 2.1); room.group.localToWorld(portalPoint).project(camera);
      portalList[i] = {
        id: ARENA_DOMAINS[i].id, x: low.x, y: low.y, visible: low.ok,
        mx: (portalPoint.x + 1) * width / 2, my: (1 - portalPoint.y) * height / 2,
        midVisible: portalPoint.z > -1 && portalPoint.z < 1 && Math.abs(portalPoint.x) < 0.96 && Math.abs(portalPoint.y) < 0.96,
        active, power,
      };
      portalPoint.set(0, 3.7, 1.2); room.group.localToWorld(portalPoint).project(camera); // the vortex's centre, where a warp begins
      Object.assign(portalList[i], { cx: (portalPoint.x + 1) * width / 2, cy: (1 - portalPoint.y) * height / 2, centreVisible: portalPoint.z > -1 && portalPoint.z < 1 && Math.abs(portalPoint.x) < 1 && Math.abs(portalPoint.y) < 1 });
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
    onPortalProject?.(portalList);
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
    const actionWindow = actionWindows[activeRoom],
      firing =
        state.equippedHarness !== null &&
        p > actionWindow[0] &&
        p < actionWindow[1];
    beam.visible = hit.visible = firing;
    packets.forEach((packet) => {
      packet.visible = firing;
    });
    if (firing) {
      selectedWeapon.localToWorld(muzzle.set(0, 0, 0.5));
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
    campus.update({ time, progress: p, paused: !ambient });
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
        onWeaponProject?.({ visible: false });
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
      if (Number.isFinite(next.arrival))
        state.arrival = clamp(next.arrival, 0, 1);
      if (Number.isFinite(next.model))
        state.model = clamp(Math.round(next.model), 0, 5);
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
      if (typeof next.portalFocus === "string") state.portalFocus = next.portalFocus;
      if (typeof next.portalCharge === "boolean") state.portalCharge = next.portalCharge;
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
      onWeaponProject?.({ visible: false });
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onReduced);
      geoCache.forEach((g) => g.dispose());
      allMaterials.forEach((m) => m.dispose());
      allTextures.forEach((t) => t.dispose());
      modelLibrary?.dispose();
      campus.dispose();
      rooms.forEach(room => room.subtracks.dispose());
      post.dispose();
      renderer.dispose();
    },
  };
}
