/**
 * V2.5.3's room tabs (RT_TABS: Overview, Room states, Design, Calculations, Sound, Cameras, Systems, Records), restored 13 Nov 2026 for
 * the Lite 50/10 directive. Overview is the room page as it was; each other tab gathers one subject from the room's record, computed by
 * model.ts and the commissioning engine. The tab travels in the address (?tab=), so a link opens the same tab. A visitor sees Overview only.
 */
import { useEffect, type ReactNode, type KeyboardEvent as RKE } from 'react';
import { Card, Chip, StatTile, Tag } from '@empathia/ui';
import { openIssues, type RoomRecord } from '../campus/design.js';
import { STATES, roomState, pct, rt60Estimate, criticalDistance, RT60_ASSUMED, Q_TALKER, type StateKey } from './model.js';
import { designScore, criticalityOf } from '../assurance/model.js';
import { RoomJumps } from '../rooms/RoomJumps.js';

export const ROOM_TABS = [['overview', 'Overview'], ['states', 'Room states'], ['design', 'Design'], ['calc', 'Calculations'], ['av', 'Sound'], ['cam', 'Cameras'], ['systems', 'Systems'], ['records', 'Records']] as const;
export type RoomTab = (typeof ROOM_TABS)[number][0];
export const tabOf = (q: string | null): RoomTab => (ROOM_TABS.find(([k]) => k === q)?.[0] || 'overview');

let focusNext: RoomTab | null = null;
export function RoomTabBar({ tab, onTab }: { tab: RoomTab; onTab: (t: RoomTab) => void }) {
  // the tab pattern: arrow keys move between tabs, Home and End go to the ends; only the chosen tab is in the Tab order
  const key = (e: RKE, i: number) => { const n = ROOM_TABS.length; const j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i + n - 1) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (j < 0) return; e.preventDefault(); focusNext = ROOM_TABS[j]![0]; onTab(ROOM_TABS[j]![0]); };
  // the address changes with the tab and the page may draw again: the tab moved to keeps the focus
  useEffect(() => { const el = document.getElementById(`lite-rtab-${tab}`); if (!el) return;
    // the chosen tab is scrolled into the row's view (a phone shows three or four of the eight), without moving the page
    const row = el.parentElement!; const l = el.offsetLeft - row.offsetLeft; if (l < row.scrollLeft || l + el.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = Math.max(0, l - 24);
    if (focusNext === tab) { focusNext = null; el.focus({ preventScroll: true }); } }, [tab]);
  return <div className="lt-rtabs" role="tablist" aria-label="About this room" data-testid="lite-rtabs">
    {ROOM_TABS.map(([k, l], i) => <button key={k} type="button" role="tab" id={`lite-rtab-${k}`} aria-selected={tab === k} aria-controls="lite-rtab-panel" tabIndex={tab === k ? 0 : -1} onKeyDown={(e) => key(e, i)} className={`lt-rtab${tab === k ? ' on' : ''}`} onClick={() => onTab(k)} data-testid={`lite-rtab-${k}`}>{l}</button>)}
  </div>;
}

const DL = ({ rows }: { rows: Array<[string, ReactNode]> }) => <dl className="lt-dl">{rows.map(([k, v]) => [<dt key={`${k}t`}>{k}</dt>, <dd key={`${k}d`}>{v}</dd>])}</dl>;
const CAT_GROUPS: Array<[string, string[]]> = [['Displays', ['display', 'ledwall', 'projector']], ['Cameras', ['camera', 'bar']], ['Microphones', ['micceil', 'mictable', 'micwireless']], ['Loudspeakers and amplifiers', ['speaker', 'amp']], ['Audio processing', ['dsp']], ['Compute and video', ['compute', 'switcher', 'encoder']], ['Control', ['control', 'touch', 'scheduler']], ['Network', ['switch']], ['Rack and power', ['rack', 'pdu']]];

export function RoomTabPanel({ tab, r, stateKey, role, opens, onPassport, sel, onSel, measurements }: { tab: RoomTab; r: RoomRecord; stateKey: StateKey; role: string; opens: (href: string) => boolean; onPassport: (() => void) | null; sel: string | null; onSel: (code: string) => void; measurements: ReactNode }) {
  const o = r.outline; const st = roomState(r, stateKey); const cov = st.cov; const [w, l, h] = o.dims; const n = cov.seats.length;
  const devs = st.positions.filter((p) => !p.furniture);
  const pick = (code: string) => <button type="button" className={`lt-chipbtn${sel === code ? ' on' : ''}`} aria-pressed={sel === code} onClick={() => onSel(code)}>{code}</button>;
  const body = (() => {
    if (tab === 'states') {
      const all = STATES.map((s) => ({ s, x: roomState(r, s.key) }));
      return <Card title="The room in four states" sub="Each column is computed from the record; a state with nothing on record says so" icon="layers" testId="lite-rt-states">
        <div className="table-wrap"><table className="lt-table"><thead><tr><th scope="col">State</th><th scope="col">Devices</th><th scope="col">Added</th><th scope="col">Replaced</th><th scope="col">Need attention</th><th scope="col">Moved</th><th scope="col">Seats in a camera view</th><th scope="col">Microphone pickup</th></tr></thead>
          <tbody>{all.map(({ s, x }) => <tr key={s.key} aria-current={s.key === stateKey ? 'true' : undefined}><th scope="row">{s.label}<div className="ui-meta">{x.available ? x.title : 'none on record'}</div></th><td>{x.positions.filter((p) => !p.furniture).length}</td><td>{x.marks.added}</td><td>{x.marks.changed}</td><td>{x.marks.attention}</td><td>{x.marks.moved}</td><td>{x.cov.cones.length ? `${pct(x.cov.camera.covered, x.cov.camera.of)}%` : '—'}</td><td>{x.cov.mics.length || x.cov.pickup.worn ? `${x.cov.mic.covered} of ${x.cov.mic.of}` : '—'}</td></tr>)}</tbody></table></div>
        <p className="ui-meta">Modelled from the positions in each state; not measured. The state switch above the room draws the same four.</p></Card>;
    }
    if (tab === 'design') {
      const score = designScore(r);
      return <Card title="Design" sub={`${r.archetypeName} · the engine’s design checks`} icon="book" testId="lite-rt-design" action={<Chip small tone={score >= 70 ? 'ok' : 'warn'}>{`Design score ${score}`}</Chip>}>
        <DL rows={[['Intent', o.intent], ['Room type', `${r.archetypeName}${r.templateNote ? ` (${r.templateNote})` : ''}`], ['Size', `${w} × ${l} m, ${h} m to the ceiling · ${Math.round(w * l)} m²`], ['Seats', `${o.capacity} designed · ${n} in the seat model`], ['Criticality', criticalityOf(r)], ['Classification', r.analysis.classification ? `${r.analysis.archetype || 'not set'} (engine ${r.analysis.engineVersion})` : '—']]} />
        <h3 className="lt-h3">Design checks</h3>
        {r.findings.length ? <ul className="lt-findings">{r.findings.map((f) => <li key={f.key}><Tag tone={f.severity === 'High' ? 'bad' : f.severity === 'Medium' ? 'warn' : 'info'}>{f.severity}</Tag> <b>{f.title}</b><div className="ui-meta">{f.check.replace(/_/g, ' ')} · {f.rationale} · {f.action}</div></li>)}</ul> : <p className="ui-meta">Every design check passes for this room.</p>}
        <p className="ui-meta">The score starts at 100 and loses 30 for each high finding, 12 for each medium and 5 for each low. Modelled from the layout and the catalogue.</p></Card>;
    }
    if (tab === 'calc') {
      const rt = rt60Estimate([w, l, h], n); const dc = criticalDistance([w, l, h], rt);
      return <><Card title="Calculations" sub="Each figure names its formula and what it assumes" icon="chart" testId="lite-rt-calc">
        <DL rows={[['Volume', `${(w * l * h).toFixed(0)} m³ = ${w} × ${l} × ${h}`], ['Reverberation time (RT60), empty', `${rt.toFixed(2)} s · Sabine, 0.161 V ÷ A, assumed finishes (${RT60_ASSUMED})`], ['Critical distance', `${dc.toFixed(2)} m · 0.057 √(Q·V ÷ RT60), Q ${Q_TALKER}`], ['Display sightlines', cov.sight.na ? 'no display in this state' : `${cov.sight.clear} clear, ${cov.sight.marginal} marginal, ${cov.sight.obstructed} obstructed of ${n} seats (60° and 45° off the centre line, six image heights)`], ['Power over the network', cov.infra.budget ? `${cov.infra.poe} W of ${cov.infra.budget} W` : `${cov.infra.poe} W from the floor switch`]]} />
        <p className="ui-meta">Estimates, not measurements. A measured figure would name its record and method.</p></Card>{measurements}</>;
    }
    if (tab === 'av') {
      const mics = devs.filter((p) => ['micceil', 'mictable', 'micwireless'].includes(p.cat)); const spk = devs.filter((p) => ['speaker', 'amp', 'dsp'].includes(p.cat));
      return <Card title="Sound" sub="Microphones, loudspeakers and processing in this state" icon="speaker" testId="lite-rt-av">
        <div className="lt-rtiles"><StatTile label="Microphone pickup" value={pct(cov.mic.covered, cov.mic.of)} unit="%" icon="mic" tone="ok" hint={`${cov.mic.covered} of ${cov.mic.of} ${cov.pickup.of} · modelled`} /><StatTile label="Seats in loudspeaker coverage" value={cov.speakers.length ? cov.speakerSeats : '—'} unit={cov.speakers.length ? `of ${n}` : undefined} icon="speaker" tone="warn" hint="modelled" /></div>
        <ul className="lt-rlist">{[...mics, ...spk].map((p) => <li key={p.code}>{pick(p.code)} <b>{p.label}</b> <span className="ui-meta">{p.device} · {p.z} m{p.note ? ` · ${p.note}` : ''}</span></li>)}</ul>
        {!mics.length && !spk.length ? <p className="ui-meta">No microphone or loudspeaker in this state.</p> : <p className="ui-meta">Choose one to see it in the room. “Sound in the room” (in X-ray) draws the first reflections; a training and engineering model, not a certified simulation.</p>}</Card>;
    }
    if (tab === 'cam') {
      const cams = devs.filter((p) => ['camera', 'bar'].includes(p.cat));
      return <Card title="Cameras" sub="Who the cameras see in this state" icon="camera" testId="lite-rt-cam">
        <div className="lt-rtiles"><StatTile label="Seats in a camera view" value={cov.cones.length ? pct(cov.camera.covered, cov.camera.of) : '—'} unit={cov.cones.length ? '%' : undefined} icon="camera" tone="indigo" hint={`${cov.camera.covered} of ${cov.camera.of} seats · modelled`} /></div>
        {cams.length ? <ul className="lt-rlist">{cams.map((p) => <li key={p.code}>{pick(p.code)} <b>{p.label}</b> <span className="ui-meta">{p.device} · {p.z} m high{p.note ? ` · ${p.note}` : ''}</span></li>)}</ul> : <p className="ui-meta">No camera in this state.</p>}
        <p className="ui-meta">Coverage is the camera’s catalogue field of view and range from where it is placed; not a reading of its presets.</p></Card>;
    }
    if (tab === 'systems') {
      const kinds = r.connections.reduce((m, c) => m.set(c.kind, (m.get(c.kind) || 0) + 1), new Map<string, number>());
      return <Card title="Systems" sub={`${devs.length} devices and ${r.connections.length} connections in the design`} icon="network" testId="lite-rt-systems">
        <div className="table-wrap"><table className="lt-table"><thead><tr><th scope="col">System</th><th scope="col">Devices</th></tr></thead><tbody>{CAT_GROUPS.map(([g, cats]) => { const ds = devs.filter((p) => cats.includes(p.cat)); return ds.length ? <tr key={g}><th scope="row">{g}</th><td>{ds.map((p) => <span key={p.code} className="lt-sysdev">{pick(p.code)} {p.label}</span>)}</td></tr> : null; })}</tbody></table></div>
        <DL rows={[['Connections by kind', kinds.size ? [...kinds].map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' · ') : 'none recorded'], ['Network ports', cov.infra.ports ? `${cov.infra.networked} of ${cov.infra.ports} in use` : `${cov.infra.networked} devices on the floor switch`], ['Power over the network', cov.infra.budget ? `${cov.infra.poe} W of ${cov.infra.budget} W · ${cov.infra.fits ? 'fits' : 'over budget'}` : `${cov.infra.poe} W`], ['Outlets', `${cov.infra.outlets} of ${cov.infra.outletsOf}`]]} />
        <p className="ui-meta">Declared from the design and the catalogue; not read from the equipment.</p></Card>;
    }
    if (tab === 'records') {
      const iss = openIssues(r); const cur = r.baselines.find((b) => b.state === 'CURRENT');
      return <Card title="Records" sub="Baseline, assurance and issues" icon="shield" testId="lite-rt-records">
        <DL rows={[['Lifecycle', r.lifecycle.toLowerCase().replace(/_/g, ' ')], ['Baseline', cur ? `v${cur.version} since ${cur.at.slice(0, 10)}` : 'none on record'], ['Tests', `${r.counts.verified} of ${r.counts.applicable} applicable verified · ${r.counts.failed} failed · ${r.counts.notTested} not yet tested`], ['Open issues', iss.length ? iss.map((i) => `${i.title} (${i.severity.toLowerCase()})`).join('; ') : 'none'], ['Baselines on record', r.baselines.map((b) => `v${b.version} ${b.state.toLowerCase().replace(/_/g, ' ')}`).join(' · ') || '—']]} />
        {onPassport ? <p><button type="button" className="ui-btn ui-btn--small" onClick={onPassport} aria-haspopup="dialog" data-testid="lite-rt-passport">Room passport</button> <span className="ui-meta">Every fact on record and every linked record: devices, people, projects, documents, baselines.</span></p> : null}
        <RoomJumps roomId={o.id} here="lite" opens={opens} /></Card>;
    }
    return null;
  })();
  void role;
  return <div id="lite-rtab-panel" role="tabpanel" aria-labelledby={`lite-rtab-${tab}`} data-testid="lite-rtab-panel" data-tab={tab}>{body}</div>;
}
