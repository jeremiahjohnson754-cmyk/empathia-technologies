#!/usr/bin/env node
// Context-preserving navigation (task #223; founder 18 Nov 2026 12:27: "Someone should be able to move from a room to Search Party, into
// ServiceHands, and back to the original room without losing the task they were doing"). The founder's journey, pressed through the real
// pages at a phone (390 × 844) and a desktop (1440 × 900): a room on its Devices tab, scrolled; Search Party from the room; ServiceHands
// intake from Search Party, half filled; back to the room by the trail chip (same tab, same scroll); back to the report (same answers);
// browser Back; a refresh; a role that may not open a place is never offered it. Light by default; PW_COLOR_SCHEME=dark for the dark run.
//   node tests/browser/demo-return-trail.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-return-trail');
const ROOM = 'R-ATL-4-218';
const sel = (p) => p.evaluate(() => document.querySelector('main [role=tab][aria-selected=true]')?.textContent?.trim() || '');
const sy = (p) => p.evaluate(() => Math.round(scrollY));
const headClear = (p) => p.evaluate(() => { const h = document.querySelector('main h1')?.getBoundingClientRect(); const bar = document.querySelector('.shell__bar')?.getBoundingClientRect(); return !!h && !!bar && h.top >= bar.bottom - 1 && h.bottom <= innerHeight; });
const chip = (p) => p.evaluate(() => { const a = document.querySelector('[data-testid=trail-back]'); return a ? { to: a.getAttribute('data-to'), text: (a.textContent || '').replace(/\s+/g, ' ').trim() } : null; });

for (const [w, h, tag] of [[390, 844, 'phone'], [1440, 900, 'desktop']]) {
  const t = await open(`#/room/${ROOM}`, { role: 'svcmgr', sw: false, w, h }); const p = t.page; p.setDefaultTimeout(15000);
  await p.waitForSelector('main h1'); await p.waitForTimeout(800);
  // the task in the room: the Devices tab, scrolled down the list
  await p.locator('main [role=tab]', { hasText: /^Devices/ }).first().click(); await p.waitForTimeout(500);
  const tab0 = await sel(p); const roomHash = await p.evaluate(() => location.hash);
  await p.evaluate(() => scrollTo(0, Math.min(700, document.documentElement.scrollHeight - innerHeight))); await p.waitForTimeout(500); const y0 = await sy(p);
  ok(`RT-${tag}-01`, 'the room on its Devices tab, scrolled into the list (the task in progress)', /Devices/.test(tab0) && y0 > 200, `${tab0} · ${roomHash} · y ${y0}`);

  await p.locator(`main a[href="#/search?focus=Room:${ROOM}"]`).first().click(); await p.waitForTimeout(1200);
  const c1 = await chip(p);
  ok(`RT-${tag}-02`, 'Search Party from the room opens at its top with the heading in view (not under the bar), and offers the way back to the room', (await p.evaluate(() => location.hash)) === `#/search?focus=Room:${ROOM}` && (await sy(p)) <= 2 && (await headClear(p)) && !!c1 && c1.to === roomHash && /Back to .*4\.218/.test(c1.text) && /Devices/.test(c1.text), JSON.stringify({ y: await sy(p), c1 }));

  await p.getByTestId('sp-room-report').click(); await p.waitForTimeout(1200);
  ok(`RT-${tag}-03`, 'from the room in Search Party straight into ServiceHands intake for that room; the chip still leads back to the room', (await p.evaluate(() => location.hash)) === `#/servicehands/new?room=${ROOM}` && (await p.getByTestId('in-room').inputValue()) === ROOM && (await chip(p))?.to === roomHash, await p.evaluate(() => location.hash));
  await p.getByTestId('in-category').selectOption({ index: 1 }); await p.getByTestId('in-title').fill('Display flickers during calls (synthetic)'); await p.waitForTimeout(300);

  await p.getByTestId('trail-back').click(); await p.waitForTimeout(1500);
  const y1 = await sy(p);
  ok(`RT-${tag}-04`, 'the chip returns to the room exactly as it was: same address, Devices tab, same scroll', (await p.evaluate(() => location.hash)) === roomHash && /Devices/.test(await sel(p)) && Math.abs(y1 - y0) <= 40, `tab ${await sel(p)} · y ${y1} (was ${y0})`);

  const c2 = await chip(p);
  ok(`RT-${tag}-05`, 'in the room, the chip now offers the unfinished report', !!c2 && /servicehands\/new/.test(c2.to || '') && /Report a problem/.test(c2.text), JSON.stringify(c2));
  await p.getByTestId('trail-back').click(); await p.waitForTimeout(1200);
  ok(`RT-${tag}-06`, 'the report comes back as left (title and category kept in this tab), saying nothing was sent', (await p.getByTestId('in-title').inputValue()) === 'Display flickers during calls (synthetic)' && (await p.getByTestId('in-category').inputValue()) !== '' && /Nothing has been sent/.test(await p.getByTestId('intake-draft').innerText()), await p.getByTestId('in-title').inputValue());

  await p.goBack(); await p.waitForTimeout(1500);
  ok(`RT-${tag}-07`, 'browser Back from the report returns to the room at the scroll it was left at', (await p.evaluate(() => location.hash)) === roomHash && Math.abs((await sy(p)) - y0) <= 40, `${await p.evaluate(() => location.hash)} · y ${await sy(p)}`);
  await p.reload(); await p.waitForSelector('main h1'); await p.waitForTimeout(1800);
  ok(`RT-${tag}-08`, 'a refresh keeps the room, its tab and its scroll', /Devices/.test(await sel(p)) && Math.abs((await sy(p)) - y0) <= 40, `y ${await sy(p)}`);

  await p.getByTestId('trail-forget').click(); await p.waitForTimeout(300);
  ok(`RT-${tag}-09`, '“Forget” removes that place from the trail', !(await chip(p)) || !/servicehands\/new/.test((await chip(p)).to), JSON.stringify(await chip(p)));
  ok(`RT-${tag}-10`, 'no console error, nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}

{ // a role that may not open a remembered place is never offered it (the chip is a link; the policy still decides)
  const t = await open(`#/room/${ROOM}`, { role: 'architect', sw: false, w: 1440, h: 900 }); const p = t.page;
  await p.waitForSelector('main h1'); await p.waitForTimeout(900);
  await p.evaluate(() => { localStorage.setItem('empathia.demo.perspective', 'visitor'); location.hash = '#/investor'; }); await p.reload(); await p.waitForSelector('main h1'); await p.waitForTimeout(900);
  const c = await chip(p); let landed = 'no chip';
  if (c) { await p.getByTestId('trail-back').click(); await p.waitForTimeout(1000); landed = (await p.getByTestId('access-page').count()) ? 'access page' : await p.evaluate(() => location.hash); }
  ok('RT-role-01', 'viewing as a visitor: the trail offers only places the visitor may open (never a refusal page)', landed !== 'access page', `${JSON.stringify(c)} → ${landed}`);
  await t.close();
}

// 25 Nov 2026 — what the trail keeps, and under what name. Added when the exact-commit regression on 5c6d698f failed RP-20 (a room's
// replay carried "Back to Room not found") and the cause was in the trail, not in the check. Rewritten the same day after an independent
// review found that some of the first version's checks passed because the visitor left before the trail looked, not because of what the
// trail does. Each check below now fails on the faulty trail however fast or slow the run is:
//   - "not kept" is shown by putting the address on the trail first and seeing the page take it off: only the trail's own reading of the
//     page can do that, so leaving early cannot pass it;
//   - "named after itself" waits until the name is there; "never named after the next page" holds the first page's code back, so the
//     visitor really does leave a page that has not drawn.
const marks = (p) => p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('empathia.trail.v1') || '[]').map((m) => ({ path: m.path, hash: m.hash, label: m.label })); } catch { return []; } });
const seed = (p, list) => p.evaluate((l) => { sessionStorage.setItem('empathia.trail.v1', JSON.stringify(l.map((h, i) => ({ path: h.split('?')[0], hash: h, label: `seeded ${i}`, sub: '', sy: 0, at: Date.now() })))); }, list);
const settled = (p) => p.waitForFunction(() => { const m = document.querySelector('main'); return !!m && !m.querySelector('[data-trail-wait], [aria-busy=true]') && m.innerText.trim().length > 20; }, null, { timeout: 15000 }).catch(() => undefined);
{ // every address that counts as a place of work, opened with an identifier that does not exist
  const GONE = ['#/assurance/room/R-NOPE', '#/commissioning/room/R-NOPE', '#/campus/atlas/4/R-NOPE', '#/control/R-NOPE', '#/scheduler/R-NOPE', '#/ledger/agent/R-NOPE', '#/studio/room/R-NOPE', '#/forge/room/R-NOPE', '#/guide/room/R-NOPE', '#/here/R-NOPE',
    '#/replay/R-NOPE', '#/room/R-NOPE', '#/servicehands/wo/WO-NOPE', '#/voice/callpath/R-NOPE', '#/voice/report/R-NOPE', '#/film/nope', '#/play/nope', '#/story/nope', '#/optimizer/stadium/R-NOPE?as=stadium.av_it_engineer',
    '#/gameday/incident/F-NOPE?as=stadium.broadcast_engineer', '#/v25/fi/scan/R-NOPE', '#/learn/story/R-NOPE', '#/instant/R-NOPE', '#/labs/mix/R-NOPE'];
  const t = await open('#/families', { role: 'architect', sw: false }); const p = t.page; const bad = []; let said = 0;
  for (const a of GONE) {
    await seed(p, [a]); await p.evaluate((h) => { location.hash = h; }, a); await settled(p);
    const st = await p.evaluate(() => ({ refused: !!document.querySelector('[data-testid=access-page]'), missing: !!document.querySelector('main [data-missing]'), h1: (document.querySelector('main h1')?.textContent || '').trim().slice(0, 40) }));
    if (st.refused) { bad.push(`${a}: refused, so its unknown state was not reached`); continue; }
    if (st.missing) said += 1; else { bad.push(`${a}: the page does not say its subject is missing (“${st.h1}”)`); continue; }
    // the trail takes the seeded entry off when it reads the page: wait for that (it cannot happen by leaving)
    await p.waitForFunction((path) => !JSON.parse(sessionStorage.getItem('empathia.trail.v1') || '[]').some((m) => m.path === path), a.split('?')[0], { timeout: 6000 }).catch(() => undefined);
    await p.evaluate(() => { location.hash = '#/families'; }); await p.waitForTimeout(300);
    const path = a.split('?')[0]; const kept = (await marks(p)).find((m) => m.path === path); const c = await chip(p);
    if (kept) bad.push(`${a}: still kept as “${kept.label}”`); if (c && (c.to || '').split('?')[0] === path) bad.push(`${a}: offered as “${c.text}”`);
  }
  ok('RT-gone-01', `an address whose page says there is no such room, work order, chapter or fault is not a place of work: each of the ${GONE.length} says so, and an entry for it already on the trail is taken off by the page itself`, !bad.length && said === GONE.length, bad.slice(0, 4).join(' | ') || `${said} of ${GONE.length}`);
  // a page that refuses one view of a place (?as=…) does not take off the real view kept at the same path
  const real = '#/optimizer/stadium/STA-PCR?as=stadium.av_it_engineer';
  await p.evaluate(() => sessionStorage.removeItem('empathia.trail.v1')); await p.evaluate((h) => { location.hash = h; }, real); await settled(p);
  await p.waitForFunction((h) => JSON.parse(sessionStorage.getItem('empathia.trail.v1') || '[]').some((m) => m.hash === h && !/^seeded|where you were/.test(m.label)), real, { timeout: 8000 }).catch(() => undefined);
  const kept1 = (await marks(p)).find((m) => m.hash === real);
  await p.evaluate(() => { location.hash = '#/optimizer/stadium/STA-PCR?as=stadium.fan'; }); await p.waitForSelector('[data-testid=optimizer-gate]').catch(() => undefined); await settled(p); await p.waitForTimeout(800);
  await p.evaluate(() => { location.hash = '#/families'; }); await p.waitForTimeout(400); const after1 = await marks(p); const c1 = await chip(p);
  ok('RT-gone-02', 'the same room’s optimizer opened as a fan (its gate: not shown to the fan) leaves the engineer’s view of it on the trail, at the engineer’s address', !!kept1 && after1.some((m) => m.hash === real && m.label === kept1.label) && !!c1 && c1.to === real, JSON.stringify({ kept1, after1, c1 }));
  // a place kept earlier that no longer exists (a workspace that was reset) is forgotten when its page says so
  await p.evaluate(() => { sessionStorage.setItem('empathia.trail.v1', JSON.stringify([{ path: '#/servicehands/wo/WO-NOPE', hash: '#/servicehands/wo/WO-NOPE', label: 'Work order WO-NOPE', sub: '', sy: 0, at: Date.now() }])); location.hash = '#/families'; }); await p.reload(); await p.waitForSelector('main h1'); await p.waitForTimeout(500);
  const before = await chip(p); await p.getByTestId('trail-back').click().catch(() => undefined); await settled(p); await p.waitForTimeout(600); await p.evaluate(() => { location.hash = '#/families'; }); await p.waitForTimeout(400);
  ok('RT-gone-03', 'a place that was on the trail and is gone (its page now says “Not found”) is forgotten after the visit that found it gone', !!before && /WO-NOPE/.test(before.to || '') && !(await marks(p)).length && !(await chip(p)), JSON.stringify({ before, after: await marks(p) }));
  ok('RT-gone-04', 'no console error, nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
{ // a place is named from its own drawn page: not the loading placeholder, not the page the visitor went to next, not a failure
  const t = await open('#/families', { role: 'architect', sw: false }); const p = t.page; const ctx = t.ctx; const waitName = (path, re) => p.waitForFunction(([x, r]) => JSON.parse(sessionStorage.getItem('empathia.trail.v1') || '[]').some((m) => m.path === x && new RegExp(r).test(m.label)), [path, re], { timeout: 15000 }).catch(() => undefined);
  // the replay's code held back 6 s on its first visit: slower than the four seconds the first correction gave up after
  let held = 0; await ctx.route(/\.js(\?|$)/, async (r) => { held += 1; await new Promise((z) => setTimeout(z, 6000)); await r.continue().catch(() => undefined); });
  await p.evaluate(() => { location.hash = '#/replay/R-ATL-4-218'; });
  const placeholder = await p.waitForSelector('main [data-trail-wait], main [aria-busy=true]', { timeout: 4000 }).then(() => true).catch(() => false);
  const during = await marks(p); await ctx.unroute(/\.js(\?|$)/);
  await p.waitForSelector('[data-testid=replay]', { timeout: 20000 }).catch(() => undefined); await waitName('#/replay/R-ATL-4-218', 'Atlas 4\\.218');
  const first = (await marks(p)).find((m) => m.path === '#/replay/R-ATL-4-218');
  ok('RT-name-01', 'a place whose code takes six seconds to arrive on its first visit is named after itself once it draws (“Replay: Atlas 4.218 …”); while it loads, nothing is named after the placeholder', placeholder && held > 0 && !during.some((m) => m.path === '#/replay/R-ATL-4-218') && !!first && /^Replay: Atlas 4\.218/.test(first.label), JSON.stringify({ placeholder, held, during, first }));
  // left before it drew: the incident replay's code is held back, the visitor goes on to a room
  await p.evaluate(() => { sessionStorage.removeItem('empathia.trail.v1'); location.hash = '#/families'; }); await p.waitForTimeout(300);
  await ctx.route(/\.js(\?|$)/, async (r) => { await new Promise((z) => setTimeout(z, 3000)); await r.continue().catch(() => undefined); });
  await p.evaluate(() => { location.hash = '#/v25/fi/scan/R-ATL-4-218'; }); const left = await p.waitForSelector('main [data-trail-wait], main [aria-busy=true]', { timeout: 4000 }).then(() => true).catch(() => false);
  await p.evaluate(() => { location.hash = '#/room/R-ATL-4-218'; }); await ctx.unroute(/\.js(\?|$)/); await settled(p); await waitName('#/room/R-ATL-4-218', 'Atlas 4\\.218'); await p.waitForTimeout(3500);
  const ms = await marks(p); const scan = ms.find((m) => m.path === '#/v25/fi/scan/R-ATL-4-218'); const room = ms.find((m) => m.path === '#/room/R-ATL-4-218');
  ok('RT-name-02', 'a place left while its page was still loading is not kept, and never under the next page’s name; the page the visitor stayed on is kept under its own', left && !scan && !!room && /Atlas 4\.218/.test(room.label), JSON.stringify({ left, ms, DIAG: await p.evaluate(() => { const m = document.querySelector('main'); return { hash: location.hash, h1: m?.querySelector('h1')?.textContent?.slice(0, 60) || null, wait: [...(m?.querySelectorAll('[data-trail-wait], [aria-busy=true]') || [])].map((e) => e.outerHTML.slice(0, 160)), missing: !!m?.querySelector('[data-missing]'), text: (m?.innerText || '').slice(0, 120) }; }) }));
  // a page whose code could not be fetched: the failure is not a place. Control loads by a plain import(), which the browser will not
  // fetch again in this document, so Try again fails a second time and the page then offers a reload (App.tsx, 25 Nov 2026); after the
  // reload it is kept under its own name.
  await p.evaluate(() => { sessionStorage.removeItem('empathia.trail.v1'); location.hash = '#/families'; }); await p.waitForTimeout(300);
  await ctx.route(/\.js(\?|$)/, (r) => r.abort());
  await p.evaluate(() => { location.hash = '#/control/R-ATL-4-218'; }); const failed = await p.waitForSelector('main .loadfail', { timeout: 15000 }).then(() => true).catch(() => false); await p.waitForTimeout(1500);
  const whileFailed = await marks(p); const reload0 = await p.locator('main .loadfail button', { hasText: 'Reload the page' }).count(); await ctx.unroute(/\.js(\?|$)/);
  await p.locator('main .loadfail button', { hasText: 'Try again' }).click().catch(() => undefined); await p.waitForTimeout(2500);
  const again = await p.locator('main .loadfail[data-attempts="2"]').count(); const whileFailed2 = await marks(p);
  await p.locator('main .loadfail button', { hasText: 'Reload the page' }).click().catch(() => undefined); await p.waitForLoadState('load'); await settled(p); await waitName('#/control/R-ATL-4-218', 'Atlas 4\\.218');
  const named = (await marks(p)).find((m) => m.path === '#/control/R-ATL-4-218');
  ok('RT-name-03', 'a page whose code failed to arrive is never kept under the failure (“… did not load”), after one failure or two; once the connection is back, a second failure offers a reload (one Try again cannot fetch that code again), and after it the page is kept under its own name', failed && reload0 === 0 && again === 1 && !whileFailed.length && !whileFailed2.length && !!named && /Atlas 4\.218/.test(named.label), JSON.stringify({ failed, reload0, again, whileFailed, whileFailed2, named }));
  // a refused page is not a place the role worked in, whether the shell refuses it or the page's own gate does
  await p.evaluate(() => { sessionStorage.removeItem('empathia.trail.v1'); location.hash = '#/gameday/incident/camera-feed?as=stadium.fan'; }); await p.waitForSelector('[data-testid=access-page]'); await p.waitForTimeout(1200);
  const refused = await marks(p);
  await p.evaluate(() => { location.hash = '#/optimizer/stadium/STA-PCR?as=stadium.fan'; }); await p.waitForSelector('[data-testid=optimizer-gate]'); await p.waitForTimeout(1200);
  ok('RT-name-04', 'a page the role is refused, by the shell or by the page’s own gate, is not kept on the trail under the refusal’s heading', !refused.length && !(await marks(p)).length, JSON.stringify([refused, await marks(p)]));
  ok('RT-name-05', 'no page error, nothing requested off the page', !t.errs.filter((e) => !/Failed to fetch|dynamically imported module|ERR_FAILED|net::/i.test(e)).length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
// 25 Nov 2026 05:07 CT, the founder: the return-trail tests must cover rapid navigation between products; slow-loading pages and
// throttled processors; role changes and restricted destinations; deleted or nonexistent entities (RT-gone-01..03 above); and the
// preservation of legitimate navigation history; and the authorization review must verify actual access enforcement, not merely
// whether restricted destinations appear. The checks below are the ones that were missing.
const cdpThrottle = async (t, rate) => { const c = await t.ctx.newCDPSession(t.page); await c.send('Emulation.setCPUThrottlingRate', { rate }); return c; };
const ownHeading = (p) => p.evaluate(() => (document.querySelector('main h1')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80));
for (const rate of [1, 6]) { // rapid navigation across six products, on an ordinary and a six-times-throttled processor
  const tag = rate === 1 ? 'fast' : 'throttled'; const t = await open('#/families', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000); if (rate > 1) await cdpThrottle(t, rate);
  const ROUTE = ['#/room/R-ATL-4-218', '#/search?focus=Room:R-ATL-4-218', '#/servicehands/new?room=R-ATL-4-218', '#/replay/R-HZN-1-500', '#/replay/R-NOPE', '#/voice/callpath/R-ATL-4-218', '#/ledger/agent/R-ATL-4-218', '#/room/R-HZN-1-500'];
  // each address entered 150 ms after the last, as a person tapping through quickly does: most pages are left before they have drawn
  for (const h of ROUTE) { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(150); }
  await settled(p); await p.waitForTimeout(rate > 1 ? 5000 : 2000);
  const kept = await marks(p); const last = kept.find((m) => m.path === '#/room/R-HZN-1-500');
  // every place on the trail must be named after its own page: open each and compare its heading with the name it was kept under
  const wrong = []; for (const m of kept) { await p.evaluate((x) => { location.hash = x; }, m.hash); await settled(p); await p.waitForTimeout(rate > 1 ? 1500 : 500); const h = await ownHeading(p); if (h !== m.label) wrong.push(`${m.hash}: kept as “${m.label}”, its page says “${h}”`); }
  ok(`RT-${tag}-01`, `tapping through eight addresses in six products, 150 ms apart${rate > 1 ? ', on a processor slowed six times' : ''}: the page the visitor stopped on is kept, the unknown room is not, and every place kept is named after its own page`, !!last && !kept.some((m) => /R-NOPE/.test(m.path)) && !wrong.length, JSON.stringify({ kept: kept.map((m) => `${m.hash} = ${m.label}`), wrong }).slice(0, 600));
  // then the founder's own journey, at that pace: the room on a tab, scrolled; Search Party; ServiceHands intake; back to the room as it was
  await p.evaluate(() => { sessionStorage.removeItem('empathia.trail.v1'); location.hash = '#/room/R-ATL-4-218'; }); await settled(p); await p.waitForTimeout(rate > 1 ? 2000 : 600);
  await p.locator('main [role=tab]', { hasText: /^Devices/ }).first().click(); await p.waitForTimeout(rate > 1 ? 1500 : 500);
  const roomHash = await p.evaluate(() => location.hash); await p.evaluate(() => scrollTo(0, Math.min(700, document.documentElement.scrollHeight - innerHeight))); await p.waitForTimeout(rate > 1 ? 1500 : 600); const y0 = await p.evaluate(() => Math.round(scrollY));
  await p.evaluate(() => { location.hash = '#/search?focus=Room:R-ATL-4-218'; }); await p.waitForTimeout(150); await p.evaluate(() => { location.hash = '#/servicehands/new?room=R-ATL-4-218'; }); await settled(p); await p.waitForTimeout(rate > 1 ? 2500 : 800);
  const c = await chip(p); await p.getByTestId('trail-back').click().catch(() => undefined); await settled(p); await p.waitForTimeout(rate > 1 ? 3500 : 1500);
  const back = { hash: await p.evaluate(() => location.hash), tab: await sel(p), y: await p.evaluate(() => Math.round(scrollY)) };
  ok(`RT-${tag}-02`, `the founder’s journey${rate > 1 ? ' on the slowed processor' : ''}, Search Party left at once: the chip still leads back to the room exactly as it was (address, Devices tab, scroll)`, !!c && c.to === roomHash && /Devices/.test(c.text) && back.hash === roomHash && /Devices/.test(back.tab) && Math.abs(back.y - y0) <= 40, JSON.stringify({ c, roomHash, y0, back }));
  ok(`RT-${tag}-03`, 'no console error, nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
{ // role changes, and what a role is refused: kept places are offered only where the policy lets the role go, and the policy, not the chip, decides
  const t = await open('#/families', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  // a role change while a place is still loading, to a role refused there: the place is not kept under the refusal
  await t.ctx.route(/\.js(\?|$)/, async (r) => { await new Promise((z) => setTimeout(z, 2500)); await r.continue().catch(() => undefined); });
  await p.evaluate(() => { location.hash = '#/replay/R-ATL-4-218'; }); const loading = await p.waitForSelector('main [data-trail-wait], main [aria-busy=true]', { timeout: 4000 }).then(() => true).catch(() => false);
  await p.selectOption('.persp select', 'visitor'); await t.ctx.unroute(/\.js(\?|$)/); await p.waitForTimeout(3500);
  const asVisitor = await marks(p); const visitorChip = await chip(p);
  await p.selectOption('.persp select', 'svcmgr'); await p.waitForTimeout(1500); const svcChip = await chip(p);
  ok('RT-role-02', 'switching role while a place is still loading: nothing is kept under a refusal or under the role’s home page, and the visitor is offered no way back into it', loading && !asVisitor.some((m) => /not open|not part/i.test(m.label)) && !(visitorChip && /replay/.test(visitorChip.to || '')) && !(svcChip && /not open|not part/i.test(svcChip.text)), JSON.stringify({ loading, asVisitor, visitorChip, svcChip }));
  // a place kept by one role, then a role that may not open it: not offered; and if its address is opened anyway, the policy refuses it
  // before the page's code is fetched (D44): the destination is enforced, not just left out of the interface
  await p.evaluate(() => { sessionStorage.removeItem('empathia.trail.v1'); location.hash = '#/servicehands/wo/WO-0088'; }); await settled(p); await p.waitForTimeout(800);
  await p.evaluate(() => { location.hash = '#/replay/R-ATL-4-218'; }); await settled(p); await p.waitForTimeout(800);
  const keptBy = await marks(p);
  await p.selectOption('.persp select', 'visitor'); await p.waitForTimeout(1500); const offered = await chip(p);
  const before = t.reqs.length; const res = []; for (const m of keptBy) { await p.evaluate((x) => { location.hash = x; }, m.hash); await p.waitForTimeout(1200); res.push({ to: m.hash, refused: (await p.getByTestId('access-page').count()) === 1, h1: await ownHeading(p) }); }
  const fetched = t.reqs.slice(before).filter((u) => /\.js(\?|$)/.test(u));
  ok('RT-role-03', 'places kept by the service manager are not offered to the visitor; opened by address anyway, each is refused by the policy, and none of their code is fetched for the visitor', keptBy.length >= 1 && !(offered && keptBy.some((m) => m.hash === offered.to)) && res.length === keptBy.length && res.every((r) => r.refused) && !fetched.length, JSON.stringify({ keptBy, offered, res, fetched }).slice(0, 600));
  await p.selectOption('.persp select', 'svcmgr'); await p.waitForTimeout(1500); const c2 = await chip(p);
  ok('RT-role-04', 'back as the service manager, the places it kept are offered again, under their own names (a role change forgets nothing legitimate)', !!c2 && keptBy.some((m) => m.hash === c2.to && c2.text.includes(m.label)), JSON.stringify({ c2, keptBy }));
  ok('RT-role-05', 'no console error, nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}

// 25 Nov 2026 (commercial readiness, an external review read "Back to Meridian 1.140" on the start page as left over from someone else):
// on the start page the chip says what it is, this session's own last place of work; on any other page it stays the way back
const fromRoom = async (to) => { const t = await open('#/campus/MER/1/R-MER-1-140', { role: 'architect', sw: false, w: 1440, h: 900 }); const p = t.page; p.setDefaultTimeout(15000);
  await p.waitForSelector('main h1'); await p.waitForTimeout(900);
  await p.evaluate((x) => { location.hash = x; }, to); await p.waitForSelector('[data-testid=trail-back]'); await p.waitForTimeout(400);
  const c = await chip(p); const bad = [...t.errs, ...t.off]; await t.close(); return { c, bad }; };
{ const home = await fromRoom('#/home'); const campus = await fromRoom('#/campus');
  ok('RT-start-01', 'from Meridian 1.140, the start page’s chip reads "Continue where you left off:" and the room; another page’s reads "Back to" the same room', !!home.c && /^Continue where you left off: /.test(home.c.text) && /1\.140/.test(home.c.text) && !!campus.c && /^Back to /.test(campus.c.text) && campus.c.to === home.c.to, JSON.stringify({ home: home.c, campus: campus.c }));
  ok('RT-start-02', 'no console error, nothing requested off the page', !home.bad.length && !campus.bad.length, [...home.bad, ...campus.bad].slice(0, 3).join(' | '));
}
await done();
