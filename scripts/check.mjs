// Static checks for the public website. Imported by build.mjs (which reuses
// `publicFiles`) and runnable on its own: `node scripts/check.mjs`.
import { readFile, access, readdir, lstat } from 'node:fs/promises';
import { basename, dirname, resolve, extname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The explicit public-file allowlist (plus the whole reviewed `assets/` tree).
// Private test pages (`_*.html`), DESIGN.md, README.md and scripts/ are never listed.
export const pages = ['index.html', 'challenge.html', 'replication.html', 'harness.html', 'evolution.html', 'leaderboard.html', 'teams.html', 'professional-tasks.html'];
const redirects = { 'data.html': 'challenge.html#replication-data', 'agent.html': 'evolution.html#improvement-directions' };
// The v2 design (/v2/) mirrors every content page and redirect. It shares assets/, the
// translation dictionaries and the root scripts, and adds its own design files.
export const v2Pages = pages.map(page => `v2/${page}`);
const v2Redirects = Object.fromEntries(Object.entries(redirects).map(([file, target]) => [`v2/${file}`, target]));
const v2Files = ['v2/v2.css', 'v2/home.css', 'v2/skin.css', 'v2/theme.js', 'v2/v2.js', 'v2/home.js', 'v2/backdrop.js', 'v2/scene.css', 'v2/scene.js', 'v2/arena.css', 'v2/arena.js', 'v2/arena-scene.js', 'v2/arena-motion.js', 'v2/arena-models.js', 'v2/metacase.css', 'v2/metacase.js', 'v2/metacase-world.js', 'v2/metacase-anatomy.js', 'v2/metacase-archive.js', 'v2/metacase-cards.js', 'v2/mc-stage.js', 'v2/mc-toon.js', 'v2/mc-kit.js'];
const allRedirects = { ...redirects, ...v2Redirects };
export const publicFiles = [
  ...pages,
  ...Object.keys(redirects),
  'styles.css', 'site.css', 'language.css', 'mountain.css', 'index.css', 'challenge.css', 'data.css', 'agent.css', 'evolution.css', 'harness.css', 'leaderboard.css', 'teams.css', 'professional-tasks.css',
  'theme.js', 'site.js', 'language.js', 'charts.js', 'mountain.js', 'leaderboard.js', 'leaderboard-data.js', 'leaderboard-board.js', 'leaderboard-dev100.js', 'leaderboard-dev100-data.js', 'evolution.js',
  ...v2Pages, ...Object.keys(v2Redirects), ...v2Files,
  '.nojekyll',
];
for (const file of publicFiles) {
  if (file.startsWith('_') || (file.includes('/') && !/^v2\/[^/_][^/]*$/.test(file)) || /\.md$/i.test(file)) throw new Error(`Not publishable: ${file}`);
}
const publicSet = new Set(publicFiles);
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.csv', '.txt', '.svg']);
const assetExtensions = new Set(['.svg', '.png', '.jpg', '.woff2', '.txt', '.csv', '.json', '.mp4']);
const reviewedVendorFiles = new Set(['assets/vendor/three/three.module.js', 'assets/vendor/three/GLTFLoader.js', 'assets/vendor/three/BufferGeometryUtils.js', 'assets/vendor/three/LICENSE']);
const reviewedWeaponAsset = file => /^assets\/models\/kenney-blasters\/blaster-[bdeflmpq]\.glb$/.test(file);

async function listAssets(directory, out = []) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if ((await lstat(path)).isSymbolicLink()) throw new Error('Asset symlinks are not allowed');
    if (item.isDirectory()) await listAssets(path, out);
    else if (!assetExtensions.has(extname(path)) && !reviewedVendorFiles.has(relative(root, path).replaceAll('\\', '/')) && !reviewedWeaponAsset(relative(root, path).replaceAll('\\', '/'))) throw new Error(`Unexpected public asset: ${item.name}`);
    else out.push(relative(root, path).replaceAll('\\', '/'));
  }
  return out;
}
const assetFiles = await listAssets(resolve(root, 'assets'));

const documents = new Map();
for (const file of [...pages, ...Object.keys(redirects), ...v2Pages, ...Object.keys(v2Redirects)]) {
  const html = await readFile(resolve(root, file), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate HTML IDs in ${file}`);
  if (!html.includes('<html lang="en">') || !html.includes('name="viewport"')) throw new Error(`Missing document accessibility metadata in ${file}`);
  if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error(`Expected exactly one <h1> in ${file}`);
  if (/\son[a-z]+="/i.test(html)) throw new Error(`Inline event handler in ${file}`);
  if (Object.hasOwn(allRedirects, file)) {
    const target = allRedirects[file];
    const refresh = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]).find(tag => /\bhttp-equiv="refresh"/i.test(tag));
    if (refresh?.match(/\bcontent="([^"]+)"/)?.[1] !== `0; url=${target}`) throw new Error(`Unexpected redirect target in ${file}`);
    const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]).find(tag => /\brel="canonical"/.test(tag));
    if (canonical?.match(/\bhref="([^"]+)"/)?.[1] !== target) throw new Error(`Missing redirect canonical in ${file}`);
    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
    if (![...body.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].some(match => match[1] === target)) throw new Error(`Missing redirect fallback link in ${file}`);
    if (/\b(?:src|href)="(?:\.\.\/)?language\.(?:js|css)(?:\?[^"]*)?"/.test(html)) throw new Error(`Redirect should not load language controls in ${file}`);
  } else {
    const up = file.startsWith('v2/') ? '../' : '';
    if (!new RegExp(`\\bsrc="${up.replace(/\./g, '\\.')}language\\.js(?:\\?v=[A-Za-z0-9_-]+)?"`).test(html) || !html.includes(`href="${up}language.css"`)) throw new Error(`Missing language control assets in ${file}`);
    await access(resolve(root, `assets/i18n/${file.replace(/^v2\//, '').replace('.html', '')}.zh.json`));
  }
  documents.set(file, { html, ids });
}

async function checkReference(ref, from) {
  if (!ref || ref === '#') throw new Error(`Empty link target in ${from}`);
  if (ref.startsWith('https://')) return;
  if (ref === 'mailto:yichen013@e.ntu.edu.sg') return;
  if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(ref)) throw new Error(`Unexpected public URL in ${from}: ${ref}`);
  const [target, anchor] = ref.split('#');
  const path = resolve(root, dirname(from), decodeURIComponent(target.split('?')[0] || basename(from)));
  const inside = relative(root, path).replaceAll('\\', '/');
  if (inside === '..' || inside.startsWith('../') || isAbsolute(inside)) throw new Error(`Asset outside website: ${ref}`);
  await access(path);
  if ((await lstat(path)).isSymbolicLink()) throw new Error(`Public symlink: ${ref}`);
  const published = inside;
  if (!publicSet.has(published) && !published.startsWith('assets/')) throw new Error(`Reference to unpublished file in ${from}: ${ref}`);
  if (anchor) {
    const document = documents.get(published);
    if (!document || !document.ids.includes(decodeURIComponent(anchor))) throw new Error(`Missing anchor ${ref} in ${from}`);
  }
}
let referenceCount = 0;
for (const [file, { html }] of documents) {
  for (const [, attribute, value] of html.matchAll(/\b(href|src|srcset)="([^"]*)"/g)) {
    const refs = attribute === 'srcset' ? value.split(',').map(candidate => candidate.trim().split(/\s+/)[0]) : [value];
    for (const ref of refs) { await checkReference(ref, file); referenceCount++; }
  }
}
for (const file of publicFiles.filter(name => name.endsWith('.css'))) {
  const css = await readFile(resolve(root, file), 'utf8');
  for (const [, ref] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    // data: URIs, and #fragments naming an SVG paint server in the page, are not files.
    if (ref.startsWith('data:') || ref.startsWith('#')) continue;
    await checkReference(ref, file);
    referenceCount++;
  }
}
for (const file of publicFiles.filter(name => name.endsWith('.js'))) {
  const js = await readFile(resolve(root, file), 'utf8');
  for (const match of js.matchAll(/\bfrom\s+["']([^"']+)["']|import\(\s*(?:new URL\()?\s*["']([^"']+)["']/g)) {
    const target = match[1] || match[2];
    if (target?.startsWith('.')) { await checkReference(target, file); referenceCount++; }
  }
}

// Boundary scan over every published text file, including assets/data/*.json and attribution notes.
const scanned = [...publicFiles, ...assetFiles].filter(file => textExtensions.has(extname(file)));
for (const file of scanned) {
  const source = await readFile(resolve(root, file), 'utf8');
  // Three.js r170 and its loaders retain upstream MIT licensing. Loader import
  // paths are rewritten for local use; upstream comments include development notes.
  if (reviewedVendorFiles.has(file)) continue;
  if (/\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/.test(source)) throw new Error(`Possible credential in ${file}`);
  if (/\/Users\/|127\.0\.0\.1|localhost|local\/runs|sources\.lock\.json/.test(source)) throw new Error(`Private workspace reference in ${file}`);
  if (/\/mnt\/|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[A-Z]:[\\/]/.test(source)) throw new Error(`Server path or address in ${file}`);
  if (/\bTODO\b|lorem ipsum/i.test(source)) throw new Error(`Placeholder text in ${file}`);
  const translatedAsset = file === 'language.js' || file === 'v2/arena.js' || file === 'v2/arena-scene.js' || /^assets\/i18n\/(index|challenge|replication|data|agent|harness|evolution|leaderboard|teams|professional-tasks)\.zh\.json$/.test(file);
  if (/[一-鿿]/.test(source) && !translatedAsset) throw new Error(`CJK text outside the reviewed translation layer in ${file}`);
  if (file.startsWith('assets/i18n/')) {
    const dictionary = JSON.parse(source);
    if (!translatedAsset || !dictionary || Array.isArray(dictionary) || Object.values(dictionary).some(value => typeof value !== 'string')) {
      throw new Error(`Invalid translation dictionary in ${file}`);
    }
  }
}
const anchorCount = [...documents.values()].reduce((sum, doc) => sum + doc.ids.length, 0);
console.log(`Checked ${pages.length} content pages and ${Object.keys(redirects).length} redirect (plus the same in v2/), ${anchorCount} anchors, ${referenceCount} references, ${scanned.length} text files (${assetFiles.length} assets), public asset types and private-path boundaries.`);
