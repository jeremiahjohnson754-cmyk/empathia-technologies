#!/usr/bin/env node
// The Assurance command center, ready checks, change impact, signals, Commissioning deficiencies and APEX, against V2.5.3's (13 Nov 2026,
// founder: "make sure your version of commissioning assurance apex surpasses v2.5.3's"). Walked as a person would: the sections are
// read, the remedies opened, the ready list filtered, a waiting change expanded, another change simulated by its controls, the device
// signal's links followed; a role that may not open Assurance is refused. Every figure is modelled from synthetic records.
//   node tests/browser/demo-assurance-v253.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-assurance-v253');
const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  // the command center
  let t = await open('#/assurance', { role: 'architect', w, h, sw: false }); let p = t.page; p.setDefaultTimeout(10000);
  await p.getByTestId('as-trend').waitFor();
  const trend = await p.getByTestId('as-trend').innerText();
  ok(`AH-${tag}-01`, 'which way it is moving: four weekly runs, matched, drift and failure, with this week against the first', (await p.locator('[data-testid=as-trend] .wk-bars > li').count()) === 4 && /This week \d+ of \d+ runs matched the baseline \(\d+%\)/.test(trend) && /modelled schedule/i.test(trend), trend.slice(0, 200));
  const rem = p.getByTestId('as-remedy'); const remT = await rem.innerText();
  ok(`AH-${tag}-02`, 'what the findings call for: four remedies, each with a count and a rough order of magnitude, labelled an estimate, not a quote', ['Recommissioning only', 'Minor remediation', 'Replacement', 'Redesign'].every((x) => remT.includes(x)) && /\$\d+k – \$\d+k/.test(remT) && /ROM estimate · not a quote/.test(remT) && /eighteen-component cost model/.test(remT), remT.slice(0, 200));
  await p.getByTestId('as-remedy-recommission').locator('summary').click();
  const rooms = p.getByTestId('as-remedy-recommission').locator('a'); const nRooms = await rooms.count();
  await p.getByTestId('as-cost-lines').locator('summary').click(); const lines = await p.getByTestId('as-cost-lines').innerText();
  ok(`AH-${tag}-03`, 'a remedy opens to its rooms, each priced; the estimate opens to its components', nRooms >= 2 && /Commissioning/.test(lines) && /Equipment/.test(lines) && /Contingency/.test(lines), `${nRooms} ${lines.slice(0, 120)}`);
  const href = await rooms.first().getAttribute('href'); await rooms.first().click(); await p.getByTestId('as-room').waitFor();
  ok(`AH-${tag}-04`, 'a room in a remedy opens its own Assurance page', (await p.evaluate(() => location.hash)) === href);
  await p.goBack(); await p.getByTestId('as-next').waitFor();
  const next = await p.getByTestId('as-next').innerText();
  ok(`AH-${tag}-05`, 'what to open next: the ready checks, recommissioning, the planned changes and the early signals, each with its count', /Clear the ready checks/.test(next) && /Recommission the rooms/.test(next) && /Simulate a validation plan/.test(next) && /Inspect the devices/.test(next));
  await p.getByTestId('as-next-change').click(); await p.getByTestId('change-waiting').waitFor();
  ok(`AH-${tag}-06`, '“Simulate a validation plan” opens Change impact', (await p.evaluate(() => location.hash)) === '#/assurance/change');
  await p.goBack(); await p.getByTestId('as-health').waitFor();
  const health = await p.getByTestId('as-health').innerText(); const rev = await p.getByTestId('as-reviews').innerText();
  ok(`AH-${tag}-07`, 'the room health check counts rooms and seats from faults on record; the design reviews give each room its score and the rule', /Rooms with a device fault/.test(health) && /Seats in rooms with layout drift/.test(health) && /Score \d+/.test(rev) && /under 70/.test(rev), rev.slice(0, 160));
  const tile = await p.getByTestId('tiles').innerText();
  ok(`AH-${tag}-08`, 'the ready tile counts the high and mission-critical rooms, with a note and needing attention', /Ready for the next session/.test(tile) && /with a note/.test(tile) && /need attention/.test(tile));
  ok(`AH-${tag}-09`, 'no sideways scroll; no console error; nothing requested off the page', (await sideways(p)) <= 0 && !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();

  // ready checks
  t = await open('#/assurance/ready', { role: 'architect', w, h, sw: false }); p = t.page; await p.getByTestId('ready-sessions').waitFor();
  const first = await p.getByTestId('ready-R-ATL-4-218').innerText();
  ok(`AR-${tag}-01`, 'the least ready room comes first, with its session, the check that holds it and its answer', /Atlas 4\.218/.test(await p.locator('[data-testid=ready-sessions] li').first().innerText()) && /Board review/.test(first) && /Attention required/.test(first), first);
  await p.getByTestId('ready-sessions').getByRole('radio', { name: 'With a note' }).click(); await p.waitForTimeout(150);
  const notes = await p.locator('[data-testid=ready-sessions] .kit-row__trail').allInnerTexts();
  ok(`AR-${tag}-02`, 'the list filters to the rooms ready with a note', notes.length > 0 && notes.every((x) => /Ready with note/.test(x)), notes.slice(0, 3).join());
  await p.getByTestId('ready-sessions').getByRole('radio', { name: 'All' }).click(); await p.getByTestId('ready-R-ATL-4-218').click(); await p.getByTestId('as-ready').waitFor();
  const checks = await p.locator('[data-testid=as-ready] li').count(); const rt = await p.getByTestId('as-ready').innerText();
  ok(`AR-${tag}-03`, 'the room’s own ready check lists all eleven checks, with what is not in the room said so', checks === 11 && /Meeting service/.test(rt) && /Known open issues/.test(rt) && /Attention required/.test(rt), `${checks}`);
  await t.close();

  // change impact
  t = await open('#/assurance/change', { role: 'architect', w, h, sw: false }); p = t.page; await p.getByTestId('change-waiting').waitFor();
  const waiting = await p.locator('[data-testid=change-waiting] > div li[data-testid^=change-PC], [data-testid^=change-PC]').count();
  await p.getByTestId('change-PC-02').locator('summary').click(); const plan = await p.getByTestId('change-PC-02').innerText();
  ok(`AC-${tag}-01`, 'the changes waiting each say what they reach; one opens to its validation plan (before, window, after in waves, go back)', waiting >= 6 && /Before\./.test(plan) && /After\./.test(plan) && /wave/.test(plan) && /Go back\./.test(plan), `${waiting} ${plan.slice(0, 160)}`);
  const sim = p.getByTestId('change-sim'); await sim.getByRole('radio', { name: 'Firmware' }).click();
  const opts = await p.getByTestId('change-target').locator('option').allInnerTexts(); await p.getByTestId('change-target').selectOption({ label: 'Touch controller firmware' });
  await p.getByTestId('change-find').click(); const res = await p.getByTestId('change-result').innerText();
  ok(`AC-${tag}-02`, 'another change is simulated by its controls: firmware for the touch controllers reaches rooms and devices, with its plan', opts.some((x) => /Touch controller/.test(x)) && /\d+ rooms?, \d+ devices?/.test(res) && /Run the same \d+ checks/.test(res) && (await p.getByTestId('change-find').isDisabled()), res.slice(0, 160));
  ok(`AC-${tag}-03`, 'no sideways scroll; no console error', (await sideways(p)) <= 0 && !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();

  // signals
  t = await open('#/assurance/signals', { role: 'architect', w, h, sw: false }); p = t.page; await p.getByTestId('signals-devices').waitFor();
  const sig = p.locator('[data-testid^="signal-R-"]').first(); const st = await sig.innerText();
  ok(`AS-${tag}-01`, 'a device with two signs from the records is listed with its evidence, inferred, with no failure date', /Inspection recommended/.test(st) && /no date is given/.test(st) && (await sig.locator('.as-signal__ev li').count()) >= 2, st.slice(0, 160));
  await sig.getByRole('link', { name: /in Assurance$/ }).click(); await p.getByTestId('as-room').waitFor();
  ok(`AS-${tag}-02`, 'the signal leads to its room in Assurance', /^#\/assurance\/room\/R-/.test(await p.evaluate(() => location.hash)));
  await t.close();

  // deficiencies
  t = await open('#/commissioning/deficiencies', { role: 'architect', w, h, sw: false }); p = t.page; await p.getByTestId('cx-owners').waitFor();
  const own = await p.getByTestId('cx-owners').innerText(); const late = await p.getByTestId('cx-late').innerText();
  ok(`AD-${tag}-01`, 'each open deficiency has an owner and a target date; those past it are listed first; the rule is stated', /Integrator/.test(own) && /Internal AV/.test(own) && /14 days for high/.test(own) && /due \d{4}-\d\d-\d\d/.test(late), late.slice(0, 160));
  await t.close();

  // APEX
  t = await open('#/v25/apex', { role: 'cxeng', w, h, sw: false }); p = t.page; await p.getByTestId('apex-tiers').waitFor();
  const cases = await p.getByTestId('apex-cases').innerText(); const tiers = await p.locator('[data-testid=apex-tiers] tbody tr').count();
  ok(`AX-${tag}-01`, 'APEX opens on a worked case (as V2.5.3 did) with its hypotheses, and the six action tiers with their boundaries', /APX-001/.test(cases) && /3 hypotheses/.test(cases) && tiers === 6 && (await p.getByTestId('apex-case').count()) === 1, `${cases} ${tiers}`);
  await t.close();
}
{ const t = await open('#/assurance', { role: 'visitor', sw: false }); const p = t.page; await p.waitForTimeout(800);
  ok('AH-visitor', 'a visitor is refused the Assurance command center (the access page, not the estate)', (await p.getByTestId('assurance').count()) === 0 && (await p.locator('[data-testid=access-page]').count()) === 1);
  await t.close(); }
await done();
