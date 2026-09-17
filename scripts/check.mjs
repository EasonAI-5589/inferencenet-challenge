// Static checks for the public website. Imported by build.mjs (which reuses
// `publicFiles`) and runnable on its own: `node scripts/check.mjs`.
import { readFile, access, readdir, lstat } from 'node:fs/promises';
import { dirname, resolve, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The explicit public-file allowlist (plus the whole reviewed `assets/` tree).
// Private test pages (`_*.html`), DESIGN.md, README.md and scripts/ are never listed.
export const pages = ['index.html', 'data.html', 'agent.html', 'leaderboard.html', 'teams.html'];
export const publicFiles = [
  ...pages,
  'styles.css', 'site.css', 'language.css', 'mountain.css', 'index.css', 'data.css', 'agent.css', 'leaderboard.css', 'teams.css',
  'theme.js', 'site.js', 'language.js', 'charts.js', 'mountain.js', 'leaderboard.js', 'leaderboard-data.js',
  '.nojekyll',
];
for (const file of publicFiles) {
  if (file.startsWith('_') || file.includes('/') || /\.md$/i.test(file)) throw new Error(`Not publishable: ${file}`);
}
const publicSet = new Set(publicFiles);
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.csv', '.txt', '.svg']);
const assetExtensions = new Set(['.svg', '.png', '.jpg', '.woff2', '.txt', '.csv', '.json']);

async function listAssets(directory, out = []) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if ((await lstat(path)).isSymbolicLink()) throw new Error('Asset symlinks are not allowed');
    if (item.isDirectory()) await listAssets(path, out);
    else if (!assetExtensions.has(extname(path))) throw new Error(`Unexpected public asset: ${item.name}`);
    else out.push(relative(root, path));
  }
  return out;
}
const assetFiles = await listAssets(resolve(root, 'assets'));

const documents = new Map();
for (const file of pages) {
  const html = await readFile(resolve(root, file), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate HTML IDs in ${file}`);
  if (!html.includes('<html lang="en">') || !html.includes('name="viewport"')) throw new Error(`Missing document accessibility metadata in ${file}`);
  if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error(`Expected exactly one <h1> in ${file}`);
  if (/\son[a-z]+="/i.test(html)) throw new Error(`Inline event handler in ${file}`);
  if (!/\bsrc="language\.js(?:\?v=[A-Za-z0-9_-]+)?"/.test(html) || !html.includes('href="language.css"')) throw new Error(`Missing language control assets in ${file}`);
  await access(resolve(root, `assets/i18n/${file.replace('.html', '')}.zh.json`));
  documents.set(file, { html, ids });
}

async function checkReference(ref, from) {
  if (!ref || ref === '#') throw new Error(`Empty link target in ${from}`);
  if (ref.startsWith('https://')) return;
  if (ref === 'mailto:yichen013@e.ntu.edu.sg') return;
  if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(ref)) throw new Error(`Unexpected public URL in ${from}: ${ref}`);
  const [target, anchor] = ref.split('#');
  const path = resolve(root, dirname(from), decodeURIComponent(target.split('?')[0] || from));
  if (!path.startsWith(`${root}/`)) throw new Error(`Asset outside website: ${ref}`);
  await access(path);
  if ((await lstat(path)).isSymbolicLink()) throw new Error(`Public symlink: ${ref}`);
  const published = path.slice(root.length + 1);
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
    if (ref.startsWith('data:')) continue;
    await checkReference(ref, file);
    referenceCount++;
  }
}
for (const file of publicFiles.filter(name => name.endsWith('.js'))) {
  const js = await readFile(resolve(root, file), 'utf8');
  for (const match of js.matchAll(/\bfrom\s+'\.\/([^']+)'|import\(new URL\('([^']+)'/g)) {
    const target = (match[1] || match[2]).split('?')[0];
    if (target && !publicSet.has(target)) throw new Error(`Module import of unpublished file in ${file}: ${target}`);
  }
}

// Boundary scan over every published text file, including assets/data/*.json and attribution notes.
const scanned = [...publicFiles, ...assetFiles].filter(file => textExtensions.has(extname(file)));
for (const file of scanned) {
  const source = await readFile(resolve(root, file), 'utf8');
  if (/\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/.test(source)) throw new Error(`Possible credential in ${file}`);
  if (/\/Users\/|127\.0\.0\.1|localhost|local\/runs|sources\.lock\.json/.test(source)) throw new Error(`Private workspace reference in ${file}`);
  if (/\bTODO\b|lorem ipsum/i.test(source)) throw new Error(`Placeholder text in ${file}`);
  const translatedAsset = file === 'language.js' || /^assets\/i18n\/(index|data|agent|leaderboard|teams)\.zh\.json$/.test(file);
  if (/[一-鿿]/.test(source) && !translatedAsset) throw new Error(`CJK text outside the reviewed translation layer in ${file}`);
  if (file.startsWith('assets/i18n/')) {
    const dictionary = JSON.parse(source);
    if (!translatedAsset || !dictionary || Array.isArray(dictionary) || Object.values(dictionary).some(value => typeof value !== 'string')) {
      throw new Error(`Invalid translation dictionary in ${file}`);
    }
  }
}
const anchorCount = [...documents.values()].reduce((sum, doc) => sum + doc.ids.length, 0);
console.log(`Checked ${documents.size} pages, ${anchorCount} anchors, ${referenceCount} references, ${scanned.length} text files (${assetFiles.length} assets), public asset types and private-path boundaries.`);
