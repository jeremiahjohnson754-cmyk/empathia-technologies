#!/usr/bin/env node
// "Atlas 4.218 in" (V2.5.3 roomPlaces, restored 13 Nov 2026 on the founder's word): the same room's places across Lite, Assurance,
// Commissioning, Control, Replay, Compare and the campus room view. Each link lands on the same room, each of those pages carries the row
// back, a selected device travels to Lite and the campus view, and a role sees only places it may open (absent, not disabled).
//   node tests/browser/demo-room-jumps.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-room-jumps');
const ROOM = 'R-ATL-4-218';
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const t = await open(`#/lite/room/${ROOM}?mode=engineer`, { role: 'architect', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(10000);
  const row = p.getByTestId('room-jumps'); await row.waitFor();
  const keys = await row.locator('a').evaluateAll((as) => as.map((a) => a.dataset.testid.replace('room-jump-', '')));
  ok(`RJ-${tag}-01`, 'Lite’s room names the same room in Assurance, Commissioning, Control, Replay, Compare and on campus, right under its name', keys.join() === 'assurance,commissioning,control,replay,compare,campus' && /4\.218 in/.test(await row.innerText()), keys.join());
  const landed = [];
  for (const k of keys) {
    await p.getByTestId(`room-jump-${k}`).click(); await p.waitForTimeout(700);
    const st = await p.evaluate((R) => ({ hash: location.hash, room: !!document.querySelector(`main [data-room="${R}"]`) || /4\.218/.test(document.querySelector('main')?.innerText || ''), back: document.querySelector('[data-testid=room-jumps]')?.getAttribute('data-room'), lite: document.querySelector('[data-testid=room-jump-lite]')?.getAttribute('href') || '' }), ROOM);
    landed.push(`${k}:${st.room && st.hash.includes(ROOM) && st.back === ROOM && st.lite.includes(ROOM) ? 'ok' : JSON.stringify(st)}`);
    await p.goBack(); await row.waitFor();
  }
  ok(`RJ-${tag}-02`, 'each place opens on the same room, carries the row naming it, and links back to it in Lite; Back returns to Lite', landed.every((x) => x.endsWith(':ok')), landed.join(' | '));
  // a device chosen in Lite travels with the link to the campus room view
  await p.getByTestId('lite-room-3d').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await p.locator('[data-testid=lite-room-3d] .l3-hitbtn[aria-label^="Cam"]').first().click({ force: true }); await p.waitForTimeout(250);
  const code = (await p.locator('[data-testid=lite-device] dd.mono').first().innerText()).trim(); const camp = await p.getByTestId('room-jump-campus').getAttribute('href');
  ok(`RJ-${tag}-03`, 'a device selected in Lite travels with the link to the campus room view', camp.endsWith(`?device=${encodeURIComponent(code)}`), `${code} ${camp}`);
  await p.getByTestId('room-jump-copy').click(); await p.waitForTimeout(200);
  ok(`RJ-${tag}-04`, '“Copy link” answers (Copied)', /Copied/.test(await p.getByTestId('room-jump-copy').innerText()));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`RJ-${tag}-05`, 'no sideways scroll; no console error; nothing requested off the page', sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${[...t.errs, ...t.off].slice(0, 3).join(' | ')}`);
  await t.close();
}
// a visitor: only the places a visitor may open (none of Assurance, Commissioning, Control, Replay, Compare)
{ const t = await open(`#/lite/room/${ROOM}`, { role: 'visitor', sw: false }); const p = t.page; await p.getByTestId('lite-room').waitFor();
  const keys = await p.locator('[data-testid=room-jumps] a').evaluateAll((as) => as.map((a) => a.dataset.testid.replace('room-jump-', '')));
  ok('RJ-visitor', 'a visitor is offered no place it may not open (absent, not disabled)', !keys.some((k) => ['assurance', 'commissioning', 'control', 'replay', 'compare'].includes(k)) && !t.errs.length, keys.join() || '(no row)');
  await t.close(); }
await done();
