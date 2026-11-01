#!/usr/bin/env node
// The investor demonstration's way to a real conversation: the "Work with Empathia" entry points on the investor start and the contact
// link in the footer of every page open the owner's hosted Tally form (apps/demo/src/enquiry.ts) in a new tab, say so, carry the
// disclosure, and send nothing from the demonstration. tally.so is stubbed, so the clicks are tested without leaving the test machine.
//   node tests/browser/demo-enquiry.test.mjs [dist] [evidence-dir]
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/demo')); fs.mkdirSync(out, { recursive: true });
const PORT = 4396; const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}/`;
const FORM = (fs.readFileSync(path.join(repo, 'apps/demo/src/enquiry.ts'), 'utf8').match(/url: '([^']+)'/) || [])[1];
const browser = await chromium.launch();
try {
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errs = []; const ext = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); });
    await ctx.route('https://tally.so/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub of the hosted enquiry form</title>' }));
    await page.goto(base + '#/investor'); await page.waitForSelector('[data-testid="work-with"]');
    const s = await page.evaluate(() => {
      const sec = document.querySelector('[data-testid="work-with"]'); const r = sec.getBoundingClientRect();
      return { links: Array.from(sec.querySelectorAll('a[data-enquiry]')).map((a) => ({ k: a.dataset.enquiry, href: a.getAttribute('href'), target: a.target, rel: a.rel, name: a.textContent })),
        note: (sec.querySelector('[data-enquiry-note]') || {}).textContent || '', over: document.documentElement.scrollWidth - innerWidth, width: r.width,
        footer: Array.from(document.querySelectorAll('footer a[data-enquiry="footer"]')).map((a) => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, name: a.textContent })) };
    });
    const each = (l) => l.href === FORM && l.target === '_blank' && /\bnoopener\b/.test(l.rel) && /\bnoreferrer\b/.test(l.rel) && /new tab/.test(l.name) && /tally\.so/.test(l.name);
    ok(`DE-${tag}-01`, 'the investor start offers pilot, partnership, investor and demonstration entry points, each opening the hosted form in a new tab and saying so', ['pilot', 'partner', 'investor', 'demo'].every((k) => s.links.some((l) => l.k === k)) && s.links.length === 4 && s.links.every(each), JSON.stringify(s.links));
    ok(`DE-${tag}-02`, 'each entry point names the choice to make in the form, and the disclosure says who receives and who stores the enquiry and that nothing from the demonstration is sent', s.links.every((l) => /In the form, choose/.test(l.name)) && /tally\.so/.test(s.note) && /Tally stores it for us in the EU/.test(s.note) && /Nothing you do in this demonstration is sent with it/.test(s.note), s.note);
    ok(`DE-${tag}-03`, 'the footer carries the contact link to the same form, opening in a new tab and saying so', s.footer.length === 1 && s.footer.every(each), JSON.stringify(s.footer));
    ok(`DE-${tag}-04`, 'no sideways scroll with the section on the page', s.over <= 0, `over=${s.over}`);
    const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 5000 }).catch(() => null), page.click('[data-testid="work-with"] a[data-enquiry="investor"]')]);
    const opened = popup ? popup.url() : null; if (popup) await popup.close();
    ok(`DE-${tag}-05`, 'pressing an entry point opens the hosted form in a new tab and the demonstration stays where it was', opened === FORM && page.url() === base + '#/investor', JSON.stringify({ opened, at: page.url() }));
    await page.goto(base + '#/v25/build'); await page.waitForTimeout(300);
    const deep = await page.evaluate(() => Array.from(document.querySelectorAll('footer a[data-enquiry="footer"]')).length);
    ok(`DE-${tag}-06`, 'the contact link is in the footer of a page deep in the demonstration too', deep === 1, `links=${deep}`);
    ok(`DE-${tag}-07`, 'no page error and no request outside the demonstration from its own page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    if (tag === 'desktop') { await page.goto(base + '#/investor'); await page.locator('[data-testid="work-with"]').screenshot({ path: path.join(out, 'work-with-desktop.png') }); }
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
fs.writeFileSync(path.join(out, 'demo-enquiry.json'), JSON.stringify({ at: new Date().toISOString(), pass: results.length - failed, fail: failed, tests: results.length, results }, null, 1));
console.log(`\n${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
