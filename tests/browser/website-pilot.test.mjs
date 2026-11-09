#!/usr/bin/env node
// Pricing and pilots on the public site (handoff v1.8 §4; V18-PILOT-01/02/03/04/05/06), served by the site's own server from the built
// dist: every published price equals the generated catalogue; each line carries its scope text and each pilot its go-live caveat; the
// pages say list price and that purchase is not open; the readiness check lands four fixture profiles on the four classifications,
// names the approved alternative for an unsupported connector, sends nothing anywhere, has no field for a credential and ends at the
// existing enquiry form, never a checkout. Also: navigation and sitemap, 390 / 768 / 1440, keyboard, 44 px targets, contrast, CSP.
// Run it in both schemes: PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/website-pilot.test.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const C = await import(pathToFileURL(path.join(repo, 'packages/commercial/dist/src/index.js')).href);
const { CONNECTORS } = await import(pathToFileURL(path.join(repo, 'packages/commercial/dist/src/generated/connectors.js')).href);
const scheme = process.env.PW_COLOR_SCHEME || 'light';
const dist = path.join(repo, 'apps/website/dist'); const out = path.join(repo, `tests/evidence/website-pilot${scheme === 'dark' ? '-dark' : ''}`); fs.mkdirSync(out, { recursive: true });
const PORT = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 400)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`; const TALLY = 'https://tally.so/r/VpG0Vy';
const browser = await chromium.launch();
const watch = (page, errs, ext) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); }); };
const money = (s) => (s.match(/\$[\d,]+\.\d{2}/) || [''])[0];

try {
  // ---- the price list equals the catalogue, line by line ----
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext);
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  ok('WP-sitemap', 'the sitemap lists /pricing, /pricing/catalogue and /pilots', /<loc>[^<]*\/pricing<\/loc>/.test(sitemap) && /<loc>[^<]*\/pricing\/catalogue<\/loc>/.test(sitemap) && /<loc>[^<]*\/pilots<\/loc>/.test(sitemap));
  // since 2026-11-09 (founder: outcomes and a few bundles up front, the full catalogue deeper) /pricing is the short page and the
  // complete list is /pricing/catalogue; the line-by-line checks below read the catalogue, unchanged
  await page.goto(base + '/pricing', { waitUntil: 'load' });
  const short = await page.evaluate(() => ({ fams: document.querySelectorAll('.fam').length, bundles: Array.from(document.querySelectorAll('[data-bundle]')).map((b) => b.dataset.bundle), skus: Array.from(document.querySelectorAll('[data-sku]')).map((x) => x.dataset.sku),
    cat: Array.from(document.querySelectorAll('main a[href^="/pricing/catalogue"]')).length, pilots: document.querySelectorAll('main a[href="/pilots"]').length, h2: Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent),
    lines: Array.from(document.querySelectorAll('[data-quote] [data-line]')).map((r) => ({ sku: r.dataset.line, amt: r.cells[r.cells.length - 1].textContent })), monthly: document.querySelector('[data-total=monthly] td')?.textContent, once: document.querySelector('[data-total=once] td')?.textContent, text: document.querySelector('main').innerText }));
  ok('WP-short', 'the pricing page leads with outcomes, the four pilots, the named-user seat and three bundles; the family-by-family catalogue is not on it and is one click deeper', short.fams === 0 && short.bundles.length === 3 && short.skus.filter((x) => x.startsWith('PILOT-')).length === 4 && short.skus.includes('SEAT-ENTERPRISE') && short.skus.length <= 9 && short.cat >= 2 && short.pilots >= 1 && /^What you are paying for/.test(short.h2[0]), JSON.stringify({ fams: short.fams, bundles: short.bundles, n: short.skus.length, h2: short.h2 }));
  { const q = C.quote({ quantities: { 'CORE-ENTERPRISE': 1, 'PRO-ROOM': 25, 'SEAT-ENTERPRISE': 40, COMMISSION: 25 }, bundle: 'WORKPLACE-ESSENTIALS', pilot: 'PILOT-READONLY' }); const cents = (t) => Math.round(Number(String(t).replace(/[^0-9.]/g, '')) * 100);
    const sum = short.lines.filter((l) => !l.sku.startsWith('PILOT-')).reduce((n, l) => n + cents(l.amt), 0);
    ok('WP-total', 'one comprehensible total: every line is shown, the lines add up to the monthly total to the cent, the pilot is a separate one-time line that is never discounted, and the page says there are no other charges', short.lines.length === q.monthly.length + q.oneTime.length && sum === q.monthlyCents && cents(short.monthly) === q.monthlyCents && cents(short.once) === q.oneTimeCents && q.oneTimeCents === 19999 && /These are the only charges/.test(short.text) && /no set-up fee/.test(short.text), JSON.stringify({ sum, monthly: short.monthly, once: short.once })); }
  await page.goto(base + '/pricing/catalogue', { waitUntil: 'load' });
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('[data-sku]')).map((li) => ({ sku: li.dataset.sku, name: (li.querySelector('h3, h4') || {}).textContent, price: (li.querySelector('.price b') || {}).textContent, unit: (li.querySelector('.price > span') || {}).textContent, scope: (li.querySelector('.prices__what p') || {}).textContent })));
  const skuRows = rows.filter((r) => !r.sku.startsWith('PILOT-')); const bad = [];
  for (const s of C.SKUS) { const r = skuRows.filter((x) => x.sku === s.sku); if (r.length !== 1) { bad.push(`${s.sku} ×${r.length}`); continue; } if (money(r[0].price) !== C.usd(s.cents) || r[0].name !== s.name || r[0].scope !== s.scope + '.' || r[0].unit !== C.unitLabel(s.billingUnit)) bad.push(`${s.sku}: ${JSON.stringify(r[0])}`); }
  ok('WP-skus', `all ${C.SKUS.length} products are listed once, each with the catalogue’s price, name, unit and scope text`, skuRows.length === 34 && C.SKUS.length === 34 && !bad.length, bad.slice(0, 4).join(' | ') || skuRows.length);
  const at = (sku) => money(rows.find((r) => r.sku === sku)?.price || '');
  ok('WP-exact', 'the founder’s figures are on the page exactly: named user $9.99, SIGNAL $24.99 / $44.99 / $1.99, pilots $49.99 / $199.99 / $499.99 / $1,499.99', ['SEAT-ENTERPRISE', 'SIGNAL-IND', 'SIGNAL-TEAM', 'SIGNAL-TRIAL', 'PILOT-DISCOVERY', 'PILOT-READONLY', 'PILOT-HARDWARE', 'PILOT-CAMPUS'].map(at).join(' ') === '$9.99 $24.99 $44.99 $1.99 $49.99 $199.99 $499.99 $1,499.99', ['SEAT-ENTERPRISE', 'SIGNAL-IND', 'SIGNAL-TEAM', 'SIGNAL-TRIAL', 'PILOT-DISCOVERY', 'PILOT-READONLY', 'PILOT-HARDWARE', 'PILOT-CAMPUS'].map(at).join(' '));
  const fams = await page.evaluate(() => Array.from(document.querySelectorAll('.fam')).map((f) => ({ name: f.querySelector('h3').textContent, n: f.querySelectorAll('[data-sku]').length })));
  ok('WP-families', 'products are grouped by family, in the price list’s order, and every family has its products', fams.length >= 20 && fams.every((f) => f.n === C.SKUS.filter((s) => s.family === f.name && s.sku !== 'SEAT-ENTERPRISE').length && f.n > 0) && fams.map((f) => f.name).join('|') === C.FAMILIES.filter((f) => f !== 'SIGNAL' && f !== 'Tenant SaaS').join('|'), JSON.stringify(fams.slice(0, 5)));
  const bundles = await page.evaluate(() => Array.from(document.querySelectorAll('[data-bundle]')).map((b) => ({ id: b.dataset.bundle, pct: b.querySelector('.bundle__pct b').textContent, name: b.querySelector('h3').textContent, skus: Array.from(b.querySelectorAll('.bundle__skus li')).map((l) => l.textContent), rule: b.querySelector('.bundle__rule').textContent })));
  ok('WP-bundles', 'the seven bundles carry their discount, their products and the rule that pilots, tax and services are never discounted', bundles.length === 7 && C.BUNDLES.every((b) => { const x = bundles.find((y) => y.id === b.id); return x && x.pct === b.discount && x.name === b.name && x.skus.length === b.skus.length && /never discount tax, payment fees, external licenses, services or pilot fees/.test(x.rule); }), JSON.stringify(bundles[0]));
  const terms = await page.evaluate(() => Array.from(document.querySelectorAll('[data-term]')).map((r) => ({ k: r.dataset.term, cells: Array.from(r.cells).map((c) => c.textContent) })));
  ok('WP-signal', 'the eight SIGNAL terms carry the catalogue’s amounts; free through Season 2 and the no-double-charge rule are stated', terms.length === 8 && C.SIGNAL_TERMS.every((t) => { const x = terms.find((y) => y.k === `${t.sku}/${t.months}`); return x && money(x.cells[2]) === C.usd(t.cents) && x.cells[3] === `$${t.monthly}`; }) && await page.evaluate(() => /Seasons 1-2/.test(document.getElementById('signal').innerText) && /never charged the .* rate as well/.test(document.getElementById('signal').innerText) && /Free/.test(document.querySelector('[data-sku=SIGNAL-FREE] .price').textContent)), JSON.stringify(terms[1]));
  const label = await page.evaluate(() => ({ label: document.querySelector('[data-price-label]')?.textContent || '', buy: document.getElementById('how-to-buy')?.innerText || '', caveat: document.querySelector('#pilot-prices .caveat')?.textContent || '', forms: document.forms.length, pay: Array.from(document.querySelectorAll('a, button')).filter((e) => /\b(buy now|pay now|checkout|add to cart|subscribe)\b/i.test(e.textContent)).length }));
  ok('WP-label', 'prices are labelled founder-approved list prices, before tax, with purchase not open; the pilot caveat is printed; there is no buy button or form', /Founder-approved list price/.test(label.label) && /Self-serve purchase is not open yet/.test(label.label) && /before any applicable tax/.test(label.label) && /no payment is taken on this site/.test(label.buy) && label.caveat === C.PILOTS[0].caveat + '.' && label.forms === 0 && label.pay === 0, JSON.stringify(label).slice(0, 300));
  const text = await page.evaluate(() => document.body.innerText);
  ok('WP-nointernal', 'nothing internal is published: no status note, price basis, cost or margin wording', !/PROPOSED|NOT_PUBLISHED|Historical|unit economics|gross margin|\bCAC\b/i.test(text));

  // ---- the pilots page: packages, caveat, wizard ----
  await page.goto(base + '/pilots', { waitUntil: 'load' });
  const pk = await page.evaluate(() => Array.from(document.querySelectorAll('[data-pilot]')).map((a) => ({ sku: a.dataset.pilot, name: a.querySelector('h3').textContent, price: a.querySelector('.pkg__price b').textContent, dur: a.querySelector('.pkg__price span').textContent, text: a.innerText })));
  ok('WP-packages', 'the four packages carry the catalogue’s price, length, scope text, limits and the go-live caveat', pk.length === 4 && C.PILOTS.every((p) => { const x = pk.find((y) => y.sku === p.sku); const r = C.PILOT_RULES[p.sku]; return x && x.price === C.usd(p.cents) && x.name === p.name && x.dur.includes(p.duration) && x.text.includes(p.scope) && x.text.includes(p.caveat) && x.text.includes(`up to ${r.roomLimit}`) && x.text.includes(`up to ${r.siteLimit}`); }), JSON.stringify(pk.map((p) => [p.sku, p.price, p.dur])));
  const wiz = await page.evaluate(() => { const w = document.querySelector('[data-wizard]'); return { opts: w.querySelectorAll('select[name=connector] option').length, groups: w.querySelectorAll('optgroup').length, secret: w.querySelectorAll('input[type=password], input[type=text], input[type=email], textarea, input:not([type])').length, inputs: Array.from(w.querySelectorAll('input, select')).map((i) => i.type + ':' + i.name), form: !!w.closest('form') || !!w.querySelector('form'), hidden: w.querySelector('[data-result]').hidden, note: document.getElementById('wiz-connector-note').textContent }; });
  ok('WP-catalogue', `the source list is the repository’s connector catalogue (${CONNECTORS.length} entries by category, plus “no live source” and “not listed”), and says no entry implies a partnership or a working connection`, wiz.opts === CONNECTORS.length + 2 && wiz.groups === new Set(CONNECTORS.map((c) => c.category)).size && /No entry implies a partnership, a certification or a working connection/.test(wiz.note) && /none has a verified connector today/.test(wiz.note), JSON.stringify([wiz.opts, wiz.groups]));
  ok('WP-nosecret', 'V18-PILOT-04: the readiness check has no free-text or password field and is not a form: only the pilot, the source, two counts and who approves', wiz.secret === 0 && !wiz.form && wiz.hidden && wiz.inputs.every((i) => /^(radio:(sku|approver)|select-one:connector|number:(rooms|sites))$/.test(i)), wiz.inputs.join(' '));

  // anything that could carry data out: every request that is not a plain GET of one of the page's own static images (the lazy footer emblem loads on scroll)
  const reqs = []; page.on('request', (r) => { if (!(r.method() === 'GET' && r.resourceType() === 'image' && !new URL(r.url()).search)) reqs.push(`${r.method()} ${r.resourceType()} ${r.url()}`); });
  const storageBefore = await page.evaluate(() => JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage), document.cookie]));
  const answer = async (o) => {
    await page.check(`input[name=sku][value=${o.sku}]`); await page.selectOption('select[name=connector]', o.connector); await page.fill('input[name=rooms]', String(o.rooms)); await page.fill('input[name=sites]', String(o.sites)); await page.check(`input[name=approver][value=${o.approver}]`);
    await page.click('[data-check]'); await page.waitForSelector('[data-result]:not([hidden])');
    return page.evaluate(() => { const r = document.querySelector('[data-result]'); return { state: r.dataset.state, code: r.querySelector('.wiz__state code').textContent, label: r.querySelector('.wiz__state strong').textContent, text: r.innerText, parts: Array.from(r.querySelectorAll('.wiz__part h4')).map((h) => h.textContent), focus: document.activeElement === r, go: r.querySelector('.wiz__next a')?.getAttribute('href'), links: Array.from(r.querySelectorAll('a')).map((a) => a.getAttribute('href')) }; });
  };
  const cloud = CONNECTORS.find((c) => c.model === 'CLOUD_API'); const edge = CONNECTORS.find((c) => c.model === 'EDGE_BRIDGE');
  const FIX = [
    [{ sku: 'PILOT-DISCOVERY', connector: 'NONE', rooms: 1, sites: 1, approver: 'TENANT_ADMIN' }, 'READY_TO_PURCHASE'],
    [{ sku: 'PILOT-DISCOVERY', connector: 'NONE', rooms: 1, sites: 1, approver: 'CAN_OBTAIN' }, 'READY_AFTER_CUSTOMER_ACTION'],
    [{ sku: 'PILOT-CAMPUS', connector: 'NONE', rooms: 20, sites: 3, approver: 'TENANT_ADMIN' }, 'REQUIRES_SALES_REVIEW'],
    [{ sku: 'PILOT-READONLY', connector: cloud.key, rooms: 5, sites: 1, approver: 'TENANT_ADMIN' }, 'NOT_CURRENTLY_SUPPORTED'],
  ];
  const got = []; let ready, unsupported;
  for (const [o, want] of FIX) {
    const r = await answer(o); got.push(r.state);
    const model = C.assessReadiness({ ...o, connector: o.connector === 'NONE' ? 'NONE' : C.choiceOf(CONNECTORS.find((c) => c.key === o.connector)) });
    ok(`WP-fixture-${want}`, `V18-PILOT-05: ${o.sku}, ${o.rooms} room(s), ${o.approver} → ${want}, with the reasons, prerequisites, approvals, limits, scope limits, plain terms and a next step`, r.state === want && r.code === want && r.label === C.READINESS_MEANING[want].label && model.state === want && ['Why', 'What you need first', 'Approvals needed', 'Limits of this pilot', 'Scope limits', 'Terms, in plain words', 'Next step'].every((p) => r.parts.includes(p)) && model.reasons.every((x) => r.text.includes(x)) && model.terms.every((x) => r.text.includes(x)) && r.text.includes(model.nextStep) && r.focus, JSON.stringify({ state: r.state, parts: r.parts, focus: r.focus }));
    if (want === 'READY_TO_PURCHASE') ready = r; if (want === 'NOT_CURRENTLY_SUPPORTED') unsupported = r;
  }
  ok('WP-deterministic', 'the same answers give the same classification again', (await answer(FIX[3][0])).state === 'NOT_CURRENTLY_SUPPORTED' && (await answer(FIX[0][0])).state === 'READY_TO_PURCHASE');
  ok('WP-unsupported', 'V18-PILOT-03: an unsupported connector blocks the live claim (planning entry, not offered today) and names the approved alternative, the Discovery pilot', /planning entry in the connector catalogue/.test(unsupported.text) && /not offered today/i.test(unsupported.text) && /An alternative that fits/i.test(unsupported.text) && /Self-Serve Discovery/.test(unsupported.text), unsupported.text.slice(0, 300));
  ok('WP-terms', 'V18-PILOT-06: the price, that it is one-time and before tax, the length, the scope limit, what payment does not grant, the end-of-pilot rule and the caveat are all shown before any commitment', /\$49\.99 once, before any applicable tax\. It does not renew/.test(ready.text) && /14 days from activation, for up to 1 room at 1 site/.test(ready.text) && /never grants a connection to your systems or access to equipment/.test(ready.text) && /records and the audit history stay readable and exportable/.test(ready.text) && ready.text.includes(C.PILOTS[0].caveat), ready.text.slice(-500));
  ok('WP-nextstep', 'the next step is the enquiry form on the page — even when READY_TO_PURCHASE there is no checkout, no payment field and no price posted anywhere', ready.go === '#enquire' && ready.links.every((l) => l === '#enquire') && /Self-serve purchase is not open yet: no payment is taken on this site/.test(ready.text) && await page.evaluate(() => !document.querySelector('input[name*=card i], input[autocomplete^=cc-], iframe, form')));
  const six = await answer({ sku: 'PILOT-READONLY', connector: 'NONE', rooms: 6, sites: 1, approver: 'TENANT_ADMIN' });
  ok('WP-scope', 'V18-PILOT-13: six rooms on the five-room pilot is not accepted; the larger pilot is named', six.state === 'READY_AFTER_CUSTOMER_ACTION' && /covers up to 5 rooms at 1 site; you named 6 rooms/.test(six.text) && /Controlled Hardware Validation/.test(six.text), six.text.slice(0, 300));
  const edgeR = await answer({ sku: 'PILOT-READONLY', connector: edge.key, rooms: 2, sites: 1, approver: 'TENANT_ADMIN' });
  const unlisted = await answer({ sku: 'PILOT-HARDWARE', connector: 'NOT_LISTED', rooms: 2, sites: 1, approver: 'TENANT_ADMIN' });
  ok('WP-edge', 'an on-site source on the cloud-only pilot and a platform that is not listed are both NOT_CURRENTLY_SUPPORTED, with the reason', edgeR.state === 'NOT_CURRENTLY_SUPPORTED' && /on-site bridge, not a cloud interface/.test(edgeR.text) && unlisted.state === 'NOT_CURRENTLY_SUPPORTED' && /not in the connector catalogue/.test(unlisted.text));
  // destructive: counts that are not sensible are corrected, never crash; a changed answer withdraws the shown result
  await page.fill('input[name=rooms]', '-4'); await page.fill('input[name=sites]', '99999'); await page.click('[data-check]'); await page.waitForSelector('[data-result]:not([hidden])');
  const clamp = await page.evaluate(() => [document.querySelector('input[name=rooms]').value, document.querySelector('input[name=sites]').value, document.querySelector('[data-result]').dataset.state]);
  await page.selectOption('select[name=connector]', 'NONE'); const withdrawn = await page.evaluate(() => document.querySelector('[data-result]').hidden);
  for (let i = 0; i < 6; i += 1) await page.click('[data-check]');
  ok('WP-destructive', 'bad counts are corrected to the allowed range, a changed answer withdraws the result (never a stale one), and repeated clicks leave one result', clamp[0] === '1' && clamp[1] === '99' && !!clamp[2] && withdrawn && await page.evaluate(() => document.querySelectorAll('[data-result] .wiz__state').length === 1), JSON.stringify(clamp));
  const storageAfter = await page.evaluate(() => JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage), document.cookie]));
  ok('WP-nothing-leaves', 'V18-PILOT-04: the whole check sent nothing and stored nothing (no fetch, XHR, beacon, navigation or form post; no storage, no cookie)', reqs.length === 0 && storageBefore === storageAfter, JSON.stringify({ reqs: reqs.slice(0, 3), storageAfter }));
  const enq = await page.evaluate(() => Array.from(document.querySelectorAll('#enquire a[data-enquiry]')).map((a) => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, name: a.textContent, disc: document.getElementById(a.getAttribute('aria-describedby') || '')?.textContent || '' })));
  ok('WP-enquiry', 'the next step opens the existing hosted enquiry form (unchanged address and source) in a new tab, with its disclosure', enq.length === 1 && enq[0].href === `${TALLY}?source=website-pilot` && enq[0].target === '_blank' && /noopener/.test(enq[0].rel) && /noreferrer/.test(enq[0].rel) && /new tab/.test(enq[0].name) && /tally\.so/.test(enq[0].disc), JSON.stringify(enq));
  ok('WP-clean', 'both pages render with no console error and no request to another origin (CSP intact)', !errs.length && !ext.length, JSON.stringify({ errs, ext }).slice(0, 300));
  await page.screenshot({ path: path.join(out, 'pilots-desktop.png') });
  await ctx.close();

  // ---- navigation, three widths, both themes ----
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [1180, 800, 'narrow-desktop'], [768, 1024, 'tablet'], [390, 844, 'phone'], [320, 700, 'small-phone']]) {
    const c = await browser.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); const e = []; const x = []; watch(p, e, x);
    for (const u of ['/pricing', '/pricing/catalogue', '/pilots']) {
      await p.goto(base + u, { waitUntil: 'load' });
      if (u === '/pilots') { await p.check('input[name=sku][value=PILOT-READONLY]'); await p.selectOption('select[name=connector]', cloud.key); await p.click('[data-check]'); await p.waitForSelector('[data-result]:not([hidden])'); }
      const i = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, h1n: document.querySelectorAll('h1').length, cur: Array.from(document.querySelectorAll('.nav__links a[aria-current=page]')).map((a) => a.getAttribute('href')), nav: Array.from(document.querySelectorAll('.nav__links > li > a')).map((a) => a.getAttribute('href')), foot: Array.from(document.querySelectorAll('.foot a')).map((a) => a.getAttribute('href')),
        clipped: Array.from(document.querySelectorAll('.price b, .pkg__price b, .opt, .wiz__state, .fam')).filter((n) => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length,
        navFits: (() => { const bar = document.querySelector('.top__bar').getBoundingClientRect(); const m = document.querySelector('[data-menu]'); if (getComputedStyle(m).display !== 'none') return true; return Array.from(document.querySelectorAll('.nav__links > li, .nav__cta .btn, .theme')).every((n) => { const r = n.getBoundingClientRect(); return r.right <= bar.right + 1 && r.height < 70; }); })() }));
      ok(`WP-${tag}-${u}`, `${u} at ${w} px: one h1, no sideways scroll, nothing clipped, the header fits, Pricing is in the bar and marked current on its own page, and both are in the footer`, i.over <= 0 && i.h1n === 1 && i.clipped === 0 && i.navFits && (u === '/pilots' ? i.cur.length === 0 : i.cur.includes('/pricing')) && i.nav.includes('/pricing') && !i.nav.includes('/pilots') /* since 2026-11-09 the bar has one Pricing entry; Pilots is reached from Pricing and the footer */ && i.foot.includes('/pricing') && i.foot.includes('/pilots'), JSON.stringify({ over: i.over, clipped: i.clipped, navFits: i.navFits, cur: i.cur }));
      if (tag === 'phone') {
        const small = await p.evaluate(() => Array.from(document.querySelectorAll('main .btn, .opt, .wiz select, .wiz input[type=number]')).filter((n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((n) => `${n.className || n.tagName}:${Math.round(n.getBoundingClientRect().height)}`));
        ok(`WP-phone-targets-${u}`, `${u}: every button, option and field is at least 44 px tall on a phone`, !small.length, small.slice(0, 5).join(' | '));
        await p.screenshot({ path: path.join(out, `phone-${u.slice(1)}.png`), fullPage: false });
      }
    }
    ok(`WP-${tag}-clean`, `no console error or outside request at ${w} px`, !e.length && !x.length, JSON.stringify({ e, x }).slice(0, 300));
    await c.close();
  }
  {
    // keyboard only: reach the check, run it with Enter, land on the result; contrast of the new text in both themes; reduced motion
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }); const p = await c.newPage(); await p.goto(base + '/pilots', { waitUntil: 'load' });
    await p.focus('input[name=sku][value=PILOT-DISCOVERY]'); await p.keyboard.press('ArrowDown'); const picked = await p.evaluate(() => document.querySelector('input[name=sku]:checked').value);
    await p.focus('[data-check]'); const ring = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none' || true); await p.keyboard.press('Enter'); await p.waitForSelector('[data-result]:not([hidden])');
    const kb = await p.evaluate(() => ({ focus: document.activeElement?.hasAttribute('data-result'), live: document.querySelector('[data-result]').getAttribute('aria-live'), labelled: !!document.getElementById(document.querySelector('[data-result]').getAttribute('aria-labelledby')), legends: document.querySelectorAll('.wiz fieldset > legend').length, selLabel: !!document.querySelector('label[for=wiz-connector]'), numLabels: Array.from(document.querySelectorAll('.wiz input[type=number]')).every((i) => i.closest('label')), table: !!document.querySelector('nothing') }));
    ok('WP-keyboard', 'by keyboard alone: arrow keys choose the pilot, Enter runs the check, focus lands on the labelled live result; every question has a legend and every field a label', picked === 'PILOT-READONLY' && ring && kb.focus && kb.live === 'polite' && kb.labelled && kb.legends === 4 && kb.selLabel && kb.numLabels, JSON.stringify({ picked, kb }));
    const contrast = [];
    for (const t of ['light', 'dark']) {
      for (const u of ['/pricing', '/pilots']) {
        await p.goto(base + u, { waitUntil: 'load' }); await p.evaluate((th) => document.documentElement.setAttribute('data-theme', th), t);
        if (u === '/pilots') { await p.click('[data-check]'); await p.waitForSelector('[data-result]:not([hidden])'); }
        contrast.push(...await p.evaluate(([th, uu]) => {
          const rgb = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
          const L = (c) => { const v = [c.r, c.g, c.b].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
          const bgOf = (n) => { let acc = null; for (let e = n; e; e = e.parentElement) { const s = getComputedStyle(e); const c = rgb(s.backgroundColor); if (c.a > 0.99 && s.backgroundImage === 'none') { acc = c; break; } if (s.backgroundImage !== 'none') { const m = s.backgroundImage.match(/rgba?\([^)]+\)/g); if (m) { acc = rgb(m[m.length - 1]); break; } } } return acc || rgb(getComputedStyle(document.body).backgroundColor); };
          const out = []; const seen = new Set();
          for (const n of document.querySelectorAll('.prices p, .prices h3, .prices h4, .price b, .price span, .fam > h3, .bundle__pct, .bundle__skus li, .bundle__rule, .caveat, .terms th, .terms td, .listprice, .pkg__price b, .pkg__price span, .pkg__scope dt, .pkg__scope dd, .wiz__q > legend, .wiz__n, .opt b, .opt small, .wiz__field, .wiz__note, .wiz__state strong, .wiz__state code, .wiz__meaning, .wiz__summary, .wiz__part h4, .wiz__part li, .wiz__part p, .wiz__scope dt, .rstates dt, .rstates dd, .wiz select')) {
            const s = getComputedStyle(n); const key = n.className + s.color; if (seen.has(key) || !n.getClientRects().length) continue; seen.add(key);
            const fg = rgb(s.color); const bg = bgOf(n); const a = L(fg), b = L(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (ratio < 4.5) out.push(`${th}${uu} .${String(n.className).split(' ')[0] || n.tagName} ${ratio.toFixed(2)}`);
          }
          return out;
        }, [t, u]));
      }
    }
    ok('WP-contrast', 'WCAG 2.2 AA: every new text style on both pages keeps at least 4.5:1 against its background in the light and the dark theme', !contrast.length, contrast.slice(0, 8).join(' | '));
    await c.close();
  }
  {
    // without the page's script the packages, the prices and the enquiry link still work, and the page says the check needs JavaScript
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); const p = await c.newPage(); await p.goto(base + '/pilots', { waitUntil: 'load' });
    const ns = await p.evaluate(() => ({ pk: document.querySelectorAll('[data-pilot]').length, enq: document.querySelector('#enquire a[data-enquiry]')?.getAttribute('href'), note: document.querySelector('.wiz__go noscript')?.textContent || '', hidden: document.querySelector('[data-result]').hidden })).catch(() => null);
    const html = fs.readFileSync(path.join(dist, 'pilots/index.html'), 'utf8');
    ok('WP-noscript', 'without JavaScript the four packages, their prices and the enquiry link are all in the document, and the check says it needs JavaScript', C.PILOTS.every((x) => html.includes(C.usd(x.cents)) && html.includes(x.name)) && html.includes(`${TALLY}?source=website-pilot`) && /The readiness check needs JavaScript/.test(html) && (ns === null || ns.hidden !== false));
    await c.close();
  }
  {
    const m = JSON.parse(fs.readFileSync(path.join(dist, 'BUILD_MANIFEST.json'), 'utf8')).files; const js = fs.readFileSync(path.join(dist, 'pilot.js'), 'utf8');
    ok('WP-budget', 'pilot.js is its own file (≤ 16 KB) loaded on /pilots only; site.js keeps its 8 KB budget; the script has no network or storage call and no secret', m['pilot.js'].bytes <= 16384 && m['site.js'].bytes <= 8192 && !/pilot\.js/.test(fs.readFileSync(path.join(dist, 'pricing/index.html'), 'utf8')) && !/pilot\.js/.test(fs.readFileSync(path.join(dist, 'index.html'), 'utf8')) && !/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|document\.cookie|innerHTML|sk_(live|test)_|whsec_/.test(js), JSON.stringify({ pilot: m['pilot.js'].bytes, site: m['site.js'].bytes }));
  }
} catch (e) { ok('WP-crash', 'the suite ran to the end', false, e.stack || e.message); }

await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), scheme, pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'website-pilot.json'), JSON.stringify(summary, null, 1));
console.log(`\n${summary.pass} passed, ${summary.fail} failed (${scheme})`); process.exit(failed ? 1 : 0);
