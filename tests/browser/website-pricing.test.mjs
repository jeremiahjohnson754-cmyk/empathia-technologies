#!/usr/bin/env node
// Build Your Empathia on /pricing (founder 18 Nov 2026 19:39: "select 150 rooms, configure their environment, see transparent annual and
// long-term costs, compare equivalent offerings, and instantly open the actual product demonstration … make the lead generation and
// conversion workflows off this interactive sales part a 10/10"; 20:51: "the updated pricing is king"), served by the site's own server:
// - every figure on the page is estimate() from packages/commercial (price book 2): the founder's own illustration to the cent, the
//   presets, typed numbers, add-ons and hardware, the 24 → 25 room step;
// - the estate travels in the address and in the copied summary; the enquiry and the demonstration are one click away;
// - without the script the founder's 50-room estimate and the four estates still read, and no dead control is offered;
// - phone and desktop: no sideways scroll, 44 px targets, the year's total stays in sight on a phone; no console error, nothing off-site.
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

try {
  // 1. without the script: the founder's illustration and the four estates read; no control is offered that would do nothing
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, javaScriptEnabled: false }); const page = await ctx.newPage();
    await page.goto(base + '/pricing', { waitUntil: 'load' });
    const r = await receipt(page); const ui = await page.evaluate(() => ({ controls: document.querySelector('[data-by-controls]').hidden, copy: document.querySelector('[data-by-copy]').hidden, note: !!document.querySelector('[data-by-nojs]') && !document.querySelector('[data-by-nojs]').hidden,
      four: Array.from(document.querySelectorAll('[data-four] tr[data-row=annual] td')).map((td) => td.textContent) }));
    const fours = [[10, 1, 12], [50, 10, 75], [150, 25, 200], [500, 90, 650]].map(([n, l, u]) => C.usd(C.estimate({ standardRooms: n - l, largeRooms: l, users: u }).annualRecurringCents));
    ok('BY-01', 'without the script the page shows the founder’s 50-room estimate to the cent ($52,185.00) and the four estates side by side, each equal to estimate(); the controls and the copy button are hidden, and the page says why', same(r, C.estimate({ standardRooms: 40, largeRooms: 10, users: 75 })) && r.annual === '$52,185.00' && ui.controls && ui.copy && ui.note && ui.four.join() === fours.join(), JSON.stringify({ r: r.annual, ui, fours }));
    await ctx.close(); }

  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext);
    await page.goto(base + '/pricing', { waitUntil: 'load' }); await page.waitForTimeout(300);
    // 2. the presets: 10, 50, 150, 500 rooms, each its own profile, each pressed when chosen
    const pres = [];
    for (let i = 0; i < 4; i++) { await page.click(`[data-preset="${i}"]`); const r = await receipt(page); const p = [[10, 1, 12], [50, 10, 75], [150, 25, 200], [500, 90, 650]][i]; pres.push(same(r, C.estimate({ standardRooms: p[0] - p[1], largeRooms: p[1], users: p[2] })) && await page.getAttribute(`[data-preset="${i}"]`, 'aria-pressed') === 'true'); }
    ok(`BY-${tag}-02`, 'each starting estate (10, 50, 150, 500 rooms, each with its own room mix and people) fills the numbers and the receipt equals estimate() for it', pres.every(Boolean), JSON.stringify(pres));
    // 3. the founder's 310-room illustration, typed in: to the cent, line by line
    await setNum(page, 'rooms', 310); await setNum(page, 'large', 65); await setNum(page, 'users', 200);
    for (const [k, n] of [['nano', 3], ['edge', 2], ['pulse', 2]]) for (let i = 0; i < n; i++) await page.click(`[data-by-step="${k}"][data-d="1"]`);
    const r3 = await receipt(page); const e3 = C.estimate({ standardRooms: 245, largeRooms: 65, users: 200, hardware: { nano: 3, edge: 2, pulse: 2 } });
    ok(`BY-${tag}-03`, 'typed in, the founder’s 310-room illustration comes back to the cent: $215,038.80 a year, $4,743.00 of hardware once, $219,781.80 in the first year; every line shown and the lines add up', same(r3, e3) && r3.annual === '$215,038.80' && r3.first === '$219,781.80' && /\/pricing$/.test(new URL(page.url()).pathname) && /rooms=310/.test(r3.hash) && /pulse=2/.test(r3.hash), JSON.stringify({ a: r3.annual, f: r3.first, hash: r3.hash }));
    // 4. add a product: a per-room line follows the rooms; removing it takes the line away
    await page.check('[data-by-add=COMMISSION]'); const r4 = await receipt(page);
    await setNum(page, 'rooms', 320); const r4b = await receipt(page); await page.uncheck('[data-by-add=COMMISSION]'); const r4c = await receipt(page);
    const line = (r, id) => Number((r.lines.find((x) => x.startsWith(id + ':')) || ':0').split(':')[1]);
    ok(`BY-${tag}-04`, 'a per-room product follows the room count (310 then 320 rooms × $12.99 × 12) at its v1.5 list price, and unticking it removes the line', line(r4, 'COMMISSION') === 310 * 1299 * 12 && line(r4b, 'COMMISSION') === 320 * 1299 * 12 && !r4c.lines.some((x) => x.startsWith('COMMISSION')) && /add=COMMISSION/.test(r4.hash), JSON.stringify([line(r4, 'COMMISSION'), line(r4b, 'COMMISSION'), r4c.lines.length]));
    // 5. the 25-room step, the large-room ceiling and the one-room floor
    await setNum(page, 'rooms', 24); await setNum(page, 'large', 0); const a24 = await receipt(page); await setNum(page, 'rooms', 25); const a25 = await receipt(page);
    await setNum(page, 'rooms', 27); const smallShown = await page.isVisible('[data-by-small]'); await page.check('[data-by-small]'); const g27 = await receipt(page); await page.uncheck('[data-by-small]'); const n27 = await receipt(page);
    await setNum(page, 'rooms', 45); const a45 = await receipt(page); const smallAt45 = await page.isVisible('[data-by-small]'); await setNum(page, 'rooms', 48); const smallAt48 = await page.isVisible('[data-by-small]'); await setNum(page, 'rooms', 25);
    await setNum(page, 'large', 40); await page.locator('[data-by="large"]').blur(); await page.waitForTimeout(50); const big = await page.inputValue('[data-by="large"]'); const capped = await receipt(page);
    await setNum(page, 'rooms', 0); await page.locator('[data-by="rooms"]').blur(); await page.waitForTimeout(50); const floor = await receipt(page); const floorShown = await page.inputValue('[data-by="rooms"]');
    // changed 19 Nov 2026 (founder 03:47): no jump to $15,000 at 25 rooms; $499 a room past 24, the started-small cap, $15,000 from 45 rooms
    ok(`BY-${tag}-05`, 'from 25 rooms the fee grows $499 a room ($4,999.00, then $5,498.00 at 25) and the notes say how and why; at 27 rooms “we started with 24 rooms or fewer” caps it at $6,398.00 instead of $6,496.00; from 45 rooms it is from $15,000.00 (the started-small choice stays offered while it still lowers the fee, to 47 rooms); large rooms cannot exceed the rooms; the estate never drops below one room', a24.lines[0] === 'PLATFORM-20-24:499900' && a25.lines[0] === 'PLATFORM-GROWTH:549800' && /From 25 rooms the platform fee grows \$499\.00 a year/.test(a25.notes) && /told before your fee changes/.test(a25.notes) && smallShown && g27.lines[0] === 'PLATFORM-GROWTH-BAND:639800' && n27.lines[0] === 'PLATFORM-GROWTH:649600' && a45.lines[0] === 'PLATFORM-ENTERPRISE:1500000' && /starting figure/.test(a45.notes) && smallAt45 && !smallAt48 && big === '25' && same(capped, C.estimate({ standardRooms: 0, largeRooms: 25, users: 200, hardware: { nano: 3, edge: 2, pulse: 2 } })) && /PLATFORM-1-9/.test(floor.lines[0]) && floorShown === '1', JSON.stringify({ a24: a24.lines[0], a25: a25.lines[0], g27: g27.lines[0], n27: n27.lines[0], a45: a45.lines[0], smallShown, smallAt45, smallAt48, big, floor: floor.lines[0], floorShown }));
    // 5b. the one per-device price: Search Party at $0.45 a device a month ($49.99 minimum), and the cost per device when devices are given
    await setNum(page, 'rooms', 50); await setNum(page, 'large', 10); await setNum(page, 'devices', 600); await page.check('[data-by-add=SEARCH]'); const d6 = await receipt(page); const perDev = await page.textContent('[data-k=per-device]').catch(() => null);
    const e6 = C.estimate({ standardRooms: 40, largeRooms: 10, users: 200, devices: 600, hardware: { nano: 3, edge: 2, pulse: 2 }, addOns: [{ sku: 'SEARCH', quantity: 600 }] });
    await setNum(page, 'devices', 20); const d20 = await receipt(page); await page.uncheck('[data-by-add=SEARCH]'); await setNum(page, 'devices', 0);
    ok(`BY-${tag}-05b`, 'per device: with 600 devices Search Party is 600 × $0.45 a month ($3,240.00 a year) and the receipt shows the cost per device per year; with 20 devices the $49.99 minimum replaces the per-device charge', same(d6, e6) && d6.lines.includes('SEARCH:324000') && perDev === C.usd(e6.perDeviceAnnualCents) && /devices=600/.test(d6.hash) && d20.lines.includes('SEARCH-MIN:59988') && !d20.lines.some((l) => l.startsWith('SEARCH:')), JSON.stringify({ d6: d6.lines, perDev, d20: d20.lines }));
    // 6. the estate travels: open the address in a new page, and the copied summary carries the totals and a link back
    const url = page.url(); const p2 = await ctx.newPage(); await p2.goto(url, { waitUntil: 'load' }); await p2.waitForTimeout(300); const rr = await receipt(p2); const mine = await receipt(page); await p2.close();
    await page.click('[data-by-copy]'); const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    ok(`BY-${tag}-06`, 'an estimate can be shared: the address reopens the same estate, and “Copy this estimate” puts every line, the totals, what is not included and the link on the clipboard', rr.annual === mine.annual && rr.lines.join() === mine.lines.join() && clip.includes(mine.annual) && clip.includes(mine.first) && /Not included: Implementation/.test(clip) && clip.includes('#build?rooms=') && !/@|name=|email/i.test(new URL(url).hash), JSON.stringify({ a: rr.annual, b: mine.annual, clip: clip.slice(0, 120) }));
    // 7. the way on: the enquiry, with its own source, and the demonstration, opened as the page names, with the way back
    const act = await page.evaluate(() => { const a = document.querySelector('[data-build] a[data-enquiry]'); const d = document.querySelector('[data-build] a[data-launch]'); return { s: a?.dataset.enquiry, href: a?.getAttribute('href'), target: a?.target, rel: a?.rel, name: a?.textContent, disc: document.getElementById(a?.getAttribute('aria-describedby') || '')?.textContent || '', demo: d?.getAttribute('href'), demoName: d?.textContent }; });
    ok(`BY-${tag}-07`, 'the next step is one click: “Request this estimate” opens the hosted form in a new tab with source=website-pricing and the disclosure; “See it in the demonstration” opens the Pro launch with the way back to /pricing#build', act.s === 'website-pricing' && act.href === 'https://tally.so/r/VpG0Vy?source=website-pricing' && act.target === '_blank' && /noopener/.test(act.rel) && /new tab/.test(act.name) && /tally\.so/.test(act.disc) && /li=product-pro/.test(act.demo || '') && /back=%2Fpricing%23build/.test(act.demo || ''), JSON.stringify(act));
    // 8. layout: no sideways scroll, 44 px targets; on a phone the year's total stays in sight
    const geo = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, small: Array.from(document.querySelectorAll('[data-build] button, [data-build] .btn, [data-build] input[type=number], .by__add')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.className || e.tagName}:${Math.round(e.getBoundingClientRect().height)}`), text: Array.from(document.querySelectorAll('[data-build] p, [data-build] li, [data-build] small, [data-build] dt')).filter((e) => e.textContent.trim().length > 30 && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => `${e.className || e.tagName}:${getComputedStyle(e).fontSize}:${e.textContent.slice(0, 30)}`) }));
    let mini = { shown: true, same: true };
    if (tag === 'phone') { await page.locator('[data-by-add=APEX]').scrollIntoViewIfNeeded(); mini = await page.evaluate(() => { const m = document.querySelector('[data-by-mini]'); const r = m.getBoundingClientRect(); return { shown: getComputedStyle(m).display !== 'none' && r.top >= 0 && r.bottom <= innerHeight, same: m.querySelector('b').textContent === document.querySelector('[data-total=annual]').textContent }; }); }
    else mini = await page.evaluate(() => ({ shown: getComputedStyle(document.querySelector('[data-by-mini]')).display === 'none', same: true }));
    ok(`BY-${tag}-08`, tag === 'phone' ? 'on a phone: no sideways scroll, every control 44 px or more, and the year’s total stays on screen while the options are changed' : 'on a desktop: no sideways scroll, every control 44 px or more, the receipt beside the controls (no extra bar)', geo.over <= 0 && !geo.small.length && !geo.text.length && mini.shown && mini.same, JSON.stringify({ geo, mini }));
    ok(`BY-${tag}-09`, 'no console error (CSP intact), nothing requested off the site', !errs.length && !ext.length, [...errs, ...ext].join(' | '));
    await ctx.close();
  }
  // 10. the script: its own file on /pricing only, within its budget; it sends nothing, stores nothing; nothing internal in it
  { const m = JSON.parse(fs.readFileSync(path.join(dist, 'BUILD_MANIFEST.json'), 'utf8')).files; const js = fs.readFileSync(path.join(dist, 'build.js'), 'utf8');
    const pages = ['index.html', 'pilots/index.html', 'fieldlink/index.html', 'pricing/catalogue/index.html'].filter((f) => /build\.js/.test(fs.readFileSync(path.join(dist, f), 'utf8')));
    ok('BY-10', 'build.js is its own file (≤ 32 KB) loaded on /pricing only; it makes no network or storage call and carries no cost, margin or supplier figure', m['build.js'].bytes <= 32768 && /build\.js/.test(fs.readFileSync(path.join(dist, 'pricing/index.html'), 'utf8')) && !pages.length && !/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|document\.cookie/.test(js) && !/\b(BOM|COGS|gross margin|gross profit|landed (hardware )?cost|unit economics)\b|\$82\b|\$485\b|\$181\b/i.test(js)   /* the same words and figures as FL-10 ('supplier' alone is a product's scope text: Procurement's "supplier governance") */, JSON.stringify({ bytes: m['build.js'].bytes, pages })); }
  // 11. the catalogue moved to price book 2: its three parts first, the replaced v1.5 lines named and struck, never orderable
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme }); const page = await ctx.newPage();
    await page.goto(base + '/pricing/catalogue', { waitUntil: 'load' });
    const c = await page.evaluate(() => ({ rates: Array.from(document.querySelectorAll('#book2 [data-rate]')).map((x) => `${x.dataset.rate}:${x.querySelector('.price b').textContent}`), bands: Array.from(document.querySelectorAll('#book2 [data-band] td')).map((x) => x.textContent), replaced: Array.from(document.querySelectorAll('[data-replaced]')).map((x) => x.dataset.replaced), pro: document.querySelector('[data-pilot=PILOT-PRO-PLUS] .price b')?.textContent }));
    ok('BY-11', 'the full price list leads with price book 2 (user $9.99; rooms $39.99 and $74.99; platform $2,499 / $3,499 / $4,999, then $499 a room past 24, from $15,000 at 45 rooms; FieldLink proposed), lists the four replaced v1.5 lines struck through, and shows $19.99 only as the proposed Pro pilot', c.rates.join() === 'ROOM-STD:$39.99,ROOM-LRG:$74.99,USER:$9.99,FIELDLINK-NANO:$249.00,FIELDLINK-EDGE:$1,499.00,FIELDLINK-PULSE:$499.00' && c.bands.join() === '$2,499.00,$3,499.00,$4,999.00,$4,999.00 + $499.00 for each room past 24,from $15,000.00' && c.replaced.join() === 'PRO-ROOM,CORE-STARTER,CORE-ENTERPRISE,SEAT-ENTERPRISE' && c.pro === '$19.99', JSON.stringify(c));
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
