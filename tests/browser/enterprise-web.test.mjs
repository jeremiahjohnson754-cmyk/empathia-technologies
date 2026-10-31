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
import { setup } from '../integration/harness.mjs';

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
    await page.waitForSelector('.who__role');
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
  await page.waitForSelector('.who__role');
  ok('W-03', 'the designer signs in; the role shown comes from /v1/me', (await page.textContent('.who__role')).startsWith('designer'));

  // ---------------------------------------------------------------- rooms list
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
  const navHasAdmin = await page.locator('.nav a', { hasText: 'Administration' }).count();
  ok('W-15', 'the systems engineer’s navigation has no Administration (no admin authority)', navHasAdmin === 0);
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
  await page.selectOption('[data-testid=role]', 'service'); await page.fill('[data-testid=email]', 'service-south@empathia-demo.empathia.invalid'); await page.fill('[data-testid=password]', 'empathia-dev-only'); await page.click('[data-testid=signin]'); await page.waitForSelector('.who__role');
  await page.goto(`${base}#/search`); await page.waitForSelector('#sp-q'); await page.fill('#sp-q', 'ATL'); await page.waitForTimeout(500);
  const southText = await page.locator('.sp__results').innerText();
  ok('W-27', 'a South-scoped technician searching the North building finds nothing: absent, not hidden (and the coverage note says site-scoped)', /Nothing in your view matches/.test(southText) && !/Atlas/.test(southText), southText.slice(0, 160));
  await signIn('syseng');

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
