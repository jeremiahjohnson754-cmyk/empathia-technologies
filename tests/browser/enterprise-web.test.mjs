#!/usr/bin/env node
/**
 * Enterprise web app end-to-end test: the real React app, served by its own server, over the real API and a fresh PostgreSQL database.
 * Drives Chromium through the vertical slice as different people and checks that the UI reflects — and the server enforces — authority.
 *
 *   node tests/browser/enterprise-web.test.mjs [evidence-dir]
 * Needs: node scripts/db.mjs up; services/enterprise-api built; apps/enterprise-web built (node apps/enterprise-web/build.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setup, client } from '../integration/harness.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || path.join(repo, 'tests/evidence/enterprise-web'));
const shots = path.join(repo, 'media/screenshots/enterprise-web');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(shots, { recursive: true });
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const WEB = 4291, API = 4195;
const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 500) }); if (!cond) failed += 1; console.log(`${cond ? 'ok  ' : 'FAIL'} ${id} ${name}${cond ? '' : ` — ${detail}`}`); };

const h = await setup({ db: 'empathia_test_web', port: API, env: { CORS_ORIGINS: `http://127.0.0.1:${WEB}` } });
process.env.API_URL = h.base; process.env.WEB_PORT = String(WEB);
const { serve } = await import(path.join(repo, 'apps/enterprise-web/server/serve.mjs'));
const web = await serve();
const base = `http://127.0.0.1:${WEB}/`;   // the server tells the page its API origin (meta empathia-api); ?api= is a development-build override only
const b = await chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  // 400/401/403/404/422 responses are the server refusing on purpose in this test (W-02 wrong password, W-09 forged call, W-31 invalid measurement); Chromium logs them
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 40[0134]|status of 422/.test(m.text())) errors.push(`console: ${m.text()}`); });
  const external = []; page.on('request', (r) => { if (!/^http:\/\/127\.0\.0\.1:(4291|4195)\//.test(r.url()) && !/^(data|blob|about):/.test(r.url())) external.push(r.url()); });
  const signIn = async (role) => {
    if (await page.locator('text=Sign out').count()) await page.click('text=Sign out');
    await page.waitForSelector('[data-testid=role]');
    await page.selectOption('[data-testid=role]', role);
    await page.fill('[data-testid=password]', 'empathia-dev-only');
    await page.click('[data-testid=signin]');
    await page.waitForSelector('.shell__meta');
  };
  const shot = async (name) => { await page.screenshot({ path: path.join(shots, `${name}.jpg`), type: 'jpeg', quality: 80 }); };

  // ---------------------------------------------------------------- sign-in
  await page.goto(base);
  await page.waitForSelector('[data-testid=signin]');
  ok('W-01', 'the sign-in page loads with the development identity provider notice', (await page.textContent('body')).includes('Development identity provider'));
  await shot('01-sign-in');
  await page.selectOption('[data-testid=role]', 'designer'); await page.fill('[data-testid=password]', 'wrong-password'); await page.click('[data-testid=signin]');
  await page.waitForSelector('.ui-state--error');
  ok('W-02', 'a wrong password is refused by the server and shown', /not right/.test(await page.textContent('.ui-state--error')));
  await page.fill('[data-testid=password]', 'empathia-dev-only'); await page.click('[data-testid=signin]');
  await page.waitForSelector('.shell__meta');
  ok('W-03', 'the designer signs in; the role shown comes from /v1/me', (await page.textContent('.shell__meta')).startsWith('designer'));

  // ---------------------------------------------------------------- landing: Mission Control (what needs you), then the rooms list
  await page.waitForSelector('[data-testid=mission]');
  ok('W-77', 'a signed-in person lands on Mission Control: the steps that are theirs (the designer holds none yet) and the exceptions in scope', /Nothing needs you right now|need/.test(await page.locator('.page__head').innerText()) && (await page.locator('[data-testid=mission-exceptions]').count()) === 1);
  await page.goto(base + '#/rooms');
  await page.waitForSelector('.ui-table');
  const listed = await page.locator('.ui-table tbody tr').count();
  ok('W-04', 'the rooms list shows the seeded rooms from the database', listed === 3, listed);
  await shot('02-rooms');

  // ---------------------------------------------------------------- create a room (designer)
  await page.click('[data-testid=new-room]');
  await page.fill('[data-testid=room-name]', 'Browser Huddle (synthetic)');
  await page.click('[data-testid=create-room]');
  await page.waitForURL(/#\/rooms\/R-PLN-\d{4}/);
  const code = decodeURIComponent(page.url().split('#/rooms/')[1]);
  await page.waitForSelector('.plan svg');
  ok('W-05', 'a new room is created through the API and opens with its plan view', /^R-PLN-\d{4}$/.test(code) && (await page.textContent('h1')) === 'Browser Huddle (synthetic)', code);
  ok('W-06', 'the new room is PLANNED and its live health is NOT monitored', (await page.textContent('.facts-inline')).includes('Planned') && (await page.textContent('.facts-inline')).includes('Not monitored'));
  await shot('03-room-overview');
  ok('W-07', 'the designer sees no design-approval or classification-approval control', (await page.locator('[data-testid=lifecycle-next]').count()) === 0 && (await page.locator('[data-testid=approve-classification]').count()) === 0);

  // ---------------------------------------------------------------- devices
  await page.click('#tab-devices');
  await page.waitForSelector('[data-testid=add-device]');
  const before = await page.locator('.ui-table').first().locator('tbody tr').count();
  await page.selectOption('[data-testid=add-category]', 'display');
  await page.click('[data-testid=add-device]');
  await page.waitForFunction((n) => document.querySelector('.ui-table tbody')?.querySelectorAll('tr').length === n + 1, before);
  const dbDevices = Number(h.asSuper(`SELECT count(*) FROM app.planned_asset a JOIN app.room r ON r.id = a.room_id WHERE r.code = '${code}' AND a.removed_at IS NULL AND NOT a.furniture`));
  ok('W-08', 'adding a device persists it: the table and the database agree', dbDevices === before + 1, `${before} → ${dbDevices}`);
  await shot('04-room-devices');

  // ---------------------------------------------------------------- the server is the authority, not the UI
  const forged = await page.evaluate(async ([apiBase, room]) => {
    const t = sessionStorage.getItem('empathia.enterprise-web.session');
    const r = await fetch(`${apiBase}/v1/rooms/${room}/lifecycle`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify({ to: 'DESIGN_APPROVED' }) });
    return { status: r.status, body: await r.json() };
  }, [h.base, code]);
  ok('W-09', 'a designer who bypasses the UI and calls the approval endpoint directly is refused 403 by the server', forged.status === 403 && forged.body.code === 'forbidden', JSON.stringify(forged));

  // ---------------------------------------------------------------- the systems engineer approves
  await signIn('syseng');
  await page.goto(`${base}#/rooms/${code}`);
  await page.waitForSelector('[data-testid=approve-classification]');
  await page.click('[data-testid=approve-classification]');
  await page.waitForFunction(() => /Approved type/.test(document.body.textContent || '') && !/not approved/.test(document.querySelector('.ui-facts')?.textContent || ''));
  ok('W-10', 'the systems engineer approves the classification', !(await page.textContent('.ui-facts')).includes('not approved'));
  await page.click('[data-testid=lifecycle-next]');
  await page.waitForFunction(() => /Design approved/.test(document.querySelector('.facts-inline')?.textContent || ''));
  ok('W-11', 'the systems engineer moves the room to DESIGN_APPROVED; the database agrees', h.asSuper(`SELECT lifecycle FROM app.room WHERE code = '${code}'`) === 'DESIGN_APPROVED');

  // ---------------------------------------------------------------- commissioning tab before COMMISSIONING
  await page.click('#tab-commissioning');
  await page.waitForSelector('.ui-comp');
  ok('W-12', 'the commissioning plan lists applicable tests, none passed from a design, with no bare PASS label', (await page.textContent('.panel')).includes('nothing passes from a design') && !/\bPASS\b(?!_)/.test(await page.textContent('.ui-table')));
  await shot('05-room-commissioning');

  // ---------------------------------------------------------------- refusal shown verbatim (the next step needs the operations lead)
  ok('W-13', 'the systems engineer has no button for the operations lead’s step', (await page.locator('[data-testid=lifecycle-next]').count()) === 0);

  // ---------------------------------------------------------------- P4-B: readiness strip, blockers, acceptance & assurance tab, measurements with provenance
  const ready = await page.locator('[data-testid=readiness]').innerText();
  ok('W-28', 'the readiness strip states the stage, verified share (0% — design approval is not commissioning progress), evidence, baseline and live health from the API', /DESIGN_APPROVED/.test(ready) && /0%/.test(ready) && /none/.test(ready) && /Not monitored/.test(ready), ready.slice(0, 240));
  ok('W-29', 'the next gate names its authority and the separation-of-duties rule where one applies', /next INSTALLATION_PENDING · window\.approve/.test(ready), ready.slice(0, 200));
  await page.click('#tab-assurance'); await page.waitForSelector('.panel .card');
  const atab = await page.locator('.panel').innerText();
  ok('W-30', 'the assurance tab shows no baseline before acceptance and says a baseline is published only by an authorized acceptance', /No baseline yet/.test(atab) && /authorized acceptance/.test(atab), atab.slice(0, 160));
  ok('W-30b', 'the systems engineer, who holds no recording authority, sees no measurement control (the server would refuse anyway)', (await page.locator('[data-testid=record-measurement]').count()) === 0);
  await signIn('cxeng'); await page.goto(`${base}#/rooms/${code}/assurance`); await page.waitForSelector('[data-testid=record-measurement]');
  await page.click('[data-testid=record-measurement]'); await page.waitForSelector('[data-testid=m-value]');
  await page.fill('[data-testid=m-value]', '36.2'); await page.fill('input[placeholder="seat 3, 1.2 m"]', 'seat 3, 1.2 m'); await page.fill('input[placeholder="instrument, file or model"]', 'SYN-METER-01');
  await page.click('[data-testid=measurement-submit]'); await page.waitForTimeout(400);
  const noInst = await page.locator('.ui-drawer').innerText().catch(() => '');
  ok('W-31', 'a field measurement without an instrument is refused by the server and the refusal is shown in the form', /instrument/i.test(noInst), noInst.slice(0, 160));
  await page.fill('.ui-drawer input[maxlength="80"]', 'SYN-METER-01');
  await page.selectOption('.ui-drawer select >> nth=1', 'CALIBRATED');
  await page.click('[data-testid=measurement-submit]'); await page.waitForSelector('text=FIELD_MEASURED');
  const mrow = await page.locator('.ui-table').last().innerText();
  ok('W-32', 'the measurement is listed with its provenance, instrument, calibration state and UNREVIEWED approval', /FIELD_MEASURED/.test(mrow) && /SYN-METER-01/.test(mrow) && /UNREVIEWED/.test(mrow), mrow.slice(0, 200));
  await page.click('button:has-text("Verify") >> nth=0'); await page.waitForTimeout(500);
  const selfV = await page.locator('.panel').innerText();
  ok('W-33', 'the recorder cannot verify their own measurement: the server’s refusal is shown verbatim', /separat|recorded|not .*verify|refused/i.test(selfV) && /UNREVIEWED/.test(selfV), selfV.slice(0, 200));
  await shot('09-assurance');

  // ---------------------------------------------------------------- reports, admin, keyboard
  await page.goto(`${base}#/reports`); await page.waitForSelector('.stats');
  ok('W-14', 'reports show definitions and operational performance “Not monitored”', (await page.textContent('.page')).includes('Not monitored') && (await page.textContent('.page')).includes('applicable tests'));
  await shot('06-reports');
  const navHasAdmin = await page.locator('a.shell__product', { hasText: 'Administration' }).count(); const lockedAdmin = await page.locator('.shell__product--locked', { hasText: 'Administration' }).count();
  ok('W-15', 'the systems engineer sees Administration locked with its reason, not as a link (the API refuses it anyway)', navHasAdmin === 0 && lockedAdmin === 1);
  await signIn('secadmin');
  await page.goto(`${base}#/admin/integrations`); await page.waitForSelector('.ui-table');
  const states = await page.locator('.ui-table tbody .ui-badge').allTextContents();
  ok('W-16', 'the integration catalogue shows honest states only (Mock / Contract only), never connected', states.length > 0 && states.every((s) => /Mock|Contract only|Not configured/.test(s)), [...new Set(states)].join(','));
  await shot('07-admin-integrations');
  await page.goto(`${base}#/rooms/R-PLN-0001`); await page.waitForSelector('#tab-overview');
  await page.focus('#tab-overview'); await page.keyboard.press('ArrowRight');
  ok('W-17', 'room tabs are keyboard operable (arrow keys move between tabs)', /#\/rooms\/R-PLN-0001\/devices$/.test(page.url()), page.url());

  // ---------------------------------------------------------------- Search Party (P4-A): search, facets, graph, inspector, intents; site scope absent not hidden
  await signIn('syseng');
  await page.goto(`${base}#/search`); await page.waitForSelector('#sp-q');
  await page.fill('#sp-q', 'R-PLN-0001'); await page.waitForTimeout(500); await page.waitForSelector('.sp__list li');
  const first = await page.locator('.sp__list li').first().innerText();
  ok('W-22', 'Search Party ranks the exact room code first and shows its type and record source', /ROOM/i.test(first) && /R-PLN-0001/.test(first), first);
  await page.click('.sp__list li a'); await page.waitForSelector('.sp__graph svg');
  const nodes = await page.locator('.sp__node').count(); const edgesN = await page.locator('.sp__edge').count();
  ok('W-23', 'the neighbourhood graph renders nodes and edges from the API with the start at the centre', nodes >= 4 && edgesN >= 3, `${nodes} nodes, ${edgesN} edges`);
  await page.locator('.sp__node').nth(1).focus(); await page.keyboard.press('Enter'); await page.waitForSelector('.sp__inspect');
  const insp = await page.locator('.sp__inspect').innerText();
  ok('W-24', 'a node is inspectable from the keyboard and every edge states its provenance', /source /.test(insp) && /(DECLARED|DERIVED|MODELED)/.test(insp), insp.slice(0, 200));
  await page.click('.sp__chip:has-text("Who approved")'); await page.waitForSelector('.sp__answer');
  const ans = await page.locator('.sp__answer').innerText();
  ok('W-25', 'a relationship question is answered from records with its status and confidence shown', /(ANSWERED|UNKNOWN|PARTIAL)/.test(ans) && /approv/i.test(ans), ans.slice(0, 200));
  await page.click('.sp__chip:has-text("vendor")'); await page.waitForTimeout(400);
  const vend = await page.locator('.sp__answer').innerText();
  ok('W-26', 'an unmodelled question is UNKNOWN with the reason, never a manufactured answer', /UNKNOWN/.test(vend) && /not yet captured|cannot claim/.test(vend), vend.slice(0, 200));
  await shot('08-search-party');
  await signIn('service'); // the seeded service technician is unscoped; the South-only one proves absence
  await page.click('text=Sign out'); await page.waitForSelector('[data-testid=role]');
  await page.selectOption('[data-testid=role]', 'service'); await page.fill('[data-testid=email]', 'service-south@empathia-demo.empathia.invalid'); await page.fill('[data-testid=password]', 'empathia-dev-only'); await page.click('[data-testid=signin]'); await page.waitForSelector('.shell__meta');
  await page.goto(`${base}#/search`); await page.waitForSelector('#sp-q'); await page.fill('#sp-q', 'ATL'); await page.waitForTimeout(500);
  const southText = await page.locator('.sp__results').innerText();
  ok('W-27', 'a South-scoped technician searching the North building finds nothing: absent, not hidden (and the coverage note says site-scoped)', /Nothing in your view matches/.test(southText) && !/Atlas/.test(southText), southText.slice(0, 160));
  await signIn('syseng');

  // ---------------------------------------------------------------- one platform: the product rail and the product landings
  const rail = await page.locator('.shell__rail').innerText();
  ok('W-34', 'the shared shell shows the platform’s products in one rail: Mission Control, Pro, Lite, Search Party, Commissioning & Assurance, Field Intelligence, Learn, Administration', ['Mission Control', 'Pro', 'Lite', 'Search Party', 'Commissioning & Assurance', 'Field Intelligence', 'Learn', 'Administration'].every((x) => rail.includes(x)), rail);
  await page.goto(`${base}#/commissioning`); await page.waitForSelector('.stage-grid');
  ok('W-35', 'Commissioning & Assurance lists every room by lifecycle stage from the API', (await page.locator('.stage').count()) === 7 && /Browser Huddle/.test(await page.locator('.stage-grid').innerText()));
  await page.goto(`${base}#/field/licences`); await page.waitForSelector('[data-testid=fi-licences]');
  const fi = await page.locator('.page').innerText();
  ok('W-36', 'Field Intelligence shows the honest adapter states (READ_ONLY / NOT_CONFIGURED, nothing SUPPORTED_VERIFIED) and that a licence opens requests, never proofs', /never proofs/.test(fi) && /NOT_CONFIGURED/.test(fi) && /READ_ONLY/.test(fi) && !/SUPPORTED_VERIFIED/.test(fi) && /only runs are labelled simulations/.test(fi), fi.slice(0, 200));
  await page.goto(`${base}#/learn`); await page.waitForSelector('#learn-q'); await page.fill('#learn-q', 'commissioning'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  ok('W-37', 'Learn searches the permission-aware knowledge base', (await page.locator('.list .card, .ui-empty').count()) >= 1);
  await shot('10-platform-rail');

  // ---------------------------------------------------------------- P5: the governed project lifecycle through the pages (ADR-0008)
  await signIn('requestor');
  await page.goto(base + '#/requests'); await page.waitForSelector('.page__head');
  await page.click('button:has-text("New request")'); await page.waitForSelector('.ui-drawer');
  await page.fill('.ui-drawer input[maxlength="160"]', 'Northstar 2 huddle (browser, synthetic)');
  await page.fill('.ui-drawer textarea >> nth=0', 'Four people meet with two remote colleagues; the room must be bookable and simple.');
  await page.selectOption('.ui-drawer select >> nth=2', { label: 'Northstar Annex (synthetic) (NST)' }).catch(() => {});
  await page.fill('.ui-drawer input[maxlength="120"]', 'Northstar 2 · new huddle');
  await page.click('.ui-drawer button:has-text("Add a dimension")'); await page.fill('.ui-drawer input[aria-label="Value"]', '4.2'); await page.fill('.ui-drawer input[aria-label="Uncertainty"]', '±0.2 m');
  await page.click('.ui-drawer button:has-text("Save as draft")'); await page.waitForSelector('.ui-drawer', { state: 'detached' }); await page.waitForTimeout(300);
  const desk = await page.locator('.ui-table').innerText();
  ok('W-38', 'the requester raises a request of one of the nine kinds; it appears on the desk as DRAFT with no project yet', /Northstar 2 huddle \(browser/.test(desk) && /DRAFT/.test(desk) && /not yet/.test(desk), desk.slice(0, 200));
  await page.click('.ui-table button:has-text("Submit")'); await page.waitForTimeout(400);
  const desk2 = await page.locator('.ui-table').innerText();
  ok('W-39', 'submitting creates the governed project (SUBMITTED) and links it from the desk', /SUBMITTED/.test(desk2) && /PRJ-REQ-/.test(desk2), desk2.slice(0, 200));
  const prjCode = (desk2.match(/PRJ-REQ-\d+/) || [])[0];
  await signIn('opslead');
  await page.goto(base + `#/projects/${prjCode}`); await page.waitForSelector('[data-testid=stages]');
  const stages = await page.locator('[data-testid=stages] li.now').innerText();
  ok('W-40', 'the project record shows the seven stages with the current one (review) and the next governed steps with their authority and guard', /review/.test(stages) && /route\.internal/.test(await page.locator('[data-testid=next-steps]').innerText()), stages);
  await page.click('button:has-text("Route internally")'); await page.waitForSelector('.ui-drawer');
  await page.fill('.ui-drawer textarea', 'short'); await page.click('.ui-drawer button:has-text("Record the route")'); await page.waitForSelector('.ui-drawer .ui-state--error');
  ok('W-41', 'a short exception is refused by the guard and the refusal is shown with its reason', /documented exception/.test(await page.locator('.ui-drawer .ui-state--error').innerText()));
  await page.fill('.ui-drawer textarea', 'no framework supplier covers the north campus this quarter; in-house AV team delivers'); await page.click('.ui-drawer button:has-text("Record the route")'); await page.waitForSelector('.ui-drawer', { state: 'detached' }); await page.waitForTimeout(300);
  await page.click('button:has-text("Write the brief")'); await page.waitForSelector('.ui-drawer');
  await page.fill('.ui-drawer textarea >> nth=0', 'A four-seat huddle room on Northstar 2 with one display, a video bar and a scheduling panel.');
  await page.fill('.ui-drawer textarea >> nth=1', 'Video call with two remote participants\nBookable from the calendar');
  await page.fill('.ui-drawer input[type=number]', '18000');
  await page.click('.ui-drawer button:has-text("Submit the brief")'); await page.waitForSelector('.ui-drawer', { state: 'detached' }); await page.waitForTimeout(300);
  const rec = await page.locator('main').innerText();
  ok('W-42', 'the brief is recorded as rev 1 against scope revision 1 with its ROM labelled INITIAL_ROM; the project is PITCH_READY (brief stage)', /Brief rev 1/.test(rec) && /INITIAL_ROM/.test(rec) && /PITCH_READY/.test(rec), rec.slice(0, 200));
  await page.click('button:has-text("Select the approver")'); await page.waitForSelector('.ui-drawer');
  await page.fill('.ui-drawer input', 'opslead@empathia-demo.empathia.invalid'); await page.click('.ui-drawer button:has-text("Request the decision")'); await page.waitForSelector('.ui-drawer .ui-state--error');
  ok('W-43', 'the brief’s author cannot be selected as approver (separation of duties), with both reasons named', /author of the brief/.test(await page.locator('.ui-drawer').innerText()) && /select themself/.test(await page.locator('.ui-drawer').innerText()));
  await page.fill('.ui-drawer input', 'exec@empathia-demo.empathia.invalid'); await page.click('.ui-drawer button:has-text("Request the decision")'); await page.waitForSelector('.ui-drawer', { state: 'detached' }); await page.waitForTimeout(300);
  await shot('11-project-decision-pending');
  await signIn('exec');
  await page.goto(base + `#/projects/${prjCode}`); await page.waitForSelector('[data-testid=stages]');
  await page.click('button:has-text("Decide")'); await page.waitForSelector('.ui-drawer');
  await page.click('.ui-drawer button:has-text("Record the decision")'); await page.waitForSelector('.ui-drawer', { state: 'detached' }); await page.waitForTimeout(300);
  ok('W-44', 'the selected executive approves scope revision 1; the decision is listed with its decider', /APPROVED/.test(await page.locator('main').innerText()) && /Executive \/ Sponsor \(synthetic\)/.test(await page.locator('main').innerText()));
  // owner decision (ADR-0008 §2): concept work before funding; execution after
  await signIn('syseng');
  await page.goto(base + `#/projects/${prjCode}`); await page.waitForSelector('[data-testid=stages]');
  ok('W-45a', 'before concept authorization the record says so and the designer has nothing to propose', /concept not authorized/.test(await page.locator('[data-testid=authorizations]').innerText()) && /execution not authorized/.test(await page.locator('[data-testid=authorizations]').innerText()));
  await page.click('button:has-text("Authorize concept work")'); await page.waitForTimeout(400);
  ok('W-45b', 'the systems engineer (not the brief’s author) authorizes concept work: delivery opens at ENGINEERING_REVIEW while the project is only APPROVED', /concept authorized/.test(await page.locator('[data-testid=authorizations]').innerText()) && /ENGINEERING_REVIEW/.test(await page.locator('main').innerText()) && /execution not authorized/.test(await page.locator('[data-testid=authorizations]').innerText()));
  await page.click('button:has-text("Move to DESIGN_DRAFT")'); await page.waitForTimeout(400);
  await signIn('designer');
  await page.goto(base + `#/projects/${prjCode}`); await page.waitForSelector('[data-testid=stages]');
  await page.click('button:has-text("Propose a design revision")'); await page.waitForSelector('.ui-drawer');
  await page.fill('.ui-drawer input:not([type]) >> nth=0', 'feasibility and concept layout');
  await page.fill('.ui-drawer textarea >> nth=0', 'A four-seat huddle fits the 4.2 m bay with one display; a second display does not.');
  await page.fill('.ui-drawer input[type=number]', '16500');
  await page.click('.ui-drawer button:has-text("Propose")'); await page.waitForSelector('.ui-drawer', { state: 'detached' }); await page.waitForTimeout(300);
  const design = await page.locator('[data-testid=design]').innerText();
  ok('W-45c', 'a CONCEPT revision with its feasibility finding and a labelled preliminary estimate is recorded before any money is authorized', /CONCEPT/.test(design) && /Feasibility\./.test(design) && /16,500 USD — concept work, not a quote/.test(design), design.slice(0, 300));
  await page.click('button:has-text("Propose a design revision")'); await page.waitForSelector('.ui-drawer');
  await page.selectOption('.ui-drawer select >> nth=0', 'DETAILED'); await page.fill('.ui-drawer input:not([type]) >> nth=0', 'detailed design too early');
  await page.click('.ui-drawer button:has-text("Propose")'); await page.waitForSelector('.ui-drawer .ui-state--error');
  ok('W-45d', 'a DETAILED design before funding is refused with the execution-authorization reason', /execution authorization/.test(await page.locator('.ui-drawer .ui-state--error').innerText()));
  await page.click('.ui-drawer button:has-text("Cancel")'); await page.waitForTimeout(200);
  await signIn('finance');
  await page.goto(base + `#/projects/${prjCode}`); await page.waitForSelector('[data-testid=stages]');
  await page.click('button:has-text("Authorize funding")'); await page.waitForSelector('.ui-drawer');
  await page.fill('.ui-drawer input[type=number]', '18000'); await page.fill('.ui-drawer input:not([type=number]) >> nth=1', 'CC-AV-01');
  await page.click('.ui-drawer button:has-text("Authorize")'); await page.waitForSelector('.ui-drawer', { state: 'detached' }); await page.waitForTimeout(300);
  const funded = await page.locator('main').innerText();
  ok('W-45', 'funding against the approved scope is execution authorization: the stage is collaborative design, delivery stays where the concept work is (DESIGN_DRAFT), and the record says execution is authorized', /FUNDED/.test(funded) && /DESIGN_DRAFT/.test(funded) && /collaborative design/.test(await page.locator('[data-testid=stages] li.now').innerText()) && /execution authorized/.test(await page.locator('[data-testid=authorizations]').innerText()), funded.slice(0, 200));
  await shot('12-project-funded');
  await signIn('designer');
  await page.goto(base + `#/projects/${prjCode}`); await page.waitForSelector('[data-testid=stages]');
  ok('W-46', 'a designer sees the same record; the only step they hold is DESIGN_DRAFT → DESIGN_REVIEW (design.submit), blocked until the revision carries a DIVR', /not your authority/.test(await page.locator('[data-testid=next-steps]').innerText()) && /Design Intent/.test(await page.locator('[data-testid=next-steps]').innerText()));
  // the request catalogue is configurable by the security administrator and the new kind is offered at intake
  await signIn('secadmin');
  await page.goto(base + '#/admin/catalogue'); await page.waitForSelector('[data-testid=request-catalogue]');
  await page.fill('[data-testid=request-catalogue] form input >> nth=0', 'clinical_sim'); await page.fill('[data-testid=request-catalogue] form input >> nth=1', 'Clinical simulation suite'); await page.fill('[data-testid=request-catalogue] form input >> nth=3', 'healthcare');
  await page.click('[data-testid=request-catalogue] button:has-text("Add to the catalogue")'); await page.waitForTimeout(400);
  const catText = await page.locator('[data-testid=request-catalogue] .ui-table').innerText();
  ok('W-47', 'the security administrator adds an industry-specific request kind to the organization’s catalogue (platform defaults stay marked as such)', /Clinical simulation suite/.test(catText) && /this organization/.test(catText) && (catText.match(/platform default/g) || []).length === 9, catText.slice(0, 200));
  await signIn('requestor');
  await page.goto(base + '#/requests'); await page.waitForSelector('.page__head');
  await page.click('button:has-text("New request")'); await page.waitForSelector('.ui-drawer');
  const kinds = await page.locator('.ui-drawer select >> nth=0').innerText();
  ok('W-48', 'the new kind is offered at intake, with its industry', /Clinical simulation suite · healthcare/.test(kinds), kinds);
  await page.click('.ui-drawer button:has-text("Cancel")');


  // ---------------------------------------------------------------- observability (browser side)
  const tel0 = await page.evaluate(() => window.empathiaTelemetry());
  ok('W-49', 'the browser reports under a release stamped with the build’s commit, to no transport unless the serving process configures one', /^empathia-enterprise-web@0\.1\.0\+([0-9a-f]{12}|unknown)$/.test(tel0.release) && tel0.transport === 'none' && tel0.captured === 0, JSON.stringify(tel0));
  // a synthetic window error (dispatched, not thrown: W-18 keeps watching real page errors) is captured by the window handler
  const tel1 = await page.evaluate(() => { window.dispatchEvent(new ErrorEvent('error', { error: new Error('synthetic window error'), message: 'synthetic window error' })); return window.empathiaTelemetry(); });
  ok('W-50', 'an uncaught error is captured by the window handler (count, no key in the status)', tel1.captured === 1 && !JSON.stringify(tel1).includes('dsn'), JSON.stringify(tel1));
  const bundle = await (await fetch(`http://127.0.0.1:${WEB}/app.js`)).text();
  ok('W-51', 'the shipped bundle carries the release sha, no DSN and no source map reference', /empathia-enterprise-web/.test(bundle) && !/sourceMappingURL/.test(bundle) && !/ingest\.sentry\.io/.test(bundle), '');

  // ---------------------------------------------------------------- ServiceHands (P6-A): a work order through the governed machine in the browser
  {
    const c = client(h.base); const tk = {}; for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'svcmgr']) tk[r] = await c.login(r);
    const rm = (await c.call('POST', '/v1/rooms', { token: tk.designer, body: { name: 'Service Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 6 } })).body.code;
    await c.call('POST', `/v1/rooms/${rm}/revisions`, { token: tk.designer, body: { reason: 'svc' } }); await c.call('POST', `/v1/rooms/${rm}/drawings/generate`, { token: tk.designer });
    await c.call('POST', `/v1/rooms/${rm}/drawings/plan/approve`, { token: tk.syseng }); await c.call('POST', `/v1/rooms/${rm}/classification/approve`, { token: tk.syseng, body: {} });
    for (const [to, t] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) await c.call('POST', `/v1/rooms/${rm}/lifecycle`, { token: tk[t], body: { to } });
    const rowT = (await c.call('GET', `/v1/rooms/${rm}`, { token: tk.designer })).body.commissioning.rows.find((x) => x.applicable);
    const ev = (await c.call('POST', '/v1/evidence', { token: tk.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
    await c.call('POST', `/v1/rooms/${rm}/results`, { token: tk.cxeng, body: { testId: rowT.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: rowT.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } });
    const iss = (await c.call('GET', `/v1/rooms/${rm}`, { token: tk.designer })).body.issues.find((i) => i.state === 'OPEN').code;
    const woCode = (await c.call('POST', `/v1/issues/${iss}/work-orders`, { token: tk.svcmgr, body: { note: 'camera dropped (synthetic)' } })).body.workOrderId;
    const svcId = h.asSuper("SELECT id FROM app.person WHERE email = 'service@empathia-demo.empathia.invalid'");

    await signIn('svcmgr');
    await page.goto(base + '#/service'); await page.waitForSelector('.ui-table');
    ok('W-52', 'the service queue lists the new work order as OPEN, not triaged', (await page.locator('.ui-table').innerText()).includes(woCode) && (await page.locator('.ui-table').innerText()).includes('not triaged'));
    await page.click(`a:has-text("${woCode}")`); await page.waitForSelector('[data-testid=work-order]');
    let nx = await page.locator('[data-testid=wo-next]').innerText();
    ok('W-53', 'the record names the only next step (triage, the manager’s) with the guard’s blockers', /OPEN → TRIAGED/.test(nx) && /severity is not set/.test(nx));
    await page.click('[data-testid=wo-next] button:has-text("Triage")'); await page.waitForSelector('.ui-drawer');
    await page.selectOption('.ui-drawer select >> nth=0', 'High'); await page.selectOption('.ui-drawer select >> nth=1', 'camera_replacement');
    await page.fill('.ui-drawer textarea >> nth=0', 'camera and cabling'); await page.fill('.ui-drawer textarea >> nth=1', 'room in daily use');
    await page.fill('.ui-drawer input[type=datetime-local] >> nth=0', '2026-11-03T08:00'); await page.fill('.ui-drawer input[type=datetime-local] >> nth=1', '2026-11-03T12:00');
    await page.click('.ui-drawer button:has-text("Triage")'); await page.waitForFunction(() => /TRIAGED/.test(document.querySelector('[data-testid=wo-state]')?.textContent || ''));
    await page.waitForSelector('[data-testid=wo-candidates]');
    const cands = await page.locator('[data-testid=wo-candidates]').innerText();
    ok('W-54', 'after triage the manager sees hard-gated candidates: one eligible with reasons, the South technician ineligible by site access', /eligible/.test(cands) && /site access: ATL not in approved sites/.test(cands) && /based in ATL/.test(cands), cands.slice(0, 300));
    await page.click('[data-testid=wo-candidates] button:has-text("Assign")'); await page.waitForFunction(() => /ASSIGNED/.test(document.querySelector('[data-testid=wo-state]')?.textContent || ''));
    ok('W-55', 'the assignment is on the record with its score; the database agrees', h.asSuper(`SELECT assigned_to FROM app.work_order WHERE code = '${woCode}'`) === svcId && /score \d+/.test(await page.locator('.page').innerText()));
    await shot('13-work-order-assigned');

    await signIn('service');
    await page.goto(base + `#/service/${woCode}`); await page.waitForSelector('[data-testid=work-order]');
    await page.click('[data-testid=wo-next] button:has-text("Accept the job")'); await page.waitForFunction(() => /ACCEPTED/.test(document.querySelector('[data-testid=wo-state]')?.textContent || ''));
    nx = await page.locator('[data-testid=wo-next]').innerText();
    ok('W-56', 'the technician accepted; the start is blocked until the preflight passes and the page says so', /dispatch preflight has a failed check/.test(nx) && (await page.locator('[data-testid=wo-next] button:has-text("Start the work")').isDisabled()));
    await page.click('[data-testid=wo-preflight] button:has-text("Record the preflight")'); await page.waitForSelector('.ui-drawer');
    await page.fill('.ui-drawer input >> nth=0', 'facilities desk (synthetic)'); await page.check('.ui-drawer input[type=checkbox] >> nth=0');
    for (const cb of await page.locator('.ui-drawer fieldset input[type=checkbox]').all()) await cb.check();
    for (const n of await page.locator('.ui-drawer input[type=number]').all()) await n.fill('2');
    await page.click('.ui-drawer button:has-text("Record")'); await page.waitForFunction(() => !document.querySelector('.ui-drawer') && /Room booking window/.test(document.querySelector('[data-testid=wo-preflight]')?.textContent || ''));
    const pf = await page.locator('[data-testid=wo-preflight]').innerText();
    ok('W-57', 'every preflight check is shown with its reason and none is blocked', !/blocked/.test(pf) && /Parts on hand/.test(pf) && /Tools confirmed/.test(pf), pf.slice(0, 300));
    await page.click('[data-testid=wo-next] button:has-text("Start the work")'); await page.waitForFunction(() => /IN_PROGRESS/.test(document.querySelector('[data-testid=wo-state]')?.textContent || ''));
    await page.click('[data-testid=wo-evidence] button:has-text("Record evidence")'); await page.waitForSelector('.ui-drawer');
    await page.selectOption('.ui-drawer select', 'photo'); await page.fill('.ui-drawer textarea', 'camera reseated and cable replaced (synthetic)'); await page.click('.ui-drawer button:has-text("Record")');
    await page.waitForFunction(() => !document.querySelector('.ui-drawer') && /camera reseated/.test(document.querySelector('[data-testid=wo-evidence]')?.textContent || ''));
    await page.click('[data-testid=wo-next] button:has-text("Hand over for verification")'); await page.waitForFunction(() => /VERIFYING/.test(document.querySelector('[data-testid=wo-state]')?.textContent || ''));
    nx = await page.locator('[data-testid=wo-next]').innerText();
    ok('W-58', 'handed over: the technician sees the verification step as not theirs (separation of duties)', /VERIFYING → RESOLVED/.test(nx) && /not your authority/.test(nx) && (await page.locator('[data-testid=wo-next] button').count()) === 0);

    await signIn('cxeng');
    await page.goto(base + `#/service/${woCode}`); await page.waitForSelector('[data-testid=work-order]');
    await page.click('[data-testid=wo-next] button:has-text("Verify")'); await page.waitForSelector('.ui-drawer'); await page.fill('.ui-drawer textarea', 'retested in a call (synthetic)'); await page.click('.ui-drawer button:has-text("Record the verification")');
    await page.waitForFunction(() => /RESOLVED/.test(document.querySelector('[data-testid=wo-state]')?.textContent || ''));
    await signIn('svcmgr');
    await page.goto(base + `#/service/${woCode}`); await page.waitForSelector('[data-testid=work-order]');
    await page.click('[data-testid=wo-next] button:has-text("Close")'); await page.waitForSelector('.ui-drawer'); await page.fill('.ui-drawer textarea', 'done'); await page.click('.ui-drawer button:has-text("Close")');
    await page.waitForSelector('.ui-drawer [role=alert], .ui-drawer .ui-error, .ui-drawer .ui-problem', { timeout: 5000 }).catch(() => {});
    const refusal = await page.locator('.ui-drawer').innerText();
    ok('W-59', 'closing a High-severity job without the requester’s confirmation is refused in the drawer with the policy’s reason', /requester’s confirmation/.test(refusal), refusal.slice(0, 300));
    await page.check('.ui-drawer input[type=checkbox]'); await page.click('.ui-drawer button:has-text("Close")');
    await page.waitForFunction(() => /CLOSED/.test(document.querySelector('[data-testid=wo-state]')?.textContent || ''));
    const roomIssue = h.asSuper(`SELECT state FROM app.room_issue WHERE code = '${iss}'`);
    ok('W-60', 'closed with confirmation; the deficiency stays OPEN and the record says closing never passes a test', roomIssue === 'OPEN' && /never passes a test/.test(await page.locator('[data-testid=wo-next]').innerText()));
    await shot('14-work-order-closed');
  }

  // ---------------------------------------------------------------- APEX (P6-B): open a case from the room's deficiency, act, read the outcomes
  {
    const c = client(h.base); const tk = {}; for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng']) tk[r] = await c.login(r);
    const rm = (await c.call('POST', '/v1/rooms', { token: tk.designer, body: { name: 'APEX Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 7 } })).body.code;
    await c.call('POST', `/v1/rooms/${rm}/revisions`, { token: tk.designer, body: { reason: 'apex' } }); await c.call('POST', `/v1/rooms/${rm}/drawings/generate`, { token: tk.designer });
    await c.call('POST', `/v1/rooms/${rm}/drawings/plan/approve`, { token: tk.syseng }); await c.call('POST', `/v1/rooms/${rm}/classification/approve`, { token: tk.syseng, body: {} });
    for (const [to, t] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) await c.call('POST', `/v1/rooms/${rm}/lifecycle`, { token: tk[t], body: { to } });
    const rows = (await c.call('GET', `/v1/rooms/${rm}`, { token: tk.designer })).body.commissioning.rows;
    const rowT = rows.find((x) => x.applicable && /display/i.test(x.label || '')) || rows.find((x) => x.applicable);
    const ev = (await c.call('POST', '/v1/evidence', { token: tk.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
    await c.call('POST', `/v1/rooms/${rm}/results`, { token: tk.cxeng, body: { testId: rowT.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: rowT.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } });

    await signIn('cxeng');
    await page.goto(base + `#/rooms/${rm}/issues`); await page.waitForSelector('.ui-table');
    await page.click('.ui-table button:has-text("Open APEX case")'); await page.waitForSelector('[data-testid=apex-case]');
    ok('W-64', 'the commissioning lead opens an APEX case from the room’s deficiency and lands on it', /#\/apex\/APX-\d{4}$/.test(page.url()), page.url());
    const layers = await page.locator('[data-testid=layers]').innerText();
    ok('W-65', 'the seven layers are shown; the physical layer cites the room’s planned assets (PA-…)', (await page.locator('.apex__layer').count()) === 7 && /cites PA-\d{4}/.test(layers), layers.slice(0, 200));
    await page.click('[data-testid=tiers] button:has-text("A2")'); await page.waitForFunction(() => /COMPARED/.test(document.querySelector('[data-testid=apex-log]')?.textContent || ''));
    await page.click('[data-testid=tiers] button:has-text("A4")'); await page.waitForFunction(() => /BLOCKED/.test(document.querySelector('[data-testid=apex-log]')?.textContent || ''));
    const log = await page.locator('[data-testid=apex-log]').innerText();
    ok('W-66', 'A2 compares read-only (no baseline → NOT_VERIFIED) and A4 is BLOCKED with the reason; both are outcomes in the log', /COMPARED/.test(log) && /BLOCKED/.test(log) && /owner approval missing|unsigned|human-led|no runbook/i.test(log), log.slice(0, 300));
    await page.fill('[data-testid=review] input', 'reviewed in the browser (synthetic)'); await page.click('[data-testid=review] button:has-text("Record the review")');
    await page.waitForFunction(() => /reviewed in the browser/.test(document.querySelector('[data-testid=review]')?.textContent || ''));
    ok('W-67', 'the verdict is recorded on the case and the case list marks it reviewed', (await page.locator('[data-testid=review] [role=status]').count()) === 1);
    await shot('16-apex-case');
  }

  // ---------------------------------------------------------------- Field Intelligence (P7): licence, proposal, the preflight by three roles, authorization, arming by the consenting operator, the simulated run
  {
    const c = client(h.base); const tk = {}; for (const r of ['secadmin', 'syseng', 'opslead', 'service', 'cxeng']) tk[r] = await c.login(r);
    await c.call('POST', '/v1/field-intelligence/licences', { token: tk.secadmin, body: { siteCode: 'SITE-NORTH', archetype: 'HUD', granted: true, note: 'browser test (synthetic)' } });
    await signIn('syseng');
    await page.goto(base + `#/rooms/${code}/field`); await page.waitForSelector('[data-testid=room-field]');
    await page.click('[data-testid=room-field] button:has-text("Propose a Physical Validation session")'); await page.waitForSelector('[data-testid=fi-session]');
    ok('W-68', 'the systems engineer proposes a v1.4 session from the room and lands on it as DRAFT', /#\/field\/sessions\/FIS-\d{4}$/.test(page.url()) && /DRAFT/.test(await page.locator('[data-testid=fi-state]').innerText()), page.url());
    const fisCode = page.url().split('/').pop();
    await page.click('[data-testid=fi-actions] button:has-text("Check eligibility")'); await page.waitForFunction(() => /SAFETY_PREFLIGHT/.test(document.querySelector('[data-testid=fi-state]')?.textContent || ''));
    await page.click('[data-testid=fi-actions] button:has-text("Approve the protocol")'); await page.waitForFunction(() => /Still missing/.test(document.body.textContent || '') && !/Approve the protocol/.test(document.body.textContent || ''), null, { timeout: 10000 }).catch(() => {});
    const missing = await page.locator('.page').innerText();
    ok('W-69', 'licensed: eligibility passes, the protocol is approved and the page lists what is still missing (window, operator, instrument, E-stop)', /maintenance window/.test(missing) && /operator consent/.test(missing) && !/Approve the protocol/.test(missing), missing.replace(/\s+/g, ' ').slice(0, 600));
    await signIn('opslead'); await page.goto(base + `#/field/sessions/${fisCode}`); await page.waitForSelector('[data-testid=fi-actions]');
    await page.check('[data-testid=fi-actions] input[type=checkbox] >> nth=1'); await page.click('[data-testid=fi-actions] button:has-text("Reserve the window")'); await page.waitForFunction(() => !/Reserve the window/.test(document.querySelector('[data-testid=fi-actions]')?.textContent || ''));
    await signIn('service'); await page.goto(base + `#/field/sessions/${fisCode}`); await page.waitForSelector('[data-testid=fi-actions]');
    await page.check('[data-testid=fi-actions] input[type=checkbox] >> nth=0'); await page.check('[data-testid=fi-actions] input[type=checkbox] >> nth=1'); await page.click('[data-testid=fi-actions] button:has-text("Consent as local operator")');
    await page.waitForFunction(() => !/Consent as local operator/.test(document.querySelector('[data-testid=fi-actions]')?.textContent || ''));
    await page.fill('[data-testid=fi-actions] input >> nth=0', 'SLM class 1'); await page.fill('[data-testid=fi-actions] input >> nth=1', 'SLM-9'); await page.fill('[data-testid=fi-actions] input >> nth=2', 'CAL-1'); await page.fill('[data-testid=fi-actions] input[type=date]', '2027-01-01');
    await page.click('[data-testid=fi-actions] button:has-text("Register the instrument")'); await page.waitForFunction(() => !/Register the instrument/.test(document.querySelector('[data-testid=fi-actions]')?.textContent || ''));
    await page.check('[data-testid=fi-actions] input[type=checkbox]'); await page.click('[data-testid=fi-actions] button:has-text("Verify the E-stop")'); await page.waitForFunction(() => /DRY_RUN/.test(document.querySelector('[data-testid=fi-state]')?.textContent || ''));
    await page.click('[data-testid=fi-actions] button:has-text("Dry run")'); await page.waitForFunction(() => /APPROVAL_PENDING/.test(document.querySelector('[data-testid=fi-state]')?.textContent || ''));
    ok('W-70', 'window (operations), operator consent, instrument and E-stop (technician): the preflight completes and the dry run leaves the session awaiting authorization', /Awaiting the commissioning lead/.test(await page.locator('[data-testid=fi-actions]').innerText()));
    await signIn('cxeng'); await page.goto(base + `#/field/sessions/${fisCode}`); await page.waitForSelector('[data-testid=fi-actions]');
    await page.click('[data-testid=fi-actions] button:has-text("Authorize the session")'); await page.waitForFunction(() => /Only the consenting local operator can arm/.test(document.querySelector('[data-testid=fi-actions]')?.textContent || ''));
    await signIn('service'); await page.goto(base + `#/field/sessions/${fisCode}`); await page.waitForSelector('[data-testid=fi-arm]');
    await page.check('[data-testid=fi-arm] input[type=checkbox] >> nth=0'); await page.check('[data-testid=fi-arm] input[type=checkbox] >> nth=1'); await page.click('[data-testid=fi-arm] button:has-text("Arm")');
    await page.waitForFunction(() => /ARMED/.test(document.querySelector('[data-testid=fi-state]')?.textContent || ''));
    await page.click('[data-testid=fi-run] button:has-text("Start the simulated run")'); await page.waitForFunction(() => /RUNNING/.test(document.querySelector('[data-testid=fi-state]')?.textContent || ''));
    const st = await page.locator('[data-testid=fi-state]').innerText(); const res = await page.locator('[data-testid=fi-results]').innerText();
    ok('W-71', 'the commissioning lead authorizes; the consenting technician arms with two confirmations and the run is labelled SIMULATION, recording no values', /SIMULATION/.test(st) && /no value \(simulator\)/.test(res), `${st} | ${res.slice(0, 120)}`);
    await page.click('[data-testid=fi-run] button:has-text("EMERGENCY STOP")'); await page.waitForFunction(() => /ABORTED/.test(document.querySelector('[data-testid=fi-state]')?.textContent || ''));
    await shot('17-field-intelligence-session');
  }

  // ---------------------------------------------------------------- Learn and SIGNAL (P8): lessons with a check, a drill, both recorded as training; a reviewed case through three roles
  await signIn('service');
  await page.goto(base + '#/learn/lessons'); await page.waitForSelector('[data-testid=lessons] .svc__list li');
  await page.click('[data-testid=lessons] .svc__list li >> nth=0 >> a'); await page.waitForSelector('[data-testid=lesson]');
  const lessonText = await page.locator('[data-testid=lesson]').innerText();
  ok('W-72', 'a SIGNAL lesson opens from the library with its cards and its check', lessonText.length > 200 && (await page.locator('[data-testid=quiz]').count()) === 1, lessonText.slice(0, 120));
  const nQ = await page.locator('[data-testid=quiz] .learn__opts').count();
  for (let i = 0; i < nQ; i++) await page.click(`[data-testid=quiz] .learn__opts >> nth=${i} >> button >> nth=0`);
  await page.waitForFunction(() => /a check of understanding, not a credential/.test(document.querySelector('[data-testid=quiz]')?.textContent || ''));
  await page.goto(base + '#/learn/drills'); await page.waitForSelector('[data-testid=drills] .svc__list li');
  await page.click('[data-testid=drills] .svc__list li >> nth=0 >> a'); await page.waitForSelector('[data-testid=drill]');
  await page.click('[data-testid=drill] .learn__stages button >> nth=0'); await page.waitForSelector('[data-testid=drill] [role=status], [data-testid=drill] [role=alert]');
  await page.waitForFunction(() => /done 1×/.test(document.querySelector('[data-testid=drills]')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
  const trained = Number(h.asSuper("SELECT count(*) FROM app.training_record WHERE person_id = (SELECT id FROM app.person WHERE email = 'service@empathia-demo.empathia.invalid')"));
  ok('W-73', 'the completed check and the first-failure drill are recorded as training for the person (never authority)', trained === 2 && /done 1×/.test(await page.locator('[data-testid=drills]').innerText()), String(trained));
  await page.goto(base + '#/learn/reference'); await page.waitForSelector('[data-testid=glossary] li'); await page.fill('[data-testid=reference] input', 'headroom'); await page.waitForTimeout(200);
  ok('W-74', 'the reference searches the glossary and the formulas', /Headroom/i.test(await page.locator('[data-testid=glossary]').innerText()));
  {
    // a case from the closed work order of the ServiceHands walkthrough: the commissioning lead proposes, the DSP engineer reviews, the steward approves
    const c = client(h.base); const cx = await c.login('cxeng'); const woClosed = h.asSuper("SELECT code FROM app.work_order WHERE state = 'CLOSED' ORDER BY closed_at DESC LIMIT 1");
    await signIn('cxeng'); await page.goto(base + `#/service/${woClosed}`); await page.waitForSelector('[data-testid=propose-case]');
    await page.fill('[data-testid=propose-case] input >> nth=0', 'Camera dropped after a cable fault'); await page.fill('[data-testid=propose-case] textarea', 'A reseated cable needs a readback on the network before the room is returned.');
    await page.check('[data-testid=propose-case] input[type=checkbox] >> nth=0'); await page.check('[data-testid=propose-case] input[type=checkbox] >> nth=1');
    await page.click('[data-testid=propose-case] button:has-text("Propose")'); await page.waitForFunction(() => /proposed — it now needs a subject-matter review/.test(document.body.textContent || ''));
    const lcCode = h.asSuper("SELECT code FROM app.learn_case ORDER BY proposed_at DESC LIMIT 1");
    await page.goto(base + '#/learn/cases'); await page.waitForSelector('[data-testid=learn-cases] .ui-table'); await page.click(`a:has-text("${lcCode}")`); await page.waitForSelector('[data-testid=learn-case]');
    ok('W-75', 'the proposer sees the case awaiting a reviewer other than themselves (no review button)', /Awaiting a subject-matter reviewer/.test(await page.locator('[data-testid=learn-case]').innerText()) && (await page.locator('[data-testid=learn-case] button').count()) === 0);
    await signIn('dsp_eng'); await page.goto(base + '#/learn/cases'); await page.waitForSelector('[data-testid=learn-cases] .ui-table'); await page.click(`a:has-text("${lcCode}")`); await page.waitForSelector('[data-testid=learn-case] button:has-text("Approve as SME")');
    await page.fill('[data-testid=learn-case] input', 'reviewed (synthetic)'); await page.click('[data-testid=learn-case] button:has-text("Approve as SME")'); await page.waitForFunction(() => /SME_REVIEWED/.test(document.querySelector('[data-testid=learn-case]')?.textContent || ''));
    await signIn('steward'); await page.goto(base + '#/learn/cases'); await page.waitForSelector('[data-testid=learn-cases] .ui-table'); await page.click(`a:has-text("${lcCode}")`); await page.waitForSelector('[data-testid=learn-case] button:has-text("Approve as steward")');
    await page.click('[data-testid=learn-case] button:has-text("Approve as steward")'); await page.waitForFunction(() => /APPROVED/.test(document.querySelector('[data-testid=learn-case]')?.textContent || ''));
    ok('W-76', 'SME review (DSP engineer) then the steward’s approval: the case is APPROVED and the database agrees', h.asSuper(`SELECT state FROM app.learn_case WHERE code = '${lcCode}'`) === 'APPROVED');
    void cx;
    await shot('18-learn-case');
  }

  // ---------------------------------------------------------------- Competency records (ADR-0009): the manager records, the steward verifies
  await signIn('svcmgr'); await page.goto(base + '#/learn/competencies'); await page.waitForSelector('[data-testid=record-competency]');
  const southId = h.asSuper("SELECT id FROM app.person WHERE email = 'service-south@empathia-demo.empathia.invalid'");
  const rc = '[data-testid=record-competency]';
  await page.selectOption(`${rc} select >> nth=0`, southId); await page.selectOption(`${rc} select >> nth=1`, 'cert.control');
  await page.fill(`${rc} input >> nth=0`, 'Synthetic Credentialing Body'); await page.fill(`${rc} input >> nth=1`, 'SYN-W79-CTL');
  await page.fill(`${rc} input >> nth=2`, '2026-06-01'); await page.fill(`${rc} input >> nth=3`, '2028-06-01');
  await page.click(`${rc} button:has-text("Record credential")`);
  await page.waitForFunction(() => /PENDING VERIFICATION/.test(document.querySelector('[data-testid=learn-competencies] .ui-table')?.textContent || ''));
  const compId = h.asSuper("SELECT id FROM app.competency_record WHERE reference = 'SYN-W79-CTL'");
  ok('W-79', 'the service manager records a credential: it is pending and counts for nothing; the recorder is offered no Verify', h.asSuper(`SELECT state FROM app.competency_record WHERE id = '${compId}'`) === 'PENDING_VERIFICATION'
    && await (async () => { await page.click(`[data-testid=learn-competencies] tr:has-text("Control programming") a`); await page.waitForSelector('[data-testid=competency]'); return (await page.locator('[data-testid=competency] button:has-text("Verify")').count()) === 0 && /Awaiting the data steward/.test(await page.locator('[data-testid=competency]').innerText()); })());
  await signIn('steward'); await page.goto(base + '#/learn/competencies'); await page.waitForSelector('[data-testid=learn-competencies] .ui-table');
  await page.click(`[data-testid=learn-competencies] tr:has-text("Control programming") a`); await page.waitForSelector('[data-testid=competency] button:has-text("Verify")');
  await page.fill('[data-testid=competency] input', 'checked against the issuer register (synthetic)'); await page.click('[data-testid=competency] button:has-text("Verify")');
  await page.waitForFunction(() => /verified by/.test(document.querySelector('[data-testid=competency]')?.textContent || ''));
  ok('W-80', 'the data steward verifies it (not the recorder, not the holder); the record names both and it now counts for dispatch', h.asSuper(`SELECT state FROM app.competency_record WHERE id = '${compId}'`) === 'VERIFIED' && /Recorded by\s*Service Manager/i.test(await page.locator('[data-testid=competency]').innerText()));
  await shot('20-learn-competencies');

  // ---------------------------------------------------------------- Executive passports (P6-C)
  await signIn('opslead');
  await page.goto(base + '#/reports'); await page.waitForSelector('[data-testid=to-executive]'); await page.click('[data-testid=to-executive]'); await page.waitForSelector('[data-testid=exec-grid]');
  const tiles = await page.locator('.exec__tile').count(); const gridText = await page.locator('[data-testid=exec-grid]').innerText();
  const nmTiles = await page.locator('.exec__tile.nm').allInnerTexts();
  ok('W-61', 'the executive board shows 27 passports; every unmeasurable one says so with a reason and shows no figure; committed funds are shown by currency', tiles === 27 && nmTiles.length > 0 && nmTiles.every((t) => /not measurable/.test(t) && !/\d+%|\d+ \w+ · /.test(t)) && /USD 18,000/.test(gridText), gridText.slice(0, 200));
  await page.click('.exec__tile >> nth=0'); await page.waitForSelector('[data-testid=passport]');
  const pp = await page.locator('[data-testid=passport]').innerText();
  ok('W-62', 'a passport opens with its definition, arithmetic, window, coverage, freshness and confidence', /Numerator \/ denominator/.test(pp) && /Window/.test(pp) && /Confidence/.test(pp) && /Source/.test(pp));
  await page.click('[data-testid=exec-window] button:has-text("30 days")'); await page.waitForFunction(() => /last 30 days/.test(document.querySelector('.page__head')?.textContent || ''));
  ok('W-63', 'the window changes the board (30 days) and the selection resets', (await page.locator('[data-testid=passport]').count()) === 0);
  await shot('15-executive-passports');

  // ---------------------------------------------------------------- Mission Control with the walkthroughs' records behind it
  await signIn('svcmgr'); await page.goto(base + '#/home'); await page.waitForSelector('[data-testid=mission-actions]');
  const mcText = await page.locator('[data-testid=mission]').innerText();
  const mcHrefs = await page.locator('[data-testid=mission-actions] a.mission__item').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  const mcHead = Number((/^(\d+) steps? needs? you/m.exec(mcText) || [])[1] || 0);
  ok('W-78', 'the service manager’s Mission Control headline counts exactly the listed steps, each opens its record, and the scan line names what was read', mcHead > 0 && mcHead === mcHrefs.length && mcHrefs.every((h) => /^#\/(rooms|projects|service|apex|field|learn)\b/.test(h || '')) && /Scanned: .*work orders/.test(mcText), mcText.slice(0, 200));
  await shot('19-mission-control');

  // ---------------------------------------------------------------- hygiene
  ok('W-18', 'no page errors or unexpected console errors', errors.length === 0, errors.join(' | '));
  ok('W-19', 'no request left 127.0.0.1 (web app and API only)', external.length === 0, external.join(' '));
  const csp = (await (await fetch(`http://127.0.0.1:${WEB}/`)).headers.get('content-security-policy')) || '';
  ok('W-20', 'the web server sends a CSP that allows only itself and the API', csp.includes(`connect-src 'self' ${h.base}`) && csp.includes("script-src 'self'"), csp);

  // ---------------------------------------------------------------- phone width
  const phone = await b.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(base); await phone.waitForSelector('[data-testid=signin]');
  const wide = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok('W-21', 'the sign-in page has no horizontal scroll at phone width', !wide);
} finally {
  await b.close(); web.close(); await h.app.stop();
}
fs.writeFileSync(path.join(out, 'RESULTS.json'), JSON.stringify({ test: 'enterprise-web', at: new Date().toISOString(), passed: results.filter((r) => r.result === 'PASS').length, failed, results }, null, 2));
console.log(`\n${results.length - failed}/${results.length} PASS${failed ? ` — ${failed} FAIL` : ''}`);
process.exit(failed ? 1 : 0);
