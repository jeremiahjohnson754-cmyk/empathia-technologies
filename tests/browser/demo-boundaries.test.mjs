#!/usr/bin/env node
// 90-6: the boundary checks the threat review (docs/security/BOUNDARY_REVIEW.md) found missing elsewhere. The rest of each boundary is
// covered by the suites that review names (public-security, demo-access, demo-proof, demo-knowledge, demo-offline, demo-control …).
//   - an address can never choose who you are: ?role=, ?perspective=, ?as= with a role's name, and a forged hash segment leave the
//     stored role as it was and a forbidden page stays forbidden, with its chunk never fetched;
//   - an address that names a world configuration grants nothing: the visitor still gets the access page where it applied;
//   - reload keeps the role (it is never reset to a more powerful one) and a reload at a forbidden address is still forbidden;
//   - on a slow network (every request held back) the first visit shows a loading line, then the page, with no error, and a page the
//     role may not open is still refused, never shown while loading.
//   node tests/browser/demo-boundaries.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done, base } = await harness('demo-boundaries');
const state = (p) => p.evaluate(() => ({ role: document.documentElement.dataset.role, stored: localStorage.getItem('empathia.demo.perspective'), access: !!document.querySelector('[data-testid=access-page]') }));
const scouterChunk = (reqs) => reqs.some((u) => /^shell\/scouter|ScouterPage/.test(u));

// 1. an address can never choose who you are
{ const tries = ['#/campus/scouter?role=architect', '#/campus/scouter?perspective=architect', '#/campus/scouter?as=architect', '#/campus/scouter?as=founder&role=admin', '#/campus/scouter?__proto__[role]=architect'];
  const bad = [];
  for (const h of tries) { const t = await open(h, { role: 'visitor' }); const s = await state(t.page);
    if (s.role !== 'visitor' || s.stored !== 'visitor' || !s.access || scouterChunk(t.reqs) || t.errs.length) bad.push(`${h} → ${JSON.stringify(s)} chunk=${scouterChunk(t.reqs)} errs=${t.errs.length}`); await t.close(); }
  ok('BD-01', 'role, perspective or as= in the address never changes who you are: the Visitor stays the Visitor, gets the access page, and the screen is never fetched', !bad.length, bad.join(' | ')); }

// 2. reload keeps the role and the refusal
{ const t = await open('#/campus/scouter', { role: 'visitor' }); const a = await state(t.page);
  await t.page.reload(); await t.page.waitForSelector('main h1', { timeout: 8000 }).catch(() => undefined); await t.page.waitForTimeout(300); const b = await state(t.page);
  ok('BD-02', 'a reload at a forbidden address keeps the same role and the same refusal; the screen is still never fetched', a.access && b.access && b.role === 'visitor' && b.stored === 'visitor' && !scouterChunk(t.reqs) && !t.errs.length, JSON.stringify({ a, b, errs: t.errs.slice(0, 2) }));
  await t.close(); }

// 3. a world configuration named in the address grants nothing
{ const t = await open('#/gameday/incident/feedback?as=stadium-ops', { role: 'visitor' }); const s = await state(t.page); const txt = await t.page.evaluate(() => document.querySelector('main')?.innerText || '');
  ok('BD-03', 'naming an operations configuration in the address (as=) does not give the Visitor the operations incident: it is refused or shown as the public view, never as the operator', s.role === 'visitor' && (s.access || !/Acknowledge|Assign|Dispatch/i.test(txt)) && !t.errs.length, JSON.stringify({ s, start: txt.slice(0, 160) }));
  await t.close(); }

// 4. a slow network: the first visit shows a loading line, then the page; a forbidden page stays forbidden throughout
{ const t = await open('#/', { role: 'visitor', sw: false }); t.errs.length = 0; t.reqs.length = 0;
  await t.page.route('**/*', async (r) => { await new Promise((x) => setTimeout(x, 600)); await r.continue(); });
  const nav = t.page.goto(base + '?slow=1#/campus/scouter', { waitUntil: 'commit' }); await nav;
  let sawLoading = false, sawScreen = false; const t0 = Date.now();
  while (Date.now() - t0 < 20000) { const s = await t.page.evaluate(() => ({ text: document.body?.innerText || '', access: !!document.querySelector('[data-testid=access-page]'), h1: document.querySelector('main h1')?.textContent || '' })).catch(() => ({ text: '', access: false, h1: '' }));
    if (/Loading the demonstration/.test(s.text)) sawLoading = true; if (/Scouter/.test(s.h1) && !s.access) sawScreen = true; if (s.access) break; await t.page.waitForTimeout(150); }
  const s = await state(t.page);
  ok('BD-04', 'on a slow network the first visit shows the loading line, then the page: the Visitor at a forbidden address is refused, never shown the screen while it loads, and nothing errors', sawLoading && s.access && !sawScreen && !scouterChunk(t.reqs) && !t.errs.length, JSON.stringify({ sawLoading, sawScreen, s, errs: t.errs.slice(0, 2) }));
  await t.page.unroute('**/*'); await t.close(); }

// 5. the slow network for a page the role may open: it arrives, complete, with no error
{ const t = await open('#/', { role: 'architect', sw: false }); t.errs.length = 0;
  await t.page.route('**/*', async (r) => { await new Promise((x) => setTimeout(x, 600)); await r.continue(); });
  await t.page.goto(base + '?slow=2#/campus/scouter'); await t.page.waitForSelector('main h1', { timeout: 30000 }).catch(() => undefined); await t.page.waitForTimeout(400);
  const s = await state(t.page); const h1 = await t.page.evaluate(() => document.querySelector('main h1')?.textContent || '');
  ok('BD-05', 'on the same slow network a role that may open the page gets it, complete, with no error', !s.access && s.role === 'architect' && h1.length > 0 && !t.errs.length, JSON.stringify({ s, h1, errs: t.errs.slice(0, 2) }));
  await t.page.unroute('**/*'); await t.close(); }
await done();
