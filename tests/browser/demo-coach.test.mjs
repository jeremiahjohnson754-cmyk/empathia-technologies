#!/usr/bin/env node
// Coach marks (founder, 19 Nov 2026 09:16: "little UX pop-ups indicators for the role selector icon and the field tools wretch icon to
// show people hey tap this ... that goes away but after a few seconds of interactivity"): nothing on a cold load; a few seconds after the
// visitor first interacts, a tip under View as, then one under the Field Tools wrench; each goes by itself, on "Got it", on Escape or
// when its control is used; once seen it does not come back; a role without the wrench gets only the first; on a phone the tip fits and
// does not cover its control; no console error. Automated browsers get the tips only when the address asks (coach=show), so this test
// asks; every other suite walks the pages without them.
//   node tests/browser/demo-coach.test.mjs     (PW_COLOR_SCHEME=dark for the dark run)
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-coach');
const tip = (p) => p.evaluate(() => { const c = document.querySelector('[data-testid=coach]'); if (!c) return null; const r = c.getBoundingClientRect();
  const of = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  const t = of(c.dataset.tip === 'viewas' ? '[data-testid=viewas-open]' : '[data-testid=shell-fieldtools]');
  const overlap = t ? !(r.right <= t.left || r.left >= t.right || r.bottom <= t.top || r.top >= t.bottom) : true;
  return { id: c.dataset.tip, text: c.textContent, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), overlap, focus: c.contains(document.activeElement), vw: innerWidth }; });
const until = async (p, fn, ms = 6000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn(); if (v) return v; await p.waitForTimeout(150); } return v; };

// 1. desktop, the Product Architect (who has the wrench): View as first, then Field Tools
{ const t = await open('#/investor?coach=show', { role: 'architect' }); const p = t.page; await p.waitForTimeout(4200);
  ok('CO-01', 'nothing is shown on a cold load, before the visitor does anything', !(await tip(p)), JSON.stringify(await tip(p)));
  await p.mouse.click(700, 600); const t0 = Date.now();
  const a = await until(p, () => tip(p), 6000); const after = Date.now() - t0;
  ok('CO-02', 'a few seconds after the first interaction, a tip under View as says what it does (switch roles), without taking focus or covering the control', a && a.id === 'viewas' && /switch roles/i.test(a.text) && !a.overlap && !a.focus && after >= 2500, JSON.stringify({ a, after }));
  const gone = await until(p, async () => !(await tip(p)) || (await tip(p))?.id !== 'viewas', 10000);
  ok('CO-03', 'it goes away by itself after a few seconds', !!gone);
  const b = await until(p, async () => { const x = await tip(p); return x && x.id === 'fieldtools' ? x : null; }, 4000);
  ok('CO-04', 'then a tip under the Field Tools wrench names the site calculators, inside the window and off its control', b && /calculators/.test(b.text) && !b.overlap && b.left >= 0 && b.right <= b.vw, JSON.stringify(b));
  await p.click('[data-testid=coach-ok]'); await p.waitForTimeout(300);
  ok('CO-05', '"Got it" dismisses it', !(await tip(p)));
  await p.reload(); await p.waitForTimeout(500); await p.mouse.click(700, 600); await p.waitForTimeout(4500);
  ok('CO-06', 'once seen, neither comes back on the next visit', !(await tip(p)), JSON.stringify(await tip(p)));
  ok('CO-07', 'no console error', !t.errs.length, t.errs.join(' | ')); await t.close(); }

// 2. using the control dismisses its tip; Escape dismisses too
{ const t = await open('#/investor?coach=show', { role: 'architect' }); const p = t.page; await p.waitForTimeout(600);
  await p.keyboard.press('Tab'); const a = await until(p, () => tip(p), 6000);
  ok('CO-08', 'a keyboard visitor gets it too (the first key press counts as interaction)', a && a.id === 'viewas', JSON.stringify(a));
  await p.click('[data-testid=viewas-open]'); await p.waitForTimeout(400);
  const s = await p.evaluate(() => ({ sheet: !!document.querySelector('[data-testid=viewas-sheet]'), coach: document.querySelector('[data-testid=coach]')?.dataset.tip || null }));
  ok('CO-09', 'tapping View as opens the role sheet and the tip goes; the next tip waits while the sheet is open', s.sheet && !s.coach, JSON.stringify(s));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const b = await until(p, () => tip(p), 6000);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('CO-10', 'after the sheet closes the Field Tools tip follows, and Escape dismisses it', b && b.id === 'fieldtools' && !(await tip(p)), JSON.stringify(b));
  await t.close(); }

// 3. a role without the wrench: only the View as tip
{ const t = await open('#/investor?coach=show', { role: 'visitor' }); const p = t.page; await p.waitForTimeout(500); await p.mouse.click(700, 600);
  const a = await until(p, () => tip(p), 6000); await p.click('[data-testid=coach-ok]');
  const b = await until(p, () => tip(p), 3500);
  ok('CO-11', 'a Visitor (no Field Tools) gets the View as tip and nothing after it', a && a.id === 'viewas' && !b, JSON.stringify({ a, b })); await t.close(); }

// 4. a phone: the tip fits in the window and does not cover its control
{ const t = await open('#/investor?coach=show', { role: 'architect', w: 390, h: 844 }); const p = t.page; await p.waitForTimeout(500); await p.mouse.click(200, 500);
  const a = await until(p, () => tip(p), 6000);
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('CO-12', 'on a phone (390 px) the tip sits inside the window, under its control, with no sideways scroll', a && a.left >= 0 && a.right <= 390 && !a.overlap && over <= 0, JSON.stringify({ a, over }));
  ok('CO-13', 'no console error and no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// 5. an automated browser without coach=show never sees a tip (so other suites are not interrupted)
{ const t = await open('#/investor', { role: 'architect' }); const p = t.page; await p.waitForTimeout(400); await p.mouse.click(700, 600); await p.waitForTimeout(4200);
  ok('CO-14', 'without coach=show an automated browser gets no tip', !(await tip(p))); await t.close(); }

await done();
