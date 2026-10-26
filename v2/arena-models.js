/**
 * Actual CC0 Kenney Blaster Kit 2.1 assets, loaded locally with Three.js r170.
 * Source: https://kenney.nl/assets/blaster-kit
 * Original license: assets/models/kenney-blasters/LICENSE.txt
 * Each returned group is centered at the origin with muzzle direction +Z and
 * longest (barrel) dimension 1. The renderer owns its back-mount transform.
 */
import { Box3, Group, Vector3 } from '../assets/vendor/three/three.module.js';
import { GLTFLoader } from '../assets/vendor/three/GLTFLoader.js';

export const ARENA_WEAPONS = Object.freeze([
  { harness: 'DeepSeek Harness', file: 'blaster-q.glb', silhouette: 'Split-prong blaster' },
  { harness: 'DeepAgents', file: 'blaster-f.glb', silhouette: 'Scoped precision blaster' },
  { harness: 'Claude Code', file: 'blaster-e.glb', silhouette: 'Long-range blaster' },
  { harness: 'Codex CLI', file: 'blaster-d.glb', silhouette: 'Stocked carbine' },
  { harness: 'OpenCode', file: 'blaster-p.glb', silhouette: 'Three-barrel blaster' },
  { harness: 'OpenHands SDK', file: 'blaster-l.glb', silhouette: 'Twin-barrel blaster' },
  { harness: 'Terminus-2', file: 'blaster-m.glb', silhouette: 'Heavy cylinder blaster' },
  { harness: 'mini-SWE-agent', file: 'blaster-b.glb', silhouette: 'Compact blaster' },
].map(entry => Object.freeze(entry)));

const assetRoot = new URL('../assets/models/kenney-blasters/', import.meta.url);

function disposeResources(roots) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set();
  for (const root of roots) root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) if (material) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
  }
  for (const texture of textures) {
    const image = texture.source?.data;
    if (image && typeof image.close === 'function') images.add(image);
    texture.dispose();
  }
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const image of images) image.close();
}

function normalizeWeapon(gltf, descriptor, index) {
  const model = gltf.scene;
  // Kenney's models face -Z. A half turn makes a positive-Z muzzle consistent
  // across the collection; attachments (scope and magazine) remain attached.
  model.rotation.y = Math.PI;
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const length = size.z;
  if (!Number.isFinite(length) || length <= 0) throw new Error(`Invalid weapon geometry: ${descriptor.file}`);
  model.position.sub(center);
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  // Keep normalization below the public root so callers can set root.scale to
  // their desired visible length without losing the asset's normalization.
  const normalized = new Group(); normalized.name = 'normalized-kenney-model';
  normalized.scale.setScalar(1 / length); normalized.add(model);
  const weapon = new Group();
  weapon.name = `harness-weapon-${index}`; weapon.add(normalized);
  weapon.userData = {
    harness: descriptor.harness,
    asset: descriptor.file,
    author: 'Kenney',
    license: 'CC0-1.0',
    source: 'https://kenney.nl/assets/blaster-kit',
    muzzleAxis: '+Z',
    normalizedLength: 1,
    originalDimensions: size.toArray(),
  };
  weapon.updateMatrixWorld(true);
  return weapon;
}

/**
 * Resolve eight actual glTF models in the same order as the harness wheel.
 * Model geometry, materials and the embedded references to the local colormap
 * are preserved. No runtime requests leave this website.
 *
 * The caller can use weapon.clone(true) for wheel previews; clones share GPU
 * resources. Remove all originals / clones before calling the returned dispose
 * once. If the scene is torn down while this promise is pending, dispose its
 * result immediately when it resolves. All-or-nothing loading keeps slots stable.
 */
export async function loadArenaWeapons() {
  const loader = new GLTFLoader();
  const results = await Promise.allSettled(ARENA_WEAPONS.map(async descriptor => {
    return loader.loadAsync(new URL(descriptor.file, assetRoot).href);
  }));
  const loaded = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failed = results.find(result => result.status === 'rejected');
  if (failed) {
    disposeResources(loaded.map(gltf => gltf.scene));
    throw new Error('The local Kenney weapon collection could not be loaded.', { cause: failed.reason });
  }
  let weapons;
  try {
    weapons = loaded.map((gltf, index) => normalizeWeapon(gltf, ARENA_WEAPONS[index], index));
  } catch (error) {
    disposeResources(loaded.map(gltf => gltf.scene));
    throw error;
  }
  let disposed = false;
  return {
    weapons,
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeResources(weapons);
    },
  };
}
