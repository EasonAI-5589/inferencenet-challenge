// Initiative rebrand, Challenge page and Teams layout: `node --test scripts/test-initiative.mjs`
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(resolve(root, file), 'utf8');
const PAGES = ['index', 'challenge', 'replication', 'data', 'agent', 'harness', 'evolution', 'leaderboard', 'teams', 'professional-tasks'];
const CHALLENGE_PAGES = ['challenge', 'replication', 'professional-tasks'];
const TAGLINE = 'AI Agents for Business, Finance and Social Science';

const section = (html, id) => {
  const match = html.match(new RegExp(`<section[^>]*\\bid="${id}"[\\s\\S]*?</section>`));
  assert.ok(match, `section #${id}`);
  return match[0];
};
const cardNames = html => [...html.matchAll(/<h3><a [^>]*>([^<]+?)\s*<span aria-hidden="true">/g)].map(match => match[1]);
const attribute = (attributes, name) => attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;
const links = html => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attributes, text]) => ({
  href: attribute(attributes, 'href'),
  label: text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(),
  current: attribute(attributes, 'aria-current'),
}));

test('every page carries the initiative identity: Challenge in the navigation, INITIATIVE label, new tagline', async () => {
  for (const page of PAGES) {
    const html = await read(`${page}.html`);
    const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0];
    assert.ok(header, `${page}: site header`);
    assert.match(header, /<a\b(?=[^>]*\bclass="[^"]*\bwordmark\b)(?=[^>]*\bhref="index\.html")[^>]*>/, `${page}: brand returns Home`);
    assert.equal(html.split('<small>INITIATIVE</small>').length, 2, `${page}: wordmark label`);
    assert.doesNotMatch(html, /<small>CHALLENGE<\/small>/, page);
    assert.ok(html.includes(`<p>${TAGLINE}.</p>`), `${page}: footer tagline`);
    assert.doesNotMatch(html, /AI for econometric research/i, page);
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    if (page === 'index') assert.equal(title, `InferenceNet — ${TAGLINE}`);
    else assert.match(title, /^[^—]+ — InferenceNet$/, `${page}: title`);
  }
});

test('Teams: leadership is alphabetical by surname without lead roles; separate team and student leaders', async () => {
  const html = await read('teams.html');
  assert.deepEqual(cardNames(section(html, 'team')), ['Lin William Cong', 'Ye Luo', 'Liwen Zhang']);
  assert.doesNotMatch(section(html, 'team'), /Yang Liu|Dacheng Tao/);
  assert.match(section(html, 'team'), /Listed alphabetically by surname\./);
  assert.doesNotMatch(html, /Faculty\s+(?:Co-)?Lead\b|Faculty co-leads|Formal roles at NTU GIFTS/i);
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
  const sufe = partners.match(/<article class="research-group" id="sufe-aiflm-lab"[\s\S]*?<\/article>/)[0];
  assert.match(sufe, /<h3 id="sufe-lab-title">Liwen Zhang’s team<\/h3>/);
  assert.match(sufe, /Subtrack 02 · Professional tasks[\s\S]*finance demo and an HR demo/);
  assert.match(sufe, /href="challenge\.html#subtrack-professional"/);
});

test('Challenge page: initiative, two subtracks, timeline, two awards, take part', async () => {
  const html = await read('challenge.html');
  const ids = ['initiative', 'tracks', 'timeline', 'awards', 'take-part'];
  const positions = ids.map(id => html.indexOf(`<section class="section container${id === 'initiative' ? '' : ' ruled'}" id="${id}"`));
  assert.ok(positions.every((position, index) => position > 0 && (index === 0 || position > positions[index - 1])), `sections ${positions}`);
  assert.ok(html.includes('id="subtrack-econometric"') && html.includes('id="subtrack-professional"'));
  assert.equal((section(html, 'tracks').match(/<article class="track" /g) || []).length, 2);
  assert.match(section(html, 'tracks'), /Subtrack 01[\s\S]*Econometric replication[\s\S]*Subtrack 02[\s\S]*Business Analysis &amp; Deliverables/);
  assert.match(section(html, 'tracks'), /Finance demo[\s\S]*Month-end close review[\s\S]*HR demo[\s\S]*Training and procurement acceptance/);
  const awards = section(html, 'awards');
  assert.equal((awards.match(/<article class="card award">/g) || []).length, 2);
  assert.match(awards, /Specialized dataset award[\s\S]*Leaderboard prize/);
  assert.match(awards, /private, domain-specialized dataset/);
  assert.match(awards, /AI-agent tuning solution[\s\S]*prize money/);
  const timeline = section(html, 'timeline');
  assert.equal((timeline.match(/<li class="plan-stage/g) || []).length, 5, 'five planned stages');
  assert.equal((timeline.match(/class="status is-open">Now</g) || []).length, 1, 'only the first stage is under way');
  assert.match(timeline, /Open exploration[\s\S]*Registration and pilot[\s\S]*Challenge window[\s\S]*Independent evaluation[\s\S]*Results and awards/);
});

test('Challenge page: every challenge has its own recorded run, with a poster and a download fallback', async () => {
  const html = await read('challenge.html');
  const expected = {
    'subtrack-econometric': ['agent-replay-task0001'],
    'subtrack-professional': ['finance-story-demo', 'hr-agent-replay'],
  };
  const files = new Set();
  for (const [id, names] of Object.entries(expected)) {
    const track = html.match(new RegExp(`<article class="track" id="${id}"[\\s\\S]*?</article>`))[0];
    const videos = [...track.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/g)];
    assert.equal(videos.length, names.length, `${id}: one video per task`);
    videos.forEach(([, attributes, inner], index) => {
      const name = names[index];
      const mediaVersion = name === 'agent-replay-task0001' ? '\\?v=20261018-deepagents-flow-v3-2' : '\\?v=20261019-claude-sufe-v1';
      assert.match(attributes, /\bcontrols\b/, `${name}: native controls`);
      assert.doesNotMatch(attributes, /\bautoplay\b/, `${name}: no autoplay`);
      assert.match(attributes, /preload="metadata"/, `${name}: metadata only`);
      assert.match(attributes, new RegExp(`poster="assets/video/${name}(?:-poster)?\\.jpg${mediaVersion}"`), `${name}: poster`);
      assert.ok(attribute(attributes, 'aria-label'), `${name}: accessible name`);
      assert.match(inner, new RegExp(`<source src="assets/video/${name}\\.mp4${mediaVersion}" type="video/mp4">`), `${name}: source`);
      assert.match(inner, new RegExp(`<a href="assets/video/${name}\\.mp4${mediaVersion}">Download`), `${name}: download fallback`);
      files.add(name);
    });
  }
  assert.equal(files.size, 3, 'three distinct recordings');
  const finance = html.match(/<figure class="track-video"[^>]*aria-labelledby="demo-finance-title"[\s\S]*?<\/figure>/)[0];
  const hr = html.match(/<figure class="track-video"[^>]*aria-labelledby="demo-hr-title"[\s\S]*?<\/figure>/)[0];
  assert.match(finance, /FIN-T1-003/);
  assert.match(hr, /HR-T3-114/);
  const professional = html.match(/<article class="track" id="subtrack-professional"[\s\S]*?<\/article>/)[0];
  assert.doesNotMatch(professional, /\d+ (?:input files|scored criteria|tasks|task packages|scored runs)/, 'business demos describe the work without task-scale counts');
  // Media bytes are shared with Home and the business page, so the two copies cannot drift apart.
  const home = await read('index.html');
  assert.ok(home.includes('assets/video/agent-replay-task0001.mp4') && home.includes('assets/video/finance-story-demo.mp4'));
  assert.ok((await read('professional-tasks.html')).includes('assets/video/finance-story-demo.mp4'));
});

test('Challenge page presents tasks and participation without repeated status disclaimers', async () => {
  const html = await read('challenge.html');
  const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  assert.doesNotMatch(body, /so far|Not open yet|To be announced|planned as|plans two|The plan is|These demos introduce|They are not official/i);
  assert.match(body, /Challenge subtracks/);
  assert.match(body, /Dev100 \/ v10 development results/);
  assert.match(section(html, 'take-part'), /register your interest in the pilot/);
});

test('Challenge page promises nothing that is not confirmed: no dates, no amounts', async () => {
  const html = await read('challenge.html');
  const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  // Check what readers see; the 1920×1080 video dimensions live in attributes and are not a year.
  const visible = body.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(visible, /\b(?:19|20)\d\d\b/, 'a year or date');
  assert.doesNotMatch(visible, /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b/, 'a calendar date');
  assert.doesNotMatch(visible, /[$€£¥]|\b(?:USD|SGD|RMB|CNY|HKD)\b/, 'a prize amount');
  assert.match(section(html, 'awards'), /Award proposals/);
  assert.doesNotMatch(body, /registration (?:is )?open|Register now/i);
});

test('wording stays within what is confirmed: exploration is open, registration is not, nothing is "delivered"', async () => {
  const [home, challenge, teams] = await Promise.all(['index', 'challenge', 'teams'].map(page => read(`${page}.html`)));
  for (const [name, html] of [['index', home], ['challenge', challenge], ['teams', teams]]) {
    assert.doesNotMatch(html, /first open program/, name);
    assert.doesNotMatch(html, /\b(?:has|have) delivered\b/, name);
    assert.doesNotMatch(html, /initiated at/, name);
  }
  const econometric = challenge.match(/<article class="track" id="subtrack-econometric"[\s\S]*?<\/article>/)[0];
  assert.doesNotMatch(econometric, /Open now|Open for exploration/);
  assert.doesNotMatch(challenge, /Register now|registration (?:is )?open/i);
  assert.match(section(challenge, 'initiative'), /Aim 1[\s\S]*Aim 2[\s\S]*Aim 3/);
  assert.match(section(challenge, 'awards'), /Award proposals/);
  assert.match(section(challenge, 'timeline'), /Five stages/);
  assert.match(section(challenge, 'timeline'), /Register your interest in a pilot/);
});

test('Home, Challenge and Teams use the same subtracks and facts: Dev100 to be open-sourced, a Finance demo and an HR demo', async () => {
  const [home, challenge, teams] = await Promise.all(['index', 'challenge', 'teams'].map(page => read(`${page}.html`)));
  for (const [name, html] of [['index', home], ['challenge', challenge], ['teams', teams]]) {
    assert.doesNotMatch(html, /\bTrack [12]\b|Subtrack 2[AB]|AI task scenario|HR task scenario/, `${name}: old track wording`);
  }
  assert.match(home, /Challenge 1 · Dev100 · 100 tasks/);
  assert.match(home, /Challenge 2 · Finance &amp; HR demos/);
  for (const [name, html] of [['index', home], ['challenge', challenge]]) {
    assert.match(html, /Business Analysis &amp; Deliverables/, `${name}: business challenge title`);
    assert.match(html, /agent workflows/i, `${name}: both challenges use agents`);
    assert.match(html, /href="professional-tasks\.html"/, `${name}: business challenge entry`);
  }
  const econometric = challenge.match(/<article class="track" id="subtrack-econometric"[\s\S]*?<\/article>/)[0];
  assert.match(econometric, /Dev100: 100 econometric replication tasks/);
  assert.match(econometric, /Dev100 \/ v10 development results/);
  const professional = challenge.match(/<article class="track" id="subtrack-professional"[\s\S]*?<\/article>/)[0];
  assert.match(professional, /Prof\. Liwen Zhang’s team at Shanghai University of Finance and Economics/);
  assert.match(professional, /task-specific rubric that the agent never sees/);
  // The Hugging Face dataset is the research data source; the subtrack itself will use Dev100.
  assert.doesNotMatch(challenge, /benchmark is published on Hugging Face|Explore the public data/);
  assert.match(section(challenge, 'take-part'), /CamoAiLab hosts the source research dataset on Hugging Face/);
  assert.match(section(challenge, 'take-part'), /Research dataset source/);
  assert.match(section(challenge, 'take-part'), /subtrack will use the 100-task Dev100 set/);
});

test('every page has eight unique primary destinations and one current section', async () => {
  const destinations = [
    ['Home', 'index.html'], ['Challenge', 'challenge.html'], ['Data', 'data.html'], ['Agent', 'agent.html'],
    ['Harness', 'harness.html'], ['Self-evolving', 'evolution.html'], ['Leaderboard', 'leaderboard.html'], ['Teams', 'teams.html'],
  ];
  for (const page of PAGES) {
    const html = await read(`${page}.html`);
    const navigation = html.match(/<div\b[^>]*\bid="nav-links"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    assert.ok(navigation, `${page}: primary navigation`);
    const items = links(navigation);
    assert.deepEqual(items.map(item => [item.label, item.href]), destinations, `${page}: destinations in order, each exactly once`);
    const target = CHALLENGE_PAGES.includes(page) ? 'challenge' : page;
    const current = page === target ? 'page' : 'true';
    assert.deepEqual(items.filter(item => item.current !== null).map(item => [item.href, item.current]), [[`${target}.html`, current]], `${page}: current section`);
  }
});

test('Challenge and its two subtracks share secondary navigation without assigning shared research pages to a subtrack', async () => {
  const destinations = [
    ['Overview', 'challenge.html'], ['Subtrack 1 · Econometric replication', 'replication.html'],
    ['Subtrack 2 · Business Analysis & Deliverables', 'professional-tasks.html'],
  ];
  for (const page of PAGES) {
    const html = await read(`${page}.html`);
    const navigation = [...html.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)]
      .filter(([, attributes]) => (attribute(attributes, 'class') || '').split(/\s+/).includes('track-nav'));
    assert.equal(navigation.length, CHALLENGE_PAGES.includes(page) ? 1 : 0, `${page}: secondary navigation scope`);
    if (!navigation.length) continue;
    const [[markup, attributes, contents]] = navigation;
    assert.ok(attribute(attributes, 'aria-label'), `${page}: secondary navigation label`);
    const items = links(contents);
    assert.deepEqual(items.map(item => [item.label, item.href]), destinations, `${page}: secondary destinations`);
    assert.deepEqual(items.filter(item => item.current !== null).map(item => [item.href, item.current]), [[`${page}.html`, 'page']], `${page}: actual current page`);
    const position = html.indexOf(markup);
    assert.ok(position > html.indexOf('</header>') && position < html.indexOf('<main'), `${page}: navigation before page content`);
  }
});

test('Home keeps the Initiative hero and four challenge-focused sections with working navigation', async () => {
  const html = await read('index.html');
  assert.match(html, /<h1 id="hero-title">InferenceNet Challenge<\/h1>\s*<p class="hero-subtitle">AI Agents for Business, Finance and Social Science<\/p>/);
  assert.match(html, /<meta name="description" content="The Global InferenceNet Initiative aims to build shared infrastructure/);
  const kickers = [...html.matchAll(/<p class="kicker">(\d\d) \/ ([^<]+)<\/p>/g)].map(match => match[1]);
  assert.deepEqual(kickers, ['01', '02', '03', '04']);
  const subnav = [...html.match(/<nav class="subnav"[\s\S]*?<\/nav>/)[0].matchAll(/<a href="#([^"]+)"><span class="subnav-number">(\d\d)<\/span>/g)];
  assert.deepEqual(subnav.map(match => match[2]), ['01', '02', '03', '04']);
  assert.deepEqual(subnav.map(match => match[1]), ['overview', 'tasks', 'harness', 'participate']);
  for (const [, id] of subnav) assert.ok(html.includes(`id="${id}"`), `#${id}`);
  assert.match(section(html, 'overview'), /id="subtracks"/);
  assert.match(section(html, 'tasks'), /<video\b[\s\S]*agent-replay-task0001\.mp4/);
  const link = '<a class="text-link" href="challenge.html">Subtracks, timeline and awards <span aria-hidden="true">→</span></a>';
  assert.equal(html.split(link).length, 3, 'two links from Home to the Challenge page');
  assert.ok(html.includes('<a href="challenge.html"><small>Next</small><span>Challenge <span aria-hidden="true">→</span></span></a>'));
});

// ---- Chinese coverage: the same rules as language.js ----
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const normalize = text => Object.entries(ENTITIES).reduce((value, [entity, char]) => value.split(entity).join(char), text).replace(/\s+/g, ' ').trim();
function translatableStrings(html) {
  let h = html.replace(/<!--[\s\S]*?-->/g, '');
  h = h.replace(/<head>[\s\S]*?<\/head>/, head => [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)].map(match => `<title>${match[1]}</title>`).join(''));
  h = h.replace(/<(script|style|code|pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/g, '<i></i>');
  h = h.replace(/<a class="wordmark"[^>]*>[\s\S]*?<\/a>/g, '<i></i>');
  h = h.replace(/<span\b[^>]*\bdata-no-translate\b[^>]*>[\s\S]*?<\/span>/g, '<i></i>');
  const found = new Set();
  for (const [, text] of h.matchAll(/>([^<]+)</g)) found.add(normalize(text));
  for (const [, , value] of h.matchAll(/\b(aria-label|title|alt|placeholder)="([^"]*)"/g)) found.add(normalize(value));
  return [...found].filter(text => /[A-Za-z]/.test(text));
}

test('Home, Challenge, both subtrack entries and Teams have complete Chinese translations', async () => {
  const common = new Function(`return (${(await read('language.js')).match(/const common = (\{[\s\S]*?\n  \});/)[1]});`)();
  for (const page of ['index', 'challenge', 'replication', 'teams', 'professional-tasks']) {
    const dictionary = JSON.parse(await read(`assets/i18n/${page}.zh.json`));
    const missing = translatableStrings(await read(`${page}.html`)).filter(text => !(text in dictionary) && !(text in common));
    assert.deepEqual(missing, [], `${page}: untranslated strings`);
  }
  const language = await read('language.js');
  assert.match(language, /'challenge\.html'/);
  assert.match(language, /'replication\.html'/);
  assert.match(language, /'professional-tasks\.html'/);
  assert.equal(common.Challenge, '挑战赛');
});
