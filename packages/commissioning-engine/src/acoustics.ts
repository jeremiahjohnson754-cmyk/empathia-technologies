/**
 * Reverberation analysis from a measured impulse response (40/10 directive §7C: "a genuine reverberation analysis interface … EDT, T20 and
 * T30 calculations where methodologically supported … measurement quality checks … A true RT60 must come from a valid measurement or a
 * clearly labeled model").
 *
 * Method (the ISO 3382-2 approach, implemented here from first principles; the standard's text is not reproduced):
 *   1. the squared impulse response is integrated backwards from its end (Schroeder), after the noise floor estimated from the response's
 *      last tenth is subtracted and the integration is truncated where the decay meets that floor (Lundeby-style truncation, simplified);
 *   2. the energy decay curve is expressed in dB re its start;
 *   3. a least-squares line is fitted to the decay over each evaluation range — EDT 0 to −10 dB, T20 −5 to −25 dB, T30 −5 to −35 dB — and
 *      the time for 60 dB of decay is extrapolated from its slope;
 *   4. each result carries its correlation (how straight the decay is) and is refused when the response's dynamic range does not reach
 *      10 dB below the end of its evaluation range (T20 needs 35 dB, T30 45 dB): a result the data cannot support is never shown.
 * Octave bands (125 Hz–4 kHz) are separated with a fourth-order band-pass (two cascaded second-order sections per band, run forward and
 * backward so the filter adds no delay), an approximation of the standard's filters: a band result is labelled as such.
 *
 * Inputs: a WAV file (PCM 16-, 24- or 32-bit integer, or 32-bit float; the first channel) or a CSV of time (s) and amplitude. Nothing is
 * estimated from a photograph or a room's size: that is the Sabine estimate in Lite, labelled as a model.
 */
export interface IR { rate: number; samples: Float64Array; channels: number; bits: number; format: 'wav' | 'csv'; seconds: number }
export interface Fit { name: 'EDT' | 'T20' | 'T30'; from: number; to: number; seconds: number | null; r: number | null; slope: number | null; intercept: number | null; refused: string | null }
export interface Analysis { band: string; edcDb: Float64Array; dt: number; noiseDb: number; dynamicRange: number; fits: Fit[]; truncatedAt: number }

// ------------------------------------------------------------------------------------------------ reading files
export function readWav(buf: ArrayBuffer): IR {
  const v = new DataView(buf); const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (buf.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file (no RIFF/WAVE header)');
  let o = 12; let fmt: { code: number; ch: number; rate: number; bits: number } | null = null; let data: { off: number; len: number } | null = null;
  while (o + 8 <= buf.byteLength) {
    const id = tag(o); const len = v.getUint32(o + 4, true); const b = o + 8;
    if (id === 'fmt ') { let code = v.getUint16(b, true); if (code === 0xfffe && len >= 26) code = v.getUint16(b + 24, true);   // WAVE_FORMAT_EXTENSIBLE: its sub-format
      fmt = { code, ch: v.getUint16(b + 2, true), rate: v.getUint32(b + 4, true), bits: v.getUint16(b + 14, true) }; }
    if (id === 'data') { data = { off: b, len: Math.min(len, buf.byteLength - b) }; break; }
    o = b + len + (len % 2);
  }
  if (!fmt || !data) throw new Error('the WAV file has no format or no data chunk');
  if (!(fmt.code === 1 || fmt.code === 3)) throw new Error(`WAV format ${fmt.code} is not supported (integer PCM or 32-bit float only)`);
  if (fmt.code === 3 && fmt.bits !== 32) throw new Error('float WAV is supported at 32 bits only');
  if (fmt.code === 1 && ![16, 24, 32].includes(fmt.bits)) throw new Error(`${fmt.bits}-bit PCM is not supported (16, 24 or 32)`);
  if (fmt.rate < 8000 || fmt.rate > 384000) throw new Error(`a sample rate of ${fmt.rate} Hz is outside 8–384 kHz`);
  const bps = fmt.bits / 8; const frame = bps * fmt.ch; const n = Math.floor(data.len / frame); const s = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = data.off + i * frame;
    s[i] = fmt.code === 3 ? v.getFloat32(p, true) : fmt.bits === 16 ? v.getInt16(p, true) / 32768
      : fmt.bits === 24 ? (v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16)) / 8388608 : v.getInt32(p, true) / 2147483648;
  }
  return { rate: fmt.rate, samples: s, channels: fmt.ch, bits: fmt.bits, format: 'wav', seconds: n / fmt.rate };
}
/** a mono 16-bit PCM WAV of a response (for the demonstration's reference file and for tests) */
export function writeWav16(x: Float64Array, rate: number): Uint8Array {
  let peak = 0; for (const s of x) peak = Math.max(peak, Math.abs(s)); const g = peak > 0 ? 0.9 / peak : 1;
  const b = new ArrayBuffer(44 + x.length * 2); const v = new DataView(b); const w = (o: number, t: string) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + x.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) v.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(x[i]! * g * 32767))), true);
  return new Uint8Array(b);
}
export function readCsv(text: string): IR {
  const rows = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const nums = rows.map((l) => l.split(/[,;\t]/).map((x) => Number(x.trim()))).filter((r) => r.length >= 2 && r.every((x) => Number.isFinite(x)));
  if (nums.length < 1000) throw new Error('a CSV impulse response needs at least 1000 rows of time (s) and amplitude');
  const dt = (nums[nums.length - 1]![0]! - nums[0]![0]!) / (nums.length - 1);
  if (!(dt > 0)) throw new Error('the time column must increase');
  for (let i = 1; i < nums.length; i++) if (Math.abs(nums[i]![0]! - nums[i - 1]![0]! - dt) > dt * 0.01) throw new Error(`the time step is not even at row ${i + 1}`);
  return { rate: Math.round(1 / dt), samples: Float64Array.from(nums.map((r) => r[1]!)), channels: 1, bits: 64, format: 'csv', seconds: nums.length * dt };
}

// ------------------------------------------------------------------------------------------------ filters
/** RBJ band-pass (constant 0 dB peak gain) second-order section */
function bandpass(f0: number, rate: number, q: number) { const w = (2 * Math.PI * f0) / rate; const a = Math.sin(w) / (2 * q); const c = Math.cos(w); const a0 = 1 + a; return { b0: a / a0, b1: 0, b2: -a / a0, a1: (-2 * c) / a0, a2: (1 - a) / a0 }; }
function run(x: Float64Array, s: ReturnType<typeof bandpass>): Float64Array { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = s.b0 * x[i]! + s.b1 * x1 + s.b2 * x2 - s.a1 * y1 - s.a2 * y2; x2 = x1; x1 = x[i]!; y2 = y1; y1 = v; y[i] = v; } return y; }
const reverse = (x: Float64Array) => Float64Array.from(x).reverse();
/** an octave band, zero phase: two band-pass sections (Q = √2) forward, then the same backward */
export function octave(x: Float64Array, f0: number, rate: number): Float64Array {
  const s = bandpass(f0, rate, Math.SQRT2); let y = run(run(x, s), s); y = reverse(run(run(reverse(y), s), s)); return y;
}
export const BANDS = [125, 250, 500, 1000, 2000, 4000] as const;

// ------------------------------------------------------------------------------------------------ the decay
const EVAL: Array<[Fit['name'], number, number, number]> = [['EDT', 0, -10, 6], ['T20', -5, -25, 3], ['T30', -5, -35, 2]];
/** Schroeder integration with noise subtraction and truncation; least-squares fits; refusals where the data cannot support a figure. */
export function analyse(ir: IR, band = 'broadband'): Analysis {
  const x = ir.samples; const n = x.length; const dt = 1 / ir.rate;
  // the onset: the first sample within 20 dB of the peak (ISO starts the response at its direct sound)
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(x[i]!));
  if (!(peak > 0)) throw new Error('the response is silent');
  let on = 0; while (on < n && Math.abs(x[on]!) < peak * 0.1) on++;
  const e = new Float64Array(n - on); for (let i = on; i < n; i++) e[i - on] = x[i]! * x[i]!;
  const tail = Math.max(1, Math.floor(e.length / 10)); let noise = 0; for (let i = e.length - tail; i < e.length; i++) noise += e[i]!; noise /= tail;
  // where the decay meets the noise: the last point whose 10 ms average energy is 5 dB above the noise
  const win = Math.max(1, Math.round(0.01 * ir.rate)); let cut = e.length;
  for (let i = e.length - win; i > 0; i -= win) { let m = 0; for (let k = i; k < i + win; k++) m += e[k]!; m /= win; if (m > noise * Math.pow(10, 0.5)) { cut = Math.min(e.length, i + win); break; } }
  const edc = new Float64Array(cut); let acc = 0; for (let i = cut - 1; i >= 0; i--) { acc += Math.max(0, e[i]! - noise); edc[i] = acc; }
  const top = edc[0]!; const db = new Float64Array(cut); for (let i = 0; i < cut; i++) db[i] = 10 * Math.log10(Math.max(edc[i]! / top, 1e-30));
  let start = 0; for (let i = 0; i < win * 5 && i < e.length; i++) start += e[i]!; start /= Math.min(win * 5, e.length);
  const dynamicRange = 10 * Math.log10(Math.max(start, 1e-30) / Math.max(noise, 1e-30));
  const noiseDb = 10 * Math.log10(Math.max(noise, 1e-30) / (peak * peak));
  const fits: Fit[] = EVAL.map(([name, from, to, k]) => {
    const need = -to + 10;
    if (dynamicRange < need) return { name, from, to, seconds: null, r: null, slope: null, intercept: null, refused: `the response’s dynamic range is ${dynamicRange.toFixed(1)} dB; ${name} needs ${need} dB (its range ends ${-to} dB down, plus 10 dB above the noise)` };
    let i0 = 0; while (i0 < cut && db[i0]! > from) i0++; let i1 = i0; while (i1 < cut && db[i1]! > to) i1++;
    if (i1 >= cut || i1 - i0 < 10) return { name, from, to, seconds: null, r: null, slope: null, intercept: null, refused: `the decay does not reach ${to} dB before the noise` };
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0; const m = i1 - i0 + 1;
    for (let i = i0; i <= i1; i++) { const t = i * dt; const y = db[i]!; sx += t; sy += y; sxx += t * t; sxy += t * y; syy += y * y; }
    const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx); const intercept = (sy - slope * sx) / m;
    const r = (m * sxy - sx * sy) / Math.sqrt((m * sxx - sx * sx) * (m * syy - sy * sy));
    const seconds = slope < 0 ? -60 / slope : null; void k;
    return { name, from, to, seconds: seconds === null ? null : Math.round(seconds * 1000) / 1000, r: Math.round(r * 10000) / 10000, slope, intercept, refused: seconds === null ? 'the curve does not decay' : null };
  });
  return { band, edcDb: db, dt, noiseDb: Math.round(noiseDb * 10) / 10, dynamicRange: Math.round(dynamicRange * 10) / 10, fits, truncatedAt: Math.round((cut * dt) * 1000) / 1000 };
}
export function analyseBands(ir: IR): Analysis[] {
  const out = [analyse(ir, 'broadband')];
  for (const f of BANDS) { if (f * 2 >= ir.rate / 2) continue; out.push(analyse({ ...ir, samples: octave(ir.samples, f, ir.rate) }, f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`)); }
  return out;
}

/** A reference response for tests and the demonstration's own example: exponentially decaying noise of a known decay time over a
 *  noise floor `floorDb` below the start, from a seeded generator (deterministic). Labelled a SYNTHETIC REFERENCE wherever it is used. */
export function syntheticIR(rt: number, opts: { rate?: number; seconds?: number; floorDb?: number; seed?: number } = {}): IR {
  const rate = opts.rate ?? 48000; const n = Math.round((opts.seconds ?? Math.max(1.5, rt * 2.2)) * rate); const floor = Math.pow(10, (opts.floorDb ?? -80) / 20);
  let s = (opts.seed ?? 7) >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const k = Math.log(1000) / rt;   // amplitude falls 60 dB (×1/1000) in rt seconds
  const x = new Float64Array(n); for (let i = 0; i < n; i++) { const t = i / rate; x[i] = gauss() * Math.exp(-k * t) + floor * gauss(); }   // the decay and an independent noise floor: their energies add
  return { rate, samples: x, channels: 1, bits: 64, format: 'csv', seconds: n / rate };
}

// ------------------------------------------------------------------------------------------------ quality and averaging
/** Measurement-quality notes for one analysis, from the fits themselves (never a pass/fail of the room):
 *  the non-linearity of each fit, ξ = 1000·(1 − r²) in per mille (a decay that is not a straight line — over 10 ‰ is flagged), and the
 *  curvature of the decay, C = 100·(T30/T20 − 1) % (over 10 % suggests a double slope: coupled spaces or a noise problem). */
export function quality(a: Analysis): string[] {
  const out: string[] = [];
  for (const f of a.fits) if (f.r !== null && f.seconds !== null) { const xi = Math.round(1000 * (1 - f.r * f.r) * 10) / 10; if (xi > 10) out.push(`${f.name}: the decay is not straight over its range (ξ = ${xi} ‰, over 10 ‰)`); }
  const t20 = a.fits.find((f) => f.name === 'T20')?.seconds; const t30 = a.fits.find((f) => f.name === 'T30')?.seconds;
  if (t20 && t30) { const c = Math.round(100 * (t30 / t20 - 1) * 10) / 10; if (Math.abs(c) > 10) out.push(`curvature ${c} % (T30 against T20, over 10 %): a double slope — coupled spaces, or noise in the tail`); }
  if (a.dynamicRange < 45) out.push(`dynamic range ${a.dynamicRange} dB${a.dynamicRange < 35 ? ': too little for T20 or T30' : ': enough for T20, not for T30'}`);
  return out;
}
export interface BandMean { band: string; edt: { mean: number | null; n: number }; t20: { mean: number | null; n: number }; t30: { mean: number | null; n: number } }
/** The mean of each band's figures over several positions (each position an analyseBands result); refused figures are left out and counted. */
export function meanOverPositions(positions: Analysis[][]): BandMean[] {
  const bands = positions[0]?.map((a) => a.band) || [];
  const m = (band: string, name: Fit['name']) => { const xs = positions.map((p) => p.find((a) => a.band === band)?.fits.find((f) => f.name === name)?.seconds).filter((v): v is number => typeof v === 'number'); return { mean: xs.length ? Math.round((xs.reduce((s, v) => s + v, 0) / xs.length) * 1000) / 1000 : null, n: xs.length }; };
  return bands.map((band) => ({ band, edt: m(band, 'EDT'), t20: m(band, 'T20'), t30: m(band, 'T30') }));
}
