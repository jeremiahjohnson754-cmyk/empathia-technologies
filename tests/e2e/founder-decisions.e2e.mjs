#!/usr/bin/env node
/**
 * The Founder Studio's hosted workflow, end to end in a browser: the studio (served by its launcher) talks to a real API over a real
 * database; the founder signs in to the founder organization, records a decision, moves it to DECIDED with a rationale, reads its
 * revisions; an enterprise account cannot sign in to the founder organization from the same page. Synthetic data only.
 *   node tests/e2e/founder-decisions.e2e.mjs [studio-dist] [evidence-dir]
 */
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { setup } from '../integration/harness.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const dist = path.resolve(process.argv[2] || path.join(repo, 'apps/founder-studio/dist')); const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/founder-decisions')); fs.mkdirSync(out, { recursive: true });
const PORT = 4394; const KEY = 'e2e-key'; const API_PORT = 4196; const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 500) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const h = await setup({ db: 'empathia_test_founder_e2e', port: API_PORT, env: { CORS_ORIGINS: `http://127.0.0.1:${PORT}` } });
const srv = spawn(process.execPath, [path.join(dist, 'server/serve.mjs'), '--no-open', `--port=${PORT}`, `--api=http://127.0.0.1:${API_PORT}`], { env: { ...process.env, STUDIO_KEY: KEY }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', (d) => { if (/running/.test(String(d))) r(); }); setTimeout(r, 4000); });
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = [];
page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/status of (401|403)/.test(m.text())) errs.push(m.text()); });   // the expected refusals are the browser's own log lines, not page errors page.on('requestfailed', (r) => errs.push('requestfailed ' + r.url() + ' ' + (r.failure() || {}).errorText)); page.on('dialog', (d) => { console.log('DIALOG', d.type(), d.message().slice(0, 60)); d.accept('Decided after the pilot-scope review (synthetic).').catch((e) => console.log('DIALOG-ERR', e.message)); });
page.on('dialog', (d) => { d.accept('Decided after the pilot-scope review (synthetic).').catch(() => {}); });   // the rationale prompt
try {
  await page.goto(`http://127.0.0.1:${PORT}/?k=${KEY}`); await page.waitForSelector('h1');   // the launcher sets its key cookie and redirects
  await page.goto(`http://127.0.0.1:${PORT}/index.html?api=http://127.0.0.1:${API_PORT}#/decisions`); await page.waitForSelector('h1'); await page.waitForTimeout(500);
  ok('FD-01', 'the Decisions destination asks the founder to sign in and names the platform API', (await page.locator('h2', { hasText: 'Sign in to the founder organization' }).count()) === 1 && (await page.locator('code', { hasText: String(API_PORT) }).count()) >= 1);
  await page.fill('input[type=password]', 'wrong-password'); await page.click('button[type=submit]'); await page.waitForTimeout(800);
  ok('FD-02', 'a wrong password is refused and said so', (await page.locator('[role=alert]').count()) === 1, await page.locator('[role=alert]').textContent().catch(() => ''));
  await page.fill('input[type=password]', 'empathia-dev-only'); await page.click('button[type=submit]'); await page.waitForSelector('text=Signed in as the founder', { timeout: 8000 }).catch(async () => { throw new Error('sign-in did not complete: ' + JSON.stringify(errs.slice(0, 3))); });
  ok('FD-03', 'the founder signs in to the founder organization', true);
  await page.fill('form.card input', 'Pilot scope: one building first (synthetic)'); await page.selectOption('form.card select', 'commercial'); await page.fill('form.card textarea', 'A bounded scope keeps the readiness report honest.');
  await page.click('form.card button[type=submit]'); await page.waitForSelector('table.table tbody tr', { timeout: 8000 });
  const row = await page.locator('table.table tbody tr').first().innerText();
  ok('FD-04', 'a decision is recorded as a DRAFT with a code', /FD-\d{4}/.test(row) && /DRAFT/.test(row) && /one building first/.test(row), row);
  await page.waitForTimeout(800); const btn = page.getByRole('button', { name: 'DECIDED', exact: true }); await btn.first().click(); await page.waitForTimeout(1500);
  const row2 = await page.locator('table.table tbody tr').first().innerText();
  ok('FD-05', 'the decision moves to DECIDED with a rationale and its revision becomes 2', /DECIDED/.test(row2) && /\t2\t|\s2\s/.test(row2.replace(/\n/g, '\t')), row2);
  await page.click('table.table tbody tr >> text=History'); await page.waitForSelector('ol li', { timeout: 5000 });
  const hist = await page.locator('ol li').allInnerTexts();
  ok('FD-06', 'the history shows both revisions, oldest first', hist.length === 2 && /1 · DRAFT/.test(hist[0]) && /2 · DECIDED/.test(hist[1]), hist.join(' | '));
  await page.screenshot({ path: path.join(out, 'decisions.png') });
  const persisted = await page.evaluate(async (api) => { const r = await fetch(`${api}/v1/founder/decisions`, { headers: { authorization: 'Bearer ' + sessionStorage.getItem('empathia.founder-studio.session') } }); return r.json(); }, `http://127.0.0.1:${API_PORT}`);
  ok('FD-07', 'the decision is persisted on the platform (read back through the API with the same session)', persisted.items && persisted.items.length === 1 && persisted.items[0].status === 'DECIDED' && persisted.items[0].revision === 2, JSON.stringify(persisted).slice(0, 200));
  await page.click('text=Sign out'); await page.waitForSelector('h2:has-text("Sign in to the founder organization")');
  const enterprise = await page.evaluate(async (api) => { const r = await fetch(`${api}/v1/auth/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'secadmin@empathia-demo.empathia.invalid', password: 'empathia-dev-only', tenant: 'empathia-founder', role: 'founder' }) }); return r.status; }, `http://127.0.0.1:${API_PORT}`);
  ok('FD-08', 'an enterprise account cannot sign in to the founder organization', enterprise === 401 || enterprise === 403 || enterprise === 404, `status ${enterprise}`);
  ok('FD-09', 'no page error', !errs.length, errs.slice(0, 2).join(' | '));
} finally { await browser.close(); srv.kill(); await h.app.stop(); }
fs.writeFileSync(path.join(out, 'founder-decisions.json'), JSON.stringify({ at: new Date().toISOString(), pass: results.length - failed, fail: failed, results }, null, 1));
console.log(`\n${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
