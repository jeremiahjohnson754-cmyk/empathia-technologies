#!/usr/bin/env node
// Captures of the three Experiences for the website (dark, reduced motion, 1280 × 800: the D43 rules of the other product captures).
// Builds nothing: run `node apps/demo/build.mjs` first. Serves apps/demo/dist, opens each experience in a state that shows it, writes
// <id>-1280.webp and <id>-640.webp into apps/website/media/product and records them, with their SHA-256, the route, the commit and the
// time, in that folder's PROVENANCE.json (the website build admits only files whose hashes match). Synthetic demonstration data only.
//   node scripts/media/capture-experiences.mjs
import { execFileSync, spawn } from 'node:child_process'; import crypto from 'node:crypto'; import fs from 'node:fs'; import net from 'node:net'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const out = path.join(repo, 'apps/website/media/product'); const provFile = path.join(out, 'PROVENANCE.json'); const prov = JSON.parse(fs.readFileSync(provFile, 'utf8'));
const port = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] }); await new Promise((r) => { srv.stdout.on('data', r); setTimeout(r, 2500); });
const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
// `?detail=full`: product pictures are taken at full drawing detail whatever the capturing machine's pace (play/gl.ts, DetailGovernor).
const SHOTS = [
  { id: 'exp-campus', route: '#/play/campus?detail=full', store: { 'empathia.campuslife.v1': JSON.stringify({ v: 1, x: 10.6, z: -33.5, yaw: Math.PI, camYaw: Math.PI * 1.15, xp: 25, stage: 'inside', cards: [], door: true, at: '2026-11-18T00:00:00Z' }) } },
  { id: 'exp-stadium', route: '#/play/stadium?detail=full', store: { 'empathia.stadiumlive.v1': JSON.stringify({ atmos: 'live', view: 'orbit', overlay: 'none', ops: false, look: 'neutral', ribbon: '#0E8F83', layers: { crowd: 0.7, pa: 0.4, commentary: 0.4 }, master: 0.5, mix: 'spectator' }) } },
  { id: 'exp-expo', route: '#/play/expo?detail=full', store: {}, after: async (p) => { await p.getByTestId('xpo-plan-E1').click(); await p.waitForTimeout(2500); } },
];
const browser = await chromium.launch();
for (const s of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.addInitScript((st) => { try { localStorage.setItem('empathia.demo.perspective', 'architect'); for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); } catch { /* none */ } }, s.store);
  const p = await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/${s.route}`); await p.waitForSelector('[data-ready=true]', { timeout: 30000 }); await p.waitForTimeout(3500); if (s.after) await s.after(p);
  const png = path.join(out, `${s.id}.png`); await p.screenshot({ path: png }); await ctx.close();
  execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGB")\nim.save(sys.argv[2],"WEBP",quality=74,method=6)\nim.resize((640,round(640*im.height/im.width)),Image.LANCZOS).save(sys.argv[3],"WEBP",quality=80,method=6)', png, path.join(out, `${s.id}-1280.webp`), path.join(out, `${s.id}-640.webp`)]);
  fs.unlinkSync(png); const files = {}; for (const f of [`${s.id}-1280.webp`, `${s.id}-640.webp`]) files[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex');
  prov.captures[s.id] = { route: s.route, viewport: '1280x800', colorScheme: 'dark', reducedMotion: true, commit, capturedAt: new Date().toISOString(), data: 'synthetic demonstration data', venues: 'fictional', width: 1280, height: 800, files };
  console.log(s.id, Object.keys(files).join(' '));
}
await browser.close(); srv.kill(); fs.writeFileSync(provFile, JSON.stringify(prov, null, 1) + '\n');
