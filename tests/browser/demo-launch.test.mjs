#!/usr/bin/env node
// Arriving from the corporate website (#232; founder directive 18 Nov 2026 17:25 §6, "Open This Exact Demonstration"), as a visitor
// would: a typed launch opens the exact room, device and view, shown as the launch's perspective, with a strip that says where the
// visitor came from, offers their previous view back and links to the exact website page they left. Every catalogued launch opens
// without an access page. A reload keeps what the visitor chose since; an unknown launch changes nothing; a way back that is not a
// website path is never followed (no open redirect).
//   node tests/browser/demo-launch.test.mjs     (PW_COLOR_SCHEME=dark for the dark run)
import { harness, repo } from './demo-shell-lib.mjs';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const { ok, open, done } = await harness('demo-launch');
const L = await import(pathToFileURL(path.join(repo, 'packages/ui/src/launches.ts')).href);
const hashOf = (l, back) => L.launchHref('', l, back).replace(/^\/#/, '#');
const role = (p) => p.evaluate(() => document.documentElement.getAttribute('data-role'));
const strip = (p) => p.evaluate(() => { const s = document.querySelector('[data-testid=launch-strip]'); return s ? { id: s.dataset.launch, here: s.dataset.here, t: s.querySelector('.ls-strip__t')?.textContent || '', back: s.querySelector('[data-testid=launch-back]')?.getAttribute('href') || '', prev: s.querySelector('[data-testid=launch-prev]')?.textContent || '' } : null; });

// ── the Lite stage: as a Visitor before, the Systems Engineer after, the microphone selected, the way back to /platform#follow-lite ─────
{ const lite = L.FOLLOW[0]; const t = await open(hashOf(lite, '/platform#follow-lite'), { role: 'visitor' }); const p = t.page;
  await p.waitForSelector('[data-testid=launch-strip]', { timeout: 8000 }).catch(() => undefined); await p.waitForTimeout(400);
  const s = await strip(p); const r = await role(p);
  const dev = await p.evaluate(() => document.querySelector('[data-testid=lite-device]')?.textContent || '');
  ok('LN-01', 'a website launch opens the Lite room as its perspective (Systems Engineer), with ceiling microphone 1 (A-0104) selected', r === 'syseng' && /Ceiling microphone 1/.test(dev) && /A-0104|AS-0103/.test(dev), JSON.stringify({ r, dev: dev.slice(0, 160) }));
  ok('LN-02', 'the strip says it came from the website, names what was opened and the perspective, and that viewing as a role grants nothing', s && s.id === 'follow-lite' && s.here === 'true' && /From the Empathia website:/.test(s.t) && /Atlas 4\.218 in Lite/.test(s.t) && /Shown as Systems Engineer/.test(s.t) && /grants nothing/.test(s.t), JSON.stringify(s));
  ok('LN-03', 'its way back is the exact website page and stage the visitor left', s && /^https?:\/\/[^/]+\/platform#follow-lite$/.test(s.back), s?.back);
  ok('LN-04', 'it offers the visitor’s previous view back', s && s.prev === 'View as Visitor again', s?.prev);
  await p.click('[data-testid=launch-prev]'); await p.waitForTimeout(400);
  const r2 = await role(p); const s2 = await strip(p);
  ok('LN-05', 'taking the previous view back switches to it, and the strip stops offering it', r2 === 'visitor' && s2 && !s2.prev, JSON.stringify({ r2, s2 }));
  await p.reload(); await p.waitForTimeout(900);
  ok('LN-06', 'a reload of the same arrival does not switch the perspective again: the visitor’s own choice stands', (await role(p)) === 'visitor', await role(p));
  await p.goto(p.url().split('#')[0] + '#/search'); await p.waitForTimeout(600);
  const s3 = await strip(p);
  ok('LN-07', 'on another page the way back stays, in one short line, until dismissed', s3 && s3.here === 'false' && /You came from the Empathia website/.test(s3.t) && /\/platform#follow-lite$/.test(s3.back), JSON.stringify(s3));
  await p.click('[data-testid=launch-dismiss]'); await p.waitForTimeout(200);
  await p.reload(); await p.waitForTimeout(700);
  ok('LN-08', 'dismissed, it stays gone', !(await strip(p)), JSON.stringify(await strip(p)));
  ok('LN-09', 'no console error', !t.errs.length, t.errs.join(' | ')); await t.close(); }

// ── every catalogued launch opens its page for its perspective, never the access page ─────────────────────────────────────────────────
{ const bad = [];
  for (const l of L.LAUNCHES) {
    const t = await open(hashOf(l, '/'), { role: 'employee', sw: false }); const p = t.page; await p.waitForTimeout(700);
    const st = await p.evaluate(() => ({ access: !!document.querySelector('[data-testid=access-page]'), missing: !!document.querySelector('[data-testid=not-found]'), h1: document.querySelector('main h1')?.textContent || '', role: document.documentElement.getAttribute('data-role'), strip: document.querySelector('[data-testid=launch-strip]')?.dataset.launch }));
    if (st.access || st.missing || !st.h1 || st.role !== l.perspective || st.strip !== l.id || t.errs.length) bad.push({ id: l.id, ...st, errs: t.errs.slice(0, 2) });
    await t.close();
  }
  ok('LN-10', `all ${L.LAUNCHES.length} catalogued launches open their page as their perspective, with the strip, and no error`, !bad.length, JSON.stringify(bad)); }

// ── links the catalogue does not know, and ways back that are not website paths ───────────────────────────────────────────────────────
{ const t = await open('#/search?from=site&li=not-a-launch&back=%2Fplatform', { role: 'visitor' }); const p = t.page; await p.waitForTimeout(500);
  ok('LN-11', 'an unknown launch id does nothing: no strip, no perspective change', !(await strip(p)) && (await role(p)) === 'visitor', JSON.stringify({ s: await strip(p), r: await role(p) })); await t.close(); }
{ const t = await open(`#/search?focus=Room:R-ATL-4-218&from=site&li=follow-support&back=${encodeURIComponent('https://evil.example/x')}`, { role: 'visitor' }); const p = t.page;
  await p.waitForTimeout(600); const s = await strip(p);
  ok('LN-12', 'a way back that is not a website path is replaced by the website’s home: the strip never links off the website', s && /^https?:\/\/[^/]+\/$/.test(s.back) && !/evil/.test(s.back), s?.back); await t.close(); }

// ── a phone: the strip wraps, its buttons are 44 px, nothing scrolls sideways ────────────────────────────────────────────────────────
{ const t = await open(hashOf(L.FOLLOW[1], '/platform#follow-commissioning'), { role: 'visitor', w: 390, h: 844 }); const p = t.page; await p.waitForTimeout(700);
  const g = await p.evaluate(() => { const s = document.querySelector('[data-testid=launch-strip]'); const r = s?.getBoundingClientRect(); return { over: document.documentElement.scrollWidth - innerWidth, w: r ? Math.round(r.right) : 0, small: [...(s?.querySelectorAll('a, button') || [])].filter((b) => b.getBoundingClientRect().height < 44).length }; });
  ok('LN-13', 'on a phone the strip fits (no sideways scroll) and every action in it is at least 44 px tall', g.over <= 0 && g.w <= 390 && g.small === 0, JSON.stringify(g)); await t.close(); }

await done();
