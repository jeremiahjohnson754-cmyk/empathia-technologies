#!/usr/bin/env node
// The public site, served by its own server from the built dist: every page answers, has a title and description, renders without
// console errors or outside requests, has no sideways scroll at 390 px, the menu works by keyboard, every internal link resolves, and no
// page makes a claim the owner forbade. Enquiries (no API configured in this build): every entry point opens the owner's hosted Tally
// form in a new tab, with the disclosure beside it; no page carries a form of its own, so nothing can report a false success; the
// privacy notice names the provider; the investor demonstration links to the same form.
//   node tests/browser/website.test.mjs [dist] [evidence-dir]
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const dist = path.resolve(process.argv[2] || path.join(repo, 'apps/website/dist')); const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/website')); fs.mkdirSync(out, { recursive: true });
const PORT = 4397; const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`;
const pages = (fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8').match(/<loc>[^<]*<\/loc>/g) || []).map((l) => l.replace(/<\/?loc>/g, '').replace(/^https?:\/\/[^/]+/, '') || '/');
ok('W-00', 'the sitemap lists the pages', pages.length >= 10, pages.join(' '));
// capabilities that are NOT implemented at this commit (docs/legacy-parity.md): they may appear only as planned or designed, never as present
const NOT_YET = [/short-lived (download )?(url|link)s? (are|is)\b/i, /baseline[s]? (are|is) (immutable|versioned)/i, /no name-based joins/i, /collectors are outbound-only/i, /dispatch preflight (is|are) (in place|enforced)/i, /multi-factor .* (is|are) (in place|enabled)/i];
const FORBIDDEN = [/\b(aon|kraft heinz|stefanini|khc)\b/i, /SOC ?2 (certified|compliant)/i, /ISO ?27001 (certified|compliant)/i, /\b(award|awards)\b/i, /\btestimonial/i, /\bcustomers? (include|such as|like)\b/i, /\b\d+% (reduction|increase|roi)\b/i, /guaranteed/i, /production[- ]ready/i, /\bpartnered with\b/i];
// the owner's hosted enquiry form, from the website's source; the investor demonstration must link to the same one
const urlIn = (f) => (fs.readFileSync(path.join(repo, f), 'utf8').match(/url: '([^']+)'/) || [])[1];
const ENQUIRY_URL = urlIn('apps/website/src/enquiry.ts');
ok('W-enquiry-source', 'the website and the investor demonstration name the same hosted enquiry form', !!ENQUIRY_URL && ENQUIRY_URL === urlIn('apps/demo/src/enquiry.ts') && /^https:\/\/tally\.so\/r\/[A-Za-z0-9]+$/.test(ENQUIRY_URL), `${ENQUIRY_URL} / ${urlIn('apps/demo/src/enquiry.ts')}`);
const ENQUIRY_PAGES = [['/request-demo', ['demo']], ['/pilot-partners', ['pilot', 'partner']], ['/contact', ['contact']], ['/founder', ['investor']], ['/about', ['investor']]];
const browser = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errs = []; const ext = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); });
  const links = new Set();
  for (const p of pages) {
    const r = await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(150);
    const info = await page.evaluate(() => ({ title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '', h1: (document.querySelector('h1') || {}).textContent || '', over: document.documentElement.scrollWidth - document.documentElement.clientWidth, text: document.body.innerText, links: Array.from(document.querySelectorAll('a[href^="/"]')).map((a) => a.getAttribute('href')) }));
    info.links.forEach((l) => links.add(l.split('#')[0]));
    ok(`W-${tag}-${p}`, `${p} answers with a title, a description, one h1 and no sideways scroll`, r.status() === 200 && info.title.length > 8 && info.desc.length > 20 && info.h1.length > 3 && info.over <= 0, JSON.stringify({ status: r.status(), over: info.over, h1: info.h1 }));
    const bad = FORBIDDEN.filter((re) => re.test(info.text)); if (bad.length) ok(`W-claims-${p}`, `${p} makes no forbidden claim`, false, bad.map(String).join(' '));
    const inPlace = await page.evaluate(() => Array.from(document.querySelectorAll('section')).filter((s) => /In place in the product/.test((s.querySelector('h2') || {}).textContent || '')).map((s) => s.innerText).join('\n'));
    const early = NOT_YET.filter((re) => re.test(info.text.replace(/Planned, not yet in place[\s\S]*?(?=\n[A-Z][^\n]{3,}\n)/, ''))); if (early.length || NOT_YET.some((re) => re.test(inPlace))) ok(`W-notyet-${p}`, `${p} does not present an unbuilt capability as present`, false, early.map(String).join(' '));
    if (tag === 'desktop') await page.screenshot({ path: path.join(out, `${tag}-${p.replace(/[^a-z-]/g, '') || 'home'}.png`) });
  }
  ok(`W-${tag}-links`, 'every internal link on the site resolves to a listed page or a section of one', [...links].every((l) => pages.includes(l.replace(/\/$/, '') || '/')), [...links].filter((l) => !pages.includes(l.replace(/\/$/, '') || '/')).join(' '));
  if (tag === 'phone') {
    await page.goto(base + '/'); await page.waitForTimeout(150);
    const before = await page.evaluate(() => getComputedStyle(document.getElementById('nav')).display);
    await page.focus('[data-menu]'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    const after = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('nav')).display, exp: document.querySelector('[data-menu]').getAttribute('aria-expanded') }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(100); const closed = await page.evaluate(() => getComputedStyle(document.getElementById('nav')).display);
    ok('W-phone-menu', 'the phone menu opens by keyboard, reports aria-expanded, and closes on Escape', before === 'none' && after.d !== 'none' && after.exp === 'true' && closed === 'none', JSON.stringify({ before, after, closed }));
    await page.screenshot({ path: path.join(out, 'phone-home.png') });
  }
  // enquiries: the hosted form, opened outside the site; tally.so is stubbed so the click is tested without leaving the test machine
  const formUrl = ENQUIRY_URL; await ctx.route('https://tally.so/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub of the hosted enquiry form</title>' }));
  for (const [p, topics] of ENQUIRY_PAGES) {
    await page.goto(base + p); await page.waitForTimeout(100);
    const e = await page.evaluate(() => ({
      links: Array.from(document.querySelectorAll('a[data-enquiry]')).map((a) => ({ topic: a.dataset.enquiry, href: a.getAttribute('href'), target: a.target, rel: a.rel, name: a.textContent.trim() })),
      notes: Array.from(document.querySelectorAll('[data-enquiry-note]')).map((n) => ({ topic: n.dataset.enquiryNote, text: n.textContent, privacy: !!n.querySelector('a[href="/privacy#enquiries"]') })),
      forms: document.querySelectorAll('form').length, claims: /\b(sent|received|thank you)\b/i.test(document.body.innerText) }));
    const good = e.links.length === topics.length && topics.every((t) => e.links.some((l) => l.topic === t)) && e.links.every((l) => l.href === formUrl && l.target === '_blank' && /\bnoopener\b/.test(l.rel) && /\bnoreferrer\b/.test(l.rel) && /new tab/.test(l.name) && /tally\.so/.test(l.name));
    const disclosed = topics.every((t) => e.notes.some((n) => n.topic === t && /tally\.so/.test(n.text) && /Tally stores it for us in the EU/.test(n.text) && /Empathia Technologies receives your enquiry/.test(n.text) && n.privacy));
    ok(`W-${tag}-enquiry${p.replace(/\//g, '-')}`, `${p}: each entry point opens the hosted form in a new tab (noopener, noreferrer, says so) with the disclosure and the privacy link beside it`, good && disclosed, JSON.stringify(e));
    ok(`W-${tag}-noform${p.replace(/\//g, '-')}`, `${p}: no form of the site's own, and no text that could read as a sent or received message`, e.forms === 0 && !e.claims, JSON.stringify({ forms: e.forms, claims: e.claims }));
  }
  { await page.goto(base + '/contact'); await page.waitForTimeout(100);
    const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 5000 }).catch(() => null), page.click('a[data-enquiry="contact"]')]);
    const opened = popup ? popup.url() : null; const stayed = page.url(); if (popup) await popup.close();
    ok(`W-${tag}-enquiry-click`, 'pressing the contact button opens the hosted form in a new tab and leaves this page where it was', opened === formUrl && stayed === base + '/contact', JSON.stringify({ opened, stayed })); }
  { await page.goto(base + '/privacy'); await page.waitForTimeout(100);
    const t = await page.evaluate(() => ({ text: document.body.innerText, section: !!document.getElementById('enquiries') }));
    ok(`W-${tag}-privacy`, 'the privacy notice names Tally as the form provider and processor, where it stores enquiries, and no longer says enquiries go to Empathia\'s own service', t.section && /hosted by Tally/.test(t.text) && /processor/.test(t.text) && /controller/.test(t.text) && /stored in Europe/.test(t.text) && /email provider in the United States/.test(t.text) && !/own service/.test(t.text), t.text.slice(0, 300)); }
  ok(`W-${tag}-clean`, 'no page error, no console error, no request outside the site', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'website.json'), JSON.stringify(summary, null, 1));
console.log(`\n${summary.pass} passed, ${summary.fail} failed`); process.exit(failed ? 1 : 0);
