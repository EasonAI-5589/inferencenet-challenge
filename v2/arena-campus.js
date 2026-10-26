/* The Challenge occupies the same warm library as the homepage. Bookcases,
 * reading tables and quiet case transfers leave the agent's approach lanes open. */
import * as THREE from '../assets/vendor/three/three.module.js';
import { tile, bookStack, block, cyl, mat as kitMaterial, PALETTE } from './mc-kit.js';
import { glowSprite } from './mc-stage.js';
import { ARENA_DOMAINS } from './arena-data.js';

const WOOD = 0x7a5a42, SHELF = 0x8a6a4a, DARK_WOOD = 0x5a4434;
const BRASS = 0xc9a36e, LAMPLIGHT = 0xffd9a0;
const shade = (color, amount) => new THREE.Color(color)
  .lerp(new THREE.Color(amount > 0 ? 0xffffff : 0x1a1d26), Math.abs(amount)).getHex();

export function createCampusDetails({ rooms, localKit }) {
  const root = new THREE.Group();
  root.name = 'metacase-challenge-library';
  const geometries = new Set(), materials = new Set(), packets = [];
  let disposed = false;
  const kit = (object, parent, x = 0, y = 0, z = 0, scale = 1) => {
    const item = localKit(object);
    item.position.set(x, y, z); item.scale.multiplyScalar(scale); parent.add(item);
    return item;
  };
  const ownMaterial = options => {
    const material = new THREE.MeshStandardMaterial({ roughness: .78, metalness: 0, ...options });
    materials.add(material); return material;
  };
  const glow = (parent, x, y, z, size = 1.8, opacity = .22) => {
    const sprite = glowSprite(LAMPLIGHT, size, opacity);
    sprite.position.set(x, y, z); parent.add(sprite); materials.add(sprite.material);
    return sprite;
  };

  // These details use the same dimensions and finishes as metacase-library.js.
  function ladder(height = 4.4) {
    const group = new THREE.Group();
    for (const x of [-.3, .3]) {
      const rail = block(group, .08, height, .08, SHELF, x, 0, 0, .02);
      rail.rotation.x = -.18;
    }
    for (let y = .32; y < height - .12; y += .44)
      block(group, .6, .055, .07, SHELF, 0, y, -y * .18, .012).castShadow = false;
    for (const x of [-.3, .3]) {
      const wheel = cyl(group, .085, .085, .05, PALETTE.ink, x, .04, .32, 10);
      wheel.rotation.z = Math.PI / 2;
    }
    return group;
  }

  function lamp(parent, x, y, z, scale = 1) {
    const group = new THREE.Group();
    cyl(group, .15, .18, .055, BRASS, 0, 0, 0, 16);
    cyl(group, .03, .045, .52, PALETTE.ink, 0, .04, 0, 8);
    cyl(group, .11, .23, .18,
      kitMaterial(LAMPLIGHT, { emissive: LAMPLIGHT, intensity: .9 }), 0, .54, 0, 16);
    cyl(group, .12, .12, .025, BRASS, 0, .72, 0, 16);
    const placed = kit(group, parent, x, y, z, scale);
    glow(placed, 0, .6, 0, 1.8, .28);
    return placed;
  }

  function chair(parent, x, z, turn, color) {
    const group = new THREE.Group();
    block(group, .7, .12, .68, WOOD, 0, .49, 0, .04);
    block(group, .61, .08, .57, shade(color, -.15), 0, .61, .035, .05);
    for (const side of [-1, 1]) {
      block(group, .075, 1.2, .075, DARK_WOOD, side * .28, 0, -.25, .015);
      block(group, .075, .49, .075, DARK_WOOD, side * .28, 0, .25, .015);
    }
    block(group, .6, .26, .075, WOOD, 0, .9, -.25, .035);
    const placed = kit(group, parent, x, 0, z); placed.rotation.y = turn;
  }

  /* A continuous horseshoe of shelves, with the opening facing the reader.
   * Volumes are instanced so the full archive costs only two extra draw calls. */
  const volumes = [], bands = [], transform = new THREE.Object3D();
  for (let bayIndex = 0; bayIndex < 15; bayIndex++) {
    const angle = -1.65 + bayIndex * 3.3 / 14;
    const domainIndex = Math.min(2, Math.floor(bayIndex / 5));
    const color = ARENA_DOMAINS[domainIndex].color;
    const bay = new THREE.Group();
    bay.position.set(Math.sin(angle) * 19.5, 0, -Math.cos(angle) * 18.5);
    bay.rotation.y = -angle;
    bay.name = `${ARENA_DOMAINS[domainIndex].id}-archive-${bayIndex % 5}`;
    block(bay, 3.64, 6.35, .14, PALETTE.ink, 0, .12, -.45, .025);
    for (const side of [-1, 1]) block(bay, .15, 6.6, 1.0, WOOD, side * 1.83, 0, 0, .03);
    block(bay, 3.92, .2, 1.1, color, 0, 6.6, 0, .04);
    block(bay, 3.8, .14, 1.04, BRASS, 0, .02, 0, .02);
    for (let row = 0; row < 6; row++) {
      const y = .25 + row * 1.05;
      block(bay, 3.5, .065, .92, SHELF, 0, y, 0, .015).castShadow = false;
      let x = -1.63;
      for (let k = 0; k < 24; k++) {
        const width = [.12, .15, .1, .14][(k + row + bayIndex) % 4];
        const height = [.6, .72, .66, .54, .8][(k * 3 + row) % 5];
        if (x + width > 1.64) break;
        if ((k + row * 3 + bayIndex) % 13 !== 8) {
          volumes.push({ bay, x: x + width / 2, y: y + .065 + height / 2,
            width, height, color: shade(color, [-.25, 0, .3, -.1, .15][(k + row) % 5]) });
          if (k % 5 === 3) bands.push({ bay, x: x + width / 2,
            y: y + .065 + height * .75, width });
        }
        x += width + .015;
      }
    }
    // Brass label holders and a rail for the rolling ladders.
    block(bay, .56, .18, .035, BRASS, 0, 6.28, .5, .025);
    block(bay, .42, .085, .045, PALETTE.cream, 0, 6.33, .52, .008);
    block(bay, 3.8, .045, .045, BRASS, 0, 4.8, .62, .01);
    kit(bay, root, ...bay.position.toArray());
    bay.updateMatrixWorld(true);
    if (bayIndex % 4 === 1) {
      const rolling = kit(ladder(), bay, .85, .02, 1.04);
      rolling.name = 'rolling-library-ladder';
    }
    if (bayIndex % 3 === 1) lamp(bay, -1.25, 4.93, .6, 1.2);
  }
  const bookGeometry = new THREE.BoxGeometry(1, 1, 1);
  geometries.add(bookGeometry);
  const books = new THREE.InstancedMesh(bookGeometry, ownMaterial({ color: 0xffffff }), volumes.length);
  books.name = 'domain-coloured-library-volumes'; books.receiveShadow = true;
  volumes.forEach((book, i) => {
    transform.position.set(book.x, book.y, .1);
    transform.rotation.set(0, 0, 0); transform.scale.set(book.width, book.height, .55);
    transform.updateMatrix(); transform.matrix.premultiply(book.bay.matrixWorld);
    books.setMatrixAt(i, transform.matrix); books.setColorAt(i, new THREE.Color(book.color));
  });
  books.instanceMatrix.needsUpdate = true; books.instanceColor.needsUpdate = true; root.add(books);
  const spineBands = new THREE.InstancedMesh(bookGeometry, ownMaterial({ color: PALETTE.cream }), bands.length);
  spineBands.name = 'cream-book-spine-bands';
  bands.forEach((band, i) => {
    transform.position.set(band.x, band.y, .379);
    transform.rotation.set(0, 0, 0); transform.scale.set(band.width * 1.015, .027, .012);
    transform.updateMatrix(); transform.matrix.premultiply(band.bay.matrixWorld);
    spineBands.setMatrixAt(i, transform.matrix);
  });
  spineBands.instanceMatrix.needsUpdate = true; root.add(spineBands);

  // Three side reading tables hold all sixteen actual directory signatures.
  // They stay outside the room walls and the weapon/agent approach corridors.
  rooms.forEach((room, index) => {
    const domain = ARENA_DOMAINS[index], color = domain.color;
    const field = new THREE.Group();
    field.position.set(room.x, .03, room.z); field.rotation.y = room.turn; root.add(field);
    const side = index === 0 ? -1 : 1;
    const desk = new THREE.Group();
    desk.name = `${domain.id}-reading-table`;
    block(desk, 3.2, .13, 1.5, WOOD, 0, .85, 0, .05);
    block(desk, 3.0, .12, 1.25, DARK_WOOD, 0, .69, 0, .03);
    for (const x of [-1.36, 1.36]) for (const z of [-.55, .55])
      block(desk, .11, .85, .11, DARK_WOOD, x, 0, z, .02);
    block(desk, 1.95, .018, 1.03, shade(color, -.35), -.1, .985, 0, .02);
    domain.entries.forEach((entry, k) => {
      const paper = tile({ sig: k % 5, edge: color, size: .29, glow: .45 });
      paper.position.set(-.76 + (k % 3) * .64, 1.01, -.24 + Math.floor(k / 3) * .48);
      paper.rotation.y = k % 2 ? .06 : -.05; paper.name = entry.id; desk.add(paper);
    });
    const placed = kit(desk, field, side * 5.45, 0, index === 1 ? -.65 : .2);
    lamp(placed, -1.25, .98, -.45, .88);
    kit(bookStack(4, index + 1), placed, 1.2, .99, -.12, .76);
    chair(placed, -.6, 1.12, 0, color);
    chair(placed, .65, -1.12, Math.PI, color);

    // A little archive trolley beside the desk carries books ready to shelve.
    const trolley = new THREE.Group();
    for (const y of [.2, .77]) block(trolley, .88, .07, .62, SHELF, 0, y, 0, .025);
    for (const x of [-.38, .38]) for (const z of [-.25, .25]) {
      cyl(trolley, .025, .025, 1.12, BRASS, x, .09, z, 8);
      const wheel = cyl(trolley, .075, .075, .055, PALETTE.ink, x, .02, z, 10);
      wheel.rotation.z = Math.PI / 2;
    }
    const cart = kit(trolley, placed, side * 2.12, 0, .08);
    kit(bookStack(3, index + 2), cart, 0, .84, 0, 1.05);
    kit(bookStack(3, index), cart, .07, .27, 0, .8);

    // Transfer threads stay beside each room, below the domain entrance signs.
    const start = new THREE.Vector3(side * 5.45, 2.5, .1);
    const end = new THREE.Vector3(side * 4.3, 4.7, -3.25);
    const midpoint = start.clone().lerp(end, .5); midpoint.y += 1.35;
    const path = new THREE.QuadraticBezierCurve3(start, midpoint, end);
    const geometry = new THREE.TubeGeometry(path, 32, .014, 5, false); geometries.add(geometry);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .32, depthWrite: false }); materials.add(material);
    field.add(new THREE.Mesh(geometry, material));
    for (let k = 0; k < 2; k++) {
      const packet = kit(tile({ sig: (index + k) % 5, edge: color, size: .24, glow: .6 }), field);
      packets.push({ object: packet, path, offset: k * .5 + index * .17 });
    }
  });

  // Low, lamp-lit catalogue stands frame the launch rug without hiding the hero.
  for (const [side, index] of [[-1, 0], [1, 2]]) {
    const stand = new THREE.Group();
    cyl(stand, .74, .79, .12, WOOD, 0, .78, 0, 24);
    cyl(stand, .1, .16, .76, DARK_WOOD, 0, .02, 0, 12);
    cyl(stand, .42, .48, .09, DARK_WOOD, 0, 0, 0, 16);
    const table = kit(stand, root, side * 5.7, .02, 4.7);
    lamp(table, .2 * side, .9, -.28, 1.08);
    kit(bookStack(3, index + 1), table, -.2 * side, .91, .1, .84);
  }

  return {
    root,
    update({ time = 0, progress = 0, paused = false } = {}) {
      if (disposed) return;
      const clock = paused ? 0 : time;
      packets.forEach(({ object, path, offset }) => {
        const fraction = ((clock * .045 + progress * .6 + offset) % 1 + 1) % 1;
        object.position.copy(path.getPoint(fraction));
        object.rotation.set(Math.sin(fraction * Math.PI) * .08, -.25 + fraction * .45, 0);
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      books.dispose(); spineBands.dispose();
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      // Kit clones are owned by the main scene; glowSprite's texture is shared.
      root.removeFromParent();
    },
  };
}
