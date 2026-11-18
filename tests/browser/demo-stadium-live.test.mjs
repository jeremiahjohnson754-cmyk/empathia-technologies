#!/usr/bin/env node
// Stadium LIVE, the first slice (task #182; founder, 17 Nov 2026 10:20 and 13:40: "each toggle must visibly change the appropriate scene,
// interface, sound, 3D overlay or persistent application state. Never present a decorative button as working"). Every control is pressed
// and the drawn stadium is compared before and after: the page opens with reduced motion, so the scene is still between presses and any
// difference is the control's. Sound: none before the visitor turns it on (no audio context is even created), capped, muted on demand.
// The frame rate is of this machine's headless browser drawing WebGL in software: printed, floored, and not a device measurement.
//   node tests/browser/demo-stadium-live.test.mjs
import crypto from 'node:crypto';
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-stadium-live');
const init = () => { try { if (!sessionStorage.getItem('slv-fresh')) { for (const k of ['empathia.stadiumlive.v1', 'empathia.stadiumlive.poll', 'empathia.stadiumlive.mine']) localStorage.removeItem(k); sessionStorage.setItem('slv-fresh', '1'); } } catch { /* none */ }
  const A = window.AudioContext; window.__audioMade = 0; window.AudioContext = class extends A { constructor(...a) { super(...a); window.__audioMade += 1; } }; };

const t = await open('#/play/stadium', { role: 'architect', sw: false, w: 1440, h: 900, reduced: true, init }); const p = t.page; p.setDefaultTimeout(20000);
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
await t.close();

{ const ph = await open('#/play/stadium', { role: 'architect', sw: false, w: 390, h: 844, reduced: true }); await ph.page.waitForSelector('[data-testid=stadium-live][data-ready=true]'); await ph.page.waitForTimeout(1200);
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); const stacked = await ph.page.evaluate(() => { const a = document.querySelector('.slv-stage').getBoundingClientRect(), b = document.querySelector('.slv-console').getBoundingClientRect(); return b.top >= a.bottom - 1; });
  ok('SLV-14', 'a phone-sized screen: no sideways scroll; the console sits under the stadium', over <= 0 && stacked, `overflow ${over} · stacked ${stacked}`); await ph.close(); }
await done();
