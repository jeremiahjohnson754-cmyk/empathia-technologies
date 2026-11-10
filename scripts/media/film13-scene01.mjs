#!/usr/bin/env node
/**
 * Film 13, continuity-validation scene 01 "Held" (docs/media/film-13/SCENE_01_CONTINUITY.md): a 27-second screen recording of the BUILT
 * demonstration, driven shot by shot. Nothing is generated or composited: what is recorded is what the product does. The only thing
 * added for the recording is a pointer dot, because a headless browser draws no cursor.
 *   node scripts/media/film13-scene01.mjs            → .local/media/film-13/scene-01/{scene-01.mp4, scene-01.vtt, poster.jpg, frames/, QC.json}
 *   node scripts/media/film13-scene01-qc.mjs --measure → the QC record (docs/media/film-13/SCENE_01_QC.md)
 * The output stays outside git (the founder reviews it first; V18-FILM-07). Needs: node scripts/build.mjs, ffmpeg.
 */
import { spawn, spawnSync } from 'node:child_process'; import fs from 'node:fs'; import net from 'node:net'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const out = path.join(repo, '.local/media/film-13/scene-01'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'frames'), { recursive: true });
const port = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', r); setTimeout(r, 2500); });
const W = 1920, H = 1080; const REPORT = 'SIM-REPORT-2026-11-08-001';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'no-preference', recordVideo: { dir: out, size: { width: W, height: H } } });
await ctx.addInitScript(() => {
  try { localStorage.setItem('empathia.demo.perspective', 'cxeng'); localStorage.setItem('empathia.theme', 'dark'); localStorage.removeItem('empathia.demo.dossier.v1'); } catch { /* */ }
  addEventListener('DOMContentLoaded', () => { const d = document.createElement('div'); d.id = '__ptr'; d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;z-index:2147483647;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 0 0 2px rgba(0,0,0,.45);pointer-events:none;transform:translate(960px,540px);transition:transform .05s linear';
    document.documentElement.appendChild(d); addEventListener('mousemove', (e) => { d.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true); });
});
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const t0 = Date.now(); const marks = []; const mark = (shot) => marks.push({ shot, at: (Date.now() - t0) / 1000 });
const until = async (sec) => { const ms = sec * 1000 - (Date.now() - t0); if (ms > 0) await page.waitForTimeout(ms); };
const glide = async (sel) => { const b = await page.locator(sel).first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); };
const PLAN = [0, 5, 10, 17, 23]; const END = 27;   // seconds: the five shots and the end of the scene, as the product actually paces
const frame = async (name) => page.screenshot({ path: path.join(out, 'frames', `${name}.png`) });

// lead-in (trimmed off): load the hub so the first frame of the scene is settled
await page.goto(`http://127.0.0.1:${port}/#/scan`); await page.waitForSelector('[data-testid=scan-input]'); await page.waitForTimeout(1500);
const lead = (Date.now() - t0) / 1000; const T = (s) => lead + s;
const log = []; const lap = (k) => log.push([k, +(((Date.now() - t0) / 1000) - lead).toFixed(2)]);
// shot 1 · one label
mark(1); await glide('[data-testid=scan-input]'); await page.click('[data-testid=scan-input]'); await page.waitForTimeout(250);
await page.keyboard.type('SIM-AV-0042', { delay: 95 }); await page.waitForTimeout(500); await frame('shot-1'); await glide('[data-testid=scan-go]'); lap('typed'); await until(T(PLAN[1] - 0.3)); await page.click('[data-testid=scan-go]');
// shot 2 · one record
await page.waitForSelector('[data-testid=scan-passport]'); await until(T(PLAN[1])); mark(2); await glide('[data-testid=scan-evidence]'); await page.waitForTimeout(1000); await glide('[data-testid=scan-acceptance]'); await page.waitForTimeout(900); await frame('shot-2');
await glide('[data-action="scan.openTest"]'); lap('passport read'); await until(T(PLAN[2] - 0.3)); await page.click('[data-action="scan.openTest"]');
// shot 3 · 27 / 3 / 2
await page.waitForSelector('[data-testid=dossier-blockers]'); await until(T(PLAN[2])); mark(3); await glide('[data-testid=dossier-pass]'); await page.waitForTimeout(800); await glide('[data-testid=dossier-pending]'); await page.waitForTimeout(700); await glide('[data-testid=dossier-fail]'); await page.waitForTimeout(800); await frame('shot-3');
await glide('[data-testid=dossier-blockers]'); lap('totals read'); await until(T(PLAN[3] - 3.2));
// shot 4 · the answer is no (viewing as the Service Manager, who may record acceptance and is refused by the rule, not by the role)
await page.selectOption('.persp select', 'svcmgr'); await page.waitForSelector('[data-testid=dossier-accept]', { timeout: 10000 }); lap('role switched'); await until(T(PLAN[3])); mark(4); await glide('[data-testid=dossier-accept]'); await page.waitForTimeout(900); await page.click('[data-testid=dossier-accept]');
await page.waitForSelector('[data-testid=dossier-refusal]'); await page.waitForTimeout(900); await frame('shot-4'); lap('refused');
// shot 5 · hold
await until(T(PLAN[4])); mark(5); await page.mouse.move(W - 240, H - 200, { steps: 14 }); await until(T(END - 0.5)); await frame('shot-5');
const facts = await page.evaluate(() => ({ refusal: document.querySelector('[data-testid=dossier-refusal]')?.innerText || '', acceptance: document.querySelector('[data-testid=dossier]')?.getAttribute('data-acceptance'), pass: document.querySelector('[data-testid=dossier-pass]')?.innerText.replace(/\s+/g, ' '), synthetic: /Synthetic data/.test(document.body.innerText), role: document.documentElement.dataset.role }));
await until(T(END + 0.6)); const end = (Date.now() - t0) / 1000;
const video = await page.video().path(); await ctx.close(); await browser.close(); srv.kill();

// cut the 24 seconds, encode for the web (H.264, yuv420p, 30 fps, faststart); no audio track: the narration is not recorded yet
const mp4 = path.join(out, 'scene-01.mp4');
const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', lead.toFixed(3), '-i', video, '-t', String(END), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-movflags', '+faststart', '-an', mp4], { encoding: 'utf8' });
spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(PLAN[3] + 3.5), '-i', mp4, '-frames:v', '1', '-q:v', '3', path.join(out, 'poster.jpg')]);
// captions: the committed file, timed to the recorded voice and checked by scripts/media/film13-scene01-qc.mjs (one source, never retyped here)
fs.copyFileSync(path.join(repo, 'docs/media/film-13/scene-01.vtt'), path.join(out, 'scene-01.vtt'));
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,pix_fmt,r_frame_rate,width,height:format=duration,size', '-of', 'json', mp4], { encoding: 'utf8' });
const info = probe.status === 0 ? JSON.parse(probe.stdout) : null; const v = info?.streams?.[0];
const shots = marks.map((m) => ({ shot: m.shot, starts: +(m.at - lead).toFixed(2) })); const plan = PLAN;
const qc = {
  made_at: new Date().toISOString(), file: path.relative(repo, mp4), media_state: 'PILOT, NOT APPROVED', narration: 'NOT RECORDED (no audio track)', source: 'screen recording of apps/demo/dist; a pointer dot is the only addition',
  checks: {
    encoded: ff.status === 0 && !!v, h264_yuv420p_30fps_1080p: !!v && v.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.r_frame_rate === '30/1' && v.width === W && v.height === H,
    duration_as_planned: !!info && Math.abs(Number(info.format.duration) - END) < 0.2, shots_on_time_within_0_4s: shots.every((s, i) => Math.abs(s.starts - plan[i]) <= 0.4),
    refusal_text: /Acceptance stays held: 7 blockers stand/.test(facts.refusal), still_held: facts.acceptance === 'HELD', totals_27: /^Pass 27/.test(facts.pass || ''), synthetic_chip: facts.synthetic, role_is_service_manager_at_refusal: facts.role === 'svcmgr', no_console_error: errs.length === 0,
  },
  shots, facts, recorded_seconds: +(end - lead).toFixed(2), bytes: info ? Number(info.format.size) : 0, errors: errs.slice(0, 5),
};
qc.all_pass = Object.values(qc.checks).every(Boolean);
fs.writeFileSync(path.join(out, 'QC.json'), JSON.stringify(qc, null, 1)); fs.rmSync(video, { force: true });
qc.laps = log; fs.writeFileSync(path.join(out, 'QC.json'), JSON.stringify(qc, null, 1));
console.log(JSON.stringify({ all_pass: qc.all_pass, failed: Object.entries(qc.checks).filter(([, v]) => !v).map(([k]) => k), shots, laps: log, bytes: qc.bytes })); process.exit(qc.all_pass ? 0 : 1);
