// Enterprise 3.0 kickoff audit (Directive 0.1): opens the two canonical Next sites in a real browser (Chromium) and records, per
// route and width: the document's status, the h1, console errors, failed requests and sideways overflow. Screenshots of each home.
// Usage: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<bundle> node scripts/audit/live-kickoff.mjs [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';
const W = process.env.LIVE_WEBSITE || 'https://empathia-website-next.onrender.com';
const D = process.env.LIVE_DEMO || 'https://empathia-demo-next.onrender.com';
const out = process.argv[2] || 'docs/audit/e3-day1';
const sm = await (await fetch(W + '/sitemap.xml')).text();
const webRoutes = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const demoRoutes = ['#/', '#/v25', '#/campus', '#/campus/ATL/4/R-ATL-4-218', '#/search?q=camera%20in%20town%20halls', '#/v25/lite', '#/request', '#/scouter', '#/commissioning/room/R-ATL-4-218',
  '#/assurance/room/R-ATL-4-218', '#/assurance/room/R-ATL-4-218/recommission', '#/v25/fi', '#/servicehands', '#/pro/ops', '#/pro/exec', '#/learn', '#/story', '#/lite/qr', '#/people', '#/play/expo', '#/play/stadium',
  '#/tour', '#/parity', '#/voice', '#/flow', '#/prism', '#/sentinel', '#/accord', '#/missionproof', '#/forge'];
const b = await chromium.launch(); const rows = [];
for (const [site, base, routes] of [['website', W, webRoutes], ['demo', D, demoRoutes]]) {
  for (const width of [390, 1440]) {
    const c = await b.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, isMobile: width < 500, hasTouch: width < 500 });
    for (const r of routes) {
      const p = await c.newPage(); const errs = []; const failed = [];
      p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
      p.on('pageerror', (e) => errs.push('pageerror ' + String(e).slice(0, 140)));
      p.on('response', (x) => { if (x.status() >= 400) failed.push(x.status() + ' ' + x.url().replace(base, '').slice(0, 80)); });
      let status = 0, h1 = '', overflow = 0, note = '';
      try {
        const resp = await p.goto(base + (site === 'demo' ? '/' + r : r), { waitUntil: 'networkidle', timeout: 60000 }); status = resp ? resp.status() : 0;
        await p.waitForTimeout(site === 'demo' ? 1500 : 300);
        h1 = ((await p.locator('h1').first().textContent({ timeout: 3000 }).catch(() => '')) || '').trim().slice(0, 70);
        overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const body = await p.locator('body').innerText();
        if (/not migrated yet/i.test(body)) note = 'NOT MIGRATED'; else if (/not part of the Living Campus/i.test(h1)) note = 'NO PAGE (boundary: not part of the Living Campus)';
        if ((r === '/' || r === '#/') ) await p.screenshot({ path: `${out}/live-${site}-home-${width}.jpg`, type: 'jpeg', quality: 70 });
      } catch (e) { note = 'LOAD FAILED ' + String(e).slice(0, 80); }
      rows.push({ site, width, route: r, status, h1, overflow, errors: errs.length, failed: failed.length, note, firstError: errs[0] || failed[0] || '' });
      await p.close();
    }
    await c.close();
  }
}
await b.close();
fs.writeFileSync(`${out}/LIVE_AUDIT.json`, JSON.stringify({ at: new Date().toISOString(), website: W, demo: D, rows }, null, 1));
const bad = rows.filter((x) => x.status >= 400 || x.overflow > 1 || x.errors || x.failed || x.note || !x.h1);
console.log(`checked ${rows.length} route x width; with a finding: ${bad.length}`);
for (const x of bad) console.log(`${x.site} ${x.width} ${x.route} status=${x.status} h1="${x.h1}" overflow=${x.overflow} errors=${x.errors} failed=${x.failed} ${x.note} ${x.firstError}`);
