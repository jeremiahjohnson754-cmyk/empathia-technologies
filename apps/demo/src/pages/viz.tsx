/**
 * The workspaces' visual pieces — hero, metric tiles with sparklines, donut with legend, zones, progress, score ring, the board — in the
 * composition V2.5.3 used (kpiTile / spark / donut / p8Zone), rebuilt as components. Every value a caller passes is computed from the
 * demonstration's records; nothing here invents a number. The trend arithmetic is V2.5.3's (trendOf: last span vs the span before, an
 * absolute difference when the base is under five). When the shell's component kit (@empathia/ui) carries a piece, the page uses that.
 */
import type { ReactNode } from 'react';

export type VTone = 'teal' | 'info' | 'ok' | 'warn' | 'bad' | 'mute' | 'learn' | 'pro' | 'apex' | 'field' | 'cx' | 'lite' | 'mc' | 'sh' | 'sp';
const DAY = 864e5;

// ------------------------------------------------------------------------------------------------------------ series from records
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
export interface Trend { dir: 'up' | 'down' | 'flat'; text: string }
export function trendOf(vals: number[], span = 4): Trend {
  const a = vals.slice(-span).reduce((s, v) => s + v, 0); const b = vals.slice(-2 * span, -span).reduce((s, v) => s + v, 0);
  const dir = a > b ? 'up' : a < b ? 'down' : 'flat';
  if (b < 5) return { dir, text: `${a > b ? '+' : a < b ? '−' : ''}${Math.abs(a - b)}` };
  return { dir, text: `${Math.abs(Math.round(((a - b) / b) * 100))}%` };
}
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ------------------------------------------------------------------------------------------------------------ icons (one stroke set)
const PATHS: Record<string, string> = {
  ops: 'M4 13h4l2-6 4 12 2-6h4', standard: 'M6 4h9l3 3v13H6zM9 11h6M9 15h6', commission: 'M5 12l4 4 10-10M5 20h14', project: 'M4 7h16v12H4zM9 7V4h6v3',
  learn: 'M3 9l9-5 9 5-9 5zM7 11v5c3 2 7 2 10 0v-5', field: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 9a3 3 0 110 6 3 3 0 010-6', search: 'M11 4a7 7 0 110 14 7 7 0 010-14zM20 20l-4-4',
  money: 'M12 3v18M16 7H10a3 3 0 000 6h4a3 3 0 010 6H7', clock: 'M12 4a8 8 0 110 16 8 8 0 010-16zM12 8v4l3 2', shield: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z',
  room: 'M4 20V6l8-3 8 3v14M9 20v-5h6v5', alert: 'M12 4l9 16H3zM12 10v4M12 17v.5', check: 'M5 12l4 4 10-10', people: 'M8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 100-6M18 15c2 1 4 2 4 5',
  play: 'M7 5l12 7-12 7z', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', scope: 'M12 4a8 8 0 110 16 8 8 0 010-16zM12 2v4M12 18v4M2 12h4M18 12h4', plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14M13 6l6 6-6 6',
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg className="wk-ic" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={PATHS[name] || PATHS.ops} /></svg>;
}

// ------------------------------------------------------------------------------------------------------------ hero
export function Hero({ product, kicker, title, lead, actions, aside, children, testId }: { product: string; kicker: string; title: string; lead?: ReactNode; actions?: ReactNode; aside?: ReactNode; children?: ReactNode; testId?: string }) {
  return (
    <header className="wk-hero ops__head" data-product={product} data-testid={testId}>
      <div className="wk-hero__main ops__title">
        <p className="kicker">{kicker}</p>
        <h1 tabIndex={-1}>{title}</h1>
        {lead ? <p className="wk-hero__lead">{lead}</p> : null}
        {children}
      </div>
      {aside ? <div className="wk-hero__aside">{aside}</div> : null}
      {actions ? <div className="wk-hero__acts ops__actions">{actions}</div> : null}
    </header>
  );
}

// ------------------------------------------------------------------------------------------------------------ sparkline and metric tile
export function Spark({ vals, tone, label }: { vals: number[]; tone?: VTone; label: string }) {
  const v = vals.length ? vals : [0]; const W = 120, H = 34, p = 3; const max = Math.max(1, ...v), min = Math.min(0, ...v);
  const sx = (i: number) => p + (i * (W - 2 * p)) / Math.max(1, v.length - 1); const sy = (x: number) => H - p - ((x - min) / Math.max(1, max - min)) * (H - 2 * p);
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(x).toFixed(1)}`).join(''); const last = v.length - 1;
  return <svg className={`wk-spk wk-t--${tone || 'teal'}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}><path className="ar" d={`${d}L${sx(last).toFixed(1)} ${H}L${sx(0).toFixed(1)} ${H}Z`} /><path className="ln" d={d} /><circle cx={sx(last).toFixed(1)} cy={sy(v[last]!).toFixed(1)} r="2.6" /></svg>;
}
export interface TileProps { label: string; value: ReactNode; unit?: string; icon?: string; tone?: VTone; note?: ReactNode; href?: string; testId?: string;
  trend?: { vals: number[]; good?: 'up' | 'down'; span?: number; vs?: string; per?: string } }
export function Tile({ label, value, unit, icon, tone = 'teal', note, href, trend, testId }: TileProps) {
  const t = trend ? trendOf(trend.vals, trend.span || 4) : null;
  const good = t && t.dir !== 'flat' ? (t.dir === (trend!.good || 'down') ? 'good' : 'bad') : 'flat';
  const inner = (<>
    <span className="wk-kt__top"><span className={`wk-kt__i wk-t--${tone}`}><Icon name={icon || 'ops'} /></span><span className="wk-kt__l">{label}</span></span>
    <span className="wk-kt__v">{value}{unit ? <small>{unit}</small> : null}</span>
    {t ? <span className="wk-kt__b"><span className={`wk-kt__d ${good}`}><span aria-hidden="true">{t.dir === 'up' ? '▲' : t.dir === 'down' ? '▼' : '■'}</span> {t.dir === 'flat' ? 'Level' : t.text} <i>{trend!.vs || 'vs the 4 weeks before'}</i></span>
      <Spark vals={trend!.vals} tone={tone} label={`${label}, ${trend!.per || 'by week'}: ${trend!.vals.join(', ')}`} /></span> : null}
    {note ? <span className="wk-kt__n">{note}</span> : null}
  </>);
  return href ? <a className="wk-kt wk-kt--link" href={href} data-testid={testId}>{inner}</a> : <div className="wk-kt" data-testid={testId}>{inner}</div>;
}
export function Tiles({ children, label = 'Key measures', cols }: { children: ReactNode; label?: string; cols?: number }) {
  return <section className="wk-kts" aria-label={label} data-cols={cols} data-testid="tiles">{children}</section>;
}

// ------------------------------------------------------------------------------------------------------------ donut with legend
export interface Seg { label: string; value: number; tone: VTone; href?: string; title?: string }
export function Donut({ segs, label, center, centerLabel = 'Total', onPick, picked }: { segs: Seg[]; label: string; center?: ReactNode; centerLabel?: string; onPick?: (s: Seg) => void; picked?: string | null }) {
  const s = segs.filter((x) => x.value > 0); const tot = s.reduce((a, x) => a + x.value, 0); const R = 44, C = 2 * Math.PI * R; let off = 0; const gap = s.length > 1 ? 2.2 : 0;
  const arcs = s.map((x) => { const len = (x.value / Math.max(1, tot)) * C; const L = Math.max(0.01, len - gap); const el = <circle key={x.label} className={`wk-dn__a wk-t--${x.tone}`} cx="60" cy="60" r={R} strokeDasharray={`${L.toFixed(2)} ${(C - L).toFixed(2)}`} strokeDashoffset={(-off).toFixed(2)}><title>{`${x.label}: ${x.value}`}</title></circle>; off += len; return el; });
  return (
    <div className="wk-dn" data-testid="donut">
      <svg className="wk-dn__s" viewBox="0 0 120 120" role="img" aria-label={`${label}: ${segs.map((x) => `${x.label} ${x.value}`).join(', ')}`}>
        <circle className="wk-dn__t" cx="60" cy="60" r={R} /><g transform="rotate(-90 60 60)">{arcs}</g>
        <text x="60" y="58" textAnchor="middle" className="wk-dn__v">{center ?? tot}</text><text x="60" y="74" textAnchor="middle" className="wk-dn__l">{centerLabel}</text>
      </svg>
      <div className="wk-dn__g">{segs.map((x) => {
        const body = <><i className={`wk-dn__k wk-t--${x.tone}`} aria-hidden="true" /><span>{x.label}</span><b>{x.value}</b><em>{pct(x.value, tot)}%</em></>;
        if (onPick) return <button key={x.label} type="button" className={`wk-dn__r${picked === x.label ? ' on' : ''}`} aria-pressed={picked === x.label} onClick={() => onPick(x)}>{body}</button>;
        return x.href ? <a key={x.label} className="wk-dn__r" href={x.href}>{body}</a> : <div key={x.label} className="wk-dn__r">{body}</div>;
      })}</div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------------------ zone, progress, ring, chips, board
export function Zone({ title, sub, more, children, id, cls, testId }: { title: string; sub?: ReactNode; more?: ReactNode; children?: ReactNode; id?: string; cls?: string; testId?: string }) {
  const hid = id ? `${id}-h` : undefined;
  return <section className={`wk-z${cls ? ` ${cls}` : ''}`} aria-labelledby={hid} id={id} data-testid={testId}><header className="wk-z__h"><div><h2 id={hid}>{title}</h2>{sub ? <p className="wk-z__s">{sub}</p> : null}</div>{more ? <div className="wk-z__m">{more}</div> : null}</header>{children}</section>;
}
export function Bar({ value, max, tone = 'teal', label, show = true }: { value: number; max: number; tone?: VTone; label: string; show?: boolean }) {
  const p = pct(value, max);
  return <span className="wk-bar" role="img" aria-label={`${label}: ${value} of ${max} (${p}%)`}><span className="wk-bar__t"><span className={`wk-bar__f wk-t--${tone}`} style={{ width: `${Math.min(100, p)}%` }} /></span>{show ? <span className="wk-bar__n">{p}%</span> : null}</span>;
}
export function Ring({ value, max = 100, label, tone, size = 92, sub }: { value: number | null; max?: number; label: string; tone?: VTone; size?: number; sub?: string }) {
  const R = 40, C = 2 * Math.PI * R; const p = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  const tn = tone || (value === null ? 'mute' : p >= 0.85 ? 'ok' : p >= 0.6 ? 'warn' : 'bad');
  return <svg className={`wk-ring wk-t--${tn}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label}: ${value === null ? 'not measurable' : `${value} of ${max}`}`}>
    <circle className="wk-ring__t" cx="50" cy="50" r={R} /><circle className="wk-ring__a" cx="50" cy="50" r={R} strokeDasharray={`${(p * C).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 50 50)" />
    <text x="50" y={sub ? 50 : 56} textAnchor="middle" className="wk-ring__v">{value === null ? '—' : value}</text>{sub ? <text x="50" y="66" textAnchor="middle" className="wk-ring__l">{sub}</text> : null}</svg>;
}
export function Chip({ tone = 'mute', children, dot }: { tone?: VTone; children: ReactNode; dot?: boolean }) { return <span className={`wk-chip wk-t--${tone}`}>{dot ? <i className="wk-dot" aria-hidden="true" /> : null}{children}</span>; }
export function Lanes({ lanes, label }: { lanes: Array<{ key: string; title: string; items: ReactNode[] }>; label: string }) {
  return <div className="wk-lanes" role="list" aria-label={label} data-testid="board">{lanes.map((l) => <section key={l.key} className="wk-lane" role="listitem" aria-label={`${l.title}: ${l.items.length}`}><header><h3>{l.title}</h3><b>{l.items.length}</b></header>{l.items.length ? l.items : <p className="wk-lane__none">Nothing here.</p>}</section>)}</div>;
}
/** A row of definition pairs as compact stat chips (label over value). */
export function Mini({ items }: { items: Array<[string, ReactNode]> }) { return <dl className="wk-mini">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>; }
export function Foot({ children }: { children: ReactNode }) { return <p className="wk-foot">{children}</p>; }
