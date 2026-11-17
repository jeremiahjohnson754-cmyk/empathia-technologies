#!/usr/bin/env node
// The vertical slice, in the browser, on one room (founder, 16 Nov 2026: "Lite → Engineering → Commissioning → ServiceHands →
// Assurance → APEX, with real persisted records, traceable evidence, meaningful interaction, and successful browser testing").
// One accepted room of the synthetic campus (Atlas 7.112) is carried through every product by its own pages; nothing is preloaded.
//   VS-01  Lite: the furnished room opens; a device leads to its field record
//   VS-02  Engineering: the installer records how that device is mounted; the record is kept
//   VS-03  Commissioning: the Commissioning Engineer may not hand the room's deficiency to service; the Service Manager does, once,
//          from the room's thread (the service roles do not work in the commissioning pages)
//   VS-04  ServiceHands: the incident names its deficiency and runs to RESOLVED (triage, assign, accept, start, evidence, handed over,
//          verified by someone else); the technician cannot verify their own work
//   VS-05  resolving the job did not close the deficiency: the thread still asks for the verified retest
//   VS-06  Commissioning again: fix recorded, retest with evidence, the retester cannot verify, a different engineer closes it
//   VS-07  APEX: a case opens on the incident with ranked hypotheses and what is against them
//   VS-08  Assurance and the thread: the accepted baseline, the deficiency closed by its retest evidence, and all six stages tied by
//          the same ids; the thread is whole
//   VS-09  everything survives a reload (the records are kept); no console error; nothing requested off the page
//   node tests/browser/demo-vertical-slice.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-vertical-slice');
const ROOM = 'R-ATL-7-112'; const DEF = `${ROOM}:ISS-ATL-7-112`;
const t = await open(`#/lite/room/${ROOM}?mode=engineer`, { role: 'installer', sw: false }); const p = t.page; p.setDefaultTimeout(25000);
const as = async (role, hash) => { await p.evaluate(([r, h]) => { localStorage.setItem('empathia.demo.perspective', r); location.hash = h; }, [role, hash]); await p.reload(); await p.waitForTimeout(350); };
const head = () => p.locator('[data-testid=incident] h2').innerText();
const alert = async () => (await p.locator('[role=alert]').allInnerTexts()).join(' ');
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/^empathia\.demo\.(workspace|deficiencies|field)/.test(k)) localStorage.removeItem(k); }); await p.reload();

{ const st = p.locator('[data-testid=lite-room-3d]'); await st.waitFor();
  const hits = await st.locator('.l3-hitbtn').count(); await st.locator('.l3-hitbtn[aria-label*="isplay" i]').first().click();
  const link = p.getByTestId('lite-dev-field'); await link.waitFor(); const href = await link.getAttribute('href');
  ok('VS-01', 'Lite: the furnished room opens with its devices; a device leads to its field record', hits >= 5 && href.includes(`room=${ROOM}`), `${hits} devices · ${href}`);
  await link.click(); await p.getByTestId('field-redline').waitFor(); const dev = await p.locator('.fr__panel').getAttribute('data-device');
  await p.getByLabel(`Mounting method of ${dev}`).selectOption('wall-bracket'); await p.getByLabel(`Fixing of ${dev}`).fill('tilting wall mount, 6 × lag bolts into blocking');
  await p.getByRole('button', { name: 'Record the mounting' }).click(); await p.getByTestId('fr-mount-current').waitFor();
  await p.reload(); await p.getByTestId('field-redline').waitFor();
  ok('VS-02', 'Engineering: the installer records how the device is mounted, and the record is kept across a reload', (await p.locator(`[data-testid=fr-svg] [data-device="${dev}"].is-mounted`).count()) === 1, dev); }

let inc = '';
{ await as('cxeng', `#/commissioning/deficiencies?d=${encodeURIComponent(DEF)}`); await p.getByTestId('df-bench').waitFor();
  const sel = await p.getByTestId('df-select').inputValue(); await p.getByTestId('df-handoff').click(); await p.getByTestId('df-refused').waitFor();
  const refused = await p.getByTestId('df-refused').innerText();
  await as('svcmgr', `#/thread?room=${ROOM}`); await p.getByTestId('th-handoff').click(); await p.getByTestId('th-said').waitFor(); const said = await p.getByTestId('th-said').innerText();
  inc = (said.match(/ISS-\d{4}/) || [''])[0];
  ok('VS-03', 'Commissioning: the Commissioning Engineer may not hand the deficiency to service; the Service Manager does from the room’s thread, once', sel === DEF && /issue\.assign|service\.triage/.test(refused) && /^ISS-\d{4}$/.test(inc) && (await p.getByTestId('th-handoff').count()) === 0, `${refused.slice(0, 90)} · ${said.slice(0, 80)}`); }

{ await p.getByTestId('th-service-open').click(); await p.locator('[data-testid=incident]').waitFor();
  const src = await p.getByTestId('svc-source').innerText();
  await p.click('[data-testid=incident] button:has-text("Triage")'); await p.waitForTimeout(250);
  await p.click('[data-testid=incident] button:has-text("Open a work order and rank the pool")'); await p.waitForTimeout(300);   // a new incident has no work order yet
  if (!/ASSIGNED/.test(await head())) { await p.click('[data-testid=candidates] li >> nth=0 >> button:has-text("Assign")'); await p.waitForTimeout(300); }
  const assigned = await p.locator('[data-testid=incident]').innerText();
  await as('service', `#/v25/service?id=${inc}`); await p.click('[data-testid=incident] button:has-text("Accept the job")'); await p.waitForTimeout(300);
  await as('svcmgr', `#/v25/service?id=${inc}`);
  if (await p.locator('[data-testid=dispatch-plan]').count()) { await p.click('[data-testid=dispatch-plan] button:has-text("Propose the next free window")').catch(() => {}); await p.waitForTimeout(250);
    while (await p.locator('[data-testid=dispatch-plan] button:has-text("Recheck stock")').count()) { await p.locator('[data-testid=dispatch-plan] button:has-text("Recheck stock")').first().click(); await p.waitForTimeout(200); } }
  await as('service', `#/v25/service?id=${inc}`); await p.waitForSelector('[data-testid=preflight]');
  for (const box of await p.locator('[data-testid=preflight] input[type=checkbox]').all()) await box.check();
  await p.click('[data-testid=preflight] button:has-text("Start the work")'); await p.waitForTimeout(300); const started = await head();
  await p.click('[data-testid=incident] button:has-text("Hand over for independent verification")'); await p.waitForTimeout(250); const noEvidence = await alert();
  await p.selectOption('[data-testid=incident] select[aria-label="Evidence kind"]', { index: 0 }); await p.fill('[data-testid=incident] input[aria-label="Evidence note"]', 'Standby set to wake on signal; the display woke on the first try three times (synthetic)');
  await p.click('[data-testid=incident] button:has-text("Record evidence")'); await p.waitForTimeout(250);
  await p.click('[data-testid=incident] button:has-text("Hand over for independent verification")'); await p.waitForTimeout(250);
  await p.click('[data-testid=incident] button:has-text("Verify the repair")').catch(() => {}); await p.waitForTimeout(250); const self = await head();
  await as('cxeng', `#/v25/service?id=${inc}`); await p.click('[data-testid=incident] button:has-text("Verify the repair")'); await p.waitForTimeout(300);
  ok('VS-04', 'ServiceHands: the incident names its deficiency and runs to RESOLVED; no evidence and self-verification are both refused', /ISS-ATL-7-112/.test(src) && /Ana Reyes/.test(assigned) && /IN_PROGRESS/.test(started) && /no field evidence/.test(noEvidence) && /VERIFYING/.test(self) && /RESOLVED/.test(await head()), `${started} | ${noEvidence.slice(0, 60)} | ${self} | ${await head()} | ${await alert()}`); }

{ await as('cxeng', `#/thread?room=${ROOM}`); await p.getByTestId('thread').waitFor();
  const missing = await p.getByTestId('th-missing').innerText(); const assurance = await p.getByTestId('th-assurance').innerText();
  ok('VS-05', 'resolving the job did not close the deficiency: the thread still asks for the verified retest, and assurance still counts it open', /verified retest/.test(missing) && /1 open deficiency/.test(assurance) && (await p.getByTestId('thread').getAttribute('data-complete')) === 'no', missing); }

{ const at = `#/commissioning/deficiencies?d=${encodeURIComponent(DEF)}`;
  await as('cxeng', at); await p.getByTestId('df-owner').selectOption('installer'); await p.getByTestId('df-do-start').click(); await p.getByTestId('df-done').waitFor();
  await as('installer', at); await p.getByTestId('df-action').fill('Standby mode set to wake on signal; the power setting was corrected on the display.'); await p.getByTestId('df-do-fixed').click(); await p.getByTestId('df-done').waitFor();
  await as('cxeng', at); await p.getByTestId('df-evidence').fill('EV-7112-RT1'); await p.getByTestId('df-do-retest').click(); await p.getByTestId('df-done').waitFor();
  await p.getByTestId('df-do-verify').click(); await p.getByTestId('df-refused').waitFor(); const self = await p.getByTestId('df-refused').innerText();
  await as('syseng', at); await p.getByTestId('df-do-verify').click(); await p.getByTestId('df-done').waitFor();
  ok('VS-06', 'the deficiency closes by its retest: fix recorded, retest with evidence, the retester refused, a different engineer verifies', (await p.getByTestId('df-states').getAttribute('data-state')) === 'CLOSED' && self.length > 20, self.slice(0, 120)); }

let apx = '';
{ await as('cxeng', `#/v25/apex?incident=${inc}`); await p.click(`button:has-text("Open a case for ${inc}")`); await p.waitForSelector('[data-testid=apex-case]');
  const c = await p.locator('[data-testid=apex-case]').innerText(); apx = (c.match(/APX-\d{3}/) || [''])[0];
  ok('VS-07', 'APEX: a case opens on the incident with ranked hypotheses and what is against them', /input mapping|standby|display/i.test(c) && /medium|low/i.test(c), c.slice(0, 160).replace(/\n/g, ' ')); }

{ await as('qa', `#/thread?room=${ROOM}`); await p.getByTestId('thread').waitFor();
  const whole = await p.getByTestId('thread').getAttribute('data-complete'); const links = await p.getByTestId('th-links').innerText();
  const a = await p.getByTestId('th-assurance').innerText(); const s = await p.getByTestId('th-service').innerText(); const x = await p.getByTestId('th-apex').innerText(); const e = await p.getByTestId('th-engineering').innerText();
  const cases = await p.evaluate((room) => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).apexCases.filter((c) => c.roomId === room).map((c) => c.id), ROOM);
  ok('VS-08', 'the thread is whole: baseline v1, the deficiency closed by EV-7112-RT1 and verified by someone else, the six stages tied by the same ids', whole === 'yes' && /baseline v1 accepted · 0 open/.test(a) && /EV-7112-RT1, verified by syseng/.test(a) && s.includes(inc) && /RESOLVED/.test(s) && cases.length === 1 && x.includes(cases[0]) && /1 of \d+ mountings/.test(e)
    && links.includes(`ISS-ATL-7-112 → ${inc}`) && links.includes(`${inc} → ${cases[0]}`) && links.includes('EV-7112-RT1'), `${whole} · ${links.replace(/\n/g, ' ').slice(0, 220)}`);
  await p.reload(); await p.getByTestId('thread').waitFor();
  ok('VS-09', 'the records are kept: after a reload the thread is still whole', (await p.getByTestId('thread').getAttribute('data-complete')) === 'yes' && (await p.getByTestId('th-links').innerText()).includes(inc));
  ok('VS-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | ')); }
await t.close();
{ const m = await open(`#/thread?room=${ROOM}`, { role: 'syseng', sw: false, w: 390, h: 844 }); await m.page.getByTestId('thread').waitFor();
  const sw = await m.page.evaluate(() => document.documentElement.scrollWidth - innerWidth); await m.close();
  ok('VS-10', 'phone width: the thread does not scroll sideways', sw <= 1, `overflow ${sw}px`); }
await done();
