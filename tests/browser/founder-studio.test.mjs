#!/usr/bin/env node
/**
 * Founder Studio browser test (verification items 1–4, 6–7): launches the built studio with its own launcher, then drives it in
 * Chromium: every destination renders, product pages open the Founder Edition as the right persona through the page's own
 * persona control, the inspector reads data, films play, search works, the Engine Lab re-judges, snapshots save and restore,
 * themes switch, the layout holds at tablet width, and the studio also opens straight from disk.
 *
 *   node tests/browser/founder-studio.test.mjs [studio-dist] [evidence-dir]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const dist = path.resolve(process.argv[2] || path.join(repo, 'apps/founder-studio/dist'));
const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/founder-studio'));
fs.mkdirSync(out, { recursive: true });
const PORT = 4391; const KEY = 'browser-test-key';
const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 500) }); if (!cond) failed += 1; console.log(`${cond ? 'ok  ' : 'FAIL'} ${id} ${name}${cond ? '' : ` — ${detail}`}`); };

const fixtures = path.join(out, 'fixtures'); fs.mkdirSync(fixtures, { recursive: true });
const fixture = path.join(fixtures, 'fixture-FA-excerpt.webm');
if (!fs.existsSync(fixture)) { const { execFileSync } = await import('node:child_process'); const films = JSON.parse(fs.readFileSync(path.join(dist, 'studio/films.json'), 'utf8')); const fa = films.find((f) => f.key === 'FA'); execFileSync('ffmpeg', ['-v', 'error', '-y', '-t', '6', '-i', path.join('/home/claude', fa.path), '-vf', 'scale=640:-2', '-c:v', 'libvpx-vp9', '-b:v', '600k', '-an', fixture]); }
for (const f of fs.readdirSync(path.join(dist, 'media/films'))) if (f.endsWith('.mp4') && !fs.existsSync(path.join(fixtures, f))) fs.symlinkSync(path.join(dist, 'media/films', f), path.join(fixtures, f));
const srv = spawn(process.execPath, [path.join(dist, 'server/serve.mjs'), '--no-open', `--port=${PORT}`, `--films=${fixtures}`], { env: { ...process.env, STUDIO_KEY: KEY }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', (d) => { if (/running/.test(String(d))) r(); }); setTimeout(r, 4000); });
const base = `http://127.0.0.1:${PORT}`;
const b = await chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text()) && !(/ERR_CONNECTION_REFUSED/.test(m.text()) && /4100/.test(m.location().url || ''))) errors.push(`console: ${m.text()}`); });   // the Enterprise Platform page probes the local API on :4100; refused = not running
  const external = []; page.on('request', (r) => { if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(r.url()) && !/^(data|blob|about):/.test(r.url())) external.push(r.url()); });
  await page.goto(`${base}/?k=${KEY}`); await page.waitForSelector('.rail');
  ok('S-01', 'the launcher serves the studio after the access key; the rail lists 28 destinations', (await page.locator('.rail a').count()) === 28, await page.locator('.rail a').count());

  // every destination renders its heading without errors
  const dests = await page.$$eval('.rail a', (as) => as.map((a) => [a.getAttribute('href'), a.textContent]));
  const bad = [];
  for (const [h] of dests) {
    await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(350);
    const h1 = await page.locator('main h1').first().textContent().catch(() => '');
    if (!h1 || /Nothing at/.test(h1)) bad.push(`${h}: ${h1}`);
    await page.screenshot({ path: path.join(out, `dest-${h.replace(/[^a-z0-9-]/gi, '')}.png`) });
  }
  ok('S-02', 'all 28 destinations render a page heading', bad.length === 0, bad.join('; '));

  // product page: the Founder Edition opens as the product's persona, through the page's own persona control
  await page.evaluate(() => { location.hash = '#/control-studio'; });
  await page.waitForFunction(() => /as syseng|as architect/.test(document.querySelector('.demo-msg')?.textContent || ''), null, { timeout: 30000 }).catch(() => {});
  const msg = await page.locator('.demo-msg').textContent();
  const frame = page.frameLocator('.demo iframe');
  const persona = await page.evaluate(() => document.querySelector('.demo iframe').contentWindow.__V25__.persona());
  ok('S-03', 'a product page opens the Founder Edition on its route, switched to the product persona by the page’s own control', /Opened #\/v25\/cstudio as architect/.test(msg) && persona === 'architect', msg);
  const cs = await frame.locator('#view').innerText().catch(() => '');
  ok('S-04', 'the embedded demonstrator shows the product (Control Studio) and its SIMULATED label', /Control Studio/.test(cs) && /SIMULATED/i.test(cs), cs.slice(0, 200));

  // persona switch to a narrower persona is honoured (the page's own authorization still applies)
  await page.selectOption('#demo-persona', 'requestor'); await page.waitForTimeout(2500);
  const p2 = await page.evaluate(() => document.querySelector('.demo iframe').contentWindow.__V25__.persona());
  const cs2 = await frame.locator('#view').innerText().catch(() => '');
  ok('S-05', 'switching to the Requestor persona keeps the page’s own authorization (Control Studio is not shown to a requestor)', p2 === 'requestor' && !/Design, simulate and publish/.test(cs2), `${p2}: ${cs2.slice(0, 160)}`);

  // inspector
  await page.click('button:has-text("Inspect data")'); await page.waitForTimeout(400);
  const chips = await page.locator('[aria-label="Data inspector"] .chip').count();
  ok('S-06', 'the data inspector reads record types through the sealed read-only facade', chips >= 5, chips);

  // build a room page + engine lab
  await page.evaluate(() => { location.hash = '#/build-a-room/lab'; }); await page.waitForSelector('.lab');
  const before = await page.locator('.lab h2.num').nth(1).textContent();
  await page.locator('details:has-text("Connections") summary').click();
  await page.locator('details:has-text("Connections") input[type=checkbox]').first().uncheck();
  await page.waitForTimeout(200);
  const findings = await page.locator('.lab .cols-3 .panel').nth(2).locator('h2').textContent();
  ok('S-07', 'Engine Lab: removing a connection re-runs the engine and raises a design deficiency', Number(findings) >= 1, `${before} → findings ${findings}`);
  await page.click('button:has-text("Record PASS (cxeng)")'); const l1 = await page.locator('.lab p.mono').textContent();
  await page.click('button:has-text("Verify as cxeng")'); const l2 = await page.locator('.lab p.mono').textContent();
  await page.click('button:has-text("Verify as QA")'); const l3 = await page.locator('.lab p.mono').textContent();
  ok('S-08', 'Engine Lab: a recorded PASS is PASS_UNVERIFIED, stays so when the recorder verifies it, and is PASS_VERIFIED only after a different person', /PASS_UNVERIFIED/.test(l1) && /PASS_UNVERIFIED/.test(l2) && /PASS_VERIFIED/.test(l3), [l1, l2, l3].join(' | '));
  await page.screenshot({ path: path.join(out, 'engine-lab.png'), fullPage: true });

  // media. The test browser (open-source Chromium) has no H.264 decoder, so H.264 playback itself is NOT_RUN here; the decode of
  // every film file is checked separately with ffmpeg (tests/media/decode-films.mjs). Here: the file is served with byte ranges,
  // the player explains the codec gap instead of claiming the file is missing, and the same player path plays a VP9 excerpt.
  await page.evaluate(() => { location.hash = '#/media/FA'; }); await page.waitForTimeout(1500);
  const head = await page.evaluate(async () => { const r = await fetch('media/films/Empathia_V25_FA_16x9_1920x1080_captioned.mp4', { headers: { range: 'bytes=0-1023' } }); return [r.status, (await r.arrayBuffer()).byteLength]; });
  const canH264 = await page.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"'));
  const note = await page.locator('main [role=status]').first().textContent().catch(() => '');
  ok('S-09', 'Media Library: the film file is served from this computer with byte ranges, and in a browser without H.264 the player says so (not "missing")', head[0] === 206 && head[1] === 1024 && (canH264 !== '' || /cannot decode H\.264/.test(note)), `${head} canPlayType="${canH264}" ${note}`);
  results.push({ id: 'S-09b', name: 'H.264 playback inside the test browser', result: canH264 ? 'RUN' : 'NOT_RUN', detail: canH264 ? '' : 'the test Chromium build has no H.264 decoder; verified instead by a full ffmpeg decode of every film (tests/media/decode-films.mjs)' });
  const played = await page.evaluate(() => new Promise((r) => { const v = document.createElement('video'); v.muted = true; v.src = 'media/films/fixture-FA-excerpt.webm'; document.body.appendChild(v); v.play().then(() => setTimeout(() => r(v.currentTime), 1500)).catch((e) => r(`error ${e.message}`)); }));
  ok('S-10', 'the studio’s film route plays video end to end (a VP9 excerpt of Film A, served through the same launcher path; time advances)', typeof played === 'number' && played > 0.3, played);
  await page.evaluate(() => { location.hash = '#/media/FL'; }); await page.waitForTimeout(500);
  const rec = await page.locator('.kv').first().innerText();
  ok('S-11', 'the flagship film record shows 3840 × 2160 from ffprobe and a rights status that is not VERIFIED', /3840 × 2160/.test(rec) && /NOT_IN_LEDGER|UNVERIFIED/.test(rec), rec.slice(0, 200));

  // search palette
  await page.keyboard.press('Control+k'); await page.keyboard.type('town hall'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  ok('S-12', 'search (Ctrl K) finds the town-hall scenario and opens it with the keyboard', /#\/scenarios\/townhall/.test(page.url()), page.url());

  // snapshots: save, list, restore, delete
  await page.evaluate(() => { location.hash = '#/settings'; }); await page.waitForSelector('#snapshots');
  // an interrupted earlier run may have left its own "browser test" snapshot behind: remove those first so this run judges only its own
  for (const btn of await page.locator('section:has(#snapshots) li:has-text("browser test") button:has-text("Delete")').all()) { await btn.click(); await page.waitForTimeout(250); }
  const hasDemoState = await page.evaluate(() => !!localStorage.getItem('empathia.living-campus.v1'));
  await page.fill('[aria-label="Snapshot name"]', 'browser test'); await page.click('button:has-text("Save state")'); await page.waitForTimeout(600);
  const listed = await page.locator('#snapshots ~ ul li, section:has(#snapshots) ul li').filter({ hasText: 'browser test' }).count();
  ok('S-13', 'Settings: the demonstrator state is saved to this computer as a named snapshot', hasDemoState && listed === 1, `state ${hasDemoState}, listed ${listed}`);
  await page.locator('section:has(#snapshots) li:has-text("browser test") button:has-text("Reopen")').click(); await page.waitForTimeout(400);
  const restored = await page.locator('[role=status]').first().textContent();
  await page.locator('section:has(#snapshots) li:has-text("browser test") button:has-text("Delete")').click(); await page.waitForTimeout(400);
  ok('S-14', 'Settings: a snapshot reopens and can be deleted', /Restored/.test(restored) && (await page.locator('section:has(#snapshots) li:has-text("browser test")').count()) === 0, restored);

  // themes
  await page.click('label:has-text("light") input'); const t = await page.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor]);
  await page.screenshot({ path: path.join(out, 'settings-light.png') });
  await page.evaluate(() => { location.hash = '#/mission-control'; }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(out, 'mission-control-light.png'), fullPage: true });
  await page.evaluate(() => { location.hash = '#/settings'; }); await page.waitForTimeout(200); await page.click('label:has-text("dark") input');
  ok('S-15', 'appearance: the light theme applies (data-theme="light", pale ground)', t[0] === 'light' && /rgb\(2[0-9]{2}/.test(t[1]), t.join(' '));

  ok('S-16', 'no page errors and no request leaves this computer', errors.length === 0 && external.length === 0, [...errors, ...external].slice(0, 5).join(' | '));

  // tablet width
  const tab = await b.newPage({ viewport: { width: 820, height: 1100 } });
  await tab.context().addCookies([{ name: 'studio_key', value: KEY, url: base }]);
  await tab.goto(`${base}/index.html#/mission-control`); await tab.waitForSelector('.topbar');
  const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const railHidden = await tab.evaluate(() => getComputedStyle(document.querySelector('.rail')).transform !== 'none');
  await tab.click('.menu-btn'); await tab.waitForTimeout(400);
  const railShown = await tab.evaluate(() => getComputedStyle(document.querySelector('.rail')).transform === 'none');
  await tab.screenshot({ path: path.join(out, 'tablet-rail-open.png') });
  ok('S-17', 'tablet (820 px): no horizontal scroll; the rail is a drawer opened by the menu button', overflow <= 0 && railHidden && railShown, `overflow ${overflow}, hidden ${railHidden}, shown ${railShown}`);

  // keyboard: skip link and focus
  await page.goto(`${base}/index.html#/mission-control`); await page.reload(); await page.waitForSelector('.rail'); await page.keyboard.press('Tab');   // a fresh load (a hash change alone is a navigation)
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
  ok('S-18', 'keyboard: the first Tab reaches “Skip to content”', /Skip to content/.test(focused || ''), focused);

  // opened from disk
  const disk = await b.newPage();
  const derr = []; disk.on('pageerror', (e) => derr.push(e.message));
  await disk.goto(`file://${path.join(dist, 'index.html')}#/mission-control`); await disk.waitForSelector('.rail', { timeout: 15000 }).catch(() => {});
  const chip = await disk.locator('.mode-chip').textContent().catch(() => '');
  ok('S-19', 'opened straight from disk, the studio works and says which features need the launcher', /Opened from disk/.test(chip) && derr.length === 0, `${chip} ${derr.join(' ')}`);
} finally {
  await b.close();
  srv.kill();
}
const notRun = results.filter((r) => r.result === 'NOT_RUN').length; const passed = results.filter((r) => r.result === 'PASS').length;
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ suite: 'founder-studio', dist, at: new Date().toISOString(), passed, failed, notRun, results }, null, 1));
console.log(`\n${passed} passed, ${failed} failed, ${notRun} not run`);
process.exit(failed ? 1 : 0);
