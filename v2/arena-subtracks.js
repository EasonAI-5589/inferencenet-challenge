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

  const nodes = domain.entries.map((entry, i) => {
    const pos = positions[i];
    const anchor = new THREE.Group(); anchor.position.copy(pos); root.add(anchor);
    anchor.name = `subtrack-${entry.id}`; anchor.userData.entry = entry;
    const bright = LIGHTS[palette][i % 6];

    const orbMaterial = trackMat(new THREE.MeshStandardMaterial({
      color: bright, emissive: bright, emissiveIntensity: .55, roughness: .18, metalness: .2,
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
  }

  return {
    root, redraw,
    update({ time = 0, active = 0, language: nextLanguage = language, reduced = false } = {}) {
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
        aura.scale.setScalar((.85 + amount * .35) * pulse);
        auraMaterial.opacity = .22 + amount * .42;
      });
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
