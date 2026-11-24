#!/usr/bin/env node
// FieldLink on the public site (founder directive 18 Nov 2026 17:25), served by the site's own server from the built dist:
// - the page answers "Do I need FieldLink?" with "No", and says on its first screen that it is a concept;
// - every picture is labelled a concept render; the three proposed prices are exactly the founder's ($249, $1,499, $499) and are
//   labelled proposed and illustrative;
// - no cost-of-goods, margin or supplier figure from the private dossier appears anywhere on the site;
// - every specification value carries its dossier class (V, C or T);
// - "View specifications" opens that device's specifications; the comparison is a real table;
// - the products and about pages link to it, and the sitemap lists it;
// - phone and desktop: no sideways scroll, readable text, 44 px targets; no console error, CSP intact, nothing off-origin;
// - the concept enclosures turn (17:25 §10, Version D), envelope only, with or without the script;
// - the master specification and engineering design package (founder 18 Nov 19:39) is on the page as readable text: its release and
//   status, the V/C/T key, its technical contents, the checks anyone can repeat, the next decision, and its own enquiry source.
// Run it in both schemes: PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/website-fieldlink.test.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
import { evidencePath } from '../lib/evidence.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const scheme = process.env.PW_COLOR_SCHEME || 'light';
const dist = path.join(repo, 'apps/website/dist');
const PORT = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
let failed = 0; const results = [];
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ` — ${String(detail).slice(0, 300)}`}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`; const browser = await chromium.launch();
const watch = (page, errs, ext) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) ext.push(r.url()); }); };
try {
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext);
    await page.goto(base + '/fieldlink', { waitUntil: 'load' });
    const first = await page.evaluate(() => { const vh = innerHeight; const vis = (e) => { const r = e.getBoundingClientRect(); return r.top < vh * 1.6 && r.bottom > 0; }; return { h1: document.querySelector('h1')?.textContent, status: vis(document.querySelector('[data-fl-status]')) && /Concept reference design/.test(document.querySelector('[data-fl-status]').textContent), cap: document.querySelector('.fl-hero__fig figcaption')?.textContent || '' }; });
    ok(`FL-${tag}-01`, 'the page opens on FieldLink, says at once that it is a concept, and the render is captioned as not a photograph', first.h1 === 'FieldLink' && first.status && /not a photograph of manufactured hardware/.test(first.cap), JSON.stringify(first));
    const ans = await page.textContent('[data-fl-answer]');
    ok(`FL-${tag}-02`, '"Do I need FieldLink to use Empathia?" — "No. FieldLink is optional."', /^No\. FieldLink is optional\.$/.test((ans || '').trim()), ans);
    const prices = await page.evaluate(() => [...document.querySelectorAll('[data-fl-device]')].map((c) => ({ id: c.dataset.flDevice, p: c.querySelector('.fl-price b')?.textContent, label: c.querySelector('.fl-price')?.textContent || '', alt: c.querySelector('img')?.alt || '' })));
    ok(`FL-${tag}-03`, 'three devices with the founder’s proposed prices, each labelled proposed and illustrative, each picture a concept render', prices.map((x) => `${x.id}:${x.p}`).join(',') === 'nano:$249,edge:$1,499,pulse:$499' && prices.every((x) => /Proposed price/.test(x.label) && /illustrative/.test(x.label) && /^Concept render of/.test(x.alt)), JSON.stringify(prices));
    for (const sel of ['#nano img', '#edge img', '#pulse img']) await page.locator(sel).scrollIntoViewIfNeeded();   // the cards' pictures load lazily
    await page.waitForTimeout(400); await page.evaluate(() => scrollTo(0, 0));
    const imgs = await page.evaluate(() => Promise.all([...document.querySelectorAll('[data-fieldlink] img')].map(async (i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth, alt: i.alt, status: (await fetch(i.currentSrc || i.src)).status }))));
    ok(`FL-${tag}-04`, 'every picture loads from the site itself and says what it is', imgs.length === 4 && imgs.every((i) => i.alt.length > 20 && i.w > 0 && i.status === 200 && i.src.startsWith(base)), JSON.stringify(imgs.map((i) => [i.src.replace(base, ''), i.w, i.status])));
    await page.click('#nano .btn'); await page.waitForTimeout(300);
    const spec = await page.evaluate(() => { const d = document.getElementById('spec-nano'); const rows = [...(d?.querySelectorAll('.fl-spec__dl > div') || [])]; return { open: d?.open, rows: rows.length, classed: rows.filter((r) => r.querySelector('.fl-cls')).length, top: Math.round(d?.getBoundingClientRect().top ?? 9999) }; });
    ok(`FL-${tag}-05`, '"View specifications" opens Nano’s specifications in place; every value row carries its dossier class (V, C or T)', spec.open && spec.rows >= 10 && spec.classed === spec.rows - 2 && spec.top < h, JSON.stringify(spec));
    const tbl = await page.evaluate(() => { const t = document.querySelector('#compare table'); return t ? { heads: [...t.querySelectorAll('thead th')].map((x) => x.textContent.trim()), rows: t.querySelectorAll('tbody tr').length, price: t.querySelector('tbody tr:last-child')?.textContent } : null; });
    ok(`FL-${tag}-06`, 'the comparison is a real table (selectable text), with the proposed prices in its last row', tbl && tbl.heads.slice(1).join('|') === 'Nano|Edge|Pulse' && tbl.rows === 7 && /\$249.*\$1,499.*\$499/.test(tbl.price || ''), JSON.stringify(tbl));
    const text = await page.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText);
    ok(`FL-${tag}-07`, 'the page says what it does not claim: nothing built, renders not photographs, interfaces proposed, no lifetime platform use with a device', /No FieldLink unit has been built/.test(text) && /not photographs/.test(text) && /proposals, not deployed services/.test(text) && /would not include unrestricted or lifetime use of the platform/.test(text) && /Not one Edge per room/.test(text));
    const geo = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, small: [...document.querySelectorAll('[data-fieldlink] p, [data-fieldlink] li, [data-fieldlink] td, [data-fieldlink] dd, [data-fieldlink] th')].filter((e) => e.textContent.trim().length > 40 && parseFloat(getComputedStyle(e).fontSize) < 14).map((e) => e.textContent.slice(0, 40)), tiny: [...document.querySelectorAll('[data-fieldlink] a.btn, [data-fieldlink] summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 44; }).length }));
    ok(`FL-${tag}-08`, 'no sideways scroll; running text at 14 px or more; every button and specification header at least 44 px tall', geo.over <= 0 && !geo.small.length && geo.tiny === 0, JSON.stringify(geo));
    ok(`FL-${tag}-09`, 'no console error (CSP intact: no inline style), nothing requested off the site', !errs.length && !ext.length, [...errs, ...ext].join(' | '));
    await ctx.close();
  }
  // the private dossier's commercial internals never appear anywhere on the built site
  const files = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(html|js|json|css|xml|txt)$/.test(e.name)) files.push(p); } }; walk(dist);
  // the dossier's own figures (its landed costs, gross profits, margins and scenario revenues) and the words that would carry them
  // Changed 19 Nov 2026: the dossier's unit costs are whole dollars ("$82"); a price the site computes is not one of them. Price book 3's
  // four estates show "$82.00" a device a year for the 150-room campus, which the old pattern read as the Nano's cost. (?![.,]\d) keeps
  // every whole-dollar figure caught and lets a cents price through; every other pattern is unchanged.
  const SECRET = /\b(BOM|COGS|gross margin|gross profit|landed (hardware )?cost|unit economics)\b|\$(82|485|181|167|318)\b(?![.,]\d)|\$1,014\b(?![.,]\d)|67\.1 ?%|67\.6 ?%|63\.7 ?%|\$6,739|\$2,302|\$4,437|\$67,390|\$269,560|\$808,680/i;
  const leak = files.filter((f) => SECRET.test(fs.readFileSync(f, 'utf8')));
  ok('FL-10', 'no bill-of-materials, cost-of-goods, margin or supplier figure appears anywhere on the built site', !leak.length, leak.map((f) => path.relative(dist, f)).join(', '));
  const prov = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/media/fieldlink/PROVENANCE.json'), 'utf8'));
  ok('FL-11', 'every FieldLink image shipped is listed in its provenance file, which says it is an AI-generated concept render', Object.keys(prov.files).every((f) => fs.existsSync(path.join(dist, 'media/fieldlink', f))) && /AI-generated industrial-design concept render/.test(prov.nature) && fs.readdirSync(path.join(dist, 'media/fieldlink')).every((f) => f in prov.files));
  // Turn the concepts (17:25 §10, Version D): the envelope only, at its target dimensions; turned by buttons, keys or a drag; drawn without script too
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme }); const page = await ctx.newPage(); const errs = []; watch(page, errs, []);
    await page.goto(base + '/fieldlink#turn', { waitUntil: 'load' }); await page.waitForTimeout(300);
    const label = () => page.evaluate(() => document.querySelector('[data-turn] svg').getAttribute('aria-label'));
    const a = await label(); await page.click('[data-turn-dev=pulse]'); const b = await label(); const env = await page.textContent('[data-turn-env]');
    await page.locator('[data-turn] svg').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); const c = await label();
    await page.click('[data-turn-act=reset]'); const d = await label();
    const geo = await page.evaluate(() => ({ polys: document.querySelectorAll('[data-turn] polygon').length, small: [...document.querySelectorAll('[data-turn] button')].filter((x) => x.getBoundingClientRect().height < 44).length, over: document.documentElement.scrollWidth - innerWidth, cap: document.querySelector('[data-turn] figcaption').textContent }));
    ok('FL-13', 'the enclosures turn by button, key and reset: the drawing and its description change with them; only the target envelope is drawn, and the caption says it is a concept', /^FieldLink Edge, concept enclosure/.test(a) && /^FieldLink Pulse, concept enclosure, turned \d+ degrees and tilted \d+ degrees$/.test(b) && /86 mm across, 28 mm high/.test(env) && c !== b && d === b.replace(/^FieldLink Pulse/, 'FieldLink Pulse') && geo.polys > 10 && !geo.small && geo.over <= 0 && /not a finished design/.test(geo.cap) && !errs.length, JSON.stringify({ a, b, c, d, env, geo, errs }));
    await ctx.close(); }
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme, javaScriptEnabled: false }); const page = await ctx.newPage();
    await page.goto(base + '/fieldlink', { waitUntil: 'load' });
    const r = await page.evaluate(() => ({ polys: document.querySelectorAll('[data-turn] polygon').length, controls: document.querySelector('[data-turn-controls]')?.hidden }));
    ok('FL-14', 'without the script the Edge concept is still drawn, and no dead controls are offered', r.polys >= 3 && r.controls === true, JSON.stringify(r)); await ctx.close(); }
  // The engineering package (founder 18 Nov 2026 19:39): readable text from the dossier, the technical half only
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme }); const page = await ctx.newPage();
    await page.goto(base + '/fieldlink', { waitUntil: 'load' });
    const hero = await page.evaluate(() => [...document.querySelectorAll('.fl-hero a.btn')].map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    const pk = await page.evaluate(() => { const s = document.getElementById('package'); if (!s) return null; const t = s.innerText; return { t, keys: [...s.querySelectorAll('.fl-pkg__keys .fl-cls')].map((x) => x.textContent), dl: s.querySelectorAll('.fl-pkg__dl > div').length, beforeSpecs: !!(s.compareDocumentPosition(document.getElementById('specs')) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
    ok('FL-15', '"Engineering package" in the hero leads to the package: its release and status, what is not included, the V/C/T key, its technical contents, and that commercial planning is not part of it; it sits before the specifications', hero.some(([n, h]) => n === 'Engineering package' && h === '#package') && pk && pk.dl === 4 && /Rev 0\.9 concept/.test(pk.t) && /Preliminary design intent/.test(pk.t) && /bench test reports/.test(pk.t) && pk.keys.join('') === 'VCT' && /Master engineering specification/.test(pk.t) && /None is a deployed service/.test(pk.t) && /Commercial planning \(costs, margins and forecasts\) is internal and not part of the package/.test(pk.t) && pk.beforeSpecs, JSON.stringify({ hero, pk: pk && { ...pk, t: pk.t.slice(0, 160) } }));
    const checks = await page.evaluate(() => [...document.querySelectorAll('#package .fl-pkg__checks tbody tr')].map((r) => ({ q: r.querySelector('th')?.textContent || '', v: r.querySelector('td')?.textContent || '', c: r.querySelector('.fl-cls')?.textContent || '' })));
    const want = ['2.500 W', '1.701 W (0.799 W headroom)', '23.100 W (2.400 W headroom)', '2.430 W (2.570 W headroom)', '96.0 MB a day', '14.58 ms'];
    ok('FL-16', 'the checks anyone can repeat are a real table: the dossier’s independently checked values, each classed V or C, none commercial', checks.length === 6 && checks.every((r, i) => r.v === want[i] && /^[VC]$/.test(r.c) && r.q.length > 10), JSON.stringify(checks));
    const req = await page.evaluate(() => { const a = document.querySelector('#package a[data-enquiry]'); return a && { s: a.dataset.enquiry, href: a.getAttribute('href'), target: a.target, rel: a.rel, name: a.textContent, disc: document.getElementById(a.getAttribute('aria-describedby') || '')?.textContent || '' }; });
    ok('FL-17', 'the package request opens the hosted form in a new tab with its own source (website-fieldlink), says so, and carries the disclosure; the next decision is named beside it', req && req.s === 'website-fieldlink' && req.href === 'https://tally.so/r/VpG0Vy?source=website-fieldlink' && req.target === '_blank' && /noopener/.test(req.rel) && /new tab/.test(req.name) && /tally\.so/.test(req.disc) && /Edge developer-edition feasibility prototype/.test(pk?.t || ''), JSON.stringify(req));
    await ctx.close(); }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme }); const page = await ctx.newPage();
  await page.goto(base + '/products', { waitUntil: 'load' }); const p1 = await page.locator('main a[href="/fieldlink"]').count();
  await page.goto(base + '/about', { waitUntil: 'load' }); const p2 = await page.locator('main a[href="/fieldlink"]').count();
  await page.goto(base + '/platform', { waitUntil: 'load' }); const p3 = await page.locator('footer a[href="/fieldlink"]').count();
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  ok('FL-12', 'Products and About link to FieldLink, the footer carries it (outside the budget-capped home page), the sitemap lists it', p1 >= 1 && p2 >= 1 && p3 === 1 && /<loc>[^<]*\/fieldlink<\/loc>/.test(sitemap), JSON.stringify({ p1, p2, p3 }));
  await ctx.close();
} finally {
  await browser.close(); srv.kill();
  const out = evidencePath(`website-fieldlink${scheme === 'dark' ? '-dark' : ''}`); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'RESULTS.json'), JSON.stringify({ suite: 'website-fieldlink', scheme, at: new Date().toISOString(), results }, null, 1));
  console.log(`\n${results.length - failed} passed, ${failed} failed (${scheme})`); process.exit(failed ? 1 : 0);
}
