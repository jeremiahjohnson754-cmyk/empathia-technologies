#!/usr/bin/env node
/**
 * Two independent browsers on the hosted demonstration (founder, 17 Nov 2026: "connect #/connected to the hosted API and validate
 * that two independent browsers can access the same authorized sandbox records … mobile navigation").
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/staging/connected-browsers.mjs --site=https://empathia-demo-next.onrender.com --api=https://empathia-demo-api-l04n.onrender.com [--local-build] [--shots=<dir>] [--json=<file>]
 *
 * Two browser PROCESSES, each with its own empty profile: A at a desktop size, B at a phone size. They share nothing but the resume
 * code typed into B. Stated plainly: both are Chromium, the one engine installed here; a second engine is a person's check.
 *
 * --local-build: the site has not been switched to the API yet. The demo is built here with DEMO_API_URL=<api> and served to both
 * browsers UNDER THE SITE'S ADDRESS (the browser's requests for the site are answered from that build), so the page's origin, its
 * Content-Security-Policy and the API's cross-origin rules are the real ones, and every API call goes to the hosted API. What it
 * does not show is the site as deployed; without the flag the same checks run against the deployed site.
 *
 *   ST-01  A: the page loads from the site's address and the hosted API answers; how long it took; if it took more than five
 *          seconds the page said what it was waiting for
 *   ST-02  A opens a sandbox and does three steps, each as its own person: a mounting, a field move, its approval by someone else
 *   ST-03  B has nothing stored; a resume code with a wrong key opens nothing
 *   ST-04  B, from the resume code alone, reads the same organization, the same thread and the same field record as A
 *   ST-05  B does the next step; A, read again, shows it: the records are the server's, not either browser's
 *   ST-06  B at phone size: nothing scrolls sideways; away to another page and back, the sandbox is still held and the thread is the same
 *   ST-07  neither browser asked anything but the site and the API; the only console error is the refusal ST-03 asked for
 *   ST-08  the API answered the browser's cross-origin calls naming the site's origin
 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = '') => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const site = arg('site').replace(/\/$/, ''); const api = arg('api').replace(/\/$/, ''); const local = process.argv.includes('--local-build');
if (!/^https:\/\//.test(site) || !/^https:\/\//.test(api)) { console.error('usage: connected-browsers.mjs --site=<https demo site> --api=<https api> [--local-build] [--shots=<dir>] [--json=<file>]'); process.exit(2); }
const shots = arg('shots'); if (shots) fs.mkdirSync(shots, { recursive: true });
const results = []; const ok = (id, title, pass, detail = '') => { results.push({ id, title, result: pass ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${title}${detail ? ` — ${String(detail).slice(0, 320)}` : ''}`); };

let dist = '';
if (local) { dist = fs.mkdtempSync(path.join(os.tmpdir(), 'connected-staging-')); execFileSync(process.execPath, [path.join(repo, 'apps/demo/build.mjs')], { env: { ...process.env, DEMO_DIST: dist, DEMO_API_URL: api }, stdio: ['ignore', 'ignore', 'inherit'] }); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;

async function browser(name, viewport) {
  const b = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});   // its own process and its own empty profile
  const ctx = await b.newContext({ viewport, serviceWorkers: local ? 'block' : 'allow', ...(viewport.width < 500 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  if (local) await ctx.route(`${site}/**`, async (route) => { const u = new URL(route.request().url()); let f = path.join(dist, decodeURIComponent(u.pathname)); if (u.pathname === '/' || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, 'index.html');
    await route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
  const page = await ctx.newPage(); page.setDefaultTimeout(60000); const errs = []; const asked = []; const cors = new Set();
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:')) asked.push(u); });
  page.on('response', (r) => { if (r.url().startsWith(api)) cors.add(r.headers()['access-control-allow-origin'] || '(none)'); });
  return { name, b, page, errs, asked, cors, close: () => b.close() };
}
const stateOf = (p) => p.getByTestId('connected').getAttribute('data-state');
const waitState = (p, v, ms) => p.waitForFunction((x) => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === x, v, { timeout: ms }).then(() => true, () => false);
const settle = async (p, ms = 180000) => { await p.waitForFunction(() => !document.querySelector('[data-testid=cn-busy]'), null, { timeout: ms }); await p.waitForTimeout(200); };
const text = (p, id) => p.getByTestId(id).innerText();
const doneSteps = (p) => p.locator('[data-testid=cn-steps] li[data-state=done]').count();
const shot = async (x, file) => { if (shots) await x.page.screenshot({ path: path.join(shots, file), fullPage: true }).catch(() => undefined); };

const A = await browser('A', { width: 1440, height: 900 }); const B = await browser('B', { width: 390, height: 844 });
try {
  const t0 = Date.now(); await A.page.goto(`${site}/#/connected`, { waitUntil: 'domcontentloaded' }); await A.page.getByTestId('connected').waitFor();
  let sawWaiting = false; const watch = setInterval(async () => { try { if ((await A.page.getByTestId('cn-asking').getAttribute('data-waited', { timeout: 500 })) === 'long' && !sawWaiting) { sawWaiting = true; await shot(A, 'staging-A-waiting-for-the-server.png'); } } catch { /* answered */ } }, 1000);
  const ready = await waitState(A.page, 'ready', 150000); clearInterval(watch); const took = (Date.now() - t0) / 1000;
  ok('ST-01', 'A: the page loads from the site’s address and the hosted API answers; if it took more than five seconds the page said what it was waiting for', ready && (took < 6.5 || sawWaiting), `ready ${ready} after ${took.toFixed(1)} s · said it was waiting: ${sawWaiting} · state ${await stateOf(A.page)}`);
  if (!ready) throw new Error(`the page did not become ready: ${await text(A.page, 'cn-connection').catch(() => 'no connection card')}`);

  await A.page.getByTestId('cn-open').click(); await settle(A.page); await A.page.getByTestId('cn-journey').waitFor();
  const tenant = await text(A.page, 'cn-tenant'); const code = await A.page.getByTestId('cn-code').inputValue();
  for (let i = 0; i < 3; i += 1) { await A.page.getByTestId('cn-run').click(); await settle(A.page); }
  const aMounted = await text(A.page, 'cn-mounted'); const aMoves = await text(A.page, 'cn-moves'); const aThread = await text(A.page, 'cn-thread'); const aDone = await doneSteps(A.page);
  ok('ST-02', 'A opens a sandbox and does three steps, each as its own person: a mounting, a field move, its approval by someone else', /^sbx-[0-9a-f]{16}$/.test(tenant) && /^1 of /.test(aMounted) && /APPROVED/.test(aMoves) && aDone === 3, `${tenant} · ${aMounted.split('\n')[0]} · ${aMoves.replace(/\s+/g, ' ').slice(0, 90)} · ${aDone} steps done`);

  await B.page.goto(`${site}/#/connected`, { waitUntil: 'domcontentloaded' }); const bReady = await waitState(B.page, 'ready', 150000);
  const stored = await B.page.evaluate(() => localStorage.getItem('empathia.demo.sandbox.v1'));
  const wrong = `${code.slice(0, -1)}${code.endsWith('A') ? 'B' : 'A'}`;
  await B.page.getByTestId('cn-resume-code').fill(wrong); await B.page.getByTestId('cn-resume').click(); await settle(B.page);
  const refused = await text(B.page, 'cn-said'); const still = await stateOf(B.page);
  ok('ST-03', 'B has nothing stored; a resume code with a wrong key opens nothing', bReady && stored === null && /did not open a sandbox/.test(refused) && still === 'ready', `stored ${stored} · ${refused.replace(/\s+/g, ' ').slice(0, 140)}`);

  await B.page.getByTestId('cn-resume-code').fill(code); await B.page.getByTestId('cn-resume').click(); await settle(B.page); await B.page.getByTestId('cn-thread').waitFor();
  const same = { tenant: (await text(B.page, 'cn-tenant')) === tenant, thread: (await text(B.page, 'cn-thread')) === aThread, mounted: (await text(B.page, 'cn-mounted')) === aMounted, moves: (await text(B.page, 'cn-moves')) === aMoves, done: (await doneSteps(B.page)) === aDone };
  ok('ST-04', 'B, from the resume code alone, reads the same organization, the same thread and the same field record as A', Object.values(same).every(Boolean), JSON.stringify(same));
  await shot(B, 'staging-B-phone-resumed.png');

  await B.page.getByTestId('cn-run').click(); await settle(B.page); const bDone = await doneSteps(B.page); const bThread = await text(B.page, 'cn-thread');
  await A.page.reload(); await A.page.getByTestId('cn-thread').waitFor(); await settle(A.page); const aDone2 = await doneSteps(A.page); const aThread2 = await text(A.page, 'cn-thread');
  ok('ST-05', 'B does the next step; A, read again, shows it: the records are the server’s, not either browser’s', bDone === aDone + 1 && aDone2 === bDone && aThread2 === bThread, `B ${bDone} steps · A after reading again ${aDone2} · same thread ${aThread2 === bThread}`);
  await shot(A, 'staging-A-desktop.png');

  const over = await B.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await B.page.evaluate(() => { location.hash = '#/thread'; }); await B.page.getByTestId('thread').waitFor(); const link = await B.page.locator('[data-testid=th-server] a').count();
  await B.page.locator('[data-testid=th-server] a').click(); await B.page.getByTestId('cn-thread').waitFor(); await settle(B.page);
  ok('ST-06', 'B at phone size: nothing scrolls sideways; away to another page and back, the sandbox is still held and the thread is the same', over <= 1 && link === 1 && (await text(B.page, 'cn-tenant')) === tenant && (await text(B.page, 'cn-thread')) === bThread && (await B.page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, `overflow ${over} px · link back ${link} · same tenant ${(await text(B.page, 'cn-tenant')) === tenant}`);

  const off = [...A.asked, ...B.asked].filter((u) => !u.startsWith(site) && !u.startsWith(api)); const otherErrs = [...A.errs, ...B.errs].filter((e) => !/status of 401/.test(e));
  ok('ST-07', 'neither browser asked anything but the site and the API; the only console error is the refusal ST-03 asked for', !off.length && !otherErrs.length && B.errs.length === 1 && !A.errs.length, `elsewhere ${off.slice(0, 2)} · errors ${otherErrs.slice(0, 2).join(' | ')} · A ${A.errs.length}, B ${B.errs.length} · ${A.asked.filter((u) => u.startsWith(api)).length + B.asked.filter((u) => u.startsWith(api)).length} API calls`);
  ok('ST-08', 'the API answered the browser’s cross-origin calls naming the site’s origin', [...A.cors].join() === site && [...B.cors].join() === site, `A ${[...A.cors].join(', ')} · B ${[...B.cors].join(', ')}`);
} catch (e) { ok('ST-XX', 'the run could not be completed', false, (e && e.message) || String(e)); await shot(A, 'staging-A-stopped.png'); await shot(B, 'staging-B-stopped.png'); }
finally { await A.close(); await B.close(); if (dist) fs.rmSync(dist, { recursive: true, force: true }); }

const want = ['ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06', 'ST-07', 'ST-08']; for (const id of want) if (!results.some((r) => r.id === id)) ok(id, 'NOT RUN', false, 'an earlier check stopped the run');
const pass = results.filter((r) => r.result === 'PASS').length; const fail = results.length - pass; const jsonOut = arg('json');
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ at: new Date().toISOString(), site, api, served: local ? 'a build made here with DEMO_API_URL, answered under the site’s address' : 'the deployed site', browsers: 'two Chromium processes, separate empty profiles (desktop 1440×900, phone 390×844)', passed: pass, failed: fail, results }, null, 1) + '\n');
console.log(`connected-browsers ${site} → ${api}: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
