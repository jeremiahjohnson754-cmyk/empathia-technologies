/**
 * One room in Lite: an interactive 3D room (orbit, tilt, plan, zoom) with Lite's layers, the five coverage overlays and the four states
 * (Designed · Commissioned · Current · Proposed), a lens panel for who is looking, divisible configurations and, for operations rooms,
 * the non-operational label. Address: #/lite/room/<id>?mode=<lens>&state=<state>&ov=<a,b>&ly=<a,b>&cfg=<config>&device=<code>.
 * Everything shown is computed by model.ts from the room's record; every figure names its basis.
 */
import { readsManual } from '../manual/roles.js';
import { useMemo, useState, useEffect } from 'react';
import { PageHero, Card, Chip, ScoreRing, StatTile, Icon, bandOf, HEALTH } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { mayCapture } from '../instant/store.js';
import { roomRecord, openIssues, campusRecords } from '../campus/design.js';
import { shortName, buildingByKey, roomHref } from '../campus/canon.js';
import { LIFE_TONE } from '../campus/CampusPage.js';
import {
  lensesFor, layersFor, overlaysFor, defaultLayers, defaultOverlays, roomState, STATES, configsOf, configStatus, readiness, pct, occupancy, routeTo,
  ALL_SITES, buildingSummary, liteRoomHref, type Lens, type LiteLayer, type Overlay, type StateKey,
} from './model.js';
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
  if (!r) return <LiteMissing what={`room “${id}”`} />;
  const o = r.outline; const B = buildingByKey(o.building)!;
  const lens = storedLens(role, query.get('mode'));
  if (!lens) return <LiteMissing what="lens for this role" />;
  const mayLayers = layersFor(role); const mayOv = overlaysFor(role);
  const asked = list(query.get('ly')); const askedOv = list(query.get('ov'));
  const layers = new Set<LiteLayer>((asked ?? defaultLayers(lens, role)).filter((k) => mayLayers.some((l) => l.key === k)) as LiteLayer[]);
  const overlays = new Set<Overlay>((askedOv ?? defaultOverlays(lens)).filter((k) => mayOv.some((x) => x.key === k)) as Overlay[]);
  const stateKey = (STATES.find((s) => s.key === query.get('state'))?.key || 'current') as StateKey;
  const st = roomState(r, stateKey);
  const configs = configsOf(o); const cfg = configs.find((c) => c.key === query.get('cfg')) || configs[0] || null;
  const base = liteRoomHref(id);
  const upd = (k: string, v: string | null) => { const n = new URLSearchParams(query); if (v == null || v === '') n.delete(k); else n.set(k, v); setQuery(base, n); };
  const toggle = (k: 'ly' | 'ov', key: string, cur: Set<string>) => { const n = new Set(cur); if (n.has(key)) n.delete(key); else n.add(key); upd(k, [...n].join(',') || ','); };
  const pickLens = (l: Lens) => { saveLens(l); const n = new URLSearchParams(query); n.set('mode', l); n.delete('ly'); n.delete('ov'); setQuery(base, n); };
  const cov = st.cov; const p = st.positions.find((x) => x.code === sel) || null;
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
            <RoomScene label={`${o.name} in 3D, ${st.title}`} w={o.dims[0]} l={o.dims[1]} h={o.dims[2]} view={orbit.view} positions={st.positions} connections={r.connections} layers={layers} overlays={overlays} cov={cov}
              selected={sel} onSelect={(c) => setSel(c === sel ? null : c)} occupied={occ} partitions={partitions} active={cfg && cfg.key !== 'combined' ? [cfg.x0, cfg.x1] : null} bind={orbit.bind} />
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
