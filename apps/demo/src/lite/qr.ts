/**
 * QR codes for Lite (byte mode, error-correction level M, versions 1–6), ported from V2.5.3's qrMatrix (read statically, never executed).
 * Returns the module matrix; the page draws it as one SVG path. No network, no library.
 */
const QR_V: Array<{ size: number; data: number; ec: number; blocks: number; align: number[] } | null> = [null,
  { size: 21, data: 16, ec: 10, blocks: 1, align: [] }, { size: 25, data: 28, ec: 16, blocks: 1, align: [6, 18] }, { size: 29, data: 44, ec: 26, blocks: 1, align: [6, 22] },
  { size: 33, data: 64, ec: 18, blocks: 2, align: [6, 26] }, { size: 37, data: 86, ec: 24, blocks: 2, align: [6, 30] }, { size: 41, data: 108, ec: 16, blocks: 4, align: [6, 34] }];
const EXP = new Array<number>(512), LOG = new Array<number>(256);
(() => { let x = 1; for (let i = 0; i < 255; i += 1) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 285; } for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255]!; })();
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a]! + LOG[b]!]! : 0);
function ec(data: number[], n: number): number[] {
  let gen = [1];
  for (let i = 0; i < n; i += 1) { const next = new Array<number>(gen.length + 1).fill(0); for (let j = 0; j < gen.length; j += 1) { next[j]! ^= gen[j]!; next[j + 1]! ^= mul(gen[j]!, EXP[i]!); } gen = next; }
  const rem = new Array<number>(n).fill(0);
  for (const d of data) { const f = d ^ rem.shift()!; rem.push(0); for (let j = 0; j < n; j += 1) rem[j]! ^= mul(gen[j + 1]!, f); }
  return rem;
}
function utf8(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) { const c = ch.codePointAt(0)!; if (c < 128) out.push(c); else if (c < 2048) out.push(192 | (c >> 6), 128 | (c & 63)); else if (c < 65536) out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); else out.push(240 | (c >> 18), 128 | ((c >> 12) & 63), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
  return out;
}
const MASKS: Array<(r: number, c: number) => boolean> = [(r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (_r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0, (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0];
function format(mask: number): number { let rem = mask; for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 1335); return ((mask << 10) | rem) ^ 21522; }
function penalty(m: boolean[][]): number {
  const n = m.length; let p = 0;
  for (let k = 0; k < 2; k += 1) for (let i = 0; i < n; i += 1) { let run = 1; for (let j = 1; j < n; j += 1) { const a = k ? m[j]![i] : m[i]![j], b = k ? m[j - 1]![i] : m[i]![j - 1]; if (a === b) { run += 1; if (run === 5) p += 3; else if (run > 5) p += 1; } else run = 1; } }
  for (let r = 0; r < n - 1; r += 1) for (let c = 0; c < n - 1; c += 1) if (m[r]![c] === m[r]![c + 1] && m[r]![c] === m[r + 1]![c] && m[r]![c] === m[r + 1]![c + 1]) p += 3;
  const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], rev = pat.slice().reverse();
  for (let k = 0; k < 2; k += 1) for (let i = 0; i < n; i += 1) for (let j = 0; j <= n - 11; j += 1) { let a = true, b = true; for (let t = 0; t < 11; t += 1) { const v = (k ? m[j + t]![i] : m[i]![j + t]) ? 1 : 0; if (v !== pat[t]) a = false; if (v !== rev[t]) b = false; } if (a) p += 40; if (b) p += 40; }
  let dark = 0; for (const row of m) for (const v of row) if (v) dark += 1;
  return p + Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
}
export interface QR { size: number; version: number; mask: number; modules: boolean[][] }
export function qrMatrix(text: string): QR | null {
  const bytes = utf8(text); let ver = 0;
  for (let v = 1; v <= 6; v += 1) if (bytes.length <= QR_V[v]!.data - 2) { ver = v; break; }
  if (!ver) return null;
  const V = QR_V[ver]!; const n = V.size; const bits: number[] = [];
  const put = (val: number, len: number) => { for (let i = len - 1; i >= 0; i -= 1) bits.push((val >> i) & 1); };
  put(4, 4); put(bytes.length, 8); for (const b of bytes) put(b, 8);
  const cap = V.data * 8; for (let i = 0; i < 4 && bits.length < cap; i += 1) bits.push(0); while (bits.length % 8) bits.push(0);
  const data: number[] = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let i = 0; data.length < V.data; i += 1) data.push(i % 2 ? 17 : 236);
  const per = V.data / V.blocks; const blocks: Array<{ d: number[]; e: number[] }> = [];
  for (let b = 0; b < V.blocks; b += 1) { const d = data.slice(b * per, (b + 1) * per); blocks.push({ d, e: ec(d, V.ec) }); }
  const cw: number[] = []; for (let i = 0; i < per; i += 1) for (const b of blocks) cw.push(b.d[i]!); for (let i = 0; i < V.ec; i += 1) for (const b of blocks) cw.push(b.e[i]!);
  const stream: number[] = []; for (const c of cw) for (let i = 7; i >= 0; i -= 1) stream.push((c >> i) & 1);
  const m = Array.from({ length: n }, () => new Array<boolean>(n).fill(false)); const fn = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const set = (r: number, c: number, v: boolean) => { if (r >= 0 && r < n && c >= 0 && c < n) { m[r]![c] = v; fn[r]![c] = true; } };
  const finder = (r0: number, c0: number) => { for (let r = -1; r <= 7; r += 1) for (let c = -1; c <= 7; c += 1) set(r0 + r, c0 + c, r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))); };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (const r of V.align) for (const c of V.align) if (!((r === 6 && c === 6) || (r === 6 && c === n - 7) || (r === n - 7 && c === 6))) for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  for (let i = 8; i < n - 8; i += 1) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  set(n - 8, 8, true);
  for (let i = 0; i < 9; i += 1) { if (!fn[8]![i]) set(8, i, false); if (!fn[i]![8]) set(i, 8, false); }
  for (let i = 0; i < 8; i += 1) { set(8, n - 1 - i, false); set(n - 1 - i, 8, m[n - 1 - i]![8]!); }
  let k = 0, up = true;
  for (let c = n - 1; c > 0; c -= 2) { if (c === 6) c -= 1; for (let i = 0; i < n; i += 1) { const r = up ? n - 1 - i : i; for (let dc = 0; dc < 2; dc += 1) { const cc = c - dc; if (!fn[r]![cc]) { m[r]![cc] = k < stream.length ? stream[k] === 1 : false; k += 1; } } } up = !up; }
  let best: { p: number; t: boolean[][]; mask: number } | null = null;
  for (let mask = 0; mask < 8; mask += 1) {
    const t = m.map((row) => row.slice());
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (!fn[r]![c] && MASKS[mask]!(r, c)) t[r]![c] = !t[r]![c];
    const f = format(mask); const bit = (i: number) => ((f >> i) & 1) === 1;
    for (let i = 0; i <= 5; i += 1) t[i]![8] = bit(i);
    t[7]![8] = bit(6); t[8]![8] = bit(7); t[8]![7] = bit(8);
    for (let i = 9; i < 15; i += 1) t[8]![14 - i] = bit(i);
    for (let i = 0; i < 8; i += 1) t[8]![n - 1 - i] = bit(i);
    for (let i = 8; i < 15; i += 1) t[n - 15 + i]![8] = bit(i);
    t[n - 8]![8] = true;
    const p = penalty(t); if (!best || p < best.p) best = { p, t, mask };
  }
  return { size: n, version: ver, mask: best!.mask, modules: best!.t };
}
/** one SVG path for the dark modules, with a 4-module quiet zone */
export function qrPath(q: QR): string {
  let d = ''; const n = q.size;
  for (let r = 0; r < n; r += 1) { let c = 0; while (c < n) { if (!q.modules[r]![c]) { c += 1; continue; } let e = c; while (e < n && q.modules[r]![e]) e += 1; d += `M${c + 4} ${r + 4}h${e - c}v1h-${e - c}z`; c = e; } }
  return d;
}
