#!/usr/bin/env node
// The Site Champion as a dedicated role (founder, 11 Nov 2026), against the built demo: its own start page and its own site; the four
// things a champion does, each written to the shared workspace and surviving a reload; the attestation from a room's label; what the
// role is refused (the dossier, commissioning, jobs, engineering mode) with the access page and no code downloaded; and that no other
// role can open the champion's site. Run in both schemes:
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/demo-champion.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-champion');
const clean = (t) => t.errs.length === 0 && t.off.length === 0;
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const said = async (p) => { await p.waitForSelector('[data-testid=site-done]'); return p.innerText('[data-testid=site-done]'); };

{ const t = await open('#/home', { role: 'sitechamp' }); const p = t.page; await p.waitForSelector('[data-testid=home]'); await p.waitForTimeout(500);
  const d = await p.evaluate(() => ({ start: document.querySelector('[data-testid=home]')?.getAttribute('data-start'), kicker: document.querySelector('[data-testid=home] .kicker')?.textContent || '', h1: document.querySelector('main h1')?.textContent || '', sum: document.querySelector('[data-testid=rh-summary]')?.textContent || '', ava: document.querySelector('[data-testid=viewas-open] .ava')?.textContent, role: document.documentElement.dataset.role, jumps: [...document.querySelectorAll('[data-testid=rh-jump] a')].map((a) => a.getAttribute('href')) }));
  ok('SC-01', 'the Site Champion starts on “My site”, its own page, wearing its own initials, with a sentence about its site and what it does not do', d.start === 'sitechamp' && d.kicker.includes('My site') && d.ava === 'SC' && d.role === 'sitechamp' && /You do not change settings, run tests or approve/.test(d.sum) && d.jumps[0] === '#/site', JSON.stringify(d).slice(0, 300));
  const m = await main(p);
  ok('SC-02', 'the start page shows no health score and no money', !/\/100|\$\d|Campus health|Funding/.test(m));
  await p.click('[data-testid=rh-primary]'); await p.waitForSelector('[data-testid=site]');
  ok('SC-03', '“start here” opens the champion’s site: one site, its rooms, its visits, who supports it', await p.getAttribute('[data-testid=site]', 'data-site') === 'ATL' && await p.locator('[data-testid=site-rooms] li').count() > 5 && await p.locator('[data-testid=site-visits] [data-visit]').count() >= 1 && /The Service Manager triages/.test(await p.innerText('[data-testid=site-support]')));
  const visit = await p.getAttribute('[data-testid=site-visits] [data-visit][data-access=open]', 'data-visit');
  await p.click(`[data-visit=${visit}] [data-act=access]`);
  ok('SC-04', 'confirming access for a visit says what happened and what did not, and the visit reads confirmed', /Access confirmed for/.test(await said(p)) && /Nothing else about the job changed/.test(await said(p)) && await p.getAttribute(`[data-visit=${visit}]`, 'data-access') === 'confirmed' && /Access confirmed by the Site Champion/.test(await p.innerText(`[data-visit=${visit}]`)) && await p.locator(`[data-visit=${visit}] [data-act=access]`).count() === 0);
  const room = await p.getAttribute('[data-testid=site-rooms] li', 'data-room');
  await p.click(`[data-room=${room}] [data-act=verify]`); await p.waitForFunction((r) => document.querySelector(`[data-room=${r}]`)?.getAttribute('data-verified') === 'yes', room);
  await p.click(`[data-room=${room}] [data-act=free]`); await p.waitForFunction((r) => /Seen free/.test(document.querySelector(`[data-room=${r}]`)?.textContent || ''), room);
  ok('SC-05', 'a room checked against its record and seen free is shown as a person’s check and observation, with the time', /Checked on site/.test(await p.innerText(`[data-room=${room}]`)) && /Seen free/.test(await p.innerText(`[data-room=${room}]`)));
  await p.fill('[data-testid=site-note-text]', 'short'); await p.click('[data-testid=site-note-go]'); await p.waitForSelector('[data-testid=site-refused]');
  ok('SC-06', 'a note of one word is refused in words and what was typed is kept', /in a sentence/.test(await p.innerText('[data-testid=site-refused]')) && await p.inputValue('[data-testid=site-note-text]') === 'short');
  const note = 'The blinds must be down after 3 pm or the camera washes out.';
  await p.fill('[data-testid=site-note-text]', note); await p.click('[data-testid=site-note-go]'); await p.waitForSelector('[data-testid=site-note-list]');
  ok('SC-07', 'a sentence is kept as a candidate awaiting review, never as fact', (await p.innerText('[data-testid=site-note-list]')).includes(note) && /Awaiting review/.test(await p.innerText('[data-testid=site-note-list]')) && /candidate/.test(await said(p)) && await p.inputValue('[data-testid=site-note-text]') === '');
  await p.reload(); await p.waitForSelector('[data-testid=site]');
  ok('SC-08', 'after a reload the confirmation, the check, the observation and the note are all still there', await p.getAttribute(`[data-visit=${visit}]`, 'data-access') === 'confirmed' && await p.getAttribute(`[data-room=${room}]`, 'data-verified') === 'yes' && (await p.innerText('[data-testid=site-note-list]')).includes(note));
  // the ledger has each of them, by the champion
  const led = await p.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).events.filter((e) => e.type.startsWith('site.')).map((e) => `${e.type}:${e.by}:${e.outcome}`));
  ok('SC-09', 'each act is one ledger line by the Site Champion', ['site.access_confirmed', 'site.location_verified', 'site.occupancy_confirmed', 'site.knowledge_contributed'].every((x) => led.includes(`${x}:sitechamp:ALLOWED`)), led.join(' '));
  // attest from the room's label, and report from a room
  await p.evaluate(() => { location.hash = '#/scan/SIM-AV-0042'; }); await p.waitForSelector('[data-testid=scan-attest]');
  await p.fill('[data-testid=scan-attest-word]', 'Two client calls ran here this week without anyone asking for help.'); await p.click('[data-testid=scan-attest-go]'); await p.waitForSelector('[data-testid=scan-attest-done]');
  ok('SC-10', 'the champion attests from the room’s label; the page says it approves nothing', /does not approve anything by itself/.test(await p.innerText('[data-testid=scan-attest-done]')) && await p.locator('[data-testid=scan-acceptance]').count() === 0);
  await p.evaluate(() => { location.hash = '#/here/R-ATL-4-218?step=history'; }); await p.waitForSelector('[data-testid=here-history]', { timeout: 8000 }).catch(() => undefined);
  ok('SC-11', 'in a room the champion reads its history (as someone who knows the room) and is shown no asset codes', await p.locator('[data-testid=here-history]').count() === 1 && await p.locator('[data-testid=here-units]').count() === 0);
  ok('SC-12', 'no console error, nothing leaves the page', clean(t), t.errs.join(' | ')); await t.close(); }

// what the title does not bring
{ const refused = []; const leaked = [];
  for (const [hash, chunk] of [['#/dossier/SIM-REPORT-2026-11-08-001', /Dossier/], ['#/commissioning', /Commission/], ['#/servicehands', /ServiceHands/], ['#/service', /Dispatch/], ['#/builder', /Builder/], ['#/ledger', /Ledger/], ['#/control/R-ATL-4-218?mode=engineer', null], ['#/pro/issues', null], ['#/budget', null]]) {
    const t = await open(hash, { role: 'sitechamp' }); await t.page.waitForTimeout(600);
    if (await t.page.locator('[data-testid=access-page]').count() !== 1) refused.push(hash);
    if (chunk && t.reqs.some((u) => /chunks\//.test(u) && chunk.test(u))) leaked.push(hash);
    await t.close(); }
  ok('SC-13', 'the champion is refused the dossier, commissioning, the job board, dispatch, the builder, the ledger, Engineer mode, the issue register and the budget', refused.length === 0, refused.join(' '));
  ok('SC-14', 'and never downloads the code of a page it is refused', leaked.length === 0, leaked.join(' '));
  const opensFor = []; for (const hash of ['#/here', '#/lite', '#/request', '#/servicehands/new', '#/search', '#/control/R-ATL-4-218', '#/scan/SIM-AV-0042']) { const t = await open(hash, { role: 'sitechamp' }); await t.page.waitForTimeout(600); if (await t.page.locator('[data-testid=access-page]').count() !== 0 || !(await t.page.locator('main h1').count())) opensFor.push(hash); await t.close(); }
  ok('SC-15', 'it opens what an employee opens: a room, Lite, the request portal, a report, search, the room’s panel, a label', opensFor.length === 0, opensFor.join(' ')); }

// nobody else has a site
{ const got = []; for (const role of ['employee', 'visitor', 'service', 'svcmgr', 'syseng', 'ops', 'exec', 'architect', 'qa']) { const t = await open('#/site', { role }); await t.page.waitForTimeout(500); if (await t.page.locator('[data-testid=access-page]').count() !== 1 || await t.page.locator('[data-testid=site]').count() !== 0) got.push(role); await t.close(); }
  ok('SC-16', 'no other role opens the champion’s site, not the Employee and not the Product Architect', got.length === 0, got.join(' '));
  const e = await open('#/scan/SIM-AV-0042', { role: 'employee' }); await e.page.waitForSelector('[data-testid=scan-passport]');
  ok('SC-17', 'the Employee is no longer offered the attestation', await e.page.locator('[data-testid=scan-attest]').count() === 0); await e.close(); }

// View as, and a phone
{ const t = await open('#/investor', { role: 'architect' }); const p = t.page; await p.click('[data-testid=viewas-open]'); await p.waitForSelector('[data-testid=viewas-sheet]');
  const b = await p.evaluate(() => { const x = document.querySelector('[data-testid=viewas-sheet] [data-role-key=sitechamp]'); const prev = x?.previousElementSibling; return x ? { text: x.innerText.replace(/\s+/g, ' '), after: prev?.getAttribute('data-role-key') } : null; });
  ok('SC-18', 'View as lists the Site Champion beside the Employee, with its domain', !!b && /Site Champion/.test(b.text) && /Site/.test(b.text), JSON.stringify(b));
  await p.click('[data-testid=viewas-sheet] [data-role-key=sitechamp]'); await p.waitForTimeout(500);
  ok('SC-19', 'choosing it switches the view and says it grants nothing', await p.evaluate(() => document.documentElement.dataset.role) === 'sitechamp' && /Now viewing as Site Champion/.test(await p.evaluate(() => document.getElementById('route-announcer').textContent)) && /grants nothing/.test(await p.evaluate(() => document.getElementById('route-announcer').textContent)));
  await t.close();
  for (const w of [390, 320]) { const ph = await open('#/site', { role: 'sitechamp', w, h: 844 }); await ph.page.waitForSelector('[data-testid=site]');
    const small = await ph.page.$$eval('main .sc button, main .sc a.ui-btn, main .sc select', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 44; }).length);
    ok(`SC-20-${w}`, `at ${w}px the site page does not scroll sideways, has one h1 and every control is at least 44 px tall`, await over(ph.page) <= 0 && await ph.page.locator('main h1').count() === 1 && small === 0 && clean(ph), `over=${await over(ph.page)} small=${small}`); await ph.close(); } }
await done();
