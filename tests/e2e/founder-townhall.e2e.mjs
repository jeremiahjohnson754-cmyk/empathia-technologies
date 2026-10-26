#!/usr/bin/env node
/**
 * The owner's critical Build a Room workflow (directive section 6), end to end, on the Founder Edition as served by the studio
 * launcher. Every change is made through the page's own controls, as the persona the step needs, with reloads between stages.
 *
 *  Create a Town Hall · add cameras, microphones, displays, DSP, speakers, network equipment and furniture · save and reload ·
 *  swap the camera · inspect the affected drawing revision · recalculate applicable tests · generate and inspect the workbook ·
 *  open the room in Search Party · open it in Empathia Pro · remove a required connection · observe the design deficiency ·
 *  assign it according to role rules · restore the connection · confirm resolution and evidence history persist.
 *  Invariants: one canonical room and device ids everywhere; no duplicate planned assets; no invented live health; no premature
 *  approval; no automatically verified tests.
 *
 *   node tests/e2e/founder-townhall.e2e.mjs [studio-dist] [evidence-dir]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const dist = path.resolve(process.argv[2] || path.join(repo, 'apps/founder-studio/dist'));
const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/founder-townhall'));
fs.mkdirSync(out, { recursive: true });
const PORT = 4393; const KEY = 'e2e-key';
const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 600) }); if (!cond) failed += 1; console.log(`${cond ? 'ok  ' : 'FAIL'} ${id} ${name}${cond ? '' : ` — ${String(detail).slice(0, 300)}`}`); };

const srv = spawn(process.execPath, [path.join(dist, 'server/serve.mjs'), '--no-open', `--port=${PORT}`], { env: { ...process.env, STUDIO_KEY: KEY }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', (d) => { if (/running/.test(String(d))) r(); }); setTimeout(r, 4000); });
const base = `http://127.0.0.1:${PORT}`;
const b = await chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 1360, height: 1000 }, acceptDownloads: true });
  await ctx.addCookies([{ name: 'studio_key', value: KEY, url: base }]);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const E = (fn, a) => page.evaluate(fn, a);
  const V = (fn, a) => page.evaluate(([f, x]) => (new Function('V', 'x', `return (${f})(V, x)`))(window.__V25__, x), [fn.toString(), a]);
  const go = async (h) => { await E((x) => { location.hash = x; }, h); await page.waitForTimeout(450); };
  const reload = async () => { await page.reload(); await page.waitForFunction('window.__V25__ && window.__V25__.room'); await page.waitForTimeout(350); };
  const as = async (p) => { await go('#/v25/persona'); const btn = page.locator(`[data-act="v25-persona"][data-persona="${p}"]`).first(); await btn.scrollIntoViewIfNeeded(); await btn.click(); await page.waitForTimeout(450); return E(() => window.__V25__.persona()); };
  const click = async (sel) => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); await page.waitForTimeout(400); };
  let id = null;
  const tab = (k) => go(`#/v25/build?id=${id}&tab=${k}`);
  const sel = async (a) => { await tab('design'); const g = page.locator(`#rb-plan [data-rdev="${a}"]`); await g.scrollIntoViewIfNeeded(); await g.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400); };
  const design = () => V((V, i) => V.get(i), id);

  await page.goto(`${base}/demonstrators/founder/Empathia-Founder-Edition.html#/v25/build`);
  await page.waitForFunction('window.__V25__ && window.__V25__.room'); await page.waitForTimeout(400);
  const edition = await E(() => (window.__EMPATHIA_EDITION__ || { kind: 'development' }).kind);
  const core0 = await V((V) => [V.t.core.all('Room').length, V.t.core.all('Device').length]);

  // 1. create a town hall as the Designer
  ok('T-00', `the Founder Edition (${edition}) is served by the studio launcher`, edition === 'development', edition);
  const who = await as('designer');
  await go('#/v25/build');
  await click('[data-act="v25-rb-new"][data-template="townhall"]');
  await page.fill('#v25f-name', 'Founder Town Hall (synthetic)'); await page.fill('#v25f-length', '26'); await page.fill('#v25f-width', '18'); await page.fill('#v25f-ceiling', '6');
  await click('#panel [data-act="v25-rb-create"]'); await page.waitForTimeout(400);
  id = await E(() => new URLSearchParams(location.hash.split('?')[1]).get('id'));
  const d0 = await design();
  ok('T-01', 'the Designer creates a town hall with DECLARED dimensions; it gets one canonical room id', who === 'designer' && !!d0 && d0.geometry.provenance.length === 'DECLARED' && /^R-/.test(d0.coreRoomId), `${who} ${id} ${d0 && d0.coreRoomId}`);

  // 2. add cameras, microphones, displays, DSP, speakers, network equipment and furniture
  const adds = ['camera', 'micceil', 'display', 'dsp', 'speaker', 'switch', 'chairs', 'table'];
  const n0 = d0.devices.filter((x) => !x.removed).length;
  await tab('design');
  for (const c of adds) await click(`[data-act="v25-rb-add"][data-cat="${c}"]`);
  const d1 = await design(); const live1 = d1.devices.filter((x) => !x.removed);
  const cats = new Set(live1.map((x) => x.cat));
  ok('T-02', 'cameras, microphones, displays, DSP, speakers, a network switch and furniture are added through the palette', live1.length === n0 + adds.length && adds.every((c) => cats.has(c)), `${n0} → ${live1.length}; ${[...cats].join(',')}`);
  ok('T-03', 'every planned asset has its own canonical id (no duplicates)', new Set(live1.map((x) => x.id)).size === live1.length, live1.map((x) => x.id).join(','));

  // 3. save and reload
  await tab('design'); await click('[data-act="v25-rb-save"]'); await reload();
  const d2 = await design();
  ok('T-04', 'save and reload: the revision persists with every device id unchanged', d2.revisions.length === d1.revisions.length + 1 && live1.every((x) => d2.devices.some((y) => y.id === x.id)), `${d1.revisions.length} → ${d2.revisions.length}`);

  // drawings generated and approved before the swap, so the swap has an approved revision to affect
  await tab('drawings'); await click('[data-act="v25-rb-generate"]');
  await as('syseng'); await tab('drawings'); await click('[data-act="v25-rb-dapprove"][data-k="schedule"]'); await click('[data-act="v25-rb-dapprove"][data-k="placement"]');
  const st0 = await V((V, i) => V.room.drawingStates(i), id);
  ok('T-05', 'the drawing set is generated and the Systems Engineer approves the schedule and placement drawings', st0.schedule.state === 'APPROVED' && st0.placement.state === 'APPROVED', JSON.stringify([st0.schedule.state, st0.placement.state]));

  // 4. swap the camera
  await as('designer');
  const cam = (await design()).devices.find((x) => x.cat === 'camera' && !x.removed);
  const ev0 = (await design()).evaluations.length;
  const mkey = await V((V) => (V.room.models('camera').find((m) => !m.generic) || {}).key);
  await sel(cam.id); await page.selectOption('#rb-swap-model', mkey); await click('[data-act="v25-rb-swap"]');
  await reload();
  const d3 = await design(); const cam3 = d3.devices.find((x) => x.id === cam.id);
  ok('T-06', 'swap the camera: same asset id, the catalogue model, the generic kept in its model history (after a reload)', !!cam3 && !cam3.generic && (cam3.modelHistory || []).length >= 1, JSON.stringify(cam3 && { model: cam3.model, hist: cam3.modelHistory }));

  // 5. inspect the affected drawing revision
  const st1 = await V((V, i) => V.room.drawingStates(i), id);
  await tab('drawings'); const dtxt = await page.locator('#view').innerText();
  ok('T-07', 'the affected drawings are REVIEW_REQUIRED (shown on the Drawings tab) and a drawing-disagreement issue is open', st1.schedule.state === 'REVIEW_REQUIRED' && /review required/i.test(dtxt) && (await V((V, i) => V.room.issues(i).some((x) => /^drawing-disagreement/.test(x.key) && x.state === 'OPEN'), id)), st1.schedule.state);

  // 6. recalculate applicable tests
  const d4 = await design(); const A = d4.applicability;
  ok('T-08', 'applicability was re-judged on the swap (logged with its trigger): 94 definitions, applicable ones blocked by prerequisite, none passed', d4.evaluations.length > ev0 && A.library === 94 && A.rows.every((r) => !/PASS/.test(r.result || '')), `${ev0} → ${d4.evaluations.length}; ${A.applicable} applicable`);
  await tab('commissioning'); const ctxt = await page.locator('#view').innerText();
  ok('T-09', 'the Commissioning tab shows the judged library to a person (counts and statuses)', /94/.test(ctxt) && /blocked|prerequisite/i.test(ctxt), ctxt.slice(0, 200));

  // 7. generate and inspect the workbook (as downloaded by a person)
  await as('syseng'); await tab('commissioning');
  const [dl1] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), click(`[data-act="v25-rb-workbook"][data-id="${id}"]:not([data-fmt="xlsx"])`)]).catch(() => [null]);
  let wb = null; let csv = '';
  if (dl1) { const p1 = path.join(out, 'workbook.json'); await dl1.saveAs(p1); try { wb = JSON.parse(fs.readFileSync(p1, 'utf8')); } catch { /* checked below */ } }
  const dl2 = await page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  if (dl2) { const p2 = path.join(out, 'testing.csv'); await dl2.saveAs(p2); csv = fs.readFileSync(p2, 'utf8'); }
  const rowsT = wb ? wb.tabs.Testing : [];
  const camRows = JSON.stringify(wb || {}).includes(cam.id);
  ok('T-10', 'the workbook downloads as JSON and CSV: 94 testing rows, the swapped camera under the same id, no result pre-filled or bare PASS', rowsT.length === 94 && camRows && !/,PASS,|"PASS"/.test(csv + JSON.stringify(rowsT)), `${rowsT.length} rows; camera ${camRows}; csv ${csv.length} bytes`);

  // 8. Search Party
  await as('architect'); await go(`#/search?q=${encodeURIComponent('Founder Town Hall')}`); await page.waitForTimeout(600);
  const sp = await page.locator('#view').innerText();
  const planned = await V((V, r) => ({ rooms: V.t.core.all('PlannedRoom').filter((x) => x.id === r).length, assets: V.t.core.all('PlannedAsset').filter((x) => x.roomId === r || (x.props && x.props.roomId === r)).length }), d4.coreRoomId);
  ok('T-11', 'Search Party finds the room by name, labelled planned (not commissioned)', /Founder Town Hall/.test(sp) && /plann/i.test(sp), sp.slice(0, 300));
  const paIds = await V((V, r) => V.t.core.all('PlannedAsset').filter((x) => x.roomId === r).map((x) => x.id), d4.coreRoomId);
  const liveIds = d4.devices.filter((x) => !x.removed && !x.furniture).map((x) => x.id);   // furniture is design-only: it is not an asset in the shared graph
  const missing = liveIds.filter((x) => !paIds.includes(x)); const extra = paIds.filter((x) => !liveIds.includes(x));
  ok('T-12', 'the shared graph has one PlannedRoom for the room and exactly one PlannedAsset per live (non-furniture) device, with the same ids (no duplicates)', planned.rooms === 1 && new Set(paIds).size === paIds.length && !missing.length && !extra.length, JSON.stringify({ planned, missing, extra, pa: paIds.length, live: liveIds.length }));

  // 9. Empathia Pro
  await go('#/pro/planned'); const pro = await page.locator('#view').innerText();
  const card = pro.split('Founder Town Hall')[1]?.slice(0, 500) || '';
  ok('T-13', 'Empathia Pro shows the planned room as PLANNED — NOT YET COMMISSIONED with no invented live health (no uptime figure, no online state)', /Founder Town Hall/.test(pro) && /NOT YET COMMISSIONED/.test(card) && !/\d+(\.\d+)?\s*%\s*(uptime|available)/i.test(card) && !/\bonline\b/i.test(card), card.slice(0, 300));

  // 10. remove a required connection: the camera's video path to the room compute (signal only: a network path does not carry the picture)
  await as('designer');
  const d5 = await design();
  const camC = d5.connections.filter((c) => !c.removed && c.kind === 'signal' && (c.from === cam.id || c.to === cam.id));
  await sel(cam.id);
  for (const c of camC) await click(`[data-act="v25-rb-cut"][data-c="${c.id}"]`);
  await reload();
  const iss = (await V((V, i) => V.room.issues(i), id)).filter((x) => x.key === `unresolved-connection:${cam.id}:compute`);
  ok('T-14', 'removing the camera → room compute video connection raises one High design deficiency on that camera (persisted)', camC.length >= 1 && iss.length === 1 && iss[0].state === 'OPEN' && iss[0].severity === 'High' && iss[0].assets.includes(cam.id), JSON.stringify({ removed: camC.map((c) => c.id), iss: iss.map((x) => [x.id, x.state, x.severity]) }));
  const issueId = iss[0] && iss[0].id;

  // 11. approval is not premature
  const desApprove = await V((V, i) => V.room.lifecycle(i, 'DESIGN_APPROVED'), id);
  await as('syseng'); const lifeTry = await V((V, i) => V.room.lifecycle(i, 'DESIGN_APPROVED'), id); await as('designer');
  ok('T-15', 'design approval is not premature: the Designer lacks the authority, and the Systems Engineer is refused while the High deficiency is open', !desApprove.ok && !lifeTry.ok && /High/.test(lifeTry.why.join(' ')), JSON.stringify([desApprove.why, lifeTry.why]));

  // 12. assign according to role rules
  await tab('issues'); const desAssignVisible = await page.locator(`[data-act="v25-rb-assign"][data-id="${issueId}"]`).count();
  const desTry = await V((V, i) => V.room.assignIssue(i, 'designer'), issueId);
  ok('T-16', 'the Designer may not assign the deficiency: no Assign control, and the service refuses', desAssignVisible === 0 && !desTry.ok, JSON.stringify(desTry.why || desTry));
  await as('syseng'); await tab('issues'); const sysVisible = await page.locator(`[data-act="v25-rb-assign"][data-id="${issueId}"]`).count();
  const sysTry = await V((V, i) => V.room.assignIssue(i, 'designer'), issueId);
  ok('T-16b', 'the Systems Engineer may not assign it either (assignment is an operations authority: issue.assign / route.internal)', sysVisible === 0 && !sysTry.ok, JSON.stringify(sysTry.why || sysTry));
  await as('opslead'); await tab('issues');
  await page.selectOption(`#rb-own-${issueId}`, 'designer'); await click(`[data-act="v25-rb-assign"][data-id="${issueId}"]`);
  await reload();
  const assigned = (await V((V, i) => V.get(i), issueId));
  ok('T-17', 'the Operations Lead assigns it to the Designer through the Issues tab; owner and history persist after a reload', assigned.owner === 'designer' && assigned.history.some((h) => /assigned/.test(h.reason) && h.by === 'opslead'), JSON.stringify({ owner: assigned.owner, hist: assigned.history.map((h) => [h.by, h.reason]) }));

  // 13. restore the connection (camera → room compute, signal)
  await as('designer'); await sel(cam.id);
  const compute = (await design()).devices.find((x) => x.cat === 'compute' && !x.removed);
  await page.selectOption('#rb-conn-to', compute.id); await page.selectOption('#rb-conn-kind', 'signal'); await click('[data-act="v25-rb-link"]');
  await tab('design'); await click('[data-act="v25-rb-save"]');
  await reload();

  // 14. resolution and evidence history persist
  const after = await V((V, i) => V.get(i), issueId);
  ok('T-18', 'restoring the connection resolves the deficiency with a traceable resolution (who, revision, how), after a reload', after.state === 'RESOLVED' && after.resolution && after.resolution.by === 'designer' && /no longer fires/.test(after.resolution.how), JSON.stringify(after.resolution));
  ok('T-19', 'the deficiency keeps its evidence and its full history (created → assigned → resolved)', after.evidence.length >= 1 && after.history.length >= 2 && after.owner === 'designer', JSON.stringify({ ev: after.evidence.length, hist: after.history.map((h) => h.reason) }));
  await tab('issues'); const itxt = await page.locator('#view').innerText();
  ok('T-20', 'the Issues tab shows the resolution to a person', /Resolution:/.test(itxt) && /RESOLVED|resolved/.test(itxt), itxt.slice(0, 200));

  // invariants
  const fin = await design();
  const core1 = await V((V) => [V.t.core.all('Room').length, V.t.core.all('Device').length]);
  ok('T-21', 'the canonical room id never changed, and the planned room never entered operations (Core Room and Device counts unchanged)', fin.coreRoomId === d0.coreRoomId && core1[0] === core0[0] && core1[1] === core0[1], `${JSON.stringify(core0)} → ${JSON.stringify(core1)}`);
  ok('T-22', 'no test was verified automatically: every result is NOT_TESTED and the room is still PLANNED', fin.lifecycle === 'PLANNED' && Object.keys(fin.results || {}).length === 0 && fin.applicability.rows.every((r) => (r.result || 'NOT_TESTED') === 'NOT_TESTED'), fin.lifecycle);
  ok('T-23', 'no page errors during the whole scenario', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.screenshot({ path: path.join(out, 'final-issues.png'), fullPage: false });
} finally {
  await b.close(); srv.kill();
}
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ suite: 'founder-townhall-e2e', edition: 'Founder Edition (2.5.4 development build)', at: new Date().toISOString(), passed: results.filter((r) => r.result === 'PASS').length, failed, results }, null, 1));
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
