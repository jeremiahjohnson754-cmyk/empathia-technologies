#!/usr/bin/env node
// SIGNAL's field calculator in the product (restored 18 Nov 2026): the 🧮 button where math is needed (Practice, Service Mode, Case
// Files, the certification practice), Enter runs the expression, the key pad and a helper work, the last results are reusable, Escape
// closes and returns focus to the button; in the story the button shows only while a lab is on screen.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-fieldcalc');
{ const t = await open('#/learn/practice', { role: 'installer' }); const p = t.page;
  await p.waitForSelector('[data-testid="field-calc-fab"]', { timeout: 10000 }).catch(() => undefined);
  ok('FCB-01', 'Practice has the calculator button', !!(await p.$('[data-testid="field-calc-fab"]')));
  await p.click('[data-testid="field-calc-fab"]'); ok('FCB-02', 'it opens with the expression line focused', (await p.evaluate(() => document.activeElement?.getAttribute('data-testid'))) === 'field-calc-in');
  await p.keyboard.type('1.7/343*1000'); await p.keyboard.press('Enter'); ok('FCB-03', 'Enter runs it', (await p.innerText('[data-testid="field-calc-out"]')) === '4.956268');
  await p.click('[data-testid="field-calc"] button:has-text("C")'); for (const k of ['2', '^', '1', '0', '=']) await p.click(`[data-testid="field-calc"] .fcalc__keys button:text-is("${k}")`);
  ok('FCB-04', 'the key pad works', (await p.innerText('[data-testid="field-calc-out"]')) === '1024');
  await p.click('[data-testid="field-calc-hist"] li:nth-child(2) button'); ok('FCB-05', 'a past result is reused', (await p.inputValue('[data-testid="field-calc-in"]')) === '4.956268');
  await p.click('[data-testid="field-calc"] summary'); const row = p.locator('.fcalc__hrow', { hasText: 'usable hosts in /n' }); await row.locator('input').fill('24'); await row.locator('button').click();
  ok('FCB-06', 'a field helper works', (await row.locator('.fcalc__hres').innerText()) === '254 hosts');
  await p.focus('[data-testid="field-calc-in"]'); await p.keyboard.press('Escape'); ok('FCB-07', 'Escape closes and returns focus to the button', !(await p.$('[data-testid="field-calc"]')) && (await p.evaluate(() => document.activeElement?.getAttribute('data-testid'))) === 'field-calc-fab');
  ok('FCB-08', 'no console errors', !t.errs.length, t.errs.join(' | ')); await t.close(); }
for (const hash of ['#/learn/service', '#/learn/cases']) { const t = await open(hash, { role: 'installer' }); await t.page.waitForSelector('[data-testid="field-calc-fab"]', { timeout: 10000 }).catch(() => undefined); ok(`FCB-09 ${hash}`, 'has the calculator button', !!(await t.page.$('[data-testid="field-calc-fab"]'))); await t.close(); }
{ const t = await open('#/learn/cts/practice', { role: 'installer' }); await t.page.click('[data-testid="ct-exam-25"]'); ok('FCB-10', 'a certification practice exam has the on-screen calculator, as the test centre gives one', !!(await t.page.$('[data-testid="field-calc-fab"]'))); await t.close(); }
{ const t = await open('#/story/s01e00', { role: 'installer' }); const p = t.page; await p.check('[data-testid=story-gates]'); await p.waitForSelector('.sg-panel, .sg-dec');   /* reviewer mode shows the whole chapter */
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); const atTop = await p.evaluate(() => [...document.querySelectorAll('.lab')].some((l) => { const r = l.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }));
  ok('FCB-11a', 'in the story the button is absent while no lab is on screen', atTop || !(await p.$('[data-testid="field-calc-fab"]')));
  await p.locator('.lab').first().scrollIntoViewIfNeeded(); await p.waitForSelector('[data-testid="field-calc-fab"]', { timeout: 4000 }).catch(() => undefined);
  ok('FCB-11b', 'and appears when a lab scrolls into view', !!(await p.$('[data-testid="field-calc-fab"]')), `labs ${await p.locator('.lab').count()}`); await t.close(); }
await done();
