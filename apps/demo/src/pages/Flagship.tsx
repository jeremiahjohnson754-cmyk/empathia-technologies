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
 * Only a build with DEMO_API_URL has this page (registry.ops.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Card, Tag, Notice } from '@empathia/ui';
import { connected, SandboxGone, type Availability, type Sandbox } from '../connected/client.js';

export const FLAGSHIP_REF = 'UNI-SCI-110';
interface Device { id: string; cat: string; label: string; role: string; model: string; modelName: string | null; x: number; y: number; z: number; rot: number; mount: string; furniture?: boolean; lifecycle: string; identityState: string | null }
interface Connection { id: string; from: string; to: string; kind: string; why: string }
interface Row { test_id: string; label: string; pack: string; domain: string; phase: number; tier: number; applicable: boolean; why: string[]; personas: string[]; evidence: string[]; instrument: boolean; devices: string[]; result: string }
interface RoomAnswer {
  room: { code: string; canonicalRef: string | null; name: string; lifecycle: string; template: string; intendedUse: string; occupancy: number; rev: number; approvedRevision: number | null;
    geometry: { points: Array<[number, number]>; widthM: number; lengthM: number; ceiling: number; confidence: string; provenance: Record<string, string> }; classification: { archetypeName?: string; why?: string[] } | null };
  devices: Device[]; connections: Connection[]; drawings: Array<{ kind: string; state: string; revNo: number }>;
  commissioning: { engineVersion: string; ruleVersion: string; library: number; applicable: number; counts: Record<string, number>; rows: Row[] } | null;
}
interface Thread { room: { code: string; lifecycle: string; revision: number }; complete?: boolean; missing?: string[]; stages: Array<{ key: string; product: string; records: Record<string, unknown> }> }
interface Loaded { at: string; as: string; room: RoomAnswer; thread: Thread | null; place: { building: string; buildingName: string; site: string; siteName: string } | null }
type Said = { ok: boolean; title: string; text: string };

/** The people of a sandbox a visitor may read as. The server decides what each may see; this list only offers the choice. */
export const PEOPLE: Array<[string, string]> = [['cxeng', 'Commissioning engineer'], ['syseng', 'Systems engineer'], ['designer', 'Designer'], ['installer', 'Installer'], ['qa_reviewer', 'QA reviewer'], ['svcmgr', 'Service manager'], ['service', 'Service technician'], ['opslead', 'Operations lead'], ['exec', 'Executive'], ['requestor', 'Requestor']];
// the server's device categories (packages/commissioning-engine), grouped into the families the plan colours and letters
const FAMILY: Array<[RegExp, string, string]> = [[/^(display|ledwall)$/, 'display', 'D'], [/^(camera|seccam)$/, 'camera', 'C'], [/^mic/, 'microphone', 'M'], [/^(speaker|bar)$/, 'loudspeaker', 'S'], [/^amp$/, 'amplifier', 'P'], [/^dsp$/, 'dsp', 'A'],
  [/^(switch|pdu|rack)$/, 'network', 'N'], [/^(touch|control|scheduler|switcher|encoder)$/, 'control', 'T'], [/^compute$/, 'compute', 'U'], [/^(occsensor|lighting|iot|hvac)$/, 'building', 'B']];
export const familyOf = (cat: string): { family: string; letter: string } => { const f = FAMILY.find(([re]) => re.test(cat)); return f ? { family: f[1], letter: f[2] } : { family: 'other', letter: '•' }; };
const tone = (x: string): 'ok' | 'warn' | 'bad' | 'muted' => (/VERIFIED$|APPROVED|ACCEPTED|ok/.test(x) && !/UNVERIFIED/.test(x) ? 'ok' : /FAIL|REJECTED/.test(x) ? 'bad' : /UNVERIFIED|PENDING|GENERATED|COMMISSIONING|NOT_TESTED/.test(x) ? 'warn' : 'muted');
const words = (x: string) => x.replace(/_/g, ' ').toLowerCase();
const when = (iso: string) => { try { return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return iso; } };

/** The plan: the room's outline and every position, drawn to scale from the server's geometry. Front of the room at the top. */
function Plan({ room, devices, connections, selected, onSelect, showLinks, showFurniture }: { room: RoomAnswer['room']; devices: Device[]; connections: Connection[]; selected: string | null; onSelect: (id: string | null) => void; showLinks: boolean; showFurniture: boolean }) {
  const g = room.geometry; const pad = 1.6; const W = g.widthM; const L = g.lengthM;
  const shown = devices.filter((d) => showFurniture || !d.furniture); const at = new Map(devices.map((d) => [d.id, d]));
  const links = showLinks ? connections.filter((k) => at.has(k.from) && at.has(k.to)) : connections.filter((k) => selected && (k.from === selected || k.to === selected) && at.has(k.from) && at.has(k.to));
  const ticks = Array.from({ length: Math.floor(W / 4) + 1 }, (_, i) => i * 4); const rows = Array.from({ length: Math.floor(L / 4) + 1 }, (_, i) => i * 4);
  return (
    <svg className="fl__plan" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${L + 2 * pad}`} role="group" aria-label={`Plan of ${room.name}: ${W} by ${L} metres, ${shown.length} positions`} data-testid="fl-plan" data-width={W} data-length={L}>
      <g className="fl__grid" aria-hidden="true">{ticks.map((x) => <line key={`x${x}`} x1={x} y1={0} x2={x} y2={L} />)}{rows.map((y) => <line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} />)}</g>
      <polygon className="fl__outline" points={g.points.map((p) => p.join(',')).join(' ')} onClick={() => onSelect(null)} />
      <text className="fl__dim" x={W / 2} y={-0.55} textAnchor="middle">front · {W} m</text>
      <text className="fl__dim" x={-0.55} y={L / 2} textAnchor="middle" transform={`rotate(-90 ${-0.55} ${L / 2})`}>{L} m</text>
      <g aria-hidden="true">{links.map((k) => { const a = at.get(k.from)!; const b = at.get(k.to)!; return <line key={k.id} className="fl__link" data-kind={k.kind} data-on={selected && (k.from === selected || k.to === selected) ? 'yes' : 'no'} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; })}</g>
      {shown.map((d) => { const f = familyOf(d.cat); const on = d.id === selected;
        return <g key={d.id} className="fl__dev" data-family={d.furniture ? 'furniture' : f.family} data-on={on ? 'yes' : 'no'} data-device={d.id} transform={`translate(${d.x} ${d.y})`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${d.label}, ${d.furniture ? 'furniture' : f.family}, ${d.id}`}
          onClick={() => onSelect(on ? null : d.id)} onKeyDown={(e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(on ? null : d.id); } }}>
          <circle className="fl__hit" r={1.1} />
          {d.furniture ? <rect x={-0.55} y={-0.35} width={1.1} height={0.7} rx={0.12} /> : <circle r={0.48} />}
          {d.furniture ? null : <text y={0.2} textAnchor="middle">{f.letter}</text>}
        </g>; })}
    </svg>
  );
}

export function FlagshipPage() {
  const c = useMemo(() => connected(), []);
  const [avail, setAvail] = useState<Availability | null>(null); const [sb, setSb] = useState<Sandbox | null>(() => c.sandbox());
  const [who, setWho] = useState('cxeng'); const [data, setData] = useState<Loaded | null>(null); const [busy, setBusy] = useState<string | null>(null); const [said, setSaid] = useState<Said | null>(null);
  const [absent, setAbsent] = useState(false); const [selected, setSelected] = useState<string | null>(null); const [phase, setPhase] = useState<number | 'all'>('all');
  const [showLinks, setShowLinks] = useState(false); const [showFurniture, setShowFurniture] = useState(true); const [onlySelected, setOnlySelected] = useState(false);
  const alive = useRef(true); useEffect(() => () => { alive.current = false; }, []);

  const read = useCallback(async (as: string): Promise<void> => {
    if (!c.sandbox()) { setData(null); return; }
    setBusy('Reading the room from the server…'); setSaid(null);
    try {
      const room = await c.call<RoomAnswer>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}`);
      if (!alive.current) return;
      if (room.status === 404) { setAbsent(true); setData(null); return; }
      if (!room.ok) { setData(null); setSaid({ ok: false, title: `The server answered ${room.status}.`, text: room.detail }); return; }
      const [thread, list, sites] = await Promise.all([c.call<Thread>(as, 'GET', `/v1/rooms/${FLAGSHIP_REF}/thread`), c.call<{ items: Array<{ code: string; building: string }> }>(as, 'GET', '/v1/rooms?limit=50'),
        c.call<{ items: Array<{ code: string; name: string; buildings: Array<{ code: string; name: string }> }> }>(as, 'GET', '/v1/sites')]);
      if (!alive.current) return;
      const b = list.ok ? list.body.items.find((x) => x.code === room.body.room.code)?.building : undefined; const site = b && sites.ok ? sites.body.items.find((s) => s.buildings.some((x) => x.code === b)) : undefined;
      setAbsent(false); setData({ at: new Date().toISOString(), as, room: room.body, thread: thread.ok ? thread.body : null, place: b && site ? { building: b, buildingName: site.buildings.find((x) => x.code === b)!.name, site: site.code, siteName: site.name } : null });
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

  const R = data?.room; const rows = useMemo(() => (R?.commissioning?.rows || []).filter((r) => r.applicable), [R]);
  const phases = useMemo(() => [...new Set(rows.map((r) => r.phase))].sort((a, b) => a - b), [rows]);
  // the plan opens on its first phase: seventy-odd tests at once is a long page, and a phase is how the work is done
  const opened = useRef(false); useEffect(() => { if (!opened.current && phases.length) { opened.current = true; setPhase(phases[0]!); } }, [phases]);
  const sel = R && selected ? R.devices.find((d) => d.id === selected) || null : null;
  const selLinks = R && sel ? R.connections.filter((k) => k.from === sel.id || k.to === sel.id) : [];
  const naming = (id: string) => rows.filter((r) => r.devices.includes(id));
  const visible = rows.filter((r) => (phase === 'all' || r.phase === phase) && (!onlySelected || !sel || r.devices.includes(sel.id)));
  const label = (id: string) => R?.devices.find((d) => d.id === id)?.label || id;

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
      {said ? <div data-testid="fl-said" data-ok={said.ok ? 'yes' : 'no'}><Notice tone={said.ok ? 'ok' : 'bad'}><b>{said.title}</b> {said.text}</Notice></div> : null}

      {sb && R && data ? <>
        <section className="fl__bar" aria-label="The room and who is reading it" data-testid="fl-bar">
          <div className="fl__id"><span className="ui-mono fl__ref" data-testid="fl-ref">{R.room.canonicalRef}</span><b data-testid="fl-name">{R.room.name}</b>
            <span className="ui-muted" data-testid="fl-place">{data.place ? `${data.place.buildingName} · ${data.place.siteName}` : 'building not readable as this person'}</span></div>
          <dl className="fl__facts">
            <div><dt>State</dt><dd><Tag tone={tone(R.room.lifecycle)}>{words(R.room.lifecycle)}</Tag></dd></div>
            <div><dt>Seats</dt><dd data-testid="fl-seats">{R.room.occupancy}</dd></div>
            <div><dt>Size</dt><dd data-testid="fl-size">{R.room.geometry.lengthM} × {R.room.geometry.widthM} × {R.room.geometry.ceiling} m <span className="ui-muted">({R.room.geometry.confidence})</span></dd></div>
            <div><dt>Design</dt><dd>revision {R.room.rev}{R.room.approvedRevision ? `, approved at ${R.room.approvedRevision}` : ''}</dd></div>
            <div><dt>Server’s code</dt><dd className="ui-mono" data-testid="fl-code">{R.room.code}</dd></div>
          </dl>
          <div className="fl__who">
            <label className="kit-field">Read as <select value={who} data-testid="fl-who" disabled={!!busy} onChange={(e: { target: { value: string } }) => change(e.target.value)}>{PEOPLE.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <button type="button" className="ui-btn ui-btn--sm" data-testid="fl-read" disabled={!!busy} onClick={() => void read(who)}>Read the server again</button>
            <span className="ui-meta" data-testid="fl-at" data-as={data.as}>read at {when(data.at)} as the {PEOPLE.find(([k]) => k === data.as)?.[1].toLowerCase()} · sandbox <span className="ui-mono">{sb.tenant}</span></span>
          </div>
        </section>

        <div className="fl__work">
          <Card icon="map" title="Plan" sub={`${R.devices.filter((d) => !d.furniture).length} device positions and ${R.devices.filter((d) => d.furniture).length} pieces of furniture, to scale`} testId="fl-plan-card">
            <p className="fl__toggles">
              <label><input type="checkbox" checked={showLinks} data-testid="fl-links" onChange={(e: { target: { checked: boolean } }) => setShowLinks(e.target.checked)} /> Every connection</label>
              <label><input type="checkbox" checked={showFurniture} data-testid="fl-furniture" onChange={(e: { target: { checked: boolean } }) => setShowFurniture(e.target.checked)} /> Furniture</label>
              <span className="ui-meta">Choose a position to see its connections and its tests.</span>
            </p>
            <Plan room={R.room} devices={R.devices} connections={R.connections} selected={selected} onSelect={setSelected} showLinks={showLinks} showFurniture={showFurniture} />
            <p className="ui-meta">Positions and connections are the design the server holds (designed and installed, not yet verified). Connections are proposed by the design engine, not traced on site.</p>
          </Card>

          <Card icon="device" title={sel ? sel.label : 'Devices'} sub={sel ? `${sel.id} · ${sel.furniture ? 'furniture' : familyOf(sel.cat).family}` : `${R.devices.length} positions in the server’s record`} testId="fl-devices-card">
            {sel ? <div data-testid="fl-detail" data-device={sel.id}>
              <dl className="san__defs">
                <div><dt>Position</dt><dd>{sel.x} m across, {sel.y} m from the front, {sel.z} m up · {sel.mount}</dd></div>
                <div><dt>Model</dt><dd>{sel.modelName || (sel.model === 'generic' ? 'a class of device; no model chosen' : sel.model)}</dd></div>
                <div><dt>Installed unit</dt><dd>{sel.furniture ? 'furniture: no unit to identify' : sel.identityState && !/unknown/i.test(sel.identityState) ? words(sel.identityState) : 'not identified yet: the device register is still to be filled'}</dd></div>
                <div><dt>Connections</dt><dd data-testid="fl-detail-links">{selLinks.length ? <ul className="fl__list">{selLinks.map((k) => <li key={k.id}><Tag tone="muted">{k.kind}</Tag> {k.from === sel.id ? 'to' : 'from'} <button type="button" className="fl__linkbtn" onClick={() => setSelected(k.from === sel.id ? k.to : k.from)}>{label(k.from === sel.id ? k.to : k.from)}</button> <span className="ui-muted">· {k.why}</span></li>)}</ul> : 'none in the design'}</dd></div>
                <div><dt>Tests naming it</dt><dd data-testid="fl-detail-tests">{naming(sel.id).length} of {rows.length} applicable{naming(sel.id).length ? <> · <button type="button" className="fl__linkbtn" data-testid="fl-only" onClick={() => { setOnlySelected(true); setPhase('all'); }}>show only these</button></> : null}</dd></div>
              </dl>
              <p className="build__row"><button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" data-testid="fl-clear" onClick={() => { setSelected(null); setOnlySelected(false); }}>Back to every device</button></p>
            </div> : <ul className="fl__devs" data-testid="fl-devices">{R.devices.map((d) => <li key={d.id}><button type="button" className="fl__devbtn" data-device={d.id} onClick={() => setSelected(d.id)}>
              <span className="fl__chip" data-family={d.furniture ? 'furniture' : familyOf(d.cat).family} aria-hidden="true">{d.furniture ? '▭' : familyOf(d.cat).letter}</span>
              <span><b>{d.label}</b> <span className="ui-muted">{d.furniture ? 'furniture' : familyOf(d.cat).family}</span></span><span className="ui-mono ui-muted">{d.id}</span></button></li>)}</ul>}
          </Card>
        </div>

        <Card icon="check" title="Commissioning plan" sub={R.commissioning ? `${R.commissioning.applicable} of ${R.commissioning.library} tests apply to this room · rules ${R.commissioning.ruleVersion}, engine ${R.commissioning.engineVersion}` : 'The server holds no plan for this room'} testId="fl-cx-card">
          {R.commissioning ? <>
            <p className="ui-meta">The plan is compiled on the server from the room’s design: each test says why it applies, who records it and what evidence it needs. Nothing has been recorded yet: {R.commissioning.counts['notTested']} not tested, {R.commissioning.counts['verified']} verified.</p>
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
                <td><Tag tone={tone(r.result)}>{words(r.result)}</Tag></td></tr>)}</tbody></table></div>
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
