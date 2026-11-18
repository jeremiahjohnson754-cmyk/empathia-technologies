/**
 * SIGNAL's field calculator, restored 18 Nov 2026 from the standalone (read as text: its calcEval, buildCalc and helper list). A safe
 * expression evaluator (no eval): + − × ÷ ^ and parentheses, sqrt( ) log( ) ln( ) sin( ) cos( ) tan( ) in degrees, abs( ), π and e,
 * with the reference's error words. The fourteen field helpers are the reference's, in its order, with its units.
 */
export function calcEval(src: string): number {
  const s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/\s+/g, ''); let i = 0;
  const peek = () => s[i];
  const fns: Record<string, (x: number) => number> = { sqrt: Math.sqrt, log: Math.log10, ln: Math.log, sin: (x) => Math.sin(x * Math.PI / 180), cos: (x) => Math.cos(x * Math.PI / 180), tan: (x) => Math.tan(x * Math.PI / 180), abs: Math.abs };
  function expr(): number { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++]; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
  function term(): number { let v = power(); while (peek() === '*' || peek() === '/') { const o = s[i++]; const r = power(); v = o === '*' ? v * r : v / r; } return v; }
  function power(): number { const b = unary(); if (peek() === '^') { i++; const e = power(); return Math.pow(b, e); } return b; }
  function unary(): number { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return atom(); }
  function atom(): number {
    if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error('missing )'); i++; return v; }
    const m = /^[a-z]+/.exec(s.slice(i));
    if (m) {
      const name = m[0]; i += name.length;
      if (name === 'pi') return Math.PI; if (name === 'e') return Math.E;
      const f = fns[name]; if (!f) throw new Error(`unknown ${name}`);
      if (peek() !== '(') throw new Error(`${name} needs ( )`);
      i++; const a = expr(); if (peek() !== ')') throw new Error('missing )'); i++; return f(a);
    }
    const n = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/.exec(s.slice(i));
    if (!n) throw new Error(`unexpected "${peek() || 'end'}"`);
    i += n[0].length; return parseFloat(n[0]);
  }
  const v = expr(); if (i < s.length) throw new Error(`unexpected "${s[i]}"`); return v;
}
export const calcRound = (x: number, n = 0) => { const p = Math.pow(10, n); return Math.round(x * p) / p; };
/** run an expression as the calculator shows it: the rounded value, or the reference's “⚠ reason” */
export function calcRun(src: string): { ok: true; text: string } | { ok: false; text: string } {
  try { const v = calcEval(src); if (!isFinite(v)) throw new Error('not a finite number'); return { ok: true, text: String(calcRound(v, 6)) }; }
  catch (e) { return { ok: false, text: `⚠ ${(e as Error).message}` }; }
}
export const CALC_KEYS = ['7', '8', '9', '÷', '(', '4', '5', '6', '×', ')', '1', '2', '3', '−', '^', '0', '.', 'π', '+', '⌫', 'sqrt(', 'log(', 'ln(', 'C', '='] as const;

export interface Helper { label: string; fields: string[]; fn: (...v: number[]) => number; unit: string }
export const HELPERS: Helper[] = [
  { label: 'dB → ratio (V/pressure)', fields: ['dB'], fn: (d) => Math.pow(10, d / 20), unit: '×' },
  { label: 'ratio → dB (V/pressure)', fields: ['ratio'], fn: (r) => 20 * Math.log10(r), unit: 'dB' },
  { label: 'power ratio → dB', fields: ['ratio'], fn: (r) => 10 * Math.log10(r), unit: 'dB' },
  { label: 'distance → delay', fields: ['metres'], fn: (m) => m / 343 * 1000, unit: 'ms' },
  { label: 'delay → distance', fields: ['ms'], fn: (ms) => ms / 1000 * 343, unit: 'm' },
  { label: 'first comb notch', fields: ['Δt ms'], fn: (ms) => 1 / (2 * ms / 1000), unit: 'Hz' },
  { label: 'frequency ↔ period', fields: ['Hz'], fn: (f) => 1000 / f, unit: 'ms' },
  { label: 'wavelength', fields: ['Hz'], fn: (f) => 343 / f, unit: 'm' },
  { label: 'current I = P / V', fields: ['watts', 'volts'], fn: (p, v) => p / v, unit: 'A' },
  { label: 'FFT bin → Hz', fields: ['bin', 'fs Hz', 'N'], fn: (b, fs, n) => b * fs / n, unit: 'Hz' },
  { label: 'usable hosts in /n', fields: ['n'], fn: (n) => Math.max(0, Math.pow(2, 32 - n) - 2), unit: 'hosts' },
  { label: '3rd-order IM 2a − b', fields: ['a MHz', 'b MHz'], fn: (a, b) => 2 * a - b, unit: 'MHz' },
  { label: 'inverse square Δ', fields: ['d1', 'd2'], fn: (a, b) => -20 * Math.log10(b / a), unit: 'dB' },
  { label: 'field width 2·d·tan(θ/2)', fields: ['d m', 'θ°'], fn: (d, t) => 2 * d * Math.tan(t * Math.PI / 360), unit: 'm' },
];
export const numOf = (v: string): number | null => { const x = parseFloat(String(v).replace(',', '.')); return Number.isNaN(x) ? null : x; };
export function helperRun(h: Helper, values: string[]): string {
  const v = values.map(numOf); if (v.some((x) => x === null)) return 'fill every box';
  const r = h.fn(...(v as number[])); return `${calcRound(r, 4)}${h.unit ? ` ${h.unit}` : ''}`;
}
