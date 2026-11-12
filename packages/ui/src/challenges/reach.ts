/**
 * REACH IT, as the reference's chal_reach.js has it. Light the moving close-up: uniform-cone photometry (I = lm ÷ Ω, Ω = 2π(1 − cos(field/2))),
 * inverse square and cosine incidence on the vertical plane of the face. Run the cues: a song on a clock; looks fired on keys 1–8 are judged
 * against the cue times. The cue engine here is pure — the runner owns the clock (the audio clock when sound is on) and calls fire/tick/finish.
 */
import { clamp, round, type Challenge, type CheckItem, type CState, type Readout, type Result } from './core.js';

const mired = (K: number) => 1e6 / K;
export interface Fixture { id: string; t: string; i: string; beam?: [number, number]; fr?: number; lm?: number; cri?: number; hicri?: number; edge?: 'soft' | 'hard'; cct?: number | 'var'; frost?: boolean; op?: boolean; joke?: [string, string] }
export const FIXTURES: Fixture[] = [
  { id: 'par', t: 'LED PAR, RGB only', i: '🔴', beam: [25, 25], fr: 1.6, lm: 5000, cri: 70, edge: 'soft', cct: 'var' },
  { id: 'fres', t: 'LED Fresnel, variable white', i: '🔆', beam: [15, 60], fr: 1.6, lm: 12000, cri: 95, edge: 'soft', cct: 'var' },
  { id: 'e19', t: 'Ellipsoidal profile 19°', i: '🎯', beam: [15.2, 15.2], fr: 19 / 15.2, lm: 16000, cri: 92, edge: 'hard', cct: 'var', frost: true },
  { id: 'e26', t: 'Ellipsoidal profile 26°', i: '🎯', beam: [20.8, 20.8], fr: 26 / 20.8, lm: 16000, cri: 92, edge: 'hard', cct: 'var', frost: true },
  { id: 'e36', t: 'Ellipsoidal profile 36°', i: '🎯', beam: [28.8, 28.8], fr: 36 / 28.8, lm: 16000, cri: 92, edge: 'hard', cct: 'var', frost: true },
  { id: 'mhw', t: 'Moving-head wash (zoom)', i: '🌀', beam: [8, 45], fr: 1.5, lm: 30000, cri: 80, hicri: 92, edge: 'soft', cct: 'var' },
  { id: 'mhs', t: 'Moving-head spot (zoom)', i: '✴', beam: [5, 40], fr: 1.25, lm: 25000, cri: 70, edge: 'hard', cct: 6500, frost: true },
  { id: 'fs', t: 'Followspot (needs an operator)', i: '🔦', beam: [3, 15], fr: 1.3, lm: 20000, cri: 90, edge: 'soft', cct: 5600, op: true },
  { id: 'uv', t: 'UV blacklight bar', i: '🟣', joke: ['Her teeth glow. Nothing else does.', 'UV fixtures emit almost no visible light: they make fluorescent things glow. A face lit only by UV reads as darkness with teeth. Choose a fixture that makes white light with a high colour rendering index.'] },
  { id: 'lava', t: 'A lava lamp', i: '🫧', joke: ['Mood: immaculate. Illuminance: about 3 lux.', 'A camera close-up at nine metres needs hundreds of lux on the face. A decorative lamp is a practical — it can be in the shot, not light it.'] },
  { id: 'phone', t: 'Your phone’s flashlight', i: '📱', joke: ['Brave. Wrong.', 'A phone LED is a few dozen lumens with a harsh, blue-green, low-CRI spike, and at 9 m it’s a firefly. The inverse-square law is not impressed.'] },
];
export const POSITIONS = [
  { id: 'foh', t: 'Front-of-house truss (existing, rigged and certified by the rigger)', dx: 8, h: 6, dy: 0, slide: true },
  { id: 'bal', t: 'Balcony rail', dx: 16, h: 3, dy: 0 }, { id: 'box', t: 'Box boom (side-front)', dx: 5, h: 3, dy: 6 },
  { id: 'over', t: 'Overhead electric, straight above her', dx: 0.5, h: 5, dy: 0 }, { id: 'foot', t: 'Floor at the stage lip', dx: 2, h: -1.4, dy: 0 },
  { id: 'side', t: 'Side boom at head height', dx: 0.2, h: 0.4, dy: 5 },
];
export const LUX: Array<[number, number]> = [[0, 0], [250, 1500], [300, 900], [400, 700], [400, 700]];
export const camWB = (lv: number) => (lv >= 3 ? 3200 : 5600);
const fxOf = (st: CState) => FIXTURES.find((f) => f.id === st['fx']) || FIXTURES[0]!;
export function geo(st: CState) { const p = POSITIONS.find((q) => q.id === st['pos']) || POSITIONS[0]!, dy = p.slide ? Number(st['dy']) : p.dy, hz = Math.hypot(p.dx, dy), d = Math.hypot(hz, p.h);
  return { p, dy, hz, d, el: (Math.atan2(p.h, hz) * 180) / Math.PI, az: (Math.atan2(Math.abs(dy), Math.max(0.01, p.dx)) * 180) / Math.PI }; }
export function photo(st: CState) {
  const F = fxOf(st); if (!F.beam) return null; const G = geo(st), frost = !!st['frost'], hicri = !!st['hicri'], beam = clamp(Number(st['zoom']), F.beam[0], F.beam[1]), field = beam * F.fr! * (frost ? 1.2 : 1);
  const lm = ((F.lm! * Number(st['dim'])) / 100) * (frost ? 0.85 : 1) * (hicri && F.hicri ? 0.75 : 1), om = 2 * Math.PI * (1 - Math.cos(((field / 2) * Math.PI) / 180)), I = lm / om;
  const E = (I * Math.max(0, Math.cos((G.el * Math.PI) / 180)) * Math.cos((G.az * Math.PI) / 180)) / (G.d * G.d);
  const bd = 2 * G.d * Math.tan(((beam / 2) * Math.PI) / 180), fd = 2 * G.d * Math.tan(((field / 2) * Math.PI) / 180), cct = typeof F.cct === 'number' ? F.cct : Number(st['cct']), cri = hicri && F.hicri ? F.hicri : F.cri!;
  const soft = F.edge === 'soft' || frost;
  const prof = (x: number) => { const r = Math.abs(x); if (soft) return Math.exp(-Math.LN2 * (r / (bd / 2)) ** 2); return r <= (0.9 * fd) / 2 ? 1 : r >= fd / 2 ? 0.02 : 1 - ((r - (0.9 * fd) / 2) / ((0.1 * fd) / 2)) * 0.98; };
  return { F, G, beam, field, I, E, bd, fd, cct, cri, soft, prof, op: !!F.op };
}
export const REACH_LIGHT: Challenge = {
  id: 'reach-light', mode: 'reach', icon: '💡', title: 'Pick the fixture for a moving close-up', time: 150, clock: 'until the first verse', formula: 'E = I × cos θ ÷ d² · beam diameter = 2 × d × tan(angle ÷ 2)',
  brief: (lv) => `The soloist sings a verse on camera in close-up and she moves: anywhere across a 3 m stretch of the stage. The light comes from existing positions only — nothing new goes overhead today (that’s the rigger’s call). ${['', 'Pick a fixture and position that keeps her lit, the right colour for the camera (white balance 5,600 K), wherever she walks.', 'The camera operator is fussy: high colour rendering, no hard edge crossing her face, key light from a proper angle, 300–900 lux on her face — and there’s no followspot operator tonight.', 'Broadcast standard: camera at 3,200 K, 400–700 lux on the face, and a backlight to separate her from the LED wall.', 'Mastery: the broadcast standard, on the clock.'][lv]}`,
  init: () => ({ fx: 'par', pos: 'bal', dy: 0, zoom: 25, cct: 4000, dim: 100, frost: false, hicri: false, back: false, br: 60 }),
  controls: (lv, st) => [
    { kind: 'slots', key: 'fx', label: 'Fixture', options: FIXTURES.filter((f) => !(f.op && lv >= 2)).map((f) => ({ id: f.id, label: `${f.i} ${f.t}` })) },
    { kind: 'select', key: 'pos', label: 'Position', options: POSITIONS.map((q) => [q.id, q.t] as [string, string]) },
    ...(st['pos'] === 'foh' ? [{ kind: 'slider' as const, key: 'dy', label: 'Along the truss (0 = centre, on the camera axis)', min: -6, max: 6, step: 0.1, unit: 'm' }] : []),
    { kind: 'slider', key: 'zoom', label: 'Zoom / beam angle (where the fixture allows)', min: 3, max: 60, step: 0.5, unit: '°' },
    { kind: 'slider', key: 'cct', label: 'Colour temperature (variable-white fixtures)', min: 2700, max: 6500, step: 50, unit: 'K' },
    { kind: 'slider', key: 'dim', label: 'Intensity', min: 5, max: 100, step: 1, unit: '%' },
    { kind: 'check', key: 'frost', label: 'Frost filter (softens a hard edge, costs about 15% output)' },
    { kind: 'check', key: 'hicri', label: 'High-CRI mode (wash only: better skin, about 25% less output)' },
    ...(lv >= 3 ? [{ kind: 'check' as const, key: 'back', label: 'Add a backlight from the upstage truss' }, { kind: 'slider' as const, key: 'br', label: 'Backlight level vs key', min: 10, max: 150, step: 5, unit: '%' }] : []),
  ],
  readout: (st, lv) => { const R = photo(st); if (!R) return [['fixture', 'Check your work to see what the camera thinks of this.']]; const L = LUX[lv]!;
    const r: Readout = [['centre illuminance', `${round(R.E, 0)} lx`, R.E > L[1] || R.E < L[0] ? 'bad' : ''], ['at the edges of her walk', `${round(R.E * R.prof(1.5), 0)} lx`], ['beam / field', `${round(R.beam, 1)}° / ${round(R.field, 1)}°`], ['at her', `beam ⌀ ${round(R.bd, 1)} m · field ⌀ ${round(R.fd, 1)} m`], ['throw', `${round(R.G.d, 1)} m · ${round(R.G.el, 0)}° up · ${round(R.G.az, 0)}° off the camera axis`], ['colour', `${R.cct} K vs camera ${camWB(lv)} K`], ['CRI', String(R.cri)], ['edge', R.soft ? 'soft' : 'hard']]; return r; },
  note: 'The rules of thumb, from the physics: light falls with the square of the distance; the beam angle sets how much of her walk stays within half of the centre brightness; a soft edge hides the edge of the beam when she moves; 30–50° above and 15–45° to the side of the camera gives shape without raccoon eyes; and the light’s colour has to match the camera’s white balance.',
  evaluate: (st, lv) => {
    const F = fxOf(st); if (F.joke) return { instant: { title: F.t, joke: F.joke[0], why: F.joke[1] } };
    const R = photo(st)!, G = R.G, c: CheckItem[] = [], mTol = lv >= 2 ? 15 : 30, luxR = LUX[lv]!, wb = camWB(lv); const width = lv === 1 ? R.fd : R.bd;
    c.push({ ok: R.op ? true : width >= 3, w: 3, must: true, label: 'Her whole 3 m walk stays in the light', got: R.op ? 'the operator follows her' : `${lv === 1 ? 'field ' : 'beam '}${round(width, 1)} m wide at her`, want: '≥ 3 m', why: `Diameter = 2 × throw × tan(angle ÷ 2). At ${round(G.d, 1)} m she needs a beam of at least ${round((2 * Math.atan(1.5 / G.d) * 180) / Math.PI, 1)}° — or a wider fixture.` });
    const lo = R.E * R.prof(1.5), hi = R.E;
    c.push({ ok: lo >= luxR[0] * (lv === 1 ? 0.6 : 0.8) && hi <= luxR[1] && hi >= luxR[0], w: 2.5, must: lv >= 2, label: 'Enough light on her face for the camera', got: `${round(lo, 0)}–${round(hi, 0)} lx`, want: `${luxR[0]}–${luxR[1]} lx`, why: hi > luxR[1] ? 'Too bright: she squints and the camera clips. Dim it or go wider.' : 'Too dark: E = I ÷ d². Get closer, go narrower, or use a brighter fixture.' });
    const dm = Math.abs(mired(R.cct) - mired(wb));
    c.push({ ok: dm <= mTol, w: 2, label: 'Colour matches the camera', got: `${R.cct} K (${Math.round(dm)} mired off)`, want: `${wb} K ±${mTol} mired`, why: 'Mismatched colour temperature turns skin orange or blue on camera. Match the fixture to the white balance.' });
    c.push({ ok: R.cri >= (lv >= 2 ? 90 : 80), w: 2, must: lv >= 2, label: 'Skin looks like skin (colour rendering)', got: `CRI ${R.cri}`, want: `≥ ${lv >= 2 ? 90 : 80}`, why: 'RGB-only and narrow-spectrum sources leave gaps in the spectrum; skin goes grey or magenta on camera. Use a high-CRI white source (or the wash’s high-CRI mode).' });
    const elR = lv >= 2 ? [30, 50] : [20, 60];
    c.push({ ok: G.el >= elR[0]! && G.el <= elR[1]!, w: 2, label: 'Key light from a good height', got: `${round(G.el, 0)}° above her eyeline`, want: `${elR[0]}–${elR[1]}°`, why: G.el > elR[1]! ? 'Too steep: her eyes sink into shadow.' : G.el < 0 ? 'Lit from below: every horror film ever.' : 'Too flat: it glares straight into her eyes and flattens her face.' });
    if (lv >= 2) {
      c.push({ ok: G.az >= 15 && G.az <= 45, w: 1.5, label: 'Key light off the camera axis', got: `${round(G.az, 0)}°`, want: '15–45°', why: 'Straight down the lens flattens the face; from the side it goes half-dark. Move along the truss.' });
      c.push({ ok: R.soft, w: 1.5, label: 'No hard edge crossing her face', got: R.soft ? 'soft' : 'hard edge', want: 'soft edge (or frost)', why: 'When she moves, a hard beam edge slices across her face on camera. Use a soft-edged fixture or add frost.' });
      c.push({ ok: R.fd <= 7, w: 1, label: 'Not washing the LED wall and the band', got: `field ${round(R.fd, 1)} m`, want: '≤ 7 m', why: 'Spill onto the LED wall greys it out on camera. Tighten the zoom.' });
    }
    if (lv >= 3) { const back = !!st['back'], br = Number(st['br']); c.push({ ok: back && br >= 50 && br <= 100, w: 2, must: true, label: 'Backlight separates her from the wall', got: back ? `${br}% of the key` : 'none', want: '50–100% of the key', why: 'Without a backlight her hair and shoulders melt into the LED wall behind her; too much and she glows like an angel.' }); }
    return { checks: c };
  },
};

// ------------------------------------------------------------------------------------------------------------------- run the cues
export const LOOKS = [{ n: 'Pre-show', c: '#334155' }, { n: 'Warm wash', c: '#F59E0B' }, { n: 'Cool wash', c: '#60A5FA' }, { n: 'Deep blue', c: '#1D4ED8' }, { n: 'Chase', c: '#E879F9' }, { n: 'Full hit', c: '#F8FAFC' }, { n: 'Strobe (≤3/s)', c: '#E2E8F0' }, { n: 'Blackout', c: '#000000' }, { n: 'Blinders', c: '#FDBA74' }];
export const CUE_OK: Record<string, number[]> = { intro: [3, 2], verse: [1, 2, 3], pre: [4, 2], chorus: [5, 4, 8], chorus2: [4, 8, 6, 5], bridge: [3, 2, 1], final: [5, 8, 4, 6], hit: [8, 5], end: [7] };
export const CUE_HINT: Record<string, string> = { intro: '3 deep blue', verse: '1 or 2 washes', pre: '4 chase', chorus: '5 full hit', chorus2: 'change it: 4, 8 or 6', bridge: '3 deep blue', final: '5 or 8', hit: '8 blinders', end: '7 blackout on the last hit' };
export interface Song { bpm: number; bar: number; beat: number; secs: Array<{ name: string; b0: number; bars: number; t: number }>; cues: Array<{ t: number; sec: string }>; len: number }
export function song(lv: number): Song {
  const bpm = [0, 116, 122, 128, 132][lv]!, S: Array<[string, number]> = lv === 1 ? [['intro', 4], ['verse', 8], ['chorus', 8], ['bridge', 4], ['final', 8]] : [['intro', 4], ['verse', 8], ['pre', 4], ['chorus', 4], ['chorus2', 4], ['bridge', 4], ['final', 8]];
  const bar = 240 / bpm, secs: Song['secs'] = [], cues: Song['cues'] = []; let b = 2;
  for (const [name, bars] of S) { secs.push({ name, b0: b, bars, t: b * bar }); cues.push({ t: b * bar, sec: name }); b += bars; }
  if (lv >= 3) { const fi = secs.find((s) => s.name === 'final')!; cues.push({ t: fi.t - bar / 8, sec: 'hit' }); cues.sort((x, y) => x.t - y.t); }
  secs.push({ name: 'end', b0: b, bars: 1, t: b * bar }); cues.push({ t: b * bar, sec: 'end' });
  return { bpm, bar, beat: bar / 4, secs, cues, len: (b + 1.5) * bar };
}
/** Timing windows (perfect, good, accepted) widen with the timer setting: relaxed ×1.6, off ×2.2. */
export const windows = (factor: number) => { const wide = factor === 2 ? 1.6 : factor === 0 ? 2.2 : 1; return [0.12 * wide, 0.3 * wide, 0.6 * wide] as const; };
export interface CueHit { k: number; g: 'perfect' | 'good' | 'late' | 'early'; ok: boolean; rep: boolean; pts: number }
export interface CueRun { look: number; crowd: number; hits: Array<CueHit | undefined>; used: Record<number, number>; strobeT: number | null; strobeBad: boolean; strobeN: number; prevLook: number; lastChange: number; missed: boolean[]; msg: Array<{ txt: string; tone: 'good' | 'warn' | 'bad' | 'info'; at: number }> }
export const cueStart = (S: Song): CueRun => ({ look: 0, crowd: 50, hits: [], used: {}, strobeT: null, strobeBad: false, strobeN: 0, prevLook: 0, lastChange: 0, missed: S.cues.map(() => false), msg: [] });
const say = (r: CueRun, txt: string, tone: CueRun['msg'][number]['tone'], at: number) => { r.msg = [...r.msg, { txt, tone, at }].slice(-4); };
export function cueFire(S: Song, prev0: CueRun, k: number, t: number, lv: number, W: readonly number[]): CueRun {
  const r: CueRun = { ...prev0, hits: [...prev0.hits], used: { ...prev0.used }, missed: [...prev0.missed] }; let best: { i: number; d: number; sec: string } | null = null;
  S.cues.forEach((c, i) => { if (r.hits[i]) return; const d = t - c.t; if (Math.abs(d) <= W[2]! && (!best || Math.abs(d) < Math.abs(best.d))) best = { i, d, sec: c.sec }; });
  const prev = r.look; r.used[k] = (r.used[k] || 0) + 1;
  if (k === 6) { r.strobeT = t; r.prevLook = prev === 6 ? r.prevLook : prev; r.strobeN += 1; if (r.strobeN > 2) { r.strobeBad = true; say(r, 'strobe again? — safety', 'bad', t); } }
  r.look = k; r.lastChange = t;
  const b = best as { i: number; d: number; sec: string } | null;
  if (!b) { r.crowd -= 3; say(r, 'mid-phrase change… (−3)', 'warn', t); if (k === 7) { r.crowd -= 6; say(r, 'blackout while the band plays! BOO', 'bad', t); } if (k === 6) { r.strobeBad = true; say(r, 'strobe out of nowhere — safety', 'bad', t); } return r; }
  if (k === 6 && !['chorus', 'chorus2', 'final'].includes(b.sec)) r.strobeBad = true;
  const ok = CUE_OK[b.sec]!.includes(k) && !(k === 6 && lv === 1), ad = Math.abs(b.d), g: CueHit['g'] = ad <= W[0]! ? 'perfect' : ad <= W[1]! ? 'good' : b.d > 0 ? 'late' : 'early';
  const pts = ok ? (g === 'perfect' ? 10 : g === 'good' ? 7 : 3) : 1, rep = k === prev, over = r.used[k]! > 3;
  r.hits[b.i] = { k, g, ok, rep, pts: pts - (rep ? 3 : 0) - (over ? 2 : 0) };
  r.crowd += ok ? (g === 'perfect' ? 9 : g === 'good' ? 6 : 1) : -7; if (rep) r.crowd -= 5; if (over) r.crowd -= 3;
  say(r, !ok ? `wrong look for the ${b.sec} — BOO` : rep ? 'same look again… (−5)' : over ? 'they’ve seen this one a lot' : g === 'perfect' ? 'ON THE BEAT — CHEER!' : g === 'good' ? 'nice — cheer' : `${g} (${round(ad, 2)} s)`, !ok || rep ? 'bad' : g === 'perfect' || g === 'good' ? 'good' : 'warn', t);
  return r;
}
/** One frame of the show: missed cues boo, the strobe releases after 4 s, and a look held for four bars slowly loses the crowd. */
export function cueTick(S: Song, prev: CueRun, t: number, W: readonly number[]): CueRun {
  let r = prev; const upd = () => { if (r === prev) r = { ...prev, missed: [...prev.missed] }; };
  S.cues.forEach((c, i) => { if (!r.hits[i] && t - c.t > W[2]! && !r.missed[i]) { upd(); r.missed[i] = true; r.crowd -= 10; say(r, `missed the ${c.sec} — BOO`, 'bad', t); } });
  if (r.look === 6 && r.strobeT != null && t - r.strobeT > 4) { upd(); r.look = r.prevLook || 5; say(r, 'strobe released after 4 s (bump)', 'info', t); }
  if (t - r.lastChange > (8 * S.bar) / 2 && r.crowd > 30) { upd(); r.crowd -= 0.02; }
  return r;
}
export function cueFinish(S: Song, r: CueRun, lv: number, W: readonly number[], abort = false): Result {
  if (abort) return { checks: [{ ok: false, must: true, label: 'Finished the song', why: 'You stopped the show. The band didn’t.' }] };
  const n = S.cues.length; let onT = 0, rightL = 0, reps = 0; for (let i = 0; i < n; i += 1) { const h = r.hits[i]; if (h) { if (h.g === 'perfect' || h.g === 'good') onT += 1; if (h.ok) rightL += 1; if (h.rep) reps += 1; } }
  const endHit = r.hits[n - 1]?.k === 7, crowd = clamp(Math.round(r.crowd), 0, 100), need = [0, 0.7, 0.8, 0.8, 0.85][lv]!, used6 = !!r.used[6];
  return { headline: crowd >= 75 ? '🙌 The crowd is on its feet.' : crowd >= 55 ? 'The crowd is with you — mostly.' : '👎 The crowd is booing the lighting desk.', checks: [
    { ok: onT / n >= need, w: 3, must: true, label: 'Cues on the beat', got: `${onT} of ${n} within ±${round(W[1]!, 2)} s`, want: `≥ ${Math.round(need * 100)}%`, why: 'Count the band in: changes land on the first beat of the new section. Watch the playhead reach the marker and listen for the downbeat.' },
    { ok: rightL / n >= need, w: 2.5, label: 'The right look for the moment', got: `${rightL} of ${n}`, want: `≥ ${Math.round(need * 100)}%`, why: 'Quiet sections want washes and deep colour; choruses want the big looks; the last hit wants a blackout. Strobe belongs in a big chorus, if anywhere.' },
    { ok: reps <= (lv >= 3 ? 0 : 1), w: 1.5, label: 'Variety', got: `${reps} repeated look${reps === 1 ? '' : 's'}`, want: lv >= 3 ? 'none' : '≤ 1', why: 'Firing the same look into a new section tells the crowd nothing changed. Build and release.' },
    { ok: !r.strobeBad && !(lv === 1 && used6), w: 2, must: true, label: 'Strobe used safely', got: r.strobeBad ? 'outside a big chorus, or more than twice' : lv === 1 && used6 ? 'used in a beginner set' : used6 ? 'one short burst' : 'not used', want: 'at most two short bursts, in a big chorus only', why: 'Strobe is a hazard for people with photosensitive epilepsy: keep it rare and short, at or under 3 flashes a second, and follow the venue’s signage policy. This desk releases it after 4 seconds.' },
    { ok: endHit, w: 1.5, must: lv >= 2, label: 'Blackout on the final hit', got: endHit ? 'yes' : 'no', want: 'key 7 on the last downbeat', why: 'The last hit is the full stop. Lights out exactly with the band makes the applause.' },
    { ok: crowd >= 60, w: 2, label: 'The crowd at the end', got: `${crowd}/100`, want: '≥ 60', why: 'Every late, wrong or repeated change cost you. The crowd feels timing before it sees colour.' }] };
}
/** reach-cues is played live (`live`): the runner drives song/cueStart/cueFire/cueTick/cueFinish; there is nothing to set and check. */
export const REACH_CUES: Challenge = {
  id: 'reach-cues', mode: 'reach', icon: '🎛', title: 'Run the lights, keep the crowd', time: 0, live: true, formula: 'One bar = 4 beats = 240 ÷ BPM seconds',
  brief: (lv) => `You’re on the lighting desk for one song. Keys 1–8 (or the buttons) fire looks. Land each change on the downbeat, pick a look that fits the moment, and don’t lean on the same look — the crowd notices. Miss a change and they boo; nail it and they cheer. Strobe is capped at 3 flashes a second (the photosensitivity limit) and shown here as a gentle pulse. ${['', 'The cue sheet shows you what’s coming and what fits.', 'The sheet shows the sections, not the answers. A pre-chorus, a mid-chorus change, and a blackout on the last hit.', 'No cue sheet hints, a faster song and a band hit half a beat before the final chorus.', 'Mastery: faster still, and the timeline only shows what has already happened.'][lv]}`,
  init: () => ({}), controls: () => [], readout: (_s, lv) => { const S = song(lv); return [['song', `${S.bpm} BPM · ${S.cues.length} cues`]]; },
  note: 'Lighting a song is timing first: count “1-2-3-4” with the drummer and fire on the next “1”. Build tension with colour and movement, release it on the chorus, and save the biggest moment for the end. Timing windows widen if you’ve chosen relaxed or no timers in settings.',
  evaluate: () => ({ checks: [{ ok: false, must: true, label: 'Finished the song', why: 'Play the song: the cues are judged as you fire them.' }] }),
};
