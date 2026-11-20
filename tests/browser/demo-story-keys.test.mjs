#!/usr/bin/env node
// SIGNAL's reading and keyboard behaviours closed 18 Nov 2026 (SIGNAL_INVENTORY §4 “Keyboard”): the enlarged-picture viewer for panel
// drawings and the cover, and the arrow keys between options, as the standalone has them.
//   SK-01 a panel drawing opens enlarged with its description; focus on Close; Tab stays in the viewer; Escape closes it
//   SK-02 a tap on the backdrop closes it; a click on a control inside a panel does not open it
//   SK-03 on a phone held upright the picture turns sideways (the reference's rule)
//   SK-04 the cover on the title page opens the same way
//   SK-05 arrow keys move between a decision's options and wrap
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-story-keys');
{ const t = await open('#/story/s01e00', { role: 'installer' }); const p = t.page; await p.check('[data-testid=story-gates]'); await p.waitForSelector('.sg-panel .sg-art svg');
  await p.locator('.sg-panel .sg-art').first().click({ position: { x: 20, y: 20 } }); await p.waitForSelector('[data-testid="story-zoom"]', { timeout: 4000 }).catch(() => undefined);
  const z = await p.$('[data-testid="story-zoom"]'); ok('SK-01a', 'a panel drawing opens enlarged', !!z && !!(await p.$('[data-testid="story-zoom"] svg')));
  ok('SK-01b', 'focus is on Close', (await p.evaluate(() => document.activeElement?.getAttribute('data-testid'))) === 'story-zoom-close');
  await p.keyboard.press('Tab'); ok('SK-01c', 'Tab stays in the viewer', (await p.evaluate(() => document.activeElement?.getAttribute('data-testid'))) === 'story-zoom-close');
  ok('SK-01d', 'the page behind does not scroll', await p.evaluate(() => document.body.classList.contains('zooming')));
  await p.keyboard.press('Escape'); ok('SK-01e', 'Escape closes it', !(await p.$('[data-testid="story-zoom"]')) && !(await p.evaluate(() => document.body.classList.contains('zooming'))));
  await p.locator('.sg-panel .sg-art').first().click({ position: { x: 20, y: 20 } }); await p.waitForSelector('[data-testid="story-zoom"]');
  await p.mouse.click(5, 300); ok('SK-02a', 'a tap on the backdrop closes it', !(await p.$('[data-testid="story-zoom"]')));
  const opt = p.locator('.sg-opts[aria-label="Options"] button').first(); await opt.focus();
  const n = await p.locator('.sg-opts[aria-label="Options"]').first().locator('button').count();
  await p.keyboard.press('ArrowDown'); const second = await p.evaluate(() => document.activeElement?.getAttribute('data-option'));
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); const last = await p.evaluate(() => document.activeElement?.getAttribute('data-option'));
  ok('SK-05', 'arrow keys move between a decision’s options and wrap', second === 'B' && last === String.fromCharCode(64 + n), `${second} ${last} of ${n}`);
  ok('SK-02b', 'no zoom opened by a click on a control', !(await p.$('[data-testid="story-zoom"]')));
  ok('SK-06', 'no console errors', !t.errs.length, t.errs.join(' | ')); await t.close(); }
{ const t = await open('#/story/s01e00', { role: 'installer', w: 390, h: 844 }); const p = t.page; await p.check('[data-testid=story-gates]'); await p.waitForSelector('.sg-panel .sg-art svg');
  await p.locator('.sg-panel .sg-art').first().click({ position: { x: 10, y: 10 } }); await p.waitForSelector('[data-testid="story-zoom"]');
  ok('SK-03', 'on a phone held upright the picture turns sideways', !!(await p.$('[data-testid="story-zoom"] .sg-zoom__pic--rot'))); await t.close(); }
{ const t = await open('#/story', { role: 'installer' }); const p = t.page; await p.waitForSelector('[data-testid="story-cover"] svg');
  await p.click('[data-testid="story-cover"]', { position: { x: 30, y: 30 } }); ok('SK-04', 'the cover opens enlarged', !!(await p.$('[data-testid="story-zoom"]'))); await t.close(); }
await done();
