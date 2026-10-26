// Acceptance for the v2 cyberpunk layer: every v2 page loads cleanly with cyber.css in both
// themes and widths; motion canvases mount, pause offscreen, and draw a static frame under
// reduced motion. Point CYBER_BASE at a static server of the repository root.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CYBER_BASE || 'http://127.0.0.1:4198/v2/';
const shots = process.env.SHOTS_DIR || '';
if (shots) await mkdir(shots, { recursive: true });
const pages = ['index.html', 'challenge.html', 'replication.html', 'professional-tasks.html', 'harness.html', 'armory.html', 'evolution.html', 'leaderboard.html', 'teams.html'];
const fx = { 'harness.html': ['scope', 'packets', 'rings'], 'leaderboard.html': ['torus'] };
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: process.env.BROWSER_CHANNEL || 'chrome' }), headless: true });

async function open(file, options = {}, theme = 'dark') {
  const page = await browser.newPage(options), errors = [], failed = [];
  page.on('pageerror', error => errors.push(`${file}: ${error.message}`));
  page.on('response', response => { if (response.url().startsWith(new URL(base).origin) && response.status() >= 400) failed.push(response.url()); });
  await page.route('https://**/*', route => route.abort());
  await page.addInitScript(value => { try { localStorage.setItem('inferencenet-theme', value); } catch {} }, theme);
  await page.goto(base + file);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  return { page, clean() { assert.deepEqual(errors, []); assert.deepEqual(failed, []); } };
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

try {
  for (const file of pages) {
    for (const [viewport, theme] of [[{ width: 1440, height: 900 }, 'dark'], [{ width: 390, height: 844 }, 'light']]) {
      const { page, clean } = await open(file, { viewport }, theme);
      // The Metacase homepage keeps its own design (PR #43); every other v2 page carries the cyber layer.
      const hasCyber = await page.evaluate(() => [...document.styleSheets].some(sheet => sheet.href?.includes('/v2/cyber.css')));
      assert.equal(hasCyber, file !== 'index.html', `${file}: cyber.css`);
      assert.ok((await overflow(page)) <= 1, `${file} @${viewport.width}: horizontal overflow`);
      if (shots && viewport.width === 1440) await page.screenshot({ path: `${shots}/cyber-${file.replace('.html', '')}-1440.png` });
      if (fx[file]) {
        const effects = await page.$$eval('canvas.cy-fx', list => list.map(canvas => canvas.dataset.cyberMounted));
        assert.deepEqual(effects, fx[file], `${file}: mounted effects`);
        for (const effect of fx[file]) {
          const canvas = page.locator(`canvas.cy-fx[data-cyber="${effect}"]`);
          await canvas.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);
          const painted = await canvas.evaluate(node => {
            const ctx = node.getContext('2d'), data = ctx.getImageData(0, 0, node.width, node.height).data;
            let lit = 0; for (let i = 3; i < data.length; i += 16) if (data[i] > 0) lit++;
            return lit;
          });
          assert.ok(painted > 50, `${file}: ${effect} paints`);
          if (shots && viewport.width === 1440) await page.locator(`section:has(canvas.cy-fx[data-cyber="${effect}"])`).screenshot({ path: `${shots}/cyber-${file.replace('.html', '')}-${effect}.png`, clip: undefined }).catch(() => {});
        }
      }
      clean();
      await page.close();
    }
  }
  // Reduced motion: canvases still draw one static frame and never schedule animation frames.
  {
    const { page, clean } = await open('harness.html', { viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
    await page.locator('canvas.cy-fx[data-cyber="rings"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const first = await page.locator('canvas.cy-fx[data-cyber="rings"]').evaluate(node => node.toDataURL());
    await page.waitForTimeout(500);
    const second = await page.locator('canvas.cy-fx[data-cyber="rings"]').evaluate(node => node.toDataURL());
    assert.equal(first, second, 'static frame under reduced motion');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.page-hero .kicker'), '::after').animationName), 'none');
    clean();
    await page.close();
  }
  // Normal motion: frames change while visible, and stop when scrolled away.
  {
    const { page, clean } = await open('harness.html', { viewport: { width: 1280, height: 860 } });
    const canvas = page.locator('canvas.cy-fx[data-cyber="rings"]');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const a = await canvas.evaluate(node => node.toDataURL());
    await page.waitForTimeout(400);
    const b = await canvas.evaluate(node => node.toDataURL());
    assert.notEqual(a, b, 'animates while visible');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(400);
    const c = await canvas.evaluate(node => node.toDataURL());
    await page.waitForTimeout(400);
    const d = await canvas.evaluate(node => node.toDataURL());
    assert.equal(c, d, 'paused offscreen');
    clean();
    await page.close();
  }
  console.log(`Cyber layer acceptance passed: ${pages.length} v2 pages x 2 themes/widths, 4 motion canvases, reduced motion and offscreen pause.`);
} finally {
  await browser.close();
}
