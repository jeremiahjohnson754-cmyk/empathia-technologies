/**
 * The mix lab's pictures: the room seen from above with every loudspeaker group sending out its waves in its own colour and the sound
 * pressure lighting up the seats; live spectra; and the EQ and compressor drawn as curves you can grab.
 */
import { useEffect, useMemo, useRef, type PointerEvent } from 'react';
import { BANDS, BAND_LABEL, NB, A_WEIGHT, SOURCES, OFF, compOut, dbSum, eqCurve, spread, dist3, SPEED, criticalDistance, round1, type Analysis, type Mix, type Room, type SpeakerGroup, type Strip } from './model.js';
import { reducedMotion } from './controls.js';

/** One colour per loudspeaker kind, and per band (lows warm, highs cool). */
export const GROUP_COLOR: Record<SpeakerGroup['kind'], string> = { sub: '#8b5cf6', main: '#22d3ee', array: '#06b6d4', center: '#facc15', front: '#fb923c', delay: '#34d399', wedge: '#f472b6' };
export const BAND_COLOR = ['#7c3aed', '#9333ea', '#dc2626', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6'];
const heat = (v: number) => { const x = Math.max(0, Math.min(1, v)); const h = 260 - 260 * x; return `hsla(${h}, 95%, ${45 + x * 12}%, ${0.18 + x * 0.5})`; };
export interface Seat { x: number; y: number; dba: number; arrivals: Array<{ label: string; ms: number; db: number; color: string }> }
/** The level (dB(A)) every group delivers to a point, and when each arrives (its distance over the speed of sound, plus its delay). */
export function seatAt(r: Room, m: Mix, a: Analysis, x: number, y: number): Seat {
  const arrivals: Seat['arrivals'] = []; const parts: number[] = [];
  for (const g of r.groups) { if (g.kind === 'wedge') continue;
    const bands = BANDS.map((_, b) => (b >= g.bands[0] && b <= g.bands[1] ? (g.kind === 'sub' ? a.main[b]! + m.sub : a.main[b]!) + g.ref + spread(g, x, y, r.dims[1]) + A_WEIGHT[b]! : -200));
    const lv = dbSum(bands); parts.push(lv); arrivals.push({ label: g.label, ms: round1((dist3(g, x, y) / SPEED) * 1000 + (m.delays[g.key] || 0)), db: round1(lv), color: GROUP_COLOR[g.kind] });
  }
  return { x, y, dba: round1(dbSum(parts)), arrivals: arrivals.sort((p, q) => p.ms - q.ms) };
}

/** The room from above: the stage at the top, the waves from each group, the seats lit by sound pressure, the critical-distance ring. */
export function RoomView({ r, m, a, t, seat, onSeat, solo }: { r: Room; m: Mix; a: Analysis; t: number; seat: Seat | null; onSeat: (s: Seat) => void; solo: string | null }) {
  const cv = useRef<HTMLCanvasElement>(null); const [W, L] = r.dims; const ratio = L / W; const motion = !reducedMotion();
  const grid = useMemo(() => { const nx = 28, ny = Math.round(28 * ratio); const cells: number[] = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = ((i + 0.5) / nx) * W, y = ((j + 0.5) / ny) * L;
      cells.push(dbSum(r.groups.filter((g) => g.kind !== 'wedge' && (!solo || g.key === solo)).map((g) => dbSum(BANDS.map((_, b) => (b >= g.bands[0] && b <= g.bands[1] ? (g.kind === 'sub' ? a.main[b]! + m.sub : a.main[b]!) + g.ref + spread(g, x, y, L) + A_WEIGHT[b]! : -200)))))); }
    return { nx, ny, cells }; }, [r, m, a, solo, ratio, W, L]);
  useEffect(() => {
    const c = cv.current; if (!c) return; const dpr = Math.min(2, window.devicePixelRatio || 1); const cw = c.clientWidth || 600, ch = cw * Math.min(1.3, ratio);
    if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); } c.style.height = `${ch}px`;
    const g = c.getContext('2d'); if (!g) return; g.setTransform(dpr, 0, 0, dpr, 0, 0); const sx = cw / W, sy = ch / L;
    g.fillStyle = '#05070c'; g.fillRect(0, 0, cw, ch);
    // sound pressure on the seats
    const target = r.targetDbA; const cwid = cw / grid.nx, chei = ch / grid.ny;
    grid.cells.forEach((v, k) => { const i = k % grid.nx, j = Math.floor(k / grid.nx); if (j * chei < sy * 2.6) return; g.fillStyle = heat((v - (target - 18)) / 24); g.fillRect(i * cwid, j * chei, cwid + 0.5, chei + 0.5); });
    // stage, balcony, mix position, critical distance
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, cw, sy * 2.4); g.fillStyle = '#cbd5e1'; g.font = '11px system-ui, sans-serif'; g.fillText('STAGE', 8, 14);
    if (r.balcony) { g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(0, r.balcony * sy); g.lineTo(cw, r.balcony * sy); g.stroke(); g.setLineDash([]); g.fillText('balcony above', 8, r.balcony * sy - 4); }
    const dc = criticalDistance(r); g.strokeStyle = 'rgba(250,204,21,.55)'; g.setLineDash([3, 4]); g.beginPath(); g.ellipse(W / 2 * sx, 2 * sy, dc * sx, dc * sy, 0, 0, Math.PI); g.stroke(); g.setLineDash([]); g.fillStyle = '#facc15'; g.fillText(`critical distance ${round1(dc)} m`, Math.min(cw - 140, W / 2 * sx + 6), 2 * sy + dc * sy - 4);
    g.fillStyle = '#fff'; g.fillRect(r.foh[0] * sx - 9, r.foh[1] * sy - 5, 18, 10); g.fillStyle = '#05070c'; g.font = 'bold 8px system-ui'; g.fillText('MIX', r.foh[0] * sx - 8, r.foh[1] * sy + 3);
    // waves: each group pulses at a rate set by its lowest band, brighter the harder it is driven
    for (const sp of r.groups) { if (solo && sp.key !== solo && sp.kind !== 'wedge') continue;
      const drive = sp.kind === 'wedge' ? Math.max(OFF, ...m.strips.map((s) => (s.mute ? OFF : s.wedge[Number(sp.key.slice(1)) - 1] ?? OFF))) + 20 : dbSum(a.main.slice(sp.bands[0], sp.bands[1] + 1)) + 20 + (sp.kind === 'sub' ? m.sub : 0);
      const lvl = Math.max(0, Math.min(1, (drive + 20) / 30)); const col = GROUP_COLOR[sp.kind]; const px = sp.x * sx, py = sp.y * sy; const maxR = Math.hypot(cw, ch) * (sp.kind === 'wedge' ? 0.12 : 0.9);
      if (lvl > 0.02) { const rate = sp.kind === 'sub' ? 0.35 : sp.kind === 'wedge' ? 0.9 : 0.6; const n = 5;
        for (let k = 0; k < n; k++) { const ph = motion ? (t * rate + k / n) % 1 : (k + 0.5) / n; const rad = ph * maxR;
          g.strokeStyle = col; g.globalAlpha = (1 - ph) * lvl * 0.9; g.lineWidth = sp.kind === 'sub' ? 4 : 2;
          g.beginPath(); g.arc(px, py, rad, sp.aim - sp.spread - 0.2, sp.aim + sp.spread + 0.2); g.stroke(); } g.globalAlpha = 1; }
      g.fillStyle = col; g.strokeStyle = '#05070c'; g.lineWidth = 1.5; const s = sp.kind === 'sub' ? 9 : sp.kind === 'array' ? 8 : 6;
      if (sp.kind === 'array') { for (let k = 0; k < 4; k++) { g.fillRect(px - s, py - s + k * 4, s * 2, 3); } } else { g.beginPath(); g.rect(px - s / 1.4, py - s / 1.4, s * 1.4, s * 1.4); g.fill(); g.stroke(); }
    }
    // feedback: a mic that is ringing flashes red
    for (const f of a.feedback.filter((x) => x.margin < 0)) { const pulse = motion ? 0.5 + 0.5 * Math.sin(t * 12) : 1; g.fillStyle = `rgba(239,68,68,${0.35 + pulse * 0.5})`; g.beginPath(); g.arc(cw / 2 + ((f.i % 7) - 3) * 14, sy * 1.2, 7, 0, Math.PI * 2); g.fill(); }
    if (seat) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(seat.x * sx, seat.y * sy, 7, 0, Math.PI * 2); g.stroke(); }
  }, [grid, t, r, m, a, seat, solo, ratio, W, L, motion]);
  const click = (e: PointerEvent<HTMLCanvasElement>) => { const b = e.currentTarget.getBoundingClientRect(); onSeat(seatAt(r, m, a, ((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * L)); };
  return <canvas ref={cv} className="mx-room" onPointerDown={click} data-testid="mx-room" role="img" aria-label={`${r.name} from above: loudspeaker waves and the sound pressure on the seats. Select a seat to read its level and arrival times.`} />;
}

/** A live spectrum (octave bands), optionally against a target, with a little movement so it reads as live. */
export function Spectrum({ bands, t, target, label, h = 120, testId }: { bands: number[]; t: number; target?: number[]; label: string; h?: number; testId?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = cv.current; if (!c) return; const dpr = Math.min(2, window.devicePixelRatio || 1); const cw = c.clientWidth || 300;
    if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(h * dpr); } const g = c.getContext('2d'); if (!g) return; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#05070c'; g.fillRect(0, 0, cw, h); const top = Math.max(...bands) + 6; const y = (v: number) => Math.max(0, Math.min(h - 14, ((top - v) / 60) * (h - 14)));
    g.strokeStyle = 'rgba(255,255,255,.08)'; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(0, (k * (h - 14)) / 6); g.lineTo(cw, (k * (h - 14)) / 6); g.stroke(); }
    const bw = cw / NB; bands.forEach((v, b) => { const j = Math.sin(t * 9 + b * 1.7) * 1.4 + Math.sin(t * 3.1 + b) * 0.9; const yy = y(v + j);
      const grd = g.createLinearGradient(0, yy, 0, h - 14); grd.addColorStop(0, BAND_COLOR[b]!); grd.addColorStop(1, 'rgba(255,255,255,.05)'); g.fillStyle = grd; g.fillRect(b * bw + 3, yy, bw - 6, h - 14 - yy);
      g.fillStyle = '#94a3b8'; g.font = '10px system-ui'; g.fillText(BAND_LABEL[b]!, b * bw + 4, h - 3); });
    if (target) { g.strokeStyle = '#fff'; g.setLineDash([4, 3]); g.beginPath(); target.forEach((v, b) => { const xx = b * bw + bw / 2; if (b) g.lineTo(xx, y(v)); else g.moveTo(xx, y(v)); }); g.stroke(); g.setLineDash([]); }
  }, [bands, t, target, h]);
  return <canvas ref={cv} className="mx-spec" style={{ height: h }} data-testid={testId} role="img" aria-label={`${label}: ${bands.map((v, b) => `${BAND_LABEL[b]} ${Math.round(v)} dB`).join(', ')}`} />;
}

const FX = (f: number) => (Math.log10(f / 20) / Math.log10(1000)) * 100; const XF = (x: number) => 20 * 1000 ** (x / 100);
/** The channel's EQ as a curve: drag a numbered node for frequency and gain, scroll on it for Q; drag the HP handle for the high-pass. */
export function EqGraph({ s, set, onHelp }: { s: Strip; set: (p: Partial<Strip>) => void; onHelp: (k: string) => void }) {
  const ref = useRef<SVGSVGElement>(null); const drag = useRef<number | null>(null); const Y = (g: number) => 50 - (g / 18) * 45;
  const pts = Array.from({ length: 101 }, (_, i) => `${i},${Y(eqCurve(s, XF(i)))}`).join(' ');
  const at = (e: PointerEvent<SVGSVGElement>) => { const b = ref.current!.getBoundingClientRect(); return [((e.clientX - b.left) / b.width) * 100, ((e.clientY - b.top) / b.height) * 100] as const; };
  const move = (e: PointerEvent<SVGSVGElement>) => { const k = drag.current; if (k == null) return; const [x, y] = at(e); const f = Math.round(Math.min(18000, Math.max(20, XF(x))));
    if (k === -1) { set({ hpf: f < 25 ? 0 : Math.min(400, f) }); return; } const g = Math.round(Math.max(-15, Math.min(15, ((50 - y) / 45) * 18)) * 2) / 2; set({ eq: s.eq.map((b, i) => (i === k ? { ...b, f, g } : b)) }); };
  return <svg ref={ref} className="mx-eq" viewBox="0 0 100 100" preserveAspectRatio="none" onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)} data-testid="mx-eq" role="group" aria-label={`EQ of ${s.name}`}>
    {[100, 1000, 10000].map((f) => <line key={f} x1={FX(f)} x2={FX(f)} y1={0} y2={100} className="mx-grid" />)}<line x1={0} x2={100} y1={50} y2={50} className="mx-grid mx-grid--0" />
    {BANDS.map((f, b) => <rect key={f} x={FX(f) - 0.4} width={0.8} y={0} height={100} fill={BAND_COLOR[b]} opacity={0.18} />)}
    <polyline points={`0,100 ${pts} 100,100`} className="mx-eq__fill" /><polyline points={pts} className="mx-eq__line" />
    <g className="mx-eq__hp" onPointerDown={(e) => { (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId); drag.current = -1; onHelp('hpf'); }}><rect x={s.hpf ? FX(s.hpf) - 3 : 0} y={84} width={6} height={14} rx={1} /><text x={s.hpf ? FX(s.hpf) : 3} y={82} className="mx-eq__t">HP{s.hpf ? ` ${s.hpf}` : ''}</text></g>
    {s.eq.map((b, i) => <g key={i} className="mx-eq__node" tabIndex={0} role="slider" aria-label={`EQ band ${i + 1}: ${b.f} Hz, ${b.g} dB, Q ${b.q}`} aria-valuenow={b.g} aria-valuemin={-15} aria-valuemax={15} data-testid={`mx-eq-node-${i}`}
      onPointerDown={(e) => { (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId); drag.current = i; onHelp('eq'); }}
      onWheel={(e) => { e.preventDefault(); set({ eq: s.eq.map((x, j) => (j === i ? { ...x, q: Math.max(0.3, Math.min(10, round1(x.q * (e.deltaY < 0 ? 1.2 : 1 / 1.2)))) } : x)) }); }}
      onKeyDown={(e) => { const d: Record<string, [number, number]> = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowRight: [1, 0], ArrowLeft: [-1, 0] }; const v = d[e.key]; if (!v) return; e.preventDefault();
        set({ eq: s.eq.map((x, j) => (j === i ? { ...x, f: Math.round(Math.min(18000, Math.max(20, x.f * 2 ** (v[0] / 6)))), g: Math.max(-15, Math.min(15, x.g + v[1])) } : x)) }); }}>
      <circle cx={FX(b.f)} cy={Y(b.g)} r={4} fill={BAND_COLOR[[0, 3, 6, 8][i]!]} /><text x={FX(b.f)} y={Y(b.g) + 1.6} className="mx-eq__n">{i + 1}</text></g>)}
    <text x={1} y={8} className="mx-eq__t">+18</text><text x={1} y={97} className="mx-eq__t">−18 dB</text>
  </svg>;
}

/** The compressor's transfer curve: the input level on the bottom, the output up the side; drag the knee to set the threshold. */
export function CompGraph({ s, set, inDb, onHelp }: { s: Strip; set: (p: Partial<Strip>) => void; inDb: number; onHelp: (k: string) => void }) {
  const ref = useRef<SVGSVGElement>(null); const drag = useRef(false); const P = (db: number) => ((db + 60) / 60) * 100;
  const line = Array.from({ length: 61 }, (_, i) => { const x = i - 60; const y = s.comp.on ? compOut(x, s.comp.thr, s.comp.ratio) : x; return `${P(x)},${100 - P(y)}`; }).join(' ');
  const move = (e: PointerEvent<SVGSVGElement>) => { if (!drag.current) return; const b = ref.current!.getBoundingClientRect(); const thr = Math.round(Math.max(-50, Math.min(0, ((e.clientX - b.left) / b.width) * 60 - 60))); set({ comp: { ...s.comp, thr, on: true } }); };
  const outDb = s.comp.on ? compOut(inDb, s.comp.thr, s.comp.ratio) : inDb;
  return <svg ref={ref} className="mx-comp" viewBox="0 0 100 100" onPointerMove={move} onPointerUp={() => (drag.current = false)} onPointerLeave={() => (drag.current = false)} data-testid="mx-comp" role="group" aria-label={`Compressor of ${s.name}: threshold ${s.comp.thr} dB, ratio ${s.comp.ratio} to 1`}>
    <line x1={0} y1={100} x2={100} y2={0} className="mx-grid" /><polyline points={line} className="mx-eq__line" />
    <circle cx={P(s.comp.thr)} cy={100 - P(s.comp.thr)} r={4} className="mx-comp__knee" tabIndex={0} onPointerDown={(e) => { (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId); drag.current = true; onHelp('comp'); }} data-testid="mx-comp-knee" />
    <circle cx={P(Math.max(-60, inDb))} cy={100 - P(Math.max(-60, outDb))} r={3} className="mx-comp__dot" />
    <text x={2} y={8} className="mx-eq__t">out</text><text x={80} y={97} className="mx-eq__t">in →</text>
  </svg>;
}
export const kindColor = (k: Strip['kind']) => ({ speech: '#facc15', vocal: '#f472b6', kick: '#ef4444', snare: '#f97316', toms: '#fb923c', oh: '#a3e635', bass: '#8b5cf6', egtr: '#22c55e', agtr: '#14b8a6', keys: '#38bdf8', choir: '#e879f9', amb: '#94a3b8', play: '#60a5fa', click: '#f8fafc' } as const)[k];
export const srcSays = (k: Strip['kind']) => SOURCES[k].says;
