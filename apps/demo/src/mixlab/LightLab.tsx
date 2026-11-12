/**
 * Light the Stage (#/labs/light): SIGNAL's lighting flagship lab. Hang fixtures by dragging them between positions on the plot, patch
 * them in one DMX universe, aim, zoom, colour and level them, and see the beams, the faces and the screen react at once. Results stay
 * in this browser: practice, never a credential.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { PageProps } from '../registry.types.js';
import * as L from './light.js';
import { Knob, useClock } from './controls.js';

const KEY = 'empathia.lightlab.v1';
interface State { hung: L.Hung[]; levels: Record<L.Look, Record<number, number>>; best: Record<string, number> }
const fresh = (): State => { const r = L.freshRig(); return { hung: r.hung, levels: { sermon: Object.fromEntries(r.hung.map((h) => [h.id, h.level])), worship: Object.fromEntries(r.hung.map((h) => [h.id, h.level])) }, best: {} }; };
const read = (): State => { try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && Array.isArray(x.hung) && x.levels) return x; } catch { /* storage may be blocked */ } return fresh(); };
/** Colour of a white light at a colour temperature (an approximation good enough to see warm against cool). */
export function kelvinRgb(k: number): [number, number, number] { const t = k / 100; const r = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332; const g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * (t - 60) ** -0.0755; const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305;
  return [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x)))) as [number, number, number]; }
const hueRgb = (h: number): [number, number, number] => { const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
const colorOf = (h: L.Hung) => (L.FIXTURES[h.kind].color === 'rgb' || (L.FIXTURES[h.kind].color === 'both' && h.hue > 0) ? hueRgb(h.hue) : kelvinRgb(h.cct));
const HELP: Record<string, [string, string]> = {
  plot: ['The lighting plot', 'Drag a fixture between hanging positions. Front positions light faces; back positions draw a rim; side booms shape; the floor washes the back wall.'],
  addr: ['DMX start address', 'A universe has 512 channels. A fixture takes its start address and the next (footprint − 1). The next fixture must start after it ends.'],
  level: ['Intensity', 'How bright the fixture is, 0–100 %. Faces for camera want about 800–1600 lux.'],
  cct: ['Colour temperature', 'Warm (low kelvin) to cool (high kelvin). Compare two whites in mireds (1 000 000 ÷ K): more than about 300 K apart reads as two colours on camera.'],
  zoom: ['Beam angle (zoom)', 'A narrower beam puts the same light into a smaller circle: more lux on the face, less spill. Beam diameter = 2 × distance × tan(angle ÷ 2).'],
  hue: ['Colour', 'The colour a wash fixture mixes from its red, green, blue and white emitters.'],
  target: ['Focus', 'What the fixture is aimed at.'],
};

export default function LightLabPage(_p: PageProps) { return <section className="stack" data-native="" data-testid="lightlab-page"><LightLab /></section>; }
export function LightLab({ embedded, onResult }: { embedded?: boolean; onResult?: (key: string, score: number, passed: boolean) => void } = {}) {
  const [st, setSt] = useState<State>(read); const [look, setLook] = useState<L.Look>('sermon'); const [sel, setSel] = useState<number>(st.hung[0]?.id ?? 0); const [help, setHelp] = useState('plot'); const [said, setSaid] = useState('');
  const save = (n: State) => { setSt(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* the lab still works without storage */ } };
  const rig: L.Rig = useMemo(() => ({ hung: st.hung.map((h) => ({ ...h, level: st.levels[look][h.id] ?? h.level })) }), [st, look]);
  const a = useMemo(() => L.analyseRig(rig), [rig]); const gs = L.lightGoals(rig, a, look); const sc = L.lightScore(gs);
  const upd = (id: number, p: Partial<L.Hung>) => save({ ...st, hung: st.hung.map((h) => (h.id === id ? { ...h, ...p } : h)) });
  const setLevel = (id: number, v: number) => save({ ...st, levels: { ...st.levels, [look]: { ...st.levels[look], [id]: v } } });
  const add = (kind: L.FxKind) => { const used = new Set(st.hung.map((h) => h.pos)); const free = L.POSITIONS.find((p) => !used.has(p.key)); if (!free) { setSaid('Every position is used. Move or remove a fixture first.'); return; }
    const id = Math.max(0, ...st.hung.map((h) => h.id)) + 1; const h: L.Hung = { id, kind, pos: free.key, addr: 1, target: free.y < 0 ? 'band' : 'pastor', level: 60, cct: 4300, hue: kind === 'par' || kind === 'batten' ? 200 : 0, zoom: L.FIXTURES[kind].zoom ? L.FIXTURES[kind].beam : L.FIXTURES[kind].beam };
    save({ ...st, hung: [...st.hung, h], levels: { sermon: { ...st.levels.sermon, [id]: 60 }, worship: { ...st.levels.worship, [id]: 60 } } }); setSel(id); setSaid(`#${id} ${L.FIXTURES[kind].label} hung at ${free.label}, patched at 1: give it its own address.`); setHelp('addr'); };
  const t = useClock(12); const h = rig.hung.find((x) => x.id === sel) || null;
  const check = () => { const best = { ...st.best, [look]: Math.max(st.best[look] || 0, sc) }; save({ ...st, best }); setSaid(`${look === 'sermon' ? 'Sermon' : 'Worship'} look: ${sc} of 100${sc >= 75 ? ' — passed.' : '. 75 passes; the goals in red say what is left.'}`); onResult?.('rig', Math.round(L.LOOKS.reduce((p, x) => p + (best[x.key] || 0), 0) / L.LOOKS.length), L.LOOKS.every((x) => (best[x.key] || 0) >= 75)); };
  const P = rig.hung.find((x) => x === a.key); const Pd = P ? Math.hypot(...(['x', 'y', 'z'] as const).map((k) => L.POSITIONS.find((p) => p.key === P.pos)![k] - L.SUBJECTS[0]![k])) : 0;
  return <div className={`mx lx${embedded ? ' mx--embedded' : ''}`} data-testid="lightlab" data-look={look} data-score={sc}>
    <header className="mx-head"><div><p className="mx-kicker">SIGNAL flagship lab · Lighting · Season 1, Episode 5</p><h2 className="mx-title">Light the Stage</h2>
      <p className="mx-lede">Hang the fixtures, patch them in one DMX universe, aim and zoom them, set the colour and the level, and light a sermon and a worship set for the room and the camera. Drag fixtures on the plot; the beams, the faces and the screen answer at once.</p>
      <p className="mx-note">A teaching model: inverse-square and cosine laws, beam angles and colour temperature in mireds. Not a measurement, not any maker’s fixture. Results stay in this browser.</p></div>
      <div className="mx-score" data-testid="lx-score"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" className="mx-score__bg" /><circle cx="18" cy="18" r="15.5" className="mx-score__fg" style={{ strokeDasharray: `${sc * 0.974} 100`, stroke: sc >= 75 ? '#22c55e' : sc >= 50 ? '#f59e0b' : '#ef4444' }} /></svg><b>{sc}</b><span>look score</span></div></header>
    <div className="mx-scenes" role="group" aria-label="Looks">{L.LOOKS.map((x) => <button key={x.key} type="button" className={`mx-scene${look === x.key ? ' on' : ''}${(st.best[x.key] || 0) >= 75 ? ' done' : ''}`} aria-pressed={look === x.key} onClick={() => setLook(x.key)} data-testid={`lx-look-${x.key}`} title={x.says}>{x.label}{st.best[x.key] != null ? <em>{st.best[x.key]}</em> : null}</button>)}
      <button type="button" className="mx-btn mx-btn--go" onClick={check} data-testid="lx-check">Check this look</button><button type="button" className="mx-btn" onClick={() => { save(fresh()); setSel(1); setSaid('The rig is back as it was handed over.'); }}>Reset rig</button></div>
    <p className="mx-said" role="status" data-testid="lx-said">{said || L.LOOKS.find((x) => x.key === look)!.says}</p>
    <div className="mx-stage"><div className="mx-roomwrap"><StageView rig={rig} a={a} t={t} sel={sel} /><Plot rig={rig} sel={sel} onSel={(id) => { setSel(id); setHelp('plot'); }} onMove={(id, p) => upd(id, { pos: p })} /></div>
      <ul className="mx-goals" data-testid="lx-goals">{gs.map((g) => <li key={g.key} className={g.ok ? 'ok' : 'no'} data-goal={g.key} data-ok={g.ok}><b>{g.ok ? '✓' : '✕'} {g.label}</b><span>{g.value}</span><small>{g.why}</small></li>)}</ul></div>
    <section className="mx-console" aria-label="Patch and fixtures"><div className="mx-layers"><b>Add a fixture:</b>{(Object.keys(L.FIXTURES) as L.FxKind[]).map((k) => <button key={k} type="button" className="mx-layer" onClick={() => add(k)} title={L.FIXTURES[k].says} data-testid={`lx-add-${k}`}>+ {L.FIXTURES[k].label}</button>)}<span className="mx-layers__k">universe 1 · {Math.max(0, ...rig.hung.map(L.lastAddr))} of 512 channels used</span></div>
      <div className="lx-patch" data-testid="lx-patch">{rig.hung.map((x) => { const bad = a.coll.some(([p, q]) => p === x.id || q === x.id); const T = L.FIXTURES[x.kind];
        return <div key={x.id} className={`lx-row${x.id === sel ? ' sel' : ''}${bad ? ' bad' : ''}`} data-testid={`lx-fx-${x.id}`} onPointerDownCapture={() => setSel(x.id)}>
          <b style={{ color: `rgb(${colorOf(x).join(',')})` }}>#{x.id} {T.label}</b><span className="mx-dim">{L.POSITIONS.find((p) => p.key === x.pos)!.label}</span>
          <Knob label={`#${x.id} start address`} value={x.addr} min={1} max={512} onChange={(v) => upd(x.id, { addr: v })} fmt={(v) => `${v}–${v + T.footprint - 1}`} color={bad ? '#ef4444' : '#22c55e'} onHelp={() => setHelp('addr')} testId={`lx-addr-${x.id}`} />
          <Knob label={`#${x.id} intensity`} value={x.level} min={0} max={100} onChange={(v) => setLevel(x.id, v)} fmt={(v) => `${v}%`} color="#f59e0b" onHelp={() => setHelp('level')} testId={`lx-level-${x.id}`} />
          {T.color !== 'rgb' && <Knob label={`#${x.id} colour temperature`} value={x.cct} min={2700} max={6500} step={100} onChange={(v) => upd(x.id, { cct: v })} fmt={(v) => `${v} K`} color={`rgb(${kelvinRgb(x.cct).join(',')})`} onHelp={() => setHelp('cct')} />}
          {T.color !== 'white' && <Knob label={`#${x.id} colour`} value={x.hue} min={0} max={359} onChange={(v) => upd(x.id, { hue: v })} fmt={(v) => `${v}°`} color={`hsl(${x.hue} 90% 55%)`} onHelp={() => setHelp('hue')} />}
          {T.zoom && <Knob label={`#${x.id} zoom`} value={x.zoom} min={T.zoom[0]} max={T.zoom[1]} onChange={(v) => upd(x.id, { zoom: v })} fmt={(v) => `${v}°`} color="#38bdf8" onHelp={() => setHelp('zoom')} testId={`lx-zoom-${x.id}`} />}
          <label className="lx-sel"><span className="mx-dim">focus</span><select value={x.target} onChange={(e) => { upd(x.id, { target: e.target.value }); setHelp('target'); }} data-testid={`lx-target-${x.id}`}>{L.SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
          <button type="button" className="mx-tog" onClick={() => save({ ...st, hung: st.hung.filter((y) => y.id !== x.id) })} aria-label={`Remove #${x.id}`}>✕</button>
        </div>; })}</div></section>
    <div className="mx-two">
      <section className="mx-calc" aria-label="The formulas, with this rig's numbers" data-testid="lx-calc"><h3>The formulas, with your numbers</h3><dl>
        {h && <div><dt>Footprint <code>last = start + footprint − 1</code></dt><dd>#{h.id}: {h.addr} + {L.FIXTURES[h.kind].footprint} − 1 = {L.lastAddr(h)}</dd></div>}
        {h && <div><dt>Candela <code>I = lm / 2π(1 − cos(θ/2))</code></dt><dd>{L.FIXTURES[h.kind].lumens} lm at {L.beamOf(h)}° → {Math.round(L.candela(L.FIXTURES[h.kind].lumens, L.beamOf(h)))} cd at full</dd></div>}
        {P && <div><dt>Illuminance (key) <code>E = I cos α / d²</code></dt><dd>{Math.round(Pd * 10) / 10} m to the face → {Math.round(L.lux(P, L.SUBJECTS[0]!))} lux at {P.level}%</dd></div>}
        {P && <div><dt>Beam diameter <code>D = 2 d tan(θ/2)</code></dt><dd>{Math.round(L.beamDiameter(Pd, L.beamOf(P)) * 10) / 10} m wide at the pastor</dd></div>}
        <div><dt>Colour match <code>Δ mired = 10⁶/K₁ − 10⁶/K₂</code></dt><dd>{a.cctGap} K apart between the front whites</dd></div></dl></section>
      <section className="mx-help" aria-live="polite" data-testid="lx-help"><h3>{HELP[help]![0]}</h3><p>{HELP[help]![1]}</p>{h && <p className="mx-dim">{L.FIXTURES[h.kind].says}</p>}</section></div>
  </div>;
}

/** The stage seen from the house: additive beams in each fixture's colour, faces lit by their lux, the screen washed by any spill. */
function StageView({ rig, a, t, sel }: { rig: L.Rig; a: L.LightAnalysis; t: number; sel: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = cv.current; if (!c) return; const dpr = Math.min(2, window.devicePixelRatio || 1); const cw = c.clientWidth || 600, ch = cw * 0.55;
    if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); } c.style.height = `${ch}px`; const g = c.getContext('2d'); if (!g) return; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const X = (x: number, y: number) => cw / 2 + (x - 6) * (cw / 16) * (1 - Math.max(-0.3, Math.min(0.5, -y / 14))), Z = (z: number, y: number) => ch - 20 - z * (ch / 9.5) * (1 - Math.max(-0.3, Math.min(0.5, -y / 14)));
    g.fillStyle = '#04060b'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#141b2c'; g.fillRect(0, Z(0, 0), cw, ch - Z(0, 0));
    const sp = a.spill.length; const S = L.SCREEN; g.fillStyle = sp ? `rgba(255,255,240,${0.55 + 0.1 * Math.sin(t * 3)})` : '#1d4ed8'; g.fillRect(X(S.x0, S.y), Z(S.z1, S.y), X(S.x1, S.y) - X(S.x0, S.y), Z(S.z0, S.y) - Z(S.z1, S.y));
    g.fillStyle = sp ? '#3f3f46' : '#e0e7ff'; g.font = '12px system-ui'; g.fillText(sp ? 'screen washed out' : 'screen', X(S.x0, S.y) + 8, Z(S.z1, S.y) + 18);
    g.globalCompositeOperation = 'lighter';
    for (const h of rig.hung) { if (h.level <= 0) continue; const p = L.POSITIONS.find((q) => q.key === h.pos)!, s = L.SUBJECTS.find((q) => q.key === h.target)!; const d = Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z); const r = (L.beamDiameter(d, L.beamOf(h)) / 2) * (cw / 16);
      const [cr, cg, cb] = colorOf(h); const x0 = X(p.x, p.y), y0 = Z(p.z, p.y), x1 = X(s.x, s.y), y1 = Z(s.z - 0.6, s.y); const al = (h.level / 100) * (h.id === sel ? 0.42 : 0.28) * (0.9 + 0.1 * Math.sin(t * 2 + h.id));
      const grd = g.createLinearGradient(x0, y0, x1, y1); grd.addColorStop(0, `rgba(${cr},${cg},${cb},${al})`); grd.addColorStop(1, `rgba(${cr},${cg},${cb},${al * 0.35})`);
      const ang = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2; g.fillStyle = grd; g.beginPath(); g.moveTo(x0 - 3 * Math.cos(ang), y0 - 3 * Math.sin(ang)); g.lineTo(x1 - r * Math.cos(ang), y1 - r * Math.sin(ang)); g.lineTo(x1 + r * Math.cos(ang), y1 + r * Math.sin(ang)); g.lineTo(x0 + 3 * Math.cos(ang), y0 + 3 * Math.sin(ang)); g.closePath(); g.fill();
      g.fillStyle = `rgba(${cr},${cg},${cb},${al * 1.6})`; g.beginPath(); g.ellipse(x1, Z(0, s.y), r, r * 0.22, 0, 0, Math.PI * 2); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    L.SUBJECTS.forEach((s, si) => { const lx = a.at[s.key] || 0; const v = Math.max(0.12, Math.min(1, Math.log10(1 + lx) / 3.2)); const x = X(s.x, s.y), y = Z(0, s.y), hh = (s.z + 0.2) * (ch / 9.5);
      g.fillStyle = `rgba(${Math.round(240 * v)},${Math.round(200 * v)},${Math.round(170 * v)},1)`; g.beginPath(); g.arc(x, y - hh + 9, 9, 0, Math.PI * 2); g.fill(); g.fillRect(x - 10, y - hh + 18, 20, hh - 18);
      g.fillStyle = '#cbd5e1'; g.font = '11px system-ui'; g.fillText(`${s.label.split(' ')[0]} ${lx} lx`, x - 30, Math.min(ch - 4, y + 14 + si * 13)); });
    for (const p of L.POSITIONS) { g.fillStyle = rig.hung.some((h) => h.pos === p.key) ? '#f8fafc' : '#334155'; g.fillRect(X(p.x, p.y) - 4, Z(p.z, p.y) - 4, 8, 8); }
  }, [rig, a, t, sel]);
  return <canvas ref={cv} className="mx-room" data-testid="lx-stage" role="img" aria-label={`The stage from the house: ${L.SUBJECTS.map((s) => `${s.label} ${a.at[s.key]} lux`).join(', ')}${a.spill.length ? '; light is landing on the screen' : ''}.`} />;
}

/** The plot from above: drag a hung fixture to another position. */
function Plot({ rig, sel, onSel, onMove }: { rig: L.Rig; sel: number; onSel: (id: number) => void; onMove: (id: number, pos: string) => void }) {
  const ref = useRef<SVGSVGElement>(null); const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const VX = (x: number) => ((x + 2) / 16) * 100, VY = (y: number) => ((8 - y) / 15) * 60;
  const at = (e: PointerEvent<Element>) => { const b = ref.current!.getBoundingClientRect(); return { x: ((e.clientX - b.left) / b.width) * 100, y: ((e.clientY - b.top) / b.height) * 60 }; };
  const drop = (e: PointerEvent<Element>) => { if (!drag) return; const q = at(e); const near = L.POSITIONS.map((p) => ({ p, d: Math.hypot(VX(p.x) - q.x, VY(p.y) - q.y) })).sort((u, v) => u.d - v.d)[0]!;
    if (near.d < 8 && !rig.hung.some((h) => h.pos === near.p.key && h.id !== drag.id)) onMove(drag.id, near.p.key); setDrag(null); };
  return <svg ref={ref} viewBox="0 0 100 60" className="lx-plot" data-testid="lx-plot" onPointerMove={(e) => drag && setDrag({ ...drag, ...at(e) })} onPointerUp={drop} onPointerLeave={() => setDrag(null)} role="group" aria-label="Lighting plot: drag a fixture to another position">
    <rect x={VX(0)} y={VY(0)} width={VX(12) - VX(0)} height={VY(-6) - VY(0)} className="lx-stagerect" /><text x={VX(0) + 1} y={VY(0) + 3} className="mx-eq__t">stage</text>
    <rect x={VX(L.SCREEN.x0)} y={VY(L.SCREEN.y) - 1} width={VX(L.SCREEN.x1) - VX(L.SCREEN.x0)} height={1.2} fill="#3b82f6" />
    {L.SUBJECTS.map((s) => <g key={s.key}><circle cx={VX(s.x)} cy={VY(s.y)} r={1.6} fill="#fcd34d" /><text x={VX(s.x) + 2} y={VY(s.y) + 1} className="mx-eq__t">{s.label.split(' ')[0]}</text></g>)}
    {L.POSITIONS.map((p) => <g key={p.key}><rect x={VX(p.x) - 2} y={VY(p.y) - 2} width={4} height={4} rx={0.6} className="lx-slot" /><title>{p.label}</title></g>)}
    {rig.hung.map((h) => { const p = L.POSITIONS.find((q) => q.key === h.pos)!; const s = L.SUBJECTS.find((q) => q.key === h.target)!; const x = drag?.id === h.id ? drag.x : VX(p.x), y = drag?.id === h.id ? drag.y : VY(p.y); const [r, g, b] = colorOf(h);
      return <g key={h.id} className={`lx-fx${h.id === sel ? ' sel' : ''}`} tabIndex={0} role="button" aria-label={`#${h.id} ${L.FIXTURES[h.kind].label} at ${p.label}; drag to move`} data-testid={`lx-plot-${h.id}`}
        onPointerDown={(e) => { (ref.current as SVGSVGElement).setPointerCapture(e.pointerId); onSel(h.id); setDrag({ id: h.id, ...at(e) }); }}>
        <line x1={x} y1={y} x2={VX(s.x)} y2={VY(s.y)} stroke={`rgb(${r},${g},${b})`} strokeWidth={0.4} opacity={h.level / 100} />
        <circle cx={x} cy={y} r={2.6} fill={`rgb(${r},${g},${b})`} stroke="#fff" strokeWidth={h.id === sel ? 0.8 : 0.3} /><text x={x} y={y + 1} className="mx-eq__n">{h.id}</text></g>; })}
  </svg>;
}
