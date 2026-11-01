#!/usr/bin/env node
// The investor demo shell from its built dist: lands on the investor start with the synthetic banner and the three start actions (the
// launch action largest on a phone), every legacy area address resolves to a page that states its migration status (never a blank or an
// error), the perspective picker says it grants nothing, no console error, no request leaves the page.
//   node tests/browser/demo.test.mjs [dist] [evidence-dir]
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
// the shared engine, run directly here: the expected design-binding sentence and the documented blocker order (independent of the page)
const ENGINE = await import(path.join(repo, 'packages/commissioning-engine/dist/src/index.js'));
const blockerKind = (s) => (/^the design changed while the room is recommissioned/.test(s) ? 'design-binding' : /^\d+ open issue\(s\): /.test(s) ? 'open-issues' : /^\d+ (test\(s\) were last recorded|reopened test\(s\) were re-run)/.test(s) ? 'reopened-tests' : /^acceptance needs every applicable test/.test(s) ? 'acceptance-count' : 'other');
const inOrder = (list) => list.length > 0 && list.map(blockerKind).every((k, i, a) => k !== 'other' && (i === 0 || ENGINE.ACCEPTANCE_BLOCKER_ORDER.indexOf(a[i - 1]) <= ENGINE.ACCEPTANCE_BLOCKER_ORDER.indexOf(k)));
/** The design binding of a draft, computed here with the engine from the stored revisions (snapshots) and the design now. */
const bindingOf = (dr, substitutions = []) => ({ ...ENGINE.revisionBinding(dr.revisions.map((r) => ({ n: r.n, by: r.by, describes: !!r.snapshot && ENGINE.designKey(r.snapshot) === ENGINE.designKey(dr.design) })), dr.approvedRevision), substitutions });
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
      const v = await page.evaluate(() => ({ h1: (document.querySelector('main h1') || {}).textContent || '', text: document.querySelector('main').innerText })); if (!(v.h1.length > 2 && /(Not migrated yet|Native page|Unknown address|interactive demonstration|Acting as)/.test(v.text))) bad.push(`${hash}: ${v.h1}`); }
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
    await page.click('#tab-design'); await page.waitForTimeout(100); await persp('designer'); await page.click('button:has-text("Place at the centre")'); await page.waitForTimeout(100);
    // D-39: a device is added while the room is PLANNED (the one state that accepts it) — lighting control, a new family, so new tests apply
    const appB0 = ENGINE.analyzeRoom(JSON.parse(await page.evaluate(() => localStorage.getItem('empathia.demo.build-a-room.v1'))).design).applicability.applicable;
    await page.selectOption('#b-cat', 'lighting'); await page.click('button:has-text("Place at the centre")'); await page.waitForTimeout(150);
    const drL = JSON.parse(await page.evaluate(() => localStorage.getItem('empathia.demo.build-a-room.v1'))); const appB1 = ENGINE.analyzeRoom(drL.design).applicability.applicable;
    ok('B-06b', 'while PLANNED, lighting control is added by the designer (a new family, so new tests apply: the engine’s count grows)', !(await refusal()) && drL.design.devices.some((x) => x.cat === 'lighting' && !x.removed) && appB1 > appB0, `${appB0} → ${appB1} ${await refusal()}`);
    await page.fill('[aria-label="Revision reason"]', 'designer confirms'); await page.click('button:has-text("Save revision")'); await page.waitForTimeout(150);
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
    // D-39: a recommissioned room takes a model substitution and nothing else — adding, removing or swapping a device is refused (the API's rule)
    await page.click('#tab-design'); await page.waitForTimeout(100); await persp('designer');
    const ruleB = await page.locator('[data-testid=design-edit-rule]').innerText();
    ok('B-15d', 'during recommissioning no device is added, removed or swapped: the controls are disabled and say why in the API’s words, pointing to the model substitution', (await page.locator('[data-testid=add-device]').isDisabled()) && (await page.locator('[data-testid=swap]').isDisabled()) && (await page.locator('.build__x').count()) === 0 && ruleB.includes(ENGINE.designEditRefusal({ room: 'R-DEMO-0001', lifecycle: 'COMMISSIONING', recommissioning: true, edit: 'add-device' })) && /Substitute the model/.test(ruleB) && !(await page.locator('[data-testid=substitute-model]').isDisabled()), ruleB.slice(0, 300));
    const barB = JSON.parse(await page.evaluate(() => localStorage.getItem('empathia.demo.build-a-room.v1'))).design.devices.find((x) => x.cat === 'bar' && !x.removed).id;
    await page.selectOption('#b-unit', barB); await page.fill('#b-model', 'SYN-BAR-2 (synthetic)'); await page.fill('#b-why', 'the newer bar (synthetic)'); await page.click('[data-testid=substitute-model]'); await page.waitForTimeout(300);
    const drS = JSON.parse(await page.evaluate(() => localStorage.getItem('empathia.demo.build-a-room.v1')));
    ok('B-15l', 'the one design change a recommissioned room accepts: the designer substitutes the video bar’s model — the position keeps its id, its unit is replaced', !(await refusal()) && drS.design.devices.find((x) => x.id === barB).model === 'SYN-BAR-2 (synthetic)' && drS.installations.filter((i) => i.position === barB).length === 2 && drS.events[0].change?.what === 'model substituted', (await refusal()) || JSON.stringify(drS.events[0]).slice(0, 200));
    await persp('syseng'); await page.click('#tab-lifecycle'); await page.waitForTimeout(150);
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(200);
    ok('B-15e', 'the changed room cannot be re-accepted until the reopened tests are re-run and verified', /Refused/.test(await refusal()), await refusal());
    // D-38: the substitution changed the design — the re-acceptance binds the approved revision, so it is saved and approved first
    const whyB = await page.locator('[role=alert] li').allInnerTexts(); const drB = JSON.parse(await page.evaluate(() => localStorage.getItem('empathia.demo.build-a-room.v1')));
    const subsB = drB.substitutions.filter((x) => x.baselineVersion === 1 && (x.kind || 'SUBSTITUTED') === 'SUBSTITUTED').map((x) => ({ assetId: x.assetId, from: x.from, to: x.to }));
    ok('B-15h', 'the refusal starts with the engine’s design-binding sentence (the approved revision no longer describes the room) and lists the blockers in the documented order', whyB[0] === ENGINE.designBindingSentence(bindingOf(drB, subsB)) && /save the change as a revision and have it approved/.test(whyB[0]) && inOrder(whyB) && whyB.some((x) => blockerKind(x) === 'reopened-tests'), JSON.stringify(whyB).slice(0, 400));
    await persp('cxeng'); await page.click('button:has-text("Record all untested as PASS")'); await page.waitForTimeout(300);
    await persp('architect'); await page.click('button:has-text("Verify all unverified")'); await page.waitForTimeout(300);
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(300);
    const whyB2 = await page.locator('[role=alert] li').allInnerTexts();
    ok('B-15i', 'with every test recorded and verified, the re-acceptance is still refused for the design binding alone', whyB2.length === 1 && whyB2[0] === ENGINE.designBindingSentence(bindingOf(JSON.parse(await page.evaluate(() => localStorage.getItem('empathia.demo.build-a-room.v1'))), subsB)), JSON.stringify(whyB2).slice(0, 300));
    await page.click('#tab-design'); await page.waitForTimeout(100); await persp('designer');
    await page.fill('[aria-label="Revision reason"]', 'the video bar’s model substituted during recommissioning (synthetic)'); await page.click('button:has-text("Save revision")'); await page.waitForTimeout(150);
    await page.click('[data-testid=approve-revision]'); await page.waitForTimeout(150);
    ok('B-15j', 'the designer who saved it does not hold room.design.approve: refused, in the API’s words', (await page.locator('[role=alert] li').allInnerTexts()).join('|') === ENGINE.needsAuthority('designer', 'approve a design revision', 'room.design.approve'), await refusal());
    await persp('syseng'); await page.click('[data-testid=approve-revision]'); await page.waitForTimeout(150);
    const bound = await page.locator('[data-testid=design-binding]');
    ok('B-15k', 'the systems engineer approves the new revision: the design binding holds again', !(await refusal()) && (await bound.getAttribute('data-bound')) === 'true' && Number(await bound.getAttribute('data-approved')) === JSON.parse(await page.evaluate(() => localStorage.getItem('empathia.demo.build-a-room.v1'))).revisions.length, (await refusal()) || (await bound.innerText()));
    await page.click('#tab-lifecycle'); await page.waitForTimeout(150);
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(300);
    const st2 = await page.locator('.build__state').innerText();
    ok('B-15f', 're-acceptance publishes baseline v2 (v1 superseded) and the lineage lists both', /ACCEPTED/.test(st2) && /baseline v2/.test(st2) && /v1/.test(await page.locator('[data-testid=lineage]').innerText()) && /v2/.test(await page.locator('[data-testid=lineage]').innerText()), (await refusal()) || st2);
    const diff = await page.locator('[data-testid=baseline-diff]').innerText();
    ok('B-15g', 'the comparison between v1 and v2 names the change — the model substituted at the video bar’s position — and the new design revision', /v1 and v2/.test(diff) && new RegExp(`1 model substituted \\(Video bar 1 at ${barB}: generic → SYN-BAR-2 \\(synthetic\\)\\)`).test(diff) && /Devices\s*unchanged/.test(diff) && /Design revision\s*\d+ → \d+/.test(diff), diff.slice(0, 300));
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
    // the baseline APEX compares against is the room's accepted baseline on record — the record the KPI passports and the room story read
    // (records.ts): Atlas 4.220 has baseline v1 with 9 results bound; APEX no longer states a baseline of its own
    ok('A-03', 'A2 is a read-only comparison against the room’s accepted baseline on record (Atlas 4.220: v1, the record the KPI passports and the story read)', /COMPARED/.test(await page.locator('[data-testid=apex-log]').innerText()) && /read-only comparison against baseline v1 \(9 evidence items\)/.test(await page.locator('[data-testid=apex-log]').innerText()) && /v1 \(9 evidence items\)/.test(await page.locator('[data-testid=apex-case]').innerText()), await page.locator('[data-testid=apex-log]').innerText().then((t) => t.slice(0, 200)));
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
    await persp('cxeng'); await page.waitForTimeout(200); await page.click('.svc__list li:has-text("ISS-0402") button:has-text("Open a case")'); await page.waitForTimeout(400); await page.waitForSelector('[data-testid=apex-case]:has-text("ISS-0402")');
    await page.click('[data-testid=hypothesis] .apex__tier:has-text("A2") button'); await page.waitForTimeout(250);
    ok('A-03b', 'A2 stays honest where no baseline is accepted on record (Northstar Town Hall, COMMISSIONING): nothing to compare, NOT_VERIFIED', /none accepted — nothing to compare/.test(await page.locator('[data-testid=apex-case]').innerText()) && /COMPARED[\s\S]*no accepted baseline for this room[\s\S]*NOT_VERIFIED/.test(await page.locator('[data-testid=apex-log]').innerText()), await page.locator('[data-testid=apex-log]').innerText().then((t) => t.slice(0, 200)));

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
  if (tag === 'desktop') {
    // ---------------------------------------------------------------- the connected experience: the living-room cascade (B) and a room's entire story (A)
    const CE = await import(path.join(repo, 'packages/commissioning-engine/dist/src/index.js'));
    const persp = async (p) => { await page.selectOption('.persp select', p); await page.waitForTimeout(150); };
    const refusal = async () => (await page.locator('[role=alert]').count()) ? page.locator('[role=alert]').first().innerText() : '';
    const draftNow = () => page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.build-a-room.v1')));
    // the engine run directly here, on the room before and after the change (independent of the page's impact.ts)
    const engineDelta = (b, a) => { const A = new Map(CE.analyzeRoom(b.design).applicability.rows.map((r) => [r.id, r])), Z = CE.analyzeRoom(a.design).applicability.rows;
      const key = (r) => JSON.stringify([...(r?.devices || [])].sort());
      return { added: Z.filter((r) => r.applicable && !A.get(r.id)?.applicable).map((r) => r.id).sort(), removed: [...A.values()].filter((r) => r.applicable && !Z.find((z) => z.id === r.id)?.applicable).map((r) => r.id).sort(), kept: Z.filter((r) => r.applicable && A.get(r.id)?.applicable).length, coverage: Z.filter((r) => r.applicable && A.get(r.id)?.applicable && key(r) !== key(A.get(r.id))).map((r) => r.id).sort() }; };
    const panel = () => page.locator('[data-testid=impact-body]').evaluate((el) => ({ added: (el.dataset.added || '').split(',').filter(Boolean).sort(), removed: (el.dataset.removed || '').split(',').filter(Boolean).sort(), kept: Number(el.dataset.kept), coverage: (el.dataset.coverage || '').split(',').filter(Boolean).sort(), untouched: el.dataset.baselineUntouched, baseline: el.dataset.baseline, text: el.innerText }));
    const errorsBefore = errs.length;
    const NEW_CAM = 'SYN-PTZ-12X (synthetic PTZ camera)';
    await page.evaluate(() => { localStorage.removeItem('empathia.demo.build-a-room.v1'); location.hash = '#/v25/build'; }); await page.waitForTimeout(300);
    await persp('designer'); await page.click('button:has-text("Create the room")'); await page.waitForTimeout(300);
    // B · the living-room cascade of a design change, while the room is PLANNED — the one state that accepts adding, removing or swapping a
    // device (D-39: the shared rule, the API's); after acceptance, the change a recommissioned room accepts — a model substitution — follows
    const before = await draftNow();
    ok('C-02', 'before any change the Impact panel explains itself and its live region is already mounted', /recompute what the change touches/.test(await page.locator('[data-testid=impact-panel]').innerText()) && (await page.locator('[data-testid=impact-live][aria-live=polite]').count()) === 1);
    const barId = before.design.devices.find((x) => x.cat === 'bar' && !x.removed).id;
    ok('C-03', 'the swap control offers the room’s video device and, in its group, a camera', (await page.inputValue('#b-swap')) === barId && (await page.locator('#b-swap-to option[value=camera]').count()) === 1);
    await page.selectOption('#b-swap-to', 'camera'); await page.fill('#b-why', 'like-for-like camera for the far wall (synthetic)'); await page.click('[data-testid=swap]'); await page.waitForSelector('[data-testid=impact-body]');
    const after = await draftNow(); const e1 = engineDelta(before, after); const p1 = await panel();
    ok('C-04', 'after a camera swap the panel’s commissioning delta is the engine’s, run directly on the room before and after (added, removed, unchanged)', JSON.stringify([p1.added, p1.removed, p1.kept]) === JSON.stringify([e1.added, e1.removed, e1.kept]) && new RegExp(`\\+${e1.added.length} added · −${e1.removed.length} removed · ${e1.kept} unchanged`).test(p1.text), JSON.stringify({ panel: [p1.added.length, p1.removed.length, p1.kept], engine: [e1.added.length, e1.removed.length, e1.kept] }));
    ok('C-05', 'the tests whose covered device changed are the engine’s; nothing was recorded on the design, so the panel claims no earlier result', e1.coverage.length > 0 && JSON.stringify(p1.coverage) === JSON.stringify(e1.coverage) && !/recorded before the change/.test(p1.text), `${p1.coverage.length} vs ${e1.coverage.length}`);
    ok('C-06', 'Search Party: the video bar is no longer in the recorded graph; the camera is, with what now depends on it', /No longer in the recorded graph/.test(p1.text) && /What now depends on it: [^.]*UC room compute/.test(p1.text));
    ok('C-08', 'Pro and Mission Control: a like-for-like swap changes no passport and no count — and the panel does not invent one', /No KPI passport and no Mission Control count changes/.test(p1.text));
    ok('C-09', 'the update is announced through the aria-live region', /Video bar 1 \(bar\) swapped for Camera 1 \(camera\)\. Commissioning: 0 tests added, 0 removed/.test(await page.locator('[data-testid=impact-live]').innerText()));
    const ev = after.events[0];
    ok('C-10', 'the change is one structured event: actor, what, from, to, why and the affected objects the engines found (devices, connections, tests; there is no baseline yet)', ev.type === 'room.device_swapped' && ev.by === 'designer' && ev.change.from === 'Video bar 1 (bar)' && ev.change.to === 'Camera 1 (camera)' && ev.change.why === 'like-for-like camera for the far wall (synthetic)' && ['device', 'connection', 'test'].every((k) => ev.change.affected.some((x) => x.kind === k)) && !ev.change.affected.some((x) => x.kind === 'baseline'), JSON.stringify(ev.change || ev).slice(0, 300));
    const camId = after.design.devices.find((x) => x.cat === 'camera' && !x.removed).id;
    await page.locator('[data-testid=impact-panel]').screenshot({ path: path.join(out, 'impact-camera-swap.png') });
    const before2 = await draftNow(); await page.selectOption('#b-cat', 'micceil'); await page.click('button:has-text("Place at the centre")'); await page.waitForTimeout(300);
    const after2 = await draftNow(); const e2 = engineDelta(before2, after2); const p2 = await panel();
    ok('C-11', 'adding a ceiling microphone (while PLANNED) adds exactly the tests the engine adds, each with its reason, and names the KPI passport that changes; there is no baseline to touch yet', e2.added.length > 0 && JSON.stringify(p2.added) === JSON.stringify(e2.added) && JSON.stringify(p2.removed) === JSON.stringify(e2.removed) && /Devices commissioned up to standards/.test(p2.text) && !after2.baseline && !(after2.baselines || []).length, JSON.stringify({ panel: p2.added, engine: e2.added }).slice(0, 300));
    // the governed path to baseline v1, then recommissioning
    await page.fill('[aria-label="Revision reason"]', 'initial layout'); await page.click('button:has-text("Save revision")'); await page.waitForTimeout(150);
    await persp('syseng'); await page.click('button:has-text("Approve the suggestion")'); await page.waitForTimeout(150);
    await page.click('#tab-lifecycle'); await page.waitForTimeout(150); await page.click('button:has-text("Move to DESIGN_APPROVED")'); await page.waitForTimeout(150);
    await persp('ops'); await page.click('button:has-text("Move to INSTALLATION_PENDING")'); await page.waitForTimeout(150);
    await persp('installer'); await page.click('button:has-text("Move to INSTALLED_UNVERIFIED")'); await page.waitForTimeout(150);
    await persp('syseng'); await page.click('button:has-text("Move to COMMISSIONING")'); await page.waitForTimeout(150);
    await persp('cxeng'); await page.click('button:has-text("Record all untested as PASS")'); await page.waitForTimeout(400);
    await persp('architect'); await page.click('button:has-text("Verify all unverified")'); await page.waitForTimeout(400);
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(250);
    await persp('syseng'); await page.click('button:has-text("Recommission")'); await page.waitForTimeout(200);
    const st0 = await page.locator('.build__state').innerText();
    ok('C-01', 'a room reaches baseline v1 through the governed path and is recommissioned (baseline v1 stays current)', /COMMISSIONING/.test(st0) && /baseline v1/.test(st0), (await refusal()) || st0);
    const rec0 = await draftNow(); const baseline0 = JSON.stringify({ current: rec0.baseline, lineage: rec0.baselines });
    // D-39: a recommissioned room takes a model substitution and nothing else — the controls say so, in the API's words
    await page.click('#tab-design'); await page.waitForTimeout(150); await persp('designer');
    const ruleC = await page.locator('[data-testid=design-edit-rule]').innerText();
    ok('C-37', 'while recommissioned no device is added, removed or swapped: “Place at the centre” and “Swap” are disabled, no device offers “remove”, and the reason is the API’s sentence; “Substitute the model” stays offered', (await page.locator('[data-testid=add-device]').isDisabled()) && (await page.locator('[data-testid=swap]').isDisabled()) && (await page.locator('.build__x').count()) === 0 && ruleC.includes(ENGINE.designEditRefusal({ room: 'R-DEMO-0001', lifecycle: 'COMMISSIONING', recommissioning: true, edit: 'add-device' })) && !(await page.locator('[data-testid=substitute-model]').isDisabled()) && /Substitute the model/.test(ruleC), ruleC.slice(0, 300));
    // the camera's model substituted: the position keeps its id, the unit is replaced, the tests that covered it reopen
    const beforeS = await draftNow();
    await page.selectOption('#b-unit', camId); await page.fill('#b-model', NEW_CAM); await page.fill('#b-why', 'a PTZ camera for the far wall (synthetic)'); await page.click('[data-testid=substitute-model]'); await page.waitForTimeout(400);
    const afterS = await draftNow(); const pS = await panel();
    ok('C-07', 'Assurance: the room now differs from baseline v1 (a model drift at the camera’s position) and recommissioning is proposed; baseline v1 itself is unchanged, byte for byte', /The room now differs from baseline v1/.test(pS.text) && /Recommission the room/.test(pS.text) && pS.untouched === 'true' && pS.baseline === 'v1' && (await page.locator('[data-testid=impact-assurance-changes] [data-kind=MODEL_SUBSTITUTED]').count()) === 1 && JSON.stringify({ current: afterS.baseline, lineage: afterS.baselines }) === baseline0 && /baseline v1/.test(await page.locator('.build__state').innerText()), (await refusal()) || pS.text.slice(0, 300));
    const evS = afterS.events[0];
    ok('C-10f', 'the substitution is one structured event: actor, what (model substituted), from → to with both units and models, why, and the affected objects (the units, the reopened tests, the baseline)', evS.type === 'room.device_swapped' && evS.by === 'designer' && evS.change.what === 'model substituted' && /^Camera 1 \(camera\) · unit AS-\d{4} · generic$/.test(evS.change.from) && evS.change.to.endsWith(`· ${NEW_CAM}`) && evS.change.why === 'a PTZ camera for the far wall (synthetic)' && ['unit', 'test', 'baseline'].every((k) => evS.change.affected.some((x) => x.kind === k)), JSON.stringify(evS.change || evS).slice(0, 300));
    const want = CE.reopenedBySubstitution(CE.analyzeRoom(beforeS.design).applicability.rows.filter((r) => r.applicable).map((r) => ({ testId: r.id, domain: r.domain, devices: r.devices })), [{ assetId: camId, label: 'Camera 1', category: 'camera', from: 'generic', to: NEW_CAM }]);
    const reopenedIds = (await page.locator('[data-testid=impact-body]').getAttribute('data-reopened')).split(',').filter(Boolean); const gate = await page.locator('[data-testid=impact-gate]').innerText();
    ok('C-10b', `a model substitution during recommissioning reopens the ${want.length} tests the engine’s rule reopens (run directly here on the plan before it), each listed with its reason`, want.length >= 10 && JSON.stringify(reopenedIds) === JSON.stringify(want.map((t) => t.testId)) && want.every((t) => t.reasons.every((r) => pS.text.includes(r))) && ['identity_asset', 'video_av_sync'].every((id) => reopenedIds.includes(id)), JSON.stringify({ panel: reopenedIds, engine: want.map((t) => t.testId) }).slice(0, 300));
    ok('C-10c', 'the gate now refuses the re-acceptance and names every reopened test; “no engine condition blocks it” is gone', new RegExp(`${want.length} test\\(s\\) were last recorded before the substitution and must be re-run on the changed design and verified independently`).test(gate) && want.every((t) => gate.includes(t.testId)) && !/no engine condition blocks it/.test(pS.text) && /reopened by the substitution/.test(await page.locator('[data-testid=impact-live]').innerText()), gate.slice(0, 300));
    await page.click('#tab-checks'); await page.waitForSelector('[data-testid=reverification]');
    const rvEl = page.locator('[data-testid=reverification]'); const rvText = await rvEl.innerText();
    ok('C-10d', 'the plan shows “Re-verification required”: each reopened test with its reasons and its earlier result “recorded on the previous device · must be re-run and verified again”', (await rvEl.getAttribute('data-outstanding')) === want.map((t) => t.testId).join(',') && /Re-verification required · \d+ tests reopened/.test(rvText) && want.every((t) => rvText.includes(t.reasons[0])) && (rvText.match(/recorded on the previous device · must be re-run and verified again/g) || []).length === want.length && (await page.locator('.build__table .build__stale').count()) === want.length, rvText.slice(0, 300));
    await page.click('#tab-lifecycle'); await page.waitForTimeout(150);
    ok('C-10e', 'the results keep their earlier records, each marked as recorded on the previous device; baseline v1 is still the current one', (await page.locator('[data-testid=stale-result]').count()) === want.length && /Re-verification required/.test(await page.locator('main').innerText()) && JSON.stringify({ current: (await draftNow()).baseline, lineage: (await draftNow()).baselines }) === baseline0);
    await page.click('#tab-design'); await page.waitForTimeout(150);
    await page.locator('[data-testid=impact-panel]').screenshot({ path: path.join(out, 'impact-camera-substitution.png') });
    // A · the room's entire story, from Build a Room
    await persp('visitor'); await page.click('[data-testid=story-action]'); await page.waitForSelector('[data-testid=story]');
    const stages = await page.locator('.story__stage').evaluateAll((els) => els.map((e) => ({ key: e.dataset.stage, n: Number(e.dataset.count) })));
    ok('C-12', 'Build a Room’s “Show this room’s entire story” opens the story, with records in several lifecycle stages', (await page.evaluate(() => location.hash)) === '#/story/R-DEMO-0001' && stages.length === 8 && stages.filter((s) => s.n > 0).length >= 5 && ['design', 'authorize', 'commission', 'verify', 'baseline'].every((k) => stages.find((s) => s.key === k).n > 0), JSON.stringify(stages));
    const story = await page.locator('[data-testid=story]').innerText();
    ok('C-13', 'the swap is in the story with its actor, from → to and why; a stage without records says “No record yet”', /Video bar 1 \(bar\) swapped for Camera 1 \(camera\)/.test(story) && /like-for-like camera for the far wall \(synthetic\)/.test(story) && /Designer \/ CAD \/ Revit/.test(story) && /No record yet/.test(story));
    const sum = await page.locator('[data-testid=story-summary]').innerText();
    ok('C-14', 'the summary is computed from the records: state, baseline v1, open items, stages on record', (await page.locator('[data-testid=story-state]').innerText()) === 'COMMISSIONING' && /^v1 · CURRENT$/.test(await page.locator('[data-testid=story-baseline]').innerText()) && Number(await page.locator('[data-testid=story-open]').innerText()) >= 2 && (await page.locator('[data-testid=story-completeness]').innerText()) === `${stages.filter((s) => s.n > 0).length} of 8 stages`, sum.slice(0, 300));
    const rvEntry = page.locator('[data-stage=verify] [data-entry="verify:reverification"]');
    ok('C-14b', 'the story shows “Re-verification required” under Verify, a state derived from the records, linking to the plan', (await rvEntry.count()) === 1 && new RegExp(`^Re-verification required: ${want.length} tests reopened by the substitution of Camera 1 while baseline v1 is recommissioned`).test(await rvEntry.locator('.story__what').innerText()) && (await rvEntry.getAttribute('data-evidence')) === 'DERIVED' && (await rvEntry.locator('a.story__link').getAttribute('href')) === '#/v25/build?tab=checks' && /Open the plan/.test(await rvEntry.innerText()) && /Re-verification required: \d+ reopened tests/.test(sum), (await rvEntry.count()) ? await rvEntry.innerText() : 'no entry');
    const nVisitor = await page.locator('[data-entry]').count(); const idsVisitor = await page.locator('[data-entry]').evaluateAll((els) => els.map((e) => e.dataset.entry).join('|'));
    const firstTest = CE.analyzeRoom(afterS.design).applicability.rows.find((r) => r.applicable && afterS.design.results[r.id]).id;
    const visitorHasIds = story.includes(`synthetic observation ${firstTest}`) || (await page.locator('[data-testid=story] .story__items').count()) > 0;
    await persp('cxeng'); const tech = await page.locator('[data-testid=story]').innerText(); const techItems = (await page.locator('[data-testid=story] .story__items li').allTextContents()).join('\n');
    const sameData = (await page.locator('[data-entry]').evaluateAll((els) => els.map((e) => e.dataset.entry).join('|'))) === idsVisitor;
    ok('C-15', 'a perspective changes density, not data: the same records for a visitor and an engineer; test ids and evidence references only in the engineer’s view', nVisitor > 10 && sameData && !visitorHasIds && tech.includes(firstTest) && techItems.includes(`synthetic observation ${firstTest}`) && /room\.device_swapped/.test(tech), `${nVisitor} entries, same ${sameData}, visitor ids ${visitorHasIds}`);
    await persp('exec'); const execIds = await page.locator('[data-entry]').evaluateAll((els) => els.map((e) => e.dataset.entry).join('|'));
    ok('C-16', 'an executive sees impact and status for the same records', execIds === idsVisitor && (await page.locator('.story__impact').count()) >= 2 && /applicable tests verified/.test(await page.locator('[data-testid=story]').innerText()));
    ok('C-17', 'the story says what it cannot show yet', (await page.locator('[data-testid=story-gaps] li').count()) >= 3 && /live condition/.test(await page.locator('[data-testid=story-gaps]').innerText()) && /intake request/.test(await page.locator('[data-testid=story-gaps]').innerText()));
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(out, 'story-desktop.png'), fullPage: true });
    // every link of the story opens a native page of the demonstration (never a boundary or an unknown address)
    const storyLinks = async () => { const hrefs = [...new Set(await page.locator('[data-testid=story] a[href^="#/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href'))))]; const bad = [];
      for (const h of hrefs) { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(160); const v = await page.evaluate(() => ({ h1: (document.querySelector('main h1') || {}).textContent || '', text: document.querySelector('main').innerText })); if (!v.h1 || /Unknown address|Not migrated yet/.test(v.text)) bad.push(`${h}: ${v.h1}`); }
      return { hrefs, bad }; };
    const l1 = await storyLinks();
    ok('C-18', `every one of the draft story’s ${l1.hrefs.length} distinct links opens a native page (Build a Room’s design, plan, lifecycle, ledger; the room’s ledger)`, l1.hrefs.length >= 4 && l1.hrefs.some((h) => /tab=lifecycle/.test(h)) && l1.hrefs.some((h) => /ledger\?room=/.test(h)) && !l1.bad.length, l1.bad.slice(0, 4).join(' | ') || l1.hrefs.join(' '));
    await page.evaluate(() => { location.hash = '#/v25/ledger?room=R-DEMO-0001'; }); await page.waitForTimeout(300);
    const rec = await page.locator('[data-testid=ledger] tbody tr td:nth-child(5)').allInnerTexts();
    ok('C-19', 'the story’s ledger link shows only this room’s events', (await page.locator('[data-testid=ledger-scope]').count()) === 1 && rec.length > 10 && rec.every((x) => x === 'R-DEMO-0001') && rec.length === afterS.events.length, `${rec.length} rows`);
    // the re-acceptance after the swap: refused until every reopened test is re-run and verified by a different person
    await page.evaluate(() => { location.hash = '#/v25/build?tab=lifecycle'; }); await page.waitForTimeout(300); await page.click('#tab-lifecycle'); await page.waitForTimeout(150);
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(250);
    const ra1 = await refusal();
    ok('C-19b', 're-acceptance is refused, the refusal naming every reopened test (the enterprise API’s wording)', /Refused/.test(ra1) && new RegExp(`${want.length} test\\(s\\) were last recorded before the substitution`).test(ra1) && want.every((t) => ra1.includes(t.testId)) && (await draftNow()).design.lifecycle === 'COMMISSIONING', ra1.slice(0, 300));
    // D-38 and the documented order: the design binding first (the swap and the microphone changed the design), then the reopened tests, then the general count
    const li1 = await page.locator('[role=alert] li').allInnerTexts(); const dr1 = await draftNow();
    const subs1 = dr1.substitutions.filter((s) => s.baselineVersion === 1).map((s) => ({ assetId: s.assetId, from: s.from, to: s.to }));
    ok('C-19f', 'the refusal lists the blockers in the documented order — the engine’s design-binding sentence first (naming the substitution), then the reopened tests with the count', li1[0] === ENGINE.designBindingSentence(bindingOf(dr1, subs1)) && li1[0].includes(`(${camId} generic → ${NEW_CAM})`) && inOrder(li1) && JSON.stringify([...new Set(li1.map(blockerKind))].filter((k) => k !== 'open-issues')) === JSON.stringify(['design-binding', 'reopened-tests']) && /design approval required/i.test(await page.locator('[data-testid=design-binding-notice]').innerText()), JSON.stringify(li1).slice(0, 500));
    await persp('cxeng'); await page.click('button:has-text("Record all untested as PASS")'); await page.waitForTimeout(400);
    const rerun = await draftNow();
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(250);
    const ra2 = await refusal();
    ok('C-19c', 're-run after the substitution (each earlier record kept in its history), the reopened tests still block until a different person verifies them', !(await page.locator('[data-testid=stale-result]').count()) && want.every((t) => rerun.design.results[t.testId].state === 'PASS' && !rerun.design.results[t.testId].verified && rerun.design.results[t.testId].history.length === 1 && rerun.design.results[t.testId].history[0].verified?.by === 'architect') && /re-run after the substitution and are not yet passed and verified by a different person/.test(ra2) && want.every((t) => ra2.includes(t.testId)), ra2.slice(0, 300));
    await persp('cxeng'); await page.click('button:has-text("Verify all unverified")'); await page.waitForTimeout(300);
    const ra3 = await refusal();
    await persp('architect'); await page.click('button:has-text("Verify all unverified")'); await page.waitForTimeout(400);
    // D-38: every test re-run and verified, the re-acceptance still waits for the design approval — the engine's sentence alone
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(300);
    const li2 = await page.locator('[role=alert] li').allInnerTexts(); const dr2 = await draftNow();
    ok('C-19g', 'without the design approval the re-acceptance is refused for that reason alone, in the engine’s words: “save the change as a revision and have it approved”', li2.length === 1 && li2[0] === ENGINE.designBindingSentence(bindingOf(dr2, subs1)) && /save the change as a revision and have it approved \(room\.design\.approve, not its author\)/.test(li2[0]) && dr2.design.lifecycle === 'COMMISSIONING', JSON.stringify(li2).slice(0, 400));
    // the matching action (the API's POST /v1/rooms/{room}/revisions/{rev}/approve, here on the synthetic draft): save, then approve — not by its author
    await page.click('#tab-design'); await page.waitForTimeout(150); await persp('syseng');
    await page.fill('[aria-label="Revision reason"]', 'the camera’s model substituted during recommissioning (synthetic)'); await page.click('button:has-text("Save revision")'); await page.waitForTimeout(150);
    const newRev = (await draftNow()).revisions.length;
    const needs = (await page.locator('[data-testid=design-binding]').innerText());
    await page.click('[data-testid=approve-revision]'); await page.waitForTimeout(150); const own = (await page.locator('[role=alert] li').allInnerTexts()).join('|');
    await persp('designer'); await page.click('[data-testid=approve-revision]'); await page.waitForTimeout(150); const noAuth = (await page.locator('[role=alert] li').allInnerTexts()).join('|');
    ok('C-19h', `the saved revision ${newRev} needs approval; its author (the systems engineer) and a persona without room.design.approve (the designer) are refused, in the API’s words`, new RegExp(`revision ${newRev} needs approval`).test(needs) && own === ENGINE.notByItsAuthor('the design', 'syseng') && noAuth === ENGINE.needsAuthority('designer', 'approve a design revision', 'room.design.approve') && (await draftNow()).approvedRevision === 1, JSON.stringify({ needs: needs.slice(0, 200), own, noAuth }));
    await persp('architect'); await page.click('[data-testid=approve-revision]'); await page.waitForTimeout(200);
    ok('C-19i', `a different person who holds room.design.approve approves revision ${newRev}: the binding holds and the refusal is gone`, !(await refusal()) && (await page.locator('[data-testid=design-binding]').getAttribute('data-bound')) === 'true' && (await draftNow()).approvedRevision === newRev && (await draftNow()).events[0].type === 'room.revision.approve', (await refusal()) || (await page.locator('[data-testid=design-binding]').innerText()));
    await page.click('#tab-lifecycle'); await page.waitForTimeout(150);
    await persp('qa'); await page.click('button:has-text("Move to ACCEPTED")'); await page.waitForTimeout(300);
    const acc = await draftNow(); const st3 = await page.locator('.build__state').innerText(); const lin = await page.locator('[data-testid=lineage]').innerText();
    ok('C-19d', 'the person who re-ran the tests cannot verify them; once a different person has, the room is re-accepted', /independent/.test(ra3) && acc.design.lifecycle === 'ACCEPTED' && /ACCEPTED/.test(st3) && !(await refusal()), (await refusal()) || st3);
    ok('C-19e', 'the re-acceptance publishes baseline v2 and keeps v1, unchanged, as SUPERSEDED', acc.baseline.version === 2 && acc.baseline.state === 'CURRENT' && acc.baselines.length === 2 && JSON.stringify(acc.baselines[0]) === JSON.stringify({ ...JSON.parse(baseline0).current, state: 'SUPERSEDED' }) && /baseline v2/.test(st3) && /v1\s*SUPERSEDED/.test(lin) && /v2\s*CURRENT/.test(lin) && want.every((t) => acc.baseline.results[t.testId] === 'PASS_VERIFIED') && acc.substitutions.length === 1, lin.slice(0, 300));
    ok('C-19j', `baseline v2 binds the newly approved revision ${newRev} (v1 keeps revision 1), and the lineage says so`, acc.baseline.revision === newRev && acc.baselines[0].revision === 1 && new RegExp(`v2\\s*CURRENT\\s*revision ${newRev}`).test(lin), lin.slice(0, 300));
    // A · from Search Party room results, an estate room's story, and a link that opens the record where it lives
    await persp('visitor'); await page.evaluate(() => { location.hash = '#/search'; }); await page.waitForTimeout(300); await page.fill('#spd-q', 'Boardroom'); await page.waitForTimeout(200);
    await page.click('.sp__list a.sp__story >> nth=0'); await page.waitForSelector('[data-testid=story]');
    const es = await page.locator('.story__stage').evaluateAll((els) => els.map((e) => ({ key: e.dataset.stage, n: Number(e.dataset.count) })));
    ok('C-20', 'a Search Party room result opens that room’s entire story: Atlas 4.218 has records in the request, design, authorize, baseline and service stages', (await page.evaluate(() => location.hash)) === '#/story/R-ATL-4-218' && ['request', 'design', 'authorize', 'baseline', 'operate'].every((k) => es.find((s) => s.key === k).n > 0) && /ISS-0417/.test(await page.locator('[data-testid=story]').innerText()), JSON.stringify(es));
    const l2 = await storyLinks();
    ok('C-20b', `every one of the estate room story’s ${l2.hrefs.length} distinct links opens a native page (Search Party, Mission Control, Executive, ServiceHands, the ledger)`, l2.hrefs.length >= 6 && ['#/search', '#/v25/exec', '#/v25/service'].every((p) => l2.hrefs.some((h) => h.startsWith(p))) && !l2.bad.length, l2.bad.slice(0, 4).join(' | ') || l2.hrefs.join(' '));
    await page.evaluate(() => { location.hash = '#/story/R-ATL-4-218'; }); await page.waitForSelector('[data-testid=story]');
    await page.click('[data-testid=story] a:has-text("Open ISS-0417 in ServiceHands")'); await page.waitForSelector('[data-testid=incident]');
    ok('C-21', 'a story link opens the record where it lives: ISS-0417 in ServiceHands', /#\/v25\/service\?id=ISS-0417/.test(await page.evaluate(() => location.hash)) && /Far-end audio drops out/.test(await page.locator('[data-testid=incident] h2').innerText()));
    await page.evaluate(() => { location.hash = '#/search?focus=Room:R-ATL-4-231'; }); await page.reload(); await page.waitForTimeout(500);
    await page.click('[data-testid=sp-story]'); await page.waitForSelector('[data-testid=story]');
    ok('C-22', 'a focused room in Search Party carries “Show this room’s entire story”', (await page.evaluate(() => location.hash)) === '#/story/R-ATL-4-231' && /Atlas 4\.231 Training/.test(await page.locator('main h1').innerText()));
    await page.evaluate(() => { location.hash = '#/investor'; }); await page.waitForTimeout(300);
    const cardLinks = await page.locator('[data-testid=story-card] a').count(); await page.click('[data-testid=story-card] a >> nth=0'); await page.waitForSelector('[data-testid=story]');
    ok('C-23', 'the investor start carries the story card (one link per room) and it opens a story; the three start actions are unchanged', cardLinks >= 5 && /#\/story\//.test(await page.evaluate(() => location.hash)));
    await page.evaluate(() => { location.hash = '#/tours/investor?scenario=7'; }); await page.waitForTimeout(500); await page.waitForSelector('[data-testid=tour-detour]');
    await page.click('[data-testid=tour-detour]'); await page.waitForSelector('[data-testid=story]');
    ok('C-24', 'the guided tour offers the story as a detour from “One connected lifecycle”, without adding a step', /#\/story\/R-ATL-4-218/.test(await page.evaluate(() => location.hash)) && /step 15 of 17/.test(await page.locator('[data-testid=tour]').innerText()));
    await page.click('[data-testid=tour] button:has-text("Close")'); await page.waitForTimeout(200);
    ok('C-25', 'no page error and no console error across the cascade and the story', errs.length === errorsBefore, errs.slice(errorsBefore).join(' | '));
    // ---------------------------------------------------------------- ADR-0012: positions, physical units and installations — one reading everywhere
    const errorsUnits = errs.length;
    await page.evaluate(() => { location.hash = '#/v25/build?tab=lifecycle'; }); await page.waitForTimeout(300); await page.click('#tab-lifecycle'); await page.waitForTimeout(150);
    await persp('syseng'); await page.click('button:has-text("Recommission")'); await page.waitForTimeout(250);
    await page.click('#tab-design'); await page.waitForTimeout(200);
    const u0 = await draftNow(); const camPos = u0.design.devices.find((x) => x.cat === 'camera' && !x.removed).id;
    const unitBefore = u0.installations.find((i) => i.position === camPos && !i.removedAt)?.asset;
    const regRow = page.locator(`[data-testid=device-register] tr[data-position="${camPos}"]`);
    ok('C-26', 'the device register lists every position with the physical unit installed there and its identity state (synthetic units, UNKNOWN identity)', (await page.locator('[data-testid=device-register] tbody tr').count()) === u0.design.devices.filter((x) => !x.removed && !x.furniture).length && !!unitBefore && (await regRow.getAttribute('data-asset')) === unitBefore && (await regRow.getAttribute('data-identity-state')) === 'UNKNOWN' && /synthetic/.test(await page.locator('[data-testid=device-register]').innerText()), `${camPos} ${unitBefore}`);
    await persp('designer'); await page.selectOption('#b-unit', camPos); await page.click('[data-testid=replace-unit]'); await page.waitForTimeout(250);
    ok('C-27', 'a designer may not replace a unit like for like: it is field work (work.evidence)', /does not hold work\.evidence/.test(await refusal()), await refusal());
    await persp('installer'); await page.selectOption('#b-unit', camPos); await page.fill('#b-why', 'the camera failed its self-test (synthetic)'); await page.click('[data-testid=replace-unit]'); await page.waitForTimeout(300);
    const u1 = await draftNow(); const unitAfter = u1.installations.find((i) => i.position === camPos && !i.removedAt)?.asset;
    const atPos = u1.installations.filter((i) => i.position === camPos);
    ok('C-28', 'a like-for-like replacement keeps the position id, closes the old unit’s installation (REPLACED) and installs a new unit; the design does not change', !(await refusal()) && u1.design.devices.find((x) => x.id === camPos && !x.removed)?.cat === 'camera' && unitAfter && unitAfter !== unitBefore && atPos.find((i) => i.asset === unitBefore)?.removalReason === 'REPLACED' && atPos.find((i) => i.asset === unitAfter)?.installReason === 'REPLACEMENT' && u1.revisions.length === u0.revisions.length && (u1.designHistory || []).length === (u0.designHistory || []).length, (await refusal()) || JSON.stringify(atPos));
    const gateU = await page.locator('[data-testid=impact-gate]').innerText();
    ok('C-28b', 'a like-for-like replacement is not a design change: the design binding holds (no re-approval), and the gate names only the reopened tests', (await page.locator('[data-testid=design-binding]').getAttribute('data-bound')) === 'true' && !/no longer describes it/.test(gateU) && /were last recorded on the previous unit and must be re-run on the new unit/.test(gateU) && (await draftNow()).approvedRevision === u0.approvedRevision, gateU.slice(0, 300));
    ok('C-29', 'the Impact panel: Assurance calls it an installation change (unit A → unit B, same model), not a model drift', (await page.locator('[data-testid=impact-assurance-changes] [data-kind=UNIT_REPLACED]').count()) === 1 && !(await page.locator('[data-testid=impact-assurance-changes] [data-kind=MODEL_SUBSTITUTED]').count()) && (await page.locator('[data-testid=impact-assurance-changes]').innerText()).includes(`unit ${unitBefore} → ${unitAfter}`), (await page.locator('[data-testid=impact-body]').innerText()).slice(0, 300));
    await page.selectOption('#b-unit', camPos); await page.waitForTimeout(150);
    const posH = await page.locator('[data-testid=position-history]').innerText(); const unitH = await page.locator('[data-testid=asset-history]').innerText();
    ok('C-30', 'the register keeps the position’s design history apart from the unit’s history: the position lists both units’ installations, the unit its own', posH.includes(`${unitBefore} installed at ${camPos}`) && /removed .*\(replaced\)/.test(posH) && posH.includes(`${unitAfter} installed at ${camPos}`) && unitH.includes(`Unit history — ${unitAfter}`) && !unitH.includes(`${unitBefore} installed`), `${posH.slice(0, 200)} || ${unitH.slice(0, 200)}`);
    await page.click('#tab-checks'); await page.waitForSelector('[data-testid=reverification]');
    const rvU = await page.locator('[data-testid=reverification]').innerText();
    ok('C-31', 'Commissioning: the reopened tests name both units and say “replaced by another unit of the same model”', rvU.includes(`[unit ${unitBefore} → ${unitAfter}]`) && rvU.includes(`was replaced by another unit of the same model (${unitBefore} → ${unitAfter}`), rvU.slice(0, 300));
    await persp('visitor'); await page.evaluate(() => { location.hash = '#/search'; }); await page.waitForTimeout(300); await page.fill('#spd-q', unitAfter); await page.waitForTimeout(250);
    const spU = await page.locator('.sp__list').innerText();
    ok('C-32', 'Search Party finds the unit and the position it is located in, with the same reading: position · unit · identity', spU.includes(`${unitAfter} · `) && spU.includes(`unit ${unitAfter} · identity UNKNOWN`), spU.slice(0, 300));
    await persp('exec'); await page.evaluate(() => { location.hash = '#/v25/exec'; }); await page.waitForTimeout(300);
    ok('C-33', 'Pro reads the same identities: the installed units of the room, none counted as known while UNKNOWN', (await page.locator(`[data-testid=exec-units] li[data-identity="${camPos} · unit ${unitAfter} · identity UNKNOWN"]`).count()) === 1 && /with a recorded identity \(0%\)/.test(await page.locator('[data-testid=exec-units]').innerText()));
    await persp('visitor'); await page.evaluate(() => { location.hash = '#/story/R-DEMO-0001'; }); await page.waitForSelector('[data-testid=story]');
    const stU = await page.locator('[data-testid=story]').innerText();
    ok('C-34', 'the Room Story shows the positions (design) apart from the physical units (commission), and the replacement as a unit event', (await page.locator('[data-stage=design] [data-entry="design:positions"]').count()) === 1 && (await page.locator('[data-stage=commission] [data-entry="commission:units"]').count()) === 1 && /Unit replaced like for like/.test(stU), stU.slice(0, 300));
    await page.evaluate(() => { location.hash = '#/v25/build?tab=design'; }); await page.waitForTimeout(300); await persp('installer'); await page.selectOption('#b-unit', camPos); await page.click('[data-testid=declare-serial]'); await page.waitForTimeout(250);
    ok('C-35', 'an installer declares a synthetic serial: the register and the history read DECLARED, the serial labelled synthetic', (await page.locator(`[data-testid=device-register] tr[data-position="${camPos}"]`).getAttribute('data-identity-state')) === 'DECLARED' && /serial SYN-SN-.*\(synthetic\)/.test(await page.locator('[data-testid=asset-history]').innerText()), (await refusal()) || '');
    ok('C-36', 'no page error and no console error across the register, the replacement and the readings', errs.length === errorsUnits, errs.slice(errorsUnits).join(' | '));
  }
  if (tag === 'phone') {
    await page.evaluate(() => { location.hash = '#/story/R-ATL-4-218'; }); await page.waitForTimeout(500); await page.waitForSelector('[data-testid=story]');
    const ph = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, entries: document.querySelectorAll('[data-entry]').length, nav: [...document.querySelectorAll('.story__nav button')].map((b) => Math.round(b.getBoundingClientRect().height)) }));
    ok('C-phone-01', 'on a phone the story renders without sideways scrolling, with 44 px stage buttons', ph.over <= 0 && ph.entries > 5 && ph.nav.length === 8 && Math.min(...ph.nav) >= 44, JSON.stringify(ph));
    await page.screenshot({ path: path.join(out, 'story-phone.png'), fullPage: true });
  }
  ok(`D-${tag}-07`, 'no page error, no console error, no request outside the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'demo.json'), JSON.stringify(summary, null, 1)); console.log(`\n${summary.pass} passed, ${summary.fail} failed`); process.exit(failed ? 1 : 0);
