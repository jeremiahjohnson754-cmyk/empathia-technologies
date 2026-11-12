/**
 * HEAR IT: fix the over-compressed vocal (hear-comp) and undo the bad guitar EQ (hear-eq), as the reference's chal_hear.js has them.
 * The vocal is synthesised (a polyBLEP sawtooth with vibrato through three vowel formants, eight syllables, a quiet room floor) and the
 * compressor is a log-domain feed-forward design (Giannoulis, Massberg & Reiss, JAES 2012); every figure is measured from the audio.
 * The guitar is Karplus–Strong; its ⅓-octave analyser is drawn by the runner. Seeds are the reference's, so the audio is identical.
 */
import { biq, clamp, db, fmtHz, regionOf, round, type Challenge, type CheckItem, type CState } from './core.js';

// ------------------------------------------------------------------------------------------------------------------- the vocal
export const VFS = 24000;
const SYL: Array<[number, number, number, number, 'a' | 'e' | 'o']> = [[0.12, 0.44, 0, -9, 'a'], [0.62, 0.36, 2, -16, 'o'], [1.04, 0.52, 4, -6, 'a'], [1.62, 0.34, 2, -22, 'e'], [2.02, 0.46, 0, -11, 'o'], [2.54, 0.5, -3, -25, 'a'], [3.12, 0.56, 5, -7, 'e'], [3.76, 0.9, 4, -17, 'a']];
const VOW: Record<string, Array<[number, number, number]>> = { a: [[730, 90, 1], [1090, 110, 0.5], [2440, 170, 0.2]], e: [[530, 70, 1], [1840, 120, 0.45], [2480, 170, 0.2]], o: [[570, 80, 1], [840, 90, 0.6], [2410, 170, 0.12]] };
const bpf = (f: number, bw: number, fs: number) => { const w0 = (2 * Math.PI * f) / fs, al = (Math.sin(w0) * bw) / (2 * f), a0 = 1 + al; return [al / a0, 0, -al / a0, (-2 * Math.cos(w0)) / a0, (1 - al) / a0]; };
let vocalCache: Float32Array | null = null;
export function vocal(): Float32Array {
  if (vocalCache) return vocalCache; const fs = VFS, n = Math.round(fs * 5.0), x = new Float32Array(n); let seed = 12345;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };
  for (const sy of SYL) {
    const i0 = Math.round(sy[0] * fs), L = Math.round(sy[1] * fs), f0 = 196 * 2 ** (sy[2] / 12); let ph = 0, lp = 0, pk = 0; const tmp = new Float32Array(L);
    const F = VOW[sy[4]]!.map((v) => ({ c: bpf(v[0], v[1], fs), g: v[2], x1: 0, x2: 0, y1: 0, y2: 0 }));
    for (let i = 0; i < L; i += 1) {
      const t = i / fs, f = f0 * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t)), dt = f / fs; ph += dt; if (ph >= 1) ph -= 1;
      let s = 2 * ph - 1, pb = 0; if (ph < dt) { const q = ph / dt; pb = q + q - q * q - 1; } else if (ph > 1 - dt) { const r = (ph - 1) / dt; pb = r * r + r + r + 1; }
      s -= pb; lp += 0.35 * (s - lp);
      let v = 0; for (const o of F) { const c = o.c, y = c[0]! * lp + c[1]! * o.x1 + c[2]! * o.x2 - c[3]! * o.y1 - c[4]! * o.y2; o.x2 = o.x1; o.x1 = lp; o.y2 = o.y1; o.y1 = y; v += o.g * y; }
      const env = (i < 0.03 * fs ? 0.5 - 0.5 * Math.cos((Math.PI * i) / (0.03 * fs)) : 1) * (i > L - 0.07 * fs ? 0.5 + 0.5 * Math.cos((Math.PI * (i - (L - 0.07 * fs))) / (0.07 * fs)) : 1) * 10 ** ((-3 * t) / sy[1] / 20);
      const cons = i < 0.018 * fs ? 0.25 * rnd() * (1 - i / (0.018 * fs)) : 0; tmp[i] = v * env + cons; pk = Math.max(pk, Math.abs(tmp[i]!));
    }
    const k = 10 ** (sy[3] / 20) / pk; for (let i = 0; i < L && i0 + i < n; i += 1) x[i0 + i] = x[i0 + i]! + tmp[i]! * k;
  }
  for (let j = 0; j < n; j += 1) x[j] = x[j]! + rnd() * 10 ** (-72 / 20) * 1.7;
  return (vocalCache = x);
}
export interface CompP { thr: number; ratio: number; att: number; rel: number; knee: number; mk: number }
export function compress(x: Float32Array, fs: number, p: CompP): { y: Float32Array; g: Float32Array } {
  const n = x.length, y = new Float32Array(n), g = new Float32Array(n), aA = Math.exp(-1 / (p.att * 1e-3 * fs)), aR = Math.exp(-1 / (p.rel * 1e-3 * fs)); let gs = 0; const T = p.thr, R = p.ratio, W = p.knee;
  for (let i = 0; i < n; i += 1) { const xd = 20 * Math.log10(Math.abs(x[i]!) + 1e-9), d = xd - T; let yc: number;
    if (W > 0.01 && 2 * Math.abs(d) <= W) yc = xd + ((1 / R - 1) * (d + W / 2) * (d + W / 2)) / (2 * W); else yc = 2 * d < -W || d <= 0 ? xd : T + d / R;
    const gc = yc - xd; gs = gc < gs ? aA * gs + (1 - aA) * gc : aR * gs + (1 - aR) * gc; g[i] = gs; y[i] = x[i]! * 10 ** ((gs + p.mk) / 20); }
  return { y, g };
}
export function compStats(x: Float32Array, r: { y: Float32Array; g: Float32Array }, fs: number) {
  const { y, g } = r; let pk = 0, ripple = 0, grMax = 0; const sylR: number[] = [], win = Math.round(0.02 * fs);
  for (let i = 0; i < y.length; i += 1) pk = Math.max(pk, Math.abs(y[i]!));
  for (const sy of SYL) { const a = Math.round((sy[0] + 0.2 * sy[1]) * fs), b = Math.round((sy[0] + 0.8 * sy[1]) * fs); let e = 0, ga = 0, cnt = 0, rip = 0;
    for (let i = a; i < b; i += 1) { e += y[i]! * y[i]!; ga += g[i]!; cnt += 1; } sylR.push(10 * Math.log10(e / cnt + 1e-20)); ga /= cnt; grMax = Math.max(grMax, -ga);
    let acc = 0; for (let i = a; i < a + win; i += 1) acc += g[i]!; for (let i = a + win; i < b; i += 1) { acc += g[i]! - g[i - win]!; const dv = g[i - (win >> 1)]! - acc / win; rip += dv * dv; }
    ripple = Math.max(ripple, Math.sqrt(rip / Math.max(1, b - a - win))); }
  const gapA = Math.round(4.72 * fs), gapB = Math.round(4.98 * fs); let ge = 0; for (let i = gapA; i < gapB; i += 1) ge += y[i]! * y[i]!;
  return { peak: db(pk), range: Math.max(...sylR) - Math.min(...sylR), gr: grMax, ripple, noise: 10 * Math.log10(ge / (gapB - gapA) + 1e-20), sylR };
}
const cp = (s: CState): CompP => ({ thr: Number(s['thr']), ratio: Number(s['ratio']), att: Number(s['att']), rel: Number(s['rel']), knee: Number(s['knee']), mk: Number(s['mk']) });
const statsCache = new Map<string, ReturnType<typeof compStats>>();
export function vocalStats(s: CState) { const p = cp(s); const k = JSON.stringify(p); let v = statsCache.get(k); if (!v) { v = compStats(vocal(), compress(vocal(), VFS, p), VFS); if (statsCache.size > 64) statsCache.clear(); statsCache.set(k, v); } return v; }
const COMP_L = [null, { r: [1.5, 8], gr: [2, 14], pk: [-14, -0.5], rg: [5, 16], rip: 1.5, att: [1, 60], rel: [40, 800], nz: -54 }, { r: [2, 6], gr: [3, 10], pk: [-12, -1], rg: [6, 14], rip: 1.0, att: [3, 40], rel: [50, 400], nz: -60 }, { r: [2, 5], gr: [5, 11], pk: [-10, -2], rg: [8, 13], rip: 0.6, att: [5, 30], rel: [60, 300], nz: -62 }] as const;

export const HEAR_COMP: Challenge = {
  id: 'hear-comp', mode: 'hear', icon: '🗜', title: 'Fix the over-compressed vocal', time: 150, clock: 'until the band walks on', formula: 'Gain reduction = (input − threshold) × (1 − 1 ÷ ratio), above the threshold',
  brief: (lv) => `Someone “fixed” the lead vocal by squashing it: threshold on the floor, ratio 20:1, the fastest attack and release, and 18 dB of make-up gain. It is flat, distorted, and it breathes hiss between the words. ${['', 'Bring the life back: a musical ratio, a sensible amount of gain reduction, and peaks that don’t clip.', 'Keep the words even without killing the performance — and without raising the hiss.', 'Control it like a pro: gentle, clean, and quiet between phrases. Every number is measured from the audio.', 'Mastery: the same standard, before the band walks on.'][lv]}`,
  init: () => ({ thr: -40, ratio: 20, att: 0.2, rel: 30, knee: 0, mk: 18 }),
  controls: () => [{ kind: 'slider', key: 'thr', label: 'Threshold', min: -50, max: 0, step: 1, unit: 'dBFS' }, { kind: 'slider', key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.1, unit: ':1', log: true }, { kind: 'slider', key: 'att', label: 'Attack', min: 0.1, max: 100, step: 0.1, unit: 'ms', log: true }, { kind: 'slider', key: 'rel', label: 'Release', min: 10, max: 1000, step: 1, unit: 'ms', log: true }, { kind: 'slider', key: 'knee', label: 'Knee', min: 0, max: 12, step: 1, unit: 'dB' }, { kind: 'slider', key: 'mk', label: 'Make-up gain', min: 0, max: 24, step: 0.5, unit: 'dB' }],
  readout: (s) => { const t = vocalStats(s); return [['peak out', `${round(t.peak, 1)} dBFS`], ['max reduction', `${round(t.gr, 1)} dB`], ['word range', `${round(t.range, 1)} dB`], ['gain ripple', `${round(t.ripple, 2)} dB`], ['hiss in gaps', `${round(t.noise, 0)} dBFS`]]; },
  note: 'Listen for three things: the distortion when the gain moves inside each note (attack and release too fast), the words all hitting one level (too much ratio and reduction), and the hiss climbing between phrases (too much make-up gain).',
  evaluate: (st, lv) => {
    const s = vocalStats(st), L = COMP_L[Math.min(3, lv)]!, c: CheckItem[] = []; const ratio = Number(st['ratio']), att = Number(st['att']), rel = Number(st['rel']);
    if (s.peak > 0) return { instant: { title: 'Clipped the output', joke: 'The vocal now has a new percussion part: digital distortion.', why: 'Make-up gain pushed the peaks past 0 dBFS. Digital clipping flattens the waveform — it can’t be undone later. Bring make-up gain down until peaks sit below −1 dBFS.' } };
    c.push({ ok: ratio >= L.r[0] && ratio <= L.r[1], w: 2, label: 'A musical ratio', got: `${round(ratio, 1)}:1`, want: `${L.r[0]}–${L.r[1]}:1`, why: 'Above about 8:1 a compressor behaves like a limiter: every word ends up at one level and the performance flattens. Vocals usually sit between 2:1 and 6:1.' });
    c.push({ ok: s.gr >= L.gr[0] && s.gr <= L.gr[1], w: 2, must: true, label: 'Gain reduction on the loud words', got: `${round(s.gr, 1)} dB`, want: `${L.gr[0]}–${L.gr[1]} dB`, why: s.gr > L.gr[1] ? 'Too much: the compressor is working on everything. Raise the threshold or lower the ratio.' : 'Too little: the loud words still jump out. Lower the threshold until the loudest syllables show a few dB of reduction.' });
    c.push({ ok: s.range >= L.rg[0] && s.range <= L.rg[1], w: 2, must: true, label: 'Word-to-word dynamics kept', got: `${round(s.range, 1)} dB`, want: `${L.rg[0]}–${L.rg[1]} dB`, why: s.range < L.rg[0] ? 'Flattened: soft and loud words are now nearly the same level, so the phrase has no shape.' : 'Still too uneven: the quiet words will vanish under the band.' });
    c.push({ ok: s.peak >= L.pk[0] && s.peak <= L.pk[1], w: 1.5, label: 'Output peaks', got: `${round(s.peak, 1)} dBFS`, want: `${L.pk[0]} to ${L.pk[1]} dBFS`, why: s.peak > L.pk[1] ? 'Too close to 0 dBFS — no safety margin for the next, louder take.' : 'Too quiet for the rest of the chain: use make-up gain to bring it back up.' });
    c.push({ ok: s.ripple <= L.rip, w: 2, must: lv >= 2, label: 'No distortion from the compressor itself', got: `${round(s.ripple, 2)} dB wobble inside a note`, want: `≤ ${L.rip} dB`, why: 'When attack and release are shorter than a few cycles of the voice (a 196 Hz note repeats every 5 ms), the gain follows the waveform instead of the words — that is distortion. Slow the attack and especially the release.' });
    if (lv >= 2) { c.push({ ok: att >= L.att[0] && att <= L.att[1], w: 1, label: 'Attack lets the consonants through', got: `${round(att, 1)} ms`, want: `${L.att[0]}–${L.att[1]} ms`, why: 'A very fast attack clamps the start of every word and dulls the consonants; a very slow one lets the loud syllables through untouched.' });
      c.push({ ok: rel >= L.rel[0] && rel <= L.rel[1], w: 1, label: 'Release recovers between words', got: `${Math.round(rel)} ms`, want: `${L.rel[0]}–${L.rel[1]} ms`, why: 'Too fast pumps and distorts; too slow and the compressor is still holding down the next, quieter word.' }); }
    c.push({ ok: s.noise <= L.nz, w: 1.5, label: 'Quiet between phrases', got: `${round(s.noise, 0)} dBFS`, want: `≤ ${L.nz} dBFS`, why: 'Make-up gain lifts everything, including the room between the words. Heavy compression plus lots of make-up is how hiss and breaths become part of the song.' });
    return { checks: c };
  },
};

// ------------------------------------------------------------------------------------------------------------------- the guitar
const G_BAD: Array<Array<['peak' | 'hs', number, number, number?]>> = [[], [['peak', 400, 9, 1.2], ['hs', 7000, -6]], [['peak', 400, 9, 1.2], ['peak', 3200, 8, 2], ['hs', 7000, -6]], [['peak', 110, 7, 1.5], ['peak', 400, 9, 1.2], ['peak', 3200, 8, 2], ['hs', 7000, -9]]];
const G_WHAT: Record<number, string> = { 110: 'boom (BASS)', 400: 'boxiness (LOW-MIDS)', 3200: 'honk and harshness (UPPER-MIDS)', 7000: 'a dull, blanket-over-it top (BRILLIANCE)' };
export const guitarBad = (lv: number) => G_BAD[Math.min(3, lv)]!;
export const badF = (lv: number) => { const fs = guitarBad(lv).map((b) => biq(b[0], b[1], b[2], b[3] || 0.7071)); return (f: number) => fs.reduce((t, fn) => t + fn(f), 0); };
export function yoursF(st: CState, lv: number): (f: number) => number {
  const lvx = Math.min(3, lv), n = (k: string) => Number(st[k]); const B = [biq('hp', Math.max(20, n('hp')), 0, 0.7071)];
  if (lvx >= 3) B.push(biq('ls', n('lsf'), n('ls'))); B.push(biq('peak', n('p1f'), n('p1g'), n('p1q')), biq('peak', n('p2f'), n('p2g'), n('p2q'))); if (lvx >= 2) B.push(biq('peak', n('p3f'), n('p3g'), n('p3q'))); B.push(biq('hs', n('hsf'), n('hs')));
  const used = n('hp') <= 20.5 ? B.slice(1) : B; return (f) => used.reduce((t, fn) => t + fn(f), 0);
}
export function guitarNet(st: CState, lv: number) { const bf = badF(lv), yf = yoursF(st, lv); let worst = 0, wf = 0, ss = 0, n = 0, mx = -99;
  for (let i = 0; i <= 80; i += 1) { const f = 100 * 100 ** (i / 80), v = bf(f) + yf(f); ss += v * v; n += 1; if (Math.abs(v) > Math.abs(worst)) { worst = v; wf = f; } mx = Math.max(mx, v); }
  return { worst, wf, rms: Math.sqrt(ss / n), max: mx, bf, yf }; }
const TOL = [0, 4, 3, 2, 1.5];
export const HEAR_EQ: Challenge = {
  id: 'hear-eq', mode: 'hear', icon: '🎸', title: 'Undo the bad guitar EQ', time: 150, clock: 'until the first song', formula: 'Their EQ + your EQ = 0 dB. A cut of the same size, frequency and Q cancels a boost exactly',
  brief: (lv) => `The acoustic-guitar channel was “fixed” by someone chasing a problem that wasn’t there. The EQ they left is locked; you get a corrective EQ after it. Make the guitar sound like the guitar again. ${['', 'Their EQ curve is shown in red — cancel it.', 'Their curve is hidden now. Use your ears and the analyser against the reference outline.', 'Four problems, a ±2 dB tolerance and no clues. The analyser and your ears are all you get.', 'Mastery: ±1.5 dB, on the clock.'][lv]}`,
  init: () => ({ hp: 20, lsf: 120, ls: 0, p1f: 1000, p1g: 0, p1q: 1, p2f: 1000, p2g: 0, p2q: 1, p3f: 1000, p3g: 0, p3q: 1, hsf: 8000, hs: 0, byp: false }),
  controls: (lv) => { const lvx = Math.min(3, lv); const S: Array<[string, string, number, number, number, string, boolean?]> = [['High-pass', 'hp', 20, 300, 1, 'Hz (20 = off)', true]];
    if (lvx >= 3) S.push(['Low shelf freq', 'lsf', 40, 400, 1, 'Hz', true], ['Low shelf gain', 'ls', -12, 12, 0.5, 'dB']);
    S.push(['Band 1 freq', 'p1f', 40, 16000, 1, 'Hz', true], ['Band 1 gain', 'p1g', -15, 15, 0.5, 'dB'], ['Band 1 Q', 'p1q', 0.3, 8, 0.1, '', true], ['Band 2 freq', 'p2f', 40, 16000, 1, 'Hz', true], ['Band 2 gain', 'p2g', -15, 15, 0.5, 'dB'], ['Band 2 Q', 'p2q', 0.3, 8, 0.1, '', true]);
    if (lvx >= 2) S.push(['Band 3 freq', 'p3f', 40, 16000, 1, 'Hz', true], ['Band 3 gain', 'p3g', -15, 15, 0.5, 'dB'], ['Band 3 Q', 'p3q', 0.3, 8, 0.1, '', true]);
    S.push(['High shelf freq', 'hsf', 2000, 16000, 1, 'Hz', true], ['High shelf gain', 'hs', -12, 12, 0.5, 'dB']);
    return S.map(([label, key, min, max, step, unit, log]) => ({ kind: 'slider' as const, key, label, min, max, step, unit, log })); },
  readout: (st, lv) => { const S = guitarNet(st, lv); return [['tolerance', `±${TOL[lv]} dB`], lv <= 2 ? ['biggest error now', `${S.worst > 0 ? '+' : ''}${round(S.worst, 1)} dB at ${fmtHz(S.wf)}Hz — ${regionOf(S.wf).name}`] : ['listen', 'A/B with the bypass'], ['your EQ', st['byp'] ? 'BYPASSED' : 'in']]; },
  note: 'Sweep to find it: boost a narrow band, sweep until the problem jumps out, then turn that boost into a cut. Boxy lives around 300–500 Hz, honk and harshness around 1–4 kHz, air above 7 kHz.',
  evaluate: (st, lv) => {
    const S = guitarNet(st, lv), tol = TOL[lv]!, c: CheckItem[] = [];
    c.push({ ok: Math.abs(S.worst) <= tol, w: 3, must: true, label: 'The guitar matches itself, 100 Hz–10 kHz', got: `worst ${S.worst > 0 ? '+' : ''}${round(S.worst, 1)} dB at ${fmtHz(S.wf)}Hz`, want: `±${tol} dB`, why: `The largest remaining error is in the ${regionOf(S.wf).name} region. ${S.worst > 0 ? 'Cut there.' : 'Something there is still pulled down — or your cut overshot.'}` });
    c.push({ ok: S.rms <= tol / 2, w: 2, label: 'Overall closeness', got: `${round(S.rms, 2)} dB RMS`, want: `≤ ${round(tol / 2, 2)} dB`, why: 'Small errors everywhere add up to a different-sounding guitar even when no single band is far off.' });
    for (const bd of guitarBad(lv)) { const f = bd[0] === 'hs' ? 9000 : bd[1], v = S.bf(f) + S.yf(f); c.push({ ok: Math.abs(v) <= tol, w: 1, label: `Fixed the ${G_WHAT[bd[1]]}`, got: `${v > 0 ? '+' : ''}${round(v, 1)} dB at ${fmtHz(f)}Hz`, want: `±${tol} dB`, why: bd[2] > 0 ? 'Their boost is still there. A cut of the same size, frequency and width cancels it exactly.' : 'Their cut is still there. This one needs a boost — the rare case where boosting is the fix.' }); }
    if (lv >= 2) c.push({ ok: S.max <= 3, w: 1, must: true, label: 'No new headroom problem', got: `+${round(S.max, 1)} dB peak in the sum`, want: '≤ +3 dB', why: 'Big boosts add level the next stage has to swallow, and can clip a converter or a plug-in.' });
    if (Number(st['hp']) > 110) c.push({ ok: false, w: 1, label: 'High-pass not eating the guitar', got: `${Math.round(Number(st['hp']))} Hz`, want: '≤ 110 Hz on an acoustic guitar', why: 'The low string’s fundamental is 82–98 Hz. A high-pass above ~110 Hz thins the guitar out.' });
    return { checks: c };
  },
};
export const clampState = (C: Challenge, lv: number, s: CState): CState => { const out = { ...s }; for (const c of C.controls(lv, s)) if (c.kind === 'slider' && typeof out[c.key] === 'number') out[c.key] = clamp(out[c.key] as number, c.min, c.max); return out; };
