// Acceptance: scroll previews equipment; an explicit pointer or keyboard action equips it.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.ARENA_URL || 'http://127.0.0.1:4198/#arena';
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: process.env.BROWSER_CHANNEL || 'chrome' }), headless: true });
const reports = [];
const names = ['DeepSeek Harness', 'DeepAgents', 'Claude Code', 'Codex CLI', 'OpenCode', 'OpenHands SDK', 'Terminus-2', 'mini-SWE-agent'];
const previewProgress = index => .16 + (index + .5) / 8 * .22;
const expectedDomains = [
  ['econ', ['econ.replication', 'econ.monetary', 'econ.markets', 'econ.data', 'econ.statistics']],
  ['fin', ['fin.accounting', 'fin.filings', 'fin.payments', 'fin.credit', 'fin.numeric', 'fin.nlp']],
  ['soc', ['soc.law', 'soc.hr', 'soc.business', 'soc.society', 'soc.psychology']],
];
async function aimedWeapon(page, harness, target) {
  await page.waitForFunction(({ name, target }) => {
    const d = document.querySelector('.mc-canvas').dataset;
    return d.weaponMode === 'hover' && d.weaponHarness === name && d.weaponTarget === target && Number(d.weaponAimDot) > .999;
  }, { name: names[harness], target });
  assert.equal(await page.locator('[data-mc-floating-harness]').isVisible(), true);
  assert.equal(await page.locator('[data-mc-floating-name]').textContent(), names[harness]);
}
async function seek(page, progress) {
  // Native scrolling must suffice; this never invokes a component state setter.
  await page.waitForFunction(p => {
    const section = document.querySelector('.mc-chapter'), pin = section.querySelector('.mc-pin');
    const target = scrollY + section.getBoundingClientRect().top - parseFloat(getComputedStyle(pin).top) + p * (section.offsetHeight - pin.offsetHeight);
    // Lazy scenes and fonts can settle after a direct #arena visit.
    if (Math.abs(scrollY - target) > 1) window.scrollTo({ top: target, behavior: 'instant' });
    return Math.abs(Number(section.dataset.progress) - p) < .002;
  }, progress);
}
async function seekArrival(page, progress, reduced = false) {
  // Enter from the preceding chapter using native scroll, before the pinned episode starts.
  // Keep a sliver of the canvas visible at the beginning so its offscreen renderer can run.
  await page.waitForFunction(({ progress, reduced }) => {
    const section = document.querySelector('.mc-chapter'), pin = section.querySelector('.mc-pin');
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const target = scrollY + section.getBoundingClientRect().top - innerHeight + progress * (innerHeight - top);
    if (Math.abs(scrollY - target) > 1) window.scrollTo({ top: target, behavior: 'instant' });
    const arrival = Number(section.querySelector('.mc-canvas').dataset.arrivalProgress);
    return Math.abs(scrollY - target) <= 1 && Math.abs(arrival - (reduced ? 1 : progress)) < .002;
  }, { progress, reduced });
}
async function landingPose(page, expected) {
  await page.waitForFunction(state => document.querySelector('.mc-canvas').dataset.landingState === state, expected);
  return page.locator('.mc-canvas').evaluate(canvas => ({
    arrival: Number(canvas.dataset.arrivalProgress), altitude: Number(canvas.dataset.agentAltitude),
    state: canvas.dataset.landingState,
  }));
}
async function equipment(page, expected) {
  assert.equal((await page.locator('.mc-chapter').getAttribute('data-equipped-harness')) || '', expected === null ? '' : String(expected));
  assert.equal(await page.locator('.mc-wheel [aria-pressed="true"]').count(), expected === null ? 0 : 1);
  if (expected !== null) assert.equal(await page.locator(`[data-wheel-item="${expected}"]`).getAttribute('aria-pressed'), 'true');
}
async function open(options = {}, fallback = false) {
  const page = await browser.newPage(options), errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(new URL(url).origin) && response.status() >= 400) failed.push(response.url()); });
  await page.route('https://**/*', route => route.abort());
  if (fallback) await page.route('**/arena-scene.js*', route => route.abort());
  await page.goto(url);
  await page.waitForFunction(renderer => document.querySelector('.mc-chapter').dataset.renderer === renderer, fallback ? 'fallback' : 'webgl');
  if (!fallback) await page.waitForFunction(() => document.querySelector('.mc-canvas').dataset.weaponAssets === 'kenney-cc0');
  if (!fallback) assert.equal(await page.locator('.mc-canvas').getAttribute('data-robot-model'), 'mc-kit');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200); // Font-driven layout of the earlier homepage chapters settles first.
  return { page, clean() { assert.deepEqual(errors, []); assert.deepEqual(failed, []); } };
}
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const arrival = await open({ viewport });
    const page = arrival.page;
    await seekArrival(page, .025);
    const high = await landingPose(page, 'descending');
    await seekArrival(page, .5);
    const midway = await landingPose(page, 'descending');
    assert.ok(high.altitude > midway.altitude && midway.altitude > 0, 'Scrolling into Challenge lowers the robot toward the arena');
    assert.equal(Number(await page.locator('.mc-chapter').getAttribute('data-progress')), 0, 'Arrival finishes before the episode advances');
    await page.waitForTimeout(300);
    assert.deepEqual(await landingPose(page, 'descending'), midway, 'Stopping the scroll holds the descent pose; it does not finish on a timer');
    await seekArrival(page, 1);
    const grounded = await landingPose(page, 'landed');
    assert.ok(Math.abs(grounded.altitude) < .002, 'The robot touches the arena floor before takeoff');
    await seek(page, .06);
    await landingPose(page, 'taking-off');
    await seek(page, .14);
    const hovering = await landingPose(page, 'hovering');
    assert.ok(hovering.altitude > .9, 'The following episode scroll lifts the robot into flight');
    await seek(page, .06);
    await landingPose(page, 'taking-off');
    await seek(page, 0);
    await landingPose(page, 'landed');
    await seekArrival(page, .5);
    await page.waitForFunction(altitude => Math.abs(Number(document.querySelector('.mc-canvas').dataset.agentAltitude) - altitude) < .02, midway.altitude);
    assert.equal((await landingPose(page, 'descending')).state, midway.state, 'Reverse scroll restores the same descent pose');
    await seekArrival(page, .025);
    const reversed = await landingPose(page, 'descending');
    assert.ok(Math.abs(reversed.altitude - high.altitude) < .02, 'Returning toward the preceding chapter restores the original height');
    arrival.clean(); reports.push(`${viewport.width}px arrival: scroll descent, touchdown, takeoff, held pose and reversible flight passed`);
    await page.close();
  }
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 800 }]) {
    const { page, clean } = await open({ viewport });
    assert.equal(await page.locator('.mc-wheel [data-wheel-item]').count(), 8);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await seek(page, .07); await equipment(page, null);
    assert.equal(await page.locator('.mc-confirm').isVisible(), false);
    assert.equal(await page.locator('.mc-wheel').evaluate(el => el.inert), true);
    for (let i = 0; i < 8; i++) {
      await seek(page, previewProgress(i));
      assert.equal(await page.locator('.mc-chapter').getAttribute('data-harness'), String(i));
      assert.equal(await page.locator('.mc-wheel .is-active').count(), 1);
      assert.equal(await page.locator('[data-mc-equipped]').textContent(), names[i]);
      assert.equal(await page.locator('.mc-confirm').isEnabled(), true);
      await equipment(page, null);
    }
    assert.equal(await page.locator('.mc-equipment-status').textContent(), '', 'Preview does not announce a confirmed selection');
    for (const [p, phase, room] of [[.46, 2, 0], [.66, 3, 1], [.85, 4, 2], [.98, 5, 2]]) {
      await seek(page, p);
      assert.equal(await page.locator('.mc-chapter').getAttribute('data-phase'), String(phase));
      assert.equal(await page.locator('.mc-chapter').getAttribute('data-room'), String(room));
      await equipment(page, null); // Skipping the wheel must not silently equip a default.
      if (phase >= 2 && phase <= 4) {
        assert.equal(await page.locator('.mc-chapter').getAttribute('data-domain'), expectedDomains[room][0]);
        assert.deepEqual(await page.locator('[data-mc-directory-list] li').evaluateAll(items => items.map(item => item.dataset.category)), expectedDomains[room][1]);
        assert.equal(await page.locator('[data-mc-floating-harness]').isVisible(), false);
      }
    }
    await seek(page, previewProgress(3)); await page.locator('.mc-confirm').click(); await equipment(page, 3);
    assert.equal(await page.locator('.mc-confirm').isDisabled(), true);
    assert.match(await page.locator('.mc-equipment-status').textContent(), /Codex CLI/);
    for (const p of [.46, .66, .85, .98, .07]) {
      await seek(page, p); await equipment(page, 3);
      assert.equal(await page.locator('[data-mc-equipped]').textContent(), names[3]);
      assert.equal(await page.locator('.mc-wheel').evaluate(el => el.inert), true);
      assert.equal(await page.locator('.mc-wheel [tabindex="0"]').count(), 0);
      const target = p === .46 ? 'econ' : p === .66 ? 'fin' : p === .85 ? 'soc' : null;
      if (target) await aimedWeapon(page, 3, target);
    }
    await seek(page, previewProgress(6)); await equipment(page, 3);
    await page.waitForFunction(() => document.querySelector('.mc-canvas').dataset.weaponMode === 'back');
    assert.equal(await page.locator('[data-mc-floating-harness]').isVisible(), false);
    assert.equal(await page.locator('[data-mc-equipped]').textContent(), names[6]);
    await page.locator('[data-wheel-item="6"] .mc-item-name').click(); await equipment(page, 6);
    // Arrow keys preview, whereas Enter and Space explicitly confirm.
    const item = page.locator('[data-wheel-item="4"]');
    assert.equal(await item.getAttribute('role'), 'button');
    assert.ok((await item.getAttribute('aria-label')).includes('OpenCode'));
    await item.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.mc-chapter').getAttribute('data-harness'), '5');
    assert.equal(await page.locator('[data-wheel-item="5"]').evaluate(el => el === document.activeElement), true);
    await equipment(page, 6); await page.keyboard.press('Enter'); await equipment(page, 5);
    await page.locator('[data-wheel-item="1"]').focus();
    const beforeSpace = await page.evaluate(() => scrollY);
    await page.keyboard.press('Space'); await equipment(page, 1);
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - beforeSpace) < 2, 'Space on a wheel button does not scroll');
    await seek(page, previewProgress(0)); await page.locator('.mc-confirm').focus(); await page.keyboard.press('Enter'); await equipment(page, 0);
    await seek(page, .24);
    const geometry = await page.locator('.mc-pin').evaluate(el => ({ top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, width: el.getBoundingClientRect().width }));
    assert.ok(geometry.top >= 110 && geometry.bottom <= viewport.height + 2, 'Scene fits below both navigation bars');
    assert.equal(geometry.width, viewport.width, 'Full-width scene');
    const before = Number(await page.locator('.mc-chapter').getAttribute('data-progress'));
    await page.mouse.wheel(0, 240);
    await page.waitForFunction(p => Number(document.querySelector('.mc-chapter').dataset.progress) > p, before);
    await equipment(page, 0);
    await page.locator('[data-language="zh"]').click(); await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
    await page.waitForTimeout(250);
    assert.match(await page.locator('[data-mc-kicker]').textContent(), /装备轮/);
    assert.ok(await page.locator('.mc-pin').evaluate(e => Math.abs(e.getBoundingClientRect().top - parseFloat(getComputedStyle(e).top)) < 2));
    await equipment(page, 0);
    await page.locator('[data-theme-toggle]').click(); await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await equipment(page, 0); clean();
    reports.push(`${viewport.width}x${viewport.height}: eight scroll previews, explicit equipment, persistence, keyboard, rooms, language and theme passed`);
    await page.close();
  }
  // Each actual GLB model has the same muzzle convention, not merely the same DOM selection.
  const models = await open({ viewport: { width: 1440, height: 1000 } });
  for (let index = 0; index < names.length; index++) {
    await seek(models.page, previewProgress(index));
    await models.page.locator('.mc-confirm').click();
    await seek(models.page, .48); await aimedWeapon(models.page, index, 'econ');
  }
  models.clean(); reports.push('All eight GLB weapons: side hover, muzzle aim and matching harness label passed');
  await models.page.close();
  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  assert.equal(await mobile.page.evaluate(() => Math.round(visualViewport.width)), 390, 'Mobile layout does not force viewport scaling');
  const menu = mobile.page.locator('.menu-toggle');
  assert.equal(await menu.isVisible(), false);
  assert.equal(await mobile.page.locator('#nav-links').isVisible(), true);
  assert.equal(await mobile.page.locator('#nav-links a').count(), 6);
  await mobile.page.waitForTimeout(100);
  await seek(mobile.page, previewProgress(5)); await equipment(mobile.page, null);
  assert.equal(await mobile.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const box = await mobile.page.locator('.mc-confirm').boundingBox();
  assert.ok(box && box.x >= 0 && box.x + box.width <= 390 && box.y >= 112 && box.y + box.height <= 844, 'Mobile confirmation is on screen');
  await mobile.page.locator('.mc-confirm').tap(); await equipment(mobile.page, 5);
  for (const p of [.07, .24, .46, .66, .85, .98]) {
    await seek(mobile.page, p);
    const overlaps = await mobile.page.evaluate(() => {
      const a = document.querySelector('.mc-loadout').getBoundingClientRect();
      const b = document.querySelector('.mc-bottom').getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
    assert.equal(overlaps, false, `Mobile equipment and trace do not overlap at ${p}`);
  }
  await seek(mobile.page, .85); await equipment(mobile.page, 5);
  await seek(mobile.page, previewProgress(2)); await mobile.page.locator('[data-wheel-item="2"] .mc-item-name').tap(); await equipment(mobile.page, 2);
  mobile.clean(); reports.push('390x844 mobile: native scroll, visible confirmation, touch selection and persistence passed'); await mobile.page.close();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const reduced = await open({ viewport, reducedMotion: 'reduce' });
    assert.equal(await reduced.page.locator('.mc-pin').evaluate(e => getComputedStyle(e).position), 'relative');
    // Reduced motion skips the automatic arrival, even when scrolling back out and in.
    for (const entry of [.025, .5, 1, .5, .025, 1]) {
      await seekArrival(reduced.page, entry, true);
      const pose = await landingPose(reduced.page, 'landed');
      assert.equal(pose.arrival, 1, 'Reduced motion keeps arrival complete regardless of scroll position');
      assert.equal(pose.altitude, 0, 'Reduced motion opens with a grounded robot');
    }
    const still = await landingPose(reduced.page, 'landed');
    await reduced.page.waitForTimeout(300);
    assert.deepEqual(await landingPose(reduced.page, 'landed'), still, 'Reduced motion does not launch a timed arrival');
    const slider = reduced.page.locator('.mc-scrub');
    await slider.focus(); await reduced.page.keyboard.press('End');
    assert.equal(await reduced.page.locator('.mc-chapter').getAttribute('data-phase'), '5'); await equipment(reduced.page, null);
    await slider.evaluate(el => { el.value = '250'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const collision = await reduced.page.evaluate(() => {
      const a = document.querySelector('.mc-access').getBoundingClientRect(), b = document.querySelector('.mc-loadout').getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
    assert.equal(collision, false, 'The explicit range does not cover equipment controls');
    await reduced.page.locator('.mc-confirm').click(); await equipment(reduced.page, 3);
    await slider.focus(); await reduced.page.keyboard.press('End'); await equipment(reduced.page, 3);
    reduced.clean(); reports.push(`${viewport.width}px reduced motion: stationary scene, separate keyboard range and persistent equipment passed`); await reduced.page.close();
  }
  // A short viewport must not shrink the wheel or trap confirmation below a sticky frame.
  for (const viewport of [{ width: 800, height: 600 }, { width: 844, height: 390 }]) {
    const compact = await open({ viewport });
    const slider = compact.page.locator('.mc-scrub');
    await slider.evaluate(el => { el.value = '250'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const wheel = await compact.page.locator('.mc-wheel').boundingBox();
    assert.ok(wheel && wheel.width >= 260, 'Short screens keep legible equipment sectors');
    assert.equal(await compact.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await compact.page.locator('.mc-confirm').click(); await equipment(compact.page, 3);
    await slider.focus(); await compact.page.keyboard.press('End'); await equipment(compact.page, 3);
    compact.clean(); reports.push(`${viewport.width}x${viewport.height}: reachable slider and equipment, full-size wheel passed`);
    await compact.page.close();
  }
  const fallback = await open({}, true);
  assert.ok(await fallback.page.locator('.mc-fallback').isVisible());
  await fallback.page.locator('.mc-scrub').focus(); await fallback.page.keyboard.press('End');
  assert.match(await fallback.page.locator('[data-mc-event]').textContent(), /whole episode/); await equipment(fallback.page, null);
  await fallback.page.locator('.mc-scrub').evaluate(el => { el.value = '250'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await fallback.page.locator('.mc-confirm').click(); await equipment(fallback.page, 3);
  fallback.clean(); reports.push('Renderer failure: readable episode, keyboard seeking and explicit equipment passed'); await fallback.page.close();
  console.log(reports.join('\n'));
} finally { await browser.close(); }
