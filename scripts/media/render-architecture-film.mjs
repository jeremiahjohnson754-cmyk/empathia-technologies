#!/usr/bin/env node
/**
 * Render the architecture visualization film from the repository's own Mermaid diagrams (directive section 12: produce what the
 * available tools can produce, and verify it). Silent, captioned on screen, no third-party footage, voice, music or fonts.
 *
 *   node scripts/media/render-architecture-film.mjs
 * Output (not committed; regenerate): media/renders/architecture-visualization/
 *   Empathia_Architecture_Visualization_3840x2160.mp4, ..._1920x1080.mp4, slides/*.png, RENDER_MANIFEST.json (hashes + verification)
 * Needs: the global mmdc (Mermaid CLI), Playwright Chromium, ffmpeg/ffprobe.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'media/renders/architecture-visualization');
const slidesDir = path.join(out, 'slides'); fs.mkdirSync(slidesDir, { recursive: true });
const mmdc = ['/home/claude/.npm-global/bin/mmdc', 'mmdc'].find((p) => p === 'mmdc' || fs.existsSync(p));
const D = path.join(root, 'docs/architecture/diagrams');
const SLIDES = [
  { id: '00-title', title: 'How Empathia is built', sub: 'The production starter — one record for the built environment', seconds: 5 },
  { id: '01-system-context', title: 'Who uses it, and what it connects to', sub: 'People, Empathia, and the systems around it', seconds: 8 },
  { id: '02-containers', title: 'The parts that run', sub: 'A TypeScript modular monolith, PostgreSQL, two workers, a React app', seconds: 10 },
  { id: '03-vertical-slice', title: 'The first vertical slice', sub: 'Room → record → device → graph → drawing → plan → issue → service → evidence → read model', seconds: 10 },
  { id: '04-data-model', title: 'One canonical record', sub: 'Tenant-scoped tables, row-level security, append-only evidence', seconds: 8 },
  { id: '05-events', title: 'Every change becomes an event', sub: 'Transactional outbox · retries · dead letter · read models', seconds: 8 },
  { id: '09-integration-flow', title: 'Other systems, on Empathia’s terms', sub: 'One adapter contract · source authority · read-only first · mocks labelled as mocks', seconds: 9 },
  { id: '07-editions-separation', title: 'What each audience receives', sub: 'Investor experience · engineering review · founder source vault — kept apart', seconds: 8 },
  { id: '99-close', title: 'Synthetic data · production starter', sub: 'Not production-ready — the readiness checklist says what remains', seconds: 6 },
];

// 1. diagrams → SVG (dark theme, transparent ground)
const cfg = path.join(out, 'mermaid-config.json');
fs.writeFileSync(cfg, JSON.stringify({ theme: 'dark', themeVariables: { fontFamily: 'DejaVu Sans, sans-serif', fontSize: '16px', primaryColor: '#16233e', primaryTextColor: '#edf3ff', lineColor: '#7f8fae', primaryBorderColor: '#3fd8ff', background: 'transparent' } }));
for (const s of SLIDES) {
  const src = path.join(D, `${s.id}.mmd`);
  if (!fs.existsSync(src)) continue;
  execFileSync(mmdc, ['-i', src, '-o', path.join(slidesDir, `${s.id}.diagram.png`), '-c', cfg, '-b', 'transparent', '-w', '1800', '-s', '2'], { stdio: 'ignore' });
}

// 2. slides → 4224×2376 PNG (10 % larger than 4K, so the film can pan without upscaling)
const { chromium } = await import(path.join(root, 'node_modules/playwright/index.mjs'));
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 2112, height: 1188 }, deviceScaleFactor: 2 });
for (const s of SLIDES) {
  const pngFile = path.join(slidesDir, `${s.id}.diagram.png`);
  const img = fs.existsSync(pngFile) ? `<img alt="" src="data:image/png;base64,${fs.readFileSync(pngFile).toString('base64')}">` : '';
  const card = !img;
  await page.setContent(`<!doctype html><html><head><style>
    html,body{margin:0;width:2112px;height:1188px;background:radial-gradient(1400px 800px at 15% -10%,rgba(63,216,255,.12),transparent),#070d1a;color:#edf3ff;font-family:Inter,ui-sans-serif,system-ui,'Segoe UI',Roboto,sans-serif;overflow:hidden}
    .wrap{position:absolute;inset:96px 132px 88px;display:flex;flex-direction:column;gap:28px}
    h1{margin:0;font-size:${card ? 92 : 54}px;letter-spacing:-.01em;font-weight:700} p{margin:0;color:#aebbd8;font-size:${card ? 36 : 28}px}
    .fig{flex:1;display:flex;align-items:center;justify-content:center;min-height:0} .fig img{max-width:100%;max-height:100%;object-fit:contain}
    .card{justify-content:center} .foot{position:absolute;left:132px;bottom:40px;font-size:20px;color:#7f8fae}
  </style></head><body><div class="wrap ${card ? 'card' : ''}"><h1>${s.title}</h1><p>${s.sub}</p>${card ? '' : `<div class="fig">${img}</div>`}</div>
  <div class="foot">Empathia · architecture · synthetic data · from docs/architecture/diagrams</div></body></html>`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(slidesDir, `${s.id}.png`) });
}
await b.close();

// 3. slides → film: slow diagonal pan inside each slide, 1-second cross-dissolves, 30 fps, H.264 High, yuv420p
const FADE = 1;
const args = ['-y', '-v', 'error'];
SLIDES.forEach((s) => args.push('-loop', '1', '-framerate', '30', '-t', String(s.seconds), '-i', path.join(slidesDir, `${s.id}.png`)));
const parts = SLIDES.map((s, i) => `[${i}:v]crop=3840:2160:x='384*t/${s.seconds}':y='216*t/${s.seconds}',setsar=1,format=yuv420p,fps=30[v${i}]`);
let last = 'v0'; let offset = SLIDES[0].seconds - FADE;
for (let i = 1; i < SLIDES.length; i += 1) { const o = `x${i}`; parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset}[${o}]`); last = o; offset += SLIDES[i].seconds - FADE; }
const master = path.join(out, 'Empathia_Architecture_Visualization_3840x2160.mp4');
const hd = path.join(out, 'Empathia_Architecture_Visualization_1920x1080.mp4');
execFileSync('ffmpeg', [...args, '-filter_complex', parts.join(';'), '-map', `[${last}]`, '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-metadata', 'title=Empathia — architecture visualization (synthetic data)', '-metadata', 'comment=Rendered from the repository Mermaid diagrams by scripts/media/render-architecture-film.mjs', master], { stdio: 'inherit' });
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', master, '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', hd], { stdio: 'inherit' });

// 4. verify: probe, full decode, hash
const verify = (f) => {
  const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { encoding: 'utf8' }));
  const v = p.streams.find((x) => x.codec_type === 'video');
  const d = spawnSync('ffmpeg', ['-v', 'error', '-xerror', '-i', f, '-f', 'null', '-'], { encoding: 'utf8' });
  return { file: path.relative(root, f), bytes: fs.statSync(f).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'), width: v.width, height: v.height, codec: v.codec_name, profile: v.profile, pixFmt: v.pix_fmt, fps: v.r_frame_rate, durationS: Number(p.format.duration), audio: p.streams.some((x) => x.codec_type === 'audio'), fullDecode: d.status === 0 && !d.stderr.trim() ? 'PASS' : `FAIL ${d.stderr.slice(0, 200)}` };
};
const files = [verify(master), verify(hd)];
const manifest = { film: 'Empathia — architecture visualization', status: files.every((f) => f.fullDecode === 'PASS') ? 'RENDERED_AND_VERIFIED' : 'RENDER_FAILED_VERIFICATION', renderedAt: new Date().toISOString(), script: 'scripts/media/render-architecture-film.mjs', sources: SLIDES.map((s) => (fs.existsSync(path.join(D, `${s.id}.mmd`)) ? `docs/architecture/diagrams/${s.id}.mmd` : `title card: ${s.title}`)), components: { footage: 'none (diagrams rendered from repository sources)', narration: 'none', music: 'none', fonts: 'system UI fonts of the rendering machine; no font file embedded or shipped' }, rights: { status: 'UNVERIFIED', note: 'AI-generated in this program from repository diagrams under the founder’s direction; not in the media-rights ledger; not authorized for any external channel until the founder enters and approves it' }, files };
fs.writeFileSync(path.join(out, 'RENDER_MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest.files.map((f) => ({ file: f.file, size: `${f.width}x${f.height}`, durationS: f.durationS, fullDecode: f.fullDecode })), null, 1));
