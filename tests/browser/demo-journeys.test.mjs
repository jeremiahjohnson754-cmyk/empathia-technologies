// The twelve Enterprise 3.0 journeys, walked hop by hop on the links a person would press (founder, 23 Nov 2026 19:22: "the next
// milestone should be less about adding pages and more about proving all the products work together. Every product and workflow …
// walk the 12 end-to-end journeys"). J6 is two journeys (FLOW and VOICE), and VOICE is walked twice (the evidence, then the repair),
// so fourteen walks.
//
// What a walk proves, and what it does not. Each hop presses a real link or control on the page the hop before it reached, as the
// role the journey names; it passes only if the address changed to the expected product, the page is not the access page, and the
// record the journey is about (the same room, job, case or request identifier) is still on it. A hand-over to another role changes
// the role in the same browser, so what the first person did is what the next one finds. The walks do not re-test each product's
// own rules: those stay in the product suites named beside each journey in docs/audit/PARITY_LEDGER.csv (demo-servicehands for
// the job's state machine, demo-voice for the calling job, demo-modules for the five modules, and so on).
//   node tests/browser/demo-journeys.test.mjs   (after node scripts/build.mjs)
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done, base } = await harness('demo-journeys');
const ROOM = 'R-ATL-4-218'; const JOB = 'ISS-0417'; const WO = 'WO-0088'; const CASE = 'APX-001';

const settle = async (p) => { await p.waitForSelector('main h1', { timeout: 15000 }).catch(() => undefined); await p.waitForTimeout(450); };
const hashOf = (p) => p.evaluate(() => decodeURIComponent(location.hash));
const state = (p) => p.evaluate(() => ({ hash: decodeURIComponent(location.hash), refused: !!document.querySelector('[data-testid=access-page]'), h1: document.querySelector('main h1')?.textContent?.trim() || '',
  text: document.querySelector('main')?.innerText || '', wide: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
const near = (p, sel) => p.evaluate((s) => { const head = (s.match(/#\/[a-z0-9]+/i) || [''])[0]; return [...new Set([...document.querySelectorAll('a[href^="#/"]')].map((a) => a.getAttribute('href')).filter((h) => !head || h.startsWith(head)))].slice(0, 8).join('  '); }, sel);

/**
 * One journey. `steps` are, in order:
 *   ['what the person does', { click: css }                , { at: /hash/, see: /text/ | css, id: 'record id that must still be shown' }]
 *   ['…',                    { as: 'role', open: '#/…' }   , …]     a hand-over: the next person, in the same browser
 *   ['…',                    { type: [css, 'text'], enter } , …]
 *   ['…',                    { back: true }                , …]
 *   ['…',                    { run: async (page) => … }    , …]     a control that is not a link (a button, a field)
 * `open` and `id` may be functions, read when the hop is reached (added 24 Nov 2026 for the repair journey, whose later hops name the
 * job its first hop creates; nothing about what a hop must show is changed by it).
 */
const lazy = (v) => (typeof v === 'function' ? v() : v);
async function journey(J, title, role, start, steps, { w = 1440, h = 900 } = {}) {
  const t = await open(start, { role, sw: false, w, h, reduced: true }); const p = t.page; p.setDefaultTimeout(15000); await settle(p);
  let n = 0; let broken = false; const tag = w < 600 ? `${J}p` : J;
  const first = await state(p);
  ok(`JW-${tag}-00`, `${title}: starts at ${start} as ${role}`, !first.refused && !!first.h1, `${first.hash} · ${first.h1}`);
  for (const [say, act, want = {}] of steps) {
    n += 1; const id = `JW-${tag}-${String(n).padStart(2, '0')}`;
    if (broken) { ok(id, `${say} (not reached: an earlier hop of this journey failed)`, false, 'not reached'); continue; }
    let detail = ''; let did = true;
    try {
      if (act.click) { const l = p.locator(act.click).first(); if (!(await l.count())) { did = false; detail = `no ${act.click} on ${await hashOf(p)}; nearby: ${await near(p, act.click)}`; } else { await l.scrollIntoViewIfNeeded(); await l.click(); } }
      else if (act.as) { await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), act.as); await p.goto(base + lazy(act.open)); await p.reload(); }
      else if (act.type) { const f = p.locator(act.type[0]).first(); await f.click(); await f.fill(act.type[1]); if (act.enter) await f.press('Enter'); }
      else if (act.back) await p.goBack();
      else if (act.run) await act.run(p);
    } catch (e) { did = false; detail = String(e.message || e).split('\n')[0]; }
    await settle(p); const s = await state(p);
    const at = !want.at || want.at.test(s.hash);
    const see = !want.see || (want.see instanceof RegExp ? want.see.test(s.text) : await p.locator(want.see).count() > 0);
    const wid = lazy(want.id); const kept = !wid || s.text.includes(wid) || s.hash.includes(wid);
    const pass = did && at && see && kept && !s.refused && s.wide <= 1;
    if (!pass && !detail) detail = `${s.hash} · ${s.refused ? 'ACCESS PAGE · ' : ''}${at ? '' : 'wrong address · '}${see ? '' : `missing ${want.see} · `}${kept ? '' : `lost ${wid} · `}${s.wide > 1 ? `sideways scroll ${s.wide}px · ` : ''}${s.h1}`;
    ok(id, say, pass, detail); if (!pass) broken = true;
  }
  ok(`JW-${tag}-99`, `${title}: no console error and nothing requested off the page’s origin on the way`, t.errs.length === 0 && t.off.length === 0, [...t.errs, ...t.off].slice(0, 2).join(' | '));
  await t.close();
}

// ------------------------------------------------------------------------------------------------ J1 Discover → Explain → Act
await journey('J1', 'J1 Discover, explain, act', 'architect', '#/v25', [
  ['from Mission Control, the campus', { click: 'a[href="#/campus"]' }, { at: /^#\/campus$/ }],
  ['a building of the synthetic campus', { click: 'main a[href="#/campus/ATL"]' }, { at: /^#\/campus\/ATL/ }],
  ['back to the campus and into a room', { back: true }, { at: /^#\/campus$/ }],
  ['the room, on its floor', { click: `main a[href="#/campus/ATL/4/${ROOM}"]` }, { at: new RegExp(`${ROOM}`), id: ROOM }],
  ['Search Party, from the room', { click: `main a[href="#/search?focus=Room:${ROOM}"]` }, { at: /^#\/search\?focus=Room/, see: '[data-testid=sp-room-acts]' }],
  ['the question “camera in town halls”', { run: async (p) => { await p.goto(`${base}#/search?q=${encodeURIComponent('camera in town halls')}`); } }, { at: /^#\/search\?q=camera/, see: 'main a[href*="focus=Asset"]' }],
  ['one camera of the answer', { click: 'main a[href*="focus=Asset%3AAS-2503"]' }, { at: /focus=Asset:AS-2503/, see: '[data-testid=sp-asset-acts]', id: 'AS-2503' }],
  ['what the camera is related to is on the page', { run: async () => undefined }, { see: /tracks|involves|installed|located/i }],
  ['the camera’s room, at the position it is installed in', { click: '[data-testid=sp-asset-room]' }, { at: /R-ATL-1-150.*device=PA-0011|R-ATL-1-150/, id: 'R-ATL-1-150' }],
  ['an allowed next step: the room’s assurance', { click: '[data-testid=room-jump-assurance]' }, { at: /^#\/assurance\/room\/R-ATL-1-150/, see: /Verified|Measured|Modeled|Declared|Not tested|baseline/i, id: 'R-ATL-1-150' }],
  ['and back to the room by the room row', { click: '[data-testid=room-jump-campus]' }, { at: /R-ATL-1-150/, id: 'R-ATL-1-150' }],
  ['the browser’s Back returns to assurance', { back: true }, { at: /^#\/assurance\/room\/R-ATL-1-150/ }],
  ['the asset’s own record is one link from Search Party', { run: async (p) => { await p.goto(`${base}#/search?focus=Asset:AS-2503`); await settle(p); await p.locator('[data-testid=sp-asset-open]').click(); } }, { at: /^#\/v25\/asset\?a=AS-2503/, id: 'AS-2503' }],
]);

// ------------------------------------------------------------------------------------------------ J2 Requester → Lite → engineering
await journey('J2', 'J2 Employee to Lite to engineering', 'employee', `#/here/${ROOM}`, [
  ['from the room’s code, the room in Lite (an employee is not sent to a page that refuses them)', { click: '[data-testid=here-lite]' }, { at: new RegExp(`^#/lite/room/${ROOM}`), see: '[data-testid=lite-ask-room]', id: '4.218' }],
  ['“Ask for work in this room”', { click: '[data-testid=lite-ask-room]' }, { at: new RegExp(`^#/request\\?room=${ROOM}`), id: '4.218' }],
  ['more equipment, a display, and the need in the person’s words', { run: async (p) => { await p.getByRole('radio', { name: /More equipment in a room/ }).or(p.getByRole('button', { name: /More equipment in a room/ })).first().click(); await p.getByTestId('rq-more-display').click(); await p.getByTestId('rq-need').fill('People at the far end of the table cannot read the shared screen.'); await p.getByTestId('rq-send').click(); await p.getByTestId('rq-item').first().waitFor(); } }, { see: '[data-testid=rq-item]', id: '4.218' }],
  ['hand-over: the operations lead finds the request in the queue', { as: 'ops', open: '#/request/queue' }, { at: /^#\/request\/queue/, see: /far end of the table|4\.218/ }],
  ['hand-over: the designer opens the same room in Lite', { as: 'designer', open: `#/lite/room/${ROOM}?mode=engineer` }, { at: /^#\/lite\/room/, see: '[data-testid=lite-x-studio]', id: '4.218' }],
  ['a concept on the room', { click: '[data-testid=lite-x-studio]' }, { at: new RegExp(`^#/studio/room/${ROOM}`), see: '[data-testid=studio-version]', id: '4.218' }],
  ['the version is kept and a design brief made', { run: async (p) => { await p.getByTestId('studio-version').click(); await p.getByTestId('studio-brief').click(); } }, { see: /brief|version/i }],
  ['the Space Optimizer compares proposals', { run: async (p) => { await p.goto(`${base}#/lite/optimize`); } }, { at: /^#\/lite\/optimize/, see: 'main a[href*="mode=optimize"]' }],
  ['one room’s proposals', { click: 'main a[href*="mode=optimize"]' }, { at: /mode=optimize/, see: /Sightlines|Video coverage|Audio capture|Accessibility/i }],
]);

// ------------------------------------------------------------------------------------------------ J3 FORGE → Scouter → approved engineering
await journey('J3', 'J3 FORGE to Scouter to approved engineering', 'designer', `#/lite/room/${ROOM}?mode=engineer`, [
  ['from the design, its engineering package', { click: '[data-testid=lite-x-forge]' }, { at: new RegExp(`^#/forge/room/${ROOM}`), see: '[data-testid=forge-package]', id: '4.218' }],
  ['the author is not offered the approval', { run: async () => undefined }, { see: '[data-testid=forge-noapprove]' }],
  ['a device checked against a room in Scouter', { click: '[data-testid=forge-to-scouter]' }, { at: /^#\/campus\/scouter/, see: /suit this room/i }],
  ['back to the package', { back: true }, { at: new RegExp(`^#/forge/room/${ROOM}`), see: '[data-testid=forge-package]' }],
  ['hand-over: the commissioning engineer, a second person, approves', { as: 'cxeng', open: `#/forge/room/${ROOM}` }, { see: '[data-testid=forge-approve]' }],
  ['the approval is recorded against the fingerprint', { click: '[data-testid=forge-approve]' }, { see: '[data-testid=forge-approval]' }],
  ['where the room is accepted', { click: '[data-testid=forge-to-cx]' }, { at: new RegExp(`^#/commissioning/room/${ROOM}`), id: '4.218' }],
]);

// ------------------------------------------------------------------------------------------------ J4 Commissioning → documentation → Assurance
await journey('J4', 'J4 Commissioning to documentation to Assurance', 'cxeng', `#/commissioning/room/${ROOM}`, [
  ['traceability', { click: `main a[href="#/commissioning/room/${ROOM}/trace"]` }, { at: /\/trace$/, id: '4.218' }],
  ['deficiencies', { click: `main a[href="#/commissioning/room/${ROOM}/deficiencies"]` }, { at: /\/deficiencies$/, id: '4.218' }],
  ['sign-off, which says who may sign', { click: `main a[href="#/commissioning/room/${ROOM}/signoff"]` }, { at: /\/signoff$/, see: '[data-testid=cx-signoff]' }],
  ['the documentation the room owes', { click: '[data-testid=cx-to-docs]' }, { at: /^#\/docs\/SIM-REPORT/, see: /Needs me|All required/ }],
  ['its acceptance dossier', { click: 'main a[href^="#/dossier/SIM-REPORT"]' }, { at: /^#\/dossier\/SIM-REPORT/, see: /Acceptance/ }],
  ['the room from the dossier', { click: `main a[href="#/room/${ROOM}"]` }, { at: new RegExp(ROOM), id: '4.218' }],
  ['the room’s assurance', { click: '[data-testid=room-jump-assurance]' }, { at: new RegExp(`^#/assurance/room/${ROOM}`), id: '4.218' }],
  ['recommissioning after a replacement: affected checks only', { click: `main a[href="#/assurance/room/${ROOM}/recommission"]` }, { at: /\/recommission$/, see: /Affected checks only/ }],
  ['the baseline history keeps the earlier baseline', { click: `main a[href="#/assurance/room/${ROOM}/history"]` }, { at: /\/history$/, see: /baseline/i }],
  ['the room’s history, replayed', { click: '[data-testid=room-jump-replay]' }, { at: new RegExp(`^#/replay/${ROOM}`), id: '4.218' }],
  ['and back to commissioning by the room row', { click: '[data-testid=room-jump-commissioning]' }, { at: new RegExp(`^#/commissioning/room/${ROOM}`), id: '4.218' }],
]);

// ------------------------------------------------------------------------------------------------ J5 Failure → Field Intelligence → APEX → ServiceHands → close
await journey('J5', 'J5 Failure to Field Intelligence to APEX to ServiceHands', 'ops', `#/campus/ATL/4/${ROOM}`, [
  ['the room’s open job, from the room', { click: `main a[href="#/v25/service?id=${JOB}"]` }, { at: new RegExp(`^#/v25/service\\?id=${JOB}`), id: JOB }],
  ['what else the fault reaches: the room in the graph', { click: `main a[href="#/search?focus=Room:${ROOM}"]` }, { at: /focus=Room/, id: '4.218' }],
  ['hand-over: the systems engineer scans the room', { as: 'syseng', open: `#/v25/fi/scan/${ROOM}` }, { at: /^#\/v25\/fi\/scan/, see: '[data-testid=job-jumps]', id: WO }],
  ['from the scan, the diagnosis of the same job', { click: '[data-testid=job-jump-apex]' }, { at: new RegExp(`^#/v25/apex\\?case=${CASE}`), see: /hypothes/i, id: JOB }],
  ['APEX reads calling from VOICE and does not call it measured', { run: async () => undefined }, { see: '[data-testid=apex-calling]' }],
  ['the calling path APEX cites', { click: '[data-testid=apex-to-voice]' }, { at: new RegExp(`^#/voice/callpath/${ROOM}`), id: '4.218' }],
  ['hand-over: the service manager dispatches from the queue', { as: 'svcmgr', open: `#/v25/service?id=${JOB}` }, { at: /^#\/v25\/service/, see: /Triage|Assign|Dispatch|technician/i, id: JOB }],
  ['hand-over: the service engineer opens the work order', { as: 'service', open: '#/servicehands' }, { at: /^#\/servicehands/, see: `main a[href="#/servicehands/wo/${WO}"]` }],
  ['the work order', { click: `main a[href="#/servicehands/wo/${WO}"]` }, { at: new RegExp(`^#/servicehands/wo/${WO}`), see: '[data-testid=job-jumps]', id: JOB }],
  ['the page says closing does not pass a commissioning test', { run: async () => undefined }, { see: /Closing this job does not pass a commissioning test/ }],
  ['hand-over: the commissioning engineer reads the room’s record from the job', { as: 'cxeng', open: `#/servicehands/wo/${WO}` }, { see: '[data-testid=job-jump-commissioning]', id: JOB }],
  ['the commissioning record of the same room', { click: '[data-testid=job-jump-commissioning]' }, { at: new RegExp(`^#/commissioning/room/${ROOM}`), id: '4.218' }],
  ['hand-over: the executive’s figure counts the job from the record', { as: 'exec', open: '#/v25/exec' }, { at: /^#\/v25\/exec/, see: '[data-testid=passports]' }],
]);

// ------------------------------------------------------------------------------------------------ J6A FLOW
await journey('J6A', 'J6A FLOW', 'syseng', '#/flow', [
  ['one switch the rooms depend on', { click: '[data-testid=flow-open-SW-ATL-4A]' }, { at: /^#\/flow\/link\/SW-ATL-4A/, see: /Declared|Modeled|Observed|Measured|Unknown/i, id: 'SW-ATL-4A' }],
  ['a room that depends on it, in CallPath', { click: `main a[href^="#/voice/callpath/${ROOM}"]` }, { at: new RegExp(`^#/voice/callpath/${ROOM}`), id: '4.218' }],
  ['and back to the link from the call path', { click: '[data-testid=voice-to-flow]' }, { at: /^#\/flow\/link\/SW-ATL-4A\?from=voice/, id: 'SW-ATL-4A' }],
  ['the estate’s map of capabilities', { click: '[data-testid=cap-rail-map]' }, { at: /^#\/families/, see: '[data-testid=fam-thread]' }],
]);

// ------------------------------------------------------------------------------------------------ J6B VOICE
await journey('J6B', 'J6B VOICE', 'ucadmin', '#/voice', [
  ['the call path of the boardroom', { click: '[data-testid=voice-open-callpath]' }, { at: new RegExp(`^#/voice/callpath/${ROOM}`), see: /Layer|layer/, id: '4.218' }],
  ['the network hop the path names', { click: '[data-testid=voice-to-flow]' }, { at: /^#\/flow\/link\/SW-ATL-4A/, id: 'SW-ATL-4A' }],
  ['back to the call path', { back: true }, { at: new RegExp(`^#/voice/callpath/${ROOM}`) }],
  ['what the town hall depends on', { click: '[data-testid=voice-to-mission]' }, { at: /^#\/missionproof/, see: '[data-testid=mission-open-calling]' }],
  ['hand-over: the operations lead reads calling on the room’s assurance', { as: 'ops', open: `#/assurance/room/${ROOM}` }, { see: '[data-testid=as-calling]', id: '4.218' }],
  ['and opens the call path it was read from', { click: '[data-testid=as-calling-open]' }, { at: new RegExp(`^#/voice/callpath/${ROOM}`), id: '4.218' }],
]);

// ------------------------------------------------------------------------------------------------ J6B VOICE, the repair
// Steps 4 to 6 of the scenario on the controls a person presses, five people in one browser: the report from the room becomes a
// ServiceHands job; an Assurance run writes an operational drift record; APEX opens a case for the job and records VOICE's
// hypothesis as a hypothesis; the job is triaged, assigned, worked with evidence and verified by someone other than the technician;
// the retest clears the drift record and leaves the baseline alone; MissionProof reads calling again; the report and the CallPath
// still name the same job. The service machine's own refusals stay in demo-servicehands and tests/unit/voice.test.mjs.
{ let job = ''; let wo = '';
  const press = (p, name) => p.getByRole('button', { name }).first().click();
  const board = () => `#/v25/service?id=${job}`;
  await journey('J6BR', 'J6B VOICE, the repair', 'ops', `#/voice/report/${ROOM}`, [
    ['the operations lead reports a calling problem from the room; the receipt names the job', { run: async (p) => { await p.getByTestId('voice-submit').click(); await p.getByTestId('voice-receipt').waitFor(); job = (/job (ISS-\d+)/.exec(await p.getByTestId('voice-receipt').innerText()) || [])[1] || ''; if (!job) throw new Error('the receipt names no job'); } }, { see: '[data-testid=voice-receipt]', id: () => job }],
    ['hand-over: the commissioning engineer opens the room’s assurance, where calling reads outside the targets', { as: 'cxeng', open: `#/assurance/room/${ROOM}` }, { see: '[data-testid=as-calling-says][data-state=OUTSIDE]', id: '4.218' }],
    ['an Assurance run writes an operational drift record for calling', { click: '[data-testid=as-run-btn]' }, { see: /It wrote drift record DR-0001/ }],
    ['the record is on the room, open, and names the job it belongs to', { run: async () => undefined }, { see: '[data-testid=as-drift-row]', id: () => job }],
    ['hand-over: the service manager is offered a diagnosis case for the job', { as: 'svcmgr', open: () => `#/v25/apex?incident=${job}` }, { at: /^#\/v25\/apex\?incident=/, see: /Open a case for ISS-/ }],
    ['opening the case records VOICE’s hypothesis on it, as a hypothesis', { run: (p) => press(p, /^Open a case for ISS-/) }, { see: '[data-testid=apex-voice-recorded]', id: () => job }],
    ['the case ranks it with where it came from, and never as proven', { run: async (p) => { const row = p.locator('[data-testid=apex-case]').getByText('recorded from VOICE').first(); await row.scrollIntoViewIfNeeded(); await row.click().catch(() => undefined); } }, { see: /recorded from VOICE/ }],
    ['the service manager triages the job', { run: async (p) => { await p.goto(base + board()); await p.reload(); await settle(p); await press(p, /^Triage$/); } }, { at: /^#\/v25\/service\?id=ISS-/, see: /TRIAGED → ASSIGNED/, id: () => job }],
    ['and assigns a technician authorised for the site; a window that collides with the room’s booking is re-planned', { run: async (p) => { await press(p, /^Open a work order and rank the pool$/); await p.waitForTimeout(300);
      const replan = p.locator('[data-testid=dispatch-plan]').getByRole('button', { name: 'Propose the next free window' }); if (await replan.count()) { await replan.click(); await p.waitForTimeout(300); }
      wo = await p.evaluate((id) => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}').incidents?.find((i) => i.id === id)?.workOrderId || '', job); if (!wo) throw new Error('no work order was opened'); } }, { see: /ASSIGNED → ACCEPTED/, id: () => wo }],
    ['hand-over: the technician accepts the job, passes the preflight and starts', { as: 'service', open: board }, { see: /Accept the job/, id: () => job }],
    ['the work starts only with the preflight passed', { run: async (p) => { await press(p, /^Accept the job/); await p.getByTestId('preflight').waitFor(); for (const cb of await p.locator('[data-testid=preflight] input[type=checkbox]').all()) await cb.check();
      const start = p.getByRole('button', { name: /^Start the work/ }).first(); const label = await start.innerText(); if (/blocks/.test(label)) throw new Error(`the preflight still blocks: ${(await p.locator('[data-testid=preflight] .svc__checks').innerText()).replace(/\s+/g, ' ').slice(0, 200)}`); await start.click(); } }, { see: /IN_PROGRESS → VERIFYING/ }],
    ['labelled synthetic evidence is recorded and the job handed over; the technician is not offered the verification', { run: async (p) => { await p.locator('input[aria-label="Evidence note"]').fill('SYNTHETIC: uplink patch lead on ATL-4A port 48 reseated; interface counters photographed'); await press(p, /^Record evidence$/); await p.waitForTimeout(200); await press(p, /^Hand over for independent verification/); await p.waitForTimeout(300);
      if (await p.getByRole('button', { name: /^Verify the repair/ }).count()) throw new Error('the technician is offered “Verify the repair” on their own work'); } }, { see: /VERIFYING → RESOLVED/, id: () => job }],
    ['hand-over: a second person, the commissioning engineer, verifies the repair', { as: 'cxeng', open: board }, { see: /Verify the repair/, id: () => job }],
    ['the repair is verified', { run: (p) => press(p, /^Verify the repair/) }, { see: /RESOLVED/ }],
    // 24 Nov 2026 (founder directive, completion §6): a verified repair is not readiness. MissionProof, opened without a case, reads the
    // records: the later session is on record, and calling waits for the Assurance retest that clears the open drift record.
    ['verified is not ready: MissionProof, reading the records, holds calling until the retest', { as: 'ops', open: '#/missionproof' }, { at: /^#\/missionproof$/, see: '[data-testid=mission][data-on-record=retest] [data-dep=calling][data-ready=UNKNOWN]' }],
    ['and it names the drift record it is waiting for', { run: async () => undefined }, { see: /DR-0001 is still open/ }],
    ['the retest: the same engineer runs Assurance on the room again', { as: 'cxeng', open: `#/assurance/room/${ROOM}` }, { see: '[data-testid=as-calling-says][data-state=WITHIN]', id: '4.218' }],
    ['the run clears the drift record and says the accepted baseline is unchanged', { click: '[data-testid=as-run-btn]' }, { see: /Its retest cleared DR-0001.*The accepted baseline is unchanged/ }],
    ['the cleared record stays on the room, with who cleared it', { run: async () => undefined }, { see: '[data-testid=as-drift-cleared]' }],
    ['hand-over: the operations lead opens the later session from the room’s assurance', { as: 'ops', open: `#/assurance/room/${ROOM}` }, { see: '[data-testid=as-calling-open]', id: '4.218' }],
    ['the call path of the session after the repair', { click: '[data-testid=as-calling-open]' }, { at: new RegExp(`^#/voice/callpath/${ROOM}\\?case=retest`), see: '[data-testid=voice-job][data-verified="1"]', id: '4.218' }],
    ['MissionProof reads calling as ready for the town hall, from the verified job', { click: '[data-testid=voice-to-mission]' }, { at: /^#\/missionproof\?case=retest/, see: '[data-dep=calling][data-ready=READY]' }],
    ['and it says which drift record the retest cleared', { run: async () => undefined }, { see: /retest cleared drift record DR-0001/ }],
    ['opened without a case it reads the same records: ready, and says this is the evidence on record', { run: async (p) => { await p.goto(`${base}#/missionproof`); } }, { at: /^#\/missionproof$/, see: '[data-testid=mission][data-on-record=retest] [data-dep=calling][data-ready=READY]' }],
    ['the original report still names the job', { run: async (p) => { await p.goto(`${base}#/voice/report/${ROOM}`); } }, { at: /^#\/voice\/report\//, see: '[data-testid=voice-mine]', id: () => job }],
    ['hand-over: the calling administrator sees which APEX case holds the hypothesis', { as: 'ucadmin', open: `#/voice/callpath/${ROOM}` }, { see: '[data-testid=voice-hyp-recorded]', id: '4.218' }],
    ['hand-over: the executive’s operations view counts from the same records', { as: 'exec', open: '#/v25/exec' }, { at: /^#\/v25\/exec/, see: '[data-testid=passports]' }],
  ]);
}

// ------------------------------------------------------------------------------------------------ J7 PRISM + SENTINEL
await journey('J7', 'J7 PRISM and SENTINEL', 'ops', '#/sentinel', [
  ['the banner says what this is not', { run: async () => undefined }, { see: /SIMULATION — NOT A LIFE-SAFETY SYSTEM/ }],
  ['the screens the notice was sent to', { click: '[data-testid=cap-rail-prism]' }, { at: /^#\/prism/, see: '[data-testid=prism-screens]' }],
  ['one screen in Search Party', { click: 'main a[href^="#/search?focus=Asset:AS-"]' }, { at: /focus=Asset:AS-/, see: '[data-testid=sp-asset-acts]' }],
  ['the screen’s room', { click: '[data-testid=sp-asset-room]' }, { at: /R-[A-Z]{3}-\d/ }],
  ['back to PRISM', { run: async (p) => { await p.goBack(); await p.goBack(); } }, { at: /^#\/prism/ }],
  ['where a failed route becomes a job', { click: '[data-testid=cap-rail-servicehands]' }, { at: /^#\/servicehands/ }],
]);

// ------------------------------------------------------------------------------------------------ J8 MissionProof
await journey('J8', 'J8 MissionProof', 'ops', '#/missionproof', [
  ['the calling dependency', { click: '[data-testid=mission-open-calling]' }, { at: new RegExp(`^#/voice/callpath/${ROOM}`), id: '4.218' }],
  ['back to the event', { click: '[data-testid=voice-to-mission]' }, { at: /^#\/missionproof/ }],
  ['the uplink dependency', { click: '[data-testid=mission-open-uplink]' }, { at: /^#\/flow\/link\/SW-ATL-4A/, id: 'SW-ATL-4A' }],
  ['back to the event by the works-with row', { click: '[data-testid=cap-rail-missionproof]' }, { at: /^#\/missionproof/ }],
  ['the host room’s commissioning record', { click: '[data-testid=mission-open-host]' }, { at: /^#\/commissioning\/room\/R-NST-2-101/, id: 'R-NST-2-101' }],
]);

// ------------------------------------------------------------------------------------------------ J9 ACCORD
await journey('J9', 'J9 ACCORD', 'ops', '#/accord', [
  ['the capsule is about one job', { run: async () => undefined }, { see: new RegExp(JOB), id: JOB }],
  ['the evidence it scopes: the call path', { click: `main a[href="#/voice/callpath/${ROOM}"]` }, { at: new RegExp(`^#/voice/callpath/${ROOM}`), id: '4.218' }],
  ['back to the capsule', { back: true }, { at: /^#\/accord/ }],
  ['the room’s commissioning record', { click: `main a[href="#/commissioning/room/${ROOM}"]` }, { at: new RegExp(`^#/commissioning/room/${ROOM}`), id: '4.218' }],
  ['back, and to ServiceHands where the job is', { run: async (p) => { await p.goBack(); await settle(p); await p.locator('[data-testid=cap-rail-servicehands]').click(); } }, { at: /^#\/servicehands/, see: `main a[href="#/servicehands/wo/${WO}"]` }],
]);

// ------------------------------------------------------------------------------------------------ J10 Learn / SIGNAL
await journey('J10', 'J10 Learn and SIGNAL', 'service', `#/servicehands/wo/${WO}`, [
  ['from the job, the case file made from the room’s records', { click: '[data-testid=job-jump-learn]' }, { at: new RegExp(`^#/learn/cases/TC-${ROOM}`), id: '4.218' }],
  ['the case on the clock', { click: `main a[href="#/learn/service/TC-${ROOM}"]` }, { at: new RegExp(`^#/learn/service/TC-${ROOM}`), id: '4.218' }],
  ['back to the case file', { click: `main a[href="#/learn/cases/TC-${ROOM}"]` }, { at: new RegExp(`^#/learn/cases/TC-${ROOM}`) }],
  ['return to the source job', { click: '[data-testid=job-jump-service]' }, { at: new RegExp(`^#/servicehands/wo/${WO}`), id: JOB }],
  ['SIGNAL lists only the episodes that can play', { run: async (p) => { await p.goto(`${base}#/learn/signal`); } }, { at: /^#\/learn\/signal$/, see: 'main a[href="#/learn/signal/S1E1"]' }],
  ['an authored episode opens', { click: 'main a[href="#/learn/signal/S1E1"]' }, { at: /^#\/learn\/signal\/S1E1/, see: /Sound check/ }],
]);

// ------------------------------------------------------------------------------------------------ J11 OMNIPRESENCE
await journey('J11', 'J11 OMNIPRESENCE', 'employee', '#/omnipresence', [
  ['a building’s tag is scanned', { click: '[data-testid=omni-scan-ATL]' }, { at: /^#\/omnipresence\/b\/ATL/, see: /Atlas/ }],
  ['a room of the building', { click: 'main a[href*="R-ATL-"]' }, { at: /R-ATL-/ }],
  ['back to the building', { back: true }, { at: /^#\/omnipresence\/b\/ATL/ }],
  ['the map of what works with it', { click: '[data-testid=cap-rail-map]' }, { at: /^#\/families/, see: '[data-testid=fam-thread]' }],
]);

// ------------------------------------------------------------------------------------------------ J12 Executive decision
await journey('J12', 'J12 Executive decision', 'exec', '#/home', [
  ['from the executive’s home, the KPI passports', { click: 'main a[href="#/pro/exec"]' }, { at: /^#\/(pro|v25)\/exec/, see: '[data-testid=passports]' }],
  ['one passport: issues resolved', { run: async (p) => { await p.locator('[data-testid=passports] button', { hasText: 'Issues resolved' }).first().click(); } }, { see: '[data-testid=passport]' }],
  ['it shows its numerator, window, coverage, freshness, confidence and exclusions', { run: async () => undefined }, { see: /Numerator \/ denominator[\s\S]*Window[\s\S]*Coverage[\s\S]*Freshness[\s\S]*Confidence[\s\S]*Exclusions/ }],
  ['and the records it counted, each a link', { run: async () => undefined }, { see: '[data-testid=passport-records] a[data-testid=passport-record]' }],
  ['one of those records: the policy keeps an executive out of service records, so the job opens the room it was in', { click: '[data-testid=passport-records] a[data-testid=passport-record]' }, { at: /^#\/list\/Room\/R-/, see: /R-[A-Z]{3}-\d/ }],
  ['back to the passports', { back: true }, { at: /^#\/(pro|v25)\/exec/ }],
  ['the decision desk', { click: 'main a[href="#/v25/decisions"]' }, { at: /^#\/v25\/decisions/, see: '[data-testid=dec-approve]' }],
  ['service, measured', { run: async (p) => { await p.goto(`${base}#/home`); await settle(p); await p.locator('main a[href="#/v25/service/analytics"]').first().click(); } }, { at: /^#\/v25\/service\/analytics/, see: /Service, measured/ }],
  ['a room behind a service figure, by an address an executive may open', { click: '[data-testid=san-room]' }, { at: /^#\/list\/Room\/R-/, see: /R-[A-Z]{3}-\d/ }],
]);

// ------------------------------------------------------------------------------------------------ on a phone: the two longest hand-overs
await journey('J5', 'J5 on a phone', 'service', `#/servicehands/wo/${WO}`, [
  ['the job row fits a phone and leads to the diagnosis', { click: '[data-testid=job-jump-apex]' }, { at: new RegExp(`^#/v25/apex\\?case=${CASE}`), id: JOB }],
  ['back to the job', { back: true }, { at: new RegExp(`^#/servicehands/wo/${WO}`), see: '[data-testid=job-jumps]' }],
  ['the room’s scan', { click: '[data-testid=job-jump-scan]' }, { at: /^#\/v25\/fi\/scan/, id: WO }],
], { w: 390, h: 844 });
await journey('J12', 'J12 on a phone', 'exec', '#/v25/exec', [
  ['a passport opens on a phone', { run: async (p) => { await p.locator('[data-testid=passports] button', { hasText: 'Issues resolved' }).first().click(); } }, { see: '[data-testid=passport-records] a[data-testid=passport-record]' }],
  ['and its record opens', { click: '[data-testid=passport-records] a[data-testid=passport-record]' }, { at: /^#\/list\/Room\/R-/ }],
], { w: 390, h: 844 });

await done();
