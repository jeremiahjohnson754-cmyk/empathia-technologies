/**
 * #/control/tower — the Control Tower experience for the OPS room archetype (room plan row 38, "Global Operations Control Tower"):
 * executive, incident and operations views over the demonstration's own records — site status (the six buildings of the fictional
 * campus, never a real-world map), the incident queue, the escalation timeline and a relationship map. NON-OPERATIONAL: nothing here is a
 * live feed; every figure is counted from the room records and the ServiceHands workspace of this browser.
 */
import { useState } from 'react';
import { PageHero, Card, StatTile, Segmented, Tag, Donut, ScoreRing, StatusDot, EmptyState, bandOf, type Segment } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { BUILDINGS, ROOMS, buildingByKey, shortName, roomById, roomHref } from '../campus/canon.js';
import { openIssues, type RoomRecord } from '../campus/design.js';
import { load as loadWorkspace, type Incident, type Workspace } from '../workspace/store.js';
import { healthOf, AGREEMENTS, VENDORS, plural, day, hhmm } from './core.js';
import { useCore, honest, Zone, FactsTable } from './ui.js';

type View = 'executive' | 'incident' | 'operations';
interface Item { id: string; title: string; roomId: string; building: string; sev: 'Mission critical' | 'High' | 'Medium' | 'Standard' | 'Low'; state: string; at: string; source: 'workspace' | 'room record'; inc?: Incident }
const SEV_RANK = { 'Mission critical': 0, High: 1, Medium: 2, Standard: 3, Low: 4 } as const;
const sevTone = (s: Item['sev']) => (s === 'Mission critical' || s === 'High' ? 'bad' : s === 'Medium' ? 'warn' : 'info');
const closed = (s: string) => s === 'CLOSED' || s === 'RESOLVED';

export function queueOf(rooms: RoomRecord[], w: Workspace): Item[] {
  const out: Item[] = w.incidents.filter((i) => !closed(i.state)).map((i) => ({ id: i.id, title: i.title, roomId: i.roomId, building: i.buildingKey, sev: i.severity, state: i.state, at: i.openedAt, source: 'workspace' as const, inc: i }));
  rooms.forEach((r) => openIssues(r).forEach((i) => { if (!out.some((x) => x.id === i.id)) out.push({ id: i.id, title: i.title, roomId: r.outline.id, building: r.outline.building, sev: i.severity, state: i.state, at: r.events[0]?.at || '', source: 'room record' }); }));
  return out.sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev] || Date.parse(b.at || '0') - Date.parse(a.at || '0'));
}

export default function TowerPage({ query }: PageProps) {
  const core = useCore(); const w = loadWorkspace();
  const [view, setView] = useState<View>((['executive', 'incident', 'operations'] as const).find((v) => v === query.get('view')) || 'executive');
  const q = queueOf(core.rooms, w); const [pick, setPick] = useState<string | null>(q[0]?.id || null);
  const sites = BUILDINGS.map((b) => { const rs = core.rooms.filter((r) => r.outline.building === b.key); const items = q.filter((x) => x.building === b.key); const h = rs.length ? Math.round(rs.reduce((s, r) => s + healthOf(r), 0) / rs.length) : null; return { b, rs, items, h, cx: rs.filter((r) => r.lifecycle === 'COMMISSIONING' || r.lifecycle === 'INSTALLED_UNVERIFIED').length }; });
  const campusH = Math.round(core.rooms.reduce((s, r) => s + healthOf(r), 0) / core.rooms.length);
  return (
    <div className="pa pa-tower" data-testid="parity-tower">
      <PageHero eyebrow="Mission Control · Control Tower" title="Operations Control Tower" product="mission-control" icon="grid"
        lede="One room to watch the campus: where it is healthy, what is open, who has it and how it escalated. Built for the operations-centre room archetype; every figure is counted from this demonstration’s records."
        meta={honest(['Non-operational demonstration', 'warn'], ['Synthetic sites and incidents', 'warn'], ['Not a live feed', 'muted'])}
        aside={<ScoreRing value={campusH} label="Campus health" caption={`${ROOMS.length} rooms, by the demonstration’s rule`} />} />
      <p className="pa-tower__banner" role="note"><StatusDot state="modelled" label="Non-operational" /> No live data reaches this page and nothing here dispatches anyone. Sites are the six buildings of the fictional Northstar campus, drawn as tiles — not a map of real places.</p>
      <Segmented label="View" value={view} onChange={setView} options={[{ value: 'executive', label: 'Executive', icon: 'chart' }, { value: 'incident', label: 'Incident', icon: 'alert', count: q.length }, { value: 'operations', label: 'Operations', icon: 'wrench' }]} />
      {view === 'executive' ? <Executive q={q} sites={sites} w={w} /> : view === 'incident' ? <IncidentView q={q} pick={pick} setPick={setPick} w={w} rooms={core.rooms} /> : <Operations w={w} sites={sites} />}
    </div>
  );
}
type Site = { b: typeof BUILDINGS[number]; rs: RoomRecord[]; items: Item[]; h: number | null; cx: number };

function SiteGrid({ sites }: { sites: Site[] }) {
  return (
    <ul className="pa-sites" aria-label="Site status">{sites.map(({ b, rs, items, h, cx }) => { const st = items.some((i) => sevTone(i.sev) === 'bad') ? 'action' : items.length || (h !== null && h < 85) ? 'monitor' : rs.length ? 'healthy' : 'offline'; return (
      <li key={b.key}><a className={`pa-site kit-s--${st === 'action' ? 'bad' : st === 'monitor' ? 'warn' : st === 'healthy' ? 'ok' : 'muted'}`} href={`#/campus/${b.key}`} data-testid="tower-site">
        <h3>{b.name}<StatusDot state={st as never} hideLabel /></h3>
        <p className="pa-kv"><span><b>{rs.length}</b> rooms</span><span><b>{items.length}</b> open</span><span><b>{cx}</b> in commissioning</span><span>health <b>{h ?? '—'}</b></span></p>
        <span className="pa-note">{b.purpose}</span>
      </a></li>); })}</ul>
  );
}

function Executive({ q, sites, w }: { q: Item[]; sites: Site[]; w: Workspace }) {
  const seg: Segment[] = (['Mission critical', 'High', 'Medium', 'Standard', 'Low'] as const).map((s) => ({ key: s, label: s, value: q.filter((x) => x.sev === s).length, tone: sevTone(s) as Segment['tone'] })).filter((s) => s.value);
  const resolved = w.incidents.filter((i) => closed(i.state));
  const ttr = resolved.filter((i) => i.restoredAt).map((i) => (Date.parse(i.restoredAt!) - Date.parse(i.openedAt)) / 36e5);
  const worst = [...sites].filter((s) => s.items.length).sort((a, b) => b.items.length - a.items.length)[0];
  return (
    <>
      <div className="kit-grid kit-grid--tiles">
        <StatTile label="Sites watched" value={sites.filter((s) => s.rs.length).length} icon="building" hint="buildings of the fictional campus" />
        <StatTile label="Open incidents and issues" value={q.length} icon="alert" hint={`${q.filter((x) => sevTone(x.sev) === 'bad').length} high or mission critical`} href="#/control/tower?view=incident" />
        <StatTile label="Mean time to restore" value={ttr.length ? Math.round(ttr.reduce((s, n) => s + n, 0) / ttr.length) : null} unit=" h" icon="clock" hint={`${plural(resolved.length, 'resolved incident')} in the workspace`} />
        <StatTile label="Rooms needing attention" value={sites.reduce((s, x) => s + x.rs.filter((r) => bandOf(healthOf(r)) !== 'healthy').length, 0)} icon="room" hint="below 85 by the health rule" href="#/set/room:monitor" />
      </div>
      <div className="pa-split">
        <Card title="Site status" icon="map" sub="Colour from the open items and room health of each building">
          <SiteGrid sites={sites} />
        </Card>
        <Card title="Open by severity" icon="chart" sub={worst ? `Most open: ${worst.b.name} (${worst.items.length})` : 'Nothing open'}>
          {seg.length ? <Donut segments={seg} label="Open items by severity" total="open" /> : <EmptyState title="Nothing is open" icon="check" tone="ok" />}
        </Card>
      </div>
    </>
  );
}

function timelineOf(item: Item, w: Workspace) {
  const rows: Array<{ at: string; what: string; by: string; tone: string }> = [];
  if (item.inc) { item.inc.history.forEach((h) => rows.push({ at: h.at, what: h.to === 'OPEN' ? 'Reported' : `Moved to ${h.to.toLowerCase().replace(/_/g, ' ')}`, by: h.by, tone: h.to === 'OPEN' ? 'warn' : h.to === 'RESOLVED' || h.to === 'CLOSED' ? 'ok' : 'accent' }));
    if (!item.inc.history.length) rows.push({ at: item.inc.openedAt, what: 'Reported', by: 'requestor', tone: 'warn' });
    if (item.inc.recurrenceOf) rows.push({ at: item.inc.openedAt, what: `Linked as a recurrence of ${item.inc.recurrenceOf}`, by: 'Core', tone: 'bad' });
    const wo = w.workOrders.find((x) => x.incidentId === item.id); if (wo) rows.push({ at: wo.openedAt, what: `Work order ${wo.id} ${wo.state.toLowerCase().replace(/_/g, ' ')}${wo.techId ? `, assigned to ${w.staff.find((s) => s.id === wo.techId)?.name || wo.techId}` : ', not yet assigned'}`, by: 'ServiceHands', tone: 'accent' });
    w.events.filter((e) => e.aggregate === item.id || e.detail.includes(item.id)).forEach((e) => rows.push({ at: e.at, what: e.detail, by: e.by, tone: e.outcome === 'DENIED' ? 'bad' : 'muted' }));
  } else rows.push({ at: item.at, what: `Recorded on the room record (${item.state.toLowerCase().replace(/_/g, ' ')})`, by: 'room record', tone: 'warn' });
  if (sevTone(item.sev) === 'bad') rows.push({ at: item.at, what: 'Escalation rule: high severity is shown to the operations lead and the service manager', by: 'Control Tower rule', tone: 'bad' });
  return rows.sort((a, b) => Date.parse(a.at || '0') - Date.parse(b.at || '0'));
}

function RelMap({ item, w }: { item: Item; w: Workspace }) {
  const room = roomById(item.roomId); const b = buildingByKey(item.building);
  const ag = AGREEMENTS.filter((a) => a.status === 'Active' && a.buildings.includes(item.building)).slice(0, 3);
  const wo = w.workOrders.find((x) => x.incidentId === item.id); const tech = wo?.techId ? w.staff.find((s) => s.id === wo.techId) : null;
  const nodes: Array<{ x: number; y: number; t: string; s: string; c: string }> = [
    { x: 70, y: 110, t: item.id, s: item.sev, c: sevTone(item.sev) === 'bad' ? 'n--hot' : 'n--warm' },
    { x: 230, y: 110, t: room ? shortName(room) : item.roomId, s: 'room', c: 'n' },
    { x: 390, y: 60, t: b?.short || item.building, s: 'building', c: 'n' },
    ...(wo ? [{ x: 390, y: 165, t: wo.id, s: tech ? tech.name.replace(/ \(synthetic\)| — .*$/g, '') : 'unassigned', c: tech ? 'n--ok' : 'n--warm' }] : []),
    ...ag.map((a, i) => ({ x: 550, y: 30 + i * 60, t: a.id, s: VENDORS.find((v) => v[0] === a.vendor)?.[1].split(' ')[0] || '', c: 'n--ok' })),
  ];
  const L = (i: number, j: number, hot = false) => <path key={`${i}-${j}`} className={`l${hot ? ' l--hot' : ''}`} d={`M${nodes[i]!.x + 52} ${nodes[i]!.y} C ${(nodes[i]!.x + nodes[j]!.x) / 2 + 26} ${nodes[i]!.y}, ${(nodes[i]!.x + nodes[j]!.x) / 2 + 26} ${nodes[j]!.y}, ${nodes[j]!.x - 52} ${nodes[j]!.y}`} />;
  const links = [L(0, 1, true), L(1, 2), ...(wo ? [L(1, 3)] : []), ...ag.map((_, i) => L(2, (wo ? 4 : 3) + i))];
  return (
    <figure className="pa-zone">
      <svg className="pa-map" viewBox="0 0 620 220" role="img" aria-label={`Relationship map: ${item.id} in ${room ? shortName(room) : item.roomId}, ${b?.name}; ${wo ? `work order ${wo.id}${tech ? ` with ${tech.name}` : ', unassigned'}` : 'no work order'}; support ${ag.map((a) => a.id).join(', ') || 'none'}`}>
        {links}{nodes.map((n, i) => <g key={i}><rect className={`n ${n.c}`} x={n.x - 52} y={n.y - 20} width="104" height="40" rx="10" /><text x={n.x} y={n.y - 2} textAnchor="middle">{n.t.length > 14 ? `${n.t.slice(0, 13)}…` : n.t}</text><text className="s" x={n.x} y={n.y + 12} textAnchor="middle">{n.s.length > 16 ? `${n.s.slice(0, 15)}…` : n.s}</text></g>)}
      </svg>
      <figcaption className="pa-note">Incident → room → building → who supports it, and the work order with its technician. Read from the records; nothing is inferred.</figcaption>
    </figure>
  );
}

function IncidentView({ q, pick, setPick, w }: { q: Item[]; pick: string | null; setPick: (id: string) => void; w: Workspace; rooms: RoomRecord[] }) {
  const [sev, setSev] = useState<'all' | 'high'>('all');
  const rows = q.filter((x) => sev === 'all' || sevTone(x.sev) === 'bad'); const cur = q.find((x) => x.id === pick) || rows[0];
  return (
    <div className="pa-split">
      <Card title="Incident queue" icon="alert" sub={`${plural(q.length, 'open item')} · worst first`} action={<Segmented small label="Severity" value={sev} onChange={setSev} options={[{ value: 'all', label: 'All' }, { value: 'high', label: 'High and above' }]} />}>
        {rows.length ? <ul className="pa-queue" aria-label="Open incidents and issues">{rows.map((x) => (
          <li key={x.id}><button type="button" className="pa-inc" onClick={() => setPick(x.id)} aria-pressed={cur?.id === x.id} data-testid="tower-incident">
            <span className={`pa-inc__sev kit-s--${sevTone(x.sev)}`} aria-hidden="true" />
            <span><span className="pa-inc__t">{x.title}</span><br /><span className="pa-inc__s">{x.id} · {roomById(x.roomId) ? shortName(roomById(x.roomId)!) : x.roomId} · {x.source}{x.at ? ` · ${day(x.at)}` : ''}</span></span>
            <Tag tone={sevTone(x.sev)}>{x.sev}</Tag>
          </button></li>))}</ul> : <EmptyState title="Nothing at this severity" icon="check" tone="ok" />}
      </Card>
      {cur ? (
        <Card title={cur.title} icon="route" sub={`${cur.id} · ${cur.state.toLowerCase().replace(/_/g, ' ')}`} action={roomById(cur.roomId) ? <a className="ui-btn ui-btn--quiet" href={roomHref(roomById(cur.roomId)!)}>Open the room</a> : undefined}>
          <RelMap item={cur} w={w} />
          <h3 className="pa-zone__note">Escalation timeline</h3>
          <ol className="pa-esc" aria-label="Escalation timeline">{timelineOf(cur, w).map((t, i) => <li key={i} className={`kit-s--${t.tone}`}><time dateTime={t.at}>{t.at ? `${day(t.at).slice(5)} ${hhmm(Date.parse(t.at))}` : '—'}</time><i aria-hidden="true" /><span>{t.what} <span className="pa-note">· {t.by}</span></span></li>)}</ol>
          {cur.inc ? <a className="ui-btn" href="#/servicehands">Open in ServiceHands</a> : <a className="ui-btn" href={`#/investigate/${cur.id}`}>Investigate</a>}
        </Card>
      ) : null}
    </div>
  );
}

function Operations({ w, sites }: { w: Workspace; sites: Site[] }) {
  const cols = ['OPEN', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'DONE'] as const;
  return (
    <>
      <Zone title="Work in flight" note={`${plural(w.workOrders.length, 'work order')} in the ServiceHands workspace`}>
        <div className="kit-grid kit-grid--tiles">{cols.map((c) => { const n = w.workOrders.filter((x) => x.state === c); return (
          <Card key={c} title={c.replace(/_/g, ' ').toLowerCase()} sub={plural(n.length, 'work order')}>
            {n.length ? <ul className="pa-queue">{n.map((x) => <li key={x.id}><a className="pa-inc" href="#/servicehands"><span className="pa-inc__sev kit-s--accent" aria-hidden="true" /><span><span className="pa-inc__t">{x.id}</span><br /><span className="pa-inc__s">{x.title}</span></span><span /></a></li>)}</ul> : <p className="pa-note">None</p>}
          </Card>); })}</div>
      </Zone>
      <div className="pa-split">
        <Card title="Who is on" icon="users" sub="Technicians of the workspace (synthetic people) and their sites">
          <FactsTable facts={w.staff.map((s) => [s.name, `${s.internal ? 'internal' : 'partner'} · ${s.sites.map((k) => buildingByKey(k)?.short || k).join(', ')} · ${w.workOrders.filter((x) => x.techId === s.id && x.state !== 'DONE').length} open`] as [string, string])} />
        </Card>
        <Card title="Coverage by site" icon="shield" sub="Active support agreements per building and layer">
          <FactsTable facts={sites.filter((s) => s.rs.length).map(({ b }) => [b.name, AGREEMENTS.filter((a) => a.status === 'Active' && a.buildings.includes(b.key)).map((a) => `${a.id} (${a.layers.join(', ')})`).join('; ') || 'no active agreement'] as [string, string])} />
        </Card>
      </div>
    </>
  );
}
