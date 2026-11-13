/**
 * L3: V2.5.3's spatial scene engine, ported (founder directive 12 Nov 2026, "Lite complete spatial restoration"). V2.5.3 built each view
 * as a list of polygons, lines, labels and hit areas in metres (l3Scene, l3Poly, l3Line, l3Label, l3Hit, l3Box, l3Disc), then drew
 * them from an orbiting camera, painter-sorted, as SVG. This is the same idea in TypeScript and React: scenes are pure data, the camera
 * is state, and everything is drawn in the page (no WebGL, nothing fetched). Faces turn towards or away from the camera and are shaded by
 * it, as V2.5.3's l3Box did; labels sit on top; every place you can go is a keyboard-reachable button with an accessible name.
 * Geometry here is illustrative (modelled from room sizes in the record), never surveyed.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type P3 = [number, number, number];
export type RGB = [number, number, number];
// V2.5.3's own scenes (the room interiors, vendored in ./v253) use `o` for the object a shape belongs to and `a` for its opacity; our scenes use `o` for opacity
export interface L3Poly { t: 'p'; L: number; p: P3[]; f?: string; s?: string; sw?: number; da?: string; o?: number | string; a?: number; c?: P3; sub?: number; cls?: string; nav?: string; pri?: number }
export interface L3Line { t: 'l'; L: number; p: P3[]; s?: string; sw?: number; da?: string; cls?: string; c?: P3; pri?: number; a?: number; len?: boolean; o?: string }
export interface L3Label { t: 'x'; L: number; at: P3; text: string; sub?: string; big?: boolean; on?: boolean; anchor?: 'start' | 'middle'; cls?: string; lift?: number; nav?: string; tone?: string; testId?: string; keep?: boolean; o?: string; a?: number }
export interface L3Hit { t: 'h'; L: number; at: P3; label: string; nav?: string; r?: number; testId?: string; act?: string; o?: string; lift?: number }
/** a status mark (V2.5.3 l3Glyph): a circle, a triangle (warn), a diamond (bad) or a square (info), drawn in the scene */
export interface L3Glyph { t: 'g'; L: number; at: P3; tone: string; r?: number; lift?: number; o?: string; a?: number }
export type L3Item = L3Poly | L3Line | L3Label | L3Hit | L3Glyph;
export interface L3Scene { cx: number; cy: number; R: number; top: number; items: L3Item[]; seq: number }

export const scene = (cx: number, cy: number, R: number, top = 3): L3Scene => ({ cx, cy, R, top, items: [], seq: 0 });
const push = <T extends L3Item>(sc: L3Scene, it: T): T => { (it as unknown as { q: number }).q = sc.seq++; sc.items.push(it); return it; };
export const poly = (sc: L3Scene, L: number, p: P3[], o: Omit<L3Poly, 't' | 'L' | 'p'> = {}) => push(sc, { t: 'p', L, p, ...o });
export const line = (sc: L3Scene, L: number, p: P3[], o: Omit<L3Line, 't' | 'L' | 'p'> = {}) => push(sc, { t: 'l', L, p, ...o });
export const label = (sc: L3Scene, at: P3, text: string, o: Omit<L3Label, 't' | 'L' | 'at' | 'text'> = {}) => push(sc, { t: 'x', L: 7, at, text, ...o });
export const hit = (sc: L3Scene, at: P3, o: Omit<L3Hit, 't' | 'L' | 'at'>) => push(sc, { t: 'h', L: 8, at, ...o });
export const rgb = (c: RGB, k = 1, a?: number) => { const v = c.map((x) => Math.max(0, Math.min(255, Math.round(x * k)))); return a == null ? `rgb(${v.join(',')})` : `rgba(${v.join(',')},${a})`; };

/** the camera: yaw and pitch in degrees, zoom as a factor, pan (px, py) as a fraction of the frame */
export interface Cam { yaw: number; pitch: number; zoom: number; px?: number; py?: number }
export const CAM0: Cam = { yaw: -32, pitch: 48, zoom: 1 };
const RAD = Math.PI / 180;
/** the horizontal direction towards the viewer (V2.5.3 cam.sy / cam.cy) */
const toward = (cam: Cam): [number, number] => [Math.sin(cam.yaw * RAD), Math.cos(cam.yaw * RAD)];

/** A box with its sides facing the camera shaded by it (V2.5.3 l3Box): sides first, then the top. */
export function box(sc: L3Scene, cam: Cam, b: { x: number; y: number; z?: number; w: number; d: number; h: number; rot?: number }, col: RGB,
  st: { L?: number; stroke?: string; sw?: number; top?: string; noTop?: boolean; a?: number; nav?: string; cls?: string; dash?: string; pri?: number } = {}) {
  const z0 = b.z || 0, z1 = z0 + b.h, r = (b.rot || 0) * RAD, rc = Math.cos(r), rs = Math.sin(r), hw = b.w / 2, hd = b.d / 2;
  const cs: [number, number][] = ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as [number, number][]).map(([px, py]) => [b.x + px * rc - py * rs, b.y + px * rs + py * rc]);
  const N: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const [vx, vy] = toward(cam); const L = st.L ?? 3; const ctr: P3 = [b.x, b.y, z0 + b.h / 2];
  for (let i = 0; i < 4; i++) {
    const [n0, n1] = N[i]!; const nx = n0 * rc - n1 * rs, ny = n0 * rs + n1 * rc; const f = nx * vx + ny * vy; if (f <= 0.02 || cam.pitch > 88) continue;
    const a = cs[i]!, c2 = cs[(i + 1) % 4]!; const k = 0.62 + 0.14 * (nx * 0.6 - ny * 0.8) + 0.1 * f;
    poly(sc, L, [[a[0], a[1], z0], [c2[0], c2[1], z0], [c2[0], c2[1], z1], [a[0], a[1], z1]], { c: ctr, sub: 0, f: rgb(col, k, st.a), s: st.stroke || rgb(col, k, st.a), sw: st.sw ?? 0.5, nav: st.nav, cls: st.cls, da: st.dash, pri: st.pri });
  }
  if (!st.noTop) poly(sc, L, cs.map(([px, py]) => [px, py, z1] as P3), { c: ctr, sub: 1, f: st.top || rgb(col, 1, st.a), s: st.stroke || rgb(col, 1.12, st.a), sw: st.sw ?? 0.5, nav: st.nav, cls: st.cls, da: st.dash, pri: st.pri });
}
export const ring = (x: number, y: number, z: number, r: number, n = 24): P3[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [x + Math.cos(a) * r, y + Math.sin(a) * r, z]; });
/** A cylinder or puck (V2.5.3 l3Disc): a ring on the floor, a band, a lit top. */
export function disc(sc: L3Scene, cam: Cam, x: number, y: number, z: number, r: number, h: number, col: RGB, st: { L?: number; nav?: string; cls?: string } = {}) {
  const L = st.L ?? 3; const ctr: P3 = [x, y, z + h / 2]; const [vx, vy] = toward(cam);
  if (h > 0.03 && cam.pitch < 88) { const lx = -vy, ly = vx; poly(sc, L, [[x + lx * r, y + ly * r, z], [x - lx * r, y - ly * r, z], [x - lx * r, y - ly * r, z + h], [x + lx * r, y + ly * r, z + h]], { c: ctr, sub: 0, f: rgb(col, 0.62), s: 'none', nav: st.nav, cls: st.cls }); }
  poly(sc, L, ring(x, y, z + h, r, 18), { c: ctr, sub: 1, f: rgb(col, 1), s: rgb(col, 1.15), sw: 0.5, nav: st.nav, cls: st.cls });
}

/** The camera's projection: metres to screen units, and depth towards the viewer for painter's order. */
export function projector(sc: L3Scene, cam: Cam, S = 30) {
  const a = cam.yaw * RAD, p = cam.pitch * RAD, ca = Math.cos(a), sa = Math.sin(a), sp = Math.sin(p), cp = Math.cos(p);
  const P = ([x, y, z]: P3): [number, number] => [((x - sc.cx) * ca - (y - sc.cy) * sa) * S, (((x - sc.cx) * sa + (y - sc.cy) * ca) * sp - z * cp) * S];
  const depth = ([x, y, z]: P3) => ((x - sc.cx) * sa + (y - sc.cy) * ca) * cp + z * sp;
  return { P, depth };
}
const mean = (pts: P3[]): P3 => { const n = pts.length || 1; return [pts.reduce((s, q) => s + q[0], 0) / n, pts.reduce((s, q) => s + q[1], 0) / n, pts.reduce((s, q) => s + q[2], 0) / n]; };

/**
 * Orbit, tilt, zoom and pan, as V2.5.3's l3Bind did and a little more. Mouse: drag orbits and tilts; Shift-drag (or the middle or right
 * button) pans; Ctrl or ⌘ with the wheel zooms, so the plain wheel still scrolls the page. Touch: a sideways drag orbits and an upward or
 * downward one scrolls the page (touch-action: pan-y), two fingers pinch to zoom and move together to pan; a double tap resets. Keyboard on
 * the focused scene: arrows turn and tilt, Shift with the arrows pans, + and − zoom, P goes to plan, F fits, 0 resets.
 */
export function useCam(initial: Cam = CAM0) {
  const [cam, setCam] = useState<Cam>(initial); const start = useRef(initial);
  const drag = useRef<{ x: number; y: number; c: Cam; moved: boolean; el: { setPointerCapture?: (id: number) => void }; id: number; pan: boolean; touch: boolean; w: number; h: number } | null>(null);
  const pts = useRef(new Map<number, [number, number]>()); const pinch = useRef<{ d: number; mx: number; my: number; c: Cam } | null>(null);
  const clampP = (p: number) => Math.max(18, Math.min(90, p)); const clampZ = (z: number) => Math.max(0.6, Math.min(3, Math.round(z * 100) / 100));
  const clampXY = (v: number) => Math.max(-0.6, Math.min(0.6, Math.round(v * 1000) / 1000));
  type PE = { clientX: number; clientY: number; pointerId: number; pointerType?: string; shiftKey?: boolean; button?: number; currentTarget: { setPointerCapture?: (id: number) => void; getBoundingClientRect?: () => { width: number; height: number } } };
  const bind = {
    onPointerDown: (e: PE) => {
      pts.current.set(e.pointerId, [e.clientX, e.clientY]); const r = e.currentTarget.getBoundingClientRect?.() || { width: 800, height: 600 };
      drag.current = { x: e.clientX, y: e.clientY, c: cam, moved: false, el: e.currentTarget, id: e.pointerId, pan: !!e.shiftKey || e.button === 1 || e.button === 2, touch: e.pointerType === 'touch', w: r.width || 800, h: r.height || 600 };
      if (pts.current.size === 2) { const [p1, p2] = [...pts.current.values()] as [[number, number], [number, number]]; pinch.current = { d: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) || 1, mx: (p1[0] + p2[0]) / 2, my: (p1[1] + p2[1]) / 2, c: cam }; }
    },
    onPointerMove: (e: { clientX: number; clientY: number; pointerId: number }) => {
      if (!pts.current.has(e.pointerId)) return; pts.current.set(e.pointerId, [e.clientX, e.clientY]); const d = drag.current;
      if (pts.current.size === 2 && pinch.current) { const [p1, p2] = [...pts.current.values()] as [[number, number], [number, number]]; const P0 = pinch.current; const dist = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]); const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
        if (d) d.moved = true; setCam({ ...P0.c, zoom: clampZ(P0.c.zoom * dist / P0.d), px: clampXY((P0.c.px || 0) + (mx - P0.mx) / (d?.w || 800)), py: clampXY((P0.c.py || 0) + (my - P0.my) / (d?.h || 600)) }); return; }
      if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved) {
        if (Math.abs(dx) + Math.abs(dy) <= 4) return;
        if (d.touch && !d.pan && Math.abs(dy) > Math.abs(dx) * 1.2) { drag.current = null; return; }   // an upward or downward swipe is the page scrolling (V2.5.3)
        d.moved = true; try { d.el.setPointerCapture?.(d.id); } catch { /* not every target captures */ }   // capture only once it is a drag, so a tap still reaches the button under it
      }
      if (d.pan) { setCam({ ...d.c, px: clampXY((d.c.px || 0) + dx / d.w), py: clampXY((d.c.py || 0) + dy / d.h) }); return; }
      setCam({ ...d.c, yaw: d.c.yaw + dx * 0.4, pitch: d.touch ? d.c.pitch : clampP(d.c.pitch - dy * 0.25) });
    },
    onPointerUp: (e: { pointerId: number }) => { pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null; setTimeout(() => { if (!pts.current.size) drag.current = null; }, 0); },   // the click that follows a drag still sees it; a later tap or key does not
    onPointerCancel: (e: { pointerId: number }) => { pts.current.delete(e.pointerId); pinch.current = null; drag.current = null; },
    onContextMenu: (e: { preventDefault: () => void; shiftKey?: boolean }) => { if (drag.current?.pan) e.preventDefault(); },
    onDoubleClick: (e: { target: unknown }) => { const t = e.target as { closest?: (s: string) => unknown }; if (!t.closest?.('button, a, .l3-ctl')) setCam(start.current); },
    onKeyDown: (e: { key: string; shiftKey?: boolean; preventDefault: () => void; target: unknown; currentTarget: unknown }) => {
      if (e.target !== e.currentTarget) return;
      const pan: Record<string, (c: Cam) => Cam> = { ArrowLeft: (c) => ({ ...c, px: clampXY((c.px || 0) - 0.05) }), ArrowRight: (c) => ({ ...c, px: clampXY((c.px || 0) + 0.05) }), ArrowUp: (c) => ({ ...c, py: clampXY((c.py || 0) - 0.05) }), ArrowDown: (c) => ({ ...c, py: clampXY((c.py || 0) + 0.05) }) };
      const m: Record<string, (c: Cam) => Cam> = { ArrowLeft: (c) => ({ ...c, yaw: c.yaw - 15 }), ArrowRight: (c) => ({ ...c, yaw: c.yaw + 15 }), ArrowUp: (c) => ({ ...c, pitch: clampP(c.pitch + 8) }), ArrowDown: (c) => ({ ...c, pitch: clampP(c.pitch - 8) }), '+': (c) => ({ ...c, zoom: clampZ(c.zoom * 1.15) }), '=': (c) => ({ ...c, zoom: clampZ(c.zoom * 1.15) }), '-': (c) => ({ ...c, zoom: clampZ(c.zoom / 1.15) }), '0': () => start.current, p: (c) => ({ ...c, pitch: 90, yaw: 0 }), P: (c) => ({ ...c, pitch: 90, yaw: 0 }), f: (c) => ({ ...c, zoom: 1, px: 0, py: 0 }), F: (c) => ({ ...c, zoom: 1, px: 0, py: 0 }) };
      const f = (e.shiftKey && pan[e.key]) || m[e.key]; if (f) { e.preventDefault(); setCam(f); } },
  };
  const wasDrag = () => !!drag.current?.moved;
  /** Ctrl or ⌘ with the wheel (and a trackpad pinch, which browsers send that way) zooms; the plain wheel is left to scroll the page */
  const wheel = (e: WheelEvent) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); setCam((c) => ({ ...c, zoom: clampZ(c.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)) })); };
  return { cam, setCam, bind, wasDrag, wheel, reset: () => setCam(start.current), fit: () => setCam((c) => ({ ...c, zoom: 1, px: 0, py: 0 })), turn: (d: number) => setCam((c) => ({ ...c, yaw: c.yaw + d })), tilt: (d: number) => setCam((c) => ({ ...c, pitch: clampP(c.pitch + d) })), zoomBy: (k: number) => setCam((c) => ({ ...c, zoom: clampZ(c.zoom * k) })), plan: () => setCam((c) => ({ ...c, pitch: 90, yaw: 0 })) };
}

/** The stage's controls, in V2.5.3's column: turn right, turn left, zoom in, zoom out, plan, fit, reset (and a slot for more). */
export function CamBar({ c, extra }: { c: ReturnType<typeof useCam>; extra?: ReactNode }) {
  return <div className="l3-ctl" role="toolbar" aria-label="View controls">
    <button type="button" className="l3-btn" onClick={() => c.turn(45)} aria-label="Turn right" title="Turn right"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15a7 7 0 0 1 12-5l2 2M19 6v6h-6" /></svg></button>
    <button type="button" className="l3-btn" onClick={() => c.turn(-45)} aria-label="Turn left" title="Turn left"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 15a7 7 0 0 0-12-5l-2 2M5 6v6h6" /></svg></button>
    <button type="button" className="l3-btn" onClick={() => c.zoomBy(1.2)} aria-label="Zoom in" title="Zoom in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
    <button type="button" className="l3-btn" onClick={() => c.zoomBy(1 / 1.2)} aria-label="Zoom out" title="Zoom out"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg></button>
    <button type="button" className="l3-btn" onClick={c.plan} aria-pressed={c.cam.pitch === 90} aria-label="Plan view from above" title="Plan"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M5 12h7V5" /></svg></button>
    <button type="button" className="l3-btn" onClick={c.fit} aria-label="Fit to the view" title="Fit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg></button>
    <button type="button" className="l3-btn" onClick={c.reset} aria-label="Reset the view" title="Reset"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2-5M5 4v4h4" /></svg></button>
    {extra}
  </div>;
}

/** V2.5.3's status marks (l3Glyphs): shape as well as colour, so a warning reads without colour. */
const TONE: Record<string, string> = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)', info: 'var(--info)', teal: 'var(--teal)', mute: 'var(--tx3, #8a8478)' };
export function Glyph({ x, y, tone, r = 5 }: { x: number; y: number; tone: string; r?: number }) {
  const c = TONE[tone] || TONE.mute!; const k = r; const st = { fill: c, stroke: '#0e1012', strokeWidth: 1 };
  if (tone === 'warn') return <path d={`M${x} ${y - k}L${x + k} ${y + k * 0.8}H${x - k}Z`} {...st} />;
  if (tone === 'bad') return <path d={`M${x} ${y - k}L${x + k} ${y}L${x} ${y + k}L${x - k} ${y}Z`} {...st} />;
  if (tone === 'info') return <rect x={x - k * 0.8} y={y - k * 0.8} width={k * 1.6} height={k * 1.6} rx={1.5} {...st} />;
  return <circle cx={x} cy={y} r={k * 0.85} {...st} />;
}

/**
 * Draw a scene: painter-sorted polygons and lines, then labels and the places you can go.
 * For V2.5.3's own scenes (`v253`): its fill patterns (`defs`), its draw order (depth only among solids, layers 3 and 5; overlays in the
 * order drawn), its label placement (lift a label clear of another, drop a minor one that still collides), and object selection: a shape
 * or hit that belongs to an object (`o`) selects it, and the selected object is outlined.
 */
export function L3View({ sc, c, label: aria, onNav, testId, tall, over, S = 30, defs, v253, sel, onObj }: { sc: L3Scene; c: ReturnType<typeof useCam>; label: string; onNav: (to: string) => void; testId?: string; tall?: boolean; over?: ReactNode; S?: number; defs?: string; v253?: boolean; sel?: string | null; onObj?: (id: string) => void }) {
  const { P, depth } = projector(sc, c.cam, S);
  const drawn = useMemo(() => {
    const shapes = sc.items.filter((i): i is L3Poly | L3Line => i.t === 'p' || i.t === 'l').map((i) => ({ i, d: depth(i.c || mean(i.p)), q: (i as unknown as { q: number }).q }));
    const solid = (L: number) => !v253 || (L >= 3 && L < 4) || L === 5;
    shapes.sort((a, b) => a.i.L - b.i.L || (solid(a.i.L) ? (a.i.pri || 0) - (b.i.pri || 0) || a.d - b.d || ((a.i as L3Poly).sub || 0) - ((b.i as L3Poly).sub || 0) : 0) || a.q - b.q);
    return shapes;
  }, [sc, c.cam]);   // eslint-disable-line
  // framing from the scene's radius and height (V2.5.3 l3Scene R and top), so the view does not jump as it turns; zoom narrows the frame
  const sp = Math.sin(c.cam.pitch * Math.PI / 180), cp = Math.cos(c.cam.pitch * Math.PI / 180);
  const hw = sc.R * S * 1.08 + 30, top = sc.top * cp * S, hh = sc.R * sp * S + 24;
  const fw = (2 * hw) / c.cam.zoom, fh = (2 * hh + top + 60) / c.cam.zoom; const cxv = 14 - (c.cam.px || 0) * fw, cyv = -top / 2 - (c.cam.py || 0) * fh;
  const x0 = cxv - fw / 2, x1 = cxv + fw / 2, y0 = cyv - fh / 2 - 10 / c.cam.zoom, y1 = cyv + fh / 2;
  const fmt = (pts: P3[]) => pts.map((p) => P(p).map((n) => n.toFixed(1)).join(',')).join(' ');
  const go = (to?: string) => { if (to && !c.wasDrag()) onNav(to); };
  const pick = (o?: string) => { if (o && onObj && !c.wasDrag()) onObj(o); };
  const { onKeyDown, ...pointer } = c.bind;
  // the stage's width on screen, so labels can be kept clear of each other in screen pixels (V2.5.3 l3Svg did this on its canvas)
  const stage = useRef<HTMLDivElement | null>(null); const [px, setPx] = useState(0);
  useEffect(() => { if (!v253) return; const el = stage.current; if (!el) return; const up = () => setPx(el.clientWidth); up(); const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(up) : null; ro?.observe(el); return () => ro?.disconnect(); }, [v253]);
  useEffect(() => { const el = stage.current; if (!el) return; const w = (e: WheelEvent) => c.wheel(e); el.addEventListener('wheel', w, { passive: false }); return () => el.removeEventListener('wheel', w); }, [c.wheel]);   // eslint-disable-line
  const labels = sc.items.filter((i): i is L3Label => i.t === 'x');
  const placed = useMemo(() => {
    const out = new Map<L3Label, { lift: number; skip: boolean }>(); if (!v253 || !px) return out;
    const k = px / (x1 - x0); const boxes: number[][] = [];
    const meas = labels.map((it) => { const [x, y] = P(it.at); return { it, sx: (x - x0) * k, sy: (y - y0) * k, k: depth(it.at), w: Math.max(18, it.text.length * (it.big ? 6.1 : 5.4) + (it.tone ? 22 : 12) + (it.sub ? it.sub.length * 4.6 + 6 : 0)), hh: it.big ? 19 : 16, rank: it.on ? 0 : it.keep ? 1 : it.cls === 'soft' ? 2 : 1 }; });
    for (const m of meas.slice().sort((a, b) => a.rank - b.rank || b.k - a.k)) {
      let lift = m.it.lift || 0, tries = 0; const box = () => { const x = m.sx - (m.it.anchor === 'start' ? 0 : m.w / 2), y = m.sy - lift - 8; return [x, y, x + m.w, y + m.hh]; };
      let bx = box(); const hits = () => boxes.some((p) => bx[0]! < p[2]! + 2 && p[0]! < bx[2]! + 2 && bx[1]! < p[3]! + 2 && p[1]! < bx[3]! + 2);
      while (hits() && tries < (m.rank === 2 ? 0 : 3)) { lift += m.hh + 3; bx = box(); tries++; }
      if (hits() && m.rank > 0) { out.set(m.it, { lift, skip: true }); continue; }
      boxes.push(bx); out.set(m.it, { lift, skip: false });
    }
    return out;
  }, [sc, c.cam, px, v253]);   // eslint-disable-line
  return <div className={`l3-stage${tall ? ' l3-stage--tall' : ''}${v253 ? ' l3-stage--v253' : ''}`} data-stage="" data-testid={testId} ref={stage} {...pointer}>
    <svg className="l3-svg" style={{ aspectRatio: `${(x1 - x0).toFixed(0)} / ${(y1 - y0).toFixed(0)}` }} viewBox={`${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}`} role="group" aria-label={aria} tabIndex={0} onKeyDown={onKeyDown} data-yaw={Math.round(c.cam.yaw)} data-pitch={Math.round(c.cam.pitch)} data-zoom={c.cam.zoom} data-pan={`${c.cam.px || 0},${c.cam.py || 0}`}>
      {defs ? <g dangerouslySetInnerHTML={{ __html: defs }} /> : <defs>
        <linearGradient id="l3slab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a463f" /><stop offset="1" stopColor="#36332e" /></linearGradient>
        <pattern id="l3hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#4b3a2c" /><line x1="0" y1="0" x2="0" y2="6" stroke="#c98a3a" strokeWidth="1.5" /></pattern>
      </defs>}
      {v253 && <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="url(#l3glow)" />}
      {drawn.map(({ i }, k) => { const obj = typeof i.o === 'string' ? i.o : undefined; const on = !!obj && obj === sel; const op = typeof i.o === 'number' ? i.o : i.a;
        return i.t === 'p'
          ? <polygon key={k} points={fmt(i.p)} fill={i.f || 'none'} stroke={on ? 'var(--teal)' : i.s || 'none'} strokeWidth={on ? 1.6 : i.sw ?? 0.6} strokeDasharray={i.da} opacity={op} data-o={obj} className={`${i.cls || ''}${i.nav ? ' l3-go' : ''}${obj && onObj ? ' l3-obj' : ''}`} onClick={i.nav ? () => go(i.nav) : obj && onObj ? () => pick(obj) : undefined} />
          : <polyline key={k} points={fmt(i.p)} fill="none" stroke={i.s || '#fff'} strokeWidth={i.sw ?? 1} strokeDasharray={i.da} opacity={op} strokeLinecap={v253 ? 'round' : undefined} strokeLinejoin={v253 ? 'round' : undefined} pathLength={i.len ? 100 : undefined} className={i.cls} />; })}
      {sc.items.filter((i): i is L3Glyph => i.t === 'g').map((i, k) => { const [x, y] = P(i.at); return <g key={`g${k}`} opacity={i.a} data-o={i.o} className={i.o && onObj ? 'l3-obj' : undefined} onClick={i.o ? () => pick(i.o) : undefined}><Glyph x={x} y={y - (i.lift || 0)} tone={i.tone} r={i.r} /></g>; })}
    </svg>
    {/* labels and the places you can go sit over the drawing at a constant, readable size (V2.5.3 drew them as HTML over its SVG too) */}
    <div className="l3-marks">
      {labels.map((i, k) => { const pl = placed.get(i); if (pl?.skip) return null; const [x, y] = P(i.at); const left = ((x - x0) / (x1 - x0)) * 100, top = ((y - y0) / (y1 - y0)) * 100; const lift = pl ? pl.lift : i.lift;
        const cls = `l3-tag${i.big ? ' l3-tag--big' : ''}${i.on ? ' on' : ''}${i.cls ? ` ${i.cls}` : ''}${i.anchor === 'start' ? ' l3-tag--start' : ''}${i.o && i.o === sel ? ' on' : ''}`;
        const body = <>{i.tone && <i className={`l3-dot l3-dot--${i.tone}`} aria-hidden="true" />}<b>{i.text}</b>{i.sub && <span>{i.sub}</span>}</>;
        const style = { left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%`, marginTop: lift ? -lift : undefined, opacity: i.a };
        return i.nav ? <a key={`x${k}`} className={cls} style={style} href={i.nav} onClick={(e) => { e.preventDefault(); go(i.nav); }} data-testid={i.testId} tabIndex={-1} aria-hidden="true">{body}</a>
          : <span key={`x${k}`} className={`${cls}${i.o && onObj ? ' l3-tag--obj' : ''}`} style={style} data-testid={i.testId} aria-hidden="true" onClick={i.o && onObj ? () => pick(i.o) : undefined}>{body}</span>; })}
      {sc.items.filter((i): i is L3Hit => i.t === 'h').map((i, k) => { const [x, y] = P(i.at); return <button key={`h${k}`} type="button" className={`l3-hitbtn${i.o && i.o === sel ? ' on' : ''}`} style={{ left: `${(((x - x0) / (x1 - x0)) * 100).toFixed(2)}%`, top: `${(((y - (i.lift || 0) - y0) / (y1 - y0)) * 100).toFixed(2)}%` }} aria-label={i.label} aria-pressed={i.o ? i.o === sel : undefined} data-testid={i.testId} data-o={i.o} onClick={() => (i.o ? pick(i.o) : go(i.nav))} />; })}
    </div>
    <CamBar c={c} />
    {over}
  </div>;
}
