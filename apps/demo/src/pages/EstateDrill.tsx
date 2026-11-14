/**
 * Drill down and drill up through the estate (founder, 13 Nov 2026: "advanced drilldown and drillup capabilities in all data analytics
 * surfaced"): campus → building → floor → room, and across by state, on the Commissioning and Assurance command centres. The level is
 * in the address (#/commissioning?b=ATL&f=4&s=blocked), so a drilled view can be shared, bookmarked and walked back with the browser's
 * Back; the path above the table drills back up one level at a time. Every count is the same rule the page's tiles use
 * (campus/cxRecord.ts cxState, campus/asRecord.ts asState) over the rooms in scope; at the floor every row opens the room's own record.
 */
import { Card, Chip, Icon, Tag, type Series } from '@empathia/ui';
import type { RoomRecord } from '../campus/design.js';
import { openIssues } from '../campus/design.js';
import { buildingByKey, shortName } from '../campus/canon.js';
import { cxState } from '../campus/cxRecord.js';
import { asState } from '../campus/asRecord.js';
import type * as S from '../workspace/store.js';
import { Stack, plural, pct } from './viz.js';

export interface Drill { b: string | null; f: number | null; s: string | null }
const KEY = /^[A-Z]{2,5}$/;
/** the drill read from the address: unknown or malformed values are ignored (the page falls back to the level above) */
export function drillOf(hash: string, recs: RoomRecord[]): Drill {
  const q = new URLSearchParams(hash.split('?')[1] || ''); const b0 = q.get('b'); const f0 = q.get('f'); const s0 = q.get('s');
  const b = b0 && KEY.test(b0) && recs.some((r) => r.outline.building === b0) ? b0 : null;
  const f = b && f0 && /^\d{1,2}$/.test(f0) && recs.some((r) => r.outline.building === b && r.outline.floor === Number(f0)) ? Number(f0) : null;
  const s = s0 && /^[a-z]{3,12}$/.test(s0) ? s0 : null;
  return { b, f, s };
}
export const drillHref = (base: string, d: Partial<Drill>) => { const q = new URLSearchParams(); if (d.b) q.set('b', d.b); if (d.b && d.f != null) q.set('f', String(d.f)); if (d.s) q.set('s', d.s); const s = q.toString(); return s ? `${base}?${s}` : base; };
export const inScope = (recs: RoomRecord[], d: Drill) => recs.filter((r) => (!d.b || r.outline.building === d.b) && (d.f == null || r.outline.floor === d.f));

type Kind = 'cx' | 'as' | 'pro';
const DONE = ['CLOSED', 'CANCELLED'];
/** Pro's two states: a room needs action when commissioning is blocked, a deficiency is open or a service job is open (the command centre's own rule) */
export const PRO_STATES = { action: { label: 'Needs action', tone: 'warn' as Series }, good: { label: 'Good standing', tone: 'ok' as Series } };
interface StateDef { label: string; tone: Series }
export function EstateDrill({ kind, recs, incidents, hash, base, states, roomBase }: { kind: Kind; recs: RoomRecord[]; incidents: S.Incident[]; hash: string; base: string; states: Record<string, StateDef>; roomBase: string }) {
  const d = drillOf(hash, recs); const keys = Object.keys(states);
  const stateOf = (r: RoomRecord): { state: string; why: string } => {
    if (kind === 'cx') return cxState(r); if (kind === 'as') return asState(r, incidents);
    const jobs = incidents.filter((i) => i.roomId === r.outline.id && !DONE.includes(i.state)); const iss = openIssues(r); const cx = cxState(r);
    return jobs.length || iss.length || cx.state === 'blocked' ? { state: 'action', why: [jobs[0] ? `${jobs[0].id} open: ${jobs[0].title}` : '', iss[0] ? iss[0].title : '', cx.state === 'blocked' ? `commissioning blocked: ${cx.why}` : ''].filter(Boolean).join(' · ') } : { state: 'good', why: 'no open job or issue' };
  };
  const scope = inScope(recs, d); const s = d.s && keys.includes(d.s) ? d.s : null;
  const bName = d.b ? buildingByKey(d.b)?.name || d.b : null;
  const level = d.f != null ? 'room' : d.b ? 'floor' : 'building';
  // the rows of this level
  const groups: Array<{ key: string; name: string; href: string; rooms: RoomRecord[] }> = level === 'building'
    ? [...new Set(recs.map((r) => r.outline.building))].map((k) => ({ key: k, name: buildingByKey(k)?.name || k, href: drillHref(base, { b: k, s }), rooms: recs.filter((r) => r.outline.building === k) })).sort((a, b) => b.rooms.length - a.rooms.length)
    : level === 'floor' ? [...new Set(scope.map((r) => r.outline.floor))].sort((a, b) => a - b).map((f) => ({ key: String(f), name: `Floor ${f}`, href: drillHref(base, { b: d.b, f, s }), rooms: scope.filter((r) => r.outline.floor === f) })) : [];
  const shown = s ? groups.filter((g) => g.rooms.some((r) => stateOf(r).state === s)) : groups;
  const rows = level === 'room' ? scope.map((r) => ({ r, ...stateOf(r) })).filter((x) => !s || x.state === s) : [];
  const path: Array<{ label: string; href: string | null; n: number }> = [{ label: 'Campus', href: d.b || s ? drillHref(base, {}) : null, n: recs.length }];
  if (d.b) path.push({ label: bName!, href: d.f != null ? drillHref(base, { b: d.b, s }) : null, n: recs.filter((r) => r.outline.building === d.b).length });
  if (d.f != null) path.push({ label: `Floor ${d.f}`, href: null, n: scope.length });
  const count = (rs: RoomRecord[], k: string) => rs.filter((r) => stateOf(r).state === k).length;
  return <Card icon="layers" title="Drill down" sub={level === 'room' ? `${plural(rows.length, 'room')} on ${bName}, floor ${d.f}${s ? ` · ${states[s]!.label.toLowerCase()}` : ''} · open one for its record` : `${level === 'building' ? 'Each building' : `Each floor of ${bName}`}: open one to go a level down; a count filters by its state`} testId={`${kind}-drill`}>
    <nav className="dr-path" aria-label="Where you are in the estate" data-testid="drill-path" data-level={level}>
      {path.map((p, i) => <span key={p.label}>{i ? <span aria-hidden="true" className="dr-sep">›</span> : null}{p.href ? <a href={p.href}>{p.label} <span className="ui-meta">{p.n}</span></a> : <b aria-current="location">{p.label} <span className="ui-meta">{p.n}</span></b>}</span>)}
      {s ? <Chip small tone={states[s]!.tone as never} href={drillHref(base, { b: d.b, f: d.f })}>{states[s]!.label} · clear</Chip> : null}
    </nav>
    {level !== 'room' ? <div className="pa-table-wrap"><table className="pa-table dr-table" data-testid="drill-table">
      <caption className="ui-sr">{level === 'building' ? 'Buildings' : 'Floors'} by {kind === 'cx' ? 'commissioning' : kind === 'pro' ? 'standing' : 'assurance'} state</caption>
      <thead><tr><th scope="col">{level === 'building' ? 'Building' : 'Floor'}</th><th scope="col">Rooms</th><th scope="col" className="dr-bar">State</th>{keys.map((k) => <th key={k} scope="col" className="num">{states[k]!.label}</th>)}<th scope="col" className="num">{kind === 'cx' ? 'Tests verified' : kind === 'pro' ? 'Open jobs and issues' : 'Open issues'}</th></tr></thead>
      <tbody>{shown.map((g) => { const v = g.rooms.reduce((a, r) => a + r.counts.verified, 0); const ap = g.rooms.reduce((a, r) => a + r.counts.applicable, 0);
        return <tr key={g.key} data-drill={g.key}>
          <th scope="row"><a href={g.href} data-testid="drill-in">{g.name}</a></th><td className="num">{g.rooms.length}</td>
          <td className="dr-bar"><Stack label={g.name} parts={keys.map((k) => ({ key: k, label: states[k]!.label, value: count(g.rooms, k), tone: states[k]!.tone }))} /></td>
          {keys.map((k) => { const n = count(g.rooms, k); return <td key={k} className="num">{n ? <a href={drillHref(base, level === 'building' ? { b: g.key, s: k } : { b: d.b, f: Number(g.key), s: k })} aria-label={`${n} ${states[k]!.label.toLowerCase()} in ${g.name}`}>{n}</a> : <span className="ui-meta">0</span>}</td>; })}
          <td className="num">{kind === 'cx' ? `${pct(v, ap)}%` : g.rooms.reduce((a, r) => a + openIssues(r).length + (kind === 'pro' ? incidents.filter((i) => i.roomId === r.outline.id && !DONE.includes(i.state)).length : 0), 0)}</td>
        </tr>; })}</tbody></table></div>
      : rows.length ? <ul className="dr-rooms" data-testid="drill-rooms">{rows.map((x) => <li key={x.r.outline.id}>
          <a href={`${roomBase}/${x.r.outline.id}`}><Icon name="room" size={16} /> <b>{shortName(x.r.outline)}</b> <span className="ui-meta">{x.r.outline.name}</span></a>
          <Tag tone={states[x.state]!.tone as never}>{states[x.state]!.label}</Tag><span className="ui-meta dr-why">{x.why}</span>
          <span className="ui-meta">{kind === 'cx' ? `${x.r.counts.verified} of ${x.r.counts.applicable} tests` : plural(openIssues(x.r).length, 'open issue')}</span></li>)}</ul>
      : <p className="ui-meta">No room on this floor is {states[s!]?.label.toLowerCase()}. <a href={drillHref(base, { b: d.b, f: d.f })}>Show every room on the floor</a></p>}
    {s && level !== 'room' ? <p className="wk-note">Only {level === 'building' ? 'buildings' : 'floors'} with a room that is {states[s]!.label.toLowerCase()} are listed ({shown.length} of {groups.length}); each row still counts every state.</p> : null}
  </Card>;
}
