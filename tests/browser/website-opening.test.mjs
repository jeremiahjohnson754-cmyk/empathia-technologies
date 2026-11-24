#!/usr/bin/env node
// The home page's opening (founder directive 18 Nov 2026 17:25 §4), served by the site's own server from the built dist:
// - the promise is the founder's headline, "Technology. Space. Intelligence. Experience. Connected.", with two actions (the 90-1 rule:
//   one promise, at most two actions on the first screen): Experience the platform, Watch the film; Explore Empathia and Discover
//   FieldLink are the next thing under it;
// - the sequence is six element captures of the demonstration (room, its systems, floor, building, campus, estate), each listed by name
//   and hash in media/hero/PROVENANCE.json; it plays once, can be paused, ends on the estate, and its level names step through it;
// - with reduced motion nothing moves and the room is shown; the film moved under the hero keeps its captions and links its transcript;
// - phone and desktop: no sideways scroll; no console error (CSP intact), nothing off the site.
//   node tests/browser/website-opening.test.mjs   (PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs … for dark)
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { evidencePath } from '../lib/evidence.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const scheme = process.env.PW_COLOR_SCHEME || 'light';
const dist = path.join(repo, 'apps/website/dist'); const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'BUILD_MANIFEST.json'), 'utf8'));
const PORT = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
let failed = 0; const results = [];
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ` — ${String(detail).slice(0, 300)}`}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`; const browser = await chromium.launch();
const watch = (page, errs, ext) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) ext.push(r.url()); }); };
const frames = (p) => p.evaluate(() => [...document.querySelectorAll('.seq__f')].map((f) => ({ op: +getComputedStyle(f).opacity, on: f.classList.contains('is-on') })));
try {
  const prov = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/media/hero/PROVENANCE.json'), 'utf8')).frames;
  const ids = Object.keys(prov); const bad = [];
  for (const [id, f] of Object.entries(prov)) { if (!/^#\//.test(f.route) || !/^\[data-testid=/.test(f.element) || f.data !== 'synthetic demonstration data' || !f.commit) bad.push(`${id}: provenance`); for (const [x, h] of Object.entries(f.files)) { const p = path.join(dist, 'media/hero', x); if (!fs.existsSync(p) || crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== h) bad.push(`${id}: ${x}`); } }
  ok('OP-01', 'six frames — room, its systems, floor, building, campus, estate — each an element capture of a named demonstration address, shipped unchanged', ids.join() === 'room,overlays,floor,building,campus,estate' && !bad.length, bad.join(' | ') || ids.join());
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'no-preference' }); const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext);
    await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(500);
    const top = await page.evaluate(() => { const hero = document.querySelector('.hero--home'); return { label: hero.querySelector('.label')?.textContent, h1: hero.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim(), acts: [...hero.querySelectorAll('.actions a.btn')].map((a) => [a.textContent, a.getAttribute('href')]), doors: [...document.querySelectorAll('nav.doors a')].map((a) => [a.textContent, a.getAttribute('href')]), film: !!document.getElementById('film-M2') }; });
    ok(`OP-${tag}-02`, 'the founder’s headline with two actions — Experience the platform (the demonstration) and Watch the film (the film just under) — and Explore Empathia and Discover FieldLink right after', top.label === 'Empathia Technologies' && top.h1 === 'Technology. Space. Intelligence. Experience. Connected.' && top.acts.length === 2 && top.acts[0][0] === 'Experience the platform' && top.acts[0][1].startsWith(manifest.demoUrl) && top.acts[1][0] === 'Watch the film' && top.acts[1][1] === '#film-M2' && top.film && JSON.stringify(top.doors) === JSON.stringify([['Explore Empathia', '/platform'], ['Discover FieldLink', '/fieldlink']]), JSON.stringify(top));
    const imgs = await page.evaluate(() => Promise.all([...document.querySelectorAll('.seq__f img')].map(async (i) => { await i.decode().catch(() => {}); return { w: i.naturalWidth, src: i.currentSrc }; })));
    ok(`OP-${tag}-03`, 'all six frames load from the site', imgs.length === 6 && imgs.every((i) => i.w === 1200 && i.src.startsWith(base + '/media/hero/')), JSON.stringify(imgs));
    const f0 = await frames(page); const steps0 = await page.evaluate(() => ({ btns: document.querySelectorAll('.seq__steps button').length, on: document.querySelector('.seq__steps li.is-on')?.textContent, pause: (() => { const b = document.querySelector('.seq__pause'); const r = b?.getBoundingClientRect(); return b && !b.hidden ? Math.round(r.height) : 0; })() }));
    ok(`OP-${tag}-04`, 'it opens on the room, the level names are buttons with "A room" marked, and a Pause button (44 px) is offered', f0[0].op === 1 && f0.slice(1).every((f) => f.op < 0.05) && steps0.btns === 6 && steps0.on === 'A room' && steps0.pause >= 44, JSON.stringify({ f0, steps0 }));
    await page.click('.seq__pause'); const paused = await page.evaluate(() => ({ cls: document.querySelector('.seq').classList.contains('seq--paused'), text: document.querySelector('.seq__pause').textContent, states: [...new Set(document.getAnimations().filter((a) => a.effect?.target?.closest?.('.seq')).map((a) => a.playState))] }));
    ok(`OP-${tag}-05`, 'Pause stops every movement in it, and the button then offers Play', paused.cls && paused.text === 'Play' && paused.states.length && paused.states.every((s) => s === 'paused'), JSON.stringify(paused));
    await page.click('.seq__pause');
    // run it to its end without waiting twenty seconds: every animation in the sequence jumps to its finish, as time would take it
    await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.seq')).forEach((a) => a.finish())); await page.waitForTimeout(400);
    const end = await page.evaluate(() => ({ on: document.querySelector('.seq__steps li.is-on')?.textContent, last: document.querySelector('.seq__f:last-child').classList.contains('is-on'), pause: document.querySelector('.seq__pause').hidden }));
    ok(`OP-${tag}-06`, 'it plays once and rests on the estate, with nothing left to pause', end.on === 'The estate' && end.last && end.pause, JSON.stringify(end));
    await page.click('.seq__steps li:nth-child(3) button'); await page.waitForTimeout(500);
    const pick = await frames(page); const pressed = await page.evaluate(() => [...document.querySelectorAll('.seq__steps button')].map((b) => b.getAttribute('aria-pressed')));
    ok(`OP-${tag}-07`, 'a level name shows that frame alone (Its floor) and says so', pick[2].on && pick.filter((f) => f.on).length === 1 && pressed.join() === 'false,false,true,false,false,false', JSON.stringify({ pick, pressed }));
    const geo = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, lab: Math.min(...[...document.querySelectorAll('.seq__l')].map((l) => parseFloat(getComputedStyle(l).fontSize))) }));
    ok(`OP-${tag}-08`, 'no sideways scroll; the frame lines are at least 13 px', geo.over <= 0 && geo.lab >= 13, JSON.stringify(geo));
    ok(`OP-${tag}-09`, 'no console error (CSP intact), nothing requested off the site', !errs.length && !ext.length, [...errs, ...ext].join(' | '));
    await ctx.close();
  }
  { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' }); const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ running: document.getAnimations().filter((a) => a.effect?.target?.closest?.('.seq') && a.playState === 'running').length, shown: [...document.querySelectorAll('.seq__f')].map((f) => +getComputedStyle(f).opacity), pause: !!document.querySelector('.seq__pause:not([hidden])'), on: document.querySelector('.seq__steps li.is-on')?.textContent }));
    ok('OP-10', 'with reduced motion nothing moves: the room is shown, the levels are steps, no Pause is needed', r.running === 0 && r.shown[0] === 1 && r.shown.slice(1).every((o) => o === 0) && !r.pause && r.on === 'A room', JSON.stringify(r)); await ctx.close(); }
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme }); const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    const f = await page.evaluate(() => { const fig = document.getElementById('film-M2'); return { track: !!fig?.querySelector('track[kind=captions]'), preload: fig?.querySelector('video')?.getAttribute('preload'), link: fig?.querySelector('figcaption a')?.getAttribute('href'), inHero: !!fig?.closest('.hero') }; });
    await page.goto(base + '/films', { waitUntil: 'load' }); const t = await page.evaluate(() => document.querySelectorAll('#film-M2 .film__transcript p').length);
    ok('OP-11', 'the film sits under the hero, captioned and not preloaded, and links its full transcript on the Films page', f.track && f.preload === 'none' && f.link === '/films#film-M2' && !f.inHero && t > 10, JSON.stringify({ ...f, t })); await ctx.close(); }
} finally {
  await browser.close(); srv.kill();
  const out = evidencePath(`website-opening${scheme === 'dark' ? '-dark' : ''}`); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'RESULTS.json'), JSON.stringify({ suite: 'website-opening', scheme, at: new Date().toISOString(), results }, null, 1));
  console.log(`\n${results.length - failed} passed, ${failed} failed (${scheme})`); process.exit(failed ? 1 : 0);
}
