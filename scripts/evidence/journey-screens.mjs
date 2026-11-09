#!/usr/bin/env node
/**
 * The owner's Living Room journey through Build a Room, captured as screenshots for the investor-facing evidence. It drives the built
 * investor demonstration (apps/demo/dist, served by its own server, as the browser tests do) through the flow of tests/browser/demo.test.mjs
 * — the room designed while PLANNED (the video bar swapped for a camera, a ceiling microphone added), approved, commissioned, verified,
 * accepted as baseline v1, recommissioned, the camera's model substituted (its physical unit replaced), the design re-approved, the reopened
 * tests re-run and independently verified, and the room re-accepted as baseline v2 — and photographs each stage.
 *
 * Every rule on screen is the product's own engine; everything is synthetic and stays in the page. A stage the demonstration does not
 * reach is reported NOT REACHED with the reason, never staged.
 *
 *   node scripts/evidence/journey-screens.mjs [out-dir]        (default /tmp/handoff/screens/journey; needs node scripts/build.mjs)
 * Writes <out>/<width>/NN-<stage>.png at 1440×900 and 390×844 (reduced motion) and <out>/INDEX.md (one line per screenshot).
 */
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || '/tmp/handoff/screens/journey');
const dist = path.join(repo, 'apps/demo/dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('the demonstration is not built: node scripts/build.mjs'); process.exit(2); }
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const PORT = 4395; const base = `http://127.0.0.1:${PORT}/`; const KEY = 'empathia.demo.build-a-room.v1';
const NEW_CAM = 'SYN-PTZ-12X (synthetic PTZ camera)';
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });

const index = []; const problems = [];
const browser = await chromium.launch();
try {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const dir = path.join(out, String(w)); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    let n = 0; let blocked = null;
    let P = page;   // the page being photographed: Build a Room, or a second tab of the same context (it shares the draft) for Search Party and Pro
    const draft = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    const persp = async (p) => { await P.selectOption('.persp select', p); await P.waitForTimeout(150); };
    /** Open another page of the demonstration in a second tab, so Build a Room keeps its Impact panel (it is not stored with the draft). */
    const inTab = async (hash, who, fn) => { const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push(e.message)); P = p2; try { await p2.goto(base + hash); await p2.waitForTimeout(500); await persp(who); await fn(p2); } finally { P = page; await p2.close(); } };
    const tab = async (t) => { await page.click(`#tab-${t}`); await page.waitForTimeout(200); };
    const click = async (sel) => { await page.click(sel); await page.waitForTimeout(250); };
    const refusal = async () => ((await page.locator('[role=alert]').count()) ? page.locator('[role=alert]').first().innerText() : '');
    /** One screenshot (the full page, or one element), recorded in the index with what it shows and the rule behind it. */
    const shot = async (stage, slug, shows, rule, el) => {
      n += 1; const file = `${String(n).padStart(2, '0')}-${slug}.png`;
      if (el) { const loc = P.locator(el).first(); await loc.scrollIntoViewIfNeeded({ timeout: 5000 }); await loc.screenshot({ path: path.join(dir, file) }); }
      else { await P.evaluate(() => scrollTo(0, 0)); await P.screenshot({ path: path.join(dir, file), fullPage: true }); }
      index.push({ width: w, file, stage, shows, rule });
    };
    /** A stage: its steps, a check that the demonstration really is where the caption says, then its screenshots. Failing → NOT REACHED. */
    const stage = async (no, name, steps) => {
      if (blocked) { index.push({ width: w, file: null, stage: no, shows: `${name} — NOT REACHED: an earlier stage was not reached (${blocked})`, rule: '' }); return; }
      try { await steps(); }
      catch (e) { blocked = `stage ${no}`; const why = String(e.message || e).split('\n')[0].slice(0, 300); problems.push(`${w}: stage ${no} ${name}: ${why}`); index.push({ width: w, file: null, stage: no, shows: `${name} — NOT REACHED: ${why}`, rule: '' }); }
    };
    const expect = (cond, what) => { if (!cond) throw new Error(what); };

    await page.goto(base); await page.waitForTimeout(500);
    await page.evaluate((k) => { localStorage.removeItem(k); location.hash = '#/v25/build'; }, KEY); await page.waitForTimeout(400);

    await stage(1, 'Lite: the room designed in Build a Room', async () => {
      await persp('designer'); await page.fill('#b-name', 'Living Room (synthetic)'); await click('button:has-text("Create the room")');
      expect(/PLANNED/.test(await page.locator('.build__state').innerText()), 'the room was not created');
      await shot(1, 'lite-room-designed', 'the room created from the Huddle Room template: its outline, dimensions (declared or MODELED), devices and the connections the design rules propose', 'templateDevices + proposeConnections; classifyRoom and the design checks run on the design (commissioning-engine)');
      const bar = (await draft()).design.devices.find((x) => x.cat === 'bar' && !x.removed).id;
      await page.selectOption('#b-swap', bar); await page.selectOption('#b-swap-to', 'camera'); await page.fill('#b-why', 'a camera for the far wall (synthetic)'); await click('[data-testid=swap]');
      expect((await draft()).design.devices.some((x) => x.cat === 'camera' && !x.removed), 'the swap did not happen');
      await shot(1, 'lite-camera-swap-impact', 'while PLANNED the video bar is swapped for a camera; the Impact panel shows the commissioning delta, the tests that now cover the camera, the Search Party dependency change (the bar leaves the recorded graph, the camera joins it with what depends on it) and no KPI change', 'designEditRefusal (PLANNED: every edit); computeApplicability before and after; Search Party impact over the estate graph', '[data-testid=impact-panel]');
      await page.selectOption('#b-cat', 'micceil'); await click('[data-testid=add-device]');
      await shot(1, 'lite-microphone-impact', 'while PLANNED a ceiling microphone is added: new tests apply, each with the engine’s reason, and the Pro passport “Devices commissioned up to standards” changes', 'designEditRefusal (PLANNED); computeApplicability (the dsp family’s tests); KPI passports recomputed on both states', '[data-testid=impact-panel]');
    });
    await stage(2, 'The design approved (revision preserved)', async () => {
      await page.fill('[aria-label="Revision reason"]', 'the designed living room (synthetic)'); await click('button:has-text("Save revision")');
      await persp('syseng'); await click('button:has-text("Approve the suggestion")');
      await tab('lifecycle'); await click('button:has-text("Move to DESIGN_APPROVED")');
      expect(/DESIGN_APPROVED/.test(await page.locator('.build__state').innerText()), `the design was not approved: ${await refusal()}`);
      await tab('design');
      await shot(2, 'design-approved-revision-kept', 'DESIGN_APPROVED by the systems engineer, not the designer who saved revision 1; the revision is listed with its hash and marked approved', 'lifecycleBlockers (classification approved, no open High/Critical deficiency, a saved revision); separation of duties: the author does not approve');
    });
    await stage(3, 'The commissioning plan with why each test applies', async () => {
      await persp('ops'); await tab('lifecycle'); await click('button:has-text("Move to INSTALLATION_PENDING")');
      await persp('installer'); await click('button:has-text("Move to INSTALLED_UNVERIFIED")');
      await persp('syseng'); await click('button:has-text("Move to COMMISSIONING")');
      expect(/COMMISSIONING/.test(await page.locator('.build__state').innerText()), `commissioning did not start: ${await refusal()}`);
      await tab('checks');
      await shot(3, 'commissioning-plan', 'the commissioning plan: each applicable test with its domain, who records it, the evidence it accepts, whether an instrument is required, and why it applies; the tests that do not apply, with their justification', 'computeApplicability over the 94-definition library (commissioning-engine)');
    });
    await stage(4, 'Results independently verified, and baseline v1 accepted', async () => {
      await tab('lifecycle'); await persp('cxeng'); await click('button:has-text("Record all untested as PASS")');
      await persp('architect'); await click('button:has-text("Verify all unverified")');
      await persp('qa'); await click('button:has-text("Move to ACCEPTED")');
      const st = await page.locator('.build__state').innerText();
      expect(/ACCEPTED/.test(st) && /baseline v1/.test(st), `the room was not accepted: ${await refusal()}`);
      await shot(4, 'verified-and-baseline-v1', 'every applicable test recorded by the commissioning engineer and verified by a different person; the QA reviewer, who neither recorded nor verified, accepts the room and baseline v1 is published', 'recordBlockers / verifyBlockers (independent verification); lifecycleBlockers for ACCEPTED; separation of duties for the acceptance');
    });
    await stage(5, 'Recommissioning started', async () => {
      await persp('syseng'); await click('button:has-text("Recommission")');
      const st = await page.locator('.build__state').innerText();
      expect(/COMMISSIONING/.test(st) && /baseline v1/.test(st), 'the room was not recommissioned');
      await shot(5, 'recommissioning-started', 'ACCEPTED → COMMISSIONING by the systems engineer (plan.compile); baseline v1 stays CURRENT until a re-acceptance publishes v2', 'lifecycleBlockers: the governed backward step ACCEPTED → COMMISSIONING (ADR-0003)');
    });
    let camId = null; let unitBefore = null;
    await stage(6, 'The physical camera replaced: the Impact panel before and after, and the register', async () => {
      await page.reload(); await page.waitForTimeout(500); await tab('design'); await persp('designer');   // a fresh page: the Impact panel holds no earlier change
      const d0 = await draft(); camId = d0.design.devices.find((x) => x.cat === 'camera' && !x.removed).id; unitBefore = d0.installations.find((i) => i.position === camId && !i.removedAt)?.asset;
      expect(camId && unitBefore, 'no installed camera');
      await shot(6, 'impact-before', 'before the change: the Impact panel explains what it will compute; while recommissioned, adding, removing and swapping a device are disabled with the API’s sentence and the model substitution is offered', 'designEditRefusal (recommissioned: a model substitution only)', '.build__two');
      await page.selectOption('#b-unit', camId); await page.fill('#b-model', NEW_CAM); await page.fill('#b-why', 'a PTZ camera for the far wall (synthetic)'); await click('[data-testid=substitute-model]');
      const d1 = await draft(); const unitAfter = d1.installations.find((i) => i.position === camId && !i.removedAt)?.asset;
      expect(!(await refusal()) && unitAfter && unitAfter !== unitBefore && d1.design.devices.find((x) => x.id === camId)?.model === NEW_CAM, `the substitution did not happen: ${await refusal()}`);
      await shot(6, 'impact-after', `after the change: the camera at ${camId} carries ${NEW_CAM}; the panel shows the tests it reopened, Assurance’s drift against baseline v1, Search Party and Pro`, 'planReplacement (SUBSTITUTION); reopenedBySubstitution; assess (Assurance); KPI passports recomputed', '[data-testid=impact-panel]');
      await page.selectOption('#b-unit', camId); await page.waitForTimeout(200);
      await shot(6, 'register-position-kept-unit-changed', `the device register: position ${camId} keeps its code; unit ${unitBefore} is closed SUBSTITUTED and unit ${unitAfter} installed; the position’s design history (model generic → ${NEW_CAM}) is kept apart from each unit’s own history`, 'installations (ADR-0012): planReplacement, installationSentence, identityOf', '[data-testid=device-register]');
    });
    await stage(7, 'The reopened tests with their reasons', async () => {
      await tab('checks'); await page.waitForSelector('[data-testid=reverification]', { timeout: 3000 });
      await shot(7, 'reopened-tests', 'Re-verification required: each test the substitution reopened, with one reason per substitution; their PASS_VERIFIED results stay on record, marked as recorded on the previous device, and no longer count', 'reopenedBySubstitution (the plan names the camera; Video tests of the room; the asset-identity check) and the acceptance gate that never counts a superseded result', '[data-testid=reverification]');
    });
    await stage(8, 'Assurance: drift against baseline v1', async () => {
      await tab('design');
      await shot(8, 'assurance-drift-v1', `Assurance against baseline v1: device presence drifts — a model drift at ${camId} (generic → ${NEW_CAM}, with both units named), recommissioning proposed; baseline v1 unchanged`, 'assess (assurance-engine): MODEL_SUBSTITUTED, never confused with a like-for-like unit change', '[data-testid=impact-as]');
    });
    await stage(9, 'Search Party: the dependency change', async () => {
      await shot(9, 'search-party-impact', 'Search Party in the Impact panel: a model substitution adds or removes no device, so no design relationship changes (the camera’s own dependency change, bar out and camera in, is stage 1’s swap)', 'Search Party impact over the estate graph (search-party)', '[data-testid=impact-sp]');
      const unitAfter = (await draft()).installations.find((i) => i.position === camId && !i.removedAt).asset;
      await inTab('#/search', 'visitor', async (p2) => {
        await p2.fill('#spd-q', unitAfter); await p2.waitForTimeout(300);
        expect((await p2.locator('.sp__list').innerText()).includes(unitAfter), 'Search Party did not find the new unit');
        await shot(9, 'search-party-new-unit', `Search Party finds the new unit ${unitAfter} and the position it is located in (an installation record), with the one reading everywhere: position · unit · identity`, 'identityText; the estate graph’s LOCATED_IN edge from the installation record');
      });
    });
    await stage(10, 'Pro: the measures that changed, and those that did not', async () => {
      await shot(10, 'pro-impact', 'Pro and Mission Control in the Impact panel: all 27 passports and 10 stations recomputed on both states; the substitution changes none of them, and the panel says so (the measure that changed — “Devices commissioned up to standards” — changed with stage 1’s microphone)', 'KPI passports and station counts recomputed (kpi-engine); only those that differ are listed', '[data-testid=impact-kpi]');
      await inTab('#/v25/exec', 'exec', async (p2) => {
        await p2.waitForSelector('[data-testid=passports]', { timeout: 5000 });
        await shot(10, 'pro-executive', 'Pro (Executive): the KPI passports with numerator, denominator, coverage and confidence, and the installed units by identity state (UNKNOWN never counted as known)', 'passports (kpi-engine) over the demonstration’s records');
      });
    });
    await stage(11, 'Design re-approval, the re-run, independent verification and re-acceptance as baseline v2 (v1 SUPERSEDED)', async () => {
      await tab('lifecycle');
      await persp('qa'); await click('button:has-text("Move to ACCEPTED")');
      expect(/the design changed while the room is recommissioned/.test(await refusal()), 'the re-acceptance was not refused for the design binding');
      await shot(11, 'reacceptance-refused-design-first', 'the re-acceptance refused, the reasons in the documented order: the design binding first (approve the revision the re-acceptance binds), then the reopened tests with the count', 'lifecycleBlockers with the design-binding fact; ACCEPTANCE_BLOCKER_ORDER');
      await tab('design'); await persp('designer');
      await page.fill('[aria-label="Revision reason"]', 'the camera’s model substituted during recommissioning (synthetic)'); await click('button:has-text("Save revision")');
      await persp('syseng'); await click('[data-testid=approve-revision]');
      expect((await page.locator('[data-testid=design-binding]').getAttribute('data-bound')) === 'true', `the revision was not approved: ${await refusal()}`);
      await shot(11, 'design-reapproved', 'the designer saved revision 2; the systems engineer — not its author — approved it: the re-acceptance will bind it', 'revisionApprovalBlockers; notByItsAuthor / needsAuthority (the API’s wording)', '[data-testid=design-binding]');
      await tab('lifecycle'); await persp('cxeng'); await click('button:has-text("Record all untested as PASS")');
      await shot(11, 're-run', 'the reopened tests re-run by the commissioning engineer on the new unit, with evidence obtained after the change; each earlier record kept in its history', 'reverification: a result recorded after the change replaces the superseded one; evidence from before the change is refused');
      await persp('architect'); await click('button:has-text("Verify all unverified")');
      await shot(11, 'independently-verified', 'the re-run results verified by a different person (the re-runner may not verify them)', 'verifyBlockers (independent verification)');
      await persp('qa'); await click('button:has-text("Move to ACCEPTED")');
      const st = await page.locator('.build__state').innerText();
      expect(/ACCEPTED/.test(st) && /baseline v2/.test(st), `the room was not re-accepted: ${await refusal()}`);
      await shot(11, 'baseline-v2-v1-superseded', 'the re-acceptance publishes baseline v2 against revision 2; v1 is kept, unchanged, as SUPERSEDED; the comparison names the substituted model and the new revision', 'lifecycleBlockers (nothing left); a baseline is never overwritten (ADR-0003)');
    });
    await stage(12, 'The Room Story with the whole sequence', async () => {
      await persp('visitor'); await page.click('[data-testid=story-action]'); await page.waitForSelector('[data-testid=story]', { timeout: 3000 });
      await shot(12, 'room-story', 'the room’s entire story from its own records: design (the swap, the microphone, the model substitution), authorizations and refusals, commissioning, verification, both baselines, the units and their histories', 'assembleStory (the demonstration’s records; nothing invented); every entry links to the page that holds it');
    });
    if (errs.length) problems.push(`${w}: page or console errors: ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }

const lines = [
  '# The Living Room journey — screenshots', '',
  `GENERATED by \`scripts/evidence/journey-screens.mjs\` on ${new Date().toISOString()} from the built investor demonstration (\`apps/demo/dist\`), at 1440×900 and 390×844 with reduced motion.`, '',
  '**This demonstration runs on synthetic data.** The room, its devices, units (AS-…), serials (SYN-…), results, evidence references and people are synthetic and stay in the page; nothing is measured on real hardware. The rules on screen are the product’s own engines (the same code the enterprise API runs).', '',
  '| Width | File | Stage | What it shows | Engine rule |', '|---|---|---|---|---|',
  ...index.map((x) => `| ${x.width} | ${x.file ? `\`${x.width}/${x.file}\`` : '—'} | ${x.stage} | ${x.shows.replace(/\|/g, '\\|')} | ${x.rule.replace(/\|/g, '\\|')} |`), '',
  ...(problems.length ? ['## Problems', '', ...problems.map((p) => `- ${p}`), ''] : ['Every stage was reached at both widths; no page or console error.', '']),
];
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'INDEX.md'), lines.join('\n'));
console.log(`${index.filter((x) => x.file).length} screenshots, ${index.filter((x) => !x.file).length} not reached — ${path.join(out, 'INDEX.md')}`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
