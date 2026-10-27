/* Case categories crown each portal doorway as a pure 3D constellation of
 * luminous emblems and orbital rings — no text signboards blocking the doorway. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { ARENA_DOMAINS } from './arena-data.js';

const LIGHTS = [
  [0x3de5d5, 0x6fe09c, 0x59c6ff, 0x69d9cf, 0xa2df87, 0x3de5d5],
  [0xffcc65, 0xf5dc70, 0xffa16a, 0xf9d97c, 0xffac95, 0xf3cd65],
  [0xb898ff, 0xe3a0ee, 0xaaacff, 0xf0a5cf, 0x9ebeff, 0xb898ff],
];

export function createRoomSubtracks({ domain, index = 0 } = {}) {
  domain ||= ARENA_DOMAINS[index];
  if (!domain?.entries?.length) throw new Error('A room needs case categories.');
  const root = new THREE.Group(); root.name = `room-subtracks-${domain.id}`;
  root.userData.directoryIds = domain.entries.map(entry => entry.id);
  const materials = new Set(), textures = new Set(), geometries = new Set();
  const trackGeom = g => { geometries.add(g); return g; };
  const trackMat = m => { materials.add(m); return m; };

  const coreGeometry = trackGeom(new THREE.OctahedronGeometry(.19, 0));
  const ringGeometry = trackGeom(new THREE.TorusGeometry(.31, .022, 10, 36));
  const pipGeometry = trackGeom(new THREE.SphereGeometry(.045, 12, 10));
  const barGeometry = trackGeom(new THREE.BoxGeometry(.06, 1, .06));

  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 96;
  const glowContext = glowCanvas.getContext('2d');
  const gradient = glowContext.createRadialGradient(48, 48, 2, 48, 48, 48);
  gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.22, '#ffffffd8'); gradient.addColorStop(.52, '#ffffff38'); gradient.addColorStop(1, '#ffffff00');
  glowContext.fillStyle = gradient; glowContext.fillRect(0, 0, 96, 96);
  const glowTexture = new THREE.CanvasTexture(glowCanvas); glowTexture.colorSpace = THREE.SRGBColorSpace; textures.add(glowTexture);

  const palette = Math.max(0, Math.min(2, index));
  const n = domain.entries.length;
  let language = 'en', disposed = false;

  // Arrange the category emblems along an arch crowning the upper portal opening,
  // keeping the central vortex and the chamber sculpture unobstructed.
  const positions = domain.entries.map((_, i) => {
    const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1 .. +1
    const angle = u * .92;
    const x = Math.sin(angle) * 2.22;
    const y = 4.25 + Math.cos(angle) * 1.68;
    return new THREE.Vector3(x, y, 1.88);
  });

  // Delicate constellation arc linking the category emblems around the portal arch.
  const curve = new THREE.CatmullRomCurve3(positions);
  const arcGeometry = trackGeom(new THREE.TubeGeometry(curve, 48, .016, 6, false));
  const arcColor = LIGHTS[palette][0];
  const arcMaterial = trackMat(new THREE.MeshBasicMaterial({ color: arcColor, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const arcMesh = new THREE.Mesh(arcGeometry, arcMaterial);
  arcMesh.renderOrder = 21;
  root.add(arcMesh);

  /* ---- 3D Cylindrical Tunnel Pipe & Wall Danmaku Stream ---- */
  const tunnelGroup = new THREE.Group();
  tunnelGroup.name = `track-tunnel-${domain.id}`;
  root.add(tunnelGroup);
  const TUNNEL_R = 3.55, TUNNEL_LEN = 9.6, TUNNEL_Y = 3.35, TUNNEL_Z0 = 1.65;
  const tunnelUniforms = {
    time: { value: 0 },
    power: { value: 0 },
    tint: { value: new THREE.Color(arcColor) },
  };
  const tunnelShellGeo = trackGeom(new THREE.CylinderGeometry(TUNNEL_R, TUNNEL_R, TUNNEL_LEN, 44, 1, true));
  const tunnelShellMat = trackMat(new THREE.ShaderMaterial({
    uniforms: tunnelUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float time;uniform float power;uniform vec3 tint;
      void main(){
        float ribs = pow(0.5 + 0.5 * cos(vUv.x * 6.28318 * 18.0), 12.0);
        float rings = pow(0.5 + 0.5 * cos((vUv.y * 14.0 + time * 1.3) * 6.28318), 10.0);
        float endFade = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
        float sideMask = 0.25 + 0.75 * pow(sin(vUv.x * 6.28318), 2.0);
        vec3 darkTube = vec3(0.025, 0.045, 0.09);
        // quiet outlines only: the ribs and rings glow at a third of their old strength
        vec3 gridCol = tint * (ribs * 0.55 + rings * 0.75) * 0.35;
        float alpha = (0.52 + (ribs * 0.22 + rings * 0.28) * 0.35) * endFade * sideMask * power;
        gl_FragColor = vec4(darkTube + gridCol, alpha);
      }`,
  }));
  const tunnelShell = new THREE.Mesh(tunnelShellGeo, tunnelShellMat);
  tunnelShell.rotation.x = Math.PI / 2;
  tunnelShell.position.set(0, TUNNEL_Y, TUNNEL_Z0 + TUNNEL_LEN / 2);
  tunnelShell.renderOrder = 18;
  tunnelGroup.add(tunnelShell);

  // 7 faint pipe rings + 10 longitudinal rails: a dark tunnel skeleton that never competes with the robot
  const RINGS = 7;
  const pipeRingGeo = trackGeom(new THREE.TorusGeometry(TUNNEL_R - .02, .03, 10, 52));
  const pipeRings = Array.from({ length: RINGS }, (_, k) => {
    const rm = trackMat(new THREE.MeshBasicMaterial({
      color: LIGHTS[palette][k % 6], transparent: true, opacity: 0, depthWrite: false,
    }));
    const mesh = new THREE.Mesh(pipeRingGeo, rm);
    mesh.position.set(0, TUNNEL_Y, TUNNEL_Z0 + (k / (RINGS - 1)) * TUNNEL_LEN);
    mesh.renderOrder = 19;
    tunnelGroup.add(mesh);
    return { mesh, mat: rm, k };
  });
  const railGeo = trackGeom(new THREE.BoxGeometry(.032, .032, TUNNEL_LEN));
  const railMat = trackMat(new THREE.MeshBasicMaterial({
    color: arcColor, transparent: true, opacity: 0, depthWrite: false,
  }));
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(Math.cos(a) * (TUNNEL_R - .03), TUNNEL_Y + Math.sin(a) * (TUNNEL_R - .03), TUNNEL_Z0 + TUNNEL_LEN / 2);
    rail.renderOrder = 19;
    tunnelGroup.add(rail);
  }

  // 8 flying 3D Danmaku banners shooting along the left and right walls of the tunnel pipe
  const danmakuList = domain.danmaku || [];
  const danmakuGeo = trackGeom(new THREE.PlaneGeometry(2.6, .44));
  const danmakuNodes = danmakuList.map((pair, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const lane = Math.floor(i / 2); // 0..3
    const y = 2.15 + (lane % 4) * .76;
    const x = side * (2.25 + (lane % 2) * .2);
    const canvas = document.createElement('canvas');
    canvas.width = 960; canvas.height = 164;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    textures.add(tex);
    const cHex = '#' + LIGHTS[palette][i % 6].toString(16).padStart(6, '0');
    const dMat = trackMat(new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide,
    }));
    const mesh = new THREE.Mesh(danmakuGeo, dMat);
    mesh.position.set(x, y, TUNNEL_Z0 + ((i * .13) % 1) * TUNNEL_LEN);
    mesh.rotation.y = side * -0.52;
    mesh.renderOrder = 26;
    tunnelGroup.add(mesh);

    function drawDanmaku() {
      const zh = language === 'zh';
      const text = pair[zh ? 1 : 0] || pair[0];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Sleek dark holographic pill with glowing leading bullet & neon border
      ctx.fillStyle = 'rgba(7, 12, 24, 0.86)';
      ctx.strokeStyle = cHex;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(8, 14, 944, 136, 68);
      ctx.fill();
      ctx.stroke();
      // Leading glowing orb + speed tail
      ctx.fillStyle = cHex;
      ctx.beginPath();
      ctx.arc(58, 82, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = zh ? '700 44px "PingFang SC", "Microsoft YaHei", sans-serif' : '700 42px Inter, Arial, sans-serif';
      ctx.fillStyle = '#f4f8ff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 94, 84, 830);
      tex.needsUpdate = true;
    }
    drawDanmaku();
    return { mesh, mat: dMat, drawDanmaku, side, lane, offset: i / danmakuList.length, speed: (.22 + (i % 3) * .05) * .7 };
  });

  const nodes = domain.entries.map((entry, i) => {
    const pos = positions[i];
    const anchor = new THREE.Group(); anchor.position.copy(pos); root.add(anchor);
    anchor.name = `subtrack-${entry.id}`; anchor.userData.entry = entry;
    const bright = LIGHTS[palette][i % 6];

    const orbMaterial = trackMat(new THREE.MeshStandardMaterial({
      color: bright, emissive: bright, emissiveIntensity: .38, roughness: .18, metalness: .2,
      transparent: true, opacity: 0, toneMapped: false, depthWrite: false,
    }));
    const ringMaterial = trackMat(new THREE.MeshStandardMaterial({
      color: 0xf7f5f0, emissive: bright, emissiveIntensity: .38, roughness: .28, metalness: .35,
      transparent: true, opacity: 0, toneMapped: false, depthWrite: false,
    }));

    const orb = new THREE.Mesh(coreGeometry, orbMaterial);
    orb.renderOrder = 24; anchor.add(orb);

    const orbit = new THREE.Mesh(ringGeometry, ringMaterial);
    orbit.rotation.set(.55 + (i % 2) * .3, i * .4, .25);
    orbit.renderOrder = 24; anchor.add(orbit);

    // Miniature 3D motif inside the orbit (bars, triad pips, or twin satellites)
    const motif = new THREE.Group(); anchor.add(motif);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + i * .5;
      const pip = new THREE.Mesh(pipGeometry, orbMaterial);
      pip.position.set(Math.cos(a) * .31, Math.sin(a) * .31, 0);
      pip.renderOrder = 25;
      orbit.add(pip);
    }
    if (i % 2 === 0) {
      [-1, 1].forEach(s => {
        const bar = new THREE.Mesh(barGeometry, ringMaterial);
        bar.scale.y = .14 + (k => k * .04)((i + s + 2) % 3);
        bar.position.set(s * .11, 0, .08);
        motif.add(bar);
      });
    }

    const auraMaterial = trackMat(new THREE.SpriteMaterial({
      map: glowTexture, color: bright, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
    }));
    const aura = new THREE.Sprite(auraMaterial);
    aura.position.set(0, 0, -.04); aura.scale.set(.95, .95, 1); aura.renderOrder = 22; anchor.add(aura);

    return { anchor, orb, orbit, motif, orbMaterial, ringMaterial, aura, auraMaterial, baseY: pos.y, phase: i * .85 + palette };
  });

  function redraw(nextLanguage = language) {
    if (disposed) return;
    language = nextLanguage === 'zh' ? 'zh' : 'en';
    danmakuNodes.forEach(d => d.drawDanmaku());
  }

  return {
    root, redraw,
    update({ time = 0, active = 0, tunnelFlow = 0, language: nextLanguage = language, reduced = false } = {}) {
      if (disposed) return;
      if (nextLanguage !== language) redraw(nextLanguage);
      const amount = Math.max(0, Math.min(1, Number(active) || 0));
      const vis = .22 + amount * .78;
      arcMaterial.opacity = .12 + amount * .38;
      nodes.forEach(({ anchor, orb, orbit, orbMaterial, ringMaterial, aura, auraMaterial, baseY, phase }, i) => {
        const pulse = reduced ? 1 : 1 + Math.sin(time * 1.6 + phase) * .07;
        const bob = reduced ? 0 : Math.sin(time * 1.2 + phase) * .045;
        anchor.position.y = baseY + bob;
        if (!reduced) {
          orb.rotation.y = time * .9 + i;
          orb.rotation.x = Math.sin(time * .7 + i) * .35;
          orbit.rotation.z = time * .55 * (i % 2 ? 1 : -1) + phase;
        }
        const s = (.82 + amount * .26) * pulse;
        orb.scale.setScalar(s);
        orbit.scale.setScalar(.86 + amount * .22);
        orbMaterial.opacity = vis;
        ringMaterial.opacity = .18 + amount * .72;
        aura.scale.setScalar((.8 + amount * .25) * pulse);
        auraMaterial.opacity = .12 + amount * .2;
      });
      // Update 3D cylindrical tunnel pipe & flying Danmaku stream
      const tPower = Math.max(0, Math.min(1, amount));
      tunnelGroup.visible = tPower > .01;
      if (tunnelGroup.visible) {
        const clock = reduced ? tunnelFlow * 4 : time + tunnelFlow * 3.2;
        tunnelUniforms.time.value = clock;
        tunnelUniforms.power.value = tPower * .92;
        railMat.opacity = tPower * .14;
        pipeRings.forEach(({ mesh, mat, k }) => {
          const wave = .5 + .5 * Math.sin(clock * 1.6 - k * .65);
          mat.opacity = tPower * (.05 + wave * .1); // never above .15
          const sc = 1 + wave * .035;
          mesh.scale.set(sc, sc, 1);
        });
        danmakuNodes.forEach(({ mesh, mat, offset, speed, side }, i) => {
          // Stream from the portal mouth (+1.85) toward the approaching viewer (+8.45)
          const u = ((clock * speed + offset) % 1 + 1) % 1;
          mesh.position.z = TUNNEL_Z0 + u * TUNNEL_LEN;
          const env = Math.sin(u * Math.PI);
          mat.opacity = tPower * Math.min(1, env * 1.45);
          mesh.visible = mat.opacity > .02;
          const s = .78 + u * .34;
          mesh.scale.setScalar(s);
        });
      }
      root.userData.active = amount;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose()); geometries.forEach(geometry => geometry.dispose());
      root.removeFromParent();
    },
  };
}
