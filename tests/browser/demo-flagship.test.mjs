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
//   FL-20  before commissioning: the register by the installer, the start by the systems engineer; others refused by the server
//   FL-21  the bench is an analysis: positions on the plan, octave bands, a longer decay a larger figure; nothing sent until recorded
//   FL-22  the measurement on the server: the bench's value, SIMULATED, the analysis package as evidence, the database's verdict shown
//   FL-23  PASS on a measurement that misses the limit refused; FAIL recorded; a deficiency opened and listed
//   FL-24  handed to ServiceHands by the service manager; triage; Search Party's answer and the candidates are the server's; assigned
//   FL-25  the technician's work with each gate held by the server; a closed job leaves the deficiency open and the test failed
//   FL-26  the correction recorded; a retest refused until the room is measured again; PASS on the new measurement; closed by
//          someone else's verification
//   FL-27  refresh, a second person's browser, phone width
//   FL-28  acceptance asked too early is refused with reasons; the handover documents one at a time; the other checks one request each
//   FL-29  verification by someone else; the acceptance lent, not self-granted; accepted by the operations lead; baseline 1
//   FL-30  the baseline: the design untouched, the as-built place, the measured value and its limit; closed field record; refresh,
//          a second person's browser, phone width
//   FL-31  the server works the value out itself: the measurement carries the figure the server recomputed from the package; a loaded
//          response file is analysed on the page, and the sandbox's server refuses to store it, so nothing is recorded from it
//   FL-32  a second technician whose permissions are tested: listed as failing a gate with the reason (a credential recorded and not
//          verified); "assign anyway" refused; the service manager who recorded the credential cannot verify it and the data steward
//          can, after which the gates admit both; the job assigned to the first is refused to the second at acceptance and at the start
//   FL-34  a room in service: an incident is reported by a requestor on a device chosen on the plan; it is the server's record, the
//          room's status is derived from it, the room's thread lists it, and a refresh keeps it
//   FL-35  the incident is worked like any issue and closed by its own rules: an owner; a ServiceHands job done by the second
//          technician; a closed job does not close the incident; the correction says how it was resolved; whoever fixed it cannot
//          confirm it and its reporter can; the reporter cannot close it and the service manager can
//   FL-36  a second report of the same kind on the same device is marked a repeat by the database; a blocked incident's correction
//          waits; an escalation is recorded once; what the records add up to is the server's count; phone width
//   FL-40  the user impact of a deficiency recorded from the page, with why (0046)
//   FL-39  who to call: the support paths of the room's site from the server, Teams/email/copy hand-offs (nothing sent)
//   FL-38  Pass with Exception from the page: an exception record logged, refused to its logger, rejected with a reason by the systems engineer
//   FL-37  documentation and submission (0043): the required documents submitted and approved by different people, and the packet
//          signed for the integrator and the owner by two different people, before acceptance; refused to the wrong role each time
//   FL-33  the same page on another room: chosen from the page, Harbor 201 of the convention centre is read from the server by its
//          own identifier (its plan, its devices, its criterion, the seats its plan draws); its camera is moved and approved there and
//          the lecture theatre's record does not change; the address keeps the room across a refresh; a room the sandbox does not
//          have is said to be absent
//   node tests/browser/demo-flagship.test.mjs
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { repo } from './demo-shell-lib.mjs';
import { setup, client } from '../integration/harness.mjs';
import { syntheticIR, writeWav16 } from '@empathia/commissioning-engine/acoustics';

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
// the browser logs every 4xx answer as a console error; the refusals this test asks for on purpose (FL-14, FL-16, FL-20, FL-22, FL-23)
// are 403s (not this person's to do) and 422s (refused by a rule) and are asserted where they happen, so they are not counted as
// page errors here. Anything else is.
// 415: FL-31 has the server refuse a response file (a sandbox stores short text notes only); the browser logs the refused request
// as it does a 403 or a 422, and the page shows the refusal, which is what the check reads.
const pageErrs = () => t.errs.filter((e) => !/status of 4(03|15|22)/.test(e));
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

// ------------------------------------------------------------------------------------------------ commissioning: the bench, the measurement, the result
// The bench works a value out; the server records it; the database judges it; the result rests on it. Each check reads the server itself.
const RT = 'reverberation_rt60'; const measuredOnServer = async () => (await srv('cxeng', '/measurements')).items.filter((m) => m.test_id === RT);
const benchValue = async (pg) => Number(await pg.getByTestId('fl-bench-value').getAttribute('data-value'));
const setDecay = async (pg, want) => { const el = pg.getByTestId('fl-bench-rt'); await el.focus(); for (let i = 0; i < 60; i++) { const v = Number(await el.inputValue()); if (Math.abs(v - want) < 0.001) return; await pg.keyboard.press(v > want ? 'ArrowLeft' : 'ArrowRight'); } throw new Error(`the decay slider did not reach ${want}`); };

{ const before = await p.getByTestId('fl-register-state').getAttribute('data-open'); const all = await p.getByTestId('fl-register-state').getAttribute('data-all');
  await actAs(p, 'exec'); await p.getByTestId('fl-register').click(); const no = await saidOk(p); const stillOpen = (await srv('installer', '/register')).items.filter((x) => x.missing.length).length;
  await actAs(p, 'installer'); await p.getByTestId('fl-register').click(); const filled = await saidOk(p); const open = (await srv('installer', '/register')).items.filter((x) => x.missing.length).length;
  await p.getByTestId('fl-commission').click(); const notYours = await saidOk(p); const stage1 = (await srv('cxeng', '')).room.lifecycle;
  await actAs(p, 'syseng'); await p.getByTestId('fl-commission').click(); const started = await saidOk(p); const stage2 = (await srv('cxeng', '')).room.lifecycle;
  ok('FL-20', 'before commissioning: the register is filled by the installer (anyone else is refused by the server) and commissioning is started by the systems engineer (the installer is refused); the server holds each step',
    Number(before) > 0 && before === all && no.ok === 'no' && stillOpen === Number(before) && filled.ok === 'yes' && open === 0 && notYours.ok === 'no' && stage1 === 'INSTALLED_UNVERIFIED' && started.ok === 'yes' && stage2 === 'COMMISSIONING' && (await p.getByTestId('fl-start-card').count()) === 0,
    `${before} of ${all} units open · as the executive: ${no.text.slice(0, 70)} (${stillOpen} still open) · as the installer ${filled.text.slice(0, 30)} (${open} open) · installer starting: ${notYours.text.slice(0, 60)} (${stage1}) · systems engineer: ${stage2}`); }

let first = 0;
{ await actAs(p, 'cxeng'); const crit = await p.getByTestId('fl-bench-criterion').getAttribute('data-upper'); const disabled = await p.getByTestId('fl-bench-analyse').isDisabled();
  await p.getByTestId('fl-bench-typical').click(); const placed = await p.locator('[data-testid=fl-bench-plan] .fb__pos').count();
  // one more, by clicking the plan, then removed: the plan takes positions
  const plan = p.getByTestId('fl-bench-plan'); await plan.scrollIntoViewIfNeeded(); const b = await plan.boundingBox(); await p.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.5); const clicked = await p.locator('[data-testid=fl-bench-plan] .fb__pos').count();
  await p.locator('[data-testid=fl-bench-positions] li').last().getByRole('button', { name: 'remove' }).click();
  await setDecay(p, 0.8); await p.getByTestId('fl-bench-analyse').click(); await p.getByTestId('fl-bench-value').waitFor(); const low = await benchValue(p);
  await setDecay(p, 1.4); const cleared = (await p.getByTestId('fl-bench-result').count()) === 0; await p.getByTestId('fl-bench-analyse').click(); await p.getByTestId('fl-bench-value').waitFor(); first = await benchValue(p);
  const mid = await p.locator('[data-testid=fl-bench-bands] tr[data-mid=yes]').count(); const curve = await p.locator('[data-testid=fl-bench-decay] .fb__curve').getAttribute('d'); const none = (await measuredOnServer()).length; await shot(p, 'flagship-bench');
  ok('FL-21', 'the bench is an analysis, not a number typed in: positions are placed on the plan, the responses are analysed in octave bands, a longer decay gives a larger figure, changing an input discards the old figure, and nothing reaches the server until it is recorded',
    crit === '1' && disabled && placed === 4 && clicked === 5 && low > 0.7 && low < 0.92 && first > 1.28 && first < 1.56 && cleared && mid === 2 && curve.length > 500 && none === 0,
    `criterion at most ${crit} s · ${placed} typical positions, ${clicked} after a click on the plan · decay 0.8 s → ${low} s, 1.4 s → ${first} s · old figure discarded ${cleared} · ${mid} mid bands · curve ${curve.length} characters · ${none} on the server`); }

let failedOn = null;
{ await actAs(p, 'installer'); await p.getByTestId('fl-bench-typical').click(); await p.getByTestId('fl-bench-analyse').click(); await p.getByTestId('fl-bench-record').click(); const notResponsible = await saidOk(p); const none = (await measuredOnServer()).length;
  await actAs(p, 'cxeng'); await p.getByTestId('fl-bench-record').click(); const r = await saidOk(p); const ms = await measuredOnServer(); const m = ms[0]; failedOn = m;
  const file = m ? await api.call('GET', `/v1/evidence/${m.evidence_id}/content`, { token: await as('cxeng') }) : null; const pkg = file && typeof file.body === 'object' ? file.body : null;
  const li = p.locator('[data-testid=fl-measured] li').first();
  ok('FL-22', 'recorded as the commissioning engineer (the installer is refused), the measurement is on the server with the value the bench showed, as SIMULATED, with the analysis package as its evidence; the verdict on the page is the one the database gave',
    notResponsible.ok === 'no' && /403/.test(notResponsible.text) && none === 0 && r.ok === 'yes' && /does not meet the criterion \(at most 1 s, version 1\)/.test(r.text) && ms.length === 1 && Number(m.value) === first && m.within === false && m.provenance === 'SIMULATED' && m.criterion_version === 1
      && pkg && pkg.synthetic === true && pkg.value === first && pkg.positions.length === 4 && pkg.positions.every((x) => x.response.synthetic === true && x.bands.length >= 4) && /No room was measured/.test(pkg.statement)
      && (await li.getAttribute('data-within')) === 'no' && (await li.getAttribute('data-measurement')) === m.id && /does not meet/.test(await li.innerText()) && /simulated/.test(await li.innerText()),
    `installer: ${notResponsible.text.slice(0, 80)} · ${r.text.slice(0, 110)} · server ${m ? `${Number(m.value)} s within ${m.within} ${m.provenance} v${m.criterion_version}` : 'nothing'} · package ${pkg ? `${pkg.positions.length} positions, synthetic ${pkg.synthetic}` : 'unreadable'}`);

  // FL-31: the figure on the record is the server's own, and a file the server cannot read records nothing
  const v = m?.validation; const shown = p.getByTestId('fl-recomputed').first(); const shownText = (await shown.innerText()).replace(/\s+/g, ' ');
  const wav = Buffer.from(writeWav16(syntheticIR(0.6, { rate: 16000, seed: 5 }).samples, 16000));
  await p.getByTestId('fl-bench-file-1').setInputFiles({ name: 'position-1-synthetic.wav', mimeType: 'audio/wav', buffer: wav }); await p.getByTestId('fl-bench-analyse').click(); await p.getByTestId('fl-bench-value').waitFor();
  const withFile = await benchValue(p); const note = await p.getByTestId('fl-bench-files-note').count(); await p.getByTestId('fl-bench-record').click(); const fileSaid = await saidOk(p); const after = (await measuredOnServer()).length;
  await p.getByTestId('fl-bench-typical').click(); const noteGone = await p.getByTestId('fl-bench-files-note').count();
  ok('FL-31', 'the measurement carries the figure the server worked out again from the package (the same as the bench’s, and said so on the page); a loaded response file is analysed on the page and changes the figure, the page says a sandbox will not store it, the server refuses it and nothing is recorded',
    !!v && v.recomputed === first && v.sent === first && v.synthetic === true && v.positions.length === 4 && /recomputed by the server/.test(v.method) && /The server worked this out again from the evidence \(4 responses, synthetic reference signals\)/.test(r.text)
      && Number(await shown.getAttribute('data-recomputed')) === first && /worked out by the server from the evidence \(4 responses, synthetic reference signals\)/.test(shownText)
      && withFile < first && note === 1 && fileSaid.ok === 'no' && /short text notes only/.test(fileSaid.text) && /Nothing was recorded/.test(fileSaid.text) && after === 1 && noteGone === 0,
    `server: sent ${v?.sent} s, recomputed ${v?.recomputed} s over ${v?.positions?.length} responses · page: “${shownText.slice(0, 90)}” · with a 0.6 s file at position 1 the bench shows ${withFile} s · ${fileSaid.text.slice(0, 150)} · ${after} on the server`); }

{ await p.getByTestId('fl-result-pass').click(); const pass = await saidOk(p); const rowsBefore = (await srv('cxeng', '')).commissioning.rows.find((x) => x.test_id === RT).result;
  await p.getByTestId('fl-result-fail').click(); const fail = await saidOk(p); const room = await srv('cxeng', ''); const row = room.commissioning.rows.find((x) => x.test_id === RT);
  const issues = (await srv('cxeng', '/thread')).stages.find((x) => x.key === 'commissioning').records.issues || []; const shownIssue = p.locator('[data-testid=fl-issues] li').first();
  await p.locator('[data-testid=fl-phases] button').first().click(); const cell = await p.locator(`[data-testid=fl-rows] tr[data-test="${RT}"] td`).last().innerText(); await shot(p, 'flagship-failed');
  ok('FL-23', 'PASS on a measurement that misses the limit is refused by the server and nothing is recorded; FAIL on it is recorded, the plan shows it, and the server opens a deficiency that the page lists',
    pass.ok === 'no' && /cannot be recorded as PASS/.test(pass.text + (await p.getByTestId('fl-said').innerText())) && rowsBefore === 'NOT_TESTED' && fail.ok === 'yes' && /^FAIL/.test(row.result) && issues.length === 1 && issues[0].state === 'OPEN'
      && (await shownIssue.getAttribute('data-issue')) === issues[0].code && (await p.locator('[data-testid=fl-measured] li').first().getAttribute('data-cited')) === 'FAIL' && /fail/i.test(cell),
    `PASS: ${pass.text.slice(0, 150)} (row still ${rowsBefore}) · FAIL: row ${row.result}, ${issues.length} deficiency ${issues[0]?.code} ${issues[0]?.state} “${issues[0]?.title}” · plan cell “${cell.trim().slice(0, 40)}”`); }

// ------------------------------------------------------------------------------------------------ the corrective action: ServiceHands, Search Party, the retest
const press = async (pg, id) => { await pg.getByTestId(id).click(); return saidOk(pg); };
const issueOnServer = async () => (await srv('cxeng', '/thread')).stages.find((x) => x.key === 'commissioning').records.issues[0];
const woOnServer = async (code) => (await api.call('GET', `/v1/work-orders/${code}`, { token: await as('svcmgr') })).body;
const panel = p.getByTestId('fl-corrective'); let WO = ''; const second = {};   // FL-32 is checked across the two blocks below

// Pass with Exception (0042): the commissioning engineer logs an exception record for the failed reverberation; the server copies the
// measured value and the limit; the logger cannot decide it; the systems engineer rejects it with a reason, and the deficiency goes on
// to be corrected (the approval and the exception itself are covered by tests/security/measured-exception ME-01…08)
{ await p.getByTestId('fl-exc').locator('summary').click(); const logged = await press(p, 'fl-exc-log');
  const recs = async () => (await srv('cxeng', '/measured-exceptions')).items;
  const r0 = (await recs())[0]; const self = await press(p, 'fl-exc-approve');
  await actAs(p, 'syseng'); await p.getByTestId('fl-exc-note').fill('Correct it: absorption on the rear wall is within the brief (synthetic).'); const no = await press(p, 'fl-exc-reject');
  const r1 = (await recs())[0]; const state = await p.getByTestId('fl-exc').getAttribute('data-state');
  ok('FL-38', 'Pass with Exception: an exception record logged from the page carries the server’s measured value and limit; its logger cannot decide it; the systems engineer rejects it with a reason; the deficiency stays open to be corrected',
    logged.ok === 'yes' && r0?.measured?.value > r0?.limit?.upper && self.ok === 'no' && no.ok === 'yes' && r1.state === 'REJECTED' && state === 'NONE' && (await issueOnServer()).state === 'OPEN',
    `log: ${logged.text.slice(0, 60)} · ${r0?.code} ${r0?.measured?.value} ${r0?.measured?.unit} vs ≤ ${r0?.limit?.upper} · by its logger: ${self.text.slice(0, 60)} · rejected: ${r1?.state}`);
  await actAs(p, 'cxeng'); }

// the user impact of the deficiency (0046): recorded with why by the commissioning engineer; an issue event on the server
{ await p.getByTestId('fl-def-impact-v').selectOption('major_disruption'); const set = await press(p, 'fl-def-impact-set');
  const d = await (async () => { const i = await issueOnServer(); return (await api.call('GET', `/v1/issues/${i.code}/deficiency`, { token: await as('cxeng') })).body; })();
  ok('FL-40', 'the user impact of the deficiency is recorded from the page with why, and the server holds it', set.ok === 'yes' && d.userImpact === 'major_disruption', `${set.text.slice(0, 80)} · server ${d.userImpact}`); }

{ const notMine = await press(p, 'fl-wo-raise'); const none = (await issueOnServer()).workOrders.length;                       // still the commissioning engineer
  await actAs(p, 'svcmgr'); const raised = await press(p, 'fl-wo-raise'); WO = (await issueOnServer()).workOrders[0];
  const triaged = await press(p, 'fl-wo-triage'); const w = await woOnServer(WO); const need = await text(p, 'fl-wo-need');
  await actAs(p, 'cxeng'); const hidden = await p.getByTestId('fl-candidates-hidden').count(); const cannot = await press(p, 'fl-sp-ask');
  await actAs(p, 'svcmgr'); const asked = await press(p, 'fl-sp-ask'); const answer = (await text(p, 'fl-sp-answer')).replace(/\s+/g, ' ');
  const shown = await p.locator('[data-testid=fl-candidates] li[data-eligible=yes]').evaluateAll((els) => els.map((e) => e.getAttribute('data-person'))); const reasons = await p.locator('[data-testid=fl-candidates] li[data-eligible=yes]').first().innerText();
  // FL-32, before anybody is assigned: the second technician is in the pool and the gates hold them back, for a stated reason
  { const techs = (await api.call('GET', '/v1/demo/sandbox', { token: await as('svcmgr') })).body.personas.filter((x) => x.role === 'service'); second.id1 = techs[0].id; second.id2 = techs[1]?.id;
    const row2 = p.locator(`[data-testid=fl-candidates] li[data-eligible=no][data-person="${second.id2}"]`); second.listed = await row2.count(); second.why = (await row2.innerText()).replace(/\s+/g, ' ');
    second.anyway = await press(p, 'fl-assign-anyway'); second.stateAfterAnyway = (await woOnServer(WO)).state; second.pendingShown = await p.getByTestId('fl-creds').getAttribute('data-pending');
    second.byRecorder = await press(p, 'fl-cred-verify');                                                                       // the service manager recorded it
    await actAs(p, 'service2'); second.own = await p.locator('[data-testid=fl-creds] li').count(); second.hidden2 = await p.getByTestId('fl-candidates-hidden').count(); second.byHolder = await press(p, 'fl-cred-verify');
    await actAs(p, 'steward'); second.bySteward = await press(p, 'fl-cred-verify'); second.cred = (await api.call('GET', `/v1/competencies?person=${second.id2}`, { token: await as('svcmgr') })).body.items[0];
    await actAs(p, 'svcmgr'); second.eligibleNow = await p.locator('[data-testid=fl-candidates] li[data-eligible=yes]').evaluateAll((els) => els.map((e) => e.getAttribute('data-person'))); second.ineligibleNow = await p.locator('[data-testid=fl-candidates] li[data-eligible=no]').count();
    // Search Party's earlier answer said one person passes; two do now, so it is withdrawn until asked again, and the new answer says two
    second.stale = await p.getByTestId('fl-sp-stale').count(); second.oldAnswer = await p.getByTestId('fl-sp-answer').count(); await press(p, 'fl-sp-ask'); second.newAnswer = (await text(p, 'fl-sp-answer')).replace(/\s+/g, ' '); await shot(p, 'flagship-two-technicians'); }
  // two people pass now: the first technician's own row is the one pressed
  await p.locator(`[data-testid=fl-candidates] li[data-person="${w.candidates.eligible[0].id}"]`).getByTestId('fl-assign').click(); const assigned = await saidOk(p); const after = await woOnServer(WO); await shot(p, 'flagship-assigned');
  ok('FL-24', 'the deficiency is handed to ServiceHands by the service manager (the commissioning engineer is refused); triage sets what the job needs; Search Party’s answer and the candidates are the server’s, with their reasons; who may not assign sees no ranking; the person assigned is one the gates admit',
    notMine.ok === 'no' && none === 0 && raised.ok === 'yes' && /^WO-/.test(WO) && triaged.ok === 'yes' && w.state === 'TRIAGED' && w.severity === 'High' && w.need.certs.every((k) => need.includes(k)) && hidden === 1
      && asked.ok === 'yes' && answer.includes(w.candidates.eligible[0].name) && /pass the hard gates/.test(answer) && /calendars are not connected/.test(answer) && JSON.stringify(shown) === JSON.stringify(w.candidates.eligible.map((k) => k.id)) && w.candidates.eligible[0].reasons.every((r) => reasons.includes(r))
      && assigned.ok === 'yes' && after.state === 'ASSIGNED' && after.assignee.id === w.candidates.eligible[0].id && (await text(p, 'fl-wo-assignee')).includes(after.assignee.name),
    `engineer raising: ${notMine.text.slice(0, 60)} · ${WO} ${w.state} ${w.severity}, needs ${w.need.certs.join('+')} · engineer asking Search Party: ${cannot.ok} “${cannot.text.slice(0, 70)}” · ${answer.slice(0, 150)} · ${shown.length} eligible shown of ${w.candidates.eligible.length} · assigned to ${after.assignee?.name} (${after.state})`); }

{ const notTech = await press(p, 'fl-wo-accept'); await actAs(p, 'service2'); second.accept = await press(p, 'fl-wo-accept'); second.stateAfterAccept = (await woOnServer(WO)).state; second.only = await text(p, 'fl-wo-only');
  await actAs(p, 'service'); const accepted = await press(p, 'fl-wo-accept');
  const empty = await press(p, 'fl-wo-preflight'); const pf1 = await p.getByTestId('fl-pf-state').getAttribute('data-ok'); const blocked = await press(p, 'fl-wo-start'); const s1 = (await woOnServer(WO)).state;
  await p.getByTestId('fl-pf-safety').check(); await p.getByTestId('fl-pf-tools').check(); await p.getByTestId('fl-pf-access').fill('facilities desk (synthetic)'); const full = await press(p, 'fl-wo-preflight'); const pf2 = await p.getByTestId('fl-pf-state').getAttribute('data-ok');
  await actAs(p, 'service2'); second.start = await press(p, 'fl-wo-start'); second.stateAfterStart = (await woOnServer(WO)).state; await actAs(p, 'service');   // the preflight passed, and the job is still not theirs to start
  const started = await press(p, 'fl-wo-start'); const early = await press(p, 'fl-wo-submit'); const s2 = (await woOnServer(WO)).state;
  const ev = await press(p, 'fl-wo-evidence'); const handed = await press(p, 'fl-wo-submit'); const own = await press(p, 'fl-wo-verify'); const s3 = (await woOnServer(WO)).state;
  await actAs(p, 'cxeng'); const verified = await press(p, 'fl-wo-verify'); await actAs(p, 'svcmgr'); const unconfirmed = await press(p, 'fl-wo-close'); const s4 = (await woOnServer(WO)).state;
  await p.getByTestId('fl-wo-confirmed').check(); const closed = await press(p, 'fl-wo-close'); const w = await woOnServer(WO); const issue = await issueOnServer(); const row = (await srv('cxeng', '')).commissioning.rows.find((x) => x.test_id === RT);
  ok('FL-25', 'the technician’s work, each gate held by the server: only the assignee accepts; a failed preflight is recorded and blocks the start; no hand-over without field evidence; the technician cannot verify their own work; closing needs the requester’s confirmation; and a closed job leaves the deficiency open and the test failed',
    notTech.ok === 'no' && accepted.ok === 'yes' && empty.ok === 'yes' && pf1 === 'no' && blocked.ok === 'no' && s1 === 'ACCEPTED' && full.ok === 'yes' && pf2 === 'yes' && started.ok === 'yes' && early.ok === 'no' && s2 === 'IN_PROGRESS' && ev.ok === 'yes' && handed.ok === 'yes'
      && own.ok === 'no' && s3 === 'VERIFYING' && verified.ok === 'yes' && unconfirmed.ok === 'no' && s4 === 'RESOLVED' && closed.ok === 'yes' && w.state === 'CLOSED' && w.evidenceCount === 1 && issue.state === 'OPEN' && /^FAIL/.test(row.result),
    `manager accepting: ${notTech.text.slice(0, 50)} · empty preflight ${pf1}, start: ${blocked.text.slice(0, 60)} · full preflight ${pf2} · hand-over without evidence: ${early.text.slice(0, 50)} · own verification: ${own.text.slice(0, 50)} · close without confirmation: ${unconfirmed.text.slice(0, 50)} · ${WO} ${w.state}; ${issue.code} ${issue.state}; test ${row.result}`);
  ok('FL-32', 'a second technician whose permissions are tested against the server: listed as failing a gate, with the reason; “assign anyway” is refused and nothing is assigned; the credential is not verified by its recorder or its holder, and is by the data steward, after which the gates admit both; the job assigned to the first is refused to the second at acceptance and, with the preflight passed, at the start',
    !!second.id2 && second.listed === 1 && /fails a gate/.test(second.why) && /recorded, not yet verified by someone other than its recorder and its holder/.test(second.why) && second.anyway.ok === 'no' && /fails a hard gate/.test(second.anyway.text) && second.stateAfterAnyway === 'TRIAGED' && second.pendingShown === '1'
      && second.byRecorder.ok === 'no' && /403/.test(second.byRecorder.text) && second.own === 1 && second.hidden2 === 1 && second.byHolder.ok === 'no' && second.bySteward.ok === 'yes' && second.cred.state === 'VERIFIED' && second.cred.countsForDispatch === true
      && second.eligibleNow.length === 2 && second.eligibleNow.includes(second.id1) && second.eligibleNow.includes(second.id2) && second.ineligibleNow === 0 && second.stale === 1 && second.oldAnswer === 0 && /2 of 2 people in the service pool pass/.test(second.newAnswer)
      && second.accept.ok === 'no' && /accepted by the technician it was assigned to/.test(second.accept.text) && second.stateAfterAccept === 'ASSIGNED' && /refuses each of these steps to anyone else/.test(second.only)
      && second.start.ok === 'no' && /the assigned technician starts the work/.test(second.start.text) && second.stateAfterStart === 'ACCEPTED',
    `listed: “${second.why.slice(0, 150)}” · assign anyway: ${second.anyway.text.slice(0, 90)} (${second.stateAfterAnyway}) · verify as its recorder: ${second.byRecorder.text.slice(0, 60)} · as its holder: ${second.byHolder.text.slice(0, 60)} · as the steward: ${second.bySteward.ok}, ${second.cred.state} · eligible now ${second.eligibleNow.length} · second accepting: ${second.accept.text.slice(0, 70)} · second starting: ${second.start.text.slice(0, 70)}`); }

let retest = null;
{ await actAs(p, 'cxeng'); const started = await press(p, 'fl-def-start'); await actAs(p, 'service'); const fixed = await press(p, 'fl-def-fixed');
  await actAs(p, 'cxeng'); const tooSoon = await press(p, 'fl-def-retest'); const wf1 = (await issueOnServer()).workflow;
  await setDecay(p, 0.8); await p.getByTestId('fl-bench-analyse').click(); await p.getByTestId('fl-bench-value').waitFor(); const again = await benchValue(p); const rec = await press(p, 'fl-bench-record'); const pass = await press(p, 'fl-result-pass');
  const ms = await measuredOnServer(); retest = ms[0]; const done = await press(p, 'fl-def-retest'); const names = await text(p, 'fl-def-retest-evidence'); const self = await press(p, 'fl-def-verify'); const wf2 = (await issueOnServer()).workflow;
  await actAs(p, 'syseng'); const closed = await press(p, 'fl-def-verify'); const issue = await issueOnServer(); const row = (await srv('cxeng', '')).commissioning.rows.find((x) => x.test_id === RT); await shot(p, 'flagship-corrected');
  ok('FL-26', 'the correction is recorded by the person who did it; a retest is refused while the test’s result is still the failure; measured again at the bench the room meets the criterion, PASS is recorded on that measurement, and the retest names it; whoever retested cannot verify it; verified by someone else, the deficiency is closed',
    started.ok === 'yes' && fixed.ok === 'yes' && tooSoon.ok === 'no' && /current result is FAIL/.test(tooSoon.text + JSON.stringify(await p.getByTestId('fl-said').innerText())) && wf1 === 'PENDING_RETEST' && again < 0.92 && rec.ok === 'yes' && /meets the criterion/.test(rec.text) && pass.ok === 'yes'
      && ms.length === 2 && retest.within === true && retest.cited_by_result === 'PASS' && ms[1].id === failedOn.id && done.ok === 'yes' && names.includes(retest.id) && self.ok === 'no' && wf2 === 'PENDING_RETEST' && closed.ok === 'yes' && issue.workflow === 'CLOSED' && issue.state !== 'OPEN' && row.result === 'PASS_UNVERIFIED'
      && (await panel.getAttribute('data-workflow')) === 'CLOSED',
    `retest before measuring: ${tooSoon.text.slice(0, 110)} · bench ${again} s: ${rec.text.slice(0, 50)} · retest “${names.trim().slice(0, 70)}” · own verification: ${self.text.slice(0, 60)} · ${issue.code} ${issue.state}/${issue.workflow} · test ${row.result}`); }

{ await p.reload(); await p.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(p); const mine = async (pg) => ({ measured: await pg.locator('[data-testid=fl-measured] li').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-within')}/${e.getAttribute('data-cited')}`)), wo: await pg.getByTestId('fl-corrective').getAttribute('data-wo-state'), wf: await pg.getByTestId('fl-corrective').getAttribute('data-workflow'), counts: await text(pg, 'fl-cx-counts') });
  const afterReload = await mine(p);
  const u = await open('#/connected', { role: 'qa_reviewer', sw: false }); const q = u.page; q.setDefaultTimeout(30000); await q.getByTestId('connected').waitFor(); await q.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready');
  await q.getByTestId('cn-resume-code').fill(`${stored.id}.${stored.key}`); await q.getByTestId('cn-resume').click(); await q.getByTestId('cn-journey').waitFor({ timeout: 120000 });
  await q.goto(`${base}#/flagship`); await q.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(q); const theirs = await mine(q);
  await q.setViewportSize({ width: 390, height: 844 }); await q.waitForTimeout(200); const over = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await shot(q, 'flagship-bench-phone');
  ok('FL-27', 'after a refresh, and in a second person’s browser opened with the resume code alone, the measurements, their verdicts, the closed job and the closed deficiency are the same; nothing scrolls sideways at phone width; no error but the refusals asked for',
    JSON.stringify(afterReload.measured) === JSON.stringify(['yes/PASS', 'no/FAIL']) && afterReload.wo === 'CLOSED' && afterReload.wf === 'CLOSED' && JSON.stringify(theirs) === JSON.stringify(afterReload) && over <= 1 && !u.errs.length && !pageErrs().length,
    `after reload ${JSON.stringify(afterReload).slice(0, 160)} · second browser the same ${JSON.stringify(theirs) === JSON.stringify(afterReload)} · phone overflow ${over}px · ${[...u.errs, ...pageErrs()].slice(0, 2)}`);
  await u.close(); }

// ------------------------------------------------------------------------------------------------ to acceptance, and the baseline
const rowsOnServer = async () => (await srv('cxeng', '')).commissioning.rows.filter((x) => x.applicable);
const count = async (re) => (await rowsOnServer()).filter((x) => re.test(x.result)).length;

// asked as the QA reviewer, who holds the acceptance authority, so the server answers with what is in the way and not with who may ask
{ await actAs(p, 'qa_reviewer'); await p.getByTestId('fl-accept').click(); const early = await saidOk(p); const reasons = await p.getByTestId('fl-said-reasons').locator('li').allInnerTexts().catch(() => []); const stage = (await srv('cxeng', '')).room.lifecycle;
  await actAs(p, 'cxeng'); const docs = p.locator('[data-testid=fl-docs] li'); const nDocs = await docs.count(); const disabled = await docs.first().getByTestId('fl-doc-record').isDisabled();
  const names = await docs.evaluateAll((els) => els.map((e) => e.getAttribute('data-test'))); let recorded = 0;
  for (const tId of names) { const li = p.locator(`[data-testid=fl-docs] li[data-test="${tId}"]`); await li.getByTestId('fl-doc-note').fill(`handed over to the operations owner on site (synthetic): ${tId}`); await li.getByTestId('fl-doc-record').click(); const r = await saidOk(p); if (r.ok === 'yes') recorded += 1; }
  const docRows = (await rowsOnServer()).filter((x) => x.pack === 'handover'); const restBefore = Number(await p.getByTestId('fl-rest').getAttribute('data-count'));
  await actAs(p, 'installer'); const notMine = await press(p, 'fl-pass-all'); const passedThen = await count(/^PASS/);
  await actAs(p, 'cxeng'); const all = await press(p, 'fl-pass-all'); const passedNow = await count(/^PASS/); const total = (await rowsOnServer()).length;
  ok('FL-28', 'acceptance asked too early is refused by the server with what is in the way; the five handover documents are recorded one at a time, each with what was handed over; the other checks are recorded one request each by the role responsible (the installer is stopped at the first that is not theirs)',
    early.ok === 'no' && reasons.length >= 1 && stage === 'COMMISSIONING' && nDocs === 5 && disabled && recorded === 5 && docRows.length === 5 && docRows.every((x) => x.result === 'PASS_UNVERIFIED') && restBefore === total - 6 && notMine.ok === 'no' && passedThen < total && all.ok === 'yes' && passedNow === total
      && Number(await p.getByTestId('fl-rest').getAttribute('data-count')) === 0,
    `early acceptance: ${early.text.slice(0, 60)} · ${reasons.length} reasons, first “${(reasons[0] || '').slice(0, 90)}” · ${recorded} of ${nDocs} documents recorded · ${restBefore} other checks · installer: ${notMine.text.slice(0, 80)} (${passedThen} of ${total} passed) · engineer: ${all.text.slice(0, 30)} (${passedNow} of ${total})`); }

// Documentation & Submission (0043): the documents the theatre requires, submitted by the installer, approved by the QA reviewer (the
// installer is refused), and the packet signed for the integrator and the owner by two different people (the reviewer is refused)
{ const docsOn = () => srv('cxeng', '/documentation');
  await actAs(p, 'installer'); const m0 = p.getByTestId('fl-doc-matrix'); const required = Number(await m0.getAttribute('data-required'));
  const submitted = await press(p, 'fl-doc-submit-all'); const notReviewer = await press(p, 'fl-doc-approve-all');
  await actAs(p, 'qa_reviewer'); const approved = await press(p, 'fl-doc-approve-all'); const pct = await p.getByTestId('fl-doc-matrix').getAttribute('data-percent'); const notVendor = await press(p, 'fl-doc-sign-vendor');
  await actAs(p, 'opslead'); const vendor = await press(p, 'fl-doc-sign-vendor'); await actAs(p, 'syseng'); const owner = await press(p, 'fl-doc-sign-internal');
  const server = await docsOn(); const complete = await p.getByTestId('fl-doc-matrix').getAttribute('data-complete');
  ok('FL-37', 'documentation and submission: the theatre’s fourteen required documents are submitted by the installer and approved by the QA reviewer (the installer may not review); the packet is signed for the integrator by the operations lead and for the owner by the systems engineer (the reviewer may not sign for the integrator); the server agrees',
    required === 14 && submitted.ok === 'yes' && notReviewer.ok === 'no' && approved.ok === 'yes' && pct === '100' && notVendor.ok === 'no' && vendor.ok === 'yes' && owner.ok === 'yes' && complete === 'yes'
      && server.status.complete === true && server.signatures.filter((x) => x.current).length === 2 && new Set(server.signatures.map((x) => x.role)).size === 2,
    `${required} required · installer: ${submitted.text.slice(0, 40)} / reviewing: ${notReviewer.text.slice(0, 60)} · QA: ${approved.text.slice(0, 30)} (${pct}%), signing for the integrator: ${notVendor.text.slice(0, 50)} · signed: ${vendor.ok}/${owner.ok} · server ${server.status.approved}/${server.status.required}`);
  await actAs(p, 'cxeng'); }

{ const own = await press(p, 'fl-verify-all'); const v0 = await count(/^PASS_VERIFIED$/); await actAs(p, 'qa_reviewer'); const verified = await press(p, 'fl-verify-all'); const v1 = await count(/^PASS_VERIFIED$/); const total = (await rowsOnServer()).length;
  const ready = await p.getByTestId('fl-ready').getAttribute('data-ready'); const lent = await press(p, 'fl-lend'); const notTheirs = await press(p, 'fl-accept'); const s1 = (await srv('cxeng', '')).room.lifecycle;
  await actAs(p, 'opslead'); const accepted = await press(p, 'fl-accept'); const room = await srv('cxeng', ''); const base1 = (await srv('syseng', '/baselines')).current;
  ok('FL-29', 'every result is verified by someone who did not record it (the recorder is stopped at the first); the verifier lends the acceptance and does not accept; the operations lead accepts, and the server publishes baseline 1',
    own.ok === 'no' && v0 === 0 && verified.ok === 'yes' && v1 === total && ready === 'yes' && lent.ok === 'yes' && notTheirs.ok === 'no' && s1 === 'COMMISSIONING' && accepted.ok === 'yes' && room.room.lifecycle === 'ACCEPTED' && base1 && base1.version === 1
      && (await p.getByTestId('fl-finish-card').count()) === 0,
    `recorder verifying: ${own.text.slice(0, 70)} (${v0} verified) · QA: ${v1} of ${total} verified · lent: ${lent.text.slice(0, 50)} · QA accepting: ${notTheirs.text.slice(0, 60)} · operations lead: ${room.room.lifecycle}, baseline ${base1?.version}`); }

{ const base1 = (await srv('syseng', '/baselines')).current; const room = await srv('cxeng', ''); const camServer = room.devices.find((d) => d.id === cam.id); const bCam = base1.devices.find((d) => d.id === cam.id).placement; const bRt = base1.measurements.find((m) => m.test === RT);
  const card = p.getByTestId('fl-baseline'); const place = p.locator(`[data-testid=fl-bl-places] tr[data-device="${cam.id}"]`); const designed = await place.locator('[data-col=designed]').innerText(); const builtCell = await place.locator('[data-col=built]').innerText();
  const meas = p.locator(`[data-testid=fl-bl-measured] tr[data-test="${RT}"]`); const measText = (await meas.innerText()).replace(/\s+/g, ' '); const three = await p.locator(`[data-testid=fl-views] tr[data-device="${cam.id}"] [data-view=assurance]`).innerText();
  await mark(p).click(); const noMove = await p.getByTestId('fl-move').count(); const closedNote = await p.getByTestId('fl-closed').count(); await shot(p, 'flagship-accepted');
  await p.reload(); await p.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(p); const vReload = await p.getByTestId('fl-baseline').getAttribute('data-version');
  const u = await open('#/connected', { role: 'exec', sw: false }); const q = u.page; q.setDefaultTimeout(30000); await q.getByTestId('connected').waitFor(); await q.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready');
  await q.getByTestId('cn-resume-code').fill(`${stored.id}.${stored.key}`); await q.getByTestId('cn-resume').click(); await q.getByTestId('cn-journey').waitFor({ timeout: 120000 });
  await q.goto(`${base}#/flagship`); await q.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(q); const theirV = await q.getByTestId('fl-baseline').getAttribute('data-version'); const theirBuilt = await q.locator(`[data-testid=fl-bl-places] tr[data-device="${cam.id}"] [data-col=built]`).innerText();
  await q.setViewportSize({ width: 390, height: 844 }); await q.waitForTimeout(200); const over = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await shot(q, 'flagship-accepted-phone');
  ok('FL-30', 'the baseline keeps three things side by side and the page shows the server’s record of each: the design (the approved revision and the camera’s designed place, untouched), the as-built place the move was approved to, and the measured value the room was accepted on with its limit; the field record is closed; a refresh and a second person’s browser show the same',
    (await card.getAttribute('data-version')) === '1' && base1.design_revision === room.room.approvedRevision && camServer.x === cam.x && camServer.y === cam.y && bCam.designed.x === cam.x && bCam.designed.y === cam.y && bCam.asBuilt.x === built.x && bCam.asBuilt.y === built.y && bCam.basis === 'AS_BUILT'
      && designed.includes(`${cam.x} m across, ${cam.y} m from the front`) && builtCell.includes(`${built.x} m across, ${built.y} m from the front`) && builtCell.includes(move.move) && (await place.getAttribute('data-basis')) === 'AS_BUILT'
      && bRt.measurement === retest.id && Number(await meas.getAttribute('data-value')) === Number(retest.value) && /at most 1 s/.test(measText) && /version 1/.test(measText) && /simulated/.test(measText) && /in baseline 1/.test(three)
      && noMove === 0 && closedNote === 1 && vReload === '1' && theirV === '1' && theirBuilt.includes(move.move) && over <= 1 && !u.errs.length && !pageErrs().length,
    `baseline ${base1.version} on design revision ${base1.design_revision} (approved ${room.room.approvedRevision}) · camera designed (${bCam.designed.x}, ${bCam.designed.y}), as built (${bCam.asBuilt.x}, ${bCam.asBuilt.y}) ${bCam.asBuilt.move}; the design row still (${camServer.x}, ${camServer.y}) · measured “${measText.slice(0, 110)}” · three products: “${three.trim().slice(0, 60)}” · move offered ${noMove}, closed note ${closedNote} · reload v${vReload}, second browser v${theirV} · phone overflow ${over}px · ${[...u.errs, ...pageErrs()].slice(0, 2)}`);
  await u.close(); }

// ------------------------------------------------------------------------------------------------ who to call (0044; founder, 18 Nov 2026)
{ const card = p.getByTestId('fl-who-card'); await card.scrollIntoViewIfNeeded();
  const domains = await p.locator('[data-testid=fl-who-paths] > li').evaluateAll((els) => els.map((e) => e.getAttribute('data-domain')));
  const prim = await p.getByTestId('fl-who-audio-primary').getAttribute('data-contact'); const back = await p.getByTestId('fl-who-audio-backup').getAttribute('data-contact');
  const acts = p.getByTestId('fl-who-video-primary-actions'); const chat = await acts.locator('[data-action="teams.chat"]').getAttribute('href'); const mail = await acts.locator('[data-action="mail.compose"]').getAttribute('href');
  await acts.locator('[data-action="copy"]').click(); const said = await p.getByTestId('fl-who-video-primary-actions-said').textContent();
  const server = await srv('service', '/support');
  const J = (x) => JSON.stringify(x);
  ok('FL-39', 'who to call: the theatre’s site has an approved audio and video path from the server, each with a primary and a backup who is someone else; a contact offers a Teams chat and an email that open the viewer’s own apps (links, nothing sent) and copies its contact info',
    J(domains) === J(['audio', 'video']) && prim && back && prim !== back && /^https:\/\/teams\.microsoft\.com\/l\/chat\/0\/0\?users=.+%40.+example\.org$/.test(chat || '') && /^mailto:.+@.+example\.org$/.test(mail || '')
      && /^(Copied\.|Copying was refused)/.test(said || '') && server.paths.length === 2,
    `${J(domains)} · audio ${prim} / backup ${back} · ${chat} · ${mail} · copy: ${said}`); }

// ------------------------------------------------------------------------------------------------ in service: incidents
const incidentsOnServer = async (role = 'svcmgr') => (await api.call('GET', `/v1/incidents?room=${encodeURIComponent((await srv('cxeng', '')).room.code)}&limit=20`, { token: await as(role) })).body.items;
const intelOnServer = async () => (await api.call('GET', '/v1/incidents/intelligence?days=90', { token: await as('exec') })).body;
const inc = (code) => p.locator(`[data-testid=fl-inc-list] li[data-incident="${code}"]`); const pressIn = async (loc, id) => { await loc.getByTestId(id).click(); return saidOk(p); };
let INC1 = '', INC2 = '', SPK = '';

{ await actAs(p, 'requestor'); const before = await p.getByTestId('fl-inc-room').getAttribute('data-status'); const none = await p.getByTestId('fl-inc-none').count();
  const spk = p.locator('[data-testid=fl-plan] .fl__dev[data-family=loudspeaker]').first(); SPK = await spk.getAttribute('data-device'); await spk.click(); await p.getByTestId('fl-detail').waitFor();
  const offered = (await p.locator('[data-testid=fl-inc-device] option').first().innerText()).replace(/\s+/g, ' '); const kinds = await p.locator('[data-testid=fl-inc-kind] option').count();
  const sent = await press(p, 'fl-inc-send'); const items = await incidentsOnServer(); const x = items[0]; INC1 = x?.incident;
  const li = inc(INC1); const liText = (await li.innerText()).replace(/\s+/g, ' '); const roomNow = await p.getByTestId('fl-inc-room').getAttribute('data-status');
  const th = (await srv('cxeng', '/thread')).stages.find((k) => k.key === 'service').records; const cx = (await srv('cxeng', '/thread')).stages.find((k) => k.key === 'commissioning').records.issues;
  await p.reload(); await p.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(p); const kept = await inc(INC1).getAttribute('data-status'); await shot(p, 'flagship-incident');
  ok('FL-34', 'a room in service: a requestor reports an incident on the loudspeaker chosen on the plan; it is the server’s record (its kind, severity, device and reporter), the room’s status is derived from it, the room’s thread lists it with ServiceHands and not among commissioning’s deficiencies, and a refresh keeps it',
    before === 'NO_OPEN_INCIDENT' && none === 1 && offered.includes('chosen on the plan') && kinds >= 15 && sent.ok === 'yes' && sent.text.includes(INC1) && items.length === 1 && x.status === 'OPEN' && x.severity === 'High' && x.issueType === 'no_audio' && x.device === SPK && x.reportedRole === 'requestor' && x.repeats === null
      && (await li.getAttribute('data-status')) === 'OPEN' && liText.includes(x.title) && liText.includes(SPK) && roomNow === 'DEGRADED' && th.incidents.some((k) => k.code === INC1) && !cx.some((k) => k.code === INC1) && kept === 'OPEN',
    `before ${before} · ${kinds} kinds offered · device offered “${offered.slice(0, 60)}” · ${sent.text.slice(0, 80)} · server ${x?.incident} ${x?.status} ${x?.severity} ${x?.issueType} on ${x?.device} by ${x?.reportedRole} · room ${roomNow} · in the thread’s service stage ${th.incidents.length} · after refresh ${kept}`); }

{ const li = inc(INC1); await actAs(p, 'requestor'); const notMine = await pressIn(li, 'fl-inc-start'); await actAs(p, 'svcmgr'); const started = await pressIn(li, 'fl-inc-start');
  const raised = await pressIn(li, 'fl-wo-raise'); const triaged = await pressIn(li, 'fl-wo-triage'); const wo = (await incidentsOnServer())[0].workOrders[0]; const cands = (await woOnServer(wo)).candidates;
  await li.locator(`[data-testid=fl-candidates] li[data-person="${second.id2}"]`).getByTestId('fl-assign').click(); const assigned = await saidOk(p);
  await actAs(p, 'service'); const first = await pressIn(li, 'fl-wo-accept'); await actAs(p, 'service2'); const accepted = await pressIn(li, 'fl-wo-accept');
  await li.getByTestId('fl-pf-safety').check(); await li.getByTestId('fl-pf-tools').check(); await li.getByTestId('fl-pf-access').fill('facilities desk (synthetic)'); const pf = await pressIn(li, 'fl-wo-preflight'); const begun = await pressIn(li, 'fl-wo-start');
  const ev = await pressIn(li, 'fl-wo-evidence'); const handed = await pressIn(li, 'fl-wo-submit'); await actAs(p, 'cxeng'); const verified = await pressIn(li, 'fl-wo-verify');
  await actAs(p, 'svcmgr'); await li.getByTestId('fl-wo-confirmed').check(); const jobClosed = await pressIn(li, 'fl-wo-close'); const w = await woOnServer(wo); const afterJob = (await incidentsOnServer())[0].status;
  await actAs(p, 'service2'); await li.getByTestId('fl-inc-cause').selectOption('EQUIPMENT_FAULT'); await li.getByTestId('fl-inc-how').selectOption('hardware_replacement'); await li.getByTestId('fl-inc-action').fill('Amplifier channel failed; the amplifier was replaced and levels reset (synthetic)');
  const fixed = await pressIn(li, 'fl-inc-fixed'); const waiting = (await incidentsOnServer())[0]; const ownConfirm = await pressIn(li, 'fl-inc-restored');
  await actAs(p, 'requestor'); await li.getByTestId('fl-inc-note').fill('both sides play; a call was made to check (synthetic)'); const confirmed = await pressIn(li, 'fl-inc-restored'); const reporterClose = await pressIn(li, 'fl-inc-close');
  await actAs(p, 'svcmgr'); const closed = await pressIn(li, 'fl-inc-close'); const x = (await incidentsOnServer())[0]; const roomNow = await p.getByTestId('fl-inc-room').getAttribute('data-status'); const intel = await intelOnServer();
  const shownTotals = await p.getByTestId('fl-inc-intel').evaluate((el) => [el.getAttribute('data-incidents'), el.getAttribute('data-open'), el.getAttribute('data-resolved')].join(','));
  ok('FL-35', 'the incident is worked and closed by its own rules, each step the server’s: an owner from the service manager (the requestor is refused); a ServiceHands job assigned to the second technician, refused to the first, done with evidence, verified by someone else and closed, which does not close the incident; the correction says how it was resolved; the technician who fixed it cannot confirm it and its reporter can; the reporter cannot close it and the service manager can; the room’s status and the counts follow',
    notMine.ok === 'no' && started.ok === 'yes' && raised.ok === 'yes' && triaged.ok === 'yes' && cands.eligible.length === 2 && assigned.ok === 'yes' && first.ok === 'no' && accepted.ok === 'yes' && pf.ok === 'yes' && begun.ok === 'yes' && ev.ok === 'yes' && handed.ok === 'yes' && verified.ok === 'yes'
      && jobClosed.ok === 'yes' && w.state === 'CLOSED' && w.assignee.id === second.id2 && afterJob === 'IN_PROGRESS' && fixed.ok === 'yes' && waiting.status === 'AWAITING_CONFIRMATION' && waiting.resolutionType === 'hardware_replacement' && ownConfirm.ok === 'no'
      && confirmed.ok === 'yes' && reporterClose.ok === 'no' && closed.ok === 'yes' && x.status === 'CLOSED' && x.confirmation.result === 'PASS' && roomNow === 'NO_OPEN_INCIDENT' && intel.totals.incidents === 1 && intel.totals.closed === 1 && intel.totals.resolved === 1 && shownTotals === '1,0,1',
    `requestor starting: ${notMine.text.slice(0, 50)} · job ${wo} ${w.state} by ${w.assignee?.name}; first technician accepting: ${first.text.slice(0, 50)} · incident after the job closed: ${afterJob} · fixed → ${waiting.status} (${waiting.resolutionType}) · technician confirming: ${ownConfirm.text.slice(0, 50)} · reporter closing: ${reporterClose.text.slice(0, 50)} · ${x.incident} ${x.status} · room ${roomNow} · totals ${shownTotals}`); }

{ await actAs(p, 'requestor'); const spk = p.locator(`[data-testid=fl-plan] .fl__dev[data-device="${SPK}"]`); if ((await spk.getAttribute('data-on')) !== 'yes') await spk.click();
  await p.locator('[data-testid=fl-inc-report] summary').click(); await p.getByTestId('fl-inc-title').fill('No sound again from the same loudspeaker'); const sent = await press(p, 'fl-inc-send'); const items = await incidentsOnServer(); const y = items[0]; INC2 = y.incident; const li = inc(INC2);
  const repeatShown = (await li.getByTestId('fl-inc-repeat').innerText()).replace(/\s+/g, ' ');
  await actAs(p, 'svcmgr'); const started = await pressIn(li, 'fl-inc-start'); await li.getByTestId('fl-inc-why').fill('waiting for the replacement amplifier (synthetic)'); const blocked = await pressIn(li, 'fl-inc-block'); const st1 = (await incidentsOnServer())[0].status;
  await actAs(p, 'service'); const waits = await pressIn(li, 'fl-inc-fixed'); await actAs(p, 'svcmgr'); await li.getByTestId('fl-inc-why').fill('second failure in a week: to the integrator’s service lead (synthetic)'); const esc = await pressIn(li, 'fl-inc-escalate');
  await li.getByTestId('fl-inc-why').fill('again, to someone else (synthetic)'); const twice = await pressIn(li, 'fl-inc-escalate'); const unblocked = await pressIn(li, 'fl-inc-unblock'); const z = (await incidentsOnServer())[0]; const intel = await intelOnServer();
  const row = p.locator('[data-testid=fl-inc-kinds] tr[data-kind=no_audio]'); const rowText = (await row.innerText()).replace(/\s+/g, ' '); const roomNow = await p.getByTestId('fl-inc-room').getAttribute('data-status'); const basis = (await text(p, 'fl-inc-intel')).replace(/\s+/g, ' ');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(250); const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await shot(p, 'flagship-incidents-phone'); await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(150);
  ok('FL-36', 'a second report of the same kind on the same device is marked a repeat by the database, and the page says which it repeats; blocked, its correction waits (the technician is refused with the reason); an escalation is recorded once; unblocked, it is in progress again; the counts on the page are the server’s, with what they are counted from; nothing scrolls sideways at phone width',
    sent.ok === 'yes' && /repeats/.test(sent.text) && y.repeats === INC1 && (await li.getAttribute('data-repeats')) === INC1 && repeatShown.includes(INC1) && started.ok === 'yes' && blocked.ok === 'yes' && st1 === 'BLOCKED' && waits.ok === 'no' && /is blocked/.test(waits.text)
      && esc.ok === 'yes' && twice.ok === 'no' && /escalated already/.test(twice.text) && unblocked.ok === 'yes' && z.status === 'IN_PROGRESS' && !!z.escalated && z.blocked === null && intel.totals.incidents === 2 && intel.totals.open === 1 && intel.totals.repeats === 1 && intel.totals.escalated === 1
      && /No audio 2 1 1 1/.test(rowText) && roomNow === 'DEGRADED' && /not a measurement of the room/.test(basis) && over <= 1 && !pageErrs().length,
    `${sent.text.slice(0, 90)} · page: “${repeatShown.slice(0, 80)}” · blocked ${st1}; technician: ${waits.text.slice(0, 70)} · escalated ${esc.ok}, again: ${twice.text.slice(0, 50)} · ${z.incident} ${z.status} · totals ${intel.totals.incidents} incidents, ${intel.totals.open} open, ${intel.totals.repeats} repeat, ${intel.totals.escalated} escalated · kinds row “${rowText}” · room ${roomNow} · overflow ${over}px`); }

{ const OTHER = 'CNV-MR-H201'; const other = async (role, path = '') => (await api.call('GET', `/v1/rooms/${OTHER}${path}`, { token: await as(role) })).body; const hallBefore = await srv('cxeng', '');
  const options = await p.locator('[data-testid=fl-room] option').evaluateAll((els) => els.map((e) => e.value));
  await p.getByTestId('fl-room').selectOption(OTHER); await p.waitForFunction((r) => location.hash === `#/flagship/${r}`, OTHER); await p.waitForFunction(() => document.querySelector('[data-testid=fl-plan]')?.getAttribute('data-length') === '22', null, { timeout: 120000 }); await settle(p);
  const room = await other('cxeng'); const title = await p.locator('main h1').innerText(); const onPlan = await planIds(p); const upper = await p.getByTestId('fl-bench-criterion').getAttribute('data-upper'); const planCard = (await text(p, 'fl-plan-card')).replace(/\s+/g, ' ');
  const seats = room.devices.reduce((n, d) => n + (d.furniture && d.props?.seats ? d.props.seats : 0), 0); const picked = await p.getByTestId('fl-room').inputValue();
  // not in service: the page says an incident is not reported here, and the server refuses one
  const early = await p.getByTestId('fl-inc-early').count(); const earlyServer = await api.call('POST', `/v1/rooms/${OTHER}/incidents`, { token: await as('requestor'), body: { issueType: 'no_audio', domain: 'audio', severity: 'High', title: 'No sound (synthetic)', description: 'Reported before the room is in service (synthetic).', detectedDuring: 'user_report', userImpact: 'major_disruption' } });
  const cam2 = room.devices.find((d) => d.cat === 'camera'); const m2 = p.locator(`[data-testid=fl-plan] .fl__dev[data-device="${cam2.id}"]`); const to = { x: Math.round((cam2.x + 0.8) * 100) / 100, y: cam2.y };
  await actAs(p, 'installer'); await m2.click(); await p.getByTestId('fl-move').click(); await p.getByTestId('fl-move-panel').waitFor(); await p.getByTestId('fl-x').fill(String(to.x));
  await p.getByTestId('fl-reason').selectOption('structural member'); await p.getByTestId('fl-note').fill('a beam is where the design puts the camera (synthetic)'); await p.getByTestId('fl-submit').click(); const proposed = await saidOk(p);
  await actAs(p, 'syseng'); await p.getByTestId('fl-decision').fill('clear of the beam (synthetic)'); await p.getByTestId('fl-approve').click(); const approved = await saidOk(p);
  const after = (await other('cxeng')).devices.find((d) => d.id === cam2.id).placement; const shownAt = await xy(m2); const hallAfter = await srv('cxeng', ''); await shot(p, 'flagship-second-room');
  await p.reload(); await p.getByTestId('fl-bar').waitFor({ timeout: 120000 }); await settle(p); const kept = await p.locator('[data-testid=fl-plan]').getAttribute('data-length'); const keptAt = await xy(p.locator(`[data-testid=fl-plan] .fl__dev[data-device="${cam2.id}"]`));
  await p.getByTestId('fl-room').selectOption('UNI-SCI-110'); await p.waitForFunction(() => location.hash === '#/flagship'); await p.waitForFunction(() => document.querySelector('[data-testid=fl-plan]')?.getAttribute('data-length') === '20', null, { timeout: 120000 }); await settle(p);
  const backV = await p.getByTestId('fl-baseline').getAttribute('data-version'); const backTitle = await p.locator('main h1').innerText();
  // up to here the page logged nothing but the refusals the earlier checks provoked; asking for a room that is not there is a 404, and that is all it adds
  const clean = !pageErrs().length; await p.goto(`${base}#/flagship/NOPE-123`); await p.getByTestId('fl-back').waitFor({ timeout: 120000 }); const only404 = pageErrs().every((e) => /status of 404/.test(e)); const noPlan = await p.getByTestId('fl-plan').count(); const says = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
  ok('FL-33', 'the same page on another room: Harbor 201 of the convention centre, chosen on the page, is the server’s record of that room (its name, its devices, its own limit, the seats its plan draws); its camera is moved by the installer and approved by the systems engineer there; the lecture theatre’s record is exactly as it was; a refresh keeps the room; a room the sandbox does not have is said to be absent',
    options.length === 3 && options.includes(OTHER) && options.includes('UNI-SCI-110') && picked === OTHER && /Harbor 201/.test(title) && room.room.canonicalRef === OTHER && JSON.stringify(onPlan) === JSON.stringify(room.devices.map((d) => d.id).sort()) && upper === '0.8'
      && planCard.includes(`${seats} seats drawn of ${room.room.occupancy}`) && seats < room.room.occupancy && early === 1 && earlyServer.status === 422 && proposed.ok === 'yes' && approved.ok === 'yes' && after.basis === 'AS_BUILT' && after.asBuilt.x === to.x && after.designed.x === cam2.x && shownAt.x === to.x
      && JSON.stringify(hallAfter.devices.map((d) => d.placement)) === JSON.stringify(hallBefore.devices.map((d) => d.placement)) && hallAfter.room.lifecycle === 'ACCEPTED' && hallAfter.room.rev === hallBefore.room.rev
      && kept === '22' && keptAt.x === to.x && backV === '1' && /Lecture Theatre SCI-110/.test(backTitle) && noPlan === 0 && /has no room “NOPE-123”/.test(says) && clean && only404,
    `rooms offered ${options.join(', ')} · “${title}” ${room.devices.length} positions, limit ${upper} s, ${planCard.slice(0, 110)} · camera ${cam2.id} (${cam2.x}, ${cam2.y}) → as built (${after.asBuilt?.x}, ${after.asBuilt?.y}) ${after.basis} · theatre ${hallAfter.room.lifecycle}, placements unchanged · after refresh ${kept} m long · back: “${backTitle}” baseline ${backV} · unknown: ${says.slice(-120)}`); }

await h.app.stop();
{ const s = await open('#/flagship', { role: 'cxeng', sw: false, init: `localStorage.setItem('empathia.demo.sandbox.v1', ${JSON.stringify(JSON.stringify(stored))})` }); const r = s.page;
  await r.getByTestId('flagship').waitFor(); await r.waitForFunction(() => !document.querySelector('[data-testid=fl-asking]'), null, { timeout: 60000 }); const says = await r.locator('main').innerText();
  ok('FL-11', 'with the server stopped the page says the room cannot be shown, and shows no room', /not available here/.test(says) && /keeps no copy/.test(says) && (await r.getByTestId('fl-bar').count()) === 0 && (await r.getByTestId('fl-plan').count()) === 0, says.replace(/\s+/g, ' ').slice(-200));
  await s.close(); }
await t.close();
await done();
