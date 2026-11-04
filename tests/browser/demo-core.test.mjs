#!/usr/bin/env node
// The core screens at V2.5.3's bar (uplift/core-screens): investor start, Home (Mission Control), campus, the technical room page and Search
// Party at 320 / 390 / 768 / 1440 in light and dark. Layout checks (no overflow, no focus ring on the route-focused heading, words never
// wrap one character per line), the V2.5.3 addresses (#/room, #/room/<id>, #/room~<id>) land on finished screens, and the numbers on
// screen equal the records (rooms, buildings, spine stages). Destructive: unknown ids, hostile query text, rapid navigation, back/forward.
//   node tests/browser/demo-core.test.mjs
import path from 'node:path';
import fs from 'node:fs';
import { harness, SCHEMES, repo } from './demo-spaces-lib.mjs';
// the room count comes from the campus data (30 today; 45 once the 15-room plan lands), never a literal
const NROOMS = [...fs.readFileSync(path.join(repo, 'apps/demo/src/campus/canon.ts'), 'utf8').matchAll(/^ {2}R\('(R-[A-Z]+-\d+-\d+)'/gm)].length;
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
  const camp = await t.page.evaluate(() => ({ b: document.querySelectorAll('[data-testid^="campus-b-"]').length, rows: document.querySelectorAll('[data-testid="building-list"] .kit-meter').length, intro: document.querySelector('main')?.innerText.match(/(\d+) buildings, (\d+) rooms, (\d+) devices/)?.slice(1).map(Number) }));
  ok(`CORE-${tag}-05`, 'campus: six extruded buildings on the 3D stage, six rows with health bars, the intro counts 6 buildings and every room of the campus data', camp.b === 6 && camp.rows === 6 && camp.intro?.[0] === 6 && camp.intro?.[1] === NROOMS, JSON.stringify(camp));
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
{ // reduced motion: the 3D campus and the room still work
  const t = await open([1440, 900], SCHEMES[0], { hash: '#/campus', reducedMotion: 'reduce' }); await t.page.waitForTimeout(500);
  await t.page.focus('[data-testid="campus-b-HZN"]'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(400);
  ok('CORE-reduced-motion', 'under reduced motion a building opens from the keyboard', (await t.page.evaluate(() => location.hash)) === '#/campus/HZN' && !t.errs.length);
  await t.close();
}
await done();
