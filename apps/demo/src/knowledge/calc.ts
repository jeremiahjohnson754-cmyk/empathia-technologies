/**
 * The calculators behind every worked example in the Technical Knowledge Ledger. Pure functions of named inputs, so the page shows the
 * formula, the inputs with their units and a result that is computed, never typed; `tests/unit/demo-knowledge.test.mjs` recomputes
 * each one independently. Every result is MODELED: arithmetic on stated inputs, not a measurement of any room.
 */
const log10 = Math.log10; const rad = (deg: number) => (deg * Math.PI) / 180; const deg = (r: number) => (r * 180) / Math.PI;
type In = Record<string, number>;
/** 0 dBu is the voltage that puts 1 mW into 600 ohms: sqrt(0.6) V = 0.7746 V RMS. */
export const DBU_REF_V = Math.sqrt(0.6);
/** Relative luminance of an sRGB grey of 8-bit value v (the web accessibility guidelines' definition, for one channel). */
export const greyLuminance = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

export const CALC = {
  difference: ({ a, b }: In) => a! - b!,
  inverseSquare: ({ L1, d1, d2 }: In) => L1! - 20 * log10(d2! / d1!),
  splFromSensitivity: ({ S, P, d }: In) => S! + 10 * log10(P!) - 20 * log10(d!),
  powerRatioDb: ({ P1, P2 }: In) => 10 * log10(P2! / P1!),
  dbuToVolts: ({ dBu }: In) => DBU_REF_V * 10 ** (dBu! / 20),
  voltsToDbu: ({ V }: In) => 20 * log10(V! / DBU_REF_V),
  nomLoss: ({ NOM }: In) => 10 * log10(NOM!),
  pag: ({ D0, D1, D2, Ds, NOM, FSM }: In) => 20 * log10((D0! * D1!) / (D2! * Ds!)) - 10 * log10(NOM!) - FSM!,
  nag: ({ D0, EAD }: In) => 20 * log10(D0! / EAD!),
  sabine: ({ V, S1, a1, S2, a2, S3, a3 }: In) => (0.161 * V!) / (S1! * a1! + S2! * a2! + S3! * a3!),
  criticalDistance: ({ Q, V, RT }: In) => 0.057 * Math.sqrt((Q! * V!) / RT!),
  pathLength: ({ c, t }: In) => c! * t!,
  delayMs: ({ d, c }: In) => (d! / c!) * 1000,
  frameMs: ({ fps, frames }: In) => (frames! * 1000) / fps!,
  distanceFactor: ({ d, DF }: In) => d! * DF!,
  levelRatioDb: ({ ratio }: In) => 20 * log10(ratio!),
  coverageDiameter: ({ H, ear, angle }: In) => 2 * (H! - ear!) * Math.tan(rad(angle!) / 2),
  fovWidth: ({ hfov, d }: In) => 2 * d! * Math.tan(rad(hfov!) / 2),
  fovNeeded: ({ W, d }: In) => deg(2 * Math.atan(W! / (2 * d!))),
  charHeightMm: ({ arcmin, d }: In) => 2 * d! * Math.tan(rad(arcmin! / 60) / 2) * 1000,
  imageHeightFromChar: ({ charMm, perHeight }: In) => (charMm! * perHeight!) / 1000,
  heightFromDistance: ({ d, factor }: In) => d! / factor!,
  diagonalToHeightM: ({ D, aw, ah }: In) => ((D! * ah!) / Math.hypot(aw!, ah!)) * 0.0254,
  diagonalToWidthM: ({ D, aw, ah }: In) => ((D! * aw!) / Math.hypot(aw!, ah!)) * 0.0254,
  videoRateGbps: ({ w, h, fps, bpp }: In) => (w! * h! * fps! * bpp!) / 1e9,
  poeTotal: ({ n1, p1, n2, p2 }: In) => n1! * p1! + n2! * p2!,
  poeMargin: ({ budget, headroom, load }: In) => budget! * (1 - headroom!) - load!,
  clockSlipS: ({ fs, ppm }: In) => 1 / (fs! * ppm! * 1e-6),
  audioBitrateMbps: ({ fs, bits, ch, ptimeMs, overhead }: In) => ((((fs! * ptimeMs!) / 1000) * (bits! / 8) * ch! + overhead!) * 8 * (1000 / ptimeMs!)) / 1e6,
  dscpAf: ({ x, y }: In) => 8 * x! + 2 * y!,
  tosByte: ({ dscp }: In) => dscp! * 4,
  subnetHosts: ({ prefix }: In) => 2 ** (32 - prefix!) - 2,
  contrastRatio: ({ light, dark }: In) => (greyLuminance(light!) + 0.05) / (greyLuminance(dark!) + 0.05),
  heatBtuH: ({ W }: In) => W! * 3.412,
} as const;
export type CalcId = keyof typeof CALC;

/** One worked example: which calculator, the formula in words, each input with its value, unit and meaning, and the computed result. */
export interface Worked { calc: CalcId; label: string; formula: string; inputs: Readonly<Record<string, number>>; about: Readonly<Record<string, string>>; result: number; unit: string; dp: number }
export const round = (x: number, dp: number) => { const m = 10 ** dp; return Math.round((x + Number.EPSILON) * m) / m; };
/** Build a worked example. The result is computed here from the inputs, so a number on the page cannot drift from its formula. */
export function worked(calc: CalcId, label: string, formula: string, inputs: Record<string, number>, about: Record<string, string>, unit: string, dp: number): Worked {
  return { calc, label, formula, inputs, about, unit, dp, result: round(CALC[calc](inputs), dp) };
}
/** The one-line form kept in the contract's `calculations` field. */
export const workedLine = (w: Worked) => `${w.label}: ${w.formula} → ${w.result.toFixed(w.dp)} ${w.unit} (MODELED: computed from the stated inputs)`;
