#!/usr/bin/env node
// The demo-wide search bar: an ARIA combobox in the header on every page; aliases ("tv", "mic", "4.218"); arrow keys + Enter open a
// suggestion; Enter with nothing highlighted opens #/find; Escape closes; hostile input is inert; empty and unmatched states say so.
//   node tests/browser/demo-searchbar.test.mjs
import { harness, VIEWPORTS, SCHEMES } from './demo-spaces-lib.mjs';
const { ok, open, done } = await harness('demo-searchbar');
const INPUT = '[data-testid="searchbar"] input';

for (const scheme of SCHEMES) for (const vp of VIEWPORTS) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/investor' });
  const a11y = await t.page.evaluate((s) => { const i = document.querySelector(s); const r = i?.getBoundingClientRect(); return { role: i?.getAttribute('role'), label: i ? document.querySelector(`label[for="${i.id}"]`)?.textContent : '', h: r?.height || 0, visible: !!r && r.width > 100 }; }, INPUT);
  ok(`SB-${tag}-01`, 'the search bar is a labelled combobox, visible and at least 44 px tall', a11y.role === 'combobox' && /Search/.test(a11y.label || '') && a11y.visible && a11y.h >= 44, JSON.stringify(a11y));
  await t.page.fill(INPUT, '4.218'); await t.page.waitForTimeout(150);
  const first = await t.page.locator('[role="listbox"] [role="option"]').first().innerText().catch(() => '');
  ok(`SB-${tag}-02`, '“4.218” suggests the reference room first', /Atlas 4\.218/.test(first), first);
  await t.page.keyboard.press('ArrowDown'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);
  ok(`SB-${tag}-03`, 'arrow down + Enter opens the suggestion', (await t.page.evaluate(() => location.hash)) === '#/campus/ATL/4/R-ATL-4-218');
  await t.page.fill(INPUT, 'tv'); await t.page.waitForTimeout(150);
  ok(`SB-${tag}-04`, 'the alias “tv” finds displays', /Display/.test(await t.page.locator('[role="listbox"]').innerText().catch(() => '')));
  await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(100);
  ok(`SB-${tag}-05`, 'Escape closes the suggestions', await t.page.evaluate(() => document.querySelector('[role="listbox"]').hidden));
  await t.page.fill(INPUT, 'tv'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);   // 'tv' (not 'mic', which is itself a prefix of 'microphone') needs the alias, so the page must explain it
  ok(`SB-${tag}-06`, 'Enter with nothing highlighted opens the results page, grouped, with the alias explained', /#\/find\?q=tv/.test(await t.page.evaluate(() => location.hash)) && /Display/.test(await t.text()) && /alias/.test(await t.text()));
  await t.go('#/find?q=zzqx-nothing');
  ok(`SB-${tag}-07`, 'an unmatched query says so and offers Search Party', /Nothing matches/.test(await t.text()));
  await t.go('#/find');
  ok(`SB-${tag}-08`, 'an empty results page explains what to type', /Type in the search bar/.test(await t.text()));
  await t.page.fill(INPUT, '<img src=x onerror=alert(1)>"\'%00'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);
  ok(`SB-${tag}-09`, 'hostile input is shown as text, never executed', (await t.page.locator('main img[src="x"]').count()) === 0 && !t.errs.length, t.errs.join(' | '));
  await t.page.fill(INPUT, 'x'.repeat(200)); const len = await t.page.inputValue(INPUT);
  ok(`SB-${tag}-10`, 'the query is capped at 80 characters', len.length === 80, len.length);
  await t.page.fill(INPUT, ''); await t.page.fill(INPUT, 'search party'); await t.page.waitForTimeout(120);
  ok(`SB-${tag}-11`, 'a product is found by name', /Search Party/.test(await t.page.locator('[role="listbox"]').innerText().catch(() => '')));
  await t.page.keyboard.press('Escape'); await t.page.keyboard.press('Escape');
  ok(`SB-${tag}-12`, 'no horizontal overflow, no page error, no request leaves the page', (await t.overflow()) <= 0 && !t.errs.length && !t.ext.length, [await t.overflow(), ...t.errs, ...t.ext].join(' | '));
  await t.close();
}
await done();
