/**
 * Field Tools: the calculators an AV/IT technician, installer, commissioning engineer, systems engineer or project manager reaches for on
 * site (founder, 18 Nov 2026: "call it field tools … something people can instantly be able to jump over to … not to be confused with
 * commissioning tools"). Inspired by the scope of a public show-site companion; every formula here is standard physics or long-published
 * engineering practice, written and explained in our own words, and every result says what it rests on.
 *
 * A tool is data: its inputs (with units and sensible ranges), a pure `run` that returns labelled outputs, the formula in words and
 * symbols, and a worked line that substitutes the actual numbers. Rules of thumb are named as rules of thumb. Nothing here replaces a
 * manufacturer's data sheet, an engineer's stamp, a licensed electrician or a qualified rigger, and every tool says so where it matters.
 *
 * Units: every input is entered in the unit its field names. Lengths offer feet or metres where it matters; internally everything is SI.
 */

export type Category = 'display' | 'projection' | 'led' | 'signal' | 'audio' | 'acoustics' | 'power' | 'rigging' | 'network' | 'cabling' | 'lighting' | 'project' | 'convert';
export const CATEGORIES: ReadonlyArray<{ id: Category; label: string; blurb: string }> = [
  { id: 'display', label: 'Display', blurb: 'Screen geometry and viewing' },
  { id: 'projection', label: 'Projection', blurb: 'Throw, brightness and contrast' },
  { id: 'led', label: 'LED walls', blurb: 'Pitch, size, power and weight' },
  { id: 'signal', label: 'Video signal', blurb: 'Bandwidth and which link carries it' },
  { id: 'audio', label: 'Audio', blurb: 'Levels, loads, speakers and lines' },
  { id: 'acoustics', label: 'Acoustics', blurb: 'Rooms, gain and intelligibility' },
  { id: 'power', label: 'Power', blurb: 'Circuits, drop, heat and runtime' },
  { id: 'rigging', label: 'Rigging', blurb: 'Bridles, angles and load factors' },
  { id: 'network', label: 'Network', blurb: 'Subnets, PoE and AV-over-IP' },
  { id: 'cabling', label: 'Cabling', blurb: 'Fiber budgets and copper limits' },
  { id: 'lighting', label: 'Lighting', blurb: 'Illuminance and luminance' },
  { id: 'project', label: 'Project and crew', blurb: 'Labor and schedule arithmetic' },
  { id: 'convert', label: 'Convert', blurb: 'Units site work keeps asking for' },
];

export type Value = number | string;
export interface Field { id: string; label: string; unit?: string; kind?: 'number' | 'select' | 'text'; options?: ReadonlyArray<{ value: string; label: string }>; default: Value; min?: number; max?: number; step?: number; help?: string }
export interface Out { label: string; value: string; tone?: 'ok' | 'warn' | 'bad' | 'muted'; note?: string; key?: boolean }
export interface Result { outputs: Out[]; worked: string[]; warnings: string[] }
export interface Tool { id: string; category: Category; title: string; summary: string; fields: Field[]; run: (v: Record<string, Value>) => Result;
  formula: string[]; basis: string; cts?: ReadonlyArray<'CTS' | 'CTS-D' | 'CTS-I'>; caution?: string; keywords?: string }

// ------------------------------------------------------------------------------------------------ helpers
export const FT = 0.3048; export const IN = 0.0254;
const n = (v: Value | undefined, d = 0): number => { const x = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(x) ? x : d; };
const s = (v: Value | undefined): string => String(v ?? '');
export const fmt = (x: number, dp = 2): string => { if (!Number.isFinite(x)) return '—'; const a = Math.abs(x); const d = a >= 1000 ? 0 : a >= 100 ? Math.min(dp, 1) : dp; return x.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 }); };
export const feetInches = (m: number): string => { const totalIn = m / IN; let ft = Math.floor(totalIn / 12); let inch = Math.round(totalIn - ft * 12); if (inch === 12) { ft += 1; inch = 0; } return `${ft}′ ${inch}″`; };
const lenBoth = (m: number) => `${fmt(m / FT, 1)} ft (${feetInches(m)}) · ${fmt(m, 2)} m`;
const log10 = Math.log10; const db10 = (r: number) => 10 * log10(r); const db20 = (r: number) => 20 * log10(r);
const R = (outputs: Out[], worked: string[] = [], warnings: string[] = []): Result => ({ outputs, worked, warnings });
const UNIT_LEN = [{ value: 'ft', label: 'feet' }, { value: 'm', label: 'metres' }] as const;
const toM = (x: number, u: Value | undefined) => (s(u) === 'm' ? x : x * FT);
const ASPECTS = [{ value: '16:9', label: '16:9' }, { value: '16:10', label: '16:10' }, { value: '4:3', label: '4:3' }, { value: '1.9:1', label: '1.9:1 (DCI 4K)' }, { value: '2.39:1', label: '2.39:1 (scope)' }, { value: '32:9', label: '32:9' }, { value: '21:9', label: '21:9' }];
export const aspect = (a: Value | undefined): [number, number] => { const [w, h] = s(a).split(':').map(Number); return [w || 16, h || 9]; };

// copper conductor resistance, ohms per 1000 ft at 20 °C (solid/stranded within a few percent): AWG → Ω/kft and circular mils
export const AWG: Readonly<Record<string, { ohmsPerKft: number; cmil: number }>> = {
  '4/0': { ohmsPerKft: 0.0490, cmil: 211600 }, '2/0': { ohmsPerKft: 0.0779, cmil: 133100 }, '1/0': { ohmsPerKft: 0.0983, cmil: 105600 },
  '2': { ohmsPerKft: 0.1563, cmil: 66360 }, '4': { ohmsPerKft: 0.2485, cmil: 41740 }, '6': { ohmsPerKft: 0.3951, cmil: 26240 }, '8': { ohmsPerKft: 0.6282, cmil: 16510 },
  '10': { ohmsPerKft: 0.9989, cmil: 10380 }, '12': { ohmsPerKft: 1.588, cmil: 6530 }, '14': { ohmsPerKft: 2.525, cmil: 4110 }, '16': { ohmsPerKft: 4.016, cmil: 2580 },
  '18': { ohmsPerKft: 6.385, cmil: 1620 }, '20': { ohmsPerKft: 10.15, cmil: 1020 }, '22': { ohmsPerKft: 16.14, cmil: 642 }, '24': { ohmsPerKft: 25.67, cmil: 404 },
};
const gauges = (list: string[]) => list.map((g) => ({ value: g, label: `${g} AWG` }));

// ------------------------------------------------------------------------------------------------ display
const screenSize: Tool = {
  id: 'screen-size', category: 'display', title: 'Screen size from diagonal', summary: 'Width, height and area of an image from its diagonal and aspect ratio.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'diag', label: 'Diagonal', unit: 'in', default: 120, min: 1 }, { id: 'aspect', label: 'Aspect ratio', kind: 'select', options: ASPECTS, default: '16:9' }],
  run: (v) => { const d = n(v.diag) * IN; const [aw, ah] = aspect(v.aspect); const k = Math.hypot(aw, ah); const w = d * aw / k; const h = d * ah / k;
    return R([{ label: 'Width', value: lenBoth(w), key: true }, { label: 'Height', value: lenBoth(h), key: true }, { label: 'Area', value: `${fmt(w * h / FT / FT, 1)} ft² · ${fmt(w * h, 2)} m²` }],
      [`hypotenuse factor √(${aw}² + ${ah}²) = ${fmt(k, 3)}`, `width = ${fmt(n(v.diag), 1)} in × ${aw} ÷ ${fmt(k, 3)} = ${fmt(w / IN, 1)} in`, `height = ${fmt(n(v.diag), 1)} in × ${ah} ÷ ${fmt(k, 3)} = ${fmt(h / IN, 1)} in`]); },
  formula: ['k = √(a_w² + a_h²)', 'W = D · a_w / k', 'H = D · a_h / k'], basis: 'Pythagoras on the aspect ratio: the diagonal is the hypotenuse of a right triangle whose sides are in the ratio a_w : a_h.',
  keywords: 'diagonal width height aspect area inches',
};

const viewing: Tool = {
  id: 'viewing-distance', category: 'display', title: 'Viewing distances for an image', summary: 'Closest and farthest viewers for an image height, by the 2× / 4× / 6× / 8× rules of thumb.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'diag', label: 'Diagonal', unit: 'in', default: 120, min: 1 }, { id: 'aspect', label: 'Aspect ratio', kind: 'select', options: ASPECTS, default: '16:9' }],
  run: (v) => { const d = n(v.diag) * IN; const [aw, ah] = aspect(v.aspect); const h = d * ah / Math.hypot(aw, ah);
    return R([{ label: 'Image height', value: lenBoth(h) }, { label: 'Closest viewer (≈ 2 × height, or the 30° vertical limit)', value: lenBoth(2 * h), key: true },
      { label: 'Farthest: inspection (4 × height)', value: lenBoth(4 * h) }, { label: 'Farthest: detailed / analytical (6 × height)', value: lenBoth(6 * h), key: true }, { label: 'Farthest: general viewing (8 × height)', value: lenBoth(8 * h) }],
      [`H = ${fmt(h / IN, 1)} in`, `farthest analytical = 6 × ${fmt(h / IN, 1)} in = ${fmt(6 * h / FT, 1)} ft`]); },
  formula: ['closest ≈ 2 · H', 'farthest = k · H, k = 4 (inspection), 6 (detailed), 8 (general)'],
  basis: 'Traditional rules of thumb linking the farthest viewer to image height by how fine the content is. AVIXA publishes a standard for this (DISCAS); for a design of record use it, not these ratios.',
  keywords: 'viewing distance farthest viewer closest 4 6 8 rule image height discas',
};

const screenForRoom: Tool = {
  id: 'screen-for-room', category: 'display', title: 'Image size for a room', summary: 'Minimum image height and diagonal so the farthest viewer can read the content.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'far', label: 'Farthest viewer', default: 30, min: 1 }, { id: 'u', label: 'Unit', kind: 'select', options: UNIT_LEN, default: 'ft' },
    { id: 'k', label: 'Content', kind: 'select', options: [{ value: '8', label: 'General viewing (8×)' }, { value: '6', label: 'Detailed / analytical (6×)' }, { value: '4', label: 'Inspection (4×)' }], default: '6' },
    { id: 'aspect', label: 'Aspect ratio', kind: 'select', options: ASPECTS, default: '16:9' }],
  run: (v) => { const far = toM(n(v.far), v.u); const k = n(v.k, 6); const h = far / k; const [aw, ah] = aspect(v.aspect); const w = h * aw / ah; const d = Math.hypot(w, h);
    return R([{ label: 'Minimum image height', value: lenBoth(h), key: true }, { label: 'Image width', value: lenBoth(w) }, { label: 'Minimum diagonal', value: `${fmt(d / IN, 1)} in · ${fmt(d, 2)} m`, key: true }, { label: 'Closest viewer (2 × height)', value: lenBoth(2 * h) }],
      [`H = farthest ÷ ${k} = ${fmt(far / FT, 1)} ft ÷ ${k} = ${fmt(h / IN, 1)} in`, `W = H × ${aw}/${ah} = ${fmt(w / IN, 1)} in`, `D = √(W² + H²) = ${fmt(d / IN, 1)} in`]); },
  formula: ['H = farthest ÷ k', 'W = H · a_w / a_h', 'D = √(W² + H²)'], basis: 'The inverse of the viewing-distance rule of thumb; check the result against a standard-based calculation for a design of record.',
};

const pixelsVisible: Tool = {
  id: 'pixel-acuity', category: 'display', title: 'Can the viewer see the pixels?', summary: 'Distance at which one pixel subtends one arcminute (20/20 acuity) for a display’s pixel size.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'width', label: 'Image width', unit: 'in', default: 85.6 }, { id: 'px', label: 'Horizontal pixels', default: 1920, min: 1 }, { id: 'seat', label: 'Viewer distance', unit: 'ft', default: 10 }],
  run: (v) => { const p = n(v.width) * IN / n(v.px, 1); const dist = p / Math.tan((1 / 60) * Math.PI / 180); const seat = n(v.seat) * FT; const arcmin = Math.atan(p / seat) * 180 / Math.PI * 60;
    return R([{ label: 'Pixel size', value: `${fmt(p * 1000, 3)} mm` }, { label: 'Pixels blend beyond', value: lenBoth(dist), key: true },
      { label: 'One pixel at your viewer subtends', value: `${fmt(arcmin, 2)} arcmin`, tone: arcmin > 1 ? 'warn' : 'ok', note: arcmin > 1 ? 'larger than 1 arcmin: a 20/20 eye resolves the pixel structure' : 'under 1 arcmin: the structure blends' }],
      [`pixel = ${fmt(n(v.width), 1)} in ÷ ${n(v.px)} = ${fmt(p * 1000, 3)} mm`, `distance = pixel ÷ tan(1′) ≈ 3438 × ${fmt(p * 1000, 3)} mm = ${fmt(dist, 2)} m`]); },
  formula: ['p = W ÷ N', 'd = p ÷ tan(1′) ≈ 3438 · p'], basis: 'Normal (20/20) visual acuity resolves detail of about one arcminute. Real viewers vary; content and contrast matter as much.',
};

// ------------------------------------------------------------------------------------------------ projection
const throwDist: Tool = {
  id: 'throw-distance', category: 'projection', title: 'Projector throw distance', summary: 'Lens-to-screen distance range for a zoom lens and image width.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'w', label: 'Image width', unit: 'in', default: 160, min: 1 }, { id: 'tmin', label: 'Throw ratio (wide)', default: 1.5, step: 0.01 }, { id: 'tmax', label: 'Throw ratio (tele)', default: 2.0, step: 0.01 }, { id: 'aspect', label: 'Aspect ratio', kind: 'select', options: ASPECTS, default: '16:9' }],
  run: (v) => { const w = n(v.w) * IN; const a = n(v.tmin) * w; const b = n(v.tmax) * w; const [aw, ah] = aspect(v.aspect);
    return R([{ label: 'Shortest throw', value: lenBoth(a), key: true }, { label: 'Longest throw', value: lenBoth(b), key: true }, { label: 'Image height', value: `${fmt(w * ah / aw / IN, 1)} in` }],
      [`throw = ratio × width: ${n(v.tmin)} × ${fmt(n(v.w), 1)} in = ${fmt(a / FT, 2)} ft`, `${n(v.tmax)} × ${fmt(n(v.w), 1)} in = ${fmt(b / FT, 2)} ft`],
      n(v.tmin) > n(v.tmax) ? ['the wide ratio is larger than the tele ratio: swap them'] : []); },
  formula: ['TR = D ÷ W', 'D = TR · W'], basis: 'A throw ratio is distance divided by image width; manufacturers measure from the lens (some from the front of the chassis): read the data sheet.',
};

const throwRatio: Tool = {
  id: 'throw-ratio', category: 'projection', title: 'Required throw ratio', summary: 'Which lens a fixed projector position needs for an image width.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'd', label: 'Throw distance', unit: 'ft', default: 25 }, { id: 'w', label: 'Image width', unit: 'ft', default: 13.3 }],
  run: (v) => { const tr = n(v.d) / Math.max(1e-9, n(v.w)); const lens = tr < 0.4 ? 'ultra-short throw' : tr < 0.9 ? 'short throw' : tr <= 2.2 ? 'standard zoom' : tr <= 4 ? 'long throw' : 'very long throw';
    return R([{ label: 'Throw ratio', value: `${fmt(tr, 2)} : 1`, key: true }, { label: 'Lens family', value: lens }], [`TR = ${fmt(n(v.d), 2)} ft ÷ ${fmt(n(v.w), 2)} ft = ${fmt(tr, 2)}`]); },
  formula: ['TR = D ÷ W'], basis: 'The lens families are approximate; pick a lens whose zoom range contains the ratio with margin at both ends.',
};

const contrastLumens: Tool = {
  id: 'projector-lumens', category: 'projection', title: 'Projector brightness for a contrast target', summary: 'Lumens needed for an image contrast ratio over the ambient light falling on the screen.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'w', label: 'Image width', unit: 'ft', default: 16 }, { id: 'aspect', label: 'Aspect ratio', kind: 'select', options: ASPECTS, default: '16:9' }, { id: 'fc', label: 'Ambient light on the screen', unit: 'fc', default: 10 },
    { id: 'cr', label: 'Contrast target', kind: 'select', options: [{ value: '7', label: 'Passive viewing (7:1)' }, { value: '15', label: 'Basic decision making (15:1)' }, { value: '50', label: 'Analytical decision making (50:1)' }, { value: '80', label: 'Full-motion video (80:1)' }], default: '15' },
    { id: 'gain', label: 'Screen gain', default: 1, step: 0.1 }, { id: 'have', label: 'Your projector (optional)', unit: 'lm', default: 0 }],
  run: (v) => { const [aw, ah] = aspect(v.aspect); const area = n(v.w) * n(v.w) * ah / aw; const amb = n(v.fc) * n(v.gain, 1); const cr = n(v.cr, 15); const lm = (cr - 1) * amb * area / n(v.gain, 1); const have = n(v.have);
    const out: Out[] = [{ label: 'Image area', value: `${fmt(area, 1)} ft²` }, { label: 'Ambient luminance off the screen', value: `${fmt(amb, 1)} fL (${fmt(amb * 3.426, 0)} nits)` }, { label: 'Lumens on the screen', value: `${fmt(lm, 0)} lm`, key: true }, { label: 'With 20 % for lamp/laser aging', value: `${fmt(lm * 1.2, 0)} lm` }];
    if (have > 0) { const got = 1 + have * n(v.gain, 1) / area / Math.max(1e-9, amb); out.push({ label: 'Contrast with your projector', value: `${fmt(got, 1)} : 1`, tone: got >= cr ? 'ok' : 'bad', note: got >= cr ? 'meets the target' : 'below the target: more lumens, less ambient light, or a smaller image' }); }
    return R(out, [`area = ${fmt(n(v.w), 1)} ft × ${fmt(n(v.w) * ah / aw, 2)} ft = ${fmt(area, 1)} ft²`, `ambient = ${fmt(n(v.fc), 1)} fc × gain ${n(v.gain, 1)} = ${fmt(amb, 1)} fL`, `projected luminance needed = (CR − 1) × ambient = ${cr - 1} × ${fmt(amb, 1)} fL = ${fmt((cr - 1) * amb, 1)} fL`, `lumens = fL × area ÷ gain = ${fmt(lm, 0)} lm`]); },
  formula: ['CR = (L_image + L_ambient) ÷ L_ambient', 'L_image = (CR − 1) · L_ambient', 'lm = L_image(fL) · A(ft²) ÷ gain', 'L_ambient(fL) = E(fc) · gain'],
  basis: 'Contrast is (image + ambient) over ambient on the same screen. A matte (gain 1) screen returns foot-candles as foot-lamberts; a gain screen multiplies both. The four targets are the content categories AVIXA uses for projected image contrast; its standard (ANSI/AVIXA 3M-2011) defines the measurement.',
  caution: 'Lumens on the data sheet are measured new, at the center of a full-white field: plan for aging and uniformity.',
};

const luminance: Tool = {
  id: 'screen-luminance', category: 'projection', title: 'Screen luminance from lumens', summary: 'Foot-lamberts and nits a projector delivers on a screen of a given area and gain.', cts: ['CTS'],
  fields: [{ id: 'lm', label: 'Projector output', unit: 'lm', default: 7000 }, { id: 'area', label: 'Image area', unit: 'ft²', default: 144 }, { id: 'gain', label: 'Screen gain', default: 1, step: 0.1 }],
  run: (v) => { const fl = n(v.lm) * n(v.gain, 1) / Math.max(1e-9, n(v.area)); return R([{ label: 'Luminance', value: `${fmt(fl, 1)} fL`, key: true }, { label: 'In nits (cd/m²)', value: `${fmt(fl * 3.426, 0)} nits` }], [`fL = ${n(v.lm)} lm × ${n(v.gain, 1)} ÷ ${n(v.area)} ft² = ${fmt(fl, 1)}`, `nits = fL × 3.426 = ${fmt(fl * 3.426, 0)}`]); },
  formula: ['L(fL) = lm · gain ÷ A(ft²)', '1 fL = 3.426 cd/m²'], basis: 'Definition of the foot-lambert for a Lambertian screen, scaled by gain.',
};

// ------------------------------------------------------------------------------------------------ LED
const ledWall: Tool = {
  id: 'led-wall', category: 'led', title: 'LED wall builder', summary: 'Size, resolution, pitch, power, circuits and weight of an LED wall from its cabinet data.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'cw', label: 'Cabinet width', unit: 'mm', default: 500 }, { id: 'ch', label: 'Cabinet height', unit: 'mm', default: 500 }, { id: 'px', label: 'Pixels across a cabinet', default: 192 }, { id: 'py', label: 'Pixels down a cabinet', default: 192 },
    { id: 'nx', label: 'Cabinets wide', default: 12 }, { id: 'ny', label: 'Cabinets high', default: 7 }, { id: 'pmax', label: 'Max power per cabinet', unit: 'W', default: 160 }, { id: 'typ', label: 'Typical draw', unit: '% of max', default: 35 },
    { id: 'kg', label: 'Weight per cabinet', unit: 'kg', default: 7.5 }, { id: 'v', label: 'Circuit voltage', kind: 'select', options: [{ value: '120', label: '120 V' }, { value: '208', label: '208 V' }, { value: '230', label: '230 V' }], default: '208' },
    { id: 'brk', label: 'Breaker', unit: 'A', default: 20 }],
  run: (v) => { const W = n(v.cw) * n(v.nx) / 1000; const H = n(v.ch) * n(v.ny) / 1000; const rx = n(v.px) * n(v.nx); const ry = n(v.py) * n(v.ny); const pitch = n(v.cw) / Math.max(1, n(v.px)); const cab = n(v.nx) * n(v.ny);
    const pmax = cab * n(v.pmax); const ptyp = pmax * n(v.typ) / 100; const V = n(v.v, 208); const amax = pmax / V; const per = n(v.brk, 20) * 0.8; const circuits = Math.ceil(amax / per);
    return R([{ label: 'Wall size', value: `${fmt(W, 2)} × ${fmt(H, 2)} m (${feetInches(W)} × ${feetInches(H)})`, key: true }, { label: 'Resolution', value: `${rx.toLocaleString('en-US')} × ${ry.toLocaleString('en-US')} px`, key: true },
      { label: 'Pixel pitch', value: `${fmt(pitch, 2)} mm` }, { label: 'Aspect ratio', value: `${fmt(rx / ry, 2)} : 1` }, { label: 'Cabinets', value: String(cab) },
      { label: 'Closest comfortable viewer (rule of thumb: 1 m per mm of pitch)', value: `${fmt(pitch, 1)} m (${fmt(pitch / FT, 0)} ft)` }, { label: 'Where pixels blend for 20/20 eyes (3438 × pitch)', value: `${fmt(3438 * pitch / 1000, 1)} m` },
      { label: 'Max power', value: `${fmt(pmax / 1000, 2)} kW · ${fmt(amax, 1)} A at ${V} V`, key: true }, { label: 'Typical power', value: `${fmt(ptyp / 1000, 2)} kW · ${fmt(ptyp / V, 1)} A` },
      { label: `${n(v.brk, 20)} A circuits at max (80 % continuous)`, value: String(circuits), key: true }, { label: 'Weight', value: `${fmt(cab * n(v.kg), 0)} kg (${fmt(cab * n(v.kg) * 2.20462, 0)} lb)` }],
      [`pitch = ${n(v.cw)} mm ÷ ${n(v.px)} px = ${fmt(pitch, 2)} mm`, `max = ${cab} × ${n(v.pmax)} W = ${fmt(pmax, 0)} W; I = P ÷ V = ${fmt(amax, 1)} A`, `usable per breaker = ${n(v.brk, 20)} A × 0.8 = ${fmt(per, 1)} A → ${circuits} circuits`],
      ['a cabinet’s maximum is for full white at full brightness: size circuits for it, budget energy for typical']); },
  formula: ['pitch = cabinet width ÷ pixels across', 'I = P ÷ V (single phase)', 'circuits = ⌈I_max ÷ (0.8 · breaker)⌉', 'blend distance ≈ 3438 · pitch'],
  basis: 'Geometry from the cabinet data; electrical sizing at maximum draw with the 80 % continuous-load practice; viewing distances are rules of thumb (manufacturers publish their own).',
  caution: 'Circuit sizing is a planning estimate: an electrician sizes the feeders and distribution to local code.',
};

// ------------------------------------------------------------------------------------------------ video signal
// totals (active + blanking) for common formats: CTA-861 timings where they exist, CVT reduced blanking otherwise
const TIMINGS: Record<string, { ha: number; va: number; ht: number; vt: number; std: string }> = {
  '1280x720': { ha: 1280, va: 720, ht: 1650, vt: 750, std: 'CTA-861' }, '1920x1080': { ha: 1920, va: 1080, ht: 2200, vt: 1125, std: 'CTA-861' },
  '2560x1440': { ha: 2560, va: 1440, ht: 2720, vt: 1481, std: 'CVT-RB' }, '3840x2160': { ha: 3840, va: 2160, ht: 4400, vt: 2250, std: 'CTA-861' },
  '4096x2160': { ha: 4096, va: 2160, ht: 4400, vt: 2250, std: 'CTA-861' }, '7680x4320': { ha: 7680, va: 4320, ht: 9000, vt: 4400, std: 'CTA-861' },
};
export const LINKS: ReadonlyArray<{ name: string; gbps: number; note: string }> = [
  { name: '3G-SDI', gbps: 2.97, note: 'nominal serial rate' }, { name: 'HDMI 1.4 (10.2 Gb/s TMDS)', gbps: 8.16, note: 'payload after 8b/10b' }, { name: 'HDBaseT 2.0 (uncompressed)', gbps: 8.16, note: 'carries what HDMI 1.4 carries' },
  { name: '12G-SDI', gbps: 11.88, note: 'nominal serial rate' }, { name: 'HDMI 2.0 (18 Gb/s TMDS)', gbps: 14.4, note: 'payload after 8b/10b' }, { name: 'DisplayPort 1.4 HBR3', gbps: 25.92, note: 'payload after 8b/10b' },
  { name: 'HDMI 2.1 FRL (48 Gb/s)', gbps: 42.67, note: 'payload after 16b/18b' }, { name: 'DisplayPort 2.1 UHBR20', gbps: 77.37, note: 'payload after 128b/132b' },
];
const bandwidth: Tool = {
  id: 'video-bandwidth', category: 'signal', title: 'Video bandwidth', summary: 'Uncompressed data rate of a video format, and which links carry it.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'res', label: 'Resolution', kind: 'select', options: Object.keys(TIMINGS).map((k) => ({ value: k, label: k.replace('x', ' × ') })), default: '3840x2160' },
    { id: 'fps', label: 'Frame rate', kind: 'select', options: ['24', '25', '30', '50', '59.94', '60', '120'].map((x) => ({ value: x, label: `${x} Hz` })), default: '60' },
    { id: 'bpc', label: 'Bit depth', kind: 'select', options: ['8', '10', '12'].map((x) => ({ value: x, label: `${x} bits per color` })), default: '8' },
    { id: 'chroma', label: 'Chroma', kind: 'select', options: [{ value: '3', label: '4:4:4 / RGB' }, { value: '2', label: '4:2:2' }, { value: '1.5', label: '4:2:0' }], default: '3' }],
  run: (v) => { const t = TIMINGS[s(v.res)] ?? TIMINGS['1920x1080']!; const bpp = n(v.bpc, 8) * n(v.chroma, 3); const fps = n(v.fps, 60);
    const active = t.ha * t.va * fps * bpp / 1e9; const total = t.ht * t.vt * fps * bpp / 1e9; const pclk = t.ht * t.vt * fps / 1e6;
    return R([{ label: 'Active video', value: `${fmt(active, 2)} Gb/s` }, { label: 'With blanking', value: `${fmt(total, 2)} Gb/s`, key: true }, { label: 'Pixel clock', value: `${fmt(pclk, 1)} MHz` },
      ...LINKS.map((l): Out => ({ label: l.name, value: total <= l.gbps ? `fits (${l.gbps} Gb/s)` : `too much (${l.gbps} Gb/s)`, tone: total <= l.gbps ? 'ok' : 'bad', note: l.note }))],
      [`bits per pixel = ${n(v.bpc, 8)} × ${n(v.chroma, 3)} = ${bpp}`, `total = ${t.ht} × ${t.vt} (${t.std} timing) × ${fps} × ${bpp} = ${fmt(total, 2)} Gb/s`, `active = ${t.ha} × ${t.va} × ${fps} × ${bpp} = ${fmt(active, 2)} Gb/s`],
      ['SDI carries active video with its own ancillary space, and DSC or chroma subsampling changes what a link can take: treat “fits” as a first check, not a guarantee']); },
  formula: ['bpp = bits per color × samples per pixel (3, 2 or 1.5)', 'rate = H_total · V_total · f · bpp', 'pixel clock = H_total · V_total · f'],
  basis: 'Uncompressed rate including blanking (the interval links still clock through), compared with each link’s payload after line coding.',
};

// ------------------------------------------------------------------------------------------------ audio
const splAtListener: Tool = {
  id: 'spl-listener', category: 'audio', title: 'SPL at the listener', summary: 'Maximum level a loudspeaker delivers at a distance from its sensitivity and power.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'sens', label: 'Sensitivity (1 W at 1 m)', unit: 'dB SPL', default: 97 }, { id: 'p', label: 'Amplifier power into the speaker', unit: 'W', default: 250 }, { id: 'd', label: 'Distance to listener', default: 15 }, { id: 'u', label: 'Unit', kind: 'select', options: UNIT_LEN, default: 'm' },
    { id: 'max', label: 'Speaker’s rated max SPL (optional)', unit: 'dB', default: 0 }, { id: 'head', label: 'Headroom for program', unit: 'dB', default: 10 }],
  run: (v) => { const d = toM(n(v.d), v.u); const at1 = n(v.sens) + db10(Math.max(1e-9, n(v.p))); const capped = n(v.max) > 0 ? Math.min(at1, n(v.max)) : at1; const at = capped - db20(Math.max(1e-9, d) / 1);
    return R([{ label: 'Max SPL at 1 m', value: `${fmt(capped, 1)} dB`, note: n(v.max) > 0 && at1 > n(v.max) ? `limited by the rated max (${n(v.max)} dB)` : undefined }, { label: 'Distance', value: lenBoth(d) },
      { label: 'Max SPL at the listener', value: `${fmt(at, 1)} dB`, key: true }, { label: `Program level (− ${n(v.head)} dB headroom)`, value: `${fmt(at - n(v.head), 1)} dB`, key: true }],
      [`10·log(${n(v.p)} W) = ${fmt(db10(n(v.p)), 1)} dB → ${n(v.sens)} + ${fmt(db10(n(v.p)), 1)} = ${fmt(at1, 1)} dB at 1 m`, `20·log(${fmt(d, 2)} m ÷ 1 m) = ${fmt(db20(d), 1)} dB lost`, `${fmt(capped, 1)} − ${fmt(db20(d), 1)} = ${fmt(at, 1)} dB`]); },
  formula: ['SPL₁ₘ = S + 10·log(P)', 'SPL_d = SPL₁ₘ − 20·log(d ÷ 1 m)'], basis: 'Power doubles → +3 dB; distance doubles → −6 dB (point source, free field). Indoors the reverberant field holds levels up beyond the critical distance.',
};

const inverseSquare: Tool = {
  id: 'inverse-square', category: 'audio', title: 'Distance loss (inverse square)', summary: 'Level change between two distances from a point source, and from a line source in its near field.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'l1', label: 'Level at d₁', unit: 'dB', default: 105 }, { id: 'd1', label: 'd₁', default: 3 }, { id: 'd2', label: 'd₂', default: 30 }],
  run: (v) => { const r = n(v.d2) / Math.max(1e-9, n(v.d1)); const pt = db20(r); const line = db10(r);
    return R([{ label: 'Loss, point source (−6 dB per doubling)', value: `${fmt(pt, 1)} dB` }, { label: 'Level at d₂', value: `${fmt(n(v.l1) - pt, 1)} dB`, key: true }, { label: 'Line source near field (−3 dB per doubling)', value: `${fmt(n(v.l1) - line, 1)} dB` }],
      [`20·log(${n(v.d2)} ÷ ${n(v.d1)}) = ${fmt(pt, 1)} dB`, `10·log(${n(v.d2)} ÷ ${n(v.d1)}) = ${fmt(line, 1)} dB`]); },
  formula: ['ΔL = 20·log(d₂ ÷ d₁) (point source)', 'ΔL = 10·log(d₂ ÷ d₁) (line source, near field)'], basis: 'Spherical spreading: intensity falls with area 4πr². A long line source spreads cylindrically until the far field.',
};

const addLevels: Tool = {
  id: 'add-levels', category: 'audio', title: 'Adding sound levels', summary: 'Combined level of uncorrelated sources (noise plus program, several machines).', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'a', label: 'Level 1', unit: 'dB', default: 90 }, { id: 'b', label: 'Level 2', unit: 'dB', default: 90 }, { id: 'c', label: 'Level 3 (optional)', unit: 'dB', default: 0 }, { id: 'd', label: 'Level 4 (optional)', unit: 'dB', default: 0 }],
  run: (v) => { const ls = [v.a, v.b, v.c, v.d].map((x) => n(x)).filter((x) => x > 0); const sum = db10(ls.reduce((t, l) => t + 10 ** (l / 10), 0));
    return R([{ label: 'Combined level', value: `${fmt(sum, 1)} dB`, key: true }, { label: 'Above the loudest', value: `+${fmt(sum - Math.max(...ls), 1)} dB` }], [`10·log(${ls.map((l) => `10^(${l}/10)`).join(' + ')}) = ${fmt(sum, 1)} dB`]); },
  formula: ['L = 10·log Σ 10^(Lᵢ/10)'], basis: 'Uncorrelated powers add: two equal sources make +3 dB, ten make +10 dB. Coherent (identical, in-phase) signals add pressure and can make up to +6 dB.',
};

const levelConvert: Tool = {
  id: 'signal-level', category: 'audio', title: 'Signal level converter', summary: 'dBu, dBV, volts RMS and dBm (600 Ω), with the +4 / −10 gap explained.', cts: ['CTS', 'CTS-I'],
  fields: [{ id: 'x', label: 'Value', default: 4 }, { id: 'u', label: 'Unit', kind: 'select', options: [{ value: 'dBu', label: 'dBu' }, { value: 'dBV', label: 'dBV' }, { value: 'V', label: 'volts RMS' }], default: 'dBu' }],
  run: (v) => { const x = n(v.x); const V = s(v.u) === 'V' ? x : s(v.u) === 'dBV' ? 10 ** (x / 20) : 0.7746 * 10 ** (x / 20);
    return R([{ label: 'Volts RMS', value: `${fmt(V, 4)} V`, key: true }, { label: 'dBu (re 0.775 V)', value: fmt(db20(V / 0.7746), 2) }, { label: 'dBV (re 1 V)', value: fmt(db20(V), 2) }, { label: 'Peak-to-peak (sine)', value: `${fmt(V * 2 * Math.SQRT2, 3)} V` }, { label: 'Reference', value: '+4 dBu pro line = 1.228 V; −10 dBV consumer = 0.316 V; the gap is 11.8 dB' }],
      [`dBu = 20·log(V ÷ 0.775 V); dBV = 20·log(V ÷ 1 V)`, `dBu − dBV = 20·log(1 ÷ 0.775) = 2.21 dB`]); },
  formula: ['dBu = 20·log(V ÷ 0.7746)', 'dBV = 20·log(V ÷ 1)', 'V_pp = 2√2 · V_rms'], basis: '0.775 V is the voltage that dissipates 1 mW in 600 Ω, the old telephone reference that dBu keeps without the impedance.',
};

const impedance: Tool = {
  id: 'speaker-impedance', category: 'audio', title: 'Speaker impedance and amplifier load', summary: 'Total load of speakers in series, parallel or series-parallel, and whether the amplifier is safe.', cts: ['CTS', 'CTS-I'],
  fields: [{ id: 'z', label: 'Impedance per speaker', unit: 'Ω', default: 8 }, { id: 'nn', label: 'Number of speakers', default: 4, min: 1 },
    { id: 'wire', label: 'Wiring', kind: 'select', options: [{ value: 'par', label: 'Parallel' }, { value: 'ser', label: 'Series' }, { value: 'sp', label: 'Series-parallel (pairs in series, pairs in parallel)' }], default: 'par' },
    { id: 'min', label: 'Amplifier’s lowest rated load', unit: 'Ω', default: 4 }],
  run: (v) => { const z = n(v.z, 8); const N = Math.max(1, Math.round(n(v.nn, 1))); const w = s(v.wire); const tot = w === 'ser' ? z * N : w === 'par' ? z / N : N % 2 ? NaN : (2 * z) / (N / 2);
    const ok = tot >= n(v.min, 4);
    return R([{ label: 'Total load', value: Number.isNaN(tot) ? 'series-parallel needs an even count' : `${fmt(tot, 2)} Ω`, key: true }, { label: 'Amplifier', value: Number.isNaN(tot) ? '—' : ok ? `safe: at or above its ${n(v.min, 4)} Ω rating` : `unsafe: below its ${n(v.min, 4)} Ω rating`, tone: Number.isNaN(tot) ? 'muted' : ok ? 'ok' : 'bad' }],
      [w === 'ser' ? `Z = ${N} × ${z} Ω` : w === 'par' ? `Z = ${z} Ω ÷ ${N}` : `pairs: 2 × ${z} = ${2 * z} Ω; ${N / 2} pairs in parallel: ${2 * z} ÷ ${N / 2}`]); },
  formula: ['series: Z = Z₁ + Z₂ + …', 'parallel (equal): Z = Z ÷ N', 'parallel: 1/Z = Σ 1/Zᵢ'], basis: 'Nominal impedances; a real speaker’s impedance varies with frequency and can dip below nominal.',
};

const ceilingLayout: Tool = {
  id: 'ceiling-speakers', category: 'audio', title: 'Ceiling speaker layout', summary: 'Coverage, spacing and count for ceiling loudspeakers in a square grid.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'ceil', label: 'Ceiling height', unit: 'ft', default: 10 }, { id: 'ear', label: 'Ear height', kind: 'select', options: [{ value: '4', label: 'Seated (4 ft)' }, { value: '5.5', label: 'Standing (5.5 ft)' }], default: '4' },
    { id: 'ang', label: 'Dispersion (−6 dB, conical)', unit: '°', default: 90 },
    { id: 'lay', label: 'Overlap', kind: 'select', options: [{ value: 'edge', label: 'Edge to edge (gaps at the corners)' }, { value: 'min', label: 'Minimum overlap (corners covered)' }, { value: 'centre', label: 'Edge to center (most even)' }], default: 'min' },
    { id: 'L', label: 'Room length', unit: 'ft', default: 48 }, { id: 'W', label: 'Room width', unit: 'ft', default: 32 }],
  run: (v) => { const h = n(v.ceil) - n(v.ear, 4); const D = 2 * h * Math.tan(n(v.ang) / 2 * Math.PI / 180); const sp = s(v.lay) === 'edge' ? D : s(v.lay) === 'min' ? D / Math.SQRT2 : D / 2;
    const nx = Math.max(1, Math.ceil(n(v.L) / sp)); const ny = Math.max(1, Math.ceil(n(v.W) / sp));
    return R([{ label: 'Coverage diameter at ear height', value: `${fmt(D, 1)} ft` }, { label: 'Speaker spacing', value: `${fmt(sp, 1)} ft`, key: true }, { label: 'Grid', value: `${nx} × ${ny}` }, { label: 'Speakers needed', value: String(nx * ny), key: true }],
      [`h = ${n(v.ceil)} − ${n(v.ear)} = ${fmt(h, 1)} ft`, `D = 2·h·tan(${n(v.ang)}° ÷ 2) = ${fmt(D, 1)} ft`, `spacing = ${s(v.lay) === 'edge' ? 'D' : s(v.lay) === 'min' ? 'D ÷ √2' : 'D ÷ 2'} = ${fmt(sp, 1)} ft`, `${n(v.L)} ÷ ${fmt(sp, 1)} → ${nx}; ${n(v.W)} ÷ ${fmt(sp, 1)} → ${ny}`]); },
  formula: ['h = ceiling − ear', 'D = 2·h·tan(θ/2)', 'spacing = D (edge-edge), D/√2 (min overlap), D/2 (edge-center)'], basis: 'Geometry of a cone of coverage meeting the listening plane. Real patterns narrow with frequency: use the data sheet’s 2 kHz to 4 kHz figure for speech.',
};

const constVolt: Tool = {
  id: 'distributed-70v', category: 'audio', title: '70 V / 100 V distributed system', summary: 'Total tap load, amplifier size, line impedance and current for a constant-voltage line.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'V', label: 'Line voltage', kind: 'select', options: [{ value: '25', label: '25 V' }, { value: '70.7', label: '70.7 V' }, { value: '100', label: '100 V' }], default: '70.7' },
    { id: 'nn', label: 'Number of speakers', default: 24 }, { id: 'tap', label: 'Tap per speaker', unit: 'W', default: 5 }, { id: 'head', label: 'Headroom', unit: '%', default: 25 }],
  run: (v) => { const P = n(v.nn) * n(v.tap); const V = n(v.V, 70.7); const amp = P * (1 + n(v.head) / 100);
    return R([{ label: 'Total tap load', value: `${fmt(P, 1)} W` }, { label: 'Minimum amplifier', value: `${fmt(amp, 0)} W at ${V} V`, key: true }, { label: 'Load impedance the line presents', value: `${fmt(V * V / Math.max(1e-9, P), 1)} Ω` }, { label: 'Line current at full tap load', value: `${fmt(P / V, 2)} A` }],
      [`P = ${n(v.nn)} × ${n(v.tap)} W = ${fmt(P, 1)} W`, `Z = V² ÷ P = ${V}² ÷ ${fmt(P, 1)} = ${fmt(V * V / P, 1)} Ω`, `I = P ÷ V = ${fmt(P / V, 2)} A`]); },
  formula: ['P_total = Σ taps', 'Z = V² ÷ P', 'I = P ÷ V'], basis: 'A constant-voltage line delivers its rated voltage at full output; each transformer tap draws its wattage. Keep total taps at or below about 80 % of the amplifier rating.',
};

const cableLoss: Tool = {
  id: 'speaker-cable', category: 'audio', title: 'Speaker cable loss', summary: 'Level lost and power wasted in a speaker run, and the damping factor the cable leaves.', cts: ['CTS', 'CTS-I'],
  fields: [{ id: 'g', label: 'Wire gauge', kind: 'select', options: gauges(['10', '12', '14', '16', '18', '20']), default: '14' }, { id: 'len', label: 'Run length (one way)', unit: 'ft', default: 100 }, { id: 'z', label: 'Speaker load', unit: 'Ω', default: 8 }],
  run: (v) => { const r = (AWG[s(v.g)]?.ohmsPerKft ?? 2.525) * 2 * n(v.len) / 1000; const z = n(v.z, 8); const loss = db20(z / (z + r)); const pct = r / (z + r) * 100; const df = z / r;
    const tone = pct <= 5 ? 'ok' : pct <= 11 ? 'warn' : 'bad';
    return R([{ label: 'Cable resistance (round trip)', value: `${fmt(r, 3)} Ω` }, { label: 'Level lost', value: `${fmt(loss, 2)} dB`, key: true }, { label: 'Power lost in the cable', value: `${fmt(pct, 1)} %`, tone, key: true }, { label: 'Damping factor (cable only)', value: fmt(df, 0) },
      { label: 'Verdict', value: tone === 'ok' ? 'good (≤ 5 % lost)' : tone === 'warn' ? 'acceptable (≤ 0.5 dB, 11 %)' : 'too much: heavier wire or a shorter run', tone }],
      [`R = ${AWG[s(v.g)]?.ohmsPerKft ?? 2.525} Ω/kft × 2 × ${n(v.len)} ft = ${fmt(r, 3)} Ω`, `loss = 20·log(${z} ÷ (${z} + ${fmt(r, 3)})) = ${fmt(loss, 2)} dB`]); },
  formula: ['R = ρ_kft · 2L ÷ 1000', 'loss(dB) = 20·log(Z ÷ (Z + R))', 'DF_cable = Z ÷ R'], basis: 'The cable is a resistor in series with the speaker: a voltage divider. A common target is under 0.5 dB (about 11 % of power).',
};

const ampForSpl: Tool = {
  id: 'amp-for-spl', category: 'audio', title: 'Amplifier power for a target level', summary: 'Watts a loudspeaker needs to reach a level at a distance, with headroom.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'target', label: 'Target level at the listener', unit: 'dB SPL', default: 85 }, { id: 'head', label: 'Headroom', unit: 'dB', default: 10 }, { id: 'sens', label: 'Sensitivity (1 W at 1 m)', unit: 'dB', default: 90 }, { id: 'd', label: 'Distance', unit: 'm', default: 10 }],
  run: (v) => { const need1 = n(v.target) + n(v.head) + db20(Math.max(1e-9, n(v.d))); const dB = need1 - n(v.sens); const W = 10 ** (dB / 10);
    return R([{ label: 'Level needed at 1 m', value: `${fmt(need1, 1)} dB` }, { label: 'Above sensitivity', value: `${fmt(dB, 1)} dB` }, { label: 'Amplifier power', value: `${fmt(W, W < 10 ? 2 : 0)} W`, key: true, tone: W > 2000 ? 'warn' : undefined, note: W > 2000 ? 'more power than one channel usually gives: more efficient speakers, more of them, or closer' : undefined }],
      [`at 1 m: ${n(v.target)} + ${n(v.head)} + 20·log(${n(v.d)}) = ${fmt(need1, 1)} dB`, `P = 10^((${fmt(need1, 1)} − ${n(v.sens)}) ÷ 10) = ${fmt(W, 1)} W`]); },
  formula: ['SPL₁ₘ = target + headroom + 20·log(d)', 'P = 10^((SPL₁ₘ − S) ÷ 10)'], basis: 'Sensitivity and the inverse-square law, run backwards.',
};

const delay: Tool = {
  id: 'delay-alignment', category: 'audio', title: 'Delay alignment', summary: 'Delay for a fill or delay speaker so sound from the main system arrives first.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'dm', label: 'Main to listener', unit: 'ft', default: 80 }, { id: 'df', label: 'Fill to listener', unit: 'ft', default: 15 }, { id: 'pre', label: 'Precedence offset', unit: 'ms', default: 10 }, { id: 't', label: 'Air temperature', unit: '°C', default: 20 }],
  run: (v) => { const c = 331.3 * Math.sqrt(1 + n(v.t) / 273.15); const diff = (n(v.dm) - n(v.df)) * FT; const ms = diff / c * 1000;
    return R([{ label: 'Speed of sound', value: `${fmt(c, 1)} m/s (${fmt(c / FT, 0)} ft/s)` }, { label: 'Path difference', value: `${fmt(diff / FT, 1)} ft` }, { label: 'Arrival difference', value: `${fmt(ms, 2)} ms` }, { label: 'Delay to set on the fill', value: `${fmt(ms + n(v.pre), 1)} ms`, key: true }],
      [`c = 331.3 × √(1 + ${n(v.t)}/273.15) = ${fmt(c, 1)} m/s`, `Δt = ${fmt(diff, 2)} m ÷ ${fmt(c, 1)} m/s = ${fmt(ms, 2)} ms`, `+ ${n(v.pre)} ms so the main is heard first (precedence / Haas effect)`]); },
  formula: ['c ≈ 331.3·√(1 + T/273.15) m/s', 'Δt = (d_main − d_fill) ÷ c', 'delay = Δt + 5…15 ms'], basis: 'Precedence: the ear localizes to the first arrival when a later, similar sound arrives within roughly 5–35 ms and is not much louder.',
};

const wavelength: Tool = {
  id: 'wavelength', category: 'audio', title: 'Wavelength and frequency', summary: 'Wavelength of a frequency in air, and the frequencies a path difference cancels (comb filter).', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'f', label: 'Frequency', unit: 'Hz', default: 1000 }, { id: 'path', label: 'Path difference (optional, comb filter)', unit: 'ft', default: 0 }],
  run: (v) => { const c = 343; const lam = c / Math.max(1e-9, n(v.f)); const pd = n(v.path) * FT; const out: Out[] = [{ label: 'Wavelength', value: `${fmt(lam, 3)} m (${fmt(lam / FT, 2)} ft)`, key: true }, { label: 'Period', value: `${fmt(1000 / n(v.f), 3)} ms` }];
    if (pd > 0) { const f0 = c / (2 * pd); out.push({ label: 'First cancellation (notch)', value: `${fmt(f0, 0)} Hz`, key: true }, { label: 'Notches repeat every', value: `${fmt(c / pd, 0)} Hz` }); }
    return R(out, [`λ = c ÷ f = 343 ÷ ${n(v.f)} = ${fmt(lam, 3)} m`, ...(pd > 0 ? [`first notch = c ÷ (2 × ${fmt(pd, 3)} m) = ${fmt(c / (2 * pd), 0)} Hz`] : [])]); },
  formula: ['λ = c ÷ f', 'T = 1 ÷ f', 'notches at f = (2k + 1)·c ÷ (2·Δd)'], basis: 'Sound in air at about 20 °C travels 343 m/s (1,125 ft/s). Two copies a path apart cancel where the delay is half a period.',
};

// ------------------------------------------------------------------------------------------------ acoustics
const rt60: Tool = {
  id: 'rt60-sabine', category: 'acoustics', title: 'Reverberation time (Sabine)', summary: 'RT60 of a room from its volume and its absorption.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'L', label: 'Length', unit: 'm', default: 15 }, { id: 'W', label: 'Width', unit: 'm', default: 10 }, { id: 'H', label: 'Height', unit: 'm', default: 4 }, { id: 'alpha', label: 'Average absorption coefficient ᾱ', default: 0.2, step: 0.01, min: 0.01, max: 1 }],
  run: (v) => { const V = n(v.L) * n(v.W) * n(v.H); const S = 2 * (n(v.L) * n(v.W) + n(v.L) * n(v.H) + n(v.W) * n(v.H)); const A = S * n(v.alpha); const rt = 0.161 * V / Math.max(1e-9, A); const ey = 0.161 * V / (-S * Math.log(1 - Math.min(0.99, n(v.alpha))));
    return R([{ label: 'Volume', value: `${fmt(V, 0)} m³` }, { label: 'Surface', value: `${fmt(S, 0)} m²` }, { label: 'Absorption A', value: `${fmt(A, 1)} m² sabins` }, { label: 'RT60 (Sabine)', value: `${fmt(rt, 2)} s`, key: true }, { label: 'RT60 (Eyring, for absorbent rooms)', value: `${fmt(ey, 2)} s` }],
      [`V = ${n(v.L)} × ${n(v.W)} × ${n(v.H)} = ${fmt(V, 0)} m³`, `A = S × ᾱ = ${fmt(S, 0)} × ${n(v.alpha)} = ${fmt(A, 1)} m²`, `RT60 = 0.161 × ${fmt(V, 0)} ÷ ${fmt(A, 1)} = ${fmt(rt, 2)} s`]); },
  formula: ['RT60 = 0.161 · V ÷ A (metric) = 0.049 · V ÷ A (imperial)', 'A = Σ Sᵢ·αᵢ', 'Eyring: RT60 = 0.161·V ÷ (−S·ln(1 − ᾱ))'], basis: 'Sabine’s diffuse-field estimate; it overstates RT in very absorbent rooms, where Eyring’s form is closer. A measurement (ISO 3382) is the authority.',
};

const criticalDistance: Tool = {
  id: 'critical-distance', category: 'acoustics', title: 'Critical distance', summary: 'Where direct and reverberant sound are equal; beyond it, more power will not make speech clearer.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'Q', label: 'Directivity factor Q', default: 5 }, { id: 'S', label: 'Room surface', unit: 'm²', default: 700 }, { id: 'alpha', label: 'Average absorption ᾱ', default: 0.2, step: 0.01 }],
  run: (v) => { const a = Math.min(0.99, n(v.alpha)); const Rc = n(v.S) * a / (1 - a); const dc = 0.141 * Math.sqrt(n(v.Q) * Rc);
    return R([{ label: 'Room constant R', value: `${fmt(Rc, 1)} m²` }, { label: 'Critical distance', value: `${fmt(dc, 2)} m (${fmt(dc / FT, 1)} ft)`, key: true }, { label: 'Keep listeners within (rule of thumb, 3 × Dc)', value: `${fmt(3 * dc, 1)} m` }],
      [`R = S·ᾱ ÷ (1 − ᾱ) = ${n(v.S)} × ${a} ÷ ${fmt(1 - a, 2)} = ${fmt(Rc, 1)} m²`, `Dc = 0.141 × √(${n(v.Q)} × ${fmt(Rc, 1)}) = ${fmt(dc, 2)} m`]); },
  formula: ['R = S·ᾱ ÷ (1 − ᾱ)', 'Dc = 0.141·√(Q·R)'], basis: 'Hopkins–Stryker; Q is the loudspeaker’s directivity (DI = 10·log Q).',
};

const pag: Tool = {
  id: 'pag-nag', category: 'acoustics', title: 'Potential and needed acoustic gain (PAG / NAG)', summary: 'Will a sound-reinforcement system be stable at the gain the farthest listener needs?', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'd0', label: 'D₀: talker to farthest listener', unit: 'ft', default: 60 }, { id: 'd1', label: 'D₁: microphone to loudspeaker', unit: 'ft', default: 20 }, { id: 'd2', label: 'D₂: loudspeaker to farthest listener', unit: 'ft', default: 40 },
    { id: 'ds', label: 'Ds: talker to microphone', unit: 'ft', default: 2 }, { id: 'ead', label: 'EAD: equivalent acoustic distance', unit: 'ft', default: 6 }, { id: 'nom', label: 'Open microphones (NOM)', default: 2, min: 1 }, { id: 'fsm', label: 'Feedback stability margin', unit: 'dB', default: 6 }],
  run: (v) => { const PAG = db20(n(v.d0)) + db20(n(v.d1)) - db20(n(v.ds)) - db20(n(v.d2)) - db10(Math.max(1, n(v.nom))) - n(v.fsm); const NAG = db20(n(v.d0) / Math.max(1e-9, n(v.ead)));
    const ok = PAG >= NAG;
    return R([{ label: 'PAG', value: `${fmt(PAG, 1)} dB`, key: true }, { label: 'NAG', value: `${fmt(NAG, 1)} dB`, key: true }, { label: 'Verdict', value: ok ? `stable: ${fmt(PAG - NAG, 1)} dB to spare` : `short by ${fmt(NAG - PAG, 1)} dB: move the microphone closer, fewer open microphones, or rearrange`, tone: ok ? 'ok' : 'bad' }],
      [`PAG = 20log${n(v.d0)} + 20log${n(v.d1)} − 20log${n(v.ds)} − 20log${n(v.d2)} − 10log${n(v.nom)} − ${n(v.fsm)} = ${fmt(PAG, 1)} dB`, `NAG = 20log(${n(v.d0)} ÷ ${n(v.ead)}) = ${fmt(NAG, 1)} dB`]); },
  formula: ['PAG = 20log D₀ + 20log D₁ − 20log Ds − 20log D₂ − 10log NOM − FSM', 'NAG = 20log(D₀ ÷ EAD)'], basis: 'The classic free-field gain-before-feedback estimate: halving the talker-to-microphone distance buys 6 dB; doubling open microphones costs 3 dB.',
};

const modes: Tool = {
  id: 'room-modes', category: 'acoustics', title: 'Axial room modes', summary: 'The first resonances between parallel walls of a rectangular room.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'L', label: 'Length', unit: 'm', default: 8 }, { id: 'W', label: 'Width', unit: 'm', default: 5.5 }, { id: 'H', label: 'Height', unit: 'm', default: 3 }],
  run: (v) => { const c = 343; const f = (d: number) => [1, 2, 3].map((k) => k * c / (2 * d)); const sch = 2000 * Math.sqrt(0.5 / Math.max(1, n(v.L) * n(v.W) * n(v.H)));
    return R([{ label: 'Length modes', value: f(n(v.L)).map((x) => `${fmt(x, 1)} Hz`).join(' · '), key: true }, { label: 'Width modes', value: f(n(v.W)).map((x) => `${fmt(x, 1)} Hz`).join(' · ') }, { label: 'Height modes', value: f(n(v.H)).map((x) => `${fmt(x, 1)} Hz`).join(' · ') },
      { label: 'Schroeder frequency (for RT60 ≈ 0.5 s)', value: `${fmt(sch, 0)} Hz`, note: 'below it, modes dominate; above it, the field is statistical' }], [`f = k·c ÷ 2L: 343 ÷ (2 × ${n(v.L)}) = ${fmt(c / 2 / n(v.L), 1)} Hz`]); },
  formula: ['f_k = k·c ÷ (2·d)', 'f_Schroeder ≈ 2000·√(RT60 ÷ V)'], basis: 'Standing waves between two parallel surfaces; tangential and oblique modes add more above these.',
};

// ------------------------------------------------------------------------------------------------ power
const circuits: Tool = {
  id: 'watts-amps', category: 'power', title: 'Watts, amps and circuits', summary: 'Current a load draws and how many circuits it needs, single or three phase.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'P', label: 'Total load', unit: 'W', default: 12000 }, { id: 'V', label: 'Voltage', kind: 'select', options: ['120', '208', '230', '240', '400', '480'].map((x) => ({ value: x, label: `${x} V` })), default: '120' },
    { id: 'ph', label: 'Phase', kind: 'select', options: [{ value: '1', label: 'Single phase' }, { value: '3', label: 'Three phase (line-to-line voltage)' }], default: '1' },
    { id: 'pf', label: 'Power factor', default: 0.95, step: 0.01, min: 0.1, max: 1 }, { id: 'brk', label: 'Breaker', unit: 'A', default: 20 }],
  run: (v) => { const P = n(v.P); const V = n(v.V, 120); const pf = n(v.pf, 1); const three = s(v.ph) === '3'; const I = P / ((three ? Math.sqrt(3) : 1) * V * pf); const per = n(v.brk, 20) * 0.8; const kva = P / pf / 1000;
    return R([{ label: three ? 'Current per phase' : 'Total current', value: `${fmt(I, 1)} A`, key: true }, { label: 'Usable per breaker (80 % continuous)', value: `${fmt(per, 1)} A` }, { label: `${n(v.brk, 20)} A circuits needed`, value: three ? `${Math.ceil(I / per)} per phase` : String(Math.ceil(I / per)), key: true },
      { label: 'Apparent power', value: `${fmt(kva, 2)} kVA` }, { label: 'Heat to remove', value: `${fmt(P * 3.412, 0)} BTU/h (${fmt(P * 3.412 / 12000, 2)} tons of cooling)` }],
      [three ? `I = P ÷ (√3 × V × PF) = ${P} ÷ (1.732 × ${V} × ${pf}) = ${fmt(I, 1)} A` : `I = P ÷ (V × PF) = ${P} ÷ (${V} × ${pf}) = ${fmt(I, 1)} A`, `circuits = ⌈${fmt(I, 1)} ÷ ${fmt(per, 1)}⌉`]); },
  formula: ['single phase: I = P ÷ (V·PF)', 'three phase: I = P ÷ (√3·V_LL·PF)', 'usable = 0.8 × breaker (continuous load)', 'BTU/h = W × 3.412'],
  basis: 'Ohm’s and Watt’s laws with the power factor; the 80 % continuous-load practice comes from electrical codes such as the NEC.', caution: 'Planning arithmetic only: circuits, feeders and protection are designed and installed by a licensed electrician to local code.',
};

const vdrop: Tool = {
  id: 'voltage-drop', category: 'power', title: 'Voltage drop on a feeder', summary: 'Voltage lost over a run of copper, as volts and as a percentage.', cts: ['CTS', 'CTS-I'],
  fields: [{ id: 'g', label: 'Conductor', kind: 'select', options: gauges(['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '4/0']), default: '12' }, { id: 'L', label: 'One-way length', unit: 'ft', default: 100 }, { id: 'I', label: 'Load current', unit: 'A', default: 16 },
    { id: 'V', label: 'Voltage', kind: 'select', options: ['120', '208', '240', '277', '480'].map((x) => ({ value: x, label: `${x} V` })), default: '120' }, { id: 'ph', label: 'Phase', kind: 'select', options: [{ value: '1', label: 'Single phase' }, { value: '3', label: 'Three phase' }], default: '1' }],
  run: (v) => { const g = AWG[s(v.g)] ?? AWG['12']!; const K = 12.9; const three = s(v.ph) === '3'; const vd = (three ? Math.sqrt(3) : 2) * K * n(v.I) * n(v.L) / g.cmil; const pct = vd / n(v.V, 120) * 100;
    const tone = pct <= 3 ? 'ok' : pct <= 5 ? 'warn' : 'bad';
    return R([{ label: 'Voltage drop', value: `${fmt(vd, 2)} V`, key: true }, { label: 'Percent', value: `${fmt(pct, 2)} %`, tone, key: true }, { label: 'Voltage at the load', value: `${fmt(n(v.V, 120) - vd, 1)} V` },
      { label: 'Verdict', value: tone === 'ok' ? 'within the common 3 % branch recommendation' : tone === 'warn' ? 'over 3 %: within 5 % total, but check' : 'over 5 %: larger conductor or shorter run', tone }],
      [`VD = ${three ? '√3' : '2'} × K × I × L ÷ CM = ${three ? '1.732' : '2'} × 12.9 × ${n(v.I)} × ${n(v.L)} ÷ ${g.cmil} = ${fmt(vd, 2)} V`]); },
  formula: ['single phase: VD = 2·K·I·L ÷ CM', 'three phase: VD = √3·K·I·L ÷ CM', 'K ≈ 12.9 Ω·cmil/ft for copper'], basis: 'The circular-mil method with copper’s resistivity; the 3 % / 5 % figures are the NEC’s informational recommendations, not requirements everywhere.',
};

const ups: Tool = {
  id: 'ups-runtime', category: 'power', title: 'UPS runtime estimate', summary: 'How long a battery keeps a rack running, and the UPS size it needs.', cts: ['CTS', 'CTS-I'],
  fields: [{ id: 'load', label: 'Rack load', unit: 'W', default: 900 }, { id: 'wh', label: 'Battery energy', unit: 'Wh', default: 1440 }, { id: 'eff', label: 'Inverter efficiency', unit: '%', default: 90 }, { id: 'dod', label: 'Usable depth of discharge', unit: '%', default: 80 }, { id: 'pf', label: 'Load power factor', default: 0.9, step: 0.01 }],
  run: (v) => { const usable = n(v.wh) * n(v.dod) / 100 * n(v.eff) / 100; const min = usable / Math.max(1e-9, n(v.load)) * 60; const va = n(v.load) / n(v.pf, 0.9) * 1.25;
    return R([{ label: 'Estimated runtime', value: `${fmt(min, 0)} minutes`, key: true }, { label: 'Usable energy', value: `${fmt(usable, 0)} Wh` }, { label: 'UPS rating with 25 % margin', value: `${fmt(va, 0)} VA / ${fmt(n(v.load) * 1.25, 0)} W`, key: true }],
      [`usable = ${n(v.wh)} Wh × ${n(v.dod)} % × ${n(v.eff)} % = ${fmt(usable, 0)} Wh`, `runtime = ${fmt(usable, 0)} ÷ ${n(v.load)} W × 60 = ${fmt(min, 0)} min`], ['batteries deliver less at high discharge rates and in the cold: the manufacturer’s runtime chart is the authority']); },
  formula: ['t(h) = Wh·DoD·η ÷ P', 'VA = W ÷ PF'], basis: 'Energy bookkeeping; real runtime follows the battery’s discharge curve (Peukert).',
};

// ------------------------------------------------------------------------------------------------ rigging
const bridle: Tool = {
  id: 'two-leg-bridle', category: 'rigging', title: 'Two-leg bridle', summary: 'Apex position, leg angles and leg tensions for a bridle between two beams.', cts: ['CTS', 'CTS-I'],
  fields: [{ id: 'W', label: 'Load at the apex', unit: 'lb', default: 1000 }, { id: 'span', label: 'Distance between beams', unit: 'ft', default: 10 }, { id: 'l1', label: 'Leg 1 length', unit: 'ft', default: 8 }, { id: 'l2', label: 'Leg 2 length', unit: 'ft', default: 8 }],
  run: (v) => { const S = n(v.span), a = n(v.l1), b = n(v.l2); if (a + b <= S || Math.abs(a - b) >= S) return R([{ label: 'Geometry', value: 'the legs cannot meet: each must be shorter than the span plus the other, and together longer than the span', tone: 'bad' }]);
    const x = (a * a - b * b + S * S) / (2 * S); const h = Math.sqrt(Math.max(0, a * a - x * x)); const th1 = Math.atan2(x, h); const th2 = Math.atan2(S - x, h);
    const W = n(v.W); const T1 = W * Math.sin(th2) / Math.sin(th1 + th2); const T2 = W * Math.sin(th1) / Math.sin(th1 + th2); const inc = (th1 + th2) * 180 / Math.PI; const hz = T1 * Math.sin(th1);
    return R([{ label: 'Apex below the beams', value: feetInches(h * FT), key: true }, { label: 'Apex from beam 1', value: feetInches(x * FT) }, { label: 'Leg 1 tension', value: `${fmt(T1, 0)} lb (${fmt(th1 * 180 / Math.PI, 1)}° from vertical)`, key: true },
      { label: 'Leg 2 tension', value: `${fmt(T2, 0)} lb (${fmt(th2 * 180 / Math.PI, 1)}° from vertical)`, key: true }, { label: 'Horizontal force on each beam', value: `${fmt(hz, 0)} lb` },
      { label: 'Included angle', value: `${fmt(inc, 1)}°`, tone: inc <= 90 ? 'ok' : inc <= 120 ? 'warn' : 'bad', note: inc <= 90 ? 'under 90°: legs carry less than the load each' : inc <= 120 ? 'over 90°: each leg can carry more than half the load; at 120° each carries the whole load' : 'over 120°: each leg carries more than the load itself' }],
      [`x = (L₁² − L₂² + S²) ÷ 2S = ${fmt(x, 2)} ft; h = √(L₁² − x²) = ${fmt(h, 2)} ft`, `T₁ = W·sin θ₂ ÷ sin(θ₁ + θ₂) = ${fmt(T1, 0)} lb`]); },
  formula: ['x = (L₁² − L₂² + S²) ÷ 2S, h = √(L₁² − x²)', 'T₁ = W·sin θ₂ ÷ sin(θ₁+θ₂), T₂ = W·sin θ₁ ÷ sin(θ₁+θ₂)'], basis: 'Static equilibrium of three forces at the apex (Lami’s theorem).',
  caution: 'Education and planning only. Rigging is designed and approved by a qualified person, with rated hardware, design factors and the venue’s load data.',
};

const designFactor: Tool = {
  id: 'design-factor', category: 'rigging', title: 'Working load limit and design factor', summary: 'The working load limit from a breaking strength and a design factor, and whether a load is within it.', cts: ['CTS', 'CTS-I'],
  fields: [{ id: 'mbs', label: 'Minimum breaking strength', unit: 'lb', default: 10000 }, { id: 'df', label: 'Design factor', default: 5, help: '5:1 is common for hardware; 8:1 or 10:1 for overhead lifting of people or as required' }, { id: 'load', label: 'Applied load', unit: 'lb', default: 1500 }],
  run: (v) => { const wll = n(v.mbs) / Math.max(1, n(v.df)); const ok = n(v.load) <= wll;
    return R([{ label: 'Working load limit', value: `${fmt(wll, 0)} lb`, key: true }, { label: 'Load as a share of the WLL', value: `${fmt(n(v.load) / wll * 100, 0)} %`, tone: ok ? 'ok' : 'bad', note: ok ? 'within the WLL' : 'over the WLL: never' }], [`WLL = ${n(v.mbs)} ÷ ${n(v.df)} = ${fmt(wll, 0)} lb`]); },
  formula: ['WLL = MBS ÷ DF'], basis: 'The design factor keeps a margin for shock, wear and uncertainty; use the manufacturer’s rated WLL for real hardware.', caution: 'Never derive a rating for hardware that is not rated; dynamic (shock) loads can be many times the static weight.',
};

// ------------------------------------------------------------------------------------------------ network
const ipNum = (ip: string) => ip.split('.').reduce((t, o) => t * 256 + (Number(o) & 255), 0) >>> 0; const ipStr = (x: number) => [24, 16, 8, 0].map((b) => (x >>> b) & 255).join('.');
const subnet: Tool = {
  id: 'subnet', category: 'network', title: 'Subnet calculator', summary: 'Network, broadcast, mask and usable host range of an IPv4 address and prefix.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'ip', label: 'IP address', kind: 'text', default: '192.168.10.57' }, { id: 'p', label: 'Prefix length', unit: '/', default: 24, min: 0, max: 32 }],
  run: (v) => { const ip = s(v.ip).trim(); if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || ip.split('.').some((o) => Number(o) > 255)) return R([{ label: 'Address', value: 'not an IPv4 address (four numbers 0–255)', tone: 'bad' }]);
    const p = Math.min(32, Math.max(0, Math.round(n(v.p)))); const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0; const net = (ipNum(ip) & mask) >>> 0; const bc = (net | (~mask >>> 0)) >>> 0; const hosts = p >= 31 ? (p === 31 ? 2 : 1) : 2 ** (32 - p) - 2;
    const cls = (() => { const o = Number(ip.split('.')[0]); return o === 10 || (o === 172 && Number(ip.split('.')[1]) >= 16 && Number(ip.split('.')[1]) <= 31) || (o === 192 && ip.startsWith('192.168.')) ? 'private (RFC 1918)' : o === 169 && ip.startsWith('169.254.') ? 'link-local (no DHCP answer)' : o >= 224 && o <= 239 ? 'multicast' : 'public or other'; })();
    return R([{ label: 'Subnet mask', value: ipStr(mask), key: true }, { label: 'Network', value: `${ipStr(net)}/${p}`, key: true }, { label: 'Broadcast', value: ipStr(bc) },
      { label: 'Usable range', value: p >= 31 ? (p === 31 ? `${ipStr(net)} – ${ipStr(bc)} (point-to-point)` : ipStr(net)) : `${ipStr(net + 1)} – ${ipStr(bc - 1)}` }, { label: 'Usable hosts', value: hosts.toLocaleString('en-US'), key: true }, { label: 'Address kind', value: cls }, { label: 'Wildcard', value: ipStr(~mask >>> 0) }],
      [`mask = ${p} ones then ${32 - p} zeros = ${ipStr(mask)}`, `network = address AND mask = ${ipStr(net)}`, `hosts = 2^${32 - p} − 2 = ${hosts}`]); },
  formula: ['mask = 2³² − 2^(32−p)', 'network = IP ∧ mask', 'broadcast = network ∨ ¬mask', 'hosts = 2^(32−p) − 2'], basis: 'IPv4 addressing (RFC 791, 950, 1918).',
};

const poe: Tool = {
  id: 'poe-budget', category: 'network', title: 'PoE budget', summary: 'Whether a switch’s PoE budget covers its powered devices, by IEEE 802.3 class.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'budget', label: 'Switch PoE budget', unit: 'W', default: 370 }, { id: 'c3', label: 'Class 3 devices (802.3af, 15.4 W at the port)', default: 8 }, { id: 'c4', label: 'Class 4 devices (802.3at, 30 W)', default: 6 }, { id: 'c6', label: 'Class 6 devices (802.3bt Type 3, 60 W)', default: 1 }, { id: 'c8', label: 'Class 8 devices (802.3bt Type 4, 90 W)', default: 0 }],
  run: (v) => { const need = n(v.c3) * 15.4 + n(v.c4) * 30 + n(v.c6) * 60 + n(v.c8) * 90; const ok = need <= n(v.budget);
    return R([{ label: 'Allocated by class (at the switch port)', value: `${fmt(need, 1)} W`, key: true }, { label: 'Budget left', value: `${fmt(n(v.budget) - need, 1)} W`, tone: ok ? 'ok' : 'bad', note: ok ? undefined : 'over budget: the switch will refuse power to some ports' },
      { label: 'Ports in use', value: String(n(v.c3) + n(v.c4) + n(v.c6) + n(v.c8)) }], [`${n(v.c3)}×15.4 + ${n(v.c4)}×30 + ${n(v.c6)}×60 + ${n(v.c8)}×90 = ${fmt(need, 1)} W`],
      ['many switches allocate by class, not by actual draw (LLDP can lower it): plan by class unless you know the switch does otherwise']); },
  formula: ['P_total = Σ class power at the PSE'], basis: 'IEEE 802.3af/at/bt power at the switch port: 15.4 W (class 3), 30 W (class 4), 60 W (class 6), 90 W (class 8); devices receive less (12.95, 25.5, 51, 71.3 W) after cable loss.',
};

const audioNet: Tool = {
  id: 'audio-network', category: 'network', title: 'Networked audio bandwidth', summary: 'Approximate bandwidth of uncompressed audio flows (AES67-style) on a link.', cts: ['CTS', 'CTS-D'],
  fields: [{ id: 'ch', label: 'Channels per flow', default: 8 }, { id: 'flows', label: 'Flows', default: 4 }, { id: 'sr', label: 'Sample rate', unit: 'kHz', default: 48 }, { id: 'bits', label: 'Bit depth', default: 24 }, { id: 'pt', label: 'Packet time', unit: 'ms', default: 1 }, { id: 'link', label: 'Link', unit: 'Mb/s', default: 1000 }],
  run: (v) => { const pps = 1000 / n(v.pt, 1); const payload = n(v.ch) * n(v.bits) / 8 * n(v.sr) * 1000 / pps; const overhead = 12 + 14 + 4 + 20 + 8 + 12 + 8; const perFlow = (payload + overhead) * 8 * pps / 1e6; const total = perFlow * n(v.flows);
    return R([{ label: 'Per flow', value: `${fmt(perFlow, 2)} Mb/s` }, { label: 'All flows', value: `${fmt(total, 1)} Mb/s`, key: true }, { label: 'Share of the link', value: `${fmt(total / n(v.link) * 100, 1)} %`, tone: total / n(v.link) < 0.7 ? 'ok' : 'warn' }],
      [`payload per packet = ${n(v.ch)} ch × ${n(v.bits) / 8} bytes × ${n(v.sr)} kHz × ${n(v.pt)} ms = ${fmt(payload, 0)} bytes`, `+ ${overhead} bytes of Ethernet/IP/UDP/RTP framing, × ${fmt(pps, 0)} packets/s`]); },
  formula: ['payload = channels · bytes per sample · samples per packet', 'rate = (payload + framing) · 8 · packets per second'], basis: 'Ethernet (with preamble and gap), IPv4, UDP and RTP headers around linear PCM. Manufacturers publish exact figures for their protocols.',
};

// ------------------------------------------------------------------------------------------------ cabling
const fiber: Tool = {
  id: 'fiber-budget', category: 'cabling', title: 'Fiber link loss budget', summary: 'Expected loss of a fiber link against a transceiver’s power budget.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'type', label: 'Fiber', kind: 'select', options: [{ value: 'mm850', label: 'Multimode at 850 nm (≈ 3.5 dB/km)' }, { value: 'sm1310', label: 'Single-mode at 1310 nm (≈ 0.4 dB/km)' }, { value: 'sm1550', label: 'Single-mode at 1550 nm (≈ 0.3 dB/km)' }], default: 'mm850' },
    { id: 'km', label: 'Length', unit: 'm', default: 300 }, { id: 'conn', label: 'Mated connector pairs', default: 2 }, { id: 'splice', label: 'Splices', default: 0 }, { id: 'budget', label: 'Transceiver power budget', unit: 'dB', default: 7 }],
  run: (v) => { const k = s(v.type) === 'mm850' ? 3.5 : s(v.type) === 'sm1310' ? 0.4 : 0.3; const loss = n(v.km) / 1000 * k + n(v.conn) * 0.75 + n(v.splice) * 0.3; const margin = n(v.budget) - loss;
    return R([{ label: 'Expected link loss', value: `${fmt(loss, 2)} dB`, key: true }, { label: 'Margin', value: `${fmt(margin, 2)} dB`, tone: margin >= 3 ? 'ok' : margin >= 0 ? 'warn' : 'bad', note: margin >= 3 ? 'comfortable' : margin >= 0 ? 'thin: aim for 3 dB of margin' : 'over budget' }],
      [`${n(v.km) / 1000} km × ${k} dB/km + ${n(v.conn)} × 0.75 dB + ${n(v.splice)} × 0.3 dB = ${fmt(loss, 2)} dB`]); },
  formula: ['loss = L·α + N_conn·0.75 + N_splice·0.3', 'margin = budget − loss'], basis: 'Typical maximum allowances used in link planning (connector pair 0.75 dB, splice 0.3 dB); certify with an OLTS measurement.',
};

const copper: Tool = {
  id: 'copper-reach', category: 'cabling', title: 'Twisted-pair reach check', summary: 'Whether a run fits the 100 m channel of Ethernet, HDBaseT and PoE.', cts: ['CTS', 'CTS-I'],
  fields: [{ id: 'perm', label: 'Permanent link', unit: 'm', default: 82 }, { id: 'cords', label: 'Patch and equipment cords (total)', unit: 'm', default: 6 }],
  run: (v) => { const ch = n(v.perm) + n(v.cords); const ok = n(v.perm) <= 90 && ch <= 100;
    return R([{ label: 'Channel length', value: `${fmt(ch, 1)} m`, key: true }, { label: 'Verdict', value: ok ? 'within the 90 m link / 100 m channel' : 'too long: a switch, an extender or fiber in between', tone: ok ? 'ok' : 'bad' }], [`channel = ${n(v.perm)} + ${n(v.cords)} = ${fmt(ch, 1)} m`]); },
  formula: ['channel = permanent link + cords ≤ 100 m', 'permanent link ≤ 90 m'], basis: 'The structured-cabling channel model behind Ethernet; HDBaseT and PoE share the 100 m limit (some products reach further in long-reach modes at lower rates).',
};

// ------------------------------------------------------------------------------------------------ lighting
const illuminance: Tool = {
  id: 'illuminance', category: 'lighting', title: 'Illuminance from a fixture', summary: 'Light falling on a subject from a fixture’s intensity, distance and angle.', cts: ['CTS'],
  fields: [{ id: 'cd', label: 'Intensity toward the subject', unit: 'cd', default: 20000 }, { id: 'd', label: 'Distance', unit: 'm', default: 8 }, { id: 'ang', label: 'Angle of incidence', unit: '°', default: 30 }],
  run: (v) => { const E = n(v.cd) / (n(v.d) ** 2) * Math.cos(n(v.ang) * Math.PI / 180);
    return R([{ label: 'Illuminance', value: `${fmt(E, 0)} lux`, key: true }, { label: 'In foot-candles', value: `${fmt(E / 10.764, 1)} fc` }], [`E = I ÷ d² × cos θ = ${n(v.cd)} ÷ ${n(v.d)}² × cos ${n(v.ang)}° = ${fmt(E, 0)} lux`]); },
  formula: ['E = I·cos θ ÷ d²', '1 fc = 10.764 lux'], basis: 'Inverse-square and cosine laws of illumination for a point source.',
};

// ------------------------------------------------------------------------------------------------ project
const crew: Tool = {
  id: 'labour-estimate', category: 'project', title: 'Labor estimate', summary: 'Crew cost for a call with your own straight-time and overtime terms.', cts: ['CTS'],
  fields: [{ id: 'rate', label: 'Straight-time rate per tech', unit: '$/h', default: 55 }, { id: 'crew', label: 'Crew', default: 4 }, { id: 'hours', label: 'Hours on site per day', default: 12 }, { id: 'days', label: 'Days', default: 2 },
    { id: 'st', label: 'Straight-time hours per day', default: 8 }, { id: 'ot', label: 'Overtime multiplier', default: 1.5, step: 0.1 }, { id: 'dt', label: 'Double-time after (hours per day, 0 = none)', default: 0 }],
  run: (v) => { const h = n(v.hours); const st = Math.min(h, n(v.st)); const dtAfter = n(v.dt); const dtH = dtAfter > 0 ? Math.max(0, h - dtAfter) : 0; const otH = Math.max(0, h - st - dtH); const r = n(v.rate);
    const perDay = st * r + otH * r * n(v.ot, 1.5) + dtH * r * 2; const total = perDay * n(v.crew) * n(v.days);
    return R([{ label: 'Per tech per day', value: `$${fmt(perDay, 2)}` }, { label: 'Hours split', value: `${st} straight · ${otH} overtime · ${dtH} double` }, { label: 'Estimated total', value: `$${fmt(total, 2)}`, key: true }],
      [`(${st} × $${r}) + (${otH} × $${r} × ${n(v.ot, 1.5)}) + (${dtH} × $${r} × 2) = $${fmt(perDay, 2)}`, `× ${n(v.crew)} crew × ${n(v.days)} days`]); },
  formula: ['day = ST·r + OT·r·k + DT·r·2', 'total = day · crew · days'], basis: 'Your terms, entered above; nothing here is anyone’s rate card.',
};

// ------------------------------------------------------------------------------------------------ convert
const CONV: Record<string, { label: string; f: (x: number) => number; unit: string }> = {
  ft_m: { label: 'Feet → meters', f: (x) => x * FT, unit: 'm' }, m_ft: { label: 'Meters → feet', f: (x) => x / FT, unit: 'ft' }, in_mm: { label: 'Inches → millimeters', f: (x) => x * 25.4, unit: 'mm' }, mm_in: { label: 'Millimeters → inches', f: (x) => x / 25.4, unit: 'in' },
  lb_kg: { label: 'Pounds → kilograms', f: (x) => x * 0.45359237, unit: 'kg' }, kg_lb: { label: 'Kilograms → pounds', f: (x) => x / 0.45359237, unit: 'lb' }, fc_lux: { label: 'Foot-candles → lux', f: (x) => x * 10.764, unit: 'lux' }, lux_fc: { label: 'Lux → foot-candles', f: (x) => x / 10.764, unit: 'fc' },
  fl_nit: { label: 'Foot-lamberts → nits', f: (x) => x * 3.426, unit: 'cd/m²' }, nit_fl: { label: 'Nits → foot-lamberts', f: (x) => x / 3.426, unit: 'fL' }, w_btu: { label: 'Watts → BTU/h', f: (x) => x * 3.412, unit: 'BTU/h' }, btu_w: { label: 'BTU/h → watts', f: (x) => x / 3.412, unit: 'W' },
  c_f: { label: '°C → °F', f: (x) => x * 9 / 5 + 32, unit: '°F' }, f_c: { label: '°F → °C', f: (x) => (x - 32) * 5 / 9, unit: '°C' }, dbspl_pa: { label: 'dB SPL → pascals', f: (x) => 20e-6 * 10 ** (x / 20), unit: 'Pa' }, ratio_db: { label: 'Power ratio → dB', f: (x) => db10(x), unit: 'dB' },
  vratio_db: { label: 'Voltage ratio → dB', f: (x) => db20(x), unit: 'dB' }, mbps_mbyte: { label: 'Mb/s → MB/s', f: (x) => x / 8, unit: 'MB/s' },
};
const convert: Tool = {
  id: 'convert', category: 'convert', title: 'Unit converter', summary: 'Distance, weight, light, heat, temperature, decibels and data.',
  fields: [{ id: 'x', label: 'Value', default: 1 }, { id: 'c', label: 'Conversion', kind: 'select', options: Object.entries(CONV).map(([value, c]) => ({ value, label: c.label })), default: 'ft_m' }],
  run: (v) => { const c = CONV[s(v.c)] ?? CONV.ft_m!; const y = c.f(n(v.x)); return R([{ label: 'Result', value: `${fmt(y, 4)} ${c.unit}`, key: true }], [`${c.label}: ${n(v.x)} → ${fmt(y, 4)} ${c.unit}`]); },
  formula: ['1 ft = 0.3048 m', '1 lb = 0.45359237 kg', '1 fc = 10.764 lux', '1 fL = 3.426 cd/m²', '1 W = 3.412 BTU/h', '0 dB SPL = 20 µPa'], basis: 'Exact or standard conversion factors.',
};

const ohm: Tool = {
  id: 'ohms-law', category: 'power', title: 'Ohm’s law and the power wheel', summary: 'Enter any two of volts, amps, ohms and watts; get the other two.', cts: ['CTS', 'CTS-D', 'CTS-I'],
  fields: [{ id: 'V', label: 'Volts (0 = unknown)', unit: 'V', default: 70.7 }, { id: 'I', label: 'Amps (0 = unknown)', unit: 'A', default: 0 }, { id: 'R', label: 'Ohms (0 = unknown)', unit: 'Ω', default: 8 }, { id: 'P', label: 'Watts (0 = unknown)', unit: 'W', default: 0 }],
  run: (v) => { let V = n(v.V), I = n(v.I), Rr = n(v.R), P = n(v.P); const known = [V, I, Rr, P].filter((x) => x > 0).length;
    if (known < 2) return R([{ label: 'Enter two', value: 'any two of volts, amps, ohms and watts', tone: 'muted' }]);
    if (V && I) { Rr = V / I; P = V * I; } else if (V && Rr) { I = V / Rr; P = V * V / Rr; } else if (V && P) { I = P / V; Rr = V * V / P; } else if (I && Rr) { V = I * Rr; P = I * I * Rr; } else if (I && P) { V = P / I; Rr = P / (I * I); } else { V = Math.sqrt(P * Rr); I = Math.sqrt(P / Rr); }
    return R([{ label: 'Volts', value: `${fmt(V, 3)} V`, key: true }, { label: 'Amps', value: `${fmt(I, 3)} A`, key: true }, { label: 'Ohms', value: `${fmt(Rr, 3)} Ω`, key: true }, { label: 'Watts', value: `${fmt(P, 3)} W`, key: true }], ['V = I·R; P = V·I = I²·R = V²/R'], known > 2 ? ['more than two values entered: the first two in the order volts, amps, ohms, watts were used'] : []); },
  formula: ['V = I·R', 'P = V·I = I²·R = V² ÷ R'], basis: 'Ohm’s law and Joule’s law (DC, or AC RMS into a resistive load).',
};

export const TOOLS: readonly Tool[] = [screenSize, viewing, screenForRoom, pixelsVisible, throwDist, throwRatio, contrastLumens, luminance, ledWall, bandwidth,
  splAtListener, inverseSquare, addLevels, levelConvert, impedance, ceilingLayout, constVolt, cableLoss, ampForSpl, delay, wavelength,
  rt60, criticalDistance, pag, modes, ohm, circuits, vdrop, ups, bridle, designFactor, subnet, poe, audioNet, fiber, copper, illuminance, crew, convert];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id) ?? null;
export const defaults = (t: Tool): Record<string, Value> => Object.fromEntries(t.fields.map((f) => [f.id, f.default]));
export function search(q: string, cat: Category | '' = ''): Tool[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return TOOLS.filter((t) => (!cat || t.category === cat) && words.every((w) => `${t.title} ${t.summary} ${t.keywords ?? ''} ${t.category} ${t.formula.join(' ')}`.toLowerCase().includes(w)));
}
/** A plain-text report of one calculation, for a crew message or a job file. */
export function report(t: Tool, v: Record<string, Value>, r: Result, note = ''): string {
  const lines = [`${t.title} — Empathia Field Tools`, ...t.fields.map((f) => `  ${f.label}: ${f.kind === 'select' ? f.options?.find((o) => o.value === String(v[f.id]))?.label ?? v[f.id] : v[f.id]}${f.unit && f.kind !== 'select' ? ` ${f.unit}` : ''}`), 'Results:',
    ...r.outputs.map((o) => `  ${o.label}: ${o.value}${o.note ? ` (${o.note})` : ''}`), ...(r.warnings.length ? ['Notes:', ...r.warnings.map((w) => `  ${w}`)] : []), `Formula: ${t.formula.join('; ')}`, ...(note ? [`Note: ${note}`] : []), 'Estimate from standard formulas; verify against manufacturer data, AVIXA standards and local codes.'];
  return lines.join('\n');
}
