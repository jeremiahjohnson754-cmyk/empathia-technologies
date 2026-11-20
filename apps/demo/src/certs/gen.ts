/**
 * Calculation drills: question templates that draw fresh numbers each attempt, so the arithmetic is practised rather than memorised.
 * Each wrong option is a real mistake people make (10·log for a voltage ratio, width for height, forgetting the two unusable addresses)
 * and the explanation names it. The answer is computed by the same formula Field Tools uses; FT and these drills are tested together.
 */
import type { Q } from './types.js';
import type { CertId } from './facts.js';

/** a small seeded generator (mulberry32): the same seed gives the same drill, so a missed drill can be reviewed exactly */
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const f = (x: number, dp = 1) => (Number.isInteger(x) ? x.toLocaleString('en-US') : x.toLocaleString('en-US', { maximumFractionDigits: dp, minimumFractionDigits: 0 }));
const log10 = Math.log10;

interface Draft { stem: string; right: string; wrong: string[]; why: string; topic: string; tool?: string }
/** shuffle the right answer among three distinct wrong ones */
function build(id: string, cert: CertId, domain: string, task: string, r: () => number, d: Draft): Q {
  const wrong = [...new Set(d.wrong.filter((w) => w !== d.right))].slice(0, 3);
  // when two mistakes happen to give the same number, the next most common slip is a factor of two (or ten) either way
  const m = /^([+-]?)([\d,.]+)(.*)$/.exec(d.right);
  if (m) for (const k of [2, 0.5, 10, 0.1]) { if (wrong.length >= 3) break; const v = `${m[1]}${f(Number(m[2]!.replace(/,/g, '')) * k, 3)}${m[3]}`; if (v !== d.right && !wrong.includes(v)) wrong.push(v); }
  const at = Math.floor(r() * 4) as 0 | 1 | 2 | 3; const opts = [...wrong]; opts.splice(at, 0, d.right);
  return { id, cert, domain, task, topic: d.topic, stem: d.stem, options: opts as [string, string, string, string], answer: at, why: d.why, math: true, tool: d.tool, generated: true };
}

type Template = { id: string; certs: CertId[]; domain: Partial<Record<CertId, [string, string]>>; make: (r: () => number) => Draft };
const ALL: CertId[] = ['CTS', 'CTS-D', 'CTS-I'];
const DESIGN = { CTS: ['A', 'A4'], 'CTS-D': ['C', 'C1'], 'CTS-I': ['D', 'D9'] } as Record<CertId, [string, string]>;
const INSTALL = { CTS: ['B', 'B1'], 'CTS-D': ['C', 'C1'], 'CTS-I': ['D', 'D6'] } as Record<CertId, [string, string]>;

export const TEMPLATES: Template[] = [
  { id: 'db-power', certs: ALL, domain: DESIGN, make: (r) => { const k = pick(r, [2, 4, 8, 10, 20, 100, 0.5]); const db = 10 * log10(k);
    return { topic: 'Decibels', tool: 'convert', stem: `An amplifier’s output power is multiplied by ${k}. What is the change in level?`, right: `${db >= 0 ? '+' : ''}${f(db)} dB`,
      wrong: [`${db >= 0 ? '+' : ''}${f(20 * log10(k))} dB`, `${db >= 0 ? '+' : ''}${f(k)} dB`, `${db >= 0 ? '+' : ''}${f(db / 2)} dB`], why: `A power ratio uses 10·log: 10 × log(${k}) = ${f(db)} dB. (20·log is for voltage or pressure ratios.)` }; } },
  { id: 'db-volt', certs: ALL, domain: DESIGN, make: (r) => { const k = pick(r, [2, 4, 10, 0.5, 3.16]); const db = 20 * log10(k);
    return { topic: 'Decibels', tool: 'convert', stem: `A signal’s voltage is multiplied by ${k} into the same load. What is the change in level?`, right: `${db >= 0 ? '+' : ''}${f(db)} dB`,
      wrong: [`${db >= 0 ? '+' : ''}${f(10 * log10(k))} dB`, `${db >= 0 ? '+' : ''}${f(db * 2)} dB`, `${db >= 0 ? '+' : ''}${f(k * 2)} dB`], why: `A voltage ratio uses 20·log: 20 × log(${k}) = ${f(db)} dB.` }; } },
  { id: 'inverse', certs: ALL, domain: DESIGN, make: (r) => { const l1 = pick(r, [90, 94, 100, 104, 110]); const d1 = pick(r, [1, 2, 3, 5]); const k = pick(r, [2, 4, 8, 10]); const d2 = d1 * k; const l2 = l1 - 20 * log10(k);
    return { topic: 'Inverse square law', tool: 'inverse-square', stem: `A point source measures ${l1} dB SPL at ${d1} m. In a free field, what does it measure at ${d2} m?`, right: `${f(l2)} dB`,
      wrong: [`${f(l1 - 10 * log10(k))} dB`, `${f(l1 - 6 * k)} dB`, `${f(l1 / k)} dB`], why: `ΔL = 20·log(${d2} ÷ ${d1}) = ${f(20 * log10(k))} dB; ${l1} − ${f(20 * log10(k))} = ${f(l2)} dB. (−3 dB per doubling is a line source.)` }; } },
  { id: 'sensitivity', certs: ALL, domain: DESIGN, make: (r) => { const s = pick(r, [86, 89, 92, 95, 98]); const p = pick(r, [10, 25, 50, 100, 200, 400]); const d = pick(r, [2, 4, 8, 16]); const l = s + 10 * log10(p) - 20 * log10(d);
    return { topic: 'Loudspeaker level', tool: 'spl-listener', stem: `A loudspeaker rated ${s} dB (1 W, 1 m) gets ${p} W. Ignoring the room and power compression, what level reaches a listener ${d} m away?`, right: `${f(l)} dB`,
      wrong: [`${f(s + 20 * log10(p) - 20 * log10(d))} dB`, `${f(s + 10 * log10(p) - 10 * log10(d))} dB`, `${f(s + 10 * log10(p))} dB`], why: `${s} + 10·log(${p}) − 20·log(${d}) = ${s} + ${f(10 * log10(p))} − ${f(20 * log10(d))} = ${f(l)} dB.` }; } },
  { id: 'throw', certs: ALL, domain: DESIGN, make: (r) => { const tr = pick(r, [0.8, 1.2, 1.5, 1.8, 2.2, 3]); const w = pick(r, [6, 8, 10, 12, 16]); const d = tr * w;
    return { topic: 'Projection', tool: 'throw-distance', stem: `A lens has a throw ratio of ${tr}:1 and the image is ${w} ft wide. What is the throw distance?`, right: `${f(d)} ft`,
      wrong: [`${f(w / tr)} ft`, `${f(tr + w)} ft`, `${f(d * 9 / 16)} ft`], why: `Throw distance = throw ratio × image width = ${tr} × ${w} = ${f(d)} ft.` }; } },
  { id: 'height', certs: ALL, domain: DESIGN, make: (r) => { const dg = pick(r, [65, 75, 86, 98, 120, 150]); const h = dg * 9 / Math.hypot(16, 9); const w = dg * 16 / Math.hypot(16, 9);
    return { topic: 'Display geometry', tool: 'screen-size', stem: `How tall is a ${dg}-inch 16:9 image?`, right: `${f(h)} in`, wrong: [`${f(w)} in`, `${f(dg * 9 / 16)} in`, `${f(dg / 2)} in`],
      why: `H = D × 9 ÷ √(16² + 9²) = ${dg} × 9 ÷ 18.36 = ${f(h)} in. (${f(w)} in is the width.)` }; } },
  { id: 'farthest', certs: ['CTS', 'CTS-D'], domain: DESIGN, make: (r) => { const k = pick(r, [4, 6, 8]); const far = pick(r, [24, 30, 36, 48, 60]); const h = far / k;
    return { topic: 'Display sizing', tool: 'screen-for-room', stem: `Using the ${k}× rule of thumb (${k === 4 ? 'inspection' : k === 6 ? 'detailed' : 'general'} viewing), the farthest viewer is ${far} ft away. What is the minimum image height?`, right: `${f(h)} ft`,
      wrong: [`${f(far / (k + 2))} ft`, `${f(far * k / 12)} ft`, `${f(far / k * 2)} ft`, `${f(far / k / 2)} ft`], why: `Height = farthest ÷ ${k} = ${far} ÷ ${k} = ${f(h)} ft. (AVIXA’s DISCAS standard is the method for a design of record.)` }; } },
  { id: 'power', certs: ALL, domain: DESIGN, make: (r) => { const v = pick(r, [20, 28.28, 40, 70.7]); const z = pick(r, [4, 8, 16]); const p = v * v / z;
    return { topic: 'Ohm’s law', tool: 'ohms-law', stem: `${v} V RMS is applied across a ${z} Ω load. How much power is delivered?`, right: `${f(p)} W`, wrong: [`${f(v / z)} W`, `${f(v * z)} W`, `${f(p / 2)} W`], why: `P = V² ÷ R = ${v}² ÷ ${z} = ${f(p)} W.` }; } },
  { id: 'parallel', certs: ALL, domain: INSTALL, make: (r) => { const z = pick(r, [4, 8, 16]); const n = pick(r, [2, 3, 4]); const t = z / n;
    return { topic: 'Impedance', tool: 'speaker-impedance', stem: `${n} loudspeakers of ${z} Ω each are wired in parallel. What is the total load?`, right: `${f(t, 2)} Ω`, wrong: [`${f(z * n)} Ω`, `${f(z)} Ω`, `${f(z / (n + 1), 2)} Ω`], why: `Equal impedances in parallel: ${z} ÷ ${n} = ${f(t, 2)} Ω. In series they would add to ${z * n} Ω.` }; } },
  { id: 'taps', certs: ALL, domain: DESIGN, make: (r) => { const n = pick(r, [12, 16, 20, 24, 30, 40]); const t = pick(r, [1, 2, 4, 5, 8]); const p = n * t; const a = p * 1.25;
    return { topic: '70 V systems', tool: 'distributed-70v', stem: `${n} speakers on a 70 V line are each tapped at ${t} W. With 25 % headroom, what amplifier rating is needed?`, right: `${f(a)} W`, wrong: [`${f(p)} W`, `${f(a * 2)} W`, `${f(n * 70.7 / 10)} W`], why: `Taps total ${n} × ${t} = ${p} W; × 1.25 = ${f(a)} W.` }; } },
  { id: 'current', certs: ALL, domain: DESIGN, make: (r) => { const p = pick(r, [1200, 1800, 2400, 3000, 3600]); const v = pick(r, [120, 230]); const i = p / v;
    return { topic: 'Electrical', tool: 'watts-amps', stem: `Equipment draws ${p.toLocaleString('en-US')} W at ${v} V (power factor 1). What current flows?`, right: `${f(i)} A`, wrong: [`${f(v / p * 100)} A`, `${f(i * 1.25)} A`, `${f(p / 1000)} A`], why: `I = P ÷ V = ${p} ÷ ${v} = ${f(i)} A.` }; } },
  { id: 'btu', certs: ALL, domain: DESIGN, make: (r) => { const p = pick(r, [500, 800, 1200, 2000, 3500]); const b = p * 3.412;
    return { topic: 'Heat load', tool: 'watts-amps', stem: `A rack dissipates ${p.toLocaleString('en-US')} W. About how much heat must cooling remove?`, right: `${f(b, 0)} BTU/h`, wrong: [`${f(p, 0)} BTU/h`, `${f(p / 3.412, 0)} BTU/h`, `${f(p * 12, 0)} BTU/h`], why: `1 W ≈ 3.412 BTU/h: ${p} × 3.412 = ${f(b, 0)} BTU/h.` }; } },
  { id: 'hosts', certs: ALL, domain: INSTALL, make: (r) => { const p = pick(r, [22, 23, 24, 25, 26, 27, 28, 29, 30]); const h = 2 ** (32 - p) - 2;
    return { topic: 'Subnetting', tool: 'subnet', stem: `How many usable host addresses are in a /${p} subnet?`, right: f(h), wrong: [f(h + 2), f(2 ** (32 - p) / 2), f(32 - p)], why: `2^(32 − ${p}) − 2 = ${2 ** (32 - p)} − 2 = ${f(h)}: the network and broadcast addresses are not usable.` }; } },
  { id: 'wavelength', certs: ALL, domain: DESIGN, make: (r) => { const fr = pick(r, [50, 100, 250, 500, 1000, 2000, 4000]); const l = 343 / fr;
    return { topic: 'Wavelength', tool: 'wavelength', stem: `What is the wavelength of ${fr.toLocaleString('en-US')} Hz in air at about 20 °C?`, right: `${f(l, 3)} m`, wrong: [`${f(fr / 343, 3)} m`, `${f(l * 2, 3)} m`, `${f(1130 / fr, 3)} m`], why: `λ = c ÷ f = 343 ÷ ${fr} = ${f(l, 3)} m. (1,130 ÷ f gives feet, not metres.)` }; } },
  { id: 'delay', certs: ALL, domain: DESIGN, make: (r) => { const dm = pick(r, [20, 30, 40, 50]); const df = pick(r, [5, 8, 10]); const ms = (dm - df) / 343 * 1000;
    return { topic: 'Delay', tool: 'delay-alignment', stem: `A listener is ${dm} m from the main loudspeakers and ${df} m from a delay loudspeaker. What delay aligns the two arrivals (before any precedence offset)?`, right: `${f(ms)} ms`, wrong: [`${f(dm / 343 * 1000)} ms`, `${f((dm - df) / 1130 * 1000)} ms`, `${f((dm + df) / 343 * 1000)} ms`], why: `Δt = (${dm} − ${df}) ÷ 343 = ${f(ms)} ms.` }; } },
  { id: 'contrast', certs: ['CTS', 'CTS-D'], domain: DESIGN, make: (r) => { const cr = pick(r, [7, 15, 50, 80]); const amb = pick(r, [2, 3, 5, 8]); const l = (cr - 1) * amb;
    return { topic: 'Contrast', tool: 'projector-lumens', stem: `Ambient light reflected from the screen is ${amb} fL. What image luminance gives ${cr}:1 contrast?`, right: `${f(l)} fL`, wrong: [`${f(cr * amb)} fL`, `${f(cr / amb)} fL`, `${f((cr + 1) * amb)} fL`], why: `CR = (L + A) ÷ A, so L = (CR − 1) × A = ${cr - 1} × ${amb} = ${f(l)} fL.` }; } },
  { id: 'scale', certs: ['CTS-D', 'CTS-I'], domain: { 'CTS-D': ['C', 'C3'], 'CTS-I': ['A', 'A1'] }, make: (r) => { const sc = pick(r, [[1 / 8, '1/8″'], [1 / 4, '1/4″'], [1 / 2, '1/2″']] as const); const inches = pick(r, [3, 4.5, 6, 7.5, 10]); const ft = inches / sc[0];
    return { topic: 'Drawing scale', stem: `On a drawing at ${sc[1]} = 1′-0″, a run measures ${inches} inches. How long is it?`, right: `${f(ft)} ft`, wrong: [`${f(inches * sc[0])} ft`, `${f(inches)} ft`, `${f(ft / 2)} ft`], why: `${sc[1]} represents 1 ft, so 1″ is ${f(1 / sc[0])} ft; ${inches} × ${f(1 / sc[0])} = ${f(ft)} ft.` }; } },
  { id: 'rackunits', certs: ['CTS', 'CTS-I'], domain: { CTS: ['B', 'B1'], 'CTS-I': ['D', 'D1'] }, make: (r) => { const ru = pick(r, [8, 12, 16, 24, 42, 45]); const inch = ru * 1.75;
    return { topic: 'Racks', stem: `How tall is ${ru} RU of rack space?`, right: `${f(inch, 2)} in`, wrong: [`${f(ru * 1.5, 2)} in`, `${f(ru * 2, 2)} in`, `${f(ru * 1.25, 2)} in`], why: `1 RU = 1.75 in: ${ru} × 1.75 = ${f(inch, 2)} in (${f(inch * 25.4, 0)} mm).` }; } },
  { id: 'bpp', certs: ['CTS', 'CTS-D'], domain: DESIGN, make: (r) => { const b = pick(r, [8, 10, 12]); const c = pick(r, [['4:4:4', 3], ['4:2:2', 2], ['4:2:0', 1.5]] as const); const bpp = b * c[1];
    return { topic: 'Video bandwidth', tool: 'video-bandwidth', stem: `How many bits per pixel does ${b}-bit ${c[0]} video carry on average?`, right: `${f(bpp)} bits`, wrong: [`${f(b)} bits`, `${f(b * 4)} bits`, `${f(c[1] === 3 ? b * 6 : b * 3)} bits`, `${f(bpp * 2)} bits`], why: `${c[0]} averages ${c[1]} samples per pixel; × ${b} bits = ${f(bpp)} bits per pixel.` }; } },
];

/** `n` drills for a certification, deterministic for a seed */
export function drills(cert: CertId, n: number, seed: number): Q[] {
  const r = rng(seed); const ts = TEMPLATES.filter((t) => t.certs.includes(cert)); const out: Q[] = [];
  for (let i = 0; i < n; i++) { const t = ts[i % ts.length]!; const s = Math.floor(r() * 1e9); const [domain, task] = t.domain[cert]!; out.push(build(`gen-${t.id}-${s}`, cert, domain, task, rng(s), t.make(rng(s ^ 0x9e3779b9)))); }
  return out;
}
/** rebuild one drill from its id (for review of a missed drill) */
export function drillById(cert: CertId, id: string): Q | null {
  const m = /^gen-([a-z-]+?)-(\d+)$/.exec(id); if (!m) return null; const t = TEMPLATES.find((x) => x.id === m[1] && x.certs.includes(cert)); if (!t) return null; const s = Number(m[2]);
  const [domain, task] = t.domain[cert]!; return build(id, cert, domain, task, rng(s), t.make(rng(s ^ 0x9e3779b9)));
}
