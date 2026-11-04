/**
 * Search Party's V2.5.3 tab set beyond Search itself, each at its V2.5.3 address and each built from the demonstration's records:
 *   People and expertise (#/search/people)   the service workspace's people: skills with the jobs that evidence them, certifications
 *                                            with their expiry (never a self-rating), and the synthetic personas of the platform
 *   Support coverage (#/search/support, /ownership)  three support paths per building from the support scenario, with the escalation
 *                                            organisation and response target; a backup is never invented
 *   Project map (#/search/projects)          the campus in 3D read through a lens: projects, active work, commissioning, open issues,
 *                                            devices — each building carries the number its records give
 *   Organizations (#/search/orgs)            Northstar's own and the fictional partners, grouped by kind, with what each one covers
 *   Activity (#/search/activity)             every recorded change, newest first, filterable by building and kind
 *   Evidence and artifacts (#/search/vault)  the evidence behind every recorded test result, baselines, installations and the pending
 *                                            exception — metadata only; this demonstration stores no file
 * Lists come first; the map is a second way to the same rows. Every row names the record it came from.
 */
import { useMemo, useState } from 'react';
import { SKILL_NAMES, CERTS } from '@empathia/service-engine';
import { BUILDINGS, ROOMS, roomById, roomHref, shortName, fullName } from '../campus/canon.js';
import { allRecords, PEOPLE, DEMO_NOW } from '../campus/design.js';
import { campusStats } from '../campus/metrics.js';
import { programme } from '../campus/programme.js';
import { load as loadWorkspace, type Workspace } from '../workspace/store.js';
import { scenario, ORGS } from './scenarios.js';
import { recentChanges } from '../pages/Home.js';
import { CampusMap, Stage } from '../spatial/Spatial.js';
import { Chip, Icon, Section, List, ListRow, EmptyState, StatTile } from '../spatial/parts.js';

const ws = (): Workspace | null => { try { return loadWorkspace(); } catch { return null; } };
const today = () => new Date().toISOString().slice(0, 10);
const plural = (n: number, a: string, b = `${a}s`) => `${n} ${n === 1 ? a : b}`;

// ------------------------------------------------------------------------------------------------ People and expertise
export function PeopleTab({ opens }: { opens: (h: string) => boolean }) {
  const w = useMemo(ws, []); const staff = w?.staff || [];
  const skills = useMemo(() => { const m = new Map<string, number>(); for (const s of staff) for (const k of Object.keys(s.skills)) m.set(k, (m.get(k) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [staff]);
  const [skill, setSkill] = useState('');
  const shown = staff.filter((s) => !skill || s.skills[skill]);
  const personas = Object.entries(PEOPLE);
  return (
    <div className="stack" data-testid="sp-people">
      <div className="tiles"><StatTile label="People with a service record" value={staff.length} sub={`${staff.filter((s) => s.internal).length} internal · ${staff.filter((s) => !s.internal).length} partner`} icon="people" /><StatTile label="Skills evidenced" value={skills.length} sub="each counted from jobs on record" icon="check" /><StatTile label="Certifications" value={staff.reduce((n, s) => n + Object.keys(s.certs).length, 0)} sub={`${staff.reduce((n, s) => n + Object.values(s.certs).filter((c) => c.expires < today()).length, 0)} expired today`} icon="ticket" /><StatTile label="Platform personas" value={personas.length} sub="synthetic roles that act on the records" icon="users" /></div>
      <div className="sp__types" role="group" aria-label="Filter by skill"><button type="button" className="sp__tchip" aria-pressed={!skill} onClick={() => setSkill('')}><span>Everyone</span><b>{staff.length}</b></button>{skills.map(([k, n]) => <button key={k} type="button" className="sp__tchip" aria-pressed={skill === k} onClick={() => setSkill(skill === k ? '' : k)}><span>{SKILL_NAMES[k] || k}</span><b>{n}</b></button>)}</div>
      <Section title="People and expertise" aside="Expertise comes from evidence on record — jobs and certifications — never a self-rating" id="sp-people-h">
        <List label="People">{shown.map((s) => <ListRow key={s.id} leading={<span className="row__ic"><Icon name="people" /></span>} title={s.name} sub={`${s.internal ? 'Internal' : `Partner · ${s.orgName || 'external'}`} · sites ${s.sites.join(', ')} · ${Object.entries(s.skills).map(([k, v]) => `${SKILL_NAMES[k] || k} ${v.level.toLowerCase()}${v.n ? ` (${v.n} jobs)` : ''}`).join(' · ')}`} trailing={<span className="sp__certs">{Object.entries(s.certs).map(([c, v]) => <Chip key={c} tone={v.expires < today() ? 'bad' : 'muted'} title={`expires ${v.expires}`}>{(CERTS as Record<string, { label: string }>)[c]?.label || c}{v.expires < today() ? ' · expired' : ''}</Chip>)}</span>} />)}</List>
        <p className="ui-meta">Source: the ServiceHands workspace (synthetic people). An expired certification is a hard gate in dispatch{opens('#/service') ? <> — see <a href="#/service">the dispatch board</a></> : ''}.</p>
      </Section>
      <Section title="Personas of the platform" aside="Who records, verifies and decides" id="sp-pers-h">
        <List label="Personas">{personas.map(([k, v]) => <ListRow key={k} leading={<span className="row__ic"><Icon name="people" /></span>} title={v} sub={`acts in ${allRecords().reduce((n, r) => n + r.events.filter((e) => e.by === k).length, 0)} recorded room events`} />)}</List>
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Support coverage (and ownership)
export function SupportTab({ opens }: { opens: (h: string) => boolean }) {
  const rows = BUILDINGS.map((b) => { const first = ROOMS.find((r) => r.building === b.key); const s = first ? scenario('S2', first.id) : null; return { b, first, paths: s?.groups.find((g) => g.key === 'paths')?.items || [], orgs: s?.groups.find((g) => g.key === 'agreements')?.items || [] }; });
  const n = rows.reduce((k, r) => k + r.paths.length, 0);
  return (
    <div className="stack" data-testid="sp-support">
      <div className="tiles"><StatTile label="Support paths" value={n} sub={`three for each of ${BUILDINGS.length} buildings`} icon="route" /><StatTile label="Backups named" value={0} sub="none is on record, so none is shown" tone="monitor" icon="alert" /><StatTile label="Escalation organisations" value={new Set(rows.flatMap((r) => r.orgs.map((o) => o.label))).size} sub="fictional partners" icon="building" /><StatTile label="Rooms covered" value={ROOMS.length} sub="every room inherits its building’s paths" icon="room" /></div>
      {rows.map((r) => <Section key={r.b.key} title={r.b.name} aside={`${plural(ROOMS.filter((x) => x.building === r.b.key).length, 'room')}`} id={`sp-sup-${r.b.key}`}>
        <List label={`${r.b.name} support paths`}>{r.paths.map((p) => <ListRow key={p.id} href={r.first && opens('#/search/scenarios') ? `#/search/scenarios/S2?room=${r.first.id}` : undefined} leading={<span className="row__ic"><Icon name="route" /></span>} title={p.label} sub={`${p.detail} · ${p.provenance}`} trailing={<Chip tone="warn">No backup on record</Chip>} />)}</List>
      </Section>)}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Project map
type Lens = 'projects' | 'work' | 'commissioning' | 'issues' | 'devices';
const LENSES: Array<[Lens, string]> = [['projects', 'Project locations'], ['work', 'Active work'], ['commissioning', 'Commissioning activity'], ['issues', 'Open issues'], ['devices', 'Device estate']];
export function MapTab({ opens }: { opens: (h: string) => boolean }) {
  const w = useMemo(ws, []); const [lens, setLens] = useState<Lens>('projects');
  const P = programme(); const recs = allRecords(); const c = useMemo(() => campusStats(w), [w]);
  const items = (b: string): Array<{ id: string; t: string; s: string; href?: string }> => {
    if (lens === 'projects') return P.projects.filter((p) => p.roomIds.some((r) => roomById(r)?.building === b)).map((p) => ({ id: p.id, t: p.id, s: `${p.roomIds.map((r) => shortName(roomById(r)!)).join(', ')} · ${p.governance.toLowerCase()} · ${p.delivery.replace(/_/g, ' ').toLowerCase()}`, href: roomHref(roomById(p.roomIds[0]!)!) }));
    if (lens === 'work') return [...(w?.incidents || []).filter((i) => i.buildingKey === b && !['CLOSED', 'CANCELLED'].includes(i.state)).map((i) => ({ id: i.id, t: `${i.id} · ${i.title}`, s: `${i.roomName} · ${i.state.toLowerCase()}`, href: `#/v25/service?id=${i.id}` })), ...(w?.workOrders || []).filter((x) => x.buildingKey === b && !['DONE', 'CANCELLED'].includes(x.state)).map((x) => ({ id: x.id, t: `${x.id} · ${x.title}`, s: x.state.toLowerCase() }))];
    if (lens === 'commissioning') return recs.filter((r) => r.outline.building === b && (r.lifecycle === 'COMMISSIONING' || r.baselines.some((x) => x.state === 'PENDING_ACCEPTANCE'))).map((r) => ({ id: r.outline.id, t: fullName(r.outline), s: `${r.counts.verified} of ${r.counts.applicable} verified${r.nextStep?.blockers.length ? ` · held: ${r.nextStep.blockers[0]}` : ''}`, href: roomHref(r.outline) }));
    if (lens === 'issues') return recs.filter((r) => r.outline.building === b).flatMap((r) => r.issues.filter((i) => i.state !== 'RESOLVED').map((i) => ({ id: i.id, t: i.title, s: `${shortName(r.outline)} · ${i.severity} · ${i.source}`, href: roomHref(r.outline) })));
    return recs.filter((r) => r.outline.building === b).map((r) => ({ id: r.outline.id, t: fullName(r.outline), s: `${r.positions.filter((p) => !p.furniture).length} device positions`, href: roomHref(r.outline) }));
  };
  const counts = Object.fromEntries(BUILDINGS.map((b) => [b.key, lens === 'devices' ? c.buildings.find((s) => s.b.key === b.key)!.devices : items(b.key).length]));
  const tiles = Object.fromEntries(BUILDINGS.map((b) => [b.key, { score: counts[b.key]!, band: counts[b.key] ? ('monitor' as const) : ('none' as const), issues: 0, rooms: 0 }]));
  const [pick, setPick] = useState<string | null>(null);
  return (
    <div className="stack" data-testid="sp-map">
      <div className="sp__types" role="group" aria-label="Lens">{LENSES.map(([k, l]) => <button key={k} type="button" className="sp__tchip" aria-pressed={lens === k} onClick={() => setLens(k)}><span>{l}</span><b>{BUILDINGS.reduce((n, b) => n + (k === lens ? counts[b.key]! : 0), 0) || (k === lens ? 0 : '')}</b></button>)}</div>
      <div className="campus__stagewrap">
        <Stage label={`Campus map: ${LENSES.find(([k]) => k === lens)![1]}`} testId="sp-map-stage"><CampusMap tiles={tiles} current={pick || undefined} onOpen={(b) => setPick(b.key === pick ? null : b.key)} /><p className="stage__cap">Each building carries the number its records give for this lens. Select a building to list its rows; the list below holds every row.</p></Stage>
        <Section title={pick ? BUILDINGS.find((b) => b.key === pick)!.name : 'Every building'} aside={LENSES.find(([k]) => k === lens)![1]} id="sp-map-h">
          {(() => { const rows = (pick ? [pick] : BUILDINGS.map((b) => b.key)).flatMap((k) => items(k)); return rows.length ? <List label="Rows">{rows.slice(0, 60).map((x) => <ListRow key={x.id} href={x.href && opens(x.href.split('?')[0]!) ? x.href : undefined} title={x.t} sub={x.s} />)}</List> : <EmptyState title="Nothing on record for this lens" icon="inbox">No record of this kind in {pick ? 'this building' : 'the campus'}.</EmptyState>; })()}
        </Section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Organizations
export function OrgsTab() {
  const w = useMemo(ws, []);
  const groups = new Map<string, Array<{ name: string; inside: boolean; note: string }>>();
  const add = (kind: string, name: string, inside: boolean, note: string) => { const g = groups.get(kind) || []; if (!g.some((x) => x.name === name)) g.push({ name, inside, note }); groups.set(kind, g); };
  add('Enterprise / owner', 'Northstar Industries (synthetic)', true, `${BUILDINGS.length} buildings · ${ROOMS.length} rooms`);
  for (const o of ORGS) add(o.kind, `${o.name} (fictional)`, false, `escalation partner in ${BUILDINGS.filter((b) => (scenario('S2', ROOMS.find((r) => r.building === b.key)?.id)?.groups.find((g) => g.key === 'agreements')?.items || []).some((i) => i.label.includes(o.name))).map((b) => b.short).join(', ') || 'no building on record'}`);
  for (const s of w?.staff || []) if (!s.internal && s.orgName) add('AV / technology integrator', `${s.orgName} (fictional)`, false, `${(w?.staff || []).filter((x) => x.orgName === s.orgName).length} person on the service record`);
  return (
    <div className="stack" data-testid="sp-orgs">
      {[...groups.entries()].map(([k, l]) => <Section key={k} title={k} aside={plural(l.length, 'organization')} id={`sp-org-${k.replace(/\W+/g, '')}`}><List label={k}>{l.map((o) => <ListRow key={o.name} leading={<span className="row__ic"><Icon name="building" /></span>} title={o.name} sub={o.note} trailing={<Chip tone={o.inside ? 'accent' : 'muted'}>{o.inside ? 'Inside Northstar' : 'Partner'}</Chip>} />)}</List></Section>)}
      <p className="ui-meta">Every organisation is synthetic; names come from the V2.5.3 source, where they were invented. No real company is implied.</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Activity
export function ActivityTab() {
  const w = useMemo(ws, []); const [b, setB] = useState('');
  const all = useMemo(() => { const out: Array<{ at: number; t: string; s: string; where: string; key: string; href?: string; denied: boolean }> = []; for (const r of allRecords()) for (const e of r.events) out.push({ at: Date.now() - (DEMO_NOW - Date.parse(e.at)), t: e.type.replace(/^[a-z]+\./, '').replace(/_/g, ' '), s: `${e.detail} · ${PEOPLE[e.by] || e.by}`, where: shortName(r.outline), key: r.outline.building, href: roomHref(r.outline), denied: e.outcome === 'DENIED' }); for (const e of w?.events || []) out.push({ at: Date.parse(e.at), t: e.type.replace(/^[a-z]+\./, '').replace(/_/g, ' '), s: e.detail, where: e.aggregate, key: '', denied: e.outcome === 'DENIED' }); return out.sort((x, y) => y.at - x.at); }, [w]);
  const rows = all.filter((x) => !b || x.key === b); const [n, setN] = useState(25);
  const week = recentChanges(w).reduce((k, x) => k + x.n, 0);
  return (
    <div className="stack" data-testid="sp-activity">
      <div className="tiles"><StatTile label="Recorded events" value={all.length} sub="room records and the service workspace" icon="clock" /><StatTile label="This week" value={week} sub="changes in the last 7 days" icon="spark" /><StatTile label="Refused by a gate" value={all.filter((x) => x.denied).length} sub="every refusal is kept" tone="monitor" icon="shield" /><StatTile label="Buildings" value={BUILDINGS.length} sub="filter the feed below" icon="building" /></div>
      <div className="sp__types" role="group" aria-label="Filter by building"><button type="button" className="sp__tchip" aria-pressed={!b} onClick={() => setB('')}><span>Everywhere</span><b>{all.length}</b></button>{BUILDINGS.map((x) => <button key={x.key} type="button" className="sp__tchip" aria-pressed={b === x.key} onClick={() => setB(b === x.key ? '' : x.key)}><span>{x.short}</span><b>{all.filter((y) => y.key === x.key).length}</b></button>)}</div>
      <Section title="The feed" aside="Newest first" id="sp-feed-h"><List label="Activity">{rows.slice(0, n).map((x, i) => <ListRow key={i} href={x.href} leading={<span className={`row__ic${x.denied ? ' row__ic--bad' : ''}`}><Icon name="clock" /></span>} title={`${x.t} · ${x.where}`} sub={x.s} trailing={<span className="ui-meta">{new Date(x.at).toISOString().slice(0, 10)}{x.denied ? ' · refused' : ''}</span>} />)}</List>
        {rows.length > n && <button type="button" className="sp__more" onClick={() => setN(n + 50)}>Show {Math.min(50, rows.length - n)} more of {rows.length - n}</button>}</Section>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Evidence and artifacts
export function VaultTab() {
  const arts = useMemo(() => { const out: Array<{ id: string; kind: string; t: string; room: string; href: string; by: string; state: string }> = []; for (const r of allRecords()) {
    for (const [tid, res] of Object.entries(r.design.results || {})) if (res) out.push({ id: res.evidence.ref, kind: `Test evidence · ${res.evidence.kind}`, t: `${tid} ${res.state}`, room: shortName(r.outline), href: `${roomHref(r.outline)}?tab=tests`, by: PEOPLE[res.by] || res.by, state: res.verified ? `verified by ${PEOPLE[res.verified.by] || res.verified.by}` : 'not verified' });
    for (const b of r.baselines) out.push({ id: `BL-${r.outline.id.slice(2)}-v${b.version}`, kind: 'Commissioning baseline', t: `baseline v${b.version} · revision ${b.revision}`, room: shortName(r.outline), href: `${roomHref(r.outline)}?tab=history`, by: b.by ? PEOPLE[b.by] || b.by : 'awaiting a reviewer', state: b.state.toLowerCase().replace(/_/g, ' ') });
    for (const x of r.installations) out.push({ id: `${x.position}/${x.asset}`, kind: 'Installation record', t: `${x.asset} at ${x.position}${x.removedAt ? ' (removed)' : ''}`, room: shortName(r.outline), href: `${roomHref(r.outline)}?device=${x.position}`, by: PEOPLE[x.by] || x.by, state: x.basis });
    if (r.exception) out.push({ id: r.exception.id, kind: 'Design exception', t: r.exception.finding, room: shortName(r.outline), href: `${roomHref(r.outline)}?tab=history`, by: PEOPLE[r.exception.requester] || r.exception.requester, state: 'pending approval' });
  } return out; }, []);
  const kinds = useMemo(() => { const m = new Map<string, number>(); for (const a of arts) m.set(a.kind, (m.get(a.kind) || 0) + 1); return [...m.entries()].sort((x, y) => y[1] - x[1]); }, [arts]);
  const [k, setK] = useState(''); const [n, setN] = useState(40); const rows = arts.filter((a) => !k || a.kind === k);
  return (
    <div className="stack" data-testid="sp-vault">
      <p className="ui-muted">{arts.length} records of evidence across {ROOMS.length} rooms. Metadata only: this demonstration stores no file, and every row opens the room record it belongs to.</p>
      <div className="sp__types" role="group" aria-label="Filter by kind"><button type="button" className="sp__tchip" aria-pressed={!k} onClick={() => setK('')}><span>Every kind</span><b>{arts.length}</b></button>{kinds.map(([x, c]) => <button key={x} type="button" className="sp__tchip" aria-pressed={k === x} onClick={() => setK(k === x ? '' : x)}><span>{x}</span><b>{c}</b></button>)}</div>
      <div className="table-wrap"><table className="build__table" data-testid="vault-table"><caption className="ui-visually-hidden">Evidence and artifacts</caption><thead><tr><th scope="col">Record</th><th scope="col">Kind</th><th scope="col">Room</th><th scope="col">By</th><th scope="col">State</th></tr></thead>
        <tbody>{rows.slice(0, n).map((a) => <tr key={`${a.kind}${a.id}`}><th scope="row"><a href={a.href}>{a.t}</a><div className="ui-meta mono">{a.id}</div></th><td>{a.kind}</td><td>{a.room}</td><td>{a.by}</td><td>{a.state}</td></tr>)}</tbody></table></div>
      {rows.length > n && <button type="button" className="sp__more" onClick={() => setN(n + 80)}>Show {Math.min(80, rows.length - n)} more of {rows.length - n}</button>}
    </div>
  );
}
