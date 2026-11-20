/**
 * The accurate 2D floor plan of a room (13 Nov 2026, founder: "switch between an isometric overview, an accurate 2D floor plan, and an
 * eye-level perspective"). Drawn to scale from the same program the 3D draws (./programs.ts), in metres: walls with their thickness,
 * glazing with its mullions, the door and its swing, every piece at its footprint and rotation (each chair of a group, each seat of a
 * row), ceiling-mounted equipment dashed, overall dimensions and a scale bar, the eye positions as markers, and — when equipment is
 * shown — the cable runs by kind. Every piece is a button. Modelled from the record; not a survey.
 */
import type { ReactNode } from 'react';
import type { Piece, Program, Side, EyeSpot } from './programs.js';

const TW = 0.14; const RAD = Math.PI / 180;
/** what a piece is in a plan's legend: furniture, equipment (a device on record or in the program), a fixture, or the room's fabric */
export const EQUIPMENT = new Set(['display', 'panel', 'camera', 'videobar', 'touch', 'ceildev', 'rackdev', 'wireless', 'unit', 'console', 'rack', 'monitor', 'ledwall', 'clock', 'intercom', 'codec', 'headset', 'speakerbox', 'wap', 'floorbox', 'iptv', 'fx-rack', 'fx-kiosk', 'rackpos', 'lipmic', 'speakerbox', 'chair-none']);
export const CEILING = new Set(['ceildev', 'wap', 'pendants']);
export const kindClass = (k: string) => (EQUIPMENT.has(k) ? 'eq' : k.startsWith('fx-') ? 'fx' : k === 'rug' || k === 'mark' || k === 'platform' || k === 'steps' || k === 'stage' ? 'floor' : 'fu');

export interface Foot { x: number; y: number; w: number; d: number; rot: number; shape: 'rect' | 'chair' | 'round' | 'sofa' }
/** every footprint a piece puts on the plan: one for most; each chair, stool or seat of a group */
export function footprints(p: Piece): Foot[] {
  const rot = p.rot || 0; const at = p.at || [];
  const face = (x: number, y: number, tx: number, ty: number) => (Math.atan2(tx - x, -(ty - y)) * 180) / Math.PI;
  switch (p.kind) {
    case 'stools': return at.map(([x, y]) => ({ x, y, w: 0.4, d: 0.4, rot, shape: 'round' }));
    case 'chairs': case 'taskchairs': return at.map(([x, y]) => ({ x, y, w: 0.47, d: 0.46, rot, shape: 'chair' }));
    case 'seats': { const n = p.n ?? 6, sp = n > 6 ? p.w / n : 0.62; return Array.from({ length: n }, (_, i) => ({ x: p.x + (i - (n - 1) / 2) * sp, y: p.y, w: 0.48, d: 0.5, rot: 0, shape: 'chair' as const })); }
    case 'seatblock': return at.map(([x, y]) => ({ x, y, w: 0.46, d: 0.46, rot, shape: 'chair' }));
    case 'hightable': return [{ x: p.x, y: p.y, w: p.w, d: p.d, rot: 0, shape: 'round' }, ...at.map(([x, y]) => ({ x, y, w: 0.4, d: 0.4, rot: face(x, y, p.x, p.y), shape: 'round' as const }))];
    case 'table': return [{ x: p.x, y: p.y, w: p.w, d: p.d, rot, shape: 'rect' }, ...at.map(([x, y]) => ({ x, y, w: 0.47, d: 0.46, rot: face(x, y, p.x, p.y), shape: 'chair' as const }))];
    case 'tables4': return at.flatMap(([x, y]) => [{ x, y, w: 0.9, d: 0.9, rot: 0, shape: 'round' as const }, ...([[0, -0.66, 180], [0, 0.66, 0], [-0.66, 0, -90], [0.66, 0, 90]] as const).map(([dx, dy, r]) => ({ x: x + dx, y: y + dy, w: 0.46, d: 0.46, rot: r, shape: 'chair' as const }))]);
    case 'deskrun': return [{ x: p.x, y: p.y, w: p.w, d: p.d, rot: 0, shape: 'rect' }, ...at.map(([x, y]) => ({ x, y, w: 0.48, d: 0.46, rot: 0, shape: 'chair' as const }))];
    case 'pod': return [{ x: p.x, y: p.y, w: p.w, d: p.d, rot: 0, shape: 'rect' }, { x: p.x + 0.2, y: p.y, w: 1.8, d: 0.9, rot: 0, shape: 'rect' }];
    case 'sofa': case 'armchair': case 'fx-sofa': return [{ x: p.x, y: p.y, w: p.w, d: p.d, rot, shape: 'sofa' }];
    case 'chair1': case 'fx-chair': return [{ x: p.x, y: p.y, w: 0.47, d: 0.46, rot, shape: 'chair' }];
    case 'plant': case 'wireless': case 'ceildev': return [{ x: p.x, y: p.y, w: Math.max(0.2, p.w), d: Math.max(0.2, p.d), rot: 0, shape: 'round' }];
    case 'island': return [{ x: p.x, y: p.y, w: p.w, d: p.d, rot: 0, shape: 'rect' }];
    default: return [{ x: p.x, y: p.y, w: Math.max(0.06, p.w), d: Math.max(0.06, p.d), rot, shape: 'rect' }];
  }
}
const corners = (f: Foot) => { const r = f.rot * RAD, c = Math.cos(r), s = Math.sin(r), hw = f.w / 2, hd = f.d / 2; return ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as const).map(([a, b]) => [f.x + a * c - b * s, f.y + a * s + b * c] as [number, number]); };
const pts = (q: Array<[number, number]>) => q.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
const m = (n: number) => `${(Math.round(n * 100) / 100).toFixed(2)} m`;

export interface Run { kind: 'network' | 'signal' | 'control' | 'power' | 'audio'; label: string; pts: Array<[number, number, number]> }
export const RUN_COLOUR: Record<Run['kind'], string> = { network: '#2aa79b', signal: '#d99a2b', control: '#8a6fd1', power: '#d4574b', audio: '#3d8ad6' };

function foot(f: Foot, cls: string, key: string): ReactNode {
  const q = corners(f);
  if (f.shape === 'round') return <ellipse key={key} className={`pl-${cls}`} cx={f.x} cy={f.y} rx={f.w / 2} ry={f.d / 2} />;
  if (f.shape === 'chair') { const r = f.rot * RAD, c = Math.cos(r), s = Math.sin(r); const b = (a: number, bb: number) => [f.x + a * c - bb * s, f.y + a * s + bb * c] as [number, number];
    return <g key={key}><polygon className={`pl-${cls}`} points={pts(q)} /><polyline className="pl-back" points={pts([b(-f.w / 2, f.d / 2 - 0.06), b(f.w / 2, f.d / 2 - 0.06)])} /></g>; }
  if (f.shape === 'sofa') { const r = f.rot * RAD, c = Math.cos(r), s = Math.sin(r); const b = (a: number, bb: number) => [f.x + a * c - bb * s, f.y + a * s + bb * c] as [number, number];
    return <g key={key}><polygon className={`pl-${cls}`} points={pts(q)} /><polygon className="pl-band" points={pts([b(-f.w / 2, f.d / 2 - 0.22), b(f.w / 2, f.d / 2 - 0.22), b(f.w / 2, f.d / 2), b(-f.w / 2, f.d / 2)])} /></g>; }
  return <polygon key={key} className={`pl-${cls}`} points={pts(q)} />;
}

export function PlanView({ P, sel, onSel, names, eyes, onEye, runs, label }: { P: Program; sel: string | null; onSel: (id: string) => void; names: boolean; eyes: EyeSpot[]; onEye?: (k: string) => void; runs?: Run[] | null; label: string }) {
  const out = P.pieces.some((p) => p.y < 0) ? Math.min(...P.pieces.map((p) => p.y - p.d)) - 0.6 : -0.4;
  const x0 = -1.0, x1 = P.w + 0.5, y0 = out - 0.3, y1 = P.d + 1.1; const span = Math.max(x1 - x0, y1 - y0); const fs = Math.max(0.12, Math.min(0.32, span / 55));
  const wall = (s: Side) => { const spec = P.walls[s]; if (spec.none) return null; const along = s === 'N' || s === 'S'; const len = along ? P.w + 2 * TW : P.d + 2 * TW; const a0 = -TW;
    const pos = s === 'N' ? -TW : s === 'S' ? P.d : s === 'W' ? -TW : P.w; const gap: [number, number] | null = spec.door ? [spec.door.at - spec.door.w / 2, spec.door.at + spec.door.w / 2] : spec.slide ? [spec.slide.at - spec.slide.w / 2, spec.slide.at + spec.slide.w / 2] : null;
    const seg = (u0: number, u1: number, k: string, cls: string) => (u1 - u0 > 0.005 ? <rect key={k} className={cls} x={along ? u0 : pos} y={along ? pos : u0} width={along ? u1 - u0 : TW} height={along ? TW : u1 - u0} /> : null);
    const cls = spec.glass ? 'pl-glass' : spec.parapet ? 'pl-low' : 'pl-wall'; const parts: ReactNode[] = [];
    if (gap && !spec.glass) { parts.push(seg(a0, gap[0], `${s}a`, cls), seg(gap[1], a0 + len, `${s}b`, cls)); } else parts.push(seg(a0, a0 + len, `${s}a`, cls));
    if (spec.glass) { const nb = Math.max(2, Math.round((along ? P.w : P.d) / 1.25)); for (let i = 0; i <= nb; i++) { const u = ((along ? P.w : P.d) * i) / nb; parts.push(<rect key={`${s}m${i}`} className="pl-mullion" x={along ? u - 0.025 : pos} y={along ? pos : u - 0.025} width={along ? 0.05 : TW} height={along ? TW : 0.05} />); } }
    if (spec.door) { const d = spec.door; const hinge = d.hinge === 'hi' ? d.at + d.w / 2 : d.at - d.w / 2; const inward = s === 'S' || s === 'E' ? -1 : 1; const base = s === 'N' ? 0 : s === 'S' ? P.d : s === 'W' ? 0 : P.w; const r = d.w - 0.04;
      const pt = (u: number, n: number) => (along ? [u, base + inward * n] : [base + inward * n, u]) as [number, number]; const sgn = d.hinge === 'hi' ? -1 : 1;
      const arc = Array.from({ length: 13 }, (_, i) => { const t = (i / 12) * (Math.PI / 2); return pt(hinge + sgn * Math.cos(t) * r, Math.sin(t) * r); });
      parts.push(<polyline key={`${s}leaf`} className="pl-leaf" points={pts([pt(hinge, 0), pt(hinge, r)])} />, <polyline key={`${s}arc`} className="pl-swing" points={pts(arc)} />); }
    if (spec.slide) parts.push(<rect key={`${s}sl`} className="pl-slide" x={along ? spec.slide.at - spec.slide.w / 2 : pos} y={along ? pos + TW * 0.35 : spec.slide.at - spec.slide.w / 2} width={along ? spec.slide.w : TW * 0.3} height={along ? TW * 0.3 : spec.slide.w} />);
    return <g key={s} data-wall={s}>{parts}</g>; };
  const floorCls = `pl-floor pl-floor--${P.floor}`;
  return <svg className="pl-svg" viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} role="img" aria-label={label} data-testid="rm-plan" data-pieces={P.pieces.length} preserveAspectRatio="xMidYMid meet" style={{ ['--fs' as string]: `${fs}px` }}>
    <rect className={floorCls} x={0} y={0} width={P.w} height={P.d} />
    {P.pieces.some((p) => p.y < 0) ? <rect className="pl-out" x={-0.3} y={out + 0.3} width={P.w + 0.6} height={-out - 0.3} /> : null}
    {(['N', 'E', 'S', 'W'] as Side[]).map(wall)}
    {[...P.pieces].sort((a, b) => (kindClass(a.kind) === 'floor' ? -1 : 0) - (kindClass(b.kind) === 'floor' ? -1 : 0) || b.w * b.d - a.w * a.d).map((p) => {
      const cls = kindClass(p.kind); const fl = footprints(p); const ceil = CEILING.has(p.kind) || (p.z || 0) > 2.2; const on = sel === p.id;
      return <g key={p.id} className={`pl-piece${on ? ' on' : ''}${ceil ? ' pl-ceil' : ''}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${p.label}. Shows what it is.`} data-o={p.id} data-testid={`pl-piece-${p.id}`}
        onClick={() => onSel(p.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSel(p.id); } }}>
        {fl.map((f, i) => foot(f, cls, `${p.id}-${i}`))}
        {names || on ? <text className="pl-name" x={p.x} y={p.y - Math.max(p.d / 2, 0.2) - fs * 0.4} textAnchor="middle" fontSize={fs}>{p.label.replace(/ \(\d+\)$/, '')}</text> : null}
      </g>; })}
    {(runs || []).map((r, i) => <polyline key={`run${i}`} className="pl-run" points={pts(r.pts.map(([x, y]) => [x, y]))} stroke={RUN_COLOUR[r.kind]} data-kind={r.kind}><title>{r.label}</title></polyline>)}
    {P.speakers.map(([x, y], i) => <circle key={`spk${i}`} className="pl-ceil-spk" cx={x} cy={y} r={0.11}><title>Ceiling loudspeaker</title></circle>)}
    {eyes.map((e) => { const r = e.yaw * RAD; const gx = -Math.sin(r), gy = -Math.cos(r); return <g key={e.key} className="pl-eye" role="button" tabIndex={0} aria-label={`See the room from ${e.label.toLowerCase()}`} data-testid={`pl-eye-${e.key}`} onClick={() => onEye?.(e.key)} onKeyDown={(ev) => { if (ev.key === 'Enter') onEye?.(e.key); }}>
      <circle cx={e.x} cy={e.y} r={0.17} /><polyline points={pts([[e.x + gx * 0.17, e.y + gy * 0.17], [e.x + gx * 0.45, e.y + gy * 0.45]])} /></g>; })}
    {/* overall dimensions and a scale bar */}
    <g className="pl-dim" fontSize={fs}><line x1={0} y1={P.d + 0.55} x2={P.w} y2={P.d + 0.55} /><line x1={0} y1={P.d + 0.45} x2={0} y2={P.d + 0.65} /><line x1={P.w} y1={P.d + 0.45} x2={P.w} y2={P.d + 0.65} />
      <text x={P.w / 2} y={P.d + 0.5} textAnchor="middle" data-testid="pl-width">{m(P.w)}</text>
      <line x1={-0.6} y1={0} x2={-0.6} y2={P.d} /><line x1={-0.7} y1={0} x2={-0.5} y2={0} /><line x1={-0.7} y1={P.d} x2={-0.5} y2={P.d} />
      <text x={-0.66} y={P.d / 2} textAnchor="middle" transform={`rotate(-90 ${-0.66} ${P.d / 2})`} data-testid="pl-depth">{m(P.d)}</text>
      <g transform={`translate(${P.w - Math.min(2, P.w / 3)} ${P.d + 0.95})`}><rect className="pl-bar" x={0} y={-0.05} width={Math.min(2, P.w / 3) / 2} height={0.1} /><rect className="pl-bar2" x={Math.min(2, P.w / 3) / 2} y={-0.05} width={Math.min(2, P.w / 3) / 2} height={0.1} />
        <text x={Math.min(2, P.w / 3) / 2} y={-0.12} textAnchor="middle">{m(Math.min(2, P.w / 3))}</text></g></g>
  </svg>;
}
