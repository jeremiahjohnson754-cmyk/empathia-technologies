#!/usr/bin/env node
// Empathia's own rooms in Lite (13 Nov 2026, founder on a stadium suite drawn as V2.5.3's executive boardroom: "This looks terrible …
// don't have my rooms or experiences looking like this"). A Harborlight suite is drawn as a suite — glass front on the bowl, balcony seats,
// drink rail, lounge, bar — with no boardroom table, lectern or presenter zone; every piece says what it is when tapped, equipment names its
// record; it can be seen from where people really are, in perspective, with the bowl beyond the glass; names appear only when asked for;
// a deep link opens an eye position; the seven types whose nearest V2.5.3 layout was wrong are each drawn from their own program.
//   node tests/browser/demo-lite-rooms.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lite-rooms');
const ROOM = '#/lite/w/stadium/r/STA-STE-001';

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const t = await open(ROOM, { role: 'visitor', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(15000);
  const st = p.getByTestId('rm-room-3d'); await st.waitFor(); const main = await p.locator('main').innerText();
  const kinds = await st.evaluate((el) => [...el.querySelectorAll('.l3-hitbtn')].map((b) => b.getAttribute('aria-label')).join(' | '));
  ok(`RM-${tag}-01`, 'the suite is drawn as a suite: drink rail, balcony seats, sofa, bar, displays; no boardroom table, lectern or presenter zone', (await p.getByTestId('lw-room').getAttribute('data-furnished')) === 'designed' && (await st.getAttribute('data-program')) === 'suite'
    && /Drink rail/.test(kinds) && /Balcony seats/.test(kinds) && /sofa/i.test(kinds) && /Bar/.test(kinds) && /Display/.test(kinds) && !/Presenter|lectern|boardroom|Table for 1\d/i.test(`${kinds} ${main}`), kinds.slice(0, 200));
  ok(`RM-${tag}-02`, 'names are off until asked for, so the room reads as a room', (await st.locator('.l3-tag').count()) === 0);
  await p.getByTestId('rm-names').click(); await p.waitForTimeout(300); const tags = await st.locator('.l3-tag').count();
  ok(`RM-${tag}-03`, 'the Names switch names what is in the room', tags >= 5 && (await p.getByTestId('rm-names').getAttribute('aria-checked')) === 'true', String(tags)); await p.getByTestId('rm-names').click();
  // activated as the keyboard would (Enter on the focused button), so a header or another target over it on a small screen does not take the tap
  await p.getByTestId('rm-piece-display-1').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(250); const said = await p.getByTestId('rm-says').innerText();
  ok(`RM-${tag}-04`, 'tapping a display says what it is, its size and height, and what the record holds for it', /Display on the bar wall: 1\.23 × 0\.05 m, at 1\.35 m/.test(said) && /Suite displays 1: .*on record/.test(said) && (await st.getAttribute('data-sel')) === 'display-1', said);
  const seen = [];
  for (const k of ['rail', 'balcony', 'sofa', 'door', 'wheel']) { await p.getByTestId(`rm-eye-${k}`).click(); await p.waitForTimeout(350);
    const [x, y, z] = (await st.getAttribute('data-eye-at')).split(',').map(Number); const [rw, rd] = (await st.getAttribute('data-room-wd')).split(',').map(Number);
    const polys = await st.locator('svg.l3-svg polygon').count(); const bad = await st.evaluate((el) => [...el.querySelectorAll('svg.l3-svg polygon')].some((q) => /NaN|Infinity/.test(q.getAttribute('points') || '')));
    const sky = await st.locator('svg.l3-svg rect[fill="url(#rm-sky)"]').count(); seen.push({ k, where: y < 0 ? 'balcony' : x > 0 && x < rw && y < rd ? 'room' : 'out', z, polys, bad, sky }); }
  ok(`RM-${tag}-05`, 'from each place — rail, balcony seat, sofa, doorway, wheelchair place — the suite is drawn in perspective at that person’s eye height, the bowl beyond', seen.every((s) => s.where !== 'out' && s.z > 0.9 && s.z < 1.7 && s.polys > 300 && !s.bad && s.sky === 1) && seen.find((s) => s.k === 'balcony').where === 'balcony' && /eye=wheel/.test(p.url()), JSON.stringify(seen.map((s) => [s.k, s.where, s.z, s.polys])));
  await p.getByTestId('rm-eye-above').click(); await p.waitForTimeout(350);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`RM-${tag}-06`, '“Above” returns to the cutaway; no sideways scroll; no console error; nothing off the page', (await st.getAttribute('data-eye')) === '' && !/eye=/.test(p.url()) && sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${[...t.errs, ...t.off].slice(0, 3).join(' | ')}`);
  await t.close();
}
{ const t = await open(`${ROOM}?eye=balcony`, { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('rm-room-3d').waitFor(); await p.waitForTimeout(400);
  ok('RM-link', 'a link opens the suite from a balcony seat', (await p.getByTestId('rm-room-3d').getAttribute('data-eye')) === 'balcony' && (await p.getByTestId('rm-eye-balcony').getAttribute('aria-checked')) === 'true');
  await p.reload(); await p.getByTestId('rm-room-3d').waitFor(); await p.waitForTimeout(300);
  ok('RM-reload', 'the eye position survives a reload', (await p.getByTestId('rm-room-3d').getAttribute('data-eye')) === 'balcony');
  await t.close(); }
{ const t = await open('#/lite/w/stadium', { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('lw-home').waitFor(); const lede = await p.locator('main').innerText();
  // 13 Nov 2026: the seven types that were "being redesigned" now have programs, so none is left being redesigned (changed from expecting some)
  ok('RM-counts', 'the stadium says how many rooms are designed room by room by Empathia and how many are drawn by V2.5.3 or fixture layouts; none is left being redesigned', /\d+ designed room by room by Empathia/.test(lede) && !/being redesigned/.test(lede), lede.slice(0, 300));
  await t.close(); }
// 13 Nov 2026: the press box, commentary booths, mix position, clubs (stadium) and green rooms, speaker preparation and the VIP lounge
// (convention) were "being redesigned"; each now has its own program (changed from expecting the press box to say "Being redesigned")
for (const [w, id, prog, eye, must] of [['stadium', 'STA-PRS', 'press-box', 'front', /Writing positions, row 1/], ['stadium', 'STA-CMT-1', 'commentary-booth', 'seat', /Commentary desk/], ['stadium', 'STA-FOH', 'mix-position', 'seat', /Mixing console/], ['stadium', 'STA-CLUB-N', 'club', 'glass', /Island bar/],
  ['convention', 'CNV-GRN-1', 'green-room', 'mirror', /Dressing counter/], ['convention', 'CNV-SPK', 'speaker-prep', 'mark', /Slide-check station/], ['convention', 'CNV-VIP', 'vip-lounge', 'pod', /meeting pod/]]) {
  const t = await open(`#/lite/w/${w}/r/${id}`, { role: 'visitor', sw: false }); const p = t.page; const st = p.getByTestId('rm-room-3d'); await st.waitFor();
  const kinds = await st.evaluate((el) => [...el.querySelectorAll('.l3-hitbtn')].map((b) => b.getAttribute('aria-label')).join(' | '));
  await p.getByTestId(`rm-eye-${eye}`).click(); await p.waitForTimeout(350); const polys = await st.locator('svg.l3-svg polygon').count();
  const bad = await st.evaluate((el) => [...el.querySelectorAll('svg.l3-svg polygon')].some((q) => /NaN|Infinity/.test(q.getAttribute('points') || '')));
  ok(`RM-${prog}`, `${id} is drawn from the ${prog} program, its own pieces named, and can be seen from inside without a console error`, (await p.getByTestId('lw-room').getAttribute('data-furnished')) === 'designed' && (await st.getAttribute('data-program')) === prog && must.test(kinds) && (await st.getAttribute('data-eye')) === eye && polys > 60 && !bad && !t.errs.length, `${polys} ${kinds.slice(0, 120)} ${t.errs.slice(0, 2).join(' | ')}`);
  await t.close(); }
await done();
