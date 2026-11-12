/**
 * The mix lab's hands-on controls: knobs and faders that are dragged (pointer, touch or pen), scrolled, or moved with the arrow keys,
 * each an ARIA slider that names its value; and an animation clock that stops when the reader prefers reduced motion.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A clock for live meters and waves: seconds since mount, updated about `fps` times a second (frozen when motion is reduced). */
export function useClock(fps = 15) {
  const [t, setT] = useState(0);
  useEffect(() => { if (reducedMotion()) return; let raf = 0, last = 0; const t0 = performance.now();
    const loop = (now: number) => { if (now - last > 1000 / fps) { last = now; setT(Math.max(0, (now - t0) / 1000)); } raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, [fps]);
  return t;
}
const snap = (v: number, min: number, max: number, step: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
interface SliderProps { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string; onHelp?: () => void; testId?: string }
function useSlide({ value, min, max, step = 1, onChange }: SliderProps, pxRange: number, vertical = true) {
  const st = useRef<{ y: number; x: number; v: number } | null>(null);
  const down = (e: PointerEvent<Element>) => { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); st.current = { y: e.clientY, x: e.clientX, v: value }; e.preventDefault(); };
  const move = (e: PointerEvent<Element>) => { const s = st.current; if (!s) return; const d = vertical ? s.y - e.clientY : e.clientX - s.x; onChange(snap(s.v + (d / pxRange) * (max - min) * (e.shiftKey ? 0.2 : 1), min, max, step)); };
  const up = () => { st.current = null; };
  const key = (e: KeyboardEvent<Element>) => { const big = (max - min) / 10; const m: Record<string, number> = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: big, PageDown: -big };
    if (e.key in m) { e.preventDefault(); onChange(snap(value + m[e.key]!, min, max, step)); } else if (e.key === 'Home') { e.preventDefault(); onChange(min); } else if (e.key === 'End') { e.preventDefault(); onChange(max); } };
  return { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key };
}
const aria = (p: SliderProps) => ({ role: 'slider', tabIndex: 0, 'aria-label': p.label, 'aria-valuemin': p.min, 'aria-valuemax': p.max, 'aria-valuenow': p.value, 'aria-valuetext': p.fmt ? p.fmt(p.value) : String(p.value), 'data-testid': p.testId, onFocus: p.onHelp });
/** A rotary knob: drag up or down, scroll, or use the arrow keys (Shift for fine moves). */
export function Knob(p: SliderProps & { color?: string; size?: number; unit?: string }) {
  const size = p.size || 40; const f = (p.value - p.min) / (p.max - p.min); const a0 = -135, a = a0 + f * 270; const r = size / 2 - 4, c = size / 2;
  const pt = (deg: number) => [c + r * Math.sin((deg * Math.PI) / 180), c - r * Math.cos((deg * Math.PI) / 180)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a); const h = useSlide(p, 160);
  return <span className="mx-knob" title={`${p.label}: ${p.fmt ? p.fmt(p.value) : p.value}`}>
    <svg {...aria(p)} {...h} width={size} height={size} viewBox={`0 0 ${size} ${size}`} onWheel={(e) => { e.preventDefault(); p.onChange(snap(p.value + (e.deltaY < 0 ? 1 : -1) * (p.step || 1), p.min, p.max, p.step || 1)); }} onPointerDownCapture={p.onHelp}>
      <circle cx={c} cy={c} r={r} className="mx-knob__bg" />
      <path d={`M${x0} ${y0} A${r} ${r} 0 ${a - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`} stroke={p.color || 'var(--mx-hot)'} className="mx-knob__arc" />
      <line x1={c} y1={c} x2={x1} y2={y1} className="mx-knob__ptr" />
    </svg>
    <span className="mx-knob__v">{p.fmt ? p.fmt(p.value) : p.value}</span>
  </span>;
}
/** A long-throw fader: drag the cap or click the track; a meter can ride beside it. */
export function Fader(p: SliderProps & { height?: number; meter?: ReactNode; color?: string }) {
  const H = p.height || 150; const f = (p.value - p.min) / (p.max - p.min); const h = useSlide(p, H);
  const track = useRef<HTMLDivElement>(null);
  const jump = (e: PointerEvent<HTMLDivElement>) => { if ((e.target as HTMLElement).classList.contains('mx-fader__cap')) return; const r = track.current!.getBoundingClientRect(); p.onChange(snap(p.min + (1 - (e.clientY - r.top) / r.height) * (p.max - p.min), p.min, p.max, p.step || 1)); };
  return <div className="mx-fader" style={{ height: H }}>
    {p.meter}
    <div ref={track} className="mx-fader__track" onPointerDown={jump}>
      <div {...aria(p)} {...h} className="mx-fader__cap" style={{ bottom: `calc(${f * 100}% - 9px)`, background: p.color }} onPointerDownCapture={p.onHelp} />
    </div>
  </div>;
}
/** A level meter with a held peak: green to -12, amber to -3, red above. */
export function Meter({ db, peak, h = 150, testId }: { db: number; peak?: number; h?: number; testId?: string }) {
  const pc = (x: number) => Math.max(0, Math.min(100, ((x + 60) / 60) * 100));
  return <div className="mx-meter" style={{ height: h }} data-testid={testId} data-db={Math.round(db)} aria-hidden="true">
    <div className="mx-meter__fill" style={{ height: `${pc(db)}%` }} />
    {peak != null && <div className={`mx-meter__pk${peak > -0.1 ? ' is-clip' : ''}`} style={{ bottom: `${pc(peak)}%` }} />}
  </div>;
}
