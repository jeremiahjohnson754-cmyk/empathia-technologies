#!/usr/bin/env node
// Re-loops a looping bed for a seam with no level dip. The generator's own loop joins with a linear crossfade, which on uncorrelated noise
// dips about 3 dB at the join (heard as a soft "breathing" each cycle). Here: trim the dipped ends (--trim, default 0.4 s each), then close
// the loop with an EQUAL-POWER crossfade (--xf, default 0.5 s): the last xf seconds blend the tail (cos fade-out) with the head (sin fade-in),
// and the loop starts xf seconds in, so the wrap point continues sample-exactly. Then one constant gain to the bed target (−33 LUFS, ≤ −3.2 dBTP).
// No limiter, no EQ, no compression. Works on any channel count.
//   node scripts/media/elevenlabs/reloop.mjs --item=fx10-rain-glass [--trim=0.4] [--xf=0.5]
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const item = arg('item'); const dir = path.join(ROOT, '.local/media/elevenlabs/batch1'); const src = path.join(dir, `${item}.mp3`);
const ch = Number(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=channels', '-of', 'csv=p=0', src], { encoding: 'utf8' }).stdout.trim()); const SR = 44100;
const dec = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', src, '-f', 'f32le', '-ar', String(SR), '-'], { maxBuffer: 1 << 29 }).stdout;
const x = new Float32Array(dec.buffer.slice(dec.byteOffset, dec.byteOffset + dec.length)); const frames = x.length / ch;
const T = Math.round(Number(arg('trim', '0.4')) * SR), F = Math.round(Number(arg('xf', '0.5')) * SR);
const z0 = T, zLen = frames - 2 * T; const outLen = zLen - F; const y = new Float32Array(outLen * ch);
for (let i = 0; i < outLen; i++) for (let c = 0; c < ch; c++) {
  const body = (z0 + F + i) * ch + c;
  if (i < outLen - F) y[i * ch + c] = x[body];
  else { const k = i - (outLen - F); const t = (k + 0.5) / F; const tail = x[(z0 + F + i) * ch + c]; const head = x[(z0 + k) * ch + c];
    y[i * ch + c] = tail * Math.cos(t * Math.PI / 2) + head * Math.sin(t * Math.PI / 2); }
}
const wav = path.join(dir, `${item}.reloop.f32`); fs.writeFileSync(wav, Buffer.from(y.buffer));
const meter = (f, extra = []) => { const e = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...extra, '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const I = e.match(/I:\s+(-?[\d.]+) LUFS/g); const P = e.match(/Peak:\s+(-?[\d.]+) dBFS/g); return { lufs: Number(I.at(-1).match(/-?[\d.]+/)[0]), truePeakDbfs: Number(P.at(-1).match(/-?[\d.]+/)[0]) }; };
const raw = ['-f', 'f32le', '-ar', String(SR), '-ac', String(ch)]; const before = meter(wav, raw);
const gain = Math.min(-33 - before.lufs, -3.2 - before.truePeakDbfs); const norm = path.join(dir, `${item}.norm.mp3`);
spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...raw, '-i', wav, '-af', `volume=${gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', '192k', norm]); fs.rmSync(wav);
const after = meter(norm);
// seam proof on the output: the 500 ms window spanning the wrap vs the spread of all 500 ms windows (z), and the sample jump at the wrap
const d = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', norm, '-f', 'f32le', '-ac', '1', '-'], { maxBuffer: 1 << 28 }).stdout; const m = new Float32Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.length));
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) || 1e-9; const n = SR / 2; const w = []; for (let i = 0; i + n <= m.length; i += n) w.push(20 * Math.log10(rms(m.subarray(i, i + n))));
const wrap = new Float32Array(n); wrap.set(m.subarray(m.length - n / 2)); wrap.set(m.subarray(0, n / 2), n / 2); const mean = w.reduce((a, b) => a + b) / w.length; const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / w.length);
const seam = { wrapDb: Number((20 * Math.log10(rms(wrap))).toFixed(2)), meanDb: Number(mean.toFixed(2)), sdDb: Number(sd.toFixed(2)), wrapDeviationDb: Number((20 * Math.log10(rms(wrap)) - mean).toFixed(2)) };
const rp = path.join(dir, 'import-report.json'); const rep = JSON.parse(fs.readFileSync(rp, 'utf8')); const row = rep.find((r) => r.item === item);
Object.assign(row, { reloop: { trimEachSecs: T / SR, crossfadeSecs: F / SR, curve: 'equal-power (sin/cos)', lengthSecs: Number((outLen / SR).toFixed(3)) }, gainDb: Number(gain.toFixed(2)), after, loopSeam: seam,
  normSha256: crypto.createHash('sha256').update(fs.readFileSync(norm)).digest('hex') });
row.checks = { loudnessOnTargetOrPeakBound: Math.abs(after.lufs + 33) <= 1, truePeakOk: after.truePeakDbfs <= -3, seamNoDip: Math.abs(seam.wrapDeviationDb) <= Math.max(1, 1.5 * seam.sdDb) };
fs.writeFileSync(rp, JSON.stringify(rep, null, 2));
console.log(`${Object.values(row.checks).every(Boolean) ? 'PASS' : 'CHECK'} ${item.padEnd(24)} ${row.reloop.lengthSecs}s → ${after.lufs} LUFS ${after.truePeakDbfs} dBTP · wrap ${seam.wrapDeviationDb >= 0 ? '+' : ''}${seam.wrapDeviationDb} dB vs mean (window sd ${seam.sdDb})`);
