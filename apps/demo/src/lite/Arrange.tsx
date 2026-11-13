/**
 * Arrange the room in 3D (13 Nov 2026, founder: "let authorized users select, place, rotate, inspect, and reposition objects in the 3D
 * environment with synchronized changes and undo/redo … Keep 2D as a precision design tool"). The edits are V2.5.3's own edit model
 * (applyEdits: moves and turns by object id, objects added by kind, objects removed), so the 3D room, the 2D precision plan and the
 * coverage figures all draw from one set of edits. In the Optimize lens only; kept in this browser, never sent anywhere until a person
 * asks for the change through the request form. Modelled: nothing here moves real equipment.
 */
import { useEffect, useMemo, useState, type KeyboardEvent as RKE } from 'react';
import { Icon } from '@empathia/ui';
import { v253Arranged, type V253Edits } from './v253/v253room.js';
import type { V253Object } from './v253/vendor.js';

export type Edits = V253Edits;
type AddKind = Edits['add'][number]['kind'];
export const EMPTY: Edits = { mv: {}, add: [], remove: [] };
const PREFIX: Record<AddKind, string> = { micceil: 'addmic', spk: 'addspk', display: 'adddisp', camera: 'addcam' };
export const ADD_KINDS: Array<{ kind: AddKind; label: string; icon: 'display' | 'camera' | 'mic' | 'speaker' }> = [
  { kind: 'display', label: 'Display', icon: 'display' }, { kind: 'camera', label: 'Camera', icon: 'camera' }, { kind: 'micceil', label: 'Ceiling microphone', icon: 'mic' }, { kind: 'spk', label: 'Loudspeaker', icon: 'speaker' },
];
/** what may be picked up and moved: furniture and equipment, never the room's shell, its stage or its seating blocks */
const FIXED = new Set(['door', 'stage', 'seatblock', 'divider', 'chair', 'person', 'antenna', 'window']);
export const movable = (o: V253Object | undefined | null) => !!o && !FIXED.has(o.kind);
const STEP = 0.25; const TURN = 15;
const KEY = (id: string) => `empathia.lite.arrange.v1:${id}`;
const load = (id: string): Edits => { try { const v = JSON.parse(localStorage.getItem(KEY(id)) || 'null'); return v && typeof v === 'object' && v.mv && Array.isArray(v.add) && Array.isArray(v.remove) ? v : EMPTY; } catch { return EMPTY; } };
const save = (id: string, e: Edits) => { try { if (count(e)) localStorage.setItem(KEY(id), JSON.stringify(e)); else localStorage.removeItem(KEY(id)); } catch { /* storage blocked: the edits stay in the page */ } };
export const count = (e: Edits) => Object.keys(e.mv).length + e.add.length + e.remove.length;
const addId = (e: Edits, i: number) => `${PREFIX[e.add[i]!.kind]}${i + 1}`;   // applyEdits numbers the added objects in order, from 1

/** One room's arrangement: the edits, undo and redo (at most 60 steps), and what each change did, said in words. */
export function useArrange(roomId: string) {
  const [st, setSt] = useState(() => ({ e: load(roomId), undo: [] as Edits[], redo: [] as Edits[], said: '' }));
  useEffect(() => { setSt({ e: load(roomId), undo: [], redo: [], said: '' }); }, [roomId]);
  useEffect(() => { save(roomId, st.e); }, [roomId, st.e]);
  const commit = (fn: (e: Edits) => Edits, said: string) => setSt((s) => { const n = fn(s.e); if (JSON.stringify(n) === JSON.stringify(s.e)) return s; return { e: n, undo: [...s.undo.slice(-59), s.e], redo: [], said }; });
  return {
    e: st.e, said: st.said, canUndo: st.undo.length > 0, canRedo: st.redo.length > 0, n: count(st.e),
    undo: () => setSt((s) => (s.undo.length ? { e: s.undo[s.undo.length - 1]!, undo: s.undo.slice(0, -1), redo: [...s.redo, s.e], said: 'Undone.' } : s)),
    redo: () => setSt((s) => (s.redo.length ? { e: s.redo[s.redo.length - 1]!, undo: [...s.undo, s.e], redo: s.redo.slice(0, -1), said: 'Redone.' } : s)),
    reset: () => commit(() => EMPTY, 'Back to the room as recorded.'),
    add: (kind: AddKind, x: number, y: number) => commit((e) => ({ ...e, add: [...e.add, { kind, x, y, ...(kind === 'camera' ? { aim: 270 } : kind === 'display' ? { face: 90 } : {}) }] }), `${ADD_KINDS.find((k) => k.kind === kind)!.label} added in the middle of the room.`),
    /** move by dx, dy metres and turn by dr degrees; an added object turns through its own aim or facing */
    move: (o: V253Object, dx: number, dy: number, dr: number, said: string) => commit((e) => {
      const i = e.add.findIndex((_, k) => addId(e, k) === o.id);
      if (i >= 0 && dr) { const a = e.add[i]!; const add = e.add.slice(); add[i] = a.kind === 'camera' ? { ...a, aim: ((a.aim ?? 270) + dr + 360) % 360 } : a.kind === 'display' ? { ...a, face: ((a.face ?? 90) + dr + 360) % 360 } : a; return { ...e, add }; }
      const m = e.mv[o.id] || [0, 0, 0]; const n: [number, number, number] = [round(m[0] + dx), round(m[1] + dy), (m[2] + dr) % 360];
      const mv = { ...e.mv }; if (!n[0] && !n[1] && !n[2]) delete mv[o.id]; else mv[o.id] = n; return { ...e, mv };
    }, said),
    remove: (o: V253Object) => commit((e) => {
      const i = e.add.findIndex((_, k) => addId(e, k) === o.id);
      if (i < 0) return { ...e, remove: [...new Set([...e.remove, o.id])], mv: Object.fromEntries(Object.entries(e.mv).filter(([k]) => k !== o.id)) };
      // the added objects after it are numbered one lower, so their moves follow them
      const add = e.add.filter((_, k) => k !== i); const mv: Edits['mv'] = {};
      for (const [k, v] of Object.entries(e.mv)) { const j = e.add.findIndex((_, q) => addId(e, q) === k); if (j === i) continue; mv[j > i ? `${PREFIX[e.add[j]!.kind]}${j}` : k] = v; }
      return { ...e, add, mv };
    }, `${o.label || o.kind} removed.`),
  };
}
const round = (v: number) => Math.round(v * 100) / 100;
/** which way a thing faces: a camera by its first preset's aim (what turning it changes), anything else by its rotation */
const angleOf = (o: V253Object) => { const p = (o as { presets?: Array<{ aim: number }> }).presets; return Math.round(Array.isArray(p) && p[0] ? p[0].aim : o.added && o.face !== undefined && o.kind === 'display' ? Number(o.face) : o.rot || 0); };
export type Arrange = ReturnType<typeof useArrange>;

/** The arrangement toolbar over the 3D room: add from the palette; move, turn and remove what is selected; undo, redo and reset. */
export function ArrangeBar({ ar, L, sel, onAdded }: { ar: Arrange; L: { w: number; d: number; objs: V253Object[] }; sel: V253Object | null; onAdded: (id: string) => void }) {
  const can = movable(sel);
  const mv = (dx: number, dy: number, dr: number, said: string) => sel && ar.move(sel, dx, dy, dr, said);
  return <div className="lt-arr" role="group" aria-label="Arrange the room" data-testid="lite-arrange"
    onKeyDown={(e) => { if (!can || (e.target as HTMLElement).tagName === 'INPUT') return; const k = e.key; const d = k === 'ArrowLeft' ? [-STEP, 0] : k === 'ArrowRight' ? [STEP, 0] : k === 'ArrowUp' ? [0, -STEP] : k === 'ArrowDown' ? [0, STEP] : null;
      if (d) { e.preventDefault(); mv(d[0]!, d[1]!, 0, 'Moved 25 cm.'); } else if (k === 'r' || k === 'R') { e.preventDefault(); mv(0, 0, e.shiftKey ? -TURN : TURN, `Turned ${TURN}°.`); } else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); ar.remove(sel!); } }}>
    <div className="lt-arr__row" role="group" aria-label="Add to the room">
      <span className="lt-arr__l">Add</span>{ADD_KINDS.map((k) => <button key={k.kind} type="button" className="ui-btn ui-btn--small" onClick={() => { const nid = `${PREFIX[k.kind]}${ar.e.add.length + 1}`; ar.add(k.kind, L.w / 2, L.d / 2); onAdded(nid); }} data-testid={`lite-arr-add-${k.kind}`}><Icon name={k.icon} size={16} /> {k.label}</button>)}
    </div>
    <div className="lt-arr__row" role="group" aria-label={sel ? `Move ${sel.label || sel.kind}` : 'Select something in the room to move it'}>
      <span className="lt-arr__l">{sel ? (can ? `${sel.label || sel.kind}` : `${sel.label || sel.kind} stays where it is`) : 'Tap something in the room to move it'}</span>
      <button type="button" className="ui-btn ui-btn--small" disabled={!can} onClick={() => mv(0, -STEP, 0, 'Moved 25 cm toward the front wall.')} aria-label="Toward the front wall, 25 cm" data-testid="lite-arr-up"><Icon name="arrow-up" size={16} /></button>
      <button type="button" className="ui-btn ui-btn--small" disabled={!can} onClick={() => mv(-STEP, 0, 0, 'Moved 25 cm left.')} aria-label="Left, 25 cm" data-testid="lite-arr-left"><Icon name="chevron-left" size={16} /></button>
      <button type="button" className="ui-btn ui-btn--small" disabled={!can} onClick={() => mv(STEP, 0, 0, 'Moved 25 cm right.')} aria-label="Right, 25 cm" data-testid="lite-arr-right"><Icon name="chevron-right" size={16} /></button>
      <button type="button" className="ui-btn ui-btn--small" disabled={!can} onClick={() => mv(0, STEP, 0, 'Moved 25 cm toward the back.')} aria-label="Toward the back, 25 cm" data-testid="lite-arr-down"><Icon name="arrow-down" size={16} /></button>
      <button type="button" className="ui-btn ui-btn--small" disabled={!can} onClick={() => mv(0, 0, -TURN, `Turned ${TURN}° to the left.`)} data-testid="lite-arr-turnl">Turn left 15°</button>
      <button type="button" className="ui-btn ui-btn--small" disabled={!can} onClick={() => mv(0, 0, TURN, `Turned ${TURN}° to the right.`)} data-testid="lite-arr-turnr">Turn right 15°</button>
      <button type="button" className="ui-btn ui-btn--small ui-btn--quiet" disabled={!can} onClick={() => sel && ar.remove(sel)} data-testid="lite-arr-remove">Remove</button>
    </div>
    <div className="lt-arr__row">
      <button type="button" className="ui-btn ui-btn--small" disabled={!ar.canUndo} onClick={ar.undo} data-testid="lite-arr-undo"><Icon name="undo" size={16} /> Undo</button>
      <button type="button" className="ui-btn ui-btn--small" disabled={!ar.canRedo} onClick={ar.redo} data-testid="lite-arr-redo">Redo</button>
      <button type="button" className="ui-btn ui-btn--small ui-btn--quiet" disabled={!ar.n} onClick={ar.reset} data-testid="lite-arr-reset">Back to the room as recorded</button>
      <span className="ui-meta" data-testid="lite-arr-count">{ar.n ? `${ar.n} change${ar.n === 1 ? '' : 's'} · kept in this browser · modelled` : 'No change yet'}</span>
    </div>
    <p className="ui-sr" role="status" aria-live="polite" data-testid="lite-arr-said">{ar.said}</p>
    <p className="ui-meta lt-arr__keys">With the toolbar focused: arrow keys move 25 cm, R turns 15° (Shift+R the other way), Delete removes.</p>
  </div>;
}

/** The 2D precision plan: the same arrangement from above, to the centimetre. Select here or in 3D; type a position or an angle. */
export function PrecisionPlan({ ar, roomId, sel, onSel }: { ar: Arrange; roomId: string; sel: string | null; onSel: (id: string | null) => void }) {
  const A = useMemo(() => v253Arranged(roomId, ar.e), [roomId, ar.e]);
  if (!A) return null;
  const L = A.L; const W = 320; const sc = W / Math.max(L.w, L.d); const o = L.objs.find((x) => x.id === sel) || null;
  const show = L.objs.filter((x) => movable(x) || x.kind === 'chair');
  const setAbs = (k: 'x' | 'y' | 'rot', v: number) => { if (!o || !Number.isFinite(v)) return; const lim = k === 'x' ? [0.15, L.w - 0.15] : k === 'y' ? [0.05, L.d - 0.15] : [-3600, 3600]; const t = Math.min(lim[1]!, Math.max(lim[0]!, v));
    ar.move(o, k === 'x' ? round(t - o.x) : 0, k === 'y' ? round(t - o.y) : 0, k === 'rot' ? Math.round(t - angleOf(o)) : 0, k === 'rot' ? `Turned to ${Math.round(t)}°.` : `Placed at ${t.toFixed(2)} m.`); };
  return <section className="lt-plan2" aria-label="Precision plan" data-testid="lite-arr-plan">
    <h3 className="lt-h3">Precision plan <span className="ui-meta">the same arrangement from above · the front wall at the top</span></h3>
    <svg viewBox={`-6 -6 ${L.w * sc + 12} ${L.d * sc + 12}`} role="group" aria-label={`Plan of the room, ${L.w} by ${L.d} metres`} className="lt-plan2__svg">
      <rect x="0" y="0" width={L.w * sc} height={L.d * sc} className="lt-plan2__room" onClick={() => onSel(null)} />
      {show.map((x) => { const on = x.id === sel; const w = Math.max(0.12, x.w) * sc, d = Math.max(0.12, x.d) * sc;
        return <g key={x.id} transform={`translate(${x.x * sc} ${x.y * sc}) rotate(${-(x.rot || 0)})`} className={`lt-plan2__o lt-plan2__o--${x.kind}${on ? ' on' : ''}${x.added ? ' added' : ''}`} data-obj={x.id}
          {...(movable(x) ? { role: 'button', tabIndex: 0, 'aria-pressed': on, 'aria-label': `${x.label || x.kind} at ${x.x.toFixed(2)}, ${x.y.toFixed(2)} m`, onClick: () => onSel(on ? null : x.id), onKeyDown: (e: RKE) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSel(on ? null : x.id); } } } : { 'aria-hidden': true })}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={x.kind === 'chair' ? 2 : 1.5} /></g>; })}
    </svg>
    {o && movable(o) ? <div className="lt-plan2__fields" data-testid="lite-arr-fields">
      <label>Across (m)<input type="number" step="0.05" value={o.x.toFixed(2)} onChange={(e) => setAbs('x', Number(e.target.value))} data-testid="lite-arr-x" /></label>
      <label>From the front wall (m)<input type="number" step="0.05" value={o.y.toFixed(2)} onChange={(e) => setAbs('y', Number(e.target.value))} data-testid="lite-arr-y" /></label>
      <label>Turned (°)<input type="number" step="5" value={angleOf(o)} onChange={(e) => setAbs('rot', Number(e.target.value))} data-testid="lite-arr-rot" /></label>
    </div> : <p className="ui-meta">Select something here or in the 3D room to place it to the centimetre.</p>}
    <p className="ui-meta" data-testid="lite-arr-cover">{A.seats} seats: {A.cam} in a camera view, {A.mic} in primary microphone pickup with this arrangement · modelled from the layout, not measured</p>
  </section>;
}
