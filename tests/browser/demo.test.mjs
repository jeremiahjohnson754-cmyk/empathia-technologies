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
      const v = await page.evaluate(() => ({ h1: (document.querySelector('main h1') || {}).textContent || '', text: document.querySelector('main').innerText })); if (!(v.h1.length > 2 && /(Not migrated yet|Native page|Unknown address|interactive demonstration)/.test(v.text))) bad.push(`${hash}: ${v.h1}`); }
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
    await page.click('#tab-ledger'); await page.waitForTimeout(150);
    const led = await main();
    ok('B-16', 'the ledger records every refusal with its actor (DENIED rows) alongside the allowed changes', (led.match(/DENIED/g) || []).length >= 5 && (led.match(/ALLOWED/g) || []).length >= 10, `${(led.match(/DENIED/g) || []).length} denied`);
    await page.screenshot({ path: path.join(out, 'build-a-room.png'), fullPage: true });
    await page.reload(); await page.waitForTimeout(400);
    ok('B-17', 'the draft survives a reload on this computer and can be reset', /Harbour Huddle/.test(await main()));
    await page.click('button:has-text("Reset demonstration")'); await page.waitForTimeout(200);
    ok('B-18', 'reset returns to the description form', !!(await page.locator('#b-name').count()));
  }
  ok(`D-${tag}-07`, 'no page error, no console error, no request outside the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'demo.json'), JSON.stringify(summary, null, 1)); console.log(`\n${summary.pass} passed, ${summary.fail} failed`); process.exit(failed ? 1 : 0);
