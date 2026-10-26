/* Named case categories live inside the portal, as small luminous study nodes.
 * Text uses unlit saturated inks so room lighting cannot wash it out to white. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { ARENA_DOMAINS } from './arena-data.js';

const SHORT_EN = {
  replication: ['Econometric', 'replication'], monetary: ['Monetary', 'policy'],
  markets: ['Market', 'forecasting'], data: ['Data', 'engineering'],
  statistics: ['Official', 'statistics'], accounting: ['Accounting', '& close'],
  filings: ['Filings &', 'research'], payments: ['Payments &', 'transactions'],
  credit: ['Credit &', 'fraud'], numeric: ['Numerical', 'reasoning'],
  nlp: ['Financial', 'language'], law: ['Law &', 'regulation'],
  hr: ['People &', 'organizations'], business: ['Business', 'operations'],
  society: ['Society &', 'education'], psychology: ['Psychology &', 'cognition'],
};
// Different inks within each field keep every category distinguishable while
// retaining the teal / amber / violet vocabulary of the homepage.
const INKS = [
  ['#05545d', '#155a38', '#125481', '#095359', '#225b34', '#05545d'],
  ['#773a03', '#724603', '#853714', '#674709', '#802b16', '#734006'],
  ['#4b238c', '#642575', '#48328e', '#742655', '#29468d', '#4b238c'],
];
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
  const sphereGeometry = new THREE.SphereGeometry(.18, 24, 16);
  const cardGeometry = new THREE.PlaneGeometry(2.12, .72);
  geometries.add(sphereGeometry); geometries.add(cardGeometry);
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 96;
  const glowContext = glowCanvas.getContext('2d');
  const gradient = glowContext.createRadialGradient(48, 48, 2, 48, 48, 48);
  gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.2, '#ffffffd0'); gradient.addColorStop(.5, '#ffffff35'); gradient.addColorStop(1, '#ffffff00');
  glowContext.fillStyle = gradient; glowContext.fillRect(0, 0, 96, 96);
  const glowTexture = new THREE.CanvasTexture(glowCanvas); glowTexture.colorSpace = THREE.SRGBColorSpace; textures.add(glowTexture);
  const palette = Math.max(0, Math.min(2, index));
  let language = 'en', disposed = false;

  const nodes = domain.entries.map((entry, i) => {
    // Keep the nodes inside the door frame, below the prompt and above the robot.
    const lastSingle = domain.entries.length % 2 === 1 && i === domain.entries.length - 1;
    const x = lastSingle ? 0 : (i % 2 ? 1.4 : -1.4);
    // With five entries the singleton sits above the pairs, away from the
    // protagonist's head in the lower middle of the opening.
    const y = domain.entries.length === 5
      ? (lastSingle ? 5.95 : 5.08 - Math.floor(i / 2) * .84)
      : 5.92 - Math.floor(i / 2) * .84;
    const anchor = new THREE.Group(); anchor.position.set(x, y, 1.86); root.add(anchor);
    anchor.name = `subtrack-${entry.id}`; anchor.userData.entry = entry;
    const bright = LIGHTS[palette][i % 6], ink = INKS[palette][i % 6];
    const orbMaterial = new THREE.MeshStandardMaterial({ color: bright, emissive: bright, emissiveIntensity: .25, roughness: .23, metalness: .12, transparent: true, toneMapped: false, depthWrite: false });
    materials.add(orbMaterial);
    const orb = new THREE.Mesh(sphereGeometry, orbMaterial);
    orb.position.set(-1.08, 0, .15); orb.renderOrder = 24; anchor.add(orb);
    const auraMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: bright, transparent: true, opacity: .48, depthWrite: false, toneMapped: false });
    materials.add(auraMaterial);
    const aura = new THREE.Sprite(auraMaterial); aura.position.copy(orb.position); aura.position.z -= .02; aura.scale.set(.7, .7, 1); aura.renderOrder = 22; anchor.add(aura);
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 260;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4; textures.add(texture);
    // These anchored annotations remain readable when the thin antenna crosses them;
    // the luminous 3D nodes still obey the room's depth and occlusion.
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    materials.add(material);
    const label = new THREE.Mesh(cardGeometry, material); label.position.x = .38; label.renderOrder = 23; label.visible = false; anchor.add(label);
    label.name = `subtrack-label-${entry.id}`; label.userData.ink = ink;

    function write() {
      const chinese = language === 'zh', full = entry.name[chinese ? 1 : 0];
      const glyphs = Array.from(full);
      const lines = chinese
        ? (glyphs.length > 7 ? [glyphs.slice(0, Math.ceil(glyphs.length / 2)).join(''), glyphs.slice(Math.ceil(glyphs.length / 2)).join('')] : [full])
        : (SHORT_EN[entry.id.split('.')[1]] || [full]);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#fffdf7f5'; context.strokeStyle = ink; context.lineWidth = 3;
      context.beginPath(); context.roundRect(4, 6, 760, 248, 35); context.fill(); context.stroke();
      context.fillStyle = ink; context.textAlign = 'center'; context.textBaseline = 'alphabetic';
      const font = chinese ? '700 94px "Microsoft YaHei", "PingFang SC", sans-serif' : '700 94px Inter, Arial, sans-serif';
      context.font = font;
      const centerX = 384, lineGap = 100;
      const middle = 130;
      lines.forEach((line, j) => {
        const metrics = context.measureText(line);
        const baseline = middle + (j - (lines.length - 1) / 2) * lineGap + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
        context.fillText(line, centerX, baseline, 700);
      });
      label.userData.text = full; label.userData.lines = lines;
      texture.needsUpdate = true;
    }
    return { anchor, orb, aura, label, material, write, phase: i * .8 + palette };
  });

  function redraw(nextLanguage = language) {
    if (disposed) return;
    language = nextLanguage === 'zh' ? 'zh' : 'en';
    nodes.forEach(node => node.write());
  }
  redraw();
  if (document.fonts) {
    Promise.all([document.fonts.ready, document.fonts.load('700 94px Inter')]).then(() => redraw());
  }

  return {
    root, redraw,
    update({ time = 0, active = 0, language: nextLanguage = language, reduced = false } = {}) {
      if (disposed) return;
      if (nextLanguage !== language) redraw(nextLanguage);
      const amount = Math.max(0, Math.min(1, Number(active) || 0));
      const opacity = THREE.MathUtils.smoothstep(amount, .15, .72);
      nodes.forEach(({ orb, aura, label, material, phase }) => {
        const pulse = reduced ? 1 : 1 + Math.sin(time * 1.4 + phase) * .055;
        orb.scale.setScalar(pulse * (.92 + amount * .14));
        aura.scale.setScalar((.62 + amount * .13) * pulse);
        aura.material.opacity = .28 + amount * .24;
        label.visible = opacity > .005; material.opacity = opacity;
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
