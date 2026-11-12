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
  // 10 Nov 2026: 15 → 20 room cards on Lite's home: the fifteen plan rooms, then the first of nine sectors (five rooms) of the 90-room estate
  ok(`LT-${tag}-01`, 'Lite opens on the campus: six buildings in 3D, six lenses for the architect, the fifteen plan rooms and one sector of five more, Scouter in Lite (D41)', /Northstar/.test(home.h1) && home.blds === 6 && home.lenses === 6 && home.plan === 20 && home.scouter && home.nav >= 8, JSON.stringify(home));
  { await t.page.locator('[data-testid="lite-sector"]').nth(3).click(); await t.page.waitForTimeout(150); const sec = await t.page.evaluate(() => ({ n: document.querySelectorAll('[data-testid="lite-sector"]').length, on: document.querySelector('[data-testid="lite-sector"][aria-pressed="true"]')?.textContent, cards: Array.from(document.querySelectorAll('[data-testid="lite-estate"] [data-testid^="lite-room-"]')).map((a) => a.getAttribute('data-testid')) }));
    ok(`LT-${tag}-01b`, 'the 45 additions are browsed a sector at a time: nine sectors, five rooms each, and choosing one changes the five', sec.n === 9 && sec.on === 'Health / research' && sec.cards.length === 5 && sec.cards.every((c) => /lite-room-R-WMR-/.test(c)), JSON.stringify(sec)); }
  ok(`LT-${tag}-02`, 'the campus stage stays dark in either theme (D36)', (await lum(t.page, '[data-testid="lite-campus-card"] .stage')) < 0.25);
  ok(`LT-${tag}-03`, 'no horizontal overflow on the Lite home', (await t.overflow()) <= 0, await t.overflow());
  if (vp[2] === 'desktop') await t.page.screenshot({ path: path.join(out, `${tag}-home.png`), fullPage: true });
  // keyboard into a building, then a floor, then a room
  await t.page.focus('[data-testid="lite-bld-HZN"]'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);
  ok(`LT-${tag}-04`, 'a building in the 3D campus opens with the keyboard', (await t.page.evaluate(() => location.hash)) === '#/lite/b/HZN' && /Horizon Media Center/.test(await t.text()));
  await t.page.click('[data-testid="lite-floor-1"]'); await t.page.waitForTimeout(300);
  const fl = await t.page.evaluate(() => ({ plan: !!document.querySelector('[data-testid="lite-floorplan"]'), tiles: document.querySelectorAll('[data-testid="lite-floorplan"] a').length, cards: document.querySelectorAll('[data-testid^="lite-room-"]').length }));
  ok(`LT-${tag}-05`, 'a floor shows its rooms on a floor plan and as cards (same count)', fl.plan && fl.tiles >= 2 && fl.tiles === fl.cards, JSON.stringify(fl));
  // 10 Nov 2026: NST floor 3, not floor 1: the 90-room estate put two rooms on floor 1, so it is no longer an empty floor
  await t.go('#/lite/b/NST/3'); ok(`LT-${tag}-06`, 'an empty floor says so rather than going blank', /No modelled room on this floor/.test(await t.text()), (await t.text()).slice(0, 100));
  // the rooms: all 90 at desktop (45 until 10 Nov 2026), a sample on phone and tablet
  const list = vp[2] === 'desktop' ? ids : SAMPLE; const bad = [];
  for (const id of list) {
    await t.go(`#/lite/room/${id}`, 260);
    const v = await t.page.evaluate(() => ({ room: document.querySelector('[data-testid="lite-room"]')?.getAttribute('data-room'), stage: !!document.querySelector('[data-testid="lite-3d"]'), states: document.querySelectorAll('[data-testid^="lite-state-"]').length, ov: document.querySelectorAll('[data-testid^="lite-ov-"]').length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    // 12 Nov 2026: six overlays, since V2.5.3's Sightlines X-ray view was restored as an overlay
    if (v.room !== id || !v.stage || v.states !== 4 || v.ov !== 6 || v.over > 0) bad.push(`${id} ${JSON.stringify(v)}`);
  }
  ok(`LT-${tag}-07`, `${list.length === 90 ? 'all 90 rooms' : `a sample of ${list.length} rooms`} open in Lite with a 3D stage, four states and six overlays, no overflow`, !bad.length && (vp[2] !== 'desktop' || list.length === 90), bad.slice(0, 3).join(' | '));
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
// 12 Nov 2026: V2.5.3's X-ray in the room restored (liteXray / metricsOf): Sightlines, Signal flow, the Measurements panel, Design a space
for (const scheme of SCHEMES) for (const vp of [VIEWPORTS[0], VIEWPORTS[VIEWPORTS.length - 1]]) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/lite/room/R-ATL-4-218?mode=engineer' }); await t.page.waitForSelector('[data-testid="lite-xray"]');
  await t.page.click('[data-testid="lite-ov-sight"]'); await t.page.waitForTimeout(250);
  const sg = await t.page.evaluate(() => ({ rays: document.querySelectorAll('.lt-ray').length, seats: document.querySelectorAll('.lt-seat').length, v: document.querySelector('[data-testid="lite-ov-sight"] .lt-switch__v')?.textContent || '', legend: document.querySelector('.lt-legend')?.textContent || '' }));
  ok(`LT-${tag}-X1`, 'Sightlines draws one ray per seat to its best display, counts the clear ones on its switch and names the classes in the legend', sg.rays >= 1 && sg.rays === sg.seats && /^\d+\/\d+$/.test(sg.v) && /green clear, amber marginal, red obstructed/.test(sg.legend), JSON.stringify(sg));
  const flow = () => t.page.evaluate(() => ({ on: document.querySelector('[data-testid="lite-x-signal"]')?.getAttribute('aria-checked'), ly: ['av', 'network', 'control'].map((k) => document.querySelector(`[data-testid="lite-ly-${k}"]`)?.getAttribute('aria-checked')), ov: document.querySelectorAll('[data-testid^="lite-ov-"][aria-checked="true"]').length }));
  await t.page.click('[data-testid="lite-x-signal"]'); await t.page.waitForTimeout(250); const f1 = await flow();
  await t.page.click('[data-testid="lite-x-signal"]'); await t.page.waitForTimeout(250); const f2 = await flow();
  ok(`LT-${tag}-X2`, 'Signal flow turns the AV, network and control layers on together with the overlays off; again, it turns network and control off', f1.on === 'true' && f1.ly.every((x) => x === 'true') && f1.ov === 0 && f2.on === 'false' && f2.ly[0] === 'true' && f2.ly[1] === 'false' && f2.ly[2] === 'false', JSON.stringify([f1, f2]));
  await t.page.click('[data-testid="lite-x-meas"]'); await t.page.waitForSelector('[data-testid="lite-meas"]');
  const ms = await t.page.evaluate(() => ({ rows: document.querySelectorAll('[data-testid="lite-meas"] .lt-meas__m').length, txt: document.querySelector('[data-testid="lite-meas"]')?.textContent || '', hash: location.hash, studio: document.querySelector('[data-testid="lite-x-studio"]')?.getAttribute('href') ?? null }));
  ok(`LT-${tag}-X3`, 'the Measurements panel: eight rows, modeled figures labelled modeled, the acoustic rows without a model say so, the reverberation row is an estimate from assumed finishes, never mixed; the address keeps it', ms.rows === 8 && (ms.txt.match(/Not modeled here · no measurement on record/g) || []).length === 2 /* 12 Nov 2026: was 3; reverberation is now V2.5.3's Sabine estimate (rt60Of), labelled an estimate from assumed finishes */ && /Estimate · Sabine/.test(ms.txt) && /Clear display sightlines/.test(ms.txt) && /Modeled · not measured/.test(ms.txt) && /never mixed in one number/.test(ms.txt) && /xm=1/.test(ms.hash), ms.txt.slice(0, 200));
  ok(`LT-${tag}-X4`, 'Design a space opens this room in the studio, where the role may', ms.studio === null || ms.studio === '#/studio/room/R-ATL-4-218', String(ms.studio));
  ok(`LT-${tag}-X5`, 'no page error, no request left the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}
// 12 Nov 2026: V2.5.3's object inspector (liteCardHtml) restored: a device's card in the room
for (const scheme of SCHEMES) {
  const t = await open(VIEWPORTS[VIEWPORTS.length - 1], scheme, { hash: '#/lite/room/R-ATL-4-218?mode=engineer' }); await t.page.waitForSelector('[data-testid="lite-3d"]');
  const cam = t.page.locator('.lt-dev[data-cat="camera"], .lt-dev[data-cat="bar"]').first(); const want = await cam.getAttribute('data-cat');
  await cam.dispatchEvent('click'); await t.page.waitForSelector('[data-testid="lite-card"]', { timeout: 4000 }).catch(() => {});
  const card = await t.page.evaluate(() => ({ kind: document.querySelector('[data-testid="lite-card"]')?.getAttribute('data-kind'), heads: Array.from(document.querySelectorAll('[data-testid="lite-card"] .lt-card__h')).map((h) => h.textContent) }));
  ok(`LT-${scheme}-X6`, 'tapping a camera opens V2.5.3’s object card: what it is, who it is for, how to use it, common issues, support, learn more; for the engineer lens its purpose, flow, modeled coverage and engineering chapter', card.kind === want && ['What this is', 'Who this is for', 'How to use it', 'Common issues', 'Support path', 'Learn more', 'Technical purpose', 'Signal and data flow', 'Coverage · Modeled · not measured', 'Engineering reference'].every((h) => card.heads.includes(h)), JSON.stringify([want, card]));
  ok(`LT-${scheme}-X7`, 'no page error, no request left the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}
// 12 Nov 2026: V2.5.3's Optimize panel in the room ("change the room") restored: moves by button in 25 cm steps, seat count, scores against the current layout
for (const scheme of SCHEMES) {
  const t = await open(VIEWPORTS[0], scheme, { hash: '#/lite/room/R-ATL-4-218?mode=optimize' }); const c = t.page.locator('[data-testid="lite-change"]'); await c.waitFor();
  const seats0 = Number(await c.getByTestId('lite-seats').innerText());
  await c.getByRole('button', { name: 'Move right' }).click(); await c.getByRole('button', { name: 'Move right' }).click(); await c.getByRole('button', { name: 'Move toward the display wall' }).click();
  await c.getByRole('button', { name: 'One seat more' }).click(); await t.page.waitForTimeout(150);
  const st = await t.page.evaluate(() => ({ moved: document.querySelector('[data-testid="lite-moved"]')?.textContent, title: document.querySelector('[data-testid="lite-change"] h2, [data-testid="lite-change"] h3')?.textContent || document.querySelector('[data-testid="lite-change"]')?.textContent?.slice(0, 40), ticks: document.querySelectorAll('[data-testid="lite-change"] .lt-sc__bar s').length, send: document.querySelector('[data-testid="lite-send"]')?.getAttribute('href'), movedMarks: document.querySelectorAll('.lt-dev--moved').length }));
  const seats1 = Number(await c.getByTestId('lite-seats').innerText());
  ok(`LT-${scheme}-X8`, 'Optimize: buttons move the chosen item in 25 cm steps, a seat is added, the scores show the current layout’s tick, the item is marked moved in 3D, and the layout can be sent to engineering', st.moved === '+0.50, -0.25 m' && seats1 === seats0 + 1 && st.ticks >= 1 && st.movedMarks >= 1 && /Your layout/.test(st.title) && st.send === '#/request/change-room?room=R-ATL-4-218', JSON.stringify({ ...st, seats0, seats1 }));
  await c.getByTestId('lite-edits-reset').click(); await t.page.waitForTimeout(150);
  ok(`LT-${scheme}-X9`, '“Back to the current layout” undoes every change', (await c.getByTestId('lite-moved').innerText()) === '25 cm steps' && Number(await c.getByTestId('lite-seats').innerText()) === seats0 && await t.page.locator('.lt-dev--moved').count() === 0);
  ok(`LT-${scheme}-X10`, 'no page error, no request left the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}

// 12 Nov 2026: the Lite studio (V2.5.3 #/v25/lite) restored: build a model from a room, read its geometry and predictions, correct, place, move, vary
for (const scheme of SCHEMES) for (const vp of [VIEWPORTS[0], VIEWPORTS[VIEWPORTS.length - 1]]) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/v25/lite' }); const p = t.page; await p.waitForSelector('[data-testid="lite-studio"]');
  await p.evaluate(() => { try { localStorage.removeItem('empathia.demo.liteStudio.v1'); } catch { /* */ } }); await p.reload(); await p.waitForSelector('[data-testid="studio-new"]');
  await p.selectOption('[data-testid="studio-room"]', 'R-ATL-4-218'); await p.click('[data-testid="studio-build"]'); await p.waitForSelector('[data-testid="studio-model"]');
  const g = await p.evaluate(() => ({ len: document.querySelector('[data-testid="studio-geometry"] tr[data-dim="length"]')?.textContent || '', plan: document.querySelectorAll('[data-testid="studio-plan"] [data-placement]').length, pred: document.querySelector('[data-testid="studio-predict"]')?.textContent || '', hash: location.hash }));
  ok(`LT-${tag}-S1`, 'the studio builds a conceptual model from a room: the campus model’s dimensions with their basis and uncertainty, the recipe’s devices on the plan, predicted coverage labelled a prediction', /9\.8 m/.test(g.len) && /not a survey/.test(g.len) && /±2\.9 m/.test(g.len) && g.plan >= 5 && /prediction, not a measurement/.test(g.pred) && /m=LM-001/.test(g.hash), JSON.stringify(g).slice(0, 300));
  await p.fill('[data-testid="studio-val"]', '10.2'); await p.click('[data-testid="studio-correct-go"]'); const refused = await p.locator('text=Say why').count();
  await p.fill('[data-testid="studio-why"]', 'tape measurement'); await p.click('[data-testid="studio-correct-go"]'); await p.waitForTimeout(150);
  const c = await p.evaluate(() => document.querySelector('[data-testid="studio-geometry"] tr[data-dim="length"]')?.textContent || '');
  ok(`LT-${tag}-S2`, 'a correction needs a reason; recorded, it is manually proposed, never verified, and the version moves on', refused === 1 && /10\.2 m/.test(c) && /manually proposed/.test(c) && /tape measurement/.test(c) && /Version 2/.test(await p.getByTestId('studio-history').innerText()), c);
  const n0 = await p.locator('[data-testid="studio-plan"] [data-placement]').count(); await p.fill('[data-testid="studio-x"]', '1'); await p.fill('[data-testid="studio-y"]', '1'); await p.click('[data-testid="studio-place-go"]');
  await p.getByRole('button', { name: 'Move right' }).first().click(); await p.waitForTimeout(150);
  ok(`LT-${tag}-S3`, 'a device is placed on the plan and a device moves in 25 cm steps', await p.locator('[data-testid="studio-plan"] [data-placement]').count() === n0 + 1 && /moved/.test(await p.getByTestId('studio-history').innerText()));
  await p.fill('[data-testid="studio-vwhy"]', 'a second camera at the back'); await p.click('[data-testid="studio-variant-go"]'); await p.waitForTimeout(200);
  ok(`LT-${tag}-S4`, 'a variant is a copy at version 1 that says what it varies and why', /variant 1 · v1/.test(await p.getByTestId('studio-model').innerText()) && /variant of LM-001: a second camera at the back/.test(await p.getByTestId('studio-history').innerText()));
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`LT-${tag}-S5`, 'no horizontal overflow, no page error, no request left the page', over <= 0 && !t.errs.length && !t.ext.length, [over, ...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}

// 12 Nov 2026: Scouter anatomy (V2.5.3 viewScouterAnatomy) restored: open a class, pick a block, break it, name the layer
for (const scheme of SCHEMES) for (const vp of [VIEWPORTS[0], VIEWPORTS[VIEWPORTS.length - 1]]) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/scouter/anatomy' }); const p = t.page; await p.waitForSelector('[data-testid="anatomy-index"]');
  const classes = await p.locator('[data-class]').count(); await p.click('[data-class="camera"]'); await p.waitForSelector('[data-testid="anatomy"]');
  await p.locator('[data-block="lens"]').dispatchEvent('click'); const blk = await p.getByTestId('anatomy-block').innerText();
  await p.click('[data-testid="anatomy-break"]'); const fault = await p.getByTestId('anatomy-fault').innerText();
  const affected = await p.locator('[data-block="encoder"] text').nth(1).textContent();
  await p.click('[data-guess="power"]'); const wrong = await p.getByTestId('anatomy-verdict').getAttribute('data-right');
  await p.click('[data-guess="signal"]'); const right = await p.getByTestId('anatomy-verdict').innerText(); await p.click('[data-testid="anatomy-record"]');
  ok(`LT-${tag}-A1`, 'Scouter anatomy: seven classes; the PTZ camera’s lens block says what it does, how it fails and the test; breaking it shows the symptom and where it travels; the wrong layer is refused, the right one names the safe test', classes === 7 && /Gathers light/.test(blk) && /Point at a lit chart/.test(blk) && /Soft or dark picture/.test(fault) && /Downstream it looks like/.test(fault) && /affected/.test(affected || '') && wrong === 'false' && /Right: Signal/.test(right) && await p.getByTestId('anatomy-recorded').count() === 1, `${classes} ${affected} ${wrong}`);
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`LT-${tag}-A2`, 'no horizontal overflow, no page error, no request left the page', over <= 0 && !t.errs.length && !t.ext.length, [over, ...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}
// 12 Nov 2026: V2.5.3's spatial drift (AC-SD1) restored in the Optimize lens: the commissioned footprint dashed with an arrow, restore or
// mark for review (kept on this device, simulated), undo; the model and the field report both shown
for (const scheme of SCHEMES) for (const vp of [VIEWPORTS[0], VIEWPORTS[VIEWPORTS.length - 1]]) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/lite/room/R-MER-1-140?mode=optimize' }); const p = t.page;
  await p.evaluate(() => { try { localStorage.removeItem('empathia.demo.liteDrift.v1'); } catch { /* */ } }); await p.reload(); const d = p.getByTestId('lite-drift'); await d.waitFor();
  const g0 = await p.locator('[data-testid="lite-ghosts"]').getAttribute('data-n'); const mv0 = await p.locator('.lt-furn--moved').count();
  const now = await d.getByTestId('lite-drift-now').innerText(); const sum = await d.getByTestId('lite-drift-summary').innerText();
  ok(`LT-${tag}-D1`, 'Spatial drift: the furniture moved since handover is outlined where it was commissioned, with an arrow; the card says what moved and both the field report and the model', Number(g0) >= 1 && mv0 >= 1 && /toward the door/.test(now) && /field report/i.test(sum) && /Drift from baseline/.test(await d.innerText()), JSON.stringify([g0, mv0, now]));
  await d.getByTestId('lite-drift-restore').click(); await p.waitForTimeout(150);
  const g1 = await p.locator('[data-testid="lite-ghosts"]').count(); const mv1 = await p.locator('.lt-furn--moved').count(); const said = await d.getByTestId('lite-drift-said').innerText();
  ok(`LT-${tag}-D2`, 'Restore: the room is shown at the commissioned layout, the outline goes, and it says plainly this is simulated and the field report stays open', g1 === 0 && mv1 === 0 && /Restored/.test(await d.innerText()) && /Simulated/.test(said) && /stays open/.test(said), JSON.stringify([g1, mv1, said]));
  await p.reload(); await d.waitFor(); const kept = await p.locator('.lt-furn--moved').count();
  await d.getByTestId('lite-drift-undo').click(); await p.waitForTimeout(150); await d.getByTestId('lite-drift-review').click(); await p.waitForTimeout(150);
  const req = await d.getByTestId('lite-drift-request').getAttribute('href'); const g2 = await p.locator('[data-testid="lite-ghosts"]').count();
  ok(`LT-${tag}-D3`, 'the choice survives a reload; undo returns the drift; marking for review keeps the drift shown and links to the request, nothing sent', kept === 0 && g2 === 1 && req === '#/request/change-room?room=R-MER-1-140' && /Marked for engineering review/.test(await d.innerText()), JSON.stringify([kept, g2, req]));
  await d.getByTestId('lite-drift-undo').click();
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`LT-${tag}-D4`, 'no horizontal overflow, no page error, no request left the page', over <= 0 && !t.errs.length && !t.ext.length, [over, ...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}
// 12 Nov 2026: the object card's catalogue figures, room standard and commissioning rows, and "Move this" in the Optimize lens (V2.5.3 liteCardHtml)
for (const scheme of SCHEMES) {
  const t = await open(VIEWPORTS[0], scheme, { hash: '#/lite/room/R-ATL-4-218?mode=optimize' }); const p = t.page; await p.waitForSelector('[data-testid="lite-change"]');
  const cam = p.locator('.lt-dev[data-cat="camera"], .lt-dev[data-cat="bar"]').first(); const code = (await cam.getAttribute('data-testid')).replace('lt-dev-', '');
  await cam.dispatchEvent('click'); await p.waitForSelector('[data-testid="lite-card"]');
  const heads = await p.evaluate(() => Array.from(document.querySelectorAll('[data-testid="lite-card"] .lt-card__h')).map((h) => h.textContent));
  const figs = await p.getByTestId('lite-card-figs').innerText(); const cx = await p.getByTestId('lite-card-cx').innerText();
  await p.getByTestId('lite-card-move').click(); await p.waitForTimeout(200); const tool = await p.getByTestId('lite-tool').inputValue();
  ok(`LT-${scheme}-X11`, 'the object card adds V2.5.3’s catalogue figures (declared, not a datasheet), the room standard and the commissioning row; “Move this” picks the device in “Change the room”', heads.some((h) => /^Catalogue figures/.test(h)) && heads.includes('Commissioning') && /networked|mount/.test(figs) && /Baseline v\d|No commissioning baseline/.test(cx) && tool === code, JSON.stringify([heads, figs, cx, tool, code]));
  ok(`LT-${scheme}-X12`, 'no page error, no request left the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].slice(0, 3).join(' | '));
  await t.close();
}

await done();
