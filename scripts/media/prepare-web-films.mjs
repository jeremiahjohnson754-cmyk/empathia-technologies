#!/usr/bin/env node
/**
 * Web renditions of the website films (apps/website/films.json) into apps/website/media/<KEY>/: 720.mp4 (H.264 High, CRF 24,
 * ≤ 2.2 Mb/s, AAC 96 kb/s, faststart), poster.webp + poster.jpg (1600 px), captions.vtt (WebVTT; converted from SRT when needed),
 * and RENDITION.json with the SHA-256 of the source and of every output. Encodes from the caption-free (clean) master so captions are a
 * real text track instead of burned-in pixels.
 *   node scripts/media/prepare-web-films.mjs --root=/path/to/production-folders [--only=FA,M2]
 *   node scripts/media/prepare-web-films.mjs --from=/dir/with/<KEY>-720.mp4,<KEY>-poster.webp,… (re-use renditions already encoded
 *                                             with the same settings, e.g. by /home/claude/web-films/encode.sh)
 * Preparing a rendition does not clear it for publication: the website build includes a film only when films.json marks its website
 * rights VERIFIED (or in a --films=preview build for owner review).
 */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; };
const films = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/films.json'), 'utf8')).films;
const only = arg('only')?.split(','); const from = arg('from'); const root = arg('root');
const POSTER_AT = { M2: 104, FA: 88, F02P: 24, F01: 95, IE: 4 };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
for (const f of films.filter((x) => !only || only.includes(x.key))) {
  const out = path.join(repo, 'apps/website/media', f.key); fs.mkdirSync(out, { recursive: true });
  let source = null;
  if (from) {
    for (const [a, b] of [[`${f.key}-720.mp4`, '720.mp4'], [`${f.key}-poster.webp`, 'poster.webp'], [`${f.key}-poster.jpg`, 'poster.jpg'], [`${f.key}.vtt`, 'captions.vtt']]) {
      const s = path.join(from, a); if (!fs.existsSync(s)) { console.error(`${f.key}: ${s} missing`); process.exitCode = 1; continue; } fs.copyFileSync(s, path.join(out, b)); }
  } else {
    if (!root) { console.error('--root (the folder holding the production directories) or --from is required'); process.exit(2); }
    const [video, , captions] = f.renditionSource.split(/ \(|\) \+ |, captions from /).map((x) => x && x.trim());
    source = path.join(root, video.split(' ')[0]); const cap = f.renditionSource.includes('captions from') ? path.join(path.dirname(path.dirname(source)), f.renditionSource.split('captions from ')[1]) : path.join(path.dirname(source), path.basename(captions || '').split(' ')[0]);
    ff('-i', source, '-vf', 'scale=-2:720:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-maxrate', '2200k', '-bufsize', '4400k', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', path.join(out, '720.mp4'));
    ff('-ss', String(POSTER_AT[f.key] ?? 5), '-i', source, '-frames:v', '1', '-vf', 'scale=1600:-2', '-c:v', 'libwebp', '-quality', '78', path.join(out, 'poster.webp'));
    ff('-ss', String(POSTER_AT[f.key] ?? 5), '-i', source, '-frames:v', '1', '-vf', 'scale=1600:-2', '-q:v', '3', path.join(out, 'poster.jpg'));
    if (cap.endsWith('.srt')) ff('-i', cap, path.join(out, 'captions.vtt')); else fs.copyFileSync(cap, path.join(out, 'captions.vtt'));
  }
  const files = Object.fromEntries(['720.mp4', 'poster.webp', 'poster.jpg', 'captions.vtt'].filter((x) => fs.existsSync(path.join(out, x))).map((x) => [x, { bytes: fs.statSync(path.join(out, x)).size, sha256: sha(path.join(out, x)) }]));
  fs.writeFileSync(path.join(out, 'RENDITION.json'), JSON.stringify({ key: f.key, title: f.title, master: f.masterSha256, source: source ? { path: source, sha256: sha(source) } : { from, note: 'renditions encoded with the settings above from the clean master named in films.json' }, settings: 'H.264 High CRF 24 maxrate 2200k, 720p, AAC 96k stereo, faststart; posters 1600 px', files, at: new Date().toISOString(), rightsWebsite: f.rights?.website?.status }, null, 2) + '\n');
  console.log(`${f.key}: ${Object.entries(files).map(([k, v]) => `${k} ${(v.bytes / 1048576).toFixed(1)} MB`).join(' · ')}`);
}
