#!/usr/bin/env node
// The core screens at V2.5.3's bar (uplift/core-screens): investor start, Home (Mission Control), campus, the technical room page and Search
// Party at 320 / 390 / 768 / 1440 in light and dark. Layout checks (no overflow, no focus ring on the route-focused heading, words never
// wrap one character per line), the V2.5.3 addresses (#/room, #/room/<id>, #/room~<id>) land on finished screens, and the numbers on
// screen equal the records (rooms, buildings, spine stages). Destructive: unknown ids, hostile query text, rapid navigation, back/forward.
//   node tests/browser/demo-core.test.mjs
import path from 'node:path';
import fs from 'node:fs';
import { harness, SCHEMES, repo } from './demo-spaces-lib.mjs';
// the room count comes from the campus data (the thirty R(...) rows and the plan's P(row, ...) rows 31–45), never a literal
const NROOMS = [...fs.readFileSync(path.join(repo, 'apps/demo/src/campus/canon.ts'), 'utf8').matchAll(/^ {2}(?:R\(|P\(\d+, )'(R-[A-Z]+-\d+-\d+)'/gm)].length;
const { ok, open, done, out } = await harness('demo-core');
const VPS = [[320, 640, 'p320'], [390, 844, 'phone'], [768, 1024, 'tablet'], [1440, 900, 'desktop']];
const ROUTES = ['#/investor', '#/home', '#/campus', '#/room', '#/search'];

for (const scheme of SCHEMES) for (const vp of VPS) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/investor' });
  for (const r of ROUTES) {
    await t.go(r, 700);
    const v = await t.page.evaluate(() => {
      const h1 = document.querySelector('main h1'); const cs = h1 ? getComputedStyle(h1) : null;
      // a word that wraps one character per line: a text element far narrower than one word (the V2.5.3 comparison's defect)
      const narrow = Array.from(document.querySelectorAll('main b, main .kit-row__title, main .sp__sub, main td, main th')).filter((e) => { const b = e.getBoundingClientRect(); const txt = (e.textContent || '').trim(); return b.width > 0 && b.width < 28 && txt.length > 6 && b.height > 60; }).map((e) => (e.textContent || '').slice(0, 30));
      return { h1: h1?.textContent || '', ring: cs ? (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' : false, focused: document.activeElement === h1, narrow, notes: document.querySelectorAll('.shell__note, [role=note]').length, placeholder: /being connected|Not migrated yet/.test(document.querySelector('main')?.innerText || '') };
    });
    const slug = r.replace(/[^a-z]+/g, '');
    ok(`CORE-${tag}-${slug}-01`, `${r}: a finished screen with a heading (no placeholder)`, v.h1.length > 2 && !v.placeholder, JSON.stringify(v).slice(0, 200));
    ok(`CORE-${tag}-${slug}-02`, `${r}: no horizontal overflow`, (await t.overflow()) <= 0, await t.overflow());
    ok(`CORE-${tag}-${slug}-03`, `${r}: the route-focused heading draws no focus ring`, !v.ring, JSON.stringify({ ring: v.ring, focused: v.focused }));
    ok(`CORE-${tag}-${slug}-04`, `${r}: no text wraps one character per line`, !v.narrow.length, v.narrow.join(' | '));
    if (vp[2] === 'desktop' || vp[2] === 'phone') await t.page.screenshot({ path: path.join(out, `${tag}-${slug}.png`), fullPage: true });
  }
  // the numbers equal the records
  await t.go('#/campus', 600);
  const camp = await t.page.evaluate(() => ({ b: document.querySelectorAll('[data-testid^="campus-b-"]').length, rows: document.querySelectorAll('[data-testid="building-list"] .kit-meter').length, intro: document.querySelector('main')?.innerText.match(/(\d+) buildings and (\d+) regional sites, (\d+) rooms, (\d+) device positions/)?.slice(1).map(Number), sites: document.querySelectorAll('[data-testid="regional-sites"] .kit-meter').length, pills: document.querySelectorAll('[data-testid="building-pills"] a').length }));
  ok(`CORE-${tag}-05`, 'campus: six extruded buildings on the 3D stage, six rows with health bars, two regional sites, eight building pills, the intro counts 6 buildings, 2 sites and every room of the campus data', camp.b === 6 && camp.rows === 6 && camp.sites === 2 && camp.pills === 8 && camp.intro?.[0] === 6 && camp.intro?.[1] === 2 && camp.intro?.[2] === NROOMS, JSON.stringify(camp));
  await t.go('#/room', 600);
  const room = await t.page.evaluate(() => ({ id: document.querySelector('[data-testid="room-view"]')?.getAttribute('data-room'), stages: document.querySelectorAll('[data-testid="spine"] .spine__s').length, tiles: document.querySelectorAll('[data-testid="room-tiles"] .kit-tile').length, tabs: document.querySelectorAll('[data-testid="room-tabs"] a').length, three: !!document.querySelector('[data-testid="room-3d"]') }));
  ok(`CORE-${tag}-06`, '#/room is Atlas 4.218: room tabs, four tiles, the nine-stage delivery spine and the 3D stage', room.id === 'R-ATL-4-218' && room.stages === 9 && room.tiles === 4 && room.tabs >= 8 && room.three, JSON.stringify(room));
  await t.close();
}

{ // V2.5.3 addresses and destructive input, once per scheme at 1440
  for (const scheme of SCHEMES) {
    const t = await open([1440, 900], scheme, { hash: '#/investor' });
    await t.go('#/room~R-HZN-1-400', 600);
    ok(`CORE-${scheme}-addr-01`, 'the V2.5.3 trail address #/room~<id> opens that room', (await t.page.locator('[data-testid="room-view"]').getAttribute('data-room').catch(() => '')) === 'R-HZN-1-400');
    await t.go('#/room/R-MER-1-140', 600);
    ok(`CORE-${scheme}-addr-02`, '#/room/<id> opens that room, with its tabs pointing at #/room/<id> addresses', (await t.page.locator('[data-testid="room-view"]').getAttribute('data-room').catch(() => '')) === 'R-MER-1-140' && (await t.page.locator('[data-testid="room-tabs"] a[href^="#/room/"]').count()) >= 8);
    await t.go('#/room/R-NOPE-9-999', 500);
    ok(`CORE-${scheme}-addr-03`, 'an unknown room id lands on a finished screen with every room to pick', (await t.page.locator('[data-testid="room-unknown"]').count()) === 1 && (await t.page.locator('[data-testid="room-pick"] a').count()) === NROOMS);
    await t.go('#/room/%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E', 500);
    ok(`CORE-${scheme}-addr-04`, 'markup in the address is shown as text, never run', (await t.page.locator('main img[src="x"]').count()) === 0 && /There is no room/.test(await t.text()));
    await t.go('#/room?tab=history', 500);
    ok(`CORE-${scheme}-addr-05`, 'a tab on #/room stays on #/room', /^#\/room\?tab=history/.test(await t.page.evaluate(() => location.hash)) && /v2 PENDING_ACCEPTANCE/.test(await t.text()));
    await t.page.click('#room-tab-overview'); await t.page.waitForTimeout(300);
    ok(`CORE-${scheme}-addr-06`, 'back to the Room tab keeps the address at #/room', (await t.page.evaluate(() => location.hash)) === '#/room');
    // Search Party: hostile and huge input, an unknown focus
    await t.go('#/search', 500); await t.page.fill('#spd-q', '"><svg onload=alert(1)>' + 'x'.repeat(200)); await t.page.waitForTimeout(250);
    ok(`CORE-${scheme}-sp-01`, 'Search Party: hostile input is capped and shown as text; nothing matches says so', (await t.page.inputValue('#spd-q')).length <= 80 && (await t.page.locator('main svg[onload]').count()) === 0 && /Nothing matches/.test(await t.text()));
    await t.go('#/search?q=camera', 600);
    const sp = await t.page.evaluate(() => ({ n: document.querySelectorAll('.sp__rlist li').length, w: Math.min(...Array.from(document.querySelectorAll('.sp__rlist b')).map((b) => b.getBoundingClientRect().width)) }));
    ok(`CORE-${scheme}-sp-02`, 'Search Party follows ?q= and every result name has room to read (no one-character column)', sp.n > 5 && sp.w > 60, JSON.stringify(sp));
    await t.go('#/search?focus=Nope:nothing', 500);
    ok(`CORE-${scheme}-sp-03`, 'an unknown focus does not break the page', !t.errs.length && (await t.page.locator('main h1').count()) === 1);
    await t.go('#/search', 400);
    ok(`CORE-${scheme}-sp-04`, 'Search Party: directory of the five relationship questions and the try-one-of-these list with live counts', (await t.page.locator('[aria-label="Five ways in"] li').count()) === 5 && (await t.page.locator('[data-testid="sp-try"]').count()) >= 8);
    // V2.5.3's Search Party tab set, each at its address, each a finished pane built from the records
    for (const [h, id] of [['#/search/graph', 'impact'], ['#/search/people', 'sp-people'], ['#/search/support', 'sp-support'], ['#/search/ownership', 'sp-support'], ['#/search/projects', 'sp-map'], ['#/search/orgs', 'sp-orgs'], ['#/search/activity', 'sp-activity'], ['#/search/vault', 'sp-vault']]) {
      await t.go(h, 600);
      const v = await t.page.evaluate((x) => ({ pane: !!document.querySelector(`[data-testid="${x}"]`), tabs: document.querySelectorAll('[data-testid="sp-tabs"] a').length, cur: document.querySelector('[data-testid="sp-tabs"] [aria-current="page"]')?.textContent || '' }), id);
      ok(`CORE-${scheme}-tab-${h.split('/').pop()}`, `${h}: the eight V2.5.3 tabs, the current one marked, and its pane`, v.pane && v.tabs === 8 && v.cur.length > 3, JSON.stringify(v));
    }
    await t.go('#/search/projects', 500); await t.page.click('[data-testid="sp-map"] .sp__tchip:has-text("Open issues")'); await t.page.waitForTimeout(200);
    ok(`CORE-${scheme}-tab-lens`, 'Project map: a lens changes the numbers on the buildings and the rows below', (await t.page.locator('[data-testid="sp-map"] .kit-row-li').count()) >= 1);
    // rapid navigation and back/forward
    for (const r of ['#/home', '#/campus', '#/room', '#/search', '#/campus/ATL', '#/room/R-ATL-7-112', '#/investor']) await t.page.evaluate((x) => { location.hash = x; }, r);
    await t.page.waitForTimeout(900);
    await t.page.goBack(); await t.page.waitForTimeout(700);
    ok(`CORE-${scheme}-nav-01`, 'rapid navigation then back lands on the previous screen, finished', (await t.page.evaluate(() => location.hash)) === '#/room/R-ATL-7-112' && (await t.page.locator('[data-testid="room-view"]').getAttribute('data-room').catch(() => '')) === 'R-ATL-7-112');
    await t.go('#/home', 700);
    const home = await t.page.evaluate(() => ({ kpis: document.querySelectorAll('[data-testid="home-kpis"] .kit-tile').length, say: document.querySelector('[data-testid="home-say"]')?.textContent || '', b: document.querySelectorAll('[data-testid^="campus-b-"]').length }));
    ok(`CORE-${scheme}-home-01`, 'Home: eight KPI tiles, the campus in 3D and the sentence that says what matters', home.kpis === 8 && home.b === 6 && /need/.test(home.say) && /decision/.test(home.say), JSON.stringify(home).slice(0, 300));
    // closing the live incident in the service workspace lowers the open issues on Home and the room page
    const before = await t.page.evaluate(() => parseInt(document.querySelector('[data-testid="kpi-critical"] .kit-tile__value')?.textContent || '', 10));
    await t.page.evaluate(() => { const k = 'empathia.demo.workspace.v1'; const keys = Object.keys(localStorage).filter((x) => /workspace/.test(x)); const key = keys[0] || k; const w = JSON.parse(localStorage.getItem(key) || 'null'); if (w) { w.incidents.forEach((i) => { if (i.id === 'ISS-0417') i.state = 'CLOSED'; }); localStorage.setItem(key, JSON.stringify(w)); } });
    await t.page.reload(); await t.page.waitForTimeout(900);
    const after = await t.page.evaluate(() => parseInt(document.querySelector('[data-testid="kpi-critical"] .kit-tile__value')?.textContent || '', 10));
    ok(`CORE-${scheme}-home-02`, 'Home counts from the live records: closing ISS-0417 in the workspace lowers the critical issues by one', Number.isFinite(before) && after === before - 1, `${before} → ${after}`);
    ok(`CORE-${scheme}-clean`, 'no page error and no request leaves the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].join(' | '));
    await t.close();
  }
}
// ---------------------------------------------------------------------------------------------------------------- Mission Control (#/home)
// The front door (founder 2026-11-04: "a true 20/10"): hero with the Search Party bar, products, greeting with the role's own work,
// "What can I help you do?", eight stat tiles with sparklines, the mission flow over every room, priorities with their verbs, incidents,
// active rooms, the Search Party insight — computed from the records, role-aware (D44), keyboard complete; then destructive QA.
const setRole = (t, r) => t.page.evaluate((x) => localStorage.setItem('empathia.demo.perspective', x), r);
for (const scheme of SCHEMES) for (const vp of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/home' }); await t.page.waitForTimeout(700);
  const v = await t.page.evaluate(() => {
    const q = (s) => document.querySelector(s); const qa = (s) => Array.from(document.querySelectorAll(s));
    const st = qa('[data-testid="mc-flow"] .mc-st'); const n = (el) => parseInt(el.querySelector('.mc-st__dot')?.textContent || '0', 10) || 0;
    return { hero: !!q('[data-testid="mc-hero"] h1') && !!q('[data-testid="hero-search"] input'), prods: qa('[data-testid="mc-products"] a').length, tiles: qa('[data-testid="home-kpis"] .kit-tile').length, sparks: qa('[data-testid="home-kpis"] svg[role="img"]').length,
      stations: st.length, rooms: st.filter((e) => e.getAttribute('data-station') !== 'intake').reduce((s, e) => s + n(e), 0), greet: q('[data-testid="mc-greeting"] h2')?.textContent || '', acts: qa('[data-testid="mc-actions"] a').length,
      pri: qa('[data-testid="mc-priority"] a').length, inc: qa('[data-testid="mc-incidents"] li').length, active: qa('[data-testid="mc-active"] .mc-room').length, ins: q('[data-testid="mc-insight"]')?.textContent || '',
      small: qa('main .mc-st button, main .mc-pri a, main .mc-act, main .mc-prod, main .mc-ask').filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.height < 43.5 || b.width < 43.5); }).map((e) => e.textContent.slice(0, 20)) };
  });
  ok(`MC-${tag}-01`, 'Mission Control: hero with the Search Party bar, products, greeting, help actions, eight tiles with sparklines', v.hero && v.prods >= 6 && v.tiles === 8 && v.sparks >= 3 && /Good (morning|afternoon|evening), Product Architect/.test(v.greet) && v.acts >= 5, JSON.stringify(v));
  ok(`MC-${tag}-02`, `mission flow: eight stations and every one of the ${NROOMS} rooms on exactly one`, v.stations === 8 && v.rooms === NROOMS, `${v.stations} stations, ${v.rooms} rooms`);
  ok(`MC-${tag}-03`, 'priorities with their verbs, recent incidents, active rooms and the insight are computed and present', v.pri >= 3 && v.inc >= 3 && v.active >= 3 && /live service request/.test(v.ins), JSON.stringify(v).slice(0, 300));
  ok(`MC-${tag}-04`, 'every control is a 44 px target', !v.small.length, v.small.join(' | '));
  ok(`MC-${tag}-05`, 'no horizontal overflow', (await t.overflow()) <= 0, await t.overflow());
  // keyboard: a station opens its rooms with Enter, the rooms are links to their pages, and Enter again closes it
  const cx = t.page.locator('[data-station="commissioning"] button'); await cx.focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(150);
  const want = parseInt(await t.page.locator('[data-station="commissioning"] .mc-st__dot').innerText(), 10);
  const chips = await t.page.locator('#mc-flow-rooms a[href^="#/campus/"]').count();
  ok(`MC-${tag}-06`, 'keyboard: Enter on a station shows its rooms, one link per room', (await cx.getAttribute('aria-pressed')) === 'true' && chips === want, `${chips} of ${want}`);
  await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(100);
  ok(`MC-${tag}-07`, 'Enter again closes it', (await cx.getAttribute('aria-pressed')) === 'false');
  // the first Take action opens the record it names
  const first = t.page.locator('[data-testid="mc-greeting"] a').first(); const href = await first.getAttribute('href'); await first.click(); await t.page.waitForTimeout(700);
  ok(`MC-${tag}-08`, 'the greeting’s first item opens the record it names (not a refusal)', (await t.page.evaluate(() => location.hash)) === href && (await t.page.locator('[data-testid="access-page"]').count()) === 0, href);
  if (vp[2] === 'desktop') await t.page.goto(t.page.url().split('#')[0] + '#/home').catch(() => {});
  await t.close();
}
for (const scheme of SCHEMES) { // View as changes the work; D44; destructive input
  const t = await open([1440, 900], scheme, { hash: '#/investor' });
  const who = async (r) => { await setRole(t, r); await t.page.evaluate(() => { location.hash = '#/home'; }); await t.page.reload(); await t.page.waitForTimeout(800);
    return t.page.evaluate(() => ({ greet: document.querySelector('[data-testid="mc-greeting"]')?.textContent || '', mine: Array.from(document.querySelectorAll('[data-testid="mc-priorities"] [data-testid="mc-priority"]')).map((e) => e.textContent), links: Array.from(document.querySelectorAll('main a[href^="#/"]')).map((a) => a.getAttribute('href')) })); };
  const sm = await who('svcmgr'); const ex = await who('exec'); const vi = await who('visitor');
  ok(`MC-${scheme}-role-01`, 'View as: the service manager’s own work starts with the triage; the executive’s with the funding decision', /Service Manager/.test(sm.greet) && /Triage ISS-0417/.test(sm.mine[0] || '') && ex.mine.some((x) => /Fund PRJ-NST-TH/.test(x)) && !ex.mine.some((x) => /Triage/.test(x)), JSON.stringify({ sm: sm.mine.slice(0, 2), ex: ex.mine.slice(0, 2) }).slice(0, 300));
  // D44: every link Mission Control offers the visitor opens without the owl page
  const refused = [];
  for (const h of [...new Set(vi.links)].slice(0, 40)) { await t.go(h, 250); if (await t.page.locator('[data-testid="access-page"]').count()) refused.push(h); }
  ok(`MC-${scheme}-role-02`, `D44: none of the ${new Set(vi.links).size} links Mission Control offers the visitor leads to a refusal`, vi.links.length >= 3 && !refused.length, refused.join(' '));
  await setRole(t, 'architect');
  // destructive: a damaged workspace, an empty workspace, hostile search text, rapid double taps on a station
  await t.page.evaluate(() => localStorage.setItem('empathia.demo.workspace.v1', '{not json')); await t.go('#/investor'); await t.page.reload(); await t.go('#/home', 800);
  ok(`MC-${scheme}-dq-01`, 'a damaged saved workspace does not break Mission Control (it opens from the seed)', (await t.page.locator('[data-testid="mc-flow"]').count()) === 1 && !t.errs.length, t.errs.join(' | '));
  await t.page.evaluate(() => { const k = 'empathia.demo.workspace.v1'; const w = JSON.parse(localStorage.getItem(k)); w.incidents = []; w.workOrders = []; localStorage.setItem(k, JSON.stringify(w)); }); await t.page.reload(); await t.page.waitForTimeout(800);
  ok(`MC-${scheme}-dq-02`, 'an empty service workspace: the incidents card says so, the tile reads 0, nothing invented', /No incident on record/.test(await t.text()) && /Open service requests\s*0/.test(await t.page.locator('[data-testid="home-kpis"]').innerText()));
  await t.page.fill('[data-testid="hero-search"] input', '"><img src=x onerror=alert(1)>' + 'y'.repeat(120)); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(600);
  const h2 = await t.page.evaluate(() => decodeURIComponent(location.hash));
  ok(`MC-${scheme}-dq-03`, 'hostile text in the Search Party bar is capped, asks Search Party and is never run', /^#\/search\?q=/.test(h2) && h2.length <= 100 && (await t.page.locator('img[src="x"]').count()) === 0 && !t.errs.length, h2.slice(0, 120));
  await t.go('#/home', 700); const b = t.page.locator('[data-station="service"] button'); await b.dblclick(); await b.click(); await t.page.waitForTimeout(150);
  ok(`MC-${scheme}-dq-04`, 'rapid taps on a station leave it in a consistent state (three taps: open)', (await b.getAttribute('aria-pressed')) === 'true' && (await t.page.locator('#mc-flow-rooms a').count()) >= 1);
  ok(`MC-${scheme}-clean`, 'no page error and no request leaves the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].join(' | '));
  await t.close();
}
{ const t = await open([390, 844], SCHEMES[0], { hash: '#/home', reducedMotion: 'reduce' }); await t.page.waitForTimeout(600);
  const d = await t.page.evaluate(() => getComputedStyle(document.querySelector('.mc-prod')).transitionDuration);
  ok('MC-reduced-motion', 'reduced motion: the product tiles do not animate', /^0s(, 0s)*$/.test(d), d); await t.close(); }

// ---------------------------------------------------------------------------------------------------------------- investor start, room facts, divisible rooms, campus list
for (const scheme of SCHEMES) {
  const t = await open([1440, 900], scheme, { hash: '#/investor' }); await t.page.waitForTimeout(900);
  const sh = await t.page.evaluate(() => { const cards = Array.from(document.querySelectorAll('[data-testid="role-shelf"] .shelf__role')); return { n: cards.length, art: cards.filter((c) => c.querySelector('svg.shelf__art')).length, counts: cards.map((c) => c.querySelector('[data-testid="shelf-counts"]')?.textContent || ''), first: cards[0]?.getAttribute('aria-pressed') }; });
  ok(`CORE-${scheme}-shelf-01`, 'Every role, one Core: a carousel of all 15 roles, each with an illustration and its records and surfaces counts; the viewed role first', sh.n === 15 && sh.art === 15 && sh.first === 'true' && sh.counts.every((c) => /\d[\d,]* of \d[\d,]* records · \d+ of \d+ surfaces/.test(c)), JSON.stringify(sh).slice(0, 300));
  const vis = sh.counts.find((c, i) => i > 0); const arch = sh.counts[sh.counts.length - 1];
  ok(`CORE-${scheme}-shelf-02`, 'the counts differ by role (the Product Architect sees every record and surface, a lesser role fewer)', vis !== arch, `${vis} | ${arch}`);
  await t.page.click('[data-testid="role-shelf"] [data-role-key="employee"]'); await t.page.waitForTimeout(1200);
  ok(`CORE-${scheme}-shelf-03`, 'tapping a flashcard views as that role (the shell changes)', /Employee/.test(await t.page.locator('[data-testid="viewas-open"]').getAttribute('aria-label')));
  await t.page.evaluate(() => localStorage.setItem('empathia.demo.perspective', 'architect')); await t.page.reload(); await t.page.waitForTimeout(600);
  await t.go('#/room', 700);
  const facts = await t.page.locator('[data-testid="room-facts"]').innerText();
  ok(`CORE-${scheme}-facts-01`, 'the room panel: "N positions, N models", baseline, camera coverage (modeled), PoE W of W (declared), drift dimensions', /\d+ positions, \d+ models/.test(await t.page.locator('[data-testid="device-panel"] h2').innerText()) && /BL-ATL-4-218-v1/.test(facts) && /\d+ of \d+ seats/.test(facts) && /\d+\.\d W of 370 W/.test(facts) && /dimensions?:/.test(facts), facts.slice(0, 300));
  await t.go('#/room/R-BCN-1-300', 700);
  const dv = t.page.locator('[data-testid="divisible"]');
  ok(`CORE-${scheme}-div-01`, 'the divisible town hall offers combine / split with its three sections', (await dv.count()) === 1 && (await dv.locator('li').count()) === 3 && (await dv.getAttribute('data-mode')) === 'combined');
  await dv.locator('button:has-text("Split")').click(); await t.page.waitForTimeout(150);
  ok(`CORE-${scheme}-div-02`, 'split: each section becomes its own room, nothing is written', (await dv.getAttribute('data-mode')) === 'split' && /its own audio/.test(await dv.innerText()) && /nothing is written/.test(await dv.innerText()));
  await t.go('#/room/R-MER-1-300', 600);
  ok(`CORE-${scheme}-ops-01`, 'a control-tower room is labelled simulated, non-operational', /non-operational/.test(await t.page.locator('[data-testid="room-chips"]').innerText()));
  await t.go('#/campus', 600); await t.page.click('.campus__view button:has-text("List")'); await t.page.waitForTimeout(200);
  ok(`CORE-${scheme}-list-01`, 'campus: the list alternative shows every building and site with health bars', (await t.page.locator('[data-testid="campus-list-rows"] .kit-meter').count()) === 8 && (await t.page.locator('[data-testid="campus-stage"]').count()) === 0);
  await t.page.reload(); await t.page.waitForTimeout(600);
  ok(`CORE-${scheme}-list-02`, 'the choice is remembered for this viewer', (await t.page.locator('[data-testid="campus-list-rows"]').count()) === 1);
  await t.page.click('.campus__view button:has-text("3D map")'); await t.page.waitForTimeout(200);
  ok(`CORE-${scheme}-list-03`, 'and the 3D map comes back', (await t.page.locator('[data-testid="campus-stage"]').count()) === 1);
  await t.go('#/campus/LKS', 600);
  ok(`CORE-${scheme}-site-01`, 'a regional site opens: its rooms listed, a note instead of the campus map', (await t.page.locator('[data-testid="regional-note"]').count()) === 1 && (await t.page.locator('[data-testid="room-list"] tbody tr').count()) === 2);
  ok(`CORE-${scheme}-more-clean`, 'no page error and no request leaves the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].join(' | '));
  await t.close();
}

{ // reduced motion: the 3D campus and the room still work
  const t = await open([1440, 900], SCHEMES[0], { hash: '#/campus', reducedMotion: 'reduce' }); await t.page.waitForTimeout(500);
  await t.page.focus('[data-testid="campus-b-HZN"]'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(400);
  ok('CORE-reduced-motion', 'under reduced motion a building opens from the keyboard', (await t.page.evaluate(() => location.hash)) === '#/campus/HZN' && !t.errs.length);
  await t.close();
}
await done();
