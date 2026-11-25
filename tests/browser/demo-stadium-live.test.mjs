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
// record of a regression says what was measured and not only PASS. Nothing here changes a check that existed; SLV-16 is new.
const FR = [];
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
const pinned = await shapeOf(p); FR.push({ check: 'SLV-12', mode: 'full', what: 'desktop 1440 × 900, held at full detail, reduced motion, after every control was pressed', fps, detail: pinned.detail, floor: 2 }); const GL = await glRenderer(p);
await t.close();

{ // SLV-15: the same scene left to adapt, as a visitor opens it. Waits until the level has held for three seconds (it is decided in the first few).
  const a = await open('#/play/stadium', { role: 'architect', sw: false, w: 1440, h: 900, init }); const q = a.page; await q.waitForSelector('[data-testid=stadium-live][data-ready=true]');
  let held = 0, lastD = -1; for (let i = 0; i < 18 && held < 3; i += 1) { await q.waitForTimeout(1100); const d = Number(await q.getByTestId('stadium-live').getAttribute('data-detail')); held = d === lastD ? held + 1 : 0; lastD = d; }
  const auto = await shapeOf(q); const slow = pinned.fps < 24; FR.push({ check: 'SLV-15', mode: 'adapted', what: 'desktop 1440 × 900, left to adapt, once the level had held three seconds', fps: auto.fps, detail: auto.detail });
  ok('SLV-15', `adaptive detail on this machine: ${pinned.fps} fps held at full detail, ${auto.fps} fps left to adapt at ${auto.detail}% detail. ${slow ? 'Full detail cannot hold 24 here, so the stadium must draw fewer pixels, not fewer than half, and not be slower for it' : 'Full detail holds 24 here, so the stadium must stay at full detail'}; the canvas keeps its size on the page`,
    held >= 3 && pinned.detail === 100 && Math.abs(pinned.w - Math.round(pinned.cssW * pinned.dpr)) <= 2 && auto.cssW === pinned.cssW && auto.cssH === pinned.cssH && Math.abs(auto.w - Math.round(auto.cssW * auto.dpr * auto.detail / 100)) <= 2 && auto.wide <= 1 && !a.errs.length
    && (slow ? auto.detail < 100 && auto.detail >= 50 && auto.fps >= pinned.fps : auto.detail === 100), JSON.stringify({ held, pinned, auto, e: a.errs[0] }));
  await a.close(); }

{ const ph = await open('#/play/stadium', { role: 'architect', sw: false, w: 390, h: 844, reduced: true }); await ph.page.waitForSelector('[data-testid=stadium-live][data-ready=true]'); await ph.page.waitForTimeout(1200);
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); const stacked = await ph.page.evaluate(() => { const a = document.querySelector('.slv-stage').getBoundingClientRect(), b = document.querySelector('.slv-console').getBoundingClientRect(); return b.top >= a.bottom - 1; });
  ok('SLV-14', 'a phone-sized screen: no sideways scroll; the console sits under the stadium', over <= 0 && stacked, `overflow ${over} · stacked ${stacked}`); await ph.close(); }
{ let file = '', why = ''; try { file = recordFrameRates('stadium', FR, { renderer: GL }); } catch (e) { why = String(e.message); }
  ok('SLV-16', 'the frame rates this run measured are written beside its evidence, each with the detail it was drawn at, as this machine’s figures and not a device’s', !!file && FR.length === 2, file ? `${FR.length} readings` : why); }
await done();
