#!/usr/bin/env node
// Imports an owner-downloaded batch (no network, no credits). Each attachment is matched to its generation by an explicit map; the import
// refuses a file whose decoded duration differs from ElevenLabs' recorded duration by more than 5 ms, or whose bytes duplicate another
// take. Each take is mastered by class with two-pass LINEAR loudness normalisation (one constant gain; nothing else touches the audio):
//   speech −23 LUFS · bed (looping ambience) −33 LUFS, 10 LU under speech · one-shot −23 LUFS · true-peak ceiling −3 dBTP for all.
// Loops are also checked at the wrap point (level step and sample discontinuity between the last and first 20 ms).
//   node scripts/media/elevenlabs/batch-import.mjs --dir=<attachments dir> --map=<json {"content_1":"p01",…}>
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const dir = arg('dir'); const map = JSON.parse(arg('map')); const out = path.join(ROOT, '.local/media/elevenlabs/batch1'); const rec = JSON.parse(fs.readFileSync(path.join(out, 'generation.json'), 'utf8'));
const ff = (a) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const pcm = (f) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-'], { maxBuffer: 1 << 28 }); return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4); };
const decodedSecs = (f) => pcm(f).length / 44100;
const meter = (f) => { const e = ff(['-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr; const I = e.match(/I:\s+(-?[\d.]+) LUFS/g); const P = e.match(/Peak:\s+(-?[\d.]+) dBFS/g);
  return { lufs: I ? Number(I.at(-1).match(/-?[\d.]+/)[0]) : null, truePeakDbfs: P ? Number(P.at(-1).match(/-?[\d.]+/)[0]) : null }; };
const target = (t) => (t.item.startsWith('p') ? { cls: 'speech', I: -23 } : t.loop ? { cls: 'bed', I: -33 } : { cls: 'one-shot', I: -23 });
const loopSeam = (f) => { const x = pcm(f); const n = 882; const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) || 1e-9;
  const tail = x.subarray(x.length - n), head = x.subarray(0, n); return { levelStepDb: Math.abs(20 * Math.log10(rms(tail) / rms(head))), sampleJump: Math.abs(x[x.length - 1] - x[0]), localRms: rms(tail) }; };
const seen = new Map(); const rows = [];
for (const [file, item] of Object.entries(map)) {
  const src = fs.readdirSync(dir).find((f) => f.endsWith(`-${file}.mp3`)); const t = rec.takes.find((x) => x.item === item);
  const bytes = fs.readFileSync(path.join(dir, src)); const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const problems = []; if (seen.has(sha)) problems.push(`duplicate of ${seen.get(sha)}`); seen.set(sha, file);
  const secs = decodedSecs(path.join(dir, src)); if (t.dur !== null && Math.abs(secs - t.dur) > 0.005) problems.push(`decoded ${secs.toFixed(3)} s ≠ recorded ${t.dur} s`);
  if (problems.length) { rows.push({ item, file, refused: problems }); continue; }
  const raw = path.join(out, `${item}.mp3`); fs.writeFileSync(raw, bytes); const { cls, I } = target(t);
  const p1 = ff(['-i', raw, '-af', `loudnorm=I=${I}:TP=-3:LRA=20:print_format=json`, '-f', 'null', '-']).stderr; const m1 = JSON.parse(p1.slice(p1.lastIndexOf('{'), p1.lastIndexOf('}') + 1));
  const norm = path.join(out, `${item}.norm.mp3`);
  const p2 = ff(['-y', '-i', raw, '-af', `loudnorm=I=${I}:TP=-3:LRA=20:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true:print_format=json`, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', norm]).stderr;
  const m2 = JSON.parse(p2.slice(p2.lastIndexOf('{'), p2.lastIndexOf('}') + 1)); const after = meter(norm);
  const row = { item, file, cls, sourceSha256: sha, decodedSecs: Number(secs.toFixed(3)), recordedSecs: t.dur, raw: { lufs: Number(m1.input_i), truePeak: Number(m1.input_tp) }, target: I, mode: m2.normalization_type, after,
    normSha256: crypto.createHash('sha256').update(fs.readFileSync(norm)).digest('hex') };
  if (t.loop) row.loopSeam = loopSeam(raw);
  row.checks = { loudnessWithin1LU: after.lufs !== null && Math.abs(after.lufs - I) <= 1, truePeakOk: after.truePeakDbfs !== null && after.truePeakDbfs <= -3, linear: m2.normalization_type === 'linear',
    ...(t.loop ? { seamLevelStepUnder1dB: row.loopSeam.levelStepDb < 1, seamNoClick: row.loopSeam.sampleJump < Math.max(0.05, 4 * row.loopSeam.localRms) } : {}) };
  t.file = path.relative(ROOT, raw); t.sha256 = sha; rows.push(row);
}
fs.writeFileSync(path.join(out, 'generation.json'), JSON.stringify(rec, null, 2)); fs.writeFileSync(path.join(out, 'import-report.json'), JSON.stringify(rows, null, 2));
for (const r of rows) console.log(r.refused ? `REFUSED ${r.item} (${r.file}): ${r.refused.join('; ')}` : `${Object.values(r.checks).every(Boolean) ? 'PASS' : 'CHECK'} ${r.item.padEnd(24)} ${r.cls.padEnd(8)} raw ${String(r.raw.lufs).padStart(6)} LUFS ${String(r.raw.truePeak).padStart(6)} dBTP → ${r.after.lufs} LUFS ${r.after.truePeakDbfs} dBTP ${r.mode}${r.loopSeam ? ` · seam step ${r.loopSeam.levelStepDb.toFixed(2)} dB jump ${r.loopSeam.sampleJump.toFixed(4)}` : ''}${Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => ` ✗${k}`).join('')}`);
