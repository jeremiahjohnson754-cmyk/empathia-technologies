/**
 * Lite's interactive 3D stage: an orbiting axonometric view of a room or space drawn as SVG in the page (no WebGL, nothing fetched).
 * Drag (pointer) or the orbit buttons turn it; the tilt goes from a low perspective to a plan from above. The two walls nearest the
 * viewer are cut away so the room stays readable from every angle. Coverage overlays are drawn on the floor and clipped to the room.
 * Every device is a keyboard-reachable button with an accessible name; colour is never the only signal (glyphs and the legend).
 * The stage stays dark in light mode (D36: data-stage).
 */
import { useRef, useState, type ReactNode } from 'react';
import { LAYER_COLOR, LAYER_GLYPH } from '../spatial/Spatial.js';
import { C } from '../campus/design.js';
import type { CoverageModel, LiteLayer, Overlay, StatePosition, Seat } from './model.js';
import { liteLayerOf } from './model.js';
import type { Connection } from '@empathia/domain-types';
import type { SpaceLayout } from './data/types.js';

export interface View { yaw: number; pitch: number; zoom: number }
export const VIEW0: View = { yaw: -32, pitch: 52, zoom: 1 };
type P3 = [number, number, number];

function projector(w: number, l: number, v: View, S: number) {
  const a = (v.yaw * Math.PI) / 180, p = (v.pitch * Math.PI) / 180; const ca = Math.cos(a), sa = Math.sin(a), sp = Math.sin(p), cp = Math.cos(p);
  const cx = w / 2, cy = l / 2;
  const depth = (x: number, y: number) => (x - cx) * sa + (y - cy) * ca;   // larger = nearer the viewer
  const P = (x: number, y: number, z: number): [number, number] => [((x - cx) * ca - (y - cy) * sa) * S, (depth(x, y) * sp - z * cp) * S];
  return { P, depth, pts: (a3: P3[]) => a3.map(([x, y, z]) => P(x, y, z).map((n) => n.toFixed(1)).join(',')).join(' ') };
}
const keyAct = (fn: () => void) => (e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

/** Orbit controls: pointer drag on the stage plus buttons (keyboard and touch equivalents). */
export function useOrbit(initial: View = VIEW0) {
  const [view, setView] = useState<View>(initial);
  const drag = useRef<{ x: number; y: number; v: View } | null>(null);
  const bind = {
    onPointerDown: (e: { clientX: number; clientY: number; pointerId: number; currentTarget: { setPointerCapture?: (id: number) => void } }) => { drag.current = { x: e.clientX, y: e.clientY, v: view }; try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* capture is optional */ } },
    onPointerMove: (e: { clientX: number; clientY: number }) => { const d = drag.current; if (!d) return; setView({ ...d.v, yaw: d.v.yaw + (e.clientX - d.x) * 0.4, pitch: Math.max(22, Math.min(90, d.v.pitch - (e.clientY - d.y) * 0.25)) }); },
    onPointerUp: () => { drag.current = null; }, onPointerCancel: () => { drag.current = null; },
  };
  const turn = (d: number) => setView((v) => ({ ...v, yaw: v.yaw + d }));
  const tilt = (d: number) => setView((v) => ({ ...v, pitch: Math.max(22, Math.min(90, v.pitch + d)) }));
  const zoomBy = (d: number) => setView((v) => ({ ...v, zoom: Math.max(0.7, Math.min(2.2, Math.round((v.zoom + d) * 10) / 10)) }));
  return { view, setView, bind, turn, tilt, zoomBy };
}

export function OrbitBar({ orbit, extra }: { orbit: ReturnType<typeof useOrbit>; extra?: ReactNode }) {
  const { turn, tilt, zoomBy, setView, view } = orbit;
  return (
    <div className="lt-orbit" role="toolbar" aria-label="View controls">
      <button type="button" className="lt-ibtn" onClick={() => turn(-45)} aria-label="Turn left 45 degrees" title="Turn left">⟲</button>
      <button type="button" className="lt-ibtn" onClick={() => turn(45)} aria-label="Turn right 45 degrees" title="Turn right">⟳</button>
      <button type="button" className="lt-ibtn" onClick={() => tilt(-12)} aria-label="Tilt lower" title="Tilt lower">▽</button>
      <button type="button" className="lt-ibtn" onClick={() => tilt(12)} aria-label="Tilt higher, towards a plan" title="Tilt higher">△</button>
      <button type="button" className="lt-ibtn" onClick={() => setView((v) => ({ ...v, pitch: 90, yaw: 0 }))} aria-label="Plan view from above" aria-pressed={view.pitch === 90} title="Plan">⊡</button>
      <button type="button" className="lt-ibtn" onClick={() => zoomBy(0.2)} aria-label="Zoom in" title="Zoom in">+</button>
      <button type="button" className="lt-ibtn" onClick={() => zoomBy(-0.2)} aria-label="Zoom out" title="Zoom out">−</button>
      <button type="button" className="lt-ibtn lt-ibtn--txt" onClick={() => setView(VIEW0)} aria-label="Reset the view">Reset</button>
      {extra}
    </div>
  );
}

const CIRCLE = (x: number, y: number, r: number, n = 28): P3[] => Array.from({ length: n }, (_, i) => [x + r * Math.cos((i / n) * 2 * Math.PI), y + r * Math.sin((i / n) * 2 * Math.PI), 0.02]);
function box(pts: (a: P3[]) => string, x: number, y: number, z: number, w: number, d: number, h: number, rot = 0) {
  const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const corner = (dx: number, dy: number, zz: number): P3 => [x + dx * c - dy * s, y + dx * s + dy * c, zz];
  const a = w / 2, b = d / 2; const bot = [corner(-a, -b, z), corner(a, -b, z), corner(a, b, z), corner(-a, b, z)]; const top = bot.map(([px, py]) => [px, py, z + h] as P3);
  return { top: pts(top), sides: [0, 1, 2, 3].map((i) => pts([bot[i]!, bot[(i + 1) % 4]!, top[(i + 1) % 4]!, top[i]!])) };
}

export interface RoomSceneProps {
  label: string; w: number; l: number; h: number; view: View;
  positions: StatePosition[]; connections: Connection[]; layers: Set<LiteLayer>; overlays: Set<Overlay>; cov: CoverageModel;
  selected: string | null; onSelect: (code: string) => void; occupied?: boolean[];
  partitions?: number[]; active?: [number, number] | null; bind?: Record<string, unknown>;
  /** spatial drift: where furniture was commissioned (a dashed footprint) and the arrow to where it is now */
  ghosts?: Array<{ code: string; cat: string; from: [number, number]; to: [number, number]; rot: number }>;
}

/** One room in 3D with its layers and overlays. */
export function RoomScene(props: RoomSceneProps) {
  const { w, l, h, view, positions, connections, layers, overlays, cov, selected, onSelect, occupied, partitions = [], active, bind } = props;
  const S = 46 * view.zoom; const { P, depth, pts } = projector(w, l, view, S);
  const corners: Array<[number, number]> = [[0, 0], [w, 0], [w, l], [0, l]];
  const xy = corners.map(([x, y]) => P(x, y, 0)).concat(corners.map(([x, y]) => P(x, y, h)));
  const minX = Math.min(...xy.map((q) => q[0])) - 40, maxX = Math.max(...xy.map((q) => q[0])) + 40, minY = Math.min(...xy.map((q) => q[1])) - 40, maxY = Math.max(...xy.map((q) => q[1])) + 40;
  // walls: the two whose midpoint is farthest from the viewer are drawn; the near two are cut away
  const walls = [0, 1, 2, 3].map((i) => { const [x1, y1] = corners[i]!, [x2, y2] = corners[(i + 1) % 4]!; return { i, x1, y1, x2, y2, d: depth((x1 + x2) / 2, (y1 + y2) / 2) }; }).sort((a, b) => a.d - b.d);
  const far = walls.slice(0, 2), near = walls.slice(2);
  const clipId = `lt-clip-${props.label.replace(/[^a-z0-9]/gi, '')}`;
  const vis = positions.filter((p) => layers.has(liteLayerOf(p)) || (p.mark !== 'same' && !p.furniture));
  const at = new Map(positions.map((p) => [p.code, p]));
  const sorted = [...vis].sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y));
  const seatOn = layers.has('furniture'); const camOn = overlays.has('camera');
  const seatInView = (s: Seat) => cov.cones.some((c) => { const d = Math.hypot(s.x - c.x, s.y - c.y); if (d > c.range) return false; let a = Math.atan2(s.y - c.y, s.x - c.x) - c.aim; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return Math.abs(a) <= c.half; });
  const linkKinds = new Set<string>([...(layers.has('av') ? ['signal'] : []), ...(layers.has('network') || overlays.has('infra') ? ['network'] : []), ...(layers.has('power') ? ['power'] : []), ...(layers.has('control') ? ['control'] : [])]);
  const route = cov.seats.find((s) => s.wheelchair);
  // seats are drawn after the furniture and before the devices, so a table never hides them
  const seatsEl = seatOn && cov.seats.map((s, i) => { const [x, y] = P(s.x, s.y, 0.45); const miss = camOn && !seatInView(s); const occ = layers.has('occupancy') && occupied?.[i];
        return <g key={`seat${i}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} className={`lt-seat${miss ? ' lt-seat--miss' : ''}${occ ? ' lt-seat--occ' : ''}${s.wheelchair && overlays.has('access') ? ' lt-seat--wc' : ''}`} aria-hidden="true">{s.wheelchair && overlays.has('access') ? <rect x={-6} y={-6} width={12} height={12} rx={3} /> : <circle r={cov.seats.length > 120 ? 2.6 : 4.2} />}</g>; });
  return (
    <svg className="lt-svg" viewBox={`${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}`} role="group" aria-label={props.label} data-testid="lite-3d" data-yaw={Math.round(view.yaw)} data-pitch={Math.round(view.pitch)} {...bind}>
      <defs><marker id="lt-ghost-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="lt-ghost__head" /></marker><clipPath id={clipId}><polygon points={pts(corners.map(([x, y]) => [x, y, 0]))} /></clipPath></defs>
      <polygon points={pts(corners.map(([x, y]) => [x, y, 0]))} className="lt-floorpoly" />
      {Array.from({ length: Math.floor(w) }, (_, i) => <polyline key={`gx${i}`} points={pts([[i + 1, 0, 0], [i + 1, l, 0]])} className="lt-grid" />)}
      {Array.from({ length: Math.floor(l) }, (_, i) => <polyline key={`gy${i}`} points={pts([[0, i + 1, 0], [w, i + 1, 0]])} className="lt-grid" />)}
      {far.map((x) => <polygon key={`w${x.i}`} points={pts([[x.x1, x.y1, 0], [x.x2, x.y2, 0], [x.x2, x.y2, h], [x.x1, x.y1, h]])} className="lt-wall" />)}
      {near.map((x) => <polyline key={`n${x.i}`} points={pts([[x.x1, x.y1, 0], [x.x2, x.y2, 0]])} className="lt-wallcut" />)}
      {active && <polygon points={pts([[active[0], 0, 0.01], [active[1], 0, 0.01], [active[1], l, 0.01], [active[0], l, 0.01]])} className="lt-active" />}
      <g clipPath={`url(#${clipId})`} className="lt-overlays">
        {overlays.has('speaker') && cov.speakers.map((s) => <polygon key={`s${s.code}`} points={pts(CIRCLE(s.x, s.y, s.r))} className="lt-ov lt-ov--spk" />)}
        {overlays.has('mic') && cov.mics.map((m) => <polygon key={`m${m.code}`} points={pts(CIRCLE(m.x, m.y, m.r))} className="lt-ov lt-ov--mic" />)}
        {overlays.has('mic') && cov.pickup.of === 'stage positions' && cov.pickup.targets.map((t, i) => <polygon key={`t${i}`} points={pts(CIRCLE(t.x, t.y, 0.25, 8))} className="lt-target" />)}
        {camOn && cov.cones.map((c) => { const n = 18; const arc: P3[] = [[c.x, c.y, 0.02]]; for (let i = 0; i <= n; i += 1) { const a = c.aim - c.half + (2 * c.half * i) / n; arc.push([c.x + c.range * Math.cos(a), c.y + c.range * Math.sin(a), 0.02]); } return <polygon key={`c${c.code}`} points={pts(arc)} className="lt-ov lt-ov--cam" />; })}
        {overlays.has('access') && route && <polyline points={pts([[cov.door.x, cov.door.y, 0.03], [cov.door.x, Math.max(route.y + 0.6, cov.door.y - 1.2), 0.03], [route.x, route.y + 0.6, 0.03], [route.x, route.y, 0.03]])} className="lt-route" />}
        {layers.has('wayfinding') && <polyline points={pts([[cov.door.x, l + 0.01, 0.03], [cov.door.x, l - 1.4, 0.03]])} className="lt-route lt-route--way" />}
        {overlays.has('sight') && cov.sight.rays.map((r) => <polyline key={`ray${r.seat}`} points={pts([[r.sx, r.sy, 1.2], [r.dx, r.dy, r.dz]])} className={`lt-ray lt-ray--${r.cls.toLowerCase()}`} />)}
      </g>
      {props.ghosts && props.ghosts.length > 0 && <g className="lt-ghosts" data-testid="lite-ghosts" data-n={props.ghosts.length} aria-hidden="true">{props.ghosts.map((g) => { const K = C.categories[g.cat]; const [bw, bd] = K?.size || [1, 0.6]; const r = ((g.rot || 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        const foot = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as Array<[number, number]>).map(([u, v]): P3 => [g.from[0] + (u * bw) / 2 * c - (v * bd) / 2 * s, g.from[1] + (u * bw) / 2 * s + (v * bd) / 2 * c, 0.02]);
        return <g key={`gh${g.code}`}><polygon points={pts(foot)} className="lt-ghost" />{g.cat === 'table' && <polyline points={pts([[g.from[0], g.from[1], 0.03], [g.to[0], g.to[1], 0.03]])} className="lt-ghost__arrow" markerEnd="url(#lt-ghost-head)" />}</g>; })}</g>}
      {partitions.map((x, i) => <polygon key={`p${i}`} points={pts([[x, 0, 0], [x, l, 0], [x, l, h * 0.92], [x, 0, h * 0.92]])} className="lt-partition" />)}
      <polygon points={pts([[cov.door.x - cov.door.width / 2, l, 0], [cov.door.x + cov.door.width / 2, l, 0], [cov.door.x + cov.door.width / 2, l, 2.1], [cov.door.x - cov.door.width / 2, l, 2.1]])} className="lt-door" />
      {linkKinds.size > 0 && connections.filter((c) => !c.removed && linkKinds.has(c.kind)).map((c) => { const a = at.get(c.from), b = at.get(c.to); if (!a || !b || !vis.includes(a) || !vis.includes(b)) return null; const [x1, y1] = P(a.x, a.y, a.z), [x2, y2] = P(b.x, b.y, b.z); return <line key={c.id} x1={x1} y1={y1} x2={x2} y2={y2} className={`lt-link lt-link--${c.kind}`} />; })}
      {[...sorted.filter((p) => p.furniture && p.cat !== 'chairs'), null, ...sorted.filter((p) => !p.furniture)].map((p) => {
        if (p === null) return <g key="seats">{seatsEl}</g>;
        if (p.furniture) {
          const K = C.categories[p.cat]; const [bw, bd] = K?.size || [1, 0.6]; const hh = p.cat === 'table' ? 0.74 : p.cat === 'lectern' ? 1.1 : 0.45;
          const b = box(pts, p.x, p.y, 0, bw, bd, hh, p.rot);
          return <g key={p.code} className={`lt-furn${p.mark === 'moved' ? ' lt-furn--moved' : ''}`} aria-hidden="true">{b.sides.map((s, i) => <polygon key={i} points={s} />)}<polygon points={b.top} className="lt-furn__top" /></g>;
        }
        const [px, py] = P(p.x, p.y, p.z); const [fx, fy] = P(p.x, p.y, 0); const on = selected === p.code;
        return (
          <g key={p.code} className={`lt-dev lt-dev--${p.mark}${on ? ' on' : ''}`} role="button" tabIndex={0} aria-pressed={on} data-cat={p.cat}
            aria-label={`${p.label}, position ${p.code}${p.asset ? `, asset ${p.asset}` : ''}${p.mark !== 'same' ? `, ${p.mark}${p.note ? `: ${p.note}` : ''}` : ''}`}
            data-testid={`lt-dev-${p.code}`} onClick={() => onSelect(p.code)} onKeyDown={keyAct(() => onSelect(p.code))}>
            {p.z > 0.05 && <line x1={fx} y1={fy} x2={px} y2={py} className="lt-drop" />}
            <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)})`}>
              <rect x={-12} y={-12} width={24} height={24} rx={6} className="lt-dev__hit" />
              <rect x={-9} y={-9} width={18} height={18} rx={4} fill={LAYER_COLOR[p.layer]} className="lt-dev__chip" />
              <text y={4} textAnchor="middle" className="lt-dev__glyph">{p.mark === 'added' ? '+' : LAYER_GLYPH[p.layer] || '•'}</text>
              {(on || p.mark !== 'same') && <text y={-16} textAnchor="middle" className="lt-dev__label">{p.label}</text>}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/** A Lite space (lobby, Tech Zone, Commons…) in 3D from its V2.5.3 layout: zones on the floor, objects as boxes, optional route. */
export function SpaceScene({ layout, view, label, highlight, route, bind, selected, onSelect }: { layout: SpaceLayout; view: View; label: string; highlight?: string; route?: Array<[number, number]>; bind?: Record<string, unknown>; selected?: string | null; onSelect?: (id: string) => void }) {
  const { w, d, h } = layout; const S = (w > 20 ? 30 : 44) * view.zoom; const { P, depth, pts } = projector(w, d, view, S);
  const corners: Array<[number, number]> = [[0, 0], [w, 0], [w, d], [0, d]];
  const xy = corners.map(([x, y]) => P(x, y, 0)).concat(corners.map(([x, y]) => P(x, y, h)));
  const minX = Math.min(...xy.map((q) => q[0])) - 30, maxX = Math.max(...xy.map((q) => q[0])) + 30, minY = Math.min(...xy.map((q) => q[1])) - 30, maxY = Math.max(...xy.map((q) => q[1])) + 30;
  const walls = [0, 1, 2, 3].map((i) => { const [x1, y1] = corners[i]!, [x2, y2] = corners[(i + 1) % 4]!; return { i, x1, y1, x2, y2, d: depth((x1 + x2) / 2, (y1 + y2) / 2) }; }).sort((a, b) => a.d - b.d);
  const objs = [...layout.objs].sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y));
  return (
    <svg className="lt-svg" viewBox={`${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}`} role="group" aria-label={label} data-testid="lite-space-3d" {...bind}>
      <polygon points={pts(corners.map(([x, y]) => [x, y, 0]))} className="lt-floorpoly" />
      {walls.slice(0, 2).map((x) => <polygon key={x.i} points={pts([[x.x1, x.y1, 0], [x.x2, x.y2, 0], [x.x2, x.y2, h], [x.x1, x.y1, h]])} className="lt-wall" />)}
      {walls.slice(2).map((x) => <polyline key={`n${x.i}`} points={pts([[x.x1, x.y1, 0], [x.x2, x.y2, 0]])} className="lt-wallcut" />)}
      {layout.zones.map((z) => <polygon key={z.id} points={pts(z.pts.map(([x, y]) => [x, y, 0.01]))} className={`lt-zone lt-zone--${z.kind}${highlight && (z.id === highlight || z.label === highlight) ? ' on' : ''}`}><title>{z.label}</title></polygon>)}
      {route && route.length > 1 && <polyline points={pts(route.map(([x, y]) => [x, y, 0.03]))} className="lt-route lt-route--way" />}
      {objs.map((o) => {
        const b = box(pts, o.x, o.y, o.z || 0, o.w, o.d, o.h, o.rot); const on = selected === o.id; const named = o.kind !== 'chair' && o.label;
        const [lx, ly] = P(o.x, o.y, (o.z || 0) + o.h);
        return (
          <g key={o.id} className={`lt-obj lt-obj--${o.kind}${on ? ' on' : ''}${o.space && highlight === o.space ? ' lt-obj--hl' : ''}`} {...(named && onSelect ? { role: 'button', tabIndex: 0, 'aria-pressed': on, 'aria-label': String(o.label), onClick: () => onSelect(o.id), onKeyDown: keyAct(() => onSelect(o.id)) } : { 'aria-hidden': 'true' })}>
            {b.sides.map((s, i) => <polygon key={i} points={s} />)}<polygon points={b.top} className="lt-obj__top" />
            {named && (on || o.h > 1.2 || o.space) ? <text x={lx} y={ly - 6} textAnchor="middle" className="lt-dev__label">{String(o.label)}</text> : null}
          </g>
        );
      })}
    </svg>
  );
}
