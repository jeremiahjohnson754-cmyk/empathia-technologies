/**
 * SEE IT, as the reference's chal_see.js has it: the unfocused interview camera (thin-lens depth of field, exposure in stops, mains
 * flicker, shutter angle, white balance in mired), the moiré on the LED wall (emitter grid → defocus disk MTF → optical low-pass →
 * pixel aperture → Bayer sampling), and the promo colours (WCAG 2 contrast, Machado 2009 deuteranopia, hue and saturation for the brief).
 */
import { clamp, round, type Challenge, type CheckItem, type CState, type Readout } from './core.js';

export const N_STOPS = [1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16] as const;
export const SH_STOPS = [24, 25, 30, 40, 48, 50, 60, 80, 100, 120, 125, 250, 500, 1000, 2000] as const;
export const ISO_STOPS = [100, 200, 400, 800, 1600, 3200, 6400, 12800] as const;
export const ND_STOPS = [0, 1, 2, 3, 4, 6] as const;
const mired = (K: number) => 1e6 / K;
/** Bessel J1 (Numerical Recipes approximation). */
export function j1(x: number): number {
  const ax = Math.abs(x); let y: number, a1: number, a2: number;
  if (ax < 8) { y = x * x; a1 = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))));
    a2 = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y)))); return a1 / a2; }
  const z = 8 / ax, xx = ax - 2.356194491; y = z * z;
  a1 = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
  a2 = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a1 - z * Math.sin(xx) * a2); return x < 0 ? -ans : ans;
}
export const diskMTF = (b: number, nu: number) => { const x = Math.PI * b * nu; return x < 1e-6 ? 1 : (2 * j1(x)) / x; };
export const sinc = (x: number) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
/** Thin-lens blur-circle diameter on the sensor for an object at s when focused at sf (all mm). */
export const blur = (f: number, N: number, sf: number, s: number) => ((f * f) / N) * Math.abs(s - sf) / (s * Math.max(1e-3, sf - f));
export function dof(f: number, N: number, sf: number, c: number) { const H = (f * f) / (N * c) + f; return { H, near: (sf * (H - f)) / (H + sf - 2 * f), far: sf < H ? (sf * (H - f)) / (H - sf) : Infinity }; }

// ------------------------------------------------------------------------------------------------------------------- the interview camera
const EV = 7, COC = 0.025, SUBJ = 2500, BG = 6000, PPX = 24.89 / 1920;
export function camera(st: CState, lv: number) {
  const n = (k: string) => Number(st[k]); const f = n('fl'), t = 1 / n('sh'), fps = lv >= 3 ? n('fps') : 30, sf = n('sf') * 1000, flick = lv >= 2 ? 0.3 : 0;
  const need = EV + Math.log2(n('iso') / 100) - n('nd'), cam = Math.log2((n('N') * n('N')) / t), dEV = need - cam;
  const bs = blur(f, n('N'), sf, SUBJ), bb = blur(f, n('N'), sf, BG), D = dof(f, n('N'), sf, COC);
  const ang = 360 * fps * t, resid = flick * Math.abs(sinc(120 * t)), wbErr = mired(n('wb')) - mired(3200);
  const frameW = (SUBJ * 24.89) / f, hand = (1200 / frameW) * 1920 * Math.min(t, 1 / fps);
  return { dEV, bs, bb, bsPx: bs / PPX, bbPx: bb / PPX, dof: D, ang, resid, wbErr, hand, fps, t, flick };
}
export const SEE_FOCUS: Challenge = {
  id: 'see-focus', mode: 'see', icon: '🎥', title: 'Fix the unfocused interview camera', time: 150, clock: 'until the interview starts',
  formula: 'Exposure EV = log₂(N² ÷ t) · hyperfocal H = f² ÷ (N·c) + f · shutter angle = 360° × fps × t',
  brief: (lv) => `An interview for the stream, lit with 3,200 K tungsten-balanced key light (scene brightness EV 7 at ISO 100). The camera was left on someone else’s settings: focus on the wrong thing, a ridiculous shutter, a noisy ISO and daylight white balance. ${['', 'Get her sharp, exposed and the right colour for a 30p stream.', 'Now the house lights are LEDs on 60 Hz mains — 120 flickers a second. 30p delivery; stay near the camera’s native ISO 800.', 'The director wants a 24p film look with the background soft, the interviewee sharp, native ISO and no flicker. You’ll need the ND.', 'Mastery: the 24p brief, on the clock.'][lv]}`,
  init: () => ({ fl: 50, sf: 0.9, N: 1.4, sh: 1000, iso: 6400, nd: 0, wb: 5600, fps: 30 }),
  controls: (lv) => [
    { kind: 'slider', key: 'sf', label: 'Focus distance', min: 0.5, max: 10, step: 0.01, unit: 'm', log: true },
    { kind: 'stops', key: 'N', label: 'Aperture (f-number)', stops: N_STOPS, fmt: (v) => `f/${v}` },
    { kind: 'stops', key: 'sh', label: 'Shutter speed', stops: SH_STOPS, fmt: (v) => `1/${v} s` },
    { kind: 'stops', key: 'iso', label: 'ISO', stops: ISO_STOPS, fmt: String },
    { kind: 'stops', key: 'nd', label: 'ND filter', stops: ND_STOPS, fmt: (v) => (v ? `${v} stops (ND ${round(v * 0.3, 1)})` : 'none') },
    { kind: 'slider', key: 'wb', label: 'White balance', min: 2500, max: 10000, step: 50, unit: 'K' },
    ...(lv >= 3 ? [{ kind: 'select' as const, key: 'fps', label: 'Frame rate', options: [[24, '24p'], [25, '25p'], [30, '30p'], [60, '60p']] as Array<[number, string]> }, { kind: 'select' as const, key: 'fl', label: 'Lens (focal length)', options: [[35, '35 mm'], [50, '50 mm'], [85, '85 mm']] as Array<[number, string]> }] : []),
  ],
  readout: (st, lv) => { const C = camera(st, lv); const r: Readout = [['exposure', `${C.dEV > 0 ? '+' : ''}${round(C.dEV, 1)} stops`, Math.abs(C.dEV) <= 0.5 ? '' : 'bad'], ['depth of field', `${round(C.dof.near / 1000, 2)}–${Number.isFinite(C.dof.far) ? round(C.dof.far / 1000, 2) : '∞'} m`], ['blur on her face', `${round(C.bs * 1000, 0)} µm (limit ${COC * 1000})`, C.bs <= COC ? '' : 'bad'], ['background blur', `${round(C.bbPx, 1)} px (HD)`], ['shutter angle', `${Math.round(C.ang)}°`]];
    if (C.flick) r.push(['flicker left', `${round(C.resid * 100, 1)}%`, C.resid > 0.02 ? 'bad' : '']); r.push(['white balance off by', `${Math.round(C.wbErr)} mired`]); return r; },
  note: 'Exposure: every stop of aperture, shutter, ISO or ND doubles or halves the light. Depth of field: wider aperture, longer lens or closer focus = less of the scene sharp. Flicker: mains-powered lights pulse at twice the mains frequency; an exposure that holds a whole number of pulses (1/60, 1/120, 1/40 s under 60 Hz mains) sees the same light every frame. White balance: set the camera to the light, not to the weather outside.',
  evaluate: (st, lv) => {
    const C = camera(st, lv), c: CheckItem[] = [], tolE = [0, 1, 0.5, 0.34, 0.34][lv]!, tolW = [0, 40, 20, 15, 15][lv]!, isoR = [[0, 0], [100, 3200], [400, 1600], [800, 1600], [800, 1600]][lv]!, angR = lv >= 2 ? [144, 216] : [90, 270];
    const iso = Number(st['iso']), sh = Number(st['sh']);
    c.push({ ok: C.bs <= COC, w: 3, must: true, label: 'She is in focus', got: `${round(C.bs * 1000, 0)} µm blur circle on her eyes`, want: `≤ ${COC * 1000} µm (the circle of confusion)`, why: 'Measure or estimate the distance to her eyes (2.5 m) and focus there; at a wide aperture the sharp zone is only centimetres deep.' });
    c.push({ ok: Math.abs(C.dEV) <= tolE, w: 3, must: true, label: 'Exposure', got: `${C.dEV > 0 ? '+' : ''}${round(C.dEV, 2)} stops`, want: `±${round(tolE, 2)} stops`, why: C.dEV > 0 ? 'Too bright: stop down, use a faster shutter only if the motion rules allow, lower the ISO or add ND.' : 'Too dark: open up, lower the shutter speed within the rules, or raise the ISO — each stop doubles the light.' });
    c.push({ ok: Math.abs(C.wbErr) <= tolW, w: 2, label: 'White balance matches the light', got: `${st['wb']} K (${Math.round(C.wbErr)} mired off)`, want: `3,200 K ±${tolW} mired`, why: 'Under 3,200 K light a camera set to daylight (5,600 K) renders everything orange. Set the camera to the light’s colour temperature.' });
    c.push({ ok: iso >= isoR[0]! && iso <= isoR[1]!, w: 1.5, label: 'ISO (noise)', got: `ISO ${iso}`, want: `${isoR[0]}–${isoR[1]}`, why: iso > isoR[1]! ? 'High ISO amplifies the sensor’s noise along with the picture.' : 'This camera’s native ISO is 800; well below it you lose highlight headroom.' });
    c.push({ ok: C.ang >= angR[0]! - 0.5 && C.ang <= angR[1]! + 0.5, w: 1.5, label: 'Natural motion (shutter angle)', got: `${Math.round(C.ang)}° (1/${sh} at ${C.fps}p)`, want: `${angR[0]}–${angR[1]}°`, why: C.ang < angR[0]! ? 'A very short shutter freezes each frame: movement looks jittery and staccato.' : 'The shutter can’t stay open longer than a frame, and near 360° movement smears.' });
    if (C.flick) c.push({ ok: C.resid <= (lv >= 3 ? 0.01 : 0.02), w: 2.5, must: true, label: 'No flicker from the 60 Hz LED house lights', got: `${round(C.resid * 100, 1)}% brightness wobble`, want: `≤ ${lv >= 3 ? 1 : 2}%`, why: 'Lights on 60 Hz mains pulse 120 times a second. Choose an exposure that holds whole pulses: 1/120, 1/60 or 1/40 s.' });
    if (lv >= 3) {
      c.push({ ok: C.fps === 24, w: 2, must: true, label: 'Delivered at 24p as briefed', got: `${C.fps}p`, want: '24p', why: 'The director asked for 24p. At 24p under 60 Hz mains, 1/60 s (144°) or 1/40 s (216°) keeps the flicker away.' });
      c.push({ ok: C.bbPx >= 12, w: 2, label: 'Background soft (separation)', got: `${round(C.bbPx, 1)} px of blur`, want: '≥ 12 px', why: 'Open the aperture (and use ND to hold exposure) or use a longer lens to soften the shelves behind her.' });
    }
    return { checks: c };
  },
};

// ------------------------------------------------------------------------------------------------------------------- moiré
const M_FILL = 0.35; export const M_PP = 24.89 / 3840;
export const M_PITCH = [0, 3.9, 2.6, 1.9, 1.9]; const M_LIM = [0, 0.08, 0.05, 0.03, 0.03]; const M_COC = 0.02;
export interface Harmonic { k: number; a: number; m: number; rho: number; amp: number; alias: boolean }
export function moire(o: { P: number; st: number; g: number; f: number; N: number; sf: number }) {
  const D = (o.st + o.g) * 1000, sf = o.sf * 1000, pi = (o.P * o.f) / (D - o.f), bw = blur(o.f, o.N, sf, D), bt = blur(o.f, o.N, sf, o.st * 1000); const H: Harmonic[] = [];
  for (let k = 1; k <= 3; k += 1) { const ak = (2 * Math.sin(Math.PI * k * M_FILL)) / (Math.PI * k), nu = k / pi, rho = nu * M_PP, m = diskMTF(bw, nu) * sinc(rho) * Math.cos(Math.PI * rho); H.push({ k, a: ak, m, rho, amp: Math.abs((ak / M_FILL) * m), alias: rho > 0.25 }); }
  const sev = H.reduce((s, h) => Math.max(s, h.alias ? h.amp : 0), 0), grid = !H[0]!.alias && H[0]!.amp > 0.3;
  return { pi, rho: H[0]!.rho, bw, bt, H, sev, grid, frameH: (o.st * 14.0) / o.f };
}
const mo = (st: CState, lv: number) => moire({ P: M_PITCH[lv]!, st: Number(st['st']), g: Number(st['g']), f: Number(st['f']), N: Number(st['N']), sf: Number(st['sf']) });
/** The sensor crop, w×h RGBA, computed as the reference does: the wall's grid through the optics, sampled on an RGGB mosaic, bilinear demosaic. */
export function moireImage(R: ReturnType<typeof moire>, w: number, h: number): Uint8ClampedArray {
  const th = (1.2 * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th), raw = new Float32Array(w * h), px = new Uint8ClampedArray(w * h * 4);
  const G = (u: number) => { let s = M_FILL; for (const q of R.H) s += q.a * q.m * Math.cos((2 * Math.PI * q.k * u) / R.pi); return s / M_FILL; };
  const content = (i: number, j: number, ch: number) => { const x = i / w, y = j / h; return ch === 0 ? 0.55 + 0.4 * x : ch === 1 ? 0.18 + 0.25 * (1 - y) : 0.75 - 0.35 * x; };
  const chAt = (i: number, j: number) => ((j & 1) === 0 ? ((i & 1) === 0 ? 0 : 1) : (i & 1) === 0 ? 1 : 2);
  for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) { const x = (i - w / 2) * M_PP, y = (j - h / 2) * M_PP, u = x * cs + y * sn, v = -x * sn + y * cs; raw[j * w + i] = Math.max(0, content(i, j, chAt(i, j)) * G(u) * G(v) * 0.5); }
  for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) { const rgb = [0, 0, 0], cnt = [0, 0, 0];
    for (let dj = -1; dj <= 1; dj += 1) for (let di = -1; di <= 1; di += 1) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue; const c = chAt(ii, jj), wgt = di === 0 && dj === 0 ? 4 : di === 0 || dj === 0 ? 2 : 1; rgb[c] = rgb[c]! + raw[jj * w + ii]! * wgt; cnt[c] = cnt[c]! + wgt; }
    const p = (j * w + i) * 4; for (let c = 0; c < 3; c += 1) px[p + c] = Math.round(255 * clamp(rgb[c]! / Math.max(1e-9, cnt[c]!), 0, 1) ** (1 / 2.2)); px[p + 3] = 255; }
  return px;
}
export const SEE_MOIRE: Challenge = {
  id: 'see-moire', mode: 'see', icon: '🌀', title: 'Kill the moiré on the LED wall', time: 150, clock: 'until the walk-on',
  formula: 'LED pitch on the sensor = P × f ÷ (D − f). It aliases above 0.25 cycles per pixel (colour) and 0.5 (luma)',
  brief: (lv) => `The host stands in front of an LED wall (pixel pitch ${M_PITCH[lv]} mm) and the camera shows rainbow ripples crawling across it. Moiré happens when the wall’s grid of LEDs lands near the sensor’s own pixel grid. ${['', 'Make the ripples go away and keep the host sharp.', 'Kill it properly — no ripples and no visible LED “screen door”. The host stays sharp.', 'A finer wall, a stricter limit, and the director wants a medium shot (1.0–1.6 m of the host in frame).', 'Mastery: the medium shot, on the clock.'][lv]}`,
  init: () => ({ st: 3, g: 1, f: 24, N: 8, sf: 4 }),
  controls: () => [
    { kind: 'slider', key: 'st', label: 'Camera to host', min: 1.5, max: 10, step: 0.1, unit: 'm' },
    { kind: 'slider', key: 'g', label: 'Host to wall', min: 0.5, max: 5, step: 0.1, unit: 'm' },
    { kind: 'select', key: 'f', label: 'Lens (focal length)', options: [18, 24, 35, 50, 85, 135].map((v) => [v, `${v} mm`] as [number, string]) },
    { kind: 'stops', key: 'N', label: 'Aperture (f-number)', stops: N_STOPS, fmt: (v) => `f/${v}` },
    { kind: 'slider', key: 'sf', label: 'Focus distance', min: 1, max: 15, step: 0.05, unit: 'm' },
  ],
  readout: (st, lv) => { const R = mo(st, lv), lim = M_LIM[lv]!; const r: Readout = [['LED pitch on the sensor', `${round(R.pi / M_PP, 2)} px`], ['moiré strength', `${round(R.sev, 3)} (limit ${lim})`, R.sev > lim ? 'bad' : ''], ['wall blur', `${round(R.bw * 1000, 0)} µm`], ['host blur', `${round(R.bt * 1000, 0)} µm (limit ${M_COC * 1000})`, R.bt > M_COC ? 'bad' : '']]; if (lv >= 3) r.push(['host in frame', `${round(R.frameH, 2)} m tall`]); return r; },
  note: 'The fixes a camera operator reaches for, in order: focus on the host, not the wall; open the aperture (add ND to keep exposure) so the wall falls soft; move the host further from the wall; change focal length or distance so the grid stops landing near the pixel grid. The picture is a 320 × 180 pixel crop computed from those optics.',
  evaluate: (st, lv) => {
    const R = mo(st, lv), lim = M_LIM[lv]!, c: CheckItem[] = [];
    c.push({ ok: R.sev <= lim, w: 3, must: true, label: 'No moiré', got: String(round(R.sev, 3)), want: `≤ ${lim}`, why: 'The LED grid (or one of its harmonics) still reaches the sensor with contrast above a sampling limit. Defocus the wall: focus on the host, open up, and move the host away from the wall.' });
    c.push({ ok: R.bt <= M_COC, w: 3, must: true, label: 'The host is sharp', got: `${round(R.bt * 1000, 0)} µm blur`, want: `≤ ${M_COC * 1000} µm`, why: 'Focusing on the wall (or letting the host fall outside the depth of field) trades moiré for a soft face. Focus on the host’s eyes.' });
    if (lv >= 2) c.push({ ok: !R.grid, w: 1.5, label: 'No LED “screen door”', got: R.grid ? 'you can count the LEDs' : 'smooth', want: 'smooth', why: 'The grid is resolved and in focus: no aliasing, but the audience sees the dots. A little defocus fixes both.' });
    if (lv >= 3) c.push({ ok: R.frameH >= 1.0 && R.frameH <= 1.6, w: 2, must: true, label: 'A medium shot as asked', got: `${round(R.frameH, 2)} m of the host in frame`, want: '1.0–1.6 m', why: 'Frame height ≈ distance × sensor height ÷ focal length (14 mm tall on this sensor). Change distance or lens until the host fills the frame from the waist up.' });
    return { checks: c };
  },
};

// ------------------------------------------------------------------------------------------------------------------- promo colours
export const hex = (h: string): [number, number, number] => { const s = h.replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };
const lin = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const unlin = (v: number) => { const x = clamp(v, 0, 1); return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)); };
export const lum = (c: number[]) => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
export const contrast = (a: number[], b: number[]) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
export const deut = (c: number[]) => { const r = lin(c[0]!), g = lin(c[1]!), b = lin(c[2]!); return [unlin(0.367322 * r + 0.860646 * g - 0.227968 * b), unlin(0.280085 * r + 0.672501 * g + 0.047413 * b), unlin(-0.01182 * r + 0.04294 * g + 0.968881 * b)]; };
export function hsl(c: number[]) { const r = c[0]! / 255, g = c[1]! / 255, b = c[2]! / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0;
  if (d > 1e-6) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return { h, s, l }; }
export const SWATCHES = ['#0B1026', '#14213D', '#1E3A8A', '#0F766E', '#134E4A', '#312E81', '#4C1D95', '#831843', '#7F1D1D', '#2E7D32', '#43A047', '#E53935', '#F97316', '#F59E0B', '#FACC15', '#FDE68A', '#F8FAFC', '#E2E8F0', '#94A3B8', '#475569', '#111827', '#FF2E88', '#22D3EE', '#81C784'];
export const promoText = (lv: number) => ({ title: lv >= 3 ? 'YOUTH NIGHT' : lv === 2 ? 'CANDLELIGHT & STRINGS' : 'CHRISTMAS EVE · LIVE', sub: lv >= 3 ? 'Friday 7 pm · games, music, food · bring a friend' : lv === 2 ? 'Sunday 6:30 pm · quartet and readings · all welcome' : 'Tonight 7 pm · in the room and on the stream', small: 'Parking behind the hall · step-free entrance · captions on the stream' });
export const buttonText = (ac: string) => { const a = hex(ac); return contrast(a, [255, 255, 255]) >= contrast(a, [17, 24, 39]) ? '#FFFFFF' : '#111827'; };
export const SEE_PROMO: Challenge = {
  id: 'see-promo', mode: 'see', icon: '🎨', title: 'Colour the video promo so it reads', time: 150, clock: 'until it goes to the screens', formula: 'Contrast ratio = (L_lighter + 0.05) ÷ (L_darker + 0.05)',
  brief: (lv) => ['', 'A promo slide for the service stream. Right now it’s red text on green — pretty to nobody and unreadable to many. Make every line readable.', 'Brief: “Candlelight & Strings — a calm, reflective evening.” Readable, calm, and one warm thing to tap.', 'Brief: “Youth Night — loud, bright, energetic.” It must pass the stricter AAA contrast for body text, still work for a viewer with red-green colour blindness, and survive a compressed stream (4:2:0 video keeps colour detail at a quarter of the resolution, so small text must stand out by brightness, not hue).', 'Mastery: the Youth Night brief, on the clock.'][lv]!,
  init: () => ({ bg: '#2E7D32', hd: '#E53935', bd: '#81C784', ac: '#43A047', sim: 'none' }),
  controls: () => [{ kind: 'color', key: 'bg', label: 'Background' }, { kind: 'color', key: 'hd', label: 'Headline' }, { kind: 'color', key: 'bd', label: 'Body text' }, { kind: 'color', key: 'ac', label: 'Button (accent)' },
    { kind: 'select', key: 'sim', label: 'Preview as', options: [['none', 'Normal vision'], ['deut', 'Red-green colour blindness (deuteranopia)'], ['gray', 'Brightness only (greyscale)']] }],
  readout: (st, lv) => { const bg = hex(String(st['bg'])), ac = hex(String(st['ac'])); const r: Readout = [['headline', `${round(contrast(hex(String(st['hd'])), bg), 2)}:1`], ['body text', `${round(contrast(hex(String(st['bd'])), bg), 2)}:1`], ['button vs background', `${round(contrast(ac, bg), 2)}:1`], ['button label', `${round(contrast(hex(buttonText(String(st['ac']))), ac), 2)}:1 (auto)`]];
    if (lv >= 3) r.push(['colour-blind view: button', `${round(contrast(deut(ac), deut(bg)), 2)}:1`]); return r; },
  note: 'Contrast ratio = (lighter luminance + 0.05) ÷ (darker luminance + 0.05). WCAG asks 4.5:1 for body text, 3:1 for large headlines and for buttons against their background, 7:1 for the enhanced (AAA) level. If it still reads in the greyscale preview, it reads for almost everyone.',
  evaluate: (st, lv) => {
    const bg = hex(String(st['bg'])), hd = hex(String(st['hd'])), bd = hex(String(st['bd'])), ac = hex(String(st['ac'])), c: CheckItem[] = [], H = hsl(bg), A = hsl(ac), B = hsl(bd); const hdMin = lv >= 3 ? 4.5 : 3, bdMin = lv >= 3 ? 7 : 4.5;
    c.push({ ok: contrast(hd, bg) >= hdMin, w: 3, must: true, label: 'Headline readable', got: `${round(contrast(hd, bg), 2)}:1`, want: `≥ ${hdMin}:1`, why: 'Large text needs at least 3:1 against its background (4.5:1 for this brief). Change lightness, not just hue.' });
    c.push({ ok: contrast(bd, bg) >= bdMin, w: 3, must: true, label: 'Body text readable', got: `${round(contrast(bd, bg), 2)}:1`, want: `≥ ${bdMin}:1`, why: 'Small text needs more contrast than a headline. Near-white on dark or near-black on light always works.' });
    c.push({ ok: contrast(ac, bg) >= 3, w: 2, must: lv >= 2, label: 'The button stands out from the background', got: `${round(contrast(ac, bg), 2)}:1`, want: '≥ 3:1', why: 'A button the same brightness as its background disappears, especially on a projected screen in a lit room.' });
    if (lv === 2) {
      c.push({ ok: H.l < 0.25 || (H.h >= 170 && H.h <= 290 && H.s <= 0.7), w: 2, label: 'Calm background (cool or deep, not shouting)', got: `hue ${Math.round(H.h)}°, saturation ${Math.round(H.s * 100)}%, lightness ${Math.round(H.l * 100)}%`, want: 'deep/dark, or cool hue 170–290° under 70% saturation', why: 'Cool hues and deep, low-saturation grounds read as calm; saturated warm grounds read as urgent.' });
      c.push({ ok: (A.h <= 60 || A.h >= 340) && A.s >= 0.5, w: 2, label: 'One warm accent to tap', got: `hue ${Math.round(A.h)}°, saturation ${Math.round(A.s * 100)}%`, want: 'warm hue (red-orange-gold), ≥ 50% saturation', why: 'On a calm, cool card the one warm, saturated element is the one the eye goes to — make it the button.' });
    }
    if (lv >= 3) {
      c.push({ ok: A.s >= 0.7 && (A.h <= 60 || A.h >= 280), w: 2, label: 'Energy: a hot, saturated accent', got: `hue ${Math.round(A.h)}°, saturation ${Math.round(A.s * 100)}%`, want: 'magenta-red-orange-yellow, ≥ 70% saturated', why: 'High-energy briefs live in the warm and magenta hues at full saturation.' });
      c.push({ ok: contrast(deut(ac), deut(bg)) >= 3 && contrast(deut(hd), deut(bg)) >= hdMin, w: 2.5, must: true, label: 'Works with red-green colour blindness', got: `button ${round(contrast(deut(ac), deut(bg)), 2)}:1 · headline ${round(contrast(deut(hd), deut(bg)), 2)}:1`, want: `button ≥ 3:1 · headline ≥ ${hdMin}:1 in the simulation`, why: 'About one man in twelve has some red-green colour deficiency. Red on green (or green on red) can collapse to one muddy colour — separate by brightness.' });
      c.push({ ok: B.s <= 0.3 || contrast(bd, bg) >= 7, w: 1.5, label: 'Small text survives a compressed stream', got: `body saturation ${Math.round(B.s * 100)}%`, want: 'near-neutral body text (≤ 30% saturated)', why: '4:2:0 streaming halves colour resolution in both directions; saturated small text on a coloured ground smears. Let small text be near-white or near-black.' });
    }
    return { checks: c };
  },
};
