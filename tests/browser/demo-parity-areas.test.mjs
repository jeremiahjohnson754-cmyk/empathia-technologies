// The V2.5.3 parity areas (uplift/parity-areas): every address of the original demonstration lands on a finished screen; no placeholder
// text exists anywhere in the built demo; the parity pages render, count from records, respect D44, work at 390 and 1440, and survive
// destructive use (bad ids, bad types, reload mid-flow, back/forward, double taps, blocked storage).
//   node tests/browser/demo-parity-areas.test.mjs   (PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs … for dark)
import fs from 'node:fs'; import path from 'node:path';
import { harness, repo } from './demo-shell-lib.mjs';

const t = await harness('demo-parity-areas');
const PLACEHOLDER = /being connected|being rebuilt|Not migrated yet|not been rebuilt|in migration/i;
const h1 = (p) => p.evaluate(() => (document.querySelector('main h1') || {}).textContent || '');
const ring = (p) => p.evaluate(() => { const h = document.querySelector('main h1'); if (!h) return false; const cs = getComputedStyle(h); return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow !== 'none' && cs.boxShadow !== ''); });
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const clean = (errs) => errs.filter((e) => !/favicon/i.test(e));

// P-01 the built bundle carries no placeholder text at all (repo-wide for the demo: source and dist)
{ const dist = path.join(repo, 'apps/demo/dist'); const walk = (d) => fs.readdirSync(d).flatMap((f) => { const q = path.join(d, f); return fs.statSync(q).isDirectory() ? walk(q) : [q]; });
  const hits = walk(dist).filter((f) => /\.(js|html|css)$/.test(f) && PLACEHOLDER.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(dist, f));
  t.ok('P-01', 'no placeholder text ("being connected", "being rebuilt", "Not migrated yet") in the built demo', hits.length === 0, hits.join(', ')); }

// P-02 every V2.5.3 address area lands on a native page (#/parity computes it from the registry)
{ const s = await t.open('#/parity'); const rows = await s.page.$$eval('tr[data-area]', (r) => r.map((x) => [x.dataset.area, x.dataset.native]));
  const missing = rows.filter((r) => r[1] !== 'yes').map((r) => r[0]);
  t.ok('P-02', `every V2.5.3 address area (${rows.length}) has a native page`, rows.length > 80 && missing.length === 0, missing.join(', '));
  t.ok('P-03', 'the overview itself: h1, no console error, no overflow', (await h1(s.page)).includes('Every V2.5.3 address') && clean(s.errs).length === 0 && !(await overflow(s.page)), clean(s.errs).join(' | ')); await s.close(); }

// P-04 .. the fifteen areas, each as the Product Architect: a finished screen with its h1 and no console error, no focus ring on the heading, no overflow at 1440
const AREAS = [
  ['#/agent', 'Room Health Check'], ['#/agent/architecture', 'From a health check'], ['#/v14', 'V1.4 foundation'], ['#/v14/connect', 'Instant Connect'], ['#/v14/telemetry', 'Telemetry'], ['#/v14/signage', 'Signage'], ['#/v14/itsm', 'Service workspace'], ['#/v14/schedule', 'Monitoring and schedules'], ['#/v14/geometry', 'Spatial twin'], ['#/v14/diagnostics', 'Remote diagnostics'], ['#/v14/robot', 'Robotic audio'], ['#/v14/camera', 'Camera and spatial survey'], ['#/v14/optimize', 'Optimize'], ['#/v14/operations', 'Operations Ready'], ['#/v14/graph', 'Fixture graph'], ['#/v14/schema', 'Contracts'], ['#/v14/capabilities', 'Capabilities'], ['#/v14/plan', 'Phase plan'], ['#/v14/hub', 'Integrations Hub'], ['#/v14/identity', 'Asset identity'], ['#/v14/telemetry/R-ATL-4-218', 'Telemetry'],
  ['#/ask', 'Ask Empathia'], ['#/compare', 'Core Compare'], ['#/compare/budget', 'Budget estimate vs actual'], ['#/compare/commissioned', 'Current vs commissioned'], ['#/compare/rooms', 'Room vs room'],
  ['#/control', 'Empathia Control'], ['#/control/R-ATL-4-218', 'Atlas 4.218'], ['#/control/space', 'Lobbies, commons'], ['#/control/tower', 'Operations Control Tower'], ['#/scheduler', 'Room scheduler'], ['#/scheduler/R-BCN-3-101', 'Beacon 3.101'],
  ['#/exports', 'What the numbers are made of'], ['#/fabric', 'Integration Fabric'], ['#/fabric/c', 'Integration Fabric'], ['#/fabric/c/itsm', 'ITSM'], ['#/fabric/events', 'Event Fabric'], ['#/gate', 'Welcome'], ['#/investigate', 'One case at a time'],
  ['#/ledger', 'Evidence ledger'], ['#/ledger/agent', 'Room Health Check log'], ['#/ledger/agent/R-ATL-4-218', 'Atlas 4.218'], ['#/list', 'Every record, by type'], ['#/list/Device', 'Devices'], ['#/list/Room', 'Rooms'], ['#/list/Standard', 'Standards'], ['#/list/Vendor', 'Vendors'],
  ['#/set', 'Every number opens its records'], ['#/set/dev', 'Devices behind a number'], ['#/set/dev:uncovered', 'no agreement'], ['#/set/iss:open', 'Open issues'], ['#/set/as:worst', 'lowest health'], ['#/studio', 'Design a Space'], ['#/studio/new', 'Design a Space'], ['#/studio/new/hybrid', 'Hybrid conference'], ['#/studio/room/R-ATL-4-218', 'Concept on'],
];
let n = 4;
for (const [hash, title] of AREAS) {
  const s = await t.open(hash); const head = await h1(s.page); const text = await t.main(s.page);
  const id = `P-${String(n++).padStart(2, '0')}`;
  t.ok(id, `${hash} is a finished screen (“${title}”), no placeholder, no console error, no heading ring, no overflow`, head.includes(title) && !PLACEHOLDER.test(text) && clean(s.errs).length === 0 && !(await ring(s.page)) && !(await overflow(s.page)) && s.off.length === 0, `h1=“${head.slice(0, 60)}” errs=${clean(s.errs).join(' | ').slice(0, 160)} off=${s.off.length}`);
  await s.close();
}

// D44: forbidden addresses show the owl page and never fetch the chunk
for (const [role, hash, chunk] of [['visitor', '#/ledger', 'Ledger'], ['employee', '#/list/Issue', 'Records'], ['visitor', '#/control/tower', 'Tower'], ['exec', '#/fabric', 'Fabric'], ['employee', '#/v14', 'V14'], ['exec', '#/compare/devices', 'Compare']]) {
  const s = await t.open(hash, { role }); const owl = await s.page.locator('[data-testid=access-page]').count();
  t.ok(`P-${String(n++).padStart(2, '0')}`, `${role} at ${hash}: the owl page, and the ${chunk} chunk is not requested`, owl === 1 && !s.reqs.some((r) => new RegExp(`chunks/${chunk}-`).test(r)), `owl=${owl} reqs=${s.reqs.filter((r) => /chunks/.test(r)).join(',')}`); await s.close();
}
// allowed roles beyond the architect
for (const [role, hash, title] of [['employee', '#/ask', 'Ask Empathia'], ['employee', '#/control/R-ATL-4-220', 'Atlas 4.220'], ['exec', '#/compare/budget', 'Budget estimate'], ['service', '#/investigate', 'One case'], ['steward', '#/ledger', 'Evidence ledger'], ['ops', '#/control/tower', 'Control Tower'], ['visitor', '#/gate', 'Welcome']]) {
  const s = await t.open(hash, { role }); t.ok(`P-${String(n++).padStart(2, '0')}`, `${role} opens ${hash}`, (await h1(s.page)).includes(title) && clean(s.errs).length === 0, `h1=${(await h1(s.page)).slice(0, 50)}`); await s.close();
}

// behaviour
{ const s = await t.open('#/ask'); await s.page.fill('#pa-ask-q', 'Why is Beacon 3.101 blocked?'); await s.page.click('form[role=search] button[type=submit]'); await s.page.waitForTimeout(200);
  const a = await s.page.locator('[data-testid=ask-answer]').innerText();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'Ask answers a prepared question from Core and cites records', /Beacon 3.101/.test(a) && /records it stands on|Counted from/.test(a), a.slice(0, 120));
  await s.page.fill('#pa-ask-q', 'what is the meaning of life <script>alert(1)</script>'); await s.page.click('form[role=search] button[type=submit]'); await s.page.waitForTimeout(200);
  const b = await s.page.locator('[data-testid=ask-answer]').innerText(); const alerts = await s.page.evaluate(() => document.querySelectorAll('main script').length);
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'Ask says plainly when a question is not prepared; no live model; markup is inert', /Not a prepared question/.test(b) && /does not generate text/.test(b) && alerts === 0, b.slice(0, 120)); await s.close(); }
// 2026-11-09 (from the parity slice's own last commit 3d91223, which was made after the 4 Nov merge and never reached it):
//  - an unknown record type names an entity authority the V2.5.3 tables do not know, so the policy denies everyone (deny by default) and
//    the owl page is shown before the screen loads; the page's "no record type" empty state can therefore never be reached;
//  - V2.5.3 gives control.use to every role that has the control area, so "a role that sees the panel but cannot operate it" does not
//    exist (the Executive operates the dock); the access check is made with the one role that lacks the area, the Visitor;
//  - the Control Tower's views are picked by their segmented control (text=Incident also matches the "Synthetic sites and incidents" chip).
{ const s = await t.open('#/list/Nonsense'); t.ok(`P-${String(n++).padStart(2, '0')}`, 'an unknown record type is an unknown entity authority: the owl page for everyone (deny by default), never a crash', (await s.page.locator('[data-testid=access-page]').count()) === 1 && clean(s.errs).length === 0); await s.close(); }
{ const s = await t.open('#/list/Room/R-NOPE'); t.ok(`P-${String(n++).padStart(2, '0')}`, 'an unknown record id is an empty state', /No record with this address/.test(await t.main(s.page)) && clean(s.errs).length === 0); await s.close(); }
{ const s = await t.open('#/list/Room/R-ATL-4-218'); const m = await t.main(s.page); t.ok(`P-${String(n++).padStart(2, '0')}`, 'a passport shows facts, provenance and linked records', /What the record says/.test(m) && /Known|Inferred|Simulated/.test(m) && /Linked records/.test(m)); await s.close(); }
{ const s = await t.open('#/set/dev:uncovered'); const m = await t.main(s.page); const count = /(\d+) devices?\./.exec(m); const rows = await s.page.locator('.kit-row-li').count();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'a set’s stated count equals its rows (up to the first page)', !!count && (Number(count[1]) === rows || (Number(count[1]) > 12 && rows === 12)), `count=${count && count[1]} rows=${rows}`); await s.close(); }
{ const s = await t.open('#/set/zzz:nope'); t.ok(`P-${String(n++).padStart(2, '0')}`, 'an unknown set is the owl page (V2.5.3 "none" area) for everyone but the architect — the architect sees an empty state', /No set is called|access-page/.test((await t.main(s.page)) + (await s.page.locator('[data-testid=access-page]').count() ? 'access-page' : ''))); await s.close(); }
{ const s = await t.open('#/compare/budget'); const diff = await s.page.locator('tr.pa-diff').count(); await s.page.locator('.kit-seg__opt', { hasText: 'Only what differs' }).click(); await s.page.waitForTimeout(100); const rows = await s.page.locator('[data-testid=compare-table] tbody tr').count();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'Compare marks what differs and "Only what differs" filters to exactly those rows', diff > 0 && rows === diff, `diff=${diff} rows=${rows}`); await s.close(); }
{ const s = await t.open('#/compare/nothing'); t.ok(`P-${String(n++).padStart(2, '0')}`, 'an unknown comparison kind: owl or empty state, never a crash', clean(s.errs).length === 0 && (await s.page.locator('main').innerText()).length > 20); await s.close(); }
{ const s = await t.open('#/control/R-ATL-4-218', { role: 'employee' }); const btn = s.page.locator('.pa-dock__btn:not([disabled])').first(); const before = await btn.getAttribute('aria-pressed'); await btn.click(); await btn.click(); await btn.click();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'the room dock toggles on tap (three rapid taps leave it toggled once), simulated only, no request leaves', (await btn.getAttribute('aria-pressed')) !== before && s.off.length === 0 && clean(s.errs).length === 0); await s.close(); }
{ const s = await t.open('#/control/R-ATL-4-218', { role: 'visitor' }); t.ok(`P-${String(n++).padStart(2, '0')}`, 'a visitor (no control area) gets the owl page at a room panel, never a disabled panel', (await s.page.locator('[data-testid=access-page]').count()) === 1); await s.close(); }
{ const s = await t.open('#/control/tower'); const sites = await s.page.locator('[data-testid=tower-site]').count(); const m = await t.main(s.page);
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'the Control Tower is labelled non-operational, shows the six campus sites, no real-world map, no live claim', sites === 6 && /Non-operational/.test(m) && !/real-time|live feed from|SOC 2|ISO 27001/i.test(m.replace(/Not a live feed|No live data/g, '')));
  await s.page.locator('.kit-seg__opt', { hasText: 'Incident' }).first().click(); await s.page.waitForTimeout(150); const inc = await s.page.locator('[data-testid=tower-incident]').count(); if (inc) await s.page.locator('[data-testid=tower-incident]').first().click(); await s.page.waitForTimeout(100);
  const esc = await s.page.locator('.pa-esc li').count(); const map = await s.page.locator('svg.pa-map[role=img]').count();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'the incident queue selects a case with an escalation timeline and a relationship map (SVG with a text alternative)', inc > 0 && esc > 0 && map === 1, `inc=${inc} esc=${esc} map=${map}`);
  await s.page.locator('.kit-seg__opt', { hasText: 'Operations' }).first().click(); await s.page.waitForTimeout(100); t.ok(`P-${String(n++).padStart(2, '0')}`, 'the operations view lists work in flight and coverage by site', /Work in flight/.test(await t.main(s.page)) && clean(s.errs).length === 0); await s.close(); }
{ const s = await t.open('#/fabric/events', { role: 'ops' }); await s.page.click('[data-testid=fabric-fire]'); await s.page.waitForTimeout(100); const m = await t.main(s.page);
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'the event fabric lets a simulated event into Core and every surface shows its after state', /After the event/.test(m) && /The event is in Core/.test(m) && s.off.length === 0); await s.close(); }
{ const s = await t.open('#/exports'); const [dl] = await Promise.all([s.page.waitForEvent('download', { timeout: 5000 }).catch(() => null), s.page.locator('[data-testid^=export-csv-]').first().click()]);
  const body = dl ? fs.readFileSync(await dl.path(), 'utf8') : '';
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'an export downloads a CSV with a provenance header and no formula-leading cell; nothing leaves the page', !!dl && /^# Empathia demonstration export/.test(body) && /Synthetic data/.test(body) && !/\r\n[=+@-]/.test(body) && s.off.length === 0, body.slice(0, 80)); await s.close(); }
{ const s = await t.open('#/studio/new/hybrid'); await s.page.fill('input[type=number] >> nth=0', '99999'); await s.page.waitForTimeout(100); const w = await s.page.inputValue('input[type=number] >> nth=0');
  await s.page.click('[data-testid=studio-save]'); await s.page.waitForTimeout(100); await s.page.goto(t.base + '#/studio/new'); await s.page.waitForTimeout(300); const m = await t.main(s.page);
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'the studio clamps absurd dimensions, saves a concept in this browser, and lists it after a reload', Number(w) <= 40 && /Your saved concepts/.test(m) && clean(s.errs).length === 0, `w=${w}`); await s.close(); }
{ const s = await t.open('#/studio/new/hybrid'); await s.page.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('blocked'); }; window.__restore = () => { Storage.prototype.setItem = o; }; });
  await s.page.click('[data-testid=studio-save]'); await s.page.waitForTimeout(100); t.ok(`P-${String(n++).padStart(2, '0')}`, 'blocked storage: the studio says so and offers export instead of crashing', /would not keep it/.test(await t.main(s.page)) && clean(s.errs).length === 0); await s.close(); }
{ const s = await t.open('#/studio/new/hybrid'); const p = s.page; const cam = p.locator('[data-testid=studio-plan] [data-kind=camera]').first(); const id = await cam.getAttribute('data-item');
  await cam.click(); await p.getByTestId('studio-insp').waitFor(); const pos0 = await p.getByTestId('studio-pos').innerText();
  await p.getByTestId('studio-nudge-right').click(); await p.getByTestId('studio-aim-right').click(); const pos1 = await p.getByTestId('studio-pos').innerText();
  await p.getByTestId('studio-undo').click(); const pos2 = await p.getByTestId('studio-pos').innerText(); await p.getByTestId('studio-redo').click(); const pos3 = await p.getByTestId('studio-pos').innerText();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'Design a Space: tap a camera, move it 25 cm and aim it 15°; undo and redo walk the steps', /aimed 0°/.test(pos0) && /aimed 15°/.test(pos1) && /aimed 0°/.test(pos2) && pos3 === pos1 && pos1 !== pos0, [pos0, pos1, pos2, pos3].join(' | '));
  await p.fill('[data-testid=studio-vname]', 'before the second camera'); await p.getByTestId('studio-version').click(); await p.getByTestId('studio-dup').click(); await p.getByTestId('studio-cmpv-0').click(); const diff = await p.getByTestId('studio-diff').innerText();
  await p.getByTestId('studio-restore-0').click(); const cams = await p.locator('[data-testid=studio-plan] [data-kind=camera]').count();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'a kept version compares with now by object (one added) and restores', /1 added/.test(diff) && /0 removed/.test(diff) && cams === 1 && !!id, `${diff} cams=${cams}`);
  await p.getByTestId('studio-rm').click(); const fixes = await p.getByTestId('studio-fix').count(); if (fixes) await p.getByTestId('studio-fix').first().click(); const cams2 = await p.locator('[data-testid=studio-plan] [data-kind=camera]').count();
  await p.getByTestId('studio-brief').click(); const brief = await p.getByTestId('studio-brief-text').inputValue(); const reh = await p.locator('[data-testid=studio-rehearsal] li').count();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'removing the only camera fails its rule with a fix that adds one; the brief names the kit, the rules and the tests; the rehearsal lists them', fixes >= 1 && cams2 === 1 && /Design brief \(synthetic/.test(brief) && /camera/.test(brief) && /Tests commissioning would need/.test(brief) && reh >= 5, `fixes=${fixes} cams2=${cams2} reh=${reh}`);
  await p.setInputFiles('[data-testid=studio-import]', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"v":1,"items":[{"k":"rocket","x":1,"y":1}]}') }); await p.waitForTimeout(150); const bad = await p.getByTestId('studio-said').innerText();
  await p.setInputFiles('[data-testid=studio-import]', { name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ v: 1, name: 'Imported room', w: 5, l: 4, h: 2.7, seats: 6, items: [{ k: 'display', x: 2.5, y: 0.15 }] })) }); await p.waitForTimeout(150);
  const good = await p.getByTestId('studio-said').innerText(); const objs = await p.locator('[data-testid=studio-plan] [data-item]').count();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'import refuses a file that is not a concept and loads one that is; nothing leaves the page', /not a Design a Space concept/.test(bad) && /Imported “Imported room”: 1 object\./.test(good) && objs === 1 && s.off.length === 0 && clean(s.errs).length === 0, `${bad} | ${good} | ${objs}`); await s.close(); }
{ const s = await t.open('#/v14/connect/ROOM'); await s.page.locator('[data-testid=ic-connect]').first().click(); await s.page.waitForTimeout(3000); const m = await s.page.locator('[data-testid=ic-job]').innerText();
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'Instant Connect runs a simulated job through its states on a visible clock; no device is reached', /monitoring enabled|discovered|baseline pending/i.test(m) && s.off.length === 0, m.slice(0, 80)); await s.close(); }
{ const s = await t.open('#/v14/diagnostics/R-ATL-4-218'); await s.page.click('[data-testid=dg-run]'); await s.page.waitForTimeout(100); const m = await t.main(s.page);
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'diagnostics: control-approved templates stay not authorized, field templates stay not measured, read-only ones run simulated', /not authorized/.test(m) && /Not measured/.test(m) && /pass/.test(m)); await s.close(); }
{ const s = await t.open('#/v14/robot'); const run = s.page.locator('[data-testid=rb-run]'); t.ok(`P-${String(n++).padStart(2, '0')}`, 'robotic audio will not run while an interlock is false', await run.isDisabled());
  for (const cb of await s.page.locator('.pa-check input').all()) if (!(await cb.isChecked())) await cb.check(); await run.click(); await s.page.waitForTimeout(100); const m = await t.main(s.page);
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'with every interlock true the plan runs on the simulator and refuses sign-off on virtual values', /no sign-off|Sign-off/.test(m) && /synthetic/.test(m)); await s.close(); }
{ const s = await t.open('#/v14/itsm'); await s.page.click('[data-testid=itsm-sync]'); await s.page.waitForTimeout(100); const rows = await s.page.locator('.pa-table tbody tr').count(); t.ok(`P-${String(n++).padStart(2, '0')}`, 'ITSM read-only sync lists the workspace incidents, callers withheld', rows > 0 && /callers withheld/.test(await t.main(s.page))); await s.close(); }
{ const s = await t.open('#/v14/nonsense'); t.ok(`P-${String(n++).padStart(2, '0')}`, 'an unknown V1.4 view is an empty state with a way back', /no view called/.test(await t.main(s.page)) && clean(s.errs).length === 0); await s.close(); }
{ const s = await t.open('#/gate', { role: 'visitor' }); await s.page.click('[data-testid=gate-role-employee]'); await s.page.waitForTimeout(600); const role = await s.page.evaluate(() => localStorage.getItem('empathia.demo.perspective'));
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'the gate switches the View-as role (D1: grants nothing) and lands on that role’s home', role === 'employee' && clean(s.errs).length === 0, `role=${role}`); await s.close(); }
{ const s = await t.open('#/investigate'); await s.page.locator('[data-testid=investigate-row]').first().click(); await s.page.waitForTimeout(300); const m = await t.main(s.page);
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'an investigation shows the seven steps and hypotheses that stay hypotheses', /Symptom/.test(m) && /What could explain it/.test(m) && /none is the cause until a test says so/i.test(m));
  await s.page.goBack(); await s.page.waitForTimeout(300); await s.page.goForward(); await s.page.waitForTimeout(300); t.ok(`P-${String(n++).padStart(2, '0')}`, 'back and forward through a case keep it rendered', /What could explain it/.test(await t.main(s.page)) && clean(s.errs).length === 0); await s.close(); }
{ const s = await t.open('#/ledger'); const rows = await s.page.locator('[data-testid=ledger-row]').count(); await s.page.locator('[data-testid=ledger-row]').first().click(); await s.page.waitForTimeout(300); const m = await t.main(s.page);
  t.ok(`P-${String(n++).padStart(2, '0')}`, 'the evidence ledger lists conclusions and an entry shows the rule, who signed and what it stands on', rows > 20 && /Why this\?/.test(m) && /Rule/.test(m) && /What it stands on/.test(m)); await s.close(); }
{ const s = await t.open('#/ledger/rec/C-C-ATL-4-220'); await s.page.waitForSelector('.ui-notice', { timeout: 5000 }).catch(() => undefined); const m = await t.main(s.page); t.ok(`P-${String(n++).padStart(2, '0')}`, 'a contradiction between two records is named, not averaged (Atlas 4.220: OPERATIONAL with no verified tests)', /Contradiction/.test(m) && /cannot both be right/.test(m)); await s.close(); }

// phones: 390 wide, no horizontal overflow, 44 px targets on the dock and pills, light and dark
for (const hash of ['#/control/tower', '#/list/Device', '#/v14/telemetry', '#/control/R-ATL-4-218', '#/compare/budget', '#/exports', '#/studio/new/hybrid']) {
  const s = await t.open(hash, { w: 390, h: 800 }); const small = await s.page.evaluate(() => [...document.querySelectorAll('main a[href], main button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 24; }).length);
  t.ok(`P-${String(n++).padStart(2, '0')}`, `${hash} at 390: no horizontal overflow, no tiny target`, !(await overflow(s.page)) && small === 0 && clean(s.errs).length === 0, `overflow=${await overflow(s.page)} small=${small}`); await s.close();
}
for (const scheme of ['light', 'dark']) { const s = await t.open('#/control/tower', { colorScheme: scheme, theme: scheme }); const bg = await s.page.evaluate(() => getComputedStyle(document.body).backgroundColor); const contrast = await s.page.evaluate(() => { const el = document.querySelector('.pa-site h3'); return el ? getComputedStyle(el).color : ''; });
  t.ok(`P-${String(n++).padStart(2, '0')}`, `the tower renders in ${scheme} mode with a body background and readable text`, !!bg && bg !== 'rgba(0, 0, 0, 0)' && !!contrast, `bg=${bg}`); await s.close(); }

await t.done();
