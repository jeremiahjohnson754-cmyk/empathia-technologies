/**
 * #/flagship — the flagship engineering room, read from the server (50/10; founder, 17 Nov 2026: "make one University lecture hall
 * the flagship engineering demonstration before expanding all the tools across the estate… the same engine can power your enterprise
 * rooms, stadium executive suites, and convention center spaces without creating separate engineering systems for each world").
 *
 * The room is Lecture Theatre SCI-110, reached by the identifier it has in the canonical estate, UNI-SCI-110. This first panel set
 * shows four things and nothing else: its plan, its devices, its commissioning plan and its thread. Every value on the page is what
 * the enterprise API returned for the person chosen; the page holds no record of the room, and the estate's copy in the bundle is not
 * read (tests/unit/migration-ledger.test.mjs checks the imports). The panels are one selection: choosing a device on the plan shows
 * its connections and the tests that name it.
 *
 * Moving a device (founder, 17 Nov 2026, 15:50: "physically drag a camera to a new location, see the proposed redline, submit the
 * change for independent approval, and watch the relevant engineering views update… the original design should remain preserved
 * alongside the approved as-built"). The drag is a draft in this browser and is drawn as one. Submitting sends it to the server as
 * the person chosen in "Acting as"; the server decides whether that person may, and its words are shown when it refuses. A proposal
 * is decided by someone else, again on the server. After every step the page asks the server three separate questions (the room, the
 * field record, the baselines) and shows the three answers side by side, so agreement between the products is something to look at
 * and not something to take on trust. Nothing about a move is kept in the browser: a refresh, or another person's browser with the
 * resume code, reads the same records.
 *
 * Only a build with DEMO_API_URL has this page (registry.ops.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Card, Tag, Notice } from '@empathia/ui';
import { connected, SandboxGone, type Availability, type Sandbox } from '../connected/client.js';
import { ReverbBench, type BenchOutput, type BenchTest } from '../flagship/ReverbBench.js';
import { CorrectiveAction, type Deficiency, type Issue, type WorkOrder } from '../flagship/CorrectiveAction.js';

export const FLAGSHIP_REF = 'UNI-SCI-110';
interface Point { x: number; y: number }
/** Where a device is, as the server answers it for every product (services/enterprise-api/src/domain/placement.ts). */
interface Placement { designed: Point & { mount: string }; asBuilt: (Point & { move: string; decidedBy: string | null; decidedAt: string }) | null; proposed: (Point & { move: string; by: string; at: string }) | null; current: Point; basis: 'DESIGNED' | 'AS_BUILT';
  history: Array<{ move: string; state: string; from: Point; to: Point; metres: number; reason: string; by: string; at: string; decidedBy: string | null; decidedAt: string | null }> }
interface Device { id: string; cat: string; label: string; role: string; model: string; modelName: string | null; x: number; y: number; z: number; rot: number; mount: string; furniture?: boolean; lifecycle: string; identityState: string | null; placement: Placement | null }
interface FieldAnswer { room: { bounds: { w: number; l: number } }; writable: boolean; may: { record: boolean; decide: boolean };
  devices: Array<{ asset: string; asBuilt: Point & { moved: string | null }; recheck: Array<{ test: string; label: string; result: string | null }> }>;
  moves: Array<{ move: string; device: string; state: string; from: Point; to: Point; metres: number; reason: string; note: string; by: string; decidedBy: string | null; decision: string | null; mayDecide: boolean }>; catalogue: { moveReasons: string[] } }
interface BaselineAnswer { current: { version: number; devices: Array<{ id: string; placement: { designed: Point; asBuilt: (Point & { move: string }) | null; at: Point; basis: string } | null }> } | null }
interface CriteriaAnswer { sandbox: boolean; tests: Array<BenchTest & { personas: string[] }>; versions: Array<{ test: string; version: number; inForce: boolean }>; may: { set: boolean } }
/** A measurement as the server lists it (the ADR-0004 record with its test, evidence and the database's judgement). */
interface Measured { id: string; metric: string; value: string | number; unit: string; provenance: string; calibration_status: string; instrument_id: string | null; location: string; test_id: string | null; evidence_id: string | null; within: boolean | null; criterion_version: number | null;
  criterion_lower: string | null; criterion_upper: string | null; recorded_by_name: string; recorded_role: string; created_at: string; cited_by_result: string | null }
interface RegisterAnswer { items: Array<{ asset: string | null; position: string; missing: string[] }> }
interface Connection { id: string; from: string; to: string; kind: string; why: string }
interface Row { test_id: string; label: string; pack: string; domain: string; phase: number; tier: number; applicable: boolean; why: string[]; personas: string[]; evidence: string[]; instrument: boolean; devices: string[]; result: string }
interface RoomAnswer {
  room: { code: string; canonicalRef: string | null; name: string; lifecycle: string; template: string; intendedUse: string; occupancy: number; rev: number; approvedRevision: number | null;
    geometry: { points: Array<[number, number]>; widthM: number; lengthM: number; ceiling: number; confidence: string; provenance: Record<string, string> }; classification: { archetypeName?: string; why?: string[] } | null };
  devices: Device[]; connections: Connection[]; drawings: Array<{ kind: string; state: string; revNo: number }>;
  commissioning: { engineVersion: string; ruleVersion: string; library: number; applicable: number; counts: Record<string, number>; rows: Row[] } | null;
}
interface Thread { room: { code: string; lifecycle: string; revision: number }; complete?: boolean; missing?: string[]; stages: Array<{ key: string; product: string; records: Record<string, unknown> }> }
interface Loaded { at: string; as: string; room: RoomAnswer; thread: Thread | null; field: FieldAnswer | null; baseline: BaselineAnswer | null; criteria: CriteriaAnswer | null; measured: Measured[]; register: RegisterAnswer | null; service: Record<string, { def: Deficiency | null; wo: WorkOrder | null }>; place: { building: string; buildingName: string; site: string; siteName: string } | null }
type Said = { ok: boolean; warn?: boolean; title: string; text: string; reasons?: string[] };
const at = (p: Point) => `${p.x} m across, ${p.y} m from the front`;
const same = (a: Point, b: Point) => Math.abs(a.x - b.x) < 0.005 && Math.abs(a.y - b.y) < 0.005;
const dist = (a: Point, b: Point) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 100) / 100;
const snap = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v * 20) / 20));
const placeOf = (d: Device): Point => d.placement?.current ?? { x: d.x, y: d.y };

/** The people of a sandbox a visitor may read as. The server decides what each may see; this list only offers the choice. */
export const PEOPLE: Array<[string, string]> = [['cxeng', 'Commissioning engineer'], ['syseng', 'Systems engineer'], ['designer', 'Designer'], ['installer', 'Installer'], ['qa_reviewer', 'QA reviewer'], ['svcmgr', 'Service manager'], ['service', 'Service technician'], ['opslead', 'Operations lead'], ['exec', 'Executive'], ['requestor', 'Requestor']];
// the server's device categories (packages/commissioning-engine), grouped into the families the plan colours and letters
const FAMILY: Array<[RegExp, string, string]> = [[/^(display|ledwall)$/, 'display', 'D'], [/^(camera|seccam)$/, 'camera', 'C'], [/^mic/, 'microphone', 'M'], [/^(speaker|bar)$/, 'loudspeaker', 'S'], [/^amp$/, 'amplifier', 'P'], [/^dsp$/, 'dsp', 'A'],
  [/^(switch|pdu|rack)$/, 'network', 'N'], [/^(touch|control|scheduler|switcher|encoder)$/, 'control', 'T'], [/^compute$/, 'compute', 'U'], [/^(occsensor|lighting|iot|hvac)$/, 'building', 'B']];
export const familyOf = (cat: string): { family: string; letter: string } => { const f = FAMILY.find(([re]) => re.test(cat)); return f ? { family: f[1], letter: f[2] } : { family: 'other', letter: '•' }; };
const tone = (x: string): 'ok' | 'warn' | 'bad' | 'muted' => (/VERIFIED$|APPROVED|ACCEPTED|ok/.test(x) && !/UNVERIFIED/.test(x) ? 'ok' : /FAIL|REJECTED/.test(x) ? 'bad' : /UNVERIFIED|PENDING|GENERATED|COMMISSIONING|NOT_TESTED/.test(x) ? 'warn' : 'muted');
const words = (x: string) => x.replace(/_/g, ' ').toLowerCase();
const when = (iso: string) => { try { return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return iso; } };

/**
 * The plan: the room's outline and every position, drawn to scale from the server's geometry and the server's answer to where each
 * device is. Front of the room at the top. Three layers that never overwrite one another: where the design puts a device (a dashed
 * ghost, shown once the device has moved), where it is (as built, the solid marker), and a move waiting for a decision (an outlined
 * marker and an arrow). In move mode the chosen device is dragged, placed with a tap, or nudged with the arrow keys; that is a draft
 * in this browser until it is submitted, and it is drawn as a draft.
 */
function Plan({ room, devices, connections, selected, onSelect, showLinks, showFurniture, showDesigned, moving, draft, onDraft }: { room: RoomAnswer['room']; devices: Device[]; connections: Connection[]; selected: string | null; onSelect: (id: string | null) => void; showLinks: boolean; showFurniture: boolean; showDesigned: boolean;
  moving: string | null; draft: Point | null; onDraft: (p: Point) => void }) {
  const g = room.geometry; const pad = 1.6; const W = g.widthM; const L = g.lengthM; const svg = useRef<SVGSVGElement | null>(null); const dragging = useRef(false);
  const shown = devices.filter((d) => showFurniture || !d.furniture); const byId = new Map(devices.map((d) => [d.id, d]));
  const links = showLinks ? connections.filter((k) => byId.has(k.from) && byId.has(k.to)) : connections.filter((k) => selected && (k.from === selected || k.to === selected) && byId.has(k.from) && byId.has(k.to));
  const ticks = Array.from({ length: Math.floor(W / 4) + 1 }, (_, i) => i * 4); const rows = Array.from({ length: Math.floor(L / 4) + 1 }, (_, i) => i * 4);
  // a pointer's place in the room, in metres, snapped to five centimetres and kept inside the walls
  const toRoom = (e: { clientX: number; clientY: number }): Point | null => { const el = svg.current; const m = el?.getScreenCTM(); if (!el || !m) return null; const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(m.inverse()); return { x: snap(q.x, W), y: snap(q.y, L) }; };
  const drop = (e: { clientX: number; clientY: number }) => { const p = toRoom(e); if (p) onDraft(p); };
  const mover = moving ? byId.get(moving) : undefined; const from = mover ? placeOf(mover) : null;
  return (
    <svg ref={svg} className="fl__plan" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${L + 2 * pad}`} role="group" aria-label={`Plan of ${room.name}: ${W} by ${L} metres, ${shown.length} positions`} data-testid="fl-plan" data-width={W} data-length={L} data-moving={moving || ''}
      onPointerMove={(e: { clientX: number; clientY: number }) => { if (moving && dragging.current) drop(e); }} onPointerUp={() => { dragging.current = false; }} onPointerLeave={() => { dragging.current = false; }}>
      <g className="fl__grid" aria-hidden="true">{ticks.map((x) => <line key={`x${x}`} x1={x} y1={0} x2={x} y2={L} />)}{rows.map((y) => <line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} />)}</g>
      <polygon className="fl__outline" points={g.points.map((p) => p.join(',')).join(' ')} onClick={(e: { clientX: number; clientY: number }) => { if (moving) drop(e); else onSelect(null); }} />
      <text className="fl__dim" x={W / 2} y={-0.55} textAnchor="middle">front · {W} m</text>
      <text className="fl__dim" x={-0.55} y={L / 2} textAnchor="middle" transform={`rotate(-90 ${-0.55} ${L / 2})`}>{L} m</text>
      <g aria-hidden="true">{links.map((k) => { const a = placeOf(byId.get(k.from)!); const b = placeOf(byId.get(k.to)!); return <line key={k.id} className="fl__link" data-kind={k.kind} data-on={selected && (k.from === selected || k.to === selected) ? 'yes' : 'no'} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; })}</g>
      {/* the designed place of a device that has moved: kept, and drawn as what it is */}
      {showDesigned ? shown.filter((d) => d.placement?.basis === 'AS_BUILT').map((d) => { const p = d.placement!; return <g key={`g${d.id}`} className="fl__ghost" data-ghost={d.id} aria-hidden="true">
        <line x1={p.designed.x} y1={p.designed.y} x2={p.current.x} y2={p.current.y} /><circle cx={p.designed.x} cy={p.designed.y} r={0.48} /><text x={p.designed.x} y={p.designed.y + (p.current.y < p.designed.y ? 1.05 : -0.7)} textAnchor="middle">designed</text></g>; }) : null}
      {/* a move waiting for a decision: a proposal, drawn as one */}
      {shown.filter((d) => d.placement?.proposed).map((d) => { const p = d.placement!; return <g key={`p${d.id}`} className="fl__proposed" data-proposed={d.id} aria-hidden="true">
        <line x1={p.current.x} y1={p.current.y} x2={p.proposed!.x} y2={p.proposed!.y} /><circle cx={p.proposed!.x} cy={p.proposed!.y} r={0.48} /><text x={p.proposed!.x} y={p.proposed!.y + (p.current.y < p.proposed!.y ? 1.05 : -0.7)} textAnchor="middle">proposed</text></g>; })}
      {shown.map((d) => { const f = familyOf(d.cat); const on = d.id === selected; const mv = d.id === moving; const here = mv && draft ? draft : placeOf(d);
        return <g key={d.id} className="fl__dev" data-family={d.furniture ? 'furniture' : f.family} data-on={on ? 'yes' : 'no'} data-move={mv ? 'yes' : 'no'} data-device={d.id} data-x={here.x} data-y={here.y} transform={`translate(${here.x} ${here.y})`} role="button" tabIndex={0} aria-pressed={on}
          aria-label={mv ? `${d.label}: moving. Drag it, or use the arrow keys: a tenth of a metre a press, half a metre with Shift` : `${d.label}, ${d.furniture ? 'furniture' : f.family}, ${d.id}`}
          onClick={() => { if (!moving) onSelect(on ? null : d.id); }}
          onPointerDown={(e: { currentTarget: Element; pointerId: number; preventDefault: () => void }) => { if (mv) { dragging.current = true; e.preventDefault(); } }}
          onKeyDown={(e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
            if (mv && /^Arrow/.test(e.key)) { e.preventDefault(); const step = e.shiftKey ? 0.5 : 0.1; const b = draft || placeOf(d); onDraft({ x: snap(b.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0), W), y: snap(b.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0), L) }); }
            else if (!moving && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(on ? null : d.id); } }}>
          <circle className="fl__hit" r={1.1} />
          {d.furniture ? <rect x={-0.55} y={-0.35} width={1.1} height={0.7} rx={0.12} /> : <circle r={0.48} />}
          {d.furniture ? null : <text y={0.2} textAnchor="middle">{f.letter}</text>}
        </g>; })}
      {mover && from && draft && !same(from, draft) ? <g className="fl__draft" aria-hidden="true"><line x1={from.x} y1={from.y} x2={draft.x} y2={draft.y} /><circle cx={from.x} cy={from.y} r={0.3} /><text x={draft.x} y={draft.y + (from.y < draft.y ? 1.05 : -0.75)} textAnchor="middle">{dist(from, draft)} m</text></g> : null}
    </svg>
  );
}

export function FlagshipPage() {
  const c = useMemo(() => connected(), []);
  const [avail, setAvail] = useState<Availability | null>(null); const [sb, setSb] = useState<Sandbox | null>(() => c.sandbox());
  const [who, setWho] = useState('cxeng'); const [data, setData] = useState<Loaded | null>(null); const [busy, setBusy] = useState<string | null>(null); const [said, setSaid] = useState<Said | null>(null);
  const [absent, setAbsent] = useState(false); const [selected, setSelected] = useState<string | null>(null); const [phase, setPhase] = useState<number | 'all'>('all');
  const [showLinks, setShowLinks] = useState(false); const [showFurniture, setShowFurniture] = useState(true); const [onlySelected, setOnlySelected] = useState(false); const [showDesigned, setShowDesigned] = useState(true);
  // a move being drafted: which device, where to, why. A draft is this browser's until it is submitted; the server holds none of it.
  const [moving, setMoving] = useState<string | null>(null); const [draft, setDraft] = useState<Point | null>(null); const [reason, setReason] = useState(''); const [note, setNote] = useState(''); const [decision, setDecision] = useState('');
  const alive = useRef(true); useEffect(() => () => { alive.current = false; }, []);

  const read = useCallback(async (as: string, keep = false): Promise<void> => {
    if (!c.sandbox()) { setData(null); return; }
    setBusy('Reading the room from the server…'); if (!keep) setSaid(null);
    try {
      const room = await c.call<RoomAnswer>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}`);
      if (!alive.current) return;
      if (room.status === 404) { setAbsent(true); setData(null); return; }
      if (!room.ok) { setData(null); setSaid({ ok: false, title: `The server answered ${room.status}.`, text: room.detail }); return; }
      const [thread, list, sites, field, baseline] = await Promise.all([c.call<Thread>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}/thread`), c.call<{ items: Array<{ code: string; building: string }> }>(as, 'GET', '/v1/rooms?limit=50'),
        c.call<{ items: Array<{ code: string; name: string; buildings: Array<{ code: string; name: string }> }> }>(as, 'GET', '/v1/sites'),
        c.call<FieldAnswer>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}/field-record`), c.call<BaselineAnswer>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}/baselines`)]);
      const [criteria, measured, register] = await Promise.all([c.call<CriteriaAnswer>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}/criteria`), c.call<{ items: Measured[] }>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}/measurements`), c.call<RegisterAnswer>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}/register`)]);
      // each deficiency of the room with its own workflow record and, when one was raised, its work order
      const found = thread.ok ? (((thread.body.stages.find((s) => s.key === 'commissioning')?.records as { issues?: Issue[] } | undefined)?.issues) || []) : []; const service: Loaded['service'] = {};
      await Promise.all(found.slice(0, 6).map(async (i) => { const [d, w] = await Promise.all([c.call<Deficiency>(as, 'GET', `/v1/issues/${i.code}/deficiency`), i.workOrders[0] ? c.call<WorkOrder>(as, 'GET', `/v1/work-orders/${i.workOrders[0]}`) : Promise.resolve(null)]);
        service[i.code] = { def: d.ok ? d.body : null, wo: w && w.ok ? w.body : null }; }));
      if (!alive.current) return;
      const b = list.ok ? list.body.items.find((x) => x.code === room.body.room.code)?.building : undefined; const site = b && sites.ok ? sites.body.items.find((s) => s.buildings.some((x) => x.code === b)) : undefined;
      setAbsent(false); setData({ at: new Date().toISOString(), as, room: room.body, thread: thread.ok ? thread.body : null, field: field.ok ? field.body : null, baseline: baseline.ok ? baseline.body : null, criteria: criteria.ok ? criteria.body : null, measured: measured.ok ? measured.body.items.filter((m) => m.test_id) : [], register: register.ok ? register.body : null, service, place: b && site ? { building: b, buildingName: site.buildings.find((x) => x.code === b)!.name, site: site.code, siteName: site.name } : null });
      setSelected((s) => (s && room.body.devices.some((d) => d.id === s) ? s : null));
    } catch (e) {
      if (e instanceof SandboxGone) { setSb(null); setData(null); setSaid({ ok: false, title: 'The sandbox is no longer there.', text: `${e.message}. Open a new one to continue.` }); }
      else setSaid(e instanceof TypeError ? { ok: false, title: 'The server cannot be reached.', text: data ? 'What is shown is what it held when it last answered.' : 'Nothing can be shown until it answers: this page keeps no copy of the room.' } : { ok: false, title: 'The server did not answer.', text: (e as Error).message });
    } finally { if (alive.current) setBusy(null); }
  }, [c, data]);

  useEffect(() => { let on = true; void (async () => { const a = await c.availability(); if (!on) return; setAvail(a); if (a.enabled && c.sandbox()) await read(who); })(); return () => { on = false; }; }, [c]);   // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (fresh: boolean) => { setBusy(fresh ? 'Opening a new sandbox…' : 'Opening your sandbox…'); setSaid(null);
    try { const a = fresh && c.sandbox() ? await c.reset() : await c.open(); if (!a.ok || !a.body) { setSaid({ ok: false, title: `The server answered ${a.status}.`, text: a.detail }); setBusy(null); return; } setSb(a.body); setAbsent(false); await read(who); }
    catch (e) { setBusy(null); setSaid({ ok: false, title: 'That did not work.', text: e instanceof TypeError ? 'The server could not be reached. Nothing was changed.' : (e as Error).message }); if (e instanceof SandboxGone) setSb(null); } };
  const change = (as: string) => { setWho(as); void read(as); };
  const person = (k: string) => PEOPLE.find(([x]) => x === k)?.[1].toLowerCase() || k;
  const refused = (a: { status: number; detail: string; reasons: string[] }, what: string): Said => ({ ok: false, title: `The server refused ${what} (${a.status}).`, text: a.detail, reasons: a.reasons });
  const act = async (label: string, run: () => Promise<Said>) => { setBusy(label); setSaid(null);
    try { const out = await run(); if (!alive.current) return; setSaid(out); await read(who, true); }
    catch (e) { if (e instanceof SandboxGone) { setSb(null); setData(null); setSaid({ ok: false, title: 'The sandbox is no longer there.', text: `${e.message}. Open a new one to continue.` }); }
      else setSaid({ ok: false, title: 'That did not reach the server.', text: e instanceof TypeError ? 'The server could not be reached. Nothing was changed; your draft is still here.' : (e as Error).message }); }
    finally { if (alive.current) setBusy(null); } };
  const startMove = (id: string) => { setMoving(id); setDraft(null); setReason(''); setNote(''); setSaid(null); };
  const stopMove = () => { setMoving(null); setDraft(null); };
  const propose = (dev: Device, to: Point) => act('Sending the move to the server…', async () => {
    const a = await c.call<{ move: string; state: string; from: Point; to: Point; metres: number }>(who, 'POST', `/v1/rooms/${FLAGSHIP_REF}/field-record/moves`, { device: dev.id, x: to.x, y: to.y, reason, note: note.trim() || undefined });
    if (!a.ok) return refused(a, 'the move');
    stopMove(); return { ok: true, title: `${a.body.move} is proposed.`, text: `${dev.label}: ${at(a.body.from)} to ${at(a.body.to)}, ${a.body.metres} m. It is a proposal until someone other than the ${person(who)} who holds design approval decides it. The design is not edited.` }; });
  const decide = (dev: Device, move: string, approve: boolean) => act(approve ? 'Sending the approval to the server…' : 'Sending the rejection to the server…', async () => {
    const a = await c.call<{ state: string }>(who, 'POST', `/v1/rooms/${FLAGSHIP_REF}/field-record/moves/${move}/decide`, { approve, decision: decision.trim() || undefined });
    if (!a.ok) return refused(a, approve ? 'the approval' : 'the rejection');
    setDecision(''); return approve ? { ok: true, title: `${move} is approved.`, text: `${dev.label} is now recorded where it was installed. The designed position is kept beside it, and the tests that name the device are listed to be looked at again.` }
      : { ok: true, title: `${move} is rejected.`, text: `${dev.label} stays where it was. The proposal is kept in the history.` }; });
  // ---- commissioning: the register, the start, the bench's measurement and the result that rests on it. Each is one or more requests
  // to the server as the person chosen; the server decides, and what it decides is read back.
  const fillRegister = () => act('Recording a serial, and a hostname and address where there is a network port, for every unit…', async () => {
    const todo = (data?.register?.items || []).filter((x) => x.asset && x.missing.length); const t = Math.random().toString(36).slice(2, 7); let n = 0;
    for (const x of todo) { n += 1;
      if (x.missing.includes('hostname') || x.missing.includes('IP address')) { const a = await c.call(who, 'PUT', `/v1/assets/${x.asset}/register`, { hostname: `syn-sci110-${t}-${n}`, ip: `10.110.${Math.floor(Math.random() * 200) + 20}.${n + 10}` }); if (!a.ok) return refused(a, `the register entry of ${x.asset}`); }
      if (x.missing.includes('serial')) { const a = await c.call(who, 'POST', `/v1/assets/${x.asset}/identity`, { state: 'DECLARED', serial: `SYN-SN-SCI110-${t}-${n}` }); if (!a.ok) return refused(a, `the serial of ${x.asset}`); } }
    return { ok: true, title: `${n} unit${n === 1 ? '' : 's'} registered.`, text: 'Synthetic serials, hostnames and addresses, one request for each. Commissioning can start once every unit is in the register.' }; });
  const startCommissioning = () => act('Asking the server to start commissioning…', async () => {
    const a = await c.call(who, 'POST', `/v1/rooms/${FLAGSHIP_REF}/lifecycle`, { to: 'COMMISSIONING' }); if (!a.ok) return refused(a, 'the start of commissioning');
    return { ok: true, title: 'The room is in commissioning.', text: 'Results and measurements can be recorded now, each by the role responsible for the test.' }; });
  const recordMeasurement = (o: BenchOutput) => act('Uploading the analysis package and recording the measurement…', async () => {
    const ev = await c.call<{ id: string }>(who, 'POST', '/v1/evidence', undefined, { text: o.packageText, fileName: `sci-110-reverberation-analysis-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json` }); if (!ev.ok) return refused(ev, 'the evidence file');
    const a = await c.call<{ id: string; within: boolean | null; says: string }>(who, 'POST', `/v1/rooms/${FLAGSHIP_REF}/measurements`, { testId: 'reverberation_rt60', metric: 't30_mid', unit: 's', value: o.value, method: o.method, measuredAt: new Date().toISOString(), location: o.location, source: o.source, provenance: o.provenance,
      ...(o.instrumentId ? { instrumentId: o.instrumentId } : {}), ...(o.calibrationStatus ? { calibrationStatus: o.calibrationStatus } : {}), ...(o.calibrationDue ? { calibrationDue: o.calibrationDue } : {}), evidenceId: ev.body.id, detail: o.detail });
    if (!a.ok) return refused(a, 'the measurement');
    return { ok: true, warn: a.body.within === false, title: a.body.within === false ? 'Recorded. The server says it does not meet the criterion.' : a.body.within ? 'Recorded. The server says it meets the criterion.' : 'Recorded.', text: a.body.says }; });
  const recordResult = (m: Measured, state: 'PASS' | 'FAIL') => act(`Asking the server to record ${state} on this measurement…`, async () => {
    const kind = R?.commissioning?.rows.find((r) => r.test_id === m.test_id)?.evidence[0] || 'INSTRUMENT_MEASURED';
    const a = await c.call<{ resultLabel: string }>(who, 'POST', `/v1/rooms/${FLAGSHIP_REF}/results`, { testId: m.test_id, state, evidenceId: m.evidence_id, evidenceKind: kind, instrument: m.instrument_id || `none: ${m.provenance.toLowerCase()} reference responses`, measurementId: m.id });
    if (!a.ok) return refused(a, `${state} on this measurement`);
    return state === 'FAIL' ? { ok: true, warn: true, title: 'FAIL is recorded.', text: 'The server opened a deficiency that states what was measured against what. Acceptance is blocked until it is closed by a verified retest.' }
      : { ok: true, title: `${words(a.body.resultLabel)} is recorded.`, text: 'A pass waits for someone else to verify it: its recorder cannot.' }; });
  // when a move starts, the marker on the plan takes the keyboard, so the arrow keys work without a pointer
  useEffect(() => { if (moving) (document.querySelector(`.fl__plan [data-device="${moving}"]`) as SVGGElement | null)?.focus(); }, [moving]);

  const R = data?.room; const rows = useMemo(() => (R?.commissioning?.rows || []).filter((r) => r.applicable), [R]);
  const phases = useMemo(() => [...new Set(rows.map((r) => r.phase))].sort((a, b) => a - b), [rows]);
  // the plan opens on its first phase: seventy-odd tests at once is a long page, and a phase is how the work is done
  const opened = useRef(false); useEffect(() => { if (!opened.current && phases.length) { opened.current = true; setPhase(phases[0]!); } }, [phases]);
  const sel = R && selected ? R.devices.find((d) => d.id === selected) || null : null;
  const selLinks = R && sel ? R.connections.filter((k) => k.from === sel.id || k.to === sel.id) : [];
  const naming = (id: string) => rows.filter((r) => r.devices.includes(id));
  const visible = rows.filter((r) => (phase === 'all' || r.phase === phase) && (!onlySelected || !sel || r.devices.includes(sel.id)));
  const label = (id: string) => R?.devices.find((d) => d.id === id)?.label || id;
  const F = data?.field || null; const B = data?.baseline?.current || null;
  const fieldOf = (id: string) => F?.devices.find((d) => d.asset === id) || null;
  const waiting = sel && F ? F.moves.find((m) => m.device === sel.id && m.state === 'PROPOSED') || null : null;
  const again = useMemo(() => new Map((F?.devices || []).flatMap((d) => d.recheck.map((r) => [r.test, d.asset] as [string, string]))), [F]);
  const moved = R ? R.devices.filter((d) => d.placement && (d.placement.basis === 'AS_BUILT' || d.placement.proposed)) : [];
  const compared = R ? (sel && !moved.some((d) => d.id === sel.id) ? [sel, ...moved] : moved) : [];
  const bench = data?.criteria?.tests.find((t) => t.test === 'reverberation_rt60') || null; const registerOpen = (data?.register?.items || []).filter((x) => x.missing.length).length; const registerAll = (data?.register?.items || []).length;
  const issues = ((data?.thread?.stages.find((s) => s.key === 'commissioning')?.records as { issues?: Issue[] } | undefined)?.issues) || [];
  const limitOf = (m: Measured) => (m.criterion_version === null ? null : `${m.criterion_upper !== null && m.criterion_lower !== null ? `between ${Number(m.criterion_lower)} and ${Number(m.criterion_upper)}` : m.criterion_upper !== null ? `at most ${Number(m.criterion_upper)}` : `at least ${Number(m.criterion_lower)}`} ${m.unit}, version ${m.criterion_version}`);
  const mover = R && moving ? R.devices.find((d) => d.id === moving) || null : null; const moverAt = mover ? placeOf(mover) : null;
  const far = mover && moverAt && draft ? dist(moverAt, draft) : 0; const ready = !!(mover && draft && far >= 0.05 && reason && (reason !== 'other' || note.trim()));

  if (!c.configured) return <div className="ui-page" data-testid="flagship"><PageHero product="commissioning" icon="link" eyebrow="The flagship engineering room, on the server" title="Lecture Theatre SCI-110" lede="This build of the demonstration is not connected to a server, so there is no room to read." /></div>;
  return (
    <div className="ui-page" data-testid="flagship" data-loaded={data ? 'yes' : 'no'}>
      <PageHero product="commissioning" icon="link" eyebrow="The flagship engineering room, on the server" title="Lecture Theatre SCI-110"
        lede="One university lecture hall carries the engineering demonstration: the same room, the same record, for every tool that follows. This is its first panel set. Everything below was returned by the server for the person you choose; the page keeps no copy of the room."
        meta={[`Canonical identifier ${FLAGSHIP_REF}`, `Server ${c.origin}`, 'Synthetic records: a fictional university']} />

      {!avail ? <p role="status" data-testid="fl-asking"><Tag tone="warn">asking</Tag> Asking the server… One that has been idle can take about a minute to start.</p> : null}
      {avail && !avail.enabled ? <Notice tone="warn"><b>The server-backed demonstration is not available here.</b> {avail.reason} The room cannot be shown without it: this page keeps no copy.</Notice> : null}
      {avail?.enabled && !sb ? <Card icon="link" title="Open a sandbox to see the room" testId="fl-open-card">
        <p>A sandbox is a synthetic organization of your own on the server. It opens with the lecture theatre already designed, approved and installed, ready to be commissioned.</p>
        <p className="build__row"><button type="button" className="ui-btn ui-btn--primary" data-testid="fl-open" disabled={!!busy} onClick={() => void open(false)}>Open a sandbox</button> <a href="#/connected">I have a resume code</a></p>
      </Card> : null}
      {avail?.enabled && sb && absent ? <Notice tone="warn"><b>This sandbox was opened before the lecture theatre existed on the server.</b> It has no room with the identifier {FLAGSHIP_REF}. A new sandbox has it; the old one stays on the server until it expires.{' '}
        <button type="button" className="ui-btn ui-btn--sm" data-testid="fl-new" disabled={!!busy} onClick={() => void open(true)}>Close this one and open a new one</button></Notice> : null}
      {busy ? <p role="status" data-testid="fl-busy"><Tag tone="warn">working</Tag> {busy}</p> : null}
      {said ? <div data-testid="fl-said" data-ok={said.ok ? 'yes' : 'no'}><Notice tone={!said.ok ? 'bad' : said.warn ? 'warn' : 'ok'}><b>{said.title}</b> {said.text}{said.reasons?.length ? <ul className="fl__list" data-testid="fl-said-reasons">{said.reasons.map((r) => <li key={r}>{r}</li>)}</ul> : null}</Notice></div> : null}

      {sb && R && data ? <>
        <section className="fl__bar" aria-label="The room and who is reading it" data-testid="fl-bar">
          <div className="fl__id"><span className="ui-mono fl__ref" data-testid="fl-ref">{R.room.canonicalRef}</span><b data-testid="fl-name">{R.room.name}</b>
            <span className="ui-muted" data-testid="fl-place">{data.place ? `${data.place.buildingName} · ${data.place.siteName}` : 'building not readable as this person'}</span></div>
          <dl className="fl__facts">
            <div><dt>State</dt><dd><Tag tone={tone(R.room.lifecycle)}>{words(R.room.lifecycle)}</Tag></dd></div>
            <div><dt>Seats</dt><dd data-testid="fl-seats">{R.room.occupancy}</dd></div>
            <div><dt>Size</dt><dd data-testid="fl-size">{R.room.geometry.lengthM} × {R.room.geometry.widthM} × {R.room.geometry.ceiling} m <span className="ui-muted">({R.room.geometry.confidence})</span></dd></div>
            <div><dt>Design</dt><dd data-testid="fl-design">{R.room.approvedRevision ? `revision ${R.room.approvedRevision}, approved` : 'no approved revision'} <span className="ui-muted">· record version {R.room.rev}</span></dd></div>
            <div><dt>Server’s code</dt><dd className="ui-mono" data-testid="fl-code">{R.room.code}</dd></div>
          </dl>
          <div className="fl__who">
            <label className="kit-field">Acting as <select value={who} data-testid="fl-who" disabled={!!busy} onChange={(e: { target: { value: string } }) => change(e.target.value)}>{PEOPLE.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <button type="button" className="ui-btn ui-btn--sm" data-testid="fl-read" disabled={!!busy} onClick={() => void read(who)}>Read the server again</button>
            <span className="ui-meta" data-testid="fl-at" data-as={data.as}>read at {when(data.at)} as the {PEOPLE.find(([k]) => k === data.as)?.[1].toLowerCase()} · sandbox <span className="ui-mono">{sb.tenant}</span></span>
          </div>
        </section>

        <div className="fl__work">
          <Card icon="map" title="Plan" sub={`${R.devices.filter((d) => !d.furniture).length} device positions and ${R.devices.filter((d) => d.furniture).length} pieces of furniture, to scale`} testId="fl-plan-card">
            <p className="fl__toggles">
              <label><input type="checkbox" checked={showLinks} data-testid="fl-links" onChange={(e: { target: { checked: boolean } }) => setShowLinks(e.target.checked)} /> Every connection</label>
              <label><input type="checkbox" checked={showFurniture} data-testid="fl-furniture" onChange={(e: { target: { checked: boolean } }) => setShowFurniture(e.target.checked)} /> Furniture</label>
              <label><input type="checkbox" checked={showDesigned} data-testid="fl-designed" onChange={(e: { target: { checked: boolean } }) => setShowDesigned(e.target.checked)} /> Designed positions</label>
              <span className="ui-meta">{mover ? `Moving ${mover.label}: drag it, tap where it goes, or use the arrow keys.` : 'Choose a position to see its connections and its tests, and to move it.'}</span>
            </p>
            <Plan room={R.room} devices={R.devices} connections={R.connections} selected={selected} onSelect={setSelected} showLinks={showLinks} showFurniture={showFurniture} showDesigned={showDesigned} moving={moving} draft={draft} onDraft={setDraft} />
            <ul className="fl__legend" aria-label="What the plan’s marks mean" data-testid="fl-legend">
              <li><span className="fl__key" data-key="built" aria-hidden="true" /> where it is: as built</li>
              <li><span className="fl__key" data-key="designed" aria-hidden="true" /> where the design puts it, once it has moved</li>
              <li><span className="fl__key" data-key="proposed" aria-hidden="true" /> a move waiting for a decision</li>
              <li><span className="fl__key" data-key="draft" aria-hidden="true" /> your draft, not yet sent</li>
            </ul>
            <p className="ui-meta">Every position is the server’s answer: the design it holds, and the installation’s approved moves beside it. Connections are proposed by the design engine, not traced on site.</p>
          </Card>

          <Card icon="device" title={sel ? sel.label : 'Devices'} sub={sel ? `${sel.id} · ${sel.furniture ? 'furniture' : familyOf(sel.cat).family}` : `${R.devices.length} positions in the server’s record`} testId="fl-devices-card">
            {sel ? <div data-testid="fl-detail" data-device={sel.id}>
              <dl className="san__defs">
                <div><dt>Designed</dt><dd data-testid="fl-pos-designed">{at(sel.placement?.designed ?? sel)}, {sel.z} m up · {sel.mount}</dd></div>
                <div><dt>As built</dt><dd data-testid="fl-pos-built" data-basis={sel.placement?.basis || 'DESIGNED'}>{sel.placement?.asBuilt ? <>{at(sel.placement.asBuilt)} <Tag tone="ok">moved</Tag> <span className="ui-muted">{sel.placement.asBuilt.move}, approved by {sel.placement.asBuilt.decidedBy || 'someone else'}</span></> : <>as designed <span className="ui-muted">· no approved move</span></>}</dd></div>
                {sel.placement?.proposed ? <div><dt>Proposed</dt><dd data-testid="fl-pos-proposed">{at(sel.placement.proposed)} <Tag tone="warn">waiting</Tag> <span className="ui-muted">{sel.placement.proposed.move}, recorded by {sel.placement.proposed.by}</span></dd></div> : null}
                <div><dt>Model</dt><dd>{sel.modelName || (sel.model === 'generic' ? 'a class of device; no model chosen' : sel.model)}</dd></div>
                <div><dt>Installed unit</dt><dd>{sel.furniture ? 'furniture: no unit to identify' : sel.identityState && !/unknown/i.test(sel.identityState) ? words(sel.identityState) : 'not identified yet: the device register is still to be filled'}</dd></div>
                <div><dt>Connections</dt><dd data-testid="fl-detail-links">{selLinks.length ? <ul className="fl__list">{selLinks.map((k) => <li key={k.id}><Tag tone="muted">{k.kind}</Tag> {k.from === sel.id ? 'to' : 'from'} <button type="button" className="fl__linkbtn" onClick={() => setSelected(k.from === sel.id ? k.to : k.from)}>{label(k.from === sel.id ? k.to : k.from)}</button> <span className="ui-muted">· {k.why}</span></li>)}</ul> : 'none in the design'}</dd></div>
                <div><dt>Tests naming it</dt><dd data-testid="fl-detail-tests">{naming(sel.id).length} of {rows.length} applicable{naming(sel.id).length ? <> · <button type="button" className="fl__linkbtn" data-testid="fl-only" onClick={() => { setOnlySelected(true); setPhase('all'); }}>show only these</button></> : null}</dd></div>
              </dl>
              {/* a move waiting for a decision: decided on the server, by someone other than whoever recorded it */}
              {waiting ? <section className="fl__move" data-testid="fl-waiting" data-move={waiting.move} aria-label={`Proposed move ${waiting.move}`}>
                <h4>Proposed redline {waiting.move}</h4>
                <p>{at(waiting.from)} to <b>{at(waiting.to)}</b> · {waiting.metres} m · because of {waiting.reason}{waiting.note ? <> · “{waiting.note}”</> : null} <span className="ui-muted">· recorded by {waiting.by}</span></p>
                <label className="kit-field">Decision note (optional) <input type="text" value={decision} maxLength={400} data-testid="fl-decision" onChange={(e: { target: { value: string } }) => setDecision(e.target.value)} /></label>
                <p className="build__row"><button type="button" className="ui-btn ui-btn--primary ui-btn--sm" data-testid="fl-approve" disabled={!!busy} onClick={() => void decide(sel, waiting.move, true)}>Approve as the {person(who)}</button>
                  <button type="button" className="ui-btn ui-btn--sm" data-testid="fl-reject" disabled={!!busy} onClick={() => void decide(sel, waiting.move, false)}>Reject</button></p>
                {data.as === who && !waiting.mayDecide ? <p className="ui-meta" data-testid="fl-decide-hint">The server says the {person(who)} may not decide this move: a move is decided by someone other than its recorder who holds design approval. You can still ask; its refusal will be shown.</p> : null}
              </section> : null}
              {/* drafting a move: this browser's until it is submitted */}
              {mover && mover.id === sel.id && moverAt ? <section className="fl__move" data-testid="fl-move-panel" aria-label={`Move ${sel.label}`}>
                <h4>Move {sel.label}</h4>
                <p role="status" data-testid="fl-draft-at" data-x={draft?.x ?? ''} data-y={draft?.y ?? ''}>{draft && far >= 0.05 ? <>From {at(moverAt)} to <b>{at(draft)}</b>: {far} m.</> : <>Drag the marker on the plan, tap where it goes, or use the arrow keys. It is {at(moverAt)} now.</>}</p>
                <div className="fl__xy">
                  <label className="kit-field">Across (m) <input type="number" inputMode="decimal" min={0} max={R.room.geometry.widthM} step={0.05} value={(draft ?? moverAt).x} data-testid="fl-x" onChange={(e: { target: { value: string } }) => setDraft({ x: snap(Number(e.target.value) || 0, R.room.geometry.widthM), y: (draft ?? moverAt).y })} /></label>
                  <label className="kit-field">From the front (m) <input type="number" inputMode="decimal" min={0} max={R.room.geometry.lengthM} step={0.05} value={(draft ?? moverAt).y} data-testid="fl-y" onChange={(e: { target: { value: string } }) => setDraft({ x: (draft ?? moverAt).x, y: snap(Number(e.target.value) || 0, R.room.geometry.lengthM) })} /></label>
                </div>
                <label className="kit-field">Why it could not go where it was designed <select value={reason} data-testid="fl-reason" onChange={(e: { target: { value: string } }) => setReason(e.target.value)}><option value="">Choose a reason</option>{(F?.catalogue.moveReasons || []).map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
                <label className="kit-field">Note{reason === 'other' ? ' (needed for “other”)' : ' (optional)'} <input type="text" value={note} maxLength={400} data-testid="fl-note" onChange={(e: { target: { value: string } }) => setNote(e.target.value)} /></label>
                <p className="build__row"><button type="button" className="ui-btn ui-btn--primary ui-btn--sm" data-testid="fl-submit" disabled={!!busy || !ready} onClick={() => { if (draft) void propose(sel, draft); }}>Submit for approval as the {person(who)}</button>
                  <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" data-testid="fl-cancel" onClick={stopMove}>Cancel</button></p>
                {F && data.as === who && !F.may.record ? <p className="ui-meta" data-testid="fl-record-hint">The server says the {person(who)} may not record a field move. You can still ask; its refusal will be shown. The installer can.</p> : null}
              </section> : null}
              {sel.placement?.history.length ? <div data-testid="fl-history"><h4 className="fl__h4">Every move of this position</h4><ol className="fl__list fl__history">{sel.placement.history.map((h) => <li key={h.move} data-move={h.move} data-state={h.state}><span className="ui-mono">{h.move}</span> <Tag tone={tone(h.state)}>{words(h.state)}</Tag> {at(h.from)} to {at(h.to)} · {h.metres} m · {h.reason} <span className="ui-muted">· {h.by}{h.decidedBy ? `, decided by ${h.decidedBy}` : ''}</span></li>)}</ol></div> : null}
              {fieldOf(sel.id)?.recheck.length ? <p data-testid="fl-recheck"><Tag tone="warn">look again</Tag> {fieldOf(sel.id)!.recheck.length} tests name this device and have no result newer than its move: {fieldOf(sel.id)!.recheck.map((r) => r.label).join(' · ')}</p> : null}
              <p className="build__row">
                {!mover && !waiting && F?.writable ? <button type="button" className="ui-btn ui-btn--sm" data-testid="fl-move" disabled={!!busy} onClick={() => startMove(sel.id)}>Move this {sel.furniture ? 'position' : 'device'}</button> : null}
                <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" data-testid="fl-clear" onClick={() => { setSelected(null); setOnlySelected(false); stopMove(); }}>Back to every device</button></p>
              {F && !F.writable ? <p className="ui-meta" data-testid="fl-closed">The room’s field record is closed in this state: a change now is a change order and recommissioning.</p> : null}
            </div> : <ul className="fl__devs" data-testid="fl-devices">{R.devices.map((d) => <li key={d.id}><button type="button" className="fl__devbtn" data-device={d.id} onClick={() => setSelected(d.id)}>
              <span className="fl__chip" data-family={d.furniture ? 'furniture' : familyOf(d.cat).family} aria-hidden="true">{d.furniture ? '▭' : familyOf(d.cat).letter}</span>
              <span><b>{d.label}</b> <span className="ui-muted">{d.furniture ? 'furniture' : familyOf(d.cat).family}</span></span><span className="ui-mono ui-muted">{d.id}</span></button></li>)}</ul>}
          </Card>
        </div>

        <Card icon="layers" title="One position, three products" sub="Three separate questions to the server, answered just now" testId="fl-views-card">
          <p className="ui-meta">Engineering asks for the room, Lite asks for the field record, and Assurance asks for the baselines. The page compares the answers; it does not make them agree.</p>
          {compared.length ? <div className="fl__tablewrap"><table className="ui-table fl__views" data-testid="fl-views"><thead><tr><th scope="col">Position</th><th scope="col">Designed</th><th scope="col">Engineering: the room</th><th scope="col">Lite: the field record</th><th scope="col">Assurance: the baseline</th><th scope="col">Engineering and Lite</th></tr></thead>
            <tbody>{compared.map((d) => { const e = d.placement; const l = fieldOf(d.id); const b = B?.devices.find((x) => x.id === d.id)?.placement || null; const agree = !!(e && l && same(e.current, l.asBuilt));
              return <tr key={d.id} data-device={d.id} data-agree={agree ? 'yes' : 'no'}>
                <th scope="row">{d.label} <span className="ui-mono ui-muted">{d.id}</span></th>
                <td data-view="designed">{e ? at(e.designed) : 'not answered'}</td>
                <td data-view="engineering" data-x={e?.current.x} data-y={e?.current.y}>{e ? <>{at(e.current)} <Tag tone={e.basis === 'AS_BUILT' ? 'ok' : 'muted'}>{e.basis === 'AS_BUILT' ? 'as built' : 'as designed'}</Tag>{e.proposed ? <> <Tag tone="warn">a move is waiting</Tag></> : null}</> : 'not answered'}</td>
                <td data-view="lite" data-x={l?.asBuilt.x} data-y={l?.asBuilt.y}>{l ? <>{at(l.asBuilt)} {l.asBuilt.moved ? <span className="ui-muted">{l.asBuilt.moved}</span> : <span className="ui-muted">not moved</span>}</> : 'not readable as this person'}</td>
                <td data-view="assurance">{B ? (b ? <>{at(b.at)} <span className="ui-muted">in baseline {B.version}{b.asBuilt ? `, ${b.asBuilt.move}` : ''}</span></> : `not in baseline ${B.version}`) : <span className="ui-muted">no baseline yet: the room is not accepted</span>}</td>
                <td>{e && l ? <Tag tone={agree ? 'ok' : 'bad'}>{agree ? 'the same place' : 'different places'}</Tag> : <span className="ui-muted">cannot compare</span>}</td></tr>; })}</tbody></table></div>
            : <p data-testid="fl-views-none">No position has moved or has a move waiting, so every product reads the designed positions. Choose a device on the plan to compare it, or move one.</p>}
        </Card>

        {R.room.lifecycle === 'INSTALLED_UNVERIFIED' ? <Card icon="check" title="Before commissioning starts" sub="The server does not start commissioning on an unfilled device register" testId="fl-start-card">
          <p data-testid="fl-register-state" data-open={registerOpen} data-all={registerAll}>{data.register ? <>{registerAll - registerOpen} of {registerAll} units are in the register{registerOpen ? <>: {registerOpen} still need a serial{data.register.items.some((x) => x.missing.includes('hostname')) ? ', or a hostname and address' : ''}.</> : '.'}</> : 'The register could not be read as this person.'}</p>
          <p className="build__row">
            <button type="button" className="ui-btn ui-btn--sm" data-testid="fl-register" disabled={!!busy || !registerOpen} onClick={() => void fillRegister()}>Fill the register with synthetic values as the {person(who)}</button>
            <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" data-testid="fl-commission" disabled={!!busy} onClick={() => void startCommissioning()}>Start commissioning as the {person(who)}</button></p>
          <p className="ui-meta">The installer fills the register; the systems engineer starts commissioning. Asked as anyone else, the server refuses and its words are shown.</p>
        </Card> : null}

        <ReverbBench geometry={R.room.geometry} test={bench} lifecycle={R.room.lifecycle} person={person(who)} busy={!!busy} onRecord={(o) => void recordMeasurement(o)} />

        <Card icon="chart" title="Measurements on the server" sub={`${data.measured.length} recorded for this room’s tests`} testId="fl-measured-card">
          {data.measured.length ? <ol className="fl__list fl__measured" data-testid="fl-measured">{data.measured.map((m, i) => <li key={m.id} data-measurement={m.id} data-within={m.within === null ? 'none' : m.within ? 'yes' : 'no'} data-cited={m.cited_by_result || ''}>
            <span><b>{Number(m.value)} {m.unit}</b> <span className="ui-muted">{m.metric} · {m.test_id}</span></span>
            <span>{m.within === null ? <Tag tone="muted">no criterion: no verdict</Tag> : m.within ? <Tag tone="ok">meets the criterion</Tag> : <Tag tone="bad">does not meet the criterion</Tag>} {limitOf(m) ? <span className="ui-muted">{limitOf(m)}</span> : null}</span>
            <span><Tag tone={m.provenance === 'FIELD_MEASURED' && m.calibration_status === 'CALIBRATED' ? 'ok' : 'warn'}>{m.provenance === 'FIELD_MEASURED' ? `field measured, ${m.calibration_status === 'CALIBRATED' ? 'calibrated' : 'not calibrated'}` : words(m.provenance)}</Tag> <span className="ui-muted">{m.location} · {m.recorded_by_name}, {when(m.created_at)}</span></span>
            <span className="build__row">{m.cited_by_result ? <Tag tone={tone(m.cited_by_result)}>a result rests on it: {words(m.cited_by_result)}</Tag> : i === 0 ? <>
              <button type="button" className="ui-btn ui-btn--sm" data-testid="fl-result-pass" disabled={!!busy} onClick={() => void recordResult(m, 'PASS')}>Record PASS on it</button>
              <button type="button" className="ui-btn ui-btn--sm" data-testid="fl-result-fail" disabled={!!busy} onClick={() => void recordResult(m, 'FAIL')}>Record FAIL on it</button></> : <span className="ui-muted">superseded by a later measurement</span>}</span></li>)}</ol>
            : <p data-testid="fl-measured-none">Nothing has been measured yet. A measurement recorded at the bench appears here with the verdict the database gave it.</p>}
          <p className="ui-meta">Whether a value meets the criterion is worked out by the database when the measurement is recorded. A result is recorded on a measurement, and the server refuses PASS on one that does not meet the criterion.</p>
        </Card>

        <Card icon="alert" title="Deficiencies" sub={issues.length ? `${issues.filter((i) => i.state === 'OPEN').length} open of ${issues.length}` : 'None'} testId="fl-issues-card">
          {issues.length ? <ul className="fl__list fl__issues" data-testid="fl-issues">{issues.map((i) => <li key={i.code} data-issue={i.code} data-state={i.state}><p className="fl__issue"><span className="ui-mono">{i.code}</span> <Tag tone={i.state === 'OPEN' ? 'bad' : 'ok'}>{words(i.state)}</Tag> <b>{i.title}</b> <span className="ui-muted">· {words(i.workflow)}{i.workOrders.length ? ` · ${i.workOrders.join(', ')}` : ' · no work order yet'}</span></p>
            <CorrectiveAction issue={i} def={data.service[i.code]?.def || null} wo={data.service[i.code]?.wo || null}
              t={{ call: (method, path, body) => c.call(who, method, path, body), act, refused, person: person(who), busy: !!busy, roles: PEOPLE }} /></li>)}</ul>
            : <p data-testid="fl-issues-none">No deficiency is open on this room. A failed result opens one.</p>}
        </Card>

        <Card icon="check" title="Commissioning plan" sub={R.commissioning ? `${R.commissioning.applicable} of ${R.commissioning.library} tests apply to this room · rules ${R.commissioning.ruleVersion}, engine ${R.commissioning.engineVersion}` : 'The server holds no plan for this room'} testId="fl-cx-card">
          {R.commissioning ? <>
            <p className="ui-meta">The plan is compiled on the server from the room’s design: each test says why it applies, who records it and what evidence it needs. <span data-testid="fl-cx-counts">{R.commissioning.counts['recorded'] ?? 0} of {R.commissioning.applicable} have a result on the server; {R.commissioning.counts['verified'] ?? 0} are independently verified.</span></p>
            <div className="fl__phases" role="group" aria-label="Phase" data-testid="fl-phases">
              <button type="button" className="fl__phase" aria-pressed={phase === 'all'} onClick={() => setPhase('all')}>All <span>{rows.length}</span></button>
              {phases.map((p) => <button key={p} type="button" className="fl__phase" aria-pressed={phase === p} data-phase={p} onClick={() => setPhase(p)}>Phase {p} <span>{rows.filter((r) => r.phase === p).length}</span></button>)}
              {sel ? <label className="fl__only"><input type="checkbox" checked={onlySelected} data-testid="fl-only-box" onChange={(e: { target: { checked: boolean } }) => setOnlySelected(e.target.checked)} /> Only tests naming {sel.label}</label> : null}
            </div>
            <p className="ui-meta" data-testid="fl-count">{visible.length} tests shown</p>
            <div className="fl__tablewrap"><table className="ui-table fl__table" data-testid="fl-rows"><thead><tr><th scope="col">Test</th><th scope="col">Domain</th><th scope="col">Why it applies</th><th scope="col">Recorded by</th><th scope="col">Evidence</th><th scope="col">Result</th></tr></thead>
              <tbody>{visible.map((r) => <tr key={r.test_id} data-test={r.test_id} data-phase={r.phase}>
                <th scope="row">{r.label}{r.devices.length ? <span className="fl__names">{r.devices.map((id) => <button key={id} type="button" className="fl__linkbtn" onClick={() => setSelected(id)}>{label(id)}</button>)}</span> : null}</th>
                <td>{r.domain} <span className="ui-muted">· phase {r.phase}</span></td><td>{r.why.join('; ')}</td><td>{r.personas.join(', ')}</td><td>{r.evidence.map(words).join(', ')}{r.instrument ? ' · an instrument' : ''}</td>
                <td><Tag tone={tone(r.result)}>{words(r.result)}</Tag>{again.has(r.test_id) ? <> <span data-again={again.get(r.test_id)}><Tag tone="warn">look again: {label(again.get(r.test_id)!)} moved</Tag></span></> : null}</td></tr>)}</tbody></table></div>
          </> : null}
        </Card>

        <Card icon="route" title="The thread on the server" sub={data.thread ? (data.thread.complete ? 'Whole: every stage has its record' : `Still to do: ${(data.thread.missing || []).join(' · ') || 'the stages after installation'}`) : 'Not readable as this person'} testId="fl-thread-card">
          {data.thread ? <ol className="fl__stages" data-testid="fl-stages">{data.thread.stages.map((s) => { const facts = Object.entries(s.records).filter(([, v]) => typeof v === 'number' || typeof v === 'string' || Array.isArray(v)).slice(0, 6);
            return <li key={s.key} data-stage={s.key}><b>{s.product}</b><span className="fl__stagefacts">{facts.length ? facts.map(([k, v]) => <span key={k}><span className="ui-muted">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span> {Array.isArray(v) ? v.length : String(v)}</span>) : <span className="ui-muted">no record yet</span>}</span></li>; })}</ol>
            : <p>The thread could not be read as this person.</p>}
          <p className="ui-meta">The same sandbox carries the scenario room of <a href="#/connected">the connected journey</a>. Both rooms are records of one organization on one server.</p>
        </Card>
      </> : null}
    </div>
  );
}
