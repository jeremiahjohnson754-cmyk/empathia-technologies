#!/usr/bin/env node
// Drill down and drill up (founder, 13 Nov 2026: "advanced drilldown and drillup capabilities in all data analytics surfaced"), on the
// two flagship command centres. Walked as a person would: campus → building → floor → a room's own record, then back up by the path and
// by the browser's Back; across by a state count; every count agrees with the page's own tiles; the level is in the address, so a
// drilled view opens directly; a malformed or unknown address falls back a level instead of breaking; the portfolio brief exported at a
// level carries exactly that level's rooms; phone width fits.
//   node tests/browser/demo-drill.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-drill');
const num = (s) => Number(String(s).replace(/[^0-9]/g, ''));

{ const t = await open('#/commissioning', { role: 'architect', sw: false }); const p = t.page; p.setDefaultTimeout(15000);
  const card = p.getByTestId('cx-drill'); await card.waitFor();
  const level = () => card.getByTestId('drill-path').getAttribute('data-level');
  const at = (l) => p.waitForFunction((x) => document.querySelector('[data-testid=cx-drill] [data-testid=drill-path]')?.getAttribute('data-level') === x, l);
  const here = async () => num(await card.locator('[data-testid=drill-path] b .ui-meta').innerText());
  const rows = card.locator('[data-testid=drill-table] tbody tr'); const nb = await rows.count();
  const total = (await card.locator('[data-testid=drill-table] tbody tr td:nth-child(2)').allInnerTexts()).reduce((a, x) => a + num(x), 0);
  ok('DR-01', 'the campus level lists every building (regional sites too) and its rooms add up to the campus', nb >= 7 && total === num(await card.getByTestId('drill-path').locator('b').innerText()) && (await level()) === 'building', `${nb} buildings, ${total} rooms`);
  // down: Atlas → floor 4 → a room
  await card.locator('tr[data-drill=ATL] [data-testid=drill-in]').click(); await at('floor');
  const atlRooms = await here();
  const tilesAtl = num((await p.getByTestId('tiles').locator('> *').first().innerText()).match(/of\s*(\d+)/)?.[1] || '');
  ok('DR-02', 'a building opens its floors, the path reads Campus › Atlas HQ, and the tiles count the same rooms the path names', (await level()) === 'floor' && /Campus.*Atlas HQ/s.test(await card.getByTestId('drill-path').innerText()) && atlRooms === tilesAtl && atlRooms > 5, `${atlRooms} vs ${tilesAtl}`);
  await card.locator('tr[data-drill="4"] [data-testid=drill-in]').click(); await at('room');
  const roomsHere = await card.getByTestId('drill-rooms').locator('li').count();
  ok('DR-03', 'a floor lists its rooms, each with its state, why, and its tests', (await level()) === 'room' && roomsHere === (await here()) && /Atlas 4\.218/.test(await card.innerText()), `${roomsHere}`);
  await card.getByTestId('drill-rooms').locator('a', { hasText: 'Atlas 4.218' }).click(); await p.getByTestId('cx-room').waitFor();
  ok('DR-04', 'a room opens its own commissioning record', (await p.getByTestId('cx-room').getAttribute('data-room')) === 'R-ATL-4-218');
  // up: Back returns to the floor; the path climbs a level at a time
  await p.goBack(); await card.waitFor(); await at('room');
  ok('DR-05', 'the browser’s Back returns to the floor it came from', (await level()) === 'room');
  await card.getByTestId('drill-path').getByRole('link', { name: /Atlas HQ/ }).click(); await at('floor');
  await card.getByTestId('drill-path').getByRole('link', { name: /Campus/ }).click(); await at('building');
  ok('DR-06', 'the path drills back up: floor → building → campus', (await level()) === 'building');
  // across: a state count filters
  const listed = await card.locator('[data-testid=drill-table] tbody tr').count();
  await card.locator('tr[data-drill=ATL] td a[aria-label*="blocked"]').click(); await p.waitForFunction(() => /s=blocked/.test(location.hash)); await at('floor');
  const tilesBlocked = num(await p.getByTestId('tiles').locator('> *').nth(2).innerText());
  const floorsShown = await card.locator('[data-testid=drill-table] tbody tr').count();
  await card.locator('[data-testid=drill-table] tbody tr [data-testid=drill-in]').first().click(); await at('room');
  const states = await card.getByTestId('drill-rooms').locator('li').allInnerTexts();
  ok('DR-07', 'a state count drills across: Atlas’s blocked rooms only, the floor listing just those rooms, and the filter clears', /Blocked · clear/.test(await card.innerText()) && floorsShown >= 1 && states.length >= 1 && states.every((x) => /Blocked/.test(x)) && tilesBlocked >= 1, `${listed} ${floorsShown} ${states.length}`);
  await card.getByRole('link', { name: /Blocked · clear/ }).click(); await p.waitForFunction(() => !/s=/.test(location.hash));
  // the export carries the drilled level
  await p.goto(p.url().split('#')[0] + '#/commissioning?b=ATL&f=4'); await card.waitFor();
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByTestId('estate-export').locator('button[data-format=json]').click()]);
  const j = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok('DR-08', 'the portfolio brief exported at a floor carries exactly that floor’s rooms', dl.suggestedFilename() === 'EST-ATL-F4-portfolio-brief.json' && j.entities.rooms.length === roomsHere && j.entities.rooms.every((r) => r.building === 'ATL'), `${j.entities.rooms.length} vs ${roomsHere}`);
  ok('DR-09', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ // a drilled address opens directly; a malformed one falls back a level
  const t = await open('#/assurance?b=HZN&s=drift', { role: 'architect', sw: false }); const p = t.page; const card = p.getByTestId('as-drill'); await card.waitFor();
  const lvl = await card.getByTestId('drill-path').getAttribute('data-level'); const path1 = await card.getByTestId('drill-path').innerText();
  await p.goto(p.url().split('#')[0] + '#/assurance?b=<script>&f=99&s=drop%20table'); await card.waitFor();
  const lvl2 = await card.getByTestId('drill-path').getAttribute('data-level');
  ok('DR-10', 'Assurance drills the same way, and a drilled address (a building, filtered to drift) opens directly', lvl === 'floor' && /Horizon Media Center/.test(path1) && /Drifted · clear/.test(path1), `${lvl} ${path1.replace(/\s+/g, ' ')}`);
  ok('DR-11', 'a malformed address is ignored (campus level, no filter) and nothing breaks', lvl2 === 'building' && !/clear/.test(await card.innerText()) && !t.errs.length, `${lvl2} ${t.errs.join('|')}`);
  await t.close(); }

{ // Pro drills too: a room needs action when commissioning is blocked or a job or deficiency is open; the tiles follow the scope
  const t = await open('#/pro', { role: 'architect', sw: false }); const p = t.page; const card = p.getByTestId('pro-drill'); await card.waitFor();
  const all = await p.getByTestId('tiles').innerText();
  await card.locator('tr[data-drill=ATL] [data-testid=drill-in]').click(); await p.waitForFunction(() => document.querySelector('[data-testid=pro-drill] [data-testid=drill-path]')?.getAttribute('data-level') === 'floor');
  const atl = await p.getByTestId('tiles').innerText(); const n = Number((atl.match(/of\s*(\d+)/g) || []).pop()?.replace(/\D/g, '') || 0);
  const pathN = Number((await card.locator('[data-testid=drill-path] b .ui-meta').innerText()).replace(/\D/g, ''));
  ok('DR-pro', 'Pro’s command centre drills the same way; at a building its tiles count that building’s rooms', all !== atl && n === pathN && n > 5 && !t.errs.length, `${n} vs ${pathN}`);
  await t.close(); }

{ const t = await open('#/commissioning?b=ATL&f=4', { role: 'architect', w: 390, h: 844, sw: false }); const p = t.page; const card = p.getByTestId('cx-drill'); await card.waitFor();
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await p.goto(p.url().split('#')[0] + '#/commissioning'); await card.waitFor();
  const sw2 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('DR-phone', 'at phone width the room list and the building table fit (the table scrolls in its own box)', sw <= 0 && sw2 <= 0, `${sw} ${sw2}`);
  await t.close(); }
await done();
