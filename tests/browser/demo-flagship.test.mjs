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
//   FL-12  a camera is dragged on the plan: a draft in metres, snapped, drawn as a draft; nothing sent, the server unchanged
//   FL-13  the same move by keyboard and by number; it cannot leave the room; "other" needs a note
//   FL-14  a person the server does not let record is refused in its words; the draft stays; nothing recorded
//   FL-15  submitted as the installer it is a proposal everywhere: drawn as one, the camera stays, the design untouched
//   FL-16  its recorder cannot approve it (403 from the server, shown); still a proposal
//   FL-17  approved by someone else: as-built on the plan, in the room and in the field record; designed kept beside it; the tests
//          naming it marked to look at again; design row and revision unchanged; no baseline claimed
//   FL-18  it survives a refresh and a second person's browser (resume code only); designed layer can be hidden; phone width
//   FL-19  a rejected second move changes no place and is kept in the history
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

// ------------------------------------------------------------------------------------------------ moving a device (founder, 17 Nov 2026, 15:50)
// One camera is dragged, submitted, refused to its own recorder, approved by someone else, and then read back after a refresh and from
// a second browser. Every check compares the page with what the server answers to a separate request made by this test.
const tok = {}; const as = async (role) => (tok[role] ||= (await api.call('POST', '/v1/demo/sessions', { body: { sandboxId: stored.id, key: stored.key, role } })).body.accessToken);
const srv = async (role, pathname) => (await api.call('GET', `/v1/rooms/UNI-SCI-110${pathname}`, { token: await as(role) })).body;
const cam = S.devices.find((d) => d.cat === 'camera'); const camOnServer = async () => (await srv('cxeng', '')).devices.find((d) => d.id === cam.id);
const mark = (pg) => pg.locator(`[data-testid=fl-plan] .fl__dev[data-device="${cam.id}"]`); const xy = async (loc) => ({ x: Number(await loc.getAttribute('data-x')), y: Number(await loc.getAttribute('data-y')) });
const actAs = async (pg, role) => { await pg.getByTestId('fl-who').selectOption(role); await pg.waitForFunction((r) => document.querySelector('[data-testid=fl-at]')?.getAttribute('data-as') === r, role, { timeout: 60000 }); await settle(pg); };
const saidOk = async (pg) => { await settle(pg); return { ok: await pg.getByTestId('fl-said').getAttribute('data-ok'), text: (await text(pg, 'fl-said')).replace(/\s+/g, ' ') }; };
const near = (a, b, tol = 0.011) => Math.abs(a - b) <= tol; const grid = (v) => near(Math.round(v * 20) / 20, v, 1e-9);
// the browser logs every 4xx answer as a console error; the two refusals this test asks for on purpose (FL-14, FL-16) are 403s and are
// asserted where they happen, so they are not counted as page errors here. Anything else is.
const pageErrs = () => t.errs.filter((e) => !/status of 403/.test(e));
let draft = null;

{ await actAs(p, 'installer'); await mark(p).click(); await p.getByTestId('fl-move').click(); await p.getByTestId('fl-move-panel').waitFor();
  const disabledFirst = await p.getByTestId('fl-submit').isDisabled(); const focused = await p.evaluate(() => document.activeElement?.getAttribute('data-device'));
  const dot = mark(p).locator('circle:not(.fl__hit)'); await dot.scrollIntoViewIfNeeded(); const b = await dot.boundingBox(); const scale = await p.locator('[data-testid=fl-plan]').evaluate((el) => el.getScreenCTM().a);
  const from = { x: b.x + b.width / 2, y: b.y + b.height / 2 }; const to = { x: from.x - 1.5 * scale, y: from.y - 1.0 * scale };
  await p.mouse.move(from.x, from.y); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(from.x + (to.x - from.x) * i / 8, from.y + (to.y - from.y) * i / 8); await p.mouse.up();
  const at = await xy(mark(p)); const said = { x: Number(await p.getByTestId('fl-draft-at').getAttribute('data-x')), y: Number(await p.getByTestId('fl-draft-at').getAttribute('data-y')) };
  const drawn = await p.locator('[data-testid=fl-plan] .fl__draft').count(); const server = await camOnServer(); const moves = (await srv('cxeng', '/field-record')).moves.length; await shot(p, 'flagship-drag', false);
  ok('FL-12', 'a camera is dragged on the plan: the marker follows the pointer in metres, snapped to five centimetres; it is drawn as a draft; nothing is sent, and the server still holds the designed place',
    disabledFirst && focused === cam.id && near(at.x, cam.x - 1.5, 0.06) && near(at.y, cam.y - 1.0, 0.06) && grid(at.x) && grid(at.y) && at.x === said.x && at.y === said.y && drawn === 1 && server.placement.proposed === null && server.placement.basis === 'DESIGNED' && moves === 0,
    `${cam.id} designed (${cam.x}, ${cam.y}) → draft (${at.x}, ${at.y}) · drawn ${drawn} · server proposed ${JSON.stringify(server.placement.proposed)}, ${moves} moves · submit disabled before a reason ${disabledFirst} · keyboard focus on ${focused}`); }

{ const before = await xy(mark(p)); await mark(p).focus(); for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Shift+ArrowUp'); const keyed = await xy(mark(p));
  await p.getByTestId('fl-x').fill('99'); const clamped = await xy(mark(p)); await p.getByTestId('fl-x').fill(String(keyed.x)); await p.getByTestId('fl-y').fill('-4'); const floor = await xy(mark(p)); await p.getByTestId('fl-y').fill(String(keyed.y));
  draft = await xy(mark(p)); await p.getByTestId('fl-reason').selectOption('other'); const otherNeedsNote = await p.getByTestId('fl-submit').isDisabled(); await p.getByTestId('fl-reason').selectOption('sprinkler head');
  await p.getByTestId('fl-note').fill('a sprinkler head is where the design puts the camera (synthetic)'); const enabled = !(await p.getByTestId('fl-submit').isDisabled());
  ok('FL-13', 'the same move without a pointer: arrow keys nudge a tenth of a metre and half a metre with Shift; the number fields place it exactly and cannot leave the room; "other" needs a note before it can be submitted',
    near(keyed.x, before.x - 0.3) && near(keyed.y, before.y - 0.5) && clamped.x === S.room.geometry.widthM && floor.y === 0 && near(draft.x, keyed.x, 1e-9) && near(draft.y, keyed.y, 1e-9) && otherNeedsNote && enabled,
    `(${before.x}, ${before.y}) → keys (${keyed.x}, ${keyed.y}) · 99 across → ${clamped.x} of ${S.room.geometry.widthM} · -4 → ${floor.y} · "other" without a note disabled ${otherNeedsNote} · with a reason enabled ${enabled}`); }

{ const mayExec = (await srv('exec', '/field-record')).may.record; await actAs(p, 'exec'); const hint = await p.getByTestId('fl-record-hint').count(); await p.getByTestId('fl-submit').click(); const r = await saidOk(p);
  const kept = await xy(mark(p)); const server = await camOnServer(); const moves = (await srv('cxeng', '/field-record')).moves.length;
  ok('FL-14', 'a person the server does not let record a move is refused in the server’s words; the draft stays and nothing is recorded',
    mayExec === false && hint === 1 && r.ok === 'no' && /403/.test(r.text) && kept.x === draft.x && kept.y === draft.y && (await p.getByTestId('fl-move-panel').count()) === 1 && server.placement.proposed === null && moves === 0,
    `executive may record ${mayExec} · ${r.text.slice(0, 150)} · draft kept (${kept.x}, ${kept.y}) · server moves ${moves}`); }

let move = null;
{ await actAs(p, 'installer'); await p.getByTestId('fl-submit').click(); const r = await saidOk(p); const server = await camOnServer(); const field = await srv('cxeng', '/field-record'); move = field.moves[0];
  const stays = await xy(mark(p)); const prop = p.locator(`[data-testid=fl-plan] .fl__proposed[data-proposed="${cam.id}"] circle`); const pAt = { x: Number(await prop.getAttribute('cx')), y: Number(await prop.getAttribute('cy')) };
  const row = p.locator(`[data-testid=fl-views] tr[data-device="${cam.id}"]`); const eng = await xy(row.locator('[data-view=engineering]')); const lite = await xy(row.locator('[data-view=lite]')); await shot(p, 'flagship-proposed');
  ok('FL-15', 'submitted as the installer, the move is a proposal on the server and is drawn as one: the camera stays where it is in every product, the redline points at the proposed place, and the design is untouched',
    r.ok === 'yes' && r.text.includes(move.move) && move.state === 'PROPOSED' && server.placement.proposed.x === draft.x && server.placement.proposed.y === draft.y && server.placement.current.x === cam.x && server.placement.current.y === cam.y && server.x === cam.x && server.y === cam.y
      && stays.x === cam.x && stays.y === cam.y && pAt.x === draft.x && pAt.y === draft.y && eng.x === cam.x && eng.y === cam.y && lite.x === cam.x && lite.y === cam.y && (await row.getAttribute('data-agree')) === 'yes' && /a move is waiting/.test(await row.innerText())
      && (await p.getByTestId('fl-waiting').getAttribute('data-move')) === move.move && (await p.getByTestId('fl-move-panel').count()) === 0 && (await p.getByTestId('fl-move').count()) === 0,
    `${r.text.slice(0, 120)} · server ${move.move} ${move.state} → (${server.placement.proposed.x}, ${server.placement.proposed.y}); current (${server.placement.current.x}, ${server.placement.current.y}) · plan marker (${stays.x}, ${stays.y}), redline at (${pAt.x}, ${pAt.y})`); }

{ const hint = await p.getByTestId('fl-decide-hint').count(); await p.getByTestId('fl-approve').click(); const r = await saidOk(p); const state = (await srv('cxeng', '/field-record')).moves[0].state; const server = await camOnServer();
  ok('FL-16', 'the person who recorded the move cannot approve it: the server refuses, the page shows its words, and the move is still a proposal',
    hint === 1 && r.ok === 'no' && /403/.test(r.text) && state === 'PROPOSED' && server.placement.basis === 'DESIGNED' && (await p.getByTestId('fl-waiting').count()) === 1, `${r.text.slice(0, 170)} · server ${state}, basis ${server.placement.basis}`); }

let built = null;
{ const revBefore = (await srv('cxeng', '')).room.rev; await actAs(p, 'syseng'); await p.getByTestId('fl-decision').fill('clear of the sprinkler head (synthetic)'); await p.getByTestId('fl-approve').click(); const r = await saidOk(p);
  const room = await srv('cxeng', ''); const server = room.devices.find((d) => d.id === cam.id); const field = await srv('cxeng', '/field-record'); const fdev = field.devices.find((d) => d.asset === cam.id); const base = await srv('syseng', '/baselines');
  built = await xy(mark(p)); const ghost = p.locator(`[data-testid=fl-plan] .fl__ghost[data-ghost="${cam.id}"] circle`); const g = { x: Number(await ghost.getAttribute('cx')), y: Number(await ghost.getAttribute('cy')) };
  const row = p.locator(`[data-testid=fl-views] tr[data-device="${cam.id}"]`); const eng = await xy(row.locator('[data-view=engineering]')); const lite = await xy(row.locator('[data-view=lite]')); const assurance = await row.locator('[data-view=assurance]').innerText();
  await p.locator('[data-testid=fl-phases] button').first().click(); const againRows = await p.locator(`[data-testid=fl-rows] [data-again="${cam.id}"]`).count(); const recheckSays = await text(p, 'fl-recheck'); const hist = await p.locator('[data-testid=fl-history] li').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-move')} ${e.getAttribute('data-state')}`));
  await shot(p, 'flagship-as-built');
  ok('FL-17', 'approved by someone else, the camera is at its as-built place in the room, the field record and on the plan; the designed place is kept and drawn beside it; the tests that name it are marked to be looked at again; the design is not edited; there is no baseline to claim',
    r.ok === 'yes' && built.x === draft.x && built.y === draft.y && server.placement.basis === 'AS_BUILT' && server.placement.current.x === draft.x && server.placement.current.y === draft.y && server.placement.designed.x === cam.x && server.placement.designed.y === cam.y && server.x === cam.x && server.y === cam.y && room.room.rev === revBefore
      && fdev.asBuilt.x === draft.x && fdev.asBuilt.y === draft.y && g.x === cam.x && g.y === cam.y && (await p.locator('[data-testid=fl-plan] .fl__proposed').count()) === 0 && eng.x === draft.x && eng.y === draft.y && lite.x === draft.x && lite.y === draft.y && (await row.getAttribute('data-agree')) === 'yes'
      && base.current === null && /no baseline yet/.test(assurance) && (await p.getByTestId('fl-pos-built').getAttribute('data-basis')) === 'AS_BUILT' && (await text(p, 'fl-pos-designed')).includes(`${cam.x} m across, ${cam.y} m from the front`)
      && fdev.recheck.length >= 3 && againRows === fdev.recheck.length && recheckSays.startsWith('look again') && recheckSays.includes(String(fdev.recheck.length)) && hist.length === 1 && hist[0] === `${move.move} APPROVED`,
    `${r.text.slice(0, 90)} · plan (${built.x}, ${built.y}), designed ghost (${g.x}, ${g.y}) · room ${server.placement.basis} (${server.placement.current.x}, ${server.placement.current.y}), design row still (${server.x}, ${server.y}), revision ${revBefore}→${room.room.rev} · field record (${fdev.asBuilt.x}, ${fdev.asBuilt.y}) · ${fdev.recheck.length} tests to look at again, ${againRows} marked in the plan · ${hist} · ${assurance.trim()}`); }

{ await p.reload(); await p.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(p); const after = await xy(mark(p)); const ghosts = await p.locator(`[data-testid=fl-plan] .fl__ghost[data-ghost="${cam.id}"]`).count();
  await p.getByTestId('fl-designed').uncheck(); const hidden = await p.locator('[data-testid=fl-plan] .fl__ghost').count(); await p.getByTestId('fl-designed').check();
  const u = await open('#/connected', { role: 'designer', sw: false }); const q = u.page; q.setDefaultTimeout(30000); const nothing = await q.evaluate(() => localStorage.getItem('empathia.demo.sandbox.v1'));
  await q.getByTestId('connected').waitFor(); await q.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready');
  await q.getByTestId('cn-resume-code').fill(`${stored.id}.${stored.key}`); await q.getByTestId('cn-resume').click(); await q.getByTestId('cn-journey').waitFor({ timeout: 120000 });
  await q.goto(`${base}#/flagship`); await q.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(q); await actAs(q, 'designer');
  const theirs = await xy(mark(q)); const theirGhost = await q.locator(`[data-testid=fl-plan] .fl__ghost[data-ghost="${cam.id}"]`).count(); const row = q.locator(`[data-testid=fl-views] tr[data-device="${cam.id}"]`); const eng = await xy(row.locator('[data-view=engineering]')); const lite = await xy(row.locator('[data-view=lite]'));
  await mark(q).click(); const theirHistory = await q.locator('[data-testid=fl-history] li').count(); const designedSays = await text(q, 'fl-pos-designed');
  await q.setViewportSize({ width: 390, height: 844 }); await q.waitForTimeout(200); const over = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await shot(q, 'flagship-as-built-phone');
  ok('FL-18', 'it survives a refresh, and a second person in a second browser with nothing stored reads the same as-built place, the same designed place and the same history from the same server; the designed layer can be hidden; nothing scrolls sideways at phone width',
    after.x === built.x && after.y === built.y && ghosts === 1 && hidden === 0 && nothing === null && theirs.x === built.x && theirs.y === built.y && theirGhost === 1 && eng.x === built.x && lite.x === built.x && eng.y === built.y && lite.y === built.y && theirHistory === 1 && designedSays.includes(`${cam.x} m across`) && over <= 1 && !u.errs.length,
    `after reload (${after.x}, ${after.y}), ghost ${ghosts}, hidden ${hidden} · second browser as the designer (${theirs.x}, ${theirs.y}), ghost ${theirGhost}, history ${theirHistory} · phone overflow ${over}px · ${u.errs.slice(0, 2)}`);
  await u.close(); }

{ await actAs(p, 'installer'); await mark(p).click(); await p.getByTestId('fl-move').click(); await mark(p).focus(); for (let i = 0; i < 4; i++) await p.keyboard.press('Shift+ArrowRight'); const tried = await xy(mark(p));
  await p.getByTestId('fl-reason').selectOption('other'); await p.getByTestId('fl-note').fill('tried the other side (synthetic)'); await p.getByTestId('fl-submit').click(); const sent = await saidOk(p);
  await actAs(p, 'syseng'); await p.getByTestId('fl-decision').fill('the lectern is in its view from there (synthetic)'); await p.getByTestId('fl-reject').click(); const r = await saidOk(p);
  const stays = await xy(mark(p)); const server = await camOnServer(); const hist = await p.locator('[data-testid=fl-history] li').evaluateAll((els) => els.map((e) => e.getAttribute('data-state')));
  ok('FL-19', 'a second move, rejected by someone else, changes no place: the camera stays at its approved as-built position, the designed place is still there, and the rejected proposal is kept in the history',
    sent.ok === 'yes' && r.ok === 'yes' && /rejected/.test(r.text) && near(tried.x, built.x + 2, 0.011) && stays.x === built.x && stays.y === built.y && server.placement.current.x === built.x && server.placement.proposed === null && server.placement.designed.x === cam.x
      && (await p.locator('[data-testid=fl-plan] .fl__proposed').count()) === 0 && hist.length === 2 && hist.includes('APPROVED') && hist.includes('REJECTED') && server.placement.history.length === 2 && !pageErrs().length,
    `tried (${tried.x}, ${tried.y}) · ${r.text.slice(0, 80)} · plan (${stays.x}, ${stays.y}) · server current (${server.placement.current.x}, ${server.placement.current.y}), designed (${server.placement.designed.x}, ${server.placement.designed.y}) · history ${hist} · ${pageErrs().slice(0, 2)}`); }

await h.app.stop();
{ const s = await open('#/flagship', { role: 'cxeng', sw: false, init: `localStorage.setItem('empathia.demo.sandbox.v1', ${JSON.stringify(JSON.stringify(stored))})` }); const r = s.page;
  await r.getByTestId('flagship').waitFor(); await r.waitForFunction(() => !document.querySelector('[data-testid=fl-asking]'), null, { timeout: 60000 }); const says = await r.locator('main').innerText();
  ok('FL-11', 'with the server stopped the page says the room cannot be shown, and shows no room', /not available here/.test(says) && /keeps no copy/.test(says) && (await r.getByTestId('fl-bar').count()) === 0 && (await r.getByTestId('fl-plan').count()) === 0, says.replace(/\s+/g, ' ').slice(-200));
  await s.close(); }
await t.close();
await done();
