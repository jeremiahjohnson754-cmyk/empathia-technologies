#!/usr/bin/env node
/**
 * The public website's demonstration-request form, submitted in a real browser to a real API over a real database: the site is built
 * with the lead endpoint configured, the form posts, the message is stored and appears in the admin inbox with the notification status
 * stated; the honeypot and a missing consent are refused by the browser-side validation or the API. Synthetic data only.
 *   node tests/e2e/website-lead.e2e.mjs [evidence-dir]
 */
import { spawn, execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { setup, client } from '../integration/harness.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const out = path.resolve(process.argv[2] || path.join(repo, 'tests/evidence/website-lead')); fs.mkdirSync(out, { recursive: true });
const WWW = 4396; const API = 4194; const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 500) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const h = await setup({ db: 'empathia_test_lead_e2e', port: API, env: { CORS_ORIGINS: `http://127.0.0.1:${WWW}` } });
execFileSync(process.execPath, [path.join(repo, 'apps/website/build.mjs'), `--api=http://127.0.0.1:${API}`], { stdio: 'ignore' });   // a build with the endpoint configured
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${WWW}`, `--api=http://127.0.0.1:${API}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${WWW}/request-demo`); await page.waitForSelector('form[data-lead]');
  ok('L-01', 'with the endpoint configured the form is enabled and shows no "not configured" notice', !(await page.locator('form[data-lead] button[type=submit]').isDisabled()) && !/not configured/.test(await page.locator('[data-status]').textContent()));
  await page.fill('input[name=name]', 'Synthetic Visitor'); await page.fill('input[name=organization]', 'Example Org (synthetic)'); await page.fill('input[name=email]', 'visitor@example.com'); await page.selectOption('select[name=audience]', 'Systems integrator'); await page.fill('textarea[name=message]', 'Please show the commissioning scenario.');
  await page.click('form[data-lead] button[type=submit]'); await page.waitForTimeout(400);
  ok('L-02', 'without consent the browser refuses to submit (required checkbox)', !/Received/.test(await page.locator('[data-status]').textContent()) && await page.evaluate(() => !document.querySelector('form[data-lead]').checkValidity()));
  await page.check('input[name=consent]'); await page.click('form[data-lead] button[type=submit]'); await page.waitForSelector('[data-status].ok', { timeout: 8000 });
  ok('L-03', 'with consent the message is sent and the page confirms receipt', /Received/.test(await page.locator('[data-status]').textContent()));
  await page.screenshot({ path: path.join(out, 'sent.png') });
  const c = client(h.base); const admin = await c.login('secadmin'); const inbox = await c.call('GET', '/v1/admin/leads', { token: admin });
  const l = inbox.body.items.find((x) => x.email === 'visitor@example.com');
  ok('L-04', 'the message is stored and readable in the admin inbox with its fields and the notification status', !!l && l.kind === 'demo' && l.audience === 'Systems integrator' && l.consent !== false && l.notified === false && /not configured/.test(l.notify_note), JSON.stringify(l).slice(0, 300));
  await page.goto(`http://127.0.0.1:${WWW}/contact`); await page.waitForSelector('form[data-lead]');
  await page.evaluate(() => { document.querySelector('input[name=website]').value = 'http://spam.example'; });
  await page.fill('input[name=name]', 'Bot'); await page.fill('input[name=organization]', 'Bot'); await page.fill('input[name=email]', 'bot@example.com'); await page.fill('textarea[name=message]', 'spam'); await page.check('input[name=consent]'); await page.click('form[data-lead] button[type=submit]'); await page.waitForTimeout(800);
  const inbox2 = await c.call('GET', '/v1/admin/leads', { token: admin });
  ok('L-05', 'a submission with the honeypot filled is dropped by the browser script and never stored', !inbox2.body.items.some((x) => x.email === 'bot@example.com'));
  ok('L-06', 'no page error', !errs.length, errs.slice(0, 2).join(' | '));
} finally { await browser.close(); srv.kill(); await h.app.stop(); execFileSync(process.execPath, [path.join(repo, 'apps/website/build.mjs')], { stdio: 'ignore' }); }   // rebuild without the endpoint (the committed default)
fs.writeFileSync(path.join(out, 'website-lead.json'), JSON.stringify({ at: new Date().toISOString(), pass: results.length - failed, fail: failed, results }, null, 1));
console.log(`\n${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
