#!/usr/bin/env node
// View as (D1): the fifteen roles in a real dialog (focus in, Tab trapped, Escape and focus return), the switch re-renders tabs and
// buttons from the policy, persists, says it grants nothing, follows another tab; role colours take their light or dark step with the
// theme the person chose (Light on a dark device and Dark on a light device). Destructive: rapid switching, blocked storage.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-viewas');
const role = (p) => p.evaluate(() => document.documentElement.dataset.role);

{ const t = await open('#/investor', { role: 'architect' }); const p = t.page;
  await p.click('[data-testid=viewas-open]'); await p.waitForSelector('[data-testid=viewas-sheet]');
  const d = await p.evaluate(() => { const s = document.querySelector('[data-testid=viewas-sheet]'); return { role: s.getAttribute('role'), modal: s.getAttribute('aria-modal'), label: document.getElementById(s.getAttribute('aria-labelledby'))?.textContent, n: s.querySelectorAll('[data-role-key]').length, pressed: s.querySelector('[aria-pressed=true]')?.dataset.roleKey, inside: s.contains(document.activeElement) }; });
  ok('V-01', 'View as is a modal dialog with the fifteen roles, the current one pressed and focused', d.role === 'dialog' && d.modal === 'true' && d.label === 'View as' && d.n === 15 && d.pressed === 'architect' && d.inside, JSON.stringify(d));
  let out = 0; for (let i = 0; i < 40; i++) { await p.keyboard.press('Tab'); if (!(await p.evaluate(() => document.querySelector('[data-testid=viewas-sheet]').contains(document.activeElement)))) out += 1; }
  for (let i = 0; i < 5; i++) await p.keyboard.press('Shift+Tab');
  ok('V-02', 'Tab and Shift+Tab stay inside the dialog', out === 0 && await p.evaluate(() => document.querySelector('[data-testid=viewas-sheet]').contains(document.activeElement)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok('V-03', 'Escape closes it and focus returns to the View-as button', await p.locator('[data-testid=viewas-sheet]').count() === 0 && await p.evaluate(() => document.activeElement?.dataset.testid) === 'viewas-open');
  await p.click('[data-testid=viewas-open]'); await p.click('[data-testid=viewas-sheet] [data-role-key=designer]'); await p.waitForTimeout(400);
  const after = await p.evaluate(() => ({ ava: document.querySelector('[data-testid=viewas-open] .ava').textContent, said: document.getElementById('route-announcer').textContent, stored: localStorage.getItem('empathia.demo.perspective') }));
  ok('V-04', 'choosing Designer re-renders the shell as the designer, announces it and remembers it', await role(p) === 'designer' && after.ava === 'DE' && /Now viewing as Designer/.test(after.said) && /grants nothing/.test(after.said) && after.stored === 'designer', JSON.stringify(after));
  const tabs = await p.$$eval('[data-testid=hometabs] a', (a) => a.map((x) => x.textContent));
  // V-05 changed (v18/continuation, 9 Nov): Intake was absent while no page opened behind it. The parity work built #/intake, so the rule
  // "kept only where they open" now keeps it; the check follows each tab and requires every one to open a real page for the designer.
  const tabHrefs = await p.$$eval('[data-testid=hometabs] a', (a) => a.map((x) => x.getAttribute('href')));
  const opens = []; for (const h of tabHrefs) { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(500); opens.push(await p.evaluate(() => !!document.querySelector('main h1') && !document.querySelector('[data-testid=access-page]') && document.querySelector('main').innerText.length > 200)); }
  await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(400);
  ok('V-05', 'the designer’s home tabs are V2.5.3’s (Desk, Intake, Builder, Scouter), and every one shown opens a page', ['Desk', 'Intake', 'Builder', 'Scouter'].every((x) => tabs.includes(x)) && opens.every(Boolean), `${tabs.join(',')} ${opens.join(',')}`);
  await p.reload(); await p.waitForTimeout(400);
  ok('V-06', 'the role survives a reload', await role(p) === 'designer');
  await p.click('[data-testid=viewas-open]'); await p.click('text=Return to Product Architect'); await p.waitForTimeout(300);
  ok('V-07', '“Return to Product Architect” is offered while viewing as another role and works', await role(p) === 'architect');
  await p.selectOption('.persp select', 'exec'); await p.waitForTimeout(300);
  ok('V-08', 'the native quick switch (.persp select) still drives the role', await role(p) === 'exec' && /grants nothing/.test(await p.locator('#persp-note').innerText()));
  await p.click('[data-testid=viewas-open]');
  const names = await p.$$eval('[data-testid=viewas-sheet] [data-role-key]', (b) => b.map((x) => x.innerText.split('\n')[1]));
  ok('V-09', 'every role shows its domain and how much of the platform it reaches', names.length === 15 && (await p.$$eval('.viewas__n', (n) => n.map((x) => x.textContent))).every((x) => /^(\d[\d,]* of [\d,]+ records · )?\d+ of \d+ surfaces · \d+ of \d+ pages$/.test(x)));
  // V-09 changed (uplift/system-shell): the coverage line now reads records · surfaces · pages, as the 3 Nov View-as sheet did (screens 04,
  // more-08); records load with the sheet, so the records part is optional on the first paint and checked in V-09b once loaded.
  await p.waitForFunction(() => [...document.querySelectorAll('.viewas__n')].every((x) => /records/.test(x.textContent)), null, { timeout: 5000 }).catch(() => undefined);
  const cov = await p.$$eval('.viewas__n', (n) => n.map((x) => (/^([\d,]+) of ([\d,]+) records/.exec(x.textContent) || []).slice(1).map((v) => +v.replace(/,/g, ''))));
  ok('V-09b', 'records coverage is computed per role: the Product Architect sees every record, the Visitor fewer, every total equal', cov.every((c) => c.length === 2 && c[1] === cov[0][1] && c[0] <= c[1]) && Math.max(...cov.map((c) => c[0])) === cov[0][1] && Math.min(...cov.map((c) => c[0])) < cov[0][1]);
  await p.keyboard.press('Escape');
  ok('V-10', 'no console error, nothing off the page', !t.errs.length && !t.off.length, t.errs.join(' | ')); await t.close(); }

{ const t = await open('#/investor', { role: 'architect' });
  await t.page.click('.shelf [data-role-key=exec]'); await t.page.waitForTimeout(300);
  ok('V-11', 'the investor start’s shelf switches role in one tap', await role(t.page) === 'exec' && await t.page.locator('.shelf [data-role-key=exec][aria-pressed=true]').count() === 1);
  // destructive: five switches as fast as the user can click
  for (const k of ['ops', 'designer', 'cxeng', 'service', 'svcmgr']) { await t.page.selectOption('.persp select', k); }
  await t.page.waitForTimeout(1200);
  ok('V-12', 'destructive: rapid switching settles on the last role, with no veil left behind', await role(t.page) === 'svcmgr' && await t.page.locator('.veil').count() === 0 && await t.page.locator('[data-testid=viewas-open] .ava').innerText() === 'SM');
  const t2 = await t.ctx.newPage(); await t2.goto(t.page.url()); await t2.waitForTimeout(300); await t2.selectOption('.persp select', 'steward'); await t2.waitForTimeout(400);
  ok('V-13', 'another tab’s switch is followed here, so two tabs never disagree', await role(t.page) === 'steward'); await t.close(); }

{ // destructive: storage that throws (private mode, blocked site data)
  const t = await open('#/investor', { role: 'architect' });
  await t.ctx.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  const p = await t.ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto(t.page.url()); await p.waitForTimeout(500);
  await p.selectOption('.persp select', 'designer'); await p.waitForTimeout(300);
  ok('V-14', 'destructive: with storage blocked the demonstration still renders and switches (the choice lasts the page)', await p.locator('main h1').count() === 1 && await role(p) === 'designer' && !errs.length, errs.join(' | ')); await t.close(); }

// role colours in both steps, whatever the device says, and never a change of theme or accent
for (const [device, choice, want] of [['dark', 'light', '#a51e24'], ['light', 'dark', '#ec716b'], ['dark', '', '#ec716b'], ['light', '', '#a51e24']]) {
  const t = await open('#/investor', { role: 'designer', theme: choice, colorScheme: device });
  const v = await t.page.evaluate(() => ({ c: getComputedStyle(document.documentElement).getPropertyValue('--role-designer').trim(), cur: getComputedStyle(document.documentElement).getPropertyValue('--role').trim(), theme: document.documentElement.dataset.theme || '', accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }));
  await t.page.selectOption('.persp select', 'ops'); await t.page.waitForTimeout(200);
  const w = await t.page.evaluate(() => ({ theme: document.documentElement.dataset.theme || '', accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }));
  ok(`V-theme-${device}-${choice || 'system'}`, `role colour takes its ${want === '#a51e24' ? 'light' : 'dark'} step on a ${device} device with “${choice || 'System'}”; a role switch never changes the theme or the teal accent`, v.c === want && w.theme === v.theme && w.accent === v.accent, JSON.stringify({ v, w }));
  await t.close();
}
await done();
