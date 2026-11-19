#!/usr/bin/env node
/**
 * Screenshots for the website's Intake page (founder, 19 Nov 2026 13:28: "screenshots only no video. Screenshots of someone going [through
 * the] process of making a new room or device request and getting that proposed lite room at the end"). One person, the Employee, makes a
 * new-room request on the built demonstration from the front door to "Your request has been received", then a device request from the
 * room; each step is a screenshot of the page as it is, dark theme (D43), 1280×800, reduced motion, synthetic data. Nothing is drawn,
 * staged or retouched, and no photograph is uploaded (the photo step is shown as the person sees it, before adding any).
 *
 * Writes apps/website/media/product/intake-<n>-1280.webp and -640.webp and adds them to PROVENANCE.json (route, step, commit, sha256): the
 * website build admits only files listed there with those hashes. Run after `node scripts/build.mjs`:
 *   node apps/website/scripts/intake-shots.mjs
 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const repo = path.resolve(app, '../..');
const require = createRequire(import.meta.url); const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const demo = path.join(repo, 'apps/demo/dist'); const out = path.join(app, 'media/product'); fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(path.join(demo, 'index.html'))) { console.error('build the demonstration first: node scripts/build.mjs'); process.exit(1); }

/** The steps shown on the page, in order: what the person did, and what the screenshot shows. */
export const INTAKE_SHOTS = [
  { id: 'intake-1', step: 'Describe it', what: 'The front door: the person types what they need; Intake reads it by word lists, not AI, and suggests where to start.' },
  { id: 'intake-2', step: 'What you need', what: 'Step 1 of 5: the kind of request, the person’s own words and what should be better, already filled in from what they typed.' },
  { id: 'intake-3', step: 'Where', what: 'Step 2: the building, the floor and a name for the space. It becomes a provisional space: requested, not built.' },
  { id: 'intake-4', step: 'What it should do', what: 'Step 3: what the room is for and how many people. The room is drawn as the answers change.' },
  { id: 'intake-5', step: 'Show us the space', what: 'Step 4: the photographs that would help, for this kind of request only, and why. Optional to send.' },
  { id: 'intake-6', step: 'Review', what: 'Step 5: every answer, each changeable, and the proposed room in Empathia Lite’s 3D room view.' },
  { id: 'intake-7', step: 'Received', what: '“Your request has been received.” The request id, where it stands, who acts next, and the proposed room.' },
  { id: 'intake-8', step: 'A device, from the room', what: 'From a device in a room: the room and the device are already known, so the person says what is wrong and sends it.' },
  { id: 'intake-9', step: 'Following it', what: 'The request’s own page: what is happening, who acts next, what is needed, what happens next, and its history.' },
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.vtt': 'text/vtt', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(demo, path.normalize(p)); if (!f.startsWith(demo) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const commit = (spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout || 'unknown').trim();
  const provPath = path.join(out, 'PROVENANCE.json'); const prov = JSON.parse(fs.readFileSync(provPath, 'utf8')); prov.captures ||= {};
  const browser = await chromium.launch(); const tmp = path.join(repo, '.local/captures'); fs.mkdirSync(tmp, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark', reducedMotion: 'reduce', deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('empathia.theme', 'dark'); localStorage.setItem('empathia.demo.perspective', 'employee'); } catch { /* none */ } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const settle = async (ms = 500) => { await page.waitForSelector('main h1', { timeout: 15000 }); await page.waitForTimeout(ms); };
  // scroll so that `sel` sits just under the sticky shell bar (a step's heading, the review's proposed room)
  const at = async (sel) => { await page.evaluate((s) => { const e = document.querySelector(s); const bar = document.querySelector('header')?.getBoundingClientRect().bottom || 64; if (e) scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - bar - 16)); }, sel); await page.waitForTimeout(350); };
  const shot = async (id, route) => {
    if (errs.length) { console.error(`FAIL ${id}: ${errs[0]}`); process.exit(1); }
    const png = path.join(tmp, `${id}.png`); await page.screenshot({ path: png });
    const r = spawnSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGB')\nim.save(sys.argv[2],'WEBP',quality=74,method=6)\nim.resize((640,400),Image.LANCZOS).save(sys.argv[3],'WEBP',quality=76,method=6)`, png, path.join(out, `${id}-1280.webp`), path.join(out, `${id}-640.webp`)], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    const files = Object.fromEntries([`${id}-1280.webp`, `${id}-640.webp`].map((f) => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex')]));
    const s = INTAKE_SHOTS.find((x) => x.id === id);
    prov.captures[id] = { route, step: s.step, shows: s.what, perspective: 'employee', viewport: '1280x800', colorScheme: 'dark', reducedMotion: true, commit, capturedAt: new Date().toISOString(), data: 'synthetic demonstration data', width: 1280, height: 800, files };
    console.log(`captured ${id} (${s.step}) ${Object.keys(files).map((f) => `${f} ${fs.statSync(path.join(out, f)).size} B`).join(', ')}`);
  };
  try {
    // the new-room request, front door to received
    await page.goto(base + '#/request', { waitUntil: 'networkidle' }); await settle(700);
    await page.fill('[data-testid=ik-describe-text]', 'We need a new meeting room for eight people on the third floor, with remote colleagues joining on video'); await page.click('[data-testid=ik-describe-go]'); await page.waitForTimeout(400);
    await shot('intake-1', '#/request');
    await page.click('[data-testid=ik-reading-start]'); await settle(500); await shot('intake-2', '#/request/new?draft=…&step=what');
    await page.click('[data-testid=ik-next]'); await page.waitForTimeout(300); await page.selectOption('[data-testid=rq-building]', 'ATL'); await page.selectOption('[data-testid=rq-floor]', '3'); await page.fill('[data-testid=ik-place-name]', 'Level 3 project room'); await page.waitForTimeout(400);
    await at('.ik-step__h'); await shot('intake-3', '#/request/new?draft=…&step=where');
    await page.click('[data-testid=ik-next]'); await page.waitForTimeout(300); await page.locator('.rq-chips label', { hasText: 'Meetings, with some people joining remotely' }).click(); await page.fill('[data-testid=rq-people]', '8'); await page.waitForTimeout(700);
    await at('.ik-step__h'); await shot('intake-4', '#/request/new?draft=…&step=needs');
    await page.click('[data-testid=ik-next]'); await page.waitForTimeout(400); await at('.ik-step__h'); await shot('intake-5', '#/request/new?draft=…&step=photos');
    await page.click('[data-testid=ik-next]'); await page.waitForTimeout(900); await at('[data-testid=ik-proposed]'); await shot('intake-6', '#/request/new?draft=…&step=review');
    await page.click('[data-testid=rq-send]'); await settle(900); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300); await shot('intake-7', '#/requests/REQ-0001 (received)');
    // a device, from the room in Lite: the one-screen request
    const room = 'R-ATL-4-218';
    await page.goto(base + `#/lite/room/${room}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    const ask = page.locator('[data-testid=lite-ask-room]'); if (await ask.count()) { await ask.first().click(); } else { await page.goto(base + `#/request?room=${room}`); }
    await settle(600); await page.click('[data-testid=rq-kind-replace-device]'); await page.waitForTimeout(300);
    const first = await page.locator('[data-testid=rq-position] option').nth(1).getAttribute('value'); await page.selectOption('[data-testid=rq-position]', first || ''); await page.waitForTimeout(300);
    await page.fill('[data-testid=rq-need]', 'The camera loses focus on the far end of the table during calls.'); await page.waitForTimeout(500); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    await shot('intake-8', `#/request?room=${room} (replace a device)`);
    await page.click('[data-testid=rq-send]'); await page.waitForTimeout(700); const id = await page.evaluate(() => document.querySelector('[data-testid=rq-sent]')?.dataset.id);
    await page.goto(base + `#/requests/${id}`); await settle(700); await shot('intake-9', `#/requests/${id}`);
  } finally { await browser.close(); srv.close(); }
  fs.writeFileSync(provPath, JSON.stringify(prov, null, 1) + '\n');
}
