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
// replay carried "Back to Room not found") and the cause was in the trail, not in the check: it named a place from whatever heading
// was on screen when its timer fired, and it kept addresses whose page says the subject does not exist.
const marks = (p) => p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('empathia.trail.v1') || '[]').map((m) => ({ path: m.path, label: m.label })); } catch { return []; } });
{ // every address that counts as a place of work, opened with an identifier that does not exist
  const GONE = ['#/assurance/room/R-NOPE', '#/commissioning/room/R-NOPE', '#/campus/atlas/4/R-NOPE', '#/control/R-NOPE', '#/scheduler/R-NOPE', '#/ledger/agent/R-NOPE', '#/studio/room/R-NOPE', '#/forge/room/R-NOPE', '#/guide/room/R-NOPE', '#/here/R-NOPE',
    '#/replay/R-NOPE', '#/room/R-NOPE', '#/servicehands/wo/WO-NOPE', '#/voice/callpath/R-NOPE', '#/voice/report/R-NOPE', '#/film/nope', '#/play/nope', '#/story/nope', '#/optimizer/stadium/R-NOPE?as=stadium.av_it_engineer', '#/gameday/incident/F-NOPE?as=stadium.broadcast_engineer'];
  const t = await open('#/families', { role: 'architect', sw: false }); const p = t.page; const bad = []; let said = 0;
  for (const a of GONE) {
    await p.evaluate((h) => { location.hash = h; }, a); await p.waitForFunction(() => !document.querySelector('main [aria-busy=true]') && (document.querySelector('main')?.innerText || '').trim().length > 20, null, { timeout: 8000 }).catch(() => undefined); await p.waitForTimeout(700);
    const st = await p.evaluate(() => ({ refused: !!document.querySelector('[data-testid=access-page]'), missing: !!document.querySelector('main [data-missing]'), h1: (document.querySelector('main h1')?.textContent || '').trim().slice(0, 40) }));
    if (st.refused) { bad.push(`${a}: refused, so its unknown state was not reached`); continue; }
    if (st.missing) said += 1; else bad.push(`${a}: the page does not say its subject is missing (“${st.h1}”)`);
    await p.evaluate(() => { location.hash = '#/families'; }); await p.waitForTimeout(350);
    const path = a.split('?')[0]; const kept = (await marks(p)).find((m) => m.path === path); const c = await chip(p);
    if (kept) bad.push(`${a}: kept as “${kept.label}”`); if (c && (c.to || '').split('?')[0] === path) bad.push(`${a}: offered as “${c.text}”`);
  }
  ok('RT-gone-01', `an address whose page says there is no such room, work order, chapter or fault is not a place of work: none of the ${GONE.length} is kept or offered as “Back to …”`, !bad.length && said === GONE.length, bad.slice(0, 4).join(' | ') || `${said} of ${GONE.length} said so`);
  // a place kept earlier that no longer exists (a workspace that was reset) is forgotten when its page says so
  await p.evaluate(() => { sessionStorage.setItem('empathia.trail.v1', JSON.stringify([{ path: '#/servicehands/wo/WO-NOPE', hash: '#/servicehands/wo/WO-NOPE', label: 'Work order WO-NOPE', sub: '', sy: 0, at: Date.now() }])); location.hash = '#/families'; }); await p.reload(); await p.waitForSelector('main h1'); await p.waitForTimeout(500);
  const before = await chip(p); await p.getByTestId('trail-back').click().catch(() => undefined); await p.waitForTimeout(1200); await p.evaluate(() => { location.hash = '#/families'; }); await p.waitForTimeout(400);
  ok('RT-gone-02', 'a place that was on the trail and is gone (its page now says “Not found”) is forgotten after the visit that found it gone', !!before && /WO-NOPE/.test(before.to || '') && !(await marks(p)).length && !(await chip(p)), JSON.stringify({ before, after: await marks(p) }));
  ok('RT-gone-03', 'no console error, nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
{ // a place is named from its own drawn page: not the loading placeholder, not the page the visitor went to next
  const t = await open('#/families', { role: 'architect', sw: false }); const p = t.page;
  await p.evaluate(() => { location.hash = '#/replay/R-ATL-4-218'; }); await p.waitForSelector('[data-testid=replay]'); await p.waitForTimeout(600);   // first visit: the replay's code is fetched now
  const first = (await marks(p)).find((m) => m.path === '#/replay/R-ATL-4-218');
  ok('RT-name-01', 'a place opened for the first time is named after itself (“Replay: Atlas 4.218 …”), not after the workspace that was still loading', !!first && /Atlas 4\.218/.test(first.label) && first.label !== 'Core Replay', JSON.stringify(first));
  // left at once: two addresses entered in the same instant, the way a quick second tap does
  await p.evaluate(() => { sessionStorage.removeItem('empathia.trail.v1'); location.hash = '#/families'; }); await p.waitForTimeout(400);
  await p.evaluate(() => { location.hash = '#/replay/R-HZN-1-500'; setTimeout(() => { location.hash = '#/room/R-ATL-4-218'; }, 0); }); await p.waitForTimeout(1500);
  const ms = await marks(p); const hzn = ms.find((m) => m.path === '#/replay/R-HZN-1-500'); const room = ms.find((m) => m.path === '#/room/R-ATL-4-218');
  ok('RT-name-02', 'a place left before it had drawn is never offered under the next page’s name: it is not kept, and the page the visitor stayed on is, under its own name', !hzn && !!room && /Atlas 4\.218/.test(room.label), JSON.stringify(ms));
  // a refused page is not a place the role worked in
  await p.evaluate(() => { sessionStorage.removeItem('empathia.trail.v1'); location.hash = '#/gameday/incident/camera-feed?as=stadium.fan'; }); await p.waitForSelector('[data-testid=access-page]'); await p.waitForTimeout(600);
  const refused = await marks(p);
  // …and neither is a page's own gate (the Space Optimizer is a design tool: a fan is shown the gate, and the gate is not a place of work)
  await p.evaluate(() => { location.hash = '#/optimizer/stadium/S-NOPE?as=stadium.fan'; }); await p.waitForSelector('[data-testid=optimizer-gate]'); await p.waitForTimeout(600);
  ok('RT-name-03', 'a page the role is refused, by the shell or by the page’s own gate, is not kept on the trail under the refusal’s heading', !refused.length && !(await marks(p)).length, JSON.stringify([refused, await marks(p)]));
  ok('RT-name-04', 'no console error, nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
await done();
