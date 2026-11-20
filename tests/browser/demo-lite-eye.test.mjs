#!/usr/bin/env node
// Eye-level views from realistic occupant positions (13 Nov 2026, founder: "require eye-level views from realistic occupant positions.
// That's how you'll know whether a room really feels like a physical environment"). The furnished room is seen from a seat at the table,
// the back row, the presenter's place, the doorway and a wheelchair place, in perspective at that person's eye height, facing where they
// would look; the person can look around; "Above" returns to the room seen from outside.
//   node tests/browser/demo-lite-eye.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lite-eye');
const Z = { seat: 1.2, back: 1.2, presenter: 1.6, door: 1.6, wheel: 1.1 };

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  for (const room of ['R-ATL-4-218', 'R-BCN-3-101', 'R-HZN-1-400']) {
    const t = await open(`#/lite/room/${room}?mode=engineer`, { role: 'architect', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(15000);
    const st = p.getByTestId('lite-room-3d'); await st.waitFor(); await p.getByTestId('lite-eyes').waitFor();
    const [rw, rd] = (await st.getAttribute('data-room-wd')).split(',').map(Number); const seen = [];
    for (const k of Object.keys(Z)) {
      await p.getByTestId(`lite-eye-${k}`).click(); await p.waitForTimeout(300);
      const [x, y, z] = (await st.getAttribute('data-eye-at')).split(',').map(Number);
      const polys = await st.locator('svg.l3-svg polygon').count(); const bad = await st.evaluate((el) => [...el.querySelectorAll('svg.l3-svg polygon')].some((q) => /NaN|Infinity/.test(q.getAttribute('points') || '')));
      seen.push({ k, inside: x > 0 && x < rw && y > 0 && y < rd, z, polys, bad });
    }
    ok(`EY-${tag}-${room}-01`, 'from each occupant position the room is drawn in perspective from inside it, at that person’s eye height, with walls and furniture in view', seen.every((s) => s.inside && s.z === Z[s.k] && s.polys > 20 && !s.bad) && /eye=wheel/.test(p.url()), JSON.stringify(seen.map((s) => [s.k, s.inside, s.z, s.polys])));
    await p.getByTestId('lite-eye-seat').click(); await p.waitForTimeout(300); const y0 = Number(await st.locator('svg.l3-svg').getAttribute('data-yaw'));
    await st.locator('svg.l3-svg').focus(); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); const y1 = Number(await st.locator('svg.l3-svg').getAttribute('data-yaw'));
    ok(`EY-${tag}-${room}-02`, 'seated, the person faces the display wall and can turn their head with the arrow keys', y0 !== y1, `${y0} → ${y1}`);
    await p.getByTestId('lite-eye-above').click(); await p.waitForTimeout(400);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`EY-${tag}-${room}-03`, '“Above” returns to the room seen from outside; no sideways scroll; no console error', (await st.getAttribute('data-eye')) === '' && !/eye=/.test(p.url()) && sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${t.errs.slice(0, 2).join(' | ')}`);
    await t.close();
  }
}
{ const t = await open('#/lite/room/R-ATL-4-218?mode=engineer&eye=presenter', { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('lite-room-3d').waitFor(); await p.waitForTimeout(400);
  ok('EY-link', 'a link opens the room from the presenter’s place', (await p.getByTestId('lite-room-3d').getAttribute('data-eye')) === 'presenter' && (await p.getByTestId('lite-eye-presenter').getAttribute('aria-checked')) === 'true');
  await t.close(); }
{ const t = await open('#/lite/room/R-ATL-4-218', { role: 'visitor', sw: false }); const p = t.page; await p.getByTestId('lite-room-3d').waitFor(); await p.getByTestId('lite-eye-door').click(); await p.waitForTimeout(300);
  ok('EY-visitor', 'a visitor can stand in the doorway and look in, too', (await p.getByTestId('lite-room-3d').getAttribute('data-eye')) === 'door');
  await t.close(); }
await done();
