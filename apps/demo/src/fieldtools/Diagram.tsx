/**
 * The live drawing beside a calculation: it redraws as the inputs change, to scale where the quantity has a scale (a screen, a throw,
 * a bridle, a speaker grid, a level against distance). Drawn from the same inputs as the numbers; it says nothing the numbers do not.
 * Colours come from the theme's tokens (fieldtools.css), so it reads in both themes. Tools without a drawing show none.
 */
import type { ReactNode } from 'react';
import type { Value } from './calc.js';
import { aspect, AWG } from './calc.js';

const n = (v: Value | undefined, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d; };
const W = 360, H = 200;
type V = Record<string, Value>;

function Svg({ title, children }: { title: string; children: ReactNode }) {
  return <svg className="ft-d" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} data-testid="ft-diagram"><title>{title}</title>{children}</svg>;
}

function screen(v: V) {
  const [aw, ah] = aspect(v.aspect); const k = Math.min(300 / aw, 150 / ah); const w = aw * k, h = ah * k; const x = (W - w) / 2, y = (H - h) / 2;
  return <Svg title={`A ${aw}:${ah} image with its diagonal`}>
    <rect className="ft-d__fill" x={x} y={y} width={w} height={h} rx="3" /><line className="ft-d__accent" x1={x} y1={y + h} x2={x + w} y2={y} />
    <text className="ft-d__label" x={x + w / 2} y={y - 6} textAnchor="middle">width {aw}</text><text className="ft-d__label" x={x + w + 6} y={y + h / 2} dominantBaseline="middle">{ah}</text>
    <text className="ft-d__label ft-d__label--accent" x={x + w / 2 + 8} y={y + h / 2 - 6}>{n(v.diag) ? `${n(v.diag)}″` : 'diagonal'}</text>
  </Svg>;
}

function viewing(v: V) {
  // side view: the image height H at the left wall, viewers at 2H and the farthest at kH, all to one scale
  const [aw, ah] = aspect(v.aspect); const Hin = n(v.diag) * ah / Math.hypot(aw, ah); const far = v.k ? n(v.k, 6) : 6; const span = (far + 0.6) * Hin; const s = 320 / span;
  const x0 = 20, base = 170, h = Hin * s; const mark = (m: number, cls: string, label: string) => <g key={label}><line className={cls} x1={x0 + m * Hin * s} y1={base} x2={x0 + m * Hin * s} y2={base - 26} /><circle className={cls === 'ft-d__accent' ? 'ft-d__dot--accent' : 'ft-d__dot'} cx={x0 + m * Hin * s} cy={base - 30} r="5" /><text className="ft-d__label" x={x0 + m * Hin * s} y={base + 16} textAnchor="middle">{label}</text></g>;
  return <Svg title="Image height and viewer distances, to scale">
    <line className="ft-d__line" x1={x0} y1={base} x2={W - 10} y2={base} /><rect className="ft-d__fill" x={x0 - 4} y={base - 60 - h} width="6" height={h} />
    <text className="ft-d__label" x={x0 + 8} y={base - 60 - h / 2} dominantBaseline="middle">H</text>
    {mark(2, 'ft-d__line', '2H')}{[4, 6, 8].filter((m) => m <= far).map((m) => mark(m, m === far ? 'ft-d__accent' : 'ft-d__line', `${m}H`))}
  </Svg>;
}

function throwDiagram(v: V) {
  const w = n(v.w), a = n(v.tmin) * w, b = n(v.tmax) * w; const span = Math.max(a, b, 1) * 1.08; const s = 300 / span; const sx = 340, half = Math.min(80, (w * s) / 2);
  return <Svg title="Projector positions for the shortest and longest throw">
    <line className="ft-d__line" x1={sx} y1={100 - half} x2={sx} y2={100 + half} strokeWidth="4" />
    {[[a, 'wide'], [b, 'tele']].map(([d, l], i) => { const px = sx - (d as number) * s; return <g key={l as string}>
      <polygon className={i ? 'ft-d__cone' : 'ft-d__cone ft-d__cone--b'} points={`${px},100 ${sx},${100 - half} ${sx},${100 + half}`} />
      <rect className={i ? 'ft-d__dot' : 'ft-d__dot--accent'} x={px - 9} y={93} width="18" height="14" rx="3" />
      <text className="ft-d__label" x={px} y={i ? 128 : 80} textAnchor="middle">{l as string}</text></g>; })}
    <text className="ft-d__label" x={sx - 4} y={100 - half - 6} textAnchor="end">screen</text>
  </Svg>;
}

function bridle(v: V) {
  const S = n(v.span), a = n(v.l1), b = n(v.l2); if (a + b <= S || Math.abs(a - b) >= S || S <= 0) return <Svg title="The legs cannot meet"><text className="ft-d__label" x={W / 2} y={H / 2} textAnchor="middle">The legs cannot meet at this span.</text></Svg>;
  const x = (a * a - b * b + S * S) / (2 * S); const h = Math.sqrt(Math.max(0, a * a - x * x)); const s = Math.min(220 / S, 130 / Math.max(h, 0.1)); const ox = (W - S * s) / 2, oy = 28;
  const ax = ox + x * s, ay = oy + h * s; const th1 = Math.atan2(x, h), th2 = Math.atan2(S - x, h); const inc = (th1 + th2) * 180 / Math.PI;
  return <Svg title={`Two-leg bridle, included angle ${inc.toFixed(0)} degrees`}>
    <line className="ft-d__line" x1={ox - 10} y1={oy} x2={ox + S * s + 10} y2={oy} strokeWidth="6" />
    <line className={inc > 120 ? 'ft-d__bad' : inc > 90 ? 'ft-d__warn' : 'ft-d__accent'} x1={ox} y1={oy} x2={ax} y2={ay} strokeWidth="3" /><line className={inc > 120 ? 'ft-d__bad' : inc > 90 ? 'ft-d__warn' : 'ft-d__accent'} x1={ox + S * s} y1={oy} x2={ax} y2={ay} strokeWidth="3" />
    <line className="ft-d__line" x1={ax} y1={ay} x2={ax} y2={Math.min(H - 12, ay + 26)} /><rect className="ft-d__fill" x={ax - 12} y={Math.min(H - 12, ay + 26) - 2} width="24" height="12" />
    <text className="ft-d__label ft-d__label--accent" x={ax + 10} y={ay + 4}>{inc.toFixed(0)}° included</text>
    <text className="ft-d__label" x={ox} y={oy - 8}>beam 1</text><text className="ft-d__label" x={ox + S * s} y={oy - 8} textAnchor="end">beam 2</text>
    <text className="ft-d__label" x={(ox + ax) / 2 - 8} y={(oy + ay) / 2} textAnchor="end">leg 1</text><text className="ft-d__label" x={(ox + S * s + ax) / 2 + 8} y={(oy + ay) / 2}>leg 2</text>
  </Svg>;
}

function ceiling(v: V) {
  const h = n(v.ceil) - n(v.ear, 4); const D = 2 * h * Math.tan(n(v.ang) / 2 * Math.PI / 180); const lay = String(v.lay); const sp = lay === 'edge' ? D : lay === 'min' ? D / Math.SQRT2 : D / 2;
  const L = n(v.L), Wd = n(v.W); if (!(sp > 0 && L > 0 && Wd > 0)) return null; const s = Math.min(320 / L, 170 / Wd); const nx = Math.max(1, Math.ceil(L / sp)), ny = Math.max(1, Math.ceil(Wd / sp));
  const ox = (W - L * s) / 2, oy = (H - Wd * s) / 2; const gx = L / nx, gy = Wd / ny; const pts: [number, number][] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) pts.push([ox + (i + 0.5) * gx * s, oy + (j + 0.5) * gy * s]);
  return <Svg title={`Plan: ${nx * ny} ceiling speakers, coverage circles at ear height`}>
    <defs><clipPath id="ft-room"><rect x={ox} y={oy} width={L * s} height={Wd * s} /></clipPath></defs>
    <rect className="ft-d__fill" x={ox} y={oy} width={L * s} height={Wd * s} />
    <g clipPath="url(#ft-room)">{pts.map(([x, y], i) => <circle key={i} className="ft-d__cover" cx={x} cy={y} r={(D / 2) * s} />)}</g>
    {pts.map(([x, y], i) => <circle key={`s${i}`} className="ft-d__dot--accent" cx={x} cy={y} r="3.5" />)}
    <rect className="ft-d__line ft-d__nofill" x={ox} y={oy} width={L * s} height={Wd * s} />
  </Svg>;
}

function levelCurve(v: V, mode: 'spl' | 'inv') {
  const d1 = mode === 'inv' ? n(v.d1, 1) : 1; const l1 = mode === 'inv' ? n(v.l1) : n(v.sens) + 10 * Math.log10(Math.max(1e-9, n(v.p))); const dEnd = Math.max(mode === 'inv' ? n(v.d2) : n(v.d) * (v.u === 'ft' ? 0.3048 : 1), d1 * 2) * 1.2;
  const at = (d: number) => l1 - 20 * Math.log10(d / d1); const lo = at(dEnd) - 3, hi = l1 + 3; const X = (d: number) => 30 + (d - d1) / (dEnd - d1) * 310, Y = (l: number) => 20 + (hi - l) / (hi - lo) * 150;
  const path = Array.from({ length: 60 }, (_, i) => { const d = d1 + (dEnd - d1) * i / 59; return `${i ? 'L' : 'M'}${X(d).toFixed(1)},${Y(at(d)).toFixed(1)}`; }).join(' ');
  const target = mode === 'inv' ? n(v.d2) : n(v.d) * (v.u === 'ft' ? 0.3048 : 1);
  return <Svg title="Level against distance: 6 dB lost per doubling">
    <line className="ft-d__line" x1="30" y1="170" x2="340" y2="170" /><line className="ft-d__line" x1="30" y1="20" x2="30" y2="170" />
    <path className="ft-d__accent ft-d__nofill" d={path} strokeWidth="2.5" />
    <circle className="ft-d__dot--accent" cx={X(target)} cy={Y(at(target))} r="5" /><text className="ft-d__label" x={X(target) - 6} y={Y(at(target)) - 10} textAnchor="end">{at(target).toFixed(1)} dB</text>
    <text className="ft-d__label" x="34" y="14">{l1.toFixed(0)} dB</text><text className="ft-d__label" x="340" y="188" textAnchor="end">distance</text>
  </Svg>;
}

function ledGrid(v: V) {
  const nx = Math.max(1, Math.round(n(v.nx))), ny = Math.max(1, Math.round(n(v.ny))); const cw = n(v.cw, 500), ch = n(v.ch, 500); const s = Math.min(320 / (nx * cw), 170 / (ny * ch)); const w = nx * cw * s, h = ny * ch * s; const ox = (W - w) / 2, oy = (H - h) / 2;
  if (nx * ny > 2500) return null;
  return <Svg title={`${nx} by ${ny} cabinets`}>{Array.from({ length: nx * ny }, (_, i) => <rect key={i} className={(i % nx + Math.floor(i / nx)) % 2 ? 'ft-d__fill' : 'ft-d__fill ft-d__fill--b'} x={ox + (i % nx) * cw * s} y={oy + Math.floor(i / nx) * ch * s} width={cw * s - 0.6} height={ch * s - 0.6} />)}
    <text className="ft-d__label" x={W / 2} y={Math.max(12, oy - 4)} textAnchor="middle">{nx} × {ny} cabinets</text></Svg>;
}

function bars(title: string, items: { label: string; value: number; cls?: string }[], limit: number, limitLabel: string) {
  const max = Math.max(limit, ...items.map((i) => i.value), 1e-9) * 1.1; const X = (x: number) => 20 + x / max * 320; let acc = 0;
  return <Svg title={title}>
    {items.map((it, i) => { const x0 = X(acc); acc += it.value; return <rect key={i} className={it.cls || (i % 2 ? 'ft-d__fill ft-d__fill--b' : 'ft-d__fill')} x={x0} y="80" width={Math.max(0, X(acc) - x0 - 1)} height="40" />; })}
    <line className={acc > limit ? 'ft-d__bad' : 'ft-d__accent'} x1={X(limit)} y1="60" x2={X(limit)} y2="140" strokeWidth="2.5" /><text className="ft-d__label" x={X(limit)} y="54" textAnchor="middle">{limitLabel}</text>
    <text className="ft-d__label" x="20" y="150">{items.filter((i) => i.value > 0).map((i) => i.label).join(' · ')}</text>
  </Svg>;
}

export function Diagram({ tool, v }: { tool: string; v: V }) {
  switch (tool) {
    case 'screen-size': return screen(v);
    case 'viewing-distance': return viewing(v);
    case 'screen-for-room': { const [aw, ah] = aspect(v.aspect); const far = n(v.far) * (v.u === 'm' ? 1 / 0.0254 : 12); const hIn = far / n(v.k, 6); return viewing({ ...v, diag: hIn * Math.hypot(aw, ah) / ah }); }
    case 'throw-distance': return throwDiagram(v);
    case 'two-leg-bridle': return bridle(v);
    case 'ceiling-speakers': return ceiling(v);
    case 'spl-listener': return levelCurve(v, 'spl');
    case 'inverse-square': return levelCurve(v, 'inv');
    case 'led-wall': return ledGrid(v);
    case 'poe-budget': return bars('PoE allocated against the budget', [{ label: `class 3 ×${n(v.c3)}`, value: n(v.c3) * 15.4 }, { label: `class 4 ×${n(v.c4)}`, value: n(v.c4) * 30 }, { label: `class 6 ×${n(v.c6)}`, value: n(v.c6) * 60 }, { label: `class 8 ×${n(v.c8)}`, value: n(v.c8) * 90 }], n(v.budget), `budget ${n(v.budget)} W`);
    case 'fiber-budget': { const k = v.type === 'mm850' ? 3.5 : v.type === 'sm1310' ? 0.4 : 0.3; return bars('Fiber loss against the transceiver budget', [{ label: 'fiber', value: n(v.km) / 1000 * k }, { label: 'connectors', value: n(v.conn) * 0.75 }, { label: 'splices', value: n(v.splice) * 0.3 }], n(v.budget), `budget ${n(v.budget)} dB`); }
    case 'voltage-drop': { const g = AWG[String(v.g)] ?? AWG['12']!; const vd = (v.ph === '3' ? Math.sqrt(3) : 2) * 12.9 * n(v.I) * n(v.L) / g.cmil; const V0 = n(v.V, 120); return bars('Voltage drop against the 3 % and 5 % marks', [{ label: `${(vd / V0 * 100).toFixed(1)} % dropped`, value: vd / V0 * 100, cls: vd / V0 > 0.05 ? 'ft-d__fill--bad' : vd / V0 > 0.03 ? 'ft-d__fill--warn' : 'ft-d__fill' }], 3, '3 %'); }
    default: return null;
  }
}
