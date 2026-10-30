#!/usr/bin/env node
// The investor demo shell from its built dist: lands on the investor start with the synthetic banner and the three start actions (the
// launch action largest on a phone), every legacy area address resolves to a page that states its migration status (never a blank or an
// error), the perspective picker says it grants nothing, no console error, no request leaves the page.
//   node tests/browser/demo.test.mjs [dist] [evidence-dir]
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const dist = path.resolve(process.argv[2] || path.join(repo, 'apps/demo/dist')); const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/demo')); fs.mkdirSync(out, { recursive: true });
const PORT = 4398; const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}/`;
const areas = JSON.parse(fs.readFileSync(path.join(repo, 'apps/demo/src/generated/parity.json'), 'utf8'));
const browser = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errs = []; const ext = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); });
  await page.goto(base); await page.waitForTimeout(600);
  const land = await page.evaluate(() => ({ hash: location.hash, banner: !!Array.from(document.querySelectorAll('.ui-tag')).find((t) => /SYNTHETIC DATA/.test(t.textContent)), actions: Array.from(document.querySelectorAll('.start .go')).map((a) => ({ text: a.querySelector('b').textContent, h: a.getBoundingClientRect().height })), note: (document.getElementById('persp-note') || {}).textContent || '', over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  ok(`D-${tag}-01`, 'lands on the investor start with the synthetic banner and three start actions', land.hash === '#/investor' && land.banner && land.actions.length === 3 && land.over <= 0, JSON.stringify(land));
  ok(`D-${tag}-02`, 'the launch action comes first and, on a phone, is the tallest', land.actions[0] && /Launch interactive room builder/.test(land.actions[0].text) && (tag !== 'phone' || land.actions[0].h >= Math.max(...land.actions.map((a) => a.h))), JSON.stringify(land.actions));
  ok(`D-${tag}-03`, 'the perspective picker says it grants nothing', /grants nothing/.test(land.note), land.note);
  await page.screenshot({ path: path.join(out, `${tag}-start.png`) });
  if (tag === 'desktop') {
    let bad = []; for (const a of areas.filter((x) => x.key !== 'investor')) { const hash = '#/' + (a.key === 'none' ? 'no-such-area' : a.key.replace('.', '/')); await page.evaluate((x) => { location.hash = x; }, hash); await page.waitForTimeout(120);
      const v = await page.evaluate(() => ({ h1: (document.querySelector('main h1') || {}).textContent || '', text: document.querySelector('main').innerText })); if (!(v.h1.length > 2 && /(Not migrated yet|Native page|Unknown address)/.test(v.text))) bad.push(`${hash}: ${v.h1}`); }
    ok('D-04', `every one of the ${areas.length} legacy areas resolves to a page that states its migration status`, !bad.length, bad.slice(0, 5).join(' | '));
    await page.evaluate(() => { location.hash = '#/assurance/room/R-1/history'; }); await page.waitForTimeout(150);
    ok('D-05', 'a deep legacy address resolves to its area (assurance.history)', /baseline history/i.test(await page.evaluate(() => document.querySelector('main').innerText)));
    await page.evaluate(() => { location.hash = '#/investor'; }); await page.waitForTimeout(150);
    await page.click('text=What each workflow solves'); await page.waitForTimeout(200);
    ok('D-06', 'the seven scenarios each state the customer problem', (await page.locator('.scen li').count()) === 7 && (await page.locator('.scen li i').count()) === 7);
  }
  ok(`D-${tag}-07`, 'no page error, no console error, no request outside the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'demo.json'), JSON.stringify(summary, null, 1)); console.log(`\n${summary.pass} passed, ${summary.fail} failed`); process.exit(failed ? 1 : 0);
