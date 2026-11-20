#!/usr/bin/env node
// Field Tools (founder, 18 Nov 2026: "something people can instantly be able to jump over to … not to be confused with commissioning
// tools"). One jump from the header for the people who work on site; every role may open it by its address; results follow the inputs at
// once and show their working; a link carries the inputs; a job keeps calculations in this browser and survives a reload; nothing is
// requested off the page's origin; it works at 390 px with no sideways scroll, in both themes.
//   FTB-01  the header jump is there for an installer and opens the index (39 calculators, grouped), and absent for a visitor
//   FTB-02  a visitor reaches it by its address and by Search Party words ("calculator")
//   FTB-03  search narrows the list; a category filters it; a nonsense search says so
//   FTB-04  the subnet calculator: changing the prefix changes the mask, range and the working at once
//   FTB-05  a link with inputs opens with them (#/field-tools/two-leg-bridle?l1=9&l2=6) and draws the bridle
//   FTB-06  "/" stays the shell's Search Party key here too (the page does not take it); arrow keys step a number; Shift steps by ten
//   FTB-07  a job: start one, save two calculations with a note, reload, they are still there, open one, remove one, delete the job
//   FTB-08  copy the report: the clipboard holds the tool, inputs, results and the verification line (or the fallback shows it)
//   FTB-10  a calculator links where it is studied: the certification math pages and the practice questions that use it
//   FTB-09  an unknown calculator says so; 390 px has no sideways scroll; no console errors; no off-origin requests
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-fieldtools');

{ // FTB-01
  const t = await open('#/control', { role: 'installer' }); const p = t.page;
  const jump = await p.$('[data-testid="shell-fieldtools"]'); ok('FTB-01a', 'an installer has the Field Tools jump in the header', !!jump);
  await jump?.click(); await p.waitForSelector('[data-testid="ft-welcome"]', { timeout: 8000 }).catch(() => undefined);
  ok('FTB-01b', 'the jump opens the index', /#\/field-tools$/.test(p.url()), p.url());
  const n = await p.$$eval('[data-testid="ft-list"] a[data-tool]', (a) => a.length); ok('FTB-01c', 'every calculator is listed', n === 39, n);
  const cur = await p.getAttribute('[data-testid="shell-fieldtools"]', 'aria-current'); ok('FTB-01d', 'the jump says you are there', cur === 'page', cur);
  ok('FTB-01e', 'no console errors, nothing off the origin', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | '));
  await t.close();
  const v = await open('#/control', { role: 'visitor' }); ok('FTB-01f', 'a visitor has no header jump', !(await v.page.$('[data-testid="shell-fieldtools"]'))); await v.close();
}

{ // FTB-02
  const t = await open('#/field-tools', { role: 'visitor' }); const p = t.page;
  ok('FTB-02a', 'a visitor opens it by its address', !!(await p.$('[data-testid="field-tools"]')));
  await p.keyboard.press('Control+K'); await p.fill('#find-in', 'calculator'); await p.waitForTimeout(400);
  const hit = await p.$$eval('#find-list a, #find-list [role="option"]', (o) => o.map((x) => x.textContent || '').join(' | ')).catch(() => '');
  ok('FTB-02b', 'Search Party finds it by "calculator"', /Field Tools/.test(hit), hit.slice(0, 200));
  await t.close();
}

{ // FTB-03, FTB-04, FTB-06
  const t = await open('#/field-tools', { role: 'syseng' }); const p = t.page;
  await p.keyboard.press('/'); await p.waitForTimeout(100); const focused = await p.evaluate(() => document.activeElement?.id); ok('FTB-06a', '"/" opens Search Party, as everywhere in the demo', focused === 'find-in', focused);
  await p.keyboard.press('Escape'); await p.fill('[data-testid="ft-search"]', 'subnet'); await p.waitForTimeout(150);
  const after = await p.$$eval('[data-testid="ft-list"] a[data-tool]', (a) => a.map((x) => x.dataset.tool)); ok('FTB-03a', 'search narrows the list', after.length === 1 && after[0] === 'subnet', after.join());
  await p.fill('[data-testid="ft-search"]', 'zzqx'); await p.waitForTimeout(100); ok('FTB-03b', 'a search with no match says so', /No calculator matches/.test(await p.innerText('[data-testid="ft-list"]')));
  await p.fill('[data-testid="ft-search"]', ''); await p.click('.ft-cat[data-cat="rigging"]'); await p.waitForTimeout(100);
  const rig = await p.$$eval('[data-testid="ft-list"] a[data-tool]', (a) => a.map((x) => x.dataset.tool)); ok('FTB-03c', 'a category filters the list', rig.length === 2 && rig.includes('two-leg-bridle'), rig.join());
  await p.click('.ft-cat[data-cat="rigging"]');
  await p.click('a[data-tool="subnet"]'); await p.waitForSelector('[data-testid="ft-tool"][data-tool="subnet"]');
  const r1 = await p.innerText('[data-testid="ft-results"]'); ok('FTB-04a', 'the /24 example: 255.255.255.0 and 254 hosts', /255\.255\.255\.0/.test(r1) && /254/.test(r1), r1.slice(0, 200));
  await p.fill('[data-field="p"]', '26'); await p.waitForTimeout(100);
  const r2 = await p.innerText('[data-testid="ft-results"]'); const w2 = await p.innerText('[data-testid="ft-working"]');
  ok('FTB-04b', 'changing the prefix changes the results at once', /255\.255\.255\.192/.test(r2) && /192\.168\.10\.1 – 192\.168\.10\.62/.test(r2), r2.slice(0, 300));
  ok('FTB-04c', 'and the working', /2\^6 − 2 = 62/.test(w2), w2.slice(0, 300));
  await p.focus('[data-field="p"]'); await p.keyboard.press('ArrowUp'); ok('FTB-06b', 'ArrowUp steps the prefix by one', (await p.inputValue('[data-field="p"]')) === '27');
  await p.keyboard.press('Shift+ArrowUp'); ok('FTB-06c', 'Shift+ArrowUp steps by ten, held at the maximum', (await p.inputValue('[data-field="p"]')) === '32');
  await p.waitForSelector('[data-testid="ft-learn-CTS"]', { timeout: 8000 }).catch(() => undefined);
  const learn = await p.innerText('[data-testid="ft-learn"]').catch(() => ''); ok('FTB-10', 'the subnet calculator links its CTS math page and the questions that use it', /CTS math and physics/.test(learn) && /\d+ CTS questions? use it/.test(learn), learn);
  ok('FTB-04d', 'no console errors', !t.errs.length, t.errs.join(' | '));
  await t.close();
}

{ // FTB-05
  const t = await open('#/field-tools/two-leg-bridle?l1=9&l2=6', { role: 'cxeng' }); const p = t.page;
  ok('FTB-05a', 'a link opens with its inputs', (await p.inputValue('[data-field="l1"]')) === '9' && (await p.inputValue('[data-field="l2"]')) === '6');
  const r = await p.innerText('[data-testid="ft-results"]'); ok('FTB-05b', 'and computes from them (816 lb on the short leg)', /816 lb/.test(r), r.slice(0, 300));
  ok('FTB-05c', 'the bridle is drawn', !!(await p.$('[data-testid="ft-diagram"]')));
  ok('FTB-05d', 'the caution names the qualified person', /qualified person/.test(await p.innerText('[data-testid="ft-working"]')));
  await t.close();
}

{ // FTB-07, FTB-08
  const t = await open('#/field-tools/watts-amps', { role: 'service', init: () => { try { if (!sessionStorage.getItem('__ftseed')) { localStorage.removeItem('empathia.fieldtools.jobs.v1'); sessionStorage.setItem('__ftseed', '1'); } } catch { /* storage refused */ } } });
  const p = t.page; await t.ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await p.fill('[data-testid="ft-jobname"]', 'Harbor Hall 201 walk-through'); await p.click('[data-testid="ft-newjob"]');
  await p.fill('[data-testid="ft-note"]', 'rack A feed'); await p.click('[data-testid="ft-save"]'); await p.waitForTimeout(100);
  ok('FTB-07a', 'saving says where it was kept', /Kept in “Harbor Hall 201 walk-through”/.test(await p.innerText('[data-testid="ft-said"]')));
  await p.goto(p.url().replace(/#.*/, '#/field-tools/subnet')); await p.waitForSelector('[data-testid="ft-tool"][data-tool="subnet"]'); await p.click('[data-testid="ft-save"]');
  await p.reload(); await p.waitForSelector('[data-testid="ft-entries"]', { timeout: 8000 }).catch(() => undefined);
  const entries = await p.$$eval('[data-testid="ft-entries"] li', (l) => l.map((x) => x.innerText));
  ok('FTB-07b', 'two calculations survive a reload, newest first, with the note', entries.length === 2 && /Subnet/.test(entries[0]) && /rack A feed/.test(entries[1]), entries.join(' | '));
  await p.click('[data-testid="ft-entries"] li:nth-child(2) a'); await p.waitForSelector('[data-testid="ft-tool"][data-tool="watts-amps"]');
  ok('FTB-07c', 'opening an entry restores its tool and inputs', (await p.inputValue('[data-field="P"]')) === '12000');
  await p.click('[data-testid="ft-copyjob"]'); await p.waitForTimeout(150);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok('FTB-08a', 'copying the job puts both calculations, in order, on the clipboard', /Harbor Hall 201 walk-through — Empathia Field Tools job/.test(clip) && clip.indexOf('Watts, amps') < clip.indexOf('Subnet calculator') && /verify against manufacturer data/.test(clip), clip.slice(0, 300));
  await p.click('[data-testid="ft-copy"]'); await p.waitForTimeout(150); const one = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok('FTB-08b', 'copying one report names its inputs and results', /^Watts, amps and circuits — Empathia Field Tools/.test(one) && /Total load: 12000 W/.test(one) && /Results:/.test(one), one.slice(0, 200));
  await p.click('[data-testid="ft-entries"] li:first-child .ft-x'); ok('FTB-07d', 'an entry can be removed', (await p.$$('[data-testid="ft-entries"] li')).length === 1);
  await p.click('text=Delete the job…'); await p.click('text=Delete “Harbor Hall 201 walk-through”'); await p.waitForTimeout(100);
  ok('FTB-07e', 'deleting asks first, then the job is gone from this browser', !(await p.$('[data-testid="ft-entries"]')) && /Deleted/.test(await p.innerText('[data-testid="ft-jobs"]')));
  ok('FTB-07f', 'no console errors, nothing off the origin', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | '));
  await t.close();
}

{ // FTB-09
  const t = await open('#/field-tools/no-such-tool', { role: 'installer' }); ok('FTB-09a', 'an unknown calculator says so', /No calculator called “no-such-tool”/.test(await t.page.innerText('main'))); await t.close();
  for (const [hash, scheme] of [['#/field-tools/ceiling-speakers', 'light'], ['#/field-tools/led-wall', 'dark'], ['#/field-tools', 'dark']]) {
    const m = await open(hash, { role: 'installer', w: 390, h: 844, colorScheme: scheme }); const sw = await m.page.evaluate(() => document.documentElement.scrollWidth);
    ok(`FTB-09b ${hash} ${scheme}`, '390 px: no sideways scroll, no errors', sw <= 390 && !m.errs.length, `${sw} ${m.errs.join(' | ')}`); await m.close();
  }
}
await done();
