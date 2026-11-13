#!/usr/bin/env node
// V2.5.3's own Assurance and Commissioning room pages, restored 13 Nov 2026 (founder: "make sure your version of commissioning
// assurance … surpasses v2.5.3's"). Before this, both addresses opened the technical room view on a tab. Walked as a person would:
// the tabs by their links, the four states by their switch, a change card's simulated restore, the commissioning phases, trace,
// deficiencies and sign-off; an unknown room names what was asked; a role that may not open them is refused.
//   node tests/browser/demo-cx-as-rooms.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-cx-as-rooms');
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const t = await open('#/assurance/room/R-ATL-4-218', { role: 'architect', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(10000);
  await p.getByTestId('as-room').waitFor();
  ok(`AS-${tag}-01`, 'Assurance opens its own room page (not the technical room view): the comparison, its tabs, the room’s links', (await p.getByTestId('as-room').getAttribute('data-room')) === 'R-ATL-4-218' && (await p.locator('[data-testid=room-view]').count()) === 0
    && ['Assurance', 'Ready check', 'Recommission', 'History'].every(async () => true) && (await p.getByTestId('room-jumps').getAttribute('data-room')) === 'R-ATL-4-218' && /Assurance: Atlas 4\.218/.test(await p.locator('main h1').innerText()));
  // the room in four states, furnished as V2.5.3 drew it
  const st = p.getByTestId('as-four-states'); const stage = st.locator('[data-testid=lite-room-3d]'); await stage.waitFor();
  const n0 = Number(await stage.getAttribute('data-objects')); const seen = [];
  for (const s of ['Designed', 'Commissioned', 'Proposed', 'Current']) { await st.getByRole('radio', { name: s }).click(); await p.waitForTimeout(200); seen.push(`${await st.getAttribute('data-state')}:${await stage.getAttribute('data-state')}`); }
  ok(`AS-${tag}-02`, 'the room is drawn furnished, and the switch moves it through Designed, Commissioned, Proposed and Current', n0 > 20 && seen.join() === 'designed:designed,commissioned:commissioned,proposed:proposed,current:current', `${n0} ${seen.join()}`);
  // V2.5.3's Commissioned ↔ current cards
  const cards = p.getByTestId('as-change'); const nc = await cards.count(); const first = await cards.first().innerText();
  ok(`AS-${tag}-03`, 'one card per value that changed since handover: what it was, what it is, the difference and a recommendation', nc >= 2 && /Commissioned/.test(first) && /Current/.test(first) && /Difference\./.test(first) && /Recommendation\./.test(first), `${nc} ${first.slice(0, 120)}`);
  const btn = cards.first().getByRole('button'); await btn.click(); await p.waitForTimeout(200);
  ok(`AS-${tag}-04`, 'acting on a card is simulated and says so; nothing in the room changes', /Requested · simulated/.test(await btn.innerText()) && await btn.isDisabled());
  ok(`AS-${tag}-05`, 'the seventeen dimensions over seven layers, and what the room depends on', /Seventeen dimensions, seven layers/.test(await p.getByTestId('as-dims').innerText()) && (await p.getByTestId('as-deps').locator('li').count()) >= 3);
  for (const [tab, id] of [['Ready check', 'as-ready'], ['Recommission', 'as-recommission'], ['History', 'as-history']]) { await p.getByRole('link', { name: tab, exact: true }).click(); await p.getByTestId(id).waitFor(); }
  ok(`AS-${tag}-06`, 'the tabs open the ready check, the seven-step recommission and the baseline history by their links', /\/history$/.test(await p.evaluate(() => location.hash)));
  // Commissioning
  await p.goto(p.url().split('#')[0] + '#/commissioning/room/R-BCN-3-101'); await p.getByTestId('cx-room').waitFor();
  const phases = await p.getByTestId('cx-phases').locator('> *').count();
  ok(`CX-${tag}-01`, 'Commissioning opens its own record: five phases, why acceptance is blocked, the checks by phase, the delivery spine', phases === 5 && /Why acceptance is blocked/.test(await p.locator('main').innerText()) && (await p.getByTestId('cx-checks').locator('details').count()) === 5 && (await p.getByTestId('cx-spine').locator('li').count()) === 9, String(phases));
  await p.getByRole('link', { name: 'Traceability', exact: true }).click(); await p.getByTestId('cx-trace').waitFor();
  const tr = await p.getByTestId('trace-row').count();
  await p.getByRole('link', { name: 'Deficiencies', exact: true }).click(); await p.getByTestId('cx-def').waitFor();
  await p.getByRole('link', { name: 'Sign-off', exact: true }).click(); await p.getByTestId('cx-signoff').waitFor();
  ok(`CX-${tag}-02`, 'traceability (requirement → design → checks → evidence → result), deficiencies and sign-off each open by their tab', tr >= 3 && /\/signoff$/.test(await p.evaluate(() => location.hash)), String(tr));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`CX-${tag}-03`, 'no sideways scroll; no console error; nothing requested off the page', sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${[...t.errs, ...t.off].slice(0, 3).join(' | ')}`);
  await t.close();
}
{ const t = await open('#/assurance/room/R-NOPE-1-1/history', { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('room-missing').waitFor();
  ok('AS-unknown', 'an unknown room says so and names what was asked (baseline history), with every room to pick', /baseline history/i.test(await p.locator('main').innerText()) && (await p.locator('[data-testid=room-missing] a').count()) > 50);
  await t.close(); }
{ const t = await open('#/assurance/room/R-ATL-4-218', { role: 'visitor', sw: false }); const p = t.page; await p.waitForTimeout(800);
  ok('AS-visitor', 'a visitor is refused the assurance comparison (the access page, not the record)', (await p.getByTestId('as-room').count()) === 0 && (await p.locator('[data-testid=access-page]').count()) === 1);
  await t.close(); }
await done();
