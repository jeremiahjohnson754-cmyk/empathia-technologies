#!/usr/bin/env node
// The v1.8 proof slice in the investor demo, against the built dist: the Proof Center (#/proof), the QR Hub (#/scan) and the commissioning
// dossier (#/dossier). It checks the one thing the slice exists for — the same claim, word for word, on both public sites — and the
// engineering path behind it: label → passport → tests and evidence → refusals → deficiency → independent verification → acceptance →
// export, across three roles, with the negative cases (forged labels, forged stored acceptance, a role without the right).
// Run it in both schemes: PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/demo-proof.test.mjs
// Requirement ids: V18-PROOF-01/02 (registry-owned claim, separate dimensions), V18-T-PROOF-01, v1.6 QR Hub and Export Center.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { harness, repo } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-proof');
const REPORT = 'SIM-REPORT-2026-11-08-001'; const chunk = (reqs, name) => reqs.some((u) => new RegExp(`^chunks/${name}-`).test(u));
const clean = (t) => t.errs.length === 0 && t.off.length === 0;
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const totals = (p) => p.evaluate(() => Object.fromEntries(['pass', 'pending', 'fail', 'evidence'].map((k) => [k, document.querySelector(`[data-testid=dossier-${k}]`)?.innerText.replace(/\s+/g, ' ') || ''])));
const viewAs = async (p, role) => { await p.click(`[data-viewas=${role}]`); await p.waitForFunction((r) => document.documentElement.dataset.role === r, role, { timeout: 8000 }); await p.waitForSelector('[data-testid=dossier]', { timeout: 8000 }); await p.waitForTimeout(700); };

// ---- Proof Center: one registry, two sites ----
{ const t = await open('#/proof', { role: 'visitor' });
  const cards = await t.page.$$eval('[data-claim]', (els) => els.map((e) => ({ id: e.dataset.claim, state: e.dataset.state, rev: e.dataset.revision, text: e.querySelector('.pf-claim__text').textContent })));
  ok('PC-01', 'the Proof Center lists the six published claims, each with its state and revision', cards.length === 6 && cards.every((c) => c.id && c.state && c.rev) && clean(t), JSON.stringify(cards.map((c) => c.id)) + t.errs.join('|'));
  ok('PC-02', 'the page says in one line that nothing is verified on customer equipment and nothing is live', /None is verified on customer equipment, and none is live/.test(await main(t.page)));
  ok('PC-03', 'no claim is shown as live, lab verified or released (all data is synthetic)', cards.every((c) => !['LIVE_OBSERVING', 'LAB_VERIFIED', 'RELEASED_VERIFIED', 'CUSTOMER_AUTHORIZED'].includes(c.state)), JSON.stringify(cards.map((c) => c.state)));
  // the same claims on the corporate website: its shipped projection and the cards on its /proof page
  const site = path.join(repo, 'apps/website/dist');
  if (fs.existsSync(path.join(site, 'proof/claims.json'))) {
    const strip = (j) => j.claims.map(({ as_of, ...c }) => c);
    const a = strip(JSON.parse(fs.readFileSync(path.join(site, 'proof/claims.json'), 'utf8'))); const b = strip(JSON.parse(fs.readFileSync(path.join(repo, 'apps/demo/dist/proof/claims.json'), 'utf8')));
    ok('PC-04', 'both sites ship the same public projection of the registry, claim for claim (V18-T-PROOF-01)', JSON.stringify(a) === JSON.stringify(b) && a.length === 6);
    const html = fs.readFileSync(path.join(site, 'proof/index.html'), 'utf8'); const dec = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const siteCards = [...html.matchAll(/<article class="proof" data-claim="([^"]+)" data-state="([^"]+)" data-revision="([^"]+)">[\s\S]*?<p class="proof__text">([\s\S]*?)<\/p>/g)].map((m) => ({ id: m[1], state: m[2], rev: m[3], text: dec(m[4]) }));
    const same = siteCards.length === 6 && cards.every((c) => { const s = siteCards.find((x) => x.id === c.id); return s && s.state === c.state && s.rev === c.rev && s.text === c.text; });
    ok('PC-05', 'every claim reads identically on the website and in the demonstration: id, state, revision and wording', same, JSON.stringify(siteCards.map((c) => c.id)));
    ok('PC-06', 'the website’s home page leads with the same commissioning claim', new RegExp(`data-claim="DEMO-COMMISSION-001" data-state="SYNTHETIC_DEMO" data-revision="${cards.find((c) => c.id === 'DEMO-COMMISSION-001').rev}"`).test(fs.readFileSync(path.join(site, 'index.html'), 'utf8')));
    ok('PC-07', 'the projection carries no private field (tenant, verifier, owner, approval, scope)', b.every((c) => !['tenant_id', 'verifier_identity', 'owner', 'public_approval', 'scope', 'approved_derivative_ids'].some((k) => k in c)));
  } else console.log('NOT_RUN PC-04..07 the website is not built (node scripts/build.mjs)');
  await t.close(); }
{ const t = await open('#/proof/DEMO-COMMISSION-001', { role: 'architect' }); const m = await main(t.page);
  ok('PC-08', 'the commissioning claim states the dossier’s numbers and opens the dossier for a role that reads it', /27 of 32 acceptance tests pass, 3 are pending and 2 fail, 29 have an evidence record, and final acceptance is held/.test(m) && await t.page.locator(`a[href="#/dossier/${REPORT}"]`).count() === 1 && clean(t), m.slice(0, 200));
  await t.close(); }
{ const t = await open('#/proof/DEMO-COMMISSION-001', { role: 'visitor' });
  ok('PC-09', 'a role that cannot read the dossier is offered the asset passport instead, never a link to a refusal (D44)', await t.page.locator('a[href^="#/dossier"]').count() === 0 && await t.page.locator('a[href="#/scan/SIM-AV-0042"]').count() === 1);
  await t.close(); }
{ const t = await open('#/proof/NO-SUCH-CLAIM-1', { role: 'visitor' });
  ok('PC-10', 'an unknown or withdrawn claim id says it is not published, with the way back, and no error', await t.page.locator('[data-testid=proof-missing]').count() === 1 && /No published claim has that identifier/.test(await main(t.page)) && clean(t));
  await t.close(); }

// ---- QR Hub ----
{ const t = await open('#/scan/SIM-AV-0042', { role: 'architect' }); const m = await main(t.page);
  const acts = await t.page.$$eval('[data-testid=scan-actions] [data-action]', (e) => e.map((x) => x.dataset.action));
  ok('QR-01', 'the fixture identifier opens one passport: asset, room, serial, lifecycle, evidence and acceptance', await t.page.locator('[data-testid=scan-passport]').count() === 1 && /SIM-AV-0042/.test(m) && /DEMO-NOT-REAL/.test(m) && /29 of 32/.test(await t.page.innerText('[data-testid=scan-evidence]')) && /Held · 7 blockers/.test(await t.page.innerText('[data-testid=scan-acceptance]')) && clean(t), m.slice(0, 300));
  ok('QR-02', 'the Product Architect is offered all four actions', JSON.stringify(acts) === JSON.stringify(['scan.openTest', 'scan.attach', 'scan.issue', 'scan.export']), JSON.stringify(acts));
  ok('QR-03', 'the passport says it is synthetic and not connected', /Synthetic/.test(m) && /No device is contacted when a label is read/.test(m));
  // the drawn code is a real QR code of the fixture payload: screenshot it and decode it
  const png = path.join(repo, '.local/qa-scan-qr.png'); fs.mkdirSync(path.dirname(png), { recursive: true }); await t.page.locator('[data-testid=scan-qr]').screenshot({ path: png });
  const py = spawnSync('python3', ['-I', '-c', 'import sys,cv2\nimg=cv2.imread(sys.argv[1])\nout=""\nfor f in (1,4,2,3):\n    i=cv2.resize(img,None,fx=f,fy=f,interpolation=cv2.INTER_CUBIC)\n    i=cv2.copyMakeBorder(i,40,40,40,40,cv2.BORDER_CONSTANT,value=(255,255,255))\n    out=cv2.QRCodeDetector().detectAndDecode(i)[0]\n    if out: break\nprint(out)', png], { encoding: 'utf8' });
  if (py.status === 0) ok('QR-04', 'the label on screen decodes to the fixture text, which says NOT-LIVE and is not a web address', py.stdout.trim() === 'EMPATHIA-DEMO|v=1|tenant=corporate_demo|entity=asset|id=SIM-AV-0042|NOT-LIVE', py.stdout.trim());
  else console.log('NOT_RUN QR-04 the drawn label was not decoded (python3 with cv2 is not available here)');
  await t.close(); }
{ const t = await open('#/scan/SIM-AV-0042', { role: 'visitor' }); const m = await main(t.page);
  ok('QR-05', 'a visitor sees what the label names and where, and none of the technical record, acceptance or actions', await t.page.locator('[data-testid=scan-passport]').count() === 1 && !/DEMO-NOT-REAL|Lifecycle|Evidence records|Held/.test(m) && await t.page.locator('[data-testid=scan-actions]').count() === 0 && await t.page.locator('[data-testid=scan-actions-none]').count() === 1, m.slice(0, 300));
  await t.close(); }
{ const t = await open('#/scan/SIM-AV-0042', { role: 'employee' });
  const acts = await t.page.$$eval('[data-testid=scan-actions] [data-action]', (e) => e.map((x) => x.dataset.action));
  ok('QR-06', 'an employee can report a problem and nothing else', JSON.stringify(acts) === JSON.stringify(['scan.issue']), JSON.stringify(acts)); await t.close(); }
{ const t = await open('#/scan', { role: 'service' });
  const ask = async (v) => { await t.page.fill('[data-testid=scan-input]', v); await t.page.click('[data-testid=scan-go]'); await t.page.waitForTimeout(250); };
  const seen = {};
  for (const [k, v, sel] of [['replaced', 'SIM-AV-0031', '[data-testid=scan-replaced]'], ['revoked', 'SIM-AV-0017', '[data-testid=scan-revoked]'], ['expired', 'SIM-AV-0009', '[data-testid=scan-expired]'], ['unknown', 'SIM-AV-9999', '[data-testid=scan-notfound]'],
    ['foreign', 'EMPATHIA-DEMO|v=1|tenant=other_tenant|entity=asset|id=SIM-AV-0042|NOT-LIVE', '[data-testid=scan-notfound]'], ['version', 'EMPATHIA-DEMO|v=2|tenant=corporate_demo|entity=asset|id=SIM-AV-0042|NOT-LIVE', '[data-error=unsupported_version]'],
    ['extra', 'EMPATHIA-DEMO|v=1|tenant=corporate_demo|entity=asset|id=SIM-AV-0042|role=admin|NOT-LIVE', '[data-error=malformed]'], ['url', 'https://example.test/asset/SIM-AV-0042', '[data-error=not_a_demo_label]'], ['script', 'javascript:alert(1)', '[data-error=not_a_demo_label]'],
    ['markup', '<img src=x onerror=window.__pwned=1>', '[data-error=not_a_demo_label]']]) { await ask(v); seen[k] = await t.page.locator(sel).count() === 1 && await t.page.locator('[data-testid=scan-passport]').count() === 0; }
  ok('QR-07', 'replaced, withdrawn, expired and unknown labels each say so, and none opens a passport', seen.replaced && seen.revoked && seen.expired && seen.unknown, JSON.stringify(seen));
  ok('QR-08', 'another tenant’s label reads exactly as an unknown one; whether it exists elsewhere is not disclosed', seen.foreign, JSON.stringify(seen));
  ok('QR-09', 'a forged label (extra field, wrong version), a web address, a script address and markup are refused and never opened', seen.version && seen.extra && seen.url && seen.script && seen.markup && !(await t.page.evaluate(() => window.__pwned)) && clean(t), JSON.stringify(seen) + t.errs.join('|'));
  await ask('SIM-AV-0031'); await t.page.click('[data-testid=scan-replaced] a'); await t.page.waitForSelector('[data-testid=scan-passport]');
  ok('QR-10', 'a replaced label offers the current one, which opens the passport; Back returns to the replaced label', await t.page.evaluate(() => location.hash) === '#/scan/SIM-AV-0042' && await (async () => { await t.page.goBack(); await t.page.waitForTimeout(300); return t.page.locator('[data-testid=scan-replaced]').count(); })() === 1);
  await t.close(); }
{ const t = await open('#/scan?label=' + encodeURIComponent('"><script>window.__pwned=1</script>'), { role: 'service' });
  ok('QR-11', 'a hostile deep link is shown as a refusal: nothing runs, nothing is injected, no error', await t.page.locator('[data-testid=scan-refused]').count() === 1 && !(await t.page.evaluate(() => window.__pwned)) && await t.page.locator('main script').count() === 0 && clean(t));
  await t.close(); }
{ const t = await open('#/scan/R-ATL-4-218', { role: 'service' });
  ok('QR-12', 'an identifier of the estate’s own records opens that record’s existing passport', await t.page.locator('[data-testid=scan-record]').count() === 1 && /Atlas 4\.218/.test(await main(t.page)));
  await t.close(); }

// ---- the dossier: who sees what ----
{ const t = await open(`#/dossier/${REPORT}`, { role: 'cxeng' }); const m = await main(t.page); const tt = await totals(t.page);
  ok('DS-01', 'the dossier shows the reference totals: 27 pass, 3 pending, 2 fail, 29 of 32 evidence records, held', /^Pass 27/.test(tt.pass) && /^Pending 3/.test(tt.pending) && /^Fail 2/.test(tt.fail) && /29 of 32/.test(tt.evidence) && await t.page.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'HELD' && clean(t), JSON.stringify(tt) + t.errs.join('|'));
  ok('DS-02', 'seven blockers are named, including the failure with no deficiency and the pass with no evidence', await t.page.locator('[data-testid=dossier-blockers] li').count() === 7 && /T-SIM-032 fails with no deficiency raised/.test(m) && /T-SIM-030 passes with no evidence record/.test(m));
  ok('DS-03', 'the two reference deficiencies are listed with severity and owner, and the snapshot’s own gaps are stated', await t.page.locator('[data-def]').count() === 2 && /DEF-SIM-001/.test(m) && /P1/.test(m) && await t.page.locator('[data-testid=dossier-gaps] li').count() === 2);
  ok('DS-04', 'the Commissioning Engineer can record and raise, and has no Verify or Accept control (D44)', await t.page.locator('[data-act=pass]').count() > 0 && await t.page.locator('[data-act=raise]').count() === 1 && await t.page.locator('[data-act=verify]').count() === 0 && await t.page.locator('[data-testid=dossier-accept]').count() === 0);
  await t.page.click('[data-test=T-SIM-008] [data-act=pass-bare]'); await t.page.waitForSelector('[data-testid=dossier-refusal]');
  ok('DS-05', 'a pass recorded without evidence is refused in words, and nothing changes', /A pass needs an evidence record/.test(await t.page.innerText('[data-testid=dossier-refusal]')) && /^Pass 27/.test((await totals(t.page)).pass) && await t.page.evaluate(() => localStorage.getItem('empathia.demo.dossier.v1')) === null);
  await t.close(); }
{ const t = await open(`#/dossier/${REPORT}`, { role: 'exec' }); const m = await main(t.page);
  // Changed 10 Nov 2026 (founder): final sign-off is phase 6, two approvals in order. The first is the Service Manager's or the Executive's,
  // so the Executive now has that one control (it had none); the second is the Operations Lead's or the Systems Engineer's.
  ok('DS-06', 'the Executive reads the totals, the decision and the three steps of the final sign-off; may give the first approval and nothing else; no engineering controls or evidence references', /Decision required/.test(m) && /Phase 6 · Final sign-off/.test(m) && /Service Manager or the Executive/.test(m) && /Operations Lead or the Systems Engineer \(internal role\)/.test(m) && await t.page.getAttribute('[data-testid=dossier-signoff]', 'data-signoff') === 'TESTS_OPEN' && await t.page.locator('[data-act]').count() === 0 && await t.page.locator('[data-testid=dossier-accept]').count() === 1 && await t.page.locator('[data-testid=dossier-countersign]').count() === 0 && !/EV-SIM-0\d\d/.test(m), m.slice(0, 200));
  ok('DS-07', 'the Executive is offered the executive export only', await t.page.locator('[data-export]').count() === 2 && await t.page.locator('[data-export=json-engineering]').count() === 0);
  const [dl] = await Promise.all([t.page.waitForEvent('download'), t.page.click('[data-export=json-executive]')]); const file = path.join(repo, '.local/qa-dossier-exec.json'); await dl.saveAs(file); await t.page.waitForSelector('[data-testid=dossier-exports]');
  const text = fs.readFileSync(file, 'utf8'); const j = JSON.parse(text); const sha = crypto.createHash('sha256').update(text).digest('hex');
  ok('DS-08', 'the executive JSON states the same totals, says synthetic and not live, and carries no evidence reference', j.report === REPORT && j.totals.pass === 27 && j.totals.pending === 3 && j.totals.fail === 2 && j.totals.evidence === 29 && j.acceptance === 'HELD' && j.source_class === 'SYNTHETIC' && j.not_live === true && j.redaction === 'executive' && j.tests.length === 32 && j.tests.every((x) => !('evidence' in x)), JSON.stringify(j.totals));
  ok('DS-09', 'the checksum shown is the SHA-256 of exactly the bytes saved', (await t.page.innerText('[data-testid=dossier-exports]')).replace(/\s/g, '').includes(sha), sha);
  await t.close(); }
for (const role of ['visitor', 'employee']) { const t = await open(`#/dossier/${REPORT}`, { role });
  ok(`DS-10-${role}`, `the ${role} gets the owl page; the dossier’s code is never downloaded`, await t.page.locator('[data-testid=access-page]').count() === 1 && !chunk(t.reqs, 'Dossier') && !/T-SIM-008|DEF-SIM/.test(await main(t.page)), t.reqs.filter((u) => /chunks/.test(u)).join(' '));
  await t.close(); }
{ const t = await open(`#/dossier/${REPORT}`, { role: 'svcmgr' });
  await t.page.click('[data-testid=dossier-accept]'); await t.page.waitForSelector('[data-testid=dossier-refusal]'); const r = await t.page.innerText('[data-testid=dossier-refusal]');
  ok('DS-11', 'a role that may accept is refused while blockers stand, and told which; the dossier stays held', /Acceptance stays held: 7 blockers stand/.test(r) && /T-SIM-008 fails/.test(r) && await t.page.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'HELD' && await t.page.evaluate(() => document.activeElement?.getAttribute('role')) === 'alert', r);
  await t.close(); }
{ const t = await open('#/investor', { role: 'svcmgr' });   // a forged acceptance written straight into storage
  await t.page.evaluate(() => localStorage.setItem('empathia.demo.dossier.v1', JSON.stringify([{ kind: 'ACCEPT', by: { role: 'svcmgr', label: 'Service Manager' }, at: '2026-11-09T12:00:00Z' }, { kind: 'VERIFY', test: 'T-SIM-008', by: { role: 'qa', label: 'x' }, at: 'not a date' }, { kind: 'RETEST', test: '../x', result: 'PASS', evidence: 'E', by: { role: 'cxeng', label: 'c' }, at: '2026-11-09T12:00:00Z' }])));
  await t.page.evaluate((h) => { location.hash = h; }, `#/dossier/${REPORT}`); await t.page.waitForSelector('[data-testid=dossier]');
  ok('DS-12', 'an acceptance forged in stored state accepts nothing: still held, 27 pass, malformed events ignored, no error', await t.page.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'HELD' && /^Pass 27/.test((await totals(t.page)).pass) && await t.page.locator('[data-testid=dossier-history] li').count() === 1 && clean(t), t.errs.join('|'));
  await t.page.click('[data-testid=dossier-reset]'); await t.page.waitForTimeout(200);
  ok('DS-13', 'returning to the reference snapshot clears the working record', await t.page.evaluate(() => localStorage.getItem('empathia.demo.dossier.v1')) === null && await t.page.locator('[data-testid=dossier-history]').count() === 0);
  await t.close(); }

// ---- the recovery, end to end, across three roles ----
{ const t = await open(`#/dossier/${REPORT}`, { role: 'cxeng' }); const p = t.page; const row = (id) => `[data-test=${id}]`;
  const show = async () => { await p.locator('[role=radiogroup][aria-label="Which tests"] [role=radio]').nth(1).click(); await p.waitForTimeout(100); };   // the All view
  await show();
  await p.click(`${row('T-SIM-032')} [data-act=raise]`); await p.waitForTimeout(80);
  for (const id of ['T-SIM-008', 'T-SIM-016', 'T-SIM-028', 'T-SIM-031', 'T-SIM-032']) { await p.click(`${row(id)} [data-act=pass]`); await p.waitForTimeout(60); }
  await p.click(`${row('T-SIM-030')} [data-act=evidence]`); await p.waitForTimeout(120);
  let tt = await totals(p); const m1 = await main(p);
  ok('RC-01', 'after the engineer’s retests every test passes with evidence, yet acceptance is still held: six results await independent verification', /^Pass 32/.test(tt.pass) && /^Fail 0/.test(tt.fail) && /32 of 32/.test(tt.evidence) && /snapshot 27/.test(tt.pass) && await p.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'HELD' && await p.locator('[data-testid=dossier-blockers] li').count() === 6 && /awaits independent verification/.test(m1), JSON.stringify(tt));
  ok('RC-02', 'the new deficiency is recorded and the open ones stay open until the passes are verified', await p.locator('[data-def]').count() === 3 && await p.locator('[data-def][data-state=CLOSED]').count() === 0);
  ok('RC-03', 'the engineer who recorded the results is offered no Verify control', await p.locator('[data-act=verify]').count() === 0);
  await viewAs(p, 'qa'); await show();
  ok('RC-04', 'the Document Reviewer sees six results to verify and no recording controls', await p.locator('[data-act=verify]').count() === 6 && await p.locator('[data-act=pass]').count() === 0, String(await p.locator('[data-act=verify]').count()));
  for (let i = 0; i < 6; i += 1) { await p.locator('[data-act=verify]').first().click(); await p.waitForTimeout(70); }
  ok('RC-05', 'once verified, no blocker stands and all three deficiencies are closed, but nothing accepts itself', await p.locator('[data-testid=dossier-blockers]').count() === 0 && await p.locator('[data-def][data-state=CLOSED]').count() === 3 && await p.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'HELD');
  // Changed 10 Nov 2026 (founder): one acceptance by the Service Manager became phase 6, two approvals in order from named roles.
  // The Document Reviewer no longer approves at all (it verified the results; independence is also proved in the rule tests).
  ok('RC-05b', 'the Document Reviewer, who verified the results, has no approval control; the sign-off is ready for its first approval', await p.locator('[data-testid=dossier-accept]').count() === 0 && await p.locator('[data-testid=dossier-countersign]').count() === 0 && await p.getAttribute('[data-testid=dossier-signoff]', 'data-signoff') === 'AWAITING_FIRST' && /does not approve/.test(await main(p)));
  await viewAs(p, 'ops');
  await p.click('[data-testid=dossier-countersign]'); await p.waitForSelector('[data-testid=dossier-refusal]');
  ok('RC-05c', 'the Operations Lead cannot give the second approval before the first: refused in words, still held', /follows the first, and the first has not been given/.test(await p.innerText('[data-testid=dossier-refusal]')) && await p.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'HELD' && await p.locator('[data-testid=dossier-accept]').count() === 0);
  await viewAs(p, 'svcmgr');
  await p.click('[data-testid=dossier-accept]'); await p.waitForSelector('[data-testid=dossier-done]'); const m1b = await main(p);
  ok('RC-05d', 'the Service Manager gives the first approval: recorded and named, and acceptance is still held until the second', await p.getAttribute('[data-testid=dossier-signoff]', 'data-signoff') === 'AWAITING_SECOND' && await p.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'HELD' && /Given by the Service Manager/.test(m1b) && /waits for the AV Operations Lead or the Systems Engineer \(internal role\)/.test(m1b) && await p.locator('[data-testid=dossier-accept]').count() === 0 && await p.locator('[data-testid=dossier-countersign]').count() === 0, m1b.slice(0, 240));
  await viewAs(p, 'syseng');
  await p.click('[data-testid=dossier-countersign]'); await p.waitForFunction(() => document.querySelector('[data-testid=dossier]')?.getAttribute('data-acceptance') === 'ACCEPTED', null, { timeout: 5000 }).catch(() => undefined);
  const m2 = await main(p);
  ok('RC-06', 'the Systems Engineer gives the second approval: final acceptance is recorded, both approvers are named, and the record is closed', await p.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'ACCEPTED' && await p.getAttribute('[data-testid=dossier-signoff]', 'data-signoff') === 'COMPLETE' && /Final acceptance recorded/.test(m2) && /First approval by the Service Manager/.test(m2) && /second by the Systems Engineer/.test(m2) && await p.locator('[data-testid=dossier-history] li').count() === 15 && await p.locator('[data-testid=dossier-countersign]').count() === 0, m2.slice(0, 240));
  await p.evaluate(() => { location.hash = '#/scan/SIM-AV-0042'; }); await p.waitForSelector('[data-testid=scan-passport]');
  ok('RC-07', 'the asset passport follows the same record: accepted, 32 of 32, with the snapshot figure beside it', /Accepted/.test(await p.innerText('[data-testid=scan-acceptance]')) && /32 of 32/.test(await p.innerText('[data-testid=scan-evidence]')) && /snapshot 29 of 32/.test(await p.innerText('[data-testid=scan-evidence]')));
  await p.evaluate((h) => { location.hash = h; }, `#/dossier/${REPORT}`); await p.waitForSelector('[data-testid=dossier]'); await viewAs(p, 'cxeng'); await show();
  ok('RC-08', 'after acceptance the record is closed: the engineer has no step left on any test', await p.locator('[data-act]').count() === 0 || await (async () => { await p.locator('[data-act]').first().click(); await p.waitForSelector('[data-testid=dossier-refusal]'); return /accepted and closed/.test(await p.innerText('[data-testid=dossier-refusal]')); })());
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export=csv-engineering]')]); const file = path.join(repo, '.local/qa-dossier-eng.csv'); await dl.saveAs(file); const csv = fs.readFileSync(file, 'utf8'); const lines = csv.trim().split('\n'); const data = lines.filter((l) => !l.startsWith('#'));
  ok('RC-09', 'the engineering CSV of the working record: provenance header, 32 rows, every test PASS with its evidence and verifier where one was needed', /^# report: SIM-REPORT/.test(lines[0]) && lines.some((l) => /^# basis: working record/.test(l)) && data.length === 33 && data.slice(1).every((l) => /,PASS,EV-SIM-\d{3},/.test(l)) && data.filter((l) => /Document Reviewer/.test(l)).length === 6 && clean(t), data.length + ' ' + t.errs.join('|'));
  await t.close(); }

// ---- waivers and the site champion's attestation (founder's directive of 11 Nov 2026, §13, and his decisions of 01:42 and 02:25) ----
// "Prevent acceptance when mandatory items are missing, unless a properly authorized documented waiver exists." "For technical
// deviations, require appropriate engineering review. For business-risk acceptance, require the appropriately authorized business
// decision-maker." "Every waiver must record its reason, affected requirement, supporting evidence, risk, approver, date, expiration
// or review date, and corrective-action plan." "Do not allow individuals to approve their own exceptions."
{ const t = await open(`#/dossier/${REPORT}`, { role: 'cxeng' }); const p = t.page; const row = (id) => `[data-test=${id}]`;
  const show = async () => { await p.locator('[role=radiogroup][aria-label="Which tests"] [role=radio]').nth(1).click(); await p.waitForTimeout(100); };
  const refusal = async () => { await p.waitForSelector('[data-testid=dossier-refusal]'); return p.innerText('[data-testid=dossier-refusal]'); };
  const signoff = () => p.getAttribute('[data-testid=dossier-signoff]', 'data-signoff'); const state = () => p.getAttribute('[data-testid=dossier]', 'data-acceptance');
  const offered = (pg = p) => pg.$$eval('[data-testid=dossier-waive-test] option', (els) => els.map((e) => e.value));
  const go = () => p.click('[data-testid=dossier-waive-go]');
  await show();
  await p.click(`${row('T-SIM-032')} [data-act=raise]`); await p.waitForTimeout(80);
  for (const id of ['T-SIM-008', 'T-SIM-031', 'T-SIM-032']) { await p.click(`${row(id)} [data-act=pass]`); await p.waitForTimeout(60); }
  await p.click(`${row('T-SIM-030')} [data-act=evidence]`); await p.waitForTimeout(120);
  await viewAs(p, 'qa'); await show();
  for (let i = 0; i < 4; i += 1) { await p.locator('[data-act=verify]').first().click(); await p.waitForTimeout(70); }
  const two = await p.$$eval('[data-testid=dossier-blockers] li', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
  ok('WV-01', 'two items stay open (T-SIM-016, T-SIM-028): acceptance is held, and a role without the right is shown no waiver form', two.length === 2 && /T-SIM-016/.test(two.join()) && /T-SIM-028/.test(two.join()) && await p.locator('[data-testid=dossier-waive]').count() === 0 && await signoff() === 'TESTS_OPEN', JSON.stringify(two));
  await viewAs(p, 'svcmgr'); await p.click('[data-testid=dossier-accept]');
  ok('WV-02', 'the Service Manager cannot approve over the open items, and cannot waive them', /stays held: 2 blockers stand/.test(await refusal()) && await p.locator('[data-testid=dossier-waive]').count() === 0);
  await viewAs(p, 'exec');
  ok('WV-03', 'the Executive is offered only the business risk (the operator guide acknowledgement), not the technical deviation', JSON.stringify(await offered()) === JSON.stringify(['T-SIM-028']) && await p.getAttribute('[data-testid=dossier-waive-kind]', 'data-kind') === 'business' && /Business-risk acceptance/.test(await p.innerText('[data-testid=dossier-waive-kind]')), JSON.stringify(await offered()));
  await p.fill('[data-testid=dossier-waive-why]', 'Not needed.'); await go();
  ok('WV-04', 'a waiver with no real reason is refused in words, and what was typed is kept', /A waiver is documented/.test(await refusal()) && await p.inputValue('[data-testid=dossier-waive-why]') === 'Not needed.' && await p.locator('[data-testid=dossier-waivers]').count() === 0);
  const why = 'The operator guide is issued; two of the five named operators are on leave and have not yet acknowledged it.';
  await p.fill('[data-testid=dossier-waive-why]', why); await go();
  ok('WV-04b', 'a reason alone is not enough: the waiver must name the evidence it relies on', /Name what the waiver relies on/.test(await refusal()));
  await p.fill('[data-testid=dossier-waive-basis]', 'Guide issue record and the leave calendar'); await go();
  ok('WV-04c', 'and the risk while it stands', /Say what could go wrong while the item is open/.test(await refusal()));
  await p.fill('[data-testid=dossier-waive-risk]', 'Two operators may run the room without having read the guide for up to three weeks.'); await go();
  ok('WV-04d', 'and how the item will be closed', /Say how the item will be closed/.test(await refusal()));
  await p.fill('[data-testid=dossier-waive-plan]', 'Both operators acknowledge the guide in their first week back.'); await p.selectOption('[data-testid=dossier-waive-owner]', 'svcmgr');
  await p.fill('[data-testid=dossier-waive-until]', '2099-01-01'); await go();
  ok('WV-05', 'a waiver with no near end date is refused: at most ninety days', /at most 90 days/.test(await refusal()));
  const until = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  await p.fill('[data-testid=dossier-waive-until]', until); await go(); await p.waitForSelector('[data-waiver=T-SIM-028]');
  let tt = await totals(p); const w28 = await p.innerText('[data-waiver=T-SIM-028]');
  ok('WV-06', 'the business waiver stands at once, recorded with its reason, risk, evidence, owner, plan, giver and end date; the test is still pending and still counted as pending; one blocker is left', await p.getAttribute('[data-waiver=T-SIM-028]', 'data-state') === 'STANDING' && w28.includes(why) && /given by the Executive/.test(w28) && /Business-risk acceptance/.test(w28) && /Risk\s+Two operators/.test(w28) && /Relies on\s+Guide issue record/.test(w28) && /Closed by\s+Service Manager/.test(w28) && /^Pending 2/.test(tt.pending) && await p.locator('[data-testid=dossier-blockers] li').count() === 1 && await p.locator('[data-testid=dossier-waive]').count() === 0, JSON.stringify(tt));
  await viewAs(p, 'ops');
  ok('WV-07', 'the Operations Lead is offered the technical deviation, and told it needs an engineering review', JSON.stringify(await offered()) === JSON.stringify(['T-SIM-016']) && await p.getAttribute('[data-testid=dossier-waive-kind]', 'data-kind') === 'technical' && /engineering review/.test(await p.innerText('[data-testid=dossier-waive-kind]')), JSON.stringify(await offered()));
  await p.fill('[data-testid=dossier-waive-why]', 'The preset check needs the vendor on site; the room is usable without it and the visit is booked for next week.'); await p.fill('[data-testid=dossier-waive-basis]', 'DEF-SIM-002 and the vendor visit booking');
  await p.fill('[data-testid=dossier-waive-risk]', 'A presenter preset may frame the wrong seat until the visit; meetings still run.'); await p.fill('[data-testid=dossier-waive-plan]', 'The vendor attends on the booked day; the engineer retests and the reviewer verifies.'); await p.fill('[data-testid=dossier-waive-until]', until); await go(); await p.waitForSelector('[data-waiver=T-SIM-016]');
  ok('WV-08', 'the technical waiver is recorded but covers nothing yet: it awaits engineering review, the blocker still stands, and its giver is offered no review', await p.getAttribute('[data-waiver=T-SIM-016]', 'data-state') === 'AWAITING_REVIEW' && await p.locator('[data-testid=dossier-blockers] li').count() === 1 && await signoff() === 'TESTS_OPEN' && await p.locator('[data-testid=dossier-waive-review]').count() === 0 && /covers nothing until/.test(await p.innerText('[data-testid=dossier-done]')));
  await viewAs(p, 'architect'); await p.fill('[data-testid=dossier-waive-finding]', 'fine'); await p.click('[data-testid=dossier-waive-review-go]');
  ok('WV-08b', 'an engineering review that says nothing is refused', /Give the engineering view/.test(await refusal()) && await p.getAttribute('[data-waiver=T-SIM-016]', 'data-state') === 'AWAITING_REVIEW');
  await p.fill('[data-testid=dossier-waive-finding]', 'Acceptable: framing is unaffected for the fixed presets in use; recheck after the visit.'); await p.click('[data-testid=dossier-waive-review-go]'); await p.waitForFunction(() => document.querySelector('[data-waiver=T-SIM-016]')?.getAttribute('data-state') === 'STANDING', null, { timeout: 5000 }).catch(() => undefined);
  ok('WV-08c', 'with the Product Architect’s review the waiver stands; nothing stops acceptance, the sign-off is ready for its first approval, and the page says two items are open under a waiver', await p.getAttribute('[data-waiver=T-SIM-016]', 'data-state') === 'STANDING' && /Engineering\s+Acceptable/.test(await p.innerText('[data-waiver=T-SIM-016]')) && await p.locator('[data-testid=dossier-blockers]').count() === 0 && await signoff() === 'AWAITING_FIRST' && /2 items open under a waiver/.test(await p.innerText('[data-testid=dossier-signoff]')) && await state() === 'HELD');
  await viewAs(p, 'exec');
  ok('WV-08d', 'the approval the Executive is offered names the waivers', /Give the first approval, with 2 waivers/.test(await p.innerText('[data-testid=dossier-accept]')));
  await p.click('[data-testid=dossier-accept]');
  ok('WV-09', 'the role that gave a waiver does not also approve: the Executive is refused', /A waiver and an approval come from different roles/.test(await refusal()) && await signoff() === 'AWAITING_FIRST');
  await viewAs(p, 'svcmgr'); await p.click('[data-testid=dossier-accept]'); await p.waitForFunction(() => document.querySelector('[data-testid=dossier-signoff]')?.getAttribute('data-signoff') === 'AWAITING_SECOND', null, { timeout: 5000 }).catch(() => undefined);
  ok('WV-10', 'the Service Manager gives the first approval over the two waivers', await signoff() === 'AWAITING_SECOND' && /with 2 waivers/.test(await p.innerText('[data-testid=dossier-done]')));
  await viewAs(p, 'ops'); await p.click('[data-testid=dossier-countersign]');
  ok('WV-10b', 'the Operations Lead, who gave the technical waiver, cannot give the second approval', /A waiver and an approval come from different roles/.test(await refusal()) && await signoff() === 'AWAITING_SECOND');
  await viewAs(p, 'syseng'); await p.click('[data-testid=dossier-countersign]'); await p.waitForFunction(() => document.querySelector('[data-testid=dossier]')?.getAttribute('data-acceptance') === 'ACCEPTED', null, { timeout: 5000 }).catch(() => undefined);
  const m = await main(p); await show(); tt = await totals(p);
  ok('WV-11', 'the Systems Engineer gives the second: accepted WITH 2 WAIVERS, said in the title and the decision; the two tests still read pending and waived', await state() === 'ACCEPTED' && await p.getAttribute('[data-testid=dossier]', 'data-waivers') === '2' && /Final acceptance recorded, with 2 waivers/.test(m) && /2 items stayed open under a documented waiver/.test(m) && !/Every test passes with evidence, and every result recorded after the snapshot was independently verified\. The record/.test(m) && /^Pending 2/.test(tt.pending) && await p.locator('[data-waived]').count() === 2, JSON.stringify(tt));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export=json-engineering]')]); const file = path.join(repo, '.local/qa-dossier-waived.json'); await dl.saveAs(file); const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const jw = Object.fromEntries(j.waivers.map((x) => [x.affected_requirement, x]));
  ok('WV-12', 'the export carries it: accepted, two open items, each waiver with its kind, reason, evidence, risk, owner, plan, giver and end date, the technical one with its engineering review; each approval says it was given over two; eight tests are marked never waived', j.acceptance === 'ACCEPTED' && j.open_items.length === 2 && j.waivers.length === 2 && j.waivers.every((x) => x.state === 'STANDING' && x.reason.length > 30 && x.relies_on.length > 11 && x.risk.length > 19 && x.owner.length > 2 && x.remediation_plan.length > 19 && x.stands_until === until)
    && jw['T-SIM-028'].kind === 'business' && jw['T-SIM-028'].granted_by === 'Executive' && jw['T-SIM-028'].engineering_review === null && jw['T-SIM-016'].kind === 'technical' && jw['T-SIM-016'].granted_by === 'AV Operations Lead' && jw['T-SIM-016'].engineering_review.by === 'Product Architect'
    && j.final_signoff.first_approval.over_waivers === 2 && j.final_signoff.second_approval.over_waivers === 2 && j.totals.pending === 2 && j.tests.filter((x) => x.never_waived).length === 8, JSON.stringify(j.waivers).slice(0, 300));
  await p.evaluate(() => { location.hash = '#/scan/SIM-AV-0042'; }); await p.waitForSelector('[data-testid=scan-passport]');
  ok('WV-13', 'the asset passport says the same: accepted, with 2 waivers', /Accepted · with 2 waivers/.test(await p.innerText('[data-testid=scan-acceptance]')) && clean(t), t.errs.join('|'));
  // stored state is not trusted
  for (const [id, label, edit] of [['WV-14', 'a stored waiver whose date has passed', (ev) => ev.map((e) => (e.kind === 'WAIVE' ? { ...e, expires: '2026-01-01' } : e))], ['WV-15', 'a stored waiver rewritten as given by the engineer who recorded the results', (ev) => ev.map((e) => (e.kind === 'WAIVE' ? { ...e, by: { role: 'cxeng', label: 'Commissioning Engineer' } } : e))], ['WV-16', 'stored approvals that do not name the waivers', (ev) => ev.map((e) => (e.kind === 'ACCEPT' || e.kind === 'COUNTERSIGN' ? { kind: e.kind, by: e.by, at: e.at } : e))],
    ['WV-16b', 'a stored technical waiver with its engineering review removed', (ev) => ev.filter((e) => e.kind !== 'REVIEW_WAIVER')], ['WV-16c', 'a stored engineering review rewritten as given by the waiver’s own giver', (ev) => ev.map((e) => (e.kind === 'REVIEW_WAIVER' ? { ...e, by: { role: 'ops', label: 'AV Operations Lead' } } : e))], ['WV-16d', 'a stored waiver with its risk removed', (ev) => ev.map((e) => { if (e.kind !== 'WAIVE') return e; const { risk, ...rest } = e; return rest; })]]) {
    await p.evaluate((fn) => { const k = 'empathia.demo.dossier.v1'; if (!window.__orig) window.__orig = localStorage.getItem(k); const ev = JSON.parse(window.__orig); localStorage.setItem(k, JSON.stringify(new Function('ev', `return (${fn})(ev)`)(ev))); }, edit.toString());
    await p.evaluate((h) => { location.hash = h; }, `#/dossier/${REPORT}`); await p.reload(); await p.waitForSelector('[data-testid=dossier]');
    ok(id, `${label} accepts nothing: the dossier reads held`, await state() === 'HELD' && await signoff() === 'TESTS_OPEN', `${await state()} ${await signoff()}`);
  }
  await t.close(); }
{ const t = await open('#/scan/SIM-AV-0042', { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=scan-passport]');
  ok('AT-01', 'the Employee, standing in for the room’s site champion, is offered the attestation and is not shown the acceptance state', await p.locator('[data-testid=scan-attest]').count() === 1 && await p.locator('[data-testid=scan-acceptance]').count() === 0 && /does not approve the room/.test(await p.innerText('[data-testid=scan-attest]')));
  await p.fill('[data-testid=scan-attest-word]', 'ok'); await p.click('[data-testid=scan-attest-go]'); await p.waitForSelector('[data-testid=scan-attest-refused]');
  ok('AT-02', 'a two-letter attestation is refused in words', /in a sentence/.test(await p.innerText('[data-testid=scan-attest-refused]')));
  const word = 'We held three team meetings here this week and the far end heard everyone at the table.';
  await p.fill('[data-testid=scan-attest-word]', word); await p.click('[data-testid=scan-attest-go]'); await p.waitForSelector('[data-testid=scan-attest-done]');
  ok('AT-03', 'a sentence is recorded, shown back, and the page says it approves nothing by itself', (await p.innerText('[data-testid=scan-attest-mine]')).includes(word) && /does not approve anything by itself/.test(await p.innerText('[data-testid=scan-attest-done]')) && await p.inputValue('[data-testid=scan-attest-word]') === '');
  await p.evaluate((h) => { localStorage.setItem('empathia.demo.perspective', 'svcmgr'); location.hash = h; }, `#/dossier/${REPORT}`); await p.reload(); await p.waitForSelector('[data-testid=dossier]');
  ok('AT-04', 'the Service Manager reads the champion’s words on the dossier, marked as a local attestation; every blocker still stands and nothing is approved', (await p.innerText('[data-testid=dossier-attestations]')).includes(word) && /approves nothing/.test(await p.innerText('[data-testid=dossier-attestations]')) && await p.getAttribute('[data-testid=dossier]', 'data-acceptance') === 'HELD' && await p.locator('[data-testid=dossier-blockers] li').count() === 7 && clean(t), t.errs.join('|'));   // the snapshot's seven lines (T-SIM-032 is listed twice: it fails, and no deficiency is raised)
  await t.close();
  for (const role of ['visitor', 'exec', 'cxeng']) { const v = await open('#/scan/SIM-AV-0042', { role }); await v.page.waitForSelector('[data-testid=scan-passport]');
    ok(`AT-05-${role}`, `the ${role} is not offered the attestation`, await v.page.locator('[data-testid=scan-attest]').count() === 0); await v.close(); }
  const ph = await open(`#/dossier/${REPORT}`, { role: 'exec', w: 390, h: 844 }); await ph.page.waitForSelector('[data-testid=dossier-waive]');
  const small = await ph.page.$$eval('[data-testid=dossier-waive] button, [data-testid=dossier-waive] select, [data-testid=dossier-waive] input', (els) => els.filter((e) => e.getBoundingClientRect().height < 44).length);
  const offered = await ph.page.$$eval('[data-testid=dossier-waive-test] option', (els) => els.map((e) => e.value));
  ok('WV-17', 'on a phone the waiver form fits the screen and every control is at least 44 px tall; from the snapshot the Executive is offered only the one business risk', await over(ph.page) <= 0 && small === 0 && clean(ph) && JSON.stringify(offered) === JSON.stringify(['T-SIM-028']), `small=${small} ${offered}`);
  const po = await open(`#/dossier/${REPORT}`, { role: 'ops', w: 390, h: 844 }); await po.page.waitForSelector('[data-testid=dossier-waive]');
  ok('WV-18', 'and the Operations Lead only the one technical deviation that may be waived (not the P1, the accessibility tests or the unraised failure)', JSON.stringify(await po.page.$$eval('[data-testid=dossier-waive-test] option', (els) => els.map((e) => e.value))) === JSON.stringify(['T-SIM-016']) && await over(po.page) <= 0 && clean(po)); await po.close(); await ph.close(); }

// ---- layout, both schemes, three widths ----
for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) for (const [name, hash, role] of [['proof', '#/proof', 'visitor'], ['scan', '#/scan/SIM-AV-0042', 'architect'], ['dossier', `#/dossier/${REPORT}`, 'cxeng']]) {
  const t = await open(hash, { role, w, h }); const o = await over(t.page);
  const small = w === 390 ? await t.page.$$eval('main .pf button, main .pf a.ui-btn', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 44; }).length) : 0;
  ok(`LY-${name}-${w}`, `${name} at ${w}px: no sideways scroll, one h1, no console error${w === 390 ? ', every control at least 44 px tall' : ''}`, o <= 0 && await t.page.locator('main h1').count() === 1 && clean(t) && small === 0, `over=${o} small=${small} ${t.errs.join('|')}`);
  await t.close(); }
{ const t = await open('#/investor', { role: 'architect' });   // discoverable from search
  await t.page.keyboard.press('Control+k'); await t.page.keyboard.type('dossier'); await t.page.waitForTimeout(500);
  ok('NV-01', 'the dossier is found from the search bar by a role that may open it', /Commissioning dossier/.test(await t.page.evaluate(() => document.body.innerText)));
  await t.close(); }
await done();
