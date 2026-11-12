/**
 * SIGNAL challenges: the shared contract. Restored 12 November 2026 to the founder's build package (docs/04-engine-specs.md §13 and the
 * reference runtime chal_core.js; the reference wins). Five modes, thirteen challenges, four levels. A challenge is a small physical
 * model: controls change its state; `evaluate` returns weighted checks {ok, w, must, label, got, want, why}, or an instant failure for
 * joke gear or a destructive mistake. Score = the weighted share of passed checks; pass = no must-pass check failed and score ≥ 70.
 * Record per id@level: {tries, best, first, passed, last, at}. Everything here is pure; drawing and sound live in the runner.
 */
export const MODES = [
  { id: 'hear', name: 'HEAR IT', icon: '👂', blurb: 'Fix what the ear hears: EQ and dynamics on real synthesised audio, measured by an analyser.' },
  { id: 'see', name: 'SEE IT', icon: '🎥', blurb: 'Make the picture right: exposure, focus, motion and colour, by the numbers a camera operator uses.' },
  { id: 'reach', name: 'REACH IT', icon: '💡', blurb: 'Light a person and run a show: photometry, colour temperature, and cues on the beat.' },
  { id: 'build', name: 'BUILD IT', icon: '🧰', blurb: 'Choose the gear and the settings that actually work together — some of the gear is a joke.' },
  { id: 'record', name: 'RECORD IT', icon: '⏺', blurb: 'Gain-stage a real take from the singer’s mouth to the converter, and keep the noise under it.' },
] as const;
export const LEVELS = [null, { s: 'L1', n: 'Beginner' }, { s: 'L2', n: 'Working' }, { s: 'L3', n: 'Advanced' }, { s: 'L4', n: 'Mastery · on the clock' }] as const;
export const PASS = 70;

export type CState = Record<string, number | string | boolean>;
export type Control =
  | { kind: 'slider'; key: string; label: string; min: number; max: number; step: number; unit?: string; log?: boolean }
  | { kind: 'stops'; key: string; label: string; stops: readonly number[]; fmt?: (v: number) => string }
  | { kind: 'select'; key: string; label: string; options: Array<[string | number, string]> }
  | { kind: 'check'; key: string; label: string }
  | { kind: 'stepper'; key: string; label: string; min: number; max: number; unit?: string }
  | { kind: 'slots'; key: string; label: string; options: Array<{ id: string; label: string; note?: string }> }
  | { kind: 'color'; key: string; label: string }
  /** A button: applies `set` to the state; with `finish`, the attempt is checked at once (the reference's instant actions). */
  | { kind: 'action'; key: string; label: string; set: CState; finish?: boolean };
export interface CheckItem { ok: boolean; w?: number; must?: boolean; label: string; got?: string; want?: string; why?: string }
export type Result = { checks: CheckItem[]; headline?: string } | { instant: { title: string; joke: string; why: string } };
export interface Challenge {
  id: string; mode: 'hear' | 'see' | 'reach' | 'build' | 'record'; icon: string; title: string; formula?: string; time: number; clock?: string; clockWhy?: string; live?: boolean;
  brief: (lv: number) => string; init: (lv: number) => CState; controls: (lv: number, s: CState) => Control[];
  readout: (s: CState, lv: number) => Readout; evaluate: (s: CState, lv: number) => Result; note?: string;
}
/** Readout rows: label, value, and 'bad' when the value is out of bounds (drawn in the warning colour, with the word, never colour alone). */
export type Readout = Array<[string, string] | [string, string, 'bad' | '']>;
export interface ChalRecord { tries: number; best: number; first: number; passed: boolean; last: number; at: number }

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const db = (x: number) => 20 * Math.log10(Math.max(1e-12, Math.abs(x)));
export const round = (x: number, n = 0) => { const p = 10 ** n; return Math.round(x * p) / p; };
export function score(checks: CheckItem[]): { score: number; passed: boolean; mustOk: boolean } {
  let tw = 0, sw = 0, mustOk = true; for (const c of checks) { const w = c.w || 1; tw += w; if (c.ok) sw += w; else if (c.must) mustOk = false; }
  const s = tw ? Math.round((100 * sw) / tw) : 0; return { score: s, passed: mustOk && s >= PASS, mustOk };
}
export const stars = (s: number) => (s >= 95 ? '★★★' : s >= 85 ? '★★☆' : s >= PASS ? '★☆☆' : '☆☆☆');
/** Score a result as the reference does: an instant failure scores 0. */
export function scoreResult(r: Result): { score: number; passed: boolean; mustOk: boolean } { return 'instant' in r ? { score: 0, passed: false, mustOk: false } : score(r.checks); }
export const headline = (r: Result) => { if ('instant' in r) return `✖ INSTANT FAIL · ${r.instant.title}`; const s = score(r.checks); return `${s.passed ? '✔ PASSED' : '✖ NOT YET'} · ${s.score}/100 ${stars(s.passed ? s.score : 0)}`; };
/** A timeout adds the reference's must-pass failure to whatever the work scores at that moment. */
export function withTimeout(C: Challenge, r: Result): Result { if ('instant' in r) return r; return { checks: [...r.checks, { ok: false, must: true, label: 'Finished before the clock ran out', why: C.clockWhy || 'Doors opened with the job half done. On the day, the clock is part of the job.' }] }; }
export function recordChal(prev: ChalRecord | undefined, sc: number, passed: boolean, now: number): ChalRecord { return { tries: (prev?.tries || 0) + 1, best: Math.max(prev?.best || 0, sc), first: prev ? prev.first : sc, passed: !!(prev?.passed || passed), last: sc, at: now }; }
export const key = (id: string, lv: number) => `${id}@${lv}`;

// audio helpers shared by HEAR IT and RECORD IT (reference demos.js)
export const FS = 48000;
export const THIRDS = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000];
export const REGIONS = [{ lo: 20, hi: 60, name: 'SUB-BASS' }, { lo: 60, hi: 250, name: 'BASS' }, { lo: 250, hi: 500, name: 'LOW-MIDS' }, { lo: 500, hi: 2000, name: 'MIDS' }, { lo: 2000, hi: 4000, name: 'UPPER-MIDS' }, { lo: 4000, hi: 6000, name: 'PRESENCE' }, { lo: 6000, hi: 20000, name: 'BRILLIANCE' }];
export const regionOf = (f: number) => REGIONS.find((r) => f >= r.lo && f < r.hi) || REGIONS[REGIONS.length - 1]!;
export const fmtHz = (f: number) => (f >= 1000 ? `${round(f / 1000, f >= 10000 ? 0 : 1)}k` : String(Math.round(f)));
/** RBJ cookbook biquad magnitude in dB at f (peak, hp, ls, hs), at 48 kHz. */
export function biq(type: 'peak' | 'hp' | 'ls' | 'hs', f0: number, g: number, q = 0.7071): (f: number) => number {
  const A = 10 ** (g / 40), w0 = (2 * Math.PI * f0) / FS, cs = Math.cos(w0), sn = Math.sin(w0); let b: number[], a: number[];
  if (type === 'peak') { const al = sn / (2 * q); b = [1 + al * A, -2 * cs, 1 - al * A]; a = [1 + al / A, -2 * cs, 1 - al / A]; }
  else if (type === 'hp') { const al = sn / (2 * q); b = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2]; a = [1 + al, -2 * cs, 1 - al]; }
  else { const sq = 2 * Math.sqrt(A) * (sn / 2) * Math.sqrt((A + 1 / A) * (1 / 1 - 1) + 2);
    if (type === 'ls') { b = [A * (A + 1 - (A - 1) * cs + sq), 2 * A * (A - 1 - (A + 1) * cs), A * (A + 1 - (A - 1) * cs - sq)]; a = [A + 1 + (A - 1) * cs + sq, -2 * (A - 1 + (A + 1) * cs), A + 1 + (A - 1) * cs - sq]; }
    else { b = [A * (A + 1 + (A - 1) * cs + sq), -2 * A * (A - 1 + (A + 1) * cs), A * (A + 1 + (A - 1) * cs - sq)]; a = [A + 1 - (A - 1) * cs + sq, 2 * (A - 1 - (A + 1) * cs), A + 1 - (A - 1) * cs - sq]; } }
  return (f) => { const w = (2 * Math.PI * f) / FS; const m = (c: number[]) => { const re = c[0]! + c[1]! * Math.cos(w) + c[2]! * Math.cos(2 * w), im = -c[1]! * Math.sin(w) - c[2]! * Math.sin(2 * w); return Math.sqrt(re * re + im * im); }; return 20 * Math.log10(m(b) / m(a)); };
}
/** In-place radix-2 FFT. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length; let j = 0;
  for (let i = 1; i < n; i += 1) { let k = n >> 1; while (j & k) { j ^= k; k >>= 1; } j |= k; if (i < j) { let t = re[i]!; re[i] = re[j]!; re[j] = t; t = im[i]!; im[i] = im[j]!; im[j] = t; } }
  for (let m = 2; m <= n; m <<= 1) { const th = (-2 * Math.PI) / m, wr = Math.cos(th), wi = Math.sin(th);
    for (let i = 0; i < n; i += m) { let cr = 1, ci = 0; for (let k = 0; k < m / 2; k += 1) { const a = i + k, b = a + m / 2, tr = re[b]! * cr - im[b]! * ci, ti = re[b]! * ci + im[b]! * cr; re[b] = re[a]! - tr; im[b] = im[a]! - ti; re[a] = re[a]! + tr; im[a] = im[a]! + ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
}
/** ⅓-octave band levels in dB (Welch average of Hann-windowed 4096-point frames, half overlap). */
export function thirds(x: Float32Array, fs: number): number[] {
  const N = 4096, hop = 2048, pw = new Float64Array(N / 2), w = new Float64Array(N); let fr = 0;
  for (let i = 0; i < N; i += 1) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  for (let s = 0; s + N <= x.length; s += hop) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i += 1) re[i] = x[s + i]! * w[i]!; fft(re, im); for (let i = 0; i < N / 2; i += 1) pw[i] = pw[i]! + re[i]! * re[i]! + im[i]! * im[i]!; fr += 1; }
  const bin = fs / N;
  return THIRDS.map((f) => { const lo = f / 2 ** (1 / 6), hi = f * 2 ** (1 / 6); let p = 0; for (let k = Math.max(1, Math.ceil(lo / bin)); k <= Math.min(N / 2 - 1, Math.floor(hi / bin)); k += 1) p += pw[k]!; if (p === 0) p = pw[Math.min(N / 2 - 1, Math.max(1, Math.round(f / bin)))]!; return 10 * Math.log10(p / Math.max(1, fr) + 1e-20); });
}
