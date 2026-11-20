/**
 * #/v25/people — who has done the work, and the experience it gives (./people/involvement.ts): everyone with worked jobs, the rooms and
 * projects they touched, experience by layer and by quarter, weighted by the room's complexity and the kind of work. Filter by a layer to
 * see who has the most control-system or audio work; open a person (?p=) for their layers, their quarterly trend and their rooms.
 * Experience is evidence from the record, never a credential, and grants no authority.
 */
import { useMemo } from 'react';
import { PageHero, Card, Notice, Tag, Segmented, StatTile } from '@empathia/ui';
import { involvement, allJobs, LAYERS, LEVELS, KIND_WEIGHT, SEVERITY_WEIGHT, roomComplexity, jobPoints } from '../people/involvement.js';
import { LAYER_LABEL } from '../service/analytics.js';
import { roomRecord } from '../campus/design.js';
import { fullName } from '../campus/canon.js';
import { load as loadDesk } from '../decisions/store.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel } from '../build/store.js';
import { TrendChart } from './TrendChart.js';

const href = (q: Record<string, string | null>) => { const s = new URLSearchParams(); for (const [k, v] of Object.entries(q)) if (v) s.set(k, v); const t = s.toString(); return `#/v25/people${t ? `?${t}` : ''}`; };

export function PeoplePage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace();
  const q = new URLSearchParams(hash.split('?')[1] || ''); const layer = q.get('l') || ''; const pid = q.get('p');
  const desk = useMemo(() => loadDesk(), []);
  const projectOf = useMemo(() => { const m = new Map(desk.projects.filter((p) => p.roomId).map((p) => [p.roomId!, p.id])); return (room: string) => m.get(room) || null; }, [desk]);
  const jobs = useMemo(() => allJobs(w, projectOf), [w, projectOf]);
  const all = useMemo(() => involvement(jobs), [jobs]);
  const score = (x: (typeof all)[number]) => (layer ? x.byLayer[layer as keyof typeof x.byLayer] : x.points);
  const list = [...all].filter((x) => score(x) > 0).sort((a, b) => score(b) - score(a));
  const me = pid ? all.find((x) => x.person.id === pid) : null;
  const quarters = me ? Object.keys(me.byQuarter).sort() : [];
  const max = Math.max(1, ...list.map(score));
  return (
    <section className="wk pp" data-native="workspace" data-testid="people" data-layer={layer || 'all'} data-person={pid || ''}>
      <PageHero product="servicehands" icon="users" eyebrow="People intelligence" title={me ? me.person.name : 'Who has done the work'}
        lede={<>Everyone who worked a job, the rooms and projects they touched, and the experience that work gives — weighted by how complex the room was and the kind of work — by layer and by quarter. From the workspace’s own work orders and the <b>synthetic service history</b>. Acting as <b>{personaLabel(persona)}</b>.</>} />
      <div data-testid="pp-note"><Notice tone="info">Experience is evidence from the record: what a person has worked on. It is never a credential or a certification and grants no authority — dispatch’s hard gates (competency records, licences, site access, availability) still decide who may take a job; experience is at most a stated preference beside them.</Notice></div>
      {!me ? <>
        <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="pp-kpis">
          <StatTile label="People with worked jobs" value={all.length} hint={`${all.filter((x) => x.person.internal).length} internal · ${all.filter((x) => !x.person.internal).length} vendor`} />
          <StatTile label="Jobs counted" value={all.reduce((s, x) => s + x.jobs.length, 0)} hint="responded to or restored" />
          <StatTile label="Rooms touched" value={new Set(all.flatMap((x) => x.rooms)).size} />
          <StatTile label="Projects touched" value={new Set(all.flatMap((x) => x.projects)).size} />
        </div>
        <Segmented label="Experience in" value={layer || 'all'} onChange={(v) => { location.hash = href({ l: v === 'all' ? null : v }); }} options={[{ value: 'all', label: 'All work' }, ...LAYERS.map((l) => ({ value: l, label: LAYER_LABEL[l] }))]} />
        <Card icon="users" title={layer ? `Most ${LAYER_LABEL[layer as keyof typeof LAYER_LABEL].toLowerCase()} experience` : 'Everyone, most experience first'} sub="Open a person for their layers, their trend and their rooms" testId="pp-list">
          <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Person</th><th scope="col">Organisation</th><th scope="col">Jobs</th><th scope="col">Rooms</th><th scope="col">Projects</th><th scope="col">{layer ? `${LAYER_LABEL[layer as keyof typeof LAYER_LABEL]} experience` : 'Experience'}</th><th scope="col">Level</th><th scope="col">Last worked</th></tr></thead>
            <tbody>{list.map((x) => <tr key={x.person.id} data-testid="pp-row" data-person={x.person.id} data-points={score(x)}>
              <th scope="row"><a href={href({ p: x.person.id, l: layer || null })}>{x.person.name}</a></th><td>{x.person.org}</td><td className="num">{x.jobs.length}</td><td className="num">{x.rooms.length}</td><td className="num">{x.projects.length}</td>
              <td><span className="pp-bar" aria-hidden="true"><i style={{ width: `${(100 * score(x)) / max}%` }} /></span> <span className="num">{score(x)}</span></td><td><Tag tone="muted">{x.level}</Tag></td><td>{x.last?.slice(0, 10) || '—'}</td></tr>)}</tbody></table></div>
        </Card>
      </> : <>
        <nav className="san__path" aria-label="Path"><a href={href({ l: layer || null })}>Everyone</a> › <b aria-current="page">{me.person.name}</b></nav>
        <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="pp-person">
          <StatTile label="Experience" value={me.points} hint={me.level} />
          <StatTile label="Jobs" value={me.jobs.length} hint={`${me.reopened} reopened`} />
          <StatTile label="Rooms" value={me.rooms.length} />
          <StatTile label="Projects" value={me.projects.length} />
        </div>
        <div className="wk-g2">
          <Card icon="layers" title="By layer" sub="Where the experience is" testId="pp-layers">
            <ul className="plain pp-layers">{LAYERS.map((l) => <li key={l} data-layer={l} data-points={me.byLayer[l]}><b>{LAYER_LABEL[l]}</b><span className="pp-bar" aria-hidden="true"><i style={{ width: `${(100 * me.byLayer[l]) / Math.max(1, ...Object.values(me.byLayer))}%` }} /></span><span className="num">{me.byLayer[l]}</span></li>)}</ul>
          </Card>
          <TrendChart testId="pp-trend" title="Experience gained by quarter" labels={quarters} unit="" kind="bar" series={[{ name: 'Experience', tone: 'info', values: quarters.map((k) => me.byQuarter[k]!) }]} />
        </div>
        <Card icon="building" title="Rooms worked" sub="Newest first; each job’s weight is the room’s complexity × the kind of work × its severity" testId="pp-rooms">
          <div className="san__scroll"><table className="pa-table"><thead><tr><th scope="col">Job</th><th scope="col">Opened</th><th scope="col">Room</th><th scope="col">Layer</th><th scope="col">Kind</th><th scope="col">Room complexity</th><th scope="col">Experience</th></tr></thead>
            <tbody>{[...me.jobs].sort((a, b) => b.openedAt.localeCompare(a.openedAt)).slice(0, 20).map((j) => { const r = roomRecord(j.roomId); return <tr key={j.id} data-testid="pp-job"><th scope="row">{j.id}</th><td>{j.openedAt.slice(0, 10)}</td><td><a href={`#/commissioning/room/${j.roomId}`}>{r ? fullName(r.outline) : j.roomName}</a></td><td>{LAYER_LABEL[j.layer]}</td><td>{j.kind} · {j.severity}</td><td>{roomComplexity(r).why}</td><td className="num">{jobPoints(j)}</td></tr>; })}</tbody></table></div>
          {me.jobs.length > 20 ? <p className="wk-note">The newest 20 of {me.jobs.length}.</p> : null}
        </Card>
      </>}
      <details className="ln-dom" data-testid="pp-defs"><summary><b>How experience is worked out</b></summary>
        <ul className="plain">
          <li>Each worked job (responded to or restored) gives its technician: room complexity × kind of work × severity.</li>
          <li>Room complexity: up to 6 people 1; up to 14 people 1.5; up to 40 people 2; larger 3; a divisible room adds 0.5.</li>
          <li>Kind: {Object.entries(KIND_WEIGHT).map(([k, v]) => `${k} ${v}`).join(', ')}. Severity: {Object.entries(SEVERITY_WEIGHT).map(([k, v]) => `${k} ${v}`).join(', ')}.</li>
          <li>Levels: {LEVELS.map((l) => `${l.name} from ${l.min}`).join(' · ')}. A level names experience, not a qualification.</li>
          <li>Who did a job: the technician on the workspace’s work order; in the synthetic history, a person of the vendor’s roster chosen from the job’s ID (internal jobs to the internal team). Every person here is synthetic.</li>
        </ul></details>
    </section>
  );
}
