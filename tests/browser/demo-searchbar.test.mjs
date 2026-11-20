#!/usr/bin/env node
// The demo-wide search (#/find): an ARIA combobox over rooms, devices, products and the V2.5.3 destinations (the shell's header Quick
// find covers registered pages and hands unmatched text on); aliases ("tv", "mic", "4.218"); arrow keys + Enter open a
// suggestion; Enter with nothing highlighted opens #/find; Escape closes; hostile input is inert; empty and unmatched states say so.
// SB-13 to SB-20: the query is read as a sentence: corrected, turned into conditions, answered with a count from the room records.
//   node tests/browser/demo-searchbar.test.mjs
import { harness, VIEWPORTS, SCHEMES } from './demo-spaces-lib.mjs';
const { ok, open, done } = await harness('demo-searchbar');
const INPUT = '[data-testid="searchbar"] input';

for (const scheme of SCHEMES) for (const vp of VIEWPORTS) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/find' });
  const a11y = await t.page.evaluate((s) => { const i = document.querySelector(s); const r = i?.getBoundingClientRect(); return { role: i?.getAttribute('role'), label: i ? document.querySelector(`label[for="${i.id}"]`)?.textContent : '', h: r?.height || 0, visible: !!r && r.width > 100 }; }, INPUT);
  ok(`SB-${tag}-01`, 'the search bar is a labelled combobox, visible and at least 44 px tall', a11y.role === 'combobox' && /Search/.test(a11y.label || '') && a11y.visible && a11y.h >= 44, JSON.stringify(a11y));
  await t.page.fill(INPUT, '4.218'); await t.page.waitForTimeout(150);
  const first = await t.page.locator('[role="listbox"] [role="option"]').first().innerText().catch(() => '');
  ok(`SB-${tag}-02`, '“4.218” suggests the reference room first', /Atlas 4\.218/.test(first), first);
  await t.page.keyboard.press('ArrowDown'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);
  ok(`SB-${tag}-03`, 'arrow down + Enter opens the suggestion', (await t.page.evaluate(() => location.hash)) === '#/campus/ATL/4/R-ATL-4-218');
  await t.go('#/find'); await t.page.fill(INPUT, 'tv'); await t.page.waitForTimeout(150);
  ok(`SB-${tag}-04`, 'the alias “tv” finds displays', /Display/.test(await t.page.locator('[role="listbox"]').innerText().catch(() => '')));
  await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(100);
  ok(`SB-${tag}-05`, 'Escape closes the suggestions', await t.page.evaluate(() => document.querySelector('[role="listbox"]').hidden));
  await t.page.fill(INPUT, 'tv'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);   // 'tv' (not 'mic', which is itself a prefix of 'microphone') needs the alias, so the page must explain it
  ok(`SB-${tag}-06`, 'Enter with nothing highlighted opens the results page, grouped, with the alias explained', /#\/find\?q=tv/.test(await t.page.evaluate(() => location.hash)) && /Display/.test(await t.text()) && /alias/.test(await t.text()));
  await t.go('#/find?q=zzqx-nothing', 300);
  ok(`SB-${tag}-07`, 'an unmatched query says so and offers Search Party', /Nothing matches/.test(await t.text()));
  await t.go('#/find');
  ok(`SB-${tag}-08`, 'an empty results page explains what to type', /Type in the search bar/.test(await t.text()));
  await t.go('#/find'); await t.page.fill(INPUT, '<img src=x onerror=alert(1)>"\'%00'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);
  ok(`SB-${tag}-09`, 'hostile input is shown as text, never executed', (await t.page.locator('main img[src="x"]').count()) === 0 && !t.errs.length, t.errs.join(' | '));
  await t.go('#/find'); await t.page.fill(INPUT, 'x'.repeat(200)); const len = await t.page.inputValue(INPUT);
  ok(`SB-${tag}-10`, 'the query is capped at 80 characters', len.length === 80, len.length);
  await t.page.fill(INPUT, ''); await t.page.fill(INPUT, 'search party'); await t.page.waitForTimeout(120);
  ok(`SB-${tag}-11`, 'a product is found by name', /Search Party/.test(await t.page.locator('[role="listbox"]').innerText().catch(() => '')));
  await t.page.keyboard.press('Escape'); await t.page.keyboard.press('Escape');
  // ── search that reads the sentence (search/understand.ts; founder, 10 Nov: "have them search whatever they want") ──────────────────
  const ans = () => t.page.evaluate(() => { const a = document.querySelector('[data-testid=find-answer]'); return a ? { total: Number(a.dataset.total), subject: a.dataset.subject, lead: a.querySelector('[data-testid=find-lead]').textContent, read: [...a.querySelectorAll('[data-testid=find-read] li > span')].map((x) => x.textContent), rows: a.querySelectorAll('[data-testid=find-rows] li').length, next: [...a.querySelectorAll('[data-testid=find-next] a')].map((x) => x.textContent) } : null; });
  await t.go('#/find?q=' + encodeURIComponent('bordrooms over 12 seats at atlas with a camera'), 350);
  const a1 = await ans(); const fx = await t.page.locator('[data-testid=find-fixes]').innerText().catch(() => '');
  // 13 Nov 2026: the campus holds 140 rooms (V2.5.3's 50 brought back on the founder's word), so an answer counts "of 140"
  ok(`SB-${tag}-13`, 'a mistyped sentence is corrected, said to be corrected, read as four conditions and answered with a count and the rooms behind it', !!a1 && /boardrooms/.test(fx) && /“bordrooms” was read as “boardrooms”/.test(fx) && a1.read.join('|') === 'Boardroom|Atlas HQ|more than 12 seats|has a camera' && a1.total > 0 && a1.rows === a1.total && new RegExp(`^${a1.total} rooms? of 140\\.`).test(a1.lead), JSON.stringify([fx, a1]));
  const drop = t.page.locator('[data-testid=find-read] a[aria-label="Search again without: has a camera"]'); const box = await drop.boundingBox();
  await drop.click(); await t.page.waitForTimeout(350); const a2 = await ans();
  ok(`SB-${tag}-14`, 'each condition can be dropped with a 44 px control, and the answer is counted again', !!a2 && !!box && box.width >= 44 && box.height >= 44 && a2.read.join('|') === 'Boardroom|Atlas HQ|more than 12 seats' && a2.total >= a1.total, JSON.stringify([box, a2]));
  await t.go('#/find?q=' + encodeURIComponent('20+ seats huddle'), 350); const a3 = await ans();
  const firstNext = a3?.next[0] || ''; await t.page.locator('[data-testid=find-next] a').first().click().catch(() => {}); await t.page.waitForTimeout(350); const a4 = await ans();
  ok(`SB-${tag}-15`, 'no match is never a dead end: the page names the condition to drop and the count that gives, and that count is what the next page shows', !!a3 && a3.total === 0 && /No room on record meets all of these/.test(a3.lead) && /^Without “.+”: \d+ rooms?$/.test(firstNext) && !!a4 && a4.total === Number(/: (\d+) room/.exec(firstNext)?.[1]), JSON.stringify([a3, a4]));
  await t.go('#/find'); await t.page.fill(INPUT, 'how many cameras'); await t.page.waitForTimeout(200);
  const lead = await t.page.locator('[role="listbox"] [role="option"]').first().evaluate((o) => ({ kind: o.dataset.kind, text: o.innerText })).catch(() => ({}));
  await t.page.keyboard.press('ArrowDown'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(350); const a5 = await ans();
  ok(`SB-${tag}-16`, '“how many cameras” is answered in the suggestions, and opening it shows the count and the rooms', lead.kind === 'answer' && /\d+ camera positions in \d+ rooms of 140/.test(lead.text || '') && /#\/find\?q=how%20many%20cameras/.test(await t.page.evaluate(() => location.hash)) && !!a5 && a5.subject === 'devices' && a5.total > 0 && lead.text.includes(a5.lead), JSON.stringify([lead, a5]));
  await t.go('#/find?q=' + encodeURIComponent('accepted rooms'), 350); const a6 = await ans(); const btn = t.page.locator('[data-testid=find-all]'); const more = await btn.innerText().catch(() => '');
  await btn.click().catch(() => {}); await t.page.waitForTimeout(150); const a7 = await ans();
  ok(`SB-${tag}-17`, 'a long answer shows twelve rooms and then all of them, and the list is as long as the count', !!a6 && a6.rows === 12 && a6.total > 12 && more === `Show all ${a6.total}` && a7.rows === a6.total && a6.next.length >= 1, JSON.stringify([a6, more, a7?.rows]));
  await t.page.locator('[data-testid=find-rows] a').first().click(); await t.page.waitForTimeout(450);
  ok(`SB-${tag}-18`, 'a row of the answer opens that room', await t.page.evaluate(() => /^#\/(campus|rooms)\//.test(location.hash) && !document.querySelector('[data-testid=access-page]') && !!document.querySelector('main h1')), await t.page.evaluate(() => location.hash));
  // open issues are engineering information: the Executive does not get an answer built on them and is told so; the Service Manager does
  const asRole = async (r) => { await t.page.evaluate((x) => localStorage.setItem('empathia.demo.perspective', x), r); await t.page.reload({ waitUntil: 'load' }); await t.page.waitForTimeout(400); await t.go('#/find?q=' + encodeURIComponent('rooms with audio problems'), 400); return { a: await ans(), text: await t.text(), denied: await t.page.evaluate(() => !!document.querySelector('[data-testid=access-page]')) }; };
  const ex = await asRole('exec'); const sm = await asRole('svcmgr');
  ok(`SB-${tag}-19`, 'a role that does not see open issues gets no answer built on them and is told the condition was left out; an engineering role gets the count', (ex.denied || ((!ex.a || !ex.a.read.some((x) => /issue/.test(x))) && /not shown to this role/.test(ex.text) && !/audible|Drift against/.test(ex.text))) && !sm.denied && !!sm.a && sm.a.read.join('|') === 'an open audio issue' && sm.a.total > 0 && !/not shown to this role/.test(sm.text), JSON.stringify([ex.denied, ex.a, sm.a]));
  await t.go('#/find', 300); const starters = await t.page.locator('[data-testid=find-starters] a').count();
  await t.page.locator('[data-testid=find-starters] a').first().click(); await t.page.waitForTimeout(350); const a8 = await ans();
  ok(`SB-${tag}-20`, 'the empty page offers searches that have an answer, and the first one does', starters >= 4 && !!a8 && a8.total > 0 && (await t.overflow()) <= 0, JSON.stringify([starters, a8]));
  await t.page.evaluate(() => localStorage.removeItem('empathia.demo.perspective')); await t.page.reload({ waitUntil: 'load' }); await t.page.waitForTimeout(300);
  ok(`SB-${tag}-12`, 'no horizontal overflow, no page error, no request leaves the page', (await t.overflow()) <= 0 && !t.errs.length && !t.ext.length, [await t.overflow(), ...t.errs, ...t.ext].join(' | '));
  await t.close();
}
await done();
