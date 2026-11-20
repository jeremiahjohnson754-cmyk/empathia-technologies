/**
 * What the workspaces add to the shell's component kit (@empathia/ui kit.tsx): series computed from records (weekly counts and
 * backlogs, V2.5.3's trend arithmetic as a kit Delta), the board (lanes of cards), compact label/value pairs, a stacked bar and the
 * page foot. Every value a caller passes is computed from the demonstration's records; nothing here invents a number. No style
 * attributes (CSP): geometry is SVG attributes, colour is the kit's series classes.
 */
import type { ReactNode } from 'react';
import type { Delta, Series } from '@empathia/ui';

export type { Series };
const DAY = 864e5;

/** How many of `list` fall in each of the last `n` weeks (oldest first), by the timestamp `at(x)`. */
export function weekCounts<T>(list: T[], at: (x: T) => string | null | undefined, n = 8, now = Date.now()): number[] {
  const out = new Array<number>(n).fill(0);
  for (const x of list) { const s = at(x); if (!s) continue; const t = Date.parse(s); if (!(t <= now)) continue; const k = Math.floor((now - t) / (7 * DAY)); if (k < n) out[n - 1 - k]! += 1; }
  return out;
}
/** How many of `list` were open at the end of each of the last `n` weeks (opened at or before, and not yet done). */
export function weekBacklog<T>(list: T[], opened: (x: T) => string | null | undefined, done: (x: T) => string | null | undefined, n = 8, now = Date.now()): number[] {
  const out: number[] = [];
  for (let k = n - 1; k >= 0; k -= 1) { const t = now - k * 7 * DAY; out.push(list.filter((x) => { const o = opened(x); const d = done(x); return !!o && Date.parse(o) <= t && (!d || Date.parse(d) > t); }).length); }
  return out;
}
/** The change over the last `span` points against the span before (V2.5.3 trendOf: sums for counts; `level` compares two values). */
export function deltaOf(vals: number[], good: 'up' | 'down' | 'none', label: string, { span = 4, level = false }: { span?: number; level?: boolean } = {}): Delta {
  if (level) return { value: (vals[vals.length - 1] ?? 0) - (vals[vals.length - 1 - span] ?? 0), good, label };
  const a = vals.slice(-span).reduce((s, v) => s + v, 0); const b = vals.slice(-2 * span, -span).reduce((s, v) => s + v, 0);
  return { value: a - b, good, label };
}
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The board: lanes of cards, each lane with its count; an empty lane says so. */
export function Lanes({ lanes, label }: { lanes: Array<{ key: string; title: string; items: ReactNode[] }>; label: string }) {
  return <div className="wk-lanes" role="group" aria-label={label} data-testid="board">{lanes.map((l) => <section key={l.key} className="wk-lane" aria-label={`${l.title}: ${l.items.length}`}><header><h3>{l.title}</h3><b>{l.items.length}</b></header>{l.items.length ? l.items : <p className="wk-lane__none">Nothing here.</p>}</section>)}</div>;
}
/** Label over value, compact. */
export function Mini({ items }: { items: Array<[string, ReactNode]> }) { return <dl className="wk-mini">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>; }
/** A stacked horizontal bar (parts of one whole) drawn in SVG; the words travel in the label. */
export function Stack({ parts, label, total }: { parts: Array<{ key: string; label: string; value: number; tone: Series }>; label: string; total?: number }) {
  const sum = total ?? parts.reduce((a, p) => a + p.value, 0); let at = 0;
  return <svg className="wk-stack" viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label={`${label}: ${parts.map((p) => `${p.label} ${p.value}`).join(', ')}`} focusable="false">
    <rect className="wk-stack__t" x="0" y="0" width="100" height="10" rx="2" />
    {parts.filter((p) => p.value > 0).map((p) => { const w = sum ? (p.value / sum) * 100 : 0; const r = <rect key={p.key} className={`wk-stack__p kit-s--${p.tone}`} x={at.toFixed(2)} y="0" width={Math.max(0, w - 0.4).toFixed(2)} height="10" />; at += w; return r; })}
  </svg>;
}
export function Foot({ children }: { children: ReactNode }) { return <p className="wk-foot">{children}</p>; }
