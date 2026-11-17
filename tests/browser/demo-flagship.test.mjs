#!/usr/bin/env node
// The flagship engineering room, read from the server (50/10; founder, 17 Nov 2026: "make one University lecture hall the flagship
// engineering demonstration before expanding all the tools across the estate"). A real enterprise API on a real database, a demo
// built with DEMO_API_URL, a real browser. docs/directives/50-10/FIRST_EXECUTION_ASSESSMENT.md §G, F-03 and F-04.
//   FL-01  a build without DEMO_API_URL has no flagship page; the connected build has it
//   FL-02  the page opens a sandbox and shows the lecture theatre by its canonical identifier: its name, building and campus, seats
//          and dimensions, as the server holds them
//   FL-03  (F-03) what the page shows is what the server returned: the same positions on the plan, the same connections, the same
//          applicable tests, the same code; with everything this browser stored removed except the sandbox's id and key, a reload
//          shows the same room; nothing is requested except the page's own files and the configured server
//   FL-04  the panels are one selection: choosing a position on the plan shows its connections (as many as the server holds for it)
//          and marks them on the plan; choosing a connected position from there moves the selection; a test's device names select too
//   FL-05  the plan's switches change the plan: every connection drawn or only the selection's; furniture shown or hidden
//   FL-06  the commissioning plan: each phase shows exactly the tests the server holds for it; "only tests naming this device" shows
//          exactly those
//   FL-07  reading as another person asks the server again as that person and says who it was read as
//   FL-08  (F-04) a second browser with nothing stored opens the same sandbox from its resume code and sees the same room
//   FL-09  a sandbox that has no such room (one opened before the room existed) is explained, with a way to a new sandbox; nothing is invented
//   FL-10  phone width: nothing scrolls sideways; the plan's positions are reachable and operable by keyboard; no console error
//   FL-11  with the server stopped the page says the room cannot be shown and shows no room
//   node tests/browser/demo-flagship.test.mjs
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { repo } from './demo-shell-lib.mjs';
import { setup, client } from '../integration/harness.mjs';

const API_PORT = 4151; const API = `http://127.0.0.1:${API_PORT}`;
const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-flagship-'));
execFileSync(process.execPath, [path.join(repo, 'apps/demo/build.mjs')], { env: { ...process.env, DEMO_DIST: dist, DEMO_API_URL: API }, stdio: ['ignore', 'ignore', 'inherit'] });
process.env.DEMO_DIST = dist; process.env.DEMO_API_URL = API;
const { harness } = await import('./demo-shell-lib.mjs');
const { base, ok, open, done } = await harness('demo-flagship');
const h = await setup({ db: 'empathia_flagship', port: API_PORT, env: { DEMO_SESSIONS: 'on', CORS_ORIGINS: base.replace(/\/$/, '') } });
h.asSuper('UPDATE app.demo_config SET enabled = true');
const api = client(h.base);
const text = (p, id) => p.getByTestId(id).innerText();
const settle = async (p) => { await p.waitForFunction(() => !document.querySelector('[data-testid=fl-busy]') && !document.querySelector('[data-testid=fl-asking]'), null, { timeout: 120000 }); await p.waitForTimeout(150); };
const planIds = (p) => p.locator('[data-testid=fl-plan] .fl__dev').evaluateAll((els) => els.map((e) => e.getAttribute('data-device')).sort());
// FLAGSHIP_SHOTS=<dir> keeps pictures of what was tested (for a person to look at; they are not checks)
const shots = process.env.FLAGSHIP_SHOTS || ''; if (shots) fs.mkdirSync(shots, { recursive: true });
const shot = async (pg, name, full = true) => { if (shots) await pg.screenshot({ path: path.join(shots, `${name}.png`), fullPage: full }); };
const rowIds = (p) => p.locator('[data-testid=fl-rows] tbody tr').evaluateAll((els) => els.map((e) => e.getAttribute('data-test')).sort());

// FL-01
{ const std = path.join(repo, 'apps/demo/dist'); const js = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).map(String).filter((f) => /\.js$/.test(f)) : []);
  const has = (d) => js(d).some((f) => /flagship\.room|fl-plan-card/.test(fs.readFileSync(path.join(d, f), 'utf8')));
  ok('FL-01', 'a build without DEMO_API_URL has no flagship page; the connected build has it', js(std).length > 0 && !has(std) && has(dist), `ordinary build ${js(std).length} files, page ${has(std)} · connected build page ${has(dist)}`); }

const t = await open('#/flagship', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(30000);
await p.getByTestId('flagship').waitFor(); await settle(p);
await p.getByTestId('fl-open').click(); await p.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(p);
const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.sandbox.v1')));
// the server's own answer, asked for separately with the sandbox's key
const sess = await api.call('POST', '/v1/demo/sessions', { body: { sandboxId: stored.id, key: stored.key, role: 'cxeng' } });
const S = (await api.call('GET', '/v1/rooms/UNI-SCI-110', { token: sess.body.accessToken })).body;
const sRows = S.commissioning.rows.filter((r) => r.applicable);

{ const bar = await text(p, 'fl-bar');
  ok('FL-02', 'the page opens a sandbox and shows the lecture theatre by its canonical identifier, with its name, place, seats and dimensions as the server holds them',
    (await text(p, 'fl-ref')) === 'UNI-SCI-110' && (await text(p, 'fl-name')) === 'Lecture Theatre SCI-110 (synthetic)' && (await text(p, 'fl-place')) === 'Science Hall (synthetic) · Kestrel Valley University, North Campus (synthetic)'
    && (await text(p, 'fl-seats')) === '180' && /^20 × 16 × 6\.5 m/.test(await text(p, 'fl-size')) && /installed unverified/i.test(bar) && (await text(p, 'fl-code')) === S.room.code, bar.replace(/\s+/g, ' ').slice(0, 200)); }

{ const allTests = (pg) => pg.locator('[data-testid=fl-phases] button').first().click();   // the plan opens on its first phase; "All" shows every applicable test
  const firstPhase = Math.min(...sRows.map((r) => r.phase)); const opensOn = JSON.stringify(await rowIds(p)) === JSON.stringify(sRows.filter((r) => r.phase === firstPhase).map((r) => r.test_id).sort());
  await allTests(p); const ids = await planIds(p); const want = S.devices.map((d) => d.id).sort(); const rows = await rowIds(p);
  await p.getByTestId('fl-links').check(); const lines = await p.locator('[data-testid=fl-plan] .fl__link').count(); await p.getByTestId('fl-links').uncheck();
  // only the sandbox's id and key may matter: remove everything else this browser stored, reload, and compare
  await p.evaluate(() => { const keep = localStorage.getItem('empathia.demo.sandbox.v1'); const role = localStorage.getItem('empathia.demo.perspective'); localStorage.clear(); sessionStorage.clear(); localStorage.setItem('empathia.demo.sandbox.v1', keep); localStorage.setItem('empathia.demo.perspective', role); });
  await p.reload(); await p.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(p);
  await allTests(p); const ids2 = await planIds(p); const rows2 = await rowIds(p); const off = t.off.filter((u) => !u.startsWith(API));
  ok('FL-03', 'what the page shows is what the server returned (positions, connections, applicable tests, code); after a reload with nothing stored but the sandbox’s id and key it is the same; nothing is requested but the page and the server',
    opensOn && JSON.stringify(ids) === JSON.stringify(want) && lines === S.connections.length && JSON.stringify(rows) === JSON.stringify(sRows.map((r) => r.test_id).sort()) && JSON.stringify(ids2) === JSON.stringify(want) && JSON.stringify(rows2) === JSON.stringify(rows) && off.length === 0 && t.off.some((u) => u.startsWith(`${API}/v1/rooms/UNI-SCI-110`)),
    `${ids.length}/${want.length} positions · ${lines}/${S.connections.length} connections · ${rows.length}/${sRows.length} tests · other hosts ${off.slice(0, 2)}`); }

// a position with connections, and (if the plan has one) a position that tests name
const linked = S.devices.map((d) => ({ d, n: S.connections.filter((k) => k.from === d.id || k.to === d.id).length })).sort((a, b) => b.n - a.n)[0];
{ await p.locator(`[data-testid=fl-plan] [data-device="${linked.d.id}"]`).click(); await p.getByTestId('fl-detail').waitFor();
  const shown = await p.locator('[data-testid=fl-detail-links] li').count(); const marked = await p.locator('[data-testid=fl-plan] .fl__link[data-on=yes]').count(); const title = await text(p, 'fl-devices-card');
  await shot(p, 'flagship-desktop-selected');
  const other = S.connections.find((k) => k.from === linked.d.id || k.to === linked.d.id); const otherId = other.from === linked.d.id ? other.to : other.from;
  await p.locator('[data-testid=fl-detail-links] li button').first().click(); const moved = await p.getByTestId('fl-detail').getAttribute('data-device'); const pressed = await p.locator(`[data-testid=fl-plan] [data-device="${moved}"]`).getAttribute('aria-pressed');
  const firstLinkTarget = S.connections.filter((k) => k.from === linked.d.id || k.to === linked.d.id)[0]; const expectMoved = firstLinkTarget.from === linked.d.id ? firstLinkTarget.to : firstLinkTarget.from;
  ok('FL-04', 'the panels are one selection: a position chosen on the plan shows its connections, as many as the server holds, and marks them on the plan; a connected position chosen there moves the selection',
    shown === linked.n && marked === linked.n && title.includes(linked.d.label) && moved === expectMoved && pressed === 'true' && !!otherId, `${linked.d.id} ${linked.d.label}: ${shown} listed, ${marked} marked, server ${linked.n} · moved to ${moved}`);
  await p.getByTestId('fl-clear').click(); }

{ const furn = S.devices.filter((d) => d.furniture).length; const all = S.devices.length;
  await p.getByTestId('fl-links').check(); const on = await p.locator('[data-testid=fl-plan] .fl__link').count(); await p.getByTestId('fl-links').uncheck(); const offN = await p.locator('[data-testid=fl-plan] .fl__link').count();
  await p.getByTestId('fl-furniture').uncheck(); const without = (await planIds(p)).length; await p.getByTestId('fl-furniture').check(); const withF = (await planIds(p)).length;
  ok('FL-05', 'the plan’s switches change the plan: every connection drawn or none without a selection; furniture hidden or shown', on === S.connections.length && offN === 0 && without === all - furn && withF === all && furn > 0, `connections ${on}→${offN} · positions ${withF}→${without} (${furn} furniture)`); }

{ const phases = [...new Set(sRows.map((r) => r.phase))].sort((a, b) => a - b); const bad = [];
  for (const ph of phases) { await p.locator(`[data-testid=fl-phases] [data-phase="${ph}"]`).click(); const got = await rowIds(p); const want = sRows.filter((r) => r.phase === ph).map((r) => r.test_id).sort(); if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`phase ${ph}: ${got.length}/${want.length}`); }
  await p.locator('[data-testid=fl-phases] button').first().click();
  const named = S.devices.map((d) => ({ d, rows: sRows.filter((r) => r.devices.includes(d.id)) })).filter((x) => x.rows.length).sort((a, b) => b.rows.length - a.rows.length)[0];
  let only = 'no test in this plan names a device'; let onlyOk = true;
  if (named) { await p.locator(`[data-testid=fl-plan] [data-device="${named.d.id}"]`).click(); await p.getByTestId('fl-only').click(); const got = await rowIds(p); onlyOk = JSON.stringify(got) === JSON.stringify(named.rows.map((r) => r.test_id).sort()) && (await text(p, 'fl-count')) === `${named.rows.length} tests shown`; only = `${named.d.label}: ${got.length}/${named.rows.length}`; await p.getByTestId('fl-clear').click(); }
  ok('FL-06', 'each phase shows exactly the tests the server holds for it; "only tests naming this device" shows exactly those', bad.length === 0 && phases.length >= 3 && onlyOk, `${phases.length} phases ${bad.join(', ') || 'all equal'} · ${only}`); }

{ const before = t.off.filter((u) => u.startsWith(`${API}/v1/rooms/UNI-SCI-110`)).length; const sessionsBefore = t.off.filter((u) => u === `${API}/v1/demo/sessions`).length;
  await p.getByTestId('fl-who').selectOption('designer'); await p.waitForFunction(() => document.querySelector('[data-testid=fl-at]')?.getAttribute('data-as') === 'designer', null, { timeout: 60000 }); await settle(p);
  const after = t.off.filter((u) => u.startsWith(`${API}/v1/rooms/UNI-SCI-110`)).length; const sessionsAfter = t.off.filter((u) => u === `${API}/v1/demo/sessions`).length;
  ok('FL-07', 'reading as another person asks the server again, as that person, and the page says who it was read as', after > before && sessionsAfter > sessionsBefore && /as the designer/.test(await text(p, 'fl-at')) && JSON.stringify(await planIds(p)) === JSON.stringify(S.devices.map((d) => d.id).sort()), `${after - before} room reads, ${sessionsAfter - sessionsBefore} new session · ${(await text(p, 'fl-at')).slice(0, 80)}`); }

{ const code = `${stored.id}.${stored.key}`; const u = await open('#/connected', { role: 'syseng', sw: false }); const q = u.page; q.setDefaultTimeout(30000);
  const nothing = await q.evaluate(() => localStorage.getItem('empathia.demo.sandbox.v1'));
  await q.getByTestId('connected').waitFor(); await q.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready');
  await q.getByTestId('cn-resume-code').fill(code); await q.getByTestId('cn-resume').click(); await q.getByTestId('cn-journey').waitFor({ timeout: 120000 });
  await q.goto(`${base}#/flagship`); await q.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(q);
  ok('FL-08', 'a second browser with nothing stored opens the same sandbox from its resume code and sees the same room', nothing === null && (await text(q, 'fl-code')) === S.room.code && (await text(q, 'fl-ref')) === 'UNI-SCI-110' && JSON.stringify(await planIds(q)) === JSON.stringify(S.devices.map((d) => d.id).sort()) && (await text(q, 'fl-at')).includes(stored.tenant), `${await text(q, 'fl-code')} · ${(await planIds(q)).length} positions`);
  await u.close(); }

{ const v = await open('#/flagship', { role: 'cxeng', sw: false, init: `localStorage.setItem('empathia.demo.sandbox.v1', ${JSON.stringify(JSON.stringify(stored))})` }); const r = v.page;
  await r.route(`${API}/v1/rooms/UNI-SCI-110`, (route) => route.fulfill({ status: 404, contentType: 'application/problem+json', headers: { 'access-control-allow-origin': base.replace(/\/$/, '') }, body: JSON.stringify({ status: 404, code: 'not_found', detail: 'room UNI-SCI-110 was not found in this tenant' }) }));
  await r.reload(); await r.getByTestId('fl-new').waitFor({ timeout: 60000 }); const says = await r.locator('main').innerText();
  ok('FL-09', 'a sandbox with no such room is explained, with a way to a new one; no room is shown', /opened before the lecture theatre existed on the server/.test(says) && (await r.getByTestId('fl-bar').count()) === 0 && (await r.getByTestId('fl-plan').count()) === 0, says.replace(/\s+/g, ' ').slice(-220));
  await v.close(); }

{ const m = await open('#/flagship', { role: 'cxeng', sw: false, w: 390, h: 844, init: `localStorage.setItem('empathia.demo.sandbox.v1', ${JSON.stringify(JSON.stringify(stored))})` }); const r = m.page;
  await r.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(r);
  const over = await r.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await shot(r, 'flagship-phone');
  const first = r.locator('[data-testid=fl-plan] .fl__dev').first(); await first.focus(); const id = await first.getAttribute('data-device'); await r.keyboard.press('Enter');
  const detail = await r.getByTestId('fl-detail').getAttribute('data-device').catch(() => null); await r.keyboard.press('Enter'); const cleared = (await r.getByTestId('fl-detail').count()) === 0;
  const small = await r.evaluate(() => [...document.querySelectorAll('[data-testid=flagship] button, [data-testid=flagship] select, [data-testid=flagship] input')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.height < 24 || b.width < 24) && e.getAttribute('type') !== 'checkbox'; }).map((e) => (e.textContent || e.getAttribute('data-testid') || '').trim().slice(0, 24)));
  ok('FL-10', 'phone width: nothing scrolls sideways; a position on the plan is reached and chosen by keyboard, and released the same way; every control is at least 24 px; no console error', over <= 1 && detail === id && cleared && !small.length && !m.errs.length && !t.errs.length, `overflow ${over}px · keyboard ${id}→${detail}, released ${cleared} · small ${small.slice(0, 3)} · ${[...m.errs, ...t.errs].slice(0, 2)}`);
  await m.close(); }

await h.app.stop();
{ const s = await open('#/flagship', { role: 'cxeng', sw: false, init: `localStorage.setItem('empathia.demo.sandbox.v1', ${JSON.stringify(JSON.stringify(stored))})` }); const r = s.page;
  await r.getByTestId('flagship').waitFor(); await r.waitForFunction(() => !document.querySelector('[data-testid=fl-asking]'), null, { timeout: 60000 }); const says = await r.locator('main').innerText();
  ok('FL-11', 'with the server stopped the page says the room cannot be shown, and shows no room', /not available here/.test(says) && /keeps no copy/.test(says) && (await r.getByTestId('fl-bar').count()) === 0 && (await r.getByTestId('fl-plan').count()) === 0, says.replace(/\s+/g, ' ').slice(-200));
  await s.close(); }
await t.close();
await done();
