#!/usr/bin/env node
// Scouter inside Lite (D41, BRIEF_SCOUTER): reachable from Lite, the designer's home tab, find ("scouter", "evaluate a device", "does this
// device suit") and its V2.5.3 addresses; the nine catalogue device classes checked against the room's own requirement, every check citing
// its source and basis; nothing invented; what is not rebuilt is said; proposing only for scout.pick. Destructive: bad addresses,
// keyboard only, reload mid-flow, 390 px.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-scouter');

for (const w of [1440, 390]) {
  const t = await open('#/campus/scouter', { role: 'architect', w, h: 860 }); const p = t.page;
  const rows = await p.$$eval('.scouter__row', (r) => r.map((x) => ({ v: x.dataset.verdict, name: x.querySelector('.scouter__name').textContent, why: x.querySelector('.scouter__why').textContent })));
  const order = ['SUITS', 'SUITS_WITH_CONDITION', 'DOES_NOT_SUIT', 'NOT_REQUIRED'];
  ok(`S-${w}-01`, `${w} px: the nine device classes, ranked by verdict, each with its reason`, rows.length === 9 && rows.every((r, i) => i === 0 || order.indexOf(r.v) >= order.indexOf(rows[i - 1].v)) && rows.every((r) => r.why.length > 8), JSON.stringify(rows));
  ok(`S-${w}-02`, `${w} px: nothing invented — no price, brand or model on the page; the gaps are listed with their parity rows`, !/\$\d|Vantora|Orvique|Sonarith/.test(await main(p)) && /Not rebuilt yet/.test(await main(p)) && /LP-\d{3}/.test(await main(p)));
  await p.selectOption('.scouter__field select', 'training'); await p.waitForTimeout(250);
  ok(`S-${w}-03`, `${w} px: choosing a room re-evaluates against its requirement (training: the video bar cannot hear the back row)`, /room=training/.test(p.url()) && await p.locator('.scouter__row[data-verdict=DOES_NOT_SUIT]', { hasText: 'Video bar' }).count() === 1);
  await p.click('.scouter__row >> nth=0 >> a'); await p.waitForSelector('#scouter-d');
  const det = await p.evaluate(() => Array.from(document.querySelectorAll('.scouter__detail tbody tr')).map((r) => r.innerText));
  ok(`S-${w}-04`, `${w} px: a class shows every check with its result, basis (PUBLISHED or MODELED) and its source in the domain data`, det.length >= 2 && det.every((t) => /(PUBLISHED|MODELED)/.test(t) && /V25_ROOM_/.test(t)), det.join(' / '));
  await p.click('text=Propose for the design'); await p.waitForTimeout(150); await p.reload(); await p.waitForSelector('#scouter-d');
  ok(`S-${w}-05`, `${w} px: destructive: a proposal survives a reload mid-flow and says who made it`, /Proposed for this room:.*by Product Architect/.test(await main(p)));
  ok(`S-${w}-06`, `${w} px: no sideways scroll, no console error, nothing off the page`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && !t.errs.length && !t.off.length, t.errs.join(' | '));
  await t.close();
}
for (const a of ['#/scouter', '#/v25/scouter', '#/lite/scouter', '#/suite/scouter', '#/scouter/camera']) {
  const t = await open(a, { role: 'designer' });
  ok(`S-07 ${a}`, `the V2.5.3 address ${a} opens Scouter, never the boundary page`, await t.page.locator('#scouter-h').count() === 1 && !/Not migrated yet/.test(await main(t.page))); await t.close();
}
{ const t = await open('#/investor', { role: 'designer' }); const p = t.page;
  ok('S-08', 'discoverable from the designer’s home tabs (V2.5.3 tabsFor)', await p.locator('[data-testid=hometabs] a', { hasText: 'Scouter' }).count() === 1);
  await p.click('[data-testid=menu-open]');
  ok('S-09', 'discoverable in the menu, by name under Lite', await p.locator('[data-testid=menu] .drawer__product[data-p=lite] .drawer__pages a b', { hasText: /^Scouter$/ }).count() === 1 /* 12 Nov 2026: exact title, since “Scouter anatomy” (restored) is also listed under Lite */); await p.keyboard.press('Escape');
  for (const q of ['scouter', 'evaluate a device', 'does this device suit', 'which camera']) { await p.fill('#find-in', q); await p.waitForTimeout(120); ok(`S-10 ${q}`, `find answers “${q}” with Scouter first`, /Scouter/.test(await p.locator('#find-list [role=option]').first().innerText().catch(() => ''))); }
  await p.fill('#find-in', 'scouter'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('S-11', 'Enter on the first result opens it, inside Lite (breadcrumb)', /#\/campus\/scouter/.test(p.url()) && /Lite · Scouter/.test(await p.locator('.product-kicker').innerText())); await t.close(); }
{ const t = await open('#/campus/scouter?room=NOPE', { role: 'designer' });
  ok('S-12', 'destructive: an unknown room falls back to the first room', /Huddle Room: Small-team/.test(await main(t.page)));
  await t.page.evaluate(() => { location.hash = '#/campus/scouter/NO-SUCH-THING'; }); await t.page.waitForTimeout(250);
  ok('S-13', 'destructive: an unknown class shows the list without a detail, no error', await t.page.locator('#scouter-h').count() === 1 && await t.page.locator('#scouter-d').count() === 0 && !t.errs.length);
  await t.page.evaluate(() => { location.hash = '#/campus/scouter/ledwall?room=huddle'; }); await t.page.waitForSelector('#scouter-d');
  ok('S-14', 'a class that does not suit cannot be proposed, and says why', await t.page.locator('button', { hasText: 'Propose' }).count() === 0 && /cannot be proposed/.test(await main(t.page)));
  await t.page.focus('.scouter__field select'); await t.page.keyboard.press('ArrowDown'); await t.page.waitForTimeout(250);
  ok('S-15', 'keyboard: the room select works without a pointer', /room=small_conf/.test(t.page.url()), t.page.url());
  await t.close(); }
// 12 Nov 2026: standard kits (V2.5.3 v25Scout*): draft, send, decided only by another role, published with a version, adopted into a concept
{ const t = await open('#/campus/scouter?room=medium_conf', { role: 'designer' }); const p = t.page; await p.evaluate(() => localStorage.removeItem('empathia.demo.scouterProfiles.v1'));
  await p.getByTestId('scouter-propose-kit').click(); const kit = p.locator('[data-profile]').first(); await kit.waitFor(); const items = await kit.locator('ul li').count();
  await kit.getByTestId('scouter-pf-send').click(); await kit.getByTestId('scouter-pf-note').fill('looks right'); await kit.getByTestId('scouter-pf-approve').click(); const self = await p.getByTestId('scouter-pf-said').innerText();
  ok('S-20', 'a designer drafts a kit of the classes that suit the room and sends it; the role that proposed it cannot approve it', items >= 1 && /cannot decide/.test(self) && await kit.getAttribute('data-state') === 'ENGINEERING_REVIEW', self);
  await p.evaluate(() => localStorage.setItem('empathia.demo.perspective', 'syseng')); await p.reload(); await p.waitForSelector('[data-profile]');
  const k2 = p.locator('[data-profile]').first(); await k2.getByTestId('scouter-pf-note').fill('kit matches the template'); await k2.getByTestId('scouter-pf-approve').click(); await k2.getByTestId('scouter-pf-publish').click();
  const st = await k2.getAttribute('data-state'); const tag = await k2.innerText();
  await k2.getByTestId('scouter-pf-adopt').click(); await p.waitForTimeout(400); const url = p.url(); const studio = await main(p);
  ok('S-21', 'a systems engineer approves and publishes it as version 1; adopting it opens a Design a Space concept carrying the kit', st === 'PUBLISHED' && /v1/.test(tag) && /#\/studio\/new\/saved:S-sp-001-/.test(url) && /standard kit v1/.test(studio), `${st} ${url}`);
  ok('S-22', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | ')); await t.close(); }
await done();
