// Retained for checking the historical snapshot; public pages now show Dev100 only.
import { readFile } from 'node:fs/promises';
import { validateSnapshot } from '../leaderboard-data.js';

const source = new URL('../assets/data/paired-results.json', import.meta.url);
const data = validateSnapshot(JSON.parse(await readFile(source, 'utf8')));
console.log(`Validated the historical snapshot: ${data.groups} configurations, ${data.records} records. No public HTML was generated; publish Dev100 with scripts/build-dev100-board.mjs.`);
