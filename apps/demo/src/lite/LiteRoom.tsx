/**
 * One room in Lite: an interactive 3D room (orbit, tilt, plan, zoom) with Lite's layers, the five coverage overlays and the four states
 * (Designed · Commissioned · Current · Proposed), a lens panel for who is looking, divisible configurations and, for operations rooms,
 * the non-operational label. Address: #/lite/room/<id>?mode=<lens>&state=<state>&ov=<a,b>&ly=<a,b>&cfg=<config>&device=<code>.
 * Everything shown is computed by model.ts from the room's record; every figure names its basis.
 */
import { OBJECT_CARDS, DEVICE_PURPOSE } from './data/objectCards.js';
import { readsManual } from '../manual/roles.js';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { PageHero, Card, Chip, ScoreRing, StatTile, Icon, bandOf, HEALTH } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { mayCapture } from '../instant/store.js';
import { roomRecord, openIssues, campusRecords, C, type RoomRecord } from '../campus/design.js';
import { shortName, buildingByKey, roomHref } from '../campus/canon.js';
import { LIFE_TONE } from '../campus/CampusPage.js';
import {
  chapterById, coverage, lensesFor, layersFor, overlaysFor, defaultLayers, defaultOverlays, roomState, STATES, configsOf, configStatus, readiness, pct, occupancy, routeTo,
  ALL_SITES, buildingSummary, liteRoomHref, spatialDrift, type Lens, type LiteLayer, type Overlay, type StateKey, type SpatialDrift,
} from './model.js';
import { driftOf, setDrift, type DriftDecision } from './drift.js';
import { RoomScene, OrbitBar, useOrbit } from './Scene.js';
import { LiteNav, LiteMissing, storedLens, saveLens, setQuery } from './LiteApp.js';
import { WhoKnows } from '../connect/ContactBar.js';

const list = (s: string | null) => (s == null ? null : s.split(',').filter(Boolean));

export function LiteRoom({ role, id, query }: PageProps & { id: string }) {
  const r = useMemo(() => roomRecord(id), [id]);
  const orbit = useOrbit();
  const dev = query.get('device');
  const [sel, setSel] = useState<string | null>(dev);
  useEffect(() => { setSel(dev); }, [id, dev]);
  // the Optimize lens's "change the room" (V2.5.3, restored 12 Nov 2026): moves in 25 cm steps and a seat count, held in the page until sent
  const [ed, setEd] = useState<{ mv: Record<string, [number, number]>; seats: number }>({ mv: {}, seats: 0 }); const [tool, setTool] = useState<string | null>(null);
  useEffect(() => { setEd({ mv: {}, seats: 0 }); }, [id, query.get('state')]);
  // spatial drift (V2.5.3, restored 12 Nov 2026): the room's choice, kept on this device
  const drift = useMemo(() => (r ? spatialDrift(r) : null), [r]); const [dv, setDv] = useState<DriftDecision | null>(() => driftOf(id));
  useEffect(() => { setDv(driftOf(id)); }, [id]);
  if (!r) return <LiteMissing what={`room “${id}”`} />;
  const o = r.outline; const B = buildingByKey(o.building)!;
  const lens = storedLens(role, query.get('mode'));
  if (!lens) return <LiteMissing what="lens for this role" />;
  const mayLayers = layersFor(role); const mayOv = overlaysFor(role);
  const asked = list(query.get('ly')); const askedOv = list(query.get('ov'));
  const layers = new Set<LiteLayer>((asked ?? defaultLayers(lens, role)).filter((k) => mayLayers.some((l) => l.key === k)) as LiteLayer[]);
  const overlays = new Set<Overlay>((askedOv ?? defaultOverlays(lens)).filter((k) => mayOv.some((x) => x.key === k)) as Overlay[]);
  const stateKey = (STATES.find((s) => s.key === query.get('state'))?.key || 'current') as StateKey;
  const st0 = roomState(r, stateKey);
  const restored = stateKey === 'current' && !!drift && dv?.v === 'restore';
  const st = restored ? (() => { const back = new Map(drift!.moved.map((m) => [m.code, m.from])); const ps = st0.positions.map((x) => { const f = back.get(x.code); return f ? { ...x, x: f[0], y: f[1], mark: 'same' as const, note: 'restored to the commissioned layout (simulated, on this device)' } : x; });
    return { ...st0, positions: ps, cov: coverage(r, ps), marks: { ...st0.marks, moved: 0, same: st0.marks.same + st0.marks.moved }, summary: `${st0.summary} Shown restored to the commissioned layout (simulated, on this device).` }; })() : st0;
  const ghosts = stateKey === 'current' && drift && !restored ? drift.moved : undefined;
  const configs = configsOf(o); const cfg = configs.find((c) => c.key === query.get('cfg')) || configs[0] || null;
  const base = liteRoomHref(id);
  const upd = (k: string, v: string | null) => { const n = new URLSearchParams(query); if (v == null || v === '') n.delete(k); else n.set(k, v); setQuery(base, n); };
  const toggle = (k: 'ly' | 'ov', key: string, cur: Set<string>) => { const n = new Set(cur); if (n.has(key)) n.delete(key); else n.add(key); upd(k, [...n].join(',') || ','); };
  const pickLens = (l: Lens) => { saveLens(l); const n = new URLSearchParams(query); n.set('mode', l); n.delete('ly'); n.delete('ov'); setQuery(base, n); };
  const edited = lens === 'optimize' && (Object.keys(ed.mv).length > 0 || ed.seats !== 0);
  const positions = edited ? st.positions.map((x) => { const m = ed.mv[x.code]; return m ? { ...x, x: Math.min(o.dims[0] - 0.2, Math.max(0.2, x.x + m[0])), y: Math.min(o.dims[1] - 0.2, Math.max(0.2, x.y + m[1])), mark: 'moved' as const, note: `moved by you ${m[0] >= 0 ? '+' : ''}${m[0]}, ${m[1] >= 0 ? '+' : ''}${m[1]} m${x.mark !== 'same' ? `; was ${x.mark}` : ''}` } : x; }) : st.positions;
  const cov = edited ? coverage(r, positions, ed.seats) : st.cov; const p = positions.find((x) => x.code === sel) || null;
  const occ = layers.has('occupancy') ? occupancy(r, cov.seats) : undefined;
  const score = readiness(r); const issues = openIssues(r);
  const partitions = cfg && o.divisible ? o.divisible.sections.slice(1).map((_, i) => (o.dims[0] * (i + 1)) / o.divisible!.sections.length) : [];
  const count = (cats: string[]) => st.positions.filter((x) => cats.includes(x.cat)).length;
  const lensesOpen = lensesFor(role);
  return (
    <section className="lt-page lt-roompage" data-testid="lite-room" data-room={id} data-state={stateKey} data-lens={lens}>
      <LiteNav here="" role={role} />
      <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/lite">Lite</a></li><li><a href={`#/lite/b/${o.building}`}>{B.name}</a></li><li><a href={`#/lite/b/${o.building}/${o.floor}`}>Floor {o.floor}</a></li><li><span aria-current="page">{o.number}</span></li></ol></nav>
      <PageHero product="lite" icon="room" compact eyebrow={`${shortName(o)} · ${r.archetypeName} · ${o.capacity} seats`} title={o.name} lede={o.intent}
        meta={[<Chip key="l" small tone={LIFE_TONE[r.lifecycle] || 'muted'}>{r.lifecycle.toLowerCase().replace(/_/g, ' ')}</Chip>, <Chip key="s" small tone="muted">Class templates · spec to verify</Chip>, <Chip key="g" small tone="muted">Geometry {r.geometryProvenance.toLowerCase()}</Chip>, ...(o.planRow ? [<Chip key="p" small tone="info">{o.roster ? `90-room estate · row ${o.planRow} · ${o.sector}` : `Rooms plan · row ${o.planRow}`}</Chip>] : []), ...(issues.length ? [<Chip key="i" small tone="warn" icon="alert">{issues.length} open issue{issues.length === 1 ? '' : 's'}</Chip>] : [])]}
        aside={<ScoreRing value={score} size={96} label="Readiness" caption="Verified tests and open issues on the record" />} />
      {o.nonOperational && <p className="lt-nonop" role="note" data-testid="lite-nonop"><Icon name="info" size={16} /> <b>Simulated · non-operational.</b> This is a demonstration of an operations room. Nothing here monitors, controls or alerts on a real system; every number is computed from the synthetic records.</p>}
      {lensesOpen.length > 1 && <div className="lt-lenses lt-lenses--sm" role="radiogroup" aria-label="Lite lens">{lensesOpen.map((l) => <button key={l.key} type="button" role="radio" aria-checked={lens === l.key} className={`lt-lens${lens === l.key ? ' on' : ''}`} onClick={() => pickLens(l.key)} data-testid={`lite-lens-${l.key}`}><b>{l.label}</b><span>{l.gives}</span></button>)}</div>}
      <div className="lt-states" role="radiogroup" aria-label="Room state" data-testid="lite-states">
        {STATES.map((s) => { const x = s.key === stateKey ? st : null; return <button key={s.key} type="button" role="radio" aria-checked={s.key === stateKey} className={`lt-state lt-state--${s.key}${s.key === stateKey ? ' on' : ''}`} onClick={() => upd('state', s.key === 'current' ? null : s.key)} data-testid={`lite-state-${s.key}`}><b>{s.label}</b><span>{s.says}</span>{x && !x.available ? <em>none on record</em> : null}</button>; })}
      </div>
      <div className="lt-roomgrid">
        <div className="lt-stagecol">
          <figure className="stage lt-stage" data-stage="">
            <div className="stage__bar"><OrbitBar orbit={orbit} /></div>
            <RoomScene label={`${o.name} in 3D, ${st.title}`} w={o.dims[0]} l={o.dims[1]} h={o.dims[2]} view={orbit.view} positions={positions} connections={r.connections} layers={layers} overlays={overlays} cov={cov}
              selected={sel} onSelect={(c) => setSel(c === sel ? null : c)} occupied={occ} partitions={partitions} active={cfg && cfg.key !== 'combined' ? [cfg.x0, cfg.x1] : null} bind={orbit.bind} ghosts={ghosts} />
            <figcaption className="stage__cap"><b>{st.title}.</b> {st.summary} <span className="ui-meta">Basis: {st.basis}. Drag to orbit; the buttons do the same.</span></figcaption>
          </figure>
          <Legend overlays={overlays} marks={st.marks} />
        </div>
        <aside className="lt-panel" aria-label="Layers, overlays and the selected device">
          {mayOv.length > 0 && <fieldset className="lt-switches" data-testid="lite-overlays"><legend>Overlays</legend>
            {mayOv.map((x) => { const on = overlays.has(x.key); return <button key={x.key} type="button" role="switch" aria-checked={on} className={`lt-switch lt-switch--${x.key}${on ? ' on' : ''}`} onClick={() => toggle('ov', x.key, overlays)} data-testid={`lite-ov-${x.key}`}><span className="lt-switch__name">{x.label}</span><span className="lt-switch__v">{ovValue(x.key, cov)}</span><span className="lt-switch__knob" aria-hidden="true" /></button>; })}
          </fieldset>}
          {(() => { const sigKeys = (['av', 'network', 'control'] as LiteLayer[]).filter((k) => mayLayers.some((l) => l.key === k)); if (!sigKeys.length) return null; const sigOn = sigKeys.every((k) => layers.has(k)) && overlays.size === 0; const xm = query.get('xm') === '1';
            const signal = () => { const n = new URLSearchParams(query); if (sigOn) n.set('ly', [...layers].filter((k) => k !== 'network' && k !== 'control').join(',') || ','); else { n.set('ly', [...new Set([...layers, ...sigKeys])].join(',')); n.set('ov', ','); } setQuery(base, n); };
            return <fieldset className="lt-switches lt-switches--xray" data-testid="lite-xray"><legend>X-ray</legend>
              <button type="button" role="switch" aria-checked={sigOn} className={`lt-switch${sigOn ? ' on' : ''}`} onClick={signal} data-testid="lite-x-signal" title="AV, network and control layers together, overlays off"><span className="lt-switch__name">Signal flow</span><span className="lt-switch__v">{sigOn ? 'on' : 'off'}</span><span className="lt-switch__knob" aria-hidden="true" /></button>
              <button type="button" role="switch" aria-checked={xm} className={`lt-switch${xm ? ' on' : ''}`} onClick={() => upd('xm', xm ? null : '1')} data-testid="lite-x-meas" title="Modeled figures beside measured ones, never mixed"><span className="lt-switch__name">Measurements</span><span className="lt-switch__v">{xm ? 'shown' : 'hidden'}</span><span className="lt-switch__knob" aria-hidden="true" /></button>
              {allows({ area: 'studio' }, role) && <a className="ui-btn ui-btn--quiet" href={`#/studio/room/${encodeURIComponent(id)}`} data-testid="lite-x-studio">Design a space with this room</a>}
            </fieldset>; })()}
          <fieldset className="lt-switches lt-switches--layers" data-testid="lite-layers"><legend>Layers</legend>
            {mayLayers.map((x) => { const on = layers.has(x.key); return <button key={x.key} type="button" role="switch" aria-checked={on} className={`lt-switch${on ? ' on' : ''}`} onClick={() => toggle('ly', x.key, layers)} data-testid={`lite-ly-${x.key}`} title={x.says}><span className="lt-switch__name">{x.label}</span><span className="lt-switch__knob" aria-hidden="true" /></button>; })}
          </fieldset>
          <div className="lt-device" aria-live="polite" data-testid="lite-device">
            {p ? <><h2 className="lt-h3">{p.label}</h2><dl className="lt-dl"><dt>Position</dt><dd className="mono">{p.code}</dd><dt>Asset</dt><dd className="mono">{p.asset || '—'}</dd><dt>Identity</dt><dd>{p.identity}</dd><dt>Device</dt><dd>{p.device}</dd><dt>Height</dt><dd>{p.z} m</dd>{p.note && <><dt>State</dt><dd>{p.note}</dd></>}</dl>
              <ObjectCardView p={p} r={r} tech={lens === 'engineer' || lens === 'optimize'} cov={cov} role={role} onMove={lens === 'optimize' && MOVABLE.includes(p.cat) ? () => { setTool(p.code); document.querySelector('[data-testid="lite-change"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); } : undefined} />
              {allows({ area: 'room' }, role) && <a href={`${roomHref(o)}?device=${encodeURIComponent(p.code)}`}>Open in the technical room view →</a>}</>
              : <p className="ui-muted">Choose a device in the 3D view to see its position, asset and identity.</p>}
          </div>
        </aside>
      </div>
      {query.get('xm') === '1' && <Measurements cov={cov} w={o.dims[0]} l={o.dims[1]} />}
      <ul className="lt-metrics" aria-label="Room metrics, modeled">
        {overlaysFor(role).some((x) => x.key === 'camera') && <li><StatTile label="Camera coverage" value={pct(cov.camera.covered, cov.camera.of)} unit="%" icon="eye" tone="indigo" hint={`${cov.camera.covered} of ${cov.camera.of} seats in view · modeled`} testId="lite-m-camera" /></li>}
        {overlaysFor(role).some((x) => x.key === 'mic') && <li><StatTile label="Microphone pickup" value={pct(cov.mic.covered, cov.mic.of)} unit="%" icon="pulse" tone="ok" hint={`${cov.mic.covered} of ${cov.mic.of} ${cov.pickup.of}${cov.pickup.worn ? ` · ${cov.pickup.worn} worn channels` : ''} · modeled`} /></li>}
        {overlaysFor(role).some((x) => x.key === 'speaker') && <li><StatTile label="Speaker zones" value={cov.speakers.length ? cov.speaker.pct : '—'} unit={cov.speakers.length ? '% of floor' : undefined} icon="layers" tone="warn" hint={cov.speakers.length ? `${cov.speakers.length} loudspeakers · illustrative` : 'no loudspeaker in the design'} /></li>}
        <li><StatTile label="Accessibility" value={`${cov.access.wheelchair}/${cov.access.required}`} icon="user" tone="info" hint={`wheelchair places · route ${cov.access.routeClear} m clear${cov.access.receivers ? ` · ${cov.access.receivers} assistive-listening receivers` : ''} · planning reference`} testId="lite-m-access" /></li>
        {overlaysFor(role).some((x) => x.key === 'infra') && <li><StatTile label="Infrastructure fit" value={cov.infra.fits ? 'Fits' : 'Over'} icon="device" tone={cov.infra.fits ? 'ok' : 'bad'} hint={cov.infra.budget ? `PoE ${cov.infra.poe} W of ${cov.infra.budget} W · ${cov.infra.networked} of ${cov.infra.ports} ports · declared` : `PoE ${cov.infra.poe} W from the floor switch (no room switch in the design) · declared`} testId="lite-m-infra" /></li>}
      </ul>
      <div className="lt-twocol">
        <Card title="Devices in this state" icon="device"><ul className="lt-counts">
          {([['Cameras', ['camera', 'bar']], ['Microphones', ['micceil', 'mictable', 'micwireless']], ['Loudspeakers', ['speaker']], ['Displays', ['display', 'ledwall', 'projector']], ['Control', ['control', 'touch', 'compute', 'scheduler']], ['Network', ['switch']]] as Array<[string, string[]]>).map(([label, cats]) => <li key={label}><span>{label}</span><b>{count(cats)}</b></li>)}
          <li><span>Network endpoints</span><b>{st.positions.filter((x) => !x.furniture && x.cat !== 'switch' && ['camera', 'bar', 'micceil', 'mictable', 'touch', 'scheduler', 'compute', 'control', 'dsp', 'encoder', 'occsensor', 'seccam', 'iot'].includes(x.cat)).length}</b></li>
        </ul>{st.marks.added + st.marks.changed + st.marks.attention + st.marks.moved > 0 && <p className="ui-meta">{[st.marks.added && `${st.marks.added} added`, st.marks.changed && `${st.marks.changed} replaced`, st.marks.attention && `${st.marks.attention} need attention`, st.marks.moved && `${st.marks.moved} moved`].filter(Boolean).join(' · ')}</p>}</Card>
        <LensPanel lens={lens} r={r} role={role} />
      </div>
      {lens === 'optimize' && drift && stateKey === 'current' && <DriftCard d={drift} dv={dv} onChoose={(v) => { setDrift(id, v, role); setDv(driftOf(id)); }} roomId={id} techHref={allows({ area: 'room' }, role) ? roomHref(o) : null} />}
      {lens === 'optimize' && <ChangeRoom positions={st.positions} base={st.cov} cov={cov} ed={ed} setEd={setEd} tool={tool} setTool={setTool} roomId={id} edited={edited} />}
      {cfg && <Card title="Configurations" sub="A divisible room: each configuration has its own requirements and its own commissioning." icon="layers" testId="lite-configs">
        <div className="lt-cfgs" role="radiogroup" aria-label="Configuration">{configs.map((c) => <button key={c.key} type="button" role="radio" aria-checked={c.key === cfg.key} className={`lt-chipbtn${c.key === cfg.key ? ' on' : ''}`} onClick={() => upd('cfg', c.key === 'combined' ? null : c.key)} data-testid={`lite-cfg-${c.key}`}>{c.label}</button>)}</div>
        <div className="table-wrap"><table className="lt-table"><thead><tr><th scope="col">Configuration</th><th scope="col">Seats</th><th scope="col">Cameras</th><th scope="col">Ceiling and table mics</th><th scope="col">Commissioning</th></tr></thead>
          <tbody>{configs.map((c) => { const s = configStatus(r, c); return <tr key={c.key} aria-current={c.key === cfg.key ? 'true' : undefined}><th scope="row">{c.label}<div className="ui-meta">{s.note}</div></th><td>{s.seats}</td><td>{s.cameras}</td><td>{s.mics}</td><td>{s.commissioned ? <Chip small tone="ok">commissioned</Chip> : <Chip small tone="warn">not yet</Chip>}</td></tr>; })}</tbody></table></div>
      </Card>}
      {o.scenario && <Card title="This room’s scenario" icon="play" testId="lite-scenario"><p>{o.scenario}</p>{o.template?.note && <p className="ui-meta">Design basis: {o.template.note}.</p>}</Card>}
      {o.id === 'R-ATL-6-300' && <FleetWall />}
      <WhoKnows role={role} kind="room" id={o.id} />
      <p className="ui-meta lt-foot">Elsewhere: <a href={`#/guide/room/${o.id}`} data-testid="lite-guide">how to use this room</a> · <a href={`#/here/${o.id}`} data-testid="lite-here">I am in this room</a>{role !== 'visitor' ? <> · <a href={`#/people?room=${o.id}`} data-testid="lite-who">who knows this room</a></> : null}{mayCapture(role) ? <> · <a href={`#/instant/${o.id}`} data-testid="lite-capture">capture this room</a></> : null}{readsManual(role) ? <> · <a href={`#/manual/build?room=${o.id}`} data-testid="lite-standards">the standards this room is held to</a></> : null}{allows({ area: 'control' }, role) && <> · <a href={`#/control/${o.id}`} data-testid="lite-control">operate this room</a></>} · <a href={`#/search?focus=Room:${o.id}`}>Search Party from this room</a>{allows({ area: 'room' }, role) && <> · <a href={roomHref(o)}>technical room view</a></>} · <a href={`#/lite/way?to=${o.id}`}>find the way</a>{allows({ area: 'scouter' }, role) && <> · <a href="#/lite/scouter">ask Scouter about a device</a></>}</p>
    </section>
  );
}

function ovValue(k: Overlay, cov: ReturnType<typeof roomState>['cov']): string {
  if (k === 'camera') return `${pct(cov.camera.covered, cov.camera.of)} %`;
  if (k === 'mic') return `${pct(cov.mic.covered, cov.mic.of)} %`;
  if (k === 'speaker') return cov.speakers.length ? `${cov.speaker.pct} %` : '—';
  if (k === 'sight') return cov.sight.na ? '—' : `${cov.sight.clear}/${cov.seats.length}`;
  if (k === 'access') return `${cov.access.wheelchair}/${cov.access.required}`;
  return cov.infra.fits ? 'fits' : 'over';
}

/** The measurements panel (V2.5.3 liteXray, restored 12 Nov 2026): what the coverage model says for this state of the room, beside what was
 *  measured. No acoustic or intelligibility measurement is on record for these synthetic rooms, and this build has no acoustic model, so those
 *  rows say so instead of showing a number. */
function Measurements({ cov, w, l }: { cov: ReturnType<typeof roomState>['cov']; w: number; l: number }) {
  const n = cov.seats.length; const none = 'Not modeled here · no measurement on record';
  const rows: Array<[string, string, string, string]> = [
    [`${cov.pickup.of === 'seats' ? 'Seats' : 'Stage positions'} in primary microphone pickup`, cov.mics.length || cov.pickup.worn ? `${cov.mic.covered} of ${cov.mic.of}` : '—', '', 'Modeled · not measured'],
    ['Rear-row speech intelligibility (lowest seat)', '—', 'STI', none], ['Reverberation time', '—', 's', none], ['Background noise', '—', 'dBA', none],
    ['Seats inside a camera view', cov.cones.length ? `${pct(cov.camera.covered, cov.camera.of)}` : '—', '%', 'Modeled · not measured'],
    ['Seats inside loudspeaker coverage', cov.speakers.length ? `${cov.speakerSeats} of ${n}` : '—', '', 'Modeled · not measured'],
    ['Clear display sightlines', cov.sight.na ? '—' : `${cov.sight.clear} of ${n}`, '', cov.sight.na ? 'No display in this state' : `Modeled · ${cov.sight.marginal} marginal, ${cov.sight.obstructed} obstructed`],
    ['Floor area', `${Math.round(w * l)}`, 'm²', 'From the room record'],
  ];
  return <section className="lt-meas" aria-label="Measurements" data-testid="lite-meas">
    {rows.map(([label, v, unit, basis]) => <div key={label} className="lt-meas__m"><b>{v}{unit && v !== '—' ? <small> {unit}</small> : null}</b><span>{label}</span><i>{basis}</i></div>)}
    <p className="ui-meta">A measured figure names its record and method; a modeled one is the coverage model’s estimate from catalogue radii and geometry. They are different kinds of knowledge and are never mixed in one number.</p>
  </section>;
}

/** The object inspector (V2.5.3 liteCardHtml, restored 12 Nov 2026): what the thing is, who it is for, how to use it, its common issues and
 *  any open one on this position, where to get help and what to read; for the engineer and optimize lenses also its technical purpose, its
 *  signal and data flow, its modeled coverage and the engineering chapter. Words from V2.5.3's object cards (lite/data/objectCards.ts). */
const CARD_OF: Record<string, string> = { display: 'display', ledwall: 'ledwall', projector: 'display', camera: 'camera', bar: 'bar', micceil: 'micceil', micwireless: 'micwireless', speaker: 'speaker', touch: 'touch', scheduler: 'scheduler', rack: 'rack', occsensor: 'sensor', iot: 'sensor', lectern: 'lectern', table: 'table', chairs: 'seat' };
const PROP_LABEL: Record<string, [string, string]> = { fov_deg: ['Field of view', '°'], pickup_m: ['Pickup range', 'm'], coverage_m: ['Coverage radius', 'm'], channels: ['Channels', ''], ports: ['Ports', ''], poe_budget_w: ['PoE budget', 'W'], seats: ['Seats', ''], zoom: ['Zoom', '×'], size_in: ['Size', 'in'], lumens: ['Brightness', 'lm'], nits: ['Brightness', 'nits'] };
/** V2.5.3's catalogue figures, room standard and commissioning rows of the object card (restored 12 Nov 2026), from this product's records:
 *  the class template's declared figures (never a datasheet), the standards page for the room, the baseline and the installation. */
function CardRecordRows({ p, r, role, S }: { p: ReturnType<typeof roomState>['positions'][number]; r: RoomRecord; role: PageProps['role']; S: (x: { h: string; children: ReactNode; note?: string }) => ReactNode }) {
  const K = C.categories[p.cat]; const bl = r.baselines.find((b) => b.state === 'CURRENT') || null;
  const ins = r.installations.filter((i) => i.position === p.code).sort((a, b) => b.installedAt.localeCompare(a.installedAt)); const now = ins.find((i) => !i.removedAt);
  const figs = K ? [K.poe ? `PoE ${K.poe} W` : null, K.net ? 'networked' : 'not networked', `${K.mount} mount`, ...Object.entries(K.props || {}).filter(([, v]) => typeof v === 'number' || typeof v === 'string').map(([k, v]) => { const L = PROP_LABEL[k]; return L ? `${L[0]} ${v}${L[1] ? ` ${L[1]}` : ''}` : `${k.replace(/_/g, ' ')} ${v}`; })].filter(Boolean) as string[] : [];
  return <>
    {K && S({ h: 'Catalogue figures', note: 'Class template · declared, not from a datasheet', children: <p data-testid="lite-card-figs"><b>{K.label}.</b> {figs.join(' · ')}.</p> })}
    {readsManual(role) && S({ h: 'Room standard', children: <p><a href={`#/manual/build?room=${encodeURIComponent(r.outline.id)}`}>The standards {r.outline.name} is held to</a></p> })}
    {S({ h: 'Commissioning', children: <p data-testid="lite-card-cx">{bl ? `Baseline v${bl.version} (${bl.at.slice(0, 10)}).` : 'No commissioning baseline on record yet.'}{now ? ` Installed ${now.installedAt.slice(0, 10)} as ${now.asset}${bl ? (now.installedAt <= bl.at ? ', accepted with that baseline' : ', after that baseline: not yet re-commissioned') : ''}.` : ' Nothing installed at this position on record.'}{ins.length > 1 ? ` ${ins.length - 1} earlier unit${ins.length === 2 ? '' : 's'} at this position.` : ''}
      {allows({ area: 'commissioning.room' }, role) && <> <a href={`#/commissioning/room/${encodeURIComponent(r.outline.id)}`}>The commissioning record</a></>}</p> })}
  </>;
}
function ObjectCardView({ p, r, tech, cov, role, onMove }: { p: ReturnType<typeof roomState>['positions'][number]; r: RoomRecord; tech: boolean; cov: ReturnType<typeof roomState>['cov']; role: PageProps['role']; onMove?: () => void }) {
  const k = CARD_OF[p.cat]; const C = k ? OBJECT_CARDS[k] : undefined; if (!C) return null;
  const iss = openIssues(r).filter((i) => i.positions?.includes(p.code)); const ch = C.chapter ? chapterById(C.chapter) : null; const eng = C.eng ? chapterById(C.eng) : null;
  const near = (x: number, y: number) => Math.abs(x - p.x) < 0.01 && Math.abs(y - p.y) < 0.01;
  const cover = (() => { const cone = cov.cones.find((c) => c.code === p.code), mic = cov.mics.find((m) => m.code === p.code), spk = cov.speakers.find((m) => m.code === p.code);
    if (cone) return `${cov.seats.filter((s) => { const d = Math.hypot(s.x - cone.x, s.y - cone.y); let a = Math.atan2(s.y - cone.y, s.x - cone.x) - cone.aim; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return d <= cone.range && Math.abs(a) <= cone.half; }).length} of ${cov.seats.length} seats inside its field of view (${Math.round((cone.half * 360) / Math.PI)}°).`;
    if (mic) return `Pickup radius ${mic.r.toFixed(1)} m from the catalogue.`;
    if (spk) return `Coverage radius ${spk.r.toFixed(1)} m at ear height from the catalogue.`;
    const mine = cov.sight.rays.filter((x) => near(x.dx, x.dy)); if (['display', 'ledwall', 'projector'].includes(p.cat)) return `Best display for ${mine.length} ${mine.length === 1 ? 'seat' : 'seats'}: ${mine.filter((x) => x.cls === 'CLEAR').length} clear, ${mine.filter((x) => x.cls === 'MARGINAL').length} marginal, ${mine.filter((x) => x.cls === 'OBSTRUCTED').length} obstructed.`;
    return ''; })();
  const S = ({ h, children, note }: { h: string; children: ReactNode; note?: string }) => <section className="lt-card__s"><h3 className="lt-card__h">{h}{note && <span className="ui-meta"> · {note}</span>}</h3>{children}</section>;
  return <div className="lt-card" data-testid="lite-card" data-kind={k}>
    <S h="What this is"><p>{C.what}</p></S><S h="Who this is for"><p>{C.who}</p></S>
    <S h="How to use it"><ol className="lt-card__steps">{C.how.map((x) => <li key={x}>{x}</li>)}</ol></S>
    <S h="Common issues">{iss.length > 0 && <ul className="lt-card__open">{iss.map((i) => <li key={i.id}><b>Open on this position:</b> {i.title}</li>)}</ul>}{C.issues.length ? <ul>{C.issues.map((x) => <li key={x}>{x}</li>)}</ul> : <p>None recorded for this kind of thing.</p>}</S>
    <S h="Support path"><p><a href={`#/here/${r.outline.id}`}>Report a problem from this room</a></p></S>
    {ch && <S h="Learn more"><p><a href={`#/lite/guides/${ch.g.id}/${ch.c[0]}`}>{ch.g.name}: {ch.c[1]}</a></p></S>}
    {tech && DEVICE_PURPOSE[p.cat === 'projector' ? 'display' : p.cat] && <S h="Technical purpose"><p>{DEVICE_PURPOSE[p.cat === 'projector' ? 'display' : p.cat]}</p></S>}
    {tech && C.flow && <S h="Signal and data flow"><p>{C.flow}</p></S>}
    {tech && cover && <S h="Coverage" note="Modeled · not measured"><p>{cover}</p></S>}
    {tech && eng && <S h="Engineering reference"><p><a href={`#/lite/guides/${eng.g.id}/${eng.c[0]}`}>{eng.g.name}: {eng.c[1]}</a></p></S>}
    {tech && <CardRecordRows p={p} r={r} role={role} S={(x) => <S h={x.h} note={x.note}>{x.children}</S>} />}
    {onMove && <p className="lt-acts"><button type="button" className="ui-btn" onClick={onMove} data-testid="lite-card-move">Move this</button></p>}
  </div>;
}

/** "Change the room" (V2.5.3's Optimize panel, restored 12 Nov 2026): pick a movable thing and move it in 25 cm steps with buttons (no
 *  dragging needed), change the seat count, and watch the modeled scores against the current layout (the tick). They are shown separately,
 *  never added into one score. Turning a camera is not offered: in this model cameras aim at the seats on their own. */
const MOVABLE = ['camera', 'bar', 'micceil', 'mictable', 'lectern', 'table', 'speaker'];
function ChangeRoom({ positions, base, cov, ed, setEd, tool, setTool, roomId, edited }: { positions: ReturnType<typeof roomState>['positions']; base: ReturnType<typeof roomState>['cov']; cov: ReturnType<typeof roomState>['cov']; ed: { mv: Record<string, [number, number]>; seats: number }; setEd: (e: { mv: Record<string, [number, number]>; seats: number }) => void; tool: string | null; setTool: (t: string) => void; roomId: string; edited: boolean }) {
  const movable = positions.filter((x) => MOVABLE.includes(x.cat)).sort((a, b) => MOVABLE.indexOf(a.cat) - MOVABLE.indexOf(b.cat)); /* cameras first, as V2.5.3 lists them */ const cur = movable.find((x) => x.code === tool) || movable[0] || null; const mv: [number, number] = (cur && ed.mv[cur.code]) || [0, 0];
  const nudge = (dx: number, dy: number) => { if (!cur) return; const m = ed.mv[cur.code] || [0, 0]; setEd({ ...ed, mv: { ...ed.mv, [cur.code]: [Math.round((m[0] + dx) * 100) / 100, Math.round((m[1] + dy) * 100) / 100] } }); };
  const dims: Array<[string, (c: typeof cov) => number | null, string]> = [
    ['Camera coverage', (c) => (c.cones.length ? pct(c.camera.covered, c.camera.of) : null), '% of seats in view'], ['Microphone pickup', (c) => (c.mics.length || c.pickup.worn ? pct(c.mic.covered, c.mic.of) : null), `% of ${cov.pickup.of}`],
    ['Speaker coverage', (c) => (c.speakers.length ? pct(c.speakerSeats, c.seats.length) : null), '% of seats'], ['Display sightlines', (c) => c.sight.score, 'clear, half for marginal'], ['Wheelchair places', (c) => (c.access.required ? Math.min(100, pct(c.access.wheelchair, c.access.required)) : null), '% of required']];
  const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
  return <Card title={edited ? 'Your layout' : 'Change the room'} sub="Modeled · not measured · the scores react" icon="layers" testId="lite-change">
    <div className="lt-scs">{dims.map(([label, f, unit]) => { const v = f(cov), b = f(base); return <div key={label} className="lt-sc" data-dim={label}><span className="lt-sc__l">{label}<span className="ui-meta"> · {unit}</span></span>
      <span className="lt-sc__bar" aria-hidden="true"><i style={{ width: `${v ?? 0}%` }} />{edited && b != null && <s style={{ left: `${b}%` }} />}</span><b className="num">{v == null ? '—' : `${v}%`}{edited && v != null && b != null && v !== b ? <small> ({v > b ? '+' : '−'}{Math.abs(v - b)})</small> : null}</b></div>; })}</div>
    <p className="ui-meta">Five measures, shown separately; they are never added into one score.{edited ? ' The tick on each bar is the current layout.' : ''}</p>
    {cur && <div className="lt-tool"><label className="ch__field"><span>Move</span><select value={cur.code} onChange={(e) => setTool(e.target.value)} data-testid="lite-tool">{movable.map((x) => <option key={x.code} value={x.code}>{x.label} · {x.code}</option>)}</select></label>
      <div className="lt-pad" role="group" aria-label="Move the selected item in steps of 25 centimetres">
        <button type="button" className="ui-btn" aria-label="Move toward the display wall" onClick={() => nudge(0, -0.25)}>↑</button>
        <span className="lt-pad__row"><button type="button" className="ui-btn" aria-label="Move left" onClick={() => nudge(-0.25, 0)}>←</button><span className="num" data-testid="lite-moved">{mv[0] || mv[1] ? `${fmt(mv[0])}, ${fmt(mv[1])} m` : '25 cm steps'}</span><button type="button" className="ui-btn" aria-label="Move right" onClick={() => nudge(0.25, 0)}>→</button></span>
        <button type="button" className="ui-btn" aria-label="Move toward the back wall" onClick={() => nudge(0, 0.25)}>↓</button></div></div>}
    <div className="lt-tool"><span>Seat count</span><span className="lt-stepper"><button type="button" className="ui-btn" aria-label="One seat fewer" onClick={() => setEd({ ...ed, seats: ed.seats - 1 })}>−</button><b className="num" aria-live="polite" data-testid="lite-seats">{cov.seats.length}</b><button type="button" className="ui-btn" aria-label="One seat more" onClick={() => setEd({ ...ed, seats: ed.seats + 1 })}>+</button></span></div>
    {edited && <p className="lt-acts"><button type="button" className="ui-btn" onClick={() => setEd({ mv: {}, seats: 0 })} data-testid="lite-edits-reset">Back to the current layout</button> <a className="ui-btn ui-btn--primary" href={`#/request/change-room?room=${encodeURIComponent(roomId)}`} data-testid="lite-send">Send my layout to engineering</a></p>}
    <p className="ui-meta">Every move has a button; dragging is not needed. A layout you send becomes a request for engineering review — nothing in the room changes until it is approved.</p>
  </Card>;
}

function DriftCard({ d, dv, onChoose, roomId, techHref }: { d: SpatialDrift; dv: DriftDecision | null; onChoose: (v: 'restore' | 'review' | null) => void; roomId: string; techHref: string | null }) {
  const chip = dv?.v === 'restore' ? <Chip small tone="ok">Restored · simulated</Chip> : dv?.v === 'review' ? <Chip small tone="info">Marked for engineering review</Chip> : <Chip small tone="warn">Drift from baseline</Chip>;
  const row = (label: string, a: [number, number], b: [number, number]) => <tr><th scope="row">{label}</th><td className="num">{a[0]} of {a[1]}</td><td className="num">{b[0]} of {b[1]}</td></tr>;
  return <Card title="Spatial drift" sub={`${d.check} · ${d.evidence}`} icon="alert" testId="lite-drift" action={chip}>
    <dl className="lt-dl"><dt>Commissioned</dt><dd>{d.baseline}</dd><dt>Now</dt><dd data-testid="lite-drift-now">{d.current}</dd><dt>Method</dt><dd>{d.method}</dd></dl>
    <p data-testid="lite-drift-summary">{d.summary}</p>
    <div className="table-wrap"><table className="lt-table"><caption className="ui-meta">Modeled for both layouts, not measured</caption><thead><tr><th scope="col">Measure</th><th scope="col">Commissioned layout</th><th scope="col">Layout now</th></tr></thead>
      <tbody>{row('Seats a camera frames', d.before.camera, d.after.camera)}{row('Microphone pickup', d.before.mic, d.after.mic)}</tbody></table></div>
    <p className="ui-meta">The dashed outline is where the table was commissioned; the solid table is where it is now; the arrow is the difference.</p>
    <p className="lt-acts">{dv ? <button type="button" className="ui-btn" onClick={() => onChoose(null)} data-testid="lite-drift-undo">Undo my choice</button>
      : <><button type="button" className="ui-btn ui-btn--primary" onClick={() => onChoose('restore')} data-testid="lite-drift-restore">Restore the commissioned layout</button><button type="button" className="ui-btn" onClick={() => onChoose('review')} data-testid="lite-drift-review">Mark the new layout for engineering review</button></>}
      {techHref && <a className="ui-btn ui-btn--quiet" href={techHref}>The field report in the technical room view</a>}</p>
    <p aria-live="polite" className="ui-meta" data-testid="lite-drift-said">{dv?.v === 'restore' ? 'Recorded on this device: the room is shown restored to the commissioning seat map. Simulated: nothing moved in a real room, and the field report stays open until a verification visit closes it.'
      : dv?.v === 'review' ? <>Recorded on this device: the new layout is marked for engineering review. Simulated: nothing is sent until you <a href={`#/request/change-room?room=${encodeURIComponent(roomId)}`} data-testid="lite-drift-request">file the request</a>.</> : null}</p>
  </Card>;
}

function Legend({ overlays, marks }: { overlays: Set<Overlay>; marks: Record<string, number> }) {
  const items: Array<[string, string]> = [];
  if (overlays.has('camera')) items.push(['cam', 'Camera field of view · seat with a red ring is out of view']);
  if (overlays.has('mic')) items.push(['mic', 'Microphone pickup']);
  if (overlays.has('speaker')) items.push(['spk', 'Loudspeaker zone']);
  if (overlays.has('sight')) items.push(['sight', 'Sightline from each seat to its best display: green clear, amber marginal, red obstructed']);
  if (overlays.has('access')) items.push(['acc', 'Accessible route and wheelchair places (blue squares)']);
  if (marks.added) items.push(['add', '+ proposed position']); if (marks.attention) items.push(['att', 'needs attention (open issue)']); if (marks.changed) items.push(['chg', 'unit replaced since acceptance']);
  if (!items.length) return null;
  return <ul className="lt-legend" aria-label="Legend">{items.map(([k, t]) => <li key={k}><span className={`lt-key lt-key--${k}`} aria-hidden="true" />{t}</li>)}</ul>;
}

/** What the room means for the person looking (the lens). */
function LensPanel({ lens, r, role }: { lens: Lens; r: NonNullable<ReturnType<typeof roomRecord>>; role: PageProps['role'] }) {
  const o = r.outline; const has = (c: string) => r.positions.some((p) => p.cat === c);
  if (lens === 'visitor' || lens === 'employee') {
    const route = routeTo(o.id)!;
    return <Card title={lens === 'visitor' ? 'Getting there' : 'Using this room'} icon="route" testId="lite-lens-panel"><ol className="lt-steps">{route.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <p className="ui-meta">{o.capacity} seats · step-free route from the door{lens === 'employee' ? ' · book it from the scheduling panel by the door (simulated)' : ''}</p><a href={`#/lite/way?to=${o.id}`}>Open the route →</a></Card>;
  }
  if (lens === 'user') {
    const steps = [has('touch') ? 'Start: tap Start on the touch panel; the room wakes the displays.' : 'Start: the room wakes when you join from the room compute.',
      has('display') || has('ledwall') || has('projector') ? 'Share: choose Share on the panel and pick your laptop; the content goes to the main display.' : 'Share: this room has no display in its design.',
      has('camera') || has('bar') ? `Be seen: the ${has('bar') ? 'video bar' : 'camera'} frames the table; sit inside the field of view.` : 'Be seen: no camera in this room.',
      has('micceil') || has('mictable') || has('bar') ? 'Be heard: speak normally; the microphones cover the seats.' : 'Be heard: use the handheld or worn microphones.',
      'End: tap End on the panel; the room goes back to standby.'];
    return <Card title="How to use it" icon="play" testId="lite-lens-panel"><ol className="lt-steps">{steps.map((s) => <li key={s}>{s}</li>)}</ol><p className="ui-meta">From the room’s devices in its design. Room guide: <a href="#/lite/guides/G-EUG">Workplace End User Guide</a>.</p></Card>;
  }
  if (lens === 'exec') {
    const ready = r.lifecycle === 'ACCEPTED' && !openIssues(r).some((i) => i.severity === 'High');
    return <Card title="Ready for the next session?" icon="check" testId="lite-lens-panel"><p className="lt-verdict"><Chip tone={ready ? 'ok' : 'warn'} icon={ready ? 'check' : 'alert'}>{ready ? 'Ready' : 'Not yet'}</Chip></p>
      <ul className="lt-bullets"><li>{r.counts.verified} of {r.counts.applicable} applicable tests verified</li><li>{openIssues(r).length ? openIssues(r).map((i) => `${i.severity}: ${i.title}`).join(' · ') : 'No open issue on the record'}</li><li>Lifecycle {r.lifecycle.toLowerCase().replace(/_/g, ' ')}</li></ul></Card>;
  }
  if (lens === 'optimize') {
    const cur = roomState(r, 'current'), pro = roomState(r, 'proposed');
    const row = (label: string, a: number, b: number) => <tr key={label}><th scope="row">{label}</th><td>{a} %</td><td>{b} %</td><td>{b > a ? <Chip small tone="ok">+{b - a}</Chip> : b < a ? <Chip small tone="bad">{b - a}</Chip> : '—'}</td></tr>;
    return <Card title="What the proposal would change" icon="chart" testId="lite-lens-panel">{pro.available ? <div className="table-wrap"><table className="lt-table"><thead><tr><th scope="col">Model</th><th scope="col">Current</th><th scope="col">Proposed</th><th scope="col">Change</th></tr></thead><tbody>
      {row('Camera coverage', pct(cur.cov.camera.covered, cur.cov.camera.of), pct(pro.cov.camera.covered, pro.cov.camera.of))}{row('Microphone pickup', pct(cur.cov.mic.covered, cur.cov.mic.of), pct(pro.cov.mic.covered, pro.cov.mic.of))}{row('Speaker zones', cur.cov.speaker.pct, pro.cov.speaker.pct)}</tbody></table></div> : <p>{pro.summary}</p>}
      <p className="ui-meta">Modeled, not approved. A change goes through design approval and re-commissioning.{allows({ area: 'scouter' }, role) ? <> <a href="#/lite/scouter">Check a device with Scouter →</a></> : null}</p></Card>;
  }
  // engineer
  return <Card title="Architecture and baseline" icon="wrench" testId="lite-lens-panel"><dl className="lt-dl">
    <dt>Baseline</dt><dd>{r.baselines.length ? r.baselines.map((b) => `v${b.version} ${b.state.toLowerCase()} (${b.at.slice(0, 10)})`).join(' · ') : 'none yet'}</dd>
    <dt>Tests</dt><dd>{r.counts.verified} verified · {r.counts.awaiting} awaiting verification · {r.counts.failed} failed · {r.counts.applicable - r.counts.recorded} not yet tested, of {r.counts.applicable} applicable</dd>
    <dt>Connections</dt><dd>{r.connections.filter((c) => !c.removed).length} on the design ({['signal', 'network', 'power', 'control'].map((k) => `${r.connections.filter((c) => !c.removed && c.kind === k).length} ${k}`).join(', ')})</dd>
    <dt>Findings</dt><dd>{r.findings.length ? r.findings.map((f) => f.title).join(' · ') : 'none from the design checks'}</dd>
    {r.nextStep && r.nextStep.blockers.length > 0 && <><dt>Next step</dt><dd>{r.lifecycle} → {r.nextStep.to} held: {r.nextStep.blockers.join('; ')}</dd></>}
  </dl></Card>;
}

/** The Global Operations Control Tower's wall: every site's rooms as the records see them (simulated, non-operational). */
function FleetWall() {
  const recs = campusRecords();
  return (
    <Card title="Fleet wall (simulated)" sub="Every site’s rooms from the synthetic records — not live monitoring" icon="grid" testId="lite-fleet">
      <ul className="lt-fleet">{ALL_SITES.map((B) => { const s = buildingSummary(B.key); const rs = recs.filter((r) => r.outline.building === B.key); return (
        <li key={B.key}><a href={`#/lite/b/${B.key}`} className="lt-fleet__site"><b>{B.short}</b><span className={`ui-tone--${HEALTH[bandOf(s.score)].tone}`}>{s.score ?? '—'}</span></a>
          <div className="lt-fleet__cells" role="list" aria-label={`${B.name} rooms`}>{rs.map((r) => { const sc = readiness(r); return <a role="listitem" key={r.outline.id} href={liteRoomHref(r.outline.id)} className={`lt-cell lt-cell--${bandOf(sc)}`} title={`${shortName(r.outline)} ${r.outline.name}: ${sc}`} aria-label={`${shortName(r.outline)} ${r.outline.name}: readiness ${sc}`} />; })}</div></li>); })}</ul>
    </Card>
  );
}
