#!/usr/bin/env node
// "Follow one device" on /platform and the product pages' typed launches (#232; founder directive 18 Nov 2026 17:25 §6), served by the
// site's own server from the built dist:
// - five stages, one ceiling microphone (A-0104, asset AS-0103, room R-ATL-4-218), each stage a capture listed in the provenance file
//   (route, commit, sha256) taken at that stage's exact launch, and each with "Open this exact demonstration";
// - every such link, and every product page's demonstration button, is a catalogued launch carrying the way back to the page it is on;
// - with the script: a stepper (tabs, arrow keys, Home/End) over one stage; the way back (#follow-replay) selects its stage;
//   without the script every stage is shown;
// - phone and desktop: no sideways scroll, 44 px targets, text at 14 px or more; no console error (CSP intact), nothing off-origin.
//   node tests/browser/website-follow.test.mjs   (PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs … for dark)
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const L = await import(pathToFileURL(path.join(repo, 'packages/ui/src/launches.ts')).href);
const scheme = process.env.PW_COLOR_SCHEME || 'light';
const dist = path.join(repo, 'apps/website/dist'); const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'BUILD_MANIFEST.json'), 'utf8'));
const PORT = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
let failed = 0; const results = [];
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ` — ${String(detail).slice(0, 300)}`}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`; const browser = await chromium.launch();
const watch = (page, errs, ext) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) ext.push(r.url()); }); };
const expect = (l, back) => L.launchHref(manifest.demoUrl, l, back);
try {
  // the captures behind the five stages: listed by route (the launch's exact state), commit and hash
  const prov = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/media/product/PROVENANCE.json'), 'utf8')).captures;
  const capOk = L.FOLLOW.map((l) => { const c = prov[l.id]; if (!c) return `${l.id}: none`; if (c.route !== '#' + l.route) return `${l.id}: route ${c.route}`; for (const [f, h] of Object.entries(c.files)) { const p = path.join(dist, 'media/product', f); if (!fs.existsSync(p) || crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== h) return `${l.id}: ${f}`; } return c.commit && c.data === 'synthetic demonstration data' ? '' : `${l.id}: provenance`; }).filter(Boolean);
  ok('FO-01', 'each of the five stages has a capture taken at its launch’s exact state, listed with its route, commit and hash, shipped unchanged', !capOk.length, capOk.join(' | '));
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext);
    await page.goto(base + '/platform', { waitUntil: 'load' });
    const s = await page.evaluate(() => { const f = document.querySelector('[data-follow]'); return { js: f?.classList.contains('follow--js'), tabs: [...(f?.querySelectorAll('[role=tab]') || [])].map((t) => [t.textContent, t.getAttribute('aria-selected')]), shown: [...(f?.querySelectorAll('.follow__stage') || [])].filter((x) => !x.hidden).map((x) => x.id), links: [...(f?.querySelectorAll('[data-launch]') || [])].map((a) => [a.dataset.launch, a.getAttribute('href')]), lede: f?.querySelector('.follow__lede')?.textContent || '' }; });
    ok(`FO-${tag}-02`, 'the section names the one microphone it follows (A-0104, asset AS-0103, room R-ATL-4-218) and offers five views as tabs, the first shown', s.js && /A-0104/.test(s.lede) && /AS-0103/.test(s.lede) && /R-ATL-4-218/.test(s.lede) && s.tabs.length === 5 && s.tabs[0][1] === 'true' && s.shown.join() === 'follow-lite', JSON.stringify(s).slice(0, 400));
    const want = L.FOLLOW.map((l) => [l.id, expect(l, `/platform#${l.id}`)]);
    ok(`FO-${tag}-03`, 'each "Open this exact demonstration" is its catalogued launch, with the way back to its own stage', JSON.stringify(s.links) === JSON.stringify(want), JSON.stringify(s.links).slice(0, 300));
    await page.locator('[role=tab]').first().focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    const k = await page.evaluate(() => ({ sel: document.querySelector('[role=tab][aria-selected=true]')?.id, focus: document.activeElement?.id, shown: [...document.querySelectorAll('.follow__stage')].filter((x) => !x.hidden).map((x) => x.id) }));
    await page.keyboard.press('End'); const e = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]')?.id);
    ok(`FO-${tag}-04`, 'arrow keys move between the views and show one stage at a time; End goes to the last', k.sel === 'follow-assurance-tab' && k.focus === 'follow-assurance-tab' && k.shown.join() === 'follow-assurance' && e === 'follow-replay-tab', JSON.stringify({ k, e }));
    await page.goto(base + '/platform#follow-support', { waitUntil: 'load' }); await page.waitForTimeout(300);
    const b = await page.evaluate(() => ({ shown: [...document.querySelectorAll('.follow__stage')].filter((x) => !x.hidden).map((x) => x.id), top: Math.round(document.querySelector('[data-follow]').getBoundingClientRect().top) }));
    ok(`FO-${tag}-05`, 'the demonstration’s way back (#follow-support) opens the section at that stage', b.shown.join() === 'follow-support' && b.top < h && b.top > -200, JSON.stringify(b));
    const img = await page.evaluate(async () => { const i = document.querySelector('#follow-support img'); if (!i) return null; await i.decode().catch(() => {}); return { w: i.naturalWidth, alt: i.alt, src: i.currentSrc }; });
    ok(`FO-${tag}-06`, 'the stage’s capture loads from the site and says what it shows, as synthetic demonstration data', img && img.w > 0 && img.src.startsWith(base) && /Search Party/.test(img.alt) && /synthetic demonstration data/.test(img.alt), JSON.stringify(img));
    const geo = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, small: [...document.querySelectorAll('[data-follow] p, [data-follow] li > div p')].filter((x) => x.offsetParent && x.textContent.trim().length > 40 && parseFloat(getComputedStyle(x).fontSize) < 14).length, tiny: [...document.querySelectorAll('[data-follow] a.btn, [data-follow] [role=tab]')].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height < 44; }).length }));
    ok(`FO-${tag}-07`, 'no sideways scroll; text at 14 px or more; every tab and button at least 44 px tall', geo.over <= 0 && !geo.small && !geo.tiny, JSON.stringify(geo));
    ok(`FO-${tag}-08`, 'no console error (CSP intact), nothing requested off the site', !errs.length && !ext.length, [...errs, ...ext].join(' | '));
    await ctx.close();
  }
  // without the script: every stage is shown, in order, with its own button (the content does not depend on the script)
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme, javaScriptEnabled: false }); const page = await ctx.newPage();
    await page.goto(base + '/platform', { waitUntil: 'load' });
    const s = await page.evaluate(() => ({ nav: document.querySelector('.follow__nav')?.hidden, shown: [...document.querySelectorAll('.follow__stage')].filter((x) => !x.hidden && x.getBoundingClientRect().height > 0).length, btns: document.querySelectorAll('[data-follow] [data-launch]').length }));
    ok('FO-09', 'without the script all five stages show in order with their buttons, and no dead tabs are offered', s.nav === true && s.shown === 5 && s.btns === 5, JSON.stringify(s)); await ctx.close(); }
  // every product page's demonstration buttons are that product's catalogued launch, with the way back to the page
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme }); const page = await ctx.newPage(); const bad = [];
    const slugs = Object.keys(manifest.files).filter((f) => /^products\/[a-z-]+\/index\.html$/.test(f)).map((f) => f.split('/')[1]);
    for (const slug of slugs) {
      await page.goto(`${base}/products/${slug}`, { waitUntil: 'load' });
      const id = await page.evaluate(() => document.querySelector('main [data-p]')?.getAttribute('data-p')); const l = L.PRODUCT_LAUNCHES[id];
      const hrefs = await page.evaluate(() => [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')).filter((h) => /#\//.test(h || '') && !/\/proof\//.test(h)));
      const want = l ? expect(l, `/products/${slug}`) : null;
      if (!l || !hrefs.length || hrefs.some((x) => x !== want && !(id === 'lite' && x === expect(l, '/products/lite#scouter')))) bad.push({ slug, id, hrefs: hrefs.slice(0, 3) });
      if (l && !(await page.evaluate((who) => document.querySelector('.facts__shows')?.textContent.includes(`It opens as the ${who}, with a way back to this page.`), l.perspectiveLabel))) bad.push({ slug, says: 'no perspective line' });
    }
    ok('FO-10', `the ${slugs.length} product pages open their own catalogued launch (perspective named on the page, way back to the page)`, slugs.length === 9 && !bad.length, JSON.stringify(bad).slice(0, 400)); await ctx.close(); }
} finally {
  await browser.close(); srv.kill();
  const out = path.join(repo, `tests/evidence/website-follow${scheme === 'dark' ? '-dark' : ''}`); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'RESULTS.json'), JSON.stringify({ suite: 'website-follow', scheme, at: new Date().toISOString(), results }, null, 1));
  console.log(`\n${results.length - failed} passed, ${failed} failed (${scheme})`); process.exit(failed ? 1 : 0);
}
