#!/usr/bin/env node
/**
 * Web renditions of the website films (apps/website/films.json) into apps/website/media/<KEY>/: 720.mp4 (H.264 High, CRF 24,
 * ≤ 2.2 Mb/s, AAC 96 kb/s, faststart), poster.webp + poster.jpg (1600 px), captions.vtt (WebVTT; converted from SRT when needed),
 * and RENDITION.json with the SHA-256 of the source and of every output. Encodes from the caption-free (clean) master so captions are a
 * real text track instead of burned-in pixels.
 *   node scripts/media/prepare-web-films.mjs --root=/path/to/production-folders [--only=FA,M2]
 *   node scripts/media/prepare-web-films.mjs --from=/dir/with/<KEY>-720.mp4,<KEY>-poster.webp,… (re-use renditions already encoded
 *                                             with the same settings, e.g. by /home/claude/web-films/encode.sh)
 *   node scripts/media/prepare-web-films.mjs --only=SYNCLAB --video=/path/to/the-supplied-file.mp4   (a film whose films.json entry
 *                                             names its `source`: the master is checked against masterSha256 before anything is encoded)
 * A film marked `sound: "none"` is encoded without an audio stream, and only after its source audio has been measured as silent
 * (ffmpeg volumedetect, max ≤ -90 dB): a film with real sound is never stripped. Its two text tracks are kept in the repository
 * and copied beside the film: `source.captions` → captions.vtt (for a silent film, one cue that says so) and `source.descriptions` →
 * descriptions.vtt (what is shown, with the on-screen words quoted). `posterAt` (seconds) picks the poster frame.
 * A film with `burnedLabel` ({ text, band }) gets that text burned in for its whole length, on a band of `band` pixels added above the
 * picture (so nothing of the film is covered; the frame becomes 1280 × (720 + band)), and its posters carry the same band. Needs
 * ffmpeg's drawtext and a font file: Inter SemiBold from the system (fonts-inter), or --font=/path/to/font.otf.
 * Preparing a rendition does not clear it for publication: the website build includes a film only when films.json marks its website
 * rights VERIFIED (or in a --films=preview build for owner review).
 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync, spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; };
const films = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/films.json'), 'utf8')).films;
const only = arg('only')?.split(','); const from = arg('from'); const root = arg('root');
const POSTER_AT = { M2: 104, FA: 88, F02P: 24, F01: 95, IE: 4 };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
for (const f of films.filter((x) => !only || only.includes(x.key))) {
  const out = path.join(repo, 'apps/website/media', f.key); fs.mkdirSync(out, { recursive: true });
  let source = null; let silence = null; let label = null;
  if (from) {
    for (const [a, b] of [[`${f.key}-720.mp4`, '720.mp4'], [`${f.key}-poster.webp`, 'poster.webp'], [`${f.key}-poster.jpg`, 'poster.jpg'], [`${f.key}.vtt`, 'captions.vtt']]) {
      const s = path.join(from, a); if (!fs.existsSync(s)) { console.error(`${f.key}: ${s} missing`); process.exitCode = 1; continue; } fs.copyFileSync(s, path.join(out, b)); }
  } else {
    const given = arg('video');
    if (!root && !(given && f.source)) { console.error('--root (the folder holding the production directories), --from, or --video for a film with a `source` entry, is required'); process.exit(2); }
    let cap;
    if (f.source) {   // an entry that names its master and its text tracks outright (no renditionSource parsing)
      source = given || path.join(root, f.source.video); cap = path.join(repo, f.source.captions);
      if (!fs.existsSync(source) || sha(source) !== f.masterSha256) { console.error(`${f.key}: ${source} is missing or is not the master recorded in films.json (masterSha256)`); process.exit(1); }
    } else {
      const [video, , captions] = f.renditionSource.split(/ \(|\) \+ |, captions from /).map((x) => x && x.trim());
      source = path.join(root, video.split(' ')[0]); cap = f.renditionSource.includes('captions from') ? path.join(path.dirname(path.dirname(source)), f.renditionSource.split('captions from ')[1]) : path.join(path.dirname(source), path.basename(captions || '').split(' ')[0]);
    }
    let audio = ['-c:a', 'aac', '-b:a', '96k', '-ac', '2'];
    if (f.sound === 'none') {   // declared silent: measure it, and only then leave the audio stream out
      const probe = spawnSync('ffmpeg', ['-v', 'info', '-i', source, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
      const streams = /Stream #\d+:\d+.*Audio/.test(probe); const max = Number(/max_volume: (-?[\d.]+|-inf) dB/.exec(probe)?.[1] ?? NaN);
      if (streams && !(max <= -90 || /max_volume: -inf dB/.test(probe))) { console.error(`${f.key}: films.json says sound "none", but the source audio peaks at ${max} dB. Not stripped; correct films.json or the source.`); process.exit(1); }
      audio = ['-an']; silence = streams ? `source audio measured silent (max ${/max_volume: -inf dB/.test(probe) ? '-inf' : max} dB)` : 'source has no audio stream';
    }
    const at = String(f.posterAt ?? POSTER_AT[f.key] ?? 5);
    // a label burned into the rendition for its whole length (founder, 2026-11-10: what qualifies a film's figures must be IN the film).
    // It is drawn on a band added ABOVE the picture, so it covers nothing of the film and the player's own controls (which sit over the
    // bottom of a video) never cover it; the picture itself is not altered.
    let picture = 'scale=-2:720:flags=lanczos';
    if (f.burnedLabel) {
      const font = arg('font') || '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'; const band = f.burnedLabel.band;
      if (!fs.existsSync(font)) { console.error(`${f.key}: the label needs a font file (Inter SemiBold); ${font} is missing. Pass --font=/path/to/Inter-SemiBold.otf`); process.exit(1); }
      const txt = path.join(os.tmpdir(), `empathia-label-${f.key}-${process.pid}.txt`); fs.writeFileSync(txt, f.burnedLabel.text.replace(/ · /g, '  ·  '));
      picture += `,pad=iw:ih+${band}:0:${band}:color=0x0A0E16,drawbox=x=0:y=${band - 2}:w=iw:h=2:color=0xF2C46D@0.55:t=fill,drawtext=fontfile=${font}:textfile=${txt}:fontsize=33:fontcolor=0xF6D58E:x=(w-text_w)/2:y=(${band - 2}-text_h)/2`;
      label = `burned-in label on a ${band} px band added above the picture, whole duration: "${f.burnedLabel.text}" (Inter SemiBold 33 px, #F6D58E on #0A0E16); the rendition differs from the master by this band, the 720p scale and the missing silent audio stream only`;
    }
    ff('-i', source, '-vf', `${picture},format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-maxrate', '2200k', '-bufsize', '4400k', '-profile:v', 'high', ...audio, '-movflags', '+faststart', path.join(out, '720.mp4'));
    ff('-ss', at, '-i', source, '-frames:v', '1', '-vf', `${picture},scale=1600:-2`, '-c:v', 'libwebp', '-quality', '78', path.join(out, 'poster.webp'));
    ff('-ss', at, '-i', source, '-frames:v', '1', '-vf', `${picture},scale=1600:-2`, '-q:v', '3', path.join(out, 'poster.jpg'));
    if (cap.endsWith('.srt')) ff('-i', cap, path.join(out, 'captions.vtt')); else fs.copyFileSync(cap, path.join(out, 'captions.vtt'));
    if (f.source?.descriptions) fs.copyFileSync(path.join(repo, f.source.descriptions), path.join(out, 'descriptions.vtt'));
  }
  const files = Object.fromEntries(['720.mp4', 'poster.webp', 'poster.jpg', 'captions.vtt', 'descriptions.vtt'].filter((x) => fs.existsSync(path.join(out, x))).map((x) => [x, { bytes: fs.statSync(path.join(out, x)).size, sha256: sha(path.join(out, x)) }]));
  fs.writeFileSync(path.join(out, 'RENDITION.json'), JSON.stringify({ key: f.key, title: f.title, master: f.masterSha256, source: source ? { path: f.source ? f.source.video : source, sha256: sha(source) } : { from, note: 'renditions encoded with the settings above from the clean master named in films.json' }, settings: `H.264 High CRF 24 maxrate 2200k, 720p, ${silence ? `no audio stream (${silence})` : 'AAC 96k stereo'}, faststart; posters 1600 px`, ...(label ? { label } : {}), ...(f.textTrack === 'descriptions' ? { textTracks: 'captions.vtt: one cue saying the film is silent; descriptions.vtt: what is shown, with the on-screen words quoted' } : {}), files, at: new Date().toISOString(), rightsWebsite: f.rights?.website?.status }, null, 2) + '\n');
  console.log(`${f.key}: ${Object.entries(files).map(([k, v]) => `${k} ${(v.bytes / 1048576).toFixed(1)} MB`).join(' · ')}`);
}
