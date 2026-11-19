#!/usr/bin/env node
// Build Your Empathia on /pricing (founder 18 Nov 2026 19:39: "select 150 rooms, configure their environment, see transparent annual and
// long-term costs, compare equivalent offerings, and instantly open the actual product demonstration … make the lead generation and
// conversion workflows off this interactive sales part a 10/10"; 20:51: "the updated pricing is king"; 19 Nov 04:45: "approve 1B, 2 IN,
// 3 YES, 4 YES for Price Book 3"), served by the site's own server:
// - every figure on the page is estimate() from packages/commercial (price book 3): the four archetype estates to the cent, the presets,
//   typed room groups with their devices, add-ons, Search Party's count, a bundle against the volume discount, hardware, the 24 → 25 step;
// - the estate travels in the address and in the copied summary; the enquiry and the demonstration are one click away;
// - without the script the 50-room headquarters and the four estates still read, and no dead control is offered;
// - phone and desktop: no sideways scroll, 44 px targets, the year's total stays in sight on a phone; no console error, nothing off-site.
// Changed 19 Nov 2026 for price book 3 (founder 04:45): rooms are entered as three groups with their devices instead of rooms and large
// rooms, so the inputs, the presets and every expected figure changed; the price book 2 figures ($52,185.00, $215,038.80) no longer exist.
// No check was dropped: each one still compares the page with estimate() line by line, and new checks cover what price book 3 adds.
// Run it in both schemes: PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/website-pricing.test.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const C = await import(pathToFileURL(path.join(repo, 'packages/commercial/dist/src/index.js')).href);
const scheme = process.env.PW_COLOR_SCHEME || 'light';
const dist = path.join(repo, 'apps/website/dist');
const PORT = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
let failed = 0; const results = [];
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ` — ${String(detail).slice(0, 300)}`}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`; const browser = await chromium.launch();
const watch = (page, errs, ext) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) ext.push(r.url()); }); };
const receipt = (page) => page.evaluate(() => ({ annual: document.querySelector('[data-total=annual]')?.textContent, first: document.querySelector('[data-total=first]')?.textContent, three: document.querySelector('[data-total=three]')?.textContent, five: document.querySelector('[data-total=five]')?.textContent,
  lines: Array.from(document.querySelectorAll('[data-by-receipt] [data-line]')).map((r) => `${r.dataset.line}:${r.querySelector('[data-cents]').dataset.cents}`), notes: document.querySelector('.by-r__notes')?.innerText || '', hash: location.hash }));
const expect = (e) => ({ annual: C.usd(e.annualRecurringCents), first: C.usd(e.firstYearCents), three: C.usd(e.threeYearCents), five: C.usd(e.fiveYearCents), lines: [...e.recurring, ...e.oneTime].map((l) => `${l.id}:${l.cents}`) });
const same = (r, e) => { const x = expect(e); return r.annual === x.annual && r.first === x.first && r.three === x.three && r.five === x.five && r.lines.join() === x.lines.join(); };
const setNum = async (page, k, v) => { await page.fill(`[data-by="${k}"]`, String(v)); };
const settle = async (page, k) => { await page.locator(`[data-by="${k}"]`).blur(); await page.waitForTimeout(60); };
const G = (sr, sd, mr, md, lr, ld) => ({ small: sr, smallDevices: sd, mid: mr, midDevices: md, large: lr, largeDevices: ld });
// the four starting estates (apps/website/src/build-view.ts PROFILES): room groups with their devices, licensed users at 1.3 a room
const ESTATES = [[G(10, 53, 0, 0, 0, 0), 13], [G(32, 183, 17, 252, 1, 25), 65], [G(94, 538, 53, 796, 3, 75), 195], [G(310, 1775, 180, 2720, 10, 250), 650]];
const est = ([rooms, users], extra = {}) => C.estimate({ rooms, users, ...extra });
const setGroups = async (page, g) => { for (const [k, v] of [['smallRooms', g.small], ['smallDevices', g.smallDevices], ['midRooms', g.mid], ['midDevices', g.midDevices], ['largeRooms', g.large], ['largeDevices', g.largeDevices]]) { await setNum(page, k, v); await settle(page, k); } };
const line = (r, id) => Number((r.lines.find((x) => x.startsWith(id + ':')) || ':0').split(':')[1]);

try {
  // 1. without the script: the 50-room headquarters and the four estates read; no control is offered that would do nothing
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, javaScriptEnabled: false }); const page = await ctx.newPage();
    await page.goto(base + '/pricing', { waitUntil: 'load' });
    const r = await receipt(page); const ui = await page.evaluate(() => ({ controls: document.querySelector('[data-by-controls]').hidden, copy: document.querySelector('[data-by-copy]').hidden, note: !!document.querySelector('[data-by-nojs]') && !document.querySelector('[data-by-nojs]').hidden,
      four: Array.from(document.querySelectorAll('[data-four] tr[data-row=annual] td')).map((td) => td.textContent) }));
    const fours = ESTATES.map((x) => C.usd(est(x).annualRecurringCents));
    ok('BY-01', 'without the script the page shows the 50-room headquarters to the cent ($48,595.68) and the four estates side by side ($9,256.24, $48,595.68, $115,537.26, $341,208.30), each equal to estimate(); the controls and the copy button are hidden, and the page says why', same(r, est(ESTATES[1])) && r.annual === '$48,595.68' && ui.controls && ui.copy && ui.note && ui.four.join() === fours.join() && fours.join() === '$9,256.24,$48,595.68,$115,537.26,$341,208.30', JSON.stringify({ r: r.annual, ui, fours }));
    await ctx.close(); }

  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext);
    await page.goto(base + '/pricing', { waitUntil: 'load' }); await page.waitForTimeout(300);
    // 2. the presets: 10, 50, 150, 500 rooms, each its own room mix, devices and people, each pressed when chosen
    const pres = [];
    for (let i = 0; i < 4; i++) { await page.click(`[data-preset="${i}"]`); const r = await receipt(page); pres.push(same(r, est(ESTATES[i])) && await page.getAttribute(`[data-preset="${i}"]`, 'aria-pressed') === 'true'); }
    ok(`BY-${tag}-02`, 'each starting estate (10, 50, 150, 500 rooms, each with its own room groups, devices and people) fills the numbers and the receipt equals estimate() for it', pres.every(Boolean), JSON.stringify(pres));
    // 3. an estate typed in group by group, with hardware: to the cent, line by line, the volume discount a line of its own
    const g3 = G(200, 1200, 80, 1000, 30, 750); await setGroups(page, g3); await setNum(page, 'users', 400); await settle(page, 'users');
    for (const [k, n] of [['nano', 3], ['edge', 2], ['pulse', 2]]) for (let i = 0; i < n; i++) await page.click(`[data-by-step="${k}"][data-d="1"]`);
    const r3 = await receipt(page); const e3 = est([g3, 400], { hardware: { nano: 3, edge: 2, pulse: 2 } });
    ok(`BY-${tag}-03`, 'typed in (200 rooms with 1,200 devices, 80 with 1,000, 30 large rooms with 750; 400 users; 7 FieldLink units) the estate comes back to the cent: $218,561.22 a year with a −$6,892.38 volume line, $223,304.22 in the first year; every line shown and the lines add up', same(r3, e3) && r3.annual === '$218,561.22' && r3.first === '$223,304.22' && line(r3, 'DISCOUNT-VOLUME') === -689238 && /\/pricing$/.test(new URL(page.url()).pathname) && /sr=200/.test(r3.hash) && /ld=750/.test(r3.hash) && /pulse=2/.test(r3.hash), JSON.stringify({ a: r3.annual, f: r3.first, hash: r3.hash }));
    // 4. add a product: a per-room line follows the rooms; removing it takes the line away
    await page.check('[data-by-add=COMMISSION]'); const r4 = await receipt(page);
    await setNum(page, 'smallRooms', 210); await settle(page, 'smallRooms'); const r4b = await receipt(page); await page.uncheck('[data-by-add=COMMISSION]'); const r4c = await receipt(page);
    ok(`BY-${tag}-04`, 'a per-room product follows the room count (310 then 320 rooms × $12.99 × 12) at its v1.5 list price, takes no volume discount, and unticking it removes the line', line(r4, 'COMMISSION') === 310 * 1299 * 12 && line(r4b, 'COMMISSION') === 320 * 1299 * 12 && !r4c.lines.some((x) => x.startsWith('COMMISSION')) && /add=COMMISSION/.test(r4.hash), JSON.stringify([line(r4, 'COMMISSION'), line(r4b, 'COMMISSION'), r4c.lines.length]));
    // 5. the 25-room step, the firm fee from 45 rooms, devices held to what the rooms can hold, and the one-room floor
    for (const k of ['midRooms', 'largeRooms']) { await setNum(page, k, 0); await settle(page, k); }
    await setNum(page, 'smallRooms', 24); const a24 = await receipt(page); await setNum(page, 'smallRooms', 25); const a25 = await receipt(page);
    await setNum(page, 'smallRooms', 27); const smallShown = await page.isVisible('[data-by-small]'); await page.check('[data-by-small]'); const g27 = await receipt(page); await page.uncheck('[data-by-small]'); const n27 = await receipt(page);
    await setNum(page, 'smallRooms', 45); const a45 = await receipt(page); const smallAt45 = await page.isVisible('[data-by-small]'); await setNum(page, 'smallRooms', 48); const smallAt48 = await page.isVisible('[data-by-small]'); await setNum(page, 'smallRooms', 25); await settle(page, 'smallRooms');
    await setNum(page, 'midRooms', 2); await settle(page, 'midRooms'); await setNum(page, 'midDevices', 100); await settle(page, 'midDevices'); const midShown = await page.inputValue('[data-by="midDevices"]');
    await setNum(page, 'largeRooms', 1); await settle(page, 'largeRooms'); await setNum(page, 'largeDevices', 5); await settle(page, 'largeDevices'); const lrgShown = await page.inputValue('[data-by="largeDevices"]'); const held = await receipt(page);
    const smallDev = Number(await page.inputValue('[data-by="smallDevices"]'));
    for (const k of ['smallRooms', 'midRooms', 'largeRooms']) { await setNum(page, k, 0); await settle(page, k); } const floor = await receipt(page); const floorShown = await page.inputValue('[data-by="smallRooms"]');
    // changed 19 Nov 2026 (founder 03:47, 04:30): $499 a room past 24, the started-small cap, a firm $15,000 from 45 rooms (no longer "from")
    ok(`BY-${tag}-05`, 'from 25 rooms the fee grows $499 a room ($4,999.00, then $5,498.00 at 25) and the notes say how, and that it stops at a firm $15,000.00; at 27 rooms “we started with 24 rooms or fewer” caps it at $6,398.00 instead of $6,496.00 (offered to 47 rooms); 2 rooms of 9 to 19 devices hold at most 38 and one large room at least 20, and the receipt prices what is shown; the estate never drops below one room', a24.lines[0] === 'PLATFORM-20-24:499900' && a25.lines[0] === 'PLATFORM-GROWTH:549800' && /From 25 rooms the platform fee grows \$499\.00 a year/.test(a25.notes) && /stops at a firm \$15,000\.00/.test(a25.notes) && /told before your fee changes/.test(a25.notes) && smallShown && g27.lines[0] === 'PLATFORM-GROWTH-BAND:639800' && n27.lines[0] === 'PLATFORM-GROWTH:649600' && a45.lines[0] === 'PLATFORM-ENTERPRISE:1500000' && smallAt45 && !smallAt48 && midShown === '38' && lrgShown === '20' && same(held, est([G(25, smallDev, 2, 38, 1, 20), 400], { hardware: { nano: 3, edge: 2, pulse: 2 } })) && /PLATFORM-1-9/.test(floor.lines[0]) && floorShown === '1', JSON.stringify({ a24: a24.lines[0], a25: a25.lines[0], g27: g27.lines[0], n27: n27.lines[0], a45: a45.lines[0], smallShown, smallAt45, smallAt48, midShown, lrgShown, floor: floor.lines[0], floorShown }));
    // 5b. Search Party (founder 04:45, 1B): it counts the devices the rooms include plus the assets outside rooms, never a device a room
    // already charges for; the $49.99 minimum when there is nothing to count; the outside-rooms field only while Search Party is ticked
    await page.click('[data-preset="1"]'); const outsideBefore = await page.isVisible('[data-by="outside"]'); await page.check('[data-by-add=SEARCH]'); const outsideShown = await page.isVisible('[data-by="outside"]');
    await setNum(page, 'outside', 100); await settle(page, 'outside'); const d6 = await receipt(page); const perDev = await page.textContent('[data-k=per-device]').catch(() => null);
    const e6 = est(ESTATES[1], { hardware: { nano: 3, edge: 2, pulse: 2 }, addOns: [{ sku: 'SEARCH' }], assetsOutsideRooms: 100 });
    await setGroups(page, G(1, 0, 0, 0, 0, 0)); await setNum(page, 'outside', 0); await settle(page, 'outside'); const d0 = await receipt(page);
    await page.uncheck('[data-by-add=SEARCH]'); const outsideAfter = await page.isVisible('[data-by="outside"]');
    ok(`BY-${tag}-05b`, 'Search Party on the 50-room headquarters counts 183 + 17 × 8 + 20 devices the rooms include and 100 outside rooms: 439 × $0.45 a month ($2,370.60 a year), not the 121 devices the rooms already charge for; with nothing to count, the $49.99 minimum; the outside-rooms field shows only with Search Party', same(d6, e6) && d6.lines.includes('SEARCH:237060') && e6.searchAssets === 439 && /439 here/.test(d6.notes) && perDev === C.usd(e6.perDeviceAnnualCents) && /out=100/.test(d6.hash) && d0.lines.includes('SEARCH-MIN:59988') && !d0.lines.some((l) => l.startsWith('SEARCH:')) && !outsideBefore && outsideShown && !outsideAfter, JSON.stringify({ d6: d6.lines, assets: e6.searchAssets, perDev, d0: d0.lines, outsideBefore, outsideShown, outsideAfter }));
    // 5c. a bundle (founder 04:30: "don't accidentally remove products from existing bundles"): its discount is a line of its own; room
    // licences take the bundle discount or the volume discount, whichever is larger, never both
    await page.click('[data-preset="1"]'); await page.check('[data-by-add=COMMISSION]'); await page.selectOption('[data-by-bundle]', 'WORKPLACE-ESSENTIALS'); const b50 = await receipt(page);
    const e50 = est(ESTATES[1], { hardware: { nano: 3, edge: 2, pulse: 2 }, addOns: [{ sku: 'COMMISSION' }], bundle: 'WORKPLACE-ESSENTIALS' });
    await page.click('[data-preset="3"]'); const b500 = await receipt(page); const e500 = est(ESTATES[3], { hardware: { nano: 3, edge: 2, pulse: 2 }, addOns: [{ sku: 'COMMISSION' }], bundle: 'WORKPLACE-ESSENTIALS' });
    await page.selectOption('[data-by-bundle]', ''); await page.uncheck('[data-by-add=COMMISSION]'); const nb = await receipt(page);
    ok(`BY-${tag}-05c`, 'Workplace Essentials (5 %) on 50 rooms takes its discount off the platform fee, the room licences and Commissioning as one line; on 500 rooms the volume discount on room licences is larger, so the rooms take that and the bundle keeps the rest: two lines, never both on the same room', same(b50, e50) && line(b50, 'DISCOUNT-BUNDLE') < 0 && !line(b50, 'DISCOUNT-VOLUME') && same(b500, e500) && line(b500, 'DISCOUNT-VOLUME') < 0 && line(b500, 'DISCOUNT-BUNDLE') < 0 && /volume discount on room licences is larger/.test(b500.notes) && /bundle=WORKPLACE-ESSENTIALS/.test(b500.hash) && !nb.lines.some((l) => l.startsWith('DISCOUNT-BUNDLE')), JSON.stringify({ b50: b50.lines, b500: b500.lines.filter((l) => l.startsWith('DISCOUNT')) }));
    // 5d. expansion never lowers the bill (founder 04:04: "the objective is profitable customer expansion"): one more room, one more device
    await page.click('[data-preset="2"]'); const m0 = await receipt(page); const cents = (r) => r.lines.reduce((a, l) => a + Number(l.split(':')[1]), 0);
    await setNum(page, 'smallRooms', 95); await settle(page, 'smallRooms'); const m1 = await receipt(page); await setNum(page, 'largeDevices', 76); await settle(page, 'largeDevices'); const m2 = await receipt(page);
    ok(`BY-${tag}-05d`, 'on the 150-room campus, one more room and then one more device each raise the year’s total, never lower it', cents(m1) > cents(m0) && cents(m2) > cents(m1), JSON.stringify([m0.annual, m1.annual, m2.annual]));
    // 6. the estate travels: open the address in a new page, and the copied summary carries the totals and a link back
    const url = page.url(); const p2 = await ctx.newPage(); await p2.goto(url, { waitUntil: 'load' }); await p2.waitForTimeout(300); const rr = await receipt(p2); const mine = await receipt(page); await p2.close();
    await page.click('[data-by-copy]'); const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    ok(`BY-${tag}-06`, 'an estimate can be shared: the address reopens the same estate, and “Copy this estimate” puts every line, the totals, what is not included and the link on the clipboard', rr.annual === mine.annual && rr.lines.join() === mine.lines.join() && clip.includes(mine.annual) && clip.includes(mine.first) && /Not included: Implementation/.test(clip) && clip.includes('#build?sr=') && !/@|name=|email/i.test(new URL(url).hash), JSON.stringify({ a: rr.annual, b: mine.annual, clip: clip.slice(0, 120) }));
    // 7. the way on: the enquiry, with its own source, and the demonstration, opened as the page names, with the way back
    const act = await page.evaluate(() => { const a = document.querySelector('[data-build] a[data-enquiry]'); const d = document.querySelector('[data-build] a[data-launch]'); return { s: a?.dataset.enquiry, href: a?.getAttribute('href'), target: a?.target, rel: a?.rel, name: a?.textContent, disc: document.getElementById(a?.getAttribute('aria-describedby') || '')?.textContent || '', demo: d?.getAttribute('href'), demoName: d?.textContent }; });
    ok(`BY-${tag}-07`, 'the next step is one click: “Request this estimate” opens the hosted form in a new tab with source=website-pricing and the disclosure; “See it in the demonstration” opens the Pro launch with the way back to /pricing#build', act.s === 'website-pricing' && act.href === 'https://tally.so/r/VpG0Vy?source=website-pricing' && act.target === '_blank' && /noopener/.test(act.rel) && /new tab/.test(act.name) && /tally\.so/.test(act.disc) && /li=product-pro/.test(act.demo || '') && /back=%2Fpricing%23build/.test(act.demo || ''), JSON.stringify(act));
    // 8. layout: no sideways scroll, 44 px targets; on a phone the year's total stays in sight
    const geo = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, small: Array.from(document.querySelectorAll('[data-build] button, [data-build] .btn, [data-build] input[type=number], [data-build] select, .by__add')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.className || e.tagName}:${Math.round(e.getBoundingClientRect().height)}`), text: Array.from(document.querySelectorAll('[data-build] p, [data-build] li, [data-build] small, [data-build] dt')).filter((e) => e.textContent.trim().length > 30 && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => `${e.className || e.tagName}:${getComputedStyle(e).fontSize}:${e.textContent.slice(0, 30)}`) }));
    let mini = { shown: true, same: true };
    if (tag === 'phone') { await page.locator('[data-by-add=APEX]').scrollIntoViewIfNeeded(); mini = await page.evaluate(() => { const m = document.querySelector('[data-by-mini]'); const r = m.getBoundingClientRect(); return { shown: getComputedStyle(m).display !== 'none' && r.top >= 0 && r.bottom <= innerHeight, same: m.querySelector('b').textContent === document.querySelector('[data-total=annual]').textContent }; }); }
    else mini = await page.evaluate(() => ({ shown: getComputedStyle(document.querySelector('[data-by-mini]')).display === 'none', same: true }));
    ok(`BY-${tag}-08`, tag === 'phone' ? 'on a phone: no sideways scroll, every control 44 px or more, and the year’s total stays on screen while the options are changed' : 'on a desktop: no sideways scroll, every control 44 px or more, the receipt beside the controls (no extra bar)', geo.over <= 0 && !geo.small.length && !geo.text.length && mini.shown && mini.same, JSON.stringify({ geo, mini }));
    ok(`BY-${tag}-09`, 'no console error (CSP intact), nothing requested off the site', !errs.length && !ext.length, [...errs, ...ext].join(' | '));
    await ctx.close();
  }
  // 10. the script: its own file on /pricing only, within its budget; it sends nothing, stores nothing; nothing internal in it
  // Changed 19 Nov 2026 for price book 3: the budget is 38 KB, not 32 KB (apps/website/build.mjs gives the reason and the measured sizes);
  // added: the script carries none of the catalogue's display-only text (a product's scope, a pilot's caveat), which the page never shows
  { const m = JSON.parse(fs.readFileSync(path.join(dist, 'BUILD_MANIFEST.json'), 'utf8')).files; const js = fs.readFileSync(path.join(dist, 'build.js'), 'utf8');
    const pages = ['index.html', 'pilots/index.html', 'fieldlink/index.html', 'pricing/catalogue/index.html'].filter((f) => /build\.js/.test(fs.readFileSync(path.join(dist, f), 'utf8')));
    ok('BY-10', 'build.js is its own file (≤ 38 KB) loaded on /pricing only; it makes no network or storage call, carries no cost, margin or supplier figure, and none of the catalogue’s display-only text', m['build.js'].bytes <= 38912 && !C.SKUS.some((s) => js.includes(s.scope)) && !C.PILOTS.some((p) => js.includes(p.caveat)) && /build\.js/.test(fs.readFileSync(path.join(dist, 'pricing/index.html'), 'utf8')) && !pages.length && !/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|document\.cookie/.test(js) && !/\b(BOM|COGS|gross margin|gross profit|landed (hardware )?cost|unit economics)\b|\$82\b|\$485\b|\$181\b/i.test(js)   /* the same words and figures as FL-10 ('supplier' alone is a product's scope text: Procurement's "supplier governance") */, JSON.stringify({ bytes: m['build.js'].bytes, pages })); }
  // 11. the catalogue on price book 3: its parts first, the replaced v1.5 lines named and struck, never orderable; the Pro pilot's terms
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme }); const page = await ctx.newPage();
    await page.goto(base + '/pricing/catalogue', { waitUntil: 'load' });
    const c = await page.evaluate(() => ({ rates: Array.from(document.querySelectorAll('#book [data-rate]')).map((x) => `${x.dataset.rate}:${x.querySelector('.price b').textContent}`), bands: Array.from(document.querySelectorAll('#book [data-band] td')).map((x) => x.textContent), replaced: Array.from(document.querySelectorAll('[data-replaced]')).map((x) => x.dataset.replaced), pro: document.querySelector('[data-pilot=PILOT-PRO-PLUS] .price b')?.textContent, terms: document.querySelector('[data-pilot=PILOT-PRO-PLUS]')?.innerText || '', label: document.querySelector('[data-price-label="3"]')?.textContent || '', bundles: Array.from(document.querySelectorAll('[data-bundle]')).map((b) => b.dataset.bundle), note: document.querySelector('#bundles .note, #bundles [class*=note]')?.textContent || document.getElementById('bundles')?.innerText || '' }));
    // changed 19 Nov 2026 for price book 3 (founder 04:45): rooms $34.99 and $68.99 with devices included; a firm $15,000 from 45 rooms
    ok('BY-11', 'the full price list leads with price book 3 (rooms $34.99 and $68.99; user $9.99; platform $2,499 / $3,499 / $4,999, then $499 a room past 24, a firm $15,000 from 45 rooms; FieldLink proposed), lists the four replaced v1.5 lines struck through, keeps all seven bundles, and shows $19.99 only as the Pro pilot with its limits: 10 rooms, 90 days, nothing renews by itself', c.rates.join() === 'ROOM-STD:$34.99,ROOM-LRG:$68.99,USER:$9.99,FIELDLINK-NANO:$249.00,FIELDLINK-EDGE:$1,499.00,FIELDLINK-PULSE:$499.00' && c.bands.join() === '$2,499.00,$3,499.00,$4,999.00,$4,999.00 + $499.00 for each room past 24,$15,000.00, firm: it does not rise with more rooms' && c.replaced.join() === 'PRO-ROOM,CORE-STARTER,CORE-ENTERPRISE,SEAT-ENTERPRISE' && c.pro === '$19.99' && /Up to 10 rooms, for 90 days/.test(c.terms) && /nothing renews by itself/.test(c.terms) && /Still to be confirmed/.test(c.terms) && /price book 3/.test(c.label) && c.bundles.length === 7 && /whichever is larger, never both/.test(c.note), JSON.stringify(c).slice(0, 600));
    await ctx.close(); }
  // 13. what makes up the price, on /pricing: the per-device rates, the room price at each step, the volume tranches, the firm fee, what a
  // device is, and the protections for existing customers; no cost, margin or supplier figure anywhere on the pricing pages (the internal
  // unit costs are whole dollars, "$82"; a price the page computes, such as "$82.00" a device a year on the 150-room campus, is not one)
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, javaScriptEnabled: false }); const page = await ctx.newPage(); const texts = [];
    for (const u of ['/pricing', '/pricing/catalogue']) { await page.goto(base + u, { waitUntil: 'load' }); texts.push(await page.evaluate(() => document.body.innerText)); }
    const parts = await (async () => { await page.goto(base + '/pricing', { waitUntil: 'load' }); return page.evaluate(() => document.getElementById('parts')?.innerText || ''); })();
    const prot = C.PRICE_BOOK.protection.terms;
    ok('BY-13', 'the parts of the price are stated: $2.99 and $3.99 a device past 8 and 20; a room at 8, 12, 19, 20 and 25 devices ($34.99, $46.95, $67.88, $68.99, $88.94); 5, 10 and 15 % on rooms 101–250, 251–500 and 501 up; a firm $15,000; what counts as a device and that charges are never retroactive; all five protections; and no internal cost or margin wording on either page', /\$2\.99 a device/.test(parts) && /\$3\.99 a device/.test(parts) && /with 8 devices is \$34\.99, with 12 \$46\.95, with 19 \$67\.88, with 20 \$68\.99, with 25 \$88\.94/.test(parts) && /101–250 is 5 % off, 251–500 is 10 % off, 501 and up is 15 % off/.test(parts) && /\$15,000\.00/.test(parts) && /firm/.test(parts) && /never retroactive/.test(parts) && /spares, stock, retired devices and virtual endpoints/.test(parts) && prot.length === 5 && prot.every((t) => parts.includes(t)) && texts.every((t) => !/\b(BOM|COGS|gross margin|gross profit|landed (hardware )?cost|unit economics|breakeven|delivery cost)\b|\$(82|485|181)\b(?![.,]\d)/i.test(t)), parts.slice(0, 500));
    await ctx.close(); }
  // 12. every product page leads into the builder; a product sold as an add-on arrives with its own line ticked
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme }); const page = await ctx.newPage(); const got = {};
    for (const slug of ['commissioning', 'servicehands', 'apex', 'pro']) {
      await page.goto(`${base}/products/${slug}`, { waitUntil: 'load' }); const href = await page.getAttribute('[data-price-it]', 'href');
      await page.goto(base + href, { waitUntil: 'load' }); await page.waitForTimeout(250);
      got[slug] = { href, ticked: await page.evaluate(() => Array.from(document.querySelectorAll('[data-by-add]:checked')).map((c) => c.dataset.byAdd).join(',')), lines: (await receipt(page)).lines.map((l) => l.split(':')[0]).join(',') };
    }
    ok('BY-12', 'each product page has “Price it for your estate”: Commissioning arrives with Commissioning and Assurance ticked, ServiceHands and APEX with their own line, Pro with the platform alone', got.commissioning.ticked === 'COMMISSION,ASSURANCE' && /COMMISSION,ASSURANCE/.test(got.commissioning.lines) && got.servicehands.ticked === 'SERVICE' && got.apex.ticked === 'APEX' && got.pro.ticked === '' && got.pro.href === '/pricing#build', JSON.stringify(got));
    await ctx.close(); }
} finally {
  await browser.close(); srv.kill();
  const out = path.join(repo, `tests/evidence/website-pricing${scheme === 'dark' ? '-dark' : ''}`); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'RESULTS.json'), JSON.stringify({ suite: 'website-pricing', scheme, at: new Date().toISOString(), results }, null, 1));
  console.log(`\n${results.length - failed} passed, ${failed} failed (${scheme})`); process.exit(failed ? 1 : 0);
}
