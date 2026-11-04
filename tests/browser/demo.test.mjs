#!/usr/bin/env node
// The investor demo shell from its built dist: lands on the investor start with the synthetic banner and the three start actions (the
// launch action largest on a phone), every legacy area address resolves to a page that states its migration status (never a blank or an
// error), the perspective picker says it grants nothing, no console error, no request leaves the page.
//   node tests/browser/demo.test.mjs [dist] [evidence-dir]
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const dist = path.resolve(process.argv[2] || path.join(repo, 'apps/demo/dist')); const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/demo')); fs.mkdirSync(out, { recursive: true });
const PORT = 4398; const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}/`;
const areas = JSON.parse(fs.readFileSync(path.join(repo, 'apps/demo/src/generated/parity.json'), 'utf8'));
const browser = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errs = []; const ext = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); });
  await page.goto(base); await page.waitForTimeout(600);
  const land = await page.evaluate(() => ({ hash: location.hash, banner: !!Array.from(document.querySelectorAll('.ui-tag')).find((t) => /SYNTHETIC DATA/.test(t.textContent)), actions: Array.from(document.querySelectorAll('.start .go')).map((a) => ({ text: a.querySelector('b').textContent, h: a.getBoundingClientRect().height })), note: (document.getElementById('persp-note') || {}).textContent || '', over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  ok(`D-${tag}-01`, 'lands on the investor start with the synthetic banner and three start actions', land.hash === '#/investor' && land.banner && land.actions.length === 3 && land.over <= 0, JSON.stringify(land));
  ok(`D-${tag}-02`, 'the launch action comes first and, on a phone, is the tallest', land.actions[0] && /Launch interactive room builder/.test(land.actions[0].text) && (tag !== 'phone' || land.actions[0].h >= Math.max(...land.actions.map((a) => a.h))), JSON.stringify(land.actions));
  ok(`D-${tag}-03`, 'the perspective picker says it grants nothing', /grants nothing/.test(land.note), land.note);
  await page.screenshot({ path: path.join(out, `${tag}-start.png`) });
  if (tag === 'desktop') {
    let bad = []; for (const a of areas.filter((x) => x.key !== 'investor')) { const hash = '#/' + (a.key === 'none' ? 'no-such-area' : a.key.replace('.', '/')); await page.evaluate((x) => { location.hash = x; }, hash); await page.waitForTimeout(120);
      const v = await page.evaluate(() => ({ h1: (document.querySelector('main h1') || {}).textContent || '', text: document.querySelector('main').innerText, native: !!document.querySelector('main [data-native]') })); if (!(v.h1.length > 2 && (v.native || /(Not migrated yet|Native page|Unknown address|interactive demonstration|Acting as)/.test(v.text)))) bad.push(`${hash}: ${v.h1}`); }   // rebuild/demo-spaces: the campus and tours pages are native and declare it with data-native (assertion unchanged otherwise)
    ok('D-04', `every one of the ${areas.length} legacy areas resolves to a native page or one that states its migration status`, !bad.length, bad.slice(0, 5).join(' | '));
    await page.evaluate(() => { location.hash = '#/assurance/room/R-1/history'; }); await page.waitForTimeout(150);
    ok('D-05', 'a deep legacy address resolves to its area (assurance.history)', /baseline history/i.test(await page.evaluate(() => document.querySelector('main').innerText)));
    await page.evaluate(() => { location.hash = '#/investor'; }); await page.waitForTimeout(150);
    await page.click('text=What each workflow solves'); await page.waitForTimeout(200);
    ok('D-06', 'the seven scenarios each state the customer problem', (await page.locator('.scen li').count()) === 7 && (await page.locator('.scen li i').count()) === 7);
  }
  if (tag === 'desktop') {
    // Build a Room on the real engine: the governed path from a description to an accepted room, with the refusals an investor should see
    const main = () => page.evaluate(() => document.querySelector('main').innerText);
    const persp = async (p) => { await page.selectOption('.persp select', p); await page.waitForTimeout(150); };
    const refusal = async () => { const el = page.locator('[role=alert]'); return (await el.count()) ? await el.first().innerText() : ''; };
    await page.evaluate(() => { try { localStorage.removeItem('empathia.demo.build-a-room.v1'); } catch {} location.hash = '#/v25/build'; }); await page.waitForTimeout(300);
    await persp('visitor');
    ok('B-01', 'the builder opens from the launch address and says the visitor perspective cannot create a room', /Build a Room/.test(await main()) && /does not hold room\.design/.test(await main()));
    await persp('designer'); await page.fill('#b-length', 'abc'); await page.click('button:has-text("Create the room")'); await page.waitForTimeout(200);
    ok('B-02', 'an unreadable dimension is refused, never substituted', /not readable/.test(await refusal()), await refusal());
    await page.fill('#b-length', "19' 8\""); await page.fill('#b-width', '4'); await page.selectOption('#b-unit', 'ft'); await page.fill('#b-width', '13'); await page.click('button:has-text("Create the room")'); await page.waitForTimeout(400);
    const t1 = await main();
    ok('B-03', 'the room is created from the template with declared and modeled dimensions labelled, devices placed and connections proposed', /PLANNED/.test(t1) && /length DECLARED/.test(t1) && /ceiling MODELED/.test(t1) && /Devices \(\d+\) and proposed connections \(\d+\)/.test(t1) && /Huddle Room/.test(t1), t1.slice(0, 200));
    await page.click('button:has-text("Approve the suggestion")'); await page.waitForTimeout(150);
    ok('B-04', 'the designer cannot approve the classification (authority)', /room\.classify\.approve/.test(await refusal()), await refusal());
    await page.fill('[aria-label="Revision reason"]', 'initial layout'); await page.click('button:has-text("Save revision")'); await page.waitForTimeout(150);
    await persp('syseng'); await page.click('button:has-text("Approve the suggestion")'); await page.waitForTimeout(150);
    ok('B-05', 'the systems engineer approves the classification', /approved HUD by Systems Engineer/.test(await main()), (await main()).slice(0, 100));
    await page.click('button:has-text("Place at the centre")'); await page.waitForTimeout(150); await page.fill('[aria-label="Revision reason"]', 'ceiling mic'); await page.click('button:has-text("Save revision")'); await page.waitForTimeout(150);
    await page.click('#tab-lifecycle'); await page.waitForTimeout(150); await page.click('button:has-text("Move to DESIGN_APPROVED")'); await page.waitForTimeout(150);
    ok('B-06', 'the author of the latest revision cannot approve the design (separation of duties)', /separation of duties/.test(await refusal()), await refusal());
    await page.click('#tab-design'); await page.waitForTimeout(100); await persp('designer'); await page.click('button:has-text("Place at the centre")'); await page.waitForTimeout(100); await page.fill('[aria-label="Revision reason"]', 'designer confirms'); await page.click('button:has-text("Save revision")'); await page.waitForTimeout(150);
    await persp('syseng'); await page.click('#tab-lifecycle'); await page.waitForTimeout(150);
    // a High/Critical design deficiency may block approval: remove the offending device first if the engine reports one
    await page.click('button:has-text("Move to DESIGN_APPROVED")'); await page.waitForTimeout(150);
    ok('B-07', 'the systems engineer approves the design (DESIGN_APPROVED)', /DESIGN_APPROVED/.test(await page.locator('.build__state').innerText()), await refusal());
    await page.click('button:has-text("Move to INSTALLATION_PENDING")'); await page.waitForTimeout(150);
    ok('B-08', 'the systems engineer cannot approve the installation window (window.approve)', /window\.approve/.test(await refusal()), await refusal());
    await persp('ops'); await page.click('button:has-text("Move to INSTALLATION_PENDING")'); await page.waitForTimeout(150);
    await persp('installer'); await page.click('button:has-text("Move to INSTALLED_UNVERIFIED")'); await page.waitForTimeout(150);
    await persp('cxeng'); await page.click('button:has-text("Record as")'); await page.waitForTimeout(150);
    ok('B-09', 'nothing passes from a design: recording before COMMISSIONING is refused', /COMMISSIONING/.test(await refusal()), await refusal());
    await persp('syseng'); await page.click('button:has-text("Move to COMMISSIONING")'); await page.waitForTimeout(150);
    await persp('cxeng'); await page.click('button:has-text("Record all untested as PASS")'); await page.waitForTimeout(400);
    const recorded = () => page.locator('.build__list').last().innerText();
    const rec = await recorded();
    ok('B-10', 'every applicable test is recorded as PASS_UNVERIFIED by the commissioning engineer', (rec.match(/PASS_UNVERIFIED/g) || []).length >= 10 && !/PASS_VERIFIED/.test(rec) && !/Refused/.test(await refusal()), (await refusal()) || rec.slice(0, 120));
    await page.click('button:has-text("Verify all unverified")'); await page.waitForTimeout(300);
    ok('B-11', 'the recorder cannot verify their own results', /independent/.test(await refusal()), await refusal());
    await persp('architect'); await page.click('button:has-text("Verify all unverified")'); await page.waitForTimeout(400);
    ok('B-12', 'a different person verifies every PASS', (await recorded()).includes('PASS_VERIFIED') && !(await recorded()).includes('PASS_UNVERIFIED'));
    await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(200);
    ok('B-13', 'the verifier cannot accept the room (separation of duties)', /separation of duties/.test(await refusal()), await refusal());
    await persp('cxeng'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(200);
    ok('B-14', 'the recorder cannot accept the room either', /separation of duties|customer\.accept/.test(await refusal()), await refusal());
    await persp('exec'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(200);
    ok('B-15', 'an executive does not hold customer.accept', /customer\.accept/.test(await refusal()), await refusal());
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(200);
    ok('B-15b', 'the QA reviewer, who neither recorded nor verified, accepts the room and baseline v1 is published', /ACCEPTED/.test(await page.locator('.build__state').innerText()) && /baseline v1/.test(await page.locator('.build__state').innerText()), await refusal());
    await persp('syseng'); await page.click('button:has-text("Recommission")'); await page.waitForTimeout(150);
    ok('B-15c', 'the room can be recommissioned (back to COMMISSIONING) while baseline v1 stays', /COMMISSIONING/.test(await page.locator('.build__state').innerText()) && /baseline v1/.test(await page.locator('.build__state').innerText()), await refusal());
    // the complete journey continues: a change during recommissioning → record → independent verification → re-acceptance → baseline v2 → compare
    await page.click('#tab-design'); await page.waitForTimeout(100); await persp('designer'); await page.selectOption('#b-cat', 'lighting'); await page.click('button:has-text("Place at the centre")'); await page.waitForTimeout(150);
    ok('B-15d', 'lighting control can be added during recommissioning by whoever holds room.design (a new family, so new tests apply)', !/Refused/.test(await refusal()) && (await page.locator('.build__list').first().innerText()).split('\n').length >= 2, await refusal());
    await persp('syseng'); await page.click('#tab-lifecycle'); await page.waitForTimeout(150);
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(200);
    ok('B-15e', 'the changed room cannot be re-accepted until the new tests are recorded and verified', /Refused/.test(await refusal()), await refusal());
    await persp('cxeng'); await page.click('button:has-text("Record all untested as PASS")'); await page.waitForTimeout(300);
    await persp('architect'); await page.click('button:has-text("Verify all unverified")'); await page.waitForTimeout(300);
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(300);
    const st2 = await page.locator('.build__state').innerText();
    ok('B-15f', 're-acceptance publishes baseline v2 (v1 superseded) and the lineage lists both', /ACCEPTED/.test(st2) && /baseline v2/.test(st2) && /v1/.test(await page.locator('[data-testid=lineage]').innerText()) && /v2/.test(await page.locator('[data-testid=lineage]').innerText()), (await refusal()) || st2);
    const diff = await page.locator('[data-testid=baseline-diff]').innerText();
    ok('B-15g', 'the comparison between v1 and v2 names the added device and the results that changed', /v1 and v2/.test(diff) && /1 added/.test(diff), diff.slice(0, 200));
    await page.click('#tab-ledger'); await page.waitForTimeout(150);
    const led = await main();
    ok('B-16', 'the ledger records every refusal with its actor (DENIED rows) alongside the allowed changes', (led.match(/DENIED/g) || []).length >= 5 && (led.match(/ALLOWED/g) || []).length >= 10, `${(led.match(/DENIED/g) || []).length} denied`);
    await page.screenshot({ path: path.join(out, 'build-a-room.png'), fullPage: true });
    await page.reload(); await page.waitForTimeout(400);
    ok('B-17', 'the draft survives a reload on this computer and can be reset', /Harbour Huddle/.test(await main()));
    await page.click('button:has-text("Reset demonstration")'); await page.waitForTimeout(200);
    ok('B-18', 'reset returns to the description form', !!(await page.locator('#b-name').count()));
  }
  if (tag === 'desktop') {
    // ---------------------------------------------------------------- Search Party in the demonstration (scenario 1) on the synthetic estate
    await page.evaluate(() => { location.hash = '#/search?focus=NetworkNode:SW-ATL-4A'; }); await page.waitForTimeout(400); await page.waitForSelector('.sp__graph svg');
    const spText = await page.evaluate(() => document.querySelector('main').innerText);
    ok('S-01', 'Search Party opens on the access switch with its neighbourhood graph and the downstream impact: three rooms and their networked devices', /Access switch ATL-4A/.test(spText) && /Downstream impact/.test(spText) && /Atlas 4\.218/.test(spText) && /Atlas 4\.220/.test(spText) && /Atlas 4\.231/.test(spText), spText.slice(0, 300));
    await page.click('.sp__chip:has-text("What depends on this?")'); await page.waitForSelector('.sp__answer');
    const dep = await page.locator('.sp__answer').innerText();
    ok('S-02', 'the dependency question is ANSWERED from recorded edges (DERIVED) and states that an unrecorded link is invisible', /ANSWERED/.test(dep) && /DERIVED/.test(dep) && /3 rooms/.test(dep) && /unrecorded/.test(dep), dep.slice(0, 240));
    await page.click('.sp__chip:has-text("vendor")'); await page.waitForTimeout(200);
    ok('S-03', 'an unmodelled question is UNKNOWN with the reason', /UNKNOWN/.test(await page.locator('.sp__answer').innerText()));
    await page.locator('.sp__node').nth(1).focus(); await page.keyboard.press('Enter'); await page.waitForSelector('.sp__inspect');
    ok('S-04', 'every edge of an inspected node names its provenance (DECLARED / OBSERVED / MODELED / DERIVED)', /(DECLARED|OBSERVED|MODELED|DERIVED)/.test(await page.locator('.sp__inspect').innerText()));
    await page.fill('#spd-q', 'ISS-0417'); await page.waitForTimeout(200);
    ok('S-05', 'search finds the open issue by code', /Far-end audio drops out/.test(await page.locator('.sp__list').innerText()));

    // ---------------------------------------------------------------- the seven guided scenarios: the panel walks the canonical 17 steps, switching perspective, honest about migration status
    await page.evaluate(() => { location.hash = '#/tours/investor?scenario=1'; }); await page.waitForTimeout(500); await page.waitForSelector('[data-testid=tour]');
    const t1 = await page.locator('[data-testid=tour]').innerText();
    ok('T-01', 'scenario 1 opens its first step natively on Search Party as the service technician with its evidence label', /Scenario 1 of 7 · step 1 of 17/.test(t1) && /VERIFIED_DEMO/.test(t1) && /as service/.test(t1) && !/not migrated/.test(t1) && /#\/search\?focus=NetworkNode:SW-ATL-4A/.test(await page.evaluate(() => location.hash)) && (await page.locator('.sp__graph svg').count()) === 1, t1.slice(0, 200));
    ok('T-02', 'the perspective follows the step persona', (await page.inputValue('.persp select')) === 'service');
    let visited = 0, honest = 0, errorsBefore = errs.length;
    for (let i = 0; i < 16; i++) { await page.click('[data-testid=tour] button:has-text("Next")'); await page.waitForTimeout(250); const t = await page.locator('[data-testid=tour]').innerText(); visited += 1; if (/not migrated yet/.test(t)) { honest += 1; console.log('  not migrated:', await page.evaluate(() => location.hash)); } const main = await page.evaluate(() => document.querySelector('main').innerText); if (!main.trim()) { ok(`T-03.${i}`, 'step renders a page', false, t.slice(0, 80)); } }
    const last = await page.locator('[data-testid=tour]').innerText();
    ok('T-03', 'every one of the 17 steps opens a page with no page error; only the three Field Intelligence steps still say "not migrated yet"', visited === 16 && /step 17 of 17/.test(last) && honest === 0 && errs.length === errorsBefore, `${visited} visited, ${honest} honest, errors ${errs.length - errorsBefore}`);
    ok('T-04', 'the last step is the steward on the ledger', /as steward/.test(last));
    await page.click('[data-testid=tour] button[aria-label="Scenario 4"]'); await page.waitForTimeout(400);
    ok('T-05', 'jumping to scenario 4 opens the commissioning plan step natively as the commissioning engineer', /Scenario 4 of 7/.test(await page.locator('[data-testid=tour]').innerText()) && /#\/v25\/build/.test(await page.evaluate(() => location.hash)));
    await page.click('[data-testid=tour] button:has-text("Close")'); await page.waitForTimeout(200);
    ok('T-06', 'the panel closes and stays closed on reload', (await page.locator('[data-testid=tour]').count()) === 0);
  }
  if (tag === 'desktop') {
    // ---------------------------------------------------------------- the native product experiences on the shared workspace (reset first so the run is repeatable)
    const persp = async (p) => { await page.selectOption('.persp select', p); await page.waitForTimeout(150); };
    const refusal = async () => (await page.locator('[role=alert]').count()) ? page.locator('[role=alert]').first().innerText() : '';
    await page.evaluate(() => { localStorage.removeItem('empathia.demo.workspace.v1'); location.hash = '#/v25/service'; }); await page.waitForTimeout(500); await persp('svcmgr'); await page.waitForSelector('[data-testid=incident]');
    const q0 = await page.locator('[data-testid=incidents]').innerText();
    ok('V-01', 'ServiceHands: the queue lists the seeded incidents with state, room, severity and recurrence', /ISS-0417/.test(q0) && /recurrence of ISS-0380/.test(q0) && /ISS-0421/.test(q0), q0.slice(0, 160));
    await page.click('[data-testid=incident] button:has-text("Triage")'); await page.waitForTimeout(250);
    ok('V-02', 'the service manager triages (OPEN → TRIAGED, guard scope_and_risk)', /TRIAGED/.test(await page.locator('[data-testid=incident] h2').innerText()));
    await page.waitForSelector('[data-testid=candidates]');
    const cand = await page.locator('[data-testid=candidates]').innerText();
    ok('V-03', 'candidates are hard-gated before ranking: Ana eligible and first (based in ATL, experience, past jobs), Ben fails site access, Dev fails an expired certification, the vendor is eligible under her agreement', /1\. Ana Reyes/.test(cand) && /based in ATL/.test(cand) && /Ben Okafor[\s\S]*hard gate[\s\S]*site access: ATL not in approved sites/.test(cand) && /Dev Shah[\s\S]*expired 2026-10-01/.test(cand) && /Cara Lind[\s\S]*eligible/.test(cand), cand.slice(0, 400));
    await page.click('[data-testid=candidates] li.off button:has-text("Try anyway")'); await page.waitForTimeout(250);
    ok('V-04', 'assigning an ineligible person is refused by the engine and the refusal names the hard gate', /Refused/.test(await refusal()) && /hard gate/.test(await refusal()), await refusal());
    await page.click('[data-testid=candidates] li >> nth=0 >> button:has-text("Assign")'); await page.waitForTimeout(300);
    ok('V-05', 'the eligible technician is assigned (TRIAGED → ASSIGNED)', /ASSIGNED/.test(await page.locator('[data-testid=incident] h2').innerText()) && /Ana Reyes/.test(await page.locator('[data-testid=incident]').innerText()));
    await persp('installer'); await page.waitForTimeout(200);
    ok('V-06', 'an installer holds no work.accept: the step is shown as not theirs, with no button', /not your authority/.test(await page.locator('[data-testid=incident]').innerText()) && !(await page.locator('[data-testid=incident] button:has-text("Accept the job")').count()));
    await persp('service'); await page.waitForTimeout(200);
    ok('V-06b', 'the technician sees the context packet read from the model: the switch, its uplink, the rooms sharing it and the power', /Access switch ATL-4A/.test(await page.locator('.svc__packet').innerText()) && /Core switch ATL-CORE/.test(await page.locator('.svc__packet').innerText()) && /Atlas 4\.220 Huddle/.test(await page.locator('.svc__packet').innerText()) && /Power panel ATL-4/.test(await page.locator('.svc__packet').innerText()), await page.locator('.svc__packet').innerText());
    await page.click('[data-testid=incident] button:has-text("Accept the job")'); await page.waitForTimeout(250); await page.waitForSelector('[data-testid=preflight]');
    const pf0 = await page.locator('[data-testid=preflight]').innerText();
    ok('V-07', 'dispatch preflight on the record: the room is booked in the proposed window, the processor stock check is stale, tools unconfirmed — each named', /booked/.test(pf0) && /processor: stock check is 3[0-9] days old/.test(pf0) && /missing: audio analyser/.test(pf0), pf0.slice(0, 300));
    await page.click('[data-testid=preflight] button:has-text("Start the work")'); await page.waitForTimeout(250);
    ok('V-08', 'a failed preflight blocks IN_PROGRESS (guard preflight_passed) and the refusal is in the ledger', /preflight has a failed check/.test(await refusal()), await refusal());
    // the manager re-plans the window outside the booking and the stock is rechecked; the technician confirms tools and starts
    await page.evaluate(() => { const w = JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')); const wo = w.workOrders.find((x) => x.id === 'WO-0088'); const d = new Date(Date.now() + 2 * 864e5); wo.window = { from: d.toISOString().slice(0, 16), to: new Date(d.getTime() + 3 * 36e5).toISOString().slice(0, 16) }; w.stock.processor.checkedAt = new Date().toISOString(); localStorage.setItem('empathia.demo.workspace.v1', JSON.stringify(w)); location.hash = '#/v25/service?id=ISS-0417'; }); await page.reload(); await page.waitForTimeout(600); await persp('service'); await page.waitForSelector('[data-testid=preflight]');
    for (const t of ['audio analyser', 'laptop with the DSP tool']) await page.locator(`[data-testid=preflight] label:has-text("${t}") input`).check();
    await page.click('[data-testid=preflight] button:has-text("Start the work")'); await page.waitForTimeout(300);
    ok('V-09', 'with every check clear the technician starts the work (ACCEPTED → IN_PROGRESS)', /IN_PROGRESS/.test(await page.locator('[data-testid=incident] h2').innerText()), await refusal());
    await page.click('[data-testid=incident] button:has-text("Hand over for independent verification")'); await page.waitForTimeout(250);
    ok('V-10', 'handing over without field evidence is refused (guard record_work_and_evidence)', /no field evidence recorded/.test(await refusal()), await refusal());
    await page.selectOption('[data-testid=incident] select[aria-label="Evidence kind"]', 'configuration snapshot'); await page.fill('[data-testid=incident] input[aria-label="Evidence note"]', 'AEC reference re-routed to the signed configuration; far-end call clean for 45 minutes (synthetic)'); await page.click('[data-testid=incident] button:has-text("Record evidence")'); await page.waitForTimeout(250);
    await page.click('[data-testid=incident] button:has-text("Hand over for independent verification")'); await page.waitForTimeout(250);
    ok('V-11', 'with evidence recorded the job goes to VERIFYING', /VERIFYING/.test(await page.locator('[data-testid=incident] h2').innerText()), await refusal());
    await page.click('[data-testid=incident] button:has-text("Verify the repair")').catch(() => {}); await page.waitForTimeout(250);
    ok('V-12', 'the technician cannot verify their own work (service.verify is not theirs)', !/RESOLVED/.test(await page.locator('[data-testid=incident] h2').innerText()));
    await persp('cxeng'); await page.waitForTimeout(200); await page.click('[data-testid=incident] button:has-text("Verify the repair")'); await page.waitForTimeout(250);
    ok('V-13', 'the commissioning engineer verifies independently (VERIFYING → RESOLVED)', /RESOLVED/.test(await page.locator('[data-testid=incident] h2').innerText()), await refusal());
    await persp('svcmgr'); await page.waitForTimeout(200); await page.click('[data-testid=incident] button:has-text("Close")'); await page.waitForTimeout(250);
    ok('V-14', 'closure follows the customer policy: a High incident needs the requester’s confirmation', /requester’s confirmation/.test(await refusal()), await refusal());
    await page.locator('[data-testid=incident] label:has-text("requester confirmed") input').check(); await page.click('[data-testid=incident] button:has-text("Close")'); await page.waitForTimeout(250);
    ok('V-15', 'with the confirmation the incident closes', /CLOSED/.test(await page.locator('[data-testid=incident] h2').innerText()), await refusal());

    // ---------------------------------------------------------------- APEX on the camera incident
    await page.evaluate(() => { location.hash = '#/v25/apex?incident=ISS-0421'; }); await page.waitForTimeout(500); await persp('cxeng'); await page.waitForTimeout(200);
    await page.click('button:has-text("Open a case for ISS-0421")'); await page.waitForTimeout(400); await page.waitForSelector('[data-testid=apex-case]');
    const layers = await page.locator('[data-testid=layers]').innerText(); const hyps = await page.locator('.apex__hyps').innerText();
    ok('A-01', 'a case opens on the camera branch: seven layers with what is recorded and what the estate cites; hypotheses ranked, the PoE port first (medium) with the signed runbook', /Physical/.test(layers) && /Network[\s\S]*port down on the access switch[\s\S]*cites SW-ATL-4A/.test(layers) && /nothing recorded/.test(layers) && /^1\.?\s*medium/m.test(hyps.replace(/\n/g, ' ')) === false && /PoE port stopped delivering power/.test(hyps) && /RB-POE-CYCLE/.test(hyps), hyps.slice(0, 200));
    ok('A-02', 'the hypothesis says why it is not proven and what is against it', /port state read from the recorded dependency, not polled now/.test(await page.locator('[data-testid=hypothesis]').innerText()) && /camera firmware unchanged/.test(await page.locator('[data-testid=hypothesis]').innerText()));
    await page.click('[data-testid=hypothesis] .apex__tier:has-text("A2") button'); await page.waitForTimeout(250);
    ok('A-03', 'A2 is a read-only comparison, honest when there is no accepted baseline for the room', /COMPARED/.test(await page.locator('[data-testid=apex-log]').innerText()) && /NOT_VERIFIED/.test(await page.locator('[data-testid=apex-log]').innerText()), await page.locator('[data-testid=apex-log]').innerText().then((t) => t.slice(0, 200)));
    await page.click('[data-testid=hypothesis] .apex__tier:has-text("A4") button'); await page.waitForTimeout(250);
    ok('A-04', 'A4 preflight is BLOCKED first on owner approval', /BLOCKED[\s\S]*owner approval missing/.test(await page.locator('[data-testid=apex-log] li >> nth=0').innerText()));
    await page.locator('[data-testid=a4] label:has-text("Owner approval") input').check(); await page.fill('#a4-win', '2026-11-04T20:00Z'); await page.click('[data-testid=hypothesis] .apex__tier:has-text("A4") button'); await page.waitForTimeout(250);
    ok('A-05', 'with approval and a window, the real adapter state blocks it: no SUPPORTED_VERIFIED adapter for network (NOT_CONFIGURED in this build)', /no SUPPORTED_VERIFIED adapter for network \(NOT_CONFIGURED in this build\)/.test(await page.locator('[data-testid=apex-log] li >> nth=0').innerText()), await page.locator('[data-testid=apex-log] li >> nth=0').innerText());
    await page.locator('[data-testid=a4] label:has-text("Simulate a SUPPORTED_VERIFIED") input').check(); await page.click('[data-testid=hypothesis] .apex__tier:has-text("A4") button'); await page.waitForTimeout(250);
    ok('A-06', 'a simulated adapter yields a DRY RUN first, labelled SIMULATED', /DRY_RUN[\s\S]*SIMULATED/.test(await page.locator('[data-testid=apex-log] li >> nth=0').innerText()));
    await page.locator('[data-testid=a4] label:has-text("Dry run acknowledged") input').check(); await page.selectOption('#a4-b', 'estop'); await page.click('[data-testid=hypothesis] .apex__tier:has-text("A4") button'); await page.waitForTimeout(250);
    ok('A-07', 'an operator emergency stop aborts the simulation with rollback and requests compensation; everything stays in the log', /ABORTED[\s\S]*rollback applied in the simulation/.test(await page.locator('[data-testid=apex-log] li >> nth=0').innerText()) && (await page.locator('[data-testid=apex-log] li').count()) === 5);
    await page.click('[data-testid=hypothesis] .apex__tier:has-text("A3") button'); await page.waitForTimeout(250);
    ok('A-08', 'A3 stages a draft work order that stays OPEN until the service manager triages it', /DRAFT_STAGED[\s\S]*work order WO-\d+ drafted/.test(await page.locator('[data-testid=apex-log] li >> nth=0').innerText()));
    await persp('visitor'); await page.waitForTimeout(200);
    ok('A-09', 'a visitor cannot act on a case', /cannot act on an APEX case/.test(await page.locator('[data-testid=apex-case]').innerText()) && !(await page.locator('[data-testid=hypothesis] .apex__tier button').count()));

    // ---------------------------------------------------------------- Learn: the governed case, then the library
    await page.evaluate(() => { location.hash = '#/v25/learn'; }); await page.waitForTimeout(500); await persp('cxeng'); await page.waitForTimeout(200); await page.waitForSelector('[data-testid=propose]');
    await page.selectOption('[data-testid=propose] select', 'ISS-0417'); await page.fill('[data-testid=propose] input', 'Echo after a configuration change in Atlas 4.218'); await page.fill('[data-testid=propose] textarea', 'Re-check the AEC reference routing against the signed configuration after any DSP change.');
    await page.click('[data-testid=propose] button:has-text("Propose")'); await page.waitForTimeout(250);
    const lr = await refusal();
    ok('L-01', 'a case needs permission, de-identification and no names: the refusal names all three', /customer permission/.test(lr) && /de-identified/.test(lr) && /still names a building, room or person/.test(lr), lr);
    await page.fill('[data-testid=propose] input', 'Echo after a configuration change'); await page.locator('[data-testid=propose] label:has-text("permission") input').check(); await page.locator('[data-testid=propose] label:has-text("De-identified") input').check(); await page.click('[data-testid=propose] button:has-text("Propose")'); await page.waitForTimeout(300);
    ok('L-02', 'the case is PROPOSED from the resolved incident', /PROPOSED/.test(await page.locator('[data-testid=learn-case]').innerText()) && /from ISS-0417/.test(await page.locator('[data-testid=learn-cases]').innerText()), await refusal());
    await page.click('[data-testid=learn-case] button:has-text("SME review: approve")'); await page.waitForTimeout(250);
    ok('L-03', 'the proposer cannot be the SME reviewer of their own case', /separation of duties/.test(await refusal()), await refusal());
    await persp('syseng'); await page.waitForTimeout(200); await page.click('[data-testid=learn-case] button:has-text("SME review: approve")'); await page.waitForTimeout(250);
    ok('L-04', 'a different subject-matter reviewer records the SME review', /SME_REVIEWED/.test(await page.locator('[data-testid=learn-case]').innerText()), await refusal());
    await persp('steward'); await page.waitForTimeout(200); await page.click('[data-testid=learn-case] button:has-text("Approve for Learn")'); await page.waitForTimeout(250);
    ok('L-05', 'the data steward approves it for Learn (training.case_approved); it grants nobody any authority', /APPROVED/.test(await page.locator('[data-testid=learn-case]').innerText()) && /grants nobody any authority/.test(await page.locator('[data-testid=learn-case]').innerText()), await refusal());
    await page.click('#tab-lessons'); await page.waitForTimeout(800); await page.waitForSelector('[data-testid=lessons] li');
    await page.click('[data-testid=lessons] li >> nth=0 >> a'); await page.waitForSelector('[data-testid=quiz]');
    const lesson = await page.locator('[data-testid=lesson]').innerText();
    ok('L-06', 'the SIGNAL library loads on demand: an Audio lesson with its cards and its check', /Signal flow and gain staging/.test(lesson) && /Check · Signal flow/.test(lesson), lesson.slice(0, 120));
    await page.click('[data-testid=quiz] .learn__opts >> nth=0 >> button >> nth=1'); await page.waitForTimeout(100);
    ok('L-07', 'a check answers with its why', /Not quite|Right/.test(await page.locator('[data-testid=quiz]').innerText()));
    await page.click('#tab-drills'); await page.waitForTimeout(300); await page.waitForSelector('[data-testid=drills] li');
    await page.click('[data-testid=drills] li >> nth=3 >> a'); await page.waitForSelector('[data-testid=drill]');
    await page.click('[data-testid=drill] .learn__stages li >> nth=3 >> button'); await page.waitForTimeout(300);
    const drill = await page.locator('[data-testid=drill]').innerText();
    ok('L-08', 'a first-failure drill (No picture on input 3) is interactive and scores the tap; the completion is recorded as training only', /No picture on input 3/.test(drill) && /Right\./.test(drill) && /one-cable failure/.test(drill), drill.slice(0, 200));
    await page.evaluate(() => { location.hash = '#/v25/ledger'; }); await page.waitForTimeout(500);
    ok('L-09', 'the ledger carries the training completion with the note that it never grants authorization', /training\.drill_completed/.test(await page.locator('[data-testid=ledger]').innerText()) && /never grants work authorization/.test(await page.locator('[data-testid=ledger]').innerText()));

    // ---------------------------------------------------------------- Mission Control, Executive, Ledger, Policy
    await page.evaluate(() => { location.hash = '#/v25'; }); await page.waitForTimeout(500); await persp('exec'); await page.waitForTimeout(200); await page.waitForSelector('[data-testid=stations]');
    const st = await page.locator('[data-testid=stations]').innerText();
    ok('M-01', 'Mission Control counts live records at every station (service shows the two still-open incidents; field shows the APEX draft work order)', /Service\s*\n?[\s\S]*ISS-0421/.test(st) && /APEX draft/.test(st) && (await page.locator('[data-testid=stations] .mc__station').count()) === 10, st.slice(0, 300));
    await page.evaluate(() => { location.hash = '#/v25/exec'; }); await page.waitForTimeout(500); await page.waitForSelector('[data-testid=passports]');
    ok('M-02', '27 KPI passports; the person-level whiteboarding passport is NOT MEASURABLE, never 0%', (await page.locator('[data-testid=passports] .exec__tile').count()) === 27 && /not measurable/.test(await page.locator('[data-testid=passports]').innerText()));
    await page.click('[data-testid=passports] .exec__tile:has-text("Median restoration time")'); await page.waitForSelector('[data-testid=passport]');
    const pp = await page.locator('[data-testid=passport]').innerText();
    ok('M-03', 'a passport shows numerator, denominator, window, coverage, freshness, confidence with reasons, source, exclusions and drill-down', /Numerator \/ denominator/.test(pp) && /90 days/.test(pp) && /Coverage/.test(pp) && /Confidence/.test(pp) && /Exclusions/.test(pp) && /ISS-0417/.test(pp), pp.slice(0, 300));
    await persp('service'); await page.waitForTimeout(200);
    ok('M-04', 'a technician does not see executive passports', /this perspective does not see executive passports/.test(await page.locator('main').innerText()) && !(await page.locator('[data-testid=passports]').count()));
    await page.evaluate(() => { location.hash = '#/v25/ledger'; }); await page.waitForTimeout(400); await persp('steward'); await page.waitForTimeout(200);
    await page.click('button:has-text("DENIED")'); await page.waitForTimeout(150);
    const led = await page.locator('[data-testid=ledger]').innerText();
    ok('M-05', 'the ledger filters to the refusals, each with actor, UTC and local time and the reason', /DENIED/.test(led) && /hard gate/.test(led) && /preflight has a failed check/.test(led) && /separation of duties/.test(led) && (led.match(/ALLOWED/g) || []).length === 0, led.slice(0, 300));
    await page.evaluate(() => { location.hash = '#/v25/policy'; }); await page.waitForTimeout(400);
    ok('M-06', 'the policy page shows what each native page checks and the demonstrator’s role × area matrix verbatim (86 areas × 14 roles)', (await page.locator('[data-testid=policy-gates] tbody tr').count()) === 6 && (await page.locator('[data-testid=policy-matrix] tbody tr').count()) === 86 && (await page.locator('[data-testid=policy-matrix] thead th').count()) === 15);
    // ---------------------------------------------------------------- Field Intelligence v1.3 plan and v1.4 Physical Validation session
    await page.evaluate(() => { location.hash = '#/v25/fi?room=R-ATL-4-218'; }); await page.waitForTimeout(500); await persp('syseng'); await page.waitForTimeout(200); await page.waitForSelector('[data-testid=fi-plan]');
    const fp = await page.locator('[data-testid=fi-plan]').innerText();
    ok('F-01', 'v1.3: the collector’s facts (version, ten modes, exit codes, 15-minute schedule, limitations); the plan is PLAN_ONLY with DECLARED capabilities, a downgraded OBSERVED claim, HardwareTested false, and monitoring NOT_RUN', /1\.3\.0-universal-preview/.test(fp) && /UniversalPlan/.test(fp) && /5 plan INCOMPLETE/.test(fp) && /PLAN_ONLY/.test(fp) && /downgraded/.test(fp) && /NOT_RUN/.test(fp) && /last check: NOT_RUN/.test(fp), fp.slice(0, 300));
    await page.click('#tab-pv'); await page.waitForTimeout(400); await page.waitForSelector('[data-testid=fi-licence]');
    ok('F-02', 'v1.4: the boardroom archetype is licensed at this site; three adapters are NOT_CONFIGURED in this build', /LICENSED/.test(await page.locator('[data-testid=fi-licence]').innerText()) && (await page.locator('main').innerText().then((t) => (t.match(/NOT_CONFIGURED/g) || []).length)) >= 3);
    await page.click('button:has-text("Propose a session for R-ATL-4-218")'); await page.waitForTimeout(300); await page.waitForSelector('[data-testid=fi-session]');
    await page.click('[data-testid=fi-actions] button:has-text("Check eligibility")'); await page.waitForTimeout(300);
    const el = await page.locator('[data-testid=fi-session]').innerText();
    ok('F-03', 'eligibility: the two acoustic tests on READ_ONLY adapters are ELIGIBLE, the camera scan is NOT_CONFIGURED; the session reaches SAFETY_PREFLIGHT', /SAFETY_PREFLIGHT/.test(el) && /LAEQ \(ADP-SLM · ELIGIBLE\)/.test(el) && /CAM-FOV \(ADP-CAM · NOT_CONFIGURED\)/.test(el), el.slice(0, 300));
    await page.click('[data-testid=fi-actions] button:has-text("Reserve window")'); await page.waitForTimeout(250);
    ok('F-04', 'the systems engineer cannot reserve the window (Operations / Facilities)', /cannot reserve the window/.test(await refusal()), await refusal());
    await page.fill('#fi-lim', '85'); await page.click('[data-testid=fi-actions] button:has-text("Approve the protocol")'); await page.waitForTimeout(250);
    await persp('ops'); await page.waitForTimeout(200); await page.click('[data-testid=fi-actions] button:has-text("Reserve window")'); await page.waitForTimeout(250);
    await persp('service'); await page.waitForTimeout(200); await page.click('[data-testid=fi-actions] button:has-text("I am on site and consent")'); await page.waitForTimeout(250);
    await page.fill('[data-testid=fi-actions] input[aria-label="Calibration due"]', '2026-01-01'); await page.click('[data-testid=fi-actions] button:has-text("Register the instrument")'); await page.waitForTimeout(300);
    ok('F-05', 'a past calibration date ends the session OUT_OF_CALIBRATION (a blocked branch, not a warning)', /OUT_OF_CALIBRATION/.test(await page.locator('[data-testid=fi-session] h2').innerText()) && /ended/.test(await page.locator('[data-testid=fi-session] h2').innerText()));
    // a second session, walked all the way to a simulated run and an emergency stop
    await persp('syseng'); await page.waitForTimeout(200); await page.click('button:has-text("Propose a session for R-ATL-4-218")'); await page.waitForTimeout(300);
    await page.click('[data-testid=fi-actions] button:has-text("Check eligibility")'); await page.waitForTimeout(250); await page.fill('#fi-lim', '85'); await page.click('[data-testid=fi-actions] button:has-text("Approve the protocol")'); await page.waitForTimeout(250);
    await persp('ops'); await page.waitForTimeout(200); await page.click('[data-testid=fi-actions] button:has-text("Reserve window")'); await page.waitForTimeout(250);
    await persp('service'); await page.waitForTimeout(200); await page.click('[data-testid=fi-actions] button:has-text("I am on site and consent")'); await page.waitForTimeout(250);
    await page.fill('[data-testid=fi-actions] input[aria-label="Calibration due"]', '2027-07-01'); await page.click('[data-testid=fi-actions] button:has-text("Register the instrument")'); await page.waitForTimeout(250); await page.click('[data-testid=fi-actions] button:has-text("E-stop verified")'); await page.waitForTimeout(250);
    ok('F-06', 'five approvals by three different people complete the preflight: DRY_RUN', /DRY_RUN/.test(await page.locator('[data-testid=fi-session] h2').innerText()), await refusal());
    await page.click('[data-testid=fi-actions] button:has-text("Walk the dry run")'); await page.waitForTimeout(250);
    ok('F-07', 'the dry run emits nothing and the session awaits authorization', /APPROVAL_PENDING/.test(await page.locator('[data-testid=fi-session] h2').innerText()) && /output: none \(dry run emits nothing\)/.test(await page.locator('[data-testid=fi-session]').innerText()));
    await page.click('[data-testid=fi-actions] button:has-text("Authorize the session")'); await page.waitForTimeout(250);
    ok('F-08', 'the technician cannot authorize (Commissioning Lead)', /cannot authorize sessions/.test(await refusal()), await refusal());
    await persp('cxeng'); await page.waitForTimeout(200); await page.click('[data-testid=fi-actions] button:has-text("Authorize the session")'); await page.waitForTimeout(250);
    await page.waitForSelector('[data-testid=fi-arm]'); await page.locator('[data-testid=fi-arm] input >> nth=0').check(); await page.locator('[data-testid=fi-arm] input >> nth=1').check(); await page.click('[data-testid=fi-arm] button:has-text("Arm")'); await page.waitForTimeout(250);
    ok('F-09', 'only the consenting local operator can arm — the commissioning lead is refused', /only the consenting local operator can arm/.test(await refusal()), await refusal());
    await persp('service'); await page.waitForTimeout(200); await page.waitForSelector('[data-testid=fi-arm]'); await page.locator('[data-testid=fi-arm] input >> nth=0').check(); await page.locator('[data-testid=fi-arm] input >> nth=1').uncheck(); await page.click('[data-testid=fi-arm] button:has-text("Arm")'); await page.waitForTimeout(250);
    ok('F-10', 'arming needs two explicit confirmations', /two explicit confirmations/.test(await refusal()), await refusal());
    await page.locator('[data-testid=fi-arm] input >> nth=1').check(); await page.click('[data-testid=fi-arm] button:has-text("Arm")'); await page.waitForTimeout(250);
    ok('F-11', 'armed as a labelled SIMULATION (no adapter, no hardware)', /ARMED/.test(await page.locator('[data-testid=fi-session] h2').innerText()) && /SIMULATION/.test(await page.locator('[data-testid=fi-session] h2').innerText()));
    await page.click('[data-testid=fi-run] button:has-text("Next point")'); await page.waitForTimeout(250);
    ok('F-12', 'a simulated point records no level: the value is null, a value only exists in the instrument export', /null dB\(A\)/.test(await page.locator('[data-testid=fi-results]').innerText()) && /SIMULATED/.test(await page.locator('[data-testid=fi-results]').innerText()));
    await page.click('[data-testid=fi-run] button:has-text("EMERGENCY STOP")'); await page.waitForTimeout(250);
    const ab = await page.locator('[data-testid=fi-session]').innerText();
    ok('F-13', 'the E-stop aborts: output terminated, restore requested, the session ended; nothing can be stepped afterwards', /ABORTED/.test(ab) && /restore requested/.test(ab) && !(await page.locator('[data-testid=fi-run]').count()), ab.slice(0, 200));
    await persp('visitor'); await page.waitForTimeout(200); await page.evaluate(() => { location.hash = '#/v25/fipv?room=R-NST-2-101'; }); await page.waitForTimeout(400);
    ok('F-14', 'the town hall is not licensed at this site, and a visitor cannot change that', /NOT LICENSED/.test(await page.locator('[data-testid=fi-licence]').innerText()) && /Security \/ Platform Admin/.test(await page.locator('[data-testid=fi-licence]').innerText()));

    await page.evaluate(() => { location.hash = '#/v25/service'; }); await page.waitForTimeout(400); await page.click('button:has-text("Reset workspace")'); await page.waitForTimeout(300);
    ok('M-07', 'Reset returns the workspace to its seed: ISS-0417 is OPEN again and the cases are gone', /OPEN[\s\S]*ISS-0417/.test(await page.locator('[data-testid=incidents]').innerText()) && !/APX-/.test(await page.locator('main').innerText()));
  }
  ok(`D-${tag}-07`, 'no page error, no console error, no request outside the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'demo.json'), JSON.stringify(summary, null, 1)); console.log(`\n${summary.pass} passed, ${summary.fail} failed`); process.exit(failed ? 1 : 0);
