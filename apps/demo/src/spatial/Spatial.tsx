/**
 * The spatial stages of the demonstration: the campus map, the room plan and the room's 3D (isometric) view. They are drawn as SVG in the
 * page — no external renderer, nothing fetched — and they stay dark in light mode (D36: `data-stage` takes the dark tokens).
 * Every device is a keyboard-reachable button with an accessible name; colour is never the only signal (each layer has a letter glyph).
 */
import { useState, type ReactNode } from 'react';
import { BUILDINGS, type Building } from '../campus/canon.js';
import { C, type Position, type Layer } from '../campus/design.js';
import type { Connection } from '@empathia/domain-types';

export const LAYER_COLOR: Record<Layer, string> = { display: 'var(--c-display)', video: 'var(--c-camera)', audio: 'var(--c-audio)', control: 'var(--c-control)', network: 'var(--c-network)', power: 'var(--c-speaker)', furniture: 'var(--c-furniture)' };
export const LAYER_GLYPH: Record<Layer, string> = { display: 'D', video: 'V', audio: 'A', control: 'C', network: 'N', power: 'P', furniture: '' };

export function Stage({ label, children, testId, toolbar }: { label: string; children: ReactNode; testId?: string; toolbar?: ReactNode }) {
  return (
    <figure className="stage" data-stage="" data-testid={testId} aria-label={label}>
      {toolbar && <div className="stage__bar">{toolbar}</div>}
      {children}
    </figure>
  );
}

const keyAct = (fn: () => void) => (e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

/**
 * The isometric campus: each building an extruded tile at its V2.5.3 footprint, one storey per floor, its top tinted by its health band
 * and a badge (glyph, name, score) above it. Hover or focus previews a building (onPreview); click or Enter opens it. The current
 * building (on a building page) is outlined. Colour is never alone: the badge carries a glyph and the number.
 */
export interface CampusTile { score: number | null; band: 'healthy' | 'monitor' | 'action' | 'none'; issues: number; rooms: number }
const BAND_GLYPH = { healthy: '●', monitor: '▲', action: '◆', none: '○' } as const;
export function CampusMap({ tiles, onOpen, onPreview, current }: { tiles: Record<string, CampusTile>; onOpen: (b: Building) => void; onPreview?: (b: Building | null) => void; current?: string }) {
  const [hot, setHot] = useState<string | null>(null);
  const peek = (b: Building | null) => { setHot(b?.key || null); onPreview?.(b); };
  const S = 62; const cos = Math.cos(Math.PI / 6), sin = Math.sin(Math.PI / 6); const FH = 0.34;
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * cos * S, ((x + y) * sin - z) * S];
  const pts = (a: Array<[number, number, number]>) => a.map(([x, y, z]) => P(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');
  const X0 = -0.4, Y0 = -0.4, X1 = 9.8, Y1 = 8.2;
  const minX = P(X0, Y1, 0)[0] - 20, maxX = P(X1, Y0, 0)[0] + 20, maxY = P(X1, Y1, 0)[1] + 20;
  const order = [...BUILDINGS].sort((a, b) => (a.map.x + a.map.w + a.map.y + a.map.d) - (b.map.x + b.map.w + b.map.y + b.map.d));
  const centre = (b: Building) => [b.map.x + b.map.w / 2, b.map.y + b.map.d / 2] as const;
  const hub = BUILDINGS.find((b) => b.key === 'ATL')!;
  // badges float above each roof; a later pass nudges any that would overlap upward, so a tall building never hides a neighbour's badge
  const badges = BUILDINGS.map((b) => { const t = tiles[b.key] || { score: null, band: 'none' as const, issues: 0, rooms: 0 }; const [ax, ay] = P(b.map.x + b.map.w / 2, b.map.y + b.map.d / 2, b.floors * FH); const w = 30 + `${b.short} ${t.score ?? '—'}`.length * 9.4; return { b, t, ax, ay, w, x: ax - w / 2, y: ay - 70 }; }).sort((a, b) => b.y - a.y);
  for (let i = 0; i < badges.length; i += 1) for (let j = 0; j < i; j += 1) { const A = badges[i]!, B = badges[j]!; if (A.x < B.x + B.w + 6 && B.x < A.x + A.w + 6 && A.y < B.y + 38 && B.y < A.y + 38) A.y = B.y - 40; }
  const topY = Math.min(...badges.map((g) => g.y)) - 12;
  return (
    <svg className="stage__svg iso3d" viewBox={`${minX.toFixed(0)} ${topY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - topY).toFixed(0)}`} role="group" aria-label={`Campus in 3D: ${BUILDINGS.length} buildings. Each opens with Enter.`} data-testid="campus-3d">
      <polygon points={pts([[X0, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [X0, Y1, 0]])} className="iso3d__ground" />
      {Array.from({ length: 11 }, (_, i) => <polyline key={`gx${i}`} points={pts([[X0 + i, Y0, 0], [X0 + i, Y1, 0]])} className="iso3d__grid" />)}
      {Array.from({ length: 10 }, (_, i) => <polyline key={`gy${i}`} points={pts([[X0, Y0 + i, 0], [X1, Y0 + i, 0]])} className="iso3d__grid" />)}
      {BUILDINGS.filter((b) => b !== hub).map((b) => { const [ax, ay] = centre(hub); const [bx, by] = centre(b); return <polyline key={`p${b.key}`} points={pts([[ax, ay, 0], [bx, by, 0]])} className="iso3d__path" />; })}
      {order.map((b) => {
        const t = tiles[b.key] || { score: null, band: 'none', issues: 0, rooms: 0 }; const { x, y, w, d } = b.map; const h = b.floors * FH;
        const label = `${b.name}: health ${t.score == null ? 'not scored' : `${t.score} of 100`}, ${t.rooms} rooms, ${t.issues} open issue${t.issues === 1 ? '' : 's'}, ${b.floors} floors`;
        return (
          <g key={b.key} className={`cb cb--${t.band}${current === b.key ? ' on' : ''}${hot === b.key ? ' hot' : ''}`} role="button" tabIndex={0} aria-label={label} aria-current={current === b.key ? 'true' : undefined} data-testid={`campus-b-${b.key}`}
            onClick={() => onOpen(b)} onKeyDown={keyAct(() => onOpen(b))} onMouseEnter={() => peek(b)} onMouseLeave={() => peek(null)} onFocus={() => peek(b)} onBlur={() => peek(null)}>
            <polygon points={pts([[x + 0.12, y + d + 0.12, 0], [x + w + 0.12, y + d + 0.12, 0], [x + w + 0.12, y + 0.12, 0], [x + w, y, 0], [x, y + d, 0]])} className="cb__shadow" />
            <g className="cb__lift">
              <polygon points={pts([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]])} className="cb__left" />
              <polygon points={pts([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]])} className="cb__right" />
              {Array.from({ length: b.floors - 1 }, (_, i) => <polyline key={i} points={pts([[x, y + d, (i + 1) * FH], [x + w, y + d, (i + 1) * FH], [x + w, y, (i + 1) * FH]])} className="cb__floor" />)}
              <polygon points={pts([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]])} className="cb__top" />
              <polygon points={pts([[x + 0.25, y + 0.25, h], [x + w - 0.25, y + 0.25, h], [x + w - 0.25, y + d - 0.25, h], [x + 0.25, y + d - 0.25, h]])} className="cb__roof" />
            </g>
          </g>
        );
      })}
      <g className="cb__badges" aria-hidden="true">{badges.map((g) => (
        <g key={g.b.key} className={`cbb cbb--${g.t.band}${current === g.b.key ? ' on' : ''}${hot === g.b.key ? ' hot' : ''}`}>
          <line x1={g.ax} y1={g.ay} x2={g.ax} y2={g.y + 32} className="cb__stem" />
          <g transform={`translate(${g.x.toFixed(1)} ${g.y.toFixed(1)})`}><g className="cbb__s">
            <rect width={g.w} height={32} rx={16} />
            <text x={14} y={21} className="cb__glyph">{BAND_GLYPH[g.t.band]}</text>
            <text x={30} y={21} className="cb__name">{g.b.short} <tspan className="cb__score">{g.t.score ?? '—'}</tspan></text>
            {g.t.issues > 0 && <g transform={`translate(${g.w - 2} 2)`} className="cm__glyph"><circle r={11} /><text y={4} textAnchor="middle">{g.t.issues}</text></g>}
          </g></g>
        </g>))}</g>
    </svg>
  );
}

/** A floor plate: the floor's rooms laid out as tiles proportional to their modelled footprint. */
export function FloorPlate({ rooms, onOpen }: { rooms: Array<{ id: string; label: string; w: number; l: number; state: string; issues: number }>; onOpen: (id: string) => void }) {
  const gap = 0.8; let x = 0; const H = Math.max(6, ...rooms.map((r) => r.l)); const S = 40;
  const placed = rooms.map((r) => { const p = { ...r, x }; x += r.w + gap; return p; });
  const W = Math.max(x - gap, 10);
  return (
    <svg className="stage__svg" viewBox={`-20 -20 ${W * S + 40} ${H * S + 90}`} role="group" aria-label="Floor plate">
      <rect x={-10} y={-10} width={W * S + 20} height={H * S + 20} className="fp__slab" rx={8} />
      {placed.map((r) => (
        <g key={r.id} className={`fp__room fp__room--${r.state.toLowerCase()}`} role="button" tabIndex={0} aria-label={`${r.label}: ${r.state}${r.issues ? `, ${r.issues} open issue${r.issues === 1 ? '' : 's'}` : ''}`} data-testid={`floor-room-${r.id}`} onClick={() => onOpen(r.id)} onKeyDown={keyAct(() => onOpen(r.id))}>
          <rect x={r.x * S} y={(H - r.l) * S} width={r.w * S} height={r.l * S} rx={4} />
          <text x={r.x * S + 8} y={(H - r.l) * S + 20} className="fp__label">{r.label}</text>
          {r.issues > 0 && <g transform={`translate(${(r.x + r.w) * S - 16} ${(H - r.l) * S + 16})`} className="cm__glyph"><circle r={11} /><text y={4} textAnchor="middle">{r.issues}</text></g>}
        </g>
      ))}
      <text x={0} y={H * S + 50} className="fp__scale">Footprints are the rooms’ modelled dimensions (not surveyed). Scale: {S} px = 1 m.</text>
    </svg>
  );
}

interface RoomViewProps { w: number; l: number; h: number; positions: Position[]; connections: Connection[]; layers: Set<Layer>; selected: string | null; onSelect: (code: string) => void; showLinks: boolean }

/** Plan: top-down, metres, a 1 m grid. */
export function PlanView({ w, l, positions, connections, layers, selected, onSelect, showLinks }: RoomViewProps) {
  const S = 60; const pad = 30; const vis = positions.filter((p) => layers.has(p.layer));
  const at = new Map(positions.map((p) => [p.code, p]));
  return (
    <svg className="stage__svg" viewBox={`${-pad} ${-pad} ${w * S + 2 * pad} ${l * S + 2 * pad + 24}`} role="group" aria-label={`Plan of the room, ${w} by ${l} metres`} data-testid="room-plan">
      {Array.from({ length: Math.floor(w) + 1 }, (_, i) => <line key={`v${i}`} x1={i * S} y1={0} x2={i * S} y2={l * S} className="stage__gridline" />)}
      {Array.from({ length: Math.floor(l) + 1 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * S} x2={w * S} y2={i * S} className="stage__gridline" />)}
      <rect x={0} y={0} width={w * S} height={l * S} className="rv__wall" />
      {showLinks && connections.filter((c) => !c.removed).map((c) => { const a = at.get(c.from), b = at.get(c.to); if (!a || !b || !layers.has(a.layer) || !layers.has(b.layer)) return null; return <line key={c.id} x1={a.x * S} y1={a.y * S} x2={b.x * S} y2={b.y * S} className={`rv__link rv__link--${c.kind}${selected && (c.from === selected || c.to === selected) ? ' on' : ''}`} />; })}
      {vis.map((p) => {
        const size = C.categories[p.cat]?.size;
        if (p.furniture) return <rect key={p.code} x={(p.x - (size?.[0] || 1) / 2) * S} y={(p.y - (size?.[1] || 0.6) / 2) * S} width={(size?.[0] || 1) * S} height={(size?.[1] || 0.6) * S} className="rv__furn" rx={6} aria-hidden="true" />;
        return (
          <g key={p.code} transform={`translate(${p.x * S} ${p.y * S})`} className={`rv__dev${selected === p.code ? ' on' : ''}`} role="button" tabIndex={0} aria-pressed={selected === p.code} aria-label={`${p.label}, position ${p.code}, ${p.asset ? `asset ${p.asset}` : 'no asset recorded'}, identity ${p.identity}`} data-testid={`dev-${p.code}`} onClick={() => onSelect(p.code)} onKeyDown={keyAct(() => onSelect(p.code))}>
            <circle r={13} fill={LAYER_COLOR[p.layer]} /><text y={4} textAnchor="middle" className="rv__glyph">{LAYER_GLYPH[p.layer]}</text>
          </g>
        );
      })}
      <text x={0} y={l * S + 22} className="fp__scale">{w} m × {l} m · grid 1 m</text>
    </svg>
  );
}

/** 3D: an isometric projection of the room (two walls cut away), devices at their mounting height. Four viewing angles. */
export function IsoView({ w, l, h, positions, layers, selected, onSelect, angle }: RoomViewProps & { angle: number }) {
  const S = 34; const cos = Math.cos(Math.PI / 6), sin = Math.sin(Math.PI / 6);
  const rot = (x: number, y: number): [number, number] => { switch (angle % 4) { case 1: return [l - y, x]; case 2: return [w - x, l - y]; case 3: return [y, w - x]; default: return [x, y]; } };
  const W = angle % 2 ? l : w, L = angle % 2 ? w : l;
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * cos * S, ((x + y) * sin - z) * S];
  const pts = (a: Array<[number, number, number]>) => a.map(([x, y, z]) => P(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');
  const minX = P(0, L, 0)[0] - 30, maxX = P(W, 0, 0)[0] + 30, minY = P(0, 0, h)[1] - 30, maxY = P(W, L, 0)[1] + 40;
  const vis = positions.filter((p) => layers.has(p.layer)).map((p) => { const [x, y] = rot(p.x, p.y); return { p, x, y }; }).sort((a, b) => a.x + a.y - (b.x + b.y));
  return (
    <svg className="stage__svg" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="group" aria-label={`Three-dimensional view of the room, angle ${angle * 90} degrees`} data-testid="room-3d">
      <polygon points={pts([[0, 0, 0], [W, 0, 0], [W, L, 0], [0, L, 0]])} className="iso__floor" />
      <polygon points={pts([[0, 0, 0], [W, 0, 0], [W, 0, h], [0, 0, h]])} className="iso__wall" />
      <polygon points={pts([[0, 0, 0], [0, L, 0], [0, L, h], [0, 0, h]])} className="iso__wall iso__wall--side" />
      {Array.from({ length: Math.floor(W) }, (_, i) => <polyline key={`gx${i}`} points={pts([[i + 1, 0, 0], [i + 1, L, 0]])} className="iso__grid" />)}
      {Array.from({ length: Math.floor(L) }, (_, i) => <polyline key={`gy${i}`} points={pts([[0, i + 1, 0], [W, i + 1, 0]])} className="iso__grid" />)}
      {vis.map(({ p, x, y }) => {
        if (p.furniture) { const s = C.categories[p.cat]?.size || [1, 0.6]; const hh = p.cat === 'table' ? 0.74 : 0.45; const a = s[0] / 2, b = s[1] / 2; return <polygon key={p.code} points={pts([[x - a, y - b, hh], [x + a, y - b, hh], [x + a, y + b, hh], [x - a, y + b, hh]])} className="iso__furn" aria-hidden="true" />; }
        const [px, py] = P(x, y, p.z); const [fx, fy] = P(x, y, 0);
        return (
          <g key={p.code} className={`rv__dev${selected === p.code ? ' on' : ''}`} role="button" tabIndex={0} aria-pressed={selected === p.code} aria-label={`${p.label}, position ${p.code}, ${p.z} m high`} onClick={() => onSelect(p.code)} onKeyDown={keyAct(() => onSelect(p.code))}>
            {p.z > 0.05 && <line x1={fx} y1={fy} x2={px} y2={py} className="iso__drop" />}
            <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)})`}><rect x={-9} y={-9} width={18} height={18} rx={4} fill={LAYER_COLOR[p.layer]} /><text y={4} textAnchor="middle" className="rv__glyph">{LAYER_GLYPH[p.layer]}</text></g>
          </g>
        );
      })}
    </svg>
  );
}
