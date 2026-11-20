// The reverberation instrument tested against reference datasets with known answers (40/10 directive §26: "Use known reference datasets
// with independently verified expected outputs … Do not use arbitrary numerical output as proof that an analyzer is correct").
// The references are exponentially decaying noise whose decay time is set exactly (amplitude × 1/1000 in RT seconds); a correct
// Schroeder/least-squares analysis must recover it within a few per cent at every evaluation range, the decay curve must be the textbook
// straight line, the octave filters must pass their band and stop the others, and every refusal must fire where the data cannot support
// a figure. WAV and CSV readers round-trip.
//   node --test tests/unit/bench-reverb.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bench-reverb-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/bench/reverb.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const R = await import(pathToFileURL(out).href);
const within = (got, want, tol) => Math.abs(got - want) / want <= tol;

test('RV-01 recovers a known decay time at every evaluation range (0.4 s, 0.8 s, 1.6 s; floor −80 dB)', () => {
  for (const rt of [0.4, 0.8, 1.6]) {
    const a = R.analyse(R.syntheticIR(rt, { floorDb: -80, seed: 11 }));
    for (const f of a.fits) { assert.equal(f.refused, null, `${rt} ${f.name}: ${f.refused}`); assert.ok(within(f.seconds, rt, 0.04), `${rt} s: ${f.name} = ${f.seconds}`); assert.ok(f.r < -0.99, `${f.name} r=${f.r}`); }
  }
});

test('RV-02 the decay curve is the textbook straight line: −60 dB at RT, within 1.5 dB at −10, −20 and −30 dB', () => {
  const rt = 0.8; const a = R.analyse(R.syntheticIR(rt, { floorDb: -90, seed: 3 }));
  for (const d of [10, 20, 30]) { const t = (rt * d) / 60; const i = Math.round(t / a.dt); assert.ok(Math.abs(a.edcDb[i] + d) < 1.5, `at ${t.toFixed(3)} s: ${a.edcDb[i].toFixed(2)} dB, want −${d}`); }
});

test('RV-03 refuses what the data cannot support: T30 with 40 dB of range, T20 and T30 with 30 dB; says the range it measured', () => {
  const a40 = R.analyse(R.syntheticIR(0.8, { floorDb: -40, seed: 5 })); const t30 = a40.fits.find((f) => f.name === 'T30'); const t20 = a40.fits.find((f) => f.name === 'T20');
  assert.equal(t30.seconds, null); assert.match(t30.refused, /dynamic range is [\d.]+ dB; T30 needs 45 dB/); assert.ok(t20.refused === null && within(t20.seconds, 0.8, 0.06), JSON.stringify(t20));
  const a30 = R.analyse(R.syntheticIR(0.8, { floorDb: -30, seed: 5 }));
  assert.ok(a30.fits.filter((f) => f.name !== 'EDT').every((f) => f.seconds === null && /needs (35|45) dB/.test(f.refused)), JSON.stringify(a30.fits.map((f) => f.refused)));
  assert.ok(a30.dynamicRange > 25 && a30.dynamicRange < 35, String(a30.dynamicRange));
});

test('RV-04 octave filters pass their band and stop the others (a 1 kHz tone: −0 dB at 1 kHz, at least 20 dB down two octaves away)', () => {
  const rate = 48000; const n = rate; const tone = Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 1000 * i) / rate));
  const rms = (x) => Math.sqrt(x.slice(n / 4, (3 * n) / 4).reduce((a, v) => a + v * v, 0) / (n / 2));
  const ref = rms(tone); const g = (f) => 20 * Math.log10(rms(R.octave(tone, f, rate)) / ref);
  assert.ok(Math.abs(g(1000)) < 0.5, `at 1 kHz ${g(1000).toFixed(2)} dB`); assert.ok(g(250) < -20 && g(4000) < -20, `${g(250).toFixed(1)} / ${g(4000).toFixed(1)} dB`);
});

// One noise realisation filtered into an octave varies by ±10–20 % at low frequencies (fewer independent cycles in the band — a property of
// the method, not a defect, and why ISO 3382 asks for several source/receiver positions). So the band check averages 16 realisations, as a
// field engineer averages positions, and the single-realisation check is made only on the broadband result.
test('RV-05 band analysis: the bands are named; averaged over 16 realisations each octave 250 Hz–4 kHz recovers the reference T20 within 6 %', () => {
  const one = R.analyseBands(R.syntheticIR(0.7, { floorDb: -85, seed: 9, seconds: 1.8 }));
  assert.deepEqual(one.map((b) => b.band), ['broadband', '125 Hz', '250 Hz', '500 Hz', '1 kHz', '2 kHz', '4 kHz']);
  assert.ok(within(one[0].fits.find((f) => f.name === 'T20').seconds, 0.7, 0.03), 'broadband, one realisation');
  for (const f of [250, 500, 1000, 2000, 4000]) {
    const xs = []; for (let seed = 20; seed < 36; seed++) { const ir = R.syntheticIR(0.7, { floorDb: -85, seed, seconds: 1.8 }); xs.push(R.analyse({ ...ir, samples: R.octave(ir.samples, f, ir.rate) }).fits.find((x) => x.name === 'T20').seconds); }
    const mean = xs.reduce((a, b) => a + b) / xs.length; assert.ok(within(mean, 0.7, 0.06), `${f} Hz mean T20 ${mean.toFixed(3)}`);
  }
});

test('RV-06 the readers: a 16-bit WAV written here reads back with its rate and length; a CSV reads back; malformed files are refused', () => {
  const ir = R.syntheticIR(0.5, { rate: 44100, seconds: 1.2, seed: 2 }); const wav = R.writeWav16(ir.samples, ir.rate);
  const back = R.readWav(wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength));
  assert.deepEqual([back.rate, back.samples.length, back.bits, back.channels], [44100, ir.samples.length, 16, 1]);
  const t = R.analyse(back).fits.find((f) => f.name === 'T20'); assert.ok(within(t.seconds, 0.5, 0.05), `WAV T20 ${t.seconds}`);
  const csv = ['# time_s,amplitude', ...Array.from(ir.samples.slice(0, 30000), (v, i) => `${(i / ir.rate).toFixed(8)},${v}`)].join('\n');
  assert.equal(R.readCsv(csv).rate, 44100);
  assert.throws(() => R.readWav(new ArrayBuffer(100)), /not a WAV file/); assert.throws(() => R.readCsv('0,1\n1,2'), /at least 1000 rows/);
  assert.throws(() => R.readCsv(Array.from({ length: 1200 }, (_, i) => `${i === 600 ? 0.5 : i * 0.001},0.1`).join('\n')), /time step is not even|time column/);
});

test('RV-07 quality notes and the mean over positions: a clean reference raises no note; a short range says so; refused figures are left out and counted', () => {
  const clean = R.analyse(R.syntheticIR(0.7, { floorDb: -85, seed: 4, seconds: 1.8 }));
  assert.deepEqual(R.quality(clean), [], JSON.stringify(R.quality(clean)));
  const short = R.analyse(R.syntheticIR(0.7, { floorDb: -40, seed: 4, seconds: 1.8 }));
  assert.ok(R.quality(short).some((q) => /enough for T20, not for T30/.test(q)), JSON.stringify(R.quality(short)));
  const m = R.meanOverPositions([[clean], [short]])[0];
  assert.equal(m.t20.n, 2); assert.equal(m.t30.n, 1, 'the refused T30 is left out of the mean'); assert.ok(within(m.t20.mean, 0.7, 0.05), String(m.t20.mean));
});
