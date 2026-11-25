#!/usr/bin/env node
// Stadium LIVE, the first slice (task #182; founder, 17 Nov 2026 10:20 and 13:40: "each toggle must visibly change the appropriate scene,
// interface, sound, 3D overlay or persistent application state. Never present a decorative button as working"). Every control is pressed
// and the drawn stadium is compared before and after: the page opens with reduced motion, so the scene is still between presses and any
// difference is the control's. Sound: none before the visitor turns it on (no audio context is even created), capped, muted on demand.
// The frame rate is of this machine's headless browser drawing WebGL in software: printed, floored, and not a device measurement.
//   node tests/browser/demo-stadium-live.test.mjs
import crypto from 'node:crypto';
import { harness } from './demo-shell-lib.mjs';
import { recordFrameRates, glRenderer } from '../lib/frame-rates.mjs';
// 25 Nov 2026: the figures the frame-rate checks measure are also written beside the run's evidence (tests/lib/frame-rates.mjs), so the
// record of a regression says what was measured and not only PASS. Nothing here changes a check that existed; SLV-16 and SLV-17 are new, and SLV-18 to SLV-20 (distant spectators).
const FR = [];
const costOf = (q, id) => q.evaluate((t) => { const c = document.querySelector(`[data-testid=${t}]`); return { triangles: Number(c?.dataset.tris), draws: Number(c?.dataset.draws) }; }, id);   // what the renderer says its last frame drew (gl.ts, Renderer.stats)
const { open, ok, done } = await harness('demo-stadium-live');
const init = () => { try { if (!sessionStorage.getItem('slv-fresh')) { for (const k of ['empathia.stadiumlive.v1', 'empathia.stadiumlive.poll', 'empathia.stadiumlive.mine']) localStorage.removeItem(k); sessionStorage.setItem('slv-fresh', '1'); } } catch { /* none */ }
  const A = window.AudioContext; window.__audioMade = 0; window.AudioContext = class extends A { constructor(...a) { super(...a); window.__audioMade += 1; } }; };

// 24 Nov 2026: the scene now lowers its drawing detail on a machine that cannot hold the pace (play/gl.ts, DetailGovernor), which changes
// the canvas's pixels by itself. A pixel comparison is a fair judge of a control only while the detail is fixed, so this page is opened
// with the documented switch `?detail=full`, as it was drawn before the governor existed. Every check below is as strict as it was. The
// governor itself is checked in SLV-15 (this scene left to adapt), CL-21 and CL-22 (campus) and tests/unit/render-detail.test.mjs.
const t = await open('#/play/stadium?detail=full', { role: 'architect', sw: false, w: 1440, h: 900, reduced: true, init }); const p = t.page; p.setDefaultTimeout(20000);
await p.waitForSelector('[data-testid=stadium-live][data-ready=true]'); await p.waitForTimeout(2500);
const attr = (k) => p.getByTestId('stadium-live').getAttribute(`data-${k}`);
// the picture: the canvas's own pixels (the renderer keeps its last frame) and the labels drawn over it, read in one step so a short-lived
// state (a cheer lasts about three seconds) is caught while it lasts
const shot = async () => { await p.waitForTimeout(700); return crypto.createHash('sha1').update(await p.evaluate(() => document.querySelector('[data-testid=slv-canvas]').toDataURL('image/png') + [...document.querySelectorAll('.slv-stage .cl-tag')].map((e) => e.textContent).join('|'))).digest('hex'); };
const press = async (id) => { await p.getByTestId(id).click(); return shot(); };
const tab = (k) => p.getByTestId(`slv-tab-${k}`).click();

const a0 = await shot(); const a1 = await shot();
ok('SLV-01', 'launch: the stadium draws (WebGL2), live game, a full house; no sound and no audio context before the visitor asks', (await attr('ready')) === 'true' && (await attr('atmos')) === 'live' && Number(await attr('fill')) > 0.9 && (await attr('sound')) === 'false' && (await p.evaluate(() => window.__audioMade)) === 0 && !(await p.getByTestId('slv-err').count()), `${await attr('atmos')} ${await attr('fill')}`);
const cost0 = await costOf(p, 'slv-canvas');   // the overview of a full house, as the page opens
ok('SLV-02', 'a still scene between presses (reduced motion): two readings of the stadium’s pixels taken apart are the same, so a later difference is the control’s', a0 === a1, `${a0.slice(0, 8)} / ${a1.slice(0, 8)}`);

// atmospheres
let prev = a1; const changed = []; const fills = {};
for (const a of ['pregame', 'halftime', 'concert', 'postgame', 'empty', 'rehearsal', 'live']) { const h = await press(`slv-atmos-${a}`); changed.push(h !== prev && (await attr('atmos')) === a); fills[a] = Number(await attr('fill')); prev = h; }
ok('SLV-03', 'every atmosphere changes the stadium itself (light, sky, crowd, boards): seven presses, seven different pictures; the empty stadium has no crowd', changed.every(Boolean) && fills.empty === 0 && fills.concert > fills.postgame, `${changed.join(',')} · ${JSON.stringify(fills)}`);

// cameras and audiences
await tab('view'); const views = []; for (const v of ['flyover', 'field', 'seat', 'gallery', 'orbit']) { const h = await press(`slv-view-${v}`); views.push(h !== prev && (await attr('view')) === v); prev = h; }
const looks = []; for (const l of ['away', 'neutral', 'home']) { const h = await press(`slv-look-${l}`); looks.push(h !== prev && (await attr('look')) === l); prev = h; }
ok('SLV-04', 'every camera (orbit, flyover, field level, a seat in section 112, the broadcast gallery) and every audience (home, away, general) changes the picture', views.every(Boolean) && looks.every(Boolean), `${views.join(',')} · ${looks.join(',')}`);

// overlays, with the assumptions stated
await tab('audio'); const hd = await press('slv-overlay-dba'); const assume = await p.getByTestId('slv-assume').innerText(); const rows = await p.locator('.slv-table tbody tr').count();
const hp = await press('slv-overlay-pa'); await tab('ops'); const hr = await press('slv-overlay-rf'); const hn = await press('slv-overlay2-none');
ok('SLV-05', 'overlays change the bowl: modeled crowd level (its assumptions stated: MODELED, not measured; 24 sections listed), PA coverage, wireless coverage, and off again', hd !== prev && hp !== hd && hr !== hp && hn !== hr && /MODELED, not measured/.test(assume) && /not a calibrated meter/.test(assume) && rows === 24, `${rows} rows`);
prev = hn;

// cheers and the wave
await tab('audio'); await p.getByTestId('slv-cheer-home').click(); const cheerHome = await attr('cheer'); const hh = await shot(); await p.waitForTimeout(3700); const settled = await attr('cheer'); const after = await shot(); await p.getByTestId('slv-cheer-away').click(); const cheerAway = await attr('cheer'); const ha = await shot();
ok('SLV-06', 'a cheer changes the boards and ribbon to the cheering side’s colour, for about three seconds, then settles; home and away differ', cheerHome === 'home' && hh !== prev && settled === '' && after !== hh && cheerAway === 'away' && ha !== hh, `${cheerHome} → ${settled || '(settled)'} → ${cheerAway} · changed ${hh !== prev}/${after !== hh}/${ha !== hh}`);
await p.waitForTimeout(3600); prev = await shot();

// production: ribbon colour and scoreboard graphic
await tab('production'); const hrb = await press('slv-ribbon-E0A43B'); const hb = await press('slv-board-exit'); const boardTxt = await p.locator('.slv-tag--board').first().innerText().catch(() => '');
ok('SLV-07', 'production: the ribbon board takes the chosen colour and the scoreboards show the chosen graphic', hrb !== prev && hb !== hrb && /Exit via your nearest gate/.test(boardTxt), boardTxt);
prev = hb;

// operations: devices and an engineering card
await tab('ops'); const hdv = await press('slv-ops'); await p.getByTestId('slv-dev-CAM-4').click(); const card = await p.getByTestId('slv-dev-card').innerText();
ok('SLV-08', 'operations: the venue’s AV devices appear in the bowl with their (simulated) state; a device’s card gives its engineering facts and, for a fault, where the incident would go', hdv !== prev && (await attr('ops')) === 'true' && /Goal-line camera/.test(card) && /fault/.test(card) && /ServiceHands/.test(card), card.slice(0, 80));
prev = await shot();

// the replay timeline
await tab('atmos'); await p.getByTestId('slv-replay-2').click(); const cheerG = await attr('cheer'); const now = await p.getByTestId('slv-now').innerText(); const hg = await shot();
ok('SLV-09', 'the replay timeline: stepping to the 23rd-minute goal puts the bowl in the live game, the boards on the score and the home side cheering', hg !== prev && (await attr('replay')) === '2' && cheerG === 'home' && /19:53/.test(now), now.slice(0, 90));
await p.getByRole('button', { name: 'Back to live control' }).click();

// sound: opt-in, capped, mutable
await tab('audio'); await p.getByTestId('slv-sound').check(); await p.waitForTimeout(400); const made = await p.evaluate(() => window.__audioMade); const on = await attr('sound');
await p.getByTestId('slv-layer-crowd').fill('0.3'); await p.getByTestId('slv-mute').click(); const off = await attr('sound');
ok('SLV-10', 'sound: only after the visitor turns it on (one audio context made then, none before); the layers are adjustable; Mute turns it off', made === 1 && on === 'true' && off === 'false', `made ${made} · ${on} → ${off}`);

// preferences kept; the poll
await tab('people'); await p.getByTestId('slv-vote-number10').click(); const voted = await p.getByTestId('slv-poll-note').innerText();
await tab('view'); await p.getByTestId('slv-view-gallery').click(); await p.reload(); await p.waitForSelector('[data-testid=stadium-live][data-ready=true]'); await p.waitForTimeout(1500);
await tab('people'); const again = await p.getByTestId('slv-vote-number10').isDisabled(); const count = await p.getByTestId('slv-vote-number10').innerText();
ok('SLV-11', 'kept in this browser: the camera and look survive a reload; a vote is counted once, kept, and the poll says votes here are this browser’s only', (await attr('view')) === 'gallery' && /You voted for Number 10/.test(voted) && /kept in this browser only/.test(voted) && again && /1/.test(count), `${await attr('view')} · ${count.replace(/\s+/g, ' ')}`);

const fps = Number(await attr('fps'));
ok('SLV-12', `frame rate in this machine's headless software-rendered Chromium: ${fps} fps; floor ≥ 2 (a regression floor, not a device claim)`, fps >= 2, `${fps}`);
ok('SLV-13', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
const shapeOf = (q) => q.evaluate(() => { const c = document.querySelector('[data-testid=slv-canvas]'); const r = document.querySelector('[data-testid=stadium-live]'); return { cssW: c.clientWidth, cssH: c.clientHeight, w: c.width, dpr: Math.min(devicePixelRatio || 1, 2), detail: Number(r.getAttribute('data-detail')), fps: Number(r.getAttribute('data-fps')), wide: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
const pinned = await shapeOf(p); const costG = await costOf(p, 'slv-canvas'); FR.push({ check: 'SLV-12', mode: 'full', what: 'desktop 1440 × 900, held at full detail, reduced motion, after every control was pressed (the gallery view)', fps, detail: pinned.detail, floor: 2, ...costG });
// SLV-17 (25 Nov 2026): what a frame costs, counted and not timed, so the same on every machine. Before this date the overview of a full
// house sent 104,474 triangles a frame: 39,024 were window lights drawn as boxes, 46,920 the crowd with every face of every figure. A
// window is now one face and a section sends only the faces that can look at the eye (the same picture: tests/unit/render-cost.test.mjs).
ok('SLV-17', `the cost of a frame, counted: the overview of a full house sends ${cost0.triangles} triangles in ${cost0.draws} draw calls (budget 60,000 and 180; it was 104,474); from the gallery, where part of the bowl is out of view, ${costG.triangles}`,
  cost0.triangles > 20000 && cost0.triangles <= 60000 && cost0.draws > 20 && cost0.draws <= 180 && costG.triangles > 5000 && costG.triangles < cost0.triangles, JSON.stringify({ cost0, costG }));
const GL = await glRenderer(p);
await t.close();

{ // SLV-15: the same scene left to adapt, as a visitor opens it. Waits until the level has held for three seconds (it is decided in the first few).
  const a = await open('#/play/stadium', { role: 'architect', sw: false, w: 1440, h: 900, init }); const q = a.page; await q.waitForSelector('[data-testid=stadium-live][data-ready=true]');
  let held = 0, lastD = -1; for (let i = 0; i < 18 && held < 3; i += 1) { await q.waitForTimeout(1100); const d = Number(await q.getByTestId('stadium-live').getAttribute('data-detail')); held = d === lastD ? held + 1 : 0; lastD = d; }
  const auto = await shapeOf(q); const slow = pinned.fps < 24; FR.push({ check: 'SLV-15', mode: 'adapted', what: 'desktop 1440 × 900, left to adapt, once the level had held three seconds (the overview)', fps: auto.fps, detail: auto.detail, ...(await costOf(q, 'slv-canvas')) });
  ok('SLV-15', `adaptive detail on this machine: ${pinned.fps} fps held at full detail, ${auto.fps} fps left to adapt at ${auto.detail}% detail. ${slow ? 'Full detail cannot hold 24 here, so the stadium must draw fewer pixels, not fewer than half, and not be slower for it' : 'Full detail holds 24 here, so the stadium must stay at full detail'}; the canvas keeps its size on the page`,
    held >= 3 && pinned.detail === 100 && Math.abs(pinned.w - Math.round(pinned.cssW * pinned.dpr)) <= 2 && auto.cssW === pinned.cssW && auto.cssH === pinned.cssH && Math.abs(auto.w - Math.round(auto.cssW * auto.dpr * auto.detail / 100)) <= 2 && auto.wide <= 1 && !a.errs.length
    && (slow ? auto.detail < 100 && auto.detail >= 50 && auto.fps >= pinned.fps : auto.detail === 100), JSON.stringify({ held, pinned, auto, e: a.errs[0] }));

  // SLV-20 (25 Nov 2026; founder: "Maintain a full-quality override"). The page's own control, on the page as a visitor opened it. On a
  // machine that cannot hold the pace the far sections are drawn simply and the page says so; ticking "Full quality" draws every
  // spectator whole at full resolution at once, whatever the frame rate; unticking hands the choice back to the pace.
  const crowd = async () => q.evaluate(() => { const c = document.querySelector('[data-testid=slv-canvas]'); const r = document.querySelector('[data-testid=stadium-live]'); return { far: Number(c.dataset.far), near: Number(c.dataset.near), tris: Number(c.dataset.tris), simple: r.dataset.simple, quality: r.dataset.quality, detail: Number(r.dataset.detail), w: c.width, cssW: c.clientWidth, dpr: Math.min(devicePixelRatio || 1, 2), note: document.querySelector('[data-testid=slv-pace]').textContent, ticked: document.querySelector('[data-testid=slv-quality]').checked }; });
  const before = await crowd(); await q.getByTestId('slv-quality').check(); await q.waitForTimeout(1600); const fullNow = await crowd();
  await q.getByTestId('slv-quality').uncheck(); let back = await crowd(); for (let i = 0; i < 14 && slow && !(back.simple === 'true' && back.detail < 100); i += 1) { await q.waitForTimeout(1100); back = await crowd(); }
  ok('SLV-20', `the full-quality control: as opened here ${before.far} of ${before.far + before.near} sections in view were drawn simply at ${before.detail}% detail (${before.tris} triangles); ticked, ${fullNow.far} simply at ${fullNow.detail}% (${fullNow.tris} triangles, the pinned page’s ${cost0.triangles}); unticked, the pace decides again`,
    !before.ticked && before.quality === 'auto' && (slow ? before.simple === 'true' && before.far > 0 && before.tris < cost0.triangles && /Distant spectators are drawn more simply/.test(before.note) : before.simple === 'false' && before.far === 0 && !/drawn more simply/.test(before.note))
    && fullNow.ticked && fullNow.quality === 'full' && fullNow.simple === 'false' && fullNow.far === 0 && fullNow.near > 0 && fullNow.detail === 100 && fullNow.tris === cost0.triangles && Math.abs(fullNow.w - Math.round(fullNow.cssW * fullNow.dpr)) <= 2 && !/drawn more simply|% of full detail/.test(fullNow.note)
    && !back.ticked && back.quality === 'auto' && (slow ? back.simple === 'true' && back.detail < 100 : back.simple === 'false' && back.detail === 100) && !a.errs.length, JSON.stringify({ slow, before, fullNow, back, e: a.errs[0] }));
  await a.close(); }

{ // SLV-18, SLV-19 (25 Nov 2026; founder: "Preserve full graphical detail for nearby spectators. Simplify distant spectators dynamically.
  // Preserve crowd density, atmosphere and visual identity… Ensure engineering overlays, measurements and interactive objects remain
  // accurate"). Two pages at the same resolution and the same still moment: one whole (`?detail=full`), one with its distant spectators
  // drawn simply whatever the pace (`&lod=simple`, the documented switch for looking at the simple drawing). The picture is compared in
  // a grid of 192 cells, each cell's average colour, so that what is judged is density and colour where the crowd sits, not single pixels.
  const grid = (pg) => pg.evaluate(() => { const g = document.querySelector('[data-testid=slv-canvas]'); const c = document.createElement('canvas'); c.width = g.width; c.height = g.height; const x = c.getContext('2d'); x.drawImage(g, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const GX = 16, GY = 12; const cells = [];
    for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) { let r = 0, gg = 0, b = 0, n = 0; for (let y = Math.floor(gy * c.height / GY); y < Math.floor((gy + 1) * c.height / GY); y++) for (let xx = Math.floor(gx * c.width / GX); xx < Math.floor((gx + 1) * c.width / GX); xx++) { const i = (y * c.width + xx) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n += 1; } cells.push([r / n, gg / n, b / n]); }
    return { cells, far: Number(g.dataset.far), near: Number(g.dataset.near), tris: Number(g.dataset.tris), w: c.width, h: c.height }; });
  const state = (pg) => pg.evaluate(() => ({ labels: [...document.querySelectorAll('.slv-stage .cl-labels .slv-tag')].map((e) => `${e.className.replace(/.*slv-tag--/, '')}:${e.textContent}@${e.style.transform}`), table: document.querySelector('.slv-table')?.innerText || '', tris: Number(document.querySelector('[data-testid=slv-canvas]').dataset.tris) }));
  const pair = []; for (const sw of ['?detail=full', '?detail=full&lod=simple']) { const t2 = await open('#/play/stadium' + sw, { role: 'architect', sw: false, w: 1440, h: 900, reduced: true, init }); await t2.page.waitForSelector('[data-testid=stadium-live][data-ready=true]'); await t2.page.waitForTimeout(2500); pair.push(t2); }
  const [W, S] = pair; const gw = await grid(W.page), gs = await grid(S.page);
  const diffs = gw.cells.map((c, i) => Math.max(...c.map((v, k) => Math.abs(v - gs.cells[i][k])))); const worst = Math.max(...diffs), mean = diffs.reduce((a2, v) => a2 + v, 0) / diffs.length;
  // near and far in one view: from the seat in section 112 the neighbours are whole and the far side is simple
  for (const pg of [W.page, S.page]) { await pg.getByTestId('slv-tab-view').click(); await pg.getByTestId('slv-view-seat').click(); } await S.page.waitForTimeout(1500); const seatW = await grid(W.page), seatS = await grid(S.page);
  const sd = seatW.cells.map((c, i) => Math.max(...c.map((v, k) => Math.abs(v - seatS.cells[i][k])))); const seatWorst = Math.max(...sd);
  ok('SLV-18', `distant spectators drawn simply, at the same resolution as the whole picture: in the overview ${gs.far} of ${gs.far + gs.near} sections simply and ${gs.tris} triangles a frame against ${gw.tris}; across 192 cells of the picture the average colour differs by ${mean.toFixed(2)} of 255 on average and ${worst.toFixed(2)} at most. From the seat in section 112, ${seatS.near} sections near the camera are whole and ${seatS.far} far ones simple (largest cell difference ${seatWorst.toFixed(2)})`,
    gw.far === 0 && gw.near > 20 && gs.far > 20 && gs.near === 0 && gs.tris < gw.tris * 0.75 && gw.w === gs.w && gw.h === gs.h && mean <= 1.5 && worst <= 8 && seatW.far === 0 && seatS.near >= 2 && seatS.far >= 2 && seatWorst <= 8, JSON.stringify({ mean, worst, seatWorst, w: { far: gw.far, near: gw.near, tris: gw.tris }, s: { far: gs.far, near: gs.near, tris: gs.tris }, seat: { near: seatS.near, far: seatS.far } }));
  // the overlays, the labels and the modeled levels are the same whichever way the crowd is drawn
  for (const pg of [W.page, S.page]) { await pg.getByTestId('slv-view-orbit').click(); } await S.page.waitForTimeout(1200); const w0 = await state(W.page), s0 = await state(S.page);
  for (const pg of [W.page, S.page]) { await pg.getByTestId('slv-tab-audio').click(); await pg.getByTestId('slv-overlay-dba').click(); } await S.page.waitForTimeout(1200); const w1 = await state(W.page), s1 = await state(S.page);
  for (const pg of [W.page, S.page]) { await pg.getByTestId('slv-tab-ops').click(); await pg.getByTestId('slv-ops').check(); } await S.page.waitForTimeout(1200); const w2 = await state(W.page), s2 = await state(S.page);
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  ok('SLV-19', `overlays and measurements do not depend on how the crowd is drawn: the modeled level of each of the 24 sections, the ${w2.labels.length} labels over the picture and where they stand, and what each overlay adds to the frame (the level overlay ${w1.tris - w0.tris} triangles, the devices ${w2.tris - w1.tris}) are the same with the crowd whole and with it simple`,
    w1.table.length > 100 && same(w1.table, s1.table) && w2.labels.length >= 12 && same(w0.labels, s0.labels) && same(w1.labels, s1.labels) && same(w2.labels, s2.labels) && w1.tris - w0.tris > 0 && w1.tris - w0.tris === s1.tris - s0.tris && w2.tris - w1.tris === 11 * 12 && s2.tris - s1.tris === 11 * 12 && !W.errs.length && !S.errs.length,
    JSON.stringify({ dba: [w1.tris - w0.tris, s1.tris - s0.tris], ops: [w2.tris - w1.tris, s2.tris - s1.tris], labels: [w2.labels.length, s2.labels.length], e: [W.errs[0], S.errs[0]] }));
  await W.close(); await S.close(); }

{ const ph = await open('#/play/stadium', { role: 'architect', sw: false, w: 390, h: 844, reduced: true }); await ph.page.waitForSelector('[data-testid=stadium-live][data-ready=true]'); await ph.page.waitForTimeout(1200);
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); const stacked = await ph.page.evaluate(() => { const a = document.querySelector('.slv-stage').getBoundingClientRect(), b = document.querySelector('.slv-console').getBoundingClientRect(); return b.top >= a.bottom - 1; });
  ok('SLV-14', 'a phone-sized screen: no sideways scroll; the console sits under the stadium', over <= 0 && stacked, `overflow ${over} · stacked ${stacked}`); await ph.close(); }
{ let file = '', why = ''; try { file = recordFrameRates('stadium', FR, { renderer: GL }); } catch (e) { why = String(e.message); }
  ok('SLV-16', 'the frame rates this run measured are written beside its evidence, each with the detail it was drawn at, as this machine’s figures and not a device’s', !!file && FR.length === 2, file ? `${FR.length} readings` : why); }
await done();
