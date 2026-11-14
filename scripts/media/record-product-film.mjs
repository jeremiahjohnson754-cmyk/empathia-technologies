#!/usr/bin/env node
// A product demonstration film, recorded from the demonstration itself (founder, 13 Nov 2026: "30-45 seconds demonstration videos of all
// the products on their pages ... workflows and drill ups and drilldowns ... and it's verified"). Each film is a script of steps run by a
// real browser on the built demonstration: every step does one thing a person would do and then WAITS FOR ITS PROOF (the page state the
// step must produce). A step whose proof does not appear stops the recording, so a film exists only if every step it shows worked.
// The words on screen are drawn by the recorder (an overlay above the page), and the same words become the film's WebVTT track.
// Nothing is generated: no voice, no music, no AI imagery. Output, per film, in apps/website/media/<KEY>/ (key P-<product>):
// 720.mp4 (1280×720, H.264, silent), poster.webp, poster.jpg, captions.vtt and RECORDING.json (the steps, their proofs, timings, the
// demonstration build and the hashes).
//   node scripts/media/record-product-film.mjs --product=lite [--dist=apps/demo/dist]
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const FILMS = (await import('./product-films.mjs')).FILMS;
const which = arg('product'); const films = which === 'all' ? Object.keys(FILMS) : [which];
const dist = path.resolve(repo, arg('dist', 'apps/demo/dist')); const port = Number(arg('port', 5791));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const ff = (...a) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...a], { encoding: 'utf8' }); if (r.status) throw new Error(r.stderr); };

const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${port}`], { env: { ...process.env, DEMO_DIST: dist }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const browser = await chromium.launch();
let failed = 0;
try {
  for (const key of films) {
    const F = FILMS[key]; if (!F) { console.error(`no film script for ${key}`); failed++; continue; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `pfilm-${key}-`));
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, colorScheme: 'dark', serviceWorkers: 'block', reducedMotion: 'no-preference', recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
    await ctx.addInitScript((role) => { window.SIGNAL_NOPOP = true; try { localStorage.setItem('empathia.demo.perspective', role); } catch { /* none */ } }, F.role || 'architect');
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const t0 = Date.now(); const log = []; const base = `http://127.0.0.1:${port}/`;
    // the overlay: the step's words, bottom centre, above the page; drawn by the recorder, never part of the product
    const say = async (text) => page.evaluate((t) => {
      let el = document.getElementById('pfilm-cap'); if (!el) { el = document.createElement('div'); el.id = 'pfilm-cap'; el.setAttribute('aria-hidden', 'true');
        Object.assign(el.style, { position: 'fixed', left: '50%', bottom: '86px', transform: 'translateX(-50%)', zIndex: 2147483647, maxWidth: '86%', padding: '10px 18px', borderRadius: '12px', background: 'rgba(8,10,14,.86)', color: '#f4f6f8', font: '600 22px/1.3 Inter, system-ui, sans-serif', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.4)', pointerEvents: 'none' }); document.body.appendChild(el); }
      el.textContent = t; el.style.display = t ? 'block' : 'none';
    }, text);
    const label = async () => page.evaluate((t) => { let el = document.getElementById('pfilm-label'); if (!el) { el = document.createElement('div'); el.id = 'pfilm-label'; el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, { position: 'fixed', right: '14px', top: '10px', zIndex: 2147483647, padding: '4px 10px', borderRadius: '6px', background: 'rgba(8,10,14,.8)', color: '#cfd6dd', font: '600 12px/1.2 Inter, system-ui, sans-serif', letterSpacing: '.04em', pointerEvents: 'none' }); document.body.appendChild(el); } el.textContent = t; }, F.label);
    try {
      await page.goto(base + F.start); await page.waitForSelector(F.startProof, { timeout: 15000 }); await page.waitForTimeout(600);
      const tStart = Date.now();
      for (const s of F.steps) {
        const at = (Date.now() - tStart) / 1000;
        if (s.do) await say('');   // the last step's words leave as this step's action begins, so words never sit over the wrong screen
        try { if (s.do) await s.do(page); if (s.proof) await page.waitForSelector(s.proof, { timeout: 12000, state: s.state || 'visible' }); }
        catch (e) { await page.screenshot({ path: path.join(tmp, '..', `pfilm-${key}-failed.png`) }).catch(() => undefined); throw new Error(`step "${s.say}" (${s.proof || 'no proof'}): ${e.message.split('\n')[0]}`); }
        if (s.check) { const ok = await s.check(page); if (!ok) throw new Error(`step "${s.say}": its check failed`); }
        await say(s.say);
        await page.waitForTimeout(s.hold ?? F.hold ?? 2600);
        log.push({ at: Number(at.toFixed(2)), until: Number(((Date.now() - tStart) / 1000).toFixed(2)), say: s.say, proof: s.proof || null, url: page.url().replace(base, '/') });
      }
      if (errs.length) throw new Error(`page error during the recording: ${errs[0]}`);
      const lead = (Date.now() - t0 - (Date.now() - tStart)) / 1000;   // the loading before the first step is cut from the film
      await ctx.close(); const webm = fs.readdirSync(tmp).find((f) => f.endsWith('.webm'));
      const out = path.join(repo, 'apps/website/media', key); fs.mkdirSync(out, { recursive: true });
      const dur = log.at(-1).until;
      ff('-ss', lead.toFixed(2), '-i', path.join(tmp, webm), '-t', dur.toFixed(2), '-an', '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '2200k', '-bufsize', '4400k', '-profile:v', 'high', '-movflags', '+faststart', path.join(out, '720.mp4'));
      const pAt = String(F.posterAt ?? Math.min(dur - 0.5, log[Math.min(3, log.length - 1)].at + 1.5));
      ff('-ss', pAt, '-i', path.join(out, '720.mp4'), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', path.join(out, 'poster.webp'));
      ff('-ss', pAt, '-i', path.join(out, '720.mp4'), '-frames:v', '1', '-q:v', '3', path.join(out, 'poster.jpg'));
      const ts = (x) => { const m = Math.floor(x / 60); return `00:${String(m).padStart(2, '0')}:${(x - m * 60).toFixed(3).padStart(6, '0')}`; };
      const vtt = ['WEBVTT', '', 'NOTE', `Captions of "${F.title}". The film is silent: these are the words shown on screen, one per step, written by the recorder`, '(scripts/media/record-product-film.mjs) above the demonstration; each step was verified by its proof before its words appeared.', '',
        ...log.flatMap((l, i) => [String(i + 1), `${ts(l.at)} --> ${ts(Math.min(dur, l.until))}`, l.say, ''])].join('\n');
      fs.writeFileSync(path.join(out, 'captions.vtt'), vtt);
      const build = fs.existsSync(path.join(dist, 'BUILD_MANIFEST.json')) ? JSON.parse(fs.readFileSync(path.join(dist, 'BUILD_MANIFEST.json'), 'utf8')) : null;
      const files = Object.fromEntries(['720.mp4', 'poster.webp', 'poster.jpg', 'captions.vtt'].map((f) => [f, { bytes: fs.statSync(path.join(out, f)).size, sha256: sha(path.join(out, f)) }]));
      fs.writeFileSync(path.join(out, 'RECORDING.json'), JSON.stringify({ key, title: F.title, product: F.product, recordedAt: new Date().toISOString(), duration: dur, viewport: '1280x720', colorScheme: 'dark', data: 'synthetic demonstration data', role: F.role || 'architect',
        demoBuild: build ? { commit: build.commit || build.git?.commit || null, builtAt: build.builtAt || build.at || null } : null, git: spawnSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), steps: log, files }, null, 2) + '\n');
      console.log(`${key}: ${dur.toFixed(1)} s, ${log.length} steps, all proofs met · 720.mp4 ${(files['720.mp4'].bytes / 1048576).toFixed(1)} MB`);
      if (dur < 30 || dur > 45) { console.error(`${key}: ${dur.toFixed(1)} s is outside 30–45 s`); failed++; }
    } catch (e) { failed++; console.error(`${key}: NOT RECORDED — ${e.message.split('\n')[0]}`); await ctx.close().catch(() => undefined); }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
} finally { await browser.close(); srv.kill(); }
process.exit(failed ? 1 : 0);
