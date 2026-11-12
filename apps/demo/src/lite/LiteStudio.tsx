/**
 * #/v25/lite — the Lite studio, restored 12 Nov 2026 from V2.5.3's v25LiteStudio (read as text). A conceptual model of a room — from a
 * campus room or from an archetype for a room that does not exist yet — with every dimension's source, state and uncertainty, the
 * recipe's placements, zones, seats and proposed test points, and coverage predicted from the plan. A designer can correct a dimension
 * (with a reason), place or move a device, and make a variant; everyone else reads. Nothing here is measured: measured figures come only
 * from Field Intelligence, reviewed by someone else. Models are kept in this browser.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, Button, EmptyState, Notice } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { CAMPUS_ROOMS, shortName, ARCHETYPE_NAME } from '../campus/canon.js';
import { roomRecord } from '../campus/design.js';
import { LiteNav, setQuery } from './LiteApp.js';
import * as S from './studio.js';

const KEY = 'empathia.demo.liteStudio.v1';
const load = (): S.LiteModel[] => { try { const x = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(x) ? x as S.LiteModel[] : []; } catch { return []; } };
const save = (ms: S.LiteModel[]) => { try { localStorage.setItem(KEY, JSON.stringify(ms)); } catch { /* the page still works for this visit */ } };
const STATE_TONE: Record<string, 'ok' | 'warn' | 'muted' | 'info'> = { MODELED: 'muted', MANUALLY_PROPOSED: 'warn', FIELD_OBSERVED: 'ok', DECLARED: 'info' };
const word = (s: string) => s.replace(/_/g, ' ').toLowerCase();

export default function LiteStudio({ role, query }: PageProps) {
  const [models, setModels] = useState<S.LiteModel[]>(load); const [say, setSay] = useState<string | null>(null);
  const edit = allows({ area: 'studio' }, role); const id = query.get('m'); const m = models.find((x) => x.id === id) || null;
  const put = (next: S.LiteModel, msg: string) => { const ms = models.some((x) => x.id === next.id) ? models.map((x) => (x.id === next.id ? next : x)) : [next, ...models]; setModels(ms); save(ms); setSay(msg); };
  const open = (mid: string | null) => { const q = new URLSearchParams(); if (mid) q.set('m', mid); setQuery('#/v25/lite', q); };
  const nextId = () => `LM-${String(models.reduce((n, x) => Math.max(n, Number(x.id.slice(3)) || 0), 0) + 1).padStart(3, '0')}`;
  return (
    <section className="lt-page lt-studio" data-testid="lite-studio">
      <LiteNav here="" role={role} />
      <PageHero product="lite" icon="room" compact eyebrow="Empathia Lite · studio" title="Lite studio" lede="Conceptual geometry with its uncertainty, placements, zones, proposed test points and modeled coverage — separate from anything measured."
        meta={[<Chip key="m" small tone="muted">Modeled · never measured here</Chip>, <Chip key="b" small tone="muted">Kept in this browser</Chip>]} />
      {say && <p className="ui-meta" role="status" data-testid="studio-said">{say}</p>}
      {m ? <ModelView m={m} edit={edit} put={put} nextId={nextId} back={() => open(null)} openId={open} /> : <>
        <Card title="Models" sub={`${models.length} model${models.length === 1 ? '' : 's'}`} icon="layers" testId="studio-models">
          {models.length ? <ul className="plain stack">{models.map((x) => <li key={x.id}><button type="button" className="lt-studio__row" onClick={() => open(x.id)} data-model={x.id}>
            <b>{x.name}</b><span className="ui-meta">{x.roomName || ARCHETYPE_NAME[x.archetype] || x.archetype} · {x.seats.length} seats · geometry {word(x.confidence)} v{x.version}{x.variantOf ? ` · variant of ${x.variantOf}` : ''}</span></button></li>)}</ul> : <EmptyState title="No Lite models yet">{edit ? 'Build one from a room below.' : 'A designer or engineer builds them.'}</EmptyState>}
        </Card>
        {edit ? <NewModel onBuild={(room, arch, name) => { const mm = S.createModel(nextId(), { room: room ? roomRecord(room) : null, archetype: room ? undefined : arch, roomName: name || undefined }); put(mm, `${mm.name} built: geometry ${word(mm.confidence)}.`); open(mm.id); }} />
          : <Notice tone="info">Read-only lens: you can open models and read the design intent; editing is for designers and engineers.</Notice>}
      </>}
    </section>
  );
}

function NewModel({ onBuild }: { onBuild: (room: string | null, arch: string, name: string) => void }) {
  const [room, setRoom] = useState('R-HZN-1-400'); const [arch, setArch] = useState(''); const [name, setName] = useState('');
  return <Card title="New model" sub="From a campus room, or from an archetype for a room that does not exist yet" icon="plus" testId="studio-new">
    <form className="lt-studio__form" onSubmit={(e) => { e.preventDefault(); onBuild(arch ? null : room, arch, name); }}>
      <label className="ch__field"><span>Room</span><select value={room} onChange={(e) => setRoom(e.target.value)} disabled={!!arch} data-testid="studio-room">{CAMPUS_ROOMS.map((o) => <option key={o.id} value={o.id}>{shortName(o)} · {o.name}</option>)}</select></label>
      <label className="ch__field"><span>Or an archetype for a room that does not exist yet</span><select value={arch} onChange={(e) => setArch(e.target.value)} data-testid="studio-arch"><option value="">—</option>{Object.keys(S.ARCH_CAP).map((k) => <option key={k} value={k}>{ARCHETYPE_NAME[k] || k}</option>)}</select></label>
      {arch && <label className="ch__field"><span>Provisional room name</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>}
      <p><Button kind="primary" type="submit" testId="studio-build">Build the conceptual model</Button></p>
      <p className="ui-meta">The model picks the best geometry source available (survey, design-approved, plan, campus model, request, photograph, archetype) and says which one it used. It never verifies itself. For a room you are standing in, Instant Room records dimensions from your own photographs and measurements.</p>
    </form>
  </Card>;
}

function ModelView({ m, edit, put, nextId, back, openId }: { m: S.LiteModel; edit: boolean; put: (m: S.LiteModel, msg: string) => void; nextId: () => string; back: () => void; openId: (id: string) => void }) {
  const P = useMemo(() => S.predict(m), [m]); const [err, setErr] = useState<string | null>(null);
  const done = (r: S.Result, msg: string) => { if (r.ok) { setErr(null); put(r.model, msg); } else setErr(r.why); };
  const [dim, setDim] = useState<S.Dim>('length'); const [val, setVal] = useState(''); const [unc, setUnc] = useState(''); const [why, setWhy] = useState('');
  const [kind, setKind] = useState<S.Kind>('camera'); const [px, setPx] = useState(''); const [py, setPy] = useState(''); const [sel, setSel] = useState(m.placements[0]?.id || ''); const [vwhy, setVwhy] = useState('');
  const p = m.placements.find((x) => x.id === sel);
  return <>
    <p><button type="button" className="ui-btn ui-btn--quiet" onClick={back}>◂ All models</button></p>
    <Card title={m.name} sub={`${m.roomName || ARCHETYPE_NAME[m.archetype] || m.archetype} · ${m.seats.length} seats · ${ARCHETYPE_NAME[m.archetype] || m.archetype} · geometry v${m.version} ${word(m.confidence)}`} icon="room" testId="studio-model">
      <Plan m={m} />
      <p className="ui-meta">Seats are dots, devices are labelled squares, a camera's wedge is its design field of view, rings are reach circles, ✕ marks a proposed test point. Modeled from the plan, not measured.</p>
      <p className="lt-acts">{m.roomId && <a className="ui-btn ui-btn--quiet" href={`#/lite/room/${m.roomId}`}>Open the room in 3D</a>}{m.roomId && <a className="ui-btn ui-btn--quiet" href={`#/instant/${m.roomId}`}>Instant Room</a>}</p>
    </Card>
    <div className="lt-twocol">
      <Card title="Geometry" sub="Each dimension with its source, state and uncertainty" icon="layers" testId="studio-geometry"><div className="table-wrap"><table className="lt-table"><thead><tr><th scope="col">Dimension</th><th scope="col">Value</th><th scope="col">State</th><th scope="col">Uncertainty</th><th scope="col">Basis</th></tr></thead>
        <tbody>{(['length', 'width', 'height'] as S.Dim[]).map((k) => { const d = m.dims[k]; return <tr key={k} data-dim={k}><th scope="row">{k}</th><td className="num">{d.value} m</td><td><Chip small tone={STATE_TONE[d.state] || 'muted'}>{word(d.state)}</Chip></td><td>{d.uncertainty}</td><td className="ui-meta">{d.basis}</td></tr>; })}</tbody></table></div></Card>
      <Card title="Predicted coverage" sub="Modeled from the plan; a prediction, not a measurement" icon="eye" testId="studio-predict"><div className="table-wrap"><table className="lt-table"><thead><tr><th scope="col">Prediction</th><th scope="col">Seats</th><th scope="col">Fraction</th></tr></thead>
        <tbody>{P.fov.map((f) => <tr key={f.placementId}><td>{f.label} · design field of view {f.hfov}°</td><td className="num">{f.seatsCovered} / {f.ofSeats}</td><td className="num">{Math.round(f.fraction * 100)}%</td></tr>)}
          {[P.mic, P.speaker].map((r) => <tr key={r.kind}><td>{r.kind} ({r.devices})</td><td className="num">{r.seatsCovered} / {r.ofSeats}</td><td className="num">{Math.round(r.fraction * 100)}%</td></tr>)}</tbody></table></div>
        <p className="ui-meta">{P.mic.note}. Measured field of view, sound level, intelligibility and reverberation stay blank until Field Intelligence evidence is reviewed. None is on record for this model.</p></Card>
    </div>
    {err && <Notice tone="bad">{err}</Notice>}
    {edit && <div className="lt-twocol">
      <Card title="Correct a dimension" sub="A person's correction is manually proposed, never verified" icon="wrench" testId="studio-correct"><form className="lt-studio__form" onSubmit={(e) => { e.preventDefault(); done(S.correct(m, dim, Number(val), why, unc || undefined), `${dim} corrected to ${val} m (manually proposed).`); }}>
        <label className="ch__field"><span>Dimension</span><select value={dim} onChange={(e) => setDim(e.target.value as S.Dim)}>{['length', 'width', 'height'].map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
        <label className="ch__field"><span>Value (m)</span><input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} data-testid="studio-val" /></label>
        <label className="ch__field"><span>Uncertainty</span><input value={unc} placeholder="e.g. ±0.05 m" onChange={(e) => setUnc(e.target.value)} /></label>
        <label className="ch__field"><span>Why</span><input value={why} placeholder="tape measurement, plan reading, owner statement…" onChange={(e) => setWhy(e.target.value)} data-testid="studio-why" /></label>
        <p><Button type="submit" testId="studio-correct-go">Record the correction</Button></p></form></Card>
      <Card title="Place or move a device" sub="A designer's placement is designed, not modeled" icon="device" testId="studio-place">
        <form className="lt-studio__form" onSubmit={(e) => { e.preventDefault(); done(S.addPlacement(m, kind, Number(px), Number(py)), `${S.KIND[kind]} placed.`); }}>
          <label className="ch__field"><span>Kind</span><select value={kind} onChange={(e) => setKind(e.target.value as S.Kind)}>{(Object.keys(S.KIND) as S.Kind[]).map((k) => <option key={k} value={k}>{S.KIND[k]}</option>)}</select></label>
          <label className="ch__field"><span>Across (m)</span><input inputMode="decimal" value={px} onChange={(e) => setPx(e.target.value)} data-testid="studio-x" /></label>
          <label className="ch__field"><span>From the front wall (m)</span><input inputMode="decimal" value={py} onChange={(e) => setPy(e.target.value)} data-testid="studio-y" /></label>
          <p><Button type="submit" testId="studio-place-go">Place it</Button></p></form>
        {p && <div className="lt-tool"><label className="ch__field"><span>Move</span><select value={sel} onChange={(e) => setSel(e.target.value)} data-testid="studio-move">{m.placements.map((x) => <option key={x.id} value={x.id}>{x.label} · {x.id}</option>)}</select></label>
          <div className="lt-pad" role="group" aria-label="Move the selected device in steps of 25 centimetres">
            <button type="button" className="ui-btn" aria-label="Move toward the front wall" onClick={() => done(S.movePlacement(m, p.id, p.x, p.y - 0.25), `${p.label} moved.`)}>↑</button>
            <span className="lt-pad__row"><button type="button" className="ui-btn" aria-label="Move left" onClick={() => done(S.movePlacement(m, p.id, p.x - 0.25, p.y), `${p.label} moved.`)}>←</button><span className="num">{p.x}, {p.y} m</span><button type="button" className="ui-btn" aria-label="Move right" onClick={() => done(S.movePlacement(m, p.id, p.x + 0.25, p.y), `${p.label} moved.`)}>→</button></span>
            <button type="button" className="ui-btn" aria-label="Move toward the back wall" onClick={() => done(S.movePlacement(m, p.id, p.x, p.y + 0.25), `${p.label} moved.`)}>↓</button></div></div>}
      </Card>
    </div>}
    {edit && <Card title="Design variant" sub="A copy at version 1 that remembers what it varies and why" icon="layers" testId="studio-variant"><form className="lt-studio__form" onSubmit={(e) => { e.preventDefault(); const r = S.variantOf(m, nextId(), vwhy); if (!r.ok) { setErr(r.why); return; } put({ ...m, variants: [...m.variants, r.model.id] }, ''); put(r.model, `${r.model.name} made.`); openId(r.model.id); }}>
      <label className="ch__field"><span>Reason</span><input value={vwhy} onChange={(e) => setVwhy(e.target.value)} placeholder="e.g. a second camera at the back" data-testid="studio-vwhy" /></label><p><Button type="submit" testId="studio-variant-go">Make the variant</Button></p></form></Card>}
    <Card title="History" sub={`Version ${m.version}`} icon="clock" testId="studio-history"><ol className="lt-studio__hist">{m.history.map((h, i) => <li key={i}><b>v{h.v}</b> {h.what}</li>)}</ol>{m.variants.length > 0 && <p className="ui-meta">Variants: {m.variants.join(', ')}</p>}</Card>
  </>;
}

/** The plan (V2.5.3 v25LiteSvg, redrawn): zones, seats, devices with labels, camera wedges, reach rings, test points. A dark stage. */
function Plan({ m }: { m: S.LiteModel }) {
  const W = m.geometry.width, L = m.geometry.length, pad = 0.6, s = 560 / Math.max(W, L), X = (x: number) => (pad + x) * s, Y = (y: number) => (pad + y) * s, vw = (W + 2 * pad) * s, vh = (L + 2 * pad) * s;
  const col: Record<string, string> = { display: '#7aa7ff', camera: '#f2b84b', micceil: '#3ddc97', micwireless: '#3ddc97', speaker: '#f472b6', touch: '#c084fc', sensor: '#94a3b8' };
  return <div className="lab__svgwrap"><svg className="ch__svg lt-studio__plan" viewBox={`0 0 ${Math.round(vw)} ${Math.round(vh)}`} role="img" aria-label={`Plan of ${m.name}: ${W} by ${L} metres, ${m.seats.length} seats, ${m.placements.length} devices, ${m.testPoints.length} proposed test points.`} data-testid="studio-plan">
    <rect width={vw} height={vh} fill="#0B1220" /><rect x={X(0)} y={Y(0)} width={W * s} height={L * s} fill="none" stroke="#94A3B8" strokeWidth={2} />
    {m.zones.map((z) => <g key={z.id}><rect x={X(z.rect[0])} y={Y(z.rect[1])} width={(z.rect[2] - z.rect[0]) * s} height={(z.rect[3] - z.rect[1]) * s} fill={z.kind === 'stage' ? 'rgba(242,184,75,.12)' : 'rgba(122,167,255,.08)'} stroke={z.kind === 'stage' ? '#f2b84b' : '#475569'} strokeDasharray="6 5" /><text x={X(z.rect[0]) + 6} y={Y(z.rect[1]) + 14} fontSize={12} fill="#CBD5E1">{z.kind}</text></g>)}
    {m.placements.filter((p) => p.reach).map((p) => <circle key={`r${p.id}`} cx={X(p.x)} cy={Y(p.y)} r={(p.reach || 4) * s} fill="none" stroke={col[p.kind]} strokeOpacity={0.45} strokeDasharray="3 5" />)}
    {m.placements.filter((p) => p.kind === 'camera').map((p) => { const half = (((p.hfov || 90) / 2) * Math.PI) / 180, dir = p.aim === 'stage' ? -1 : 1, R = Math.hypot(W, L) * s;
      return <path key={`w${p.id}`} d={`M${X(p.x)} ${Y(p.y)} L${X(p.x) + R * Math.sin(-half)} ${Y(p.y) + dir * R * Math.cos(half)} L${X(p.x) + R * Math.sin(half)} ${Y(p.y) + dir * R * Math.cos(half)} Z`} fill="rgba(242,184,75,.08)" stroke="#f2b84b" strokeOpacity={0.5} />; })}
    {m.seats.map((q) => <circle key={q.id} cx={X(q.x)} cy={Y(q.y)} r={Math.max(2.5, Math.min(6, s * 0.18))} fill="#E2E8F0" opacity={0.8} />)}
    {m.testPoints.map((t) => <text key={t.id} x={X(t.x)} y={Y(t.y) + 5} fontSize={15} fill="#FCA5A5" textAnchor="middle" fontWeight={800}>✕</text>)}
    {m.placements.map((p) => <g key={p.id} data-placement={p.id}><rect x={X(p.x) - 6} y={Y(p.y) - 6} width={12} height={12} rx={2} fill={col[p.kind]} stroke="#05070C" /><text x={X(p.x) + 9} y={Y(p.y) - 7} fontSize={11} fill="#F8FAFC">{p.label}</text></g>)}
    <text x={8} y={vh - 8} fontSize={11} fill="#94A3B8">{W} × {L} m · front wall at the top · modeled</text>
  </svg></div>;
}
