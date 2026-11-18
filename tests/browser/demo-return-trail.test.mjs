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
await done();
