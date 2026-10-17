// Initiative rebrand, Challenge page and Teams layout: `node --test scripts/test-initiative.mjs`
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(resolve(root, file), 'utf8');
const PAGES = ['index', 'challenge', 'data', 'agent', 'harness', 'evolution', 'leaderboard', 'teams'];
const TAGLINE = 'AI for Business, Social Science and Research';

const section = (html, id) => {
  const match = html.match(new RegExp(`<section[^>]*\\bid="${id}"[\\s\\S]*?</section>`));
  assert.ok(match, `section #${id}`);
  return match[0];
};
const cardNames = html => [...html.matchAll(/<h3><a [^>]*>([^<]+?)\s*<span aria-hidden="true">/g)].map(match => match[1]);

test('every page carries the initiative identity: Challenge in the navigation, INITIATIVE label, new tagline', async () => {
  for (const page of PAGES) {
    const html = await read(`${page}.html`);
    assert.match(html, /<a href="index\.html"(?: aria-current="page")?>Home<\/a>\s*<a href="challenge\.html"(?: aria-current="page")?>Challenge<\/a>/, `${page}: nav`);
    assert.equal(html.split('<small>INITIATIVE</small>').length, 2, `${page}: wordmark label`);
    assert.doesNotMatch(html, /<small>CHALLENGE<\/small>/, page);
    assert.ok(html.includes(`<p>${TAGLINE}.</p>`), `${page}: footer tagline`);
    assert.doesNotMatch(html, /AI for econometric research/i, page);
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    if (page === 'index') assert.equal(title, `InferenceNet — ${TAGLINE}`);
    else assert.match(title, /^[^—]+ — InferenceNet$/, `${page}: title`);
  }
});

test('Teams: Cong, Luo and Zhang lead; Liu and Tao move to the team section; student leaders are Guo and Cai', async () => {
  const html = await read('teams.html');
  assert.deepEqual(cardNames(section(html, 'team')), ['Lin William Cong', 'Ye Luo', 'Liwen Zhang']);
  assert.doesNotMatch(section(html, 'team'), /Yang Liu|Dacheng Tao/);
  assert.deepEqual(cardNames(section(html, 'team-members')), ['Yang Liu', 'Dacheng Tao']);
  const students = section(html, 'student-leaders');
  assert.deepEqual(cardNames(students), ['Yichen Guo', 'Yujie Cai']);
  assert.match(students, /class="student-also"[^>]*>[\s\S]*Tianyang Han/);
  const order = ['team', 'student-leaders', 'team-members', 'institutions', 'partners', 'contact'].map(id => html.indexOf(`id="${id}"`));
  assert.ok(order.every((position, index) => position > 0 && (index === 0 || position > order[index - 1])), `section order ${order}`);
  // Anchors from earlier links (site.js redirects old Home anchors here) must keep working.
  for (const id of ['team', 'labs', 'ntu-gifts', 'hku-ai-agents-lab', 'sufe-aiflm-lab', 'institutions', 'student-leaders', 'yujie-cai', 'contact']) {
    assert.ok(html.includes(`id="${id}"`), `#${id}`);
  }
});

test('Teams: GIFTS is the research institution; HKU and SUFE are collaborating partners', async () => {
  const html = await read('teams.html');
  const institutions = section(html, 'institutions');
  assert.match(institutions, /Global Institute of Finance, Technology, and Society/);
  assert.match(institutions, /is hosted by the Global Institute of Finance, Technology, and Society/);
  assert.doesNotMatch(institutions, /initiated/);
  assert.match(institutions, /<h3>Anchoring schools<\/h3>[\s\S]*<h4>College of Computing and Data Science<\/h4>/);
  for (const name of ['Global InferenceNet Initiative', 'Economic World Models Initiative', 'Autonomous Innovation &amp; Research (AIR) Initiative',
    'Intelligent Economy Initiative', 'Centre of AI for Social Science (AI4S2)', 'Investment Intelligence and Innovation Lab', 'Digital Economy and Financial Technology Lab']) {
    assert.ok(institutions.includes(name), name);
  }
  assert.doesNotMatch(institutions, /hku-business-horizontal/);
  const partners = section(html, 'partners');
  assert.equal((partners.match(/<span class="pill">Collaborating partner<\/span>/g) || []).length, 2);
  assert.match(partners, /id="hku-ai-agents-lab"[\s\S]*Ye Luo/);
  assert.match(partners, /id="sufe-aiflm-lab"[\s\S]*Liwen Zhang/);
});

test('Challenge page: initiative, two tracks with two sub-tracks, timeline, two awards, take part', async () => {
  const html = await read('challenge.html');
  const ids = ['initiative', 'tracks', 'timeline', 'awards', 'take-part'];
  const positions = ids.map(id => html.indexOf(`<section class="section container${id === 'initiative' ? '' : ' ruled'}" id="${id}"`));
  assert.ok(positions.every((position, index) => position > 0 && (index === 0 || position > positions[index - 1])), `sections ${positions}`);
  assert.ok(html.includes('id="track-1"') && html.includes('id="track-2"'));
  assert.equal((section(html, 'tracks').match(/<li class="subtrack">/g) || []).length, 2);
  assert.match(section(html, 'tracks'), /AI task scenario[\s\S]*HR task scenario/);
  const awards = section(html, 'awards');
  assert.equal((awards.match(/<article class="card award">/g) || []).length, 2);
  assert.match(awards, /Specialized dataset award[\s\S]*Leaderboard prize/);
  assert.match(awards, /private, domain-specialized dataset/);
  assert.match(awards, /AI-agent tuning solution[\s\S]*prize money/);
  assert.match(html, /<li><span class="timeline-when">Now<\/span>/);
  assert.equal((section(html, 'timeline').match(/class="status is-tbc"/g) || []).length, 4);
});

test('Challenge page promises nothing that is not confirmed: no dates, no amounts', async () => {
  const html = await read('challenge.html');
  const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  assert.doesNotMatch(body, /\b(?:19|20)\d\d\b/, 'a year or date');
  assert.doesNotMatch(body, /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b/, 'a calendar date');
  assert.doesNotMatch(body, /[$€£¥]|\b(?:USD|SGD|RMB|CNY|HKD)\b/, 'a prize amount');
  assert.match(body, /No amount, date or eligibility rule is final until it is announced here/);
  assert.match(body, /have not been set\. They will be posted here once they are confirmed/);
  assert.match(body, /Track 2 will be set out here once they are confirmed/);
});

test('wording stays within what is confirmed: exploration is open, registration is not, nothing is "delivered"', async () => {
  const [home, challenge, teams] = await Promise.all(['index', 'challenge', 'teams'].map(page => read(`${page}.html`)));
  for (const [name, html] of [['index', home], ['challenge', challenge], ['teams', teams]]) {
    assert.doesNotMatch(html, /first open program/, name);
    assert.doesNotMatch(html, /\b(?:has|have) delivered\b/, name);
    assert.doesNotMatch(html, /initiated at/, name);
  }
  const track1 = challenge.match(/<article class="track" id="track-1"[\s\S]*?<\/article>/)[0];
  assert.match(track1, /Open for exploration/);
  assert.doesNotMatch(track1, /Open now/);
  assert.match(home, /Track 1 · Open for exploration/);
  assert.match(challenge, /Registration and submission are not open yet/);
  assert.match(section(challenge, 'initiative'), /Aim 1[\s\S]*Aim 2[\s\S]*Aim 3/);
  assert.match(section(challenge, 'awards'), /planned as a prize/);
  assert.match(section(challenge, 'timeline'), /The stages below are planned; no date has been set/);
  assert.match(section(challenge, 'timeline'), /Tell us if you are interested in the pilot/);
});

test('the navigation with eight links stays on one row between 861 and 1180 px', async () => {
  assert.match(await read('language.css'), /\(min-width:861px\) and \(max-width:1180px\)\{[^@]*?\.nav-links a\{font-size:13px;white-space:nowrap\}/);
});

test('Home leads with the initiative and links to the Challenge; sections are numbered 01 to 06', async () => {
  const html = await read('index.html');
  assert.match(html, /<h1 id="hero-title">InferenceNet<\/h1>\s*<p class="hero-subtitle">AI for Business, Social Science and Research<\/p>/);
  assert.ok(html.includes('<a class="button primary" href="challenge.html">Explore the Challenge'));
  const kickers = [...html.matchAll(/<p class="kicker">(\d\d) \/ ([^<]+)<\/p>/g)].map(match => match[1]);
  assert.deepEqual(kickers, ['01', '02', '03', '04', '05', '06']);
  const subnav = [...html.match(/<nav class="subnav"[\s\S]*?<\/nav>/)[0].matchAll(/<a href="#([^"]+)"><span class="subnav-number">(\d\d)<\/span>/g)];
  assert.deepEqual(subnav.map(match => match[2]), ['01', '02', '03', '04', '05', '06']);
  for (const [, id] of subnav) assert.ok(html.includes(`id="${id}"`), `#${id}`);
  assert.ok(html.includes('href="challenge.html#track-1"') && html.includes('href="challenge.html#track-2"'));
});

// ---- Chinese coverage: the same rules as language.js ----
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const normalize = text => Object.entries(ENTITIES).reduce((value, [entity, char]) => value.split(entity).join(char), text).replace(/\s+/g, ' ').trim();
function translatableStrings(html) {
  let h = html.replace(/<!--[\s\S]*?-->/g, '');
  h = h.replace(/<head>[\s\S]*?<\/head>/, head => [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)].map(match => `<title>${match[1]}</title>`).join(''));
  h = h.replace(/<(script|style|code|pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/g, '<i></i>');
  h = h.replace(/<a class="wordmark"[^>]*>[\s\S]*?<\/a>/g, '<i></i>');
  h = h.replace(/<span data-no-translate[^>]*>[\s\S]*?<\/span>/g, '<i></i>');
  const found = new Set();
  for (const [, text] of h.matchAll(/>([^<]+)</g)) found.add(normalize(text));
  for (const [, , value] of h.matchAll(/\b(aria-label|title|alt|placeholder)="([^"]*)"/g)) found.add(normalize(value));
  return [...found].filter(text => /[A-Za-z]/.test(text));
}

test('index, challenge and teams have a Chinese translation for every string', async () => {
  const common = new Function(`return (${(await read('language.js')).match(/const common = (\{[\s\S]*?\n  \});/)[1]});`)();
  for (const page of ['index', 'challenge', 'teams']) {
    const dictionary = JSON.parse(await read(`assets/i18n/${page}.zh.json`));
    const missing = translatableStrings(await read(`${page}.html`)).filter(text => !(text in dictionary) && !(text in common));
    assert.deepEqual(missing, [], `${page}: untranslated strings`);
  }
  const language = await read('language.js');
  assert.match(language, /'challenge\.html'/);
  assert.equal(common.Challenge, '挑战赛');
});
