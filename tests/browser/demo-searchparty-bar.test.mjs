#!/usr/bin/env node
// The Search Party bar in the shell (uplift/system-shell, 3 Nov screens 01–02): ⌘K / Ctrl K and "/" focus it; results come grouped
// (physical units, logical positions, incidents, rooms, buildings, pages) with "N more in Search Party" and a "See all" option that
// opens #/search?q=; every result is one the role may see (entity authority) and may open (D44); a unit opens its room with the position
// selected; Escape clears then closes; the phone row is full width; a failed records chunk is said, not swallowed; the synthetic-data
// line appears once (chip in the bar, one footer line, no per-page banner); route focus draws no ring on the heading.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-searchparty-bar');

const groupsOf = (p) => p.$$eval('#find-list .find__g', (g) => g.map((x) => x.textContent.trim()));
const optsOf = (p) => p.$$eval('#find-list [role=option]', (o) => o.map((x) => ({ t: x.querySelector('b').textContent, k: x.dataset.kind, chip: x.querySelector('.find__chip')?.textContent || '' })));

{ const t = await open('#/investor', { role: 'architect' }); const p = t.page;
  await p.keyboard.press('Control+k'); await p.waitForTimeout(80);
  ok('S-01', 'Ctrl K focuses the Search Party bar from anywhere; the field says what it is and its shortcut', await p.evaluate(() => document.activeElement?.id === 'find-in' && /Search Party/.test(document.getElementById('find-in').getAttribute('aria-label')) && /Control\+K/.test(document.getElementById('find-in').getAttribute('aria-keyshortcuts')) && /Search Party/.test(document.querySelector('.find__sp').textContent)));
  // S-02 wait changed (9 Nov): it used to wait for "more than three options", which page results alone now satisfy before the Search Party
  // index has answered. It waits for the first physical unit instead; what S-02 and S-03 assert is unchanged.
  await p.keyboard.type('camera'); await p.waitForSelector('#find-list [role=option][data-kind=unit]', { timeout: 8000 }).catch(() => undefined);
  const g = await groupsOf(p); const o = await optsOf(p);
  ok('S-02', 'results come grouped as the 3 Nov reference: physical units first, then logical positions, incidents, with “N more in Search Party”', /^Devices & physical units/.test(g[0] || '') && g.some((x) => /^Logical positions/.test(x)) && g.some((x) => /^Incidents/.test(x)) && g.some((x) => /\d+ more in Search Party/.test(x)), JSON.stringify(g));
  ok('S-03', 'each result carries its kind chip (Asset, Planned device, Incident) and an icon; no invented make, model or serial', o.length >= 8 && o.filter((x) => x.k === 'unit').every((x) => x.chip === 'Asset' && /^AS-\d{4} · /.test(x.t)) && o.some((x) => x.chip === 'Planned device') && !o.some((x) => /Logitech|Crestron|Shure|Sony|serial/i.test(x.t)), JSON.stringify(o.slice(0, 3)));
  const all = o[o.length - 1];
  ok('S-04', 'the last option opens every result in Search Party', all && all.k === 'all' && /See all \d+ results in Search Party/.test(all.t), JSON.stringify(all));
  await p.keyboard.press('End'); await p.keyboard.press('ArrowDown');
  for (let i = 0; i < 40; i++) await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok('S-05', 'arrow keys stop at the last option; Enter there opens Search Party with the words', /#\/search\?q=camera/.test(p.url()) && await p.evaluate(() => !!document.querySelector('main h1')), p.url());
  ok('S-06', 'the heading that receives route focus draws no focus ring', await p.evaluate(() => { const h = document.querySelector('main h1'); const cs = getComputedStyle(h); return document.activeElement === h && (cs.outlineStyle === 'none' || cs.outlineWidth === '0px'); }));
  await p.keyboard.press('/'); await p.keyboard.type('atlas 4.218'); await p.waitForFunction(() => document.querySelectorAll('#find-list [role=option]').length > 1, null, { timeout: 5000 }).catch(() => undefined);
  const g2 = await groupsOf(p); const o2 = await optsOf(p);
  ok('S-07', '“/” focuses it too; a room named outright leads the results', g2[0] === 'Rooms' && o2[0].k === 'room' && /Atlas 4\.218/.test(o2[0].t), JSON.stringify({ g2, first: o2[0] }));
  // S-08 changed (v18/continuation, 9 Nov): the Commissioning dossier page for this room now ranks among the pages, so the first unit is no
  // longer always two steps down. The check steps to the first unit wherever it sits; what it asserts (a unit opens its room at ?device=) is unchanged.
  const firstUnit = o2.findIndex((o) => o.k === 'unit'); for (let i = 0; i < (firstUnit > 0 ? firstUnit : 2); i++) await p.keyboard.press('ArrowDown');
  const sel = await p.evaluate(() => document.getElementById(document.getElementById('find-in').getAttribute('aria-activedescendant'))?.dataset.kind);
  await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  ok('S-08', 'choosing a physical unit opens its room with that position selected (?device=)', sel === 'unit' && /#\/campus\/ATL\/4\/R-ATL-4-218\?device=/.test(p.url()), `${sel} ${p.url()}`);
  await p.keyboard.press('Control+k'); await p.keyboard.type('zzqx'); await p.waitForTimeout(400);
  ok('S-09', 'nothing matching is said in words, with the way to search every record', /Nothing for “zzqx”/.test(await p.locator('.find__none').innerText()));
  await p.keyboard.press('Escape'); const afterOne = await p.evaluate(() => ({ v: document.getElementById('find-in').value, f: document.activeElement?.id }));
  await p.keyboard.press('Escape'); const afterTwo = await p.evaluate(() => document.activeElement?.id);
  ok('S-10', 'Escape clears the words first, then leaves the field', afterOne.v === '' && afterOne.f === 'find-in' && afterTwo !== 'find-in', JSON.stringify({ afterOne, afterTwo }));
  const synth = await p.evaluate(() => ({ chip: document.querySelectorAll('header .synth-chip').length, foot: document.querySelectorAll('.demo > .foot .foot__tag').length, banners: document.querySelectorAll('.shell__note, .synthetic-banner, [data-testid=synthetic-banner]').length }));
  ok('S-11', 'one synthetic-data line: the chip by the mark and one footer line, no per-page banner', synth.chip === 1 && synth.foot === 1 && synth.banners === 0, JSON.stringify(synth));
  ok('S-12', 'no console error, no request off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// D44: a visitor is offered only what the visitor may see; units and incidents are not the visitor's records
{ const t = await open('#/home', { role: 'visitor' }); const p = t.page;
  await p.keyboard.press('Control+k'); await p.keyboard.type('camera'); await p.waitForTimeout(900);
  const o = await optsOf(p); const refused = [];
  for (const x of await p.$$eval('#find-list [role=option]', (os) => os.map((e) => e.id))) {
    await p.keyboard.press('Control+k'); await p.fill('#find-in', 'camera'); await p.waitForTimeout(500);
    await p.evaluate((id) => document.getElementById(id)?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })), x); await p.waitForTimeout(350);
    if (await p.locator('[data-testid=access-page]').count()) refused.push(x);
  }
  ok('S-13', 'the visitor is offered no physical unit or incident (not the visitor’s records), and nothing offered leads to a refusal', !o.some((x) => x.k === 'unit' || x.k === 'issue') && !refused.length, JSON.stringify({ kinds: [...new Set(o.map((x) => x.k))], refused }));
  await t.close(); }

// phones: a full-width row under the bar; results fit the viewport; the bottom tabs are V2.5.3's (Home, Campus, Search, View as, More)
for (const w of [320, 390]) { const t = await open('#/investor', { role: 'architect', w, h: 760 }); const p = t.page;
  const m = await p.evaluate(() => { const r = document.getElementById('find-in').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), over: document.documentElement.scrollWidth - innerWidth, tabs: [...document.querySelectorAll('[data-testid=hometabs] .hometab__l')].map((x) => x.textContent) }; });
  ok(`S-${w}-14`, `${w} px: the Search Party row is full width, 44 px tall, under the bar, no sideways scroll; the bottom tabs are Home, Campus, Search, View as, More`, m.w >= w - 40 && m.h >= 44 && m.top < 70 && m.over <= 0 && m.tabs.join() === 'Home,Campus,Search,View as,More', JSON.stringify(m));
  await p.click('#find-in'); await p.keyboard.type('mic'); await p.waitForTimeout(900);
  const list = await p.evaluate(() => { const l = document.querySelector('.find__list'); const r = l.getBoundingClientRect(); return { fits: r.right <= innerWidth + 1 && r.left >= 0, bottom: Math.round(r.bottom), vh: innerHeight, n: l.querySelectorAll('[role=option]').length }; });
  ok(`S-${w}-15`, `${w} px: the results panel fits the viewport and scrolls inside`, list.fits && list.bottom <= list.vh && list.n > 3, JSON.stringify(list));
  ok(`S-${w}-16`, `${w} px: no console error`, !t.errs.length, t.errs.join(' | ')); await t.close(); }

// destructive: the records chunk fails to load → the bar says so and the page keeps working; typing again retries
{ const t = await open('#/investor', { role: 'architect', sw: false /* an injected failure needs a page the offline worker does not answer */ }); const p = t.page;
  await p.route('**/chunks/records-*.js', (r) => r.abort());
  await p.keyboard.press('Control+k'); await p.keyboard.type('camera'); await p.waitForTimeout(900);
  const said = await p.locator('.find__warn, .find__none').first().innerText().catch(() => '');
  ok('S-17', 'a lost records chunk is said in the bar (“could not be loaded”), the pages still answer, nothing crashes', /could not be loaded/.test(said) && (await optsOf(p)).some((x) => x.k === 'page') && await p.evaluate(() => !!document.querySelector('main h1')), said);
  // a failed module fetch stays failed in the browser's module map, so the honest retry is a reload (which the message says)
  await p.unroute('**/chunks/records-*.js'); await p.reload(); await p.waitForSelector('main h1'); await p.keyboard.press('Control+k'); await p.keyboard.type('camera'); await p.waitForTimeout(1200);
  ok('S-18', 'after a reload the records arrive', (await optsOf(p)).some((x) => x.k === 'unit'));
  t.errs.length = 0;   // the aborted chunk logs one ERR_FAILED resource error by design of this destructive step
  // rapid double-tap on the same result and back/forward do not break the shell
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.waitForTimeout(400); await p.goBack(); await p.waitForTimeout(300); await p.goForward(); await p.waitForTimeout(300);
  ok('S-19', 'double Enter, back and forward leave a working page with a focused heading and no error', await p.evaluate(() => !!document.querySelector('main h1')) && !t.errs.length, t.errs.join(' | '));
  await t.close(); }

// Questions in the header bar (10 Nov, founder: Search Party "easy to understand and use", smartest it can be). The words are read before they
// are matched: a question gets its answer as the first option and Enter opens the full answer; a typing mistake is corrected and the bar says
// which words it searched for; a plain name ("camera") still leads with its records, as S-02 requires.
{ const t = await open('#/investor', { role: 'architect' }); const p = t.page;
  await p.keyboard.press('Control+k'); await p.keyboard.type('how many rooms are held'); await p.waitForSelector('#find-list [role=option][data-kind=answer]', { timeout: 8000 }).catch(() => undefined);
  const g = await groupsOf(p); const first = await p.$eval('#find-list [role=option]', (o) => ({ k: o.dataset.kind, t: o.querySelector('b').textContent, chip: o.querySelector('.find__chip')?.textContent || '' })).catch(() => null);
  ok('S-20', 'a question is answered first: an “Answer” group leads, its first line carries a number from the room records', /^Answer/.test(g[0] || '') && first && first.k === 'answer' && first.chip === 'Answer' && /\d/.test(first.t), JSON.stringify({ g: g[0], first }));
  await p.keyboard.press('Enter'); await p.waitForSelector('[data-testid=find-answer]', { timeout: 8000 }).catch(() => undefined);
  ok('S-21', 'Enter on the answer opens the full answer with the same words, and the rooms behind the number', /#\/find\?q=how%20many%20rooms%20are%20held/.test(p.url()) && await p.locator('[data-testid=find-answer]').count() === 1 && await p.locator('[data-testid=find-rows] a').count() > 0, p.url());
  // typed at once, inside the 60 ms before route focus moves to the heading: the bar keeps the focus and every letter (found by this check, 10 Nov)
  await p.keyboard.press('Control+k'); await p.keyboard.type('boardrom'); await p.waitForSelector('[data-testid=find-fix]', { timeout: 8000 }).catch(() => undefined);
  ok('S-22a', 'going straight back to the bar after opening a result keeps the focus there and loses no letter', await p.evaluate(() => document.activeElement?.id === 'find-in' && document.getElementById('find-in').value === 'boardrom'));
  const fix = await p.locator('[data-testid=find-fix]').innerText().catch(() => ''); const o = await optsOf(p);
  ok('S-22', 'a typing mistake is corrected and said (“Showing results for boardroom”), and the results are the corrected word’s', /Showing results for\s+boardroom/i.test(fix) && o.some((x) => /board/i.test(x.t)), JSON.stringify({ fix, first: o[0] }));
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.keyboard.press('Control+k'); await p.keyboard.type('camera'); await p.waitForSelector('#find-list [role=option][data-kind=unit]', { timeout: 8000 }).catch(() => undefined);
  ok('S-23', 'a plain name is not treated as a question: no Answer group, records lead', !(await groupsOf(p)).some((x) => /^Answer/.test(x)) && await p.locator('[data-testid=find-fix]').count() === 0);
  ok('S-24', 'no console error, no request off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }
// D44: a role with no Find page is offered no answer it could not open
{ const t = await open('#/home', { role: 'visitor' }); const p = t.page;
  await p.keyboard.press('Control+k'); await p.keyboard.type('how many rooms are held'); await p.waitForTimeout(1200);
  const kinds = await p.$$eval('#find-list [role=option]', (os) => os.map((e) => e.dataset.kind)); const canFind = await p.evaluate(() => !!document.querySelector('a[href^="#/find"]'));
  const href = kinds.includes('answer'); let refused = false;
  if (href) { await p.keyboard.press('Enter'); await p.waitForTimeout(600); refused = await p.locator('[data-testid=access-page]').count() > 0; }
  ok('S-25', 'the visitor is offered an answer only if the answer opens for the visitor', !refused, JSON.stringify({ kinds, canFind }));
  await t.close(); }

await done();
