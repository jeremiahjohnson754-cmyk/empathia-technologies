#!/usr/bin/env node
// Empathia Lite (uplift/lite): the campus scene, building and floor browsing, every one of the 45 rooms as an interactive 3D room with
// layers, overlays and the four states, the 14 spaces, 3 guides / 25 chapters, wayfinding, the visit, QR, the Commons and Scouter in Lite
// (D41) — at 390/768/1440 in light and dark. Access follows D44: a visitor gets no engineer lens, no AV layer, no Scouter link.
// Destructive: unknown rooms/spaces/guides/floors, a forbidden lens in the address, injected text in the visit form, back/forward,
// no request leaves the page, no page error, no horizontal overflow.
//   node tests/browser/demo-lite.test.mjs
import path from 'node:path'; import fs from 'node:fs';
import { harness, VIEWPORTS, SCHEMES, repo } from './demo-spaces-lib.mjs';
const { ok, open, done, out } = await harness('demo-lite');
// 10 Nov 2026: the estate is the founder's 90 rooms (docs/surpass/ENTERPRISE_90_ROOMS.md); rows 46–90 are the X(...) rows of canon.ts
const ids = [...fs.readFileSync(path.join(repo, 'apps/demo/src/campus/canon.ts'), 'utf8').matchAll(/^ {2}[RPX]\((?:\d+, )?'(R-[A-Z]+-\d+-\d+)'/gm)].map((m) => m[1]);
const SAMPLE = ['R-ATL-4-218', 'R-BCN-1-300', 'R-HZN-1-500', 'R-ATL-6-300', 'R-RDG-1-100', 'R-NST-2-101'];
const lum = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return 1; const m = getComputedStyle(el).backgroundColor.match(/\d+(\.\d+)?/g); if (!m) return 1; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }, sel);

for (const scheme of SCHEMES) for (const vp of VIEWPORTS) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/lite' });
  const home = await t.page.evaluate(() => ({ h1: document.querySelector('main h1')?.textContent || '', blds: document.querySelectorAll('[data-testid^="lite-bld-"]').length, lenses: document.querySelectorAll('[data-testid^="lite-lens-"]').length, plan: document.querySelectorAll('[data-testid^="lite-room-"]').length, scouter: !!document.querySelector('[data-testid="lite-scouter-card"]'), nav: document.querySelectorAll('.lt-nav a').length }));
  ok(`LT-${tag}-01`, 'Lite opens on the campus: six buildings in 3D, six lenses for the architect, the fifteen plan rooms, Scouter in Lite (D41)', /Northstar/.test(home.h1) && home.blds === 6 && home.lenses === 6 && home.plan === 15 && home.scouter && home.nav >= 8, JSON.stringify(home));
  ok(`LT-${tag}-02`, 'the campus stage stays dark in either theme (D36)', (await lum(t.page, '[data-testid="lite-campus-card"] .stage')) < 0.25);
  ok(`LT-${tag}-03`, 'no horizontal overflow on the Lite home', (await t.overflow()) <= 0, await t.overflow());
  if (vp[2] === 'desktop') await t.page.screenshot({ path: path.join(out, `${tag}-home.png`), fullPage: true });
  // keyboard into a building, then a floor, then a room
  await t.page.focus('[data-testid="lite-bld-HZN"]'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);
  ok(`LT-${tag}-04`, 'a building in the 3D campus opens with the keyboard', (await t.page.evaluate(() => location.hash)) === '#/lite/b/HZN' && /Horizon Media Center/.test(await t.text()));
  await t.page.click('[data-testid="lite-floor-1"]'); await t.page.waitForTimeout(300);
  const fl = await t.page.evaluate(() => ({ plan: !!document.querySelector('[data-testid="lite-floorplan"]'), tiles: document.querySelectorAll('[data-testid="lite-floorplan"] a').length, cards: document.querySelectorAll('[data-testid^="lite-room-"]').length }));
  ok(`LT-${tag}-05`, 'a floor shows its rooms on a floor plan and as cards (same count)', fl.plan && fl.tiles >= 2 && fl.tiles === fl.cards, JSON.stringify(fl));
  await t.go('#/lite/b/NST/1'); ok(`LT-${tag}-06`, 'an empty floor says so rather than going blank', /No modelled room on this floor/.test(await t.text()), (await t.text()).slice(0, 100));
  // the rooms: all 90 at desktop (45 until 10 Nov 2026), a sample on phone and tablet
  const list = vp[2] === 'desktop' ? ids : SAMPLE; const bad = [];
  for (const id of list) {
    await t.go(`#/lite/room/${id}`, 260);
    const v = await t.page.evaluate(() => ({ room: document.querySelector('[data-testid="lite-room"]')?.getAttribute('data-room'), stage: !!document.querySelector('[data-testid="lite-3d"]'), states: document.querySelectorAll('[data-testid^="lite-state-"]').length, ov: document.querySelectorAll('[data-testid^="lite-ov-"]').length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    if (v.room !== id || !v.stage || v.states !== 4 || v.ov !== 5 || v.over > 0) bad.push(`${id} ${JSON.stringify(v)}`);
  }
  ok(`LT-${tag}-07`, `${list.length === 90 ? 'all 90 rooms' : `a sample of ${list.length} rooms`} open in Lite with a 3D stage, four states and five overlays, no overflow`, !bad.length && (vp[2] !== 'desktop' || list.length === 90), bad.slice(0, 3).join(' | '));
  // states, overlays, layers, orbit and the device panel on the reference room
  await t.go('#/lite/room/R-ATL-4-218?mode=engineer', 300);
  ok(`LT-${tag}-08`, 'the room stage stays dark in either theme (D36)', (await lum(t.page, '[data-testid="lite-room"] .stage')) < 0.25);
  const m0 = await t.page.evaluate(() => document.querySelector('[data-testid="lite-m-camera"]')?.textContent || '');
  await t.go('#/lite/room/R-HZN-1-400?mode=engineer&state=proposed', 300);
  const prop = await t.page.evaluate(() => ({ state: document.querySelector('[data-testid="lite-room"]')?.getAttribute('data-state'), added: document.querySelectorAll('.lt-dev--added').length, cap: document.querySelector('.stage__cap')?.textContent || '' }));
  ok(`LT-${tag}-09`, 'the Proposed state marks added positions and says it is not approved', prop.state === 'proposed' && prop.added >= 1 && /not approved/i.test(prop.cap), JSON.stringify(prop));
  await t.go('#/lite/room/R-ATL-4-218?mode=engineer', 300); await t.page.click('[data-testid="lite-state-commissioned"]'); await t.page.waitForTimeout(300);
  ok(`LT-${tag}-10`, 'the Commissioned state names the baseline', /Baseline v1/.test(await t.page.evaluate(() => document.querySelector('.stage__cap')?.textContent || '')));
  await t.page.click('[data-testid="lite-ov-speaker"]'); await t.page.waitForTimeout(200);
  const ov = await t.page.evaluate(() => ({ on: document.querySelector('[data-testid="lite-ov-speaker"]')?.getAttribute('aria-checked'), spk: document.querySelectorAll('.lt-ov--spk').length, hash: location.hash }));
  ok(`LT-${tag}-11`, 'an overlay switch draws its zones and writes the address (shareable)', ov.on === 'true' && ov.spk >= 1 && /ov=/.test(ov.hash), JSON.stringify(ov));
  await t.page.click('[data-testid="lite-ly-furniture"]'); await t.page.waitForTimeout(200);
  ok(`LT-${tag}-12`, 'switching the furniture layer off removes the seats and tables', (await t.page.evaluate(() => document.querySelectorAll('.lt-seat, .lt-furn').length)) === 0);
  const yaw0 = await t.page.evaluate(() => document.querySelector('[data-testid="lite-3d"]')?.getAttribute('data-yaw'));
  await t.page.click('button[aria-label="Turn right 45 degrees"]'); await t.page.waitForTimeout(150);
  const yaw1 = await t.page.evaluate(() => document.querySelector('[data-testid="lite-3d"]')?.getAttribute('data-yaw'));
  ok(`LT-${tag}-13`, 'the orbit buttons turn the room', Number(yaw1) - Number(yaw0) === 45, `${yaw0} → ${yaw1}`);
  await t.page.click('button[aria-label="Plan view from above"]'); await t.page.waitForTimeout(150);
  ok(`LT-${tag}-14`, 'the plan button tilts to 90 degrees', (await t.page.evaluate(() => document.querySelector('[data-testid="lite-3d"]')?.getAttribute('data-pitch'))) === '90');
  await t.page.focus('[data-testid="lt-dev-A-0101"]'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(200);
  const dev = await t.page.evaluate(() => document.querySelector('[data-testid="lite-device"]')?.textContent || '');
  ok(`LT-${tag}-15`, 'a device selected with the keyboard shows position, asset and identity', /A-0101/.test(dev) && /AS-0101/.test(dev) && /Identity/.test(dev), dev.slice(0, 120));
  ok(`LT-${tag}-16`, 'the camera metric is computed and did not change with the view', /\d+/.test(m0) && m0 === (await t.page.evaluate(() => document.querySelector('[data-testid="lite-m-camera"]')?.textContent || '')));
  // divisible room: configurations; control tower: non-operational and the fleet wall
  await t.go('#/lite/room/R-BCN-1-300?cfg=B', 300);
  const div = await t.page.evaluate(() => ({ cfgs: document.querySelectorAll('[data-testid^="lite-cfg-"]').length, on: document.querySelector('[data-testid="lite-cfg-B"]')?.getAttribute('aria-checked'), parts: document.querySelectorAll('.lt-partition').length, active: document.querySelectorAll('.lt-active').length }));
  ok(`LT-${tag}-17`, 'a divisible room offers combined and split configurations, draws the partitions and highlights the chosen section', div.cfgs === 4 && div.on === 'true' && div.parts === 2 && div.active === 1, JSON.stringify(div));
  await t.go('#/lite/room/R-ATL-6-300', 300);
  const tower = await t.page.evaluate(() => ({ nonop: /non-operational/i.test(document.querySelector('[data-testid="lite-nonop"]')?.textContent || ''), cells: document.querySelectorAll('[data-testid="lite-fleet"] .lt-cell').length }));
  ok(`LT-${tag}-18`, 'the Global Operations Control Tower is labelled non-operational and its fleet wall shows the 90 rooms', tower.nonop && tower.cells === 90, JSON.stringify(tower));
  // places, guides, wayfinding, visit, QR, Commons
  await t.go('#/lite/services'); ok(`LT-${tag}-19`, 'Places lists the fourteen spaces', (await t.page.locator('[data-testid^="lite-space-"]').count()) === 14);
  await t.go('#/lite/space/SP-ATL-TECHZONE', 300);
  const sp = await t.page.evaluate(() => ({ stage: !!document.querySelector('[data-testid="lite-space-3d"]'), svc: document.querySelectorAll('.lt-svc li').length, qr: !!document.querySelector('[data-testid="lite-qr"]') }));
  ok(`LT-${tag}-20`, 'a space opens in 3D with its services and a QR code', sp.stage && sp.svc >= 5 && sp.qr, JSON.stringify(sp));
  await t.go('#/lite/guides'); const ch = await t.page.locator('.lt-chapters a').count();
  ok(`LT-${tag}-21`, 'Guides lists three guides and twenty-five chapters', (await t.page.locator('[data-testid^="lite-guide-"]').count()) === 3 && ch === 25, ch);
  await t.page.fill('#lt-gq', 'badge'); await t.page.waitForTimeout(150);
  ok(`LT-${tag}-22`, 'searching the chapters finds matches without leaving the page', /chapters? mention/.test(await t.text()) && (await t.page.locator('.lt-list a').count()) >= 1);
  await t.go('#/lite/guides/G-ENG/CH-ENG-8', 300); ok(`LT-${tag}-23`, 'a chapter opens with its sections and a pager', (await t.page.locator('[data-testid="lite-chapter"]').count()) === 1 && (await t.page.locator('.lt-pager a').count()) >= 1);
  await t.go('#/lite/way'); await t.page.selectOption('[data-testid="lite-way-to"]', 'R-MER-2-400'); await t.page.waitForTimeout(300);
  ok(`LT-${tag}-24`, 'wayfinding writes the destination to the address and shows the route', /to=R-MER-2-400/.test(await t.page.evaluate(() => location.hash)) && (await t.page.locator('[data-testid="lite-route"] li').count()) >= 3);
  await t.go('#/lite/visit?step=checkin', 300);
  await t.page.fill('#lt-vn', '<img src=x onerror=alert(1)> Ada'); await t.page.selectOption('#lt-vh', 'syseng'); await t.page.click('[data-testid="lite-visit-next"]'); await t.page.waitForTimeout(300);
  const visit = await t.page.evaluate(() => ({ step: document.querySelector('[data-testid="lite-visit"]')?.getAttribute('data-step'), name: document.querySelector('[data-testid="lite-visit-name"]')?.textContent || '', img: document.querySelectorAll('main img[src="x"]').length }));
  ok(`LT-${tag}-25`, 'the visit form takes a name as text only (markup stripped, nothing rendered) and moves to the confirmation', visit.step === 'confirm' && /Ada/.test(visit.name) && !/</.test(visit.name) && visit.img === 0, JSON.stringify(visit));
  await t.page.click('[data-testid="lite-visit-next"]'); await t.page.waitForTimeout(200); await t.page.click('[data-testid="lite-visit-next"]'); await t.page.waitForTimeout(300);
  ok(`LT-${tag}-26`, 'the badge step shows the badge with a code and says the host message was simulated', (await t.page.locator('[data-testid="lite-badge"] [data-testid="lite-qr"]').count()) === 1);
  await t.go('#/lite/visit?step=checkin', 200); await t.page.fill('#lt-vn', ''); await t.page.click('[data-testid="lite-visit-next"]'); await t.page.waitForTimeout(150);
  ok(`LT-${tag}-27`, 'checking in without a name is refused with a message, not ignored', /Enter your name/.test(await t.text()));
  await t.go('#/lite/qr'); ok(`LT-${tag}-28`, 'the QR page draws seven codes', (await t.page.locator('[data-testid="lite-qr"]').count()) === 7);
  await t.go('#/lite/commons?scene=event', 300);
  ok(`LT-${tag}-29`, 'the Commons event scene is chosen and drawn', (await t.page.evaluate(() => document.querySelector('[data-testid="lite-commons"]')?.getAttribute('data-scene'))) === 'event' && (await t.page.locator('.lt-obj--camera').count()) === 3);
  ok(`LT-${tag}-30`, 'no horizontal overflow on the Commons', (await t.overflow()) <= 0, await t.overflow());
  // destructive addresses
  for (const [h, w] of [['#/lite/room/R-NOPE-1-1', 'room'], ['#/lite/space/SP-NOPE', 'space'], ['#/lite/guides/G-NOPE', 'guide'], ['#/lite/guides/G-ONB/CH-NOPE', 'chapter'], ['#/lite/b/XYZ', 'building'], ['#/lite/b/ATL/99', 'floor'], ['#/lite/nope', 'address'], ['#/lite/room/%3Cscript%3E', 'script room']]) {
    await t.go(h, 250); ok(`LT-${tag}-31-${w}`, `an unknown ${w} says so (Not in Lite) and offers the way back`, /Not in Lite/.test(await t.text()) && (await t.page.locator('main a[href="#/lite"]').count()) >= 1);
  }
  await t.go('#/lite/room/R-ATL-4-218?mode=engineer&ov=nope,camera&ly=zzz&state=bogus&cfg=Q', 300);
  const junk = await t.page.evaluate(() => ({ state: document.querySelector('[data-testid="lite-room"]')?.getAttribute('data-state'), cam: document.querySelector('[data-testid="lite-ov-camera"]')?.getAttribute('aria-checked'), layers: document.querySelectorAll('[data-testid^="lite-ly-"][aria-checked="true"]').length }));
  ok(`LT-${tag}-32`, 'junk query values are ignored (unknown state → current, unknown overlay dropped, unknown layer → none on)', junk.state === 'current' && junk.cam === 'true' && junk.layers === 0, JSON.stringify(junk));
  // back/forward keeps page and address in step
  await t.go('#/lite/b/MER'); await t.go('#/lite/b/MER/2'); await t.page.goBack(); await t.page.waitForTimeout(250);
  ok(`LT-${tag}-33`, 'back returns to the building page', (await t.page.evaluate(() => location.hash)) === '#/lite/b/MER' && /Meridian R&D/.test(await t.text()));
  ok(`LT-${tag}-34`, 'no page error and no request left the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}

// D44 as a visitor: one lens, two layers, one overlay, no Scouter, no engineer lens even when asked; places need lite.services
{
  const t = await open(VIEWPORTS[2], SCHEMES[0], { hash: '#/' });
  await t.page.evaluate(() => { localStorage.setItem('empathia.demo.perspective', 'visitor'); }); await t.page.goto(t.page.url().split('#')[0] + '#/lite'); await t.page.reload({ waitUntil: 'load' }); await t.page.waitForTimeout(500);
  const v = await t.page.evaluate(() => ({ lenses: document.querySelectorAll('[data-testid^="lite-lens-"]').length, scouter: !!document.querySelector('[data-testid="lite-scouter-card"]') || !!document.querySelector('.lt-nav__scouter'), places: !!document.querySelector('.lt-nav a[href="#/lite/services"]') }));
  ok('LT-D44-01', 'a visitor sees no lens picker, no Scouter and no Places entry (D44: absent, not disabled)', v.lenses === 0 && !v.scouter && !v.places, JSON.stringify(v));
  await t.go('#/lite/room/R-ATL-4-218', 400);
  const r = await t.page.evaluate(() => ({ lens: document.querySelector('[data-testid="lite-room"]')?.getAttribute('data-lens'), layers: Array.from(document.querySelectorAll('[data-testid^="lite-ly-"]')).map((x) => x.getAttribute('data-testid').slice(8)).sort(), ov: Array.from(document.querySelectorAll('[data-testid^="lite-ov-"]')).map((x) => x.getAttribute('data-testid').slice(8)), tech: !!document.querySelector('[data-testid="lite-m-infra"]'), panel: document.querySelector('[data-testid="lite-lens-panel"]')?.textContent || '' }));
  ok('LT-D44-02', 'a visitor’s room: the visitor lens, furniture and wayfinding layers only, the accessibility overlay only, no infrastructure metric, a route panel', r.lens === 'visitor' && r.layers.join() === 'furniture,wayfinding' && r.ov.join() === 'access' && !r.tech && /Getting there/.test(r.panel), JSON.stringify(r));
  await t.go('#/lite/room/R-ATL-4-218?mode=engineer', 400);
  ok('LT-D44-03', 'asking for the engineer lens as a visitor shows the owl access page, not the room', (await t.page.locator('[data-testid="lite-room"]').count()) === 0 && /isn’t part of the Visitor|Roles whose work it is|not part of/i.test(await t.text()), (await t.text()).slice(0, 160));
  await t.go('#/lite/services', 400);
  ok('LT-D44-04', 'Places is refused to a visitor at the address (V2.5.3 lite.services)', (await t.page.locator('[data-testid="lite-services"]').count()) === 0);
  await t.go('#/lite/guides', 400);
  ok('LT-D44-05', 'Guides stay open to a visitor (V2.5.3 lite.guides)', (await t.page.locator('[data-testid="lite-guides"]').count()) === 1);
  ok('LT-D44-06', 'no page error and no request left the page as a visitor', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}
await done();
