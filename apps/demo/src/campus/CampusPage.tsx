/**
 * The living campus: site → building → floor → room. The spatial stage stays dark (D36); every stage has a list equivalent, so nothing on
 * the map is reachable only by pointer. Addresses: #/campus, #/campus/<B>, #/campus/<B>/<floor>, #/campus/<B>/<floor>/<room>, #/rooms.
 */
import { useMemo } from 'react';
import { Tag, Notice } from '@empathia/ui';
import { BUILDINGS, ROOMS, SITE, buildingByKey, roomsIn, roomById, shortName, roomHref, fullName, ARCHETYPE_NAME } from './canon.js';
import { allRecords, roomRecord, openIssuesByBuilding, openIssues, type RoomRecord } from './design.js';
import { CampusMap, FloorPlate, Stage } from '../spatial/Spatial.js';
import { RoomView } from '../rooms/RoomView.js';

export const LIFE_TONE: Record<string, 'ok' | 'warn' | 'info' | 'muted' | 'bad'> = { OPERATIONAL: 'ok', ACCEPTED: 'ok', COMMISSIONING: 'warn', INSTALLED_UNVERIFIED: 'info', PLANNED: 'muted', DESIGN_APPROVED: 'info', INSTALLATION_PENDING: 'info' };
const KIND_LABEL: Record<string, string> = { reference: 'reference room', earlier: 'earlier record', designed: 'designed from archetype' };

export function parseCampus(hash: string): { b?: string; f?: number; room?: string } {
  const p = hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter(Boolean);
  if (p[0] !== 'campus') return {};
  return { b: p[1], f: p[2] != null ? Number(p[2]) : undefined, room: p[3] };
}

const go = (h: string) => { location.hash = h; };

export function CampusPage({ hash, sees }: { hash: string; sees?: (id: string) => boolean }) {
  const { b, f, room } = parseCampus(hash);
  if (room) {
    const o = roomById(room);
    if (!o || o.building !== b || o.floor !== f) return <NotFound what={`room ${room}`} />;
    return <RoomView id={room} hash={hash} sees={sees} />;
  }
  if (b) { const B = buildingByKey(b); if (!B) return <NotFound what={`building ${b}`} />; if (f != null) { if (!(f >= 1 && f <= B.floors)) return <NotFound what={`floor ${f} of ${B.name}`} />; return <FloorPage b={b} f={f} />; } return <BuildingPage b={b} />; }
  return <SitePage />;
}

function NotFound({ what }: { what: string }) {
  return <section className="campus"><h1>Not on this campus</h1><Notice tone="warn">There is no {what} in the synthetic campus. <a href="#/campus">Back to the campus</a></Notice></section>;
}

function Crumbs({ items }: { items: Array<[string, string?]> }) {
  return <nav aria-label="Breadcrumb" className="crumbs"><ol>{items.map(([t, h], i) => <li key={i}>{h ? <a href={h}>{t}</a> : <span aria-current="page">{t}</span>}</li>)}</ol></nav>;
}

function SitePage() {
  const issues = useMemo(() => openIssuesByBuilding(), []);
  const counts = Object.fromEntries(BUILDINGS.map((b) => [b.key, roomsIn(b.key).length]));
  const recs = allRecords();
  const by = (s: string) => recs.filter((r) => r.lifecycle === s).length;
  return (
    <section className="campus" data-native="" data-testid="campus-site">
      <Crumbs items={[['Campus']]} />
      <header className="campus__head"><div><p className="kicker">The living campus · synthetic</p><h1>{SITE.name}</h1>
        <p className="ui-muted">Six buildings, {ROOMS.length} rooms: one complete reference room, three that keep this demonstration’s earlier records, and {ROOMS.filter((r) => r.kind === 'designed').length} designed from their archetypes — modelled layouts and devices, never surveyed.</p></div>
        <ul className="campus__stats" aria-label="Rooms by lifecycle">{['OPERATIONAL', 'ACCEPTED', 'COMMISSIONING', 'PLANNED'].map((s) => <li key={s}><b>{by(s)}</b><span>{s.toLowerCase()}</span></li>)}</ul>
      </header>
      <Stage label="Campus map" testId="campus-stage"><CampusMap issues={issues} rooms={counts} onOpen={(B) => go(`#/campus/${B.key}`)} /></Stage>
      <h2 className="campus__h2">Buildings</h2>
      <ul className="campus__cards">{BUILDINGS.map((B) => <li key={B.key}><a href={`#/campus/${B.key}`} className="campus__card"><b>{B.name}</b><span className="ui-muted">{B.purpose}</span><span className="ui-meta">{counts[B.key]} rooms · {B.floors} floors{issues[B.key] ? ` · ${issues[B.key]} open issue${issues[B.key] === 1 ? '' : 's'}` : ''}</span></a></li>)}</ul>
      <p><a href="#/rooms">Every room in one list →</a></p>
    </section>
  );
}

function BuildingPage({ b }: { b: string }) {
  const B = buildingByKey(b)!; const issues = openIssuesByBuilding(); const counts = Object.fromEntries(BUILDINGS.map((x) => [x.key, roomsIn(x.key).length]));
  const floors = Array.from({ length: B.floors }, (_, i) => B.floors - i);
  return (
    <section className="campus" data-native="" data-testid="campus-building">
      <Crumbs items={[['Campus', '#/campus'], [B.name]]} />
      <header className="campus__head"><div><p className="kicker">{B.short} · opened {B.opened}</p><h1>{B.name}</h1><p className="ui-muted">{B.purpose}. Source: {B.source}.</p></div></header>
      <Stage label={`Campus map with ${B.name} selected`} testId="campus-stage"><CampusMap issues={issues} rooms={counts} current={b} onOpen={(x) => go(`#/campus/${x.key}`)} /></Stage>
      <h2 className="campus__h2">Floors</h2>
      <ul className="campus__floors">{floors.map((f) => { const rs = roomsIn(b, f); return (
        <li key={f}><a href={`#/campus/${b}/${f}`} className="campus__card" data-testid={`floor-${b}-${f}`}><b>Floor {f}</b><span className="ui-meta">{rs.length ? `${rs.length} room${rs.length === 1 ? '' : 's'} in the canonical campus` : 'no room of the canonical campus on this floor'}</span>{rs.length > 0 && <span className="ui-muted">{rs.map((r) => r.number).join(' · ')}</span>}</a></li>); })}</ul>
    </section>
  );
}

function FloorPage({ b, f }: { b: string; f: number }) {
  const B = buildingByKey(b)!; const rs = roomsIn(b, f).map((o) => roomRecord(o.id)!);
  return (
    <section className="campus" data-native="" data-testid="campus-floor">
      <Crumbs items={[['Campus', '#/campus'], [B.name, `#/campus/${b}`], [`Floor ${f}`]]} />
      <header className="campus__head"><div><p className="kicker">{B.name}</p><h1>Floor {f}</h1></div><nav className="campus__step" aria-label="Floors">{f > 1 && <a className="ui-btn" href={`#/campus/${b}/${f - 1}`}>Floor {f - 1}</a>}{f < B.floors && <a className="ui-btn" href={`#/campus/${b}/${f + 1}`}>Floor {f + 1}</a>}</nav></header>
      {rs.length ? <Stage label={`Floor plate of ${B.name} floor ${f}`} testId="floor-stage"><FloorPlate rooms={rs.map((r) => ({ id: r.outline.id, label: shortName(r.outline), w: r.outline.dims[0], l: r.outline.dims[1], state: r.lifecycle, issues: openIssues(r).length }))} onOpen={(id) => go(roomHref(roomById(id)!))} /></Stage>
        : <div className="empty"><b>No room of the canonical campus on this floor</b><p>The demonstration models thirty rooms; this floor has none of them. Other floors of {B.name} do.</p></div>}
      <RoomList rows={rs} />
    </section>
  );
}

export function RoomList({ rows, caption }: { rows: RoomRecord[]; caption?: string }) {
  if (!rows.length) return null;
  return (
    <div className="table-wrap"><table className="build__table" data-testid="room-list">{caption && <caption className="ui-visually-hidden">{caption}</caption>}
      <thead><tr><th scope="col">Room</th><th scope="col">Archetype</th><th scope="col">Seats</th><th scope="col">Lifecycle</th><th scope="col">Tests verified</th><th scope="col">Open issues</th><th scope="col">Record</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.outline.id}><th scope="row"><a href={roomHref(r.outline)}>{fullName(r.outline)}</a><div className="ui-meta mono">{r.outline.id}</div></th><td>{ARCHETYPE_NAME[r.outline.archetype]}</td><td>{r.outline.capacity}</td><td><Tag tone={LIFE_TONE[r.lifecycle] || 'muted'}>{r.lifecycle}</Tag></td><td>{r.counts.verified} of {r.counts.applicable}</td><td>{openIssues(r).length || '—'}</td><td>{KIND_LABEL[r.outline.kind]}</td></tr>)}</tbody>
    </table></div>
  );
}

export function RoomsIndex({ hash }: { hash: string }) {
  const q = new URLSearchParams(/\?(.*)$/.exec(hash)?.[1] || '');
  const state = q.get('state') || ''; const b = q.get('building') || '';
  const all = allRecords(); const rows = all.filter((r) => (!state || r.lifecycle === state) && (!b || r.outline.building === b));
  const set = (k: string, v: string) => { const n = new URLSearchParams(q); if (v) n.set(k, v); else n.delete(k); go(`#/rooms${n.toString() ? `?${n}` : ''}`); };
  return (
    <section className="campus" data-native="" data-testid="rooms-index">
      <Crumbs items={[['Campus', '#/campus'], ['Rooms']]} />
      <header className="campus__head"><div><p className="kicker">The canonical campus</p><h1>Thirty rooms</h1><p className="ui-muted">Every room opens in the same room view. Coverage says per room what is complete, modelled or a gap.</p></div></header>
      <div className="filters"><label>Lifecycle <select value={state} onChange={(e) => set('state', e.target.value)}><option value="">Every state</option>{[...new Set(all.map((r) => r.lifecycle))].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label>Building <select value={b} onChange={(e) => set('building', e.target.value)}><option value="">Every building</option>{BUILDINGS.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>
        <span className="ui-meta" role="status">{rows.length} of {all.length} rooms</span></div>
      {rows.length ? <RoomList rows={rows} caption="Rooms of the canonical campus" /> : <div className="empty"><b>No room matches</b><p>Clear a filter to see more rooms.</p></div>}
    </section>
  );
}
