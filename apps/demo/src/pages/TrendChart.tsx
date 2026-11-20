/**
 * A trend chart for the analytics pages: one y axis, thin lines (or bars), a legend for two or more series, direct labels on the last
 * point, a hover crosshair with the values of the month under the pointer, and the same numbers as a table for screen readers and for
 * anyone who prefers them. Colours come from the theme tokens (both themes); a gap in a series (no data) is drawn as a gap, never as 0.
 */
import { useId, useMemo, useState } from 'react';

export interface TrendSeries { name: string; values: Array<number | null>; tone: 'accent' | 'ok' | 'warn' | 'bad' | 'info' | 'violet' | 'indigo' | 'muted'; dashed?: boolean }
const COLOR: Record<TrendSeries['tone'], string> = { accent: 'var(--accent)', ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)', info: 'var(--info)', violet: 'var(--violet)', indigo: 'var(--indigo)', muted: 'var(--tx3)' };

export function TrendChart({ labels, series, unit = '', title, kind = 'line', max, height = 220, band, testId, onPick }: {
  labels: string[]; series: TrendSeries[]; unit?: string; title: string; kind?: 'line' | 'bar'; max?: number; height?: number;
  /** a horizontal reference band (e.g. an SLA target) */ band?: { at: number; label: string }; testId?: string; onPick?: (i: number) => void;
}) {
  const id = useId(); const [hover, setHover] = useState<number | null>(null);
  const W = 720; const Hh = height; const L = 44; const R = 92; const T = 14; const B = 30;
  const top = useMemo(() => { const vals = series.flatMap((s) => s.values.filter((v): v is number => v !== null)); const m = Math.max(max ?? 0, band?.at ?? 0, ...vals, 1); const step = niceStep(m / 4); return Math.ceil(m / step) * step; }, [series, max, band]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f * 100) / 100);
  const x = (i: number) => L + (labels.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (labels.length - 1));
  const y = (v: number) => T + (Hh - T - B) * (1 - v / top);
  const fmt = (v: number | null) => (v === null ? '—' : `${Math.round(v * 10) / 10}${unit}`);
  const bw = Math.max(4, ((W - L - R) / Math.max(1, labels.length)) / (series.length + 1));
  const move = (e: { clientX: number; currentTarget: SVGSVGElement }) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; let best = 0; let d = Infinity; labels.forEach((_, i) => { const dd = Math.abs(x(i) - px); if (dd < d) { d = dd; best = i; } }); setHover(best); };
  return (
    <figure className="tc" data-testid={testId}>
      <figcaption className="tc__title">{title}</figcaption>
      {series.length > 1 ? <ul className="tc__legend" aria-hidden="true">{series.map((s) => <li key={s.name}><span className="tc__swatch" style={{ background: COLOR[s.tone] }} data-dashed={s.dashed ? '' : undefined} />{s.name}</li>)}</ul> : null}
      <div className="tc__wrap">
        <svg viewBox={`0 0 ${W} ${Hh}`} className="tc__svg" role="img" aria-labelledby={`${id}-t`} onMouseMove={move} onMouseLeave={() => setHover(null)} onClick={() => hover !== null && onPick?.(hover)}>
          <title id={`${id}-t`}>{title}: {series.map((s) => `${s.name} ${labels.map((l, i) => `${l} ${fmt(s.values[i] ?? null)}`).join(', ')}`).join('; ')}</title>
          {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="tc__grid" /><text x={L - 6} y={y(t) + 4} className="tc__tick" textAnchor="end">{t}{unit}</text></g>)}
          {band ? <g><line x1={L} x2={W - R} y1={y(band.at)} y2={y(band.at)} className="tc__band" /><text x={L + 6} y={y(band.at) - 5} className="tc__tick">{band.label}</text></g> : null}
          {labels.map((l, i) => (labels.length <= 8 || i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1) ? <text key={l + i} x={x(i)} y={Hh - 8} className="tc__tick" textAnchor="middle">{l}</text> : null)}
          {kind === 'bar' ? series.map((s, k) => s.values.map((v, i) => v === null ? null : <rect key={`${k}-${i}`} x={x(i) - (bw * series.length) / 2 + k * bw + 1} y={y(v)} width={bw - 2} height={Math.max(0, y(0) - y(v))} rx={2} fill={COLOR[s.tone]} />))
            : series.map((s) => { const segs: string[] = []; let cur = ''; s.values.forEach((v, i) => { if (v === null) { if (cur) segs.push(cur); cur = ''; } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; }); if (cur) segs.push(cur);
              const last = s.values.reduce<number>((a, v, i) => (v === null ? a : i), -1);
              return <g key={s.name}>{segs.map((d, j) => <path key={j} d={d} fill="none" stroke={COLOR[s.tone]} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />)}
                {s.values.map((v, i) => v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 4.5 : 2.5} fill={COLOR[s.tone]} stroke="var(--bg)" strokeWidth={1.5} />)}
                {last >= 0 ? <text x={x(last) + 8} y={y(s.values[last]!) + 4} className="tc__end" fill={COLOR[s.tone]}>{fmt(s.values[last]!)}</text> : null}</g>; })}
          {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={T} y2={Hh - B} className="tc__cross" /> : null}
        </svg>
        {hover !== null ? <div className="tc__tip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status"><b>{labels[hover]}</b>{series.map((s) => <span key={s.name}><i style={{ background: COLOR[s.tone] }} />{s.name}: {fmt(s.values[hover] ?? null)}</span>)}{onPick ? <em>Click to drill in</em> : null}</div> : null}
      </div>
      <details className="tc__table"><summary>The numbers</summary><div className="tc__scroll"><table className="pa-table"><thead><tr><th scope="col">Period</th>{series.map((s) => <th key={s.name} scope="col">{s.name}</th>)}</tr></thead>
        <tbody>{labels.map((l, i) => <tr key={l + i}><th scope="row">{l}</th>{series.map((s) => <td key={s.name} className="num">{fmt(s.values[i] ?? null)}</td>)}</tr>)}</tbody></table></div></details>
    </figure>
  );
}
function niceStep(raw: number) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9)))); const f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
