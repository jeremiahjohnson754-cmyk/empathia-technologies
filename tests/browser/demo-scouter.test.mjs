#!/usr/bin/env node
// Scouter inside Lite (D41): reachable from Lite, the designer's home tab, find aliases and its V2.5.3 addresses; gates before scores;
// every score with its basis; spatial fit modelled; a choice recorded only by a role that may make it. Destructive: bad addresses,
// keyboard only, reload mid-flow.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-scouter');

{ const t = await open('#/campus/scouter', { role: 'architect' }); const p = t.page;
  const rows = await p.$$eval('.scouter__row', (r) => r.map((x) => ({ out: x.classList.contains('scouter__row--out'), why: x.querySelector('.scouter__why').textContent, score: x.querySelector('.scouter__score').textContent })));
  const firstOut = rows.findIndex((r) => r.out);
  ok('S-01', 'the candidates are listed, every eligible one above every ineligible one, each with its reason', rows.length >= 3 && (firstOut < 0 || rows.slice(firstOut).every((r) => r.out)) && rows.filter((r) => r.out).every((r) => r.why.length > 10), JSON.stringify(rows));
  ok('S-02', 'every score states the share of the weight it rests on and a confidence', rows.every((r) => /% of the weight · (High|Medium|Low) confidence/.test(r.score)));
  await p.selectOption('.scouter__field select', 'R-BCN-3-101'); await p.waitForTimeout(250);
  ok('S-03', 'choosing a room changes the address and the evaluation (Beacon has a pilot plan, so the pilot camera is eligible)', /room=R-BCN-3-101/.test(p.url()) && !(await p.locator('.scouter__row', { hasText: 'Orbit 4K PTZ II' }).getAttribute('class')).includes('--out'));
  await p.check('input[name=scouter-cat][value=display]'); await p.waitForTimeout(250);
  ok('S-04', 'choosing a category re-evaluates (displays)', /cat=display/.test(p.url()) && /VX-86/.test(await main(p)));
  await p.click('.scouter__row a >> nth=0'); await p.waitForSelector('#scouter-d');
  const det = await p.evaluate(() => ({ dims: document.querySelectorAll('.scouter__detail tbody tr').length, spatial: Array.from(document.querySelectorAll('.scouter__detail tbody tr')).find((r) => /Spatial fit/.test(r.textContent))?.textContent, gates: document.querySelectorAll('.scouter__gates li').length }));
  ok('S-05', 'a candidate shows its gates and fifteen dimensions, each with its basis; spatial fit is MODELED, never measured', det.dims === 15 && /MODELED/.test(det.spatial) && det.gates >= 5, JSON.stringify(det));
  await p.click('text=Choose for the design'); await p.waitForTimeout(150); await p.reload(); await p.waitForSelector('#scouter-d');
  ok('S-06', 'destructive: a choice survives a reload mid-flow and says who made it', /Chosen for this room:.*by Product Architect/.test(await main(p)));
  ok('S-07', 'no console error, nothing off the page', !t.errs.length && !t.off.length, t.errs.join(' | ')); await t.close(); }

for (const a of ['#/scouter', '#/v25/scouter', '#/lite/scouter', '#/suite/scouter', '#/scouter/CAM-ORB4K']) {
  const t = await open(a, { role: 'designer' });
  ok(`S-08 ${a}`, `the V2.5.3 address ${a} opens Scouter`, await t.page.locator('#scouter-h').count() === 1); await t.close();
}
{ const t = await open('#/investor', { role: 'designer' }); const p = t.page;
  ok('S-09', 'discoverable from the designer’s home tabs (V2.5.3 tabsFor)', await p.locator('[data-testid=hometabs] a', { hasText: 'Scouter' }).count() === 1);
  await p.click('[data-testid=menu-open]');
  ok('S-10', 'discoverable in the menu, under Lite', await p.locator('[data-testid=menu] .drawer__product[data-p=lite] .drawer__pages a', { hasText: 'Scouter' }).count() === 1); await p.keyboard.press('Escape');
  for (const q of ['scouter', 'which display', 'compare devices', 'equipment shortlist']) { await p.fill('#find-in', q); await p.waitForTimeout(120); ok(`S-11 ${q}`, `find answers “${q}” with Scouter first`, /Scouter/.test(await p.locator('#find-list [role=option]').first().innerText().catch(() => ''))); }
  await p.fill('#find-in', 'scouter'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('S-12', 'Enter on the first result opens it', /#\/campus\/scouter/.test(p.url()) && await p.locator('#scouter-h').count() === 1); await t.close(); }

{ const t = await open('#/campus/scouter?room=NOPE&cat=%3Cscript%3E', { role: 'designer' });
  ok('S-13', 'destructive: an unknown room or category falls back to the defaults', /Atlas HQ 4\.218/.test(await main(t.page)) && await t.page.locator('input[name=scouter-cat][value=camera]').isChecked());
  await t.page.evaluate(() => { location.hash = '#/campus/scouter/NO-SUCH-THING'; }); await t.page.waitForTimeout(250);
  ok('S-14', 'destructive: an unknown candidate shows the list without a detail, no error', await t.page.locator('#scouter-h').count() === 1 && await t.page.locator('#scouter-d').count() === 0 && !t.errs.length);
  // keyboard only: arrow keys move the category radio group
  await t.page.focus('input[name=scouter-cat][value=camera]'); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(250);
  ok('S-15', 'keyboard: arrow keys move through the categories', /cat=display/.test(t.page.url()));
  await t.close(); }
await done();
