#!/usr/bin/env node
/**
 * Full decode of every curated film (verification item 4, "available films play correctly", for the codecs the test browser lacks).
 * For each film in the Founder Studio's film index: the file exists, its SHA-256 matches the index, and ffmpeg decodes every video and
 * audio frame with no error (`ffmpeg -v error -xerror -i <file> -f null -`). Results → tests/evidence/films/DECODE_RESULTS.json.
 *   node tests/media/decode-films.mjs [films.json] [--no-hash]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const index = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(repo, 'apps/founder-studio/dist/studio/films.json');
const films = JSON.parse(fs.readFileSync(index, 'utf8'));
const out = path.join(repo, 'tests/evidence/films'); fs.mkdirSync(out, { recursive: true });
const results = [];
for (const f of films) {
  const p = path.isAbsolute(f.path) ? f.path : path.join('/home/claude', f.path);
  const r = { key: f.key, file: f.file, path: f.path, expectedSha256: f.sha256, durationS: f.durationS, codec: `${f.videoCodec}/${f.audioCodec || '-'}` };
  if (!fs.existsSync(p)) { results.push({ ...r, result: 'FAIL', detail: 'file not found' }); console.log(`FAIL ${f.key} missing`); continue; }
  if (!process.argv.includes('--no-hash')) {
    const h = crypto.createHash('sha256'); const fd = fs.openSync(p, 'r'); const buf = Buffer.alloc(8 << 20); let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); fs.closeSync(fd);
    r.sha256 = h.digest('hex');
    if (f.sha256 && r.sha256 !== f.sha256) { results.push({ ...r, result: 'FAIL', detail: 'sha256 differs from the film index' }); console.log(`FAIL ${f.key} hash`); continue; }
  }
  const t0 = Date.now();
  const d = spawnSync('ffmpeg', ['-v', 'error', '-xerror', '-nostdin', '-i', p, '-map', '0:v:0', '-map', '0:a?', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 16 << 20 });
  const ok = d.status === 0 && !d.stderr.trim();
  results.push({ ...r, result: ok ? 'PASS' : 'FAIL', decodeSeconds: Math.round((Date.now() - t0) / 100) / 10, detail: ok ? 'every frame decoded without error' : (d.stderr || `exit ${d.status}`).slice(0, 400) });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${f.key} ${f.file} (${f.durationS}s) ${ok ? '' : d.stderr.slice(0, 120)}`);
}
const failed = results.filter((x) => x.result !== 'PASS').length;
fs.writeFileSync(path.join(out, 'DECODE_RESULTS.json'), JSON.stringify({ test: 'decode-films', at: new Date().toISOString(), ffmpeg: spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).stdout.split('\n')[0], index: path.relative(repo, index), films: results.length, passed: results.length - failed, failed, results }, null, 2));
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
