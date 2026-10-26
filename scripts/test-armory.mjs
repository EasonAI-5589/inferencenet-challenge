// Acceptance for v2/armory.html: equip by click, keyboard and drag; measured numbers only for
// measured pairs; URL restore; Chinese; reduced motion; no overflow at 1440 and 390 px.
// Serves nothing itself: point ARMORY_URL at a static server of the repository root.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.ARMORY_URL || 'http://127.0.0.1:4198/v2/armory.html';
const shots = process.env.SHOTS_DIR || '';
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: process.env.BROWSER_CHANNEL || 'chrome' }), headless: true });

async function open(options = {}, query = '') {
  const page = await browser.newPage(options), errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.url().startsWith(new URL(url).origin) && response.status() >= 400) failed.push(response.url()); });
  await page.route('https://**/*', route => route.abort());
  await page.addInitScript(() => { try { localStorage.removeItem('metacase-armory-v1'); } catch {} });
  await page.goto(url + query);
  await page.waitForFunction(() => document.querySelector('main.armory')?.dataset.ready === 'true');
  await page.evaluate(() => document.fonts.ready);
  return { page, clean() { assert.deepEqual(errors.filter(e => !/net::ERR_FAILED|ERR_BLOCKED|Failed to load resource/.test(e)), []); assert.deepEqual(failed, []); } };
}
const text = (page, selector) => page.locator(selector).first().innerText();
const noOverflow = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow');

try {
  // 1 · Desktop: click to equip, measured pair, unmeasured pair, gear, deploy, URL state.
  {
    const { page, clean } = await open({ viewport: { width: 1440, height: 1000 } });
    assert.equal(await page.locator('#inv-panel .ar-item').count(), 14, 'fourteen models');
    assert.match(await text(page, '[data-ar-measured]'), /Equip a model/);
    await page.locator('.ar-item', { hasText: 'GPT-5.6 Sol' }).click();
    assert.equal(await text(page, '.ar-slot-primary [data-slot-name]'), 'GPT-5.6 Sol');
    // Model only: Selected_1000 baseline arm is shown, never Dev100.
    assert.match(await text(page, '[data-ar-measured]'), /Selected_1000/);
    assert.doesNotMatch(await text(page, '[data-ar-measured]'), /Dev100 v10/);
    await page.getByRole('tab', { name: 'Harnesses' }).click();
    assert.equal(await page.locator('#inv-panel .ar-item').count(), 10, 'ten harnesses');
    await page.locator('.ar-item', { hasText: 'DeepAgents' }).click();
    const measured = await text(page, '[data-ar-measured]');
    assert.match(measured, /Dev100 v10/);
    assert.match(measured, /65\.0%/, 'GPT-5.6 Sol x DeepAgents Dev100 v10 full replication');
    assert.match(measured, /51\.8%/, 'GPT-5.6 Sol + DeepAgents Selected_1000 local-paper-v1');
    // A harness without a run shows no number at all.
    await page.locator('.ar-item', { hasText: 'Codex CLI' }).click();
    assert.match(await text(page, '[data-ar-measured]'), /Not yet measured/i);
    assert.doesNotMatch(await text(page, '[data-ar-measured]'), /%/);
    await page.getByRole('tab', { name: 'Gear' }).click();
    for (const name of ['Python sandbox', 'Stata / R runtime', 'Verifier gate']) await page.locator('.ar-item', { hasText: name }).click();
    assert.equal(await page.locator('.ar-slot-gear.is-filled').count(), 3);
    assert.match(await text(page, '[data-ar-callsign]'), /GPT-5\.6 Sol × Codex CLI \+3/);
    // Gear never changes a number.
    assert.match(await text(page, '[data-ar-measured]'), /Not yet measured/i);
    // Remove from a slot.
    await page.locator('.ar-slot[data-slot="gear-1"] .ar-slot-clear').click();
    assert.equal(await page.locator('.ar-slot-gear.is-filled').count(), 2);
    // Deploy.
    await page.locator('[data-deploy="econ"]').click();
    assert.match(await text(page, '[data-ar-deploy]'), /Deployed to\s+Economics/);
    assert.equal(await page.locator('.ar-track.is-chosen').getAttribute('data-track'), 'econ');
    assert.equal(await page.locator('.ar-track').count(), 3);
    const build = new URL(page.url()).searchParams.get('build');
    assert.equal(build, 'gpt56-sol~codex~python,,verifier,~econ');
    await noOverflow(page);
    if (shots) {
      await page.locator('#loadout').screenshot({ path: `${shots}/armory-loadout-1440.png` });
      await page.locator('#deploy').screenshot({ path: `${shots}/armory-deploy-1440.png` });
      await page.screenshot({ path: `${shots}/armory-hero-1440.png` });
    }
    clean();
    await page.close();
  }
  // 2 · URL restore, keyboard, drag and drop, Chinese.
  {
    const { page, clean } = await open({ viewport: { width: 1280, height: 860 } }, '?build=claude-opus55~claude-sdk~web,,,~soc');
    assert.equal(await text(page, '.ar-slot-primary [data-slot-name]'), 'Claude Opus 5.5');
    assert.equal(await text(page, '.ar-slot-secondary [data-slot-name]'), 'Claude Agent SDK');
    assert.match(await text(page, '[data-ar-measured]'), /54\.0%/, 'Claude Opus 5.5 x Claude Agent SDK Dev100 v10');
    assert.equal(await page.locator('.ar-track.is-chosen').getAttribute('data-track'), 'soc');
    // Keyboard: tab arrows switch category, Enter equips.
    await page.getByRole('tab', { name: 'Models' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Harnesses' }).getAttribute('aria-selected'), 'true');
    await page.locator('.ar-item', { hasText: 'OpenAI Agents SDK' }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await text(page, '.ar-slot-secondary [data-slot-name]'), 'OpenAI Agents SDK');
    assert.match(await text(page, '[data-ar-measured]'), /57\.0%/, 'Claude Opus 5.5 x OpenAI Agents SDK Dev100 v10');
    // Drag a gear item into slot 3.
    await page.getByRole('tab', { name: 'Gear' }).click();
    await page.locator('.ar-item', { hasText: 'Case memory' }).dragTo(page.locator('.ar-slot[data-slot="gear-2"]'));
    assert.equal(await text(page, '.ar-slot[data-slot="gear-2"] [data-slot-name]'), 'Case memory');
    // Chinese.
    await page.locator('[data-language="zh"]').first().click();
    await page.waitForFunction(() => document.documentElement.lang === 'zh-CN' && document.querySelector('#page-title').textContent.includes('组装'));
    assert.match(await text(page, '.ar-slot-primary .ar-slot-label'), /主武器/);
    assert.match(await text(page, '[data-ar-measured]'), /完整复现率/);
    assert.match(await text(page, '#deploy'), /社科/);
    if (shots) await page.locator('#loadout').screenshot({ path: `${shots}/armory-loadout-zh.png` });
    await page.locator('[data-language="en"]').first().click();
    clean();
    await page.close();
  }
  // 3 · Mobile, light theme, reduced motion.
  {
    const { page, clean } = await open({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'light' });
    await page.locator('.ar-item', { hasText: 'Kimi K3' }).click();
    assert.equal(await text(page, '.ar-slot-primary [data-slot-name]'), 'Kimi K3');
    assert.equal(await page.locator('.ar-ghost').count(), 0, 'no flight under reduced motion');
    await noOverflow(page);
    if (shots) await page.screenshot({ path: `${shots}/armory-mobile-390.png`, fullPage: false });
    clean();
    await page.close();
  }
  console.log('Armory acceptance passed: click, keyboard and drag equip; measured-only numbers; URL restore; Chinese; 1440/1280/390.');
} finally {
  await browser.close();
}
