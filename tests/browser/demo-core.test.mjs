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
const NROOMS = [...fs.readFileSync(path.join(repo, 'apps/demo/src/campus/canon.ts'), 'utf8').matchAll(/^ {2}(?:R\(|[PX]\(\d+, )'(R-[A-Z]+-\d+-\d+)'/gm)].length;   // X(...) rows: rooms 46–90 of the 90-room estate (10 Nov 2026)
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
  await t.go('#/campus', 600); await t.page.waitForSelector('[data-testid="campus-b-ATL"]', { timeout: 15000 }).catch(() => {});   // the map loads on demand (18 Nov, #234)
  const camp = await t.page.evaluate(() => ({ b: document.querySelectorAll('[data-testid^="campus-b-"]').length, rows: document.querySelectorAll('[data-testid="building-list"] .kit-meter').length, intro: document.querySelector('main')?.innerText.match(/(\d+) buildings and (\d+) regional sites, (\d+) rooms, (\d+) device positions/)?.slice(1).map(Number), sites: document.querySelectorAll('[data-testid="regional-sites"] .kit-meter').length, pills: document.querySelectorAll('[data-testid="building-pills"] a').length }));
  // 10 Nov 2026: 2 → 7 sites off the map and 8 → 13 pills: the 90-room estate adds five fictional sites (Westmere, Highfield, Eastgate,
  // Stonebridge, Millbrook). The campus map still draws its six buildings.
  ok(`CORE-${tag}-05`, 'campus: six extruded buildings on the 3D stage, six rows with health bars, seven other sites, thirteen building pills, the intro counts 6 buildings, 7 sites and every room of the campus data', camp.b === 6 && camp.rows === 6 && camp.sites === 7 && camp.pills === 13 && camp.intro?.[0] === 6 && camp.intro?.[1] === 7 && camp.intro?.[2] === NROOMS, JSON.stringify(camp));
  await t.go('#/room', 600);
  const room = await t.page.evaluate(() => ({ id: document.querySelector('[data-testid="room-view"]')?.getAttribute('data-room'), stages: document.querySelectorAll('[data-testid="spine"] .spine__s').length, tiles: document.querySelectorAll('[data-testid="room-tiles"] .kit-tile').length, tabs: document.querySelectorAll('[data-testid="room-tabs"] a').length, three: !!document.querySelector('[data-testid="room-3d"]') }));
  ok(`CORE-${tag}-06`, '#/room is Atlas 4.218: room tabs, four tiles, the nine-stage delivery spine and the 3D stage', room.id === 'R-ATL-4-218' && room.stages === 9 && room.tiles === 4 && room.tabs >= 8 && room.three, JSON.stringify(room));
  // 24 Nov 2026, design pass on the screens the journeys cross most. Found from captured screens: in the 3D view the names of the devices
  // near the right corner ran off the drawing and the names in the rack lay on each other; in the spine a state that wrapped
  // ("4 · IN PROGRESS") pushed that stage's name below its neighbours'.
  const look = await t.page.evaluate(() => {
    const svg = document.querySelector('[data-testid="room-3d"]'); const S = svg.getBoundingClientRect(); const k = S.width / svg.viewBox.baseVal.width;   // one drawing unit in pixels
    const tags = [...svg.querySelectorAll('.iso__tag')].map((g) => ({ name: g.textContent, b: g.querySelector('rect').getBoundingClientRect() }));
    const out = tags.filter((x) => x.b.left < S.left - 1 || x.b.right > S.right + 1 || x.b.top < S.top - 1 || x.b.bottom > S.bottom + 1).map((x) => x.name);
    const lap = []; for (let i = 0; i < tags.length; i += 1) for (let j = i + 1; j < tags.length; j += 1) { const a = tags[i].b, b = tags[j].b; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > k && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > k) lap.push(`${tags[i].name} / ${tags[j].name}`); }
    const rows = new Map(); for (const li of document.querySelectorAll('[data-testid="spine"] .spine__s')) { const top = Math.round(li.getBoundingClientRect().top); const b = li.querySelector('b').getBoundingClientRect().top; rows.set(top, [...(rows.get(top) || []), b]); }
    const uneven = [...rows.values()].filter((v) => Math.max(...v) - Math.min(...v) > 1).length;
    return { tags: tags.length, out, lap, rows: rows.size, uneven };
  });
  ok(`CORE-${tag}-06b`, 'the room in 3D: every device name is inside the drawing and no name lies on another', look.tags >= 8 && look.out.length === 0 && look.lap.length === 0, JSON.stringify(look));
  ok(`CORE-${tag}-06c`, 'the delivery spine: in every row of stages the stage names sit on one line, whether or not a state wraps', look.rows >= 1 && look.uneven === 0, JSON.stringify({ rows: look.rows, uneven: look.uneven }));
  await t.close();
}

{ // 18 Nov first-time-viewer pass: the top bar wrapped to a third row at 390 px (avatar alone on a row, 157 px instead of 106). At every
  // common phone width the bar must fit the height the layout reserves for it (--top-h), and the account button must stay on the first row.
  const t = await open([390, 844], 'light', { hash: '#/home' });
  for (const w of [320, 360, 375, 390, 412, 430, 768]) {
    await t.page.setViewportSize({ width: w, height: 844 }); await t.page.waitForTimeout(250);
    const v = await t.page.evaluate(() => { const bar = document.querySelector('.shell__bar'); const top = parseFloat(getComputedStyle(document.querySelector('.demo')).getPropertyValue('--top-h')); const va = document.querySelector('.viewas-btn')?.getBoundingClientRect(); const em = document.querySelector('.shell__brand')?.getBoundingClientRect(); return { h: Math.round(bar.getBoundingClientRect().height), top, sameRow: !!va && !!em && Math.abs((va.top + va.height / 2) - (em.top + em.height / 2)) < 12 }; });
    ok(`CORE-bar-${w}`, `${w} px: the top bar fits its reserved height (${'--top-h'}) and View as sits on the brand's row`, v.h <= v.top + 1 && v.sameRow, JSON.stringify(v));
  }
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
// MC-open (26 Nov 2026, metric integrity): one rule for an open service request (apps/demo/src/workspace/requests.ts). On the live
// preview of 4231f6a2 Mission Control said 2 open requests while Pro's Issue Intelligence and ServiceHands said 3: they counted the
// seed's RESOLVED request (fixed and checked) as open. Every tile labelled open now reads the same number; the unit check is MI-09/MI-10.
// Mission Control is read as the first visitor sees it (its number is the same for every role, campus/definitions.ts); the three
// service pages as the service manager, who may open all of them.
{ const t = await open([1440, 900], 'light', { hash: '#/home' }); await t.page.waitForTimeout(900);
  const val = async (hash, id) => { if (hash) await t.go(hash, 1800); await t.page.waitForSelector(`[data-testid="${id}"] .kit-tile__value`, { timeout: 8000 }).catch(() => {});
    return parseInt(await t.page.locator(`[data-testid="${id}"] .kit-tile__value`).first().textContent().catch(() => '') || '', 10); };
  const home = await val('', 'kpi-requests'); await setRole(t, 'svcmgr'); await t.page.reload(); await t.page.waitForTimeout(900);
  const n = { home, pro: await val('#/pro/issues', 'pro-jobs-open'), sh: await val('#/servicehands', 'sh-open-jobs'), total: parseInt((await t.page.locator('#all').first().textContent().catch(() => '') || '').match(/(\d+) jobs? · open first/)?.[1] || '', 10), v25: await val('#/v25', 'v25-open-jobs') };
  ok('MC-open-01', 'every tile labelled open counts the same service requests: Mission Control, Pro Issue Intelligence, ServiceHands and the V2.5.3 control room (a resolved request is not open)', Number.isFinite(n.home) && n.home > 0 && n.pro === n.home && n.sh === n.home && n.v25 === n.home, JSON.stringify(n));
  // MC-open-02 (review of dd83dfe7): the Service page's tabs count what they list; Queue and Closed hold every request once (the total is
  // ServiceHands' own "All service jobs" count); its tag says the open count
  await t.go('#/v25/service', 1800);
  const tabs = async () => t.page.evaluate(() => { const n = (id) => parseInt((document.getElementById(id)?.textContent || '').match(/(\d+)\s*$/)?.[1] || '', 10);
    return { queue: n('tab-queue'), closed: n('tab-closed'), listed: document.querySelectorAll('[data-testid="incidents"] > li').length, tag: parseInt([...document.querySelectorAll('.build__state .ui-tag')].map((x) => x.textContent).find((x) => / open$/.test(x)) || '', 10) }; });
  const q = await tabs(); await t.page.click('#tab-closed'); await t.page.waitForTimeout(400); const c = await tabs();
  ok('MC-open-02', 'Service: the Queue and Closed tabs count the requests they list, together every request once, and the tag says the open count', q.listed === q.queue && c.listed === c.closed && Number.isFinite(n.total) && q.queue + q.closed === n.total && q.tag === n.home, JSON.stringify({ q, c }));
  // MC-open-03 (27 Nov 2026, #320): "Open issues" is one per id (campus/definitions.ts, issues.open). Pro's command center and its drill
  // down added a room's open requests to its record issues as they stood, so an issue on the record and the live request of the same id
  // counted twice. The seed does not show it, so a live request is opened under the id of Atlas 7.112's open record issue; the unit
  // check of the same rule is MI-13.
  await t.page.evaluate(() => { const k = 'empathia.demo.workspace.v1'; const w = JSON.parse(localStorage.getItem(k)); const src = w.incidents.find((i) => i.id === 'ISS-0417');
    w.incidents.push({ ...src, id: 'ISS-ATL-7-112', roomId: 'R-ATL-7-112', roomName: 'Atlas 7.112 Strategy Room', state: 'OPEN', severity: 'Standard', title: 'Display does not wake from standby on the first try', summary: 'The display does not wake from standby on the first try.', history: [], closedAt: null, restoredAt: null, workOrderId: null, apexId: null, recurrenceOf: null });
    localStorage.setItem(k, JSON.stringify(w)); }); await t.page.reload(); await t.page.waitForTimeout(900);
  const tileOf = async (hash) => { await t.go(hash, 1800); return parseInt(await t.page.locator('.kit-tile:has(.kit-tile__label:text-is("Open issues")) .kit-tile__value').first().textContent().catch(() => '') || '', 10); };
  const oi = { campus: await tileOf('#/campus'), atl: await tileOf('#/campus/ATL'), pro: await tileOf('#/pro') };
  oi.proAtl = parseInt(await t.page.locator('[data-testid="pro-drill"] tr[data-drill="ATL"] td.num').last().textContent().catch(() => '') || '', 10);
  // the assurance drill-down's "Open issues" column counted the room records only: 3 for Atlas on the seed, where the Atlas page says 5
  await t.go('#/assurance', 1800); oi.asAtl = parseInt(await t.page.locator('[data-testid="as-drill"] tr[data-drill="ATL"] td.num').last().textContent().catch(() => '') || '', 10);
  ok('MC-open-03', 'Open issues are one per id: Pro\'s command center and the Pro and Assurance drill-downs count what the campus pages count, also when a live request shares an id with a record issue', Number.isFinite(oi.campus) && oi.pro === oi.campus && oi.proAtl === oi.atl && oi.asAtl === oi.atl, JSON.stringify(oi));
  // MC-open-04 (review of e7f9930d and d2fdc908): three more pages, with the same shared id. Pro Issue Intelligence's "Open issues by
  // building" added open requests to the record issues as they stood (Atlas 6 where the map on the same page says 5); the Search Party
  // map's "Open issues" lens listed the record only; the commissioning room's Service stage counted the record copy beside its request.
  // The map holds the six campus buildings (campus/canon.ts, BUILDINGS), not the regional sites the campus tile also counts, so the lens
  // is held to the sum of the six building pages' tiles.
  await t.go('#/pro/issues', 1800); const ii = parseInt(await t.page.locator('.wk-bars li:has(> span:text-is("Atlas")) > b').first().textContent().catch(() => '') || '', 10);
  await t.go('#/search/projects', 1200); await t.page.click('[data-testid="sp-map"] .sp__tchip:has-text("Open issues")').catch(() => {}); await t.page.waitForTimeout(300);
  const sp = parseInt(await t.page.locator('[data-testid="sp-map"] .sp__tchip[aria-pressed="true"] b').first().textContent().catch(() => '') || '', 10);
  const six = []; for (const k of ['ATL', 'MER', 'FRG', 'BCN', 'HZN', 'NST']) six.push(await tileOf(`#/campus/${k}`)); const map = six.every(Number.isFinite) ? six.reduce((a, b) => a + b, 0) : NaN;
  // the commissioning record is not open to the Service Manager (access/v253.ts, commissioning.room), so the commissioning engineer reads it
  await setRole(t, 'cxeng'); await t.page.reload(); await t.page.waitForTimeout(600); await t.go('#/commissioning/room/R-ATL-7-112', 1800); const svc = (await t.page.locator('[data-testid="cx-spine"] li', { hasText: 'Service' }).first().textContent().catch(() => '')) || '';
  ok('MC-open-04', 'Pro Issue Intelligence\'s buildings, the Search Party "Open issues" lens and a room\'s Service stage count a shared id once, as the campus pages do', ii === oi.atl && sp === map && /1 open request · 0 open issues on the record/.test(svc), JSON.stringify({ ii, sp, map, six, svc: svc.slice(0, 160), atl: oi.atl }));
  await t.close(); }
for (const scheme of SCHEMES) for (const vp of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/home' }); await t.page.waitForTimeout(700);
  const v = await t.page.evaluate(() => {
    const q = (s) => document.querySelector(s); const qa = (s) => Array.from(document.querySelectorAll(s));
    const st = qa('[data-testid="mc-flow"] .mc-st'); const n = (el) => parseInt(el.querySelector('.mc-st__dot')?.textContent || '0', 10) || 0;
    return { hero: !!q('[data-testid="mc-hero"] h1') && !!q('[data-testid="hero-search"] input'), prods: qa('[data-testid="mc-products"] a').length, tiles: qa('[data-testid="home-kpis"] .kit-tile').length, sparks: qa('[data-testid="home-kpis"] svg[role="img"]').length,
      stations: st.length, rooms: st.filter((e) => e.getAttribute('data-station') !== 'intake').reduce((s, e) => s + n(e), 0), greet: q('[data-testid="mc-headline"]')?.textContent || '', acts: qa('[data-testid="mc-actions"] a').length,
      pri: qa('[data-testid="mc-priority"] a').length, inc: qa('[data-testid="mc-incidents"] li').length, active: qa('[data-testid="mc-active"] .mc-room').length, ins: q('[data-testid="mc-insight"]')?.textContent || '',
      small: qa('main .mc-st button, main .mc-pri a, main .mc-act, main .mc-prod, main .mc-ask').filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.height < 43.5 || b.width < 43.5); }).map((e) => e.textContent.slice(0, 20)) };
  });
  // 25 Nov 2026 (commercial readiness §5): the greeting card is gone; its greeting is the headline's, the one greeting on the page,
  // and the products and help actions sit one click away under "More from Mission Control" (still in the page, so still counted)
  ok(`MC-${tag}-01`, 'Mission Control: hero with the Search Party bar and the one greeting, products, help actions, eight tiles with sparklines', v.hero && v.prods >= 6 && v.tiles === 8 && v.sparks >= 3 && /Good (morning|afternoon|evening), Product Architect/.test(v.greet) && v.acts >= 5, JSON.stringify(v));
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
  // 25 Nov 2026 (metric integrity §4.5): the hero sentence names a room and its issue first, and the hero button must open that same
  // record. It opened the newest live request (ISS-0421, Atlas 4.220) while the sentence named Atlas 4.218 and ISS-0417. Checked by
  // identity on the page it lands on, not by the presence of text on the home page.
  const hero = await t.page.evaluate(() => { const b = document.querySelector('[data-testid="mc-open-first"]'); const say = document.querySelector('[data-testid="home-say"]'); return { href: b?.getAttribute('href') || '', rec: b?.getAttribute('data-record') || '', room: b?.getAttribute('data-room') || '', named: say?.querySelector('[data-testid="mc-first-issue"]')?.textContent || '', roomLink: say?.querySelector('a[href^="#/campus/"]')?.getAttribute('href') || '', h1: document.querySelector('[data-testid="mc-headline"]')?.getAttribute('data-count') || '', pri: document.querySelector('[data-testid="mc-pri-count"]')?.textContent || '', split: say?.querySelector('[data-testid="mc-split"]')?.textContent || '' }; });
  const parts = (hero.split.match(/\d+/g) || []).map(Number);
  ok(`MC-${tag}-count`, 'the headline is the role’s own items, the same number as Priority actions, and its parts (act on, resume, review) add up to it', hero.h1 !== '' && hero.h1 === hero.pri && parts.length === 3 && parts.reduce((a, b) => a + b, 0) === Number(hero.h1), JSON.stringify(hero));
  await t.page.click('[data-testid="mc-open-first"]'); await t.page.waitForTimeout(900);
  const landed = await t.page.evaluate(() => ({ hash: location.hash, refused: !!document.querySelector('[data-testid="access-page"]'), text: document.querySelector('main')?.innerText || '' }));
  ok(`MC-${tag}-first`, 'the hero button opens the record the sentence names first (ISS-0417 in Atlas 4.218), and that record is on the page it opens', hero.rec === 'ISS-0417' && hero.named === 'ISS-0417' && hero.room === 'R-ATL-4-218' && /R-ATL-4-218|4-218/.test(hero.roomLink) && hero.href === '#/v25/service?id=ISS-0417' && landed.hash === hero.href && !landed.refused && landed.text.includes('ISS-0417'), JSON.stringify({ ...hero, landed: { ...landed, text: landed.text.slice(0, 120) } }));
  await t.go('#/home', 700);
  // the first priority opens the record it names (25 Nov 2026: read from Priority actions; the greeting card that listed it is gone)
  const first = t.page.locator('[data-testid="mc-priorities"] .mc-pri a').first(); const href = await first.getAttribute('href'); await first.click(); await t.page.waitForTimeout(700);
  ok(`MC-${tag}-08`, 'the first priority opens the record it names (not a refusal)', (await t.page.evaluate(() => location.hash)) === href && (await t.page.locator('[data-testid="access-page"]').count()) === 0, href);
  if (vp[2] === 'desktop') await t.page.goto(t.page.url().split('#')[0] + '#/home').catch(() => {});
  await t.close();
}
// 25 Nov 2026 (commercial readiness §5 and §7): the layered home and the first-visit introduction
for (const scheme of SCHEMES) for (const vp of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/home' }); await t.page.waitForTimeout(800);
  const order = await t.page.evaluate(() => { const ids = ['mc-intro', 'mc-hero', 'mc-flow', 'mc-priorities', 'home-kpis', 'mc-more']; const y = (id) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().top ?? NaN; return ids.map((id) => [id, y(id)]); });
  // 26 Nov 2026: the longer caption under the health ring pushed the hero's figures out of their card at 390 px (seen on the preflight's
  // screenshot; the page did not scroll sideways, so MC-05 could not see it)
  const outside = await t.page.evaluate(() => { const a = document.querySelector('.mc-hero__aside')?.getBoundingClientRect(); return a ? [...document.querySelectorAll('.mc-hero__aside > *, .mc-hero__facts li')].filter((e) => { const x = e.getBoundingClientRect(); return x.right > a.right + 1 || x.left < a.left - 1; }).map((e) => e.textContent.slice(0, 24)) : ['no aside']; });
  ok(`MC-${tag}-aside`, 'the health ring, its caption and the campus figures stay inside their card', !outside.length, outside.join(' | '));
  ok(`MC-${tag}-layers`, 'the page reads in layers: the introduction (first visit), the briefing, the Mission flow, your priorities, the campus numbers, then more', order.every(([, y], i) => Number.isFinite(y) && (i === 0 || y > order[i - 1][1])), JSON.stringify(order));
  // CHANGED 26 Nov 2026 (the preflight on 5ba4fa67, this check's first run): Chromium keeps a layout box for the contents of a closed
  // <details> and does not draw them, so their height is not zero; whether they are drawn is checkVisibility(), and the group itself
  // is no taller than its own summary (two lines on a phone), borders aside
  const closedGroups = await t.page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="mc-more"] details.mc-group')).map((d) => [d.getAttribute('data-group'), d.open, d.querySelector('.mc-group__body')?.checkVisibility() ?? null, Math.round(d.getBoundingClientRect().height - (d.querySelector('summary')?.getBoundingClientRect().height || 0))]));
  ok(`MC-${tag}-more-01`, 'products, help, active rooms, insight, saved work and changes are one click away: six groups, closed on a first visit, their contents not drawn', closedGroups.length === 6 && closedGroups.every(([, o, seen, extra]) => !o && seen === false && extra <= 4), JSON.stringify(closedGroups));
  const tall = await t.page.evaluate(() => document.documentElement.scrollHeight / innerHeight);
  ok(`MC-${tag}-short`, `the page is at most ${vp[2] === 'desktop' ? 5 : 9} screens tall (the external review measured about seven on a desktop before)`, tall <= (vp[2] === 'desktop' ? 5 : 9), tall.toFixed(2));
  // the introduction: there on a first visit, gone for good with "Not now", back with "Show the introduction again", never on a deep link
  const intro = await t.page.evaluate(() => ({ on: !!document.querySelector('[data-testid="mc-intro"]'), paths: Array.from(document.querySelectorAll('[data-testid="mc-intro"] a')).map((a) => a.getAttribute('href')), dialog: !!document.querySelector('[role="dialog"][aria-modal="true"]') }));
  ok(`MC-${tag}-intro-01`, 'a first visit shows the introduction in the page (not a dialog over it) with the guided tours, one room’s story and the welcome', intro.on && !intro.dialog && intro.paths.includes('#/tours') && intro.paths.includes('#/replay/R-ATL-4-218') && intro.paths.includes('#/investor'), JSON.stringify(intro));
  await t.page.click('[data-testid="mc-intro-close"]'); await t.page.waitForTimeout(200); await t.page.reload(); await t.page.waitForTimeout(800);
  ok(`MC-${tag}-intro-02`, '"Not now" dismisses it for good: a reload does not bring it back', (await t.page.locator('[data-testid="mc-intro"]').count()) === 0);
  await t.page.click('[data-testid="mc-intro-again"]'); await t.page.waitForTimeout(300);
  ok(`MC-${tag}-intro-03`, '"Show the introduction again" at the foot of the page brings it back', (await t.page.locator('[data-testid="mc-intro"]').count()) === 1);
  // a group left open is open next time (experienced users keep what they use)
  await t.page.click('[data-group="products"] > summary'); await t.page.waitForTimeout(200);
  const prodVisible = await t.page.evaluate(() => (document.querySelector('[data-testid="mc-products"] a')?.getBoundingClientRect().height || 0) >= 44);
  await t.page.reload(); await t.page.waitForTimeout(800);
  const kept = await t.page.evaluate(() => ({ products: document.querySelector('[data-group="products"]')?.open, start: document.querySelector('[data-group="start"]')?.open }));
  ok(`MC-${tag}-more-02`, 'opening "Every product" shows the nine product tiles, and it is still open after a reload while the others stay closed', prodVisible && kept.products === true && kept.start === false, JSON.stringify(kept));
  // a first visit that arrives by a deep link sees no introduction there
  const t2 = await open(vp, scheme, { hash: '#/campus' }); await t2.page.waitForTimeout(800);
  ok(`MC-${tag}-intro-04`, 'a deep link (#/campus) on a first visit opens its page with no introduction in the way', (await t2.page.locator('[data-testid="mc-intro"]').count()) === 0 && (await t2.page.locator('main h1').count()) === 1);
  ok(`MC-${tag}-layers-clean`, 'no page error and no request leaves the page', !t.errs.length && !t.ext.length && !t2.errs.length, [...t.errs, ...t.ext, ...t2.errs].join(' | '));
  await t2.close(); await t.close();
}
for (const scheme of SCHEMES) { // View as changes the work; D44; destructive input
  const t = await open([1440, 900], scheme, { hash: '#/investor' });
  const who = async (r) => { await setRole(t, r); await t.page.evaluate(() => { location.hash = '#/home'; }); await t.page.reload(); await t.page.waitForTimeout(800);
    // 10 Nov 2026: the service manager, the executive and the visitor no longer land on Mission Control but on their own start pages
    // (pages/RoleHome.tsx, V2.5.3's role homes). The check is the same — whose work comes first — read from the start page's own
    // parts: the kicker names the role, the first zone lists its work, and the one "start here" button names the first item.
    return t.page.evaluate(() => ({ greet: document.querySelector('[data-testid="home"] .kicker')?.textContent || '', primary: document.querySelector('[data-testid="rh-primary"]')?.textContent || '', mine: Array.from(document.querySelectorAll('[data-testid="rh-zone"]:first-of-type [data-testid="rh-row"], [data-testid="rh-zone"][data-zone="triage"] [data-testid="rh-row"], [data-testid="rh-zone"][data-zone="decide"] [data-testid="rh-row"]')).map((e) => e.textContent), links: Array.from(document.querySelectorAll('main a[href^="#/"]')).map((a) => a.getAttribute('href')) })); };
  const sm = await who('svcmgr'); const ex = await who('exec'); const vi = await who('visitor');
  ok(`MC-${scheme}-role-01`, 'View as: the service manager’s own work starts with the triage; the executive’s with the funding decision', /Service Manager/.test(sm.greet) && /Triage ISS-0417/.test(sm.primary) && /ISS-0417/.test(sm.mine[0] || '') && /To triage/.test(sm.mine[0] || '') && /Decide PRJ-NST-TH/.test(ex.primary) && ex.mine.some((x) => /Fund PRJ-NST-TH/.test(x)) && !ex.mine.some((x) => /Triage|ISS-/.test(x)), JSON.stringify({ sm: [sm.primary, ...sm.mine.slice(0, 1)], ex: [ex.primary, ...ex.mine.slice(0, 1)] }).slice(0, 300));
  // D44: every link the visitor's start page offers opens without the owl page
  const refused = [];
  for (const h of [...new Set(vi.links)].slice(0, 40)) { await t.go(h, 250); if (await t.page.locator('[data-testid="access-page"]').count()) refused.push(h); }
  ok(`MC-${scheme}-role-02`, `D44: none of the ${new Set(vi.links).size} links the visitor’s start page offers leads to a refusal`, vi.links.length >= 3 && !refused.length, refused.join(' '));
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
  // 12 Nov 2026: the records count on each role card arrives asynchronously; under load it can land after 900 ms (seen once in a matrix), so wait for it
  await t.page.waitForFunction(() => { const c = Array.from(document.querySelectorAll('[data-testid="shelf-counts"]')); return c.length > 0 && c.every((e) => /records/.test(e.textContent || '')); }, null, { timeout: 10000 }).catch(() => {});
  const sh = await t.page.evaluate(() => { const cards = Array.from(document.querySelectorAll('[data-testid="role-shelf"] .shelf__role')); return { n: cards.length, art: cards.filter((c) => c.querySelector('svg.shelf__art')).length, counts: cards.map((c) => c.querySelector('[data-testid="shelf-counts"]')?.textContent || ''), first: cards[0]?.getAttribute('aria-pressed') }; });
  ok(`CORE-${scheme}-shelf-01`, 'Every role, one Core: a carousel of all 17 roles, each with an illustration and its records and surfaces counts; the viewed role first', sh.n === 17 && sh.art === 17 /* seventeen since the UC / Voice Administrator became a role (founder decision E3-D2, 23 Nov 2026); sixteen since the Site Champion (11 Nov 2026) */ && sh.first === 'true' && sh.counts.every((c) => /\d[\d,]* of \d[\d,]* records · \d+ of \d+ surfaces/.test(c)), JSON.stringify(sh).slice(0, 300));
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
  ok(`CORE-${scheme}-list-01`, 'campus: the list alternative shows every building and site with health bars', (await t.page.locator('[data-testid="campus-list-rows"] .kit-meter').count()) === 13 /* 8 until 10 Nov 2026: six buildings and now seven other sites (the 90-room estate) */ && (await t.page.locator('[data-testid="campus-stage"]').count()) === 0);
  await t.page.reload(); await t.page.waitForTimeout(600);
  ok(`CORE-${scheme}-list-02`, 'the choice is remembered for this viewer', (await t.page.locator('[data-testid="campus-list-rows"]').count()) === 1);
  await t.page.click('.campus__view button:has-text("3D map")'); await t.page.waitForTimeout(200);
  ok(`CORE-${scheme}-list-03`, 'and the 3D map comes back', (await t.page.locator('[data-testid="campus-stage"]').count()) === 1);
  await t.go('#/campus/LKS', 600);
  ok(`CORE-${scheme}-site-01`, 'a regional site opens: its rooms listed, a note instead of the campus map', (await t.page.locator('[data-testid="regional-note"]').count()) === 1 && (await t.page.locator('[data-testid="room-list"] tbody tr').count()) === 3 /* 2 until 10 Nov 2026: Lakeshore gained the coworking neighbourhood (ADD-43) */);
  ok(`CORE-${scheme}-more-clean`, 'no page error and no request leaves the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].join(' | '));
  await t.close();
}

{ // reduced motion: the 3D campus and the room still work
  const t = await open([1440, 900], SCHEMES[0], { hash: '#/campus', reducedMotion: 'reduce' }); await t.page.waitForTimeout(500);
  // CHANGED 18 Nov 2026 (#234 Empathia Map): the first Enter on a building flies to it and opens its place card (as a map app does);
  // a second Enter, or the card's Open button, opens the building page. The keyboard path is the same length plus one key.
  await t.page.waitForSelector('[data-testid="campus-b-HZN"]', { timeout: 15000 }).catch(() => {}); await t.page.focus('[data-testid="campus-b-HZN"]'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(400);
  ok('CORE-reduced-motion', 'under reduced motion a building opens from the keyboard (Enter for its card, Enter again to open)', (await t.page.evaluate(() => location.hash)) === '#/campus/HZN' && !t.errs.length);
  await t.close();
}
await done();
